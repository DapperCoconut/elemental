import Phaser from 'phaser';
import { DEPTH, FONT_DISPLAY, hex, mix } from './Theme';
import { Sfx } from '../audio';

/**
 * Carpentry for the character menus: planks, shelves, counters, and the hanging wooden signs
 * the shop pages on. Everything is drawn, nothing is a texture, and every piece takes the same
 * three oak tones so a sign and the shelf under it read as cut from one tree.
 */

export const WOOD = {
  dark: 0x3a2314,
  mid: 0x5c3a1e,
  lit: 0x7d5230,
  edge: 0x20120a,
  grain: 0x2e1a0e,
  /** Iron nails, brackets and chain. */
  iron: 0x3b3a44,
  ironLit: 0x7a7a8c,
  rope: 0x9a7b4a,
  ropeLit: 0xc9a86a,
  /** Painted lettering on a sign. */
  paint: 0xf1e2c0,
};

/** Deterministic 0–1 noise so grain never shimmers between frames. */
function wn(seed: number, i: number): number {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * One plank, `x, y` the top-left. Grain runs along the long axis; the top edge is lit and the
 * bottom edge is in shadow so a horizontal plank reads as a shelf with depth.
 */
export function drawPlank(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  opts: { seed?: number; lit?: number; alpha?: number; nails?: boolean; vertical?: boolean } = {},
): void {
  const seed = opts.seed ?? x + y;
  const lift = opts.lit ?? 0;
  const a = opts.alpha ?? 1;
  const base = mix(WOOD.mid, 0xffffff, lift * 0.25);
  g.fillStyle(WOOD.edge, a);
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(base, a);
  g.fillRect(x, y, w, h);
  // Grain: long wavering lines, a knot or two.
  const n = Math.max(2, Math.floor((opts.vertical ? w : h) / 6));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const dark = wn(seed, i) > 0.5;
    g.lineStyle(1, dark ? WOOD.grain : mix(WOOD.lit, 0xffffff, lift * 0.2), a * (dark ? 0.55 : 0.35));
    g.beginPath();
    if (opts.vertical) {
      const gx = x + u * w;
      g.moveTo(gx, y);
      for (let k = 1; k <= 6; k++) g.lineTo(gx + Math.sin(k * 1.7 + seed + i) * 1.4, y + (h * k) / 6);
    } else {
      const gy = y + u * h;
      g.moveTo(x, gy);
      for (let k = 1; k <= 8; k++) g.lineTo(x + (w * k) / 8, gy + Math.sin(k * 1.3 + seed + i) * 1.2);
    }
    g.strokePath();
  }
  if (wn(seed, 99) > 0.4) {
    const kx = x + (0.2 + wn(seed, 7) * 0.6) * w;
    const ky = y + (0.3 + wn(seed, 8) * 0.4) * h;
    g.fillStyle(WOOD.grain, a * 0.8);
    g.fillEllipse(kx, ky, 7, 4.5);
    g.fillStyle(WOOD.dark, a);
    g.fillEllipse(kx, ky, 3.5, 2.2);
  }
  // Lit top edge, shadowed bottom edge.
  g.fillStyle(mix(WOOD.lit, 0xffffff, 0.2 + lift * 0.3), a * 0.55);
  g.fillRect(x, y, w, 1.5);
  g.fillStyle(0x000000, a * 0.3);
  g.fillRect(x, y + h - 2, w, 2);
  if (opts.nails) {
    for (const [nx, ny] of [[x + 6, y + h / 2], [x + w - 6, y + h / 2]]) {
      g.fillStyle(WOOD.iron, a);
      g.fillCircle(nx, ny, 2.2);
      g.fillStyle(WOOD.ironLit, a);
      g.fillCircle(nx - 0.6, ny - 0.6, 0.9);
    }
  }
}

/**
 * A shelf: the plank, the thin lip of shadow on the wall beneath it, and two iron brackets
 * holding it up. Items stand with their feet on `y`.
 */
export function drawShelf(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, seed = 1): void {
  // Wall shadow under the shelf.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(0x000000, 0.12 * (1 - i / 6));
    g.fillRect(x, y + 10 + i * 2, w, 2);
  }
  // Brackets.
  for (const bx of [x + 26, x + w - 26]) {
    g.lineStyle(3, WOOD.iron, 1);
    g.beginPath(); g.moveTo(bx, y + 10); g.lineTo(bx, y + 30); g.lineTo(bx + 16, y + 10); g.strokePath();
    g.fillStyle(WOOD.ironLit, 1);
    g.fillCircle(bx, y + 28, 1.8);
  }
  drawPlank(g, x, y, w, 10, { seed, nails: false });
  // The front face of the plank, a shade darker.
  g.fillStyle(WOOD.dark, 1);
  g.fillRect(x, y + 10, w, 4);
  g.fillStyle(WOOD.edge, 1);
  g.fillRect(x, y + 14, w, 1);
}

/** A pentagon arrow plank or a plain rectangle plank, centred, returned as points. */
function signPoints(w: number, h: number, arrow?: 'left' | 'right'): Phaser.Geom.Point[] {
  const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);
  const hw = w / 2;
  const hh = h / 2;
  const tip = h * 0.55;
  if (arrow === 'right') return [P(-hw, -hh), P(hw - tip, -hh), P(hw, 0), P(hw - tip, hh), P(-hw, hh)];
  if (arrow === 'left') return [P(-hw + tip, -hh), P(hw, -hh), P(hw, hh), P(-hw + tip, hh), P(-hw, 0)];
  return [P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)];
}

export interface HangingSignHandle {
  container: Phaser.GameObjects.Container;
  setLabel: (label: string) => void;
  /** Nudge it — called on click so the plank swings. */
  kick: (dir?: number) => void;
  destroy: () => void;
}

/**
 * A wooden sign hanging from two ropes off a hook at `(x, y)`. Arrow signs are the shop's
 * page-turners; a plain one carries a title. The whole thing sways gently on the hook and
 * swings when clicked.
 */
export function addHangingSign(scene: Phaser.Scene, opts: {
  /** The hook the ropes hang from. */
  x: number; y: number;
  w: number; h: number;
  label: string;
  arrow?: 'left' | 'right';
  /** Rope length from hook to plank top. */
  drop?: number;
  accent?: number;
  depth?: number;
  fontSize?: number;
  disabled?: boolean;
  onClick?: () => void;
}): HangingSignHandle {
  const drop = opts.drop ?? 34;
  const depth = opts.depth ?? DEPTH.content;
  const accent = opts.accent ?? WOOD.paint;
  const { w, h } = opts;
  const plankY = drop + h / 2;

  const container = scene.add.container(opts.x, opts.y).setDepth(depth);
  const g = scene.add.graphics();
  const label = scene.add.text(0, plankY + 1, opts.label.toUpperCase(), {
    fontSize: `${opts.fontSize ?? 12}px`, fontFamily: FONT_DISPLAY,
    color: hex(accent), letterSpacing: 2,
  }).setOrigin(0.5);
  const hit = scene.add.rectangle(0, plankY, w, h, 0xffffff, 0);
  container.add([g, label, hit]);

  const paint = (lit: number): void => {
    g.clear();
    // The hook, and the two ropes.
    g.fillStyle(WOOD.iron, 1);
    g.fillCircle(0, 0, 3);
    g.fillStyle(WOOD.ironLit, 1);
    g.fillCircle(-0.8, -0.8, 1.1);
    for (const rx of [-w * 0.32, w * 0.32]) {
      g.lineStyle(2.4, WOOD.rope, 1);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(rx, plankY - h / 2); g.strokePath();
      g.lineStyle(0.8, WOOD.ropeLit, 0.7);
      g.beginPath(); g.moveTo(-0.5, 0); g.lineTo(rx - 0.5, plankY - h / 2); g.strokePath();
      // Eye bolt in the plank.
      g.fillStyle(WOOD.iron, 1);
      g.fillCircle(rx, plankY - h / 2 + 3, 2.4);
    }
    // Shadow, then the plank.
    const pts = signPoints(w, h, opts.arrow);
    g.fillStyle(0x000000, 0.35);
    g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + plankY + 4)), true, true);
    const base = opts.disabled ? mix(WOOD.mid, 0x222222, 0.5) : mix(WOOD.mid, 0xffffff, lit * 0.22);
    g.fillStyle(WOOD.edge, 1);
    g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x * 1.03, p.y * 1.06 + plankY)), true, true);
    g.fillStyle(base, 1);
    g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y + plankY)), true, true);
    // Grain lines clipped to the plank's rectangle body.
    const bodyL = opts.arrow === 'left' ? -w / 2 + h * 0.55 : -w / 2;
    const bodyR = opts.arrow === 'right' ? w / 2 - h * 0.55 : w / 2;
    for (let i = 0; i < 4; i++) {
      const gy = plankY - h / 2 + ((i + 0.5) / 4) * h;
      g.lineStyle(1, i % 2 ? WOOD.grain : mix(WOOD.lit, 0xffffff, lit * 0.2), i % 2 ? 0.5 : 0.3);
      g.beginPath();
      g.moveTo(bodyL + 4, gy);
      for (let k = 1; k <= 6; k++) g.lineTo(bodyL + 4 + ((bodyR - bodyL - 8) * k) / 6, gy + Math.sin(k * 1.9 + i) * 1.1);
      g.strokePath();
    }
    // Lit top edge.
    g.lineStyle(1.2, mix(WOOD.lit, 0xffffff, 0.3 + lit * 0.4), 0.7);
    g.beginPath(); g.moveTo(bodyL + 2, plankY - h / 2 + 1); g.lineTo(bodyR - 2, plankY - h / 2 + 1); g.strokePath();
    // A painted border inset on the plank, in the lettering colour.
    g.lineStyle(1, accent, opts.disabled ? 0.15 : 0.35 + lit * 0.3);
    g.strokePoints(signPoints(w - 8, h - 8, opts.arrow).map((p) => new Phaser.Geom.Point(p.x, p.y + plankY)), true);
    // Nails in the corners.
    for (const [nx, ny] of [[bodyL + 6, plankY - h / 2 + 6], [bodyR - 6, plankY - h / 2 + 6], [bodyL + 6, plankY + h / 2 - 6], [bodyR - 6, plankY + h / 2 - 6]]) {
      g.fillStyle(WOOD.iron, 1);
      g.fillCircle(nx, ny, 1.8);
      g.fillStyle(WOOD.ironLit, 1);
      g.fillCircle(nx - 0.5, ny - 0.5, 0.7);
    }
  };
  paint(0);
  label.setAlpha(opts.disabled ? 0.35 : 1);

  // Idle sway on the hook.
  const sway = scene.tweens.add({
    targets: container, angle: { from: -1.6, to: 1.6 },
    duration: 2600 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  const kick = (dir = 1): void => {
    sway.pause();
    scene.tweens.add({
      targets: container, angle: { from: 6 * dir, to: 0 },
      duration: 900, ease: 'Elastic.easeOut',
      onComplete: () => sway.resume(),
    });
  };

  if (!opts.disabled && opts.onClick) {
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { paint(1); Sfx.play('ui-hover'); });
    hit.on('pointerout', () => paint(0));
    hit.on('pointerdown', () => {
      Sfx.play('ui-page');
      kick(opts.arrow === 'left' ? -1 : 1);
      opts.onClick?.();
    });
  }

  return {
    container,
    setLabel: (text: string) => { label.setText(text.toUpperCase()); },
    kick,
    destroy: () => { sway.stop(); container.destroy(); },
  };
}

/** A small parchment price tag hanging on a string from `(x, y)`. */
export function drawPriceTag(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, accent: number,
  opts: { lit?: number; muted?: boolean } = {},
): { textX: number; textY: number } {
  const h = 18;
  const top = y + 10;
  g.lineStyle(1, WOOD.rope, 0.9);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, top); g.strokePath();
  const paper = opts.muted ? 0x5a5248 : mix(0xe9d9b0, accent, 0.08 + (opts.lit ?? 0) * 0.1);
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x - w / 2 + 1, top + 2, w, h, 3);
  g.fillStyle(paper, 1);
  g.fillRoundedRect(x - w / 2, top, w, h, 3);
  g.lineStyle(1, mix(paper, 0x000000, 0.45), 0.8);
  g.strokeRoundedRect(x - w / 2, top, w, h, 3);
  // Punched hole.
  g.fillStyle(mix(paper, 0x000000, 0.5), 1);
  g.fillCircle(x, top + 3.5, 1.6);
  return { textX: x, textY: top + h / 2 + 1.5 };
}
