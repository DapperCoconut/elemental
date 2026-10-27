import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, mixC, shadow, type G } from '../../../../art/IsleArt';

/**
 * The Slumber Court's own drawing hand — shared by the town painter, the five fights, the
 * quilted Hushing Yard and Prince Reverie. This is where Highspire's debtors are laid down to
 * sleep: everything here is soft, stitched, stuffed or dimmed. Patchwork quilts with tufted
 * buttons pave the streets; beds stand in rows in the open air under the big lilac sky; lamps are
 * hooded down to a hair of flame; dream-sheep graze on the clouds past the cliff edge; and on
 * every sleeping chest a brass breath-meter ticks the King's tax. The colours live here once, so a
 * pillow in the town and a pillow in a fight are the same pillow.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** Dusk meadow on the spire's lee shoulder — lilac-grey turf, its shade, and dew. */
export const TURF = 0x666c94;
export const TURF_DARK = 0x464a70;
export const TURF_LIT = 0x8a8eb4;
/** The cloud sea past the cliff edge: lit tops, lilac shade, the deep sky under it. */
export const CLOUD = 0xf2ecfa;
export const CLOUD_SHADE = 0xbcb2dc;
export const CLOUD_DEEP = 0x7a72b0;
export const SKY_DEEP = 0x4a4a88;
/** Quilt patches — cream, rose, sage, lavender, cornflower — and the stitching between them. */
export const QUILT_CREAM = 0xefe4d2;
export const QUILT_ROSE = 0xd8a6b6;
export const QUILT_SAGE = 0xa6bea6;
export const QUILT_LAV = 0xb6a6d8;
export const QUILT_SKY = 0xa2bcdc;
export const QUILTS = [QUILT_CREAM, QUILT_ROSE, QUILT_SAGE, QUILT_LAV, QUILT_SKY];
export const STITCH = 0x6a5a7a;
/** Down feathers, linen, and the pillow-ticking stripe. */
export const FEATHER = 0xfbf8f0;
export const LINEN = 0xe8e2f0;
export const TICKING = 0x8a9ac8;
/** Bedposts and shutters — dark walnut — and the plum and slate of the roofs. */
export const WALNUT = 0x5a3e34;
export const WALNUT_LIT = 0x8a624e;
export const PLUM = 0x6a4a7a;
export const SLATE = 0x4a5888;
export const MAUVE = 0x8a5a7a;
export const PLASTER = 0xd8d0e0;
/** The King's brass: every breath-meter and every collector's cart. */
export const BRASS = 0xc9a24a;
export const BRASS_DARK = 0x7a5e22;
/** Corked breath: pale bottle glass with a breath fogging inside, and the cork. */
export const BOTTLE = 0xcfe8ff;
export const CORK = 0xa87a4a;
/** A lamp turned down to a hair, and the lamp's old full warmth. */
export const LAMP_DIM = 0xe8a860;
export const LAMP_FULL = 0xffe2a0;
/** The Lake of Nod: deep indigo, its shallows, its rushes. */
export const NOD_DEEP = 0x1c1e46;
export const NOD = 0x2e3268;
export const NOD_LIT = 0x5a62a8;
export const RUSH = 0x3e5a4e;
/** Dreams and nightmares — soft violet, the black-plum of a bad dream, its red eyes. */
export const DREAM = 0xb89cff;
export const DREAM_LIT = 0xe4d8ff;
export const NIGHTMARE = 0x24142e;
export const NIGHTMARE_EYE = 0xff5a7a;
/** The moon over everything, and its gold. */
export const MOON = 0xfff2c8;
export const MOON_GOLD = 0xffd27a;
/** Dream-sheep wool: cloud white, lilac in the folds, and a sleepy grey face. */
export const WOOL = 0xf8f4ff;
export const WOOL_SHADE = 0xc8bce4;
export const SHEEP_FACE = 0x4a4258;

/** Ownership tints used by the fights — the player's things vs the foe's. */
export const PLAYER_TINT = 0x7ad0ff;
export const FOE_TINT = 0xff8a6a;

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Stroke a polyline (thin things). */
export function polyline(g: G, pts: Pt[], w: number, color: number, a = 1): void {
  if (pts.length < 2) return;
  g.lineStyle(w, color, a);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** A dotted polyline — sleepwalk paths, counted hops, stitching. */
export function dotted(g: G, pts: Pt[], gap: number, r: number, color: number, a = 1, phase = 0): void {
  let carry = ((phase % gap) + gap) % gap;
  g.fillStyle(color, a);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    for (let d = carry; d < len; d += gap) {
      const k = d / len;
      g.fillCircle(p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k, r);
    }
    carry = (carry - len) % gap;
    if (carry < 0) carry += gap;
  }
}

// ── Stitches and quilts ──────────────────────────────────────────────

/** A running stitch along a line — little dashes, the way every seam in this town is sewn. */
export function stitchLine(g: G, ax: number, ay: number, bx: number, by: number, color = STITCH, a = 0.8, dash = 5, gap = 4): void {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 1) return;
  const ux = (bx - ax) / len, uy = (by - ay) / len;
  g.lineStyle(1.3, color, a);
  for (let d = 0; d < len; d += dash + gap) {
    const e = Math.min(len, d + dash);
    g.lineBetween(ax + ux * d, ay + uy * d, ax + ux * e, ay + uy * e);
  }
}

/**
 * One quilt patch: a padded square with a soft shadow on its lower edge, a tufted button in the
 * middle pulling the padding in, and a running stitch round it.
 */
export function patch(g: G, x: number, y: number, w: number, h: number, color: number, rng: () => number, a = 1): void {
  g.fillStyle(dim(color, 0.28), a); g.fillRoundedRect(x, y + 2, w, h, 5);
  g.fillStyle(color, a); g.fillRoundedRect(x, y, w, h - 1, 5);
  g.fillStyle(lit(color, 0.18), a * 0.8); g.fillRoundedRect(x + 3, y + 2, w - 6, h * 0.3, 4);
  // The tuft pulls four soft creases toward the middle.
  const cx = x + w / 2, cy = y + h / 2;
  g.lineStyle(1, dim(color, 0.16), a * 0.7);
  g.lineBetween(cx - w * 0.32, cy - h * 0.32, cx - 2, cy - 2); g.lineBetween(cx + w * 0.32, cy - h * 0.32, cx + 2, cy - 2);
  g.lineBetween(cx - w * 0.32, cy + h * 0.32, cx - 2, cy + 2); g.lineBetween(cx + w * 0.32, cy + h * 0.32, cx + 2, cy + 2);
  g.fillStyle(dim(color, 0.45), a); g.fillCircle(cx, cy, 2.4);
  g.fillStyle(lit(color, 0.3), a); g.fillCircle(cx - 0.6, cy - 0.6, 1);
  if (rng() < 0.18) {
    // An odd patch is darned — a little cross-hatch of thread where it wore through.
    g.lineStyle(1, STITCH, a * 0.6);
    const dx = x + 6 + rng() * (w - 16), dy = y + 6 + rng() * (h - 16);
    for (let i = 0; i < 4; i++) { g.lineBetween(dx + i * 2, dy, dx + i * 2, dy + 8); g.lineBetween(dx, dy + i * 2, dx + 8, dy + i * 2); }
  }
  stitchLine(g, x + 3, y + 3, x + w - 3, y + 3, STITCH, a * 0.6);
  stitchLine(g, x + 3, y + h - 4, x + w - 3, y + h - 4, STITCH, a * 0.6);
  stitchLine(g, x + 3, y + 3, x + 3, y + h - 4, STITCH, a * 0.6);
  stitchLine(g, x + w - 3, y + 3, x + w - 3, y + h - 4, STITCH, a * 0.6);
}

/** A quilt laid along a polyline — the feather-bed streets. Patches tile across the band. */
export function quiltRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  // A dark hem under the whole band, then the patches.
  polyline(g, pts, w + 10, dim(STITCH, 0.2), 1);
  for (const p of pts) { g.fillStyle(dim(STITCH, 0.2), 1); g.fillCircle(p.x, p.y, (w + 10) / 2); }
  const s = 34;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (let d = 0; d < len + s * 0.5; d += s) {
      for (let off = -w / 2 + s / 2; off < w / 2; off += s) {
        const x = a.x + ux * d - uy * off, y = a.y + uy * d + ux * off;
        patch(g, x - s / 2, y - s / 2, s - 1, s - 1, QUILTS[Math.floor(rng() * QUILTS.length)], rng);
      }
    }
  }
  // Scalloped edging down both hems.
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1);
    for (let d = 0; d < len; d += 12) {
      for (const sgn of [-1, 1]) {
        const x = a.x + ux * d - uy * sgn * (w / 2 + 3), y = a.y + uy * d + ux * sgn * (w / 2 + 3);
        g.fillStyle(LINEN, 0.9); g.fillCircle(x, y, 4);
      }
    }
  }
}

// ── Sleep things ─────────────────────────────────────────────────────

/** The breath-meter every chest on Highspire wears: a brass dial, its needle at `level` 0–1. */
export function breathMeter(g: G, x: number, y: number, r: number, level: number, a = 1): void {
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y + 0.6, r + 1.2);
  g.fillStyle(BRASS, a); g.fillCircle(x, y, r);
  g.fillStyle(0xf4ecd8, a); g.fillCircle(x, y, r * 0.72);
  // A red band at the bottom of the scale — "in arrears".
  g.lineStyle(Math.max(1, r * 0.22), 0xc84a4a, a * 0.8);
  g.beginPath(); g.arc(x, y, r * 0.55, Math.PI * 0.8, Math.PI * 1.05, false); g.strokePath();
  const ang = Math.PI * 0.8 + Phaser.Math.Clamp(level, 0, 1) * Math.PI * 1.4;
  g.lineStyle(Math.max(1, r * 0.16), 0x2a2020, a);
  g.lineBetween(x, y, x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62);
  g.fillStyle(BRASS_DARK, a); g.fillCircle(x, y, Math.max(0.8, r * 0.14));
}

/** A corked bottle of breath — the tax, in glass. `fog` 0–1 is how full it is. */
export function breathBottle(g: G, x: number, y: number, s: number, fog = 0.7, a = 1, tilt = 0): void {
  const c = Math.cos(tilt), sn = Math.sin(tilt);
  const P = (dx: number, dy: number): [number, number] => [x + dx * c - dy * sn, y + dx * sn + dy * c];
  const [bx, by] = P(0, -s * 0.9);
  g.fillStyle(dim(BOTTLE, 0.45), a * 0.9); g.fillEllipse(bx + 1, by + 1, s * 1.5, s * 1.9);
  g.fillStyle(BOTTLE, a * 0.55); g.fillEllipse(bx, by, s * 1.4, s * 1.8);
  // The breath inside, a slow white curl.
  g.fillStyle(0xffffff, a * 0.5 * fog); g.fillEllipse(bx - s * 0.1, by + s * 0.2, s * 0.9 * fog + 1, s * 0.8 * fog + 1);
  g.fillStyle(0xffffff, a * 0.8); g.fillEllipse(bx - s * 0.35, by - s * 0.4, s * 0.22, s * 0.45);
  const [nx, ny] = P(0, -s * 1.85);
  g.fillStyle(BOTTLE, a * 0.7); g.fillRect(nx - s * 0.22, ny - s * 0.1, s * 0.44, s * 0.4);
  const [kx, ky] = P(0, -s * 2.1);
  g.fillStyle(dim(CORK, 0.3), a); g.fillRoundedRect(kx - s * 0.3, ky - s * 0.2, s * 0.6, s * 0.42, 2);
  g.fillStyle(CORK, a); g.fillRoundedRect(kx - s * 0.26, ky - s * 0.2, s * 0.52, s * 0.3, 2);
  // The King's wax seal on the cork.
  g.fillStyle(0xb83a4a, a); g.fillCircle(kx, ky + s * 0.18, s * 0.16);
}

/** A sleeping head on a pillow, seen from the foot of the bed: cap, closed eyes, open mouth. */
export function sleeperHead(g: G, x: number, y: number, r: number, skin: number, cap: number, a = 1): void {
  g.fillStyle(dim(skin, 0.35), a); g.fillCircle(x, y + 1, r + 1);
  g.fillStyle(skin, a); g.fillCircle(x, y, r);
  // Closed eyes — two little downward arcs.
  g.lineStyle(Math.max(1, r * 0.14), dim(skin, 0.6), a);
  g.beginPath(); g.arc(x - r * 0.38, y - r * 0.05, r * 0.22, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.beginPath(); g.arc(x + r * 0.38, y - r * 0.05, r * 0.22, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.fillStyle(dim(skin, 0.55), a); g.fillEllipse(x, y + r * 0.45, r * 0.28, r * 0.2);
  nightcapOn(g, x, y, r, cap, a, 0.4);
}

/** A floppy nightcap set on a round head: the cone droops to one side and ends in a pompom. */
export function nightcapOn(g: G, x: number, y: number, r: number, color: number, a = 1, droop = 0.5, sway = 0): void {
  const bx0 = x - r * 0.95, bx1 = x + r * 0.95, by = y - r * 0.35;
  const tipX = x + r * (1.3 + droop) + sway, tipY = y - r * (1.2 - droop * 0.9);
  const ctrlX = x + r * 0.2, ctrlY = y - r * 2.1;
  const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(bx0, by)];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, u = 1 - t;
    pts.push(new Phaser.Geom.Point(u * u * (x - r * 0.4) + 2 * u * t * ctrlX + t * t * tipX, u * u * (y - r * 1.1) + 2 * u * t * ctrlY + t * t * tipY));
  }
  for (let i = 10; i >= 0; i--) {
    const t = i / 10, u = 1 - t;
    pts.push(new Phaser.Geom.Point(u * u * (x + r * 0.7) + 2 * u * t * (ctrlX + r * 0.5) + t * t * tipX, u * u * (y - r * 0.5) + 2 * u * t * (ctrlY + r * 0.6) + t * t * tipY));
  }
  pts.push(new Phaser.Geom.Point(bx1, by));
  g.fillStyle(dim(color, 0.3), a); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 0.8, p.y + 1)), true, true);
  g.fillStyle(color, a); g.fillPoints(pts, true, true);
  // The turned-up brim and the pompom.
  g.fillStyle(lit(color, 0.45), a); g.fillRoundedRect(bx0 - 1, by - r * 0.22, bx1 - bx0 + 2, r * 0.36, r * 0.15);
  g.fillStyle(FEATHER, a); g.fillCircle(tipX, tipY, r * 0.3 + 1);
  g.fillStyle(LINEN, a); g.fillCircle(tipX + r * 0.08, tipY + r * 0.08, r * 0.16);
}

/**
 * A bed standing in the street: walnut head- and footboards, a fat pillow, a patchwork quilt over a
 * sleeper with a breath-meter pinned to the counterpane. `x,y` is the middle of the foot. Returns
 * the meter's point (for the ticking needle) — the head end faces up the screen.
 */
export function streetBed(g: G, x: number, y: number, w: number, d: number, quilt: number, skin: number, cap: number, rng: () => number): Pt {
  shadow(g, x, y + 2, w * 1.15, 12, 0.35);
  // Legs and headboard behind.
  g.fillStyle(WALNUT, 1);
  g.fillRect(x - w / 2, y - d - 26, 6, 30); g.fillRect(x + w / 2 - 6, y - d - 26, 6, 30);
  g.fillStyle(WALNUT_LIT, 1); g.fillRoundedRect(x - w / 2, y - d - 30, w, 18, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.fillStyle(WALNUT, 1); g.fillRect(x - w / 2 + 6, y - d - 20, w - 12, 3);
  // Mattress.
  g.fillStyle(dim(LINEN, 0.25), 1); g.fillRoundedRect(x - w / 2 + 2, y - d - 10, w - 4, d + 6, 6);
  g.fillStyle(LINEN, 1); g.fillRoundedRect(x - w / 2 + 2, y - d - 12, w - 4, d + 4, 6);
  // Pillow and the sleeper's head.
  g.fillStyle(dim(FEATHER, 0.15), 1); g.fillEllipse(x, y - d - 4, w * 0.62, 16);
  g.fillStyle(FEATHER, 1); g.fillEllipse(x, y - d - 6, w * 0.6, 14);
  sleeperHead(g, x - 2, y - d - 4, 7, skin, cap);
  // Quilt over the body — a small patchwork of its own.
  const qx = x - w / 2 + 3, qy = y - d + 4, qw = w - 6, qh = d - 4;
  g.fillStyle(dim(quilt, 0.3), 1); g.fillRoundedRect(qx, qy + 2, qw, qh, 5);
  g.fillStyle(quilt, 1); g.fillRoundedRect(qx, qy, qw, qh, 5);
  const cols = 3, rows = 2;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if ((i + j) % 2 === 0) continue;
    g.fillStyle(QUILTS[Math.floor(rng() * QUILTS.length)], 0.85);
    g.fillRect(qx + (qw / cols) * i + 1, qy + (qh / rows) * j + 1, qw / cols - 2, qh / rows - 2);
  }
  g.fillStyle(lit(quilt, 0.25), 0.8); g.fillRoundedRect(qx + 2, qy, qw - 4, 4, 2);
  // The body's hump under the quilt.
  g.fillStyle(lit(quilt, 0.12), 0.6); g.fillEllipse(x, qy + qh * 0.45, qw * 0.55, qh * 0.6);
  // Footboard in front.
  g.fillStyle(WALNUT, 1); g.fillRoundedRect(x - w / 2, y - 12, w, 14, 3);
  g.fillStyle(WALNUT_LIT, 1); g.fillRect(x - w / 2 + 2, y - 12, w - 4, 3);
  g.fillCircle(x - w / 2 + 3, y - 14, 3.5); g.fillCircle(x + w / 2 - 3, y - 14, 3.5);
  const meter = { x: x + w * 0.12, y: qy + qh * 0.35 };
  breathMeter(g, meter.x, meter.y, 5, 0.2 + rng() * 0.2);
  return meter;
}

/**
 * A dream-sheep: a cloud of wool on four sticks with a sleepy grey face. `hop` 0–1 lifts it in a
 * leap with its legs tucked; `dir` is which way it faces.
 */
export function dreamSheep(g: G, x: number, y: number, s: number, dir: 1 | -1, t: number, hop = 0, a = 1, wool = WOOL): void {
  const lift = Math.sin(Math.min(1, Math.max(0, hop)) * Math.PI) * s * 2.2;
  const by = y - s * 1.1 - lift;
  if (lift < s * 0.2) shadow(g, x, y, s * 2.2, s * 0.6, 0.25 * a);
  else { g.fillStyle(0x000000, 0.18 * a); g.fillEllipse(x, y, s * 1.8 * (1 - lift / (s * 5)), s * 0.5); }
  // Legs — trotting, or tucked mid-leap.
  g.lineStyle(Math.max(1.5, s * 0.18), SHEEP_FACE, a);
  const tuck = hop > 0.05 && hop < 0.95;
  for (let i = 0; i < 4; i++) {
    const lx = x + (i < 2 ? -1 : 1) * s * 0.45 + (i % 2) * s * 0.2 - s * 0.1;
    const swing = tuck ? 0 : Math.sin(t * 12 + i * 1.7) * s * 0.18;
    g.lineBetween(lx, by + s * 0.4, lx + swing + (tuck ? dir * -s * 0.25 : 0), by + s * (tuck ? 0.8 : 1.1));
  }
  // Wool: a cluster of puffs with shaded undersides.
  const puffs: [number, number, number][] = [[-0.55, 0.05, 0.5], [0, -0.15, 0.62], [0.5, 0.02, 0.5], [-0.2, 0.25, 0.48], [0.28, 0.24, 0.46], [-0.05, -0.4, 0.4]];
  g.fillStyle(WOOL_SHADE, a);
  for (const [px, py, pr] of puffs) g.fillCircle(x + px * s, by + py * s + s * 0.08, pr * s);
  g.fillStyle(wool, a);
  for (const [px, py, pr] of puffs) g.fillCircle(x + px * s, by + py * s, pr * s * 0.94);
  g.fillStyle(0xffffff, a * 0.7); g.fillCircle(x - s * 0.2, by - s * 0.45, s * 0.18);
  // Face and drooping ears; eyes half shut.
  const fx = x + dir * s * 0.82, fy = by - s * 0.05;
  g.fillStyle(SHEEP_FACE, a); g.fillEllipse(fx, fy, s * 0.55, s * 0.7);
  g.fillEllipse(fx - dir * s * 0.25, fy - s * 0.18, s * 0.4, s * 0.16);
  g.lineStyle(1.2, 0xe8e0f0, a);
  g.lineBetween(fx - s * 0.06, fy - s * 0.05, fx + dir * s * 0.1, fy - s * 0.04);
  g.fillStyle(wool, a); g.fillCircle(fx - dir * s * 0.05, fy - s * 0.32, s * 0.2);
}

/** Rising sleep letters: three Zs drifting up and fading, staggered by `phase`. */
export function zzz(g: G, x: number, y: number, s: number, t: number, color = DREAM_LIT, a = 1, phase = 0): void {
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.45 + i / 3 + phase) % 1;
    const zs = s * (0.6 + ph * 0.7);
    const zx = x + ph * s * 2.2 + Math.sin(t * 2 + i) * 2, zy = y - ph * s * 4;
    const al = a * Math.sin(ph * Math.PI);
    g.lineStyle(Math.max(1, zs * 0.22), color, al);
    g.lineBetween(zx - zs / 2, zy - zs / 2, zx + zs / 2, zy - zs / 2);
    g.lineBetween(zx + zs / 2, zy - zs / 2, zx - zs / 2, zy + zs / 2);
    g.lineBetween(zx - zs / 2, zy + zs / 2, zx + zs / 2, zy + zs / 2);
  }
}

/** A soft cloud of puffs — the pastures past the cliff edge, and dream-stuff in the fights. */
export function cloudPuff(g: G, x: number, y: number, r: number, a = 1, top = CLOUD, under = CLOUD_SHADE, seed = 0): void {
  const n = 6;
  g.fillStyle(under, a);
  for (let i = 0; i < n; i++) {
    const k = (i / (n - 1)) * 2 - 1;
    g.fillCircle(x + k * r * 1.05, y + r * 0.18 - (1 - Math.abs(k)) * r * 0.25, r * (0.55 + 0.2 * Math.sin(seed + i * 2.3)));
  }
  g.fillStyle(top, a);
  for (let i = 0; i < n; i++) {
    const k = (i / (n - 1)) * 2 - 1;
    g.fillCircle(x + k * r * 0.95, y - (1 - Math.abs(k)) * r * 0.35, r * (0.5 + 0.18 * Math.sin(seed + i * 2.3)));
  }
  g.fillStyle(0xffffff, a * 0.6); g.fillEllipse(x - r * 0.3, y - r * 0.55, r * 0.7, r * 0.22);
}

/** A pillow, seen a little from above: plump, with corner tufts and a ticking stripe. */
export function pillow(g: G, x: number, y: number, w: number, h: number, color = FEATHER, a = 1, angle = 0, stripe = TICKING): void {
  const c = Math.cos(angle), s = Math.sin(angle);
  const P = (dx: number, dy: number): Phaser.Geom.Point => new Phaser.Geom.Point(x + dx * c - dy * s, y + dx * s + dy * c);
  const outline: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    // A squarish ellipse pinched at the corners.
    const ex = Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 0.6) * w / 2;
    const ey = Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 0.6) * h / 2;
    outline.push(P(ex, ey));
  }
  g.fillStyle(0x000000, 0.2 * a); g.fillEllipse(x, y + h * 0.5, w * 0.9, h * 0.35);
  g.fillStyle(dim(color, 0.25), a); g.fillPoints(outline.map((p) => new Phaser.Geom.Point(p.x, p.y + 2)), true, true);
  g.fillStyle(color, a); g.fillPoints(outline, true, true);
  g.lineStyle(Math.max(1, h * 0.08), stripe, a * 0.55);
  for (const k of [-0.18, 0.18]) { const a0 = P(-w * 0.42, h * k), a1 = P(w * 0.42, h * k); g.lineBetween(a0.x, a0.y, a1.x, a1.y); }
  const hl = P(-w * 0.15, -h * 0.22);
  g.fillStyle(0xffffff, a * 0.5); g.fillEllipse(hl.x, hl.y, w * 0.4, h * 0.2);
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const p = P(dx * w * 0.5, dy * h * 0.5);
    g.fillStyle(dim(color, 0.2), a); g.fillCircle(p.x, p.y, Math.max(1.5, h * 0.1));
  }
}

/** A single down feather, curling. */
export function feather(g: G, x: number, y: number, s: number, angle: number, a = 1, color = FEATHER): void {
  const c = Math.cos(angle), sn = Math.sin(angle);
  g.lineStyle(Math.max(0.8, s * 0.1), dim(color, 0.3), a);
  g.lineBetween(x - c * s, y - sn * s, x + c * s, y + sn * s);
  g.fillStyle(color, a * 0.9);
  g.fillEllipse(x + c * s * 0.15, y + sn * s * 0.15, s * 1.5, s * 0.6);
}

/**
 * A street lamp under the Dimming Order: an iron post, the lantern hooded in a felt cowl, and a
 * glass turned down to a hair of flame. Returns the flame point (for the flicker).
 */
export function hoodedLamp(g: G, x: number, y: number, lit_ = false): Pt {
  shadow(g, x, y, 20, 6);
  g.fillStyle(0x2a2632, 1); g.fillRect(x - 2.5, y - 62, 5, 62);
  g.fillRect(x - 7, y - 4, 14, 4);
  // Curled bracket and the lantern.
  g.lineStyle(2.5, 0x2a2632, 1);
  g.beginPath(); g.arc(x + 8, y - 62, 8, Math.PI, Math.PI * 1.9, false); g.strokePath();
  g.fillStyle(0x3a3442, 1); g.fillRect(x + 8, y - 60, 14, 18);
  g.fillStyle(lit_ ? LAMP_FULL : dim(LAMP_DIM, 0.45), 1); g.fillRect(x + 10, y - 57, 10, 12);
  // The felt cowl the Dimming Order makes every lamplighter pull down.
  if (!lit_) {
    g.fillStyle(dim(PLUM, 0.2), 1);
    g.fillTriangle(x + 4, y - 50, x + 26, y - 50, x + 15, y - 76);
    g.fillStyle(PLUM, 1); g.fillTriangle(x + 6, y - 51, x + 24, y - 51, x + 15, y - 74);
    stitchLine(g, x + 9, y - 52, x + 21, y - 52, lit(PLUM, 0.3), 0.8, 3, 2);
  } else {
    g.fillStyle(0x3a3442, 1); g.fillTriangle(x + 6, y - 60, x + 24, y - 60, x + 15, y - 68);
  }
  return { x: x + 15, y: y - 48 };
}

/** A moon disc with its craters faint — over the lake, in the floor, on the prince's cap. */
export function moon(g: G, x: number, y: number, r: number, a = 1, phase = 0): void {
  g.fillStyle(MOON, a * 0.12); g.fillCircle(x, y, r * 1.6);
  g.fillStyle(MOON, a); g.fillCircle(x, y, r);
  g.fillStyle(mixC(MOON, MOON_GOLD, 0.4), a * 0.6);
  g.fillCircle(x - r * 0.3, y - r * 0.15, r * 0.18); g.fillCircle(x + r * 0.25, y + r * 0.3, r * 0.12); g.fillCircle(x + r * 0.35, y - r * 0.35, r * 0.08);
  if (phase > 0) { g.fillStyle(SKY_DEEP, a); g.fillCircle(x + r * (1.8 - phase * 0.9), y - r * 0.1, r * 0.95); }
}

/** A five-pointed star, filled. */
export function star(g: G, x: number, y: number, r: number, color: number, a = 1, rot = 0): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = rot - Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(new Phaser.Geom.Point(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr));
  }
  g.fillStyle(color, a); g.fillPoints(pts, true, true);
}
