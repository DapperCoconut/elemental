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
 * One palette, orange-through-white, with a second, smaller one for the pirate's kit: the dark
 * felt and crimson of the coat and sash, and the cursed red of Molten Mutiny's pendant, which
 * is the only red in the file and has to read as *not lava* from across the arena.
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

  /**
   * The pirate's kit. Magma walks as a crusted buccaneer in a tricorn and sash, and sails a
   * ship made of the same rock — these are for the rig, the ship and the spirits, never for
   * a lava effect.
   */
  coat: 0x241316,
  coatLit: 0x3b1f22,
  sash: 0xb8261f,
  bone: 0xe6dac4,

  /** Molten Mutiny's pendant. A cursed, bloody red that is deliberately not a lava colour. */
  pendant: 0xc4101c,
  pendantLit: 0xff3b4a,
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
 * A cone of fire, drawn as tongues rather than a wedge. Blunder-Boil's blast — `hot` and
 * `cool` are passed in so the same shape serves a plain cone and a pressurised one.
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
 * The flaming pirate ship Molten Mutiny awakens. Drawn in two passes so the kit can put the
 * hull *under* the fighters (the captain stands on the deck) and the masts, sails and flag
 * *over* them: `layer` picks which. Everything is laid out in hull coordinates — `u` forward
 * along `heading`, `v` to starboard — and the ship is cooled rock like everything else the
 * element owns: basalt planks with the melt in the seams, a lava wake, and sails that are
 * nothing but fire hung off a yard. `hp` (0–1) is how much of the hull is left; as it falls
 * the seams open and the glow comes through harder.
 */
export function pirateShip(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, heading: number, t: number, hp: number, seed: number,
  layer: 'hull' | 'rig', alpha = 1,
): void {
  const c = Math.cos(heading), s = Math.sin(heading);
  const at = (u: number, v: number) => new Phaser.Geom.Point(x + c * u - s * v, y + s * u + c * v);
  const damage = 1 - Phaser.Math.Clamp(hp, 0, 1);

  if (layer === 'hull') {
    // Lava wake, trailing off the stern — the ship is afloat on what it is made of.
    for (let i = 0; i < 5; i++) {
      const p = at(-50 - i * 11, Math.sin(t * 3 + i) * (3 + i));
      g.fillStyle(tint(i < 2 ? MAG.lava : MAG.magma), alpha * (0.34 - i * 0.06));
      g.fillEllipse(p.x, p.y, 20 - i * 2.4, 10 - i);
    }
    // Shadow under the keel.
    g.fillStyle(tint(MAG.scorch), alpha * 0.45);
    const sh = at(-2, 4);
    g.fillEllipse(sh.x, sh.y, 96, 40);

    // Hull outline: a long shallow boat, pointed at the bow, square at the stern.
    const hull = [
      at(-46, -12), at(-47, 0), at(-46, 12), at(-24, 17), at(18, 15), at(40, 8), at(50, 0),
      at(40, -8), at(18, -15), at(-24, -17),
    ];
    g.fillStyle(tint(MAG.basalt), alpha);
    g.fillPoints(hull, true);
    // Deck, set in a little from the gunwale.
    const deck = hull.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.86, y + (p.y - y) * 0.86));
    g.fillStyle(tint(MAG.crustDeep), alpha);
    g.fillPoints(deck, true);
    g.fillStyle(tint(MAG.crust), alpha * 0.55);
    g.fillPoints(deck.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.7, y + (p.y - y) * 0.7)), true);

    // Planking: seams across the deck, lit from below. More of them glow as the hull fails.
    for (let i = 0; i < 9; i++) {
      const u = -36 + i * 9;
      const half = 11 * (1 - Math.abs(u + 2) / 60);
      const open = noise(seed, i) < 0.35 + damage * 0.6;
      const a = at(u, -half), b = at(u, half);
      g.lineStyle(1.1, tint(open ? MAG.magma : MAG.smoke), alpha * (open ? 0.55 + 0.3 * Math.sin(t * 4 + i) : 0.6));
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // The keel line, molten the whole way — where the ship meets the lava it floats on.
    g.lineStyle(2, tint(MAG.magma), alpha * (0.5 + damage * 0.4));
    g.strokePoints(hull, true);

    // Gun ports: three a side, brass-ringed, bores dark until the broadside lights them.
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const p = at(-22 + i * 18, side * 13.5);
        g.fillStyle(tint(MAG.basalt), alpha);
        g.fillCircle(p.x, p.y, 3.4);
        g.lineStyle(1.3, tint(MAG.gold), alpha * 0.95);
        g.strokeCircle(p.x, p.y, 3.4);
        g.fillStyle(tint(MAG.ember), alpha * (0.3 + 0.3 * Math.sin(t * 5 + i + side)));
        g.fillCircle(p.x, p.y, 1.4);
      }
    }
    // Stern castle and the bowsprit.
    g.fillStyle(tint(MAG.coat), alpha);
    g.fillPoints([at(-44, -9), at(-30, -11), at(-30, 11), at(-44, 9)], true);
    g.lineStyle(1, tint(MAG.gold), alpha * 0.7);
    g.lineBetween(at(-44, -9).x, at(-44, -9).y, at(-30, -11).x, at(-30, -11).y);
    g.lineBetween(at(-44, 9).x, at(-44, 9).y, at(-30, 11).x, at(-30, 11).y);
    g.lineStyle(2.4, tint(MAG.crustDeep), alpha);
    const b0 = at(46, 0), b1 = at(66, -3);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    g.fillStyle(tint(MAG.lava), alpha * 0.9);
    g.fillCircle(b1.x, b1.y, 2.2);
    return;
  }

  // ── Rigging: masts fore and aft, clear of the deck's centre where the captain stands ──
  const masts: Array<[number, number]> = [[-26, 30], [22, 36]];
  for (let m = 0; m < masts.length; m++) {
    const [u, h] = masts[m];
    const foot = at(u, 0);
    const top = { x: foot.x, y: foot.y - h };
    // Yard, across the top third.
    const yardY = foot.y - h * 0.78;
    const yardW = 20 + m * 4;
    g.lineStyle(2.6, tint(MAG.crustDeep), alpha);
    g.lineBetween(foot.x, foot.y, top.x, top.y);
    g.lineStyle(1.8, tint(MAG.crustDeep), alpha);
    g.lineBetween(foot.x - yardW, yardY, foot.x + yardW, yardY);
    // The sail: a sheet of flame hung from the yard, torn at the foot, lit from inside.
    const hem = yardY + h * 0.55;
    const sail: Phaser.Geom.Point[] = [new Phaser.Geom.Point(foot.x - yardW + 2, yardY + 1)];
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const sx = foot.x - yardW + 2 + f * (yardW * 2 - 4);
      const tear = Math.sin(t * 6 + i * 1.7 + seed) * 3 + noise(seed, 20 + i + m * 7) * 6;
      sail.push(new Phaser.Geom.Point(sx, hem - tear));
    }
    sail.push(new Phaser.Geom.Point(foot.x + yardW - 2, yardY + 1));
    g.fillStyle(tint(MAG.coat), alpha * 0.92);
    g.fillPoints(sail, true);
    g.fillStyle(tint(MAG.magma), alpha * 0.5);
    g.fillPoints(sail.map((p) => new Phaser.Geom.Point(foot.x + (p.x - foot.x) * 0.72, yardY + (p.y - yardY) * 0.85)), true);
    g.fillStyle(tint(MAG.lava), alpha * 0.5);
    g.fillPoints(sail.map((p) => new Phaser.Geom.Point(foot.x + (p.x - foot.x) * 0.42, yardY + (p.y - yardY) * 0.7)), true);
    // Tongues licking up off the sail.
    for (let i = 0; i < 6; i++) {
      const f = noise(seed, 40 + i + m * 9);
      const ph = (t * 1.8 + f) % 1;
      const fx0 = foot.x - yardW + 4 + f * (yardW * 2 - 8);
      const fy0 = hem - 4 - ph * 22;
      g.fillStyle(tint(ph < 0.35 ? MAG.white : ph < 0.7 ? MAG.gold : MAG.magma), alpha * (1 - ph) * 0.75);
      g.fillCircle(fx0 + Math.sin(ph * 9 + i) * 3, fy0, (4.5 - ph * 3) * (0.7 + f * 0.5));
    }
    // Mast truck.
    g.fillStyle(tint(MAG.gold), alpha);
    g.fillCircle(top.x, top.y, 1.8);
  }

  // The colours, off the main mast: a black flag with a skull on it, streaming aft.
  const main = at(22, 0);
  const fx0 = main.x, fy0 = main.y - 36;
  const stream = -c;
  const wave = Math.sin(t * 7) * 2;
  g.fillStyle(tint(MAG.basalt), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(fx0, fy0),
    new Phaser.Geom.Point(fx0 + stream * 18, fy0 + 1 + wave),
    new Phaser.Geom.Point(fx0 + stream * 18, fy0 + 9 + wave),
    new Phaser.Geom.Point(fx0, fy0 + 9),
  ], true);
  g.lineStyle(1, tint(MAG.magma), alpha * 0.6);
  g.strokePoints([
    new Phaser.Geom.Point(fx0, fy0),
    new Phaser.Geom.Point(fx0 + stream * 18, fy0 + 1 + wave),
    new Phaser.Geom.Point(fx0 + stream * 18, fy0 + 9 + wave),
    new Phaser.Geom.Point(fx0, fy0 + 9),
  ], true);
  const skx = fx0 + stream * 9, sky = fy0 + 4.6 + wave * 0.5;
  g.fillStyle(tint(MAG.bone), alpha);
  g.fillCircle(skx, sky, 2.2);
  g.fillRect(skx - 1.4, sky + 1.4, 2.8, 1.2);
  g.fillStyle(tint(MAG.basalt), alpha);
  g.fillCircle(skx - 0.8, sky - 0.3, 0.6);
  g.fillCircle(skx + 0.8, sky - 0.3, 0.6);

  // Stern lantern.
  const lan = at(-44, 0);
  g.fillStyle(tint(MAG.gold), alpha * (0.5 + 0.3 * Math.sin(t * 5)));
  g.fillCircle(lan.x, lan.y - 14, 4);
  g.fillStyle(tint(MAG.white), alpha * 0.9);
  g.fillCircle(lan.x, lan.y - 14, 1.6);
  g.lineStyle(1.4, tint(MAG.crustDeep), alpha);
  g.lineBetween(lan.x, lan.y, lan.x, lan.y - 10);
}

/**
 * A cannonball: cooled rock fired hot, so it is a basalt sphere with the melt showing in two
 * cracks and a short tail of embers behind it along `ang`.
 */
export function cannonball(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, ang: number, spin: number, seed: number, alpha = 1,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 1; i <= 4; i++) {
    g.fillStyle(tint(i < 2 ? MAG.lava : i < 3 ? MAG.magma : MAG.smoke), alpha * (0.5 - i * 0.1));
    g.fillCircle(x - c * i * 6, y - s * i * 6, 5 - i * 0.8);
  }
  g.fillStyle(tint(MAG.magma), alpha * 0.3);
  g.fillCircle(x, y, 9);
  g.fillStyle(tint(MAG.basalt), alpha);
  g.fillCircle(x, y, 6.2);
  for (let i = 0; i < 2; i++) {
    const a = spin + i * 2.3 + noise(seed, i) * 0.8;
    g.lineStyle(1.3, tint(MAG.lava), alpha * 0.9);
    g.lineBetween(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5, x + Math.cos(a) * 5.4, y + Math.sin(a) * 5.4);
  }
  g.fillStyle(tint(MAG.white), alpha * 0.8);
  g.fillCircle(x - 1.6, y - 1.8, 1.4);
}

/**
 * A pirate spirit (Pirate King, Q+): a crewman made of flame, hanging in the air. A wisp
 * tapering down to nothing, a tricorn, two ember eyes and a cutlass held out along `facing`.
 * `hp` (0–1) is how much of him is left — he burns down rather than fades, so he gets smaller
 * and bluer-white at the core as he goes. `dash` (0–1) is how far through a lunge he is,
 * which streams the wisp out behind him.
 */
export function pirateSpirit(
  g: Phaser.GameObjects.Graphics,
  tint: MagmaColorFn,
  x: number, y: number, facing: number, t: number, seed: number, hp: number, dash: number,
  alpha = 1,
): void {
  const size = 0.7 + hp * 0.5;
  const c = Math.cos(facing), s = Math.sin(facing);
  // Shadow on the ground under him — the one thing that says he is floating.
  g.fillStyle(tint(MAG.scorch), alpha * 0.35);
  g.fillEllipse(x, y + 26, 22 * size, 7 * size);

  // The wisp: three nested flame shapes, tail streaming back along the dash.
  const tailX = -c * (10 + dash * 26), tailY = 14 * size - s * dash * 20;
  const passes: Array<[number, number]> = [[1, MAG.magma], [0.7, MAG.lava], [0.4, MAG.white]];
  for (const [k, color] of passes) {
    const w = 9 * size * k;
    const flick = Math.sin(t * 11 + seed) * 1.5 * k;
    g.fillStyle(tint(color), alpha * (color === MAG.white ? 0.8 : 0.72));
    g.fillPoints([
      new Phaser.Geom.Point(x - w, y + 2 + flick),
      new Phaser.Geom.Point(x - w * 0.8, y - 9 * size * k),
      new Phaser.Geom.Point(x, y - 12 * size * k),
      new Phaser.Geom.Point(x + w * 0.8, y - 9 * size * k),
      new Phaser.Geom.Point(x + w, y + 2 - flick),
      new Phaser.Geom.Point(x + tailX * k * 0.5, y + tailY * k),
      new Phaser.Geom.Point(x + tailX * k, y + tailY * k * 1.3),
    ], true);
  }
  // Embers coming off him.
  for (let i = 0; i < 3; i++) {
    const ph = (t * 1.6 + noise(seed, i)) % 1;
    g.fillStyle(tint(MAG.ember), alpha * (1 - ph) * 0.8);
    g.fillCircle(x + Math.sin(ph * 7 + i) * 6, y - 8 - ph * 18, 1.6 * (1 - ph * 0.5));
  }

  // Eyes: two coals.
  const ex = x + c * 2.5, ey = y - 5 * size;
  g.fillStyle(tint(MAG.basalt), alpha * 0.9);
  g.fillCircle(ex - 3.4, ey, 2);
  g.fillCircle(ex + 3.4, ey, 2);
  g.fillStyle(tint(MAG.white), alpha);
  g.fillCircle(ex - 3.4, ey, 1);
  g.fillCircle(ex + 3.4, ey, 1);

  // Tricorn, sitting on the flame.
  const hy = y - 12 * size;
  g.fillStyle(tint(MAG.basalt), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(x - 11, hy + 2), new Phaser.Geom.Point(x - 5, hy - 1),
    new Phaser.Geom.Point(x, hy - 3), new Phaser.Geom.Point(x + 5, hy - 1),
    new Phaser.Geom.Point(x + 11, hy + 2), new Phaser.Geom.Point(x + 4, hy + 4),
    new Phaser.Geom.Point(x - 4, hy + 4),
  ], true);
  g.fillPoints([
    new Phaser.Geom.Point(x - 5, hy), new Phaser.Geom.Point(x - 4, hy - 6),
    new Phaser.Geom.Point(x + 4, hy - 6), new Phaser.Geom.Point(x + 5, hy),
  ], true);
  g.lineStyle(1, tint(MAG.magma), alpha * 0.6);
  g.lineBetween(x - 11, hy + 2, x - 4, hy + 4);
  g.lineBetween(x + 11, hy + 2, x + 4, hy + 4);
  g.fillStyle(tint(MAG.bone), alpha * 0.9);
  g.fillCircle(x, hy - 2.6, 1.3);

  // Cutlass, out along the facing — a flame given an edge.
  const hx = x + c * 9, hy2 = y - 1 + s * 9;
  const len = 16 + dash * 6;
  const px = -s, py = c;
  g.fillStyle(tint(MAG.basalt), alpha * 0.9);
  g.fillPoints([
    new Phaser.Geom.Point(hx + px * 1.6, hy2 + py * 1.6),
    new Phaser.Geom.Point(hx + c * (len - 4) + px * 2.6, hy2 + s * (len - 4) + py * 2.6),
    new Phaser.Geom.Point(hx + c * len, hy2 + s * len),
    new Phaser.Geom.Point(hx + c * (len - 2) - px, hy2 + s * (len - 2) - py),
    new Phaser.Geom.Point(hx - px, hy2 - py),
  ], true);
  g.lineStyle(1, tint(MAG.lava), alpha * 0.9);
  g.lineBetween(hx + px * 1.8, hy2 + py * 1.8, hx + c * (len - 3) + px * 2.6, hy2 + s * (len - 3) + py * 2.6);
  g.lineStyle(1.6, tint(MAG.gold), alpha);
  g.beginPath();
  g.arc(hx, hy2, 3, facing + Math.PI / 2, facing + Math.PI * 1.5, false);
  g.strokePath();
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
  eyeWhite: MAG.white,
  eyePupil: MAG.basalt,
  squash: { div: 15, x: 0.42, y: 0.22 },
};

/**
 * The magma pirate.
 *
 * The body is the plain molten `elem-magma` orb the arena stages under the rig. The pirate is
 * said by one thing on top of it — a basalt tricorn going soft in the heat, skull on the crown,
 * drips off its horns — plus an eye patch as the single secondary touch. The hands are plain
 * lava balls. Mastered he is the captain, but nothing new appears: the tricorn's brim turns to
 * gilded lace with a lava glow under it, the skull's eyes burn, the hand coronas widen and the
 * eye whites go gold.
 *
 * `drawBody` paints only what sits *on* the sphere under the eyes — Molten Mutiny's pendant,
 * which is a gameplay tell — and `drawExtras` paints the patch and the hat over them.
 */
export class MagmaAvatar extends BaseAvatar {
  /** 0–1 — how hard the character is currently venting (casting, firing). */
  private vent = 0;
  private ventTarget = 0;
  /** 0–1 — eases in while the pirate is at the helm of his ship. */
  private helm = 0;
  private atHelm = false;
  /** Molten Mutiny's pendant: -1 while it is not worn, else its 0–1 charge. */
  private pendant = -1;

  constructor(scene: Phaser.Scene, tint: MagmaColorFn, depth = 6) {
    super(scene, tint, depth, MAGMA_AVATAR);
  }

  /** True while something molten is being pushed out — hands glow, embers lift off the crown. */
  setVenting(on: boolean): void { this.ventTarget = on ? 1 : 0; }

  /** At the helm: the pirate stands taller and the hands come up to the wheel. */
  setHelm(on: boolean): void { this.atHelm = on; }

  /** The cursed pendant on the chest, or -1 to take it off. `power` is 0–1. */
  setPendant(power: number): void { this.pendant = power; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.vent += (this.ventTarget - this.vent) * Math.min(1, delta / 150);
    this.helm += ((this.atHelm ? 1 : 0) - this.helm) * Math.min(1, delta / 220);
    super.update(delta, x, y, alpha);
  }

  /** Captain's commission: wider, gold-ringed hand coronas and gold eyes; the hat gilds below. */
  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 17 : 13);
      glow.setAlpha(on ? 0.4 : 0.26);
    });
    this.forEachHandLayer(1, (core) => {
      if (on) core.setStrokeStyle(1.8, this.tint(MAG.gold), 0.95);
      else core.setStrokeStyle();
    });
    this.setEyeWhite(on ? MAG.gold : MAG.white);
  }

  protected emitTrail(x: number, y: number): void {
    new MagmaFx(this.scene, this.tint).ember(x, y, 1, 5, 520, MAG.ember);
  }

  /** 0–1 slow sag — how far gone the melt is this moment. Drives the drips and the brim droop. */
  private melt(): number { return 0.5 + 0.5 * Math.sin(this.t * 0.9); }

  /** Where the eye on `side` (-1 left, +1 right) sits this frame — mirrors BaseAvatar's placement. */
  private eyeAt(side: number, x: number, y: number): { x: number; y: number } {
    const bob = Math.sin(this.t * 2.6) * 1.1;
    return {
      x: x + side * 7.2 + Math.cos(this.facing) * 2.4,
      y: y - 4 + Math.sin(this.facing) * 2.0 + bob,
    };
  }

  /**
   * A lava drip: a tapered run of melt that pinches off into a falling drop. `p` is the phase
   * (0–1): the run lengthens through the first two thirds, then the drop detaches and falls.
   */
  private drip(g: Phaser.GameObjects.Graphics, x: number, y: number, len: number, w: number, p: number, alpha: number): void {
    const run = Math.min(1, p / 0.66) * len;
    g.fillStyle(this.tint(MAG.magma), alpha * 0.95);
    g.fillTriangle(x - w, y, x + w, y, x, y + run);
    g.fillStyle(this.tint(MAG.lava), alpha * 0.8);
    g.fillTriangle(x - w * 0.5, y, x + w * 0.5, y, x, y + run * 0.8);
    // The bead at the end of the run, then the drop it becomes.
    const beadY = p < 0.66 ? y + run : y + len + (p - 0.66) / 0.34 * 26;
    g.fillStyle(this.tint(MAG.lava), alpha * (p < 0.66 ? 0.95 : 0.9 * (1 - (p - 0.66) / 0.34)));
    g.fillCircle(x, beadY, w * 0.75);
    g.fillStyle(this.tint(MAG.white), alpha * 0.7);
    g.fillCircle(x - w * 0.25, beadY - w * 0.3, w * 0.28);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    // A soft heat pool underfoot, brighter while venting and once mastered. Fades while he is
    // aboard — the deck is under him.
    const ground = 1 - this.helm;
    const boost = this.mastered ? 0.08 : 0;
    g.fillStyle(this.tint(MAG.magma), a * (0.1 + boost + this.vent * 0.2) * (0.4 + ground * 0.6));
    g.fillEllipse(x, y + 14, 40 + this.vent * 14, 13 + this.vent * 5);
  }

  /** Only Molten Mutiny's pendant sits on the sphere — it is a gameplay tell, not costume. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.pendant < 0) return;
    const A = alpha;
    const lean = Math.cos(this.facing) * 1.5;
    const p = this.pendant;
    g.lineStyle(1.3, this.tint(MAG.gold), A * 0.9);
    g.beginPath();
    g.arc(x + lean * 0.5, y - 6, 11, Math.PI * 0.12, Math.PI * 0.88, false);
    g.strokePath();
    const gx = x + lean * 0.5, gy = y + 6.5;
    // The gem: a faceted red stone, lit from inside by whatever it has taken so far.
    g.fillStyle(this.tint(MAG.pendant), A * (0.2 + p * 0.5));
    g.fillCircle(gx, gy, 6 + p * 5);
    g.fillStyle(this.tint(MAG.basalt), A);
    g.fillPoints([
      new Phaser.Geom.Point(gx, gy - 5), new Phaser.Geom.Point(gx + 4, gy - 1.5),
      new Phaser.Geom.Point(gx + 2.6, gy + 4), new Phaser.Geom.Point(gx - 2.6, gy + 4),
      new Phaser.Geom.Point(gx - 4, gy - 1.5),
    ], true);
    g.fillStyle(this.tint(p > 0.75 ? MAG.pendantLit : MAG.pendant), A * (0.55 + p * 0.45 + 0.1 * Math.sin(this.t * (3 + p * 9))));
    g.fillPoints([
      new Phaser.Geom.Point(gx, gy - 3.6), new Phaser.Geom.Point(gx + 2.8, gy - 1),
      new Phaser.Geom.Point(gx + 1.8, gy + 2.8), new Phaser.Geom.Point(gx - 1.8, gy + 2.8),
      new Phaser.Geom.Point(gx - 2.8, gy - 1),
    ], true);
    g.fillStyle(this.tint(MAG.white), A * (0.3 + p * 0.6));
    g.fillCircle(gx - 1, gy - 1.2, 0.9 + p * 0.8);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const A = alpha;
    const m = this.melt();
    const lean = Math.cos(this.facing) * 2.2;
    const gilt = this.mastered;

    // ── Eye patch over the left eye — the one secondary touch ──
    const eye = this.eyeAt(-1, x, y);
    g.lineStyle(1.6, this.tint(MAG.basalt), A);
    g.lineBetween(eye.x + 4, eye.y - 3, x + 13 + lean, y - 11);
    g.fillStyle(this.tint(MAG.basalt), A);
    g.fillCircle(eye.x, eye.y, 5.2);

    // ── The tricorn: going soft in the heat, sitting on the crown of the sphere ──
    // Mastered, the same hat is bigger, its brim gilded and glowing from beneath.
    const s = gilt ? 1.22 : 1.1;
    const cy = y - 17;
    const hx = x + lean;
    const droop = (1.5 + m * 3) * s;
    const horn = 15 * s;
    if (gilt) {
      // Lava light pooling under the brim.
      g.fillStyle(this.tint(MAG.lava), A * (0.22 + 0.08 * Math.sin(this.t * 3)));
      g.fillEllipse(hx, cy + 3, horn * 2.4, 13);
    }
    // Crown first, so the brim lies over its base. Crust-brown felt, not black, so it reads.
    const crown = [
      new Phaser.Geom.Point(hx - 8 * s, cy + 1),
      new Phaser.Geom.Point(hx - (6.5 + m) * s, cy - (8 - m * 1.5) * s),
      new Phaser.Geom.Point(hx + (6.5 + m) * s, cy - (8 - m * 1.5) * s),
      new Phaser.Geom.Point(hx + 8 * s, cy + 1),
    ];
    g.fillStyle(this.tint(MAG.crustDeep), A);
    g.fillPoints(crown, true);
    g.lineStyle(gilt ? 2 : 1.4, this.tint(gilt ? MAG.gold : MAG.magma), A * (gilt ? 0.95 : 0.75));
    g.strokePoints(crown, true);
    // A lit panel down the felt so the hat reads against a dark floor, and a hat band of melt.
    g.fillStyle(this.tint(MAG.ash), A * 0.55);
    g.fillPoints([
      new Phaser.Geom.Point(hx - 6 * s, cy - 0.5),
      new Phaser.Geom.Point(hx - 5 * s, cy - (7 - m * 1.5) * s),
      new Phaser.Geom.Point(hx - 1.5 * s, cy - (7.4 - m * 1.5) * s),
      new Phaser.Geom.Point(hx - 2.5 * s, cy - 0.5),
    ], true);
    g.lineStyle(2, this.tint(gilt ? MAG.gold : MAG.lava), A * (gilt ? 0.95 : 0.8));
    g.lineBetween(hx - 7.6 * s, cy - 0.6, hx + 7.6 * s, cy - 0.6);
    // Brim: the three horns sag under their own melt.
    const brim = [
      new Phaser.Geom.Point(hx - horn, cy + 2 + droop),
      new Phaser.Geom.Point(hx - horn * 0.55, cy + 5.4 * s),
      new Phaser.Geom.Point(hx, cy + 6 * s + droop * 0.5),
      new Phaser.Geom.Point(hx + horn * 0.55, cy + 5.4 * s),
      new Phaser.Geom.Point(hx + horn, cy + 2 + droop),
      new Phaser.Geom.Point(hx + horn * 0.62, cy + 0.6),
      new Phaser.Geom.Point(hx + 5.5 * s, cy - 1.2),
      new Phaser.Geom.Point(hx, cy - (4.4 - m) * s),
      new Phaser.Geom.Point(hx - 5.5 * s, cy - 1.2),
      new Phaser.Geom.Point(hx - horn * 0.62, cy + 0.6),
    ];
    g.fillStyle(this.tint(MAG.crustDeep), A);
    g.fillPoints(brim, true);
    // Edge: molten where the hat is going, gold lace once the wearer is a captain.
    g.lineStyle(gilt ? 2.4 : 1.6, this.tint(gilt ? MAG.gold : MAG.magma), A * (gilt ? 1 : 0.75 + m * 0.2));
    g.strokePoints(brim, true);
    // Drips off both horns.
    this.drip(g, hx - horn + 1, cy + 2.4 + droop, 4 + m * 5, 1.5, (this.t * 0.5) % 1, A);
    this.drip(g, hx + horn - 1, cy + 2.4 + droop, 4 + m * 5, 1.5, (this.t * 0.5 + 0.45) % 1, A);

    // Skull on the crown — its sockets burn once mastered.
    const ex = hx, ey = cy - 3.4 * s;
    g.fillStyle(this.tint(MAG.bone), A);
    g.fillCircle(ex, ey - 0.6, 3);
    g.fillRect(ex - 2, ey + 1, 4, 2);
    g.fillStyle(this.tint(gilt ? MAG.lava : MAG.basalt), A);
    g.fillCircle(ex - 1.2, ey - 1, 0.9);
    g.fillCircle(ex + 1.2, ey - 1, 0.9);

    // Vent embers off the crown while casting.
    if (this.vent > 0.08) {
      for (let i = 0; i < 4; i++) {
        const ph = (this.t * 2 + i * 0.25) % 1;
        const px = x + Math.sin(ph * 5 + i) * (5 + i * 2.5);
        const py = y - 28 - ph * 22;
        g.fillStyle(this.tint(MAG.ember), A * this.vent * 0.5 * (1 - ph));
        g.fillCircle(px, py, 2.2 * (1 - ph * 0.4));
      }
    }
  }
}
