import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Rect } from '../../../../IslesTypes';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CANVAS, CANVAS_DARK, CLEAR, CLEAR_EDGE, DUSK, DUSK_LIT, FISH_SHADE, GLASS,
  GLASS_DEEP, GLASS_EDGE, GLASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, GROUT, HEDGE, HEDGE_DARK, IRON, IRON_DARK, IRON_LIT,
  LIME, LIME_DARK, LIME_LIT, MADDER, MARBLE, MARBLE_DARK, MARBLE_DEEP, MARBLE_LIT, POOL, POOL_DEEP, POOL_GLINT,
  PRISM_BLUE, SAFFRON, SCORCH, SCORCH_DARK, SPECTRUM, STRAW, STRAW_DARK, VEIN,
} from './palette';

/**
 * Noon set pieces — the shapes only a court with no shadows has. Everything is drawn *lit from
 * straight overhead*: shadows are tight little pools directly under things (never cast to one
 * side), every top surface is the brightest face, every glass pane has a white sky in it, and
 * gold catches a hot highlight on its upper edge. Where the Despot's law shows — a shutter
 * nailed open, a curtain rail with no curtain, an awning frame stripped of its canvas, a Clear
 * you can see the paving through — it is drawn as carefully as the gilding.
 */

// ── Small helpers ────────────────────────────────────────────────────

/** A noon shadow: a tight dark pool straight under the thing, barely wider than its foot. */
export function noonShadow(g: G, x: number, y: number, w: number, a = 0.22): void {
  shadow(g, x, y + 1, w, w * 0.22, a);
}

/** A four-point glint, the sun catching an edge. */
export function glint(g: G, x: number, y: number, r: number, a = 1): void {
  g.fillStyle(0xffffff, a);
  g.fillTriangle(x - r, y, x + r, y, x, y - r * 0.18);
  g.fillTriangle(x - r, y, x + r, y, x, y + r * 0.18);
  g.fillTriangle(x, y - r, x, y + r, x - r * 0.18, y);
  g.fillTriangle(x, y - r, x, y + r, x + r * 0.18, y);
  g.fillCircle(x, y, r * 0.18);
}

/** A sunburst: gold rays round a disc — the Despot's mark, on everything. */
export function sunburst(g: G, x: number, y: number, r: number, rays = 12, a = 1, color = GOLD): void {
  for (let i = 0; i < rays; i++) {
    const t = (i / rays) * Math.PI * 2;
    const long = i % 2 === 0 ? 1 : 0.68;
    const w = (Math.PI / rays) * 0.55;
    g.fillStyle(i % 2 ? dim(color, 0.12) : color, a);
    g.fillTriangle(
      x + Math.cos(t - w) * r * 0.42, y + Math.sin(t - w) * r * 0.42,
      x + Math.cos(t + w) * r * 0.42, y + Math.sin(t + w) * r * 0.42,
      x + Math.cos(t) * r * long, y + Math.sin(t) * r * long,
    );
  }
  g.fillStyle(dim(color, 0.25), a); g.fillCircle(x, y, r * 0.46);
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.42);
  g.fillStyle(lit(color, 0.5), a * 0.8); g.fillCircle(x - r * 0.12, y - r * 0.14, r * 0.18);
}

/** A sunburst laid flat into the paving: gold strips set in marble, seen from above. */
export function sunburstInlay(g: G, x: number, y: number, r: number, rays = 16, squash = 0.62, a = 0.85): void {
  for (let i = 0; i < rays; i++) {
    const t = (i / rays) * Math.PI * 2;
    const long = i % 2 === 0 ? 1 : 0.62;
    const w = (Math.PI / rays) * 0.32;
    g.fillStyle(i % 2 ? GOLD_DARK : GOLD, a * (i % 2 ? 0.7 : 1));
    g.fillTriangle(
      x + Math.cos(t - w) * r * 0.3, y + Math.sin(t - w) * r * 0.3 * squash,
      x + Math.cos(t + w) * r * 0.3, y + Math.sin(t + w) * r * 0.3 * squash,
      x + Math.cos(t) * r * long, y + Math.sin(t) * r * long * squash,
    );
  }
  g.lineStyle(3, GOLD_DARK, a); g.strokeEllipse(x, y, r * 0.62, r * 0.62 * squash);
  g.lineStyle(1.5, GOLD_LIT, a); g.strokeEllipse(x, y - 1, r * 0.62, r * 0.62 * squash);
}

// ── Ground ───────────────────────────────────────────────────────────

/** Great polished marble slabs, each a slightly different white, with faint grey veins. */
export function marbleSlabs(g: G, r: Rect, size: number, rng: () => number, tone = MARBLE): void {
  g.fillStyle(GROUT, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += size) {
    const off = (Math.floor((y - r.y) / size) % 2) * size * 0.5;
    for (let x = r.x - off; x < r.x + r.w; x += size) {
      const x0 = Math.max(r.x, x + 1.5), y0 = y + 1.5;
      const x1 = Math.min(r.x + r.w, x + size - 1.5), y1 = Math.min(r.y + r.h, y + size - 1.5);
      if (x1 <= x0 || y1 <= y0) continue;
      const k = rng();
      g.fillStyle(k < 0.33 ? tone : k < 0.66 ? lit(tone, 0.35) : mixC(tone, MARBLE_DARK, 0.25), 1);
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      // The polish: a bright upper edge, as the overhead sun hits it.
      g.fillStyle(MARBLE_LIT, 0.55); g.fillRect(x0, y0, x1 - x0, 2);
      // A vein or two, wandering across the slab.
      if (rng() < 0.7) {
        let vx = x0 + rng() * (x1 - x0), vy = y0;
        g.lineStyle(1, VEIN, 0.35 + rng() * 0.25);
        g.beginPath(); g.moveTo(vx, vy);
        for (let i = 0; i < 5; i++) {
          vx = Math.max(x0, Math.min(x1, vx + (rng() - 0.5) * size * 0.4));
          vy = Math.min(y1, vy + (y1 - y0) / 5);
          g.lineTo(vx, vy);
        }
        g.strokePath();
      }
    }
  }
}

/** A limestone kerb round a rect: the step up from street to terrace. */
export function kerb(g: G, r: Rect): void {
  g.lineStyle(6, LIME_DARK, 1); g.strokeRect(r.x, r.y, r.w, r.h);
  g.lineStyle(3, LIME_LIT, 1); g.strokeRect(r.x - 1, r.y - 1, r.w, r.h);
}

/**
 * The bleaching ring under the Burning Glass: a disc of marble scorched brown-black at its heart,
 * the stone crazed by heat, two brass foot-plates where the condemned stand, and a gilt rim
 * engraved with the law. Nothing else on the plaza is dark.
 */
export function bleachRing(g: G, x: number, y: number, r: number): void {
  const sq = 0.55;
  g.fillStyle(MARBLE_DEEP, 1); g.fillEllipse(x, y, r * 2 + 16, (r * 2 + 16) * sq);
  g.fillStyle(MARBLE_DARK, 1); g.fillEllipse(x, y, r * 2 + 8, (r * 2 + 8) * sq);
  for (let i = 5; i >= 0; i--) {
    const k = i / 5;
    g.fillStyle(mixC(SCORCH_DARK, MARBLE_DARK, k), 1);
    g.fillEllipse(x, y, r * 2 * (0.2 + k * 0.8), r * 2 * (0.2 + k * 0.8) * sq);
  }
  // Crazing: the stone cracked by twenty-two years of focused noon.
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39;
    const d0 = r * 0.25, d1 = r * (0.6 + (i % 3) * 0.12);
    g.lineStyle(1, SCORCH_DARK, 0.7);
    g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0 * sq, x + Math.cos(a + 0.2) * d1, y + Math.sin(a + 0.2) * d1 * sq);
  }
  // Two brass foot-plates.
  for (const k of [-1, 1]) {
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x + k * 11, y + 2, 14, 7);
    g.fillStyle(BRASS, 1); g.fillEllipse(x + k * 11, y + 1, 12, 5);
  }
  // The gilt rim, notched like a clock.
  g.lineStyle(3, GOLD_DARK, 1); g.strokeEllipse(x, y, r * 2 + 8, (r * 2 + 8) * sq);
  g.lineStyle(1.5, GOLD_LIT, 1); g.strokeEllipse(x, y - 1, r * 2 + 8, (r * 2 + 8) * sq);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = r + 4;
    g.lineStyle(i % 6 ? 1 : 2, GOLD_DARK, 1);
    g.lineBetween(x + Math.cos(a) * rr, y + Math.sin(a) * rr * sq, x + Math.cos(a) * (rr + (i % 6 ? 4 : 8)), y + Math.sin(a) * (rr + (i % 6 ? 4 : 8)) * sq);
  }
}

/**
 * The reflecting pool: a marble basin brimful of water so bright it is nearly white, a gold
 * coping, a sunburst mosaic on the floor that you cannot see for the glare, and here and there
 * a dark fish-shape — the only shadows in the court.
 */
export function reflectingPool(g: G, r: Rect, rng: () => number): void {
  // Coping: marble, then gold, then the water.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRoundedRect(r.x - 16, r.y - 12, r.w + 32, r.h + 26, 18);
  g.fillStyle(MARBLE, 1); g.fillRoundedRect(r.x - 14, r.y - 14, r.w + 28, r.h + 24, 18);
  g.fillStyle(MARBLE_LIT, 1); g.fillRoundedRect(r.x - 14, r.y - 14, r.w + 28, 6, 4);
  g.fillStyle(GOLD_DARK, 1); g.fillRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 12);
  g.fillStyle(POOL_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 10);
  // The mosaic under the water, almost washed out.
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    g.fillStyle(GOLD, 0.16);
    g.fillTriangle(cx + Math.cos(a - 0.08) * 20, cy + Math.sin(a - 0.08) * 12, cx + Math.cos(a + 0.08) * 20, cy + Math.sin(a + 0.08) * 12,
      cx + Math.cos(a) * r.w * 0.45, cy + Math.sin(a) * r.h * 0.45);
  }
  // The surface: white, brighter toward the middle where the sun sits in it.
  for (let i = 0; i < 6; i++) {
    const k = i / 6;
    g.fillStyle(mixC(POOL_DEEP, POOL, k), 0.55);
    g.fillEllipse(cx, cy, r.w * (1 - k * 0.7), r.h * (1 - k * 0.7));
  }
  g.fillStyle(POOL_GLINT, 0.9); g.fillEllipse(cx, cy, r.w * 0.18, r.h * 0.2);
  // Ripple lines frozen in the bake (the animated ones go over).
  for (let i = 0; i < 14; i++) {
    const x = r.x + 20 + rng() * (r.w - 40), y = r.y + 12 + rng() * (r.h - 24);
    g.lineStyle(1, POOL_GLINT, 0.7); g.lineBetween(x - 10, y, x + 10, y);
  }
  // Gilt fish spouts at the corners.
  for (const [fx, fy] of [[r.x - 6, r.y - 6], [r.x + r.w + 6, r.y - 6], [r.x - 6, r.y + r.h + 6], [r.x + r.w + 6, r.y + r.h + 6]]) {
    g.fillStyle(GOLD_DARK, 1); g.fillCircle(fx, fy, 9);
    g.fillStyle(GOLD, 1); g.fillCircle(fx, fy - 1, 7);
    g.fillStyle(GOLD_LIT, 1); g.fillCircle(fx - 2, fy - 3, 2.5);
  }
}

/** A dark fish-shape under the glare — all you can see of a sunpool fish. */
export function fishShape(g: G, x: number, y: number, len: number, a: number, alpha = 0.45): void {
  const c = Math.cos(a), s = Math.sin(a);
  g.fillStyle(FISH_SHADE, alpha);
  g.fillEllipse(x, y, len * (0.6 + Math.abs(c) * 0.4), len * (0.6 + Math.abs(s) * 0.4) * 0.45);
  g.fillTriangle(x - c * len * 0.45, y - s * len * 0.45, x - c * len * 0.75 - s * len * 0.22, y - s * len * 0.75 + c * len * 0.22,
    x - c * len * 0.75 + s * len * 0.22, y - s * len * 0.75 - c * len * 0.22);
}

// ── Street furniture ─────────────────────────────────────────────────

/**
 * A sundial on a marble drum: a brass dial-plate engraved with hour marks, a gilt gnomon — and
 * its shadow, a coin-sized dot straight under the gnomon's tip, which has not moved in
 * twenty-two years. Somebody has scratched the hours off past noon.
 */
export function sundial(g: G, x: number, y: number, r: number): void {
  noonShadow(g, x, y, r * 2.2);
  // The drum.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - r * 0.7, y - r * 0.9, r * 1.4, r * 0.9);
  g.fillStyle(MARBLE, 1); g.fillRect(x - r * 0.7 + 2, y - r * 0.9, r * 1.4 - 4, r * 0.9 - 2);
  g.fillStyle(MARBLE_LIT, 0.8); g.fillRect(x - r * 0.7 + 2, y - r * 0.9, 4, r * 0.9 - 2);
  for (let k = 1; k < 4; k++) { g.lineStyle(1, VEIN, 0.6); g.lineBetween(x - r * 0.7 + (k * r * 1.4) / 4, y - r * 0.9 + 3, x - r * 0.7 + (k * r * 1.4) / 4, y - 3); }
  // The plate, seen from above at a slant.
  const py = y - r * 0.9;
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, py + 2, r * 2, r * 0.9);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, py, r * 2, r * 0.9);
  g.fillStyle(BRASS_LIT, 0.6); g.fillEllipse(x - r * 0.2, py - r * 0.12, r * 1.1, r * 0.4);
  for (let i = 0; i < 12; i++) {
    const a = Math.PI + (i / 11) * Math.PI;
    const scratched = i > 6;
    g.lineStyle(scratched ? 1 : 1.5, scratched ? BRASS_LIT : BRASS_DARK, 1);
    g.lineBetween(x + Math.cos(a) * r * 0.7, py + Math.sin(a) * r * 0.32, x + Math.cos(a) * r * 0.92, py + Math.sin(a) * r * 0.41);
    if (scratched) { g.lineStyle(1, BRASS_DARK, 0.8); g.lineBetween(x + Math.cos(a) * r * 0.66, py + Math.sin(a) * r * 0.27 - 2, x + Math.cos(a) * r * 0.95, py + Math.sin(a) * r * 0.44 + 2); }
  }
  // The gnomon: a gilt triangle standing up off the plate.
  g.fillStyle(GOLD_DARK, 1); g.fillTriangle(x - 2, py, x + r * 0.5, py, x - 2, py - r * 0.75);
  g.fillStyle(GOLD, 1); g.fillTriangle(x, py - 1, x + r * 0.46, py - 1, x, py - r * 0.7);
  g.lineStyle(1.5, GOLD_LIT, 1); g.lineBetween(x, py - r * 0.7, x + r * 0.46, py - 1);
  // Its shadow: one dark dot, right at its foot. Always.
  g.fillStyle(0x1a1410, 0.75); g.fillEllipse(x + 2, py + 1, 5, 2.5);
}

/**
 * A statue of the Despot on a stepped plinth: a robed figure in white marble, one arm raised
 * toward the pinned sun, and in place of a head a gilt sunburst with a smooth disc for a face.
 */
export function aurielStatue(g: G, x: number, y: number, s = 1): void {
  noonShadow(g, x, y, 60 * s, 0.26);
  // Plinth: three steps and a die with a gilt plaque.
  for (let k = 0; k < 3; k++) {
    const w = (58 - k * 8) * s, h = 6 * s;
    const yy = y - (k + 1) * h;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - w / 2, yy, w, h);
    g.fillStyle(MARBLE, 1); g.fillRect(x - w / 2, yy, w, h - 2);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - w / 2, yy, w, 1.5);
  }
  const dy = y - 18 * s;
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 17 * s, dy - 34 * s, 34 * s, 34 * s);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 15 * s, dy - 34 * s, 30 * s, 32 * s);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 10 * s, dy - 24 * s, 20 * s, 9 * s);
  g.fillStyle(GOLD, 1); g.fillRect(x - 9 * s, dy - 23 * s, 18 * s, 7 * s);
  for (let k = 0; k < 3; k++) { g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 7 * s + k * 5 * s, dy - 20.5 * s, 3.5 * s, 1.2 * s); }
  // The figure: a long robe falling in folds.
  const fy = dy - 34 * s;
  g.fillStyle(MARBLE_DARK, 1);
  g.fillTriangle(x - 16 * s, fy, x + 16 * s, fy, x, fy - 62 * s);
  g.fillStyle(MARBLE_LIT, 1);
  g.fillTriangle(x - 13 * s, fy, x + 13 * s, fy, x, fy - 60 * s);
  for (let k = -2; k <= 2; k++) { g.lineStyle(1.2 * s, MARBLE_DEEP, 0.6); g.lineBetween(x + k * 4 * s, fy - 2, x + k * 1.2 * s, fy - 44 * s); }
  // Shoulders, a cloak pinned with a sun brooch.
  g.fillStyle(MARBLE, 1); g.fillEllipse(x, fy - 52 * s, 30 * s, 12 * s);
  g.fillStyle(GOLD, 1); g.fillCircle(x - 7 * s, fy - 52 * s, 2.5 * s);
  // One arm raised to the sun, open palm.
  g.lineStyle(6 * s, MARBLE_DARK, 1); g.lineBetween(x + 12 * s, fy - 52 * s, x + 22 * s, fy - 82 * s);
  g.lineStyle(4.5 * s, MARBLE_LIT, 1); g.lineBetween(x + 12 * s, fy - 53 * s, x + 21 * s, fy - 82 * s);
  g.fillStyle(MARBLE_LIT, 1); g.fillCircle(x + 22 * s, fy - 85 * s, 4 * s);
  // The other hand on the breast.
  g.fillStyle(MARBLE, 1); g.fillCircle(x - 4 * s, fy - 40 * s, 3.5 * s);
  // The head: a gilt sunburst round a blank, polished disc.
  const hx = x, hy = fy - 70 * s;
  glow(g, hx, hy, 26 * s, GOLD_LIT, 0.05, 3);
  sunburst(g, hx, hy, 20 * s, 14, 1);
  g.fillStyle(MARBLE_LIT, 1); g.fillCircle(hx, hy, 7 * s);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(hx - 2 * s, hy - 2 * s, 2.4 * s);
}

/** A brass rope-post for a queue, with a sunburst finial. */
export function ropePost(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 16);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 1, 14, 5);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2.5, y - 30, 5, 29);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 1.5, y - 30, 1.5, 29);
  sunburst(g, x, y - 33, 6, 8, 1);
}

/** The white cord slung between two rope-posts. */
export function queueRope(g: G, ax: number, ay: number, bx: number, by: number): void {
  g.lineStyle(2.5, CANVAS_DARK, 1);
  g.beginPath(); g.moveTo(ax, ay - 28);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const sag = Math.sin(t * Math.PI) * 10;
    g.lineTo(ax + (bx - ax) * t, ay - 28 + (by - ay) * t + sag);
  }
  g.strokePath();
}

/**
 * A Clear — one of the bleached: a person you can see the paving through, edges faintly blue,
 * no colour left in clothes or skin, and no shadow under their feet at all.
 */
export function clearFigure(g: G, x: number, y: number, s = 1, a = 1, facing = 1): void {
  // No shadow. That is the point.
  const al = 0.32 * a;
  g.fillStyle(CLEAR, al);
  g.fillTriangle(x - 10 * s, y, x + 10 * s, y, x, y - 30 * s);
  g.fillEllipse(x, y - 24 * s, 18 * s, 22 * s);
  g.fillCircle(x, y - 40 * s, 7.5 * s);
  g.lineStyle(1.2, CLEAR_EDGE, 0.55 * a);
  g.strokeCircle(x, y - 40 * s, 7.5 * s);
  g.strokeEllipse(x, y - 24 * s, 18 * s, 22 * s);
  g.lineBetween(x - 10 * s, y, x - 6 * s, y - 16 * s);
  g.lineBetween(x + 10 * s, y, x + 6 * s, y - 16 * s);
  // Eyes: two faint dark points — the only thing left that is not see-through.
  g.fillStyle(0x6a8a9a, 0.5 * a);
  g.fillCircle(x + facing * 2 - 2.5 * s, y - 41 * s, 1.1 * s); g.fillCircle(x + facing * 2 + 2.5 * s, y - 41 * s, 1.1 * s);
  // A shimmer line down one side, as light bends through them.
  g.lineStyle(1, 0xffffff, 0.5 * a); g.lineBetween(x - 4 * s, y - 46 * s, x - 6 * s, y - 6 * s);
}

/** A street lamp that has not been lit in twenty-two years: glass clean, wick white, a cobweb of nothing. */
export function noonLamp(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 14);
  g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 62, 4, 62);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 1, y - 62, 1, 62);
  g.fillStyle(IRON, 1); g.fillRect(x - 6, y - 4, 12, 4);
  // The lantern: glass box, iron cap.
  g.fillStyle(GLASS, 0.6); g.fillRect(x - 7, y - 80, 14, 16);
  g.lineStyle(1.5, IRON, 1); g.strokeRect(x - 7, y - 80, 14, 16);
  g.fillStyle(0xffffff, 0.9); g.fillRect(x - 0.7, y - 72, 1.4, 6);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 9, y - 80, x + 9, y - 80, x, y - 88);
  g.fillStyle(GLASS_LIT, 0.7); g.fillRect(x - 5, y - 78, 2, 12);
}

/** A marble urn holding a box hedge burnt to straw. */
export function strawUrn(g: G, x: number, y: number, s: number, rng: () => number): void {
  noonShadow(g, x, y, 30 * s);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 6 * s, y - 8 * s, 12 * s, 8 * s);
  g.fillStyle(MARBLE_DARK, 1); g.fillEllipse(x, y - 16 * s, 28 * s, 16 * s);
  g.fillStyle(MARBLE, 1); g.fillEllipse(x, y - 17 * s, 26 * s, 14 * s);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 14 * s, y - 24 * s, 28 * s, 3 * s);
  for (let i = 0; i < 9; i++) {
    const bx = x + (rng() - 0.5) * 20 * s, by = y - 28 * s - rng() * 10 * s;
    g.fillStyle(i % 3 ? HEDGE : HEDGE_DARK, 1); g.fillCircle(bx, by, (5 + rng() * 3) * s);
  }
  g.fillStyle(STRAW, 0.8); g.fillCircle(x - 3 * s, y - 36 * s, 4 * s);
  for (let i = 0; i < 6; i++) { g.lineStyle(1, STRAW_DARK, 1); const bx = x + (rng() - 0.5) * 22 * s; g.lineBetween(bx, y - 30 * s, bx + (rng() - 0.5) * 6, y - 40 * s); }
}

/** A Clarity notice on a gilt post: a white board, black lettering, a sun seal. */
export function clarityNotice(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 16);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 2, y - 50, 4, 50);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - 20, y - 74, 40, 28);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 19, y - 73, 38, 26);
  for (let k = 0; k < 4; k++) { g.fillStyle(0x2a2420, 0.8); g.fillRect(x - 15, y - 67 + k * 5, k === 0 ? 30 : 22 - k * 3, 1.6); }
  sunburst(g, x + 12, y - 52, 4.5, 8, 1);
}

/**
 * A bare awning frame: four brass poles and the rails where a canvas used to be. Under Clarity
 * every awning on the plaza was taken down; the frames were left up as a reminder, a strip of
 * torn canvas still knotted to one corner.
 */
export function bareAwning(g: G, x: number, y: number, w: number, d: number): void {
  for (const [px, py] of [[x - w / 2, y], [x + w / 2, y], [x - w / 2 + 8, y - d], [x + w / 2 - 8, y - d]]) {
    noonShadow(g, px, py, 10);
    g.fillStyle(BRASS_DARK, 1); g.fillRect(px - 2, py - 54, 4, 54);
    g.fillStyle(BRASS_LIT, 0.8); g.fillRect(px - 1, py - 54, 1, 54);
    g.fillStyle(GOLD, 1); g.fillCircle(px, py - 56, 3);
  }
  g.lineStyle(2, BRASS_DARK, 1);
  g.lineBetween(x - w / 2, y - 54, x + w / 2, y - 54);
  g.lineBetween(x - w / 2 + 8, y - d - 54, x + w / 2 - 8, y - d - 54);
  g.lineBetween(x - w / 2, y - 54, x - w / 2 + 8, y - d - 54);
  g.lineBetween(x + w / 2, y - 54, x + w / 2 - 8, y - d - 54);
  // The torn strip.
  g.fillStyle(MADDER, 0.85);
  g.fillTriangle(x + w / 2, y - 54, x + w / 2 - 14, y - 54, x + w / 2 - 4, y - 30);
  g.fillStyle(CANVAS, 0.85);
  g.fillTriangle(x + w / 2 - 14, y - 54, x + w / 2 - 26, y - 54, x + w / 2 - 18, y - 36);
}

/** A striped canvas awning, seen from above-ish: the shade a gimmick hands out. Also used on the bakery stall. */
export function awningCanvas(g: G, x: number, y: number, w: number, h: number, a = 1, sag = 0, colors: number[] = [MADDER, CANVAS]): void {
  const stripes = Math.max(4, Math.round(w / 22));
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    const c = colors[i % colors.length];
    const sx = x - w / 2 + i * sw;
    const mid = Math.sin(((i + 0.5) / stripes) * Math.PI) * sag;
    g.fillStyle(c, a); g.fillRect(sx, y - h / 2 + mid, sw + 0.5, h);
    g.fillStyle(lit(c, 0.25), a * 0.6); g.fillRect(sx, y - h / 2 + mid, sw + 0.5, 3);
  }
  // Scalloped valance along the front edge.
  for (let i = 0; i < stripes; i++) {
    const sx = x - w / 2 + i * sw + sw / 2;
    const mid = Math.sin(((i + 0.5) / stripes) * Math.PI) * sag;
    g.fillStyle(colors[i % colors.length], a); g.fillCircle(sx, y + h / 2 + mid, sw / 2);
  }
  g.lineStyle(2, BRASS_DARK, a); g.strokeRect(x - w / 2, y - h / 2, w, h);
}

/**
 * A heliograph mirror-post: a brass column on a tripod foot, a round silvered mirror in a
 * gimbal turned to face `a`, a little sighting vane beside it.
 */
export function mirrorPost(g: G, x: number, y: number, a: number, s = 1, flash = 0): void {
  noonShadow(g, x, y, 22 * s);
  // Tripod.
  g.lineStyle(2.5 * s, BRASS_DARK, 1);
  g.lineBetween(x, y - 18 * s, x - 10 * s, y); g.lineBetween(x, y - 18 * s, x + 10 * s, y); g.lineBetween(x, y - 18 * s, x, y + 2);
  // Column.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 2.5 * s, y - 44 * s, 5 * s, 28 * s);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 1.5 * s, y - 44 * s, 1.5 * s, 28 * s);
  // The gimbal and mirror, foreshortened toward its facing.
  const my = y - 54 * s;
  const fx = Math.cos(a), fy = Math.sin(a);
  const rw = 12 * s * (0.35 + 0.65 * Math.abs(fy)), rh = 12 * s;
  g.lineStyle(2 * s, BRASS, 1); g.strokeEllipse(x, my, rw * 2 + 6 * s, rh * 2 + 4 * s);
  g.fillStyle(GLASS_DEEP, 1); g.fillEllipse(x + fx * 1.5, my, rw * 2, rh * 2);
  g.fillStyle(mixC(GLASS, 0xffffff, 0.4 + flash * 0.6), 1); g.fillEllipse(x + fx * 2.5, my - 1, rw * 1.7, rh * 1.7);
  g.fillStyle(0xffffff, 0.8); g.fillEllipse(x + fx * 2 - rw * 0.3, my - rh * 0.35, rw * 0.5, rh * 0.4);
  // A sighting vane on the facing side.
  g.lineStyle(1.5 * s, BRASS_DARK, 1); g.lineBetween(x, my, x + fx * 18 * s, my + fy * 10 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x + fx * 18 * s - 2, my + fy * 10 * s - 4, 4, 6);
  if (flash > 0) { glow(g, x, my, 24 * s, 0xffffff, 0.12 * flash, 3); glint(g, x + fx * 3, my - 2, 12 * s * flash, flash); }
}

/** A sun-obelisk waystone: a white needle with a gold capstone and a lens in its face. */
export function sunWaystone(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 40, 0.26);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 20, y - 10, 40, 10);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 19, y - 10, 38, 7);
  g.fillStyle(MARBLE_DARK, 1); g.fillTriangle(x - 12, y - 10, x + 12, y - 10, x + 7, y - 92);
  g.fillStyle(MARBLE, 1); g.fillTriangle(x - 12, y - 10, x + 7, y - 92, x - 7, y - 92);
  g.fillStyle(MARBLE_LIT, 0.8); g.fillTriangle(x - 11, y - 10, x - 6, y - 92, x - 8, y - 10);
  g.fillStyle(GOLD_DARK, 1); g.fillTriangle(x - 7, y - 92, x + 7, y - 92, x, y - 108);
  g.fillStyle(GOLD_LIT, 1); g.fillTriangle(x - 5, y - 92, x, y - 92, x, y - 106);
  // The lens in its face.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - 48, 7);
  g.fillStyle(GLASS, 1); g.fillCircle(x, y - 48, 5);
  g.fillStyle(0xffffff, 1); g.fillCircle(x - 1.5, y - 49.5, 1.8);
  // Runes chalked up its face, half rubbed off.
  for (let k = 0; k < 4; k++) { g.lineStyle(1, BRASS_DARK, 0.6); g.lineBetween(x - 3, y - 26 - k * 8, x + 3, y - 30 - k * 8); }
}

// ── Buildings ────────────────────────────────────────────────────────

export interface MarbleHouseOpts {
  /** Roof: a balustraded flat roof, a small gilt dome, or a glass lantern-roof. */
  roof: 'balustrade' | 'dome' | 'glass';
  /** The trim colour on the cornice and shutters. */
  trim?: number;
  /** How many window bays across. */
  bays?: number;
}

/**
 * A terraced marble townhouse under Clarity: tall glass windows with no curtains, the shutters
 * folded back flat against the wall and *nailed* there (two black nail-heads on every leaf), a
 * glass front door you can see the hall through, a gilt cornice and a sunburst over the door.
 * Returns nothing; the door sits at (x, y).
 */
export function marbleHouse(g: G, x: number, y: number, w: number, h: number, o: MarbleHouseOpts, rng: () => number): void {
  const x0 = x - w / 2;
  const top = y - h;
  const trim = o.trim ?? GOLD;
  noonShadow(g, x, y, w * 1.02, 0.24);
  // Plinth course and wall.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 4, y - 12, w + 8, 12);
  g.fillStyle(LIME, 1); g.fillRect(x0 - 4, y - 12, w + 8, 4);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0, top, w, h - 12);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 + 2, top, w - 4, h - 14);
  // Ashlar courses.
  for (let yy = top + 16; yy < y - 14; yy += 16) { g.lineStyle(1, VEIN, 0.45); g.lineBetween(x0 + 2, yy, x0 + w - 2, yy); }
  // Windows: tall glass, two floors, shutters nailed open.
  const bays = o.bays ?? Math.max(2, Math.round(w / 52));
  const bw = w / bays;
  for (let floor = 0; floor < 2; floor++) {
    const wy = top + 18 + floor * (h * 0.42);
    const wh = h * 0.28;
    for (let i = 0; i < bays; i++) {
      const cx = x0 + bw * (i + 0.5);
      if (floor === 0 && Math.abs(cx - x) < bw * 0.5) continue; // the door bay
      const ww = Math.min(22, bw * 0.42);
      // Shutters folded back, nailed.
      for (const k of [-1, 1]) {
        const sx = cx + k * (ww / 2 + 1) + (k < 0 ? -ww * 0.5 : 0);
        g.fillStyle(dim(trim, 0.25), 1); g.fillRect(sx, wy, ww * 0.5, wh);
        g.fillStyle(lit(trim, 0.2), 0.8); g.fillRect(sx, wy, ww * 0.5, 2);
        for (let s = 1; s < 4; s++) { g.lineStyle(1, dim(trim, 0.45), 1); g.lineBetween(sx + 1, wy + (wh * s) / 4, sx + ww * 0.5 - 1, wy + (wh * s) / 4); }
        g.fillStyle(IRON_DARK, 1); g.fillCircle(sx + ww * 0.25, wy + 4, 1.4); g.fillCircle(sx + ww * 0.25, wy + wh - 4, 1.4);
      }
      // The glass: white sky in it, a bright stripe, no curtain — the rail empty.
      g.fillStyle(MARBLE_DEEP, 1); g.fillRect(cx - ww / 2 - 2, wy - 2, ww + 4, wh + 4);
      g.fillStyle(GLASS, 1); g.fillRect(cx - ww / 2, wy, ww, wh);
      g.fillStyle(GLASS_EDGE, 0.5); g.fillRect(cx - ww / 2, wy + wh * 0.6, ww, wh * 0.4);
      g.fillStyle(0xffffff, 0.75); g.fillRect(cx - ww / 2 + 3, wy + 2, 3, wh - 4);
      g.lineStyle(1, MARBLE_DEEP, 1); g.lineBetween(cx, wy, cx, wy + wh); g.lineBetween(cx - ww / 2, wy + wh * 0.45, cx + ww / 2, wy + wh * 0.45);
      g.lineStyle(1.2, BRASS_DARK, 1); g.lineBetween(cx - ww / 2 - 2, wy + 3, cx + ww / 2 + 2, wy + 3);
      if (rng() < 0.4) { g.fillStyle(BRASS, 1); g.fillCircle(cx - ww / 2 + 4 + rng() * (ww - 8), wy + 3, 1.6); }
      // Sill.
      g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - ww / 2 - 4, wy + wh + 2, ww + 8, 3);
    }
  }
  // The glass door: you can see clean through it to a bare hall.
  const dw = Math.min(30, bw * 0.6), dh = Math.min(48, h * 0.42);
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x - dw / 2 - 4, y - 12 - dh - 4, dw + 8, dh + 4);
  g.fillStyle(GLASS, 1); g.fillRect(x - dw / 2, y - 12 - dh, dw, dh);
  g.fillStyle(MARBLE_DARK, 0.5); g.fillRect(x - dw / 2, y - 12 - dh * 0.35, dw, dh * 0.35);
  g.fillStyle(0xffffff, 0.7); g.fillRect(x - dw / 2 + 3, y - 12 - dh + 3, 3, dh - 6);
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x, y - 12 - dh, x, y - 12);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 4, y - 12 - dh * 0.45, 1.6); g.fillCircle(x + 4, y - 12 - dh * 0.45, 1.6);
  sunburst(g, x, y - 12 - dh - 12, 9, 10, 1, trim);
  // Steps.
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - dw / 2 - 8, y - 6, dw + 16, 4);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dw / 2 - 12, y - 2, dw + 24, 3);
  // Cornice.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 6, top - 8, w + 12, 9);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 6, top - 10, w + 12, 4);
  g.fillStyle(trim, 1); g.fillRect(x0 - 6, top - 3, w + 12, 2);
  for (let dx = x0; dx < x0 + w; dx += 10) { g.fillStyle(MARBLE_DARK, 1); g.fillRect(dx, top - 2, 5, 3); }
  // Roof.
  if (o.roof === 'balustrade') {
    for (let bx = x0 - 4; bx < x0 + w + 2; bx += 9) {
      g.fillStyle(MARBLE_DARK, 1); g.fillEllipse(bx + 2, top - 16, 5, 10);
      g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(bx + 1.5, top - 17, 3, 8);
    }
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 6, top - 24, w + 12, 4);
    for (const k of [0, 1]) { const ux = k ? x0 + w - 4 : x0 + 4; g.fillStyle(GOLD, 1); g.fillCircle(ux, top - 30, 4); g.fillStyle(GOLD_LIT, 1); g.fillCircle(ux - 1, top - 31, 1.5); }
  } else if (o.roof === 'dome') {
    const dr = Math.min(w * 0.28, 40);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dr - 4, top - 18, dr * 2 + 8, 10);
    g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, top - 18, dr * 2, dr * 1.6);
    g.fillStyle(GOLD, 1); g.fillEllipse(x - 2, top - 20, dr * 1.8, dr * 1.45);
    g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(x - dr * 0.35, top - 18 - dr * 0.4, dr * 0.5, dr * 0.35);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dr - 4, top - 16, dr * 2 + 8, 8);
    for (let k = -2; k <= 2; k++) { g.lineStyle(1, GOLD_DARK, 0.7); g.lineBetween(x + k * dr * 0.35, top - 16, x + k * dr * 0.12, top - 18 - dr * 0.78); }
    g.fillStyle(GOLD, 1); g.fillRect(x - 1.5, top - 18 - dr * 0.8 - 10, 3, 10);
    sunburst(g, x, top - 18 - dr * 0.8 - 14, 6, 8, 1);
  } else {
    // A glass lantern-roof: a ridge of panes so the sun reaches every room.
    g.fillStyle(GLASS, 0.85); g.fillTriangle(x0 + 6, top - 8, x0 + w - 6, top - 8, x, top - 8 - w * 0.22);
    g.lineStyle(1.2, BRASS_DARK, 1);
    for (let k = 0; k <= 8; k++) g.lineBetween(x0 + 6 + ((w - 12) * k) / 8, top - 8, x, top - 8 - w * 0.22);
    g.lineStyle(2, BRASS_DARK, 1); g.strokeTriangle(x0 + 6, top - 8, x0 + w - 6, top - 8, x, top - 8 - w * 0.22);
    g.fillStyle(0xffffff, 0.6); g.fillTriangle(x0 + 12, top - 10, x0 + 30, top - 10, x - w * 0.12, top - 8 - w * 0.16);
  }
}

/**
 * A sun-temple: a stepped podium, a row of fluted white columns, a pediment carrying a gilt
 * sun, and above it all a great gilded dome with a ring of round glass oculi and a sun finial.
 */
export function sunTemple(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  noonShadow(g, x, y, w * 1.06, 0.26);
  // Podium steps.
  for (let k = 0; k < 4; k++) {
    const ww = w + 40 - k * 10, yy = y - k * 7;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - ww / 2, yy - 7, ww, 7);
    g.fillStyle(MARBLE, 1); g.fillRect(x - ww / 2, yy - 7, ww, 5);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - ww / 2, yy - 7, ww, 1.5);
  }
  const base = y - 28;
  const colH = h * 0.5;
  // Cella wall behind the columns, with a gilt door.
  g.fillStyle(LIME, 1); g.fillRect(x0 + 10, base - colH, w - 20, colH);
  g.fillStyle(LIME_DARK, 0.5); g.fillRect(x0 + 10, base - colH, w - 20, 8);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 22, base - colH * 0.72, 44, colH * 0.72);
  g.fillStyle(GOLD, 1); g.fillRect(x - 20, base - colH * 0.7, 40, colH * 0.7);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, GOLD_DARK, 1); g.strokeRect(x - 17 + (k % 2) * 18, base - colH * 0.66 + Math.floor(k / 2) * colH * 0.32, 16, colH * 0.28); }
  sunburst(g, x, base - colH * 0.5, 9, 10, 1, GOLD_LIT);
  // Columns, fluted, each with its tight noon shadow at the foot.
  const n = Math.max(4, Math.round(w / 34));
  for (let i = 0; i < n; i++) {
    const cx = x0 + 8 + ((w - 16) * i) / (n - 1);
    g.fillStyle(0x000000, 0.12); g.fillEllipse(cx, base, 20, 4);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - 8, base - colH, 16, colH);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - 7, base - colH, 13, colH);
    for (let f = -1; f <= 1; f++) { g.lineStyle(1, MARBLE_DARK, 0.8); g.lineBetween(cx + f * 4, base - colH + 4, cx + f * 4, base - 4); }
    g.fillStyle(MARBLE, 1); g.fillRect(cx - 10, base - colH - 5, 20, 5); g.fillRect(cx - 10, base - 4, 20, 4);
    g.fillStyle(GOLD, 1); g.fillRect(cx - 10, base - colH - 6, 20, 1.5);
  }
  // Entablature and pediment.
  const et = base - colH - 6;
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 6, et - 16, w + 12, 16);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 6, et - 16, w + 12, 12);
  for (let dx = x0; dx < x0 + w; dx += 14) { g.fillStyle(GOLD, 0.9); g.fillRect(dx + 3, et - 12, 6, 6); }
  g.fillStyle(MARBLE_DARK, 1); g.fillTriangle(x0 - 10, et - 16, x0 + w + 10, et - 16, x, et - 16 - h * 0.18);
  g.fillStyle(MARBLE_LIT, 1); g.fillTriangle(x0 - 2, et - 18, x0 + w + 2, et - 18, x, et - 14 - h * 0.18);
  sunburst(g, x, et - 16 - h * 0.07, 14, 14, 1);
  // The dome behind the pediment.
  const dr = w * 0.3;
  const dy = et - 16 - h * 0.18 + 6;
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dr - 6, dy - 14, dr * 2 + 12, 14);
  for (let k = 0; k < 7; k++) {
    const ox = x - dr + 8 + ((dr * 2 - 16) * k) / 6;
    g.fillStyle(GLASS_DEEP, 1); g.fillCircle(ox, dy - 7, 4);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(ox - 1, dy - 8, 1.5);
  }
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, dy - 14, dr * 2, dr * 1.7);
  g.fillStyle(GOLD, 1); g.fillEllipse(x - 2, dy - 16, dr * 1.86, dr * 1.56);
  for (let k = -3; k <= 3; k++) { g.lineStyle(1.5, GOLD_DARK, 0.8); g.lineBetween(x + k * dr * 0.27, dy - 14, x + k * dr * 0.08, dy - 14 - dr * 0.8); }
  g.fillStyle(GOLD_LIT, 0.9); g.fillEllipse(x - dr * 0.38, dy - 14 - dr * 0.42, dr * 0.42, dr * 0.3);
  g.fillStyle(0xffffff, 0.8); g.fillEllipse(x - dr * 0.42, dy - 14 - dr * 0.46, dr * 0.14, dr * 0.1);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dr - 6, dy - 14, dr * 2 + 12, 5);
  // The finial: a gilt sun on a spike.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 2, dy - 14 - dr * 0.85 - 22, 4, 22);
  glow(g, x, dy - 14 - dr * 0.85 - 28, 20, GOLD_LIT, 0.06, 3);
  sunburst(g, x, dy - 14 - dr * 0.85 - 28, 13, 16, 1, GOLD_LIT);
  void rng;
}

/**
 * The Burning Glass: an iron gantry like a ship's crane — two braced A-frame towers and a
 * riveted crossbeam — from which a lens as big as a house hangs in a brass ring on chains,
 * tilted down at the bleaching ring. A great iron hand-wheel on the left tower swings it.
 */
export function burningGlass(g: G, x: number, y: number, w: number, h: number): void {
  const half = w / 2;
  noonShadow(g, x - half, y, 50, 0.3); noonShadow(g, x + half, y, 50, 0.3);
  // The towers: A-frames with cross-bracing and rivets.
  for (const k of [-1, 1]) {
    const tx = x + k * half;
    for (const s of [-1, 1]) {
      g.lineStyle(9, IRON_DARK, 1); g.lineBetween(tx + s * 26, y, tx + s * 6, y - h);
      g.lineStyle(5, IRON, 1); g.lineBetween(tx + s * 26, y - 1, tx + s * 6, y - h);
      g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(tx + s * 25 - 2, y - 1, tx + s * 5 - 2, y - h);
    }
    for (let j = 1; j < 5; j++) {
      const t0 = j / 5, t1 = (j + 1) / 5;
      const ax = tx - 26 + 20 * t0, bx = tx + 26 - 20 * t1;
      g.lineStyle(3, IRON, 1); g.lineBetween(ax, y - h * t0, bx, y - h * t1);
      g.lineBetween(tx + 26 - 20 * t0, y - h * t0, tx - 26 + 20 * t1, y - h * t1);
      g.fillStyle(IRON_LIT, 1); g.fillCircle(ax, y - h * t0, 1.6);
    }
    // Iron foot-shoes bolted to the marble.
    for (const s of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillRect(tx + s * 26 - 8, y - 6, 16, 6); g.fillStyle(IRON_LIT, 1); g.fillCircle(tx + s * 26 - 4, y - 3, 1.5); g.fillCircle(tx + s * 26 + 4, y - 3, 1.5); }
  }
  // The crossbeam: a riveted box girder.
  const by = y - h;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - half - 18, by - 22, w + 36, 24);
  g.fillStyle(IRON, 1); g.fillRect(x - half - 18, by - 22, w + 36, 18);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - half - 18, by - 22, w + 36, 2);
  for (let rx = x - half - 12; rx < x + half + 18; rx += 12) { g.fillStyle(IRON_LIT, 1); g.fillCircle(rx, by - 17, 1.5); g.fillCircle(rx, by - 7, 1.5); }
  // Gilt sunbursts riding the girder's ends.
  sunburst(g, x - half - 18, by - 12, 14, 12, 1); sunburst(g, x + half + 18, by - 12, 14, 12, 1);
  // The hand-wheel on the left tower.
  const wx = x - half, wy = y - h * 0.42;
  g.lineStyle(4, IRON_DARK, 1); g.strokeCircle(wx, wy, 20);
  g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(wx, wy - 1, 20);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.lineStyle(2.5, IRON, 1); g.lineBetween(wx, wy, wx + Math.cos(a) * 20, wy + Math.sin(a) * 20); g.fillStyle(BRASS, 1); g.fillCircle(wx + Math.cos(a) * 24, wy + Math.sin(a) * 24, 3); }
  g.fillStyle(BRASS, 1); g.fillCircle(wx, wy, 5);
  // Chains from the girder to the ring.
  const lx = x, ly = by + h * 0.42;
  const R = Math.min(half * 0.62, 90);
  for (const k of [-1, 1]) {
    const ax = x + k * R * 0.9, ay = by;
    for (let i = 0; i < 9; i++) {
      const t = i / 9;
      const cx = ax + (lx + k * R * 0.86 - ax) * t, cy = ay + (ly - R * 0.3 - ay) * t;
      g.lineStyle(2, IRON_DARK, 1); g.strokeEllipse(cx, cy, i % 2 ? 4 : 6, i % 2 ? 7 : 5);
    }
  }
  // The lens: a brass ring with a thick glass disc, tilted so we see it as an ellipse.
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(lx, ly, R * 2 + 18, R * 1.3 + 14);
  g.fillStyle(BRASS, 1); g.fillEllipse(lx, ly - 2, R * 2 + 12, R * 1.3 + 8);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.fillStyle(BRASS_DARK, 1); g.fillCircle(lx + Math.cos(a) * (R + 3), ly - 2 + Math.sin(a) * (R * 0.65 + 2), 1.6); }
  g.fillStyle(GLASS_EDGE, 1); g.fillEllipse(lx, ly - 2, R * 2, R * 1.3);
  for (let i = 4; i >= 0; i--) {
    const k = i / 4;
    g.fillStyle(mixC(0xffffff, GLASS, k), 0.85);
    g.fillEllipse(lx - R * 0.15 * (1 - k), ly - 2 - R * 0.1 * (1 - k), R * 2 * (0.3 + 0.7 * k), R * 1.3 * (0.3 + 0.7 * k));
  }
  // Concentric grinding rings, and the white sky caught in it.
  for (let i = 1; i < 4; i++) { g.lineStyle(1, GLASS_EDGE, 0.6); g.strokeEllipse(lx, ly - 2, R * 2 * (i / 4), R * 1.3 * (i / 4)); }
  g.fillStyle(0xffffff, 0.9); g.fillEllipse(lx - R * 0.4, ly - 2 - R * 0.28, R * 0.5, R * 0.18);
  glint(g, lx - R * 0.5, ly - R * 0.36, 10, 0.9);
  // A trunnion pin on each side.
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(lx + k * (R + 10), ly - 2, 6); g.fillStyle(BRASS_LIT, 1); g.fillCircle(lx + k * (R + 10), ly - 3, 2.5); }
}

/**
 * The Dusk-house: the one licensed shade on the court. A squat block of grey limestone with no
 * windows at all, a heavy black door, a ticket hatch with a brass grille, and over the door a
 * great stopwatch face counting each household's hour. A queue rail runs down its front.
 */
export function duskHouse(g: G, x: number, y: number, w: number, h: number): void {
  const x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w * 1.04, 0.3);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(mixC(LIME, MARBLE_DARK, 0.5), 1); g.fillRect(x0 + 3, top + 3, w - 6, h - 6);
  for (let yy = top + 14; yy < y; yy += 14) {
    g.lineStyle(1, LIME_DARK, 0.7); g.lineBetween(x0 + 3, yy, x0 + w - 3, yy);
    const off = ((yy - top) / 14) % 2 ? 0 : 18;
    for (let xx = x0 + off; xx < x0 + w; xx += 36) g.lineBetween(xx, yy - 14, xx, yy);
  }
  // Blind arcade where windows would be — bricked up with darker stone.
  for (let i = 0; i < 4; i++) {
    const ax = x0 + w * (0.14 + i * 0.24);
    if (Math.abs(ax - x) < 30) continue;
    g.fillStyle(LIME_DARK, 1); g.fillRect(ax - 12, top + 24, 24, 34);
    g.fillStyle(dim(LIME_DARK, 0.15), 1); g.fillRect(ax - 10, top + 26, 20, 30);
    g.beginPath(); g.arc(ax, top + 26, 10, Math.PI, 0, false); g.fillPath();
  }
  // The black door: the only true dark on the plaza.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 22, y - 58, 44, 58);
  g.fillStyle(DUSK, 1); g.fillRect(x - 19, y - 55, 38, 55);
  g.fillStyle(DUSK_LIT, 0.6); g.fillRect(x - 19, y - 55, 38, 3);
  for (const k of [-1, 1]) { g.fillStyle(BRASS, 1); g.fillCircle(x + k * 6, y - 28, 2); }
  g.lineStyle(1, DUSK_LIT, 0.8); g.lineBetween(x, y - 55, x, y);
  // The ticket hatch beside it.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 32, y - 44, 26, 20);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x + 34, y - 42, 22, 16);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, BRASS_LIT, 1); g.lineBetween(x + 36 + k * 4.5, y - 42, x + 36 + k * 4.5, y - 26); }
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x + 30, y - 24, 30, 3);
  // The stopwatch over the door.
  const cy = top - 4;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 4, cy - 34, 8, 8); g.fillCircle(x, cy - 37, 5);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, cy - 10, 23);
  g.fillStyle(BRASS, 1); g.fillCircle(x, cy - 11, 21);
  g.fillStyle(MARBLE_LIT, 1); g.fillCircle(x, cy - 11, 17);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.lineStyle(i % 3 ? 1 : 2, IRON_DARK, 1); g.lineBetween(x + Math.cos(a) * 13, cy - 11 + Math.sin(a) * 13, x + Math.cos(a) * 16, cy - 11 + Math.sin(a) * 16); }
  g.fillStyle(DUSK, 0.25); g.slice(x, cy - 11, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.6, false); g.fillPath();
  // Parapet with the words cut in it.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 4, top - 6, w + 8, 8);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 - 4, top - 6, w + 8, 2);
  for (let k = 0; k < 9; k++) { g.fillStyle(IRON_DARK, 0.7); g.fillRect(x - 64 + k * 15, top + 8, 10, 3); }
}

/**
 * Squint's — the court optician's: a narrow marble shopfront whose windows are the only
 * *smoked* glass on the plaza (licensed, a brass certificate in the corner), a giant pair of
 * gilt spectacles hung over the door for a sign, and pots of sunburn salve on the sill.
 */
export function opticianShop(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  marbleHouse(g, x, y, w, h, { roof: 'balustrade', trim: BRASS, bays: 3 }, rng);
  const top = y - h;
  // Smoked display windows either side of the door, over the house's own.
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.3;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(wx - 26, y - 64, 52, 46);
    g.fillStyle(0x5a6068, 1); g.fillRect(wx - 23, y - 61, 46, 40);
    g.fillStyle(0x8a9098, 0.6); g.fillRect(wx - 23, y - 61, 46, 12);
    g.fillStyle(0xffffff, 0.35); g.fillRect(wx - 19, y - 59, 4, 34);
    // Spectacles on stands inside.
    for (let i = 0; i < 2; i++) {
      const sx = wx - 10 + i * 20, sy = y - 36 - i * 6;
      g.lineStyle(1.5, GOLD, 1); g.strokeCircle(sx - 4, sy, 3.5); g.strokeCircle(sx + 4, sy, 3.5); g.lineBetween(sx - 0.5, sy, sx + 0.5, sy);
    }
    // Salve pots on the sill.
    for (let i = 0; i < 3; i++) { const px = wx - 16 + i * 16; g.fillStyle(MARBLE_LIT, 1); g.fillRect(px - 4, y - 22, 8, 6); g.fillStyle(GOLD, 1); g.fillRect(px - 4.5, y - 23, 9, 2); }
  }
  // The licence certificate: a brass plate with a sun seal.
  g.fillStyle(BRASS, 1); g.fillRect(x + w * 0.3 + 12, y - 60, 10, 12);
  sunburst(g, x + w * 0.3 + 17, y - 54, 3, 8, 1, GOLD_LIT);
  // The great gilt spectacles over the door, smoked lenses.
  const sy = top + h * 0.38;
  g.lineStyle(2, IRON, 1); g.lineBetween(x - 20, sy - 22, x - 14, sy - 8); g.lineBetween(x + 20, sy - 22, x + 14, sy - 8);
  for (const k of [-1, 1]) {
    g.fillStyle(0x50565e, 1); g.fillCircle(x + k * 16, sy, 13);
    g.fillStyle(0x8a929a, 0.6); g.fillCircle(x + k * 16 - 3, sy - 4, 5);
    g.lineStyle(3, GOLD, 1); g.strokeCircle(x + k * 16, sy, 13);
    g.lineStyle(1, GOLD_LIT, 1); g.strokeCircle(x + k * 16, sy - 1, 13);
  }
  g.lineStyle(3, GOLD, 1); g.beginPath(); g.arc(x, sy + 2, 5, Math.PI, 0, false); g.strokePath();
  g.lineStyle(3, GOLD, 1); g.lineBetween(x - 29, sy - 2, x - 38, sy - 6); g.lineBetween(x + 29, sy - 2, x + 38, sy - 6);
}

/**
 * The Sunrise Bun: a corner bakery of warm limestone under a canopy of *glass* (an awning of
 * canvas would make shade; glass is licensed), a bay window piled with round golden buns each
 * scored with a sunrise, a bread-oven chimney, and a painted board of a sun coming *up* —
 * which is very nearly sedition.
 */
export function sunriseBunBakery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  noonShadow(g, x, y, w * 1.04, 0.24);
  // Chimney (behind).
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 + w * 0.78, top - 46, 22, 50);
  g.fillStyle(LIME, 1); g.fillRect(x0 + w * 0.78 + 2, top - 46, 18, 48);
  g.fillStyle(IRON, 1); g.fillRect(x0 + w * 0.78 - 2, top - 50, 26, 6);
  // Walls.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(LIME, 1); g.fillRect(x0 + 2, top + 2, w - 4, h - 4);
  for (let yy = top + 12; yy < y; yy += 12) { g.lineStyle(1, LIME_DARK, 0.4); g.lineBetween(x0 + 2, yy, x0 + w - 2, yy); }
  // Bay window full of buns.
  const bx = x - w * 0.22, bwid = w * 0.38;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(bx - bwid / 2 - 3, y - 70, bwid + 6, 52);
  g.fillStyle(GLASS, 1); g.fillRect(bx - bwid / 2, y - 67, bwid, 46);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const cx = bx - bwid / 2 + 10 + i * ((bwid - 20) / 5) + (row % 2) * 4, cy = y - 28 - row * 12;
      sunBun(g, cx, cy, 6);
    }
  }
  g.fillStyle(0xffffff, 0.5); g.fillRect(bx - bwid / 2 + 4, y - 65, 4, 40);
  g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(bx - bwid / 6, y - 67, bx - bwid / 6, y - 21); g.lineBetween(bx + bwid / 6, y - 67, bx + bwid / 6, y - 21);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(bx - bwid / 2 - 6, y - 20, bwid + 12, 4);
  // The door: glass, a bell over it.
  const dx = x + w * 0.2;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(dx - 17, y - 56, 34, 56);
  g.fillStyle(GLASS, 1); g.fillRect(dx - 14, y - 53, 28, 53);
  g.fillStyle(LIME_DARK, 0.4); g.fillRect(dx - 14, y - 20, 28, 20);
  g.fillStyle(0xffffff, 0.6); g.fillRect(dx - 11, y - 50, 3, 44);
  g.fillStyle(GOLD, 1); g.fillCircle(dx, y - 60, 4); g.fillStyle(GOLD_DARK, 1); g.fillCircle(dx, y - 57, 1.4);
  // The glass canopy: brass ribs, clear panes, so it throws no shade at all.
  const cy = y - 76;
  g.fillStyle(GLASS, 0.55); g.fillRect(x0 - 10, cy - 14, w + 20, 18);
  g.lineStyle(1.5, BRASS_DARK, 1); g.strokeRect(x0 - 10, cy - 14, w + 20, 18);
  for (let rx = x0 - 10; rx <= x0 + w + 10; rx += 18) { g.lineBetween(rx, cy - 14, rx, cy + 4); }
  for (let rx = x0 - 6; rx < x0 + w + 10; rx += 18) { g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(rx + 9, cy + 4, rx + 9, cy + 10); g.fillStyle(GOLD, 1); g.fillCircle(rx + 9, cy + 11, 1.6); }
  g.fillStyle(0xffffff, 0.5); g.fillRect(x0, cy - 12, w * 0.3, 3);
  // The sign: a painted sun coming up over a blue line of sea.
  const sx = x, sy = top + 16;
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(sx - 56, sy - 16, 112, 32, 6);
  g.fillStyle(0xf4d8a0, 1); g.fillRoundedRect(sx - 53, sy - 13, 106, 26, 5);
  g.fillStyle(0x4a7aa8, 1); g.fillRect(sx - 50, sy + 3, 100, 6);
  g.fillStyle(0xe87a3a, 1); g.slice(sx, sy + 3, 12, Math.PI, 0, false); g.fillPath();
  for (let i = 0; i < 7; i++) { const a = Math.PI + ((i + 0.5) / 7) * Math.PI; g.lineStyle(1.5, 0xe87a3a, 1); g.lineBetween(sx + Math.cos(a) * 15, sy + 3 + Math.sin(a) * 15, sx + Math.cos(a) * 21, sy + 3 + Math.sin(a) * 21); }
  // Cornice and a flat roof with a bread-peel weathervane.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 5, top - 6, w + 10, 8);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 - 5, top - 7, w + 10, 3);
  g.lineStyle(2, IRON, 1); g.lineBetween(x0 + 20, top - 7, x0 + 20, top - 34);
  g.fillStyle(IRON, 1); g.fillRect(x0 + 20, top - 36, 22, 3); g.fillEllipse(x0 + 46, top - 34.5, 12, 8);
  void rng;
}

/** A round bun scored with a sunrise: three rays and a half-sun on a gold glaze. */
export function sunBun(g: G, x: number, y: number, r: number): void {
  g.fillStyle(0x9a5a1e, 1); g.fillEllipse(x, y + r * 0.2, r * 2.1, r * 1.6);
  g.fillStyle(0xd8902e, 1); g.fillEllipse(x, y, r * 2, r * 1.5);
  g.fillStyle(0xf4c060, 1); g.fillEllipse(x - r * 0.3, y - r * 0.3, r * 0.9, r * 0.5);
  g.lineStyle(1, 0x8a4a14, 1);
  g.beginPath(); g.arc(x, y + r * 0.2, r * 0.45, Math.PI, 0, false); g.strokePath();
  for (let i = 0; i < 3; i++) { const a = Math.PI * (1.25 + i * 0.25); g.lineBetween(x + Math.cos(a) * r * 0.6, y + r * 0.2 + Math.sin(a) * r * 0.6, x + Math.cos(a) * r * 0.9, y + r * 0.2 + Math.sin(a) * r * 0.9); }
}

/** A flour cart: two big wheels, sacks stamped with a sun. */
export function flourCart(g: G, x: number, y: number): void {
  noonShadow(g, x, y, 80);
  g.fillStyle(0x8a6a44, 1); g.fillRect(x - 40, y - 34, 80, 8);
  g.fillStyle(0xa8845a, 1); g.fillRect(x - 40, y - 36, 80, 3);
  g.lineStyle(3, 0x6a4e30, 1); g.lineBetween(x + 40, y - 30, x + 66, y - 16);
  for (let i = 0; i < 4; i++) {
    const sx = x - 28 + i * 18 + (i % 2) * 3, sy = y - 40 - (i % 2) * 8;
    g.fillStyle(CANVAS_DARK, 1); g.fillEllipse(sx, sy, 20, 16);
    g.fillStyle(CANVAS, 1); g.fillEllipse(sx - 1, sy - 1, 18, 14);
    sunburst(g, sx, sy, 4, 8, 0.8, SAFFRON);
  }
  for (const k of [-1, 1]) {
    const wx = x + k * 26;
    g.lineStyle(3, 0x5a3e24, 1); g.strokeCircle(wx, y - 14, 13);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.lineStyle(1.5, 0x5a3e24, 1); g.lineBetween(wx, y - 14, wx + Math.cos(a) * 13, y - 14 + Math.sin(a) * 13); }
    g.fillStyle(IRON, 1); g.fillCircle(wx, y - 14, 3);
  }
}

/**
 * The Noon Bell: a gilt bell hung in an open marble belfry on four columns, a bronze hammer
 * cocked beside it on a clockwork arm, and a clock face below that has only one numeral — XII.
 */
export function noonBelfry(g: G, x: number, y: number, h: number): void {
  noonShadow(g, x, y, 80, 0.28);
  // Base.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 36, y - 40, 72, 40);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 34, y - 40, 68, 38);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 34, y - 40, 68, 2);
  // The one-numeral clock face.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - 20, 15);
  g.fillStyle(MARBLE_LIT, 1); g.fillCircle(x, y - 20, 12);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 3.5, y - 31, 1.5, 5); g.fillRect(x - 1, y - 31, 1.5, 5); g.fillRect(x + 1.5, y - 31, 3, 1.2);
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y - 20, x, y - 30); g.lineBetween(x, y - 20, x + 0.5, y - 28);
  // Columns.
  const ct = y - h;
  for (const k of [-1, 1]) {
    for (const d of [0, 10]) {
      const cx = x + k * (28 - d);
      g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - 4, ct + 18, 8, h - 58);
      g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - 3, ct + 18, 5, h - 58);
    }
  }
  // Roof: a little gilt dome.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 40, ct + 10, 80, 10);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 40, ct + 10, 80, 3);
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, ct + 10, 70, 46);
  g.fillStyle(GOLD, 1); g.fillEllipse(x - 2, ct + 8, 64, 40);
  g.fillStyle(GOLD_LIT, 0.8); g.fillEllipse(x - 12, ct, 18, 10);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 40, ct + 12, 80, 8);
  sunburst(g, x, ct - 20, 9, 12, 1, GOLD_LIT);
  // The bell.
  const by = ct + 34;
  g.fillStyle(GOLD_DARK, 1);
  g.fillTriangle(x - 18, by + 30, x + 18, by + 30, x, by - 2);
  g.fillEllipse(x, by + 6, 24, 26);
  g.fillStyle(GOLD, 1); g.fillEllipse(x - 2, by + 6, 18, 22);
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, by + 30, 38, 8);
  g.fillStyle(GOLD_LIT, 1); g.fillRect(x - 7, by, 3, 24);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, by + 33, 3.5);
  // The clockwork hammer, cocked.
  g.lineStyle(3, IRON, 1); g.lineBetween(x + 26, by - 4, x + 20, by + 18);
  g.fillStyle(BRASS, 1); g.fillRect(x + 14, by + 14, 12, 8);
}

/**
 * Prince Lumen's Solarium: a long hall built entirely of glass on a marble podium — mirror
 * panels between the panes, a crystal dome cut in facets that splits the noon into rainbows
 * across the steps, two caryatids holding prisms up to the sun, and gilt doors with a sun mask.
 */
export function solarium(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  noonShadow(g, x, y + 4, w * 1.05, 0.26);
  // Podium.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0 - 10, y - 26, w + 20, 26);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 8, y - 28, w + 16, 22);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 8, y - 28, w + 16, 3);
  for (let k = 0; k < 8; k++) { g.fillStyle(GOLD, 0.9); sunburst(g, x0 + 20 + ((w - 40) * k) / 7, y - 15, 5, 8, 0.9); }
  const wallTop = y - 28 - h;
  // Glass walls: panes alternating clear glass and silvered mirror, all bright.
  const bays = Math.round(w / 40);
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x0 + i * bw;
    const mirror = i % 3 === 1;
    g.fillStyle(mirror ? mixC(GLASS_EDGE, 0xffffff, 0.4) : GLASS, 1); g.fillRect(bx, wallTop, bw, h);
    if (!mirror) {
      // The bare white room inside, seen through.
      g.fillStyle(MARBLE_DARK, 0.4); g.fillRect(bx, wallTop + h * 0.7, bw, h * 0.3);
      g.fillStyle(GOLD, 0.3); g.fillRect(bx + bw * 0.3, wallTop + h * 0.45, bw * 0.4, h * 0.25);
    } else {
      g.fillStyle(0xffffff, 0.7);
      g.fillTriangle(bx + 4, wallTop + 6, bx + bw * 0.6, wallTop + 6, bx + 4, wallTop + h * 0.6);
    }
    g.fillStyle(0xffffff, 0.5); g.fillRect(bx + 5, wallTop + 4, 2, h - 8);
    g.lineStyle(3, GOLD_DARK, 1); g.strokeRect(bx, wallTop, bw, h);
    g.lineStyle(1.5, GOLD_LIT, 1); g.lineBetween(bx + 1, wallTop + 1, bx + bw - 1, wallTop + 1);
    g.lineStyle(1, GOLD_DARK, 1); g.lineBetween(bx, wallTop + h * 0.5, bx + bw, wallTop + h * 0.5);
  }
  // Cornice with a frieze of little suns.
  g.fillStyle(MARBLE_DEEP, 1); g.fillRect(x0 - 8, wallTop - 14, w + 16, 14);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0 - 8, wallTop - 16, w + 16, 5);
  for (let sx = x0 + 6; sx < x0 + w; sx += 22) sunburst(g, sx, wallTop - 6, 4, 8, 1);
  // The crystal dome: faceted, every facet a different brightness, rainbow edges.
  const dr = Math.min(w * 0.24, 120);
  const dy = wallTop - 14;
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - dr - 8, dy - 12, dr * 2 + 16, 12);
  // Facets: a dome of triangular wedges, each shaded, so it reads as cut crystal.
  for (let c = 0; c < 10; c++) {
    const a0 = Math.PI + (c / 10) * Math.PI, a1 = Math.PI + ((c + 1) / 10) * Math.PI;
    const k = 0.5 + 0.5 * Math.sin(c * 1.7);
    g.fillStyle(mixC(GLASS, 0xffffff, k), 0.95);
    g.fillTriangle(x + Math.cos(a0) * dr, dy - 12 + Math.sin(a0) * dr * 0.85, x + Math.cos(a1) * dr, dy - 12 + Math.sin(a1) * dr * 0.85, x, dy - 12 - dr * 0.86);
    g.fillStyle(mixC(GLASS_EDGE, GLASS, k), 0.8);
    g.fillTriangle(x + Math.cos(a0) * dr, dy - 12 + Math.sin(a0) * dr * 0.85, x + Math.cos(a1) * dr, dy - 12 + Math.sin(a1) * dr * 0.85,
      x + Math.cos((a0 + a1) / 2) * dr * 0.55, dy - 12 + Math.sin((a0 + a1) / 2) * dr * 0.47);
    g.lineStyle(1, GOLD_DARK, 0.8);
    g.lineBetween(x + Math.cos(a0) * dr, dy - 12 + Math.sin(a0) * dr * 0.85, x, dy - 12 - dr * 0.86);
  }
  // A rainbow fringe round the dome's edge.
  for (let i = 0; i < SPECTRUM.length; i++) {
    g.lineStyle(1.5, SPECTRUM[i], 0.55);
    g.beginPath(); g.arc(x, dy - 12, dr + 2 + i * 1.6, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
  }
  // Finial: a great prism on a gilt spike.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 2, dy - 12 - dr * 0.86 - 18, 4, 18);
  const px = x, py = dy - 12 - dr * 0.86 - 30;
  g.fillStyle(PRISM_BLUE, 0.9); g.fillTriangle(px - 11, py + 10, px + 11, py + 10, px, py - 12);
  g.fillStyle(0xffffff, 0.8); g.fillTriangle(px - 6, py + 8, px, py + 8, px, py - 8);
  // The doors: gilt, with a sun-mask face.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 32, y - 28 - h * 0.7, 64, h * 0.7);
  g.fillStyle(GOLD, 1); g.fillRect(x - 29, y - 28 - h * 0.68, 58, h * 0.68);
  g.lineStyle(1.5, GOLD_DARK, 1); g.lineBetween(x, y - 28 - h * 0.68, x, y - 28);
  glow(g, x, y - 28 - h * 0.45, 24, GOLD_LIT, 0.07, 3);
  sunburst(g, x, y - 28 - h * 0.45, 16, 16, 1, GOLD_LIT);
  g.fillStyle(MARBLE_LIT, 1); g.fillCircle(x, y - 28 - h * 0.45, 6);
  g.fillStyle(GOLD_DARK, 1); g.fillCircle(x - 2.2, y - 28 - h * 0.46, 0.9); g.fillCircle(x + 2.2, y - 28 - h * 0.46, 0.9);
  // Caryatids holding prisms, either side of the door.
  for (const k of [-1, 1]) {
    const cx = x + k * 60, cb = y - 28;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - 7, cb - 54, 14, 54);
    g.fillStyle(MARBLE_LIT, 1); g.fillTriangle(cx - 8, cb, cx + 8, cb, cx, cb - 50);
    g.fillStyle(MARBLE_LIT, 1); g.fillCircle(cx, cb - 56, 5);
    g.lineStyle(3, MARBLE_LIT, 1); g.lineBetween(cx - 4, cb - 48, cx - 6, cb - 66); g.lineBetween(cx + 4, cb - 48, cx + 6, cb - 66);
    g.fillStyle(PRISM_BLUE, 0.85); g.fillTriangle(cx - 8, cb - 66, cx + 8, cb - 66, cx, cb - 80);
    g.fillStyle(0xffffff, 0.8); g.fillTriangle(cx - 4, cb - 67, cx, cb - 67, cx, cb - 76);
  }
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? MARBLE : MARBLE_LIT, 1); g.fillRect(x - 52 - k * 8, y - 8 + k * 4, 104 + k * 16, 5); }
  void rng;
}
