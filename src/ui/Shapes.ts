import Phaser from 'phaser';
import { mix } from './Theme';

/**
 * Low-level drawing primitives shared by every UI component.
 *
 * The house shape is the *notched plate*: a rectangle with its corners cut at
 * 45°, like a machined faceplate. Everything — panels, buttons, chips, tiles —
 * is built from it, which is what makes the menus read as one system.
 *
 * Gradients are painted as horizontal strips rather than via
 * `Graphics.fillGradientStyle`, which is WebGL-only and does not honour
 * arbitrary fill paths. The strip approach insets each row to follow the corner
 * cuts, so a gradient inside a notched plate stays inside the notches.
 */

/** Which corners of a plate are cut: `[topLeft, topRight, bottomRight, bottomLeft]`. */
export type Corners = [boolean, boolean, boolean, boolean];

export const ALL_CORNERS: Corners = [true, true, true, true];
/** A plate that reads as "attached at the top" — only the bottom corners cut. */
export const BOTTOM_CORNERS: Corners = [false, false, true, true];
/** A plate that reads as "attached at the bottom". */
export const TOP_CORNERS: Corners = [true, true, false, false];
/** Diagonal cut — the signature shape for cards and tiles. */
export const DIAGONAL_CORNERS: Corners = [true, false, true, false];

/**
 * Outline of a notched plate as a flat point list, starting at the top-left cut
 * and running clockwise. `x`/`y` are the top-left of the bounding box.
 */
export function notchedPath(
  x: number, y: number, w: number, h: number,
  cut: number, corners: Corners = ALL_CORNERS,
): Phaser.Geom.Point[] {
  const c = Math.max(0, Math.min(cut, Math.min(w, h) / 2));
  const [tl, tr, br, bl] = corners;
  const p = (px: number, py: number) => new Phaser.Geom.Point(px, py);
  const pts: Phaser.Geom.Point[] = [];

  if (tl) { pts.push(p(x + c, y)); } else { pts.push(p(x, y)); }
  if (tr) { pts.push(p(x + w - c, y), p(x + w, y + c)); } else { pts.push(p(x + w, y)); }
  if (br) { pts.push(p(x + w, y + h - c), p(x + w - c, y + h)); } else { pts.push(p(x + w, y + h)); }
  if (bl) { pts.push(p(x + c, y + h), p(x, y + h - c)); } else { pts.push(p(x, y + h)); }
  if (tl) { pts.push(p(x, y + c)); }

  return pts;
}

/** Fill a notched plate with a flat colour. */
export function fillNotched(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  color: number, alpha = 1, cut = 10, corners: Corners = ALL_CORNERS,
): void {
  g.fillStyle(color, alpha);
  g.fillPoints(notchedPath(x, y, w, h, cut, corners), true, true);
}

/** Stroke the outline of a notched plate. */
export function strokeNotched(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  color: number, alpha = 1, thickness = 1, cut = 10, corners: Corners = ALL_CORNERS,
): void {
  g.lineStyle(thickness, color, alpha);
  const pts = notchedPath(x, y, w, h, cut, corners);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

/**
 * Vertical gradient inside a notched plate.
 *
 * Painted as `steps` horizontal strips; each strip is inset on the left and
 * right by however far it intrudes into a cut corner, so the gradient hugs the
 * notched silhouette exactly.
 */
export function fillNotchedGradient(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  topColor: number, bottomColor: number,
  alpha = 1, cut = 10, corners: Corners = ALL_CORNERS, steps = 20,
): void {
  const c = Math.max(0, Math.min(cut, Math.min(w, h) / 2));
  const [tl, tr, br, bl] = corners;
  const stripH = h / steps;

  for (let i = 0; i < steps; i++) {
    const top = y + i * stripH;
    const mid = top + stripH / 2;
    const fromTop = mid - y;
    const fromBottom = y + h - mid;

    let insetL = 0;
    let insetR = 0;
    if (tl && fromTop < c) insetL = Math.max(insetL, c - fromTop);
    if (bl && fromBottom < c) insetL = Math.max(insetL, c - fromBottom);
    if (tr && fromTop < c) insetR = Math.max(insetR, c - fromTop);
    if (br && fromBottom < c) insetR = Math.max(insetR, c - fromBottom);

    const sw = w - insetL - insetR;
    if (sw <= 0) continue;

    g.fillStyle(mix(topColor, bottomColor, steps === 1 ? 0 : i / (steps - 1)), alpha);
    // +0.75 overdraw kills the hairline seams between strips.
    g.fillRect(x + insetL, top, sw, stripH + 0.75);
  }
}

/**
 * Short right-angle brackets in each corner of a plate — the detail that makes
 * a frame look engineered instead of merely outlined.
 */
export function drawCornerBrackets(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  color: number, alpha = 1, thickness = 2, len = 14, cut = 10,
): void {
  g.lineStyle(thickness, color, alpha);
  const c = cut;

  // Each corner: two arms running away from the 45° cut.
  g.beginPath(); g.moveTo(x + c, y); g.lineTo(x + c + len, y); g.strokePath();
  g.beginPath(); g.moveTo(x, y + c); g.lineTo(x, y + c + len); g.strokePath();

  g.beginPath(); g.moveTo(x + w - c, y); g.lineTo(x + w - c - len, y); g.strokePath();
  g.beginPath(); g.moveTo(x + w, y + c); g.lineTo(x + w, y + c + len); g.strokePath();

  g.beginPath(); g.moveTo(x + w - c, y + h); g.lineTo(x + w - c - len, y + h); g.strokePath();
  g.beginPath(); g.moveTo(x + w, y + h - c); g.lineTo(x + w, y + h - c - len); g.strokePath();

  g.beginPath(); g.moveTo(x + c, y + h); g.lineTo(x + c + len, y + h); g.strokePath();
  g.beginPath(); g.moveTo(x, y + h - c); g.lineTo(x, y + h - c - len); g.strokePath();
}

/** A filled diamond — used as a rule ornament and list bullet. */
export function fillDiamond(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, r: number, color: number, alpha = 1,
): void {
  g.fillStyle(color, alpha);
  g.fillPoints([
    new Phaser.Geom.Point(cx, cy - r),
    new Phaser.Geom.Point(cx + r, cy),
    new Phaser.Geom.Point(cx, cy + r),
    new Phaser.Geom.Point(cx - r, cy),
  ], true, true);
}

/** A pointy-top hexagon — icon buttons and world-map nodes. */
export function hexPath(cx: number, cy: number, r: number): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

export function fillHex(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number,
  color: number, alpha = 1,
): void {
  g.fillStyle(color, alpha);
  g.fillPoints(hexPath(cx, cy, r), true, true);
}

export function strokeHex(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number,
  color: number, alpha = 1, thickness = 2,
): void {
  g.lineStyle(thickness, color, alpha);
  const pts = hexPath(cx, cy, r);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

/**
 * Soft outward bloom around a plate — concentric notched strokes fading out.
 * Cheap stand-in for a real blur, and it keeps the machined edge readable.
 */
export function drawGlow(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  color: number, strength = 0.3, rings = 5, spread = 3, cut = 10,
  corners: Corners = ALL_CORNERS,
): void {
  for (let i = rings; i >= 1; i--) {
    const o = i * spread;
    strokeNotched(
      g, x - o, y - o, w + o * 2, h + o * 2,
      color, (strength * (rings - i + 1)) / (rings * 2.2), 2, cut + o, corners,
    );
  }
}

/** Thin bright line along the top inside edge — a plate catching the light. */
export function drawSheen(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  color: number, alpha = 0.5, cut = 10,
): void {
  void h;
  g.lineStyle(1, color, alpha);
  g.beginPath();
  g.moveTo(x + cut + 1, y + 1);
  g.lineTo(x + w - cut - 1, y + 1);
  g.strokePath();
}

/**
 * Horizontal rule with a diamond at its centre and tapering ends. Used under
 * scene titles and between sections.
 */
export function drawOrnateRule(
  g: Phaser.GameObjects.Graphics,
  cx: number, y: number, halfWidth: number, color: number, alpha = 0.7,
): void {
  g.lineStyle(1, color, alpha * 0.7);
  g.beginPath(); g.moveTo(cx - halfWidth, y); g.lineTo(cx - 10, y); g.strokePath();
  g.beginPath(); g.moveTo(cx + 10, y); g.lineTo(cx + halfWidth, y); g.strokePath();

  g.lineStyle(1, color, alpha * 0.35);
  g.beginPath(); g.moveTo(cx - halfWidth * 0.6, y + 3); g.lineTo(cx - 14, y + 3); g.strokePath();
  g.beginPath(); g.moveTo(cx + 14, y + 3); g.lineTo(cx + halfWidth * 0.6, y + 3); g.strokePath();

  fillDiamond(g, cx, y, 4, color, alpha);
  fillDiamond(g, cx - halfWidth, y, 2, color, alpha * 0.6);
  fillDiamond(g, cx + halfWidth, y, 2, color, alpha * 0.6);
}

/** Progress meter drawn as a notched trough with a lit fill. */
export function drawMeter(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  ratio: number, color: number, trough = 0x0a0a16,
): void {
  const t = Phaser.Math.Clamp(ratio, 0, 1);
  fillNotched(g, x, y, w, h, trough, 1, h / 2, ALL_CORNERS);
  strokeNotched(g, x, y, w, h, color, 0.35, 1, h / 2, ALL_CORNERS);
  if (t <= 0) return;
  const fw = Math.max(h, w * t);
  fillNotchedGradient(
    g, x + 1, y + 1, fw - 2, h - 2,
    mix(color, 0xffffff, 0.35), color, 1, (h - 2) / 2, ALL_CORNERS, 6,
  );
}
