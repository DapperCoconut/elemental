import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BLUEPRINT, BLUEPRINT_DARK, BRASS, BRASS_DARK, BRASS_LIT, CLAY, CLAY_DARK, CLAY_LIT, COPPER, COPPER_DARK, COPPER_LIT,
  CYAN, CYAN_LIT, FLAG, FLAG_DARK, GLASS, GLASS_EDGE, GLASS_LIT, GOLD, HEAT_WHITE, IRON, IRON_DARK, IRON_LIT, LIME,
  LIME_DARK, LIME_DEEP, LIME_LIT, MIRROR, MIRROR_DARK, MOLTEN, MOLTEN_DARK, MOLTEN_LIT, OAK, OAK_DARK, OAK_LIT, QUENCH,
  QUENCH_DEEP, QUENCH_LIT, RIVET, ROUGE, SLURRY, SOOT, STEAM, SUN,
} from './palette';

/**
 * Workshop set pieces — the shapes only an artificers' town has. Everything is *made*: riveted,
 * bolted, ground true, glazed. The light is the point of every piece: glass roofs throw panes of
 * noon, lenses throw caustics and burning dots, mirrors flash. Soot and slurry are the only mess,
 * and they collect at the bottoms of things, where the work is.
 */

// ── Small parts ──────────────────────────────────────────────────────

/** A spur gear: a toothed rim, a web with lightening holes, a hub. `rot` turns it. */
export function gear(g: G, x: number, y: number, r: number, teeth: number, color: number, a = 1, rot = 0): void {
  const tooth = r * 0.22;
  g.fillStyle(dim(color, 0.35), a);
  g.fillCircle(x + 1, y + 1.5, r);
  for (let i = 0; i < teeth; i++) {
    const t = rot + (i / teeth) * Math.PI * 2;
    const w = (Math.PI / teeth) * 0.55;
    g.fillStyle(color, a);
    g.fillTriangle(
      x + Math.cos(t - w) * r, y + Math.sin(t - w) * r,
      x + Math.cos(t + w) * r, y + Math.sin(t + w) * r,
      x + Math.cos(t) * (r + tooth), y + Math.sin(t) * (r + tooth),
    );
    g.fillRect(x + Math.cos(t) * (r + tooth * 0.4) - tooth * 0.45, y + Math.sin(t) * (r + tooth * 0.4) - tooth * 0.45, tooth * 0.9, tooth * 0.9);
  }
  g.fillStyle(color, a); g.fillCircle(x, y, r);
  g.fillStyle(lit(color, 0.3), a * 0.7); g.fillCircle(x - r * 0.25, y - r * 0.25, r * 0.55);
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.62);
  if (r > 7) {
    for (let i = 0; i < 4; i++) {
      const t = rot + Math.PI / 4 + (i / 4) * Math.PI * 2;
      g.fillStyle(dim(color, 0.55), a); g.fillCircle(x + Math.cos(t) * r * 0.5, y + Math.sin(t) * r * 0.5, r * 0.16);
    }
  }
  g.fillStyle(dim(color, 0.45), a); g.fillCircle(x, y, r * 0.22);
  g.fillStyle(lit(color, 0.5), a); g.fillCircle(x - r * 0.06, y - r * 0.06, r * 0.08);
}

/** A ground lens: a pale disc in a brass ring, a highlight crescent and a bright point where it focuses. */
export function lens(g: G, x: number, y: number, r: number, a = 1, ring = BRASS): void {
  g.fillStyle(dim(ring, 0.35), a); g.fillCircle(x, y + 1, r + 3);
  g.fillStyle(ring, a); g.fillCircle(x, y, r + 2.5);
  g.fillStyle(lit(ring, 0.35), a); g.fillCircle(x - 1, y - 1, r + 1);
  g.fillStyle(GLASS, a * 0.92); g.fillCircle(x, y, r);
  g.fillStyle(0xbfe6ea, a * 0.6); g.fillCircle(x + r * 0.15, y + r * 0.2, r * 0.75);
  g.fillStyle(GLASS_LIT, a * 0.9); g.fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.7, r * 0.32);
  g.fillStyle(GLASS_LIT, a); g.fillCircle(x + r * 0.32, y + r * 0.28, Math.max(1, r * 0.12));
}

/** A mirror pane in a gilt frame, seen leaning: a silver face with a diagonal flash. */
export function mirrorPane(g: G, x: number, y: number, w: number, h: number, flash = 0.4, frame = GOLD): void {
  g.fillStyle(dim(frame, 0.4), 1); g.fillRect(x - w / 2 - 3, y - h - 3, w + 6, h + 6);
  g.fillStyle(frame, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(MIRROR_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(MIRROR, 1); g.fillRect(x - w / 2 + 1, y - h + 1, w - 2, h - 2);
  // Reflected sky, then the diagonal flash.
  g.fillStyle(0xcfe6f6, 0.6); g.fillRect(x - w / 2 + 1, y - h + 1, w - 2, h * 0.4);
  g.fillStyle(GLASS_LIT, flash);
  g.fillTriangle(x - w / 2 + 1, y - h * 0.3, x - w / 2 + 1, y - h * 0.55, x + w / 2 - 1, y - h + 1);
  g.fillTriangle(x - w / 2 + 1, y - h * 0.3, x + w / 2 - 1, y - h + 1, x + w / 2 - 1, y - h * 0.75);
}

/** A blueprint sheet: cyan paper, a grid, a drawn contraption and four brass pins. */
export function blueprintSheet(g: G, x: number, y: number, w: number, h: number, seed: number, a = 1): void {
  g.fillStyle(BLUEPRINT_DARK, a); g.fillRect(x - w / 2 + 1.5, y - h / 2 + 1.5, w, h);
  g.fillStyle(BLUEPRINT, a); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.lineStyle(0.6, CYAN, 0.25 * a);
  for (let gx = x - w / 2 + 5; gx < x + w / 2; gx += 6) g.lineBetween(gx, y - h / 2, gx, y + h / 2);
  for (let gy = y - h / 2 + 5; gy < y + h / 2; gy += 6) g.lineBetween(x - w / 2, gy, x + w / 2, gy);
  g.lineStyle(1, CYAN_LIT, 0.85 * a);
  const k = seed % 3;
  if (k === 0) {
    // A lens on a tripod.
    g.strokeCircle(x, y - h * 0.12, Math.min(w, h) * 0.2);
    g.lineBetween(x, y + h * 0.05, x - w * 0.22, y + h * 0.36); g.lineBetween(x, y + h * 0.05, x + w * 0.22, y + h * 0.36);
    g.lineBetween(x, y + h * 0.05, x, y + h * 0.36);
  } else if (k === 1) {
    // A gear train.
    g.strokeCircle(x - w * 0.15, y, Math.min(w, h) * 0.18);
    g.strokeCircle(x + w * 0.16, y - h * 0.08, Math.min(w, h) * 0.12);
    g.strokeCircle(x + w * 0.12, y + h * 0.22, Math.min(w, h) * 0.08);
  } else {
    // A mirror on a gimbal.
    g.strokeRect(x - w * 0.18, y - h * 0.3, w * 0.36, h * 0.42);
    g.strokeEllipse(x, y - h * 0.09, w * 0.56, h * 0.18);
    g.lineBetween(x, y + h * 0.12, x, y + h * 0.36); g.lineBetween(x - w * 0.2, y + h * 0.36, x + w * 0.2, y + h * 0.36);
  }
  // Title block.
  g.strokeRect(x + w * 0.18, y + h * 0.3, w * 0.28, h * 0.14);
  g.fillStyle(BRASS_LIT, a);
  for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillCircle(x + px * (w / 2 - 2.5), y + py * (h / 2 - 2.5), 1.4);
}

/** The Despot's sunburst, gilt — every made thing in the court is stamped with one. */
export function sunburst(g: G, x: number, y: number, r: number, a = 1): void {
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    const rr = i % 2 ? r * 1.35 : r * 1.8;
    g.fillStyle(i % 2 ? dim(GOLD, 0.15) : GOLD, a);
    g.fillTriangle(x + Math.cos(t - 0.13) * r * 0.8, y + Math.sin(t - 0.13) * r * 0.8, x + Math.cos(t + 0.13) * r * 0.8, y + Math.sin(t + 0.13) * r * 0.8, x + Math.cos(t) * rr, y + Math.sin(t) * rr);
  }
  g.fillStyle(dim(GOLD, 0.25), a); g.fillCircle(x, y + 0.6, r);
  g.fillStyle(GOLD, a); g.fillCircle(x, y, r);
  g.fillStyle(lit(GOLD, 0.5), a); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.4);
}

// ── Ground ───────────────────────────────────────────────────────────

/** The yard: big worn limestone flags, greyed with slurry, iron drain grates and filings in the cracks. */
export function yardFlags(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(FLAG_DARK, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const S = 64;
  for (let y = r.y; y < r.y + r.h; y += S) {
    const off = ((y - r.y) / S) % 2 ? S / 2 : 0;
    for (let x = r.x - off; x < r.x + r.w; x += S) {
      const tone = rng();
      g.fillStyle(tone < 0.2 ? dim(FLAG, 0.05) : tone > 0.85 ? lit(FLAG, 0.06) : FLAG, 1);
      g.fillRect(x + 1.5, y + 1.5, S - 3, S - 3);
      if (rng() < 0.3) { g.fillStyle(SLURRY, 0.18 + rng() * 0.12); g.fillEllipse(x + rng() * S, y + rng() * S, 20 + rng() * 30, 8 + rng() * 10); }
      if (rng() < 0.12) { g.lineStyle(1, FLAG_DARK, 0.6); g.lineBetween(x + rng() * S, y + 2, x + rng() * S, y + S - 2); }
    }
  }
  // Brass filings glinting in the joints.
  for (let i = 0; i < (r.w * r.h) / 1800; i++) {
    g.fillStyle(rng() < 0.5 ? BRASS : MIRROR, 0.5 + rng() * 0.4);
    g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 1.4, 1.4);
  }
}

/** A cart road through the yard: sun-white setts in fan courses, grooved by crane-wagon wheels. */
export function settRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    g.lineStyle(w + 8, LIME_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, LIME, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.fillStyle(LIME, 1); g.fillCircle(a.x, a.y, w / 2); g.fillCircle(b.x, b.y, w / 2);
    for (let d = 0; d < len; d += 13) {
      const cx = a.x + Math.cos(ang) * d, cy = a.y + Math.sin(ang) * d;
      for (let k = -w / 2 + 7; k < w / 2 - 4; k += 12) {
        g.fillStyle(rng() < 0.5 ? LIME_LIT : dim(LIME, 0.06), 0.8);
        g.fillRect(cx + nx * (k + (d % 26 ? 6 : 0)) - 5, cy + ny * (k + (d % 26 ? 6 : 0)) - 4, 10, 8);
      }
    }
    // Wheel grooves.
    for (const s of [-1, 1]) {
      g.lineStyle(2, LIME_DEEP, 0.35);
      g.lineBetween(a.x + nx * s * w * 0.22, a.y + ny * s * w * 0.22, b.x + nx * s * w * 0.22, b.y + ny * s * w * 0.22);
    }
  }
}

/** A pane of noon falling through a glass roof: a bright parallelogram on the floor, its ribs in shadow. */
export function roofPane(g: G, x: number, y: number, w: number, h: number, a = 0.18): void {
  g.fillStyle(SUN, a); g.fillRect(x, y, w, h);
  g.lineStyle(3, SOOT, 0.12);
  for (let k = 0; k <= 4; k++) g.lineBetween(x + (w * k) / 4, y, x + (w * k) / 4, y + h);
  g.lineBetween(x, y + h / 2, x + w, y + h / 2);
}

/** The quench tank, sunk into the yard: riveted iron walls, dark water, a scum of scale at the edges. */
export function quenchTank(g: G, r: Rect, rng: () => number): void {
  shadow(g, r.x + r.w / 2, r.y + r.h + 8, r.w * 1.05, 30, 0.25);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(r.x - 16, r.y - 16, r.w + 32, r.h + 32, 10);
  g.fillStyle(IRON, 1); g.fillRoundedRect(r.x - 12, r.y - 14, r.w + 24, r.h + 26, 8);
  g.fillStyle(IRON_LIT, 1); g.fillRect(r.x - 10, r.y - 14, r.w + 20, 3);
  // Rivets round the lip and the plate seams.
  for (let x = r.x - 6; x < r.x + r.w + 8; x += 18) {
    g.fillStyle(RIVET, 1); g.fillCircle(x, r.y - 8, 2); g.fillCircle(x, r.y + r.h + 8, 2);
  }
  for (let y = r.y; y < r.y + r.h; y += 18) { g.fillStyle(RIVET, 1); g.fillCircle(r.x - 6, y, 2); g.fillCircle(r.x + r.w + 6, y, 2); }
  for (let k = 1; k < 4; k++) { g.lineStyle(1.5, IRON_DARK, 0.8); g.lineBetween(r.x + (r.w * k) / 4, r.y - 14, r.x + (r.w * k) / 4, r.y - 2); }
  // The water.
  g.fillStyle(QUENCH_DEEP, 1); g.fillRect(r.x, r.y, r.w, r.h);
  g.fillStyle(QUENCH, 1); g.fillRect(r.x + 4, r.y + 6, r.w - 8, r.h - 10);
  for (let i = 0; i < 14; i++) {
    g.fillStyle(QUENCH_LIT, 0.12 + rng() * 0.1);
    g.fillEllipse(r.x + 20 + rng() * (r.w - 40), r.y + 14 + rng() * (r.h - 28), 30 + rng() * 40, 4);
  }
  // Scale scum along the edges, and a drowned blade or two.
  for (let x = r.x + 4; x < r.x + r.w - 4; x += 7) { g.fillStyle(lit(QUENCH, 0.3), 0.35); g.fillCircle(x, r.y + 5 + rng() * 3, 2 + rng() * 2); }
  g.lineStyle(3, dim(IRON_LIT, 0.2), 0.5); g.lineBetween(r.x + r.w * 0.2, r.y + r.h * 0.6, r.x + r.w * 0.34, r.y + r.h * 0.5);
  g.lineStyle(2, dim(BRASS, 0.4), 0.45); g.strokeCircle(r.x + r.w * 0.72, r.y + r.h * 0.42, 9);
  // A ladder over the lip and the tongs rack on the near wall.
  g.lineStyle(2.5, IRON_LIT, 1);
  g.lineBetween(r.x + r.w - 40, r.y - 14, r.x + r.w - 40, r.y + 30); g.lineBetween(r.x + r.w - 26, r.y - 14, r.x + r.w - 26, r.y + 30);
  for (let k = 0; k < 4; k++) g.lineBetween(r.x + r.w - 40, r.y - 8 + k * 10, r.x + r.w - 26, r.y - 8 + k * 10);
  for (let k = 0; k < 5; k++) {
    const tx = r.x + 30 + k * 16;
    g.lineStyle(2, IRON_DARK, 1); g.lineBetween(tx, r.y + r.h + 4, tx - 3, r.y + r.h + 22); g.lineBetween(tx + 4, r.y + r.h + 4, tx + 7, r.y + r.h + 22);
  }
}

// ── Set pieces (x,y = base / feet line) ──────────────────────────────

/**
 * The grinding hall: a long open shed on iron columns under a pitched glass roof. Under it, a row
 * of treadle grinding wheels, each with a mirror blank on its bed, a slurry trough below, and a
 * finished mirror leaning against the end column flashing back at the sky.
 */
export function grindingHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.05, 26, 0.18);
  // Floor plinth and slurry gutter.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 10, y - 10, w + 20, 14);
  g.fillStyle(LIME, 1); g.fillRect(x0 - 8, y - 12, w + 16, 10);
  g.fillStyle(SLURRY, 0.7); g.fillRect(x0, y - 4, w, 4);
  // Back wall: limestone to waist height, glazing above.
  const top = y - h;
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, y - h * 0.45, w, h * 0.45 - 12);
  g.fillStyle(LIME, 1); g.fillRect(x0, y - h * 0.45, w, 6);
  g.fillStyle(GLASS, 0.45); g.fillRect(x0, top + 30, w, h * 0.55 - 30);
  for (let k = 0; k < w / 40; k++) { g.fillStyle(GLASS_LIT, 0.35); g.fillRect(x0 + 8 + k * 40, top + 36, 3, h * 0.5 - 40); }
  // Grinding wheels along the floor.
  const n = Math.floor(w / 110);
  for (let i = 0; i < n; i++) {
    const wx = x0 + 60 + i * ((w - 120) / Math.max(1, n - 1));
    grindingBench(g, wx, y - 14, rng);
  }
  // Columns.
  const cols = Math.round(w / 120);
  for (let i = 0; i <= cols; i++) {
    const cx = x0 + (i * w) / cols;
    g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 5, top + 24, 10, h - 34);
    g.fillStyle(IRON, 1); g.fillRect(cx - 4, top + 24, 6, h - 34);
    g.fillStyle(IRON_LIT, 1); g.fillRect(cx - 4, top + 24, 2, h - 34);
    g.fillStyle(IRON, 1); g.fillRect(cx - 9, y - 14, 18, 6);
    // Brackets curling up into the roof.
    g.lineStyle(2, IRON, 1);
    g.beginPath(); g.arc(cx - 16, top + 40, 16, -Math.PI / 2, 0, false); g.strokePath();
    g.beginPath(); g.arc(cx + 16, top + 40, 16, Math.PI, Math.PI * 1.5, false); g.strokePath();
  }
  // The glass roof: a ridge with ribs, panes catching the sun in bands.
  g.fillStyle(GLASS, 0.55);
  g.fillTriangle(x0 - 14, top + 26, x0 + w + 14, top + 26, x, top - 26);
  g.fillStyle(GLASS_LIT, 0.4);
  g.fillTriangle(x0 - 14, top + 26, x, top + 26, x, top - 26);
  g.lineStyle(1.5, IRON, 0.9);
  for (let k = 0; k <= 14; k++) g.lineBetween(x0 - 14 + ((w + 28) * k) / 14, top + 26, x, top - 26);
  g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x0 - 14, top + 26, x0 + w + 14, top + 26);
  g.lineStyle(3, IRON, 1); g.lineBetween(x0 - 14, top + 26, x, top - 26); g.lineBetween(x, top - 26, x0 + w + 14, top + 26);
  // A gilt sunburst on the ridge — even the sheds are the Despot's.
  sunburst(g, x, top - 30, 8);
  // The finished mirror leaning on the end column.
  mirrorPane(g, x0 + w + 6, y - 12, 34, 56, 0.55);
}

/** One treadle grinding wheel: a stone wheel in a trough, a mirror blank clamped on the bed, a treadle. */
export function grindingBench(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 14, 0.25);
  // Trough.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 30, y - 18, 60, 18);
  g.fillStyle(OAK, 1); g.fillRect(x - 29, y - 19, 58, 14);
  g.fillStyle(SLURRY, 1); g.fillRect(x - 26, y - 18, 52, 5);
  // The wheel, standing in the trough.
  g.fillStyle(dim(LIME_DEEP, 0.2), 1); g.fillCircle(x - 6, y - 32, 19);
  g.fillStyle(LIME_DEEP, 1); g.fillCircle(x - 6, y - 33, 18);
  g.fillStyle(LIME_DARK, 1); g.fillCircle(x - 6, y - 33, 14);
  g.lineStyle(1, LIME_DEEP, 0.6); g.strokeCircle(x - 6, y - 33, 9);
  g.fillStyle(IRON, 1); g.fillCircle(x - 6, y - 33, 3);
  // The bed and the mirror blank, half-ground.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 8, y - 30, 22, 4);
  g.fillStyle(MIRROR_DARK, 1); g.fillEllipse(x + 19, y - 33, 22, 7);
  g.fillStyle(MIRROR, 0.8); g.fillEllipse(x + 17, y - 34, 12, 3);
  // Treadle.
  g.lineStyle(2, OAK_DARK, 1); g.lineBetween(x - 6, y - 33, x - 22, y - 2); g.lineBetween(x - 30, y - 2, x - 14, y - 2);
  if (rng() < 0.5) { g.fillStyle(ROUGE, 0.6); g.fillCircle(x + 26, y - 8, 3); }
}

/**
 * A glassblowers' furnace: a brick beehive with a white-hot glory hole, a marver slab and a rack of
 * blowpipes, a chimney with a soot-black crown and a gilded sunburst plate over the door (it is a
 * Clarity offence to bank a furnace for the night — there is no night).
 */
export function furnace(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 4, 150 * s, 34 * s, 0.3);
  // Plinth.
  g.fillStyle(LIME_DEEP, 1); g.fillRect(x - 64 * s, y - 14 * s, 128 * s, 14 * s);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 62 * s, y - 16 * s, 124 * s, 6 * s);
  // The beehive, in courses of fire-brick.
  const R = 54 * s;
  const cy = y - 16 * s;
  for (let row = 0; row < 9; row++) {
    const yy = cy - row * 9 * s;
    const half = Math.sqrt(Math.max(0, 1 - Math.pow((row * 9 * s) / (R * 1.35), 2))) * R;
    if (half < 4) continue;
    for (let bx = -half; bx < half; bx += 14 * s) {
      const k = rng();
      g.fillStyle(k < 0.3 ? COPPER_DARK : k < 0.75 ? mixC(COPPER_DARK, SOOT, 0.3) : dim(COPPER, 0.2), 1);
      g.fillRect(x + bx + (row % 2 ? 7 * s : 0), yy - 9 * s, Math.min(13 * s, half - bx), 8 * s);
    }
  }
  // Soot bloom up the front, above the glory hole.
  g.fillStyle(SOOT, 0.55); g.fillEllipse(x, cy - 54 * s, 46 * s, 40 * s);
  // The glory hole: an iron ring round a white-hot mouth.
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, cy - 26 * s, 17 * s);
  g.fillStyle(MOLTEN_DARK, 1); g.fillCircle(x, cy - 26 * s, 13 * s);
  g.fillStyle(MOLTEN, 1); g.fillCircle(x, cy - 26 * s, 10 * s);
  g.fillStyle(MOLTEN_LIT, 1); g.fillCircle(x, cy - 26 * s, 6 * s);
  g.fillStyle(HEAT_WHITE, 1); g.fillCircle(x, cy - 27 * s, 3 * s);
  // Sunburst plate above it.
  sunburst(g, x, cy - 50 * s, 5 * s);
  // Chimney.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x + 18 * s, cy - 120 * s, 18 * s, 50 * s);
  g.fillStyle(SOOT, 1); g.fillRect(x + 16 * s, cy - 124 * s, 22 * s, 8 * s);
  // Marver slab and blowpipe rack beside it.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 96 * s, y - 26 * s, 34 * s, 4 * s);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 98 * s, y - 30 * s, 38 * s, 5 * s);
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x - 94 * s, y - 25 * s, x - 94 * s, y); g.lineBetween(x - 64 * s, y - 25 * s, x - 64 * s, y);
  for (let k = 0; k < 4; k++) {
    g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x + 66 * s + k * 6 * s, y - 2, x + 60 * s + k * 6 * s, y - 70 * s);
    g.fillStyle(MOLTEN_DARK, 0.8); g.fillCircle(x + 60 * s + k * 6 * s, y - 70 * s, 2);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x + 56 * s, y - 50 * s, 34 * s, 3 * s);
}

/** The glow of a glory hole and the heat-shimmer over it — drawn per frame. */
export function furnaceGlow(g: G, x: number, y: number, s: number, t: number): void {
  const cy = y - 16 * s;
  const f = 0.75 + Math.sin(t * 9 + x) * 0.12 + Math.sin(t * 23 + y) * 0.08;
  glow(g, x, cy - 26 * s, 26 * s * f, MOLTEN, 0.07, 4);
  g.fillStyle(HEAT_WHITE, 0.5 + f * 0.3); g.fillCircle(x, cy - 27 * s, 4 * s * f);
  // Heat-shimmer rising off the chimney.
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + i / 3) % 1;
    g.lineStyle(2, HEAT_WHITE, 0.18 * (1 - ph));
    const bx = x + 27 * s, by = cy - 126 * s - ph * 60;
    g.beginPath();
    g.moveTo(bx - 8, by);
    for (let k = 1; k <= 6; k++) g.lineTo(bx - 8 + k * 3, by - Math.sin(t * 6 + k + i) * 3);
    g.strokePath();
  }
}

/**
 * The crane yard's gantry crane: a lattice tower on a stone footing, a long jib over the yard, a
 * counterweight of stacked iron, a winch house with a great drum — and a new Heliostat mirror the
 * size of a door hanging on its chain. `sway` sets the mirror's swing (drawn in the piece too: the
 * swaying one is added in animateOver).
 */
export function crane(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 150, 40, 0.3);
  // Footing.
  g.fillStyle(LIME_DEEP, 1); g.fillRect(x - 54, y - 22, 108, 22);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 52, y - 26, 104, 8);
  // Tower: two legs and lattice bracing.
  const top = y - 330;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 32, top, 7, 304); g.fillRect(x + 25, top, 7, 304);
  g.fillStyle(IRON, 1); g.fillRect(x - 31, top, 4, 304); g.fillRect(x + 26, top, 4, 304);
  g.lineStyle(2, IRON, 1);
  for (let yy = top + 10; yy < y - 30; yy += 36) { g.lineBetween(x - 28, yy, x + 28, yy + 36); g.lineBetween(x + 28, yy, x - 28, yy + 36); g.lineBetween(x - 28, yy, x + 28, yy); }
  // Winch house at the foot: oak boards, a big drum, the chain going up.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 86, y - 78, 54, 56);
  g.fillStyle(OAK, 1); g.fillRect(x - 84, y - 76, 50, 52);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, OAK_DARK, 0.6); g.lineBetween(x - 84 + k * 10, y - 76, x - 84 + k * 10, y - 24); }
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x - 59, y - 52, 16);
  g.fillStyle(IRON, 1); g.fillCircle(x - 59, y - 52, 13);
  for (let k = 0; k < 6; k++) { g.lineStyle(1.5, IRON_LIT, 0.7); g.lineBetween(x - 72, y - 62 + k * 4, x - 46, y - 62 + k * 4); }
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 59, y - 52, x - 100, y - 30);
  g.fillStyle(OAK_DARK, 1); g.fillCircle(x - 100, y - 30, 3);
  // Jib, out to the right; counter-jib to the left with its iron weights.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 120, top - 6, 400, 8);
  g.fillStyle(IRON, 1); g.fillRect(x - 120, top - 5, 400, 4);
  g.lineStyle(1.5, IRON, 1);
  for (let k = 0; k < 14; k++) {
    const jx = x + 30 + k * 18;
    g.lineBetween(jx, top - 6, jx + 9, top - 26); g.lineBetween(jx + 9, top - 26, jx + 18, top - 6);
  }
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x + 30, top - 26, x + 280, top - 6);
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, top - 60, x + 270, top - 8); g.lineBetween(x, top - 60, x - 110, top - 6);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 30, top - 6, x + 30, top - 6, x, top - 64);
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? IRON_DARK : IRON, 1); g.fillRect(x - 118, top + 2 + k * 12, 46, 11);
    g.fillStyle(RIVET, 1); g.fillCircle(x - 112, top + 7 + k * 12, 1.5); g.fillCircle(x - 78, top + 7 + k * 12, 1.5);
  }
  // Trolley out on the jib.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 196, top + 2, 20, 10);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 200, top + 2, 3); g.fillCircle(x + 212, top + 2, 3);
  // A gilt sunburst on the apex — the crane is the Heliostat's, the plate says so.
  sunburst(g, x, top - 66, 7);
  // The Heliostat plate on the footing, and rust weeping from a few of the tower's bolts.
  g.fillStyle(GOLD, 1); g.fillRect(x - 20, y - 40, 40, 8);
  for (let k = 0; k < 6; k++) { g.fillStyle(COPPER_DARK, 0.35); g.fillRect(x - 30 + rng() * 60, top + rng() * 280, 2, 6 + rng() * 8); }
}

/** The mirror hanging from the crane trolley, swinging slightly and flashing as it turns — per frame. */
export function craneLoad(g: G, x: number, y: number, t: number): void {
  const top = y - 330;
  const hx = x + 206, hy = top + 12;
  const sw = Math.sin(t * 0.7) * 0.06;
  const len = 150;
  const mx = hx + Math.sin(sw) * len, my = hy + Math.cos(sw) * len;
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(hx, hy, mx, my - 6);
  for (let k = 0; k < 10; k++) {
    const cx = hx + (mx - hx) * (k / 10), cy = hy + (my - hy) * (k / 10);
    g.lineStyle(1, IRON_LIT, 0.8); g.strokeEllipse(cx, cy, 3, 6);
  }
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(mx, my - 6, mx - 30, my + 6); g.lineBetween(mx, my - 6, mx + 30, my + 6);
  // The pane turns slowly on its chain: its visible width breathes, and it flashes when square-on.
  const turn = Math.cos(t * 0.45);
  const w = 70 * Math.max(0.12, Math.abs(turn));
  const face = turn > 0;
  g.fillStyle(GOLD, 1); g.fillRect(mx - w / 2 - 3, my + 4, w + 6, 92);
  g.fillStyle(face ? MIRROR : IRON, 1); g.fillRect(mx - w / 2, my + 7, w, 86);
  if (face) {
    g.fillStyle(0xcfe6f6, 0.6); g.fillRect(mx - w / 2, my + 7, w, 30);
    const fl = Math.pow(Math.max(0, turn), 8);
    g.fillStyle(GLASS_LIT, 0.3 + fl * 0.6);
    g.fillTriangle(mx - w / 2, my + 60, mx - w / 2, my + 40, mx + w / 2, my + 12);
    if (fl > 0.3) glow(g, mx, my + 50, 60 * fl, SUN, 0.08 * fl, 4);
  }
}

/**
 * A drafting table set out in the sun: a tilted oak board on splayed legs, a blueprint pinned at
 * the corners and weighted with brass, a set-square, a ruling pen in a pot of cyan ink and a
 * sheaf of rolled drawings in a bin. The paper is fading where the noon has sat on it longest.
 */
export function draftingTable(g: G, x: number, y: number, seed: number): void {
  shadow(g, x, y + 2, 86, 18, 0.25);
  // Legs.
  g.lineStyle(3, OAK_DARK, 1);
  g.lineBetween(x - 30, y, x - 22, y - 34); g.lineBetween(x + 30, y, x + 22, y - 34);
  g.lineBetween(x - 22, y - 2, x - 26, y - 46); g.lineBetween(x + 22, y - 2, x + 26, y - 46);
  g.lineStyle(2, OAK, 1); g.lineBetween(x - 26, y - 14, x + 26, y - 14);
  // The tilted board.
  g.fillStyle(OAK_DARK, 1);
  g.fillPoints([{ x: x - 40, y: y - 34 }, { x: x + 40, y: y - 34 }, { x: x + 34, y: y - 74 }, { x: x - 34, y: y - 74 }], true);
  g.fillStyle(OAK, 1);
  g.fillPoints([{ x: x - 38, y: y - 36 }, { x: x + 38, y: y - 36 }, { x: x + 32, y: y - 72 }, { x: x - 32, y: y - 72 }], true);
  // The blueprint — faded to near-white on its sun side.
  blueprintSheet(g, x, y - 54, 58, 30, seed);
  g.fillStyle(LIME_LIT, 0.35); g.fillRect(x + 6, y - 69, 23, 30);
  g.lineStyle(2, OAK_LIT, 1); g.lineBetween(x - 38, y - 36, x + 38, y - 36);
  // Set-square, weights and the ink pot.
  g.lineStyle(1.5, BRASS, 1); g.strokeTriangle(x - 28, y - 40, x - 8, y - 40, x - 28, y - 58);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 26, y - 40, 3); g.fillCircle(x - 30, y - 68, 3);
  g.fillStyle(BLUEPRINT_DARK, 1); g.fillRect(x + 30, y - 46, 7, 8);
  g.lineStyle(1, IRON_LIT, 1); g.lineBetween(x + 33, y - 46, x + 38, y - 58);
  // A bin of rolled drawings.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x + 36, y - 22, 16, 22);
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? BLUEPRINT : LIME_LIT, 1); g.fillRect(x + 37 + k * 4, y - 36 - (k % 2) * 4, 3.5, 16); }
}

/**
 * A patent-office notice board: a gilt-headed oak board on two posts, papered with granted patents
 * (each sealed in gold wax), refusals stamped red, and one notice of seizure pinned over the rest.
 */
export function patentBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 90, 14, 0.22);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 40, y - 72, 5, 72); g.fillRect(x + 35, y - 72, 5, 72);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 46, y - 98, 92, 46);
  g.fillStyle(OAK, 1); g.fillRect(x - 44, y - 96, 88, 42);
  // The gilt head with a sunburst.
  g.fillStyle(GOLD, 1); g.fillRect(x - 48, y - 104, 96, 7);
  sunburst(g, x, y - 106, 4);
  for (let i = 0; i < 7; i++) {
    const px = x - 38 + (i % 4) * 21 + rng() * 3, py = y - 92 + Math.floor(i / 4) * 19 + rng() * 2;
    const blue = rng() < 0.45;
    g.fillStyle(blue ? BLUEPRINT : LIME_LIT, 1); g.fillRect(px, py, 16, 16);
    if (blue) { g.lineStyle(0.8, CYAN, 0.8); g.strokeCircle(px + 8, py + 7, 4); }
    else { for (let k = 0; k < 4; k++) { g.lineStyle(0.8, LIME_DEEP, 0.8); g.lineBetween(px + 2, py + 3 + k * 3, px + 13, py + 3 + k * 3); } }
    if (rng() < 0.5) { g.fillStyle(GOLD, 1); g.fillCircle(px + 12, py + 13, 2.4); }
    else { g.lineStyle(1.5, ROUGE, 0.85); g.strokeRect(px + 3, py + 9, 10, 5); }
  }
  // SEIZED — a red-bordered notice across the middle.
  g.fillStyle(LIME_LIT, 1); g.fillRect(x - 14, y - 82, 28, 22);
  g.lineStyle(2, ROUGE, 1); g.strokeRect(x - 14, y - 82, 28, 22);
  g.lineStyle(2, ROUGE, 1); g.lineBetween(x - 10, y - 71, x + 10, y - 71);
}

/**
 * The Patent Office: a severe limestone front with fluted pilasters, tall glass doors (Clarity —
 * you can see the clerks at their ledgers), a pediment with the Despot's sunburst, and brass
 * letters along the frieze.
 */
export function patentOffice(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.1, 28, 0.28);
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? LIME : LIME_LIT, 1); g.fillRect(x0 - 10 - k * 6, y - 14 + k * 5, w + 20 + k * 12, 6); }
  // Wall.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, y - h - 14, w, h);
  g.fillStyle(LIME, 1); g.fillRect(x0 + 2, y - h - 14, w - 4, h - 2);
  // Glass windows between pilasters: clerks at desks inside.
  const bays = 5;
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x0 + i * bw;
    const door = i === 2;
    const wy = door ? y - 14 - h * 0.72 : y - 14 - h * 0.78;
    const wh = door ? h * 0.72 : h * 0.5;
    g.fillStyle(0xa8c6c8, 1); g.fillRect(bx + 10, wy, bw - 20, wh);
    if (!door) {
      // A clerk at a ledger, seen through the glass.
      g.fillStyle(OAK_DARK, 0.8); g.fillRect(bx + 14, wy + wh - 12, bw - 28, 6);
      g.fillStyle(0x3a3a44, 0.7); g.fillCircle(bx + bw / 2, wy + wh - 22, 6); g.fillRect(bx + bw / 2 - 6, wy + wh - 18, 12, 8);
    }
    g.fillStyle(GLASS_LIT, 0.4); g.fillRect(bx + 13, wy + 3, 3, wh - 6);
    g.lineStyle(2, BRASS_DARK, 1); g.strokeRect(bx + 10, wy, bw - 20, wh);
    if (door) { g.lineBetween(bx + bw / 2, wy, bx + bw / 2, wy + wh); g.fillStyle(BRASS, 1); g.fillCircle(bx + bw / 2 - 4, wy + wh * 0.55, 2); g.fillCircle(bx + bw / 2 + 4, wy + wh * 0.55, 2); }
    // Pilaster.
    g.fillStyle(LIME_LIT, 1); g.fillRect(bx - 5, y - h - 14, 10, h);
    for (let k = -1; k <= 1; k++) { g.lineStyle(1, LIME_DARK, 0.6); g.lineBetween(bx + k * 3, y - h - 8, bx + k * 3, y - 18); }
  }
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 + w - 5, y - h - 14, 10, h);
  // Frieze with brass lettering (a row of little bars), then the pediment.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 8, y - h - 30, w + 16, 18);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 - 8, y - h - 30, w + 16, 4);
  for (let k = 0; k < 18; k++) { g.fillStyle(BRASS, 0.9); g.fillRect(x - 90 + k * 10, y - h - 23, 6, 7); }
  g.fillStyle(LIME_DARK, 1); g.fillTriangle(x0 - 12, y - h - 30, x0 + w + 12, y - h - 30, x, y - h - 82);
  g.fillStyle(LIME, 1); g.fillTriangle(x0 - 2, y - h - 33, x0 + w + 2, y - h - 33, x, y - h - 76);
  sunburst(g, x, y - h - 50, 9);
  g.fillStyle(GOLD, 1); g.fillRect(x - 3, y - h - 86, 6, 6);
  // Sun-faded notices pasted by the door.
  for (let k = 0; k < 3; k++) { g.fillStyle(rng() < 0.5 ? LIME_LIT : lit(BLUEPRINT, 0.5), 0.9); g.fillRect(x + w * 0.12 + k * 12, y - 60 - rng() * 10, 9, 12); }
}

/**
 * An automaton stall: an oak counter under a *glass* awning (cloth awnings make shade — banned),
 * with a clockwork figure on the counter and wares laid out. `kind` picks the figure; its moving
 * arm is drawn per frame by `automatonArm`.
 */
export type AutomatonKind = 'bird' | 'scribe' | 'drummer' | 'juggler';
export function automatonStall(g: G, x: number, y: number, kind: AutomatonKind, rng: () => number): void {
  shadow(g, x, y + 2, 120, 18, 0.25);
  // Counter.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 52, y - 36, 104, 36);
  g.fillStyle(OAK, 1); g.fillRect(x - 50, y - 34, 100, 30);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, OAK_DARK, 0.5); g.lineBetween(x - 50 + k * 20, y - 34, x - 50 + k * 20, y - 4); }
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 54, y - 40, 108, 6);
  // Posts and the glass awning (a sloped pane catching the sun — no shade under it at all).
  g.fillStyle(IRON, 1); g.fillRect(x - 54, y - 100, 4, 64); g.fillRect(x + 50, y - 100, 4, 64);
  g.fillStyle(GLASS, 0.5);
  g.fillPoints([{ x: x - 62, y: y - 96 }, { x: x + 62, y: y - 96 }, { x: x + 56, y: y - 114 }, { x: x - 56, y: y - 114 }], true);
  g.lineStyle(1.5, IRON, 1); for (let k = 0; k <= 4; k++) g.lineBetween(x - 62 + k * 31, y - 96, x - 56 + k * 28, y - 114);
  g.fillStyle(GLASS_LIT, 0.5); g.fillRect(x - 40, y - 108, 30, 3);
  // Wares: gears, springs, a key.
  for (let k = 0; k < 3; k++) gear(g, x + 14 + k * 12, y - 44, 4 + (k % 2) * 2, 8, k % 2 ? BRASS : COPPER, 1, rng() * 3);
  g.lineStyle(1.5, IRON_LIT, 1); for (let k = 0; k < 5; k++) g.strokeEllipse(x - 40 + k * 3, y - 45, 4, 6);
  // The figure's body (its arm moves in `automatonArm`).
  const fx = x - 18, fy = y - 40;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(fx - 8, fy - 6, 16, 6);
  switch (kind) {
    case 'bird':
      g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(fx, fy - 6, fx, fy - 26);
      g.fillStyle(BRASS, 1); g.fillEllipse(fx, fy - 32, 18, 12);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(fx + 7, fy - 37, 5);
      g.fillStyle(SOOT, 1); g.fillCircle(fx + 8, fy - 38, 1.2);
      g.fillStyle(COPPER, 1); g.fillTriangle(fx + 11, fy - 37, fx + 16, fy - 36, fx + 11, fy - 35);
      break;
    case 'scribe':
      g.fillStyle(BRASS, 1); g.fillRect(fx - 6, fy - 26, 12, 20);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(fx, fy - 32, 6);
      g.fillStyle(SOOT, 1); g.fillCircle(fx - 2, fy - 33, 1); g.fillCircle(fx + 2, fy - 33, 1);
      g.fillStyle(LIME_LIT, 1); g.fillRect(fx + 6, fy - 8, 12, 6);
      break;
    case 'drummer':
      g.fillStyle(COPPER, 1); g.fillRect(fx - 6, fy - 24, 12, 18);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(fx, fy - 30, 6);
      g.fillStyle(ROUGE, 1); g.fillRect(fx - 8, fy - 36, 16, 3);
      g.fillStyle(LIME_LIT, 1); g.fillEllipse(fx + 12, fy - 6, 14, 5);
      g.fillStyle(ROUGE, 1); g.fillRect(fx + 5, fy - 6, 14, 5);
      break;
    case 'juggler':
      g.fillStyle(BRASS, 1); g.fillTriangle(fx - 8, fy - 6, fx + 8, fy - 6, fx, fy - 28);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(fx, fy - 32, 6);
      g.fillStyle(GOLD, 1); g.fillTriangle(fx - 6, fy - 36, fx + 6, fy - 36, fx, fy - 46);
      break;
  }
  // A wind-up key in its back.
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(fx - 8, fy - 18, fx - 14, fy - 18);
  g.lineStyle(1.5, BRASS, 1); g.strokeEllipse(fx - 16, fy - 21, 4, 6); g.strokeEllipse(fx - 16, fy - 15, 4, 6);
}

/** The moving part of a stall's automaton — per frame. */
export function automatonArm(g: G, x: number, y: number, kind: AutomatonKind, t: number): void {
  const fx = x - 18, fy = y - 40;
  switch (kind) {
    case 'bird': {
      const flap = Math.sin(t * 8) * 0.6;
      g.fillStyle(BRASS_LIT, 1);
      g.fillTriangle(fx - 2, fy - 32, fx - 14, fy - 32 - flap * 12, fx - 8, fy - 26);
      if (Math.sin(t * 1.3) > 0.8) { g.lineStyle(1, GOLD, 0.7); g.strokeCircle(fx + 20, fy - 44, 3 + (t * 10) % 4); }
      break;
    }
    case 'scribe': {
      const k = (t * 1.5) % 1;
      g.lineStyle(2, BRASS, 1); g.lineBetween(fx + 4, fy - 20, fx + 8 + k * 8, fy - 9);
      g.lineStyle(1, BLUEPRINT_DARK, 1); g.lineBetween(fx + 8, fy - 5, fx + 8 + k * 8, fy - 5);
      break;
    }
    case 'drummer': {
      const a = Math.abs(Math.sin(t * 6));
      g.lineStyle(2, BRASS, 1); g.lineBetween(fx + 5, fy - 18, fx + 12, fy - 10 - a * 8);
      g.lineBetween(fx + 5, fy - 18, fx + 16, fy - 12 - (1 - a) * 8);
      break;
    }
    case 'juggler': {
      for (let i = 0; i < 3; i++) {
        const p = (t * 1.2 + i / 3) % 1;
        const bx = fx - 10 + p * 20, by = fy - 48 - Math.sin(p * Math.PI) * 18;
        g.fillStyle([GOLD, COPPER_LIT, CYAN][i], 1); g.fillCircle(bx, by, 2.4);
      }
      break;
    }
  }
}

/**
 * Prince Artifex's atelier: a tall glass-and-iron workshop with a ribbed dome, its front all glass
 * (Clarity). Through it you see the Magnum Opus — the half-built walking armature of mirror and
 * brass in its scaffold — and the drafting gallery round the walls. Two brass orreries flank the
 * door, and the dome is crowned with a lens that throws a burning dot onto the forecourt.
 */
export function atelier(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 8, w * 1.08, 36, 0.3);
  // Plinth.
  g.fillStyle(LIME_DEEP, 1); g.fillRect(x0 - 12, y - 24, w + 24, 24);
  g.fillStyle(LIME, 1); g.fillRect(x0 - 10, y - 28, w + 20, 18);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 - 10, y - 28, w + 20, 3);
  const wallTop = y - 28 - h;
  // Interior seen through the glass: a dim hall, the armature in its scaffold.
  g.fillStyle(0x5c6870, 1); g.fillRect(x0, wallTop, w, h);
  g.fillStyle(0x6e7c84, 1); g.fillRect(x0, y - 28 - h * 0.25, w, h * 0.25);
  // Gallery of blueprints round the walls.
  for (let i = 0; i < w / 46; i++) blueprintSheet(g, x0 + 24 + i * 46, wallTop + 30, 30, 20, i, 0.8);
  // The armature: two great legs of brass with mirror plates, a hollow chest with a lens.
  const ax = x, ay = y - 30;
  for (const k of [-1, 1]) {
    g.lineStyle(10, BRASS_DARK, 1); g.lineBetween(ax + k * 30, ay - 70, ax + k * 44, ay - 6);
    g.lineStyle(6, BRASS, 1); g.lineBetween(ax + k * 30, ay - 70, ax + k * 44, ay - 6);
    g.fillStyle(MIRROR, 1); g.fillRect(ax + k * 37 - 8, ay - 52, 16, 22);
    g.fillStyle(GLASS_LIT, 0.6); g.fillTriangle(ax + k * 37 - 8, ay - 34, ax + k * 37 + 8, ay - 52, ax + k * 37 + 8, ay - 46);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(ax + k * 46, ay - 4, 30, 10);
    gear(g, ax + k * 30, ay - 72, 9, 10, BRASS, 1, k);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(ax - 46, ay - 150, 92, 80, 14);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(ax - 42, ay - 146, 84, 72, 12);
  g.lineStyle(2, BRASS_DARK, 1); for (let k = 1; k < 4; k++) g.lineBetween(ax - 42, ay - 146 + k * 18, ax + 42, ay - 146 + k * 18);
  lens(g, ax, ay - 112, 18);
  // Unfinished: one arm is only a frame, the other a stub; mirror plates stacked waiting.
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(ax - 44, ay - 136, ax - 86, ay - 110); g.lineBetween(ax - 86, ay - 110, ax - 90, ay - 70);
  g.lineStyle(1.5, BRASS, 1); g.strokeRect(ax - 96, ay - 112, 14, 40);
  g.fillStyle(BRASS, 1); g.fillCircle(ax + 48, ay - 134, 8);
  // Scaffold round it.
  g.lineStyle(2, OAK_DARK, 1);
  for (const sx of [ax - 110, ax + 110]) { g.lineBetween(sx, ay, sx, ay - 170); }
  for (let k = 0; k < 4; k++) g.lineBetween(ax - 110, ay - 40 - k * 40, ax + 110, ay - 40 - k * 40);
  g.lineBetween(ax - 110, ay, ax - 60, ay - 160); g.lineBetween(ax + 110, ay, ax + 60, ay - 160);
  // The glass front over it all, iron glazing bars.
  g.fillStyle(GLASS, 0.32); g.fillRect(x0, wallTop, w, h);
  const bays = Math.round(w / 48);
  const bw = w / bays;
  for (let i = 0; i <= bays; i++) {
    const bx = x0 + i * bw;
    g.fillStyle(IRON_DARK, 1); g.fillRect(bx - 3, wallTop, 6, h);
    g.fillStyle(IRON_LIT, 1); g.fillRect(bx - 1, wallTop, 2, h);
  }
  for (const yy of [wallTop + h * 0.3, wallTop + h * 0.62]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x0, yy - 2, w, 4); }
  for (let i = 0; i < bays; i += 2) { g.fillStyle(GLASS_LIT, 0.4); g.fillRect(x0 + i * bw + 6, wallTop + 6, 3, h * 0.24); }
  // Cornice, then the ribbed glass dome and its crowning lens.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 8, wallTop - 12, w + 16, 12);
  g.fillStyle(BRASS, 1); g.fillRect(x0 - 8, wallTop - 14, w + 16, 4);
  const dr = Math.min(130, w * 0.24);
  const dy = wallTop - 14;
  g.fillStyle(0x6e7c84, 1); g.fillEllipse(x, dy, dr * 2, dr * 1.6);
  g.fillStyle(GLASS, 0.45); g.fillEllipse(x, dy, dr * 2, dr * 1.6);
  g.fillStyle(0x5c6870, 1); g.fillRect(x - dr - 2, dy, dr * 2 + 4, dr * 0.85);
  g.fillStyle(LIME, 1); g.fillRect(x0 - 8, dy - 2, w + 16, 6);
  g.lineStyle(2.5, IRON_DARK, 1);
  g.beginPath(); g.arc(x, dy, dr, Math.PI, 0, false); g.strokePath();
  for (let k = 1; k < 8; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    g.lineBetween(x + Math.cos(a) * dr, dy + Math.sin(a) * dr * 0.8, x, dy - dr * 0.8);
  }
  g.lineStyle(1.5, IRON_DARK, 0.9); g.strokeEllipse(x, dy - dr * 0.42, dr * 1.5, dr * 0.32);
  g.fillStyle(GLASS_LIT, 0.4); g.fillEllipse(x - dr * 0.45, dy - dr * 0.4, dr * 0.3, dr * 0.5);
  // The crowning lens in its brass ring, on a little lantern.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 10, dy - dr * 0.8 - 22, 20, 22);
  lens(g, x, dy - dr * 0.8 - 34, 14);
  // Two orreries flanking the steps.
  for (const k of [-1, 1]) orrery(g, x + k * (w / 2 - 30), y - 28, rng);
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? LIME : LIME_LIT, 1); g.fillRect(x - 60 - k * 8, y - 10 + k * 4, 120 + k * 16, 5); }
}

/** A brass orrery on a plinth: rings and little planets — the sun, gilt, in the middle (it never moves). */
export function orrery(g: G, x: number, y: number, rng: () => number): void {
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 12, y - 30, 24, 30);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x - 14, y - 34, 28, 5);
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x, y - 34, x, y - 56);
  for (const [rx, ry, tilt] of [[22, 8, 0], [16, 12, 0.5]] as [number, number, number][]) {
    g.lineStyle(1.5, BRASS, 1); g.strokeEllipse(x, y - 64, rx * 2, ry * 2);
    if (tilt) { g.lineStyle(1, BRASS_LIT, 0.6); g.strokeEllipse(x, y - 64, ry * 2, rx * 2); }
  }
  sunburst(g, x, y - 64, 4);
  for (let k = 0; k < 3; k++) {
    const a = rng() * Math.PI * 2;
    g.fillStyle([CYAN, COPPER_LIT, MIRROR][k], 1); g.fillCircle(x + Math.cos(a) * 22, y - 64 + Math.sin(a) * 8, 2.5);
  }
}

/**
 * A rack of new mirror panes waiting for the crane: an oak A-frame with six panes leaning, straw
 * packing, and an inspector's chalk tick on the ones that passed.
 */
export function mirrorRack(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 120, 18, 0.25);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 56, y - 8, 112, 8);
  g.lineStyle(4, OAK_DARK, 1); g.lineBetween(x - 50, y - 6, x - 30, y - 80); g.lineBetween(x + 50, y - 6, x + 30, y - 80);
  g.lineStyle(3, OAK, 1); g.lineBetween(x - 30, y - 80, x + 30, y - 80);
  for (let i = 0; i < 5; i++) {
    const px = x - 40 + i * 20;
    mirrorPane(g, px, y - 8, 18, 60 - (i % 2) * 6, 0.2 + rng() * 0.5);
    if (rng() < 0.6) { g.lineStyle(1.5, LIME_LIT, 1); g.lineBetween(px - 4, y - 40, px - 1, y - 36); g.lineBetween(px - 1, y - 36, px + 5, y - 46); }
  }
  for (let k = 0; k < 10; k++) { g.lineStyle(1, GOLD, 0.6); g.lineBetween(x - 54 + rng() * 108, y - 4, x - 54 + rng() * 108, y - 10); }
}

/** A great lens on a brass stand, tilted at the sky (it throws a burning dot — see `lensDot`). */
export function lensStand(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 50 * s, 12 * s, 0.25);
  g.lineStyle(3 * s, BRASS_DARK, 1);
  g.lineBetween(x, y - 4, x - 16 * s, y); g.lineBetween(x, y - 4, x + 16 * s, y); g.lineBetween(x, y - 4, x, y - 50 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 50 * s, 4 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 72 * s, 50 * s, 40 * s);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - 73 * s, 46 * s, 37 * s);
  g.fillStyle(GLASS, 0.9); g.fillEllipse(x, y - 73 * s, 38 * s, 30 * s);
  g.fillStyle(GLASS_LIT, 0.8); g.fillEllipse(x - 8 * s, y - 80 * s, 16 * s, 7 * s);
  g.fillStyle(GLASS_EDGE, 0.4); g.fillEllipse(x + 6 * s, y - 68 * s, 18 * s, 12 * s);
}

/** The burning dot a lens stand throws on the flags, wandering a little as the sun-mirrors tick — per frame. */
export function lensDot(g: G, x: number, y: number, t: number): void {
  const dx = x + Math.sin(t * 0.3) * 6, dy = y + Math.cos(t * 0.23) * 4;
  glow(g, dx, dy, 14, SUN, 0.07, 3);
  g.fillStyle(HEAT_WHITE, 0.85); g.fillCircle(dx, dy, 3);
  g.fillStyle(SOOT, 0.25); g.fillCircle(dx + 2, dy + 2, 5);
  if (Math.sin(t * 3 + x) > 0.85) { g.lineStyle(1, SOOT, 0.4); g.lineBetween(dx, dy - 4, dx + 2, dy - 12); }
}

/** A heavy workbench: oak top, a vice, a rack of files and a brass lamp-lens on an arm. */
export function workbench(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 100, 16, 0.25);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 44, y - 30, 6, 30); g.fillRect(x + 38, y - 30, 6, 30);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 48, y - 38, 96, 10);
  g.fillStyle(OAK, 1); g.fillRect(x - 48, y - 40, 96, 8);
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 48, y - 40, 96, 2);
  // Vice.
  g.fillStyle(IRON, 1); g.fillRect(x - 46, y - 50, 14, 12);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 50, y - 46, 4, 3);
  // Files hanging on a rack at the back.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 20, y - 70, 50, 4);
  for (let k = 0; k < 6; k++) { g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 16 + k * 8, y - 66, x - 16 + k * 8, y - 50 - rng() * 6); }
  // Scatter of parts.
  for (let k = 0; k < 4; k++) gear(g, x - 10 + k * 12, y - 42, 3 + rng() * 2, 8, rng() < 0.5 ? BRASS : COPPER, 1, rng() * 3);
  // The bench lens on its jointed arm.
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x + 40, y - 40, x + 30, y - 74); g.lineBetween(x + 30, y - 74, x + 12, y - 70);
  lens(g, x + 8, y - 68, 6);
}

/**
 * A sculptor's plinth with a half-made clay figure on it: a rough lump with the start of shoulders,
 * a wire armature showing through, a turntable, and modelling tools stuck in the clay.
 */
export function clayFigure(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 60 * s, 14 * s, 0.3);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 24 * s, y - 20 * s, 48 * s, 20 * s);
  g.fillStyle(OAK, 1); g.fillRect(x - 22 * s, y - 22 * s, 44 * s, 6 * s);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 22 * s, 40 * s, 8 * s);
  // Wire armature.
  g.lineStyle(1.5, IRON_LIT, 0.9);
  g.lineBetween(x, y - 22 * s, x, y - 96 * s); g.lineBetween(x - 20 * s, y - 70 * s, x + 20 * s, y - 70 * s);
  g.lineBetween(x + 20 * s, y - 70 * s, x + 28 * s, y - 50 * s);
  // Clay lumps over it.
  for (let i = 0; i < 9; i++) {
    const ly = y - 28 * s - i * 6 * s;
    const lw = (26 - Math.abs(i - 5) * 2.5) * s;
    g.fillStyle(i % 2 ? CLAY : CLAY_DARK, 1); g.fillEllipse(x + (rng() - 0.5) * 4, ly, lw, 10 * s);
  }
  g.fillStyle(CLAY, 1); g.fillEllipse(x - 14 * s, y - 70 * s, 16 * s, 12 * s);
  g.fillStyle(CLAY_LIT, 0.7); g.fillEllipse(x - 6 * s, y - 60 * s, 10 * s, 18 * s);
  g.fillStyle(CLAY_DARK, 1); g.fillCircle(x, y - 88 * s, 8 * s);
  // Tools stuck in.
  g.lineStyle(1.5, OAK_LIT, 1); g.lineBetween(x + 6 * s, y - 50 * s, x + 16 * s, y - 62 * s);
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x - 8 * s, y - 40 * s, x - 18 * s, y - 46 * s);
}

/**
 * A cullet bin: a slatted oak bin of broken glass for remelting, glittering, with a shovel stood in
 * it. Glassblowers' yards have a dozen.
 */
export function culletBin(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 50, 10, 0.22);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 22, y - 26, 44, 26);
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? OAK : OAK_LIT, 1); g.fillRect(x - 21, y - 25 + k * 6, 42, 4); }
  for (let i = 0; i < 18; i++) {
    const cx = x - 18 + rng() * 36, cy = y - 28 - rng() * 6;
    g.fillStyle(rng() < 0.3 ? GLASS_LIT : rng() < 0.5 ? 0x8ad0c8 : GLASS, 0.9);
    g.fillTriangle(cx, cy, cx + 4, cy - 3, cx + 2, cy + 3);
  }
  g.lineStyle(2, OAK_DARK, 1); g.lineBetween(x + 10, y - 30, x + 20, y - 58);
  g.fillStyle(IRON, 1); g.fillRect(x + 4, y - 34, 10, 8);
}

/**
 * A gilt statue of the Despot at the yard gate, done in Workshop style — a brass figure on a
 * limestone plinth whose head is a polished parabolic mirror. It is aimed: the plinth plate says
 * "SO THAT NOTHING IN THE WORKSHOP IS EVER MADE IN THE DARK".
 */
export function mirrorStatue(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 16, 0.3);
  g.fillStyle(LIME_DEEP, 1); g.fillRect(x - 26, y - 40, 52, 40);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x - 30, y - 44, 60, 6);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 14, y - 30, 28, 10);
  g.fillStyle(GOLD, 0.9); g.fillRect(x - 12, y - 28, 24, 6);
  // Robe, arms raised.
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 18, y - 44, x + 18, y - 44, x, y - 110);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 14, y - 44, x + 12, y - 44, x - 1, y - 106);
  g.lineStyle(5, BRASS, 1); g.lineBetween(x - 6, y - 96, x - 28, y - 126); g.lineBetween(x + 6, y - 96, x + 28, y - 126);
  // The mirror head: a dish with a sunburst rim.
  sunburst(g, x, y - 124, 13);
  g.fillStyle(MIRROR_DARK, 1); g.fillCircle(x, y - 124, 13);
  g.fillStyle(MIRROR, 1); g.fillCircle(x, y - 124, 11);
  g.fillStyle(GLASS_LIT, 0.9); g.fillEllipse(x - 3, y - 128, 9, 5);
}

/** A steam plume rising off the quench tank — per frame, cheap. */
export function steamPlumes(g: G, r: Rect, t: number, view: Rect): void {
  if (r.x > view.x + view.w || r.x + r.w < view.x || r.y - 160 > view.y + view.h || r.y + r.h < view.y) return;
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.22 + i * 0.137) % 1;
    const bx = r.x + 30 + ((i * 97) % (r.w - 60));
    const x = bx + Math.sin(t * 0.8 + i) * 12 * ph;
    const y = r.y + r.h * 0.5 - ph * 150;
    g.fillStyle(STEAM, 0.22 * Math.sin(ph * Math.PI));
    g.fillCircle(x, y, 14 + ph * 26);
  }
}

/** Grinding sparks off a wheel, and the wheel's spokes going round — per frame. */
export function wheelSparks(g: G, x: number, y: number, t: number, seed: number): void {
  const wx = x - 6, wy = y - 33;
  const a = t * 6 + seed;
  g.lineStyle(1.5, LIME_DEEP, 0.9);
  for (let k = 0; k < 3; k++) { const b = a + (k / 3) * Math.PI * 2; g.lineBetween(wx, wy, wx + Math.cos(b) * 12, wy + Math.sin(b) * 12); }
  if (Math.sin(t * 2.3 + seed) > -0.2) {
    for (let i = 0; i < 5; i++) {
      const p = ((t * 3 + i * 0.21 + seed) % 1);
      const sx = wx + 14 + p * 22, sy = wy - 4 - Math.sin(p * Math.PI) * 14 + p * 10;
      g.fillStyle(i % 2 ? MOLTEN_LIT : HEAT_WHITE, 1 - p); g.fillCircle(sx, sy, 1.2);
    }
  }
}

/** Rainbow caustics on the floor where a lens or a pane splits the noon — per frame. */
export function caustics(g: G, x: number, y: number, r: number, t: number, seed: number): void {
  const cols = [0xff6a6a, 0xffb84a, 0xfff06a, 0x7aff8a, 0x6ad0ff, 0xa87aff];
  for (let i = 0; i < 6; i++) {
    const a = seed + i * 1.05 + Math.sin(t * 0.4 + seed) * 0.3;
    const d = r * (0.4 + 0.3 * Math.sin(t * 0.9 + i + seed));
    g.fillStyle(cols[i], 0.16 + 0.08 * Math.sin(t * 2 + i));
    g.fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 14, 4);
  }
}

/** A heap of coal for the furnaces, black and glinting. */
export function coalHeap(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 14, 0.25);
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI, d = rng() * 30;
    g.fillStyle(rng() < 0.2 ? IRON : SOOT, 1);
    g.fillCircle(x + Math.cos(a) * d * 1.2 - 0, y - Math.sin(a) * d * 0.7, 4 + rng() * 3);
  }
  for (let i = 0; i < 6; i++) { g.fillStyle(IRON_LIT, 0.6); g.fillCircle(x - 20 + rng() * 40, y - 6 - rng() * 14, 1); }
}

/** Cheap check: is a piece's box inside the camera view (with margin)? */
export function inView(view: Rect, x: number, y: number, m = 200): boolean {
  return x > view.x - m && x < view.x + view.w + m && y > view.y - m && y < view.y + view.h + m;
}

/** A bright glint of reflected noon — a four-point star that blooms and fades. */
export function glint(g: G, x: number, y: number, k: number, size = 10, color = 0xffffff): void {
  if (k <= 0) return;
  g.fillStyle(color, k);
  g.fillTriangle(x - size * k, y, x + size * k, y, x, y - 1.5);
  g.fillTriangle(x - size * k, y, x + size * k, y, x, y + 1.5);
  g.fillTriangle(x, y - size * k, x, y + size * k, x - 1.5, y);
  g.fillTriangle(x, y - size * k, x, y + size * k, x + 1.5, y);
  g.fillStyle(color, k * 0.5); g.fillCircle(x, y, 2.5 * k);
}

/**
 * A workshop front along the court's edge: a limestone house under a sawtooth roof of glass
 * north-lights (every tooth glazed toward the sun), a wide glazed shop door, a hanging trade sign
 * (a lens, a gear, a flask) and a chimney or two.
 */
export function sawtoothShop(g: G, x: number, y: number, w: number, h: number, sign: 'lens' | 'gear' | 'flask', rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.08, 22, 0.25);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 2, y - h - 2, w + 4, h + 2);
  g.fillStyle(LIME, 1); g.fillRect(x0, y - h, w, h);
  // Ashlar courses.
  for (let yy = y - h + 14; yy < y; yy += 14) { g.lineStyle(1, LIME_DARK, 0.45); g.lineBetween(x0, yy, x0 + w, yy); }
  for (let i = 0; i < (w * h) / 500; i++) { g.fillStyle(SOOT, 0.06 + rng() * 0.06); g.fillCircle(x0 + rng() * w, y - h + rng() * h * 0.5, 3 + rng() * 6); }
  // Sawtooth glass roof.
  const teeth = Math.max(2, Math.round(w / 46));
  const tw = w / teeth;
  for (let i = 0; i < teeth; i++) {
    const tx = x0 + i * tw;
    g.fillStyle(IRON, 1); g.fillTriangle(tx, y - h, tx + tw, y - h, tx + tw, y - h - 30);
    g.fillStyle(GLASS, 0.75); g.fillTriangle(tx + 2, y - h, tx + tw - 2, y - h, tx + tw - 2, y - h - 27);
    g.fillStyle(GLASS_LIT, 0.55); g.fillTriangle(tx + tw * 0.45, y - h - 2, tx + tw - 3, y - h - 2, tx + tw - 3, y - h - 16);
    g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(tx + tw, y - h, tx + tw, y - h - 30);
  }
  // Glazed shop door and two windows (Clarity: no curtains — you see the benches inside).
  const dw = Math.min(56, w * 0.3);
  g.fillStyle(0x9ab8ba, 1); g.fillRect(x - dw / 2, y - h * 0.7, dw, h * 0.7);
  g.fillStyle(OAK_DARK, 0.6); g.fillRect(x - dw / 2 + 4, y - 18, dw - 8, 5);
  g.lineStyle(2, BRASS_DARK, 1); g.strokeRect(x - dw / 2, y - h * 0.7, dw, h * 0.7); g.lineBetween(x, y - h * 0.7, x, y);
  for (const k of [-1, 1]) {
    const wx = x + k * (dw / 2 + (w / 2 - dw / 2) / 2);
    const ww = Math.min(44, (w / 2 - dw / 2) * 0.7);
    g.fillStyle(0x9ab8ba, 1); g.fillRect(wx - ww / 2, y - h * 0.75, ww, h * 0.4);
    g.fillStyle(GLASS_LIT, 0.4); g.fillRect(wx - ww / 2 + 3, y - h * 0.75 + 3, 3, h * 0.34);
    g.lineStyle(1.5, BRASS_DARK, 1); g.strokeRect(wx - ww / 2, y - h * 0.75, ww, h * 0.4);
    g.lineBetween(wx, y - h * 0.75, wx, y - h * 0.35);
  }
  // Trade sign on a bracket.
  const sx = x + dw / 2 + 18, sy = y - h * 0.8;
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x + dw / 2 + 2, sy - 12, sx + 10, sy - 12);
  g.lineBetween(sx, sy - 12, sx, sy - 6);
  if (sign === 'lens') lens(g, sx, sy + 4, 8);
  else if (sign === 'gear') gear(g, sx, sy + 4, 8, 10, BRASS, 1, 0.3);
  else {
    g.fillStyle(GLASS, 0.9); g.fillCircle(sx, sy + 8, 8); g.fillRect(sx - 3, sy - 6, 6, 8);
    g.fillStyle(MOLTEN, 0.8); g.fillCircle(sx, sy + 10, 5);
  }
  // Chimney.
  const cx = x0 + w * (0.2 + rng() * 0.6);
  g.fillStyle(LIME_DARK, 1); g.fillRect(cx - 7, y - h - 50, 14, 30);
  g.fillStyle(SOOT, 1); g.fillRect(cx - 8, y - h - 54, 16, 6);
}
