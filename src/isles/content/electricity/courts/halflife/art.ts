import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  AMBER, AMBER_DARK, AMBER_LIT, CAP, CAP_DIM, CAP_STEM, CHEREN, CHEREN_DIM, CHEREN_LIT, CONCRETE,
  CONCRETE_DARK, CONCRETE_LIT, COOLANT, COOLANT_DEEP, COOLANT_LIT, COPPER, COPPER_DARK, COPPER_LIT, GLOW, GLOW_DEEP,
  GLOW_DIM, GLOW_LIT, HAZARD_BLACK, IRON, IRON_DARK, IRON_LIT, LEAD, LEAD_DARK, LEAD_DEEP, LEAD_LIT, PITCH, PITCH_DARK,
  PITCH_LIT, PITCH_SHEEN, RUST, SPOIL, SPOIL_DARK, SPOIL_LIT, STORM, TIMBER, TIMBER_DARK, TIMBER_LIT, VERDIGRIS,
} from './palette';

/**
 * Halflife set pieces — the shapes only a town that glows has. Everything here is drawn *heavy*:
 * lead roofs in seamed sheets, cast concrete, riveted iron, casks with bands. The light comes
 * from below — the ore, the fungus, the pond, the dome's portholes — so every piece is darker at
 * the top than at its foot, and every glowing thing is drawn as a hard core inside soft halos.
 * Where the Prince has taken his lead back (a switched-off house) the roof is bare rafters and the
 * house glows from inside like a lantern nobody lit.
 */

// ── Small marks ──────────────────────────────────────────────────────

/** The trefoil: three blades round a hub. Painted on casks, gates, aprons and the dome. */
export function trefoil(g: G, x: number, y: number, r: number, color: number, bg?: number, a = 1): void {
  if (bg !== undefined) { g.fillStyle(bg, a); g.fillCircle(x, y, r * 1.12); }
  g.fillStyle(color, a);
  for (let k = 0; k < 3; k++) {
    const c = -Math.PI / 2 + (k / 3) * Math.PI * 2;
    g.slice(x, y, r, c - 0.52, c + 0.52, false);
    g.fillPath();
  }
  if (bg !== undefined) { g.fillStyle(bg, a); g.fillCircle(x, y, r * 0.3); }
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.2);
}

/** Black-and-amber hazard stripes in a rectangle. */
export function hazardStripe(g: G, x: number, y: number, w: number, h: number, a = 1): void {
  g.fillStyle(AMBER, a); g.fillRect(x, y, w, h);
  g.fillStyle(HAZARD_BLACK, a);
  const s = Math.max(6, h);
  for (let i = -h; i < w; i += s * 2) {
    const x0 = Math.max(x, x + i), x1 = Math.min(x + w, x + i + s);
    if (x1 <= x0) continue;
    g.fillTriangle(x0, y + h, Math.min(x + w, x0 + h), y, Math.min(x + w, x1 + h), y);
    g.fillTriangle(x0, y + h, x1, y + h, Math.min(x + w, x1 + h), y);
  }
}

/** A glowing core: a hard white-green heart inside soft halos. */
export function core(g: G, x: number, y: number, r: number, color = GLOW, a = 1): void {
  glow(g, x, y, r * 3, color, 0.05 * a, 4);
  g.fillStyle(color, 0.35 * a); g.fillCircle(x, y, r * 1.5);
  g.fillStyle(color, 0.9 * a); g.fillCircle(x, y, r);
  g.fillStyle(lit(color, 0.7), a); g.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.5);
}

// ── Ground ───────────────────────────────────────────────────────────

/** Pitch-blende rock: black-brown, greasy, with green glints of ore in the seams. */
export function pitchGround(g: G, r: Rect, rng: () => number, density = 1): void {
  g.fillStyle(PITCH, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = Math.floor((r.w * r.h) / 1400 * density);
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.45) { g.fillStyle(PITCH_LIT, 0.6); g.fillEllipse(x, y, 10 + rng() * 26, 5 + rng() * 10); }
    else if (k < 0.75) { g.fillStyle(PITCH_DARK, 0.7); g.fillEllipse(x, y, 8 + rng() * 18, 4 + rng() * 8); }
    else if (k < 0.93) { g.fillStyle(PITCH_SHEEN, 0.35); g.fillRect(x, y, 3 + rng() * 5, 1.5); }
    else { g.fillStyle(GLOW, 0.25 + rng() * 0.35); g.fillCircle(x, y, 1 + rng() * 1.5); }
  }
  // Cracks running through it.
  for (let i = 0; i < n / 30; i++) {
    let x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.lineStyle(1, PITCH_DARK, 0.8);
    for (let k = 0; k < 4; k++) {
      const nx = x + (rng() - 0.5) * 40, ny = y + (rng() - 0.5) * 30;
      g.lineBetween(x, y, nx, ny); x = nx; y = ny;
    }
  }
}

/** A road of tamped spoil and cinders, darker at its kerbs, a glint of ore here and there. */
export function spoilRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  const seg = (c: number, ww: number, a: number) => {
    g.lineStyle(ww, c, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    for (const p of pts) { g.fillStyle(c, a); g.fillCircle(p.x, p.y, ww / 2); }
  };
  seg(SPOIL_DARK, w + 10, 1);
  seg(SPOIL, w, 1);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < len; d += 9) {
      const t = d / len, px = a.x + (b.x - a.x) * t + (rng() - 0.5) * w * 0.9, py = a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.9;
      const k = rng();
      g.fillStyle(k < 0.5 ? SPOIL_LIT : k < 0.9 ? SPOIL_DARK : GLOW_DIM, k < 0.9 ? 0.6 : 0.7);
      g.fillCircle(px, py, k < 0.9 ? 1.5 + rng() * 2 : 1.2);
    }
  }
}

/** Narrow-gauge rails: timber sleepers, two iron rails with a lit top edge. */
export function railTrack(g: G, pts: Pt[]): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux;
    for (let d = 6; d < len; d += 16) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(cx - nx * 13, cy - ny * 13, cx + nx * 13, cy + ny * 13);
      g.lineStyle(3, TIMBER, 1); g.lineBetween(cx - nx * 12, cy - ny * 12 - 1, cx + nx * 12, cy + ny * 12 - 1);
    }
    for (const s of [-8, 8]) {
      g.lineStyle(3, IRON_DARK, 1); g.lineBetween(a.x + nx * s, a.y + ny * s + 1, b.x + nx * s, b.y + ny * s + 1);
      g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(a.x + nx * s, a.y + ny * s, b.x + nx * s, b.y + ny * s);
    }
  }
}

/**
 * An open pitch-blende pit: terraced benches stepping down into the dark, each lip a little lit,
 * ramps cut down the side, and at the bottom the seam itself glowing through standing water.
 */
export function openPit(g: G, cx: number, cy: number, rx: number, ry: number, rng: () => number): void {
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const k = i / steps;
    const ex = rx * (1 - k * 0.78), ey = ry * (1 - k * 0.78);
    const oy = k * 18;
    g.fillStyle(mixC(SPOIL_DARK, PITCH_DARK, k), 1); g.fillEllipse(cx, cy + oy, ex * 2, ey * 2);
    g.fillStyle(mixC(SPOIL, PITCH, k), 1); g.fillEllipse(cx, cy + oy + 4, ex * 2 - 10, ey * 2 - 8);
    g.lineStyle(2, mixC(SPOIL_LIT, PITCH_LIT, k), 0.8);
    g.beginPath(); g.arc(cx, cy + oy, ex - 2, Math.PI * 0.05, Math.PI * 0.95, false); g.strokePath();
    // Boulders and props along each bench.
    for (let j = 0; j < 10; j++) {
      const a = rng() * Math.PI * 2;
      const px = cx + Math.cos(a) * (ex - 14), py = cy + oy + Math.sin(a) * (ey - 10);
      g.fillStyle(PITCH_LIT, 0.8); g.fillEllipse(px, py, 8 + rng() * 8, 5 + rng() * 4);
    }
  }
  // The seam at the bottom: green through black water.
  const bx = rx * 0.22, by = ry * 0.22;
  g.fillStyle(GLOW_DEEP, 1); g.fillEllipse(cx, cy + 22, bx * 2, by * 2);
  g.fillStyle(GLOW_DIM, 0.7); g.fillEllipse(cx, cy + 22, bx * 1.4, by * 1.3);
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2, d = rng();
    g.fillStyle(GLOW_LIT, 0.4 + rng() * 0.4); g.fillCircle(cx + Math.cos(a) * bx * d, cy + 22 + Math.sin(a) * by * d, 1.5 + rng() * 2);
  }
  // A ramp cut down the south-west side.
  g.lineStyle(14, SPOIL_LIT, 0.5);
  g.beginPath(); g.arc(cx, cy + 6, rx * 0.7, Math.PI * 0.55, Math.PI * 1.05, false); g.strokePath();
}

/**
 * The cooling pond: a lead-lined, concrete-kerbed basin of green-blue coolant, glowing from its
 * floor. Ripples and steam are animated separately.
 */
export function coolingPond(g: G, r: Rect, rng: () => number): void {
  shadow(g, r.x + r.w / 2, r.y + r.h + 8, r.w * 1.05, 24, 0.4);
  g.fillStyle(CONCRETE_DARK, 1); g.fillRoundedRect(r.x - 16, r.y - 16, r.w + 32, r.h + 32, 22);
  g.fillStyle(CONCRETE, 1); g.fillRoundedRect(r.x - 12, r.y - 14, r.w + 24, r.h + 26, 20);
  // Kerb slabs.
  for (let x = r.x - 6; x < r.x + r.w + 6; x += 34) { g.lineStyle(1, CONCRETE_DARK, 0.7); g.lineBetween(x, r.y - 14, x, r.y - 2); g.lineBetween(x, r.y + r.h + 2, x, r.y + r.h + 12); }
  hazardStripe(g, r.x - 6, r.y - 6, r.w + 12, 5);
  g.fillStyle(LEAD_DEEP, 1); g.fillRoundedRect(r.x - 4, r.y - 2, r.w + 8, r.h + 6, 14);
  g.fillStyle(COOLANT_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 12);
  g.fillStyle(COOLANT, 0.8); g.fillRoundedRect(r.x + 10, r.y + 10, r.w - 20, r.h - 20, 10);
  // The floor glow: the spent rods racked on the bottom, seen through the water.
  for (let i = 0; i < 6; i++) {
    const x = r.x + 50 + (i * (r.w - 100)) / 5, y = r.y + r.h * 0.55;
    g.fillStyle(CHEREN, 0.18); g.fillEllipse(x, y, 60, 30);
    for (let k = -2; k <= 2; k++) { g.fillStyle(CHEREN_LIT, 0.35); g.fillRect(x + k * 7 - 1.5, y - 14, 3, 28); }
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle(COOLANT_LIT, 0.15 + rng() * 0.2);
    g.fillEllipse(r.x + 20 + rng() * (r.w - 40), r.y + 16 + rng() * (r.h - 32), 10 + rng() * 30, 2);
  }
}

// ── Glowing things ───────────────────────────────────────────────────

/** A cluster of glowcaps: pale stems, teal-glowing caps with dark gills, spores in the air. */
export function glowcaps(g: G, x: number, y: number, n: number, rng: () => number, s = 1): void {
  glow(g, x, y - 6 * s, 26 * s, CAP, 0.05, 3);
  for (let i = 0; i < n; i++) {
    const px = x + (rng() - 0.5) * 30 * s, py = y + (rng() - 0.5) * 8 * s;
    const h = (6 + rng() * 12) * s, cr = (4 + rng() * 6) * s;
    g.lineStyle(2 * s, CAP_STEM, 0.9); g.lineBetween(px, py, px + (rng() - 0.5) * 3, py - h);
    g.fillStyle(CAP_DIM, 1); g.fillEllipse(px, py - h + 1, cr * 2.1, cr * 0.9);
    g.fillStyle(CAP, 0.95); g.fillEllipse(px, py - h - 1, cr * 2, cr * 1.1);
    g.fillStyle(lit(CAP, 0.6), 0.9); g.fillEllipse(px - cr * 0.3, py - h - 2, cr * 0.7, cr * 0.4);
    for (let k = 0; k < 3; k++) { g.fillStyle(0xffffff, 0.7); g.fillCircle(px + (k - 1) * cr * 0.5, py - h - 1 + (k % 2), 0.8 * s); }
  }
}

/** A lead cask for spent isotope rods: banded, the trefoil stencilled on, a ring-pull lid. */
export function leadCask(g: G, x: number, y: number, s = 1, glowing = false): void {
  shadow(g, x, y + 1, 30 * s, 9 * s);
  const w = 24 * s, h = 30 * s;
  g.fillStyle(LEAD_DARK, 1); g.fillRoundedRect(x - w / 2, y - h, w, h, 5 * s);
  g.fillStyle(LEAD, 1); g.fillRoundedRect(x - w / 2 + 2 * s, y - h, w - 6 * s, h - 2 * s, 4 * s);
  g.fillStyle(LEAD_LIT, 0.5); g.fillRect(x - w / 2 + 4 * s, y - h + 3 * s, 3 * s, h - 8 * s);
  for (const k of [0.22, 0.78]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x - w / 2, y - h * k - 1.5 * s, w, 3 * s); }
  g.fillStyle(LEAD_LIT, 1); g.fillEllipse(x, y - h, w, 7 * s);
  g.lineStyle(1.5 * s, IRON, 1); g.strokeCircle(x, y - h, 3 * s);
  trefoil(g, x, y - h * 0.5, 5 * s, HAZARD_BLACK, AMBER);
  if (glowing) { g.fillStyle(GLOW, 0.5); g.fillEllipse(x, y - h - 1, w * 0.6, 3 * s); glow(g, x, y - h - 4 * s, 16 * s, GLOW, 0.05, 2); }
}

/** An isotope rod: a glass tube of green fire in a lead-capped sleeve. */
export function isotopeRod(g: G, x: number, y: number, len: number, angle: number, bright: number): void {
  const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
  const ax = x - ux * len / 2, ay = y - uy * len / 2, bx = x + ux * len / 2, by = y + uy * len / 2;
  glow(g, x, y, len * 0.8, GLOW, 0.04 * bright, 3);
  g.lineStyle(9, GLOW_DIM, 0.9); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(6, GLOW, 0.6 + bright * 0.4); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(2, GLOW_LIT, 0.5 + bright * 0.5); g.lineBetween(ax + nx, ay + ny, bx + nx, by + ny);
  for (const [ex, ey] of [[ax, ay], [bx, by]]) { g.fillStyle(LEAD_DARK, 1); g.fillCircle(ex, ey, 5.5); g.fillStyle(LEAD_LIT, 1); g.fillCircle(ex - 1, ey - 1, 2.5); }
}

/** An ore tub on its wheels, heaped with glowing pitch-blende. */
export function oreTub(g: G, x: number, y: number, s = 1, full = true): void {
  shadow(g, x, y + 2, 44 * s, 10 * s);
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k * 13 * s, y - 3 * s, 5 * s); g.fillStyle(IRON_LIT, 1); g.fillCircle(x + k * 13 * s, y - 3 * s, 1.8 * s); }
  g.fillStyle(RUST, 1); g.fillTriangle(x - 22 * s, y - 26 * s, x + 22 * s, y - 26 * s, x + 17 * s, y - 6 * s);
  g.fillTriangle(x - 22 * s, y - 26 * s, x + 17 * s, y - 6 * s, x - 17 * s, y - 6 * s);
  g.fillStyle(dim(RUST, 0.3), 1); g.fillRect(x - 22 * s, y - 27 * s, 44 * s, 3 * s);
  for (const k of [-0.5, 0, 0.5]) { g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x + k * 30 * s, y - 16 * s, 1.2 * s); }
  if (full) {
    for (let i = 0; i < 7; i++) {
      const px = x + (i - 3) * 6 * s, py = y - 28 * s - Math.sin((i / 6) * Math.PI) * 8 * s;
      g.fillStyle(i % 2 ? PITCH : PITCH_LIT, 1); g.fillCircle(px, py, 5 * s);
      if (i % 3 === 1) { g.fillStyle(GLOW, 0.8); g.fillCircle(px + 1, py - 1, 1.6 * s); }
    }
    glow(g, x, y - 32 * s, 22 * s, GLOW, 0.04, 2);
  }
}

// ── Decay clocks ─────────────────────────────────────────────────────

/**
 * A decay clock on its corner post: an iron pillar with a lead hood, an amber face divided not
 * into hours but into halves — ½, ¼, ⅛, each sector half the last — and a household number
 * stencilled under it. The hand is drawn in `decayHand` (animated).
 */
export function decayClock(g: G, x: number, y: number, no: number): void {
  shadow(g, x, y + 2, 26, 8);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 5, y - 74, 10, 74);
  g.fillStyle(IRON, 1); g.fillRect(x - 3, y - 74, 4, 72);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 9, y - 6, 18, 6);
  const cy = y - 92, R = 17;
  g.fillStyle(LEAD_DARK, 1); g.fillCircle(x, cy, R + 5);
  g.fillStyle(LEAD, 1); g.slice(x, cy - 2, R + 7, Math.PI, 0, false); g.fillPath();
  g.fillStyle(AMBER_DARK, 1); g.fillCircle(x, cy, R + 1);
  g.fillStyle(AMBER, 1); g.fillCircle(x, cy, R);
  // Halving sectors: ½ dark, ¼ light, ⅛ dark…
  let a0 = -Math.PI / 2, span = Math.PI;
  for (let k = 0; k < 5; k++) {
    g.fillStyle(k % 2 ? AMBER_LIT : AMBER, 1);
    g.slice(x, cy, R - 1, a0, a0 + span, false); g.fillPath();
    g.lineStyle(1, AMBER_DARK, 1); g.lineBetween(x, cy, x + Math.cos(a0) * R, cy + Math.sin(a0) * R);
    a0 += span; span /= 2;
  }
  g.lineStyle(1.5, HAZARD_BLACK, 1); g.strokeCircle(x, cy, R);
  // The household plate.
  g.fillStyle(HAZARD_BLACK, 1); g.fillRect(x - 10, y - 66, 20, 10);
  for (let i = 0; i < Math.min(5, no % 6 + 1); i++) { g.fillStyle(AMBER_LIT, 1); g.fillRect(x - 8 + i * 3.4, y - 63, 2, 4); }
}

/** The decay clock's hand: it creeps toward the last sector, faster the nearer it gets. */
export function decayHand(g: G, x: number, y: number, t: number, seed: number): void {
  const cy = y - 92;
  const ph = (t / (40 + seed * 20) + seed) % 1;
  // Each half of what is left takes as long as the whole before it — it always nearly gets there.
  const k = 1 - Math.pow(0.5, ph * 5);
  const a = -Math.PI / 2 + k * Math.PI * 2;
  g.lineStyle(2, HAZARD_BLACK, 1); g.lineBetween(x, cy, x + Math.cos(a) * 14, cy + Math.sin(a) * 14);
  g.fillStyle(HAZARD_BLACK, 1); g.fillCircle(x, cy, 2.2);
  if (k > 0.9) { g.fillStyle(AMBER_LIT, 0.4 + Math.sin(t * 12 + seed) * 0.3); g.fillCircle(x, cy - 26, 3); }
}

// ── Pylons and cable ─────────────────────────────────────────────────

/** A lattice pylon with porcelain insulators and copper cable lugs. */
export function pylon(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 2, 50, 12);
  const top = y - h, w0 = 22, w1 = 6;
  g.lineStyle(3, IRON_DARK, 1);
  g.lineBetween(x - w0, y, x - w1, top); g.lineBetween(x + w0, y, x + w1, top);
  g.lineStyle(1.5, IRON, 1);
  for (let k = 0; k < 7; k++) {
    const t0 = k / 7, t1 = (k + 1) / 7;
    const ya = y - h * t0, yb = y - h * t1;
    const wa = w0 + (w1 - w0) * t0, wb = w0 + (w1 - w0) * t1;
    g.lineBetween(x - wa, ya, x + wb, yb); g.lineBetween(x + wa, ya, x - wb, yb);
    g.lineBetween(x - wb, yb, x + wb, yb);
  }
  // Cross-arms.
  for (const [dy, half] of [[0, 34], [22, 26]] as [number, number][]) {
    g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x - half, top + dy, x + half, top + dy);
    for (const k of [-1, 1]) {
      const ix = x + k * half;
      for (let d = 0; d < 3; d++) { g.fillStyle(d % 2 ? 0xd8d4c8 : 0xf0ece0, 1); g.fillEllipse(ix, top + dy + 4 + d * 3, 7, 3); }
      g.fillStyle(COPPER, 1); g.fillCircle(ix, top + dy + 13, 2);
    }
  }
  g.fillStyle(AMBER, 1); g.fillRect(x - 6, y - 26, 12, 10);
  trefoil(g, x, y - 21, 3.5, HAZARD_BLACK);
}

/** The cable-lug points of a pylon of height `h` standing at x,y (for stringing cable). */
export const pylonLugs = (x: number, y: number, h: number): Pt[] => [
  { x: x - 34, y: y - h + 13 }, { x: x + 34, y: y - h + 13 }, { x: x - 26, y: y - h + 35 }, { x: x + 26, y: y - h + 35 },
];

/** A sagging copper cable between two points, with a spark running along it now and then. */
export function cable(g: G, a: Pt, b: Pt, sag: number, t: number, seed: number): void {
  const n = 14;
  g.lineStyle(1.6, COPPER_DARK, 0.95);
  g.beginPath(); g.moveTo(a.x, a.y);
  const pt = (k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag });
  for (let i = 1; i <= n; i++) { const p = pt(i / n); g.lineTo(p.x, p.y); }
  g.strokePath();
  const ph = (t * 0.6 + seed) % 3;
  if (ph < 1) {
    const p = pt(ph);
    g.fillStyle(CHEREN_LIT, 0.9); g.fillCircle(p.x, p.y, 2.2);
    g.fillStyle(CHEREN, 0.3); g.fillCircle(p.x, p.y, 6);
  }
}

// ── Buildings ────────────────────────────────────────────────────────

/** Lead sheet roofing: overlapping seamed sheets down a pitched face, rolled ridge on top. */
function leadRoof(g: G, x0: number, x1: number, eave: number, ridge: number, rng: () => number): void {
  const mid = (x0 + x1) / 2;
  g.fillStyle(LEAD_DARK, 1); g.fillTriangle(x0 - 8, eave, x1 + 8, eave, mid, ridge - 2);
  g.fillStyle(LEAD, 1); g.fillTriangle(x0 - 5, eave - 2, x1 + 5, eave - 2, mid, ridge);
  // Standing seams fanning from the ridge.
  for (let i = 1; i < 9; i++) {
    const ex = x0 - 5 + ((x1 - x0 + 10) * i) / 9;
    g.lineStyle(1.5, i % 2 ? LEAD_LIT : LEAD_DARK, 0.8); g.lineBetween(mid + (ex - mid) * 0.08, ridge + 4, ex, eave - 2);
  }
  // Patches and dull bloom.
  for (let i = 0; i < 4; i++) {
    const t = 0.3 + rng() * 0.6, px = mid + (rng() - 0.5) * (x1 - x0) * t, py = ridge + (eave - ridge) * t;
    g.fillStyle(rng() < 0.5 ? LEAD_LIT : dim(LEAD, 0.15), 0.6); g.fillRect(px - 6, py - 3, 12, 6);
  }
  g.lineStyle(3, LEAD_LIT, 1); g.lineBetween(mid - 3, ridge + 1, mid + 3, ridge + 1);
}

/** The brass meter on every door: a dial, a needle, a lock-light (red when switched off). */
export function doorMeter(g: G, x: number, y: number, off: boolean): void {
  g.fillStyle(COPPER_DARK, 1); g.fillRoundedRect(x - 6, y - 8, 12, 15, 2);
  g.fillStyle(0xe8e0c8, 1); g.fillCircle(x, y - 3, 4);
  g.lineStyle(1, HAZARD_BLACK, 1); g.lineBetween(x, y - 3, x + (off ? -3 : 3), y - 5);
  g.fillStyle(off ? 0xff3a2a : GLOW, 1); g.fillCircle(x, y + 4, 1.6);
}

export interface LeadHouseOpts {
  wall: number;
  /** Switched off: the lead taken back (bare rafters), windows dark, a red tag on the door. */
  off?: boolean;
  /** A dynamo crank by the door (most households have one). */
  crank?: boolean;
}

/**
 * A miner's cottage of black stone with a lead roof the Prince lends it, windows lit green, a
 * crank-dynamo by the door, a meter on the jamb and glowcaps in the gutter. Switched off, the
 * lead is stripped (rafters bare to the storm), the windows go black and the house glows sick
 * green through its stripped roof — the ore in its walls, with nothing to hold it in.
 */
export function leadHouse(g: G, x: number, y: number, w: number, h: number, o: LeadHouseOpts, rng: () => number): Pt {
  shadow(g, x, y + 4, w * 1.2, 22, 0.4);
  const x0 = x - w / 2, x1 = x + w / 2, top = y - h;
  g.fillStyle(dim(o.wall, 0.45), 1); g.fillRect(x0 - 2, top - 2, w + 4, h + 4);
  g.fillStyle(o.wall, 1); g.fillRect(x0, top, w, h);
  // Coursed stone, darker courses.
  for (let cy = top + 6; cy < y - 2; cy += 9) {
    g.lineStyle(1, dim(o.wall, 0.3), 0.7); g.lineBetween(x0, cy, x1, cy);
    for (let cx = x0 + ((cy / 9) % 2) * 9; cx < x1; cx += 18) g.lineBetween(cx, cy, cx, cy + 9);
  }
  // A skirt of lead flashing at the foot: the Prince's lead holds the ore in.
  g.fillStyle(LEAD_DARK, 1); g.fillRect(x0 - 2, y - 8, w + 4, 8);
  g.fillStyle(LEAD, 1); g.fillRect(x0 - 2, y - 8, w + 4, 2);
  const ridge = top - h * 0.55;
  if (o.off) {
    // Bare rafters, the inside glowing.
    g.fillStyle(GLOW_DEEP, 1); g.fillTriangle(x0 - 4, top, x1 + 4, top, x, ridge);
    g.fillStyle(GLOW_DIM, 0.6); g.fillTriangle(x0 + 8, top, x1 - 8, top, x, ridge + 8);
    for (let i = 0; i <= 6; i++) {
      const ex = x0 - 4 + ((w + 8) * i) / 6;
      g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x, ridge, ex, top);
    }
    g.lineStyle(3, TIMBER, 1); g.lineBetween(x0 - 4, top, x1 + 4, top);
    glow(g, x, top - 6, w * 0.5, GLOW, 0.05, 3);
    // One sheet left hanging off the eave.
    g.fillStyle(LEAD, 1); g.fillTriangle(x1 - 18, top, x1 + 6, top + 2, x1 + 2, top + 18);
  } else {
    leadRoof(g, x0, x1, top, ridge, rng);
  }
  // Windows.
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.28, wy = top + h * 0.38;
    g.fillStyle(dim(o.wall, 0.5), 1); g.fillRect(wx - 9, wy - 9, 18, 17);
    if (o.off) { g.fillStyle(0x0a0c0a, 1); g.fillRect(wx - 7, wy - 7, 14, 13); }
    else {
      g.fillStyle(GLOW_DIM, 1); g.fillRect(wx - 7, wy - 7, 14, 13);
      g.fillStyle(GLOW, 0.7); g.fillRect(wx - 6, wy - 6, 6, 5);
      glow(g, wx, wy, 16, GLOW, 0.035, 2);
    }
    g.lineStyle(1.5, LEAD_DARK, 1); g.lineBetween(wx, wy - 7, wx, wy + 6); g.lineBetween(wx - 7, wy - 1, wx + 7, wy - 1);
    // Lead shutters.
    g.fillStyle(LEAD, 1); g.fillRect(wx - 13, wy - 8, 4, 15); g.fillRect(wx + 9, wy - 8, 4, 15);
  }
  // Door, meter, tag.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 9, y - 26, 18, 26);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 7, y - 24, 14, 24);
  g.fillStyle(IRON, 1); g.fillRect(x + 3, y - 13, 3, 3);
  doorMeter(g, x - 15, y - 16, !!o.off);
  if (o.off) {
    g.fillStyle(0xd83a2a, 1); g.fillRect(x - 4, y - 20, 8, 10);
    g.lineStyle(1, 0xffffff, 0.9); g.lineBetween(x - 2, y - 17, x + 2, y - 13); g.lineBetween(x + 2, y - 17, x - 2, y - 13);
  }
  if (o.crank) {
    // A hand-crank dynamo on a post by the door, wired up the wall to the roof.
    const cx = x1 - 10;
    g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 2, y - 18, 4, 18);
    g.fillStyle(COPPER, 1); g.fillCircle(cx, y - 20, 6);
    g.fillStyle(COPPER_LIT, 1); g.fillCircle(cx - 1.5, y - 21.5, 2);
    g.lineStyle(2, IRON_LIT, 1); g.lineBetween(cx, y - 20, cx + 9, y - 26);
    g.fillStyle(TIMBER_LIT, 1); g.fillCircle(cx + 9, y - 26, 2);
    g.lineStyle(1.2, COPPER_DARK, 1); g.lineBetween(cx, y - 26, cx + 4, top - 4);
  }
  // Glowcaps along the gutter at the wall foot.
  for (let i = 0; i < 3; i++) {
    const px = x0 + 8 + rng() * (w - 16);
    if (Math.abs(px - x) < 14) continue;
    g.fillStyle(CAP, 0.85); g.fillEllipse(px, y - 1, 6, 3); g.fillStyle(CAP_STEM, 1); g.fillRect(px - 0.5, y - 1, 1, 2);
  }
  return { x, y: y + 16 };
}

/**
 * The Reactor Dome — Prince Isotope's hall. A drum of cast concrete on a stepped plinth, a
 * copper-banded dome riveted in lead plates, a ring of round portholes blazing Cherenkov blue,
 * a lead-lined double door under a hazard lintel and the great trefoil over it, a crown of
 * lightning rods on top, and fat cables running off it to the Grid. `w` is the drum width.
 */
export function reactorDome(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 10, w * 1.25, 46, 0.5);
  const x0 = x - w / 2;
  // Stepped plinth.
  for (let k = 0; k < 3; k++) {
    const pw = w + 70 - k * 22, py = y - k * 9;
    g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x - pw / 2, py - 10, pw, 10);
    g.fillStyle(CONCRETE, 1); g.fillRect(x - pw / 2, py - 10, pw, 3);
  }
  hazardStripe(g, x - w / 2 - 24, y - 6, w + 48, 6, 0.9);
  const drumTop = y - 27 - w * 0.34;
  // The drum: cast concrete with board-marks and a stain of green from the vents.
  g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x0 - 2, drumTop, w + 4, y - 27 - drumTop + 2);
  g.fillStyle(CONCRETE, 1); g.fillRect(x0, drumTop, w, y - 27 - drumTop);
  for (let cy = drumTop + 10; cy < y - 27; cy += 12) { g.lineStyle(1, CONCRETE_DARK, 0.4); g.lineBetween(x0, cy, x0 + w, cy); }
  for (let i = 0; i < 18; i++) { g.fillStyle(rng() < 0.5 ? CONCRETE_LIT : CONCRETE_DARK, 0.4); g.fillRect(x0 + rng() * (w - 20), drumTop + rng() * (y - 40 - drumTop), 12 + rng() * 20, 2); }
  for (let k = 0; k < 5; k++) { const sx = x0 + 30 + k * (w - 60) / 4; g.fillStyle(GLOW_DIM, 0.18); g.fillRect(sx - 6, drumTop + 20, 12, y - 50 - drumTop); }
  // Buttresses with copper conduit.
  for (let k = 0; k <= 4; k++) {
    const bx = x0 + (k * w) / 4;
    g.fillStyle(CONCRETE_DARK, 1); g.fillRect(bx - 8, drumTop - 4, 16, y - 23 - drumTop);
    g.fillStyle(CONCRETE_LIT, 0.6); g.fillRect(bx - 8, drumTop - 4, 3, y - 23 - drumTop);
    g.lineStyle(3, COPPER_DARK, 1); g.lineBetween(bx + 3, drumTop, bx + 3, y - 27);
    g.lineStyle(1, COPPER_LIT, 0.8); g.lineBetween(bx + 2, drumTop, bx + 2, y - 27);
  }
  // Portholes.
  const ph = drumTop + (y - 27 - drumTop) * 0.36;
  for (let k = 0; k < 4; k++) {
    const px = x0 + w / 8 + (k * w) / 4;
    if (Math.abs(px - x) < 50) continue;
    g.fillStyle(LEAD_DARK, 1); g.fillCircle(px, ph, 15);
    g.fillStyle(CHEREN_DIM, 1); g.fillCircle(px, ph, 11);
    g.fillStyle(CHEREN, 0.9); g.fillCircle(px, ph, 8);
    g.fillStyle(CHEREN_LIT, 0.8); g.fillCircle(px - 3, ph - 3, 3);
    for (let r = 0; r < 8; r++) { const a = (r / 8) * Math.PI * 2; g.fillStyle(IRON_LIT, 1); g.fillCircle(px + Math.cos(a) * 13, ph + Math.sin(a) * 13, 1.2); }
    glow(g, px, ph, 30, CHEREN, 0.05, 3);
  }
  // The dome: lead plates on copper ribs.
  const dr = w / 2 + 6, dcy = drumTop;
  g.fillStyle(LEAD_DEEP, 1); g.slice(x, dcy + 2, dr + 4, Math.PI, 0, false); g.fillPath();
  g.fillStyle(LEAD_DARK, 1); g.fillEllipse(x, dcy, dr * 2 + 6, dr * 1.25 + 6);
  g.fillStyle(LEAD, 1); g.fillEllipse(x, dcy - 2, dr * 2, dr * 1.25);
  g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x - dr - 4, dcy - 2, dr * 2 + 8, 10);
  // Plate rows.
  for (let row = 1; row < 5; row++) {
    const ry = dr * 0.625 * (row / 5);
    g.lineStyle(1, LEAD_DARK, 0.7); g.beginPath(); g.arc(x, dcy - 2, dr * (1 - row * 0.02), Math.PI + 0.04, -0.04, false); g.strokePath();
    g.lineStyle(1, LEAD_LIT, 0.35); g.strokeEllipse(x, dcy - 2 - ry * 0.3, dr * 2 * (1 - row / 6), dr * 1.25 * (1 - row / 6));
  }
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    g.lineStyle(3, COPPER_DARK, 1); g.lineBetween(x + Math.cos(a) * dr, dcy - 2 + Math.sin(a) * dr * 0.625, x, dcy - 2 - dr * 0.625);
    g.lineStyle(1, COPPER_LIT, 0.8); g.lineBetween(x + Math.cos(a) * dr - 1, dcy - 3 + Math.sin(a) * dr * 0.625, x - 1, dcy - 3 - dr * 0.625);
  }
  g.lineStyle(4, COPPER, 1); g.strokeEllipse(x, dcy - 2 - dr * 0.25, dr * 1.6, dr * 0.5);
  g.fillStyle(LEAD_LIT, 0.3); g.fillEllipse(x - dr * 0.35, dcy - dr * 0.4, dr * 0.5, dr * 0.25);
  // The crown: a ring of lightning rods and a squat copper cupola.
  const crownY = dcy - 2 - dr * 0.625;
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 22, crownY - 14, 44, 16);
  g.fillStyle(COPPER, 1); g.fillRect(x - 20, crownY - 14, 40, 5);
  g.fillStyle(VERDIGRIS, 0.7); g.fillRect(x - 20, crownY - 9, 40, 4);
  for (let k = -3; k <= 3; k++) {
    const rx = x + k * 9, rh = 30 + (3 - Math.abs(k)) * 12;
    g.lineStyle(2, IRON_DARK, 1); g.lineBetween(rx, crownY - 14, rx, crownY - 14 - rh);
    g.fillStyle(COPPER_LIT, 1); g.fillCircle(rx, crownY - 14 - rh, 2);
  }
  // The door: lead-lined, double, under a hazard lintel and the trefoil.
  const dh = 72;
  g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x - 46, y - 27 - dh - 10, 92, dh + 10);
  hazardStripe(g, x - 46, y - 27 - dh - 10, 92, 9);
  g.fillStyle(LEAD_DEEP, 1); g.fillRect(x - 38, y - 27 - dh, 76, dh);
  g.fillStyle(LEAD_DARK, 1); g.fillRect(x - 36, y - 27 - dh + 2, 35, dh - 2); g.fillRect(x + 1, y - 27 - dh + 2, 35, dh - 2);
  for (const k of [-1, 1]) {
    for (let r = 0; r < 5; r++) { g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x + k * 32, y - 27 - dh + 10 + r * 14, 1.5); }
    g.fillStyle(IRON, 1); g.fillRect(x + k * 6 - 2, y - 27 - dh * 0.55, 4, 14);
  }
  g.fillStyle(CHEREN, 0.5); g.fillRect(x - 1, y - 27 - dh + 2, 2, dh - 2);
  trefoil(g, x, y - 27 - dh - 40, 22, HAZARD_BLACK, AMBER);
  g.lineStyle(2, AMBER_DARK, 1); g.strokeCircle(x, y - 27 - dh - 40, 25);
}

/**
 * A cooling tower: a hyperboloid of ribbed concrete, waisted, rim lit, stained green near the
 * top where the vapour comes off. The plume is animated in `towerSteam`.
 */
export function coolingTower(g: G, x: number, y: number, s = 1): void {
  const h = 200 * s, wb = 70 * s, ww = 42 * s, wt = 52 * s;
  shadow(g, x, y + 4, wb * 2.4, 28 * s, 0.45);
  const rows = 22;
  for (let i = 0; i < rows; i++) {
    const t0 = i / rows, t1 = (i + 1) / rows;
    const half = (t: number) => (t < 0.7 ? wb + (ww - wb) * Math.sin((t / 0.7) * Math.PI / 2) : ww + (wt - ww) * ((t - 0.7) / 0.3) ** 2);
    const y0 = y - h * t0, y1 = y - h * t1;
    const h0 = half(t0), h1 = half(t1);
    const c = mixC(CONCRETE_DARK, CONCRETE, 0.35 + Math.sin(t0 * Math.PI) * 0.5);
    g.fillStyle(c, 1);
    g.fillTriangle(x - h0, y0, x + h0, y0, x + h1, y1);
    g.fillTriangle(x - h0, y0, x + h1, y1, x - h1, y1);
    g.fillStyle(CONCRETE_LIT, 0.35); g.fillTriangle(x - h0, y0, x - h0 * 0.6, y0, x - h1 * 0.6, y1); g.fillTriangle(x - h0, y0, x - h1 * 0.6, y1, x - h1, y1);
    g.fillStyle(CONCRETE_DARK, 0.4); g.fillTriangle(x + h0 * 0.55, y0, x + h0, y0, x + h1, y1); g.fillTriangle(x + h0 * 0.55, y0, x + h1, y1, x + h1 * 0.55, y1);
    if (i % 3 === 0) { g.lineStyle(1, CONCRETE_DARK, 0.5); g.lineBetween(x - h0, y0, x + h0, y0); }
    if (i > rows - 5) { g.fillStyle(GLOW_DIM, 0.12); g.fillTriangle(x - h0, y0, x + h0, y0, x, y1); }
  }
  // Rim and the dark mouth.
  g.fillStyle(CONCRETE_DARK, 1); g.fillEllipse(x, y - h, wt * 2, 14 * s);
  g.fillStyle(0x10141a, 1); g.fillEllipse(x, y - h + 1, wt * 2 - 8, 9 * s);
  // Splayed legs at the foot, air inlets glowing.
  for (let k = -5; k <= 5; k++) {
    const lx = x + k * wb * 0.18;
    g.lineStyle(3 * s, CONCRETE_DARK, 1); g.lineBetween(lx, y, lx + k * 2, y - 16 * s);
  }
  g.fillStyle(CHEREN, 0.12); g.fillRect(x - wb + 6, y - 14 * s, wb * 2 - 12, 12 * s);
}

/** The vapour off a cooling tower: slow, rolling, lit green from below by the town. */
export function towerSteam(g: G, x: number, topY: number, t: number, s = 1): void {
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.07 + i / 9) % 1;
    const px = x + Math.sin(ph * 4 + i) * 14 * s + ph * 60 * s, py = topY - ph * 150 * s;
    const r = (22 + ph * 46) * s;
    g.fillStyle(mixC(0xdfe6ea, GLOW_LIT, 0.25 - ph * 0.2), 0.16 * (1 - ph));
    g.fillCircle(px, py, r);
  }
}

/**
 * The headframe over the main shaft: a riveted A-frame of steel with two sheave wheels at the
 * top, the winding ropes running down to a cage at the collar, a hazard-striped collar and the
 * engine house's cable trailing off. The wheels turn in `sheaves`.
 */
export function headframe(g: G, x: number, y: number, s = 1): void {
  const h = 230 * s, w = 70 * s;
  shadow(g, x, y + 4, w * 2.6, 26 * s, 0.4);
  // The shaft collar.
  g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x - w * 0.9, y - 14 * s, w * 1.8, 14 * s);
  hazardStripe(g, x - w * 0.9, y - 14 * s, w * 1.8, 5 * s);
  g.fillStyle(0x07080a, 1); g.fillRect(x - w * 0.55, y - 9 * s, w * 1.1, 9 * s);
  // Legs.
  const top = y - h;
  for (const k of [-1, 1]) {
    g.lineStyle(7 * s, IRON_DARK, 1); g.lineBetween(x + k * w, y - 10 * s, x + k * w * 0.32, top);
    g.lineStyle(3 * s, IRON, 1); g.lineBetween(x + k * w - 2, y - 10 * s, x + k * w * 0.32 - 2, top);
  }
  // The back-stay leaning to the engine house.
  g.lineStyle(6 * s, IRON_DARK, 1); g.lineBetween(x + w * 0.2, top + 10 * s, x + w * 2.1, y - 10 * s);
  // Lattice bracing.
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8, t1 = (i + 1) / 8;
    const wa = w - (w * 0.68) * t0, wb = w - (w * 0.68) * t1;
    const ya = y - 10 * s - (h - 10 * s) * t0, yb = y - 10 * s - (h - 10 * s) * t1;
    g.lineStyle(2 * s, IRON, 1); g.lineBetween(x - wa, ya, x + wb, yb); g.lineBetween(x + wa, ya, x - wb, yb);
    g.lineStyle(2.5 * s, IRON_DARK, 1); g.lineBetween(x - wb, yb, x + wb, yb);
  }
  // The sheave deck.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - w * 0.5, top - 6 * s, w, 8 * s);
  g.fillStyle(RUST, 0.6); g.fillRect(x - w * 0.5, top - 6 * s, w, 2 * s);
  // Ropes down to the cage.
  for (const k of [-1, 1]) { g.lineStyle(1.5, 0x9a9a90, 1); g.lineBetween(x + k * 16 * s, top - 6 * s, x + k * 16 * s, y - 56 * s); }
  // The cage, part-way up, lit inside.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 24 * s, y - 56 * s, 48 * s, 40 * s);
  g.fillStyle(GLOW_DEEP, 1); g.fillRect(x - 20 * s, y - 52 * s, 40 * s, 32 * s);
  for (let k = -2; k <= 2; k++) { g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x + k * 8 * s, y - 52 * s, x + k * 8 * s, y - 20 * s); }
  g.fillStyle(LEAD, 1); g.fillRect(x - 26 * s, y - 60 * s, 52 * s, 5 * s);
  // A lamp on the deck, green.
  g.fillStyle(GLOW, 1); g.fillCircle(x + w * 0.45, top - 10 * s, 3 * s);
  glow(g, x + w * 0.45, top - 10 * s, 18 * s, GLOW, 0.06, 2);
}

/** The headframe's two sheave wheels, turning as the cage winds. */
export function sheaves(g: G, x: number, y: number, t: number, s = 1): void {
  const top = y - 230 * s - 12 * s;
  for (const k of [-1, 1]) {
    const cx = x + k * 16 * s, r = 15 * s;
    const a0 = t * 1.6 * k;
    g.lineStyle(3 * s, IRON_DARK, 1); g.strokeCircle(cx, top, r);
    g.lineStyle(1.2 * s, IRON_LIT, 1); g.strokeCircle(cx, top, r - 2 * s);
    for (let i = 0; i < 6; i++) { const a = a0 + (i / 6) * Math.PI * 2; g.lineStyle(1.5 * s, IRON, 1); g.lineBetween(cx, top, cx + Math.cos(a) * r, top + Math.sin(a) * r); }
    g.fillStyle(RUST, 1); g.fillCircle(cx, top, 3 * s);
  }
}

/** The engine house beside the headframe: brick, a tall arched window lit by the winder's arc. */
export function engineHouse(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 150, 22, 0.4);
  const w = 120, h = 90;
  g.fillStyle(dim(RUST, 0.35), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(dim(RUST, 0.15), 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let i = 0; i < 70; i++) { g.fillStyle(rng() < 0.5 ? dim(RUST, 0.3) : RUST, 0.5); g.fillRect(x - w / 2 + rng() * (w - 8), y - h + rng() * (h - 4), 8, 3); }
  leadRoof(g, x - w / 2, x + w / 2, y - h, y - h - 40, rng);
  g.fillStyle(dim(RUST, 0.5), 1); g.fillRect(x - 18, y - h + 12, 36, 60);
  g.fillStyle(CHEREN_DIM, 1); g.fillRect(x - 15, y - h + 15, 30, 54);
  g.fillStyle(CHEREN, 0.6); g.fillRect(x - 13, y - h + 17, 12, 50);
  g.lineStyle(1.5, dim(RUST, 0.5), 1); g.lineBetween(x, y - h + 15, x, y - h + 69); g.lineBetween(x - 15, y - h + 40, x + 15, y - h + 40);
  glow(g, x, y - h + 40, 40, CHEREN, 0.04, 3);
  // A chimney — cold. Flame is contraband; the winder runs off the Grid.
  g.fillStyle(dim(RUST, 0.3), 1); g.fillRect(x + w / 2 - 26, y - h - 70, 16, 50);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + w / 2 - 28, y - h - 74, 20, 5);
}

/**
 * The Tally House: where every household's hod of ore is weighed against its Draw. A long low
 * shed of lead and timber, a weighbridge out front with a hod on the pan, the quota board chalked
 * with households and numbers, and the Brownout Bell's cousin — the Scram Bell — on a gantry.
 */
export function tallyHouse(g: G, x: number, y: number, rng: () => number): void {
  const w = 260, h = 80;
  shadow(g, x, y + 4, w * 1.15, 26, 0.4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let px = x - w / 2 + 10; px < x + w / 2; px += 12) { g.lineStyle(1, TIMBER_DARK, 0.6); g.lineBetween(px, y - h, px, y); }
  leadRoof(g, x - w / 2, x + w / 2, y - h, y - h - 46, rng);
  // The quota board.
  const bx = x - 70, by = y - h + 12;
  g.fillStyle(HAZARD_BLACK, 1); g.fillRect(bx - 50, by, 100, 52);
  g.lineStyle(2, TIMBER_LIT, 1); g.strokeRect(bx - 50, by, 100, 52);
  for (let r = 0; r < 6; r++) {
    g.fillStyle(0xe8e4d8, 0.75); g.fillRect(bx - 44, by + 6 + r * 7.5, 26 + rng() * 14, 2);
    const owe = rng() < 0.3;
    g.fillStyle(owe ? 0xff6a4a : 0xe8e4d8, 0.85); g.fillRect(bx + 18, by + 6 + r * 7.5, 18, 2);
    if (owe) { g.lineStyle(1, 0xff6a4a, 0.9); g.lineBetween(bx - 46, by + 7 + r * 7.5, bx + 44, by + 7 + r * 7.5); }
  }
  // The window-hatch, lit.
  g.fillStyle(GLOW_DIM, 1); g.fillRect(x + 40, y - h + 20, 46, 26);
  g.fillStyle(GLOW, 0.5); g.fillRect(x + 42, y - h + 22, 20, 22);
  g.fillStyle(LEAD, 1); g.fillRect(x + 36, y - h + 46, 54, 5);
  // The weighbridge in front.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 30, y + 6, 70, 10);
  g.fillStyle(IRON, 1); g.fillRect(x - 28, y + 6, 66, 3);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 50, y - 50, 6, 60);
  g.fillStyle(0xe8e0c8, 1); g.fillCircle(x + 53, y - 56, 11);
  g.lineStyle(1.5, AMBER_DARK, 1); g.strokeCircle(x + 53, y - 56, 11);
  g.lineStyle(1.5, HAZARD_BLACK, 1); g.lineBetween(x + 53, y - 56, x + 59, y - 62);
  // A hod on the pan.
  g.fillStyle(TIMBER_DARK, 1); g.fillTriangle(x - 14, y + 4, x + 22, y + 4, x + 18, y - 16);
  g.fillTriangle(x - 14, y + 4, x + 18, y - 16, x - 10, y - 16);
  for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? PITCH : PITCH_LIT, 1); g.fillCircle(x - 8 + i * 6, y - 18, 4); }
  g.fillStyle(GLOW, 0.7); g.fillCircle(x + 4, y - 20, 1.5);
}

/** The Scram Bell on its gantry: rung when the dome runs hot, and every night when the Draw is drawn. */
export function scramBell(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 12);
  for (const k of [-1, 1]) { g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x + k * 28, y, x + k * 18, y - 96); }
  g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x - 24, y - 96, x + 24, y - 96);
  hazardStripe(g, x - 24, y - 100, 48, 6);
  // The bell.
  g.fillStyle(COPPER_DARK, 1);
  g.fillTriangle(x - 18, y - 60, x + 18, y - 60, x + 10, y - 88); g.fillTriangle(x - 18, y - 60, x + 10, y - 88, x - 10, y - 88);
  g.fillStyle(COPPER, 1); g.fillTriangle(x - 16, y - 62, x + 4, y - 62, x - 6, y - 86);
  g.fillStyle(COPPER_LIT, 1); g.fillEllipse(x, y - 60, 38, 7);
  g.fillStyle(VERDIGRIS, 0.6); g.fillRect(x - 12, y - 78, 24, 3);
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 56, 3);
  // The electric striker on its arm, and the rope nobody's allowed to pull.
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x + 18, y - 96, x + 22, y - 70);
  g.fillStyle(CHEREN, 0.8); g.fillCircle(x + 22, y - 68, 2.5);
  g.lineStyle(1.5, 0xc8b890, 1); g.lineBetween(x - 4, y - 56, x - 6, y - 14);
}

/**
 * The Plumbery: the lead works, where roofs are rolled and aprons cast. An arc furnace (no
 * flame — the arc comes off the Grid) in a lead-lined bay, ingots stacked by the door, a sheet of
 * lead on the rolling bed, a crane arm.
 */
export function plumbery(g: G, x: number, y: number, _rng: () => number): void {
  const w = 220, h = 96;
  shadow(g, x, y + 4, w * 1.2, 26, 0.4);
  g.fillStyle(LEAD_DEEP, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(LEAD_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let px = x - w / 2; px < x + w / 2; px += 22) { g.lineStyle(2, LEAD, 0.8); g.lineBetween(px, y - h, px, y); }
  // Saw-tooth roof of lead.
  for (let k = 0; k < 4; k++) {
    const sx = x - w / 2 + k * (w / 4);
    g.fillStyle(LEAD, 1); g.fillTriangle(sx, y - h, sx + w / 4, y - h, sx + w / 4, y - h - 34);
    g.fillStyle(GLOW_DIM, 0.6); g.fillRect(sx + w / 4 - 4, y - h - 30, 4, 28);
  }
  // The furnace bay, open, white-blue arc inside.
  g.fillStyle(0x090a0c, 1); g.fillRect(x - 70, y - 64, 70, 64);
  g.fillStyle(SPOIL_DARK, 1); g.fillRect(x - 60, y - 40, 50, 40);
  g.fillStyle(0xd8e8ff, 0.9); g.fillEllipse(x - 35, y - 42, 18, 8);
  glow(g, x - 35, y - 42, 40, CHEREN_LIT, 0.06, 3);
  for (const k of [-1, 1]) { g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x - 35 + k * 8, y - 64, x - 35 + k * 4, y - 46); }
  // A ladle of molten lead tipping into a mould.
  g.fillStyle(SPOIL, 1); g.fillEllipse(x - 20, y - 8, 30, 8);
  g.fillStyle(LEAD_LIT, 1); g.fillEllipse(x - 20, y - 9, 22, 4);
  // Ingots stacked by the door.
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 4 - r; k++) {
      const ix = x + 40 + k * 18 + r * 9, iy = y - 4 - r * 8;
      g.fillStyle(LEAD_DARK, 1); g.fillRect(ix - 8, iy - 6, 16, 7);
      g.fillStyle(LEAD_LIT, 1); g.fillRect(ix - 7, iy - 6, 14, 2);
    }
  }
  // The crane arm.
  g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x + w / 2 - 10, y - h, x + w / 2 - 10, y - h - 60); g.lineBetween(x + w / 2 - 10, y - h - 60, x + w / 2 + 40, y - h - 50);
  g.lineStyle(1.5, 0x9a9a90, 1); g.lineBetween(x + w / 2 + 36, y - h - 50, x + w / 2 + 36, y - h + 6);
  g.fillStyle(LEAD, 1); g.fillRect(x + w / 2 + 24, y - h + 6, 24, 16);
}

/** The Glow Ward: the infirmary, lead to the eaves, its windows lit the soft white of a ward at night. */
export function glowWard(g: G, x: number, y: number, rng: () => number): void {
  const w = 200, h = 84;
  shadow(g, x, y + 4, w * 1.2, 24, 0.4);
  g.fillStyle(LEAD_DARK, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(LEAD, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let cy = y - h + 12; cy < y; cy += 14) { g.lineStyle(1, LEAD_DARK, 0.7); g.lineBetween(x - w / 2, cy, x + w / 2, cy); }
  leadRoof(g, x - w / 2, x + w / 2, y - h, y - h - 36, rng);
  for (let k = 0; k < 5; k++) {
    const wx = x - w / 2 + 22 + k * ((w - 44) / 4);
    if (k === 2) continue;
    g.fillStyle(LEAD_DEEP, 1); g.fillRoundedRect(wx - 10, y - h + 18, 20, 30, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillStyle(0xe8f4e8, 0.9); g.fillRoundedRect(wx - 8, y - h + 20, 16, 26, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.fillStyle(GLOW_LIT, 0.4); g.fillRect(wx - 6, y - h + 30, 5, 14);
    glow(g, wx, y - h + 34, 18, 0xf0fff0, 0.035, 2);
  }
  // Door with a green cross of glowcap painted on — the only cross in the town.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 14, y - 40, 28, 40);
  g.fillStyle(CAP, 0.85); g.fillRect(x - 3, y - 34, 6, 18); g.fillRect(x - 9, y - 28, 18, 6);
  glow(g, x, y - 25, 16, CAP, 0.05, 2);
}

/**
 * The Rod Store: a rack of fresh isotope rods in their lead sleeves under an awning, behind a
 * hazard rail, with a crane hook and a stack of spent casks.
 */
export function rodStore(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 200, 22, 0.4);
  // The rack.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 80, y - 70, 160, 8); g.fillRect(x - 80, y - 14, 160, 8);
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x + k * 80 - 4, y - 74, 8, 74); }
  for (let i = 0; i < 9; i++) {
    const rx = x - 64 + i * 16;
    g.fillStyle(LEAD_DARK, 1); g.fillRect(rx - 5, y - 62, 10, 48);
    g.fillStyle(GLOW, 0.55 + (i % 3) * 0.15); g.fillRect(rx - 2, y - 58, 4, 40);
    g.fillStyle(GLOW_LIT, 0.7); g.fillRect(rx - 1, y - 56, 1.5, 34);
  }
  glow(g, x, y - 40, 90, GLOW, 0.03, 3);
  // Awning of lead sheet on two poles.
  g.fillStyle(LEAD, 1); g.fillTriangle(x - 100, y - 96, x + 100, y - 96, x + 110, y - 80); g.fillTriangle(x - 100, y - 96, x + 110, y - 80, x - 110, y - 80);
  hazardStripe(g, x - 110, y - 82, 220, 4);
  // The hazard rail.
  for (let k = 0; k < 6; k++) { const px = x - 100 + k * 40; g.fillStyle(AMBER, 1); g.fillRect(px - 2, y - 24, 4, 24); }
  g.lineStyle(2, AMBER_DARK, 1); g.lineBetween(x - 100, y - 20, x + 100, y - 20);
  leadCask(g, x + 120, y + 4, 0.9, true);
  leadCask(g, x + 144, y, 0.8);
}

/** The waystone: a lead-sheathed pillar with an amber decay ring and a green core in a glass port. */
export function halflifeWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 12);
  g.fillStyle(CONCRETE_DARK, 1); g.fillRect(x - 18, y - 10, 36, 10);
  g.fillStyle(LEAD_DARK, 1); g.fillTriangle(x - 13, y - 10, x + 13, y - 10, x + 8, y - 70); g.fillTriangle(x - 13, y - 10, x + 8, y - 70, x - 8, y - 70);
  g.fillStyle(LEAD, 1); g.fillTriangle(x - 10, y - 12, x + 2, y - 12, x - 5, y - 68);
  g.fillStyle(LEAD_LIT, 1); g.fillTriangle(x - 8, y - 70, x + 8, y - 70, x, y - 82);
  g.lineStyle(2, AMBER, 1); g.strokeCircle(x, y - 42, 9);
  g.fillStyle(GLOW_DIM, 1); g.fillCircle(x, y - 42, 6);
  g.fillStyle(GLOW, 1); g.fillCircle(x, y - 42, 3.5);
  glow(g, x, y - 42, 24, GLOW, 0.06, 3);
}

/** A hazard fence post with a chain to the next one. */
export function chainFence(g: G, a: Pt, b: Pt): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.round(len / 60));
  for (let i = 0; i <= n; i++) {
    const px = a.x + ((b.x - a.x) * i) / n, py = a.y + ((b.y - a.y) * i) / n;
    g.fillStyle(HAZARD_BLACK, 1); g.fillRect(px - 2.5, py - 26, 5, 26);
    for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? AMBER : HAZARD_BLACK, 1); g.fillRect(px - 2.5, py - 26 + k * 6, 5, 6); }
    if (i < n) {
      const qx = a.x + ((b.x - a.x) * (i + 1)) / n, qy = a.y + ((b.y - a.y) * (i + 1)) / n;
      g.lineStyle(1.5, IRON_LIT, 0.9);
      g.beginPath(); g.moveTo(px, py - 20);
      for (let k = 1; k <= 8; k++) { const t = k / 8; g.lineTo(px + (qx - px) * t, py - 20 + (qy - py) * t + Math.sin(t * Math.PI) * 8); }
      g.strokePath();
    }
  }
}

/** A storm flash: the whole view washed pale for an instant, a few times a minute. */
export function stormFlash(g: G, view: Rect, t: number): void {
  const ph = (t * 0.23) % 7;
  if (ph > 0.25) return;
  const k = ph < 0.08 ? ph / 0.08 : 1 - (ph - 0.08) / 0.17;
  g.fillStyle(STORM, 0.12 * k); g.fillRect(view.x, view.y, view.w, view.h);
}

/** The pond's steam and ripples, and its Cherenkov flicker. */
export function pondSurface(g: G, r: Rect, t: number): void {
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.3 + i / 5) % 1;
    const cx = r.x + 50 + ((i * 113) % (r.w - 100)), cy = r.y + 30 + ((i * 61) % (r.h - 60));
    g.lineStyle(1.2, COOLANT_LIT, 0.45 * (1 - ph)); g.strokeEllipse(cx, cy, 10 + ph * 50, 3 + ph * 16);
  }
  const fl = 0.5 + Math.sin(t * 7) * 0.2 + Math.sin(t * 17) * 0.1;
  g.fillStyle(CHEREN, 0.05 * fl); g.fillRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
  for (let i = 0; i < 8; i++) {
    const ph = (t * 0.12 + i / 8) % 1;
    g.fillStyle(0xe8f0f0, 0.08 * Math.sin(ph * Math.PI));
    g.fillCircle(r.x + 30 + ((i * 97) % (r.w - 60)) + ph * 20, r.y + r.h * 0.5 - ph * 70, 14 + ph * 20);
  }
}

/** Glowcaps breathing: a soft pulse over a cluster. */
export function capPulse(g: G, x: number, y: number, t: number, seed: number): void {
  const k = 0.5 + Math.sin(t * 1.4 + seed) * 0.5;
  g.fillStyle(CAP, 0.04 + k * 0.05); g.fillCircle(x, y - 8, 24 + k * 6);
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.25 + i / 3 + seed) % 1;
    g.fillStyle(lit(CAP, 0.5), 0.6 * Math.sin(ph * Math.PI)); g.fillCircle(x + Math.sin(ph * 6 + i) * 10, y - 10 - ph * 40, 1.2);
  }
}

/** The dome's portholes and door seam, flickering as the core breathes. */
export function domeFlicker(g: G, x: number, y: number, w: number, t: number): void {
  const x0 = x - w / 2;
  const drumTop = y - 27 - w * 0.34;
  const ph = drumTop + (y - 27 - drumTop) * 0.36;
  const k = 0.6 + Math.sin(t * 3.1) * 0.25 + Math.sin(t * 11.7) * 0.15;
  for (let i = 0; i < 4; i++) {
    const px = x0 + w / 8 + (i * w) / 4;
    if (Math.abs(px - x) < 50) continue;
    g.fillStyle(CHEREN_LIT, 0.25 * k); g.fillCircle(px, ph, 9);
    g.fillStyle(CHEREN, 0.06 * k); g.fillCircle(px, ph, 30);
  }
  g.fillStyle(CHEREN_LIT, 0.4 * k); g.fillRect(x - 1, y - 99, 2, 70);
  glow(g, x, y - 20, 60, CHEREN, 0.02 * k, 2);
}

/** Ore glints in the pit, winking. */
export function pitGlints(g: G, cx: number, cy: number, rx: number, ry: number, t: number): void {
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4, d = 0.15 + ((i * 37) % 10) / 14;
    const tw = Math.max(0, Math.sin(t * 2 + i * 1.7));
    g.fillStyle(GLOW_LIT, 0.7 * tw); g.fillCircle(cx + Math.cos(a) * rx * d * 0.8, cy + 10 + Math.sin(a) * ry * d * 0.8, 1.6 + tw);
  }
}
