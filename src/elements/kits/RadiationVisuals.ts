import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Radiation draws.
 *
 * One material and one silhouette rule. The material is **lead with something loose inside it**:
 * every shape in this file is a heavy, flat, dark-violet plate with a hard edge, and every one of
 * them has a seam in it that the green is getting out through. Nothing here glows all over — the
 * glow is always a crack, a vent, a window or a lamp, because a suit that is uniformly green is a
 * suit that is not containing anything.
 *
 * The rule is that the element is **instrumentation**: if a shape does something, it says so
 * first. Tracers blink before they confirm, the sighting cone closes before it fires, the airdrop paints its
 * own footprint on the floor a second and a half before it lands. Radiation never surprises
 * anybody; it just arrives on schedule.
 *
 * The palette is a lead ladder and a neon ladder with two colours off them: the hazard yellow of
 * a stripe and the white-hot core of the railgun itself.
 */

export type RadiationColorFn = ColorFn;

export const RAD = {
  /** Under everything. */
  ink: 0x0b0614,
  /** Lead: the armour, the bunker, every heavy plate in the element. */
  leadDeep: 0x1c1030,
  lead: 0x33194f,
  leadLit: 0x512b78,
  /** The seam colour — where lead stops working. */
  seam: 0x7a3fb0,
  /** Neon: the load. Five steps so a lamp, a seam and a detonation are not the same green. */
  neonDeep: 0x1f5a10,
  neonMid: 0x3f9e18,
  neon: 0x7cff3d,
  neonLit: 0xc2ff8f,
  wash: 0xeeffdc,
  /** Hazard yellow — stripes, closing locks and nothing else. */
  hazard: 0xe0b52a,
  hazardDeep: 0x6d550c,
  /** The railgun's core, and the only white in the element. */
  core: 0xf6ffe8,
  /** The hot ladder — reserved for things going wrong. */
  hotDeep: 0x4d0c05,
  hotMid: 0xa8180b,
  hot: 0xff3524,
  hotLit: 0xff9b84,
};

/** Channel-wise blend, `k` of `b` over `a`. */
export function mixColor(a: number, b: number, k: number): number {
  const t = Math.max(0, Math.min(1, k));
  const r = Math.round(((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t);
  const g = Math.round(((a >> 8) & 0xff) * (1 - t) + ((b >> 8) & 0xff) * t);
  const bl = Math.round((a & 0xff) * (1 - t) + (b & 0xff) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Deterministic 0–1 noise, so a shape keeps its outline between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 53.1 + i * 71.9) * 24571.317;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used to sink a fill into shadow, never to recolour it. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * The trefoil. Three blades around a hub, drawn from real sector geometry rather than three
 * triangles so the inner cut-out is a proper arc — the symbol is instantly readable at 8 px and
 * completely unreadable if the blades are wedges, which is why it is worth doing properly.
 */
export function trefoil(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number,
  { phase = 0, color = RAD.neon, hub = true } = {},
): void {
  const inner = r * 0.28;
  for (let b = 0; b < 3; b++) {
    const mid = phase + (b / 3) * TAU - Math.PI / 2;
    const half = 0.52;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = mid - half + (i / 8) * half * 2;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
    for (let i = 8; i >= 0; i--) {
      const a = mid - half + (i / 8) * half * 2;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * inner, y + Math.sin(a) * inner));
    }
    g.fillStyle(tint(color), alpha);
    g.fillPoints(pts, true);
  }
  if (hub) {
    g.fillStyle(tint(color), alpha);
    g.fillCircle(x, y, r * 0.19);
  }
}

// ── Counters ──────────────────────────────────────────────────────────────

/**
 * A row of dose cells in a lead housing — the counter shape the element uses for tracer
 * confirms, flare tallies and the magazine. A riveted plate with a hazard-striped end cap on
 * each side, and each cell a little glass tube: dark lead when empty, a neon column with a
 * white-hot filament when lit. `glow` (0–1) is how hard the lit cells burn.
 */
export function doseCells(
  g: Phaser.GameObjects.Graphics, tint: RadiationColorFn,
  x: number, y: number, filled: number, total: number, glow: number, t = 0,
): void {
  const w = 7, gap = 3;
  const span = total * w + (total - 1) * gap;
  const left = x - span / 2;
  const capW = 5;
  // Housing.
  g.fillStyle(tint(RAD.ink), 0.85);
  g.fillRoundedRect(left - capW - 3, y - 6, span + capW * 2 + 6, 12, 3);
  g.fillStyle(tint(RAD.lead), 0.95);
  g.fillRoundedRect(left - capW - 2, y - 5, span + capW * 2 + 4, 10, 2.5);
  g.fillStyle(tint(RAD.leadLit), 0.6);
  g.fillRect(left - capW, y - 4.5, span + capW * 2, 1.5);
  // Hazard end caps: alternating yellow/black diagonals.
  for (const cx of [left - capW - 1, x + span / 2 + 1]) {
    g.fillStyle(tint(RAD.hazard), 0.95);
    g.fillRect(cx, y - 4, capW, 8);
    g.fillStyle(tint(RAD.ink), 0.9);
    for (let k = 0; k < 3; k++) {
      const sx = cx + k * 2.4 - 1;
      g.fillTriangle(sx, y + 4, sx + 1.4, y + 4, sx + 3.6, y - 4);
    }
  }
  for (let i = 0; i < total; i++) {
    const px = left + w / 2 + i * (w + gap);
    const on = i < filled;
    g.fillStyle(tint(RAD.leadDeep), 1);
    g.fillRoundedRect(px - w / 2, y - 3.5, w, 7, 2);
    if (on) {
      const flick = 0.85 + 0.15 * Math.sin(t * 17 + i * 2.3);
      g.fillStyle(tint(RAD.neon), (0.55 + glow * 0.45) * flick);
      g.fillRoundedRect(px - w / 2 + 0.6, y - 3, w - 1.2, 6, 1.6);
      g.fillStyle(tint(RAD.core), 0.6 + glow * 0.4);
      g.fillRect(px - 0.8, y - 2.2, 1.6, 4.4);
      g.fillStyle(tint(RAD.neonLit), 0.25 * glow);
      g.fillCircle(px, y, 5.5);
    }
    // Glass glint.
    g.fillStyle(tint(RAD.wash), on ? 0.5 : 0.18);
    g.fillRect(px - w / 2 + 1, y - 3, 1, 3);
  }
}

/**
 * The irradiated marker: a tiny Geiger counter dial floating over the victim. A lead half-disc
 * face with a trefoil at the pivot, a neon arc that drains as the dose decays (`ratio` 1→0),
 * graduations, and a needle that chatters over the reading like a real counter.
 */
export function geigerDial(
  g: Phaser.GameObjects.Graphics, tint: RadiationColorFn,
  x: number, y: number, r: number, ratio: number, t: number, alpha = 1,
): void {
  ratio = Math.max(0, Math.min(1, ratio));
  const a0 = Math.PI, a1 = TAU;
  // Housing: an ink half-disc with a lead face and a flat base bar.
  g.fillStyle(tint(RAD.ink), 0.85 * alpha);
  g.slice(x, y, r + 3, a0, a1, false);
  g.fillPath();
  g.fillRect(x - r - 3, y - 0.5, (r + 3) * 2, 3.5);
  g.fillStyle(tint(RAD.lead), 0.95 * alpha);
  g.slice(x, y, r + 1.5, a0, a1, false);
  g.fillPath();
  // Track, then the live reading.
  g.lineStyle(2.6, tint(RAD.neonDeep), 0.9 * alpha);
  g.beginPath();
  g.arc(x, y, r - 1.5, a0, a1, false);
  g.strokePath();
  if (ratio > 0.01) {
    g.lineStyle(2.6, tint(ratio < 0.25 ? RAD.hazard : RAD.neon), alpha);
    g.beginPath();
    g.arc(x, y, r - 1.5, a0, a0 + Math.PI * ratio, false);
    g.strokePath();
  }
  // Graduations.
  g.lineStyle(0.8, tint(RAD.wash), 0.55 * alpha);
  for (let i = 0; i <= 4; i++) {
    const a = a0 + (i / 4) * Math.PI;
    g.lineBetween(x + Math.cos(a) * (r - 4.5), y + Math.sin(a) * (r - 4.5), x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3));
  }
  // The needle, chattering.
  const chatter = Math.sin(t * 31) * 0.05 + Math.sin(t * 13.7) * 0.04;
  const na = a0 + Math.PI * Math.max(0, Math.min(1, ratio + chatter));
  g.lineStyle(1.2, tint(RAD.hot), alpha);
  g.lineBetween(x, y, x + Math.cos(na) * (r - 2), y + Math.sin(na) * (r - 2));
  trefoil(g, tint, x, y - 0.5, 3.6, alpha, { phase: t * 1.6, color: RAD.neonLit });
  g.lineStyle(1, tint(RAD.seam), 0.9 * alpha);
  g.beginPath();
  g.arc(x, y, r + 1.5, a0, a1, false);
  g.strokePath();
}

/**
 * A Geiger Tracer: the little triangular device the click throws. Flat lead plate, a hazard
 * stripe down one edge, three legs it grips with, and a lamp that blinks faster the closer the
 * set is to confirming — which is the entire read on this ability, so the lamp is the brightest
 * thing on it.
 */
export function geigerTracer(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, ang: number, alpha: number,
  { lamp = 0, scale = 1, legs = false, spiked = false } = {},
): void {
  const r = 7 * scale;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 3; i++) {
    const a = ang + (i / 3) * TAU;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r));
  }

  if (spiked) {
    // Flick Shot: barbs out of every corner and every edge, hot-tipped, so a spiked tracer in
    // the air reads as the one that is going to hurt.
    g.fillStyle(tint(RAD.hot), alpha * 0.22);
    g.fillCircle(x, y, r * 2.1);
    for (let i = 0; i < 6; i++) {
      const a = ang + (i / 6) * TAU;
      const len = (i % 2 === 0 ? 2.1 : 1.6) * r;
      const side = 0.32;
      g.fillStyle(tint(RAD.leadLit), alpha);
      g.fillTriangle(
        x + Math.cos(a - side) * r * 0.7, y + Math.sin(a - side) * r * 0.7,
        x + Math.cos(a + side) * r * 0.7, y + Math.sin(a + side) * r * 0.7,
        x + Math.cos(a) * len, y + Math.sin(a) * len,
      );
      g.fillStyle(tint(RAD.hot), alpha);
      g.fillCircle(x + Math.cos(a) * len, y + Math.sin(a) * len, 1.3 * scale);
    }
  }

  if (legs) {
    // Splayed grips, so a stuck tracer reads as clamped on rather than floating alongside.
    g.lineStyle(1.6 * scale, tint(RAD.leadDeep), alpha * 0.9);
    for (const p of pts) g.lineBetween(x, y, x + (p.x - x) * 1.6, y + (p.y - y) * 1.6);
  }

  g.fillStyle(tint(RAD.ink), alpha * 0.85);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.25, y + (p.y - y) * 1.25)), true);
  g.fillStyle(tint(RAD.lead), alpha);
  g.fillPoints(pts, true);
  // Hazard stripe along the leading edge only — a fully striped triangle reads as a road sign.
  g.lineStyle(1.5 * scale, tint(RAD.hazard), alpha * 0.85);
  g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  g.lineStyle(1 * scale, tint(RAD.seam), alpha * 0.7);
  g.strokePoints(pts, true);

  if (lamp > 0) {
    g.fillStyle(tint(RAD.neon), alpha * 0.18 * lamp);
    g.fillCircle(x, y, r * 1.5);
    g.fillStyle(tint(RAD.neonLit), alpha * (0.4 + lamp * 0.6));
    g.fillCircle(x, y, r * 0.34);
  }
}

/**
 * The railgun's line. Four passes down the same segment — a wide dim wash, the violet sheath,
 * the neon body and a hairline white core — plus ionisation flaking off it at right angles.
 * Drawn as a single straight line on purpose: everything else in the element wobbles, and the
 * one thing that is genuinely instantaneous should be the one thing that is perfectly straight.
 */
export function railBeam(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number,
  { width = 1, seed = 0, spurs = true } = {},
): void {
  const passes: [number, number, number][] = [
    [13, 0.1, RAD.neonDeep],
    [6.5, 0.3, RAD.seam],
    [2.8, 0.85, RAD.neon],
    [1.0, 1.0, RAD.core],
  ];
  for (const [w, a, color] of passes) {
    g.lineStyle(w * width, tint(color), alpha * a);
    g.lineBetween(x0, y0, x1, y1);
  }
  if (!spurs) return;

  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.min(14, Math.max(4, Math.round(len / 44)));
  g.lineStyle(1.4 * width, tint(RAD.neonLit), alpha * 0.7);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const px = x0 + (x1 - x0) * u;
    const py = y0 + (y1 - y0) * u;
    const side = jitter(seed, i) > 0.5 ? 1 : -1;
    const l = (4 + jitter(seed, 30 + i) * 9) * width;
    g.lineBetween(px, py, px + Math.cos(ang + side * 1.57) * l, py + Math.sin(ang + side * 1.57) * l);
  }
}

/** A flare round: a stubby green dart with a burning tail. Small and fast, and it says so. */
export function flareRound(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, ang: number, alpha: number, t: number,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  // Tail first, so the head sits on top of it.
  for (let i = 1; i <= 5; i++) {
    const u = i / 5;
    const w = 3.4 * (1 - u) + 0.4;
    g.fillStyle(tint(u > 0.6 ? RAD.neonDeep : RAD.neonMid), alpha * (1 - u) * 0.7);
    g.fillCircle(x - c * u * 22 + (Math.sin(t * 30 + i) * 1.4) * s,
      y - s * u * 22 - (Math.sin(t * 30 + i) * 1.4) * c, w);
  }
  g.fillStyle(tint(RAD.neon), alpha * 0.28);
  g.fillCircle(x, y, 7);
  g.fillStyle(tint(RAD.neonLit), alpha);
  g.fillTriangle(x + c * 5, y + s * 5, x - c * 3 - s * 2.4, y - s * 3 + c * 2.4,
    x - c * 3 + s * 2.4, y - s * 3 - c * 2.4);
  g.fillStyle(tint(RAD.core), alpha);
  g.fillCircle(x + c * 1.5, y + s * 1.5, 1.5);
}

/**
 * The airdrop's footprint: a ring of trefoils and a converging crosshair painted on the floor
 * while the bomb is falling, shrinking as it arrives. Everything about this ability is a
 * telegraph, and this is the telegraph.
 */
export function dropFootprint(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number, k: number, t: number,
): void {
  const flash = 0.55 + 0.45 * Math.sin(t * (6 + k * 26));
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.18 * flash);
  g.fillCircle(x, y, r);
  g.lineStyle(3, tint(RAD.neon), alpha * 0.85 * flash);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.4, tint(RAD.neonLit), alpha * 0.6);
  g.strokeCircle(x, y, r * (1 - k * 0.72));

  for (let i = 0; i < 8; i++) {
    const a = t * 0.6 + (i / 8) * TAU;
    trefoil(g, tint, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, 9,
      alpha * 0.7 * flash, { phase: -t, color: RAD.neon });
  }
  // Crosshair arms sliding in from the rim.
  g.lineStyle(2.4, tint(RAD.core), alpha * 0.7 * flash);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const i0 = r * (0.2 + (1 - k) * 0.5);
    g.lineBetween(x + Math.cos(a) * i0, y + Math.sin(a) * i0,
      x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
  }
}

/**
 * The mushroom. Stem, a boiling cap built from overlapping discs, the collar skirt under it and
 * a shockwave ellipse racing out along the floor. `t` is 0→1 over the whole rise; the cap only
 * starts spreading once the stem is up, which is the shape that reads as a mushroom rather than
 * as a ball with a line under it.
 */
export function mushroomCloud(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, t: number, alpha: number, seed: number, scale = 1,
): void {
  const rise = easeOut(Math.min(1, t * 1.5));
  const spread = easeOut(Math.max(0, (t - 0.28) / 0.72));
  const H = 300 * scale;
  const stemW = 34 * scale;
  const capY = y - H * rise;

  // Ground shockwave.
  g.lineStyle(6 * (1 - t) + 1, tint(RAD.neon), alpha * (1 - t) * 0.8);
  g.strokeEllipse(x, y, 620 * scale * easeOut(t), 210 * scale * easeOut(t));
  g.fillStyle(tint(RAD.neonDeep), alpha * (1 - t) * 0.22);
  g.fillEllipse(x, y, 480 * scale * easeOut(t), 160 * scale * easeOut(t));

  // Stem: a widening column with a bright throat.
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.85);
  g.fillTriangle(x - stemW * 1.5, y, x + stemW * 1.5, y, x + stemW * 0.5, capY);
  g.fillTriangle(x - stemW * 1.5, y, x - stemW * 0.5, capY, x + stemW * 0.5, capY);
  g.fillStyle(tint(RAD.neonMid), alpha * 0.9);
  g.fillTriangle(x - stemW * 0.9, y, x + stemW * 0.9, y, x + stemW * 0.28, capY);
  g.fillTriangle(x - stemW * 0.9, y, x - stemW * 0.28, capY, x + stemW * 0.28, capY);
  g.fillStyle(tint(RAD.core), alpha * (1 - t) * 0.9);
  g.fillRect(x - 5 * scale, capY, 10 * scale, y - capY);

  // Cap: overlapping discs on a fixed seed so the silhouette boils without swimming.
  const capR = (26 + spread * 132) * scale;
  const lobes = 11;
  for (const [k, color, a] of [[1.25, RAD.neonDeep, 0.75], [1.0, RAD.neonMid, 0.9], [0.66, RAD.neonLit, 0.85]] as const) {
    g.fillStyle(tint(color), alpha * a);
    for (let i = 0; i < lobes; i++) {
      const ang = (i / lobes) * TAU;
      const d = capR * (0.42 + jitter(seed, i) * 0.5);
      const rr = capR * (0.34 + jitter(seed, 20 + i) * 0.26) * k;
      g.fillCircle(x + Math.cos(ang) * d, capY + Math.sin(ang) * d * 0.6 - capR * 0.15, rr);
    }
  }
  // Collar skirt.
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.55);
  g.fillEllipse(x, capY + capR * 0.42, capR * 2.3, capR * 0.46);
  g.fillStyle(tint(RAD.core), alpha * (1 - t) * 0.5);
  g.fillCircle(x, capY - capR * 0.1, capR * 0.42);
}

// ── Barrage, bunker and rod ───────────────────────────────────────────────

/**
 * Barrage's sighting cone: a wedge of green scan-light out of the weapon hand, framed by two lead
 * rails, with range ticks walking down it and a sweep line scanning across. `lock` is 0–1 of the
 * way from 45° to 5°; the rails heat to hazard as it closes, because a closing cone is the read
 * that a burst is coming and the target should already be moving.
 */
export function barrageCone(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, ang: number, half: number, range: number, alpha: number, t: number,
  { lock = 0, locked = false } = {},
): void {
  const a0 = ang - half;
  const a1 = ang + half;
  const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x, y)];
  for (let i = 0; i <= 14; i++) {
    const a = a0 + (i / 14) * (a1 - a0);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * range, y + Math.sin(a) * range));
  }
  // The wash, thin at rest and thicker as the cone closes in.
  g.fillStyle(tint(RAD.neonDeep), alpha * (0.14 + lock * 0.16));
  g.fillPoints(pts, true);
  g.fillStyle(tint(RAD.neon), alpha * (0.04 + lock * 0.1));
  g.fillPoints(pts, true);

  // Range ticks: short arcs at fixed distances so the cone reads as a measured instrument.
  for (let k = 1; k <= 4; k++) {
    const r = (range * k) / 4.4;
    g.lineStyle(1, tint(RAD.neonMid), alpha * 0.5);
    g.beginPath();
    g.arc(x, y, r, a0, a1, false);
    g.strokePath();
  }

  // The sweep line, scanning edge to edge.
  const sw = a0 + (0.5 + 0.5 * Math.sin(t * 7)) * (a1 - a0);
  g.lineStyle(1.4, tint(RAD.neonLit), alpha * 0.55);
  g.lineBetween(x + Math.cos(sw) * 18, y + Math.sin(sw) * 18, x + Math.cos(sw) * range, y + Math.sin(sw) * range);

  // The rails: lead bars with a lit edge, warming to hazard as the lock tightens.
  const rail = lock > 0.6 ? RAD.hazard : RAD.neon;
  for (const a of [a0, a1]) {
    const ex = x + Math.cos(a) * range;
    const ey = y + Math.sin(a) * range;
    g.lineStyle(4, tint(RAD.leadDeep), alpha * 0.9);
    g.lineBetween(x, y, ex, ey);
    g.lineStyle(1.6, tint(rail), alpha * (0.7 + 0.3 * Math.sin(t * (6 + lock * 14))));
    g.lineBetween(x + Math.cos(a) * 14, y + Math.sin(a) * 14, ex, ey);
    // A rivet at the tip of each rail.
    g.fillStyle(tint(RAD.lead), alpha);
    g.fillCircle(ex, ey, 3.2);
    g.fillStyle(tint(rail), alpha * 0.9);
    g.fillCircle(ex, ey, 1.4);
  }
  if (!locked) return;
  // Locked: a hazard chevron at the throat of the cone.
  const cx = x + Math.cos(ang) * 26;
  const cy = y + Math.sin(ang) * 26;
  const n = ang + Math.PI / 2;
  g.fillStyle(tint(RAD.hazard), alpha * 0.9);
  g.fillTriangle(
    cx + Math.cos(ang) * 7, cy + Math.sin(ang) * 7,
    cx + Math.cos(n) * 5, cy + Math.sin(n) * 5,
    cx - Math.cos(n) * 5, cy - Math.sin(n) * 5,
  );
}

/**
 * The lock reticle Barrage hangs on its target: four lead brackets closing in as the cone does,
 * a ring of countdown ticks, and the trefoil at the centre once the lock is almost done.
 */
export function lockReticle(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, lock: number, alpha: number, t: number,
): void {
  const r = 36 - lock * 14;
  const hot = lock > 0.6 ? RAD.hazard : RAD.neon;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4 + t * (0.6 + lock * 2.4);
    const cx = x + Math.cos(a) * r;
    const cy = y + Math.sin(a) * r;
    g.lineStyle(4, tint(RAD.leadDeep), alpha * 0.9);
    g.beginPath();
    g.arc(x, y, r, a - 0.32, a + 0.32, false);
    g.strokePath();
    g.lineStyle(1.8, tint(hot), alpha);
    g.beginPath();
    g.arc(x, y, r, a - 0.28, a + 0.28, false);
    g.strokePath();
    g.lineStyle(1.6, tint(hot), alpha * 0.8);
    g.lineBetween(cx, cy, x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7));
  }
  // The countdown: twelve ticks, lighting up clockwise as the cone closes.
  const lit = Math.floor(lock * 12);
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * TAU;
    g.fillStyle(tint(i < lit ? hot : RAD.leadLit), alpha * (i < lit ? 0.95 : 0.55));
    g.fillCircle(x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8), 1.6);
  }
  if (lock > 0.75) trefoil(g, tint, x, y, 6 + lock * 3, alpha * (lock - 0.75) * 4, { phase: t * 3, color: hot });
}

/**
 * The Fallout Bunker, seen from above: a poured slab on the floor, a ring wall of lead blocks
 * with their mortar seams glowing, hazard chevrons painted round the rim, and the trefoil
 * stencilled on the slab. `hp` (0–1) cracks the blocks and dims the seams as it drops; `hit`
 * flashes the wall where it last took a round; `occupied` lifts the slab glow so the operative
 * can see they are inside.
 */
export function falloutBunker(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
  { hp = 1, built = 1, occupied = false, hit = 0, seed = 0 } = {},
): void {
  const rr = r * (0.7 + 0.3 * easeOut(built));
  // Slab and its glow.
  g.fillStyle(tint(RAD.ink), alpha * 0.55);
  g.fillCircle(x, y, rr + 6);
  g.fillStyle(tint(RAD.leadDeep), alpha * 0.75);
  g.fillCircle(x, y, rr);
  g.fillStyle(tint(RAD.neonDeep), alpha * (occupied ? 0.32 : 0.16) * (0.85 + 0.15 * Math.sin(t * 2.4)));
  g.fillCircle(x, y, rr * 0.86);
  trefoil(g, tint, x, y, rr * 0.42, alpha * (occupied ? 0.32 : 0.2), { phase: 0, color: RAD.neonMid });

  // The wall: blocks around the ring, every one a lead plate with a lit edge.
  const blocks = 16;
  const wall = 11;
  for (let i = 0; i < blocks; i++) {
    const a = (i / blocks) * TAU;
    const span = TAU / blocks;
    // Blocks fall out of the wall as the bunker takes damage — the low ones first.
    const crumble = jitter(seed, i);
    if (hp < crumble * 0.45) continue;
    const inner = rr - wall / 2;
    const outer = rr + wall / 2;
    const P = (ang: number, d: number) => new Phaser.Geom.Point(x + Math.cos(ang) * d, y + Math.sin(ang) * d);
    const aa = a + 0.03;
    const ab = a + span - 0.03;
    const cracked = hp < crumble * 0.9;
    g.fillStyle(tint(RAD.ink), alpha);
    g.fillPoints([P(aa - 0.01, inner - 1.5), P(aa - 0.01, outer + 1.5), P(ab + 0.01, outer + 1.5), P(ab + 0.01, inner - 1.5)], true);
    g.fillStyle(tint(cracked ? RAD.leadDeep : RAD.lead), alpha);
    g.fillPoints([P(aa, inner), P(aa, outer), P(ab, outer), P(ab, inner)], true);
    g.fillStyle(tint(RAD.leadLit), alpha * 0.7);
    g.fillPoints([P(aa, outer - 3), P(aa, outer), P(ab, outer), P(ab, outer - 3)], true);
    // Hazard chevron on every other block.
    if (i % 2 === 0) {
      const mid = a + span / 2;
      g.fillStyle(tint(RAD.hazard), alpha * (cracked ? 0.45 : 0.85));
      g.fillTriangle(
        x + Math.cos(mid - 0.07) * (rr - 2), y + Math.sin(mid - 0.07) * (rr - 2),
        x + Math.cos(mid + 0.07) * (rr - 2), y + Math.sin(mid + 0.07) * (rr - 2),
        x + Math.cos(mid) * (rr + 3), y + Math.sin(mid) * (rr + 3),
      );
    }
    // A crack across a damaged block.
    if (cracked) {
      g.lineStyle(1.2, tint(RAD.neon), alpha * 0.8);
      g.lineBetween(
        x + Math.cos(aa + span * 0.3) * inner, y + Math.sin(aa + span * 0.3) * inner,
        x + Math.cos(aa + span * 0.6) * outer, y + Math.sin(aa + span * 0.6) * outer,
      );
    }
    // The mortar seam between this block and the next: the load showing through.
    g.lineStyle(1.3, tint(RAD.neon), alpha * (0.35 + 0.5 * hp) * (0.7 + 0.3 * Math.sin(t * 3 + i)));
    g.lineBetween(x + Math.cos(ab + 0.03) * inner, y + Math.sin(ab + 0.03) * inner,
      x + Math.cos(ab + 0.03) * outer, y + Math.sin(ab + 0.03) * outer);
  }
  if (hit > 0) {
    g.lineStyle(3 * hit + 1, tint(RAD.core), alpha * hit * 0.8);
    g.strokeCircle(x, y, rr);
  }

  // HP: an arc riding the top of the wall.
  const a0 = -Math.PI / 2 - 0.9;
  g.lineStyle(4, tint(RAD.ink), alpha * 0.85);
  g.beginPath(); g.arc(x, y, rr + 14, a0, a0 + 1.8, false); g.strokePath();
  g.lineStyle(2.4, tint(hp > 0.35 ? RAD.neon : RAD.hazard), alpha);
  g.beginPath(); g.arc(x, y, rr + 14, a0, a0 + 1.8 * Phaser.Math.Clamp(hp, 0, 1), false); g.strokePath();
}

/**
 * The uranium rod: a lead-capped fuel rod with the pellet stack glowing through a window down
 * its length. Drawn from (x0,y0) — the grip — to (x1,y1), the business end.
 */
export function uraniumRod(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, t: number,
  { heat = 0 } = {},
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const glow = heat > 0.5 ? RAD.hazard : RAD.neon;
  // Halo down the shaft.
  g.lineStyle(14, tint(RAD.neonDeep), alpha * (0.22 + heat * 0.2));
  g.lineBetween(x0 + ux * 10, y0 + uy * 10, x1, y1);
  // Cladding.
  g.lineStyle(8, tint(RAD.ink), alpha);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(6, tint(RAD.lead), alpha);
  g.lineBetween(x0, y0, x1, y1);
  // The window and the pellet stack inside it.
  const w0 = 0.32;
  const w1 = 0.92;
  g.lineStyle(2.6, tint(glow), alpha * (0.8 + 0.2 * Math.sin(t * 9)));
  g.lineBetween(x0 + dx * w0, y0 + dy * w0, x0 + dx * w1, y0 + dy * w1);
  for (let i = 0; i < 5; i++) {
    const k = w0 + ((i + 0.5) / 5) * (w1 - w0);
    const px = x0 + dx * k;
    const py = y0 + dy * k;
    g.lineStyle(1, tint(RAD.leadDeep), alpha);
    g.lineBetween(px + nx * 3, py + ny * 3, px - nx * 3, py - ny * 3);
  }
  // Grip wrap and the hazard band at the head.
  g.lineStyle(7, tint(RAD.leadDeep), alpha);
  g.lineBetween(x0, y0, x0 + ux * 12, y0 + uy * 12);
  g.lineStyle(7, tint(RAD.hazard), alpha * 0.9);
  g.lineBetween(x1 - ux * 6, y1 - uy * 6, x1 - ux * 2, y1 - uy * 2);
  g.fillStyle(tint(RAD.core), alpha * (0.5 + heat * 0.5));
  g.fillCircle(x1, y1, 2.6 + heat * 2);
}

/**
 * R+ Turret Town: a squat lead turret bolted to the bunker wall. A hexagonal base plate, a
 * rotating housing with a hazard band, and a twin barrel that kicks back on `recoil` (1 → 0).
 * The lamp on its back is the read: dark while it has nothing irradiated to shoot at, neon
 * when it does — the turret only fires on a body that is already carrying a dose.
 */
export function bunkerTurret(
  g: Phaser.GameObjects.Graphics, tint: RadiationColorFn,
  x: number, y: number, ang: number, alpha: number, t: number,
  { recoil = 0, live = false } = {},
): void {
  // Base plate.
  const base: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    base.push(new Phaser.Geom.Point(x + Math.cos(a) * 12, y + Math.sin(a) * 12));
  }
  g.fillStyle(tint(RAD.ink), alpha * 0.9);
  g.fillCircle(x, y + 2, 13);
  g.fillStyle(tint(RAD.leadDeep), alpha);
  g.fillPoints(base, true);
  g.lineStyle(1, tint(RAD.seam), alpha * 0.8);
  g.strokePoints(base, true);
  for (const p of base) {
    g.fillStyle(tint(RAD.leadLit), alpha);
    g.fillCircle(x + (p.x - x) * 0.78, y + (p.y - y) * 0.78, 1.1);
  }
  // Twin barrels, kicked back along the aim.
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const nx = -s;
  const ny = c;
  const back = recoil * 5;
  for (const k of [-1, 1]) {
    const ox = x + nx * k * 3.2 - c * back;
    const oy = y + ny * k * 3.2 - s * back;
    g.lineStyle(4, tint(RAD.ink), alpha);
    g.lineBetween(ox, oy, ox + c * 17, oy + s * 17);
    g.lineStyle(2.6, tint(RAD.lead), alpha);
    g.lineBetween(ox, oy, ox + c * 17, oy + s * 17);
    g.fillStyle(tint(live ? RAD.neon : RAD.neonDeep), alpha * (live ? 0.9 : 0.6));
    g.fillCircle(ox + c * 17, oy + s * 17, 1.6);
  }
  if (recoil > 0.4) {
    g.fillStyle(tint(RAD.hazard), alpha * recoil * 0.8);
    g.fillCircle(x + c * 21, y + s * 21, 4 * recoil);
  }
  // Housing.
  g.fillStyle(tint(RAD.lead), alpha);
  g.fillCircle(x - c * back * 0.4, y - s * back * 0.4, 7.5);
  g.lineStyle(1.6, tint(RAD.hazard), alpha * 0.85);
  g.beginPath();
  g.arc(x, y, 7.5, ang + 2.2, ang + 4.1, false);
  g.strokePath();
  // The lamp.
  const blink = live ? 0.6 + 0.4 * Math.sin(t * 12) : 0.25;
  g.fillStyle(tint(live ? RAD.neon : RAD.neonDeep), alpha * 0.25 * blink);
  g.fillCircle(x - c * 3, y - s * 3, 6);
  g.fillStyle(tint(live ? RAD.neonLit : RAD.neonMid), alpha * blink);
  g.fillCircle(x - c * 3, y - s * 3, 2.2);
}

/**
 * Q+ Complete Annihilation: a pool of fallout left on the floor after the drop. An irregular
 * lobed slick (eight jittered lobes off the seed) in the neon ladder, a darker sump in the
 * middle, bubbles that rise and pop, and a trefoil etched faintly into the surface.
 */
export function falloutPuddle(
  g: Phaser.GameObjects.Graphics, tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number, t: number, seed: number,
): void {
  const lobes = 8;
  const rim: Phaser.Geom.Point[] = [];
  const core: Phaser.Geom.Point[] = [];
  for (let i = 0; i < lobes * 3; i++) {
    const a = (i / (lobes * 3)) * TAU;
    const lobe = jitter(seed, i % lobes);
    const wob = Math.sin(a * lobes * 0.5 + seed + t * 0.8) * 0.05;
    const k = 0.82 + lobe * 0.24 + wob;
    rim.push(new Phaser.Geom.Point(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.78));
    core.push(new Phaser.Geom.Point(x + Math.cos(a) * r * k * 0.55, y + Math.sin(a) * r * k * 0.43));
  }
  g.fillStyle(tint(RAD.neon), alpha * 0.12);
  g.fillCircle(x, y, r * 1.2);
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.75);
  g.fillPoints(rim, true);
  g.lineStyle(2, tint(RAD.neon), alpha * (0.55 + 0.2 * Math.sin(t * 3 + seed)));
  g.strokePoints(rim, true);
  g.fillStyle(tint(RAD.neonMid), alpha * 0.7);
  g.fillPoints(core, true);
  trefoil(g, tint, x, y, r * 0.3, alpha * 0.28, { phase: t * 0.3 + seed, color: RAD.neonLit });
  // Bubbles: each one swells, lifts and pops on its own clock.
  for (let i = 0; i < 4; i++) {
    const life = (t * 0.9 + jitter(seed, 40 + i)) % 1;
    const a = jitter(seed, 50 + i) * TAU;
    const d = jitter(seed, 60 + i) * r * 0.6;
    const bx = x + Math.cos(a) * d;
    const by = y + Math.sin(a) * d * 0.78 - life * 4;
    g.lineStyle(1, tint(RAD.neonLit), alpha * (1 - life) * 0.9);
    g.strokeCircle(bx, by, 1.5 + life * 3.5);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

/** Radiation's one-shot effects. Everything sustained is painted per-frame by the kit instead. */
export class RadiationFx extends FxBase {
  /** A tracer clamping on: the legs snapping shut and the lamp coming alive. */
  stick(x: number, y: number, depth = 16): void {
    this.anim(depth, 300, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2 * (1 - t) + 0.5, this.tint(RAD.neonLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, 6 + e * 16);
      g.lineStyle(1.2, this.tint(RAD.hazard), (1 - t) * 0.8);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU - t * 2;
        g.lineBetween(x + Math.cos(a) * 14 * (1 - e), y + Math.sin(a) * 14 * (1 - e),
          x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      }
    });
  }

  /** A tracer set falling off: three little plates tumbling away and going dark. */
  shed(x: number, y: number, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 460, (g, t) => {
      for (let i = 0; i < 3; i++) {
        const a = jitter(seed, i) * TAU;
        const d = easeOut(t) * 26;
        geigerTracer(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d + t * t * 22,
          a + t * 7, (1 - t) * 0.85, { scale: 0.8 });
      }
    });
  }

  /** The railgun firing: the line itself, then the recoil bloom at the muzzle. */
  rail(x0: number, y0: number, x1: number, y1: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 260, (g, t) => {
      const a = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
      railBeam(g, this.tint, x0, y0, x1, y1, a, { width: 1 + (1 - t) * 0.7, seed });
      g.fillStyle(this.tint(RAD.core), a * 0.6);
      g.fillCircle(x0, y0, 9 * (1 - t) + 2);
    });
  }

  /** The railgun landing: a punched hole with a shock ring and a shower of ionisation. */
  railHit(x: number, y: number, ang: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 22, RAD.core, RAD.neon, depth);
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(RAD.neon), (1 - t) * 0.9);
      g.strokeCircle(x, y, 10 + e * 40);
      g.lineStyle(1.6 * (1 - t), this.tint(RAD.neonLit), (1 - t) * 0.8);
      for (let i = 0; i < 10; i++) {
        const a = ang + (jitter(seed, i) - 0.5) * 2.6;
        const l = (14 + jitter(seed, 20 + i) * 30) * e;
        g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      trefoil(g, this.tint, x, y, 16 * (0.5 + e), (1 - t) * 0.5, { phase: t * 4 });
    });
  }

  /** The baton's sweep: a wedge of green scoured through the air along the swing. */
  batonArc(x: number, y: number, ang: number, reach: number, depth = 16): void {
    this.anim(depth, 300, (g, t) => {
      const spanA = ang - 1.1 + t * 0.5;
      const spanB = ang + 1.1 + t * 0.5;
      for (const [rk, color, a] of [[1.0, RAD.neonDeep, 0.35], [0.86, RAD.neon, 0.75], [0.7, RAD.neonLit, 0.5]] as const) {
        g.lineStyle(9 * rk * (1 - t) + 1, this.tint(color), (1 - t) * a);
        g.beginPath();
        g.arc(x, y, reach * rk, spanA, spanB, false);
        g.strokePath();
      }
      // The rod itself, at the leading edge.
      const lead = spanB - (1 - easeOut(t)) * 2.2;
      g.lineStyle(4 * (1 - t) + 1, this.tint(RAD.lead), (1 - t));
      g.lineBetween(x, y, x + Math.cos(lead) * reach, y + Math.sin(lead) * reach);
      g.lineStyle(1.6 * (1 - t), this.tint(RAD.neon), (1 - t));
      g.lineBetween(x + Math.cos(lead) * reach * 0.55, y + Math.sin(lead) * reach * 0.55,
        x + Math.cos(lead) * reach, y + Math.sin(lead) * reach);
    });
  }

  /** Someone taking a dose: a trefoil blooming out of them and green sweat coming off. */
  dose(x: number, y: number, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      trefoil(g, this.tint, x, y - 8, 8 + e * 16, (1 - t) * 0.85, { phase: t * 3 });
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = e * (16 + jitter(seed, 10 + i) * 20);
        g.fillStyle(this.tint(RAD.neonLit), (1 - t) * 0.7);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 10, 2.4 * (1 - t) + 0.6);
      }
    });
  }

  /** The airdrop landing. The mushroom is the ability, so it gets a full second and a half. */
  airdrop(x: number, y: number, depth = 24): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 260, RAD.core, RAD.neonLit, depth);
    this.anim(depth, 1600, (g, t) => {
      mushroomCloud(g, this.tint, x, y, t, 1 - easeIn(Math.max(0, (t - 0.6) / 0.4)), seed);
    });
  }

  // ── Barrage, bunker and rod ──

  /** One Barrage round: a hard hazard-yellow line, cut down from the rail, and a spark at the end. */
  pistolShot(x0: number, y0: number, x1: number, y1: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 180, (g, t) => {
      const a = 1 - t;
      railBeam(g, this.tint, x0, y0, x1, y1, a * 0.85, { width: 0.45, seed, spurs: false });
      g.fillStyle(this.tint(RAD.hazard), a * 0.8);
      g.fillCircle(x1, y1, 5 * (1 - t) + 1);
    });
  }

  /** The cone failing: the two rails springing apart and blinking out. */
  lockLost(x: number, y: number, ang: number, half: number, range: number, depth = 16): void {
    this.anim(depth, 320, (g, t) => {
      const e = easeOut(t);
      for (const s of [-1, 1]) {
        const a = ang + s * (half + e * 0.5);
        g.lineStyle(2.4 * (1 - t) + 0.4, this.tint(RAD.hazard), (1 - t) * 0.9);
        g.lineBetween(x + Math.cos(a) * 16, y + Math.sin(a) * 16,
          x + Math.cos(a) * range * (1 - e * 0.5), y + Math.sin(a) * range * (1 - e * 0.5));
      }
    });
  }

  /** The bunker going up: the ring slamming down out of the floor with a dust skirt. */
  bunkerRise(x: number, y: number, r: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 460, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(6 * (1 - t) + 1, this.tint(RAD.leadLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * (1.35 - e * 0.35));
      for (let i = 0; i < 14; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r + e * (14 + jitter(seed, 20 + i) * 22);
        g.fillStyle(this.tint(i % 3 === 0 ? RAD.neonLit : RAD.leadLit), (1 - t) * 0.75);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3 * (1 - t) + 0.6);
      }
    });
  }

  /** A round stopping in the wall: a chip of lead and a green spit. */
  bunkerHit(x: number, y: number, ang: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 260, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 5; i++) {
        const a = ang + (jitter(seed, i) - 0.5) * 1.8;
        const d = e * (8 + jitter(seed, 10 + i) * 14);
        g.fillStyle(this.tint(i % 2 ? RAD.leadLit : RAD.neonLit), (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.2 * (1 - t) + 0.5);
      }
    });
  }

  /** The bunker coming down: the blocks thrown outward and a green breath let out of the middle. */
  bunkerBreak(x: number, y: number, r: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.6, RAD.neonLit, RAD.neon, depth);
    this.anim(depth, 700, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + (jitter(seed, i) - 0.5) * 0.3;
        const d = r + e * (20 + jitter(seed, 30 + i) * 40);
        const cx = x + Math.cos(a) * d;
        const cy = y + Math.sin(a) * d + t * t * 14;
        g.fillStyle(this.tint(RAD.lead), (1 - t) * 0.95);
        g.fillRect(cx - 4, cy - 3, 8, 6);
        g.fillStyle(this.tint(RAD.neon), (1 - t) * 0.6);
        g.fillRect(cx - 4, cy - 3, 8, 1.4);
      }
      trefoil(g, this.tint, x, y, r * 0.5 * (0.6 + e * 0.6), (1 - t) * 0.45, { phase: t * 2 });
    });
  }

  /** The rod landing: a green crack where it struck and a ring of fuel sparks. */
  rodStrike(x: number, y: number, ang: number, hot: boolean, depth = 17): void {
    const seed = Math.random() * 999;
    const c = hot ? RAD.hazard : RAD.neon;
    this.flashIn(x, y, hot ? 26 : 16, RAD.core, c, depth);
    this.anim(depth, 380, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(c), (1 - t) * 0.9);
      g.strokeCircle(x, y, 8 + e * (hot ? 34 : 22));
      for (let i = 0; i < 8; i++) {
        const a = ang + (jitter(seed, i) - 0.5) * 2.2;
        const l = (10 + jitter(seed, 20 + i) * 22) * e;
        g.lineStyle(1.6 * (1 - t), this.tint(RAD.neonLit), (1 - t) * 0.85);
        g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
    });
  }

  // ── Upgrades ──

  /** Click+ Flick Shot landing: the barbs driving in, a hot star and a ring of shrapnel. */
  flickHit(x: number, y: number, ang: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 20, RAD.hotLit, RAD.hot, depth);
    this.anim(depth, 360, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.4 * (1 - t) + 0.5, this.tint(RAD.hot), (1 - t) * 0.9);
      g.strokeCircle(x, y, 6 + e * 26);
      for (let i = 0; i < 6; i++) {
        const a = ang + Math.PI + (i / 6) * TAU * 0.5 - TAU * 0.125 + (jitter(seed, i) - 0.5) * 0.4;
        const l = (12 + jitter(seed, 10 + i) * 18) * e;
        g.lineStyle(2 * (1 - t), this.tint(i % 2 ? RAD.hotLit : RAD.leadLit), (1 - t));
        g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
    });
  }

  /** F+ Mutation: the dose curdling — a double helix wrung out of the body and a sick bloom. */
  mutate(x: number, y: number, depth = 17): void {
    this.flashIn(x, y, 28, RAD.neonLit, RAD.neon, depth);
    this.anim(depth, 760, (g, t) => {
      const e = easeOut(t);
      const h = 18 + e * 34;
      for (const strand of [0, Math.PI]) {
        g.lineStyle(2.2 * (1 - t) + 0.5, this.tint(strand ? RAD.hazard : RAD.neonLit), (1 - t) * 0.95);
        g.beginPath();
        for (let i = 0; i <= 14; i++) {
          const u = i / 14;
          const px = x + Math.sin(u * TAU * 1.5 + strand + t * 8) * 9;
          const py = y + 10 - u * h;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      g.lineStyle(2 * (1 - t), this.tint(RAD.neon), (1 - t) * 0.7);
      g.strokeCircle(x, y, 14 + e * 22);
    });
  }

  /** Q+ over-radiation: the dose going critical — a hot trefoil and a red shock ring. */
  overRadiate(x: number, y: number, depth = 17): void {
    this.flashIn(x, y, 30, RAD.hotLit, RAD.hot, depth);
    this.anim(depth, 700, (g, t) => {
      const e = easeOut(t);
      trefoil(g, this.tint, x, y - 6, 10 + e * 22, (1 - t) * 0.9, { phase: t * 5, color: RAD.hot });
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(RAD.hotMid), (1 - t) * 0.85);
      g.strokeCircle(x, y, 12 + e * 40);
    });
  }

  /** Q+ puddles splashing down out of the drop. */
  puddleSplash(x: number, y: number, r: number, depth = 5): void {
    const seed = Math.random() * 999;
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 7; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * (0.4 + e * 0.8);
        g.fillStyle(this.tint(i % 2 ? RAD.neonLit : RAD.neon), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.78 - Math.sin(t * Math.PI) * 10, 3 * (1 - t) + 0.8);
      }
    });
  }

  /** The shed particle behind a moving hand: a flake of hot dust. */
  mote(x: number, y: number, depth = 4): void {
    const a = Math.random() * TAU;
    this.anim(depth, 460, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(t < 0.4 ? RAD.neonLit : RAD.neonMid), (1 - t) * 0.65);
      g.fillCircle(x + Math.cos(a) * 10 * e, y + Math.sin(a) * 10 * e - t * 9, 2.2 * (1 - t) + 0.5);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const RADIATION_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: RAD.neonDeep, alpha: 0.28 },
    { r: 7, color: RAD.neonMid, alpha: 0.97 },
    { r: 3.4, color: RAD.neonLit, alpha: 0.9, ox: -1.6, oy: -1.9 },
  ],
  eyeWhite: RAD.neonLit,
  eyePupil: RAD.ink,
  // Heavier than most: a man in lead plate does not skid.
  squash: { div: 22, x: 0.3, y: 0.16 },
};

/**
 * The operative: a glowing neon-green orb (the baked `elem-radiation`) wearing one thing — a
 * lead **hazmat helmet** with the trefoil stamped on its brow. The body colour says
 * "radiation"; the helmet says "operative".
 *
 * `dose` (fed by the kit — it sits low at rest and climbs while a Barrage lock is closing)
 * drives how brightly the trefoil and the under-glow burn. `ping`
 * flashes the trefoil the instant the railgun confirms.
 *
 * Mastery: the trefoil turns hazard-yellow and glows, the helmet gains a hazard trim and a
 * blinking dosimeter antenna, three electron orbits ring the body like an atom, the eyes go
 * white-hot and the hand coronas widen.
 */
export class RadiationAvatar extends BaseAvatar {
  /** 0–1: how hot the suit is running. Drives the trefoil and the glow. */
  private dose = 1;
  private doseTarget = 1;
  /** 0–1: raised while a shot is confirmed. */
  private alert = 0;
  private alertTarget = 0;

  constructor(scene: Phaser.Scene, tint: RadiationColorFn, depth = 6) {
    super(scene, tint, depth, RADIATION_AVATAR);
  }

  /** How hot the suit is running, 0–1. Lerped, so a lock building reads as the suit warming. */
  setDose(v: number): void { this.doseTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Flash the helmet's trefoil — used the instant the railgun confirms. */
  ping(): void { this.alertTarget = 1; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.dose += (this.doseTarget - this.dose) * Math.min(1, delta / 420);
    this.alert += (this.alertTarget - this.alert) * Math.min(1, delta / 90);
    this.alertTarget *= Math.max(0, 1 - delta / 500);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.alertTarget = Math.max(this.alertTarget, 0.5);
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? RAD.core : RAD.neonLit);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 11);
      halo.setFillStyle(this.tint(on ? RAD.neon : RAD.neonDeep), on ? 0.3 : 0.28);
    });
    this.forEachHandLayer(2, (core) => {
      core.setRadius(on ? 4.4 : 3.4);
      core.setFillStyle(this.tint(on ? RAD.core : RAD.neonLit), on ? 1 : 0.9);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new RadiationFx(this.scene, this.tint).mote(x, y);
  }

  /** Point `p` (0–1) round mastered orbit `i` — a tilted ellipse about the body. */
  private orbitPoint(x: number, y: number, i: number, p: number): { x: number; y: number; front: boolean } {
    const tilt = (i / 3) * Math.PI + this.t * 0.25;
    const a = p * TAU;
    const ex = Math.cos(a) * 31, ey = Math.sin(a) * 9;
    return {
      x: x + ex * Math.cos(tilt) - ey * Math.sin(tilt),
      y: y + ex * Math.sin(tilt) + ey * Math.cos(tilt),
      front: Math.sin(a) > 0,
    };
  }

  /**
   * A lead respirator over the mouth — a rounded snout with a neon intake grille and a filter
   * canister either side — plus a dosimeter badge clipped to the chest. Mastered, the grille
   * runs white-hot and the badge turns hazard-yellow.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 2.2;
    const mx = x + lean, my = y + 7;
    // Canisters.
    for (const side of [-1, 1]) {
      const cx = mx + side * 8.5, cy = my + 2;
      g.fillStyle(this.tint(RAD.ink), alpha);
      g.fillCircle(cx, cy, 4.4);
      g.fillStyle(this.tint(RAD.lead), alpha);
      g.fillCircle(cx, cy, 3.6);
      g.fillStyle(this.tint(m ? RAD.hazard : RAD.leadLit), alpha * 0.9);
      g.fillCircle(cx, cy, 1.6);
    }
    // Snout.
    g.fillStyle(this.tint(RAD.ink), alpha);
    g.fillRoundedRect(mx - 6.5, my - 4, 13, 9, 4);
    g.fillStyle(this.tint(RAD.lead), alpha);
    g.fillRoundedRect(mx - 5.5, my - 3.2, 11, 7.4, 3.4);
    g.fillStyle(this.tint(RAD.leadLit), alpha * 0.7);
    g.fillRect(mx - 4, my - 2.8, 8, 1.2);
    // Grille — three slots glowing with the dose.
    const lit = 0.45 + this.dose * 0.45 + this.alert * 0.2;
    for (let i = -1; i <= 1; i++) {
      g.fillStyle(this.tint(m ? RAD.core : RAD.neon), alpha * Math.min(1, lit));
      g.fillRect(mx + i * 3 - 0.8, my - 0.8, 1.6, 3.6);
    }
    // Dosimeter badge on the chest.
    const bx = x - 10 - lean * 0.3, by = y + 13;
    g.fillStyle(this.tint(RAD.ink), alpha);
    g.fillRect(bx - 3.5, by - 3, 7, 6);
    g.fillStyle(this.tint(m ? RAD.hazard : RAD.wash), alpha * 0.9);
    g.fillRect(bx - 2.7, by - 2.2, 5.4, 4.4);
    g.fillStyle(this.tint(RAD.neonMid), alpha);
    g.fillRect(bx - 2.7, by + 0.4, 5.4 * Math.min(1, 0.3 + this.dose * 0.7), 1.8);
  }

  /** A contamination halo — brighter the more charge is left in the suit, hotter mastered. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const k = this.mastered ? 1.25 : 1;
    g.fillStyle(this.tint(RAD.neonDeep), a * (0.12 + this.dose * 0.2) * k);
    g.fillCircle(x, y, 27 * k);
    g.fillStyle(this.tint(RAD.neon), a * (0.04 + this.dose * 0.1) * k);
    g.fillEllipse(x, y + 10, 34 * k, 12);

    // Mastery: three electron orbits ringing the body like an atom. The rings live under the
    // sprite; the electrons cross in front of it from `drawExtras`.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        g.lineStyle(1.4, this.tint(i === 0 ? RAD.hazard : RAD.neonLit), alpha * 0.55);
        g.beginPath();
        for (let k2 = 0; k2 <= 28; k2++) {
          const p = this.orbitPoint(x, y, i, k2 / 28);
          if (k2 === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
        }
        g.strokePath();
        const e = this.orbitPoint(x, y, i, this.t * 0.9 + i / 3);
        if (!e.front) {
          g.fillStyle(this.tint(RAD.neonLit), alpha * 0.6);
          g.fillCircle(e.x, e.y, 2.6);
        }
      }
    }
  }

  /**
   * The hazmat helmet: a dull lead dome rooted at the crown (`y - 18`) so its rim stops above
   * the eyes, with the trefoil stamped on the brow. Lead is the element's second colour, so the
   * one accessory is also the one place it appears on the character.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const rootY = y - 18;
    const lean = Math.cos(this.facing) * 2;
    const s = m ? 1.08 : 1;
    const P = (px: number, py: number) => new Phaser.Geom.Point(x + lean + px * s, rootY + py * s);

    // Dome: dark outline, lead shell, a lit cap so it reads as rounded.
    g.fillStyle(this.tint(RAD.ink), alpha);
    g.fillPoints([P(-14.6, 7.4), P(-13, -0.4), P(-7.2, -6), P(7.2, -6), P(13, -0.4), P(14.6, 7.4)], true);
    g.fillStyle(this.tint(RAD.lead), alpha);
    g.fillPoints([P(-13, 6.6), P(-11.6, 0), P(-6.4, -4.8), P(6.4, -4.8), P(11.6, 0), P(13, 6.6)], true);
    g.fillStyle(this.tint(RAD.leadLit), alpha * 0.8);
    g.fillEllipse(x + lean - 3 * s, rootY - 2 * s, 11 * s, 4.2 * s);

    // Rim band — a hazard trim once mastered.
    g.lineStyle(m ? 2 : 1.4, this.tint(m ? RAD.hazard : RAD.leadDeep), alpha);
    g.lineBetween(x + lean - 14 * s, rootY + 6.8 * s, x + lean + 14 * s, rootY + 6.8 * s);

    // The trefoil on the brow, lit by the dose and flashing on alert.
    const tx = x + lean + Math.cos(this.facing) * 2;
    const ty = rootY + 0.6 * s;
    const lit = Math.min(1, 0.3 + this.dose * 0.6 + this.alert * 0.4);
    if (m) {
      g.fillStyle(this.tint(RAD.hazard), alpha * (0.22 + 0.1 * Math.sin(this.t * 3)));
      g.fillCircle(tx, ty, 7.5);
    }
    g.fillStyle(this.tint(RAD.ink), alpha * 0.9);
    g.fillCircle(tx, ty, 5.2 * s);
    trefoil(g, this.tint, tx, ty, 4.4 * s, alpha * lit, { phase: 0, color: m ? RAD.hazard : RAD.neon });

    // Rivets along the rim, and a stubby headlamp on the side the operative faces.
    g.fillStyle(this.tint(m ? RAD.hazard : RAD.leadLit), alpha);
    for (const rx of [-10.5, -5.5, 5.5, 10.5]) g.fillCircle(x + lean + rx * s, rootY + 4.6 * s, 0.9);
    const side = Math.cos(this.facing) >= 0 ? 1 : -1;
    const lx = x + lean + side * 12.4 * s, ly = rootY + 1.5 * s;
    g.fillStyle(this.tint(RAD.ink), alpha);
    g.fillCircle(lx, ly, 3.2);
    g.fillStyle(this.tint(m ? RAD.core : RAD.neonLit), alpha * (0.6 + this.alert * 0.4));
    g.fillCircle(lx, ly, 2);

    // Mastery: a dosimeter antenna on the crown with a blinking hazard lamp, and the electrons
    // passing in front of the body.
    if (m) {
      const ax = x + lean - 4 * s, ay = rootY - 5 * s;
      g.lineStyle(1.4, this.tint(RAD.leadLit), alpha);
      g.lineBetween(ax, ay, ax - 3, ay - 12);
      const blink = Math.sin(this.t * 6) > 0 ? 1 : 0.35;
      g.fillStyle(this.tint(RAD.hazard), alpha * 0.35 * blink);
      g.fillCircle(ax - 3, ay - 13, 5);
      g.fillStyle(this.tint(RAD.hazard), alpha * blink);
      g.fillCircle(ax - 3, ay - 13, 2.2);
      for (let i = 0; i < 3; i++) {
        const e = this.orbitPoint(x, y, i, this.t * 0.9 + i / 3);
        if (!e.front) continue;
        g.fillStyle(this.tint(RAD.neon), alpha * 0.35);
        g.fillCircle(e.x, e.y, 5);
        g.fillStyle(this.tint(RAD.core), alpha);
        g.fillCircle(e.x, e.y, 2.6);
      }
    }
  }
}
