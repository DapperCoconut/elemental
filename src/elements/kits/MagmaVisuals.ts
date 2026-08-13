import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeOut } from './ElementVisuals';

/**
 * Everything Magma draws.
 *
 * The element's whole read is *crust over heat*: every object it puts on the field is a dark
 * basalt skin with something molten showing through the gaps, and how much of that skin has
 * split open is how dangerous the thing currently is. A cold volcano is a black cone with a
 * dull red mouth; a volcano at full pressure is a lattice of glowing fissures with barely any
 * rock left between them. Nothing here uses a bar to say that — the crust says it.
 *
 * Two palettes live in this file rather than one. Magma proper runs orange-through-white, and
 * the hatched dragon runs violet-through-lilac, because Dragon Kin has to be legible across
 * the arena as "that is no longer the same character". They deliberately share no hues.
 */

export type MagmaColorFn = ColorFn;

export const MAG = {
  /** Cooled rock — the dark half of every silhouette. */
  basalt: 0x1d1113,
  crustDeep: 0x33201c,
  crust: 0x55322a,
  ash: 0x7d6863,
  smoke: 0x2b2226,
  /** The element colour. */
  magma: 0xff5a1e,
  lava: 0xff8b22,
  gold: 0xffc44a,
  /** The hottest thing on screen — reserve it for cores and fresh cracks. */
  white: 0xfff0c0,
  ember: 0xff7733,
  scorch: 0x120a0b,

  /** Dragon Kin. Nothing above is allowed near these five. */
  scale: 0x8a3fd6,
  scaleDeep: 0x4a1d80,
  scaleLit: 0xc07dff,
  membrane: 0x63289e,
  breath: 0xd8a0ff,
};

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * Deterministic 0–1 noise. Every rock, pool and shell carries a seed and asks this for its
 * shape, so an object that lives for twenty seconds is drawn identically on every frame
 * instead of boiling.
 */
export function noise(seed: number, i: number): number {
  const v = Math.sin(seed * 91.7 + i * 213.3) * 39217.4413;
  return v - Math.floor(v);
}

/** A shard of cooled crust: an angular plate, never a circle. */
export function crustPlate(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, r: number, ang: number, seed: number,
  color: number, alpha: number,
): void {
  const sides = 5;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ang + (i / sides) * TAU;
    const rr = r * (0.62 + noise(seed, i) * 0.6);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.78));
  }
  g.fillStyle(tint(color), alpha);
  g.fillPoints(pts, true);
}

/**
 * A pool of lava on the floor. `heat` (0–1) decides how much of it has skinned over — a fresh
 * pool is almost all light, an old one is mostly plate with seams.
 */
export function moltenPool(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, r: number, heat: number, t: number, seed: number, alpha = 1,
): void {
  // The air over it.
  g.fillStyle(tint(MAG.ember), alpha * (0.06 + heat * 0.1));
  g.fillCircle(x, y, r * 1.4);

  // The pool: a closed irregular blob, squashed so it lies on the ground rather than floating.
  const steps = 20;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const rr = r * (0.84 + noise(seed, i) * 0.26 + Math.sin(t * 1.7 + i * 1.3 + seed) * 0.05);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7));
  }
  g.fillStyle(tint(MAG.magma), alpha * 0.95);
  g.fillPoints(pts, true);

  // Hotter toward the middle, in two shrinking passes rather than a gradient.
  g.fillStyle(tint(MAG.lava), alpha * (0.5 + heat * 0.45));
  g.fillEllipse(x, y, r * 1.25, r * 0.88);
  g.fillStyle(tint(MAG.gold), alpha * (0.24 + heat * 0.5));
  g.fillEllipse(x, y, r * 0.68, r * 0.48);

  // Skin: plates drifting on the surface, more of them the colder it gets.
  const plates = Math.round(2 + (1 - heat) * 5);
  for (let i = 0; i < plates; i++) {
    const a = noise(seed, 30 + i) * TAU + t * 0.22 * (i % 2 ? 1 : -1);
    const d = r * (0.16 + noise(seed, 50 + i) * 0.62);
    crustPlate(g, tint,
      x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7,
      r * (0.16 + noise(seed, 70 + i) * 0.2), a * 1.7, seed + i * 3,
      MAG.crustDeep, alpha * (0.55 + (1 - heat) * 0.4));
  }

  // A couple of bright bubbles working their way up.
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.8 + noise(seed, 90 + i)) % 1;
    const a = noise(seed, 110 + i) * TAU;
    const d = r * 0.55 * noise(seed, 130 + i);
    g.fillStyle(tint(MAG.white), alpha * (1 - ph) * 0.55 * heat);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 1 + ph * 2.4);
  }
}

/** A flung chunk of rock — glowing along its fractures, dark on its faces. */
export function lavaRock(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, r: number, spin: number, seed: number, alpha = 1,
): void {
  g.fillStyle(tint(MAG.magma), alpha * 0.22);
  g.fillCircle(x, y, r * 2);

  const sides = 6;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = spin + (i / sides) * TAU;
    const rr = r * (0.68 + noise(seed, i) * 0.62);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  // Molten underneath, rock on top, so the gaps between the faces glow.
  g.fillStyle(tint(MAG.lava), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(MAG.basalt), alpha * 0.92);
  const inner = pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.72, y + (p.y - y) * 0.72));
  g.fillPoints(inner, true);
  // A fracture straight through it.
  g.lineStyle(1.4, tint(MAG.gold), alpha * 0.9);
  g.lineBetween(
    x + Math.cos(spin * 1.3) * r * 0.7, y + Math.sin(spin * 1.3) * r * 0.7,
    x - Math.cos(spin * 1.3 + 0.5) * r * 0.7, y - Math.sin(spin * 1.3 + 0.5) * r * 0.7,
  );
}

/**
 * The volcano. `p` is 0–1 pressure and drives everything visible about it: the crater's
 * brightness, how many fissures have opened down the flanks, and how hard the whole cone is
 * shaking. `y` is the base, on the ground.
 */
export function volcanoCone(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, size: number, p: number, t: number, seed: number,
): void {
  // Everything shudders harder the closer it is to going. Applied to the whole silhouette so
  // the cone moves as one object rather than jittering internally.
  const q = p * p;
  const sx = x + Math.sin(t * 34 + seed) * q * 2.6;

  const hw = size;
  const h = size * 1.55;
  const cw = size * 0.4;

  // Scorched apron.
  g.fillStyle(tint(MAG.scorch), 0.5);
  g.fillEllipse(x, y + 2, hw * 2.7, hw * 0.9);

  // Body, in three strata so it reads as built up rather than a triangle.
  const layers: Array<[number, number, number]> = [
    [0, 1, MAG.crustDeep],
    [0.3, 0.74, MAG.crust],
    [0.62, 0.42, MAG.basalt],
  ];
  for (const [from, wide, color] of layers) {
    const wBot = hw * (1 - from * 0.55);
    const yBase = y - h * from;
    const pts = [
      new Phaser.Geom.Point(sx - wBot, yBase),
      new Phaser.Geom.Point(sx - cw * wide, y - h),
      new Phaser.Geom.Point(sx + cw * wide, y - h),
      new Phaser.Geom.Point(sx + wBot, yBase),
    ];
    g.fillStyle(tint(color), 1);
    g.fillPoints(pts, true);
  }

  // Fissures: cracks running from the mouth down the flanks. Each one opens at its own
  // pressure threshold, so the cone lights up progressively rather than all at once.
  const maxCracks = 7;
  for (let i = 0; i < maxCracks; i++) {
    const at = 0.12 + (i / maxCracks) * 0.72;
    if (p < at) continue;
    const grown = Math.min(1, (p - at) / 0.22);
    const side = i % 2 ? 1 : -1;
    const wander = (noise(seed, i) - 0.5) * 0.7;
    let px = sx + side * cw * 0.5;
    let py = y - h + 2;
    const segs = 5;
    for (let s = 1; s <= segs; s++) {
      const f = (s / segs) * grown;
      const nx = sx + side * (cw * 0.5 + hw * 0.62 * f) + wander * f * 16;
      const ny = y - h + h * f * 0.94;
      g.lineStyle(3.2 - f * 1.6, tint(MAG.magma), 0.85 * grown);
      g.lineBetween(px, py, nx, ny);
      g.lineStyle(1.4 - f * 0.7, tint(MAG.gold), 0.9 * grown * (0.6 + 0.4 * Math.sin(t * 9 + i)));
      g.lineBetween(px, py, nx, ny);
      px = nx;
      py = ny;
    }
  }

  // The mouth.
  g.fillStyle(tint(MAG.magma), 0.5 + p * 0.5);
  g.fillEllipse(sx, y - h, cw * 2.1, cw * 0.78);
  g.fillStyle(tint(MAG.lava), 0.45 + p * 0.55);
  g.fillEllipse(sx, y - h, cw * 1.5, cw * 0.54);
  g.fillStyle(tint(MAG.white), (0.15 + p * 0.7) * (0.7 + 0.3 * Math.sin(t * 11 + seed)));
  g.fillEllipse(sx, y - h, cw * (0.4 + p * 0.7), cw * (0.16 + p * 0.26));

  // Rim lip, so the mouth reads as a hole and not a sticker.
  g.lineStyle(2, tint(MAG.basalt), 1);
  g.strokeEllipse(sx, y - h, cw * 2.1, cw * 0.78);

  // What is coming out of it. Cold: smoke. Hot: a standing column of fire.
  const cols = 4;
  for (let i = 0; i < cols; i++) {
    const ph = (t * (0.5 + p * 1.5) + i / cols) % 1;
    const lift = ph * (16 + p * 44);
    const drift = Math.sin(t * 1.6 + i * 2.1) * (3 + ph * 9);
    const r = (2.4 + p * 4) * (1 - ph * 0.45);
    g.fillStyle(tint(p > 0.35 ? MAG.ember : MAG.smoke), (1 - ph) * (0.3 + p * 0.5));
    g.fillCircle(sx + drift, y - h - 4 - lift, r);
  }
}

/**
 * The dragon egg. Same pressure vessel as the volcano, but it answers by *cracking* rather
 * than erupting — the shell fractures further with every hit and what shows through the gaps
 * is already dragon-coloured, so the payoff is telegraphed the whole way up.
 */
export function dragonEgg(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, r: number, p: number, t: number, seed: number,
): void {
  // Heartbeat — faster and stronger the fuller it is. Everything below rides on it.
  const beat = 1 + Math.sin(t * (2 + p * 9)) * (0.02 + p * 0.05);
  const rw = r * 0.78 * beat;
  const rh = r * beat;

  g.fillStyle(tint(MAG.scale), 0.08 + p * 0.22);
  g.fillEllipse(x, y, rw * 3.2, rh * 2.6);
  g.fillStyle(tint(MAG.scorch), 0.45);
  g.fillEllipse(x, y + rh * 0.9, rw * 2.3, rh * 0.5);

  // Shell — an ovoid, narrower at the top.
  const steps = 22;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU - Math.PI / 2;
    const taper = 0.78 + 0.22 * (1 + Math.sin(a)) * 0.5;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rw * taper, y + Math.sin(a) * rh));
  }
  // What is inside, painted first so every crack below simply fails to cover it.
  g.fillStyle(tint(MAG.scaleLit), 0.85 + p * 0.15);
  g.fillPoints(pts, true);
  g.fillStyle(tint(MAG.crust), 1);
  g.fillPoints(pts.map((pt) => new Phaser.Geom.Point(x + (pt.x - x) * 0.97, y + (pt.y - y) * 0.97)), true);

  // Shell plating: rows of overlapping scutes.
  for (let row = 0; row < 4; row++) {
    const ry = y - rh * 0.66 + row * rh * 0.44;
    const width = rw * (0.5 + Math.sin((row + 0.6) / 4 * Math.PI) * 0.62);
    const n = 3 + row;
    for (let i = 0; i < n; i++) {
      const px = x - width + (i / (n - 1)) * width * 2;
      g.fillStyle(tint(row % 2 ? MAG.crustDeep : MAG.basalt), 0.9);
      g.fillEllipse(px, ry, rw * 0.34, rh * 0.2);
    }
  }

  // Cracks. Each is a fixed lightning path from the crown; `p` decides how far down it has run.
  const cracks = 6;
  for (let i = 0; i < cracks; i++) {
    const at = 0.06 + (i / cracks) * 0.66;
    if (p < at) continue;
    const grown = Math.min(1, (p - at) / 0.26);
    let px = x + (noise(seed, i) - 0.5) * rw * 0.5;
    let py = y - rh * 0.85;
    const segs = 6;
    for (let s = 1; s <= segs; s++) {
      const f = (s / segs) * grown;
      const nx = px + (noise(seed, i * 11 + s) - 0.5) * rw * 0.55;
      const ny = y - rh * 0.85 + rh * 1.7 * f;
      g.lineStyle(2.6 - f, tint(MAG.scaleDeep), 0.9 * grown);
      g.lineBetween(px, py, nx, ny);
      g.lineStyle(1.2, tint(MAG.scaleLit), grown * (0.55 + 0.45 * Math.sin(t * 7 + i * 2)));
      g.lineBetween(px, py, nx, ny);
      px = nx;
      py = ny;
    }
  }

  // A cold highlight so the shell reads as a hard surface.
  g.lineStyle(1.4, tint(MAG.ash), 0.35);
  g.beginPath();
  g.arc(x, y, rw * 0.82, -2.5, -1.5);
  g.strokePath();
}

/**
 * The pressure readout: a horizontal thermometer. Bulb on the left, graduated tube running
 * right, mercury in lava. Drawn in world space above whatever it belongs to.
 */
export function pressureGauge(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, w: number, ratio: number, hot: number,
): void {
  const h = 7;
  const bulb = 5.6;
  const r = Phaser.Math.Clamp(ratio, 0, 1);
  const left = x - w / 2;

  // Casing.
  g.fillStyle(MAG.basalt, 0.88);
  g.fillRoundedRect(left - bulb - 3, y - h / 2 - 3, w + bulb + 8, h + 6, (h + 6) / 2);

  // Empty glass.
  g.fillStyle(tint(MAG.smoke), 1);
  g.fillCircle(left, y, bulb);
  g.fillRoundedRect(left, y - h / 2, w, h, h / 2);

  // Mercury. The bulb is always full — that is what a thermometer looks like.
  g.fillStyle(tint(hot), 1);
  g.fillCircle(left, y, bulb - 1.2);
  if (r > 0) g.fillRoundedRect(left, y - h / 2 + 1.2, Math.max(h - 2.4, w * r), h - 2.4, (h - 2.4) / 2);
  // The leading edge runs hotter than the column behind it.
  if (r > 0.02) {
    g.fillStyle(tint(MAG.white), 0.85);
    g.fillCircle(left + Math.max(h - 2.4, w * r) - 1.5, y, (h - 2.4) / 2);
  }

  // Graduations, and a heavier one at the top of the scale.
  for (let i = 1; i < 5; i++) {
    g.lineStyle(1, MAG.ash, i === 4 ? 0.75 : 0.4);
    const tx = left + (w * i) / 5;
    g.lineBetween(tx, y - h / 2 - 1, tx, y - h / 2 - (i === 4 ? 4 : 2.5));
  }
  // Glass highlight.
  g.lineStyle(1, 0xffffff, 0.22);
  g.lineBetween(left + 2, y - h / 2 + 1.6, left + w - 2, y - h / 2 + 1.6);
}

/**
 * The molten arm, from the caster's shoulder out to the fist. Overlapping crust bands with the
 * heat showing in the gaps — a straight tapered line reads as a tentacle, and this has to read
 * as something with joints in it.
 */
export function magmaArm(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x0: number, y0: number, x1: number, y1: number,
  width: number, t: number, seed: number, alpha: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  // The heat that shows between the plates.
  g.lineStyle(width * 1.25, tint(MAG.magma), alpha * 0.9);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(width * 0.5, tint(MAG.gold), alpha * (0.5 + 0.3 * Math.sin(t * 8 + seed)));
  g.lineBetween(x0, y0, x1, y1);

  // Bands. Each is a plate straddling the arm, sagging slightly under its own weight.
  const bands = Math.max(3, Math.round(len / 22));
  for (let i = 0; i < bands; i++) {
    const f = (i + 0.5) / bands;
    const bx = x0 + dx * f;
    const by = y0 + dy * f;
    // Taper toward the shoulder — the fist end is the heavy end.
    const bw = width * (0.62 + f * 0.55);
    const sag = Math.sin(t * 4 + i * 0.9 + seed) * 1.4;
    const half = len / bands * 0.44;
    const pts = [
      new Phaser.Geom.Point(bx - ux * half + nx * bw, by - uy * half + ny * bw + sag),
      new Phaser.Geom.Point(bx + ux * half + nx * bw * 0.86, by + uy * half + ny * bw * 0.86 + sag),
      new Phaser.Geom.Point(bx + ux * half - nx * bw * 0.86, by + uy * half - ny * bw * 0.86 + sag),
      new Phaser.Geom.Point(bx - ux * half - nx * bw, by - uy * half - ny * bw + sag),
    ];
    g.fillStyle(tint(i % 2 ? MAG.crustDeep : MAG.basalt), alpha);
    g.fillPoints(pts, true);
    // Lit top edge.
    g.lineStyle(1.2, tint(MAG.ember), alpha * 0.4);
    g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  }
}

/**
 * The fist itself, aimed along `ang`. Built as an actual hand — forearm stub, wrist, the mass
 * of the back of the hand, four knuckle bosses across the leading face and a thumb wedge down
 * one side — because the whole ability is read off whether this thing is moving sideways
 * across someone or straight into them, and a blob would make that unreadable.
 */
export function magmaFist(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, ang: number, scale: number, clench: number, t: number, seed: number,
  palm: number, plate: number, alpha = 1,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const nx = -s;
  const ny = c;
  const R = 20 * scale;

  // Heat bleeding off it.
  g.fillStyle(tint(palm), alpha * 0.2);
  g.fillCircle(x, y, R * 1.7);

  // Wrist / forearm stub behind the hand.
  const wx = x - c * R * 1.05;
  const wy = y - s * R * 1.05;
  g.fillStyle(tint(MAG.basalt), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(wx + nx * R * 0.9, wy + ny * R * 0.9),
    new Phaser.Geom.Point(x + nx * R * 0.86, y + ny * R * 0.86),
    new Phaser.Geom.Point(x - nx * R * 0.86, y - ny * R * 0.86),
    new Phaser.Geom.Point(wx - nx * R * 0.9, wy - ny * R * 0.9),
  ], true);

  // Molten core, visible in every gap the plating leaves.
  g.fillStyle(tint(palm), alpha);
  g.fillCircle(x, y, R * 0.98);

  // The back of the hand — one big plate, clenched a little tighter mid-swing.
  const back = R * (0.86 - clench * 0.08);
  g.fillStyle(tint(plate), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(x - c * back * 0.9 + nx * back, y - s * back * 0.9 + ny * back),
    new Phaser.Geom.Point(x + c * back * 0.5 + nx * back * 0.92, y + s * back * 0.5 + ny * back * 0.92),
    new Phaser.Geom.Point(x + c * back * 0.5 - nx * back * 0.92, y + s * back * 0.5 - ny * back * 0.92),
    new Phaser.Geom.Point(x - c * back * 0.9 - nx * back, y - s * back * 0.9 - ny * back),
  ], true);

  // Knuckles: four bosses across the leading face, the outer two set back a touch.
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) / 1.5;
    const depth = 0.62 + (1 - Math.abs(off)) * 0.2 + clench * 0.06;
    const kx = x + c * R * depth + nx * off * R * 0.62;
    const ky = y + s * R * depth + ny * off * R * 0.62;
    const kr = R * (0.3 - Math.abs(off) * 0.05);
    // Seam of heat between one knuckle and the next.
    g.fillStyle(tint(palm), alpha * 0.95);
    g.fillCircle(kx, ky, kr * 1.24);
    g.fillStyle(tint(plate), alpha);
    g.fillCircle(kx, ky, kr);
    g.fillStyle(tint(MAG.white), alpha * 0.34 * (0.5 + 0.5 * Math.sin(t * 6 + i + seed)));
    g.fillCircle(kx - c * kr * 0.3, ky - s * kr * 0.3, kr * 0.34);
  }

  // Thumb, folded across one side.
  const tsx = x + nx * R * 0.72 - c * R * 0.1;
  const tsy = y + ny * R * 0.72 - s * R * 0.1;
  g.fillStyle(tint(plate), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(tsx - c * R * 0.42, tsy - s * R * 0.42),
    new Phaser.Geom.Point(tsx + c * R * 0.5 + nx * R * 0.08, tsy + s * R * 0.5 + ny * R * 0.08),
    new Phaser.Geom.Point(tsx + c * R * 0.42 - nx * R * 0.3, tsy + s * R * 0.42 - ny * R * 0.3),
    new Phaser.Geom.Point(tsx - c * R * 0.42 - nx * R * 0.3, tsy - s * R * 0.42 - ny * R * 0.3),
  ], true);

  // Cooled scabs on the plating, fixed to the fist so they turn with it.
  for (let i = 0; i < 4; i++) {
    const a = ang + noise(seed, i) * TAU;
    const d = R * (0.2 + noise(seed, 20 + i) * 0.42);
    crustPlate(g, tint, x + Math.cos(a) * d, y + Math.sin(a) * d, R * 0.17, a, seed + i, MAG.crustDeep, alpha * 0.8);
  }
}

/**
 * A cone of fire, drawn as tongues rather than a wedge. Used for Dragon Breath — `hot` and
 * `cool` are passed in so the same shape serves the orange and the violet version.
 */
export function breathCone(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, ang: number, len: number, half: number,
  t: number, seed: number, hot: number, cool: number, alpha = 1,
): void {
  // The body of the cone, in three shrinking passes so the near end reads hotter.
  const passes: Array<[number, number, number]> = [
    [1, 1, cool],
    [0.78, 0.72, hot],
    [0.46, 0.4, MAG.white],
  ];
  for (const [lf, hf, color] of passes) {
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x, y)];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = ang - half * hf + (i / steps) * half * 2 * hf;
      const wob = 1 + Math.sin(t * 16 + i * 1.4 + seed) * 0.09;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * len * lf * wob, y + Math.sin(a) * len * lf * wob));
    }
    g.fillStyle(tint(color), alpha * (color === MAG.white ? 0.5 : 0.72));
    g.fillPoints(pts, true);
  }

  // Tongues licking past the leading edge.
  for (let i = 0; i < 9; i++) {
    const f = noise(seed, i);
    const a = ang - half + f * half * 2;
    const ph = (t * 2.2 + f) % 1;
    const d = len * (0.7 + ph * 0.45);
    const r = (5 + noise(seed, 30 + i) * 6) * (1 - ph * 0.6);
    g.fillStyle(tint(ph < 0.4 ? MAG.white : hot), alpha * (1 - ph) * 0.8);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, r);
  }
}

/**
 * Mag-Mortar's shell (Click+). A finned artillery round coming down nose-first, drawn along
 * `ang` — the whole point of the upgrade is that the incoming is legible as artillery rather
 * than as a blob of lava, so it gets a real silhouette: casing, driving band, three fins and a
 * hot nose.
 */
export function mortarShell(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, ang: number, alpha = 1,
): void {
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const px = -sin, py = cos;
  const at = (d: number, o: number) => new Phaser.Geom.Point(x + cos * d + px * o, y + sin * d + py * o);

  // Fins at the tail.
  g.fillStyle(tint(MAG.basalt), alpha);
  for (const o of [-1, 1]) {
    g.fillPoints([at(-9, o * 1.6), at(-15, o * 6), at(-9, o * 5.4)], true);
  }
  // Casing: a capsule from tail to nose, with a lit shoulder.
  g.fillStyle(tint(MAG.crustDeep), alpha);
  g.fillPoints([at(-10, -4), at(5, -4.4), at(11, 0), at(5, 4.4), at(-10, 4)], true);
  g.fillStyle(tint(MAG.ash), alpha * 0.7);
  g.fillPoints([at(-9, -3.6), at(4, -3.8), at(8, -1.4), at(-9, -1.6)], true);
  // Driving band.
  g.fillStyle(tint(MAG.gold), alpha * 0.9);
  g.fillPoints([at(-4, -4.2), at(-1.5, -4.3), at(-1.5, 4.3), at(-4, 4.2)], true);
  // The nose, glowing, and the heat trail behind it.
  const nose = at(11, 0);
  g.fillStyle(tint(MAG.lava), alpha * 0.9);
  g.fillCircle(nose.x, nose.y, 3.4);
  g.fillStyle(tint(MAG.white), alpha);
  g.fillCircle(nose.x, nose.y, 1.7);
  for (let i = 1; i <= 4; i++) {
    const p = at(-14 - i * 5, 0);
    g.fillStyle(tint(i < 2 ? MAG.lava : MAG.smoke), alpha * (0.5 - i * 0.1));
    g.fillCircle(p.x, p.y, 4.5 - i * 0.7);
  }
}

/**
 * Full Draconic's scale armour (Q+): overlapping plates clamped over the dragon, turning
 * slowly. Distinct from the hatched glow underneath it, because four seconds of immunity has
 * to be readable from across the arena.
 */
export function scaleArmor(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, t: number, alpha = 1,
): void {
  const r = 30;
  g.fillStyle(tint(MAG.membrane), alpha * 0.2);
  g.fillCircle(x, y, r + 4);
  // Two rings of plates, counter-turning, each plate a rounded wedge pointing outward.
  for (let ring = 0; ring < 2; ring++) {
    const n = 9 + ring * 3;
    const rr = r * (0.68 + ring * 0.32);
    const spin = t * (ring === 0 ? 0.9 : -0.6);
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * Math.PI * 2;
      const cx = x + Math.cos(a) * rr;
      const cy = y + Math.sin(a) * rr * 0.86;
      const w = 7 - ring * 1.4;
      g.fillStyle(tint(ring === 0 ? MAG.scaleDeep : MAG.scale), alpha * 0.9);
      g.fillPoints([
        new Phaser.Geom.Point(cx + Math.cos(a) * w, cy + Math.sin(a) * w),
        new Phaser.Geom.Point(cx + Math.cos(a + 2.2) * w * 0.8, cy + Math.sin(a + 2.2) * w * 0.8),
        new Phaser.Geom.Point(cx + Math.cos(a - 2.2) * w * 0.8, cy + Math.sin(a - 2.2) * w * 0.8),
      ], true);
      g.fillStyle(tint(MAG.scaleLit), alpha * 0.5);
      g.fillCircle(cx + Math.cos(a) * w * 0.35, cy + Math.sin(a) * w * 0.35, 1.4);
    }
  }
  // A bright rim that pulses, so the four seconds are visibly counting.
  g.lineStyle(2.2, tint(MAG.scaleLit), alpha * (0.5 + 0.35 * Math.sin(t * 6)));
  g.strokeCircle(x, y, r + 4);
}

/**
 * Magma Mastery — the chainsaw, drawn along `ang` with its motor at `x,y` and the bar running
 * out in front of it. `heat` (0–1) is how close it is to detonating and drives everything:
 * the bar's colour from gold through white to a furious red, how far the teeth throw sparks,
 * and how hard the whole tool shakes in the hand. `rev` (0–1) is the charge, so a saw being
 * wound up is visibly a shorter, tighter version of the same object.
 */
export function magmaSaw(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, ang: number, spin: number, heat: number, rev: number,
  t: number, seed: number, alpha = 1,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const nx = -s;
  const ny = c;
  // Length is bought by the charge; the shake is bought by the heat.
  const len = 34 + rev * 22;
  const halfW = 7.5;
  const shake = heat * heat * 2.4;
  const ox = x + Math.sin(t * 41 + seed) * shake;
  const oy = y + Math.cos(t * 37 + seed) * shake;
  const at = (d: number, o: number): Phaser.Geom.Point =>
    new Phaser.Geom.Point(ox + c * d + nx * o, oy + s * d + ny * o);

  // The colour of the cut: gold when cold, white as it climbs, red-hot at the end.
  const blade = heat < 0.45 ? MAG.gold : heat < 0.78 ? MAG.white : MAG.magma;
  const glow = heat < 0.45 ? MAG.lava : heat < 0.78 ? MAG.gold : MAG.lava;

  // Heat haze around the whole tool.
  g.fillStyle(tint(glow), alpha * (0.1 + heat * 0.22));
  g.fillCircle(ox + c * len * 0.5, oy + s * len * 0.5, len * 0.72);

  // Motor housing: a crusted block behind the bar, with a vent slot showing the fire inside.
  g.fillStyle(tint(MAG.basalt), alpha);
  g.fillPoints([at(-16, -10), at(2, -9), at(2, 9), at(-16, 10)], true);
  g.fillStyle(tint(MAG.crustDeep), alpha);
  g.fillPoints([at(-14, -7.5), at(0, -7), at(0, 7), at(-14, 7.5)], true);
  for (let i = 0; i < 3; i++) {
    const d = -12 + i * 4.4;
    g.lineStyle(2, tint(glow), alpha * (0.5 + 0.5 * Math.sin(t * 24 + i + seed)));
    const a1 = at(d, -5);
    const a2 = at(d, 5);
    g.lineBetween(a1.x, a1.y, a2.x, a2.y);
  }
  // Grip loop over the top of the motor, so it reads as a tool somebody is holding.
  g.lineStyle(2.6, tint(MAG.ash), alpha * 0.9);
  const g1 = at(-15, -10.5);
  const g2 = at(-6, -15);
  const g3 = at(1, -9.5);
  g.beginPath();
  g.moveTo(g1.x, g1.y);
  g.lineTo(g2.x, g2.y);
  g.lineTo(g3.x, g3.y);
  g.strokePath();

  // The bar: a rounded blade with a molten core running down the middle of it.
  const bar: Phaser.Geom.Point[] = [
    at(0, -halfW), at(len - 6, -halfW * 0.7), at(len, 0),
    at(len - 6, halfW * 0.7), at(0, halfW),
  ];
  g.fillStyle(tint(MAG.basalt), alpha);
  g.fillPoints(bar, true);
  g.fillStyle(tint(glow), alpha * (0.55 + heat * 0.45));
  g.fillPoints([at(2, -halfW * 0.4), at(len - 7, -halfW * 0.3), at(len - 4, 0),
    at(len - 7, halfW * 0.3), at(2, halfW * 0.4)], true);

  // Teeth: chain links marching round the bar, so the thing is visibly *running*.
  const links = 16;
  for (let i = 0; i < links; i++) {
    // One parameter walking the perimeter — down one edge, round the nose, back the other.
    const p = ((i / links) + spin) % 1;
    let d: number;
    let o: number;
    if (p < 0.45) { d = (p / 0.45) * len; o = -halfW - 1.4; }
    else if (p < 0.55) { d = len + Math.sin((p - 0.45) / 0.1 * Math.PI) * 2.4; o = ((p - 0.5) / 0.05) * halfW; }
    else { d = (1 - (p - 0.55) / 0.45) * len; o = halfW + 1.4; }
    const pt = at(d, o);
    g.fillStyle(tint(i % 2 ? blade : MAG.crust), alpha);
    g.fillCircle(pt.x, pt.y, 2.1);
    // Every fourth link carries a cutter, angled the way the chain is travelling.
    if (i % 4 === 0) {
      const lead = at(d + (o < 0 ? 3.4 : -3.4), o * 1.5);
      g.fillStyle(tint(blade), alpha * 0.95);
      g.fillTriangle(pt.x, pt.y, lead.x, lead.y, pt.x + nx * Math.sign(o) * 1.6, pt.y + ny * Math.sign(o) * 1.6);
    }
  }

  // Sparks thrown off the nose, more and further the hotter it gets.
  const sparks = 3 + Math.round(heat * 6);
  for (let i = 0; i < sparks; i++) {
    const ph = (t * (3 + heat * 4) + noise(seed, i)) % 1;
    const a = ang + (noise(seed, 40 + i) - 0.5) * 2.4;
    const d = len + ph * (10 + heat * 26);
    g.fillStyle(tint(ph < 0.35 ? MAG.white : blade), alpha * (1 - ph) * 0.9);
    g.fillCircle(ox + Math.cos(a) * d, oy + Math.sin(a) * d, (1 + heat * 1.6) * (1 - ph * 0.5));
  }

  // The last second before it goes: a warning ring that closes on the motor.
  if (heat > 0.86) {
    const warn = (heat - 0.86) / 0.14;
    g.lineStyle(2 + warn * 2, tint(MAG.magma), alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 26))));
    g.strokeCircle(ox, oy, 34 - warn * 16);
  }
}

/**
 * Magma Mastery — Obsidian Coat. Glassy black plates locked over the wearer, catching the light
 * along their broken edges with fire showing in the seams between them. `p` (0–1) is how much
 * overfill bought it, and it decides how many plates there are and how much of the body they
 * cover, so a thin coat and a full one are the same object at two different thicknesses.
 */
export function obsidianCoat(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, p: number, t: number, alpha = 1,
): void {
  const r = 26;
  // The fire trapped underneath, showing through everywhere the glass has not closed over.
  g.fillStyle(tint(MAG.magma), alpha * (0.1 + p * 0.16));
  g.fillCircle(x, y, r + 5);

  const plates = 7 + Math.round(p * 7);
  for (let i = 0; i < plates; i++) {
    const a = (i / plates) * TAU + t * 0.35;
    const rr = r * (0.72 + noise(i * 13 + 7, 1) * 0.34);
    const cx = x + Math.cos(a) * rr;
    const cy = y + Math.sin(a) * rr * 0.88;
    const size = (4.4 + p * 3.6) * (0.7 + noise(i * 5 + 3, 2) * 0.6);
    // Each plate is a shard of volcanic glass — angular, never round.
    const pts: Phaser.Geom.Point[] = [];
    for (let k = 0; k < 4; k++) {
      const ka = a + 0.9 + (k / 4) * TAU;
      const kr = size * (0.7 + noise(i * 17 + k, 3) * 0.7);
      pts.push(new Phaser.Geom.Point(cx + Math.cos(ka) * kr, cy + Math.sin(ka) * kr));
    }
    g.fillStyle(tint(MAG.scorch), alpha * 0.95);
    g.fillPoints(pts, true);
    // The conchoidal sheen: one lit edge per shard, which is what makes it read as glass.
    g.lineStyle(1.4, tint(MAG.ash), alpha * (0.35 + p * 0.35));
    g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    g.lineStyle(1, tint(MAG.gold), alpha * 0.5 * (0.4 + 0.6 * Math.sin(t * 4 + i)));
    g.lineBetween(pts[2].x, pts[2].y, pts[3].x, pts[3].y);
  }

  // Seams of heat running between the plates — the coat is still cooling.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - t * 0.35;
    g.lineStyle(1.6, tint(MAG.magma), alpha * (0.2 + p * 0.3) * (0.5 + 0.5 * Math.sin(t * 5 + i * 2)));
    g.lineBetween(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.28,
      x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3) * 0.9);
  }

  // A hard black rim, so a coated fighter has a silhouette rather than a halo.
  g.lineStyle(2.2, tint(MAG.basalt), alpha * 0.9);
  g.strokeEllipse(x, y, (r + 5) * 2, (r + 4) * 1.9);
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class MagmaFx extends FxBase {
  /** Sparks lifting off something hot. */
  ember(x: number, y: number, count: number, spread: number, ms = 620, color = MAG.ember, depth = 9): void {
    const seeds = Array.from({ length: count }, () => ({
      a: Math.random() * TAU,
      d: spread * (0.3 + Math.random() * 0.7),
      r: 1 + Math.random() * 2.4,
      w: 0.6 + Math.random() * 2.2,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        // Rises and wanders — an ember that travels in a straight line reads as a bullet.
        const px = x + Math.cos(p.a) * p.d * e + Math.sin(t * 9 * p.w) * 4;
        const py = y + Math.sin(p.a) * p.d * e - e * (16 + p.d * 0.3);
        g.fillStyle(this.tint(t < 0.4 ? MAG.white : color), (1 - t) * 0.85);
        g.fillCircle(px, py, p.r * (1 - t * 0.6));
      }
    });
  }

  /** Thrown lava — droplets that arc out and land. */
  splat(x: number, y: number, r: number, color = MAG.lava, depth = 8): void {
    const drops = Array.from({ length: 9 }, () => ({
      a: Math.random() * TAU, d: r * (0.4 + Math.random() * 0.9),
      lift: 8 + Math.random() * 14, s: Math.random() * 999,
    }));
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      for (const p of drops) {
        const px = x + Math.cos(p.a) * p.d * e;
        // Up then down — one parabola, so they visibly land rather than fade in the air.
        const py = y + Math.sin(p.a) * p.d * e * 0.65 - Math.sin(t * Math.PI) * p.lift;
        g.fillStyle(this.tint(color), 1 - t * 0.75);
        g.fillCircle(px, py, 3.4 * (1 - t * 0.5));
      }
    });
  }

  /** An expanding ring of broken crust — the ground giving way. */
  shock(x: number, y: number, r0: number, r1: number, color = MAG.magma, ms = 480, depth = 8): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const rr = r0 + (r1 - r0) * easeOut(t);
      const a = 1 - t;
      g.lineStyle(5 * (1 - t) + 1, this.tint(color), a * 0.7);
      g.strokeEllipse(x, y, rr * 2, rr * 1.4);
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * TAU + noise(seed, i);
        const d = rr * (0.9 + noise(seed, 20 + i) * 0.22);
        crustPlate(g, this.tint, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.7,
          4 * (1 - t) + 1.5, ang, seed + i, MAG.basalt, a * 0.85);
      }
    });
  }

  /** Cracks tearing outward from a point of impact. */
  crack(x: number, y: number, r: number, color = MAG.magma, depth = 3): void {
    const seed = Math.random() * 999;
    const arms = 6;
    this.anim(depth, 900, (g, t) => {
      const grow = Math.min(1, t * 3);
      const a = 1 - Math.max(0, (t - 0.5) / 0.5);
      for (let i = 0; i < arms; i++) {
        const ang = (i / arms) * TAU + noise(seed, i) * 0.8;
        let px = x;
        let py = y;
        for (let s = 1; s <= 4; s++) {
          const f = (s / 4) * grow;
          const wob = (noise(seed, i * 7 + s) - 0.5) * 0.8;
          const nx = x + Math.cos(ang + wob) * r * f;
          const ny = y + Math.sin(ang + wob) * r * f * 0.7;
          g.lineStyle(3.4 - s * 0.6, this.tint(color), a * 0.8);
          g.lineBetween(px, py, nx, ny);
          px = nx;
          py = ny;
        }
      }
    });
  }

  /** A blast: flash, ring, thrown rock, cracked ground. */
  erupt(x: number, y: number, radius: number, color = MAG.magma, depth = 9): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, radius * 0.45, MAG.white, color, depth);
    this.anim(depth, 560, (g, t) => {
      const e = easeOut(t);
      const a = 1 - t;
      g.fillStyle(this.tint(color), a * 0.4);
      g.fillCircle(x, y, radius * (0.3 + e * 0.85));
      g.fillStyle(this.tint(MAG.gold), a * 0.5);
      g.fillCircle(x, y, radius * (0.16 + e * 0.5));
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * TAU + noise(seed, i);
        const d = radius * (0.4 + e * 0.9);
        lavaRock(g, this.tint, x + Math.cos(ang) * d, y + Math.sin(ang) * d - e * 12,
          5 * (1 - t * 0.5), ang + t * 5, seed + i, a);
      }
    });
    this.shock(x, y, radius * 0.3, radius * 1.05, color, 520, depth - 1);
    this.crack(x, y, radius * 0.9, color);
    this.ember(x, y, 12, radius * 0.7, 780, MAG.ember, depth);
  }

  /**
   * Volcanic glass setting on somebody: black shards flying in from all round and locking
   * onto the wearer, rather than the usual burst flying away from a point.
   */
  glass(x: number, y: number, r: number, count = 14, ms = 620, depth = 10): void {
    const seed = Math.random() * 999;
    const shards = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU + noise(seed, i) * 0.6,
      d: r * (1.5 + noise(seed, 20 + i) * 1.1),
      s: 3 + noise(seed, 40 + i) * 4,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of shards) {
        // Inward, and settling — a coat arriving, not an explosion leaving.
        const d = p.d * (1 - e);
        const px = x + Math.cos(p.a) * d;
        const py = y + Math.sin(p.a) * d * 0.9;
        crustPlate(g, this.tint, px, py, p.s * (0.6 + e * 0.5), p.a + t * 3, seed + p.s,
          MAG.scorch, 0.95);
        g.lineStyle(1.2, this.tint(MAG.gold), (1 - t) * 0.6);
        g.strokeCircle(px, py, p.s * 0.7);
      }
    });
  }

  /** Dark puffs — a vessel venting, or something cooling. */
  smoke(x: number, y: number, count: number, ms = 900, depth = 8): void {
    const puffs = Array.from({ length: count }, () => ({
      a: -Math.PI / 2 + (Math.random() - 0.5) * 1.4,
      d: 10 + Math.random() * 26, r: 4 + Math.random() * 6,
    }));
    this.anim(depth, ms, (g, t) => {
      for (const p of puffs) {
        const e = easeOut(t);
        g.fillStyle(this.tint(MAG.smoke), (1 - t) * 0.5);
        g.fillCircle(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e, p.r * (0.6 + e * 1.2));
      }
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const MAGMA_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: MAG.magma, alpha: 0.26 },
    { r: 8, color: MAG.lava, alpha: 0.95 },
    { r: 3, color: MAG.white, alpha: 0.9, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: MAG.gold,
  eyePupil: MAG.basalt,
  squash: { div: 15, x: 0.42, y: 0.22 },
};

/**
 * The magma-walker: a crusted thing that leaves scorch marks where it stands and sheds embers
 * when it runs. Two forms — the default basalt one, and the purple dragon Dragon Kin hatches
 * into, which replaces the torso outright, grows wings and horns, and turns every hand and eye
 * violet. Nothing subtle: the enhanced window is twenty seconds long and has to be obvious to
 * whoever is on the other end of it.
 */
export class MagmaAvatar extends BaseAvatar {
  private dragon = false;
  /** 0–1 — eases the transformation so the wings unfold rather than appearing. */
  private morph = 0;
  /** 0–1 — how hard the character is currently venting (casting, breathing). */
  private vent = 0;
  private ventTarget = 0;
  private scorchSeed = Math.random() * 999;
  private wing = 0;

  constructor(scene: Phaser.Scene, tint: MagmaColorFn, depth = 6) {
    super(scene, tint, depth, MAGMA_AVATAR);
  }

  /** Enter or leave the hatched dragon form. */
  setDragon(on: boolean): void {
    if (on === this.dragon) return;
    this.dragon = on;
    this.forEachHandLayer(0, (glow) => glow.setFillStyle(this.tint(on ? MAG.scale : MAG.magma), on ? 0.3 : 0.26));
    this.forEachHandLayer(1, (core) => core.setFillStyle(this.tint(on ? MAG.scaleLit : MAG.lava), 0.95));
    this.setEyeWhite(on ? MAG.scaleLit : MAG.gold);
  }

  /** True while something molten is being pushed out — hands glow, plumes lift off the crown. */
  setVenting(on: boolean): void { this.ventTarget = on ? 1 : 0; }

  update(delta: number, x: number, y: number, alpha: number): void {
    const dt = delta / 1000;
    this.vent += (this.ventTarget - this.vent) * Math.min(1, delta / 150);
    this.morph += ((this.dragon ? 1 : 0) - this.morph) * Math.min(1, delta / 260);
    this.wing += dt * (this.intensity > 1 ? 7 : 4.2);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 16 : 13);
      glow.setAlpha(on ? 0.38 : 0.26);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new MagmaFx(this.scene, this.tint).ember(x, y, 1, 5, 520, this.dragon ? MAG.scaleLit : MAG.ember);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const hot = this.morph > 0.5 ? MAG.scale : MAG.magma;
    // Scorched ground, brighter while venting.
    g.fillStyle(this.tint(MAG.scorch), a * 0.4);
    g.fillEllipse(x, y + 13, 48, 17);
    g.fillStyle(this.tint(hot), a * (0.1 + this.vent * 0.2));
    g.fillEllipse(x, y + 13, 40 + this.vent * 16, 14 + this.vent * 6);
    // Fissures crawling out from underfoot — the ground can't take the heat.
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + this.t * 0.1;
      const d = 14 + noise(this.scorchSeed, i) * 12;
      const sx = x + Math.cos(ang) * d;
      const sy = y + 13 + Math.sin(ang) * d * 0.4;
      g.lineStyle(1.8, this.tint(hot), a * (0.16 + this.vent * 0.34));
      g.lineBetween(x, y + 13, sx, sy);
    }
  }

  /**
   * The dragon torso. Painted over the fighter sprite but under the eyes, so the rig's own
   * face still sits on top of the snout drawn here — which is exactly the read wanted: a
   * dragon's head with the character's eyes in it.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.morph < 0.02) return;
    const m = this.morph;
    const A = alpha * m;

    // Tail, laid out behind whichever way the character is facing.
    const back = this.facing + Math.PI;
    let tx = x + Math.cos(back) * 12;
    let ty = y + Math.sin(back) * 12 + 6;
    for (let i = 0; i < 5; i++) {
      const f = i / 5;
      const sway = Math.sin(this.t * 3.4 - i * 0.7) * (3 + i * 2.2);
      const nx = x + Math.cos(back) * (12 + i * 9) + Math.cos(back + Math.PI / 2) * sway;
      const ny = y + Math.sin(back) * (12 + i * 9) + Math.sin(back + Math.PI / 2) * sway + 6;
      g.lineStyle((9 - f * 7) * m, this.tint(MAG.scaleDeep), A);
      g.lineBetween(tx, ty, nx, ny);
      tx = nx;
      ty = ny;
    }
    // Tail tip — a spade.
    g.fillStyle(this.tint(MAG.membrane), A);
    g.fillTriangle(tx, ty - 5 * m, tx + Math.cos(back) * 11 * m, ty + Math.sin(back) * 11 * m, tx, ty + 5 * m);

    // Torso: a scaled barrel with a paler belly.
    g.fillStyle(this.tint(MAG.scaleDeep), A);
    g.fillEllipse(x, y + 1, 34 * m, 36 * m);
    g.fillStyle(this.tint(MAG.scale), A);
    g.fillEllipse(x, y + 2, 29 * m, 31 * m);
    g.fillStyle(this.tint(MAG.membrane), A * 0.85);
    g.fillEllipse(x + Math.cos(this.facing) * 4, y + 7, 17 * m, 15 * m);

    // Scale rows. Staggered so it never looks like a grid.
    for (let row = 0; row < 4; row++) {
      const ry = y - 8 + row * 7;
      const n = 4 - (row % 2);
      const wide = 11 * m * (1 - Math.abs(row - 1.4) * 0.12);
      for (let i = 0; i < n; i++) {
        const px = x + ((i - (n - 1) / 2) / Math.max(1, (n - 1) / 2)) * wide;
        g.fillStyle(this.tint(row % 2 ? MAG.scaleLit : MAG.scale), A * 0.55);
        g.fillEllipse(px, ry, 7 * m, 4.4 * m);
      }
    }

    // Snout, along the aim. Sized off the rig's 14px eye spacing so the face stays a face.
    const c = Math.cos(this.facing);
    const s = Math.sin(this.facing);
    const jaw = 0.5 + 0.5 * Math.sin(this.t * 5) * this.vent;
    const snout = 15 * m;
    g.fillStyle(this.tint(MAG.scale), A);
    g.fillPoints([
      new Phaser.Geom.Point(x - s * 8 * m, y - 3 + c * 8 * m),
      new Phaser.Geom.Point(x + c * snout - s * 3.6 * m, y - 2 + s * snout + c * 3.6 * m),
      new Phaser.Geom.Point(x + c * snout + s * 3.6 * m, y - 2 + s * snout - c * 3.6 * m),
      new Phaser.Geom.Point(x + s * 8 * m, y - 3 - c * 8 * m),
    ], true);
    // Lower jaw, hinging open while it breathes.
    g.fillStyle(this.tint(MAG.scaleDeep), A);
    g.fillPoints([
      new Phaser.Geom.Point(x - s * 6 * m, y + 1 + c * 6 * m),
      new Phaser.Geom.Point(x + c * snout * 0.9 - s * 2.6 * m, y + 1 + jaw * 4 * m + s * snout * 0.9),
      new Phaser.Geom.Point(x + c * snout * 0.9 + s * 2.6 * m, y + 1 + jaw * 4 * m + s * snout * 0.9),
      new Phaser.Geom.Point(x + s * 6 * m, y + 1 - c * 6 * m),
    ], true);
    // Nostril, and the light of whatever is in its throat.
    g.fillStyle(this.tint(MAG.scaleDeep), A);
    g.fillCircle(x + c * snout * 0.86 - s * 2 * m, y - 2 + s * snout * 0.86 + c * 2 * m, 1.4 * m);
    g.fillStyle(this.tint(MAG.breath), A * (0.3 + this.vent * 0.7));
    g.fillCircle(x + c * snout * 0.5, y + s * snout * 0.5, 3.4 * m * (0.6 + this.vent * 0.6));
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.morph;

    if (m > 0.02) {
      // Wings, rooted at the shoulders and swept up and back so they never cross the face.
      const beat = Math.sin(this.wing) * 0.34 + 0.5;
      for (let side = -1; side <= 1; side += 2) {
        const rootX = x + side * 12;
        const rootY = y - 6;
        const spread = (34 + beat * 16) * m;
        const rise = (30 + beat * 14) * m;
        const tipX = rootX + side * spread;
        const tipY = rootY - rise;
        // Membrane: three panels hung off the leading edge.
        for (let f = 0; f < 3; f++) {
          const k = (f + 1) / 3;
          g.fillStyle(this.tint(MAG.membrane), alpha * m * (0.5 - f * 0.08));
          g.fillTriangle(
            rootX, rootY,
            rootX + side * spread * k, rootY - rise * k,
            rootX + side * spread * k * 0.72, rootY - rise * k * 0.24 + 12 * k,
          );
        }
        // Leading edge and finger struts.
        g.lineStyle(2.6 * m, this.tint(MAG.scaleDeep), alpha * m);
        g.lineBetween(rootX, rootY, tipX, tipY);
        for (let f = 1; f <= 3; f++) {
          const k = f / 3;
          g.lineStyle(1.4 * m, this.tint(MAG.scale), alpha * m * 0.8);
          g.lineBetween(rootX + side * spread * k, rootY - rise * k,
            rootX + side * spread * k * 0.72, rootY - rise * k * 0.24 + 12 * k);
        }
      }

      // Horns, swept back off the crown.
      for (let side = -1; side <= 1; side += 2) {
        let hx = x + side * 6;
        let hy = y - 15;
        for (let i = 0; i < 3; i++) {
          const nx2 = hx + side * (3 + i * 2.2) * m;
          const ny2 = hy - (5 - i) * m;
          g.lineStyle((4.5 - i * 1.2) * m, this.tint(i < 2 ? MAG.scaleDeep : MAG.scaleLit), alpha * m);
          g.lineBetween(hx, hy, nx2, ny2);
          hx = nx2;
          hy = ny2;
        }
      }
    }

    // Crusted pauldrons riding on the hands — the same plating as everything else the element
    // puts on the field, so the character is visibly made of its own material.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i];
      const hy = this.armY[i];
      const ang = Math.atan2(hy - y, hx - x);
      crustPlate(g, this.tint, hx - Math.cos(ang) * 4, hy - Math.sin(ang) * 4,
        7 + this.vent * 2, ang + this.t * 0.4, i * 37 + 11,
        m > 0.5 ? MAG.scaleDeep : MAG.crustDeep, alpha * 0.9);
    }

    // Vent plume off the crown.
    if (this.vent > 0.08) {
      for (let i = 0; i < 4; i++) {
        const ph = (this.t * 2 + i * 0.25) % 1;
        const px = x + Math.sin(ph * 5 + i) * (5 + i * 2.5);
        const py = y - 20 - ph * 22;
        g.fillStyle(this.tint(m > 0.5 ? MAG.scaleLit : MAG.ember), alpha * this.vent * 0.5 * (1 - ph));
        g.fillCircle(px, py, 2.2 * (1 - ph * 0.4));
      }
    }
  }
}
