import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Ink's look: a 1930s rubber-hose cartoon in pure black and white. A glossy ink-black body, big
 * white eyes with pie-cut pupils, a white grin, white four-finger gloves and a little bowler hat.
 * Everything it makes is ink on paper — thick black outlines over white fills — and every hit
 * pops a comic-book burst.
 *
 * Every painter takes a `ColorFn` so a skin can recolour it, and the previews call the same ones.
 */

export const INK = {
  ink: 0x111111,
  inkSoft: 0x2b2b2b,
  inkLit: 0x4a4a4a,
  gray: 0x7c7c7c,
  grayLit: 0xb8b8b8,
  shade: 0xd9d6cc,
  paper: 0xf5f2e9,
  white: 0xffffff,
  /** The studio desk under the set. */
  desk: 0x8f8a80,
  deskDark: 0x5f5b54,
  deskLit: 0xb3aea3,
  /** The foam walls. */
  foam: 0xcfcbc0,
  foamDark: 0x9b978d,
};

export type InkColorFn = ColorFn;

/** One ink stroke: a thick black line under a thinner coloured one, the house outline. */
function outlined(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Phaser.Math.Vector2[], fill: number, alpha: number, w = 2,
): void {
  g.fillStyle(tint(fill), alpha);
  g.fillPoints(pts, true);
  g.lineStyle(w, tint(INK.ink), alpha);
  g.strokePoints(pts, true);
}

/** A point `f` forward and `s` sideways of (x, y) facing `ang`. */
function along(x: number, y: number, ang: number, f: number, s: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(x + Math.cos(ang) * f - Math.sin(ang) * s, y + Math.sin(ang) * f + Math.cos(ang) * s);
}

/** A soft round ink-dark shadow that sits a thing on the floor. */
export function dropShadow(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, w: number, alpha: number): void {
  g.fillStyle(tint(INK.ink), alpha * 0.28);
  g.fillEllipse(x, y, w, w * 0.34);
}

/**
 * A finger-gun ink bullet: a black pellet with a white glint, and three cartoon speed lines
 * trailing it.
 */
export function inkBullet(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, r: number, alpha: number): void {
  const bx = -Math.cos(ang);
  const by = -Math.sin(ang);
  g.lineStyle(1.6, tint(INK.ink), alpha * 0.7);
  for (let i = -1; i <= 1; i++) {
    const s = i * r * 0.8;
    const ox = x - Math.sin(ang) * s;
    const oy = y + Math.cos(ang) * s;
    const len = (i === 0 ? 16 : 10) + r;
    g.lineBetween(ox + bx * (r + 3), oy + by * (r + 3), ox + bx * (r + 3 + len), oy + by * (r + 3 + len));
  }
  g.fillStyle(tint(INK.white), alpha);
  g.fillCircle(x, y, r + 1.4);
  g.fillStyle(tint(INK.ink), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(INK.white), alpha * 0.95);
  g.fillCircle(x - r * 0.3 - bx * 0.6, y - r * 0.35, Math.max(1, r * 0.3));
}

/**
 * A banana peel lying flat: three floppy peel flaps star-shaped round a stub, white with a black
 * outline and freckles. A mimic (E+) stands up on stick legs with two googly eyes on stalks;
 * `legs` (0..1) grows them in and `walk` swings them.
 */
export function bananaPeel(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, rot: number, t: number,
  alpha: number, mimic?: { legs: number; walk: number; look: number },
): void {
  const legs = mimic?.legs ?? 0;
  const lift = legs * 9;
  dropShadow(g, tint, x, y + 6, 30 + legs * 4, alpha);
  if (legs > 0.02) {
    // Two stick legs with big round shoes.
    for (const side of [-1, 1]) {
      const swing = Math.sin(mimic!.walk + (side > 0 ? Math.PI : 0)) * 5 * legs;
      const hx = x + side * 5;
      const hy = y - lift + 3;
      const fx = hx + swing;
      const fy = y + 5;
      g.lineStyle(2, tint(INK.ink), alpha);
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo((hx + fx) / 2 + side * 2, (hy + fy) / 2);
      g.lineTo(fx, fy);
      g.strokePath();
      g.fillStyle(tint(INK.ink), alpha);
      g.fillEllipse(fx + side * 2, fy + 1, 7 * legs, 4 * legs);
    }
  }
  const cy = y - lift;
  // Three flaps, each a tapered tongue with a curled tip.
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * TAU + Math.sin(t * 2 + i) * 0.04;
    const len = 15 + (i === 1 ? 3 : 0);
    const pts = [
      along(x, cy, a, 0, -4.5),
      along(x, cy, a, len * 0.55, -5.5),
      along(x, cy, a, len, -2.5),
      along(x, cy, a, len + 2, 1.5),
      along(x, cy, a, len * 0.55, 4.5),
      along(x, cy, a, 0, 4),
    ];
    outlined(g, tint, pts, INK.paper, alpha, 1.8);
    // The inside of the peel, a shade down.
    g.fillStyle(tint(INK.shade), alpha);
    g.fillPoints([along(x, cy, a, 2, -2), along(x, cy, a, len * 0.5, -2.5), along(x, cy, a, len - 2, -0.5), along(x, cy, a, len * 0.5, 2), along(x, cy, a, 2, 1.8)], true);
    g.fillStyle(tint(INK.ink), alpha * 0.85);
    const f = along(x, cy, a, len * 0.62, (i % 2 ? 1 : -1) * 2.6);
    g.fillCircle(f.x, f.y, 0.9);
  }
  // The stub in the middle.
  g.fillStyle(tint(INK.ink), alpha);
  g.fillCircle(x, cy, 4);
  g.fillStyle(tint(INK.inkLit), alpha);
  g.fillCircle(x - 1, cy - 1, 1.6);
  if (mimic && legs > 0.02) {
    // Googly eyes on stalks, looking at whoever they are creeping up on.
    for (const side of [-1, 1]) {
      const sx = x + side * 4;
      const sy = cy - 4;
      const ex = sx + side * 2;
      const ey = sy - 9 * legs;
      g.lineStyle(1.5, tint(INK.ink), alpha);
      g.lineBetween(sx, sy, ex, ey);
      g.fillStyle(tint(INK.white), alpha);
      g.fillCircle(ex, ey, 3.6 * legs);
      g.lineStyle(1.2, tint(INK.ink), alpha);
      g.strokeCircle(ex, ey, 3.6 * legs);
      g.fillStyle(tint(INK.ink), alpha);
      g.fillCircle(ex + Math.cos(mimic.look) * 1.5, ey + Math.sin(mimic.look) * 1.5, 1.7 * legs);
    }
  }
}

/** A banana in flight (the Doombringer's round): a curved white crescent spinning end over end. */
export function bananaShot(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, spin: number, alpha: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const a = spin - 1.1 + u * 2.2;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * 11, y + Math.sin(a) * 11));
  }
  for (let i = 8; i >= 0; i--) {
    const u = i / 8;
    const a = spin - 1.1 + u * 2.2;
    const r = 11 - 5 * Math.sin(u * Math.PI);
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  outlined(g, tint, pts, INK.paper, alpha, 1.8);
  const tip = new Phaser.Math.Vector2(x + Math.cos(spin - 1.1) * 10, y + Math.sin(spin - 1.1) * 10);
  g.fillStyle(tint(INK.ink), alpha);
  g.fillCircle(tip.x, tip.y, 2);
}

/**
 * A white cartoon glove at (x, y) pointing along `ang`. `gun` is the finger gun — index finger
 * out, thumb cocked up; `fist` is a balled hand; `open` is a spread palm.
 */
export function glove(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number,
  pose: 'gun' | 'fist' | 'open', scale: number, alpha: number, recoil = 0,
): void {
  const s = scale;
  const fwd = (f: number, side: number) => along(x, y, ang, f * s, side * s);
  // The cuff: a rolled ring behind the palm.
  outlined(g, tint, [fwd(-9, -6), fwd(-5, -7), fwd(-5, 7), fwd(-9, 6)], INK.white, alpha, 1.6);
  g.lineStyle(1, tint(INK.ink), alpha * 0.8);
  const c0 = fwd(-7, -6); const c1 = fwd(-7, 6);
  g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  // The palm.
  g.fillStyle(tint(INK.white), alpha);
  g.fillCircle(x, y, 6.4 * s);
  g.lineStyle(1.8, tint(INK.ink), alpha);
  g.strokeCircle(x, y, 6.4 * s);
  if (pose === 'gun') {
    const lift = recoil * 0.5;
    // Index finger, straight out along the aim (kicks up a touch on recoil).
    const fa = ang - lift;
    const f = (d: number, side: number) => along(x, y, fa, d * s, side * s);
    outlined(g, tint, [f(3, -3.2), f(15, -3.2), f(16.5, -1.6), f(16.5, 1.4), f(15, 2.6), f(3, 2.6)], INK.white, alpha, 1.6);
    // Thumb, cocked up like a hammer.
    const ta = ang - Math.PI / 2 - 0.3 - recoil * 0.6;
    const tt = (d: number, side: number) => along(x + Math.cos(ang) * 1.5 * s, y + Math.sin(ang) * 1.5 * s, ta, d * s, side * s);
    outlined(g, tint, [tt(3, -2.4), tt(10, -2.2), tt(11, 0), tt(10, 2.2), tt(3, 2.4)], INK.white, alpha, 1.5);
    // Curled fingers.
    g.lineStyle(1.2, tint(INK.ink), alpha * 0.9);
    for (let i = 0; i < 2; i++) {
      const k0 = fwd(1 + i * 2, 3.6); const k1 = fwd(4 + i * 2, 5.4);
      g.lineBetween(k0.x, k0.y, k1.x, k1.y);
    }
  } else if (pose === 'open') {
    for (let i = 0; i < 4; i++) {
      const fa = ang + (i - 1.5) * 0.38;
      const f = (d: number, side: number) => along(x, y, fa, d * s, side * s);
      outlined(g, tint, [f(4, -2.2), f(11, -2.2), f(12.5, 0), f(11, 2.2), f(4, 2.2)], INK.white, alpha, 1.4);
    }
  } else {
    // Knuckle creases on a balled fist.
    g.lineStyle(1.2, tint(INK.ink), alpha * 0.9);
    for (let i = -1; i <= 1; i++) {
      const k0 = fwd(2.5, i * 2.6); const k1 = fwd(5.5, i * 2.6);
      g.lineBetween(k0.x, k0.y, k1.x, k1.y);
    }
  }
  // The three stitched lines on the back of every cartoon glove.
  g.lineStyle(1, tint(INK.ink), alpha * 0.85);
  for (let i = -1; i <= 1; i++) {
    const b0 = fwd(-3, i * 2.2); const b1 = fwd(1, i * 2.2);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  }
}

/**
 * The anvil: horn to the left, flat face, pinched waist, heavy foot. Black iron with a white
 * edge-light along the face, the way a cartoon anvil is always lit, and "6T" stamped in white.
 */
export function anvil(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, scale: number, alpha: number, wobble = 0): void {
  const s = scale;
  const P = (px: number, py: number) => new Phaser.Math.Vector2(x + (px + Math.sin(py * 0.2 + wobble) * wobble * 0.6) * s, y + py * s);
  const body = [
    P(-30, -14), P(-10, -14), P(22, -14), P(26, -11), P(26, -4), P(14, -2), P(9, 4), P(9, 9),
    P(18, 14), P(18, 18), P(-16, 18), P(-16, 14), P(-7, 9), P(-7, 4), P(-12, -2), P(-20, -5), P(-30, -9),
  ];
  g.fillStyle(tint(INK.white), alpha);
  g.fillPoints(body.map((p) => new Phaser.Math.Vector2(x + (p.x - x) * 1.08, y + (p.y - y) * 1.08 + 0.5)), true);
  g.fillStyle(tint(INK.ink), alpha);
  g.fillPoints(body, true);
  // The face catches the light.
  g.fillStyle(tint(INK.white), alpha * 0.9);
  g.fillPoints([P(-26, -13), P(22, -13), P(24, -11), P(-22, -11)], true);
  g.fillStyle(tint(INK.inkLit), alpha);
  g.fillPoints([P(-6, 6), P(6, 6), P(6, 8), P(-6, 8)], true);
  // "6T" — a six and a T in thick strokes on the flank.
  g.lineStyle(2.2 * s, tint(INK.white), alpha);
  g.beginPath();
  g.arc(x - 3 * s, y - 4 * s, 3 * s, Math.PI * 0.2, Math.PI * 2.05);
  g.strokePath();
  g.lineBetween(x - 5.6 * s, y - 5 * s, x - 3 * s, y - 9.5 * s);
  g.lineBetween(x + 3 * s, y - 9 * s, x + 9 * s, y - 9 * s);
  g.lineBetween(x + 6 * s, y - 9 * s, x + 6 * s, y - 1.5 * s);
}

/**
 * The smoke projection Skedaddle's R+ leaves behind: the character's outline in grey puffs, eyes
 * and a finger gun still pointed, fraying at the edges as it runs out.
 */
export function smokeGhost(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number, aim: number): void {
  const fray = 1 - alpha;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + Math.sin(t * 1.7 + i) * 0.12;
    const r = 18 + Math.sin(t * 3 + i * 1.9) * 2 + fray * 6;
    const pr = 6 + Math.sin(t * 2.3 + i) * 1.4;
    g.fillStyle(tint(INK.grayLit), alpha * 0.55);
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, pr);
  }
  g.fillStyle(tint(INK.gray), alpha * 0.45);
  g.fillCircle(x, y, 17);
  g.lineStyle(1.5, tint(INK.ink), alpha * 0.6);
  g.strokeCircle(x, y, 19);
  // Hollow eyes.
  g.fillStyle(tint(INK.white), alpha * 0.8);
  g.fillEllipse(x - 6, y - 4, 7, 9);
  g.fillEllipse(x + 6, y - 4, 7, 9);
  g.fillStyle(tint(INK.ink), alpha * 0.8);
  g.fillCircle(x - 6 + Math.cos(aim) * 1.5, y - 3 + Math.sin(aim) * 1.5, 1.8);
  g.fillCircle(x + 6 + Math.cos(aim) * 1.5, y - 3 + Math.sin(aim) * 1.5, 1.8);
  glove(g, tint, x + Math.cos(aim) * 24, y + Math.sin(aim) * 24, aim, 'gun', 0.9, alpha * 0.7);
}

/** Flattened by the anvil: dizzy stars circling over the pancake. */
export function dizzyStars(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number): void {
  for (let i = 0; i < 3; i++) {
    const a = t * 3.2 + (i / 3) * TAU;
    const sx = x + Math.cos(a) * 18;
    const sy = y - 16 + Math.sin(a) * 5;
    const pts: Phaser.Math.Vector2[] = [];
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 2.2 : 5;
      const pa = -Math.PI / 2 + (k / 10) * TAU + t;
      pts.push(new Phaser.Math.Vector2(sx + Math.cos(pa) * r, sy + Math.sin(pa) * r));
    }
    outlined(g, tint, pts, INK.white, alpha, 1.2);
  }
}

/** Slippery feet: little skid marks and a sweat drop. */
export function slipMarks(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number): void {
  g.lineStyle(1.4, tint(INK.ink), alpha * 0.6);
  for (let i = 0; i < 3; i++) {
    const ox = -10 + i * 10 + Math.sin(t * 9 + i) * 2;
    g.lineBetween(x + ox - 4, y + 22, x + ox + 4, y + 22);
  }
  const dy = (t * 1.4) % 1;
  g.fillStyle(tint(INK.white), alpha * (1 - dy));
  g.fillEllipse(x + 17, y - 18 + dy * 8, 4, 6);
  g.lineStyle(1, tint(INK.ink), alpha * (1 - dy));
  g.strokeEllipse(x + 17, y - 18 + dy * 8, 4, 6);
}

/**
 * The foam walls round the arena while Foux World is up: a thick spongy band with pores in it,
 * gently breathing, its inner and outer edges ruled in ink.
 */
export function foamWalls(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, r: Phaser.Geom.Rectangle, band: number, t: number, alpha: number,
): void {
  const sides: [number, number, number, number][] = [
    [r.x - band / 2, r.y - band / 2, r.width + band, band],
    [r.x - band / 2, r.bottom - band / 2, r.width + band, band],
    [r.x - band / 2, r.y + band / 2, band, r.height - band],
    [r.right - band / 2, r.y + band / 2, band, r.height - band],
  ];
  for (const [x, y, w, h] of sides) {
    g.fillStyle(tint(INK.foam), alpha);
    g.fillRect(x, y, w, h);
    // Pores, spaced on a lattice and nudged off it so the foam never reads as a grid.
    g.fillStyle(tint(INK.foamDark), alpha * 0.9);
    const step = 11;
    for (let px = x + 4; px < x + w - 2; px += step) {
      for (let py = y + 4; py < y + h - 2; py += step) {
        const k = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
        const fr = k - Math.floor(k);
        const pr = 1.2 + fr * 2.3 + Math.sin(t * 2 + fr * 6) * 0.3;
        g.fillCircle(px + (fr - 0.5) * 5, py + ((fr * 7) % 1 - 0.5) * 5, pr);
      }
    }
  }
  g.lineStyle(2.5, tint(INK.ink), alpha);
  g.strokeRect(r.x - band / 2, r.y - band / 2, r.width + band, r.height + band);
  g.lineStyle(2, tint(INK.ink), alpha * 0.85);
  g.strokeRect(r.x + band / 2, r.y + band / 2, r.width - band, r.height - band);
}

/**
 * The animation studio round the set, painted once per Foux World: the desk the arena sits on, a
 * light table's edge, a pencil cup, a coffee mug, crumpled sketches, a ruler, a stack of cels
 * with peg holes, an eraser and a film reel. All drawn in ink on the grey desk; nothing collides.
 */
export function studioDesk(g: Phaser.GameObjects.Graphics, tint: ColorFn, arena: Phaser.Geom.Rectangle, outer: Phaser.Geom.Rectangle): void {
  const o = outer;
  const a = arena;
  // The desk, everywhere outside the set — run on well past the studio, so the zoomed-out view
  // (a touch wider than the room you can walk in) never shows an edge.
  const m = 400;
  g.fillStyle(tint(INK.desk), 1);
  g.fillRect(o.x - m, o.y - m, o.width + m * 2, a.y - o.y + m);
  g.fillRect(o.x - m, a.bottom, o.width + m * 2, o.bottom - a.bottom + m);
  g.fillRect(o.x - m, a.y, a.x - o.x + m, a.height);
  g.fillRect(a.right, a.y, o.right - a.right + m, a.height);
  // Wood grain: long wavy strokes.
  g.lineStyle(1.2, tint(INK.deskDark), 0.55);
  for (let yy = o.y + 14; yy < o.bottom; yy += 26) {
    g.beginPath();
    let first = true;
    for (let xx = o.x; xx <= o.right; xx += 40) {
      if (yy > a.y - 6 && yy < a.bottom + 6 && xx > a.x - 20 && xx < a.right + 20) { first = true; continue; }
      const wy = yy + Math.sin(xx * 0.013 + yy * 0.07) * 5;
      if (first) { g.moveTo(xx, wy); first = false; } else g.lineTo(xx, wy);
    }
    g.strokePath();
  }
  // The set's own base: a thick ink frame like the edge of a light table.
  g.lineStyle(10, tint(INK.ink), 0.9);
  g.strokeRect(a.x - 26, a.y - 26, a.width + 52, a.height + 52);
  g.lineStyle(2, tint(INK.deskLit), 0.8);
  g.strokeRect(a.x - 32, a.y - 32, a.width + 64, a.height + 64);

  const L = a.x - 40; // left margin's inner edge
  const R = a.right + 40;
  const T = a.y - 40;
  const B = a.bottom + 40;

  // Pencil cup (top-left): a ribbed cylinder with pencils fanning out.
  {
    const cx = (o.x + L) / 2 - 20;
    const cy = T - 80;
    for (let i = 0; i < 5; i++) {
      const pa = -Math.PI / 2 + (i - 2) * 0.22;
      const px = cx + (i - 2) * 9;
      const top = new Phaser.Math.Vector2(px + Math.cos(pa) * 70, cy - 30 + Math.sin(pa) * 70);
      g.lineStyle(9, tint(INK.ink), 1);
      g.lineBetween(px, cy - 20, top.x, top.y);
      g.lineStyle(6, tint(i % 2 ? INK.white : INK.grayLit), 1);
      g.lineBetween(px, cy - 20, top.x, top.y);
      g.fillStyle(tint(INK.ink), 1);
      g.fillCircle(top.x, top.y, 3.2);
    }
    g.fillStyle(tint(INK.ink), 0.3);
    g.fillEllipse(cx + 8, cy + 46, 92, 22);
    g.fillStyle(tint(INK.white), 1);
    g.fillRect(cx - 38, cy - 24, 76, 66);
    g.fillEllipse(cx, cy + 42, 76, 18);
    g.lineStyle(3, tint(INK.ink), 1);
    g.strokeRect(cx - 38, cy - 24, 76, 66);
    g.strokeEllipse(cx, cy - 24, 76, 18);
    g.lineStyle(1.5, tint(INK.ink), 0.6);
    for (let i = 1; i < 6; i++) g.lineBetween(cx - 38 + i * 12.7, cy - 18, cx - 38 + i * 12.7, cy + 40);
  }
  // Coffee mug (top-right), handle and a ring stain beside it.
  {
    const mx = (R + o.right) / 2 + 10;
    const my = T - 70;
    g.lineStyle(3, tint(INK.deskDark), 0.7);
    g.strokeCircle(mx - 70, my + 40, 30);
    g.fillStyle(tint(INK.ink), 0.3);
    g.fillEllipse(mx + 6, my + 36, 90, 22);
    g.fillStyle(tint(INK.white), 1);
    g.fillRect(mx - 32, my - 30, 64, 64);
    g.fillEllipse(mx, my + 34, 64, 16);
    g.lineStyle(3, tint(INK.ink), 1);
    g.strokeRect(mx - 32, my - 30, 64, 64);
    g.fillStyle(tint(INK.ink), 1);
    g.fillEllipse(mx, my - 30, 64, 16);
    g.fillStyle(tint(INK.inkSoft), 1);
    g.fillEllipse(mx, my - 29, 56, 11);
    g.lineStyle(7, tint(INK.ink), 1);
    g.beginPath();
    g.arc(mx + 34, my, 16, -Math.PI / 2, Math.PI / 2);
    g.strokePath();
    g.lineStyle(4, tint(INK.white), 1);
    g.beginPath();
    g.arc(mx + 34, my, 16, -Math.PI / 2, Math.PI / 2);
    g.strokePath();
  }
  // Crumpled sketches scattered on both sides.
  const crumple = (cx: number, cy: number, r: number, seed: number): void => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 11; i++) {
      const ang = (i / 11) * TAU;
      const k = Math.sin(seed * 9.1 + i * 3.7) * 0.5 + 0.5;
      pts.push(new Phaser.Math.Vector2(cx + Math.cos(ang) * r * (0.75 + k * 0.35), cy + Math.sin(ang) * r * (0.75 + k * 0.35)));
    }
    g.fillStyle(tint(INK.ink), 0.25);
    g.fillEllipse(cx + 4, cy + r * 0.8, r * 2, r * 0.6);
    outlined(g, tint, pts, INK.paper, 1, 2.2);
    g.lineStyle(1.2, tint(INK.ink), 0.7);
    for (let i = 0; i < 5; i++) {
      const a0 = seed + i * 1.3;
      g.lineBetween(cx + Math.cos(a0) * r * 0.2, cy + Math.sin(a0) * r * 0.2, cx + Math.cos(a0 + 0.6) * r * 0.75, cy + Math.sin(a0 + 0.6) * r * 0.75);
    }
  };
  crumple(L - 150, a.y + a.height * 0.45, 26, 1);
  crumple(L - 90, a.y + a.height * 0.62, 18, 2);
  crumple(R + 120, B + 120, 24, 3);
  crumple(R + 260, a.y + a.height * 0.3, 20, 4);
  crumple(a.centerX + 250, T - 160, 22, 5);
  // A ruler along the bottom.
  {
    const rx = a.x + 40;
    const ry = B + 60;
    const rw = a.width * 0.55;
    g.fillStyle(tint(INK.ink), 0.25);
    g.fillRect(rx + 6, ry + 8, rw, 34);
    g.fillStyle(tint(INK.white), 1);
    g.fillRect(rx, ry, rw, 34);
    g.lineStyle(2.5, tint(INK.ink), 1);
    g.strokeRect(rx, ry, rw, 34);
    g.lineStyle(1.4, tint(INK.ink), 1);
    for (let i = 0; i * 12 < rw; i++) g.lineBetween(rx + i * 12, ry, rx + i * 12, ry + (i % 5 === 0 ? 16 : 8));
  }
  // A stack of animation cels with peg holes (bottom-left).
  {
    const sx = (o.x + L) / 2 - 10;
    const sy = B + 150;
    for (let k = 3; k >= 0; k--) {
      const ox = sx + k * 7;
      const oy = sy - k * 6;
      const pts = [
        new Phaser.Math.Vector2(ox - 80, oy - 60), new Phaser.Math.Vector2(ox + 80, oy - 64),
        new Phaser.Math.Vector2(ox + 84, oy + 56), new Phaser.Math.Vector2(ox - 76, oy + 60),
      ];
      outlined(g, tint, pts, k === 0 ? INK.white : INK.paper, 1, 2);
    }
    g.fillStyle(tint(INK.ink), 1);
    for (const px of [-34, 0, 34]) g.fillEllipse(sx + px, sy - 48, px === 0 ? 8 : 12, 6);
    // A half-finished sketch of the character on the top sheet.
    g.lineStyle(2, tint(INK.ink), 0.85);
    g.strokeCircle(sx - 6, sy + 6, 22);
    g.strokeEllipse(sx - 14, sy, 8, 11);
    g.strokeEllipse(sx + 2, sy, 8, 11);
    g.beginPath();
    g.arc(sx - 6, sy + 10, 10, 0.3, Math.PI - 0.3);
    g.strokePath();
  }
  // An eraser (bottom-right) with crumbs.
  {
    const ex = R + 220;
    const ey = B + 40;
    g.fillStyle(tint(INK.ink), 0.25);
    g.fillRect(ex - 36, ey - 10, 80, 34);
    outlined(g, tint, [
      new Phaser.Math.Vector2(ex - 40, ey - 18), new Phaser.Math.Vector2(ex + 36, ey - 18),
      new Phaser.Math.Vector2(ex + 40, ey + 18), new Phaser.Math.Vector2(ex - 36, ey + 18),
    ], INK.white, 1, 2.5);
    g.fillStyle(tint(INK.grayLit), 1);
    g.fillRect(ex + 8, ey - 16, 30, 32);
    g.fillStyle(tint(INK.ink), 0.6);
    for (let i = 0; i < 6; i++) g.fillCircle(ex - 60 + i * 9, ey + 30 + (i % 2) * 6, 2);
  }
  // A film reel (left middle).
  {
    const fx = (o.x + L) / 2 - 30;
    const fy = a.y + a.height * 0.15;
    g.fillStyle(tint(INK.ink), 0.3);
    g.fillEllipse(fx + 6, fy + 52, 120, 26);
    g.fillStyle(tint(INK.ink), 1);
    g.fillCircle(fx, fy, 56);
    g.fillStyle(tint(INK.grayLit), 1);
    g.fillCircle(fx, fy, 50);
    g.fillStyle(tint(INK.ink), 1);
    for (let i = 0; i < 6; i++) {
      const ra = (i / 6) * TAU;
      g.fillCircle(fx + Math.cos(ra) * 30, fy + Math.sin(ra) * 30, 12);
    }
    g.fillCircle(fx, fy, 7);
    g.fillStyle(tint(INK.white), 1);
    g.fillCircle(fx, fy, 3);
  }
}

/** The desk lamp's light pool and the mug's steam: the two moving parts of the studio. */
export function studioLife(g: Phaser.GameObjects.Graphics, tint: ColorFn, arena: Phaser.Geom.Rectangle, outer: Phaser.Geom.Rectangle, t: number, alpha: number): void {
  const R = arena.right + 40;
  const T = arena.y - 40;
  const mx = (R + outer.right) / 2 + 10;
  const my = T - 70;
  g.lineStyle(3, tint(INK.white), alpha * 0.8);
  for (let i = 0; i < 3; i++) {
    const ph = t * 1.2 + i * 0.33;
    const u = ph % 1;
    const sx = mx - 16 + i * 16;
    g.beginPath();
    for (let k = 0; k <= 6; k++) {
      const yy = my - 40 - u * 30 - k * 9;
      const xx = sx + Math.sin(k * 0.9 + t * 3 + i) * 6;
      if (k === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.strokePath();
  }
}

export class InkFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn) { super(scene, tint); }

  /** A comic-book burst: a jagged white star with a black outline, popping in and fading. */
  burst(x: number, y: number, r: number, depth = 9): void {
    this.anim(depth, 360, (g, t) => {
      const s = t < 0.25 ? easeOut(t / 0.25) : 1;
      const al = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 16; i++) {
        const rr = (i % 2 ? r * 0.55 : r) * s * (0.9 + 0.2 * Math.sin(i * 2.7));
        const a = (i / 16) * TAU + 0.2;
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
      }
      g.fillStyle(this.tint(INK.white), al);
      g.fillPoints(pts, true);
      g.lineStyle(2.2, this.tint(INK.ink), al);
      g.strokePoints(pts, true);
    });
  }

  /** A comic word over a burst — BANG!, BONK!, ZOOM! — printed in ink, wobbling as it fades. */
  word(x: number, y: number, text: string, size = 14, burstR = 0): void {
    if (burstR > 0) this.burst(x, y, burstR, 18);
    const tx = this.scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'Arial Black', color: '#111111', stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(18.5).setRotation((Math.random() - 0.5) * 0.4);
    this.sink?.(tx);
    tx.setScale(0.3);
    this.scene.tweens.add({ targets: tx, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: tx, y: y - 14, alpha: 0, delay: 420, duration: 520, onComplete: () => tx.destroy() });
  }

  /** The finger gun's muzzle: three little "pew" ticks and a puff. */
  muzzle(x: number, y: number, ang: number): void {
    this.anim(8, 160, (g, t) => {
      g.lineStyle(2, this.tint(INK.ink), 1 - t);
      for (let i = -1; i <= 1; i++) {
        const a = ang + i * 0.6;
        const r0 = 4 + t * 6;
        g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r0 + 6), y + Math.sin(a) * (r0 + 6));
      }
      g.fillStyle(this.tint(INK.white), (1 - t) * 0.9);
      g.fillCircle(x, y, 3 + t * 4);
      g.lineStyle(1.2, this.tint(INK.ink), 1 - t);
      g.strokeCircle(x, y, 3 + t * 4);
    });
  }

  /** An ink splat where a bullet lands: a black blob with flung droplets. */
  splat(x: number, y: number, r = 8): void {
    const drops = Array.from({ length: 6 }, () => ({ a: Math.random() * TAU, d: r * (1.2 + Math.random()), s: 1 + Math.random() * 2 }));
    this.anim(4, 700, (g, t) => {
      const al = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      g.fillStyle(this.tint(INK.ink), al * 0.85);
      g.fillCircle(x, y, r * (0.6 + easeOut(Math.min(1, t * 4)) * 0.4));
      for (const dr of drops) {
        const k = easeOut(Math.min(1, t * 3));
        g.fillCircle(x + Math.cos(dr.a) * dr.d * k, y + Math.sin(dr.a) * dr.d * k, dr.s);
      }
    });
  }

  /** A puff of cartoon dust: round grey-white clouds with ink outlines, rolling outward. */
  dust(x: number, y: number, n = 4, spread = 18): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.8;
      const d = spread * (0.6 + Math.random() * 0.6);
      this.anim(4.5, 520, (g, t) => {
        const cx = x + Math.cos(a) * d * easeOut(t);
        const cy = y + Math.sin(a) * d * easeOut(t) * 0.6;
        const r = 4 + t * 7;
        g.fillStyle(this.tint(INK.paper), (1 - t) * 0.95);
        g.fillCircle(cx, cy, r);
        g.lineStyle(1.3, this.tint(INK.ink), (1 - t) * 0.8);
        g.strokeCircle(cx, cy, r);
      });
    }
  }

  /** The peel is set down: a little bounce ring. */
  peelDrop(x: number, y: number): void {
    this.anim(3.4, 260, (g, t) => {
      g.lineStyle(2 * (1 - t), this.tint(INK.ink), 1 - t);
      g.strokeEllipse(x, y + 4, 20 + t * 22, 7 + t * 8);
    });
  }

  /** Someone slips: the peel goes flying up and away, spinning, with a WHOOPS. */
  slip(x: number, y: number): void {
    const spin = Math.random() * TAU;
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.anim(9, 650, (g, t) => {
      const hop = Math.sin(t * Math.PI) * 46;
      bananaPeel(g, this.tint, x + dir * t * 40, y - hop, spin + t * 9 * dir, t * 10, 1 - easeIn(t));
    });
    this.word(x, y - 34, 'WHOOPS!', 13, 22);
  }

  /** A Skedaddle wall bounce: a "boing" squash ring off the wall. */
  wallBoing(x: number, y: number, nx: number, ny: number): void {
    this.anim(8, 300, (g, t) => {
      const a = Math.atan2(ny, nx);
      g.lineStyle(3 * (1 - t), this.tint(INK.ink), 1 - t);
      for (let i = 0; i < 3; i++) {
        const r = 10 + i * 7 + t * 14;
        g.beginPath();
        g.arc(x - nx * 14, y - ny * 14, r, a - 0.7, a + 0.7);
        g.strokePath();
      }
    });
  }

  /** Charging Skedaddle's run: dust kicked out behind the spinning feet. */
  runDust(x: number, y: number, ang: number): void {
    const a = ang + Math.PI + (Math.random() - 0.5) * 0.9;
    const d = 16 + Math.random() * 18;
    this.anim(4.5, 420, (g, t) => {
      const cx = x + Math.cos(a) * d * easeOut(t);
      const cy = y + 18 + Math.sin(a) * d * 0.4 * easeOut(t);
      const r = 3 + t * 6;
      g.fillStyle(this.tint(INK.paper), (1 - t));
      g.fillCircle(cx, cy, r);
      g.lineStyle(1.2, this.tint(INK.ink), (1 - t) * 0.8);
      g.strokeCircle(cx, cy, r);
    });
  }

  /** The anvil hits the floor: dust ring, cracks and a camera thump. */
  anvilImpact(x: number, y: number, r: number): void {
    this.scene.cameras.main.shake(180, 0.006);
    this.anim(3.4, 600, (g, t) => {
      g.lineStyle(4 * (1 - t) + 1, this.tint(INK.ink), 1 - t);
      g.strokeEllipse(x, y + 8, (r * 0.6 + easeOut(t) * r * 1.4) * 2, (r * 0.25 + easeOut(t) * r * 0.5) * 2);
      g.lineStyle(2, this.tint(INK.ink), (1 - t) * 0.9);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * 16, y + 10 + Math.sin(a) * 6);
        g.lineTo(x + Math.cos(a + 0.12) * r * 0.6, y + 10 + Math.sin(a + 0.12) * r * 0.24);
        g.lineTo(x + Math.cos(a - 0.08) * r * 0.95, y + 10 + Math.sin(a - 0.08) * r * 0.38);
        g.strokePath();
      }
    });
    this.dust(x, y + 10, 7, r);
  }

  /** Hammerspace: the anvil being hauled out from behind the back — a little dust and a strain. */
  strain(x: number, y: number): void {
    this.anim(9, 260, (g, t) => {
      g.lineStyle(1.6, this.tint(INK.ink), 1 - t);
      for (const side of [-1, 1]) {
        const sx = x + side * 22;
        g.lineBetween(sx, y - 26 - t * 6, sx + side * 6, y - 32 - t * 6);
        g.lineBetween(sx + side * 4, y - 22 - t * 6, sx + side * 10, y - 26 - t * 6);
      }
    });
  }

  /** Doombringer GET: rays fanning out behind the raised item, and a sparkle. */
  itemGet(x: number, y: number, ms: number): void {
    this.anim(17.5, ms, (g, t) => {
      const al = t < 0.1 ? t / 0.1 : t > 0.85 ? (1 - t) / 0.15 : 1;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 1.2;
        const w = 0.11;
        g.fillStyle(this.tint(i % 2 ? INK.white : INK.grayLit), al * 0.55);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a - w) * 140, y + Math.sin(a - w) * 140);
        g.lineTo(x + Math.cos(a + w) * 140, y + Math.sin(a + w) * 140);
        g.closePath();
        g.fillPath();
      }
      g.fillStyle(this.tint(INK.white), al);
      g.fillCircle(x, y, 18 + Math.sin(t * 30) * 2);
    });
  }

  /** A card off the tray (Q+) hits: a big KA-BLAM. */
  cardBlast(x: number, y: number, r: number): void {
    this.burst(x, y, r);
    this.anim(8.5, 420, (g, t) => {
      g.lineStyle(3 * (1 - t), this.tint(INK.ink), 1 - t);
      g.strokeCircle(x, y, r * (0.5 + easeOut(t)));
    });
  }

  /** Foux World opening/closing: an iris wipe ring round the caster. */
  iris(x: number, y: number, closing: boolean): void {
    this.anim(19, 520, (g, t) => {
      const u = closing ? 1 - t : t;
      g.lineStyle(14 * (1 - t) + 2, this.tint(INK.ink), 1 - t);
      g.strokeCircle(x, y, 40 + easeOut(u) * 700);
    });
  }

  /** Yanked back onto the set: a stretched spring line and a BOING. */
  yank(fromX: number, fromY: number, toX: number, toY: number): void {
    this.anim(9, 380, (g, t) => {
      const n = 14;
      g.lineStyle(2 * (1 - t) + 0.5, this.tint(INK.ink), 1 - t);
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const px = fromX + (toX - fromX) * u;
        const py = fromY + (toY - fromY) * u;
        const wob = (i % 2 ? 1 : -1) * 7 * (1 - t);
        const ang = Math.atan2(toY - fromY, toX - fromX);
        const ox = px - Math.sin(ang) * wob;
        const oy = py + Math.cos(ang) * wob;
        if (i === 0) g.moveTo(ox, oy); else g.lineTo(ox, oy);
      }
      g.strokePath();
    });
    this.word(toX, toY - 30, 'BOING!', 12, 0);
  }
}

const INK_AVATAR: AvatarSpec = {
  hands: [
    { r: 8.4, color: INK.ink, alpha: 1 },
    { r: 7, color: INK.white, alpha: 1 },
    { r: 2.4, color: INK.shade, alpha: 0.9, ox: 1.8, oy: 2 },
  ],
  eyeWhite: INK.white,
  eyePupil: INK.ink,
  // Rubber hose: very stretchy hands.
  squash: { div: 10, x: 0.75, y: 0.4 },
};

/**
 * The rubber-hose toon: the baked `elem-ink` gloss-black orb, a wide white grin and pie-cut
 * pupils; a little bowler hat on the crown; white gloves, and the right one always making a
 * finger gun along the aim (it kicks on every shot).
 *
 * `setRunning` spins a blur of legs under the body while Skedaddle charges; `setSpin` tumbles the
 * hat and grin while it bounces. The anvil, when there is one, is the kit's — the rig holds its
 * hands up under it (`brace`).
 *
 * Mastered (no mastery yet, the tell is ready): the bowler becomes a tall top hat with a white
 * band and two stars orbit it.
 */
export class InkAvatar extends BaseAvatar {
  private run = 0;
  private runTarget = 0;
  private spin = 0;
  private recoil = 0;
  /** No finger gun while the hand is away (Click+) or the anvil is up. */
  private gunHand = true;
  /** Doombringer: the right hand holds the banana gun instead. */
  private doom = false;
  private squish = 0;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, INK_AVATAR);
  }

  setRunning(on: boolean): void { this.runTarget = on ? 1 : 0; }
  setSpin(rate: number): void { this.spin += rate; }
  setGunHand(on: boolean): void { this.gunHand = on; }
  setDoombringer(on: boolean): void { this.doom = on; }
  /** A shot's recoil kick on the gun hand. */
  shoot(): void { this.recoil = 1; this.squish = 0.6; }
  /** A cartoon squash-and-stretch pop on the body (landings, casts). */
  pop(): void { this.squish = 1; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.run += (this.runTarget - this.run) * Math.min(1, delta / 120);
    this.recoil = Math.max(0, this.recoil - delta / 120);
    this.squish = Math.max(0, this.squish - delta / 260);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (rim) => rim.setRadius(on ? 9.6 : 8.4));
  }

  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold === 'brace') {
      // Both hands straight up, holding the anvil over the head, trembling.
      return { ang: -Math.PI / 2 + side * 0.42 + (Math.random() - 0.5) * 0.06, dist: 30, scale: idle.scale * 1.05 };
    }
    if (hold === 'ride') {
      // Arms pumping like a sprinter's while the legs spin.
      const pump = Math.sin(this.t * 26 + (side > 0 ? Math.PI : 0));
      return { ang: this.facing + Math.PI * 0.5 * side + pump * 0.9, dist: 22 + pump * 4, scale: idle.scale };
    }
    return null;
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    // A hard cartoon floor shadow, squashed with the body.
    const sq = this.squish * 0.25;
    g.fillStyle(this.tint(INK.ink), alpha * 0.32);
    g.fillEllipse(x, y + 20, 44 * (1 + sq), 12);
    if (this.run > 0.05) {
      // The blur of legs: a figure-eight whirl under the body.
      const r = this.run;
      g.lineStyle(2.2, this.tint(INK.ink), alpha * r);
      for (let i = 0; i < 3; i++) {
        const ph = this.t * 30 + i * 2.1;
        g.beginPath();
        for (let k = 0; k <= 16; k++) {
          const u = (k / 16) * TAU;
          const px = x + Math.sin(u + ph) * 13;
          const py = y + 18 + Math.sin(2 * u + ph) * 5;
          if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      g.fillStyle(this.tint(INK.ink), alpha * r);
      for (const side of [-1, 1]) {
        const ph = this.t * 30 + (side > 0 ? Math.PI : 0);
        g.fillEllipse(x + Math.sin(ph) * 13, y + 22 + Math.cos(ph) * 3, 9, 5);
      }
    }
  }

  /** The grin and the pie-cut wedges on the pupils — over the sprite, under the eyes. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const lx = Math.cos(this.facing) * 2.2;
    const ly = Math.sin(this.facing) * 1.6;
    const wide = 1 + this.squish * 0.2;
    // A big white crescent grin with a tongue.
    g.fillStyle(this.tint(INK.white), alpha);
    g.beginPath();
    g.arc(x + lx, y + 4 + ly, 8.5 * wide, 0.15, Math.PI - 0.15, false);
    g.arc(x + lx, y + 1 + ly, 7.2 * wide, Math.PI - 0.3, 0.3, true);
    g.closePath();
    g.fillPath();
    g.fillStyle(this.tint(INK.grayLit), alpha);
    g.fillEllipse(x + lx + 2, y + 10.5 + ly, 6, 3);
    // A gloss streak on the ink.
    g.fillStyle(this.tint(INK.white), alpha * 0.35);
    g.fillEllipse(x - 9, y - 11, 7, 4);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    // Pie-cut pupils: a small white wedge notched out of each pupil (eyes sit at the BaseAvatar spots).
    const look = this.facing;
    const bob = Math.sin(this.t * 2.6) * 1.1;
    for (const side of [-1, 1]) {
      const ex = x + side * 7.2 + Math.cos(look) * 2.4 + Math.cos(look) * 1.8;
      const ey = y - 4 + Math.sin(look) * 2.0 + bob + Math.sin(look) * 1.6;
      g.fillStyle(this.tint(INK.white), alpha);
      g.slice(ex, ey, 2.3, -Math.PI * 0.42, -Math.PI * 0.12, false);
      g.fillPath();
    }
    this.drawHat(g, x, y, alpha);
    // The gun hand: a finger gun pointed down the aim (or the banana gun, with Doombringer).
    if (this.gunHand && this.hold !== 'brace' && this.hold !== 'ride') {
      const hx = this.armX[1];
      const hy = this.armY[1];
      if (this.doom) {
        this.drawBananaGun(g, hx, hy, this.facing, alpha);
      } else {
        glove(g, this.tint, hx, hy, this.facing, 'gun', 0.85, alpha, this.recoil);
      }
    }
  }

  private drawHat(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const tilt = -0.18 + Math.sin(this.spin) * 0.5 + Math.sin(this.t * 2) * 0.03;
    const hop = this.squish * -4;
    const P = (px: number, py: number) => {
      const c = Math.cos(tilt);
      const s = Math.sin(tilt);
      return new Phaser.Math.Vector2(x + 3 + px * c - py * s, y - 18 + hop + px * s + py * c);
    };
    const top = this.mastered ? 18 : 9;
    // Brim.
    g.fillStyle(this.tint(INK.white), alpha);
    g.fillPoints([P(-15, 1.5), P(15, 1.5), P(15, -2.5), P(-15, -2.5)], true);
    g.fillStyle(this.tint(INK.ink), alpha);
    g.fillPoints([P(-13.5, 0.5), P(13.5, 0.5), P(13.5, -1.5), P(-13.5, -1.5)], true);
    // Crown: a dome for the bowler, a tall drum for the mastered top hat.
    const crown = this.mastered
      ? [P(-9, -1), P(-9, -top), P(9, -top), P(9, -1)]
      : [P(-9, -1), P(-8.5, -5), P(-5.5, -top + 1), P(0, -top - 1), P(5.5, -top + 1), P(8.5, -5), P(9, -1)];
    g.fillStyle(this.tint(INK.white), alpha);
    g.fillPoints(crown.map((p) => new Phaser.Math.Vector2(p.x, p.y - 1)), true);
    g.fillStyle(this.tint(INK.ink), alpha);
    g.fillPoints(crown, true);
    // The band.
    g.fillStyle(this.tint(this.mastered ? INK.white : INK.grayLit), alpha);
    g.fillPoints([P(-9, -1.5), P(9, -1.5), P(9, -4), P(-9, -4)], true);
    if (this.mastered) {
      for (let i = 0; i < 2; i++) {
        const sa = this.t * 2.4 + i * Math.PI;
        const c = P(Math.cos(sa) * 16, -top * 0.6 + Math.sin(sa) * 4);
        const pts: Phaser.Math.Vector2[] = [];
        for (let k = 0; k < 10; k++) {
          const rr = k % 2 ? 1.6 : 3.8;
          const pa = -Math.PI / 2 + (k / 10) * TAU;
          pts.push(new Phaser.Math.Vector2(c.x + Math.cos(pa) * rr, c.y + Math.sin(pa) * rr));
        }
        outlined(g, this.tint, pts, INK.white, alpha, 1);
      }
    }
  }

  /** The Doombringer: a stubby black blunderbuss with a banana sticking out of the bell. */
  private drawBananaGun(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, alpha: number): void {
    const k = this.recoil * 3;
    const P = (f: number, s: number) => along(x, y, ang, f - k, s);
    outlined(g, this.tint, [P(-6, -4), P(14, -5), P(20, -9), P(22, -9), P(22, 9), P(20, 9), P(14, 5), P(-6, 4)], INK.ink, alpha, 1.5);
    g.lineStyle(1.4, this.tint(INK.white), alpha * 0.8);
    const b0 = P(0, -2.5); const b1 = P(14, -3.5);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
    bananaShot(g, this.tint, P(25, 0).x, P(25, 0).y, ang + Math.PI / 2, alpha);
    glove(g, this.tint, x, y, ang, 'fist', 0.75, alpha);
  }
}
