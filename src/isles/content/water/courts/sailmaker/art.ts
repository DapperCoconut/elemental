import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, mixC, shadow, type G } from '../../../../art/IsleArt';

/**
 * The Sailmaker's Court's own drawing hand — shared by the cliff-top painter, the five fights,
 * the loft floor and Prince Hem. Everything here is canvas, hemp and thread: sheets that belly
 * in the wind, rope laid right-handed, running stitches, brass grommets, chalked patterns. The
 * colours live here once, so a sail on the drying green and a sail in a fight are the same sail.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** New sailcloth — unbleached flax, faintly warm. */
export const CANVAS = 0xece3cc;
/** Canvas in the fold / the shaded side of a belly. */
export const CANVAS_SHADE = 0xc9bc98;
/** Old weathered canvas gone grey-brown with salt. */
export const CANVAS_OLD = 0xa89c80;
/** Tanned (barked) canvas — the red-brown of working sails. */
export const TAN_SAIL = 0xa8583a;
export const HEMP = 0xc29a5e;
export const HEMP_DARK = 0x7a5a32;
/** Stockholm tar: rope, hulls, the dark of everything that meets the sea. */
export const TAR = 0x2a2420;
export const OAK = 0x6e4e30;
export const OAK_DARK = 0x3e2a1a;
export const PINE = 0xc8a46e;
export const IRON = 0x4a5058;
export const BRASS = 0xc9a24a;
/** Salt-bleached cliff turf. */
export const TURF = 0x7f9a6c;
export const TURF_DRY = 0xa4ac7a;
export const CHALK = 0xf2efe4;
export const CLIFF = 0xd8ccb0;
export const CLIFF_SHADE = 0x9a8c70;
export const SEA = 0x1f5f72;
export const SEA_DEEP = 0x123a4c;
export const FOAM = 0xe6f4f2;
/** The Queen's colour — drowned teal — on every tithe board and royal sail. */
export const QUEEN = 0x2a8a88;
export const QUEEN_DARK = 0x13484a;
/** Sailmaker's red thread — the twine every seam in the court is sewn with. */
export const RED_THREAD = 0xc8323a;
/** Prince Hem's velvet: a deep sea-blue, and the gold braid he trims it with. */
export const HEM_VELVET = 0x27407a;
export const HEM_GOLD = 0xe2b64a;
/** Pin and needle steel. */
export const STEEL = 0xd8dee6;

/** Ownership tints used by the fights — the player's things vs the foe's. */
export const PLAYER_TINT = 0x6fc6ff;
export const FOE_TINT = 0xff7a4a;

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** True when segment AB crosses segment CD. */
export function segCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

/** Which side of the line AB the point is on (+1 / -1). */
export const sideOf = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number =>
  ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) >= 0 ? 1 : -1;

/** A hanging curve between two points — washing lines, rigging, rope bridges. */
export function sag(a: Pt, b: Pt, depth: number, n = 12): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * depth });
  }
  return pts;
}

/** Stroke a polyline (no joint caps — thin things). */
export function polyline(g: G, pts: Pt[], w: number, color: number, a = 1): void {
  if (pts.length < 2) return;
  g.lineStyle(w, color, a);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

// ── Rope and thread ──────────────────────────────────────────────────

/**
 * Laid rope along a polyline: a tarred core, the hemp fill, and the lay — short diagonal
 * strokes every few pixels, all leaning the same way, which is what makes it read as rope and
 * not as a stick. `w` is the rope's thickness.
 */
export function rope(g: G, pts: Pt[], w: number, color = HEMP, a = 1): void {
  if (pts.length < 2) return;
  polyline(g, pts, w + 1.5, dim(color, 0.55), a);
  polyline(g, pts, w, color, a);
  const step = Math.max(3, w * 1.3);
  g.lineStyle(Math.max(1, w * 0.3), dim(color, 0.3), a * 0.85);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < 1) continue;
    const ux = (q.x - p.x) / len, uy = (q.y - p.y) / len;
    const nx = -uy, ny = ux;
    for (let d = 0; d < len; d += step) {
      const cx = p.x + ux * d, cy = p.y + uy * d;
      g.lineBetween(cx - nx * w * 0.45 - ux * w * 0.35, cy - ny * w * 0.45 - uy * w * 0.35,
        cx + nx * w * 0.45 + ux * w * 0.35, cy + ny * w * 0.45 + uy * w * 0.35);
    }
  }
  g.lineStyle(Math.max(0.8, w * 0.18), lit(color, 0.35), a * 0.5);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y - w * 0.25);
  for (const p of pts) g.lineTo(p.x, p.y - w * 0.25);
  g.strokePath();
}

/** A running stitch along a segment — dash, gap, dash — the court's signature mark. */
export function stitches(g: G, ax: number, ay: number, bx: number, by: number, color = RED_THREAD, w = 2, stitch = 7, gap = 5, a = 1): void {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return;
  const ux = (bx - ax) / len, uy = (by - ay) / len;
  g.lineStyle(w, color, a);
  for (let d = 0; d < len; d += stitch + gap) {
    const e = Math.min(len, d + stitch);
    g.lineBetween(ax + ux * d, ay + uy * d, ax + ux * e, ay + uy * e);
  }
}

/** A chalked pattern line: dashed, soft, with a faint dust halo. */
export function chalkLine(g: G, ax: number, ay: number, bx: number, by: number, a = 0.8, color = CHALK): void {
  g.lineStyle(5, color, a * 0.12); g.lineBetween(ax, ay, bx, by);
  stitches(g, ax, ay, bx, by, color, 2, 9, 6, a);
}

/** A sailmaker's needle: a long triangular steel spike with an eye at the butt. */
export function needle(g: G, x: number, y: number, angle: number, len: number, a = 1, color = STEEL): void {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const nx = -uy, ny = ux;
  const w = Math.max(1.6, len * 0.08);
  const tipX = x + ux * len * 0.5, tipY = y + uy * len * 0.5;
  const bx = x - ux * len * 0.5, by = y - uy * len * 0.5;
  g.fillStyle(dim(color, 0.45), a);
  g.fillTriangle(bx + nx * (w + 1), by + ny * (w + 1), bx - nx * (w + 1), by - ny * (w + 1), tipX + ux, tipY + uy);
  g.fillStyle(color, a);
  g.fillTriangle(bx + nx * w, by + ny * w, bx - nx * w, by - ny * w, tipX, tipY);
  g.fillStyle(0xffffff, a * 0.7);
  g.fillTriangle(bx + nx * w * 0.3, by + ny * w * 0.3, bx, by, tipX, tipY);
  // The eye.
  g.fillStyle(dim(color, 0.7), a); g.fillEllipse(bx + ux * w * 1.4, by + uy * w * 1.4, w * 1.2, w * 0.7);
}

/** A pin with a coloured glass head, stuck into the floor at a lean. */
export function pin(g: G, x: number, y: number, head: number, s = 1, a = 1): void {
  g.lineStyle(1.4 * s, STEEL, a); g.lineBetween(x, y, x + 3 * s, y - 13 * s);
  g.fillStyle(dim(head, 0.4), a); g.fillCircle(x + 3.4 * s, y - 13.6 * s, 3.4 * s);
  g.fillStyle(head, a); g.fillCircle(x + 3 * s, y - 14 * s, 3 * s);
  g.fillStyle(0xffffff, a * 0.6); g.fillCircle(x + 2 * s, y - 15 * s, 1 * s);
}

/** A wooden thread spool with a wrap of colour. */
export function spool(g: G, x: number, y: number, s: number, thread: number): void {
  shadow(g, x, y + 1, s * 2.4, s * 0.8, 0.25);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - s * 1.05, y - s * 2.3, s * 2.1, s * 0.4); g.fillRect(x - s * 1.05, y - s * 0.4, s * 2.1, s * 0.4);
  g.fillStyle(PINE, 1); g.fillRect(x - s, y - s * 2.25, s * 2, s * 0.3); g.fillRect(x - s, y - s * 0.35, s * 2, s * 0.3);
  g.fillStyle(thread, 1); g.fillRect(x - s * 0.8, y - s * 1.9, s * 1.6, s * 1.5);
  g.lineStyle(1, dim(thread, 0.35), 0.8);
  for (let i = 1; i < 5; i++) g.lineBetween(x - s * 0.8, y - s * 1.9 + i * s * 0.3, x + s * 0.8, y - s * 1.9 + i * s * 0.3 - s * 0.1);
  g.fillStyle(lit(thread, 0.3), 0.7); g.fillRect(x - s * 0.7, y - s * 1.85, s * 0.3, s * 1.4);
}

// ── Canvas ───────────────────────────────────────────────────────────

/**
 * A sheet of canvas hanging from a line: `x,y` is the middle of its top edge, `w` its width,
 * `h` its drop. `billow` (−1..1) bellies the cloth sideways on the wind; `flap` is a phase for
 * anything animated. Folds are drawn as soft vertical shade bands, the hem as a doubled edge
 * with a row of red stitches, and two clothes-pegs pinch the top.
 */
export function sheet(g: G, x: number, y: number, w: number, h: number, billow: number, color = CANVAS, a = 1, flap = 0, pegs = true): void {
  const hw = w / 2;
  const sway = billow * w * 0.18;
  const pts: Phaser.Geom.Point[] = [];
  const n = 10;
  // Top edge — straight along the line.
  pts.push(new Phaser.Geom.Point(x - hw, y));
  pts.push(new Phaser.Geom.Point(x + hw, y));
  // Right edge, bellying out with the wind.
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    pts.push(new Phaser.Geom.Point(x + hw + Math.sin(t * Math.PI * 0.9) * sway + Math.sin(flap + t * 4) * 1.5, y + h * t));
  }
  // The hem, rippling.
  for (let i = 1; i < n; i++) {
    const t = 1 - i / n;
    pts.push(new Phaser.Geom.Point(x - hw + w * t + sway * 0.9, y + h + Math.sin(flap * 1.3 + t * 9) * 3));
  }
  // Left edge back up.
  for (let i = n; i >= 1; i--) {
    const t = i / n;
    pts.push(new Phaser.Geom.Point(x - hw + Math.sin(t * Math.PI * 0.9) * sway * 0.9 + Math.sin(flap + t * 5) * 1.5, y + h * t));
  }
  g.fillStyle(dim(color, 0.4), a * 0.9);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 2)), true, true);
  g.fillStyle(color, a); g.fillPoints(pts, true, true);
  // Folds: shade bands that lean with the belly.
  const folds = Math.max(2, Math.floor(w / 26));
  for (let k = 1; k < folds; k++) {
    const fx = x - hw + (w / folds) * k;
    const lean = sway * 0.8;
    g.lineStyle(Math.max(3, w / folds * 0.35), dim(color, 0.14), a * 0.6);
    g.lineBetween(fx, y + 4, fx + lean, y + h - 4);
    g.lineStyle(1.5, lit(color, 0.25), a * 0.5);
    g.lineBetween(fx + 5, y + 4, fx + 5 + lean, y + h - 6);
  }
  // Seams — sailcloth comes in bolts sewn side by side.
  g.lineStyle(1, dim(color, 0.25), a * 0.7);
  for (let k = 1; k < 3; k++) {
    const sy = y + (h / 3) * k;
    g.lineBetween(x - hw + sway * (k / 3) * 0.9, sy, x + hw + sway * (k / 3), sy);
  }
  // The hem and its stitches.
  stitches(g, x - hw + sway * 0.9 + 4, y + h - 5, x + hw + sway * 0.95 - 4, y + h - 5, RED_THREAD, 1.4, 5, 4, a * 0.9);
  if (pegs) {
    for (const px of [x - hw + 6, x + hw - 6]) peg(g, px, y);
  }
}

/** A split-wood clothes-peg pinching a line. */
export function peg(g: G, x: number, y: number, a = 1): void {
  g.fillStyle(OAK_DARK, a); g.fillRect(x - 2.6, y - 6, 5.2, 13);
  g.fillStyle(PINE, a); g.fillRect(x - 2, y - 5.5, 4, 12);
  g.fillStyle(OAK_DARK, a); g.fillRect(x - 0.4, y - 1, 0.8, 7);
  g.fillStyle(lit(PINE, 0.4), a); g.fillCircle(x, y - 4, 1.2);
}

/** A grommet: brass ring set into canvas. */
export function grommet(g: G, x: number, y: number, r = 3.5): void {
  g.fillStyle(dim(BRASS, 0.4), 1); g.fillCircle(x, y, r + 1);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r);
  g.fillStyle(TAR, 1); g.fillCircle(x, y, r * 0.5);
}

/** A sewn patch of cloth with a running-stitch border. */
export function patch(g: G, x: number, y: number, w: number, h: number, color: number, a = 1, thread = 0xf2efe4): void {
  g.fillStyle(dim(color, 0.4), a); g.fillRect(x - w / 2 + 1.5, y - h / 2 + 2, w, h);
  g.fillStyle(color, a); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(lit(color, 0.18), a * 0.8); g.fillRect(x - w / 2, y - h / 2, w, 3);
  const i = 4;
  stitches(g, x - w / 2 + i, y - h / 2 + i, x + w / 2 - i, y - h / 2 + i, thread, 1.3, 4, 3, a);
  stitches(g, x + w / 2 - i, y - h / 2 + i, x + w / 2 - i, y + h / 2 - i, thread, 1.3, 4, 3, a);
  stitches(g, x + w / 2 - i, y + h / 2 - i, x - w / 2 + i, y + h / 2 - i, thread, 1.3, 4, 3, a);
  stitches(g, x - w / 2 + i, y + h / 2 - i, x - w / 2 + i, y - h / 2 + i, thread, 1.3, 4, 3, a);
}

// ── Deck hardware ────────────────────────────────────────────────────

/** An iron horn cleat on a timber chock — the court's bollard. `s` ≈ its half-length. */
export function cleat(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, s * 2.6, s * 0.8, 0.35);
  g.fillStyle(OAK_DARK, 1); g.fillRoundedRect(x - s * 1.1, y - s * 0.55, s * 2.2, s * 0.9, 4);
  g.fillStyle(OAK, 1); g.fillRoundedRect(x - s, y - s * 0.6, s * 2, s * 0.7, 4);
  g.fillStyle(dim(IRON, 0.4), 1); g.fillRect(x - s * 0.22, y - s * 1.3, s * 0.44, s * 0.8);
  g.fillStyle(dim(IRON, 0.4), 1); g.fillRoundedRect(x - s * 0.95, y - s * 1.45, s * 1.9, s * 0.42, s * 0.2);
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - s * 0.9, y - s * 1.5, s * 1.8, s * 0.32, s * 0.16);
  g.fillStyle(lit(IRON, 0.35), 1); g.fillRect(x - s * 0.8, y - s * 1.48, s * 1.6, 2);
  // A turn of line belayed round the horns.
  g.lineStyle(2.2, HEMP, 1);
  g.lineBetween(x - s * 0.6, y - s * 1.2, x + s * 0.5, y - s * 1.4);
  g.lineBetween(x - s * 0.5, y - s * 1.4, x + s * 0.6, y - s * 1.2);
}

/** A coil of rope flaked down on the ground. */
export function ropeCoil(g: G, x: number, y: number, r: number, color = HEMP): void {
  shadow(g, x, y + 2, r * 2.3, r * 0.9, 0.3);
  for (let k = 0; k < 4; k++) {
    const rr = r * (1 - k * 0.2);
    g.lineStyle(r * 0.24, dim(color, 0.4 + k * 0.05), 1); g.strokeEllipse(x, y - k * 2.2, rr * 2, rr * 1.05);
    g.lineStyle(r * 0.16, k % 2 ? color : lit(color, 0.08), 1); g.strokeEllipse(x, y - k * 2.2 - 0.6, rr * 2, rr * 1.05);
  }
  g.fillStyle(dim(color, 0.6), 1); g.fillEllipse(x, y - 9, r * 0.7, r * 0.35);
}

/** A capstan — the drum the rope-walkers and shipwrights heave on. */
export function capstan(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, s * 2.6, s * 0.9);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - s * 0.75, y - s * 1.8, s * 1.5, s * 1.8);
  g.fillStyle(OAK, 1); g.fillRect(x - s * 0.68, y - s * 1.78, s * 1.36, s * 1.72);
  g.fillStyle(lit(OAK, 0.2), 1); g.fillRect(x - s * 0.68, y - s * 1.78, s * 0.3, s * 1.72);
  for (let i = 0; i < 3; i++) { g.fillStyle(IRON, 1); g.fillRect(x - s * 0.78, y - s * (0.4 + i * 0.6), s * 1.56, 3); }
  g.fillStyle(dim(OAK, 0.3), 1); g.fillEllipse(x, y - s * 1.82, s * 1.7, s * 0.5);
  // Bars.
  g.lineStyle(4, PINE, 1);
  g.lineBetween(x - s * 1.8, y - s * 1.9, x + s * 1.8, y - s * 1.75);
  g.lineBetween(x - s * 0.9, y - s * 2.2, x + s * 0.9, y - s * 1.5);
}

/** A tall stack of cloth bolts, ends showing. */
export function clothBolts(g: G, x: number, y: number, colors: number[]): void {
  shadow(g, x, y + 2, 64, 14);
  colors.forEach((c, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    const bx = x - 22 + col * 22 + (row % 2) * 11, by = y - 10 - row * 18;
    g.fillStyle(dim(c, 0.45), 1); g.fillEllipse(bx, by, 22, 18);
    g.fillStyle(c, 1); g.fillEllipse(bx, by, 19, 15);
    g.lineStyle(1, dim(c, 0.25), 0.9); g.strokeEllipse(bx, by, 12, 9); g.strokeEllipse(bx, by, 6, 4);
    g.fillStyle(OAK_DARK, 1); g.fillCircle(bx, by, 2);
  });
}

/** A gull, gliding (or flapping when `flap` > 0). */
export function gull(g: G, x: number, y: number, t: number, seed: number, s = 1): void {
  const f = Math.sin(t * 6 + seed) * 0.5 + 0.5;
  const lift = 3 + f * 4;
  g.lineStyle(2.2 * s, 0xf4f6f6, 0.95);
  g.beginPath();
  g.moveTo(x - 12 * s, y - lift * s);
  g.lineTo(x - 5 * s, y - 1 * s);
  g.lineTo(x, y);
  g.lineTo(x + 5 * s, y - 1 * s);
  g.lineTo(x + 12 * s, y - lift * s);
  g.strokePath();
  g.lineStyle(1.4 * s, 0x5a6066, 0.9);
  g.lineBetween(x - 12 * s, y - lift * s, x - 9 * s, y - lift * s * 0.8);
  g.lineBetween(x + 12 * s, y - lift * s, x + 9 * s, y - lift * s * 0.8);
}

/** Wind streaks — a few thin pale dashes flying along `angle`. Use in animated layers. */
export function windStreaks(g: G, x: number, y: number, w: number, h: number, t: number, angle: number, n: number, speed: number, a = 0.35, seed = 0): void {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  for (let i = 0; i < n; i++) {
    const s = (i * 7919 + seed * 104729) % 10007;
    const fx = (s % 997) / 997, fy = ((s * 13) % 991) / 991;
    // Each streak travels along the wind from its seeded start, wrapping inside the rect.
    const travel = t * speed * (0.8 + (i % 5) * 0.1);
    const px = x + ((((fx * w + ux * travel) % w) + w) % w);
    const py = y + ((((fy * h + uy * travel) % h) + h) % h);
    const len = 18 + (i % 4) * 9;
    g.lineStyle(1.4, 0xffffff, a * (0.5 + (i % 3) / 4));
    g.lineBetween(px, py, px + ux * len, py + uy * len);
  }
}

/** A tailor's dress form on a stand — the Pattern House is full of them. */
export function dressForm(g: G, x: number, y: number, s: number, cloth: number, trim = HEM_GOLD): void {
  shadow(g, x, y + 2, s * 1.6, s * 0.5);
  g.fillStyle(OAK_DARK, 1);
  g.fillTriangle(x - s * 0.6, y, x + s * 0.6, y, x, y - s * 0.4);
  g.fillRect(x - 2, y - s * 1.2, 4, s * 1.0);
  // Torso — shoulders, waist, hips.
  const top = y - s * 2.7;
  const body = [
    new Phaser.Geom.Point(x - s * 0.55, top + s * 0.15),
    new Phaser.Geom.Point(x + s * 0.55, top + s * 0.15),
    new Phaser.Geom.Point(x + s * 0.42, top + s * 0.55),
    new Phaser.Geom.Point(x + s * 0.3, top + s * 0.95),
    new Phaser.Geom.Point(x + s * 0.45, top + s * 1.35),
    new Phaser.Geom.Point(x - s * 0.45, top + s * 1.35),
    new Phaser.Geom.Point(x - s * 0.3, top + s * 0.95),
    new Phaser.Geom.Point(x - s * 0.42, top + s * 0.55),
  ];
  g.fillStyle(dim(cloth, 0.45), 1); g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x + 1.5, p.y + 1.5)), true, true);
  g.fillStyle(cloth, 1); g.fillPoints(body, true, true);
  g.fillStyle(lit(cloth, 0.2), 0.8); g.fillEllipse(x - s * 0.18, top + s * 0.45, s * 0.25, s * 0.5);
  g.lineStyle(2, trim, 0.95); g.lineBetween(x - s * 0.3, top + s * 0.95, x + s * 0.3, top + s * 0.95);
  stitches(g, x, top + s * 0.18, x, top + s * 1.3, trim, 1.2, 4, 3);
  // Neck knob.
  g.fillStyle(OAK, 1); g.fillCircle(x, top + s * 0.05, s * 0.14);
}

/** A tape measure loop or strip, with inch ticks and numbers implied by heavier marks. */
export function tapeStrip(g: G, ax: number, ay: number, bx: number, by: number, w: number, a = 1, color = HEM_GOLD): void {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return;
  const ux = (bx - ax) / len, uy = (by - ay) / len;
  const nx = -uy, ny = ux;
  g.lineStyle(w + 2, dim(color, 0.5), a); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(w, color, a); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(1, TAR, a * 0.8);
  for (let d = 0, k = 0; d < len; d += 6, k++) {
    const m = k % 4 === 0 ? w * 0.5 : w * 0.25;
    const cx = ax + ux * d, cy = ay + uy * d;
    g.lineBetween(cx + nx * w * 0.5, cy + ny * w * 0.5, cx + nx * (w * 0.5 - m), cy + ny * (w * 0.5 - m));
  }
}

/** The Queen's mark: a wave cresting inside a ring — painted on every tithe board in the Reach. */
export function tideMark(g: G, x: number, y: number, r: number, color = QUEEN, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.18), color, a); g.strokeCircle(x, y, r);
  g.lineStyle(Math.max(1.5, r * 0.2), color, a);
  g.beginPath();
  g.moveTo(x - r * 0.7, y + r * 0.25);
  g.lineTo(x - r * 0.35, y - r * 0.05);
  g.lineTo(x, y + r * 0.2);
  g.lineTo(x + r * 0.3, y - r * 0.35);
  g.lineTo(x + r * 0.65, y - r * 0.1);
  g.strokePath();
  g.fillStyle(color, a); g.fillCircle(x + r * 0.3, y - r * 0.38, r * 0.14);
}

/** Mix helper re-exported for the fights' tints. */
export const tint = mixC;
