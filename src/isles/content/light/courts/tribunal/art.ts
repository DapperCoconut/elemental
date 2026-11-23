import Phaser from 'phaser';
import { dim, glow, lit, mixC, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BRONZE, BRONZE_DARK, BRONZE_LIT, CHALK, GLASS, GLASS_DEEP, GLASS_EDGE, GLASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, GROUT,
  INK, IRON, IRON_DARK, IRON_LIT, LEAD, MARBLE, MARBLE_DEEP, MARBLE_LIT, MARBLE_SHADE, MIRROR, MIRROR_DARK, MIRROR_LIT,
  NOON_SHADOW, PARCH, PARCH_DARK, RIVET, ROBE, ROBE_DARK, ROBE_LIT, RUST, SUN, SUN_HOT, VEIN, WATER, WATER_DEEP,
  WATER_LIT, WAX, WIG,
} from './palette';

/**
 * Tribunal set pieces — a court built so nothing in it can hide. Everything is drawn *clear*:
 * glass walls you see the trial through, mirror cages that show the accused from every side,
 * marble polished to a glare, gold on every edge that catches the noon. Shadows are the tiny
 * hard blue-grey coins the Endless Noon allows, straight under each thing. The one dark mass in
 * the picture is the Heliostat's iron overhead, and the eye goes straight up it.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

/** The noon shadow: a small, hard, cool ellipse straight under a thing — never a long one. */
export function noonShadow(g: G, x: number, y: number, w: number, a = 0.34): void {
  g.fillStyle(NOON_SHADOW, a); g.fillEllipse(x, y, w, w * 0.22);
  g.fillStyle(NOON_SHADOW, a * 0.6); g.fillEllipse(x, y, w * 0.7, w * 0.14);
}

// ── Emblems ──────────────────────────────────────────────────────────

/** The Tribunal's emblem: a balance — a post, a beam, two hanging pans. */
export function scalesEmblem(g: G, x: number, y: number, r: number, color: number, a = 1, tilt = 0): void {
  g.lineStyle(Math.max(1, r * 0.12), color, a);
  g.lineBetween(x, y - r, x, y + r * 0.8);
  g.lineBetween(x - r * 0.4, y + r * 0.8, x + r * 0.4, y + r * 0.8);
  const bx = Math.cos(tilt) * r, by = Math.sin(tilt) * r;
  g.lineBetween(x - bx, y - r * 0.7 - by, x + bx, y - r * 0.7 + by);
  for (const k of [-1, 1]) {
    const px = x + k * bx, py = y - r * 0.7 + k * by;
    g.lineBetween(px, py, px - r * 0.28, py + r * 0.6);
    g.lineBetween(px, py, px + r * 0.28, py + r * 0.6);
    g.fillStyle(color, a);
    g.slice(px, py + r * 0.6, r * 0.32, 0, Math.PI, false); g.fillPath();
  }
  g.fillStyle(color, a); g.fillCircle(x, y - r, r * 0.12);
}

/** The Despot's sunburst: a disc with sixteen straight rays, alternately long and short. */
export function sunburst(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const L = i % 2 ? r : r * 0.72;
    g.fillStyle(color, a);
    g.fillTriangle(x + Math.cos(ang - 0.09) * r * 0.42, y + Math.sin(ang - 0.09) * r * 0.42,
      x + Math.cos(ang + 0.09) * r * 0.42, y + Math.sin(ang + 0.09) * r * 0.42, x + Math.cos(ang) * L, y + Math.sin(ang) * L);
  }
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.44);
  g.fillStyle(lit(color, 0.5), a * 0.8); g.fillCircle(x - r * 0.1, y - r * 0.1, r * 0.22);
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * The summit terrace: great polished limestone flags, laid in a running bond, each with a few
 * grey-gold veins and a hot white sheen where the noon sits on it.
 */
export function marbleTerrace(g: G, r: Rect, rng: () => number, size = 96): void {
  g.fillStyle(MARBLE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let row = 0, y = r.y; y < r.y + r.h; y += size * 0.66, row++) {
    const off = row % 2 ? size / 2 : 0;
    for (let x = r.x - off; x < r.x + r.w; x += size) {
      const k = rng();
      g.fillStyle(k < 0.3 ? MARBLE_LIT : k < 0.8 ? MARBLE : mixC(MARBLE, MARBLE_SHADE, 0.4), 1);
      g.fillRect(x + 1, y + 1, size - 2, size * 0.66 - 2);
      // Veins: a wandering hairline across the slab.
      if (rng() < 0.55) {
        let vx = x + rng() * size, vy = y + 2;
        g.lineStyle(1, VEIN, 0.35 + rng() * 0.2);
        g.beginPath(); g.moveTo(vx, vy);
        for (let s = 0; s < 4; s++) { vx += (rng() - 0.5) * 30; vy += size * 0.16; g.lineTo(vx, vy); }
        g.strokePath();
      }
      // The sheen: a white smear toward the top-left of every slab.
      g.fillStyle(0xffffff, 0.18); g.fillRect(x + 4, y + 4, size * 0.4, 3);
    }
    g.lineStyle(1, GROUT, 0.6); g.lineBetween(r.x, y, r.x + r.w, y);
  }
}

/**
 * The Processional: a wide walk of whiter stone between two gold inlay lines, a sunburst let into
 * it every so often, so the condemned walk to the Heliostat over the Despot's face.
 */
export function processional(g: G, x: number, y0: number, y1: number, w: number): void {
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - w / 2 - 4, y0, w + 8, y1 - y0);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - w / 2, y0, w, y1 - y0);
  for (let y = y0; y < y1; y += 48) { g.lineStyle(1, GROUT, 0.5); g.lineBetween(x - w / 2, y, x + w / 2, y); }
  g.lineStyle(1, GROUT, 0.4); g.lineBetween(x, y0, x, y1);
  for (const k of [-1, 1]) {
    g.fillStyle(GOLD_DARK, 1); g.fillRect(x + k * (w / 2 - 12) - 2, y0, 4, y1 - y0);
    g.fillStyle(GOLD, 1); g.fillRect(x + k * (w / 2 - 12) - 1.5, y0, 2.5, y1 - y0);
  }
  for (let y = y0 + 120; y < y1 - 60; y += 260) {
    g.fillStyle(MARBLE_SHADE, 1); g.fillCircle(x, y, w * 0.3 + 3);
    sunburst(g, x, y, w * 0.3, GOLD, 0.85);
  }
}

/** A plain walk of dressed stone with a gilt edge — the side walks of the terrace. */
export function sideWalk(g: G, pts: Pt[], w: number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const horiz = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
    const x0 = Math.min(a.x, b.x) - (horiz ? 0 : w / 2), y0 = Math.min(a.y, b.y) - (horiz ? w / 2 : 0);
    const rw = horiz ? Math.abs(b.x - a.x) : w, rh = horiz ? w : Math.abs(b.y - a.y);
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0 - 3, y0 - 3, rw + 6, rh + 6);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0, y0, rw, rh);
    g.lineStyle(1, GROUT, 0.45);
    if (horiz) for (let x = x0; x < x0 + rw; x += 40) g.lineBetween(x, y0, x, y0 + rh);
    else for (let y = y0; y < y0 + rh; y += 40) g.lineBetween(x0, y, x0 + rw, y);
    g.lineStyle(1.5, GOLD, 0.6); g.strokeRect(x0 + 3, y0 + 3, rw - 6, rh - 6);
  }
}

/** A round plaza of radiating flags with a gold ring — the floor round the great scale. */
export function scalePlaza(g: G, cx: number, cy: number, r: number): void {
  g.fillStyle(MARBLE_DEEP, 1); g.fillEllipse(cx, cy, r * 2 + 10, r * 1.6 + 8);
  g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(cx, cy, r * 2, r * 1.6);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.lineStyle(1, GROUT, 0.5); g.lineBetween(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.24, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
    if (i % 2 === 0) { g.fillStyle(MARBLE_SHADE, 0.35); g.slice(cx, cy, r, a, a + Math.PI / 12, false); g.fillPath(); }
  }
  for (const k of [0.3, 0.62, 0.96]) { g.lineStyle(k > 0.9 ? 3 : 1.5, GOLD, 0.7); g.strokeEllipse(cx, cy, r * 2 * k, r * 1.6 * k); }
  // Words let into the outer ring in gold: the Despot's motto.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.fillStyle(GOLD_DARK, 0.6); g.fillRect(cx + Math.cos(a) * r * 0.79 - 2, cy + Math.sin(a) * r * 0.63 - 1.5, i % 5 === 4 ? 1 : 4, 3);
  }
}

// ── The terrace edge ─────────────────────────────────────────────────

/** A white marble balustrade along a terrace edge, seen from above-front: rail, balusters, plinth. */
export function balustrade(g: G, x0: number, x1: number, y: number): void {
  noonShadow(g, (x0 + x1) / 2, y + 2, x1 - x0, 0.2);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0, y - 6, x1 - x0, 6);
  for (let x = x0 + 6; x < x1 - 4; x += 12) {
    g.fillStyle(MARBLE_SHADE, 1); g.fillEllipse(x, y - 14, 7, 14);
    g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(x - 1, y - 15, 4, 10);
  }
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, y - 28, x1 - x0, 7);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0, y - 30, x1 - x0, 4);
  for (let x = x0; x <= x1; x += 120) {
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 6, y - 34, 12, 34);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 5, y - 36, 10, 4);
    g.fillStyle(GOLD, 1); g.fillCircle(x, y - 40, 3);
  }
}

/** Gilded iron railings: black bars, gilt spear tips, a gilt sun on every eighth bar. */
export function gildedRailing(g: G, x0: number, x1: number, y: number, h = 58): void {
  g.fillStyle(NOON_SHADOW, 0.25); g.fillRect(x0, y, x1 - x0, 4);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0, y - 8, x1 - x0, 8);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0, y - 9, x1 - x0, 3);
  let n = 0;
  for (let x = x0 + 5; x < x1; x += 10, n++) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - 1.5, y - h, 3, h - 8);
    g.fillStyle(GOLD, 1); g.fillTriangle(x - 3, y - h, x + 3, y - h, x, y - h - 8);
    g.fillStyle(GOLD_LIT, 0.8); g.fillRect(x - 0.5, y - h - 5, 1, 4);
    if (n % 8 === 4) { sunburst(g, x, y - h * 0.55, 7, GOLD, 1); }
  }
  for (const yy of [y - h + 8, y - 18]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x0, yy, x1 - x0, 3);
    g.fillStyle(GOLD_DARK, 0.7); g.fillRect(x0, yy, x1 - x0, 1);
  }
}

// ── The Heliostat ────────────────────────────────────────────────────

/**
 * One of the Heliostat's iron legs: a riveted lattice girder from its foot (x, y) up toward the
 * crown far above (tx, ty — usually off the top of the world). Two rails, X-bracing between,
 * a shoe of plate at the foot bolted to a marble footing, rust where the spray reaches.
 */
export function heliostatLeg(g: G, x: number, y: number, tx: number, ty: number, w = 46): void {
  const ang = Math.atan2(ty - y, tx - x);
  const nx = -Math.sin(ang) * w / 2, ny = Math.cos(ang) * w / 2;
  const len = Math.hypot(tx - x, ty - y);
  const ux = Math.cos(ang), uy = Math.sin(ang);
  // The footing and its tiny shadow.
  noonShadow(g, x, y + 4, w * 2.6, 0.4);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - w * 1.1, y - 16, w * 2.2, 18);
  g.fillStyle(MARBLE, 1); g.fillRect(x - w * 1.1, y - 20, w * 2.2, 8);
  // Back face of the girder (a darker strip offset), then the bracing, then the rails.
  g.fillStyle(IRON_DARK, 0.9);
  g.fillPoints([P(x - nx * 0.7 + 6, y - ny * 0.7), P(x + nx * 0.7 + 6, y + ny * 0.7), P(tx + nx * 0.7 + 6, ty + ny * 0.7), P(tx - nx * 0.7 + 6, ty - ny * 0.7)], true);
  const step = w * 1.1;
  for (let d = 10; d < len; d += step) {
    const ax = x + ux * d, ay = y + uy * d, bx = x + ux * (d + step), by = y + uy * (d + step);
    g.lineStyle(4, IRON, 1);
    g.lineBetween(ax - nx, ay - ny, bx + nx, by + ny);
    g.lineBetween(ax + nx, ay + ny, bx - nx, by - ny);
    g.lineStyle(5, IRON_DARK, 1); g.lineBetween(ax - nx, ay - ny, ax + nx, ay + ny);
    g.fillStyle(RIVET, 1); g.fillCircle(ax - nx, ay - ny, 2); g.fillCircle(ax + nx, ay + ny, 2);
  }
  for (const k of [-1, 1]) {
    g.lineStyle(9, IRON_DARK, 1); g.lineBetween(x + nx * k, y + ny * k, tx + nx * k, ty + ny * k);
    g.lineStyle(6, IRON, 1); g.lineBetween(x + nx * k, y + ny * k, tx + nx * k, ty + ny * k);
    g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(x + nx * k - 2, y + ny * k, tx + nx * k - 2, ty + ny * k);
  }
  // Rust bloom on the lower rail.
  for (let i = 0; i < 6; i++) { g.fillStyle(RUST, 0.35); g.fillCircle(x + ux * (14 + i * 9) + nx * (i % 2 ? 1 : -1), y + uy * (14 + i * 9) + ny * (i % 2 ? 1 : -1), 3 + (i % 3)); }
  // The shoe: a bolted plate.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - w * 0.8, y - 34, w * 1.6, 16);
  g.fillStyle(IRON, 1); g.fillRect(x - w * 0.8, y - 34, w * 1.6, 4);
  for (let k = -2; k <= 2; k++) { g.fillStyle(RIVET, 1); g.fillCircle(x + k * w * 0.34, y - 26, 2.4); }
}

/** A riveted cross-girder slung between two legs high up. */
export function crossGirder(g: G, a: Pt, b: Pt, h = 16): void {
  g.lineStyle(h, IRON_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(h - 6, IRON, 1); g.lineBetween(a.x, a.y - 1, b.x, b.y - 1);
  const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 40));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x - 6, y - h / 2 + 2, x + 6, y + h / 2 - 2);
    g.fillStyle(RIVET, 1); g.fillCircle(x, y - h / 2 + 3, 1.6); g.fillCircle(x, y + h / 2 - 3, 1.6);
  }
}

/**
 * A sail-sized mirror on the Heliostat, hung on a gimbal off a girder: a silvered pane in an
 * iron frame, tilted by `tilt` (0 = face-on). The sky shows in it as a hot white streak.
 */
export function heliostatMirror(g: G, x: number, y: number, w: number, h: number, tilt: number, flash = 0): void {
  const sw = w * Math.max(0.15, Math.abs(Math.cos(tilt)));
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x, y - h / 2 - 14, x, y - h / 2);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - sw / 2 - 4, y - h / 2 - 4, sw + 8, h + 8);
  g.fillStyle(mixC(MIRROR_DARK, MIRROR, 0.5 + Math.sin(tilt) * 0.4), 1); g.fillRect(x - sw / 2, y - h / 2, sw, h);
  g.fillStyle(MIRROR_LIT, 0.5 + flash * 0.5);
  g.fillTriangle(x - sw / 2, y + h / 2, x - sw / 2 + sw * 0.4, y - h / 2, x - sw / 2 + sw * 0.62, y - h / 2);
  g.lineStyle(1, IRON, 1); g.lineBetween(x, y - h / 2, x, y + h / 2); g.lineBetween(x - sw / 2, y, x + sw / 2, y);
  g.fillStyle(BRONZE, 1); g.fillCircle(x - sw / 2 - 4, y, 3); g.fillCircle(x + sw / 2 + 4, y, 3);
  if (flash > 0.05) glow(g, x, y, Math.max(w, h) * (0.6 + flash), SUN, 0.08 * flash, 3);
}

/**
 * The lift-house at the Heliostat's foot: a cage of riveted iron round a lift car, a great gear
 * and its chain on the side, a riveted door with a brass lock of six keyholes — one for each
 * Radiance — and a gilt sign over it.
 */
export function heliostatLift(g: G, x: number, y: number, open: boolean): void {
  noonShadow(g, x, y + 4, 230, 0.4);
  // Plinth.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - 118, y - 14, 236, 16);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 118, y - 18, 236, 6);
  // The cage.
  const top = y - 190;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 96, top, 192, y - 14 - top);
  g.fillStyle(dim(IRON, 0.1), 1); g.fillRect(x - 90, top + 6, 180, y - 20 - top);
  for (let bx = x - 90; bx <= x + 90; bx += 18) { g.lineStyle(3, IRON, 1); g.lineBetween(bx, top + 4, bx, y - 16); }
  for (let by = top + 24; by < y - 20; by += 40) {
    g.lineStyle(4, IRON, 1); g.lineBetween(x - 92, by, x + 92, by);
    for (let bx = x - 90; bx <= x + 90; bx += 18) { g.fillStyle(RIVET, 1); g.fillCircle(bx, by, 1.6); }
  }
  // The chain going up out of the world.
  for (let cy = top - 6; cy > top - 320; cy -= 12) {
    g.lineStyle(3, IRON_LIT, 1); g.strokeEllipse(x + 60, cy, 7, 12);
    g.lineStyle(3, IRON_LIT, 1); g.strokeEllipse(x - 60, cy - 6, 7, 12);
  }
  // The roof: a riveted cap with the gilt sign.
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(x - 110, top + 2, x + 110, top + 2, x, top - 46);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 100, top, x + 100, top, x, top - 40);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 74, top + 10, 148, 20);
  g.fillStyle(GOLD, 1); g.fillRect(x - 72, top + 12, 144, 16);
  for (let i = 0; i < 14; i++) { g.fillStyle(INK, 0.8); g.fillRect(x - 60 + i * 9, top + 17, i % 4 === 3 ? 2 : 6, 6); }
  sunburst(g, x, top - 16, 12, GOLD, 1);
  // A great gear on the right flank.
  const gx = x + 108, gy = y - 120;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(IRON_DARK, 1); g.fillCircle(gx + Math.cos(a) * 30, gy + Math.sin(a) * 30, 6); }
  g.fillStyle(IRON, 1); g.fillCircle(gx, gy, 28);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(gx, gy, 18);
  g.fillStyle(BRONZE, 1); g.fillCircle(gx, gy, 6);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; g.lineStyle(4, IRON, 1); g.lineBetween(gx, gy, gx + Math.cos(a) * 18, gy + Math.sin(a) * 18); }
  // The door.
  const dw = 70, dh = 110;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - dw / 2 - 6, y - 16 - dh - 6, dw + 12, dh + 6);
  if (open) {
    g.fillStyle(SUN, 1); g.fillRect(x - dw / 2, y - 16 - dh, dw, dh);
    glow(g, x, y - 16 - dh / 2, 60, SUN_HOT, 0.08, 4);
    g.fillStyle(IRON, 1); g.fillRect(x - dw / 2 - 18, y - 16 - dh, 14, dh); g.fillRect(x + dw / 2 + 4, y - 16 - dh, 14, dh);
  } else {
    g.fillStyle(IRON, 1); g.fillRect(x - dw / 2, y - 16 - dh, dw, dh);
    g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y - 16 - dh, x, y - 16);
    for (let by = y - 16 - dh + 12; by < y - 16; by += 20) for (const k of [-1, 1]) { g.fillStyle(RIVET, 1); g.fillCircle(x + k * 28, by, 1.8); }
    // The brass lock with six keyholes.
    g.fillStyle(BRONZE_DARK, 1); g.fillCircle(x, y - 16 - dh * 0.5, 17);
    g.fillStyle(BRONZE, 1); g.fillCircle(x, y - 16 - dh * 0.5, 15);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const kx = x + Math.cos(a) * 9, ky = y - 16 - dh * 0.5 + Math.sin(a) * 9;
      g.fillStyle(INK, 1); g.fillCircle(kx, ky - 1, 1.6); g.fillRect(kx - 0.6, ky - 1, 1.2, 3);
    }
    // Chains across.
    g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x - dw / 2, y - 16 - dh * 0.3, x + dw / 2, y - 16 - dh * 0.7);
    g.lineBetween(x - dw / 2, y - 16 - dh * 0.7, x + dw / 2, y - 16 - dh * 0.3);
  }
}

// ── The Courthouse of Clarity ────────────────────────────────────────

/** A tiny person in the courtroom (seen through glass): robe colour, head, optional wig. */
function figure(g: G, x: number, y: number, robe: number, s = 1, wig = false): void {
  g.fillStyle(dim(robe, 0.2), 1); g.fillRoundedRect(x - 5 * s, y - 12 * s, 10 * s, 12 * s, 3 * s);
  g.fillStyle(robe, 1); g.fillRoundedRect(x - 4 * s, y - 12 * s, 8 * s, 10 * s, 3 * s);
  g.fillStyle(0xe8c8a8, 1); g.fillCircle(x, y - 15 * s, 3.2 * s);
  if (wig) { g.fillStyle(WIG, 1); g.fillCircle(x, y - 17 * s, 3.4 * s); g.fillEllipse(x - 3.5 * s, y - 13 * s, 3 * s, 6 * s); g.fillEllipse(x + 3.5 * s, y - 13 * s, 3 * s, 6 * s); }
}

/**
 * The glass Courthouse of Clarity. A marble podium and steps; walls of leaded glass between gilt
 * piers, so clear the whole trial shows through — the high bench, the dock in its cage, twelve
 * jurors in two rows, the public gallery; a glass pediment carrying the gilt scales; and over all
 * a ribbed glass dome with a sunburst finial. The `x, y` is the middle of the bottom step.
 */
export function courthouse(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  noonShadow(g, x, y + 4, w * 1.05, 0.3);
  const x0 = x - w / 2;
  // Steps.
  for (let k = 0; k < 4; k++) {
    const sw = w * 0.5 - k * 14;
    g.fillStyle(k % 2 ? MARBLE : MARBLE_LIT, 1); g.fillRect(x - sw / 2, y - 8 - k * 8, sw, 8);
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - sw / 2, y - 1 - k * 8, sw, 1.5);
  }
  // Podium.
  const py = y - 32;
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 10, py - 24, w + 20, 26);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 10, py - 28, w + 20, 10);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 10, py - 28, w + 20, 3);
  const floorY = py - 28;
  const wallTop = floorY - h;
  // Inside, seen through the glass: a pale floor, the bench, the dock, the jury, the gallery.
  g.fillStyle(lit(MARBLE_SHADE, 0.2), 1); g.fillRect(x0, wallTop, w, h);
  g.fillStyle(mixC(MARBLE, GOLD, 0.15), 1); g.fillRect(x0, floorY - h * 0.35, w, h * 0.35);
  // The high bench at the back, centre.
  const bx = x, by = floorY - h * 0.42;
  g.fillStyle(ROBE_DARK, 1); g.fillRect(bx - 60, by - 20, 120, 22);
  g.fillStyle(ROBE, 1); g.fillRect(bx - 58, by - 22, 116, 6);
  g.fillStyle(GOLD, 1); g.fillRect(bx - 58, by - 16, 116, 2);
  figure(g, bx, by - 20, ROBE_DARK, 1.3, true);
  scalesEmblem(g, bx, by - 54, 12, GOLD, 0.9);
  // The jury in two rows of six (left).
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 6; i++) figure(g, x0 + 40 + i * 18 + r * 8, floorY - 18 - r * 16, [0x7a5a3a, 0x3a4a6a, 0x6a3a3a, 0x4a5a3a][(i + r) % 4], 0.85);
    g.fillStyle(BRONZE_DARK, 1); g.fillRect(x0 + 30 + r * 8, floorY - 18 - r * 16, 112, 5);
  }
  // The dock: a little mirror cage (right), the accused inside.
  const dx = x0 + w - 110, dy = floorY - 16;
  figure(g, dx, dy, 0xd8d0c4, 1);
  g.lineStyle(1.2, MIRROR_DARK, 0.9);
  for (let k = -3; k <= 3; k++) g.lineBetween(dx + k * 5, dy - 30, dx + k * 5, dy + 2);
  g.lineStyle(2, GOLD_DARK, 1); g.strokeEllipse(dx, dy - 30, 36, 8); g.strokeEllipse(dx, dy + 2, 36, 8);
  // The public gallery rail at the front, heads in a row.
  for (let i = 0; i < Math.floor(w / 26); i++) {
    const hx = x0 + 14 + i * 26 + rng() * 6;
    g.fillStyle([0x8a6a4a, 0x5a3a2a, 0xc8a87a, 0x3a2a20][i % 4], 1); g.fillCircle(hx, floorY - 3, 4);
  }
  g.fillStyle(BRONZE, 1); g.fillRect(x0, floorY - 2, w, 3);
  // Glass over all of it.
  g.fillStyle(GLASS, 0.28); g.fillRect(x0, wallTop, w, h);
  // Piers and leaded lights.
  const bays = Math.round(w / 64);
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const lx = x0 + i * bw;
    g.lineStyle(1, LEAD, 0.6);
    for (let k = 1; k < 4; k++) g.lineBetween(lx + (bw * k) / 4, wallTop, lx + (bw * k) / 4, floorY);
    for (let yy = wallTop + 18; yy < floorY; yy += 22) g.lineBetween(lx, yy, lx + bw, yy);
    g.fillStyle(GLASS_LIT, 0.4); g.fillRect(lx + 8, wallTop + 10, 3, h * 0.6);
    g.fillStyle(GLASS_LIT, 0.22); g.fillTriangle(lx + 14, floorY, lx + bw * 0.5, wallTop, lx + bw * 0.62, wallTop);
  }
  for (let i = 0; i <= bays; i++) {
    const lx = x0 + i * bw;
    g.fillStyle(GOLD_DARK, 1); g.fillRect(lx - 5, wallTop - 4, 10, h + 4);
    g.fillStyle(GOLD, 1); g.fillRect(lx - 4, wallTop - 4, 6, h + 4);
    g.fillStyle(GOLD_LIT, 0.8); g.fillRect(lx - 3, wallTop - 4, 1.5, h + 4);
  }
  // Entablature.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 14, wallTop - 20, w + 28, 18);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 14, wallTop - 24, w + 28, 8);
  for (let fx = x0; fx < x0 + w; fx += 22) { g.fillStyle(GOLD, 0.8); g.fillRect(fx, wallTop - 13, 10, 3); }
  // Glass pediment with gilt scales.
  const pw = w * 0.46;
  g.fillStyle(MARBLE_LIT, 1); g.fillTriangle(x - pw / 2 - 10, wallTop - 22, x + pw / 2 + 10, wallTop - 22, x, wallTop - 86);
  g.fillStyle(GLASS, 0.5); g.fillTriangle(x - pw / 2, wallTop - 26, x + pw / 2, wallTop - 26, x, wallTop - 78);
  g.lineStyle(2, GOLD, 1); g.strokeTriangle(x - pw / 2, wallTop - 26, x + pw / 2, wallTop - 26, x, wallTop - 78);
  scalesEmblem(g, x, wallTop - 44, 14, GOLD, 1);
  // The dome: ribs of gilt over clear glass, a sunburst finial.
  const dr = w * 0.15, dyy = wallTop - 86;
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - dr - 8, dyy - 8, dr * 2 + 16, 12);
  g.fillStyle(GLASS, 0.42); g.slice(x, dyy - 6, dr, Math.PI, 0, false); g.fillPath();
  g.lineStyle(2.5, GOLD, 1); g.beginPath(); g.arc(x, dyy - 6, dr, Math.PI, 0, false); g.strokePath();
  for (let k = 1; k < 8; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    g.lineStyle(1.5, GOLD, 0.9); g.lineBetween(x + Math.cos(a) * dr, dyy - 6 + Math.sin(a) * dr, x, dyy - 6 - dr);
  }
  g.fillStyle(GLASS_LIT, 0.5); g.fillEllipse(x - dr * 0.4, dyy - 6 - dr * 0.5, dr * 0.3, dr * 0.5);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 2, dyy - 6 - dr - 16, 4, 16);
  sunburst(g, x, dyy - 6 - dr - 22, 12, GOLD, 1);
  // Doors: tall glass doors (glass — nothing may be closed) with gilt handles.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 32, floorY - h * 0.7, 64, h * 0.7);
  g.fillStyle(GLASS, 0.55); g.fillRect(x - 28, floorY - h * 0.7 + 4, 27, h * 0.7 - 4); g.fillRect(x + 1, floorY - h * 0.7 + 4, 27, h * 0.7 - 4);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 5, floorY - h * 0.35, 2.5); g.fillCircle(x + 5, floorY - h * 0.35, 2.5);
}

// ── The Palace of Noon ───────────────────────────────────────────────

/**
 * The Despot's Palace of Noon: a long white colonnaded front on a high podium, every window a
 * mirror (no one sees in; the light is thrown back out), a gilded drum and dome, four gilded
 * sun-finials, and a balcony over the door where nobody ever stands — he is up in the Heliostat.
 */
export function palaceOfNoon(g: G, x: number, y: number, w: number, h: number): void {
  noonShadow(g, x, y + 6, w * 1.05, 0.3);
  const x0 = x - w / 2;
  // Podium with a run of steps.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 16, y - 40, w + 32, 40);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 16, y - 46, w + 32, 10);
  for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? MARBLE : MARBLE_LIT, 1); g.fillRect(x - 90 + k * 6, y - 8 - k * 8, 180 - k * 12, 8); }
  const base = y - 46;
  const top = base - h;
  // The wall behind the colonnade.
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, top, w, h);
  // Mirror windows in two storeys.
  for (let row = 0; row < 2; row++) {
    for (let wx = x0 + 34; wx < x0 + w - 30; wx += 56) {
      const wy = top + 26 + row * (h * 0.46);
      const wh = h * 0.32;
      g.fillStyle(MIRROR_DARK, 1); g.fillRect(wx - 2, wy - 2, 28, wh + 4);
      g.fillStyle(MIRROR, 1); g.fillRect(wx, wy, 24, wh);
      g.fillStyle(MIRROR_LIT, 0.8); g.fillTriangle(wx, wy + wh, wx + 10, wy, wx + 16, wy);
      g.fillStyle(GOLD, 1); g.fillRect(wx - 4, wy - 6, 32, 4);
      g.slice(wx + 12, wy - 6, 14, Math.PI, 0, false); g.fillPath();
    }
  }
  // The colonnade.
  for (let cx = x0 + 10; cx <= x0 + w - 10; cx += 46) {
    g.fillStyle(MARBLE_DEEP, 1); g.fillRect(cx - 9, top + 8, 18, h - 8);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - 8, top + 8, 13, h - 8);
    for (let f = -5; f <= 3; f += 4) { g.lineStyle(1, MARBLE_SHADE, 0.8); g.lineBetween(cx + f, top + 12, cx + f, base - 6); }
    g.fillStyle(GOLD, 1); g.fillRect(cx - 11, top + 4, 22, 6); g.fillRect(cx - 11, base - 6, 22, 6);
  }
  // Entablature and parapet, with gilt suns along it.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 12, top - 22, w + 24, 22);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 12, top - 26, w + 24, 8);
  g.fillStyle(GOLD, 1); g.fillRect(x0 - 12, top - 12, w + 24, 3);
  for (let bx = x0; bx < x0 + w; bx += 10) { g.fillStyle(MARBLE_LIT, 1); g.fillRect(bx, top - 40, 4, 14); }
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 12, top - 44, w + 24, 5);
  for (const fx of [x0 + 10, x0 + w * 0.3, x0 + w * 0.7, x0 + w - 10]) {
    g.fillStyle(GOLD_DARK, 1); g.fillRect(fx - 3, top - 68, 6, 24);
    sunburst(g, fx, top - 74, 13, GOLD, 1);
  }
  // The balcony over the door.
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 60, top + h * 0.42, 120, 8);
  for (let bx = x - 56; bx < x + 58; bx += 8) { g.fillStyle(GOLD, 1); g.fillRect(bx, top + h * 0.42 - 14, 2, 14); }
  g.fillStyle(GOLD, 1); g.fillRect(x - 60, top + h * 0.42 - 16, 120, 3);
  // The door: a tall glass door, sun-gold frame.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 30, base - h * 0.44, 60, h * 0.44);
  g.fillStyle(GLASS, 0.75); g.fillRect(x - 26, base - h * 0.44 + 4, 52, h * 0.44 - 4);
  g.fillStyle(GLASS_LIT, 0.6); g.fillRect(x - 20, base - h * 0.44 + 8, 4, h * 0.38);
  // Drum and dome.
  const dr = Math.min(130, w * 0.16);
  const dy = top - 44;
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - dr, dy - 50, dr * 2, 50);
  for (let k = -3; k <= 3; k++) { g.fillStyle(MIRROR, 1); g.fillRect(x + k * dr * 0.27 - 6, dy - 42, 12, 32); g.fillStyle(MIRROR_LIT, 0.7); g.fillRect(x + k * dr * 0.27 - 5, dy - 40, 3, 26); }
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - dr - 6, dy - 56, dr * 2 + 12, 8);
  g.fillStyle(GOLD_DARK, 1); g.slice(x, dy - 56, dr, Math.PI, 0, false); g.fillPath();
  g.fillStyle(GOLD, 1); g.slice(x - 3, dy - 58, dr - 4, Math.PI, 0, false); g.fillPath();
  for (let k = 1; k < 10; k++) {
    const a = Math.PI + (k / 10) * Math.PI;
    g.lineStyle(1.5, GOLD_DARK, 0.8); g.lineBetween(x + Math.cos(a) * dr * 0.98, dy - 56 + Math.sin(a) * dr * 0.98, x, dy - 56 - dr);
  }
  g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(x - dr * 0.35, dy - 56 - dr * 0.55, dr * 0.35, dr * 0.5);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 3, dy - 56 - dr - 26, 6, 26);
  sunburst(g, x, dy - 56 - dr - 36, 22, GOLD, 1);
}

// ── Mirror cages, the scale, the jury gallery ────────────────────────

/**
 * A mirror cage on its plinth: a cylinder of narrow mirror panels between gilt bands, a domed
 * gilt cap and a ring to hang it by. The accused sits inside on a stool in the full sun, knees
 * up, shown from every side at once. `seated` paints someone inside.
 */
export function mirrorCage(g: G, x: number, y: number, r: number, seated: number | null, backAlpha = 0.85): void {
  noonShadow(g, x, y + 2, r * 2.4, 0.38);
  g.fillStyle(MARBLE_DEEP, 1); g.fillEllipse(x, y, r * 2.3, r * 0.7);
  g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(x, y - 3, r * 2.2, r * 0.62);
  const h = r * 2.6;
  // Back panels (behind the occupant).
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const px = x + Math.cos(a) * r;
    g.fillStyle(i % 2 ? MIRROR : MIRROR_DARK, backAlpha); g.fillRect(px - 2.5, y - 4 - h, 5, h);
  }
  if (seated !== null) {
    g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 5, y - 14, 10, 10);
    g.fillStyle(dim(seated, 0.2), 1); g.fillRoundedRect(x - 9, y - 32, 18, 20, 5);
    g.fillStyle(seated, 1); g.fillRoundedRect(x - 8, y - 32, 16, 16, 5);
    g.fillStyle(dim(seated, 0.3), 1); g.fillEllipse(x - 5, y - 14, 8, 10); g.fillEllipse(x + 5, y - 14, 8, 10);
    g.fillStyle(0xe8c8a8, 1); g.fillCircle(x, y - 38, 6.5);
    g.fillStyle(0xd84a3a, 0.4); g.fillCircle(x, y - 37, 5);
    // Squinting: two short lines for eyes.
    g.lineStyle(1.2, INK, 1); g.lineBetween(x - 4, y - 39, x - 1, y - 39); g.lineBetween(x + 1, y - 39, x + 4, y - 39);
    // A hand up against the glare.
    g.fillStyle(0xe8c8a8, 1); g.fillEllipse(x + 4, y - 45, 7, 4);
  }
  // Front panels: thinner, catching the sun.
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    const px = x + Math.cos(a) * r;
    g.fillStyle(i % 2 ? MIRROR_LIT : MIRROR, 0.55); g.fillRect(px - 1.5, y - 4 - h, 3, h);
  }
  // Bands, cap and ring.
  for (const by of [y - 4, y - 4 - h * 0.5, y - 4 - h]) { g.lineStyle(3, GOLD_DARK, 1); g.strokeEllipse(x, by, r * 2, r * 0.6); g.lineStyle(1.5, GOLD, 1); g.strokeEllipse(x, by - 1, r * 2, r * 0.6); }
  g.fillStyle(GOLD_DARK, 1); g.slice(x, y - 4 - h, r, Math.PI, 0, false); g.fillPath();
  g.fillStyle(GOLD, 1); g.slice(x - 1, y - 5 - h, r - 2, Math.PI, 0, false); g.fillPath();
  g.fillStyle(GOLD_LIT, 0.7); g.fillEllipse(x - r * 0.35, y - 4 - h - r * 0.5, r * 0.3, r * 0.4);
  g.lineStyle(3, GOLD_DARK, 1); g.strokeCircle(x, y - 4 - h - r - 6, 6);
  // A slate on the plinth: the charge, chalked.
  g.fillStyle(INK, 0.9); g.fillRect(x + r * 0.5, y - 8, 22, 12);
  g.lineStyle(1, CHALK, 0.8); g.lineBetween(x + r * 0.5 + 3, y - 4, x + r * 0.5 + 18, y - 4); g.lineBetween(x + r * 0.5 + 3, y, x + r * 0.5 + 12, y);
}

/**
 * The great bronze scale on its stepped dais: a fluted post taller than a house, a beam ending
 * in two gilt pans on chains. In the left pan a gilt sun; the right pan is empty — and still the
 * right side hangs low, because the court says darkness weighs more than anything.
 */
export function bronzeScale(g: G, x: number, y: number, s = 1, tilt = 0.12): void {
  noonShadow(g, x, y + 4, 200 * s, 0.35);
  for (let k = 0; k < 3; k++) {
    const sw = (190 - k * 40) * s;
    g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - sw / 2, y - (k + 1) * 12 * s, sw, 12 * s);
    g.fillStyle(k % 2 ? MARBLE : MARBLE_LIT, 1); g.fillRect(x - sw / 2, y - (k + 1) * 12 * s - 2, sw, 5 * s);
  }
  const base = y - 36 * s;
  const H = 210 * s;
  // The post.
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 9 * s, base - H, 18 * s, H);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 7 * s, base - H, 11 * s, H);
  g.fillStyle(BRONZE_LIT, 0.8); g.fillRect(x - 5 * s, base - H, 2.5 * s, H);
  for (let f = 0; f < 6; f++) { g.lineStyle(1, BRONZE_DARK, 0.6); g.lineBetween(x - 6 * s + f * 2.5 * s, base - H + 20 * s, x - 6 * s + f * 2.5 * s, base - 10 * s); }
  g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(x, base, 40 * s, 12 * s);
  // The beam.
  const top = base - H;
  const L = 110 * s;
  const ex = Math.cos(tilt) * L, ey = Math.sin(tilt) * L;
  g.lineStyle(10 * s, BRONZE_DARK, 1); g.lineBetween(x - ex, top + 6 * s - ey, x + ex, top + 6 * s + ey);
  g.lineStyle(6 * s, BRONZE, 1); g.lineBetween(x - ex, top + 5 * s - ey, x + ex, top + 5 * s + ey);
  g.fillStyle(GOLD, 1); g.fillCircle(x, top + 5 * s, 9 * s);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 2 * s, top + 3 * s, 3 * s);
  sunburst(g, x, top - 20 * s, 16 * s, GOLD, 1);
  // Chains and pans.
  for (const k of [-1, 1]) {
    const px = x + k * ex, py = top + 6 * s + k * ey;
    const panY = py + 90 * s;
    for (const d of [-22, 0, 22]) { g.lineStyle(1.5, BRONZE_DARK, 1); g.lineBetween(px, py, px + d * s, panY); }
    g.fillStyle(GOLD_DARK, 1); g.slice(px, panY, 28 * s, 0, Math.PI, false); g.fillPath();
    g.fillStyle(GOLD, 1); g.fillEllipse(px, panY, 56 * s, 12 * s);
    g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(px - 8 * s, panY - 1, 18 * s, 4 * s);
    if (k < 0) sunburst(g, px, panY - 10 * s, 10 * s, SUN_HOT, 1);
  }
}

/**
 * The public gallery: tiers of white benches rising away from the walk, numbered in gilt, with
 * no awning — the public must watch, and must watch in the sun. A brass plaque on the front.
 */
export function juryGallery(g: G, x: number, y: number, w: number, rows: number, rng: () => number): void {
  noonShadow(g, x, y + 2, w * 1.02, 0.25);
  for (let r = rows - 1; r >= 0; r--) {
    const ry = y - r * 22;
    const rw = w - r * 10;
    g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - rw / 2, ry - 14, rw, 14);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - rw / 2, ry - 22, rw, 9);
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - rw / 2, ry - 13, rw, 2);
    for (let i = 0; i < rw / 60; i++) {
      g.fillStyle(GOLD, 0.8); g.fillRect(x - rw / 2 + 20 + i * 60, ry - 10, 6, 5);
      // A few hats and a folded paper fan left on the bench.
      if (rng() < 0.25) { g.fillStyle([0xf2e6c4, 0xd8c098, 0xffffff][i % 3], 1); g.fillEllipse(x - rw / 2 + 40 + i * 60, ry - 22, 14, 5); }
    }
  }
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 40, y - 12, 80, 12);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 38, y - 11, 76, 9);
  for (let i = 0; i < 9; i++) { g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 32 + i * 7.5, y - 8, i % 3 === 2 ? 2 : 5, 3); }
}

// ── Water ────────────────────────────────────────────────────────────

/**
 * The Fountain of Testimony's basin, flat in the ground: a long marble trough with a broad
 * gilt-edged rim, water so bright it is nearly white, coins thrown in for luck at trials.
 */
export function fountainBasin(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(MARBLE_DEEP, 1); g.fillRoundedRect(r.x - 20, r.y - 20, r.w + 40, r.h + 40, 26);
  g.fillStyle(MARBLE_LIT, 1); g.fillRoundedRect(r.x - 16, r.y - 18, r.w + 32, r.h + 34, 24);
  g.lineStyle(2, GOLD, 0.8); g.strokeRoundedRect(r.x - 10, r.y - 12, r.w + 20, r.h + 22, 20);
  g.fillStyle(WATER_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
  g.fillStyle(WATER, 1); g.fillRoundedRect(r.x + 6, r.y + 4, r.w - 12, r.h - 12, 14);
  for (let i = 0; i < 26; i++) {
    g.fillStyle(rng() < 0.5 ? GOLD : BRONZE, 0.7);
    g.fillCircle(r.x + 20 + rng() * (r.w - 40), r.y + 20 + rng() * (r.h - 40), 2);
  }
  for (let i = 0; i < 10; i++) { g.fillStyle(WATER_LIT, 0.35); g.fillEllipse(r.x + 30 + rng() * (r.w - 60), r.y + 20 + rng() * (r.h - 40), 30 + rng() * 40, 4); }
}

/**
 * The statue in the fountain: Clarity, a robed woman on a column, her eyes painted wide open,
 * holding a gilt lens up to the sun; water runs out of the lens's rim down into the basin.
 */
export function clarityStatue(g: G, x: number, y: number): void {
  noonShadow(g, x, y + 2, 70, 0.3);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - 22, y - 50, 44, 50);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 20, y - 50, 32, 50);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 26, y - 56, 52, 8);
  g.fillStyle(GOLD, 1); g.fillRect(x - 26, y - 50, 52, 2);
  // Robe.
  g.fillStyle(MARBLE_SHADE, 1); g.fillTriangle(x - 18, y - 56, x + 18, y - 56, x, y - 120);
  g.fillStyle(MARBLE_LIT, 1); g.fillTriangle(x - 14, y - 56, x + 10, y - 56, x - 2, y - 118);
  for (let k = -2; k <= 2; k++) { g.lineStyle(1, MARBLE_SHADE, 0.8); g.lineBetween(x + k * 5, y - 58, x + k * 1.6, y - 110); }
  // Head and wide eyes.
  g.fillStyle(MARBLE_LIT, 1); g.fillCircle(x, y - 126, 9);
  g.fillStyle(0xffffff, 1); g.fillCircle(x - 3.5, y - 127, 2.4); g.fillCircle(x + 3.5, y - 127, 2.4);
  g.fillStyle(0x3a6aa0, 1); g.fillCircle(x - 3.5, y - 127, 1.2); g.fillCircle(x + 3.5, y - 127, 1.2);
  // Arm raised and the lens.
  g.lineStyle(5, MARBLE_SHADE, 1); g.lineBetween(x + 6, y - 112, x + 18, y - 150);
  g.lineStyle(3, MARBLE_LIT, 1); g.lineBetween(x + 6, y - 112, x + 18, y - 150);
  g.lineStyle(4, GOLD_DARK, 1); g.strokeCircle(x + 20, y - 162, 14);
  g.lineStyle(2, GOLD, 1); g.strokeCircle(x + 20, y - 162, 14);
  g.fillStyle(GLASS, 0.6); g.fillCircle(x + 20, y - 162, 12);
  g.fillStyle(GLASS_LIT, 0.9); g.fillEllipse(x + 15, y - 167, 4, 7);
}

// ── Small furniture ──────────────────────────────────────────────────

/**
 * A law-stone: a squat white marble bollard, a bronze band round its waist, a gilt cap, and the
 * scales cut into its face and filled with light. `glowA` 0–1 brightens the cut.
 */
export function lawStone(g: G, x: number, y: number, s = 1, glowA = 0.4, color = GOLD): void {
  noonShadow(g, x, y + 1, 30 * s, 0.4);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRoundedRect(x - 11 * s, y - 34 * s, 22 * s, 34 * s, 6 * s);
  g.fillStyle(MARBLE_LIT, 1); g.fillRoundedRect(x - 10 * s, y - 34 * s, 16 * s, 32 * s, 6 * s);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 11 * s, y - 16 * s, 22 * s, 5 * s);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 11 * s, y - 16 * s, 22 * s, 2 * s);
  g.fillStyle(GOLD, 1); g.fillEllipse(x, y - 34 * s, 22 * s, 8 * s);
  g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(x - 3 * s, y - 35 * s, 8 * s, 3 * s);
  if (glowA > 0.05) glow(g, x, y - 25 * s, 14 * s, color, 0.05 * glowA * 2, 2);
  scalesEmblem(g, x, y - 25 * s, 5 * s, lit(color, 0.3), 0.5 + glowA * 0.5);
}

/**
 * The Docket: a gilt-framed board on two posts, the day's sentences pinned in rows — each a white
 * card with a red seal — and a brass sun clipped to the top. Nothing on it is written small.
 */
export function docketBoard(g: G, x: number, y: number): void {
  noonShadow(g, x, y + 1, 90, 0.3);
  for (const k of [-1, 1]) { g.fillStyle(BRONZE_DARK, 1); g.fillRect(x + k * 36 - 3, y - 96, 6, 96); }
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 46, y - 104, 92, 66);
  g.fillStyle(ROBE_DARK, 1); g.fillRect(x - 42, y - 100, 84, 58);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const cx = x - 36 + c * 20, cy = y - 94 + r * 18;
      g.fillStyle(PARCH, 1); g.fillRect(cx, cy, 15, 13);
      g.fillStyle(INK, 0.7); g.fillRect(cx + 2, cy + 3, 11, 1); g.fillRect(cx + 2, cy + 6, 8, 1);
      g.fillStyle(WAX, 1); g.fillCircle(cx + 11, cy + 10, 2.4);
    }
  }
  sunburst(g, x, y - 108, 8, GOLD, 1);
}

/** The tribunal waystone: a white obelisk with a gilt scales and a sunburst cap, warm to the touch. */
export function tribunalWaystone(g: G, x: number, y: number): void {
  noonShadow(g, x, y + 1, 40, 0.38);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - 16, y - 10, 32, 10);
  g.fillStyle(MARBLE_DEEP, 1); g.fillPoints([P(x - 11, y - 10), P(x + 11, y - 10), P(x + 7, y - 74), P(x - 7, y - 74)], true);
  g.fillStyle(MARBLE_LIT, 1); g.fillPoints([P(x - 9, y - 10), P(x + 4, y - 10), P(x + 2, y - 74), P(x - 6, y - 74)], true);
  g.fillStyle(GOLD, 1); g.fillTriangle(x - 7, y - 74, x + 7, y - 74, x, y - 88);
  scalesEmblem(g, x, y - 46, 7, GOLD, 1);
  glow(g, x, y - 46, 18, SUN_HOT, 0.05, 3);
}

/**
 * The Notary's kiosk: a little glass booth with a gilt roof, a counter of seals and ribbons, a
 * rack of stamped writs, and a hand-bell — the court's shop is where you buy what the law allows.
 */
export function notaryKiosk(g: G, x: number, y: number): void {
  noonShadow(g, x, y + 2, 150, 0.3);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - 70, y - 12, 140, 12);
  // Counter.
  g.fillStyle(ROBE_DARK, 1); g.fillRect(x - 64, y - 46, 128, 34);
  g.fillStyle(ROBE, 1); g.fillRect(x - 62, y - 46, 124, 8);
  g.fillStyle(GOLD, 1); g.fillRect(x - 64, y - 48, 128, 3);
  // Seals and ribbons on the counter.
  for (let i = 0; i < 5; i++) { g.fillStyle(WAX, 1); g.fillCircle(x - 48 + i * 12, y - 52, 3.5); g.fillStyle(lit(WAX, 0.3), 1); g.fillCircle(x - 49 + i * 12, y - 53, 1.2); }
  g.fillStyle(PARCH, 1); g.fillRect(x + 14, y - 58, 22, 9); g.fillStyle(PARCH_DARK, 1); g.fillRect(x + 14, y - 50, 22, 2);
  g.fillStyle(GOLD_DARK, 1); g.fillTriangle(x + 46, y - 50, x + 56, y - 50, x + 51, y - 62); g.fillStyle(GOLD, 1); g.fillCircle(x + 51, y - 63, 2.5);
  // Glass booth.
  g.fillStyle(GLASS, 0.3); g.fillRect(x - 64, y - 132, 128, 80);
  g.lineStyle(2, GOLD, 1); g.strokeRect(x - 64, y - 132, 128, 80);
  for (const k of [-32, 0, 32]) { g.lineStyle(1.5, GOLD, 0.9); g.lineBetween(x + k, y - 132, x + k, y - 52); }
  g.fillStyle(GLASS_LIT, 0.45); g.fillTriangle(x - 58, y - 54, x - 40, y - 130, x - 30, y - 130);
  // Writs racked at the back.
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? PARCH : PARCH_DARK, 1); g.fillRect(x - 54 + i * 13, y - 118, 9, 26); g.fillStyle(WAX, 1); g.fillCircle(x - 50 + i * 13, y - 96, 2); }
  // Gilt roof.
  g.fillStyle(GOLD_DARK, 1); g.fillTriangle(x - 76, y - 130, x + 76, y - 130, x, y - 168);
  g.fillStyle(GOLD, 1); g.fillTriangle(x - 70, y - 132, x + 70, y - 132, x, y - 164);
  scalesEmblem(g, x, y - 146, 7, ROBE_DARK, 1);
}

/**
 * A signal mirror on a post: the court's shade-finders, swivelled by clerks to throw a patch of
 * noon into any corner something might be hiding in. A disc of mirror in a brass ring.
 */
export function signalMirror(g: G, x: number, y: number, a: number): void {
  noonShadow(g, x, y + 1, 26, 0.35);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 2.5, y - 56, 5, 56);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 8, y - 4, 16, 4);
  const w = 22 * Math.max(0.2, Math.abs(Math.cos(a)));
  g.fillStyle(BRONZE, 1); g.fillEllipse(x, y - 66, w + 6, 28);
  g.fillStyle(MIRROR, 1); g.fillEllipse(x, y - 66, w, 22);
  g.fillStyle(MIRROR_LIT, 0.9); g.fillEllipse(x - w * 0.2, y - 70, w * 0.3, 8);
}

/**
 * A glass witness stand: a hexagonal pulpit of clear glass on a gilt foot, a brass rail, a lamp of
 * sunlight hung over it so the witness's face is never in shadow. Used in the area and the floor.
 */
export function witnessStand(g: G, x: number, y: number, s = 1, lamp = 0.6): void {
  noonShadow(g, x, y + 1, 50 * s, 0.32);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 18 * s, y - 6 * s, 36 * s, 6 * s);
  g.fillStyle(GLASS, 0.5); g.fillRect(x - 16 * s, y - 40 * s, 32 * s, 34 * s);
  g.lineStyle(1.5 * s, GLASS_EDGE, 1); g.strokeRect(x - 16 * s, y - 40 * s, 32 * s, 34 * s);
  g.lineStyle(1, GLASS_EDGE, 0.7); g.lineBetween(x - 5 * s, y - 40 * s, x - 5 * s, y - 6 * s); g.lineBetween(x + 5 * s, y - 40 * s, x + 5 * s, y - 6 * s);
  g.fillStyle(GLASS_LIT, 0.6); g.fillRect(x - 13 * s, y - 36 * s, 2 * s, 24 * s);
  g.fillStyle(BRONZE, 1); g.fillRect(x - 18 * s, y - 42 * s, 36 * s, 3 * s);
  g.lineStyle(1.5 * s, BRONZE_DARK, 1); g.lineBetween(x + 14 * s, y - 42 * s, x + 14 * s, y - 70 * s); g.lineBetween(x + 14 * s, y - 70 * s, x, y - 70 * s);
  g.fillStyle(SUN, 0.9); g.fillCircle(x, y - 64 * s, 5 * s);
  if (lamp > 0) glow(g, x, y - 64 * s, 16 * s, SUN_HOT, 0.07 * lamp, 3);
}

/** A gavel: a barrel head on a turned handle, at angle `a`, scale `s`. */
export function gavel(g: G, x: number, y: number, s: number, a: number, head = ROBE_DARK): void {
  const hx = x + Math.cos(a) * 30 * s, hy = y + Math.sin(a) * 30 * s;
  g.lineStyle(5 * s, BRONZE_DARK, 1); g.lineBetween(x, y, hx, hy);
  g.lineStyle(3 * s, BRONZE, 1); g.lineBetween(x, y, hx, hy);
  const px = -Math.sin(a), py = Math.cos(a);
  g.fillStyle(dim(head, 0.3), 1);
  g.fillPoints([P(hx + px * 16 * s - Math.cos(a) * 8 * s, hy + py * 16 * s - Math.sin(a) * 8 * s), P(hx + px * 16 * s + Math.cos(a) * 8 * s, hy + py * 16 * s + Math.sin(a) * 8 * s),
    P(hx - px * 16 * s + Math.cos(a) * 8 * s, hy - py * 16 * s + Math.sin(a) * 8 * s), P(hx - px * 16 * s - Math.cos(a) * 8 * s, hy - py * 16 * s - Math.sin(a) * 8 * s)], true);
  g.fillStyle(head, 1);
  g.fillPoints([P(hx + px * 14 * s - Math.cos(a) * 6 * s, hy + py * 14 * s - Math.sin(a) * 6 * s), P(hx + px * 14 * s + Math.cos(a) * 6 * s, hy + py * 14 * s + Math.sin(a) * 6 * s),
    P(hx - px * 14 * s + Math.cos(a) * 6 * s, hy - py * 14 * s + Math.sin(a) * 6 * s), P(hx - px * 14 * s - Math.cos(a) * 6 * s, hy - py * 14 * s - Math.sin(a) * 6 * s)], true);
  for (const k of [-10, 10]) { g.lineStyle(2 * s, GOLD, 1); g.lineBetween(hx + px * k * s - Math.cos(a) * 6 * s, hy + py * k * s - Math.sin(a) * 6 * s, hx + px * k * s + Math.cos(a) * 6 * s, hy + py * k * s + Math.sin(a) * 6 * s); }
}

/**
 * The Hall of Records: a tall glass case of a building where every sentence ever passed is
 * filed in open pigeonholes — rows of rolled writs with red seals, ladders on rails, a clerk's
 * lamp burning in broad daylight for no reason but that the law says lamps are lit.
 */
export function hallOfRecords(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  noonShadow(g, x, y + 3, w * 1.05, 0.3);
  const x0 = x - w / 2;
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 8, y - 22, w + 16, 22);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 8, y - 26, w + 16, 6);
  const top = y - 26 - h;
  g.fillStyle(lit(PARCH_DARK, 0.3), 1); g.fillRect(x0, top, w, h);
  // Pigeonholes full of writs.
  for (let r = 0; r < Math.floor(h / 18); r++) {
    for (let c = 0; c < Math.floor(w / 14); c++) {
      const cx = x0 + 4 + c * 14, cy = top + 6 + r * 18;
      g.fillStyle(BRONZE_DARK, 0.6); g.fillRect(cx, cy, 12, 16);
      if (rng() < 0.85) {
        g.fillStyle(rng() < 0.5 ? PARCH : PARCH_DARK, 1); g.fillCircle(cx + 6, cy + 8, 5);
        g.fillStyle(PARCH_DARK, 1); g.fillCircle(cx + 6, cy + 8, 2);
        if (rng() < 0.4) { g.fillStyle(WAX, 1); g.fillCircle(cx + 9, cy + 12, 1.6); }
      }
    }
  }
  // A rolling ladder.
  g.lineStyle(2, BRONZE, 1); g.lineBetween(x0 + w * 0.3, top + 4, x0 + w * 0.36, y - 26); g.lineBetween(x0 + w * 0.3 + 14, top + 4, x0 + w * 0.36 + 14, y - 26);
  for (let k = 1; k < 10; k++) { const t = k / 10; g.lineBetween(x0 + w * (0.3 + 0.06 * t), top + 4 + (h - 4) * t, x0 + w * (0.3 + 0.06 * t) + 14, top + 4 + (h - 4) * t); }
  g.lineStyle(2, BRONZE_DARK, 1); g.lineBetween(x0, top + 4, x0 + w, top + 4);
  // Glass over all.
  g.fillStyle(GLASS, 0.3); g.fillRect(x0, top, w, h);
  for (let lx = x0; lx <= x0 + w; lx += w / 4) { g.fillStyle(GOLD_DARK, 1); g.fillRect(lx - 4, top - 4, 8, h + 4); g.fillStyle(GOLD, 1); g.fillRect(lx - 3, top - 4, 4, h + 4); }
  g.fillStyle(GLASS_LIT, 0.35); g.fillTriangle(x0 + 10, y - 26, x0 + w * 0.2, top, x0 + w * 0.26, top);
  // Flat roof with a gilt cornice and a big lamp lit at noon.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 10, top - 16, w + 20, 14);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 10, top - 20, w + 20, 6);
  g.fillStyle(GOLD, 1); g.fillRect(x0 - 10, top - 10, w + 20, 2);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 3, top - 50, 6, 30);
  g.fillStyle(GLASS, 0.7); g.fillRect(x - 10, top - 66, 20, 18);
  g.fillStyle(SUN_HOT, 1); g.fillCircle(x, top - 57, 5);
  g.fillStyle(BRONZE, 1); g.fillTriangle(x - 13, top - 66, x + 13, top - 66, x, top - 78);
}

/** A white stone bench for the waiting: no back, no shade, a brass number on its end. */
export function waitingBench(g: G, x: number, y: number, w = 70): void {
  noonShadow(g, x, y + 1, w + 6, 0.28);
  for (const k of [-1, 1]) { g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x + k * (w / 2 - 8) - 5, y - 12, 10, 12); }
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - w / 2, y - 18, w, 7);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - w / 2, y - 20, w, 4);
  g.fillStyle(BRONZE, 1); g.fillRect(x + w / 2 - 6, y - 17, 4, 4);
}

/**
 * A Clear on the waiting bench — a bleached shade-thief: you see the bench through them, no
 * shadow under them at all, only the faintest blue at the edges where their colour hangs on.
 */
export function clearFigure(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(0xeaf6ff, 0.22); g.fillRoundedRect(x - 8 * s, y - 34 * s, 16 * s, 24 * s, 6 * s);
  g.lineStyle(1, 0x9ac4e8, 0.45); g.strokeRoundedRect(x - 8 * s, y - 34 * s, 16 * s, 24 * s, 6 * s);
  g.fillStyle(0xeaf6ff, 0.25); g.fillCircle(x, y - 41 * s, 6.5 * s);
  g.lineStyle(1, 0x9ac4e8, 0.5); g.strokeCircle(x, y - 41 * s, 6.5 * s);
}

// ── Animated light ───────────────────────────────────────────────────

/** A glint sliding across a pane: a slanted white band crossing `w` every few seconds. */
export function glassGlint(g: G, x0: number, y0: number, w: number, h: number, t: number, seed: number, speed = 0.12): void {
  const ph = (t * speed + seed) % 1;
  const gx = x0 + ph * (w + 40) - 20;
  const a = 0.22 * Math.sin(ph * Math.PI);
  if (a < 0.02) return;
  g.fillStyle(GLASS_LIT, a);
  g.fillPoints([P(gx, y0 + h), P(gx + 10, y0 + h), P(gx + 28, y0), P(gx + 18, y0)], true);
}

/** Water caustics: wobbling bright lines on a surface, the light coming back off the fountain. */
export function caustics(g: G, r: Rect, t: number, n: number, seed = 0): void {
  for (let i = 0; i < n; i++) {
    const cx = r.x + ((i * 97 + seed * 31) % Math.max(1, r.w)), cy = r.y + ((i * 53 + seed * 17) % Math.max(1, r.h));
    const ph = t * 1.4 + i * 1.7;
    g.lineStyle(1.2, WATER_LIT, 0.35 + Math.sin(ph) * 0.2);
    g.beginPath();
    g.moveTo(cx - 12, cy + Math.sin(ph) * 3);
    g.lineTo(cx - 4, cy - 3 + Math.cos(ph * 1.3) * 2);
    g.lineTo(cx + 5, cy + 2 + Math.sin(ph * 0.8) * 3);
    g.lineTo(cx + 13, cy - 1);
    g.strokePath();
  }
}

/** A thin beam of reflected noon from (ax, ay) to (bx, by), with a hot spot where it lands. */
export function noonBeam(g: G, ax: number, ay: number, bx: number, by: number, a: number, w = 6): void {
  g.lineStyle(w * 2.4, SUN_HOT, a * 0.18); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(w, SUN, a * 0.5); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(Math.max(1, w * 0.3), GLASS_LIT, a); g.lineBetween(ax, ay, bx, by);
  glow(g, bx, by, w * 3, SUN, 0.1 * a, 3);
}

/** A mirror shard: a sharp sliver of silvering, for shatters and flying glass. */
export function shard(g: G, x: number, y: number, s: number, a: number, alpha = 1): void {
  const c = Math.cos(a), sn = Math.sin(a);
  g.fillStyle(MIRROR, alpha);
  g.fillTriangle(x + c * s * 1.6, y + sn * s * 1.6, x - sn * s * 0.5, y + c * s * 0.5, x + sn * s * 0.5 - c * s, y - c * s * 0.5 - sn * s);
  g.fillStyle(MIRROR_LIT, alpha); g.fillTriangle(x + c * s * 1.6, y + sn * s * 1.6, x, y, x - sn * s * 0.5, y + c * s * 0.5);
}

/** A chalk line, slightly broken, as a sentence is drawn on the floor before it is carried out. */
export function chalkLine(g: G, x1: number, y1: number, x2: number, y2: number, a: number, w = 2): void {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 18));
  for (let i = 0; i < n; i++) {
    if ((i * 7) % 11 === 3) continue;
    const t0 = i / n, t1 = (i + 0.85) / n;
    g.lineStyle(w, CHALK, a);
    g.lineBetween(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
  }
}

/** A glass-panel shimmer used on the floor and in the area: deep glass with a lit edge. */
export function glassPanel(g: G, x: number, y: number, w: number, h: number, a = 0.5): void {
  g.fillStyle(GLASS_DEEP, a * 0.4); g.fillRect(x, y, w, h);
  g.fillStyle(GLASS, a * 0.6); g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.lineStyle(1.5, GLASS_EDGE, a); g.strokeRect(x, y, w, h);
  g.fillStyle(GLASS_LIT, a * 0.6); g.fillRect(x + 4, y + 4, 2, h - 8);
}

/** The court's robe purple as a swag of cloth hung between two points, gold-fringed. */
export function robeSwag(g: G, x1: number, x2: number, y: number, drop: number): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(P(x1 + (x2 - x1) * t, y + Math.sin(t * Math.PI) * drop)); }
  for (let i = 12; i >= 0; i--) { const t = i / 12; pts.push(P(x1 + (x2 - x1) * t, y + Math.sin(t * Math.PI) * drop * 0.55)); }
  g.fillStyle(ROBE, 1); g.fillPoints(pts, true);
  g.lineStyle(2, GOLD, 1);
  g.beginPath();
  for (let i = 0; i <= 12; i++) { const t = i / 12; const px = x1 + (x2 - x1) * t, py = y + Math.sin(t * Math.PI) * drop; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.strokePath();
  g.fillStyle(ROBE_LIT, 0.5); g.fillEllipse((x1 + x2) / 2, y + drop * 0.6, (x2 - x1) * 0.4, drop * 0.15);
}
