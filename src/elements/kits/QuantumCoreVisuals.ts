import Phaser from 'phaser';

/**
 * Art for Quantum's Third State — the kit the bond's third stop supplies.
 *
 * Everything here is drawn from the same idea: a quantum object is not one thing at one
 * place, it is a bright certain core wrapped in a cloud of places it might also be. So every
 * primitive below is a solid shape plus its own ghosts, offset by a deterministic jitter that
 * shivers with `t`. The splicers have ghost blades, the wall has interference fringes, and the
 * parasite's segments carry orbital shells that are plainly not attached to anything.
 *
 * Pure drawing: no scene, no state, no gameplay. `QuantumCoreKit` owns all of that.
 */

/** The Third State's palette. `hot` is the certainty; `ghost` is everywhere it might be instead. */
export const QC = {
  core: 0x7df9ff,
  hot: 0xeaffff,
  ghost: 0xb07dff,
  deep: 0x0d3a52,
  dark: 0x061a26,
  edge: 0xffffff,
  blood: 0xff5577,
} as const;

/** Deterministic 0–1 noise. Same seed and index always give the same number. */
function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function shade(color: number, k: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * k));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * k));
  const b = Math.min(255, Math.round((color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

/**
 * The shell an orbiting thing rides: a thin dashed ellipse, drawn as an electron orbit rather
 * than a circle so the ring reads as a *shell* the blades are allowed to occupy, not a fence.
 */
export function orbitShell(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, r: number, t: number, alpha: number,
): void {
  const dashes = 28;
  g.lineStyle(1.2, QC.core, alpha * 0.45);
  for (let i = 0; i < dashes; i++) {
    if (i % 2 === 1) continue;
    const a0 = (i / dashes) * Math.PI * 2 + t * 0.6;
    const a1 = a0 + (Math.PI * 2) / dashes;
    g.beginPath();
    g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r * 0.94);
    g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 0.94);
    g.strokePath();
  }
  // A second shell tipped the other way, so the ring has depth without a sprite.
  g.lineStyle(1, QC.ghost, alpha * 0.28);
  g.strokeEllipse(cx, cy, r * 1.9, r * 0.7);
}

/**
 * One Atom Splicer: a long double-edged blade with a lit spine, a forked quillon at the base,
 * and two ghost copies of itself lagging behind on the orbit. `spin` is how fast the ring is
 * turning (0–1 normalised); a fast ring smears its ghosts further out, which is the only tell
 * that the blades are moving faster without them getting any bigger.
 */
export function splicerBlade(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, ang: number, len: number,
  spin: number, t: number, alpha: number, seed: number,
): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const w = len * 0.19;

  // ── Ghosts: the same blade, one and two frames "ago" on the orbit ──
  for (let gi = 1; gi <= 2; gi++) {
    const lag = 0.16 * gi * (0.4 + spin);
    const ga = ang - lag * 0.5;
    const gca = Math.cos(ga), gsa = Math.sin(ga);
    // Ghosts sit back along the orbit tangent, which is perpendicular to the blade's own aim.
    const ox = x - Math.cos(ang + Math.PI / 2) * lag * len * 1.6;
    const oy = y - Math.sin(ang + Math.PI / 2) * lag * len * 1.6;
    g.fillStyle(QC.ghost, alpha * (0.2 / gi));
    g.fillPoints([
      pt(ox, oy, gca, gsa, len * 0.62, 0),
      pt(ox, oy, gca, gsa, 0, -w * 0.7),
      pt(ox, oy, gca, gsa, -len * 0.38, 0),
      pt(ox, oy, gca, gsa, 0, w * 0.7),
    ], true);
  }

  // ── Blade ──
  g.fillStyle(shade(QC.deep, 1.1), alpha);
  g.fillPoints([
    pt(x, y, ca, sa, len * 0.62, 0),
    pt(x, y, ca, sa, len * 0.1, -w),
    pt(x, y, ca, sa, -len * 0.38, 0),
    pt(x, y, ca, sa, len * 0.1, w),
  ], true);
  // Lit spine down the middle — the certain part of an uncertain object.
  g.fillStyle(QC.core, alpha * 0.95);
  g.fillPoints([
    pt(x, y, ca, sa, len * 0.58, 0),
    pt(x, y, ca, sa, len * 0.08, -w * 0.34),
    pt(x, y, ca, sa, -len * 0.3, 0),
    pt(x, y, ca, sa, len * 0.08, w * 0.34),
  ], true);
  g.fillStyle(QC.edge, alpha * (0.55 + 0.35 * Math.sin(t * 8 + seed)));
  g.fillPoints([
    pt(x, y, ca, sa, len * 0.6, 0),
    pt(x, y, ca, sa, len * 0.24, -w * 0.13),
    pt(x, y, ca, sa, len * 0.24, w * 0.13),
  ], true);

  // ── Quillon: two prongs forked back off the base, so it reads as a dagger not a shard ──
  g.lineStyle(2, QC.core, alpha * 0.8);
  for (const s of [-1, 1]) {
    const a = pt(x, y, ca, sa, -len * 0.2, s * w * 0.3);
    const b = pt(x, y, ca, sa, -len * 0.34, s * w * 1.5);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
  // Pommel bead, pulsing out of phase with the edge glint.
  const bead = pt(x, y, ca, sa, -len * 0.36, 0);
  g.fillStyle(QC.hot, alpha * (0.5 + 0.4 * Math.sin(t * 6 - seed)));
  g.fillCircle(bead.x, bead.y, w * 0.42);
}

/**
 * What being the third state does to a body.
 *
 * A bonded fighter's sprite belongs to whichever half they started as, and the dormant halves
 * tear their own rigs down on the way out — so without this the third stop would look like the
 * first element with the decoration removed. Instead the body is wrapped in the thing it has
 * become: two crossed shells, a nucleus that is brighter than the sprite under it, and three
 * ghost copies of the silhouette standing where the fighter is *not*, which is the whole point.
 */
export function coreAura(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number, t: number, seed: number,
): void {
  // Superposition: copies of the body at the places it might also be, wandering slowly.
  for (let i = 0; i < 3; i++) {
    const a = t * 0.7 + (i * Math.PI * 2) / 3;
    const d = r * (0.5 + 0.35 * Math.sin(t * 1.3 + i * 2.1));
    const gx = x + Math.cos(a) * d;
    const gy = y + Math.sin(a) * d * 0.7;
    g.fillStyle(QC.ghost, 0.13);
    g.fillCircle(gx, gy, r * 0.82);
    g.lineStyle(1, QC.ghost, 0.22);
    g.strokeCircle(gx, gy, r * 0.82);
  }

  // Nucleus: a hard bright kernel that the sprite reads as being lit from inside by.
  const pulse = 0.6 + 0.25 * Math.sin(t * 4 + seed);
  g.fillStyle(QC.core, 0.18 * pulse);
  g.fillCircle(x, y, r * 1.15);
  g.fillStyle(QC.hot, 0.3 * pulse);
  g.fillCircle(x, y - r * 0.1, r * 0.34);

  // Two shells crossed at right angles, each tipped the other way, tumbling out of phase.
  for (let i = 0; i < 2; i++) {
    const tilt = Math.sin(t * (1.1 + i * 0.4) + i * 1.9);
    g.lineStyle(1.4, i === 0 ? QC.core : QC.ghost, 0.5);
    g.strokeEllipse(x, y, r * 2.5, r * (0.4 + 1.1 * Math.abs(tilt)));
    g.strokeEllipse(x, y, r * (0.4 + 1.1 * Math.abs(tilt)), r * 2.5);
    // The electron riding that shell, so the orbit has something on it.
    const ea = t * (2.2 + i * 0.9) + i * Math.PI;
    g.fillStyle(QC.edge, 0.9);
    g.fillCircle(
      x + Math.cos(ea) * r * 1.25,
      y + Math.sin(ea) * r * (0.2 + 0.55 * Math.abs(tilt)),
      2.4,
    );
  }
}

/**
 * The Arena Split seam: a standing wave the width of the room's midline. Two envelopes of
 * interference fringes crossing each other, brightest where they meet, with the whole thing
 * fading out top and bottom so it reads as a *field* rather than a painted stripe.
 *
 * `fade` is 0–1 for the last half-second, so the wall visibly loses coherence before it drops.
 */
export function splitWall(
  g: Phaser.GameObjects.Graphics,
  x: number, top: number, bottom: number, halfW: number,
  t: number, fade: number, seed: number,
): void {
  const h = bottom - top;
  const a = fade;

  // Body of the field.
  g.fillStyle(QC.deep, a * 0.3);
  g.fillRect(x - halfW, top, halfW * 2, h);

  // Fringes: bands of alternating brightness travelling in opposite directions, so the seam
  // shimmers without ever appearing to flow one way.
  const bands = 26;
  for (let i = 0; i < bands; i++) {
    const u = i / bands;
    const by = top + u * h;
    const bh = h / bands;
    const up = 0.5 + 0.5 * Math.sin(u * 22 + t * 3);
    const down = 0.5 + 0.5 * Math.sin(u * 17 - t * 4.4 + seed);
    const k = up * down;
    g.fillStyle(QC.core, a * 0.42 * k);
    g.fillRect(x - halfW * (0.4 + 0.6 * k), by, halfW * 2 * (0.4 + 0.6 * k), bh + 1);
    if (k > 0.75) {
      g.fillStyle(QC.hot, a * 0.7 * (k - 0.75) * 4);
      g.fillRect(x - 1.5, by, 3, bh + 1);
    }
  }

  // Hard edges, with the fade eating them from the outside in.
  g.lineStyle(2, QC.core, a * 0.85);
  g.lineBetween(x - halfW, top, x - halfW, bottom);
  g.lineBetween(x + halfW, top, x + halfW, bottom);

  // Nodes climbing the seam — where the wave is pinned.
  for (let i = 0; i < 7; i++) {
    const ny = top + ((i + 0.5) / 7) * h + Math.sin(t * 1.6 + i) * h * 0.02;
    const r = 4 + 2.5 * Math.sin(t * 5 + i * 1.7);
    g.fillStyle(QC.ghost, a * 0.5);
    g.fillCircle(x, ny, r * 1.8);
    g.fillStyle(QC.hot, a * 0.9);
    g.fillCircle(x, ny, r * 0.55);
  }
}

/** A segment's tint runs from cold cyan at full health to angry pink as it is cut down. */
function segTint(hpRatio: number): number {
  const k = Phaser.Math.Clamp(hpRatio, 0, 1);
  const r = Math.round(0xff + (0x7d - 0xff) * k);
  const gg = Math.round(0x55 + (0xf9 - 0x55) * k);
  const b = Math.round(0x77 + (0xff - 0x77) * k);
  return (r << 16) | (gg << 8) | b;
}

/**
 * The Quantum Parasite. `segs` runs mouth-first. Every segment is a plated bead wearing its own
 * electron shell, tinted by how much of its 35 HP is left — so a body about to come apart is
 * visibly pinker at the place it is going to come apart at.
 *
 * The mouth and the tail cannot be killed and are drawn to say so: both are solid white-hot
 * cores inside a double shell, with no health tint on them at all.
 */
export function parasiteBody(
  g: Phaser.GameObjects.Graphics,
  segs: { x: number; y: number; r: number; hp: number; maxHp: number }[],
  ang: number, t: number, alpha: number, seed: number,
): void {
  if (segs.length === 0) return;
  const last = segs.length - 1;

  // Bonds between beads: the thing is held together by a chain of them, and a weak bead's
  // bonds are the part that flickers.
  for (let i = 0; i < last; i++) {
    const a = segs[i], b = segs[i + 1];
    const weak = Math.min(a.hp / a.maxHp, b.hp / b.maxHp);
    g.lineStyle(3.2, segTint(weak), alpha * (0.4 + 0.4 * weak) * (0.7 + 0.3 * Math.sin(t * 9 + i)));
    g.lineBetween(a.x, a.y, b.x, b.y);
  }

  // Beads, tail-first so the mouth ends up on top.
  for (let i = last; i >= 0; i--) {
    const s = segs[i];
    const immortal = i === 0 || i === last;
    const ratio = immortal ? 1 : s.hp / s.maxHp;
    const tint = immortal ? QC.core : segTint(ratio);

    // Shell: one orbit for a middle segment, two crossed for an immortal end.
    g.lineStyle(1.1, tint, alpha * 0.4);
    const wob = Math.sin(t * 3 + i * 0.8) * 0.35;
    g.strokeEllipse(s.x, s.y, s.r * 3.1, s.r * (1.1 + wob));
    if (immortal) g.strokeEllipse(s.x, s.y, s.r * (1.1 + wob), s.r * 3.1);

    g.fillStyle(shade(QC.dark, 1), alpha * 0.9);
    g.fillCircle(s.x, s.y, s.r);
    g.fillStyle(tint, alpha * (immortal ? 0.95 : 0.5 + 0.45 * ratio));
    g.fillCircle(s.x - s.r * 0.18, s.y - s.r * 0.2, s.r * 0.72);
    g.fillStyle(QC.hot, alpha * (immortal ? 0.9 : 0.35 * ratio));
    g.fillCircle(s.x - s.r * 0.26, s.y - s.r * 0.28, s.r * 0.3);

    // Cracks on a bead that has taken real damage — three fissures, deterministic per index.
    if (!immortal && ratio < 0.7) {
      g.lineStyle(1.2, QC.blood, alpha * (0.75 - ratio));
      for (let c = 0; c < 3; c++) {
        const a0 = jitter(seed + i, c) * Math.PI * 2;
        g.lineBetween(s.x, s.y,
          s.x + Math.cos(a0) * s.r * (0.6 + jitter(seed + i, c + 9) * 0.5),
          s.y + Math.sin(a0) * s.r * (0.6 + jitter(seed + i, c + 9) * 0.5));
      }
    }
  }

  // ── Mouth ──
  const h = segs[0];
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const gape = 0.42 + 0.26 * Math.sin(t * 11 + seed);
  // Throat: a hole with no colour in it, so the maw has somewhere to lead.
  g.fillStyle(0x000000, alpha * 0.85);
  g.fillCircle(h.x + ca * h.r * 0.35, h.y + sa * h.r * 0.35, h.r * 0.62);
  // Four mandibles, drawn as flattened spikes hinging off the rim.
  for (let i = 0; i < 4; i++) {
    const spread = (i - 1.5) * gape;
    const a = ang + spread;
    const bx = h.x + ca * h.r * 0.2, by = h.y + sa * h.r * 0.2;
    g.fillStyle(i % 2 === 0 ? QC.core : QC.hot, alpha * 0.95);
    g.fillPoints([
      new Phaser.Geom.Point(bx + Math.cos(a - 0.26) * h.r * 0.55, by + Math.sin(a - 0.26) * h.r * 0.55),
      new Phaser.Geom.Point(bx + Math.cos(a) * h.r * 1.75, by + Math.sin(a) * h.r * 1.75),
      new Phaser.Geom.Point(bx + Math.cos(a + 0.26) * h.r * 0.55, by + Math.sin(a + 0.26) * h.r * 0.55),
    ], true);
  }
  // Eye-spot behind the maw: one bright point that always faces the way it is going.
  g.fillStyle(QC.ghost, alpha * 0.9);
  g.fillCircle(h.x - ca * h.r * 0.3, h.y - sa * h.r * 0.3, h.r * 0.28);
  g.fillStyle(QC.edge, alpha);
  g.fillCircle(h.x - ca * h.r * 0.3, h.y - sa * h.r * 0.3, h.r * 0.12);

  // ── Tail: a fan of three fins, so the immortal back end is not mistaken for a head ──
  const tl = segs[last];
  if (last > 0) {
    const prev = segs[last - 1];
    const ta = Math.atan2(tl.y - prev.y, tl.x - prev.x);
    for (let i = -1; i <= 1; i++) {
      const a = ta + i * 0.55 + Math.sin(t * 7 + i) * 0.12;
      g.fillStyle(i === 0 ? QC.core : QC.ghost, alpha * 0.8);
      g.fillPoints([
        new Phaser.Geom.Point(tl.x + Math.cos(a - 0.22) * tl.r * 0.7, tl.y + Math.sin(a - 0.22) * tl.r * 0.7),
        new Phaser.Geom.Point(tl.x + Math.cos(a) * tl.r * 2.2, tl.y + Math.sin(a) * tl.r * 2.2),
        new Phaser.Geom.Point(tl.x + Math.cos(a + 0.22) * tl.r * 0.7, tl.y + Math.sin(a + 0.22) * tl.r * 0.7),
      ], true);
    }
  }
}

/**
 * The flash a cut leaves behind: a bright bar across the break, ringed by the shrapnel of the
 * bead that was spent making it. Drawn once per frame while the burst lives.
 */
export function cutFlash(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, ang: number, k: number, seed: number,
): void {
  const a = 1 - k;
  const ca = Math.cos(ang + Math.PI / 2), sa = Math.sin(ang + Math.PI / 2);
  const len = 22 + k * 46;
  g.lineStyle(3 * a, QC.edge, a);
  g.lineBetween(x - ca * len, y - sa * len, x + ca * len, y + sa * len);
  g.lineStyle(1.5 * a, QC.ghost, a * 0.7);
  g.strokeCircle(x, y, 10 + k * 44);
  for (let i = 0; i < 8; i++) {
    const sa2 = jitter(seed, i) * Math.PI * 2;
    const d = (12 + k * 40) * (0.6 + jitter(seed, i + 20) * 0.6);
    g.fillStyle(QC.core, a * 0.8);
    g.fillCircle(x + Math.cos(sa2) * d, y + Math.sin(sa2) * d, 2.4 * a);
  }
}

/**
 * The bloom a Third-State ability throws when it lands: an expanding shell with three orbit
 * ticks spinning inside it. Deliberately the same shape as `QuantumKit`'s collapse ring, half
 * a size down — the two are the same element speaking.
 */
export function stateBloom(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, k: number, tintColor: number, radius: number,
): void {
  const a = 1 - k;
  g.lineStyle(3 * a, tintColor, a * 0.9);
  g.strokeCircle(x, y, radius * k);
  g.lineStyle(1.5, QC.ghost, a * 0.5);
  for (let i = 0; i < 3; i++) {
    const ang = k * Math.PI * 2 + (i * Math.PI * 2) / 3;
    const r = radius * k;
    g.lineBetween(x + Math.cos(ang) * r * 0.55, y + Math.sin(ang) * r * 0.55,
      x + Math.cos(ang) * r, y + Math.sin(ang) * r);
  }
}
