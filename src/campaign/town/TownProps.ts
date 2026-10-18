import Phaser from 'phaser';
import { mix } from '../../ui';
import { PropKind, TownTheme } from './TownTheme';

/**
 * Hand-drawn town props.
 *
 * Every function paints one prop standing at `(x, y)` — the point where it meets the
 * ground — at scale `s`, in the town's own palette where that makes sense. No image assets
 * exist in this game, so each prop is a small bespoke drawing: a grounding shadow, a
 * silhouette built from paths, and a few strokes of secondary detail.
 */

type G = Phaser.GameObjects.Graphics;
type Draw = (g: G, x: number, y: number, s: number, th: TownTheme, r: () => number) => void;

const dk = (c: number, t: number) => mix(c, 0x000000, t);
const lt = (c: number, t: number) => mix(c, 0xffffff, t);

function shadow(g: G, x: number, y: number, w: number, h = w * 0.36, a = 0.32): void {
  g.fillStyle(0x000000, a);
  g.fillEllipse(x, y, w, h);
}

function poly(g: G, pts: number[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillPath();
}

function line(g: G, x1: number, y1: number, x2: number, y2: number, w: number, c: number, a = 1): void {
  g.lineStyle(w, c, a);
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
}

/** Leafy canopy: overlapping lumps, dark under-layer, lit crown. */
function canopy(g: G, x: number, y: number, R: number, c: number, r: () => number): void {
  g.fillStyle(dk(c, 0.45), 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.4 + 4, R * 0.55);
  }
  g.fillStyle(c, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    g.fillCircle(x + Math.cos(a) * R * 0.45, y + Math.sin(a) * R * 0.32, R * 0.5);
  }
  g.fillStyle(lt(c, 0.25), 1);
  g.fillCircle(x - R * 0.2, y - R * 0.25, R * 0.38);
  g.fillStyle(lt(c, 0.45), 0.6);
  for (let i = 0; i < 5; i++) g.fillCircle(x + (r() - 0.6) * R, y + (r() - 0.7) * R * 0.6, 2.5);
}

const PROPS: Record<PropKind, Draw> = {
  // ── generic ────────────────────────────────────────────────────────
  tree: (g, x, y, s, th, r) => {
    shadow(g, x + 6, y, 56 * s);
    poly(g, [x - 5 * s, y, x - 3 * s, y - 30 * s, x + 3 * s, y - 30 * s, x + 6 * s, y], 0x5a3a20);
    line(g, x, y - 26 * s, x - 9 * s, y - 38 * s, 3 * s, 0x5a3a20);
    canopy(g, x, y - 46 * s, 26 * s, mix(0x3a8a2a, th.groundSpeck, 0.15), r);
  },
  pine: (g, x, y, s, th) => {
    shadow(g, x + 5, y, 40 * s);
    g.fillStyle(0x4a3020, 1); g.fillRect(x - 3 * s, y - 12 * s, 6 * s, 12 * s);
    const c = mix(0x1e5a32, th.ground, 0.2);
    const snowy = th.particle === 'snow';
    for (let i = 0; i < 4; i++) {
      const w = (24 - i * 5) * s, top = y - (14 + i * 13) * s;
      poly(g, [x - w, top, x, top - 22 * s, x + w, top], i % 2 ? c : dk(c, 0.15));
      if (snowy) poly(g, [x - w * 0.5, top - 11 * s, x, top - 22 * s, x + w * 0.5, top - 11 * s], 0xf4faff);
      else line(g, x - w * 0.8, top - 1, x + w * 0.2, top - 1, 1.5, lt(c, 0.25), 0.6);
    }
  },
  bush: (g, x, y, s, th, r) => {
    shadow(g, x + 3, y + 1, 34 * s);
    canopy(g, x, y - 9 * s, 15 * s, mix(0x3a7a2a, th.groundSpeck, 0.2), r);
    g.fillStyle(0xff6a8a, 0.9);
    for (let i = 0; i < 3; i++) g.fillCircle(x + (r() - 0.5) * 18 * s, y - 10 * s + (r() - 0.5) * 10 * s, 2 * s);
  },
  rock: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    const c = mix(0x6a6460, th.ground, 0.3);
    poly(g, [x - 13 * s, y, x - 10 * s, y - 10 * s, x - 2 * s, y - 15 * s, x + 9 * s, y - 11 * s, x + 13 * s, y - 2 * s, x + 6 * s, y + 2 * s], c);
    poly(g, [x - 10 * s, y - 10 * s, x - 2 * s, y - 15 * s, x + 9 * s, y - 11 * s, x + 1 * s, y - 7 * s], lt(c, 0.2));
    line(g, x - 2 * s, y - 7 * s, x + 3 * s, y + 1 * s, 1, dk(c, 0.3));
  },
  boulder: (g, x, y, s, th) => {
    shadow(g, x + 5, y, 58 * s);
    const c = mix(0x7a6a58, th.ground, 0.3);
    poly(g, [x - 26 * s, y, x - 22 * s, y - 22 * s, x - 6 * s, y - 32 * s, x + 16 * s, y - 28 * s, x + 26 * s, y - 10 * s, x + 20 * s, y + 3 * s], c);
    poly(g, [x - 22 * s, y - 22 * s, x - 6 * s, y - 32 * s, x + 16 * s, y - 28 * s, x + 2 * s, y - 18 * s, x - 12 * s, y - 16 * s], lt(c, 0.22));
    line(g, x + 2 * s, y - 18 * s, x + 8 * s, y - 2 * s, 1.5, dk(c, 0.35));
    line(g, x - 12 * s, y - 16 * s, x - 14 * s, y - 4 * s, 1.2, dk(c, 0.3));
    g.fillStyle(0x6a8a3a, 0.7); g.fillEllipse(x - 14 * s, y - 2 * s, 12 * s, 4 * s);
  },
  crate: (g, x, y, s) => {
    shadow(g, x + 3, y, 30 * s);
    const c = 0x9a6a3a;
    g.fillStyle(dk(c, 0.2), 1); g.fillRect(x - 12 * s, y - 20 * s, 24 * s, 20 * s);
    g.fillStyle(lt(c, 0.15), 1); g.fillRect(x - 12 * s, y - 26 * s, 24 * s, 7 * s);
    g.lineStyle(2, dk(c, 0.5), 1); g.strokeRect(x - 12 * s, y - 20 * s, 24 * s, 20 * s);
    line(g, x - 12 * s, y - 20 * s, x + 12 * s, y, 2, dk(c, 0.45));
    line(g, x + 12 * s, y - 20 * s, x - 12 * s, y, 2, dk(c, 0.45));
  },
  barrel: (g, x, y, s) => {
    shadow(g, x + 3, y, 24 * s);
    const c = 0x8a5a2a;
    g.fillStyle(c, 1); g.fillRoundedRect(x - 9 * s, y - 24 * s, 18 * s, 24 * s, 5 * s);
    g.fillStyle(lt(c, 0.2), 1); g.fillRect(x - 4 * s, y - 23 * s, 4 * s, 22 * s);
    g.fillStyle(0x3a3a40, 1); g.fillRect(x - 9 * s, y - 19 * s, 18 * s, 2.5 * s); g.fillRect(x - 9 * s, y - 7 * s, 18 * s, 2.5 * s);
    g.fillStyle(dk(c, 0.3), 1); g.fillEllipse(x, y - 24 * s, 17 * s, 6 * s);
  },
  well: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 48 * s);
    const st = mix(0x8a8478, th.wall, 0.3);
    g.fillStyle(dk(st, 0.2), 1); g.fillRect(x - 18 * s, y - 16 * s, 36 * s, 16 * s);
    g.fillStyle(st, 1); g.fillEllipse(x, y - 16 * s, 36 * s, 12 * s);
    g.fillStyle(0x0a1420, 1); g.fillEllipse(x, y - 16 * s, 26 * s, 7 * s);
    for (let i = -2; i <= 2; i++) line(g, x + i * 7 * s, y - 15 * s, x + i * 7 * s, y, 1, dk(st, 0.4));
    line(g, x - 15 * s, y - 16 * s, x - 15 * s, y - 42 * s, 3, 0x5a3a20);
    line(g, x + 15 * s, y - 16 * s, x + 15 * s, y - 42 * s, 3, 0x5a3a20);
    poly(g, [x - 22 * s, y - 40 * s, x, y - 54 * s, x + 22 * s, y - 40 * s], th.roof);
    line(g, x, y - 40 * s, x, y - 26 * s, 1, 0xc0a080);
    g.fillStyle(0x6a4a2a, 1); g.fillRect(x - 3 * s, y - 28 * s, 6 * s, 5 * s);
  },
  bench: (g, x, y, s) => {
    shadow(g, x + 2, y, 40 * s, 8 * s);
    const c = 0x8a5a30;
    g.fillStyle(0x2a2a30, 1); g.fillRect(x - 15 * s, y - 8 * s, 3 * s, 8 * s); g.fillRect(x + 12 * s, y - 8 * s, 3 * s, 8 * s);
    g.fillStyle(c, 1); g.fillRect(x - 18 * s, y - 10 * s, 36 * s, 4 * s);
    g.fillStyle(lt(c, 0.15), 1); g.fillRect(x - 18 * s, y - 20 * s, 36 * s, 3 * s); g.fillRect(x - 18 * s, y - 15 * s, 36 * s, 3 * s);
  },
  flowerbed: (g, x, y, s, th, r) => {
    g.fillStyle(0x4a3020, 0.9); g.fillEllipse(x, y, 52 * s, 22 * s);
    g.fillStyle(0x2a6a2a, 1);
    for (let i = 0; i < 14; i++) g.fillCircle(x + (r() - 0.5) * 44 * s, y + (r() - 0.5) * 14 * s, 4 * s);
    const cols = [0xff5a7a, 0xffe060, 0xffffff, 0xb07aff, lt(th.glow, 0.2)];
    for (let i = 0; i < 12; i++) {
      g.fillStyle(cols[i % cols.length], 1);
      g.fillCircle(x + (r() - 0.5) * 42 * s, y + (r() - 0.5) * 13 * s, 2.6 * s);
    }
  },
  statue: (g, x, y, s, th) => {
    shadow(g, x + 5, y, 46 * s);
    const st = mix(0xb0aca0, th.wall, 0.25);
    g.fillStyle(dk(st, 0.25), 1); g.fillRect(x - 16 * s, y - 14 * s, 32 * s, 14 * s);
    g.fillStyle(st, 1); g.fillRect(x - 18 * s, y - 17 * s, 36 * s, 4 * s);
    // A robed figure, one arm raised.
    poly(g, [x - 10 * s, y - 17 * s, x - 6 * s, y - 50 * s, x + 6 * s, y - 50 * s, x + 10 * s, y - 17 * s], st);
    g.fillStyle(lt(st, 0.15), 1); g.fillCircle(x, y - 56 * s, 7 * s);
    line(g, x + 5 * s, y - 46 * s, x + 14 * s, y - 64 * s, 4 * s, st);
    poly(g, [x - 6 * s, y - 50 * s, x - 1 * s, y - 50 * s, x - 4 * s, y - 18 * s, x - 9 * s, y - 18 * s], dk(st, 0.15));
    g.fillStyle(0x6a8a6a, 0.4); g.fillRect(x - 16 * s, y - 6 * s, 10 * s, 6 * s);
  },
  deadTree: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 34 * s);
    const c = mix(0x3a2e28, th.ground, 0.3);
    poly(g, [x - 5 * s, y, x - 2 * s, y - 40 * s, x + 2 * s, y - 40 * s, x + 6 * s, y], c);
    line(g, x, y - 26 * s, x - 16 * s, y - 42 * s, 3 * s, c);
    line(g, x - 12 * s, y - 38 * s, x - 18 * s, y - 52 * s, 2 * s, c);
    line(g, x + 1 * s, y - 34 * s, x + 14 * s, y - 50 * s, 2.5 * s, c);
    line(g, x + 10 * s, y - 45 * s, x + 20 * s, y - 48 * s, 1.5 * s, c);
    line(g, x, y - 40 * s, x + 2 * s, y - 58 * s, 2 * s, c);
  },
  willow: (g, x, y, s, th) => {
    shadow(g, x + 6, y, 60 * s);
    g.fillStyle(0x4a3424, 1); g.fillRect(x - 4 * s, y - 34 * s, 8 * s, 34 * s);
    const c = mix(0x5a8a4a, th.glow, 0.15);
    g.fillStyle(dk(c, 0.3), 1); g.fillEllipse(x, y - 44 * s, 60 * s, 34 * s);
    for (let i = -6; i <= 6; i++) {
      line(g, x + i * 4.5 * s, y - 50 * s, x + i * 5.2 * s, y - 14 * s + Math.abs(i) * 2 * s, 3 * s, i % 2 ? c : lt(c, 0.15), 0.95);
    }
  },
  fountain: (g, x, y, s, th) => {
    shadow(g, x, y + 4, 90 * s, 30 * s);
    const st = mix(0xb8b4a8, th.wall, 0.3);
    g.fillStyle(dk(st, 0.3), 1); g.fillEllipse(x, y, 84 * s, 34 * s);
    g.fillStyle(st, 1); g.fillEllipse(x, y - 6 * s, 84 * s, 32 * s);
    g.fillStyle(0x2a7ac8, 1); g.fillEllipse(x, y - 6 * s, 70 * s, 24 * s);
    g.fillStyle(0x8ad0ff, 0.6); g.fillEllipse(x - 10 * s, y - 9 * s, 30 * s, 8 * s);
    g.fillStyle(st, 1); g.fillRect(x - 5 * s, y - 34 * s, 10 * s, 28 * s);
    g.fillStyle(lt(st, 0.1), 1); g.fillEllipse(x, y - 34 * s, 30 * s, 10 * s);
    g.fillStyle(0x8ad0ff, 0.85);
    for (let i = -2; i <= 2; i++) line(g, x, y - 38 * s, x + i * 12 * s, y - 14 * s, 2, 0xbfe8ff, 0.7);
    g.fillCircle(x, y - 42 * s, 4 * s);
  },

  // ── fire / magma ───────────────────────────────────────────────────
  lavaVent: (g, x, y, s, th) => {
    const lava = th.feature.kind === 'river' && th.feature.color ? th.feature.color : 0xff5a10;
    g.fillStyle(0x140604, 1); g.fillEllipse(x, y, 54 * s, 26 * s);
    g.fillStyle(dk(lava, 0.4), 1); g.fillEllipse(x, y, 40 * s, 18 * s);
    g.fillStyle(lava, 1); g.fillEllipse(x, y, 30 * s, 12 * s);
    g.fillStyle(0xffe070, 0.9); g.fillEllipse(x - 4 * s, y - 1, 12 * s, 4 * s);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      line(g, x + Math.cos(a) * 15 * s, y + Math.sin(a) * 7 * s, x + Math.cos(a) * 30 * s, y + Math.sin(a) * 14 * s, 1.5, lava, 0.7);
    }
    g.fillStyle(lava, 0.12); g.fillEllipse(x, y, 90 * s, 40 * s);
  },
  brazier: (g, x, y, s) => {
    shadow(g, x + 3, y, 30 * s);
    line(g, x - 9 * s, y, x - 4 * s, y - 18 * s, 3, 0x2a2420);
    line(g, x + 9 * s, y, x + 4 * s, y - 18 * s, 3, 0x2a2420);
    line(g, x, y, x, y - 18 * s, 3, 0x2a2420);
    poly(g, [x - 14 * s, y - 26 * s, x + 14 * s, y - 26 * s, x + 9 * s, y - 16 * s, x - 9 * s, y - 16 * s], 0x3a3230);
    g.fillStyle(0xff5a10, 1); poly(g, [x - 11 * s, y - 26 * s, x - 6 * s, y - 40 * s, x - 1 * s, y - 30 * s, x + 4 * s, y - 46 * s, x + 7 * s, y - 32 * s, x + 11 * s, y - 26 * s], 0xff5a10);
    poly(g, [x - 6 * s, y - 26 * s, x - 2 * s, y - 34 * s, x + 3 * s, y - 38 * s, x + 6 * s, y - 26 * s], 0xffd040);
    g.fillStyle(0xff8a30, 0.12); g.fillCircle(x, y - 30 * s, 34 * s);
  },
  obsidianSpire: (g, x, y, s, th) => {
    shadow(g, x + 6, y, 40 * s);
    const c = 0x1a1420;
    poly(g, [x - 14 * s, y, x - 4 * s, y - 62 * s, x + 2 * s, y - 70 * s, x + 14 * s, y], c);
    poly(g, [x - 4 * s, y - 62 * s, x + 2 * s, y - 70 * s, x + 4 * s, y - 2 * s, x - 6 * s, y], lt(c, 0.12));
    line(g, x + 2 * s, y - 40 * s, x + 8 * s, y - 20 * s, 1.5, th.particleColor, 0.8);
    line(g, x - 6 * s, y - 24 * s, x - 2 * s, y - 10 * s, 1.2, th.particleColor, 0.6);
    poly(g, [x + 10 * s, y, x + 16 * s, y - 24 * s, x + 22 * s, y], dk(c, 0.1));
  },
  charredTree: (g, x, y, s, th, r) => {
    PROPS.deadTree(g, x, y, s, { ...th, ground: 0x0a0806 }, r);
    g.fillStyle(0xff6a20, 0.9);
    for (let i = 0; i < 4; i++) g.fillCircle(x + (r() - 0.5) * 6 * s, y - (8 + r() * 30) * s, 1.4 * s);
  },

  // ── water / depths ─────────────────────────────────────────────────
  lilyPond: (g, x, y, s, _th, r) => {
    g.fillStyle(0x2a4a2a, 1); g.fillEllipse(x, y, 72 * s, 32 * s);
    g.fillStyle(0x1a5a8a, 1); g.fillEllipse(x, y, 64 * s, 26 * s);
    g.fillStyle(0x8ad0ff, 0.35); g.fillEllipse(x - 12 * s, y - 4 * s, 26 * s, 6 * s);
    for (let i = 0; i < 4; i++) {
      const px = x + (r() - 0.5) * 44 * s, py = y + (r() - 0.5) * 14 * s;
      g.fillStyle(0x3a9a3a, 1); g.slice(px, py, 6 * s, 0.4, Math.PI * 2, false); g.fillPath();
      if (i % 2 === 0) { g.fillStyle(0xffb0d0, 1); g.fillCircle(px + 1, py - 1, 2 * s); }
    }
  },
  anchor: (g, x, y, s) => {
    shadow(g, x + 4, y, 34 * s);
    const c = 0x4a5058;
    g.lineStyle(4 * s, c, 1);
    g.beginPath(); g.moveTo(x, y - 6 * s); g.lineTo(x, y - 46 * s); g.strokePath();
    g.beginPath(); g.arc(x, y - 18 * s, 15 * s, 0.2, Math.PI - 0.2, false); g.strokePath();
    line(g, x - 10 * s, y - 40 * s, x + 10 * s, y - 40 * s, 4 * s, c);
    g.lineStyle(3 * s, c, 1); g.strokeCircle(x, y - 50 * s, 5 * s);
    poly(g, [x - 17 * s, y - 14 * s, x - 13 * s, y - 22 * s, x - 9 * s, y - 13 * s], c);
    poly(g, [x + 17 * s, y - 14 * s, x + 13 * s, y - 22 * s, x + 9 * s, y - 13 * s], c);
    g.lineStyle(1.5, 0x8a6a40, 0.8); g.beginPath(); g.moveTo(x, y - 55 * s); g.lineTo(x + 12 * s, y - 30 * s); g.lineTo(x + 6 * s, y - 4 * s); g.strokePath();
  },
  coral: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 36 * s);
    const c = th.particle === 'bubble' ? 0xff7a6a : 0xff8aa0;
    const br = (bx: number, by: number, len: number, a: number, w: number, d: number): void => {
      const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      line(g, bx, by, ex, ey, w, d % 2 ? c : lt(c, 0.15));
      g.fillStyle(lt(c, 0.3), 1); g.fillCircle(ex, ey, w * 0.6);
      if (d < 2) { br(ex, ey, len * 0.7, a - 0.5, w * 0.75, d + 1); br(ex, ey, len * 0.7, a + 0.5, w * 0.75, d + 1); }
    };
    br(x, y, 16 * s, -Math.PI / 2, 5 * s, 0);
    br(x - 6 * s, y, 12 * s, -Math.PI / 2 - 0.5, 4 * s, 1);
  },
  kelp: (g, x, y, s, th) => {
    const c = mix(0x2a8a4a, th.glow, 0.1);
    for (let k = -1; k <= 1; k++) {
      g.lineStyle(4 * s, k === 0 ? c : dk(c, 0.2), 1);
      g.beginPath(); g.moveTo(x + k * 7 * s, y);
      for (let i = 1; i <= 8; i++) g.lineTo(x + k * 7 * s + Math.sin(i * 0.9 + k) * 5 * s, y - i * 7 * s);
      g.strokePath();
      g.fillStyle(lt(c, 0.2), 1); g.fillEllipse(x + k * 7 * s + 4 * s, y - 30 * s - k * 6, 6 * s, 3 * s);
    }
  },
  buoy: (g, x, y, s) => {
    shadow(g, x + 2, y, 24 * s);
    g.fillStyle(0xd02a2a, 1); g.fillCircle(x, y - 12 * s, 11 * s);
    g.fillStyle(0xffffff, 1); g.fillRect(x - 11 * s, y - 14 * s, 22 * s, 4 * s);
    g.fillStyle(0xff8a8a, 0.6); g.fillCircle(x - 4 * s, y - 16 * s, 3 * s);
    line(g, x, y - 23 * s, x, y - 34 * s, 2, 0x3a3a40);
    g.fillStyle(0xffe070, 1); g.fillCircle(x, y - 35 * s, 2.5 * s);
  },

  // ── life / harvest / devotion ──────────────────────────────────────
  beehive: (g, x, y, s) => {
    shadow(g, x + 2, y, 26 * s);
    line(g, x, y, x, y - 14 * s, 3, 0x5a3a20);
    const c = 0xe0b040;
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i % 2 ? c : dk(c, 0.12), 1);
      g.fillEllipse(x, y - (16 + i * 6) * s, (22 - i * 4) * s, 8 * s);
    }
    g.fillStyle(0x2a1a0a, 1); g.fillCircle(x, y - 17 * s, 2.5 * s);
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(x + 12 * s, y - 32 * s, 1.5); g.fillCircle(x - 10 * s, y - 36 * s, 1.5);
  },
  mushroomRing: (g, x, y, s, _th, r) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const px = x + Math.cos(a) * 26 * s, py = y + Math.sin(a) * 11 * s;
      g.fillStyle(0xf0e0c8, 1); g.fillRect(px - 1.5 * s, py - 5 * s, 3 * s, 5 * s);
      g.fillStyle(r() < 0.5 ? 0xd03a3a : 0xc08a5a, 1); g.slice(px, py - 5 * s, 5 * s, Math.PI, 0, false); g.fillPath();
      g.fillStyle(0xffffff, 0.9); g.fillCircle(px - 1.5 * s, py - 7 * s, 1);
    }
    g.fillStyle(0x9aff6a, 0.06); g.fillEllipse(x, y, 60 * s, 26 * s);
  },
  scarecrow: (g, x, y, s) => {
    shadow(g, x + 3, y, 26 * s);
    line(g, x, y, x, y - 46 * s, 3, 0x6a4a2a);
    line(g, x - 18 * s, y - 34 * s, x + 18 * s, y - 34 * s, 3, 0x6a4a2a);
    poly(g, [x - 10 * s, y - 38 * s, x + 10 * s, y - 38 * s, x + 12 * s, y - 16 * s, x - 12 * s, y - 16 * s], 0x6a5a8a);
    poly(g, [x - 18 * s, y - 36 * s, x - 10 * s, y - 38 * s, x - 10 * s, y - 31 * s, x - 18 * s, y - 31 * s], 0x6a5a8a);
    poly(g, [x + 18 * s, y - 36 * s, x + 10 * s, y - 38 * s, x + 10 * s, y - 31 * s, x + 18 * s, y - 31 * s], 0x6a5a8a);
    line(g, x - 21 * s, y - 33 * s, x - 24 * s, y - 28 * s, 1.5, 0xe0c060);
    line(g, x + 21 * s, y - 33 * s, x + 24 * s, y - 28 * s, 1.5, 0xe0c060);
    g.fillStyle(0xe8a040, 1); g.fillCircle(x, y - 46 * s, 8 * s);
    g.fillStyle(0x1a0a00, 1); poly(g, [x - 5 * s, y - 48 * s, x - 2 * s, y - 48 * s, x - 3.5 * s, y - 45 * s], 0x1a0a00);
    poly(g, [x + 2 * s, y - 48 * s, x + 5 * s, y - 48 * s, x + 3.5 * s, y - 45 * s], 0x1a0a00);
    line(g, x - 4 * s, y - 42 * s, x + 4 * s, y - 42 * s, 1.2, 0x1a0a00);
    poly(g, [x - 13 * s, y - 52 * s, x + 13 * s, y - 52 * s, x + 6 * s, y - 56 * s, x, y - 66 * s, x - 6 * s, y - 56 * s], 0x8a6a30);
  },
  pumpkin: (g, x, y, s) => {
    shadow(g, x + 2, y, 26 * s);
    const c = 0xe87a20;
    g.fillStyle(dk(c, 0.2), 1); g.fillEllipse(x - 6 * s, y - 8 * s, 12 * s, 16 * s); g.fillEllipse(x + 6 * s, y - 8 * s, 12 * s, 16 * s);
    g.fillStyle(c, 1); g.fillEllipse(x, y - 8 * s, 14 * s, 17 * s);
    g.fillStyle(lt(c, 0.3), 0.7); g.fillEllipse(x - 2 * s, y - 11 * s, 4 * s, 8 * s);
    line(g, x, y - 16 * s, x + 2 * s, y - 21 * s, 2.5, 0x4a6a2a);
    g.fillStyle(0xffd040, 0.9);
    poly(g, [x - 5 * s, y - 10 * s, x - 2 * s, y - 10 * s, x - 3.5 * s, y - 7 * s], 0xffd040);
    poly(g, [x + 2 * s, y - 10 * s, x + 5 * s, y - 10 * s, x + 3.5 * s, y - 7 * s], 0xffd040);
  },
  haybale: (g, x, y, s) => {
    shadow(g, x + 3, y, 36 * s);
    const c = 0xd8b040;
    g.fillStyle(dk(c, 0.15), 1); g.fillRoundedRect(x - 16 * s, y - 18 * s, 32 * s, 18 * s, 4 * s);
    g.fillStyle(c, 1); g.fillEllipse(x + 12 * s, y - 9 * s, 10 * s, 18 * s);
    for (let i = 0; i < 5; i++) line(g, x - 14 * s + i * 6 * s, y - 16 * s, x - 12 * s + i * 6 * s, y - 2 * s, 1, lt(c, 0.25), 0.7);
    line(g, x - 6 * s, y - 18 * s, x - 6 * s, y, 1.5, 0x8a4a20);
    line(g, x + 4 * s, y - 18 * s, x + 4 * s, y, 1.5, 0x8a4a20);
  },
  wheat: (g, x, y, s, _th, r) => {
    for (let i = 0; i < 16; i++) {
      const px = x + (r() - 0.5) * 50 * s, py = y + (r() - 0.5) * 18 * s;
      const h = (14 + r() * 8) * s;
      line(g, px, py, px + 2 * s, py - h, 1.2, 0xc8a040);
      g.fillStyle(0xe8c050, 1); g.fillEllipse(px + 2 * s, py - h - 2 * s, 3 * s, 6 * s);
    }
  },
  heartArch: (g, x, y, s, th) => {
    shadow(g, x, y + 2, 60 * s, 12 * s);
    const c = th.trim;
    line(g, x - 22 * s, y, x - 22 * s, y - 40 * s, 5 * s, lt(th.wall, 0.1));
    line(g, x + 22 * s, y, x + 22 * s, y - 40 * s, 5 * s, lt(th.wall, 0.1));
    g.lineStyle(5 * s, lt(th.wall, 0.1), 1);
    g.beginPath(); g.arc(x, y - 40 * s, 22 * s, Math.PI, 0, false); g.strokePath();
    const hx = x, hy = y - 66 * s;
    g.fillStyle(0xff5fa2, 1); g.fillCircle(hx - 5 * s, hy, 6 * s); g.fillCircle(hx + 5 * s, hy, 6 * s);
    poly(g, [hx - 11 * s, hy + 1, hx + 11 * s, hy + 1, hx, hy + 13 * s], 0xff5fa2);
    g.fillStyle(0x6ad06a, 1);
    for (let i = 0; i < 8; i++) g.fillCircle(x - 22 * s + (i % 2) * 3, y - 6 * s - i * 5 * s, 3 * s);
    g.fillStyle(c, 0.9); for (let i = 0; i < 3; i++) g.fillCircle(x + 22 * s, y - 10 * s - i * 11 * s, 2.5 * s);
  },
  candle: (g, x, y, s, th) => {
    shadow(g, x + 2, y, 18 * s);
    for (const [ox, h] of [[-5, 16], [3, 22], [8, 12]] as [number, number][]) {
      g.fillStyle(0xf0e4c8, 1); g.fillRect(x + ox * s - 2.5 * s, y - h * s, 5 * s, h * s);
      g.fillStyle(0xd8c8a0, 1); g.fillRect(x + ox * s + 0.5 * s, y - h * s, 2 * s, h * s);
      g.fillStyle(0xffd060, 1); g.fillEllipse(x + ox * s, y - h * s - 4 * s, 3.5 * s, 7 * s);
      g.fillStyle(th.glow, 0.15); g.fillCircle(x + ox * s, y - h * s - 4 * s, 9 * s);
    }
  },

  // ── air / gravity / psychic ────────────────────────────────────────
  windmill: (g, x, y, s, th) => {
    shadow(g, x + 6, y, 54 * s);
    const c = lt(th.wall, 0.05);
    poly(g, [x - 16 * s, y, x - 10 * s, y - 60 * s, x + 10 * s, y - 60 * s, x + 16 * s, y], c);
    poly(g, [x + 4 * s, y - 60 * s, x + 10 * s, y - 60 * s, x + 16 * s, y, x + 8 * s, y], dk(c, 0.15));
    poly(g, [x - 13 * s, y - 60 * s, x, y - 74 * s, x + 13 * s, y - 60 * s], th.roof);
    g.fillStyle(0x4a3020, 1); g.fillRoundedRect(x - 5 * s, y - 14 * s, 10 * s, 14 * s, { tl: 5 * s, tr: 5 * s, bl: 0, br: 0 });
    g.fillStyle(th.glow, 0.9); g.fillRect(x - 3 * s, y - 42 * s, 6 * s, 7 * s);
    const hx = x, hy = y - 58 * s;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.35;
      const ex = hx + Math.cos(a) * 34 * s, ey = hy + Math.sin(a) * 34 * s;
      line(g, hx, hy, ex, ey, 2, 0x5a3a20);
      const px = -Math.sin(a) * 7 * s, py = Math.cos(a) * 7 * s;
      poly(g, [hx + Math.cos(a) * 10 * s, hy + Math.sin(a) * 10 * s, ex, ey, ex + px, ey + py, hx + Math.cos(a) * 10 * s + px, hy + Math.sin(a) * 10 * s + py], 0xf0ece0, 0.92);
    }
    g.fillStyle(0x3a2a1a, 1); g.fillCircle(hx, hy, 3.5 * s);
  },
  floatRock: (g, x, y, s, th) => {
    g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y, 34 * s, 9 * s);
    const c = mix(0x7a7068, th.ground, 0.3);
    const fy = y - 34 * s;
    poly(g, [x - 18 * s, fy, x + 18 * s, fy, x + 10 * s, fy + 10 * s, x + 2 * s, fy + 22 * s, x - 8 * s, fy + 10 * s], dk(c, 0.2));
    g.fillStyle(mix(0x4a8a3a, th.groundSpeck, 0.25), 1); g.fillEllipse(x, fy, 38 * s, 10 * s);
    g.fillStyle(lt(th.particleColor, 0.2), 0.7); g.fillCircle(x + 9 * s, fy + 18 * s, 1.5); g.fillCircle(x - 6 * s, fy + 24 * s, 1.2);
    line(g, x - 2 * s, fy - 4 * s, x - 2 * s, fy - 14 * s, 2, 0x5a3a20);
    g.fillStyle(0x4a8a3a, 1); g.fillCircle(x - 2 * s, fy - 16 * s, 6 * s);
  },
  cloudPuff: (g, x, y, s) => {
    g.fillStyle(0xffffff, 0.35);
    for (let i = 0; i < 6; i++) g.fillEllipse(x + (i - 2.5) * 12 * s, y + Math.sin(i * 1.7) * 4 * s, 28 * s, 16 * s);
    g.fillStyle(0xffffff, 0.5); g.fillEllipse(x - 4 * s, y - 4 * s, 40 * s, 14 * s);
  },
  orbitStones: (g, x, y, s, th) => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y, 40 * s, 10 * s);
    g.lineStyle(1, th.glow, 0.35); g.strokeEllipse(x, y - 30 * s, 56 * s, 18 * s);
    g.fillStyle(th.glow, 0.85); g.fillCircle(x, y - 30 * s, 7 * s);
    g.fillStyle(lt(th.glow, 0.5), 1); g.fillCircle(x - 2 * s, y - 32 * s, 3 * s);
    const c = mix(0x6a6070, th.wall, 0.3);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const px = x + Math.cos(a) * 28 * s, py = y - 30 * s + Math.sin(a) * 9 * s;
      g.fillStyle(c, 1); g.fillCircle(px, py, (3 + (i % 3)) * s);
      g.fillStyle(lt(c, 0.25), 1); g.fillCircle(px - 1, py - 1, 1.3 * s);
    }
  },
  crater: (g, x, y, s, th) => {
    g.fillStyle(dk(th.ground, 0.4), 1); g.fillEllipse(x, y, 60 * s, 26 * s);
    g.fillStyle(lt(th.groundAlt, 0.1), 1); g.fillEllipse(x, y - 3 * s, 60 * s, 8 * s);
    g.fillStyle(dk(th.ground, 0.6), 1); g.fillEllipse(x, y + 2 * s, 40 * s, 14 * s);
    g.fillStyle(th.groundSpeck, 0.4); g.fillCircle(x + 6 * s, y + 3 * s, 2 * s);
  },
  eyeStatue: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 44 * s);
    const st = mix(0x8a7aa0, th.wall, 0.4);
    g.fillStyle(dk(st, 0.2), 1); g.fillRect(x - 14 * s, y - 20 * s, 28 * s, 20 * s);
    poly(g, [x - 11 * s, y - 20 * s, x - 7 * s, y - 52 * s, x + 7 * s, y - 52 * s, x + 11 * s, y - 20 * s], st);
    g.fillStyle(0xf8f0ff, 1); g.fillEllipse(x, y - 62 * s, 28 * s, 16 * s);
    g.fillStyle(th.glow, 1); g.fillCircle(x, y - 62 * s, 6 * s);
    g.fillStyle(0x0a0010, 1); g.fillCircle(x, y - 62 * s, 3 * s);
    g.lineStyle(2, dk(st, 0.4), 1); g.strokeEllipse(x, y - 62 * s, 28 * s, 16 * s);
    g.fillStyle(th.glow, 0.15); g.fillCircle(x, y - 62 * s, 22 * s);
  },

  // ── earth / creation / metal ───────────────────────────────────────
  mineCart: (g, x, y, s) => {
    shadow(g, x + 3, y, 46 * s);
    line(g, x - 30 * s, y - 2 * s, x + 30 * s, y - 2 * s, 2, 0x5a5048);
    line(g, x - 30 * s, y + 4 * s, x + 30 * s, y + 4 * s, 2, 0x5a5048);
    poly(g, [x - 18 * s, y - 22 * s, x + 18 * s, y - 22 * s, x + 14 * s, y - 6 * s, x - 14 * s, y - 6 * s], 0x6a5a4a);
    g.fillStyle(0x3a3430, 1); g.fillRect(x - 18 * s, y - 24 * s, 36 * s, 3 * s);
    g.fillStyle(0x8a7a6a, 1); g.fillCircle(x - 6 * s, y - 24 * s, 5 * s); g.fillCircle(x + 5 * s, y - 25 * s, 6 * s);
    g.fillStyle(0xffd040, 1); g.fillCircle(x + 3 * s, y - 27 * s, 2 * s);
    g.fillStyle(0x2a2420, 1); g.fillCircle(x - 9 * s, y - 4 * s, 4 * s); g.fillCircle(x + 9 * s, y - 4 * s, 4 * s);
  },
  anvil: (g, x, y, s) => {
    shadow(g, x + 3, y, 36 * s);
    g.fillStyle(0x5a3a20, 1); g.fillRect(x - 9 * s, y - 14 * s, 18 * s, 14 * s);
    const c = 0x3a3c44;
    poly(g, [x - 8 * s, y - 14 * s, x + 8 * s, y - 14 * s, x + 6 * s, y - 20 * s, x - 6 * s, y - 20 * s], c);
    poly(g, [x - 22 * s, y - 26 * s, x + 14 * s, y - 26 * s, x + 14 * s, y - 20 * s, x - 10 * s, y - 20 * s], c);
    poly(g, [x - 22 * s, y - 26 * s, x - 30 * s, y - 25 * s, x - 10 * s, y - 21 * s], c);
    line(g, x - 22 * s, y - 26 * s, x + 14 * s, y - 26 * s, 1.5, 0x8a8c98);
    line(g, x + 6 * s, y - 30 * s, x + 18 * s, y - 40 * s, 2.5, 0x6a4a2a);
    g.fillStyle(0x5a5c64, 1); g.fillRect(x + 14 * s, y - 44 * s, 8 * s, 6 * s);
  },
  chimneyForge: (g, x, y, s, th) => {
    shadow(g, x + 5, y, 50 * s);
    const c = mix(0x7a4a34, th.wall, 0.3);
    g.fillStyle(dk(c, 0.2), 1); g.fillRect(x - 20 * s, y - 24 * s, 40 * s, 24 * s);
    g.fillStyle(c, 1); g.fillRect(x - 20 * s, y - 28 * s, 40 * s, 5 * s);
    g.fillStyle(0x140804, 1); g.fillRoundedRect(x - 10 * s, y - 20 * s, 20 * s, 16 * s, { tl: 8 * s, tr: 8 * s, bl: 0, br: 0 });
    g.fillStyle(0xff7a20, 1); g.fillEllipse(x, y - 8 * s, 14 * s, 8 * s);
    g.fillStyle(0xffd060, 1); g.fillEllipse(x, y - 8 * s, 6 * s, 3 * s);
    g.fillStyle(dk(c, 0.1), 1); g.fillRect(x + 6 * s, y - 60 * s, 10 * s, 34 * s);
    g.fillStyle(dk(c, 0.35), 1); g.fillRect(x + 5 * s, y - 62 * s, 12 * s, 4 * s);
    for (let i = 0; i < 4; i++) { g.fillStyle(0x6a6a6a, 0.35 - i * 0.07); g.fillCircle(x + 11 * s + i * 4 * s, y - 68 * s - i * 9 * s, (4 + i * 2) * s); }
    g.fillStyle(0xff7a20, 0.1); g.fillCircle(x, y - 8 * s, 30 * s);
  },
  gearPile: (g, x, y, s, _th, r) => {
    shadow(g, x + 3, y, 40 * s);
    for (let i = 0; i < 4; i++) {
      const px = x + (r() - 0.5) * 22 * s, py = y - 6 * s - i * 4 * s;
      gearShape(g, px, py, (5 + r() * 5) * s, i % 2 ? 0x8a8c94 : 0xb08a40);
    }
  },
  gear: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 40 * s);
    g.fillStyle(0x3a3c44, 1); g.fillRect(x - 3 * s, y - 30 * s, 6 * s, 30 * s);
    gearShape(g, x, y - 34 * s, 18 * s, mix(0x9a8a5a, th.trim, 0.3));
    gearShape(g, x + 18 * s, y - 20 * s, 9 * s, 0x8a8c94);
  },
  pipeStack: (g, x, y, s) => {
    shadow(g, x + 3, y, 44 * s);
    const c = 0x6a6c74;
    for (const [ox, oy] of [[-10, 0], [10, 0], [0, -12]] as [number, number][]) {
      g.fillStyle(c, 1); g.fillRect(x + ox * s - 14 * s, y + oy * s - 12 * s, 28 * s, 11 * s);
      g.fillStyle(lt(c, 0.25), 1); g.fillRect(x + ox * s - 14 * s, y + oy * s - 12 * s, 28 * s, 3 * s);
      g.fillStyle(0x1a1a1e, 1); g.fillEllipse(x + ox * s + 14 * s, y + oy * s - 6.5 * s, 5 * s, 11 * s);
    }
  },

  // ── oil / radiation / acid / slime ─────────────────────────────────
  derrick: (g, x, y, s, th) => {
    shadow(g, x + 6, y, 60 * s);
    const c = 0x2a2420;
    line(g, x - 22 * s, y, x - 3 * s, y - 80 * s, 3, c);
    line(g, x + 22 * s, y, x + 3 * s, y - 80 * s, 3, c);
    for (let i = 1; i < 6; i++) {
      const yy = y - i * 14 * s, w = 22 * s * (1 - i / 6.5);
      line(g, x - w, yy, x + w, yy, 1.5, c);
      line(g, x - w, yy, x + w * 0.85, yy - 14 * s, 1, c, 0.8);
    }
    g.fillStyle(0x4a3a2a, 1); g.fillRect(x - 6 * s, y - 86 * s, 12 * s, 7 * s);
    g.fillStyle(th.glow, 1); g.fillCircle(x, y - 88 * s, 2.5 * s);
    // Pump jack beside it.
    line(g, x + 18 * s, y, x + 26 * s, y - 20 * s, 3, 0x3a3230);
    line(g, x + 10 * s, y - 22 * s, x + 44 * s, y - 16 * s, 4, 0xa07a20);
    g.fillStyle(0xa07a20, 1); g.fillCircle(x + 10 * s, y - 22 * s, 5 * s);
    g.fillStyle(0x0a0806, 0.9); g.fillEllipse(x + 6 * s, y + 4 * s, 30 * s, 8 * s);
  },
  oilSlick: (g, x, y, s) => {
    g.fillStyle(0x0a0806, 0.95); g.fillEllipse(x, y, 60 * s, 24 * s); g.fillEllipse(x + 20 * s, y + 6 * s, 30 * s, 14 * s);
    g.fillStyle(0x6a3aff, 0.25); g.fillEllipse(x - 8 * s, y - 3 * s, 26 * s, 6 * s);
    g.fillStyle(0x3affb0, 0.2); g.fillEllipse(x + 4 * s, y + 1 * s, 22 * s, 4 * s);
    g.fillStyle(0xffd040, 0.18); g.fillEllipse(x + 14 * s, y - 2 * s, 14 * s, 3 * s);
  },
  barrelHazard: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 26 * s);
    const c = th.particle === 'bubble' ? 0x5a8a2a : 0xd0b020;
    g.fillStyle(c, 1); g.fillRoundedRect(x - 10 * s, y - 26 * s, 20 * s, 26 * s, 4 * s);
    g.fillStyle(dk(c, 0.3), 1); g.fillRect(x - 10 * s, y - 20 * s, 20 * s, 2.5 * s); g.fillRect(x - 10 * s, y - 8 * s, 20 * s, 2.5 * s);
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(x, y - 14 * s, 4.5 * s);
    g.fillStyle(c, 1); g.fillCircle(x, y - 14 * s, 1.5 * s);
    g.fillStyle(th.particleColor, 0.9); g.fillEllipse(x + 2 * s, y - 26 * s, 14 * s, 4 * s);
    line(g, x + 7 * s, y - 25 * s, x + 9 * s, y - 15 * s, 2.5 * s, th.particleColor, 0.9);
    g.fillStyle(th.particleColor, 0.85); g.fillEllipse(x + 12 * s, y + 1, 14 * s, 5 * s);
  },
  warningSign: (g, x, y, s) => {
    shadow(g, x + 2, y, 18 * s);
    line(g, x, y, x, y - 34 * s, 3, 0x4a4a50);
    poly(g, [x, y - 56 * s, x - 14 * s, y - 32 * s, x + 14 * s, y - 32 * s], 0xffd020);
    g.lineStyle(2, 0x1a1a1a, 1);
    g.beginPath(); g.moveTo(x, y - 56 * s); g.lineTo(x - 14 * s, y - 32 * s); g.lineTo(x + 14 * s, y - 32 * s); g.closePath(); g.strokePath();
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(x, y - 40 * s, 2 * s);
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      g.slice(x, y - 40 * s, 7 * s, a - 0.45, a + 0.45, false); g.fillPath();
    }
  },
  acidPool: (g, x, y, s, th) => {
    const c = th.feature.kind === 'river' && th.particle === 'bubble' ? th.feature.color : th.particleColor;
    g.fillStyle(dk(c, 0.6), 1); g.fillEllipse(x, y, 62 * s, 26 * s);
    g.fillStyle(c, 0.9); g.fillEllipse(x, y, 52 * s, 20 * s);
    g.fillStyle(lt(c, 0.4), 0.6); g.fillEllipse(x - 10 * s, y - 3 * s, 20 * s, 5 * s);
    g.lineStyle(1.2, lt(c, 0.5), 0.8); g.strokeCircle(x + 10 * s, y + 2 * s, 3 * s); g.strokeCircle(x - 4 * s, y + 4 * s, 2 * s);
    g.fillStyle(c, 0.1); g.fillEllipse(x, y, 90 * s, 38 * s);
  },
  gumBlob: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 36 * s);
    const c = th.wall;
    g.fillStyle(dk(c, 0.15), 0.95); g.fillEllipse(x, y - 9 * s, 36 * s, 22 * s);
    g.fillStyle(c, 0.9); g.fillEllipse(x - 2 * s, y - 12 * s, 28 * s, 18 * s);
    g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - 7 * s, y - 16 * s, 8 * s, 4 * s);
    g.fillStyle(0x0a1a0a, 1); g.fillCircle(x - 4 * s, y - 12 * s, 2 * s); g.fillCircle(x + 4 * s, y - 12 * s, 2 * s);
    g.fillStyle(c, 0.8); g.fillEllipse(x + 16 * s, y + 1, 10 * s, 5 * s);
  },

  // ── ice ────────────────────────────────────────────────────────────
  iceSpike: (g, x, y, s) => {
    shadow(g, x + 4, y, 40 * s);
    const c = 0x9ad8ff;
    for (const [ox, h, w] of [[-10, 34, 8], [0, 54, 11], [11, 28, 7]] as [number, number, number][]) {
      poly(g, [x + (ox - w) * s, y, x + ox * s, y - h * s, x + (ox + w) * s, y], c, 0.9);
      poly(g, [x + (ox - w) * s, y, x + ox * s, y - h * s, x + ox * s, y], lt(c, 0.45), 0.9);
    }
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 2 * s, y - 40 * s, 1.5);
  },
  snowman: (g, x, y, s) => {
    shadow(g, x + 3, y, 30 * s);
    g.fillStyle(0xf4faff, 1); g.fillCircle(x, y - 11 * s, 12 * s); g.fillCircle(x, y - 29 * s, 9 * s);
    g.fillStyle(0xc8dcec, 1); g.fillCircle(x + 4 * s, y - 8 * s, 6 * s);
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(x - 3 * s, y - 31 * s, 1.5 * s); g.fillCircle(x + 3 * s, y - 31 * s, 1.5 * s);
    poly(g, [x, y - 29 * s, x + 8 * s, y - 28 * s, x, y - 27 * s], 0xff8a20);
    g.fillStyle(0xd03a3a, 1); g.fillRect(x - 9 * s, y - 23 * s, 18 * s, 3 * s); g.fillRect(x + 4 * s, y - 23 * s, 3 * s, 9 * s);
    g.fillStyle(0x2a2a2a, 1); g.fillRect(x - 7 * s, y - 38 * s, 14 * s, 2 * s); g.fillRect(x - 5 * s, y - 46 * s, 10 * s, 8 * s);
    line(g, x - 10 * s, y - 18 * s, x - 20 * s, y - 26 * s, 1.5, 0x5a3a20);
    line(g, x + 10 * s, y - 18 * s, x + 20 * s, y - 24 * s, 1.5, 0x5a3a20);
  },
  snowdrift: (g, x, y, s) => {
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(x, y, 70 * s, 22 * s); g.fillEllipse(x + 20 * s, y - 4 * s, 40 * s, 18 * s);
    g.fillStyle(0xc8dcec, 0.6); g.fillEllipse(x + 6 * s, y + 5 * s, 60 * s, 8 * s);
  },

  // ── growth / crystal / magic ───────────────────────────────────────
  fungus: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 44 * s);
    const cap = th.roof, stem = 0xe8dcc0;
    g.fillStyle(stem, 1); g.fillRoundedRect(x - 5 * s, y - 34 * s, 10 * s, 34 * s, 3 * s);
    g.fillStyle(dk(stem, 0.15), 1); g.fillRect(x + 1 * s, y - 34 * s, 4 * s, 34 * s);
    g.fillStyle(dk(cap, 0.3), 1); g.fillEllipse(x, y - 34 * s, 46 * s, 14 * s);
    g.fillStyle(cap, 1); g.slice(x, y - 34 * s, 23 * s, Math.PI, 0, false); g.fillPath();
    g.fillStyle(lt(cap, 0.35), 1);
    g.fillCircle(x - 9 * s, y - 44 * s, 3 * s); g.fillCircle(x + 6 * s, y - 49 * s, 2.5 * s); g.fillCircle(x + 12 * s, y - 40 * s, 2 * s);
    g.fillStyle(th.glow, 0.12); g.fillCircle(x, y - 40 * s, 30 * s);
    g.fillStyle(stem, 1); g.fillRect(x + 14 * s, y - 12 * s, 4 * s, 12 * s);
    g.fillStyle(cap, 1); g.slice(x + 16 * s, y - 12 * s, 8 * s, Math.PI, 0, false); g.fillPath();
  },
  sporePod: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    const c = mix(0x8aaa3a, th.glow, 0.3);
    g.fillStyle(dk(c, 0.3), 1); g.fillEllipse(x, y - 14 * s, 26 * s, 28 * s);
    g.fillStyle(c, 1); g.fillEllipse(x - 1 * s, y - 15 * s, 22 * s, 24 * s);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillStyle(lt(th.glow, 0.3), 0.9); g.fillCircle(x + Math.cos(a) * 7 * s, y - 15 * s + Math.sin(a) * 8 * s, 2 * s);
    }
    g.fillStyle(th.glow, 0.15); g.fillCircle(x, y - 15 * s, 22 * s);
  },
  crystal: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 40 * s);
    const c = th.roof;
    for (const [ox, h, w, a] of [[-12, 30, 7, -0.25], [0, 50, 10, 0], [12, 34, 7, 0.3]] as [number, number, number, number][]) {
      const tx = x + ox * s + Math.sin(a) * h * s, ty = y - Math.cos(a) * h * s;
      poly(g, [x + (ox - w) * s, y, tx - w * 0.6 * s, ty + 8 * s, tx, ty, tx + w * 0.6 * s, ty + 8 * s, x + (ox + w) * s, y], dk(c, 0.15));
      poly(g, [x + ox * s, y, tx, ty, tx + w * 0.6 * s, ty + 8 * s, x + (ox + w) * s, y], lt(c, 0.3));
    }
    g.fillStyle(th.glow, 0.18); g.fillCircle(x, y - 26 * s, 30 * s);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x + 2 * s, y - 40 * s, 1.5);
  },
  geode: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 40 * s);
    g.fillStyle(0x5a5460, 1); g.fillEllipse(x, y - 12 * s, 40 * s, 26 * s);
    g.fillStyle(0xd8d0e0, 1); g.fillEllipse(x, y - 13 * s, 30 * s, 18 * s);
    g.fillStyle(th.roof, 1);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      poly(g, [x + Math.cos(a) * 13 * s, y - 13 * s + Math.sin(a) * 8 * s, x + Math.cos(a + 0.3) * 5 * s, y - 13 * s + Math.sin(a + 0.3) * 3 * s, x + Math.cos(a - 0.3) * 5 * s, y - 13 * s + Math.sin(a - 0.3) * 3 * s], i % 2 ? th.roof : lt(th.roof, 0.3));
    }
  },
  runeCircle: (g, x, y, s, th) => {
    g.fillStyle(th.glow, 0.08); g.fillEllipse(x, y, 90 * s, 40 * s);
    g.lineStyle(2, th.glow, 0.7); g.strokeEllipse(x, y, 76 * s, 32 * s);
    g.lineStyle(1, th.glow, 0.5); g.strokeEllipse(x, y, 58 * s, 24 * s);
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2, a2 = ((i + 2) / 5) * Math.PI * 2;
      line(g, x + Math.cos(a1) * 29 * s, y + Math.sin(a1) * 12 * s, x + Math.cos(a2) * 29 * s, y + Math.sin(a2) * 12 * s, 1, th.glow, 0.6);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(lt(th.glow, 0.4), 0.8); g.fillRect(x + Math.cos(a) * 34 * s - 2, y + Math.sin(a) * 14 * s - 2, 4, 4);
    }
  },
  bookPile: (g, x, y, s) => {
    shadow(g, x + 3, y, 32 * s);
    const cols = [0x8a2a2a, 0x2a4a8a, 0x2a6a3a, 0x6a3a8a, 0xa07a2a];
    for (let i = 0; i < 5; i++) {
      const w = (24 - (i % 3) * 3) * s, off = ((i * 7) % 5 - 2) * s;
      g.fillStyle(cols[i], 1); g.fillRect(x - w / 2 + off, y - (i + 1) * 6 * s, w, 5 * s);
      g.fillStyle(0xf0e4c8, 1); g.fillRect(x - w / 2 + off + w - 3 * s, y - (i + 1) * 6 * s + 1, 2 * s, 3 * s);
      g.fillStyle(0xffd070, 0.8); g.fillRect(x - w / 2 + off + 3 * s, y - (i + 1) * 6 * s + 2, w * 0.3, 1);
    }
  },

  // ── hunt / sand / death / soul ─────────────────────────────────────
  bonePile: (g, x, y, s) => {
    shadow(g, x + 2, y, 36 * s);
    const c = 0xe8e0c8;
    const bone = (x1: number, y1: number, x2: number, y2: number): void => {
      line(g, x1, y1, x2, y2, 3 * s, c);
      g.fillStyle(c, 1); g.fillCircle(x1, y1, 2.5 * s); g.fillCircle(x2, y2, 2.5 * s);
    };
    bone(x - 14 * s, y - 2 * s, x + 6 * s, y - 6 * s);
    bone(x - 6 * s, y - 10 * s, x + 14 * s, y - 2 * s);
    g.fillStyle(c, 1); g.fillCircle(x + 2 * s, y - 14 * s, 7 * s); g.fillRect(x - 2 * s, y - 10 * s, 8 * s, 5 * s);
    g.fillStyle(0x1a1410, 1); g.fillCircle(x - 1 * s, y - 15 * s, 2 * s); g.fillCircle(x + 5 * s, y - 15 * s, 2 * s);
  },
  antlerTotem: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 30 * s);
    const c = 0x5a3a20;
    g.fillStyle(c, 1); g.fillRect(x - 5 * s, y - 50 * s, 10 * s, 50 * s);
    for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? th.trim : 0xa03a2a, 0.9); g.fillRect(x - 5 * s, y - 14 * s - i * 11 * s, 10 * s, 3 * s); }
    g.fillStyle(0xe8e0c8, 1); g.fillEllipse(x, y - 54 * s, 14 * s, 12 * s);
    g.fillStyle(0x1a1410, 1); g.fillCircle(x - 3 * s, y - 55 * s, 1.8 * s); g.fillCircle(x + 3 * s, y - 55 * s, 1.8 * s);
    const ant = (sx: number): void => {
      line(g, x + sx * 5 * s, y - 58 * s, x + sx * 18 * s, y - 72 * s, 2.5 * s, 0xe8e0c8);
      line(g, x + sx * 11 * s, y - 65 * s, x + sx * 10 * s, y - 76 * s, 2 * s, 0xe8e0c8);
      line(g, x + sx * 16 * s, y - 70 * s, x + sx * 24 * s, y - 74 * s, 2 * s, 0xe8e0c8);
    };
    ant(-1); ant(1);
  },
  tent: (g, x, y, s, th) => {
    shadow(g, x + 5, y + 2, 64 * s);
    const c = th.roof;
    poly(g, [x - 30 * s, y, x, y - 44 * s, x + 30 * s, y], c);
    poly(g, [x, y - 44 * s, x + 30 * s, y, x + 8 * s, y], dk(c, 0.2));
    for (let i = 1; i < 4; i++) line(g, x - i * 7 * s, y - 44 * s + i * 11 * s, x - i * 7 * s + 3 * s, y, 1, lt(c, 0.25), 0.6);
    poly(g, [x - 7 * s, y, x, y - 20 * s, x + 7 * s, y], 0x1a1008);
    line(g, x, y - 44 * s, x, y - 54 * s, 1.5, 0x5a3a20);
    poly(g, [x, y - 54 * s, x + 10 * s, y - 51 * s, x, y - 48 * s], th.trim);
  },
  cactus: (g, x, y, s) => {
    shadow(g, x + 4, y, 30 * s);
    const c = 0x4a8a3a;
    g.fillStyle(c, 1); g.fillRoundedRect(x - 6 * s, y - 46 * s, 12 * s, 46 * s, 6 * s);
    g.fillRoundedRect(x - 18 * s, y - 32 * s, 8 * s, 18 * s, 4 * s); g.fillRect(x - 14 * s, y - 18 * s, 10 * s, 6 * s);
    g.fillRoundedRect(x + 10 * s, y - 38 * s, 8 * s, 20 * s, 4 * s); g.fillRect(x + 4 * s, y - 22 * s, 10 * s, 6 * s);
    g.fillStyle(lt(c, 0.2), 1); g.fillRect(x - 2 * s, y - 44 * s, 2 * s, 42 * s);
    g.fillStyle(0xff7aa0, 1); g.fillCircle(x, y - 47 * s, 3 * s);
  },
  duneMound: (g, x, y, s, th) => {
    g.fillStyle(lt(th.groundAlt, 0.1), 0.9); g.fillEllipse(x, y, 90 * s, 28 * s);
    g.fillStyle(dk(th.ground, 0.12), 0.8); g.fillEllipse(x + 14 * s, y + 4 * s, 60 * s, 14 * s);
    for (let i = 0; i < 3; i++) {
      g.lineStyle(1, dk(th.ground, 0.2), 0.6);
      g.beginPath(); g.arc(x - 10 * s + i * 10 * s, y + 20 * s, 30 * s, -2.3, -0.9, false); g.strokePath();
    }
  },
  coffin: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 40 * s);
    const c = mix(0x4a3424, th.wall, 0.2);
    poly(g, [x - 8 * s, y - 40 * s, x + 8 * s, y - 40 * s, x + 12 * s, y - 30 * s, x + 8 * s, y, x - 8 * s, y, x - 12 * s, y - 30 * s], c);
    poly(g, [x - 6 * s, y - 37 * s, x + 6 * s, y - 37 * s, x + 9 * s, y - 29 * s, x + 6 * s, y - 3 * s, x - 6 * s, y - 3 * s, x - 9 * s, y - 29 * s], lt(c, 0.12));
    line(g, x, y - 32 * s, x, y - 14 * s, 2, th.trim);
    line(g, x - 5 * s, y - 27 * s, x + 5 * s, y - 27 * s, 2, th.trim);
  },
  gravestone: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    const st = mix(0x7a7680, th.wall, 0.3);
    g.fillStyle(dk(st, 0.2), 1); g.fillRect(x - 12 * s, y - 4 * s, 24 * s, 4 * s);
    g.fillStyle(st, 1); g.fillRoundedRect(x - 9 * s, y - 30 * s, 18 * s, 27 * s, { tl: 9 * s, tr: 9 * s, bl: 0, br: 0 });
    g.fillStyle(lt(st, 0.15), 1); g.fillRect(x - 7 * s, y - 24 * s, 3 * s, 20 * s);
    line(g, x - 4 * s, y - 20 * s, x + 4 * s, y - 20 * s, 1.5, dk(st, 0.45));
    line(g, x - 4 * s, y - 15 * s, x + 3 * s, y - 15 * s, 1.2, dk(st, 0.45));
    g.fillStyle(0x4a6a3a, 0.7); g.fillEllipse(x - 6 * s, y - 1, 8 * s, 3 * s);
  },
  ghostLantern: (g, x, y, s, th) => {
    shadow(g, x + 2, y, 18 * s);
    line(g, x, y, x, y - 44 * s, 2.5, 0x2a2430);
    line(g, x, y - 44 * s, x + 10 * s, y - 46 * s, 2, 0x2a2430);
    g.fillStyle(th.glow, 0.12); g.fillCircle(x + 10 * s, y - 34 * s, 22 * s);
    g.fillStyle(0x2a2430, 1); g.fillRect(x + 4 * s, y - 42 * s, 12 * s, 3 * s); g.fillRect(x + 4 * s, y - 28 * s, 12 * s, 2 * s);
    g.fillStyle(th.glow, 0.9); g.fillRoundedRect(x + 5 * s, y - 39 * s, 10 * s, 11 * s, 3 * s);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(x + 10 * s, y - 34 * s, 2.5 * s);
  },

  // ── shadow / silence / illusion ────────────────────────────────────
  obelisk: (g, x, y, s, th) => {
    shadow(g, x + 6, y, 40 * s);
    const c = 0x14101a;
    g.fillStyle(dk(c, 0.2), 1); g.fillRect(x - 14 * s, y - 8 * s, 28 * s, 8 * s);
    poly(g, [x - 9 * s, y - 8 * s, x - 6 * s, y - 66 * s, x, y - 76 * s, x + 6 * s, y - 66 * s, x + 9 * s, y - 8 * s], c);
    poly(g, [x, y - 76 * s, x + 6 * s, y - 66 * s, x + 9 * s, y - 8 * s, x + 2 * s, y - 8 * s], lt(c, 0.08));
    for (let i = 0; i < 4; i++) { g.fillStyle(th.glow, 0.8); g.fillRect(x - 2 * s, y - 24 * s - i * 11 * s, 4 * s, 4 * s); }
    g.fillStyle(th.glow, 0.1); g.fillCircle(x, y - 40 * s, 24 * s);
  },
  shadowPool: (g, x, y, s, th) => {
    g.fillStyle(0x000000, 0.75); g.fillEllipse(x, y, 66 * s, 26 * s);
    g.fillStyle(0x000000, 0.5); g.fillEllipse(x + 22 * s, y + 4 * s, 30 * s, 12 * s);
    g.fillStyle(th.glow, 0.5); g.fillCircle(x - 6 * s, y - 1, 1.6 * s); g.fillCircle(x + 2 * s, y - 2, 1.6 * s);
  },
  muteStatue: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 40 * s);
    const st = mix(0x5a5060, th.wall, 0.3);
    g.fillStyle(dk(st, 0.25), 1); g.fillRect(x - 13 * s, y - 12 * s, 26 * s, 12 * s);
    poly(g, [x - 10 * s, y - 12 * s, x - 7 * s, y - 46 * s, x + 7 * s, y - 46 * s, x + 10 * s, y - 12 * s], st);
    g.fillStyle(lt(st, 0.1), 1); g.fillCircle(x, y - 52 * s, 7 * s);
    // A hand over the mouth.
    g.fillStyle(lt(st, 0.2), 1); g.fillEllipse(x, y - 49 * s, 9 * s, 4 * s);
    line(g, x - 4 * s, y - 49 * s, x - 6 * s, y - 38 * s, 3 * s, st);
    g.fillStyle(0x000000, 0.7); g.fillCircle(x - 2.5 * s, y - 54 * s, 1.2); g.fillCircle(x + 2.5 * s, y - 54 * s, 1.2);
  },
  fogPatch: (g, x, y, s, th) => {
    const c = lt(th.ground, 0.25);
    for (let i = 0; i < 5; i++) { g.fillStyle(c, 0.12); g.fillEllipse(x + (i - 2) * 16 * s, y + Math.sin(i * 2.1) * 6 * s, 50 * s, 18 * s); }
  },
  mirror: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    line(g, x - 8 * s, y, x - 4 * s, y - 14 * s, 2.5, th.trim);
    line(g, x + 8 * s, y, x + 4 * s, y - 14 * s, 2.5, th.trim);
    g.fillStyle(th.trim, 1); g.fillEllipse(x, y - 34 * s, 24 * s, 40 * s);
    g.fillStyle(lt(th.glow, 0.2), 1); g.fillEllipse(x, y - 34 * s, 18 * s, 34 * s);
    g.fillStyle(th.roof, 0.6); g.fillEllipse(x + 2 * s, y - 32 * s, 10 * s, 20 * s);
    line(g, x - 5 * s, y - 44 * s, x + 2 * s, y - 50 * s, 2, 0xffffff, 0.8);
  },
  maskPole: (g, x, y, s, th) => {
    shadow(g, x + 2, y, 20 * s);
    line(g, x, y, x, y - 50 * s, 3, 0x3a2a30);
    g.fillStyle(0xf8f0ff, 1); g.fillEllipse(x, y - 52 * s, 20 * s, 24 * s);
    g.fillStyle(0x1a0a1a, 1); g.fillEllipse(x - 4 * s, y - 55 * s, 5 * s, 3 * s); g.fillEllipse(x + 4 * s, y - 55 * s, 5 * s, 3 * s);
    g.lineStyle(1.5, 0x1a0a1a, 1); g.beginPath(); g.arc(x, y - 50 * s, 5 * s, 0.3, Math.PI - 0.3, false); g.strokePath();
    g.fillStyle(th.roof, 1); poly(g, [x - 10 * s, y - 60 * s, x - 16 * s, y - 70 * s, x - 4 * s, y - 63 * s], th.roof);
    poly(g, [x + 10 * s, y - 60 * s, x + 16 * s, y - 70 * s, x + 4 * s, y - 63 * s], th.trim);
    line(g, x - 2 * s, y - 40 * s, x - 8 * s, y - 24 * s, 2, th.roof, 0.9);
    line(g, x + 2 * s, y - 40 * s, x + 7 * s, y - 26 * s, 2, th.trim, 0.9);
  },
  swirl: (g, x, y, s, th) => {
    g.lineStyle(2, th.glow, 0.45);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.4, rr = i * 0.9 * s;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.42;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  },

  // ── time ───────────────────────────────────────────────────────────
  hourglass: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    const f = 0x6a4a2a;
    g.fillStyle(f, 1); g.fillRect(x - 13 * s, y - 6 * s, 26 * s, 6 * s); g.fillRect(x - 13 * s, y - 50 * s, 26 * s, 6 * s);
    line(g, x - 11 * s, y - 44 * s, x - 11 * s, y - 6 * s, 2, f); line(g, x + 11 * s, y - 44 * s, x + 11 * s, y - 6 * s, 2, f);
    poly(g, [x - 8 * s, y - 44 * s, x + 8 * s, y - 44 * s, x + 1.5 * s, y - 25 * s, x + 8 * s, y - 6 * s, x - 8 * s, y - 6 * s, x - 1.5 * s, y - 25 * s], 0xd8f0ff, 0.45);
    poly(g, [x - 6 * s, y - 38 * s, x + 6 * s, y - 38 * s, x + 1 * s, y - 26 * s, x - 1 * s, y - 26 * s], th.groundSpeck);
    poly(g, [x - 7 * s, y - 7 * s, x + 7 * s, y - 7 * s, x, y - 14 * s], th.groundSpeck);
    line(g, x, y - 25 * s, x, y - 13 * s, 1, th.groundSpeck);
  },
  clockPost: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 22 * s);
    line(g, x, y, x, y - 46 * s, 4, 0x2a2a30);
    g.fillStyle(0x2a2a30, 1); g.fillCircle(x, y - 58 * s, 14 * s);
    g.fillStyle(0xfff8e0, 1); g.fillCircle(x, y - 58 * s, 11 * s);
    g.fillStyle(th.glow, 0.15); g.fillCircle(x, y - 58 * s, 22 * s);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(0x2a2a30, 1); g.fillCircle(x + Math.cos(a) * 9 * s, y - 58 * s + Math.sin(a) * 9 * s, 0.9);
    }
    // Hands at a time that does not exist.
    line(g, x, y - 58 * s, x + 6 * s, y - 63 * s, 1.5, 0x1a1a1a);
    line(g, x, y - 58 * s, x - 2 * s, y - 49 * s, 1.5, 0x1a1a1a);
    line(g, x, y - 58 * s, x - 7 * s, y - 60 * s, 1, 0xc03030);
  },
  sundial: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 44 * s);
    const st = mix(0xc8b890, th.wall, 0.2);
    g.fillStyle(dk(st, 0.2), 1); g.fillRect(x - 8 * s, y - 18 * s, 16 * s, 18 * s);
    g.fillStyle(st, 1); g.fillEllipse(x, y - 20 * s, 44 * s, 16 * s);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      line(g, x + Math.cos(a) * 14 * s, y - 20 * s + Math.sin(a) * 5 * s, x + Math.cos(a) * 19 * s, y - 20 * s + Math.sin(a) * 7 * s, 1, dk(st, 0.5));
    }
    poly(g, [x - 2 * s, y - 20 * s, x + 2 * s, y - 20 * s, x, y - 36 * s], dk(st, 0.4));
    poly(g, [x, y - 20 * s, x + 16 * s, y - 16 * s, x + 2 * s, y - 19 * s], 0x000000, 0.3);
  },

  // ── electricity / plasma / tech ────────────────────────────────────
  pylon: (g, x, y, s, th) => {
    shadow(g, x + 5, y, 36 * s);
    const c = 0x4a4c58;
    line(g, x - 12 * s, y, x - 3 * s, y - 70 * s, 2.5, c);
    line(g, x + 12 * s, y, x + 3 * s, y - 70 * s, 2.5, c);
    for (let i = 1; i < 5; i++) { const yy = y - i * 15 * s, w = 12 * s * (1 - i / 5.5); line(g, x - w, yy, x + w, yy - 15 * s, 1, c); line(g, x + w, yy, x - w, yy - 15 * s, 1, c); }
    line(g, x - 18 * s, y - 62 * s, x + 18 * s, y - 62 * s, 3, c);
    g.fillStyle(0xd8d0b0, 1); g.fillCircle(x - 16 * s, y - 60 * s, 2.5 * s); g.fillCircle(x + 16 * s, y - 60 * s, 2.5 * s);
    g.fillStyle(th.glow, 0.9); g.fillCircle(x, y - 72 * s, 3 * s);
    g.lineStyle(1.2, th.glow, 0.7); g.beginPath();
    g.moveTo(x - 16 * s, y - 60 * s); g.lineTo(x - 22 * s, y - 52 * s); g.lineTo(x - 19 * s, y - 48 * s); g.lineTo(x - 26 * s, y - 40 * s); g.strokePath();
  },
  teslaCoil: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 40 * s);
    g.fillStyle(0x3a3c48, 1); g.fillRect(x - 14 * s, y - 10 * s, 28 * s, 10 * s);
    g.fillStyle(0xb06a30, 1); g.fillRect(x - 7 * s, y - 50 * s, 14 * s, 40 * s);
    for (let i = 0; i < 9; i++) line(g, x - 7 * s, y - 14 * s - i * 4 * s, x + 7 * s, y - 14 * s - i * 4 * s, 1, 0xe0a050, 0.8);
    g.fillStyle(0xc0c4d0, 1); g.fillEllipse(x, y - 56 * s, 34 * s, 14 * s);
    g.fillStyle(0xffffff, 0.6); g.fillEllipse(x - 5 * s, y - 59 * s, 12 * s, 4 * s);
    g.lineStyle(1.5, th.glow, 0.9);
    for (const sx of [-1, 1]) {
      g.beginPath(); g.moveTo(x + sx * 16 * s, y - 56 * s); g.lineTo(x + sx * 24 * s, y - 64 * s); g.lineTo(x + sx * 21 * s, y - 68 * s); g.lineTo(x + sx * 30 * s, y - 76 * s); g.strokePath();
    }
    g.fillStyle(th.glow, 0.12); g.fillCircle(x, y - 56 * s, 34 * s);
  },
  plasmaOrb: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    g.fillStyle(0x2a2440, 1); poly(g, [x - 10 * s, y, x - 6 * s, y - 18 * s, x + 6 * s, y - 18 * s, x + 10 * s, y], 0x2a2440);
    g.fillStyle(th.glow, 0.2); g.fillCircle(x, y - 32 * s, 24 * s);
    g.fillStyle(dk(th.roof, 0.3), 0.9); g.fillCircle(x, y - 32 * s, 15 * s);
    g.lineStyle(1.2, lt(th.glow, 0.4), 0.9);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      g.beginPath(); g.moveTo(x, y - 32 * s);
      g.lineTo(x + Math.cos(a + 0.4) * 7 * s, y - 32 * s + Math.sin(a + 0.4) * 7 * s);
      g.lineTo(x + Math.cos(a) * 14 * s, y - 32 * s + Math.sin(a) * 14 * s); g.strokePath();
    }
    g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y - 32 * s, 3 * s);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 5 * s, y - 38 * s, 8 * s, 4 * s);
  },
  terminal: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    g.fillStyle(0x2a3038, 1); g.fillRect(x - 12 * s, y - 34 * s, 24 * s, 34 * s);
    g.fillStyle(0x0a1418, 1); g.fillRect(x - 9 * s, y - 31 * s, 18 * s, 14 * s);
    g.fillStyle(th.glow, 0.9);
    for (let i = 0; i < 4; i++) g.fillRect(x - 7 * s, y - 29 * s + i * 3 * s, (6 + ((i * 5) % 9)) * s, 1.2 * s);
    g.fillStyle(0x3a424c, 1); g.fillRect(x - 10 * s, y - 13 * s, 20 * s, 6 * s);
    for (let i = 0; i < 5; i++) { g.fillStyle(0x5a6470, 1); g.fillRect(x - 9 * s + i * 4 * s, y - 12 * s, 3 * s, 2 * s); }
    g.fillStyle(th.glow, 0.12); g.fillCircle(x, y - 24 * s, 20 * s);
  },
  serverRack: (g, x, y, s, th) => {
    shadow(g, x + 5, y, 44 * s);
    g.fillStyle(0x1a2028, 1); g.fillRect(x - 16 * s, y - 60 * s, 32 * s, 60 * s);
    g.fillStyle(0x2a323c, 1); g.fillRect(x - 16 * s, y - 64 * s, 32 * s, 5 * s);
    for (let i = 0; i < 8; i++) {
      g.fillStyle(0x0e1418, 1); g.fillRect(x - 13 * s, y - 56 * s + i * 7 * s, 26 * s, 5 * s);
      g.fillStyle(i % 3 === 0 ? 0xff5a5a : th.glow, 1); g.fillCircle(x + 9 * s, y - 53.5 * s + i * 7 * s, 1.2 * s);
      g.fillStyle(th.glow, 0.7); g.fillCircle(x + 5 * s, y - 53.5 * s + i * 7 * s, 1 * s);
    }
    line(g, x - 16 * s, y - 20 * s, x - 26 * s, y - 2 * s, 2, 0x2a3038);
  },

  // ── fate / sound / light / magnet / rubber / gunpowder / echo / spy ─
  cardStand: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 34 * s);
    const cards = [0xffffff, 0xfff4e0, 0xffffff];
    cards.forEach((c, i) => {
      const a = (i - 1) * 0.3, cx = x + (i - 1) * 10 * s, cy = y - 22 * s;
      const w = 12 * s, h = 18 * s;
      const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([px, py]) => [
        cx + px * Math.cos(a) - py * Math.sin(a), cy + px * Math.sin(a) + py * Math.cos(a)]).flat();
      poly(g, pts, c);
      g.fillStyle(i === 1 ? 0xd02a3a : 0x1a1a1a, 1); g.fillCircle(cx, cy, 2.5 * s);
    });
    line(g, x - 10 * s, y, x - 4 * s, y - 12 * s, 2, th.trim);
    line(g, x + 10 * s, y, x + 4 * s, y - 12 * s, 2, th.trim);
  },
  giantDie: (g, x, y, s) => {
    shadow(g, x + 4, y, 40 * s);
    const c = 0xf4f0e8;
    poly(g, [x - 16 * s, y - 4 * s, x + 8 * s, y, x + 8 * s, y - 24 * s, x - 16 * s, y - 28 * s], c);
    poly(g, [x + 8 * s, y, x + 18 * s, y - 8 * s, x + 18 * s, y - 32 * s, x + 8 * s, y - 24 * s], 0xc8c0b0);
    poly(g, [x - 16 * s, y - 28 * s, x + 8 * s, y - 24 * s, x + 18 * s, y - 32 * s, x - 6 * s, y - 36 * s], 0xffffff);
    g.fillStyle(0xd02a3a, 1);
    for (const [px, py] of [[-10, -10], [2, -18], [-4, -14]]) g.fillCircle(x + px * s, y + py * s, 2.2 * s);
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(x + 1 * s, y - 31 * s, 2 * s);
    g.fillCircle(x + 13 * s, y - 12 * s, 1.6 * s); g.fillCircle(x + 13 * s, y - 24 * s, 1.6 * s);
  },
  speaker: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 40 * s);
    g.fillStyle(0x1a1a20, 1); g.fillRect(x - 15 * s, y - 50 * s, 30 * s, 50 * s);
    g.fillStyle(0x2a2a32, 1); g.fillRect(x - 15 * s, y - 50 * s, 30 * s, 3 * s);
    for (const [cy, r0] of [[-36, 10], [-14, 7]] as [number, number][]) {
      g.fillStyle(0x3a3a44, 1); g.fillCircle(x, y + cy * s, r0 * s);
      g.fillStyle(0x0a0a0e, 1); g.fillCircle(x, y + cy * s, r0 * 0.7 * s);
      g.fillStyle(0x5a5a64, 1); g.fillCircle(x, y + cy * s, r0 * 0.25 * s);
    }
    g.lineStyle(1.5, th.glow, 0.6);
    for (let i = 1; i <= 2; i++) { g.beginPath(); g.arc(x, y - 36 * s, (14 + i * 6) * s, -0.6, 0.6, false); g.strokePath(); }
  },
  drum: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 34 * s);
    g.fillStyle(th.roof, 1); g.fillRect(x - 14 * s, y - 22 * s, 28 * s, 20 * s);
    g.fillStyle(0xf4ecd8, 1); g.fillEllipse(x, y - 22 * s, 28 * s, 9 * s);
    g.fillStyle(dk(th.roof, 0.3), 1); g.fillEllipse(x, y - 2 * s, 28 * s, 8 * s);
    g.lineStyle(1.2, th.trim, 1);
    for (let i = 0; i < 5; i++) { const px = x - 12 * s + i * 6 * s; g.beginPath(); g.moveTo(px, y - 19 * s); g.lineTo(px + 3 * s, y - 5 * s); g.strokePath(); }
    line(g, x + 4 * s, y - 26 * s, x + 16 * s, y - 36 * s, 2, 0xd8c8a0);
    g.fillStyle(0xf4ecd8, 1); g.fillCircle(x + 16 * s, y - 36 * s, 2.5 * s);
  },
  tuningFork: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 26 * s);
    const c = lt(th.trim, 0.1);
    g.fillStyle(dk(th.wall, 0.2), 1); g.fillRect(x - 12 * s, y - 8 * s, 24 * s, 8 * s);
    line(g, x, y - 8 * s, x, y - 30 * s, 4 * s, c);
    g.lineStyle(4 * s, c, 1); g.beginPath(); g.arc(x, y - 38 * s, 8 * s, 0, Math.PI, false); g.strokePath();
    line(g, x - 8 * s, y - 38 * s, x - 8 * s, y - 70 * s, 4 * s, c);
    line(g, x + 8 * s, y - 38 * s, x + 8 * s, y - 70 * s, 4 * s, c);
    g.lineStyle(1, th.glow, 0.5);
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x, y - 62 * s, (12 + i * 5) * s, -2.6, -0.5, false); g.strokePath(); }
  },
  prism: (g, x, y, s) => {
    shadow(g, x + 4, y, 40 * s);
    poly(g, [x - 16 * s, y - 4 * s, x, y - 48 * s, x + 16 * s, y - 4 * s], 0xf0f8ff, 0.75);
    poly(g, [x, y - 48 * s, x + 16 * s, y - 4 * s, x + 4 * s, y], 0xc8e0ff, 0.75);
    const rainbow = [0xff4a4a, 0xffa040, 0xffee40, 0x4aff6a, 0x4ab0ff, 0xa04aff];
    rainbow.forEach((c, i) => line(g, x + 8 * s, y - 20 * s, x + 40 * s, y - 30 * s + i * 4 * s, 2, c, 0.55));
    line(g, x - 40 * s, y - 26 * s, x - 6 * s, y - 22 * s, 2, 0xffffff, 0.6);
  },
  mirrorPost: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 22 * s);
    line(g, x, y, x, y - 40 * s, 3, th.trim === 0xffffff ? 0xc0a050 : th.trim);
    poly(g, [x - 12 * s, y - 40 * s, x, y - 62 * s, x + 12 * s, y - 40 * s, x, y - 34 * s], lt(th.glow, 0.3));
    poly(g, [x, y - 62 * s, x + 12 * s, y - 40 * s, x, y - 34 * s], 0xd8e8ff);
    g.fillStyle(th.glow, 0.2); g.fillCircle(x, y - 46 * s, 22 * s);
  },
  horseshoe: (g, x, y, s) => {
    shadow(g, x + 4, y, 40 * s);
    g.fillStyle(0x3a3c44, 1); g.fillRect(x - 14 * s, y - 8 * s, 28 * s, 8 * s);
    g.lineStyle(10 * s, 0xcc2244, 1); g.beginPath(); g.arc(x, y - 40 * s, 14 * s, Math.PI, 0, false); g.strokePath();
    line(g, x - 14 * s, y - 40 * s, x - 14 * s, y - 14 * s, 10 * s, 0xcc2244);
    line(g, x + 14 * s, y - 40 * s, x + 14 * s, y - 14 * s, 10 * s, 0x2a6acc);
    g.fillStyle(0xd8dce4, 1); g.fillRect(x - 19 * s, y - 16 * s, 10 * s, 6 * s); g.fillRect(x + 9 * s, y - 16 * s, 10 * s, 6 * s);
    g.lineStyle(1, 0xffffff, 0.4); g.beginPath(); g.arc(x, y - 40 * s, 18 * s, Math.PI + 0.3, -0.3, false); g.strokePath();
  },
  ironFilings: (g, x, y, s) => {
    for (let k = 0; k < 4; k++) {
      g.lineStyle(1, 0x5a5c64, 0.7); g.beginPath();
      g.arc(x, y, (8 + k * 7) * s, -2.8, -0.3, false); g.strokePath();
      g.beginPath(); g.arc(x, y, (8 + k * 7) * s, 0.3, 2.8, false); g.strokePath();
    }
  },
  bouncePad: (g, x, y, s, th) => {
    g.fillStyle(0x2a2a30, 1); g.fillEllipse(x, y, 54 * s, 22 * s);
    g.fillStyle(th.roof, 1); g.fillEllipse(x, y - 2 * s, 46 * s, 17 * s);
    g.lineStyle(2, lt(th.roof, 0.4), 0.8); g.strokeEllipse(x, y - 2 * s, 32 * s, 11 * s);
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 8 * s, y - 5 * s, 14 * s, 4 * s);
  },
  rubberBall: (g, x, y, s) => {
    shadow(g, x + 3, y, 30 * s);
    g.fillStyle(0xff5577, 1); g.fillCircle(x, y - 15 * s, 15 * s);
    g.fillStyle(0xffd040, 1); g.slice(x, y - 15 * s, 15 * s, -0.4, 0.8, false); g.fillPath();
    g.fillStyle(0x3ac0d0, 1); g.slice(x, y - 15 * s, 15 * s, 2.2, 3.4, false); g.fillPath();
    g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - 5 * s, y - 21 * s, 8 * s, 5 * s);
  },
  duck: (g, x, y, s) => {
    shadow(g, x + 2, y, 24 * s);
    g.fillStyle(0xffd020, 1); g.fillEllipse(x, y - 7 * s, 22 * s, 13 * s); g.fillCircle(x + 6 * s, y - 16 * s, 6 * s);
    poly(g, [x + 11 * s, y - 16 * s, x + 17 * s, y - 15 * s, x + 11 * s, y - 13 * s], 0xff7a20);
    g.fillStyle(0x1a1a1a, 1); g.fillCircle(x + 8 * s, y - 18 * s, 1.2 * s);
    g.fillStyle(0xffe880, 1); g.fillEllipse(x - 3 * s, y - 9 * s, 9 * s, 4 * s);
  },
  cannon: (g, x, y, s) => {
    shadow(g, x + 4, y, 46 * s);
    g.fillStyle(0x5a3a20, 1); g.fillRect(x - 14 * s, y - 12 * s, 28 * s, 8 * s);
    g.fillStyle(0x2a2420, 1); g.fillCircle(x - 9 * s, y - 4 * s, 6 * s); g.fillCircle(x + 9 * s, y - 4 * s, 6 * s);
    g.fillStyle(0x6a5a3a, 1); g.fillCircle(x - 9 * s, y - 4 * s, 2 * s); g.fillCircle(x + 9 * s, y - 4 * s, 2 * s);
    const c = 0x2e2c30;
    poly(g, [x - 16 * s, y - 14 * s, x + 18 * s, y - 26 * s, x + 20 * s, y - 18 * s, x - 14 * s, y - 8 * s], c);
    g.fillStyle(lt(c, 0.2), 1); g.fillCircle(x - 15 * s, y - 11 * s, 5 * s);
    g.fillStyle(0x0a0a0a, 1); g.fillEllipse(x + 19 * s, y - 22 * s, 4 * s, 8 * s);
    g.fillStyle(0x1e1e22, 1); g.fillCircle(x + 22 * s, y - 2 * s, 4 * s); g.fillCircle(x + 27 * s, y - 1 * s, 4 * s); g.fillCircle(x + 24.5 * s, y - 6 * s, 4 * s);
  },
  powderKeg: (g, x, y, s) => {
    PROPS.barrel(g, x, y, s, null as unknown as TownTheme, () => 0);
    g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 6 * s, y - 16 * s, 12 * s, 6 * s);
    g.fillStyle(0xf0e0c0, 1); g.fillRect(x - 4 * s, y - 15 * s, 8 * s, 4 * s);
    line(g, x, y - 24 * s, x + 4 * s, y - 32 * s, 1.5, 0x8a7a5a);
    g.fillStyle(0xffd040, 1); g.fillCircle(x + 4 * s, y - 33 * s, 1.8 * s);
  },
  echoBell: (g, x, y, s, th) => {
    shadow(g, x + 4, y, 46 * s);
    const w = 0x4a3a2a;
    line(g, x - 18 * s, y, x - 18 * s, y - 56 * s, 4, w); line(g, x + 18 * s, y, x + 18 * s, y - 56 * s, 4, w);
    line(g, x - 22 * s, y - 56 * s, x + 22 * s, y - 56 * s, 5, w);
    const b = 0xb08a40;
    poly(g, [x - 5 * s, y - 52 * s, x + 5 * s, y - 52 * s, x + 9 * s, y - 40 * s, x + 14 * s, y - 28 * s, x - 14 * s, y - 28 * s, x - 9 * s, y - 40 * s], b);
    poly(g, [x - 3 * s, y - 50 * s, x - 1 * s, y - 50 * s, x - 6 * s, y - 30 * s, x - 10 * s, y - 30 * s], lt(b, 0.3));
    g.fillStyle(dk(b, 0.4), 1); g.fillEllipse(x, y - 28 * s, 28 * s, 5 * s);
    g.fillStyle(0x3a2a1a, 1); g.fillCircle(x, y - 25 * s, 3 * s);
    g.lineStyle(1.2, th.glow, 0.5);
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x, y - 38 * s, (18 + i * 7) * s, -0.5, 0.5, false); g.strokePath(); g.beginPath(); g.arc(x, y - 38 * s, (18 + i * 7) * s, Math.PI - 0.5, Math.PI + 0.5, false); g.strokePath(); }
  },
  stalagmite: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    const c = mix(0x6a6470, th.wall, 0.35);
    poly(g, [x - 12 * s, y, x - 2 * s, y - 46 * s, x + 12 * s, y], c);
    poly(g, [x - 2 * s, y - 46 * s, x + 12 * s, y, x + 3 * s, y], dk(c, 0.2));
    poly(g, [x + 8 * s, y, x + 14 * s, y - 20 * s, x + 20 * s, y], lt(c, 0.1));
    for (let i = 0; i < 3; i++) line(g, x - 8 * s + i * 4 * s, y - 6 * s - i * 6 * s, x - 2 * s + i * 4 * s, y - 6 * s - i * 6 * s, 1, lt(c, 0.25), 0.5);
  },
  wantedBoard: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 40 * s);
    line(g, x - 16 * s, y, x - 16 * s, y - 40 * s, 3, 0x4a3424); line(g, x + 16 * s, y, x + 16 * s, y - 40 * s, 3, 0x4a3424);
    g.fillStyle(0x6a4a30, 1); g.fillRect(x - 20 * s, y - 44 * s, 40 * s, 26 * s);
    for (const [px, py, c] of [[-14, -41, 0xf0e4c8], [0, -40, 0xe8dcc0], [8, -38, 0xf4ead0]] as [number, number, number][]) {
      g.fillStyle(c, 1); g.fillRect(x + px * s, y + py * s, 11 * s, 14 * s);
      g.fillStyle(0x2a2420, 0.8); g.fillCircle(x + (px + 5.5) * s, y + (py + 5) * s, 3 * s);
      g.fillStyle(th.trim, 1); g.fillCircle(x + (px + 5.5) * s, y + (py + 1) * s, 1);
    }
  },

  // ── ruin / conquest / cloth / bind / paper / chalk / gold ──────────
  rubble: (g, x, y, s, th, r) => {
    shadow(g, x + 3, y, 48 * s);
    const c = mix(0x7a6a64, th.wall, 0.4);
    for (let i = 0; i < 7; i++) {
      const px = x + (r() - 0.5) * 38 * s, py = y - r() * 10 * s;
      const w = (6 + r() * 9) * s;
      poly(g, [px - w, py, px - w * 0.6, py - w * 0.8, px + w * 0.5, py - w, px + w, py - w * 0.2, px + w * 0.6, py + 2], i % 2 ? c : lt(c, 0.12));
    }
    line(g, x - 14 * s, y - 6 * s, x + 10 * s, y - 16 * s, 3, 0x5a3a20);
  },
  brokenPillar: (g, x, y, s, th) => {
    shadow(g, x + 5, y, 40 * s);
    const st = mix(0xb0a49a, th.wall, 0.4);
    g.fillStyle(dk(st, 0.25), 1); g.fillRect(x - 15 * s, y - 8 * s, 30 * s, 8 * s);
    g.fillStyle(st, 1); g.fillRect(x - 11 * s, y - 44 * s, 22 * s, 36 * s);
    for (let i = 0; i < 4; i++) line(g, x - 7 * s + i * 5 * s, y - 44 * s, x - 7 * s + i * 5 * s, y - 8 * s, 1, dk(st, 0.25));
    poly(g, [x - 11 * s, y - 44 * s, x - 4 * s, y - 52 * s, x + 3 * s, y - 46 * s, x + 11 * s, y - 56 * s, x + 11 * s, y - 44 * s], st);
    g.fillStyle(st, 1); g.fillRect(x + 14 * s, y - 10 * s, 18 * s, 10 * s);
    g.fillStyle(0x5a8a3a, 0.6); g.fillEllipse(x - 8 * s, y - 20 * s, 6 * s, 14 * s);
  },
  banner: (g, x, y, s, th) => {
    shadow(g, x + 2, y, 20 * s);
    line(g, x, y, x, y - 70 * s, 3, 0x3a3030);
    g.fillStyle(0xd8b040, 1); g.fillCircle(x, y - 72 * s, 3 * s);
    poly(g, [x + 1, y - 66 * s, x + 26 * s, y - 64 * s, x + 24 * s, y - 32 * s, x + 14 * s, y - 38 * s, x + 4 * s, y - 32 * s], th.roof);
    poly(g, [x + 1, y - 66 * s, x + 26 * s, y - 64 * s, x + 26 * s, y - 60 * s, x + 1, y - 62 * s], th.trim);
    g.fillStyle(th.trim, 1); g.fillCircle(x + 13 * s, y - 50 * s, 4 * s);
  },
  spikes: (g, x, y, s) => {
    shadow(g, x + 3, y, 50 * s, 10 * s);
    line(g, x - 24 * s, y - 6 * s, x + 24 * s, y - 6 * s, 3, 0x5a3a20);
    for (let i = -2; i <= 2; i++) {
      line(g, x + i * 10 * s, y, x + i * 10 * s + 8 * s, y - 24 * s, 3, 0x6a4a2a);
      g.fillStyle(0xc0c0c8, 1); poly(g, [x + i * 10 * s + 6 * s, y - 20 * s, x + i * 10 * s + 11 * s, y - 30 * s, x + i * 10 * s + 10 * s, y - 19 * s], 0xc0c0c8);
    }
  },
  spool: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 34 * s);
    g.fillStyle(0x8a6a40, 1); g.fillEllipse(x, y - 3 * s, 30 * s, 9 * s); g.fillEllipse(x, y - 34 * s, 30 * s, 9 * s);
    g.fillStyle(th.roof, 1); g.fillRect(x - 11 * s, y - 32 * s, 22 * s, 28 * s);
    for (let i = 0; i < 7; i++) line(g, x - 11 * s, y - 30 * s + i * 4 * s, x + 11 * s, y - 28 * s + i * 4 * s, 1, lt(th.roof, 0.25), 0.7);
    g.fillStyle(lt(0x8a6a40, 0.2), 1); g.fillEllipse(x, y - 35 * s, 26 * s, 6 * s);
    line(g, x + 11 * s, y - 14 * s, x + 26 * s, y - 2 * s, 1.5, th.roof);
    g.fillStyle(0xd0d0d8, 1); g.fillRect(x + 24 * s, y - 4 * s, 7 * s, 1.5);
  },
  clothesline: (g, x, y, s, th) => {
    shadow(g, x, y, 70 * s, 10 * s);
    line(g, x - 30 * s, y, x - 30 * s, y - 46 * s, 3, 0x5a3a20); line(g, x + 30 * s, y, x + 30 * s, y - 46 * s, 3, 0x5a3a20);
    g.lineStyle(1, 0xd8d0c0, 1); g.beginPath(); g.moveTo(x - 30 * s, y - 44 * s); g.lineTo(x, y - 40 * s); g.lineTo(x + 30 * s, y - 44 * s); g.strokePath();
    const cols = [th.roof, th.trim, lt(th.wall, 0.2), 0x6a8ad0];
    for (let i = 0; i < 4; i++) {
      const px = x - 22 * s + i * 14 * s, py = y - 43 * s + Math.sin((i / 3) * Math.PI) * 3 * s;
      poly(g, [px - 5 * s, py, px + 5 * s, py, px + 6 * s, py + (12 + (i % 2) * 5) * s, px - 6 * s, py + (12 + (i % 2) * 5) * s], cols[i]);
    }
  },
  chainPost: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 26 * s);
    const st = mix(0x8a7a60, th.wall, 0.3);
    g.fillStyle(st, 1); g.fillRect(x - 6 * s, y - 40 * s, 12 * s, 40 * s);
    g.fillStyle(lt(st, 0.2), 1); g.fillRect(x - 6 * s, y - 40 * s, 3 * s, 40 * s);
    g.fillStyle(dk(st, 0.2), 1); poly(g, [x - 8 * s, y - 40 * s, x, y - 48 * s, x + 8 * s, y - 40 * s], dk(st, 0.2));
    g.lineStyle(2, th.trim, 1);
    for (let i = 0; i < 5; i++) g.strokeEllipse(x + 8 * s + i * 6 * s, y - 30 * s + i * 5 * s, 6 * s, 4 * s);
    for (let i = 0; i < 4; i++) g.strokeEllipse(x - 8 * s - i * 6 * s, y - 28 * s + i * 6 * s, 6 * s, 4 * s);
  },
  paperStack: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 32 * s);
    for (let i = 0; i < 8; i++) {
      const off = ((i * 5) % 7 - 3) * s;
      g.fillStyle(i % 2 ? 0xfaf4e4 : 0xeee6d0, 1); g.fillRect(x - 12 * s + off, y - (i + 1) * 3.5 * s, 24 * s, 3 * s);
    }
    g.fillStyle(th.trim, 0.7); for (let i = 0; i < 3; i++) g.fillRect(x - 8 * s, y - 31 * s + i * 1.5, 14 * s, 0.8);
    poly(g, [x + 6 * s, y - 32 * s, x + 18 * s, y - 40 * s, x + 14 * s, y - 30 * s], 0xfaf4e4);
  },
  scrollPost: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 26 * s);
    line(g, x, y, x, y - 52 * s, 3, 0x4a3424);
    g.fillStyle(0x6a4a30, 1); g.fillRect(x - 14 * s, y - 52 * s, 28 * s, 4 * s);
    g.fillStyle(0xfaf4e4, 1); g.fillRect(x - 12 * s, y - 48 * s, 24 * s, 30 * s);
    g.fillStyle(0xd8ceb4, 1); g.fillEllipse(x, y - 18 * s, 26 * s, 6 * s);
    for (let i = 0; i < 6; i++) g.fillStyle(th.trim, 0.6), g.fillRect(x - 9 * s, y - 44 * s + i * 4 * s, (12 + ((i * 7) % 6)) * s, 1);
  },
  chalkDoodle: (g, x, y, s, th, r) => {
    g.lineStyle(2, th.trim, 0.75);
    const kind = Math.floor(r() * 4);
    if (kind === 0) {
      // Hopscotch.
      for (let i = 0; i < 4; i++) g.strokeRect(x - 8 * s, y - 30 * s + i * 14 * s, 16 * s, 14 * s);
    } else if (kind === 1) {
      // A smiling sun.
      g.strokeCircle(x, y, 12 * s);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(g, x + Math.cos(a) * 15 * s, y + Math.sin(a) * 15 * s, x + Math.cos(a) * 22 * s, y + Math.sin(a) * 22 * s, 2, th.trim, 0.7); }
    } else if (kind === 2) {
      // A stick figure.
      g.strokeCircle(x, y - 18 * s, 5 * s);
      line(g, x, y - 13 * s, x, y + 4 * s, 2, th.trim, 0.75);
      line(g, x - 8 * s, y - 6 * s, x + 8 * s, y - 8 * s, 2, th.trim, 0.75);
      line(g, x, y + 4 * s, x - 6 * s, y + 14 * s, 2, th.trim, 0.75); line(g, x, y + 4 * s, x + 6 * s, y + 14 * s, 2, th.trim, 0.75);
    } else {
      // A door, chalked on the ground — the town's own joke.
      g.strokeRect(x - 10 * s, y - 16 * s, 20 * s, 30 * s);
      g.fillStyle(th.trim, 0.7); g.fillCircle(x + 6 * s, y, 2 * s);
    }
    g.lineStyle(1, 0xff8ab0, 0.5); g.strokeCircle(x + 20 * s, y + 8 * s, 4 * s);
  },
  easel: (g, x, y, s, th) => {
    shadow(g, x + 3, y, 30 * s);
    line(g, x - 12 * s, y, x - 2 * s, y - 50 * s, 2.5, 0x6a4a2a); line(g, x + 12 * s, y, x + 2 * s, y - 50 * s, 2.5, 0x6a4a2a);
    line(g, x, y - 4 * s, x, y - 44 * s, 2, 0x5a3a20);
    g.fillStyle(0x24302a, 1); g.fillRect(x - 15 * s, y - 46 * s, 30 * s, 24 * s);
    g.lineStyle(1.5, th.trim, 0.85);
    g.beginPath(); g.moveTo(x - 10 * s, y - 28 * s); g.lineTo(x - 2 * s, y - 40 * s); g.lineTo(x + 4 * s, y - 32 * s); g.lineTo(x + 10 * s, y - 42 * s); g.strokePath();
    g.fillStyle(0x6a4a2a, 1); g.fillRect(x - 15 * s, y - 22 * s, 30 * s, 3 * s);
    g.fillStyle(0xff8ab0, 1); g.fillRect(x - 10 * s, y - 24 * s, 5 * s, 2 * s);
  },
  coinPile: (g, x, y, s, _th, r) => {
    shadow(g, x + 2, y, 34 * s);
    for (let i = 0; i < 12; i++) {
      const px = x + (r() - 0.5) * 26 * s, py = y - r() * (12 - Math.abs(px - x) / s * 0.6) * s;
      g.fillStyle(0xa07a18, 1); g.fillEllipse(px, py + 1, 8 * s, 4 * s);
      g.fillStyle(0xffd040, 1); g.fillEllipse(px, py, 8 * s, 4 * s);
    }
    g.fillStyle(0xffffff, 0.8); g.fillCircle(x - 2 * s, y - 10 * s, 1.3);
  },
  goldStatue: (g, x, y, s, th) => {
    PROPS.statue(g, x, y, s, { ...th, wall: 0xffd040 }, () => 0.5);
    g.fillStyle(0xfff4a0, 0.5); g.fillCircle(x - 3 * s, y - 58 * s, 2.5 * s);
    g.fillStyle(0xffe070, 0.12); g.fillCircle(x, y - 40 * s, 30 * s);
  },
  chest: (g, x, y, s) => {
    shadow(g, x + 3, y, 34 * s);
    const c = 0x7a4a24;
    g.fillStyle(c, 1); g.fillRect(x - 14 * s, y - 16 * s, 28 * s, 16 * s);
    g.fillStyle(lt(c, 0.12), 1); g.fillRoundedRect(x - 14 * s, y - 26 * s, 28 * s, 11 * s, { tl: 6 * s, tr: 6 * s, bl: 0, br: 0 });
    g.fillStyle(0xd8a531, 1); g.fillRect(x - 14 * s, y - 17 * s, 28 * s, 2.5 * s); g.fillRect(x - 9 * s, y - 26 * s, 3 * s, 26 * s); g.fillRect(x + 6 * s, y - 26 * s, 3 * s, 26 * s);
    g.fillStyle(0xffe070, 1); g.fillRect(x - 2.5 * s, y - 19 * s, 5 * s, 6 * s);
    g.fillStyle(0xffd040, 0.9); g.fillCircle(x - 4 * s, y - 27 * s, 2 * s); g.fillCircle(x + 3 * s, y - 28 * s, 2 * s);
  },
};

function gearShape(g: G, x: number, y: number, r: number, c: number): void {
  const teeth = Math.max(6, Math.round(r / 1.6));
  g.fillStyle(c, 1);
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a0 = a - Math.PI / (teeth * 2) * 0.6, a1 = a + Math.PI / (teeth * 2) * 0.6;
    if (i === 0) g.moveTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    else g.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    g.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  g.closePath(); g.fillPath();
  g.fillStyle(dk(c, 0.35), 1); g.fillCircle(x, y, r * 0.4);
  g.fillStyle(lt(c, 0.3), 1); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.15);
}

/** Paint one prop. Unknown kinds draw a rock rather than nothing. */
export function drawProp(g: G, kind: PropKind, x: number, y: number, s: number, th: TownTheme, r: () => number): void {
  (PROPS[kind] ?? PROPS.rock)(g, x, y, s, th, r);
}

/** Props flat enough to bake into the ground layer rather than depth-sort. */
export const FLAT_PROPS = new Set<PropKind>([
  'lavaVent', 'oilSlick', 'acidPool', 'shadowPool', 'fogPatch', 'runeCircle', 'chalkDoodle', 'crater',
  'snowdrift', 'mushroomRing', 'flowerbed', 'cloudPuff', 'ironFilings', 'bouncePad', 'swirl', 'duneMound',
  'wheat', 'lilyPond',
]);
