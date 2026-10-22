import Phaser from 'phaser';
import { FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';

/**
 * Everything the Celebration skin (Magma) draws in place of Magma's own ability art.
 *
 * Visual only: every function here takes the same position / size / heat arguments as the
 * Magma primitive it stands in for (`moltenPool`, `volcanoCone`, `breathCone`, `lavaRock`,
 * `cannonball`, `pirateShip`, `pirateSpirit`) and fills the same footprint, so a skinned fight
 * reads exactly like an unskinned one — the kit decides *what* is on the field, this only
 * decides what it looks like.
 *
 * - Lava pools → rainbow candy puddles: syrup with swirled bands and sprinkles.
 * - Blunder-Boil's cone → a party popper's burst of streamers and confetti.
 * - Volcanoes → star piñatas that split along their seams as pressure climbs.
 * - Flung rock → wrapped sweets; cannonballs → gumballs.
 * - The pirate ship → a parade float; the spirit crew → party-goers with blowouts.
 *
 * A palette remap can only move colours one-to-one, and a rainbow is many colours at once, so
 * this file owns its own palette and never goes through the skin's colour mapper.
 */

export const CELE = {
  ink: 0x2a1440,
  plum: 0x46206a,
  grape: 0x6e3394,
  lilac: 0xb48ad0,
  pink: 0xff3d9a,
  bubblegum: 0xff8fd0,
  blush: 0xffc2e4,
  lemon: 0xffe45c,
  cream: 0xfff6e6,
  white: 0xffffff,
  mint: 0x3fe0b0,
  sky: 0x4fc3ff,
  tangerine: 0xff9a3c,
  cherry: 0xe8264f,
  shadow: 0x1a0d26,
  wood: 0x8a5a3a,
  woodLit: 0xc08a5e,
};

/** The candy rainbow, in band order. */
export const RAINBOW = [0xff4f6d, 0xff9a3c, 0xffe45c, 0x3fe0b0, 0x4fc3ff, 0xa66bff];

/** Deterministic 0–1 noise, so a twenty-second object never boils between frames. */
function noise(seed: number, i: number): number {
  const v = Math.sin(seed * 91.7 + i * 213.3) * 39217.4413;
  return v - Math.floor(v);
}

function pt(x: number, y: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x, y);
}

/** One sprinkle: a short rounded rod at `ang`. */
function sprinkle(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, color: number, alpha: number): void {
  const c = Math.cos(ang) * len * 0.5, s = Math.sin(ang) * len * 0.5;
  g.lineStyle(1.8, color, alpha);
  g.lineBetween(x - c, y - s, x + c, y + s);
}

/** A confetti fleck: a little quad tumbling about `spin`, flattening as it turns edge-on. */
function confetti(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, spin: number, color: number, alpha: number): void {
  const flat = 0.25 + Math.abs(Math.cos(spin * 1.7)) * 0.75;
  const c = Math.cos(spin), s = Math.sin(spin);
  const hx = size, hy = size * 0.6 * flat;
  g.fillStyle(color, alpha);
  g.fillPoints([
    pt(x + c * hx - s * hy, y + s * hx + c * hy),
    pt(x - c * hx - s * hy, y - s * hx + c * hy),
    pt(x - c * hx + s * hy, y - s * hx - c * hy),
    pt(x + c * hx + s * hy, y + s * hx - c * hy),
  ], true);
}

/** A curling paper streamer from `x,y` out along `ang`, waving as it goes. */
function streamer(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, ang: number, len: number, curl: number, t: number, seed: number,
  color: number, width: number, alpha: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const nx = -s, ny = c;
  const steps = 10;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const wave = Math.sin(u * 7 + t * 9 + seed) * curl * u;
    const cx = x + c * len * u + nx * wave;
    const cy = y + s * len * u + ny * wave;
    // A twist: the ribbon narrows where it turns edge-on.
    const w = width * (0.35 + 0.65 * Math.abs(Math.cos(u * 6 + t * 5 + seed))) * (1 - u * 0.3);
    left.push(pt(cx + nx * w, cy + ny * w));
    right.unshift(pt(cx - nx * w, cy - ny * w));
  }
  g.fillStyle(color, alpha);
  g.fillPoints(left.concat(right), true);
}

/** A wrapped sweet: a candy body with a twist of cellophane either end. */
export function wrappedCandy(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number, spin: number, color: number, alpha = 1,
): void {
  const c = Math.cos(spin), s = Math.sin(spin);
  for (const d of [-1, 1]) {
    const bx = x + c * r * 0.8 * d, by = y + s * r * 0.8 * d;
    const tx = x + c * r * 2 * d, ty = y + s * r * 2 * d;
    g.fillStyle(CELE.blush, alpha * 0.9);
    g.fillTriangle(bx, by, tx - s * r * 0.9, ty + c * r * 0.9, tx + s * r * 0.9, ty - c * r * 0.9);
  }
  g.fillStyle(color, alpha);
  g.fillEllipse(x, y, r * 2.1, r * 1.7);
  g.fillStyle(CELE.white, alpha * 0.55);
  g.fillEllipse(x - r * 0.35, y - r * 0.35, r * 0.8, r * 0.5);
  // One stripe round the middle so it reads as a humbug, not a bead.
  g.lineStyle(1.2, CELE.white, alpha * 0.7);
  g.lineBetween(x - s * r * 0.8, y + c * r * 0.8, x + s * r * 0.8, y - c * r * 0.8);
}

// ── Candy puddle (moltenPool) ─────────────────────────────────────────────

/**
 * A puddle of melted rainbow candy. Same footprint as a lava pool. `heat` 1→0 is the pool
 * dying; candy shows it by the colours dulling and the syrup setting into hard sugar.
 */
export function candyPool(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number, heat: number, t: number, seed: number, alpha = 1,
): void {
  g.fillStyle(CELE.pink, alpha * (0.06 + heat * 0.08));
  g.fillCircle(x, y, r * 1.35);

  // Outline: the same lumpy squashed blob a lava pool uses.
  const blob = (k: number, wob: number): Phaser.Geom.Point[] => {
    const steps = 20;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU;
      const rr = r * k * (0.84 + noise(seed, i) * 0.26 + Math.sin(t * 1.7 + i * 1.3 + seed) * wob);
      pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7));
    }
    return pts;
  };
  g.fillStyle(CELE.plum, alpha * 0.9);
  g.fillPoints(blob(1.04, 0.05), true);

  // Rainbow bands, outer to inner, each slowly turning so the swirl is visibly liquid.
  const vivid = 0.45 + heat * 0.55;
  for (let b = 0; b < RAINBOW.length; b++) {
    const k = 1 - b * 0.15;
    if (k <= 0.12) break;
    const rot = t * 0.4 * (b % 2 ? 1 : -1) + seed;
    const steps = 18;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU + rot * 0.15;
      const rr = r * k * (0.86 + noise(seed + b, i) * 0.2 + Math.sin(a * 3 + rot) * 0.05);
      pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7));
    }
    g.fillStyle(RAINBOW[b], alpha * vivid);
    g.fillPoints(pts, true);
  }

  // The swirl: a spiral of white syrup drawn into the middle.
  g.lineStyle(1.6, CELE.cream, alpha * (0.35 + heat * 0.35));
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const a = u * TAU * 1.6 + t * 0.6 + seed;
    const rr = r * 0.78 * (1 - u);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.7;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();

  // Sprinkles, fixed in the syrup.
  const count = Math.round(8 + r * 0.25);
  for (let i = 0; i < count; i++) {
    const a = noise(seed, 40 + i) * TAU;
    const d = r * 0.88 * Math.sqrt(noise(seed, 60 + i));
    sprinkle(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, noise(seed, 80 + i) * TAU, 4,
      i % 4 === 0 ? CELE.white : RAINBOW[(i + Math.floor(noise(seed, 100 + i) * 6)) % 6],
      alpha * 0.95);
  }

  // Set sugar: pale crystals creeping in as it dies.
  const crystals = Math.round((1 - heat) * 7);
  for (let i = 0; i < crystals; i++) {
    const a = noise(seed, 120 + i) * TAU;
    const d = r * (0.3 + noise(seed, 140 + i) * 0.6);
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d * 0.7;
    const sz = r * (0.08 + noise(seed, 160 + i) * 0.08);
    g.fillStyle(CELE.cream, alpha * 0.55);
    g.fillPoints([pt(cx, cy - sz), pt(cx + sz, cy), pt(cx, cy + sz * 0.7), pt(cx - sz, cy)], true);
  }

  // Glossy highlight, and syrup bubbles rising while it is still fresh.
  g.fillStyle(CELE.white, alpha * 0.25 * (0.5 + heat * 0.5));
  g.fillEllipse(x - r * 0.3, y - r * 0.25, r * 0.6, r * 0.18);
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.8 + noise(seed, 190 + i)) % 1;
    const a = noise(seed, 200 + i) * TAU;
    const d = r * 0.5 * noise(seed, 210 + i);
    g.lineStyle(1, CELE.white, alpha * (1 - ph) * 0.6 * heat);
    g.strokeCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 1 + ph * 2.6);
  }
}

/** The glob of candy in the air on its way to becoming a puddle. Same size as the lava blob. */
export function candyGlob(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, seed: number): void {
  g.fillStyle(CELE.pink, 0.28);
  g.fillCircle(x, y, 13);
  // A gumdrop: domed top, flat sugary base.
  g.fillStyle(RAINBOW[Math.floor(noise(seed, 1) * 6)], 1);
  g.fillPoints([
    pt(x - 8, y + 5), pt(x - 7.4, y - 1), pt(x - 4.4, y - 6.4), pt(x, y - 8),
    pt(x + 4.4, y - 6.4), pt(x + 7.4, y - 1), pt(x + 8, y + 5),
  ], true);
  g.fillStyle(CELE.white, 0.7);
  g.fillEllipse(x - 2.6, y - 3.4, 4.4, 3);
  for (let i = 0; i < 5; i++) {
    g.fillStyle(CELE.cream, 0.9);
    g.fillCircle(x - 6 + i * 3 + Math.sin(t * 3 + i) * 0.3, y + 1 + (i % 2) * 2, 0.8);
  }
}

// ── Party popper (breathCone) ─────────────────────────────────────────────

/**
 * Blunder-Boil, partied: a burst of streamers and confetti out of a popper. The burst fills
 * the same wedge (`len`, `half` around `ang`) the lava cone does, so its reach still reads.
 */
export function partyPopper(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, ang: number, len: number, half: number,
  t: number, seed: number, hot: boolean, alpha = 1,
): void {
  // A faint fan of glitter so the wedge has an edge.
  const fan: Phaser.Geom.Point[] = [pt(x, y)];
  for (let i = 0; i <= 12; i++) {
    const a = ang - half + (i / 12) * half * 2;
    fan.push(pt(x + Math.cos(a) * len, y + Math.sin(a) * len));
  }
  g.fillStyle(hot ? CELE.lemon : CELE.blush, alpha * 0.18);
  g.fillPoints(fan, true);

  // Streamers fanning out of the mouth.
  for (let i = 0; i < 7; i++) {
    const a = ang - half * 0.85 + (i / 6) * half * 1.7 + (noise(seed, i) - 0.5) * 0.12;
    const l = len * (0.7 + noise(seed, 10 + i) * 0.35);
    streamer(g, x, y, a, l, 7, t, seed + i * 3, RAINBOW[i % 6], 2.6, alpha * 0.92);
  }

  // Confetti, scattered through the wedge and drifting outward.
  for (let i = 0; i < 26; i++) {
    const f = noise(seed, 30 + i);
    const a = ang - half + f * half * 2;
    const ph = (t * 1.4 + noise(seed, 60 + i)) % 1;
    const d = len * (0.2 + noise(seed, 90 + i) * 0.85) * (0.85 + ph * 0.2);
    confetti(g, x + Math.cos(a) * d, y + Math.sin(a) * d + ph * 5, 2.4,
      t * 8 + i, RAINBOW[i % 6], alpha * (0.95 - ph * 0.3));
  }

  // The popper itself: a striped cardboard cone with its mouth along `ang`.
  const c = Math.cos(ang), s = Math.sin(ang);
  const nx = -s, ny = c;
  const at = (d: number, o: number) => pt(x + c * d + nx * o, y + s * d + ny * o);
  g.fillStyle(CELE.ink, alpha);
  g.fillPoints([at(-18, -2), at(1, -7.5), at(1, 7.5), at(-18, 2)], true);
  const stripes = [CELE.pink, CELE.lemon, CELE.sky, CELE.mint];
  for (let i = 0; i < 4; i++) {
    const d0 = -17 + i * 4.5, d1 = d0 + 4.5;
    const w0 = 2 + (d0 + 18) * 0.29, w1 = 2 + (d1 + 18) * 0.29;
    g.fillStyle(stripes[i], alpha);
    g.fillPoints([at(d0, -w0 + 0.8), at(d1, -w1 + 0.8), at(d1, w1 - 0.8), at(d0, w0 - 0.8)], true);
  }
  // Paper rim and the pull-string at the tail.
  g.lineStyle(1.6, CELE.cream, alpha);
  const r0 = at(1, -7.5), r1 = at(1, 7.5);
  g.lineBetween(r0.x, r0.y, r1.x, r1.y);
  g.lineStyle(1, CELE.cream, alpha * 0.85);
  const s0 = at(-18, 0), s1 = at(-26, Math.sin(t * 12) * 3);
  g.lineBetween(s0.x, s0.y, s1.x, s1.y);
}

/** The puff out of the popper's back end — what throws the partier the other way. */
export function popperPuff(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, u: number, t: number,
): void {
  for (let i = 0; i < 9; i++) {
    const a = ang + (noise(7, i) - 0.5) * 0.9;
    const d = 8 + u * 22 + noise(9, i) * 10;
    confetti(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 2, t * 10 + i, RAINBOW[i % 6], 0.8 * (1 - u));
  }
}

// ── Piñata (volcanoCone) ──────────────────────────────────────────────────

/** A filled disc band between two heights of a circle (a horizontal stripe of the body). */
function circleBand(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, y0: number, y1: number,
): void {
  const top = Math.max(-r, y0), bot = Math.min(r, y1);
  if (bot <= top) return;
  const steps = 6;
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const yy = top + (bot - top) * (i / steps);
    const hw = Math.sqrt(Math.max(0, r * r - yy * yy));
    left.push(pt(cx - hw, cy + yy));
    right.unshift(pt(cx + hw, cy + yy));
  }
  g.fillPoints(left.concat(right), true);
}

/**
 * A star piñata standing on two of its points. `p` is 0–1 pressure: it shakes harder, its
 * paper splits along more seams (candy showing through), and sweets start to spill. `y` is the
 * base, on the ground. Same height and width as the volcano cone.
 */
export function pinata(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, size: number, p: number, t: number, seed: number,
): void {
  const q = p * p;
  const sx = x + Math.sin(t * 34 + seed) * q * 2.6;
  const wob = Math.sin(t * 2.1 + seed) * 0.05 + Math.sin(t * 30 + seed) * q * 0.06;

  const L = size * 0.88;
  const R = size * 0.5;
  const cy = y - L * Math.sin(Phaser.Math.DegToRad(54));

  // Shadow on the floor.
  g.fillStyle(CELE.shadow, 0.4);
  g.fillEllipse(x, y + 2, size * 2.4, size * 0.7);

  // Five paper cones: up, two shoulders, two feet.
  const angles = [-90, -18, 54, 126, 198].map((d) => Phaser.Math.DegToRad(d) + wob);
  const coneColors = [CELE.pink, CELE.sky, CELE.lemon, CELE.mint, CELE.tangerine];
  const tips: { x: number; y: number; a: number }[] = [];
  for (let k = 0; k < 5; k++) {
    const a = angles[k];
    const c = Math.cos(a), s = Math.sin(a);
    const nx = -s, ny = c;
    const baseW = R * 0.62;
    const tipX = sx + c * L, tipY = cy + s * L;
    tips.push({ x: tipX, y: tipY, a });
    // Cone in three tissue bands, darkest at the root.
    for (let b = 0; b < 3; b++) {
      const f0 = 0.35 + b * 0.22, f1 = b === 2 ? 1 : f0 + 0.22;
      const w0 = baseW * (1 - (f0 - 0.35) / 0.65), w1 = baseW * (1 - (f1 - 0.35) / 0.65);
      g.fillStyle(b === 1 ? CELE.cream : coneColors[k], 1);
      g.fillPoints([
        pt(sx + c * L * f0 + nx * w0, cy + s * L * f0 + ny * w0),
        pt(sx + c * L * f1 + nx * w1, cy + s * L * f1 + ny * w1),
        pt(sx + c * L * f1 - nx * w1, cy + s * L * f1 - ny * w1),
        pt(sx + c * L * f0 - nx * w0, cy + s * L * f0 - ny * w0),
      ], true);
    }
    // A shaded flank down one side of each cone.
    g.fillStyle(CELE.ink, 0.22);
    g.fillTriangle(sx + c * L * 0.35 - nx * baseW, cy + s * L * 0.35 - ny * baseW,
      tipX, tipY, sx + c * L * 0.35, cy + s * L * 0.35);
  }

  // The body: a ball of rainbow fringe.
  g.fillStyle(CELE.ink, 1);
  g.fillCircle(sx, cy, R + 1.5);
  const bands = 6;
  for (let b = 0; b < bands; b++) {
    const y0 = -R + (b / bands) * R * 2, y1 = y0 + (R * 2) / bands;
    g.fillStyle(RAINBOW[b], 1);
    circleBand(g, sx, cy, R, y0, y1);
    // Fringe: a scallop row along the bottom edge of every band.
    const hw = Math.sqrt(Math.max(0, R * R - y1 * y1));
    if (b < bands - 1 && hw > 3) {
      const n = Math.max(2, Math.round(hw / 3));
      for (let i = 0; i < n; i++) {
        const fx = sx - hw + (i + 0.5) * (hw * 2) / n;
        const flutter = Math.sin(t * 6 + i + b) * (0.6 + p * 1.2);
        g.fillTriangle(fx - 2, cy + y1 - 0.5, fx + 2, cy + y1 - 0.5, fx + flutter, cy + y1 + 2.8);
      }
    }
  }
  g.fillStyle(CELE.white, 0.35);
  g.fillEllipse(sx - R * 0.35, cy - R * 0.4, R * 0.7, R * 0.4);

  // Tassels off each tip, swinging; they whip about as it is about to go.
  for (let k = 0; k < 5; k++) {
    const tip = tips[k];
    for (let i = 0; i < 3; i++) {
      const sway = Math.sin(t * (3 + p * 9) + i * 1.3 + k) * (2 + p * 4);
      g.lineStyle(1.4, RAINBOW[(k + i * 2) % 6], 0.95);
      g.lineBetween(tip.x, tip.y, tip.x + sway + (i - 1) * 2, tip.y + 7 + i * 1.5);
    }
  }

  // Seams splitting open — one per threshold, so the cracking is progressive.
  const maxCracks = 7;
  for (let i = 0; i < maxCracks; i++) {
    const at = 0.12 + (i / maxCracks) * 0.72;
    if (p < at) continue;
    const grown = Math.min(1, (p - at) / 0.22);
    const a0 = noise(seed, i) * TAU;
    let px = sx + Math.cos(a0) * R * 0.15, py = cy + Math.sin(a0) * R * 0.15;
    for (let s = 1; s <= 4; s++) {
      const f = (s / 4) * grown;
      const a = a0 + (noise(seed, 20 + i * 5 + s) - 0.5) * 0.9;
      const nx = sx + Math.cos(a) * R * (0.15 + f * 0.85), ny = cy + Math.sin(a) * R * (0.15 + f * 0.85);
      g.lineStyle(3.4 - f * 1.4, CELE.ink, 0.95 * grown);
      g.lineBetween(px, py, nx, ny);
      // Candy peeking out of the split.
      g.fillStyle(RAINBOW[(i + s) % 6], grown);
      g.fillCircle((px + nx) / 2, (py + ny) / 2, 1.4);
      px = nx; py = ny;
    }
  }

  // Sweets dribbling out of the bottom once it is close.
  if (p > 0.35) {
    for (let i = 0; i < 4; i++) {
      const ph = (t * (0.6 + p * 1.6) + i / 4) % 1;
      const dx = (noise(seed, 50 + i) - 0.5) * R;
      wrappedCandy(g, sx + dx, cy + R * 0.8 + easeIn(ph) * (y - cy - R * 0.6), 2.2,
        t * 4 + i, RAINBOW[(i * 2) % 6], (1 - ph) * Math.min(1, (p - 0.35) * 3));
    }
  }

  // The hanging loop on the top point and a little paper face, so it reads as a piñata.
  const top = tips[0];
  g.lineStyle(1.4, CELE.cream, 0.9);
  g.strokeCircle(top.x, top.y - 3, 3);
  g.fillStyle(CELE.ink, 1);
  g.fillCircle(sx - R * 0.3, cy - R * 0.1, 1.6);
  g.fillCircle(sx + R * 0.3, cy - R * 0.1, 1.6);
  g.lineStyle(1.2, CELE.ink, 1);
  g.beginPath();
  g.arc(sx, cy + R * 0.12, R * 0.22, 0.2, Math.PI - 0.2, false);
  g.strokePath();
}

// ── Gumball (cannonball) ──────────────────────────────────────────────────

export function gumball(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, ang: number, spin: number, seed: number, alpha = 1,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 1; i <= 4; i++) {
    confetti(g, x - c * i * 6, y - s * i * 6, 2.2, spin + i, RAINBOW[(i + Math.floor(seed)) % 6], alpha * (0.6 - i * 0.12));
  }
  const col = RAINBOW[Math.floor(noise(seed, 3) * 6)];
  g.fillStyle(col, alpha * 0.3);
  g.fillCircle(x, y, 9);
  g.fillStyle(col, alpha);
  g.fillCircle(x, y, 6.2);
  g.lineStyle(1, CELE.ink, alpha * 0.5);
  g.strokeCircle(x, y, 6.2);
  g.fillStyle(CELE.white, alpha * 0.85);
  g.fillCircle(x - 2, y - 2.2, 1.8);
}

// ── Parade float (pirateShip) ─────────────────────────────────────────────

/**
 * Molten Mutiny's ship as a parade float, in the same two passes and hull coordinates as
 * `pirateShip` (`u` forward along `heading`, `v` to starboard). `hp` (0–1) is shown by the
 * balloons: they pop one by one as the float takes damage.
 */
export function paradeFloat(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, heading: number, t: number, hp: number, seed: number,
  layer: 'hull' | 'rig', alpha = 1,
): void {
  const c = Math.cos(heading), s = Math.sin(heading);
  const at = (u: number, v: number) => pt(x + c * u - s * v, y + s * u + c * v);
  const health = Phaser.Math.Clamp(hp, 0, 1);

  if (layer === 'hull') {
    // A trail of confetti behind it instead of a lava wake.
    for (let i = 0; i < 12; i++) {
      const p = at(-50 - noise(seed, i) * 50, (noise(seed, 20 + i) - 0.5) * 30);
      confetti(g, p.x, p.y, 2.2, t * 3 + i, RAINBOW[i % 6], alpha * (0.6 - (i % 4) * 0.1));
    }
    g.fillStyle(CELE.shadow, alpha * 0.45);
    const sh = at(-2, 4);
    g.fillEllipse(sh.x, sh.y, 100, 42);

    // Wheels at the corners, peeking out under the skirt.
    for (const [u, v] of [[-34, -17], [-34, 17], [30, -15], [30, 15]] as const) {
      const w = at(u, v);
      g.fillStyle(CELE.ink, alpha);
      g.fillCircle(w.x, w.y, 5);
      g.fillStyle(CELE.lemon, alpha);
      g.fillCircle(w.x, w.y, 2.2);
    }

    // Platform: the same hull outline, rounded at both ends — a float, not a boat.
    const hull = [
      at(-46, -12), at(-48, 0), at(-46, 12), at(-24, 17), at(18, 15), at(40, 10), at(48, 0),
      at(40, -10), at(18, -15), at(-24, -17),
    ];
    g.fillStyle(CELE.plum, alpha);
    g.fillPoints(hull, true);
    // Skirt: scalloped rainbow fringe round the edge.
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      const n = 4;
      for (let k = 0; k < n; k++) {
        const f = (k + 0.5) / n;
        g.fillStyle(RAINBOW[(i * n + k) % 6], alpha);
        g.fillCircle(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 3.4);
      }
    }
    // Deck in pink with polka dots.
    const deck = hull.map((p) => pt(x + (p.x - x) * 0.84, y + (p.y - y) * 0.84));
    g.fillStyle(CELE.bubblegum, alpha);
    g.fillPoints(deck, true);
    g.fillStyle(CELE.blush, alpha * 0.6);
    g.fillPoints(deck.map((p) => pt(x + (p.x - x) * 0.66, y + (p.y - y) * 0.66)), true);
    for (let i = 0; i < 12; i++) {
      const d = at(-36 + noise(seed, 40 + i) * 74, (noise(seed, 60 + i) - 0.5) * 20);
      g.fillStyle(i % 2 ? CELE.white : CELE.lemon, alpha * 0.8);
      g.fillCircle(d.x, d.y, 1.6);
    }
    // Flower garland round the gunwale; it wilts (fewer blooms) as the float is damaged.
    const blooms = Math.round(4 + health * 6);
    for (let i = 0; i < blooms; i++) {
      for (const side of [-1, 1]) {
        const u = -36 + (i / Math.max(1, blooms - 1)) * 70;
        const p = at(u, side * (13 - Math.abs(u) * 0.06));
        g.fillStyle(RAINBOW[(i + (side > 0 ? 3 : 0)) % 6], alpha);
        g.fillCircle(p.x, p.y, 2.4);
        g.fillStyle(CELE.cream, alpha);
        g.fillCircle(p.x, p.y, 0.9);
      }
    }
    // A giant cake on the stern and a big bow on the nose.
    const cake = at(-38, 0);
    g.fillStyle(CELE.cream, alpha);
    g.fillEllipse(cake.x, cake.y, 16, 14);
    g.fillStyle(CELE.pink, alpha);
    g.fillEllipse(cake.x, cake.y - 2, 12, 9);
    g.fillStyle(CELE.cherry, alpha);
    g.fillCircle(cake.x, cake.y - 4, 2);
    const bow = at(46, 0);
    g.fillStyle(CELE.pink, alpha);
    g.fillTriangle(bow.x, bow.y, bow.x - s * 7 + c * 4, bow.y + c * 7 + s * 4, bow.x - s * 7 - c * 4, bow.y + c * 7 - s * 4);
    g.fillTriangle(bow.x, bow.y, bow.x + s * 7 + c * 4, bow.y - c * 7 + s * 4, bow.x + s * 7 - c * 4, bow.y - c * 7 - s * 4);
    g.fillStyle(CELE.lemon, alpha);
    g.fillCircle(bow.x, bow.y, 2.4);
    return;
  }

  // ── Rig: two poles fore and aft carrying balloon bunches, bunting strung between them ──
  const poles: Array<[number, number]> = [[-26, 30], [22, 36]];
  const tops: { x: number; y: number }[] = [];
  for (let m = 0; m < poles.length; m++) {
    const [u, h] = poles[m];
    const foot = at(u, 0);
    const top = { x: foot.x, y: foot.y - h };
    tops.push(top);
    // A barber-striped pole.
    g.lineStyle(2.8, CELE.cream, alpha);
    g.lineBetween(foot.x, foot.y, top.x, top.y);
    for (let i = 0; i < 5; i++) {
      const y0 = foot.y - (i / 5) * h;
      g.lineStyle(2.8, CELE.pink, alpha);
      g.lineBetween(foot.x, y0 - 2, foot.x, y0 - 4);
    }
    // Balloons on short strings; each pole holds four, and they pop off as the hull fails.
    const live = Math.ceil(health * 4 + 0.001);
    for (let b = 0; b < 4; b++) {
      if (b >= live) continue;
      const ba = -Math.PI / 2 + (b - 1.5) * 0.55 + Math.sin(t * 1.6 + b + m) * 0.08;
      const bl = 12 + (b % 2) * 5;
      const bx = top.x + Math.cos(ba) * bl, by = top.y + Math.sin(ba) * bl;
      g.lineStyle(0.9, CELE.cream, alpha * 0.85);
      g.lineBetween(top.x, top.y, bx, by + 6);
      const col = RAINBOW[(b * 2 + m) % 6];
      g.fillStyle(col, alpha);
      g.fillEllipse(bx, by, 11, 13);
      g.fillTriangle(bx - 1.6, by + 6.6, bx + 1.6, by + 6.6, bx, by + 4.6);
      g.fillStyle(CELE.white, alpha * 0.55);
      g.fillEllipse(bx - 2.2, by - 2.6, 3, 4);
    }
    g.fillStyle(CELE.lemon, alpha);
    g.fillCircle(top.x, top.y, 2);
  }

  // Bunting: a sagging line of triangular pennants between the two pole tops.
  const a0 = tops[0], a1 = tops[1];
  const flags = 7;
  g.lineStyle(1, CELE.cream, alpha * 0.9);
  let prev = { x: a0.x, y: a0.y + 4 };
  for (let i = 1; i <= flags; i++) {
    const f = i / flags;
    const px = a0.x + (a1.x - a0.x) * f;
    const py = a0.y + 4 + (a1.y - a0.y) * f + Math.sin(f * Math.PI) * 9;
    g.lineBetween(prev.x, prev.y, px, py);
    prev = { x: px, y: py };
  }
  for (let i = 0; i < flags; i++) {
    const f = (i + 0.5) / flags;
    const px = a0.x + (a1.x - a0.x) * f;
    const py = a0.y + 4 + (a1.y - a0.y) * f + Math.sin(f * Math.PI) * 9;
    const flap = Math.sin(t * 7 + i) * 1.2;
    g.fillStyle(RAINBOW[i % 6], alpha);
    g.fillTriangle(px - 3, py, px + 3, py, px + flap, py + 7);
  }

  // A disco ball hanging off the stern, where the lantern was.
  const lan = at(-44, 0);
  g.lineStyle(1.2, CELE.cream, alpha);
  g.lineBetween(lan.x, lan.y, lan.x, lan.y - 10);
  g.fillStyle(CELE.lilac, alpha);
  g.fillCircle(lan.x, lan.y - 14, 4.2);
  for (let i = 0; i < 4; i++) {
    const a = t * 3 + i * 1.57;
    g.fillStyle(CELE.white, alpha * (0.5 + 0.5 * Math.sin(a)));
    g.fillRect(lan.x + Math.cos(a) * 2.4 - 0.8, lan.y - 14 + Math.sin(a * 0.7) * 2 - 0.8, 1.6, 1.6);
  }
}

// ── Party-goer (pirateSpirit) ─────────────────────────────────────────────

/**
 * One of the float's crew: a party-goer bobbing in the air with a hat on and a blowout
 * (party horn) held out along `facing`. The blowout unrolls with `dash` — the lunge. `hp`
 * (0–1) shrinks them as they wear down, like the spirit.
 */
export function partyGoer(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, facing: number, t: number, seed: number, hp: number, dash: number,
  alpha = 1,
): void {
  const size = 0.7 + hp * 0.5;
  const c = Math.cos(facing), s = Math.sin(facing);
  const hue = Math.floor(noise(seed, 1) * 6);
  const body = RAINBOW[hue];
  const hat = RAINBOW[(hue + 3) % 6];

  g.fillStyle(CELE.shadow, alpha * 0.35);
  g.fillEllipse(x, y + 26, 22 * size, 7 * size);

  // Streamer tail behind them on a lunge.
  if (dash > 0) {
    streamer(g, x, y + 6 * size, facing + Math.PI, 14 + dash * 24, 4, t, seed, hat, 2.4, alpha * 0.85);
  }

  // Body: a little pear in a party top, with confetti dots.
  const bob = Math.sin(t * 4 + seed) * 1.5;
  const by = y + bob;
  g.fillStyle(body, alpha);
  g.fillPoints([
    pt(x - 9 * size, by + 12 * size), pt(x - 8 * size, by + 2 * size), pt(x - 4 * size, by - 5 * size),
    pt(x + 4 * size, by - 5 * size), pt(x + 8 * size, by + 2 * size), pt(x + 9 * size, by + 12 * size),
  ], true);
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 ? CELE.white : CELE.lemon, alpha * 0.85);
    g.fillCircle(x + (noise(seed, 10 + i) - 0.5) * 12 * size, by + (2 + noise(seed, 20 + i) * 8) * size, 1);
  }
  // Head.
  const hy = by - 10 * size;
  g.fillStyle(CELE.cream, alpha);
  g.fillCircle(x, hy, 6.4 * size);
  g.fillStyle(CELE.blush, alpha * 0.8);
  g.fillCircle(x - 3.6 * size + c, hy + 2 * size, 1.4 * size);
  g.fillCircle(x + 3.6 * size + c, hy + 2 * size, 1.4 * size);
  // Happy closed eyes.
  g.lineStyle(1.2, CELE.ink, alpha);
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.arc(x + sd * 2.6 * size + c * 1.4, hy - 0.4 * size, 1.4 * size, Math.PI + 0.3, -0.3, false);
    g.strokePath();
  }
  // Cone hat with a pom-pom, tilted.
  const tilt = Math.sin(t * 3 + seed) * 2;
  g.fillStyle(hat, alpha);
  g.fillTriangle(x - 4.6 * size, hy - 4.6 * size, x + 4.6 * size, hy - 4.6 * size, x + tilt, hy - 16 * size);
  g.lineStyle(1.2, CELE.white, alpha * 0.8);
  g.lineBetween(x - 2.6 * size, hy - 8.6 * size, x + 2.6 * size + tilt * 0.4, hy - 8.6 * size);
  g.fillStyle(CELE.white, alpha);
  g.fillCircle(x + tilt, hy - 16 * size, 2 * size);

  // The blowout: a rolled paper tongue out of the mouth that unrolls along `facing`.
  const mx = x + c * 4 * size, my = hy + 2.6 * size;
  const len = 6 + dash * 16 + Math.max(0, Math.sin(t * 2.4 + seed)) * 4;
  g.lineStyle(3, hat, alpha);
  g.lineBetween(mx, my, mx + c * len, my + s * len);
  g.lineStyle(1, CELE.white, alpha * 0.8);
  g.lineBetween(mx, my, mx + c * len, my + s * len);
  // The curled end that hasn't unrolled yet.
  g.lineStyle(2.4, hat, alpha);
  g.strokeCircle(mx + c * (len + 2.4), my + s * (len + 2.4), 2.4 * (1 - dash * 0.6) + 0.6);
  // Its mouthpiece.
  g.fillStyle(CELE.lemon, alpha);
  g.fillCircle(mx, my, 1.8);
}

// ── Lines ─────────────────────────────────────────────────────────────────

/** Magma's floating callouts, in party terms. Unknown lines pass through. */
const LINES: Array<[string, string]> = [
  ['🌋 VOLCANO', '🪅 PIÑATA'],
  ['🌋 CRITICAL', '🪅 ABOUT TO POP'],
  ['💥 BLUNDER-BOIL', '🎉 PARTY POPPER'],
  ['🔫', '🎉'],
  ["🏴‍☠️ SHIP'S OUT", "🎈 FLOAT'S OUT"],
  ['🏴‍☠️ THE SHIP RISES', '🎊 PARADE TIME'],
  ['🏴‍☠️', '🎊'],
  ['📿 MOLTEN MUTINY', '🍭 SUGAR RUSH'],
  ['📿 PENDANT OFF', '🍭 RUSH OFF'],
  ['⚓ ABOARD', '🎈 ALL ABOARD'],
  ['🪂 OVER THE SIDE', '🎈 HOPPED OFF'],
  ['⚓ SHIP SUNK', '🎈 FLOAT POPPED'],
  ['⚓', '🎈'],
  ['💣 BROADSIDE', '🍬 GUMBALLS'],
  ['💣 LIT', '🍬 STUFFED'],
  ['💣', '🍬'],
  ['👻 ALL HANDS', '🥳 PARTY ON'],
  ['👻', '🥳'],
];

export function celebrationLine(text: string): string {
  let out = text;
  for (const [from, to] of LINES) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

// ── One-shot effects ──────────────────────────────────────────────────────

export class CelebrationFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** Confetti thrown out from a point, fluttering down as it slows. */
  confettiBurst(x: number, y: number, radius: number, count = 22, ms = 900, depth = 9): void {
    const bits = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU, d: radius * (0.35 + Math.random() * 0.75),
      lift: 10 + Math.random() * 22, spin: Math.random() * 9, col: RAINBOW[i % 6],
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const b of bits) {
        const px = x + Math.cos(b.a) * b.d * e + Math.sin(t * 9 + b.spin) * 3 * t;
        const py = y + Math.sin(b.a) * b.d * e * 0.7 - b.lift * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) + t * t * 18;
        confetti(g, px, py, 2.6, b.spin + t * 12, b.col, 1 - easeIn(t));
      }
    });
  }

  /** A piñata going: sweets flung out on arcs and landing, with streamers and confetti. */
  candyBurst(x: number, y: number, radius: number, depth = 9): void {
    const sweets = Array.from({ length: 16 }, (_, i) => ({
      a: (i / 16) * TAU + Math.random() * 0.4, d: radius * (0.4 + Math.random() * 0.6),
      lift: 18 + Math.random() * 26, spin: Math.random() * TAU, col: RAINBOW[i % 6],
    }));
    this.anim(depth, 1100, (g, t) => {
      const e = easeOut(Math.min(1, t * 1.3));
      const fade = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      for (const s of sweets) {
        const px = x + Math.cos(s.a) * s.d * e;
        const py = y + Math.sin(s.a) * s.d * e * 0.7 - Math.sin(Math.min(1, t * 1.3) * Math.PI) * s.lift;
        wrappedCandy(g, px, py, 3.2, s.spin + t * 10 * (1 - e), s.col, fade);
      }
    });
    // Streamers bursting out of the middle.
    const rays = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU + Math.random() * 0.3, col: RAINBOW[i % 6] }));
    this.anim(depth, 700, (g, t) => {
      for (const r of rays) {
        streamer(g, x, y, r.a, radius * 0.75 * easeOut(t), 5, t * 2, r.a * 7, r.col, 2.6, 1 - t);
      }
    });
    this.confettiBurst(x, y, radius, 30, 1100, depth);
  }

  /** A shower of sprinkles where a candy glob lands. */
  sprinkleSplat(x: number, y: number, r: number, depth = 8): void {
    const bits = Array.from({ length: 10 }, (_, i) => ({
      a: Math.random() * TAU, d: r * (0.4 + Math.random() * 0.9), lift: 6 + Math.random() * 12,
      ang: Math.random() * TAU, col: RAINBOW[i % 6],
    }));
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      for (const b of bits) {
        sprinkle(g, x + Math.cos(b.a) * b.d * e, y + Math.sin(b.a) * b.d * e * 0.65 - Math.sin(t * Math.PI) * b.lift,
          b.ang + t * 6, 4, b.col, 1 - t * 0.7);
      }
    });
  }
}
