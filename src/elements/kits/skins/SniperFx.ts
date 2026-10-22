import Phaser from 'phaser';
import { TAU, easeIn, easeOut } from '../ElementVisuals';
import { RadiationFx, jitter } from '../RadiationVisuals';
import { SN } from './SniperAvatar';

/**
 * The Sniper skin's ability art — Radiation's kit redrawn as a bushman's.
 *
 * - Geiger tracers → rifle rounds (brass slug, white tracer streak); stuck tracers → red laser dots.
 * - Railgun / Barrage → a real rifle crack: a hairline tracer, a muzzle star, a smoke puff.
 * - Barrage cone → a scope's field of view with a laser down the middle; the lock → a scope reticle.
 * - Irradiated → jarate: a jar meter over the head and yellow running down the body.
 * - Flare rounds → thrown jars, sloshing and spinning.
 * - Rod Baton → a kukri (the Bushwhacker).
 * - Fallout Bunker → a timber sniper nest: plank deck, stilts, sandbags, a railing.
 *
 * Every function here draws in the same footprint as the Radiation shape it replaces. Visual only.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

const JAR = {
  deep: 0x8a7208,
  mid: 0xc9a812,
  body: 0xf2d924,
  froth: 0xfaee82,
  glass: 0xdff4ff,
  glassEdge: 0x9cc4d8,
  lid: 0x6a6a72,
  lidLit: 0xa4a4ae,
};

const STEEL = { dark: 0x4a4e58, mid: 0x9aa0ac, lit: 0xe4e8f0, edge: 0xffffff };

// ── Rounds ────────────────────────────────────────────────────────────────

/** A rifle round in flight: brass slug, copper tip, a white tracer streak behind it. */
export function sniperRound(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, alpha: number, spiked = false,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  // Streak.
  g.lineStyle(4, spiked ? SN.laser : JAR.froth, alpha * 0.22);
  g.lineBetween(x - c * 30, y - s * 30, x, y);
  g.lineStyle(1.6, spiked ? SN.laserLit : 0xffffff, alpha * 0.85);
  g.lineBetween(x - c * 22, y - s * 22, x, y);
  // Slug: a pointed brass lozenge.
  const nx = -s, ny = c;
  g.fillStyle(SN.brassDim, alpha);
  g.fillPoints([
    P(x - c * 5 + nx * 2, y - s * 5 + ny * 2), P(x + c * 2 + nx * 2, y + s * 2 + ny * 2),
    P(x + c * 6, y + s * 6), P(x + c * 2 - nx * 2, y + s * 2 - ny * 2), P(x - c * 5 - nx * 2, y - s * 5 - ny * 2),
  ], true);
  g.fillStyle(SN.brassLit, alpha);
  g.fillRect(x - c * 3 - 0.6, y - s * 3 - 0.6, 1.2, 1.2);
  g.fillStyle(spiked ? SN.laser : 0xc8642a, alpha);
  g.fillCircle(x + c * 4, y + s * 4, 1.5);
}

/** A tagged target: a red laser dot with its bloom and a short cross. */
export function laserDot(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number, blink: number): void {
  g.fillStyle(SN.laser, alpha * 0.18 * (0.5 + blink));
  g.fillCircle(x, y, 7);
  g.fillStyle(SN.laser, alpha * (0.6 + blink * 0.4));
  g.fillCircle(x, y, 2.6);
  g.fillStyle(SN.laserLit, alpha);
  g.fillCircle(x - 0.6, y - 0.6, 1);
  g.lineStyle(0.8, SN.laser, alpha * 0.6 * blink);
  g.lineBetween(x - 6, y, x - 3.6, y); g.lineBetween(x + 3.6, y, x + 6, y);
  g.lineBetween(x, y - 6, x, y - 3.6); g.lineBetween(x, y + 3.6, x, y + 6);
}

/** The jar: tumbling glass with yellow sloshing inside, a screw lid, drips flung off it. */
export function jarRound(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, alpha: number, t: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  // Drops shaken out behind it.
  for (let i = 1; i <= 4; i++) {
    const u = i / 4;
    g.fillStyle(JAR.body, alpha * (1 - u) * 0.75);
    g.fillCircle(x - c * u * 20 + Math.sin(t * 24 + i) * 2 * s, y - s * u * 20 - Math.sin(t * 24 + i) * 2 * c, 2.2 * (1 - u) + 0.6);
  }
  const spin = t * 14;
  const rc = Math.cos(spin), rs = Math.sin(spin);
  const R = (lx: number, ly: number) => P(x + lx * rc - ly * rs, y + lx * rs + ly * rc);
  // Glass body.
  g.fillStyle(JAR.glassEdge, alpha);
  g.fillPoints([R(-4.6, -5), R(4.6, -5), R(4.6, 5.2), R(-4.6, 5.2)], true);
  g.fillStyle(JAR.glass, alpha * 0.55);
  g.fillPoints([R(-3.8, -4.4), R(3.8, -4.4), R(3.8, 4.6), R(-3.8, 4.6)], true);
  // Liquid, levelled to the world (it sloshes to the bottom of the jar as it spins).
  g.fillStyle(JAR.body, alpha);
  g.fillCircle(x, y + 1, 3.6);
  g.fillStyle(JAR.froth, alpha * 0.9);
  g.fillCircle(x - 1, y - 0.4, 1.2);
  // Lid.
  g.fillStyle(JAR.lid, alpha);
  g.fillPoints([R(-4.2, -7), R(4.2, -7), R(4.2, -4.8), R(-4.2, -4.8)], true);
  g.fillStyle(JAR.lidLit, alpha);
  g.fillPoints([R(-3.6, -6.6), R(0, -6.6), R(0, -5.8), R(-3.6, -5.8)], true);
}

// ── Barrage ───────────────────────────────────────────────────────────────

/** The scope's field of view: a faint cone, crosshair ticks along it, a laser down the axis. */
export function scopeCone(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, half: number, range: number,
  alpha: number, t: number, { lock = 0, locked = false } = {},
): void {
  const a0 = ang - half, a1 = ang + half;
  const pts: Phaser.Geom.Point[] = [P(x, y)];
  for (let i = 0; i <= 14; i++) {
    const a = a0 + (i / 14) * (a1 - a0);
    pts.push(P(x + Math.cos(a) * range, y + Math.sin(a) * range));
  }
  g.fillStyle(SN.ink, alpha * (0.1 + lock * 0.1));
  g.fillPoints(pts, true);
  g.fillStyle(SN.laser, alpha * (0.03 + lock * 0.06));
  g.fillPoints(pts, true);
  // Range marks: mil-dot pips along both edges.
  for (let k = 1; k <= 6; k++) {
    const r = (range * k) / 6.4;
    for (const a of [a0, a1]) {
      g.fillStyle(SN.laserLit, alpha * 0.5);
      g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.4);
    }
  }
  // Edges: thin dark lines.
  g.lineStyle(1.2, SN.ink, alpha * 0.7);
  for (const a of [a0, a1]) g.lineBetween(x + Math.cos(a) * 16, y + Math.sin(a) * 16, x + Math.cos(a) * range, y + Math.sin(a) * range);
  // The laser down the middle — steadier and hotter as the lock closes.
  const wob = (1 - lock) * Math.sin(t * 9) * half * 0.35;
  const la = ang + wob;
  g.lineStyle(3, SN.laser, alpha * (0.12 + lock * 0.2));
  g.lineBetween(x + Math.cos(la) * 16, y + Math.sin(la) * 16, x + Math.cos(la) * range, y + Math.sin(la) * range);
  g.lineStyle(1, SN.laser, alpha * (0.6 + lock * 0.4));
  g.lineBetween(x + Math.cos(la) * 16, y + Math.sin(la) * 16, x + Math.cos(la) * range, y + Math.sin(la) * range);
  if (locked) {
    g.fillStyle(SN.laser, alpha * 0.9);
    g.fillCircle(x + Math.cos(la) * 24, y + Math.sin(la) * 24, 2.4);
  }
}

/** Scope reticle: a ring, a crosshair with a gap, mil-dots, and the ring closing with the lock. */
export function scopeReticle(
  g: Phaser.GameObjects.Graphics, x: number, y: number, lock: number, alpha: number, t: number,
): void {
  const r = 36 - lock * 14;
  const hot = lock > 0.6 ? SN.laser : SN.ink;
  g.lineStyle(3.4, SN.ink, alpha * 0.45);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.4, hot === SN.ink ? SN.laserLit : SN.laser, alpha * 0.9);
  g.strokeCircle(x, y, r);
  // Crosshair, with a gap at the centre and thick posts at the edges.
  const gap = 5;
  g.lineStyle(1, SN.ink, alpha);
  g.lineBetween(x - r, y, x - gap, y); g.lineBetween(x + gap, y, x + r, y);
  g.lineBetween(x, y - r, x, y - gap); g.lineBetween(x, y + gap, x, y + r);
  g.lineStyle(3, SN.ink, alpha);
  g.lineBetween(x - r - 6, y, x - r * 0.7, y); g.lineBetween(x + r * 0.7, y, x + r + 6, y);
  g.lineBetween(x, y + r * 0.7, x, y + r + 6);
  // Mil-dots light up as it closes.
  const lit = Math.floor(lock * 8);
  for (let i = 1; i <= 4; i++) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = i * (r / 5);
      g.fillStyle(i * 2 <= lit ? SN.laser : SN.ink, alpha * 0.85);
      g.fillCircle(x + dx * k, y + dy * k, 1.1);
    }
  }
  if (lock > 0.75) {
    const p = 0.6 + 0.4 * Math.sin(t * 20);
    g.fillStyle(SN.laser, alpha * p);
    g.fillCircle(x, y, 2.6);
  }
}

// ── Jarate ────────────────────────────────────────────────────────────────

/**
 * The jarate marker: yellow running down the body, a puddle at the feet, and a little jar over
 * the head whose level drains as the effect wears off (`ratio` 1 → 0).
 */
export function jarateMark(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ratio: number, t: number, alpha: number, seed: number,
): void {
  ratio = Phaser.Math.Clamp(ratio, 0, 1);
  // Soaked: a yellow glaze over the top of the body, and runs coming down.
  g.fillStyle(JAR.body, alpha * 0.22);
  g.fillEllipse(x, y - 8, 40, 26);
  for (let i = 0; i < 6; i++) {
    const dx = -15 + i * 6 + (jitter(seed, i) - 0.5) * 3;
    const p = (t * (0.5 + jitter(seed, 10 + i) * 0.4) + jitter(seed, 20 + i)) % 1;
    const top = y - 16 + Math.abs(dx) * 0.3;
    const len = 6 + p * 22;
    g.lineStyle(2.2, JAR.mid, alpha * 0.65);
    g.lineBetween(x + dx, top, x + dx, top + len);
    g.fillStyle(JAR.body, alpha * (0.9 - p * 0.4));
    g.fillCircle(x + dx, top + len, 2.2);
    g.fillStyle(JAR.froth, alpha * 0.7);
    g.fillCircle(x + dx - 0.6, top + len - 0.8, 0.8);
  }
  // Drops falling off the chin.
  for (let i = 0; i < 2; i++) {
    const p = (t * 1.3 + i * 0.5 + seed) % 1;
    g.fillStyle(JAR.body, alpha * (1 - p));
    g.fillCircle(x + (i ? 6 : -5), y + 12 + easeIn(p) * 16, 1.8);
  }
  // The jar meter over the head.
  const jx = x, jy = y - 27;
  g.fillStyle(SN.ink, alpha * 0.85);
  g.fillRoundedRect(jx - 8, jy - 9, 16, 19, 3);
  g.fillStyle(JAR.glass, alpha * 0.35);
  g.fillRoundedRect(jx - 6.5, jy - 6, 13, 14.5, 2.5);
  const lvl = 14 * ratio;
  if (lvl > 0.4) {
    g.fillStyle(ratio < 0.25 ? JAR.deep : JAR.body, alpha);
    g.fillRoundedRect(jx - 6, jy + 8 - lvl, 12, lvl, 2);
    g.fillStyle(JAR.froth, alpha * 0.8);
    g.fillRect(jx - 5.4, jy + 8 - lvl, 10.8, 1.4);
    // Bubbles rising.
    const bp = (t * 1.6) % 1;
    g.fillStyle(JAR.froth, alpha * 0.8 * (1 - bp));
    g.fillCircle(jx + Math.sin(t * 5) * 2.5, jy + 7 - bp * lvl, 1);
  }
  g.lineStyle(1, JAR.glassEdge, alpha);
  g.strokeRoundedRect(jx - 6.5, jy - 6, 13, 14.5, 2.5);
  g.fillStyle(JAR.lid, alpha);
  g.fillRect(jx - 7, jy - 9, 14, 3.4);
  g.fillStyle(JAR.lidLit, alpha);
  g.fillRect(jx - 6.4, jy - 8.6, 6, 1);
}

// ── Kukri ─────────────────────────────────────────────────────────────────

/** The Bushwhacker: a forward-curved kukri from grip (x0,y0) to tip (x1,y1). */
export function kukri(
  g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, alpha: number, hot: boolean,
): void {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const at = (u: number, off: number) => P(x0 + dx * u + nx * off, y0 + dy * u + ny * off);
  // Handle: dark wood with brass bolster and pommel.
  const hEnd = 0.24;
  g.lineStyle(7, SN.ink, alpha);
  g.lineBetween(x0, y0, x0 + dx * hEnd, y0 + dy * hEnd);
  g.lineStyle(5, SN.woodDark, alpha);
  g.lineBetween(x0, y0, x0 + dx * hEnd, y0 + dy * hEnd);
  g.lineStyle(1.2, SN.woodLit, alpha * 0.8);
  g.lineBetween(x0 + nx * 1.2, y0 + ny * 1.2, x0 + dx * hEnd + nx * 1.2, y0 + dy * hEnd + ny * 1.2);
  g.fillStyle(SN.brass, alpha);
  g.fillCircle(x0, y0, 3.4);
  const bo = at(hEnd, 0);
  g.fillRect(bo.x - 3, bo.y - 3, 6, 6);
  // Blade: the spine bows away, the belly swells toward the tip, then a hard point.
  const spine: Phaser.Geom.Point[] = [];
  const edge: Phaser.Geom.Point[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const k = hEnd + (1 - hEnd) * u;
    const bow = Math.sin(u * Math.PI) * 5;
    const belly = 2.5 + Math.pow(u, 1.4) * 6.5 * (u < 0.92 ? 1 : (1 - u) / 0.08);
    spine.push(at(k, -bow - 1.8));
    edge.push(at(k, -bow + belly));
  }
  g.fillStyle(SN.ink, alpha);
  g.fillPoints([...spine.map((p) => P(p.x - nx * 1, p.y - ny * 1)), ...edge.slice().reverse().map((p) => P(p.x + nx * 1, p.y + ny * 1))], true);
  g.fillStyle(STEEL.mid, alpha);
  g.fillPoints([...spine, ...edge.slice().reverse()], true);
  // Bright cutting edge (hot = the stun hit, edge goes red-hot laser).
  g.lineStyle(1.6, hot ? SN.laser : STEEL.lit, alpha);
  g.strokePoints(edge, false);
  g.lineStyle(1, STEEL.dark, alpha * 0.8);
  g.strokePoints(spine, false);
  // The notch (cho) at the ricasso.
  const n = at(hEnd + 0.04, 3.4);
  g.fillStyle(SN.ink, alpha);
  g.fillCircle(n.x, n.y, 1.3);
}

/** The swing as the kit paints it: a steel arc trail behind the kukri. */
export function kukriSwing(
  g: Phaser.GameObjects.Graphics, ox: number, oy: number, from: number, a: number, reach: number,
  t: number, hot: boolean,
): void {
  g.lineStyle(9, hot ? SN.laser : STEEL.lit, 0.16 * (1 - t));
  g.beginPath();
  g.arc(ox, oy, reach * 0.85, from, a, false);
  g.strokePath();
  g.lineStyle(2, STEEL.edge, 0.4 * (1 - t));
  g.beginPath();
  g.arc(ox, oy, reach * 0.95, Math.max(from, a - 0.6), a, false);
  g.strokePath();
  kukri(g, ox + Math.cos(a) * 14, oy + Math.sin(a) * 14, ox + Math.cos(a) * reach, oy + Math.sin(a) * reach, 1 - t * 0.3, hot);
}

// ── Sniper nest ───────────────────────────────────────────────────────────

/**
 * The sniper nest seen from above: four stilts and cross-braces under an octagonal plank deck,
 * a sandbag ring round the rim with a gap in front, a timber railing, and a camo net slung
 * across the back. `hp` knocks planks and sandbags out of it; `hit` flashes the rail.
 */
export function sniperNest(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number, t: number,
  { hp = 1, built = 1, occupied = false, hit = 0, seed = 0 } = {},
): void {
  const rr = r * (0.7 + 0.3 * easeOut(built));
  // Shadow.
  g.fillStyle(SN.ink, alpha * 0.4);
  g.fillCircle(x + 4, y + 6, rr + 8);
  // Stilts at the four corners, with braces between them.
  const legs = [0.25, 0.75, 1.25, 1.75].map((k) => k * Math.PI);
  g.lineStyle(3, SN.woodDark, alpha);
  for (let i = 0; i < 4; i++) {
    const a = legs[i], b = legs[(i + 1) % 4];
    g.lineBetween(x + Math.cos(a) * (rr + 6), y + Math.sin(a) * (rr + 6), x + Math.cos(b) * (rr - 4), y + Math.sin(b) * (rr - 4));
  }
  for (const a of legs) {
    g.fillStyle(SN.ink, alpha);
    g.fillRect(x + Math.cos(a) * (rr + 6) - 6, y + Math.sin(a) * (rr + 6) - 6, 12, 12);
    g.fillStyle(SN.wood, alpha);
    g.fillRect(x + Math.cos(a) * (rr + 6) - 5, y + Math.sin(a) * (rr + 6) - 5, 10, 10);
    g.fillStyle(SN.woodLit, alpha * 0.7);
    g.fillRect(x + Math.cos(a) * (rr + 6) - 5, y + Math.sin(a) * (rr + 6) - 5, 10, 2.4);
  }
  // Deck: an octagon of planks.
  const oct: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    oct.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(SN.ink, alpha);
  g.fillPoints(oct.map((p) => P(x + (p.x - x) * 1.05, y + (p.y - y) * 1.05)), true);
  g.fillStyle(SN.wood, alpha * 0.95);
  g.fillPoints(oct, true);
  const plankW = 9;
  const n = Math.floor((rr * 2) / plankW);
  for (let i = 0; i < n; i++) {
    const py = y - rr + i * plankW + plankW / 2;
    const half = Math.sqrt(Math.max(0, rr * rr - (py - y) * (py - y))) * 0.97;
    const missing = hp < jitter(seed, 50 + i) * 0.5;
    g.fillStyle(missing ? SN.ink : (i % 2 ? SN.woodDark : SN.wood), alpha * (missing ? 0.75 : 0.9));
    g.fillRect(x - half, py - plankW / 2 + 0.6, half * 2, plankW - 1.2);
    if (!missing) {
      g.fillStyle(SN.woodLit, alpha * 0.4);
      g.fillRect(x - half, py - plankW / 2 + 0.6, half * 2, 1.2);
      // Nail heads at each end.
      g.fillStyle(SN.metalLit, alpha * 0.8);
      g.fillCircle(x - half + 4, py, 0.9);
      g.fillCircle(x + half - 4, py, 0.9);
    }
  }
  if (occupied) {
    g.fillStyle(SN.shirtLit, alpha * 0.12 * (0.85 + 0.15 * Math.sin(t * 2.4)));
    g.fillCircle(x, y, rr * 0.8);
  }
  // Camo net slung across the back half.
  g.fillStyle(SN.leafDark, alpha * 0.55);
  g.slice(x, y, rr * 0.95, Math.PI * 1.1, Math.PI * 1.9, false);
  g.fillPath();
  g.lineStyle(1, SN.hessian, alpha * 0.55);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (1.1 + i * 0.16);
    g.lineBetween(x + Math.cos(a) * rr * 0.4, y + Math.sin(a) * rr * 0.4, x + Math.cos(a) * rr * 0.95, y + Math.sin(a) * rr * 0.95);
  }
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.15 + jitter(seed, 80 + i) * 0.7);
    const d = rr * (0.5 + jitter(seed, 90 + i) * 0.4);
    g.fillStyle(i % 2 ? SN.leaf : SN.leafLit, alpha * 0.8);
    g.fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 7, 3.4);
  }
  // Sandbag ring round the rim — they fall out as it takes damage.
  const bags = 18;
  for (let i = 0; i < bags; i++) {
    const a = (i / bags) * TAU;
    if (hp < jitter(seed, i) * 0.45) continue;
    const bx = x + Math.cos(a) * rr, by = y + Math.sin(a) * rr;
    const rot = a + Math.PI / 2;
    const c = Math.cos(rot), s = Math.sin(rot);
    const bag = (w: number, h: number) => [
      P(bx - c * w + -s * -h, by - s * w + c * -h), P(bx + c * w + -s * -h, by + s * w + c * -h),
      P(bx + c * w + -s * h, by + s * w + c * h), P(bx - c * w + -s * h, by - s * w + c * h),
    ];
    g.fillStyle(SN.ink, alpha);
    g.fillPoints(bag(8.6, 6.2), true);
    g.fillStyle(hp < jitter(seed, i) * 0.9 ? SN.hessianDark : SN.hessian, alpha);
    g.fillPoints(bag(7.6, 5.2), true);
    g.fillStyle(SN.shirtLit, alpha * 0.45);
    g.fillCircle(bx - Math.cos(a) * 1.6, by - Math.sin(a) * 1.6, 2.4);
    // Tie at the end.
    g.fillStyle(SN.hessianDark, alpha);
    g.fillCircle(bx + c * 7.6, by + s * 7.6, 1.4);
  }
  // Railing posts with a rope strung between them.
  g.lineStyle(1.2, SN.shirtShade, alpha * 0.9);
  g.strokeCircle(x, y, rr + 7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    g.fillStyle(SN.woodDark, alpha);
    g.fillCircle(x + Math.cos(a) * (rr + 7), y + Math.sin(a) * (rr + 7), 3);
    g.fillStyle(SN.woodLit, alpha);
    g.fillCircle(x + Math.cos(a) * (rr + 7) - 0.8, y + Math.sin(a) * (rr + 7) - 0.8, 1.2);
  }
  if (hit > 0) {
    g.lineStyle(3 * hit + 1, SN.shirtLit, alpha * hit * 0.8);
    g.strokeCircle(x, y, rr);
  }
  // HP arc riding the top of the rim.
  const a0 = -Math.PI / 2 - 0.9;
  g.lineStyle(4, SN.ink, alpha * 0.85);
  g.beginPath(); g.arc(x, y, rr + 16, a0, a0 + 1.8, false); g.strokePath();
  g.lineStyle(2.4, hp > 0.35 ? SN.brassLit : SN.laser, alpha);
  g.beginPath(); g.arc(x, y, rr + 16, a0, a0 + 1.8 * Phaser.Math.Clamp(hp, 0, 1), false); g.strokePath();
}

// ── Fx ────────────────────────────────────────────────────────────────────

/** RadiationFx with the sniper's one-shots in place of the lead-and-neon ones. */
export class SniperFx extends RadiationFx {
  /** Muzzle star + smoke. */
  private muzzle(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, t: number, big: number): void {
    const c = Math.cos(ang), s = Math.sin(ang);
    const k = 1 - t;
    if (t < 0.4) {
      const f = (1 - t / 0.4) * big;
      g.fillStyle(0xfff3c0, f);
      g.fillTriangle(x - s * 4 * big, y + c * 4 * big, x + s * 4 * big, y - c * 4 * big, x + c * 20 * big, y + s * 20 * big);
      g.fillStyle(0xffffff, f);
      g.fillCircle(x + c * 3, y + s * 3, 4 * big);
    }
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0xcfc6b4, k * 0.35);
      g.fillCircle(x + c * (6 + i * 7) * easeOut(t) - s * (i - 1) * 4 * t, y + s * (6 + i * 7) * easeOut(t) + c * (i - 1) * 4 * t, (3 + i) * (0.6 + t));
    }
  }

  stick(x: number, y: number, depth = 16): void {
    this.anim(depth, 260, (g, t) => {
      g.lineStyle(1.6 * (1 - t) + 0.4, SN.laser, (1 - t) * 0.9);
      g.strokeCircle(x, y, 4 + easeOut(t) * 14);
    });
  }

  shed(x: number, y: number, depth = 16): void {
    this.anim(depth, 300, (g, t) => {
      g.fillStyle(SN.laser, (1 - t) * 0.6);
      g.fillCircle(x, y, 3 * (1 - t));
      g.lineStyle(1, SN.laserLit, (1 - t) * 0.5);
      g.lineBetween(x - 6 * t, y - 6 * t, x + 6 * t, y + 6 * t);
      g.lineBetween(x - 6 * t, y + 6 * t, x + 6 * t, y - 6 * t);
    });
  }

  rail(x0: number, y0: number, x1: number, y1: number, depth = 17): void {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    this.anim(depth, 300, (g, t) => {
      const a = t < 0.2 ? 1 : 1 - (t - 0.2) / 0.8;
      g.lineStyle(7, 0xfff3c0, a * 0.18);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(2.2, 0xffffff, a * 0.95);
      g.lineBetween(x0, y0, x1, y1);
      this.muzzle(g, x0, y0, ang, t, 1.4);
    });
  }

  railHit(x: number, y: number, ang: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 380, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.4 * (1 - t) + 0.5, 0xffffff, (1 - t) * 0.9);
      g.strokeCircle(x, y, 6 + e * 26);
      for (let i = 0; i < 8; i++) {
        const a = ang + (jitter(seed, i) - 0.5) * 1.8;
        const l = (10 + jitter(seed, 20 + i) * 24) * e;
        g.lineStyle(1.4 * (1 - t), i % 2 ? SN.brassLit : 0xffffff, (1 - t));
        g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
    });
  }

  pistolShot(x0: number, y0: number, x1: number, y1: number, depth = 17): void {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    this.anim(depth, 170, (g, t) => {
      g.lineStyle(1.2, 0xffffff, (1 - t) * 0.85);
      g.lineBetween(x0, y0, x1, y1);
      this.muzzle(g, x0, y0, ang, t, 0.7);
      g.fillStyle(SN.brassLit, (1 - t) * 0.8);
      g.fillCircle(x1, y1, 4 * (1 - t) + 1);
    });
  }

  /** A jar shattering over somebody: glass shards, a yellow splash, drops raining down. */
  dose(x: number, y: number, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 700, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(JAR.body, (1 - t) * 0.45);
      g.fillCircle(x, y - 8, 10 + e * 18);
      for (let i = 0; i < 9; i++) {
        const a = jitter(seed, i) * TAU;
        const d = e * (14 + jitter(seed, 10 + i) * 22);
        const py = y - 10 + Math.sin(a) * d + easeIn(t) * 26;
        g.fillStyle(i % 3 ? JAR.body : JAR.froth, (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(a) * d, py, 2.8 * (1 - t) + 0.8);
      }
      for (let i = 0; i < 5; i++) {
        const a = jitter(seed, 40 + i) * TAU;
        const d = e * (10 + jitter(seed, 50 + i) * 18);
        const sx = x + Math.cos(a) * d, sy = y - 12 + Math.sin(a) * d + t * t * 18;
        const r = a + t * 9;
        g.fillStyle(JAR.glass, (1 - t) * 0.9);
        g.fillTriangle(sx + Math.cos(r) * 3, sy + Math.sin(r) * 3, sx + Math.cos(r + 2.4) * 2, sy + Math.sin(r + 2.4) * 2,
          sx + Math.cos(r + 4) * 2.4, sy + Math.sin(r + 4) * 2.4);
      }
    });
  }

  rodStrike(x: number, y: number, ang: number, hot: boolean, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 320, (g, t) => {
      const e = easeOut(t);
      // A hard diagonal slash mark across the target.
      const c = Math.cos(ang + 1.2), s = Math.sin(ang + 1.2);
      const l = 26 * (hot ? 1.3 : 1);
      g.lineStyle(4 * (1 - t) + 0.5, hot ? SN.laser : STEEL.lit, (1 - t));
      g.lineBetween(x - c * l * e, y - s * l * e, x + c * l * e, y + s * l * e);
      g.lineStyle(1.2 * (1 - t), 0xffffff, (1 - t));
      g.lineBetween(x - c * l * e, y - s * l * e, x + c * l * e, y + s * l * e);
      for (let i = 0; i < 6; i++) {
        const a = ang + (jitter(seed, i) - 0.5) * 2;
        const d = (8 + jitter(seed, 20 + i) * 18) * e;
        g.fillStyle(i % 2 ? SN.brassLit : 0xffffff, (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.4 * (1 - t) + 0.4);
      }
    });
  }

  bunkerRise(x: number, y: number, r: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 460, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(5 * (1 - t) + 1, SN.woodLit, (1 - t) * 0.8);
      g.strokeCircle(x, y, r * (1.3 - e * 0.3));
      for (let i = 0; i < 12; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r + e * (12 + jitter(seed, 20 + i) * 20);
        g.fillStyle(i % 2 ? SN.shirtShade : SN.hessian, (1 - t) * 0.6);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 4 * (1 - t) + 1);
      }
    });
  }

  bunkerHit(x: number, y: number, ang: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 280, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 5; i++) {
        const a = ang + (jitter(seed, i) - 0.5) * 1.8;
        const d = e * (8 + jitter(seed, 10 + i) * 14);
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        g.lineStyle(1.8, i % 2 ? SN.woodLit : SN.hessian, (1 - t) * 0.9);
        g.lineBetween(px, py, px + Math.cos(a + t * 6) * 4, py + Math.sin(a + t * 6) * 4);
      }
    });
  }

  bunkerBreak(x: number, y: number, r: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 720, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + (jitter(seed, i) - 0.5) * 0.3;
        const d = r + e * (20 + jitter(seed, 30 + i) * 40);
        const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d + t * t * 14;
        const rot = a + t * (4 + jitter(seed, 60 + i) * 6);
        const c = Math.cos(rot) * 7, s = Math.sin(rot) * 7;
        g.lineStyle(4, i % 3 ? SN.wood : SN.hessian, (1 - t) * 0.95);
        g.lineBetween(cx - c, cy - s, cx + c, cy + s);
      }
      g.fillStyle(0xcfc6b4, (1 - t) * 0.3);
      g.fillCircle(x, y, r * (0.4 + e * 0.6));
    });
  }

  mote(x: number, y: number, depth = 4): void {
    this.anim(depth, 420, (g, t) => {
      g.fillStyle(SN.shirtShade, (1 - t) * 0.4);
      g.fillCircle(x, y - t * 8, 2 + t * 3);
    });
  }
}
