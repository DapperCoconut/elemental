import Phaser from 'phaser';
import { C, DEPTH, mix } from './Theme';
import { fillDiamond } from './Shapes';

export interface BackdropOptions {
  /** Accent the whole scene is lit by. Defaults to arcane violet. */
  accent?: number;
  /**
   * `lattice` — engraved diagonal grid, the default for menus.
   * `rays`    — light shafts converging on the title, for hero screens.
   * `void`    — near-empty starfield, for modals and map screens.
   */
  variant?: 'lattice' | 'rays' | 'void';
  /** Number of drifting motes. 0 disables them. */
  motes?: number;
  /** Draw the darkened edges. */
  vignette?: boolean;
  depth?: number;
}

/**
 * Paints a scene's full-screen background.
 *
 * Three layers, back to front: a tinted wash with a bloom behind the title
 * area, structure (lattice / rays / stars), and finally the vignette and the
 * frame that boxes the playfield in. Motes are separate tweened objects so the
 * screen breathes without a per-frame update hook.
 */
export function addBackdrop(scene: Phaser.Scene, opts: BackdropOptions = {}): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const accent = opts.accent ?? C.arcane;
  const variant = opts.variant ?? 'lattice';
  const moteCount = opts.motes ?? 18;
  const depth = opts.depth ?? DEPTH.backdrop;

  const g = scene.add.graphics().setDepth(depth);

  // ── Wash ────────────────────────────────────────────────────────────
  // Vertical ramp from near-black at the top to a faintly accent-tinted floor.
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const col = mix(C.void_, mix(C.bg, accent, 0.06), t);
    g.fillStyle(col, 1);
    g.fillRect(0, (height / steps) * i, width, height / steps + 1);
  }

  // Bloom behind the upper third, where titles live.
  const bloomX = width / 2;
  const bloomY = height * 0.24;
  for (let i = 14; i >= 1; i--) {
    g.fillStyle(accent, 0.014);
    g.fillCircle(bloomX, bloomY, i * (width / 22));
  }

  // ── Structure ───────────────────────────────────────────────────────
  if (variant === 'lattice') drawLattice(g, width, height, accent);
  else if (variant === 'rays') drawRays(g, width, height, accent);
  else drawVoidField(g, width, height, accent);

  // ── Vignette ────────────────────────────────────────────────────────
  if (opts.vignette !== false) {
    const bands = 22;
    const depthPx = 90;
    for (let i = 0; i < bands; i++) {
      const a = 0.055 * (1 - i / bands);
      const o = (depthPx / bands) * i;
      g.fillStyle(0x000000, a);
      g.fillRect(0, o, width, depthPx / bands + 1);
      g.fillRect(0, height - o - depthPx / bands - 1, width, depthPx / bands + 1);
      g.fillRect(o, 0, depthPx / bands + 1, height);
      g.fillRect(width - o - depthPx / bands - 1, 0, depthPx / bands + 1, height);
    }
  }

  // ── Frame ───────────────────────────────────────────────────────────
  // A hairline inset border with corner filigree — the screen's "bezel".
  const m = 10;
  g.lineStyle(1, accent, 0.16);
  g.strokeRect(m, m, width - m * 2, height - m * 2);
  g.lineStyle(1, accent, 0.07);
  g.strokeRect(m + 4, m + 4, width - (m + 4) * 2, height - (m + 4) * 2);

  const corners: Array<[number, number, number, number]> = [
    [m, m, 1, 1], [width - m, m, -1, 1], [m, height - m, 1, -1], [width - m, height - m, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    g.lineStyle(2, accent, 0.45);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 26 * sx, cy); g.strokePath();
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 26 * sy); g.strokePath();
    fillDiamond(g, cx + 34 * sx, cy, 3, accent, 0.5);
    fillDiamond(g, cx, cy + 34 * sy, 3, accent, 0.5);
  }

  // ── Motes ───────────────────────────────────────────────────────────
  for (let i = 0; i < moteCount; i++) {
    const mx = Phaser.Math.Between(20, width - 20);
    const my = Phaser.Math.Between(0, height);
    const r = Phaser.Math.FloatBetween(0.8, 2.4);
    const mote = scene.add.circle(mx, my, r, mix(accent, 0xffffff, 0.5), Phaser.Math.FloatBetween(0.2, 0.55))
      .setDepth(depth + 1);
    scene.tweens.add({
      targets: mote,
      y: my - Phaser.Math.Between(120, 300),
      alpha: 0,
      duration: Phaser.Math.Between(6000, 13000),
      delay: Phaser.Math.Between(0, 5000),
      repeat: -1,
      repeatDelay: Phaser.Math.Between(0, 2500),
      onRepeat: () => {
        mote.setPosition(Phaser.Math.Between(20, width - 20), Phaser.Math.Between(height * 0.5, height));
        mote.setAlpha(Phaser.Math.FloatBetween(0.2, 0.55));
      },
    });
  }

  return g;
}

/** Engraved 45° lattice with brighter major lines — the default menu texture. */
function drawLattice(g: Phaser.GameObjects.Graphics, width: number, height: number, accent: number): void {
  const minor = mix(C.lineSoft, accent, 0.18);
  const major = mix(C.line, accent, 0.3);
  const span = width + height;

  g.lineStyle(1, minor, 0.32);
  for (let i = -height; i < span; i += 34) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + height, height); g.strokePath();
  }
  g.lineStyle(1, minor, 0.16);
  for (let i = -height; i < span; i += 34) {
    g.beginPath(); g.moveTo(i, height); g.lineTo(i + height, 0); g.strokePath();
  }

  // Major verticals + horizontals, with a node dot at each crossing.
  g.lineStyle(1, major, 0.22);
  for (let x = 0; x <= width; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, height); g.strokePath(); }
  for (let y = 0; y <= height; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.strokePath(); }
  for (let x = 0; x <= width; x += 120) {
    for (let y = 0; y <= height; y += 120) fillDiamond(g, x, y, 2.5, accent, 0.3);
  }
}

/** Light shafts fanning down from above the title. */
function drawRays(g: Phaser.GameObjects.Graphics, width: number, height: number, accent: number): void {
  const ox = width / 2;
  const oy = -height * 0.35;
  const count = 13;
  for (let i = 0; i < count; i++) {
    const a = (-Math.PI / 2) + ((i - (count - 1) / 2) * 0.135);
    const wSpread = 0.026 + (i % 3) * 0.011;
    const len = height * 2.1;
    g.fillStyle(accent, i % 2 === 0 ? 0.035 : 0.02);
    g.fillPoints([
      new Phaser.Geom.Point(ox, oy),
      new Phaser.Geom.Point(ox + Math.cos(a - wSpread) * len, oy - Math.sin(a - wSpread) * len),
      new Phaser.Geom.Point(ox + Math.cos(a + wSpread) * len, oy - Math.sin(a + wSpread) * len),
    ], true, true);
  }

  // Ground haze so the shafts appear to land on something.
  for (let i = 0; i < 16; i++) {
    g.fillStyle(accent, 0.012);
    g.fillRect(0, height - i * 7, width, 7);
  }
  drawStars(g, width, height, accent, 60);
}

/** Sparse starfield with a couple of faint orbital arcs. */
function drawVoidField(g: Phaser.GameObjects.Graphics, width: number, height: number, accent: number): void {
  drawStars(g, width, height, accent, 120);
  g.lineStyle(1, accent, 0.09);
  for (const r of [width * 0.42, width * 0.62, width * 0.86]) {
    g.strokeEllipse(width / 2, height * 0.55, r * 2, r * 0.72);
  }
}

function drawStars(g: Phaser.GameObjects.Graphics, width: number, height: number, accent: number, n: number): void {
  // Deterministic scatter: a hash of the index, so the field is stable across
  // scene restarts instead of reshuffling every time the player backs out.
  for (let i = 0; i < n; i++) {
    const h = Math.sin(i * 127.1) * 43758.5453;
    const h2 = Math.sin(i * 311.7) * 24634.6345;
    const x = (h - Math.floor(h)) * width;
    const y = (h2 - Math.floor(h2)) * height;
    const s = (i % 7 === 0) ? 1.7 : 1;
    g.fillStyle(i % 5 === 0 ? mix(accent, 0xffffff, 0.7) : 0xffffff, i % 3 === 0 ? 0.28 : 0.14);
    g.fillCircle(x, y, s);
  }
}

/**
 * Full-screen dim used behind modals. Interactive, so it swallows clicks meant
 * for whatever is underneath.
 */
export function addScrim(scene: Phaser.Scene, alpha = 0.72, depth = DEPTH.overlay): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  const scrim = scene.add.rectangle(width / 2, height / 2, width, height, 0x03030a, alpha)
    .setDepth(depth)
    .setInteractive();
  scene.tweens.add({ targets: scrim, alpha: { from: 0, to: alpha }, duration: 140 });
  return scrim;
}
