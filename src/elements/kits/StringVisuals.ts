import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * String's look: a big velvet-black spider — eight jointed legs that step as it walks, a swollen
 * abdomen behind it with a cream hourglass, a cluster of red eyes and a pair of fangs. Its strings
 * are heavy cream silk with a brass fish-hook on the end, drawn taut; the Hexing Strand is thick purple cord threaded
 * with glowing beads; its spiders are big, black and velvet, with a cream hourglass on the back;
 * the Linen Tomb is a silk cocoon on four guy-lines.
 *
 * Every painter takes a `ColorFn` so a skin can recolour it, and the previews call the same ones.
 */

export const STRING = {
  ink: 0x1a1410,
  silk: 0xf2ece0,
  silkShade: 0xbdb19c,
  silkDeep: 0x8c7f6a,
  silkGlow: 0xffffff,
  wood: 0xd9b98a,
  woodLit: 0xf0d6ac,
  woodDark: 0x9a7448,
  woodGrain: 0x7a5634,
  cheek: 0xe07a6e,
  brass: 0xd9a441,
  brassLit: 0xffe08a,
  hex: 0x9b3dff,
  hexDeep: 0x4e1590,
  hexGlow: 0xd4a6ff,
  spider: 0x1f1822,
  spiderLit: 0x463a4e,
  spiderMark: 0xeadfc8,
  spiderEye: 0xff3348,
  spiderHair: 0x6a5874,
  snap: 0xfff4c8,
  strain: 0xff6a4a,
  blood: 0xc8243a,
  // Click+ Metal Spool.
  steel: 0x9aa6b4,
  steelDark: 0x3c444e,
  steelLit: 0xeef4fa,
  spark: 0xffd27a,
  // F+ Puppet Play: their own ability, turned on them.
  backfire: 0xff2a3a,
  backfireHot: 0xffb0a8,
  // Q+ Spinal Snap: the bloodless dead hanging in the web.
  corpse: 0x9a9a9a,
  rot: 0x6e7068,
};

export type StringColorFn = ColorFn;

export interface Pt { x: number; y: number }

/** A rope drawn through its nodes: a dark underside, the twine, a twist of highlight. */
export function ropeLine(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Pt[], width: number, alpha: number, strain = 0,
): void {
  if (pts.length < 2) return;
  const body = strain > 0.05 ? lerpColor(STRING.silk, STRING.strain, Math.min(1, strain) * 0.7) : STRING.silk;
  g.lineStyle(width + 2, tint(STRING.ink), alpha * 0.55);
  g.strokePoints(pts, false);
  g.lineStyle(width, tint(body), alpha);
  g.strokePoints(pts, false);
  // The twist: short dark ticks laid diagonally along the twine.
  g.lineStyle(1, tint(STRING.silkDeep), alpha * 0.7);
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) continue;
    const ux = dx / len;
    const uy = dy / len;
    for (let d = carry; d < len; d += 9) {
      const px = a.x + ux * d;
      const py = a.y + uy * d;
      const h = width * 0.5;
      g.lineBetween(px - uy * h - ux * 1.5, py + ux * h - uy * 1.5, px + uy * h + ux * 1.5, py - ux * h + uy * 1.5);
    }
    carry = ((carry - len) % 9 + 9) % 9;
  }
}

/** The Hexing Strand: thick purple cord, a glow round it and beads of light running its length. */
export function hexRope(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Pt[], t: number, alpha: number, cracked: number,
): void {
  if (pts.length < 2) return;
  g.lineStyle(16, tint(STRING.hex), alpha * (0.14 + 0.06 * Math.sin(t * 5)));
  g.strokePoints(pts, false);
  g.lineStyle(9, tint(STRING.hexDeep), alpha);
  g.strokePoints(pts, false);
  g.lineStyle(5, tint(STRING.hex), alpha);
  g.strokePoints(pts, false);
  g.lineStyle(1.5, tint(STRING.hexGlow), alpha * 0.85);
  g.strokePoints(pts, false);
  // Beads that crawl down the cord toward whatever it is tied to.
  const total = polyLength(pts);
  for (let i = 0; i < 6; i++) {
    const at = ((t * 70 + i * (total / 6)) % total + total) % total;
    const p = pointAlong(pts, at);
    g.fillStyle(tint(STRING.hexGlow), alpha * 0.9);
    g.fillCircle(p.x, p.y, 2.6);
    g.fillStyle(tint(STRING.silkGlow), alpha);
    g.fillCircle(p.x - 0.6, p.y - 0.6, 1);
  }
  // Each shot it has eaten frays it: a tuft of torn fibre at a fixed spot.
  for (let i = 0; i < cracked; i++) {
    const p = pointAlong(pts, total * (0.3 + i * 0.22));
    g.lineStyle(1.4, tint(STRING.hexGlow), alpha);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.6 + i;
      g.lineBetween(p.x, p.y, p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7);
    }
  }
}

/** The tomb's guy-lines: plain silk, thinner, no hook. */
export function silkLine(g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Pt[], alpha: number): void {
  if (pts.length < 2) return;
  g.lineStyle(4, tint(STRING.silkGlow), alpha * 0.18);
  g.strokePoints(pts, false);
  g.lineStyle(2, tint(STRING.silk), alpha * 0.9);
  g.strokePoints(pts, false);
}

/** The brass fish-hook on a string's tip, pointing the way it flies. */
export function hookTip(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, alpha: number, purple = false): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (px: number, py: number): Pt => ({ x: x + px * c - py * s, y: y + px * s + py * c });
  const metal = purple ? STRING.hexGlow : STRING.brass;
  g.lineStyle(2.6, tint(STRING.ink), alpha * 0.8);
  g.strokePoints([P(-6, 0), P(5, 0), P(8, 3), P(6, 6), P(3, 5)], false);
  g.lineStyle(1.6, tint(metal), alpha);
  g.strokePoints([P(-6, 0), P(5, 0), P(8, 3), P(6, 6), P(3, 5)], false);
  g.fillStyle(tint(STRING.brassLit), alpha);
  g.fillCircle(P(-6, 0).x, P(-6, 0).y, 1.6);
}

/** Where a string bites a wall: a brass tack with the twine wound round it. */
export function wallTack(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, alpha: number, purple = false): void {
  g.fillStyle(tint(STRING.ink), alpha * 0.5);
  g.fillCircle(x + 1, y + 1.5, 5);
  g.fillStyle(tint(purple ? STRING.hexDeep : STRING.brass), alpha);
  g.fillCircle(x, y, 4.2);
  g.fillStyle(tint(purple ? STRING.hexGlow : STRING.brassLit), alpha);
  g.fillCircle(x - 1.2, y - 1.2, 1.5);
  g.lineStyle(1.4, tint(purple ? STRING.hex : STRING.silk), alpha);
  g.strokeCircle(x, y, 6);
}

/**
 * Where a hook has bitten a body: a wad of silk stuck to the skin at the exact spot, with the
 * hook's barb showing and a few strands splayed back along the line.
 */
export function hitKnot(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, toward: number, alpha: number, purple = false): void {
  const col = purple ? STRING.hex : STRING.silk;
  g.lineStyle(1, tint(purple ? STRING.hexGlow : STRING.silkShade), alpha * 0.9);
  for (const o of [-0.5, 0, 0.5]) {
    g.lineBetween(x, y, x + Math.cos(toward + o) * 7, y + Math.sin(toward + o) * 7);
  }
  g.fillStyle(tint(STRING.ink), alpha * 0.5);
  g.fillCircle(x + 0.8, y + 1, 4.2);
  g.fillStyle(tint(col), alpha);
  g.fillCircle(x, y, 3.6);
  g.fillStyle(tint(purple ? STRING.hexGlow : STRING.brass), alpha);
  g.fillCircle(x - Math.cos(toward) * 1.6, y - Math.sin(toward) * 1.6, 1.4);
}

/** The loop a string is knotted round a body with. */
export function bodyKnot(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, toward: number, alpha: number, purple = false): void {
  const col = purple ? STRING.hex : STRING.silk;
  g.lineStyle(2.2, tint(STRING.ink), alpha * 0.4);
  g.strokeEllipse(x, y + 3, r * 2 + 6, r * 1.1 + 5);
  g.lineStyle(1.8, tint(col), alpha);
  g.strokeEllipse(x, y + 2, r * 2 + 4, r * 1.1 + 3);
  const kx = x + Math.cos(toward) * (r + 2);
  const ky = y + 2 + Math.sin(toward) * (r * 0.55 + 1.5);
  g.fillStyle(tint(col), alpha);
  g.fillCircle(kx, ky, 3.2);
  g.fillStyle(tint(purple ? STRING.hexDeep : STRING.silkDeep), alpha);
  g.fillCircle(kx + 0.8, ky + 0.8, 1.3);
}

/**
 * One of the big spiders. `phase` drives the walk: the legs step in two alternating sets of four.
 * `frenzy` (a spider whose string has gone) bristles the legs and reddens the eyes.
 */
export function spiderBody(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, phase: number, scale: number,
  alpha: number, frenzy = false,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const k = scale;
  const P = (px: number, py: number): Pt => ({ x: x + (px * c - py * s) * k, y: y + (px * s + py * c) * k });
  // Shadow.
  g.fillStyle(tint(STRING.ink), alpha * 0.35);
  g.fillEllipse(x + 2, y + 4, 26 * k, 16 * k);
  // Legs: four a side, two segments each, the knee raised outward.
  const legBase = [-3.5, -1, 1.5, 4];
  const legSpread = [-0.95, -0.35, 0.3, 0.9];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const set = (i + (side > 0 ? 1 : 0)) % 2;
      const step = Math.sin(phase * 2 + set * Math.PI) * (frenzy ? 0.42 : 0.28);
      const a = side * (Math.PI / 2) + legSpread[i] * side * -1 + step * side;
      const hip = P(legBase[i] - 1, side * 3.5);
      const kneeR = frenzy ? 12 : 10.5;
      const knee = P(legBase[i] - 1 + Math.cos(a) * kneeR * 0.75, side * 3.5 + Math.sin(a) * kneeR * 0.75 + side * 2);
      // The shin bends back down from the knee, toward the way the spider walks.
      const dir = Math.atan2(knee.y - hip.y, knee.x - hip.x);
      const foot = { x: knee.x + Math.cos(dir + side * 0.75) * 9 * k, y: knee.y + Math.sin(dir + side * 0.75) * 9 * k };
      g.lineStyle(2.4 * k, tint(STRING.spider), alpha);
      g.lineBetween(hip.x, hip.y, knee.x, knee.y);
      g.lineStyle(1.6 * k, tint(STRING.spider), alpha);
      g.lineBetween(knee.x, knee.y, foot.x, foot.y);
      g.fillStyle(tint(STRING.spiderLit), alpha);
      g.fillCircle(knee.x, knee.y, 1.2 * k);
    }
  }
  // Abdomen, behind, with the hourglass.
  const ab = P(-8, 0);
  g.fillStyle(tint(STRING.spider), alpha);
  g.fillEllipse(ab.x, ab.y, 17 * k, 17 * k);
  g.fillStyle(tint(STRING.spiderLit), alpha * 0.9);
  g.fillEllipse(P(-9.5, -2.5).x, P(-9.5, -2.5).y, 7 * k, 5 * k);
  const h0 = P(-11.5, 0);
  const h1 = P(-4.5, 0);
  g.fillStyle(tint(frenzy ? STRING.blood : STRING.spiderMark), alpha);
  g.fillTriangle(h0.x, h0.y, P(-8, -2.6).x, P(-8, -2.6).y, P(-8, 2.6).x, P(-8, 2.6).y);
  g.fillTriangle(h1.x, h1.y, P(-8, -2.6).x, P(-8, -2.6).y, P(-8, 2.6).x, P(-8, 2.6).y);
  // Head and fangs.
  const hd = P(2.5, 0);
  g.fillStyle(tint(STRING.spider), alpha);
  g.fillCircle(hd.x, hd.y, 6 * k);
  const f0 = P(8, -2);
  const f1 = P(8, 2);
  g.lineStyle(1.6 * k, tint(STRING.spiderMark), alpha);
  g.lineBetween(P(6.5, -1.5).x, P(6.5, -1.5).y, f0.x, f0.y);
  g.lineBetween(P(6.5, 1.5).x, P(6.5, 1.5).y, f1.x, f1.y);
  // Eight eyes in two rows.
  g.fillStyle(tint(STRING.spiderEye), alpha);
  for (const [ex, ey, r] of [[5, -1.8, 1.3], [5, 1.8, 1.3], [5.8, -0.6, 1], [5.8, 0.6, 1], [3.6, -3, 0.8], [3.6, 3, 0.8], [4.2, -2.3, 0.7], [4.2, 2.3, 0.7]]) {
    const e = P(ex, ey);
    g.fillCircle(e.x, e.y, r * k * (frenzy ? 1.25 : 1));
  }
}

/** Marionette's control bar: a wooden cross with a peg at each tip. */
export function controlBar(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, scale: number, alpha: number): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (px: number, py: number): Pt => ({ x: x + (px * c - py * s) * scale, y: y + (px * s + py * c) * scale });
  const bar = (x0: number, y0: number, x1: number, y1: number, w: number): void => {
    const a = P(x0, y0);
    const b = P(x1, y1);
    g.lineStyle(w + 2, tint(STRING.woodGrain), alpha);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(w, tint(STRING.wood), alpha);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1, tint(STRING.woodLit), alpha * 0.9);
    g.lineBetween(a.x, a.y - 0.8, b.x, b.y - 0.8);
  };
  bar(-14, 0, 14, 0, 4 * scale);
  bar(0, -9, 0, 9, 3.4 * scale);
  for (const [px, py] of [[-14, 0], [14, 0], [0, -9], [0, 9]]) {
    const p = P(px, py);
    g.fillStyle(tint(STRING.woodDark), alpha);
    g.fillCircle(p.x, p.y, 2.4 * scale);
    g.fillStyle(tint(STRING.brassLit), alpha);
    g.fillCircle(p.x, p.y, 1 * scale);
  }
}

/** A puppet: the control bar hovering over the victim and four lines down to it. */
export function puppetRig(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, steering: boolean, alpha: number,
): void {
  const bx = x + Math.sin(t * 2.1) * 3;
  const by = y - r - 34 + Math.sin(t * 3.3) * 2;
  const tilt = Math.sin(t * 1.7) * 0.18;
  const tips = [[-14, 0], [14, 0], [0, -9], [0, 9]].map(([px, py]) => ({
    x: bx + px * Math.cos(tilt) - py * Math.sin(tilt),
    y: by + px * Math.sin(tilt) + py * Math.cos(tilt),
  }));
  const limbs = [
    { x: x - r * 0.95, y: y + 1 }, { x: x + r * 0.95, y: y + 1 },
    { x: x, y: y - r * 0.85 }, { x: x, y: y + r * 0.8 },
  ];
  for (let i = 0; i < 4; i++) {
    g.lineStyle(1.2, tint(steering ? STRING.brassLit : STRING.silk), alpha * (steering ? 1 : 0.8));
    g.lineBetween(tips[i].x, tips[i].y, limbs[i].x, limbs[i].y);
    g.fillStyle(tint(STRING.silk), alpha);
    g.fillCircle(limbs[i].x, limbs[i].y, 1.6);
  }
  controlBar(g, tint, bx, by, tilt, 1, alpha);
}

/**
 * The Linen Tomb: a cocoon of wound silk round the victim. `torn` 0..1 is how much of its HP is
 * gone — the wraps split and the dark inside shows through as it climbs.
 */
export function cocoon(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, torn: number, t: number, alpha: number,
): void {
  const w = r * 2.3;
  const h = r * 2.7;
  g.fillStyle(tint(STRING.ink), alpha * 0.35);
  g.fillEllipse(x + 3, y + h * 0.42, w * 1.05, h * 0.3);
  g.fillStyle(tint(STRING.silkShade), alpha);
  g.fillEllipse(x, y, w, h);
  g.fillStyle(tint(STRING.silk), alpha);
  g.fillEllipse(x - 2, y - 2, w * 0.86, h * 0.88);
  g.fillStyle(tint(STRING.silkGlow), alpha * 0.6);
  g.fillEllipse(x - w * 0.16, y - h * 0.18, w * 0.3, h * 0.36);
  // The windings: diagonal bands across the cocoon, each kept inside the oval.
  g.lineStyle(1.3, tint(STRING.silkDeep), alpha * 0.75);
  for (let i = -5; i <= 5; i++) {
    const yy = y + i * (h / 12) + Math.sin(t * 0.8 + i) * 0.6;
    const half = (w / 2) * Math.sqrt(Math.max(0, 1 - ((yy - y) / (h / 2)) ** 2));
    if (half < 2) continue;
    g.lineBetween(x - half * 0.95, yy + half * 0.18, x + half * 0.95, yy - half * 0.18);
  }
  // Tears: dark slits that open as the tomb loses HP.
  const slits = Math.round(torn * 6);
  for (let i = 0; i < slits; i++) {
    const a = i * 2.3 + 0.7;
    const sx = x + Math.cos(a) * w * 0.26;
    const sy = y + Math.sin(a) * h * 0.28;
    const len = 6 + torn * 8;
    g.fillStyle(tint(STRING.ink), alpha * 0.9);
    g.fillEllipse(sx, sy, 3 + torn * 3, len);
    g.lineStyle(1, tint(STRING.silkGlow), alpha);
    g.lineBetween(sx - 3, sy - len / 2, sx - 6, sy - len / 2 - 3);
    g.lineBetween(sx + 3, sy + len / 2, sx + 6, sy + len / 2 + 3);
  }
}

/**
 * Click+ Metal Spool's string: braided steel wire — a dark core, a cold bright body, a running glint
 * and the braid's crossings. `strain` heats it toward red; each shot it has stopped leaves a bright
 * notch (`dents`, up to 12) at a fixed spot along it.
 */
export function metalLine(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, pts: Pt[], t: number, alpha: number, strain: number, dents: number,
): void {
  if (pts.length < 2) return;
  const body = strain > 0.05 ? lerpColor(STRING.steel, STRING.strain, Math.min(1, strain) * 0.75) : STRING.steel;
  g.lineStyle(6.5, tint(STRING.ink), alpha * 0.6);
  g.strokePoints(pts, false);
  g.lineStyle(4.4, tint(STRING.steelDark), alpha);
  g.strokePoints(pts, false);
  g.lineStyle(2.8, tint(body), alpha);
  g.strokePoints(pts, false);
  // The braid: alternating crossings every 7px.
  const total = polyLength(pts);
  g.lineStyle(1.1, tint(STRING.steelDark), alpha * 0.85);
  for (let d = 4, i = 0; d < total - 2; d += 7, i++) {
    const p = pointAlong(pts, d);
    const nx = -Math.sin(p.ang);
    const ny = Math.cos(p.ang);
    const ux = Math.cos(p.ang);
    const uy = Math.sin(p.ang);
    const s = i % 2 ? 1 : -1;
    g.lineBetween(p.x + nx * 2 * s - ux * 2, p.y + ny * 2 * s - uy * 2, p.x - nx * 2 * s + ux * 2, p.y - ny * 2 * s + uy * 2);
  }
  // A glint that runs the wire.
  const at = ((t * 260) % total + total) % total;
  for (let k = 0; k < 3; k++) {
    const p = pointAlong(pts, at - k * 5);
    g.fillStyle(tint(STRING.steelLit), alpha * (0.9 - k * 0.28));
    g.fillCircle(p.x, p.y, 1.9 - k * 0.4);
  }
  for (let i = 0; i < dents; i++) {
    const p = pointAlong(pts, total * (0.12 + ((i * 0.37) % 0.76)));
    g.fillStyle(tint(STRING.spark), alpha);
    g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
}

/**
 * The spool winding in the spider's hand while click is held: two steel cheeks, wire wrapping on
 * as `k` climbs 0→1, and a ring that closes round it the moment it fires.
 */
export function spoolCharge(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, k: number, t: number, alpha: number): void {
  const r = 6 + k * 4;
  const spin = t * (4 + k * 14);
  g.fillStyle(tint(STRING.ink), alpha * 0.4);
  g.fillCircle(x + 1, y + 2, r + 4);
  // The wire already on it.
  g.fillStyle(tint(STRING.steelDark), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(STRING.steel), alpha);
  g.fillCircle(x, y, r * (0.45 + k * 0.5));
  g.lineStyle(1, tint(STRING.steelLit), alpha * 0.8);
  for (let i = 0; i < 3; i++) g.strokeCircle(x, y, r * (0.4 + k * 0.5) * (0.5 + i * 0.22));
  // The cheeks, turning.
  g.lineStyle(2, tint(STRING.steelLit), alpha);
  for (let i = 0; i < 4; i++) {
    const a = spin + (i * Math.PI) / 2;
    g.lineBetween(x + Math.cos(a) * 2, y + Math.sin(a) * 2, x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2));
  }
  g.fillStyle(tint(STRING.brassLit), alpha);
  g.fillCircle(x, y, 1.8);
  // The countdown ring.
  g.lineStyle(2.2, tint(k >= 0.999 ? STRING.spark : STRING.steelLit), alpha * 0.9);
  g.beginPath();
  g.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * k);
  g.strokePath();
}

/** E+ Bewitched Spiders: a wad of hexed web in flight, trailing threads. */
export function webWad(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, t: number, alpha: number): void {
  const bx = -Math.cos(ang);
  const by = -Math.sin(ang);
  g.lineStyle(1.2, tint(STRING.hexGlow), alpha * 0.7);
  for (let i = -1; i <= 1; i++) {
    const w = Math.sin(t * 30 + i * 2) * 3;
    g.lineBetween(x, y, x + bx * 16 - by * (i * 4 + w), y + by * 16 + bx * (i * 4 + w));
  }
  g.fillStyle(tint(STRING.hex), alpha * 0.35);
  g.fillCircle(x, y, 8);
  g.fillStyle(tint(STRING.silk), alpha);
  g.fillCircle(x, y, 5);
  g.fillStyle(tint(STRING.hexGlow), alpha);
  g.fillCircle(x - 1.5, y - 1, 2.4);
  g.lineStyle(1, tint(STRING.silkDeep), alpha);
  g.strokeCircle(x, y, 5);
}

/** A Bewitched spider's mark: a purple halo under it, so a small spitter reads apart from a biter. */
export function bewitchedHalo(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number): void {
  g.fillStyle(tint(STRING.hex), alpha * (0.22 + 0.08 * Math.sin(t * 6)));
  g.fillCircle(x, y, 15);
  g.lineStyle(1.2, tint(STRING.hexGlow), alpha * 0.7);
  g.strokeCircle(x, y, 11 + Math.sin(t * 6) * 1.5);
}

/**
 * Q+ Spinal Snap's web over the arena `b`: a faint wheel from the middle out to the walls, heavy
 * corner webs and silk garlands sagging off every wall. `torn` 0..1 drops spokes and threads as
 * the web loses HP; `flash` brightens it the moment it is hit.
 */
export function webCover(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, b: { left: number; right: number; top: number; bottom: number },
  torn: number, flash: number, alpha: number,
): void {
  const cx = (b.left + b.right) / 2;
  const cy = (b.top + b.bottom) / 2;
  const gone = (i: number): boolean => ((i * 0.6180339) % 1) < torn * 0.75;
  // The wheel: spokes to the walls, rings joining them.
  const SPOKES = 18;
  const rays: { x: number; y: number; len: number }[] = [];
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * TAU + 0.09;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const tx = dx > 0 ? (b.right - cx) / dx : dx < 0 ? (b.left - cx) / dx : Infinity;
    const ty = dy > 0 ? (b.bottom - cy) / dy : dy < 0 ? (b.top - cy) / dy : Infinity;
    const d = Math.min(tx, ty);
    rays.push({ x: dx, y: dy, len: d });
  }
  const faint = alpha * (0.12 + flash * 0.25);
  g.lineStyle(1, tint(STRING.silk), faint);
  rays.forEach((r, i) => {
    if (!gone(i)) g.lineBetween(cx, cy, cx + r.x * r.len, cy + r.y * r.len);
  });
  for (let ring = 1; ring <= 9; ring++) {
    const rr = ring * 52;
    for (let i = 0; i < SPOKES; i++) {
      if (gone(ring * 31 + i)) continue;
      const r0 = rays[i];
      const r1 = rays[(i + 1) % SPOKES];
      if (rr > r0.len || rr > r1.len) continue;
      // Each thread sags a little toward the hub, as real orb-web threads do.
      const x0 = cx + r0.x * rr, y0 = cy + r0.y * rr;
      const x1 = cx + r1.x * rr, y1 = cy + r1.y * rr;
      const mx = (x0 + x1) / 2 + (cx - (x0 + x1) / 2) * 0.05;
      const my = (y0 + y1) / 2 + (cy - (y0 + y1) / 2) * 0.05;
      g.strokePoints([{ x: x0, y: y0 }, { x: mx, y: my }, { x: x1, y: y1 }], false);
    }
  }
  // Corner webs: thick and plain to see.
  const heavy = alpha * (0.5 + flash * 0.4);
  const corners: [number, number, number][] = [
    [b.left, b.top, 0], [b.right, b.top, Math.PI / 2], [b.right, b.bottom, Math.PI], [b.left, b.bottom, Math.PI * 1.5],
  ];
  corners.forEach(([x, y, a0], ci) => {
    const spokes: Pt[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      spokes.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    g.lineStyle(2.4, tint(STRING.silk), heavy);
    spokes.forEach((s, i) => { if (!gone(ci * 7 + i + 400)) g.lineBetween(x, y, x + s.x * 170, y + s.y * 170); });
    g.lineStyle(1.6, tint(STRING.silkShade), heavy);
    for (let r = 26; r <= 160; r += 22) {
      for (let i = 0; i < spokes.length - 1; i++) {
        if (gone(ci * 97 + r + i)) continue;
        const p = spokes[i];
        const q = spokes[i + 1];
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        g.strokePoints([
          { x: x + p.x * r, y: y + p.y * r }, { x: x + mx * r * 0.9, y: y + my * r * 0.9 }, { x: x + q.x * r, y: y + q.y * r },
        ], false);
      }
    }
  });
  // Garlands: silk swags hanging off every wall.
  g.lineStyle(2, tint(STRING.silk), heavy * 0.85);
  const swag = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number, i: number): void => {
    if (gone(i + 700)) return;
    const pts: Pt[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const s = Math.sin(u * Math.PI) * 16;
      pts.push({ x: x0 + (x1 - x0) * u + nx * s, y: y0 + (y1 - y0) * u + ny * s });
    }
    g.strokePoints(pts, false);
  };
  const W = b.right - b.left;
  const H = b.bottom - b.top;
  const nx = Math.max(2, Math.round(W / 130));
  const ny = Math.max(2, Math.round(H / 130));
  for (let i = 0; i < nx; i++) {
    const x0 = b.left + (W / nx) * i;
    const x1 = x0 + W / nx;
    swag(x0, b.top + 2, x1, b.top + 2, 0, 1, i);
    swag(x0, b.bottom - 2, x1, b.bottom - 2, 0, -1, i + 50);
  }
  for (let i = 0; i < ny; i++) {
    const y0 = b.top + (H / ny) * i;
    const y1 = y0 + H / ny;
    swag(b.left + 2, y0, b.left + 2, y1, 1, 0, i + 100);
    swag(b.right - 2, y0, b.right - 2, y1, -1, 0, i + 150);
  }
}

/**
 * A dead body in the web, over its grey sprite: the thread it hangs from, and silk bound round it in
 * crossing bands, with a dark dried trickle at the bottom.
 */
export function corpseWrap(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, ax: number, ay: number, x: number, y: number, r: number, ang: number, alpha: number,
): void {
  g.lineStyle(1.4, tint(STRING.silk), alpha * 0.85);
  g.lineBetween(ax, ay, x, y - r);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  g.lineStyle(2.2, tint(STRING.silk), alpha * 0.9);
  for (let i = -2; i <= 2; i++) {
    const oy = i * r * 0.36;
    const half = r * Math.sqrt(Math.max(0, 1 - (oy / r) ** 2)) * 0.98;
    const tilt = (i % 2 ? 1 : -1) * r * 0.22;
    const p0 = { x: -half, y: oy - tilt };
    const p1 = { x: half, y: oy + tilt };
    g.lineBetween(x + p0.x * c - p0.y * s, y + p0.x * s + p0.y * c, x + p1.x * c - p1.y * s, y + p1.x * s + p1.y * c);
  }
  g.lineStyle(1, tint(STRING.silkDeep), alpha * 0.7);
  g.strokeCircle(x, y, r);
  g.fillStyle(tint(STRING.rot), alpha * 0.8);
  g.fillEllipse(x + s * r, y + c * r + 2, 3, 6);
}

/** The web's health, a strip of silk at the top of the arena. */
export function webBar(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, k: number, alpha: number): void {
  const w = 150;
  g.fillStyle(tint(STRING.ink), alpha * 0.8);
  g.fillRoundedRect(x - w / 2 - 3, y - 5, w + 6, 10, 4);
  g.fillStyle(tint(STRING.silkShade), alpha);
  g.fillRoundedRect(x - w / 2, y - 3, Math.max(0.5, w * k), 6, 3);
  g.lineStyle(1, tint(STRING.silkDeep), alpha);
  for (let i = 1; i < 10; i++) g.lineBetween(x - w / 2 + (w / 10) * i, y - 3, x - w / 2 + (w / 10) * i, y + 3);
}

/** The tomb's health, a strip of silk that unravels. */
export function tombBar(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, k: number, alpha: number): void {
  const w = 62;
  g.fillStyle(tint(STRING.ink), alpha * 0.85);
  g.fillRoundedRect(x - w / 2 - 2, y - 4, w + 4, 8, 3);
  g.fillStyle(tint(STRING.silk), alpha);
  g.fillRoundedRect(x - w / 2, y - 2.5, Math.max(0.5, w * k), 5, 2);
  g.lineStyle(1, tint(STRING.silkDeep), alpha);
  for (let i = 1; i < 5; i++) g.lineBetween(x - w / 2 + (w / 5) * i, y - 2.5, x - w / 2 + (w / 5) * i, y + 2.5);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function lerpColor(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * k);
  const gg = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (gg << 8) | bl;
}

export function polyLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return Math.max(1e-6, L);
}

/** The point `d` px along a polyline (clamped to its ends). */
export function pointAlong(pts: Pt[], d: number): Pt & { ang: number } {
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg || i === pts.length - 1) {
      const k = seg > 0 ? Math.min(1, left / seg) : 0;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= seg;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, ang: 0 };
}

/** A hanging rope between two points, for previews and for a string's first frame. */
export function sagPoints(x0: number, y0: number, x1: number, y1: number, sag: number, n = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    out.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag });
  }
  return out;
}

// ── The abdomen ──────────────────────────────────────────────────────────────

/**
 * The spider's abdomen, front lobe to tail: how far each lobe hangs behind the one before it, its
 * hit radius, and what a hit on it is multiplied by. Each lobe is a body of its own (see
 * `BodySection`), so a blast or a piercing shot bills the spider once per lobe it catches; the red
 * bulb on the end is the soft part.
 */
export const ABDOMEN: readonly { gap: number; r: number; mult: number }[] = [
  { gap: 46, r: 27, mult: 1 },
  { gap: 46, r: 23, mult: 3 },
];

/**
 * The abdomen as a dragged chain: each lobe stays a fixed length behind the one in front and
 * otherwise lies where it was left, so it trails the way the spider came from rather than
 * pointing away from the aim. The kit steps one per spider for the hitboxes and hands the rig the
 * same nodes; a rig with no kit behind it (a preview, a portrait) steps its own.
 */
export class AbdomenChain {
  readonly nodes: Pt[] = ABDOMEN.map(() => ({ x: Number.NaN, y: Number.NaN }));

  /** `away` — the way the tail lies when it is first laid out (radians). */
  step(x: number, y: number, away: number): void {
    let px = x;
    let py = y;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const gap = ABDOMEN[i].gap;
      let dx = n.x - px;
      let dy = n.y - py;
      let d = Math.hypot(dx, dy);
      if (!(d > 0.001)) { dx = Math.cos(away); dy = Math.sin(away); d = 1; }
      n.x = px + (dx / d) * gap;
      n.y = py + (dy / d) * gap;
      px = n.x;
      py = n.y;
    }
  }
}

// ── Fx ───────────────────────────────────────────────────────────────────────

export class StringFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn) { super(scene, tint); }

  /** A string leaves the hand: a crack of the wrist and a few loose fibres. */
  throwString(x: number, y: number, ang: number, purple = false): void {
    this.anim(8.5, 220, (g, t) => {
      g.lineStyle(2, this.tint(purple ? STRING.hexGlow : STRING.silk), (1 - t) * 0.9);
      for (let i = 0; i < 5; i++) {
        const a = ang + Math.PI + (i - 2) * 0.45;
        const d0 = 3 + t * 5;
        const d1 = 6 + easeOut(t) * 14;
        g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1);
      }
      g.lineStyle(1.5, this.tint(purple ? STRING.hex : STRING.silkShade), (1 - t) * 0.7);
      g.strokeCircle(x, y, 4 + t * 9);
    });
  }

  /** The hook bites: into a wall, a puff of grit; into a body, a tight ring. */
  bite(x: number, y: number, wall: boolean, purple = false): void {
    this.anim(9, 300, (g, t) => {
      const col = purple ? STRING.hexGlow : wall ? STRING.silkShade : STRING.silk;
      g.lineStyle(2, this.tint(col), (1 - t));
      g.strokeCircle(x, y, 5 + easeOut(t) * (wall ? 10 : 16));
      if (wall) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + 0.4;
          const d = easeOut(t) * 13;
          g.fillStyle(this.tint(STRING.woodDark), 1 - t);
          g.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d - 1, 2, 2);
        }
      }
    });
  }

  /**
   * A snap: the two halves whip back toward their ends and a hot flash at the break. `bx,by` is
   * where it went.
   */
  snap(x0: number, y0: number, x1: number, y1: number, bx: number, by: number, purple = false): void {
    this.flashIn(bx, by, 10, STRING.snap, purple ? STRING.hex : STRING.silk, 10);
    this.anim(9.5, 360, (g, t) => {
      const k = easeOut(t);
      const col = purple ? STRING.hex : STRING.silk;
      for (const [ex, ey, side] of [[x0, y0, 1], [x1, y1, -1]] as const) {
        // Each half retracts toward its end, kinking as it goes.
        const sx = bx + (ex - bx) * k;
        const sy = by + (ey - by) * k;
        const mx = (sx + ex) / 2 + Math.sin(t * 22) * 9 * side * (1 - t);
        const my = (sy + ey) / 2 + Math.cos(t * 19) * 9 * side * (1 - t);
        g.lineStyle(purple ? 5 : 2.6, this.tint(col), 1 - t * 0.6);
        g.strokePoints([{ x: sx, y: sy }, { x: mx, y: my }, { x: ex, y: ey }], false);
      }
      g.lineStyle(2, this.tint(STRING.snap), (1 - t));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        const d0 = 4 + k * 8;
        const d1 = 9 + k * 22;
        g.lineBetween(bx + Math.cos(a) * d0, by + Math.sin(a) * d0, bx + Math.cos(a) * d1, by + Math.sin(a) * d1);
      }
    });
  }

  /** The lash reaching whoever broke it. */
  lash(x: number, y: number): void {
    this.anim(10, 260, (g, t) => {
      g.lineStyle(3, this.tint(STRING.snap), 1 - t);
      g.beginPath();
      g.arc(x, y, 12 + t * 10, -0.6 + t, 1.4 + t);
      g.strokePath();
      g.lineStyle(2, this.tint(STRING.strain), (1 - t) * 0.8);
      g.beginPath();
      g.arc(x, y, 16 + t * 12, 2.6 - t, 4.4 - t);
      g.strokePath();
    });
  }

  /** A spider drops onto its string out of nowhere. */
  spiderDrop(x: number, y: number): void {
    this.anim(9, 380, (g, t) => {
      g.lineStyle(1.6, this.tint(STRING.silk), (1 - t) * 0.8);
      g.lineBetween(x, y - 120 * (1 - easeOut(t)), x, y);
      g.lineStyle(2, this.tint(STRING.spiderLit), 1 - t);
      g.strokeCircle(x, y, 18 + t * 30);
    });
  }

  /** A hit on the abdomen: a dull thump on a black lobe, a wet burst on the red bulb. */
  abdomenHit(x: number, y: number, r: number, soft: boolean): void {
    this.anim(10, soft ? 380 : 220, (g, t) => {
      if (!soft) {
        g.lineStyle(2, this.tint(STRING.spiderHair), (1 - t) * 0.9);
        g.strokeCircle(x, y, r * (0.7 + t * 0.6));
        return;
      }
      g.fillStyle(this.tint(STRING.silkGlow), (1 - t) * (1 - t) * 0.8);
      g.fillCircle(x, y, r * (1 - t * 0.3));
      g.lineStyle(3, this.tint(STRING.spiderEye), 1 - t);
      g.strokeCircle(x, y, r + easeOut(t) * 16);
      g.fillStyle(this.tint(STRING.blood), 1 - t);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + 0.4;
        const d = r * 0.6 + easeOut(t) * (16 + (i % 3) * 7);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d + t * t * 8, 2.6 - t * 1.8);
      }
    });
  }

  spiderBite(x: number, y: number): void {
    this.anim(10, 240, (g, t) => {
      g.lineStyle(2, this.tint(STRING.spiderMark), 1 - t);
      g.lineBetween(x - 5 - t * 4, y - 6, x - 2, y + 2);
      g.lineBetween(x + 5 + t * 4, y - 6, x + 2, y + 2);
      g.fillStyle(this.tint(STRING.blood), (1 - t) * 0.85);
      g.fillCircle(x, y + 3 + t * 3, 2.4);
    });
  }

  /** A metal string stops a shot: a spray of sparks off the wire. */
  clang(x: number, y: number): void {
    this.anim(10, 260, (g, t) => {
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + 0.3;
        const d0 = 2 + easeOut(t) * 6;
        const d1 = 5 + easeOut(t) * 18;
        g.lineStyle(1.6, this.tint(i % 2 ? STRING.spark : STRING.steelLit), 1 - t);
        g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1 + t * 6);
      }
    });
  }

  /** The spool lets go: the wire whips off the hand in a ring of steel. */
  spoolFire(x: number, y: number, ang: number): void {
    this.flashIn(x, y, 8, STRING.steelLit, STRING.steel, 10);
    this.anim(9.5, 300, (g, t) => {
      g.lineStyle(2.4, this.tint(STRING.steelLit), 1 - t);
      g.strokeCircle(x, y, 8 + easeOut(t) * 18);
      g.lineStyle(1.6, this.tint(STRING.spark), (1 - t) * 0.9);
      for (let i = -2; i <= 2; i++) {
        const a = ang + i * 0.35;
        g.lineBetween(x + Math.cos(a) * 10, y + Math.sin(a) * 10, x + Math.cos(a) * (14 + t * 22), y + Math.sin(a) * (14 + t * 22));
      }
    });
  }

  /** A web wad lands: a splat of hexed silk. */
  wadSplat(x: number, y: number): void {
    this.anim(10, 380, (g, t) => {
      const k = easeOut(t);
      g.fillStyle(this.tint(STRING.silk), (1 - t) * 0.85);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + 0.4;
        g.fillCircle(x + Math.cos(a) * k * 12, y + Math.sin(a) * k * 12, 2.6 * (1 - t) + 0.6);
      }
      g.lineStyle(1.4, this.tint(STRING.hexGlow), 1 - t);
      g.strokeCircle(x, y, 4 + k * 12);
    });
  }

  /** R+ Spider Swing lands: dust and a ring where the spider touches down. */
  swingLand(x: number, y: number): void {
    this.anim(9, 360, (g, t) => {
      g.lineStyle(2, this.tint(STRING.hexGlow), 1 - t);
      g.strokeEllipse(x, y + 10, 20 + easeOut(t) * 40, 8 + easeOut(t) * 14);
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i / 5) * Math.PI;
        const d = 8 + easeOut(t) * 20;
        g.fillStyle(this.tint(STRING.silkShade), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + 10 + Math.sin(a) * d * 0.4, 2);
      }
    });
  }

  /**
   * F+ Puppet Play: the puppet's own ability turned on them. The four strings yank taut and go red,
   * a crimson ring closes in on them — an attack folding back on its caster — and sparks in their
   * own element's colour, burnt red, burst off them. `color` is that element's colour.
   */
  backfire(x: number, y: number, r: number, color: number, big: boolean): void {
    const hot = lerpColor(color, STRING.backfire, 0.65);
    this.flashIn(x, y, r * (big ? 1.4 : 0.9), STRING.backfireHot, STRING.backfire, 10.5);
    this.anim(10.5, big ? 640 : 440, (g, t) => {
      const k = easeIn(t);
      // The strings jerk tight from the bar above.
      const by = y - r - 34;
      g.lineStyle(2, this.tint(STRING.backfire), (1 - t));
      for (const ox of [-14, -5, 5, 14]) g.lineBetween(x + ox, by, x + ox * 0.5, y - r * 0.4);
      // The ring folds inward.
      const rr = (r + (big ? 70 : 44)) * (1 - k) + r * 0.6;
      g.lineStyle(big ? 4 : 3, this.tint(STRING.backfire), 1 - t * 0.6);
      g.strokeCircle(x, y, rr);
      g.lineStyle(1.5, this.tint(STRING.backfireHot), (1 - t) * 0.9);
      g.strokeCircle(x, y, rr * 0.82);
      // Their element's sparks, burnt red, thrown back off them.
      for (let i = 0; i < (big ? 12 : 8); i++) {
        const a = (i / (big ? 12 : 8)) * TAU + 0.25;
        const d = r * 0.7 + easeOut(t) * (big ? 46 : 30);
        g.fillStyle(this.tint(i % 2 ? hot : STRING.backfire), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, (big ? 3.4 : 2.6) * (1 - t) + 0.6);
      }
    });
  }

  /** Spinal Snap's web goes: every corner whips in and a grey shudder runs the arena. */
  webBreak(b: { left: number; right: number; top: number; bottom: number }): void {
    const cx = (b.left + b.right) / 2;
    const cy = (b.top + b.bottom) / 2;
    this.anim(9.4, 700, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(2.4, this.tint(STRING.silk), (1 - t) * 0.8);
      for (const [x, y] of [[b.left, b.top], [b.right, b.top], [b.right, b.bottom], [b.left, b.bottom]]) {
        for (let i = 0; i < 5; i++) {
          const a = Math.atan2(cy - y, cx - x) + (i - 2) * 0.28;
          const d0 = 20 + k * 120;
          g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a + 0.2) * (d0 + 40), y + Math.sin(a + 0.2) * (d0 + 40));
        }
      }
      g.lineStyle(3, this.tint(STRING.silkShade), (1 - t) * 0.5);
      g.strokeCircle(cx, cy, 40 + k * 520);
    });
  }

  /** Infested: a spider shoulders its way out of the host. */
  broodBurst(x: number, y: number): void {
    this.anim(10, 320, (g, t) => {
      g.fillStyle(this.tint(STRING.blood), (1 - t) * 0.8);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6 + 0.5;
        g.fillCircle(x + Math.cos(a) * (4 + t * 10), y + Math.sin(a) * (4 + t * 10), 1.8);
      }
      g.lineStyle(1.4, this.tint(STRING.silkShade), 1 - t);
      g.strokeCircle(x, y, 5 + easeOut(t) * 12);
    });
  }

  /** The hex strand snapped by its owner: a purple shock along its whole length. */
  hexSnap(pts: Pt[], band: number): void {
    const copy = pts.map((p) => ({ x: p.x, y: p.y }));
    this.anim(10, 520, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(band * 2 * (1 - t * 0.5), this.tint(STRING.hex), (1 - t) * 0.35);
      g.strokePoints(copy, false);
      g.lineStyle(6 * (1 - t), this.tint(STRING.hexGlow), 1 - t);
      g.strokePoints(copy, false);
      for (let i = 0; i < copy.length; i += 2) {
        const p = copy[i];
        g.fillStyle(this.tint(STRING.hexGlow), (1 - t) * 0.9);
        g.fillCircle(p.x + Math.sin(i * 7.1) * k * 10, p.y + Math.cos(i * 5.3) * k * 10, 2.6 * (1 - t) + 0.5);
      }
    });
  }

  /** A snared victim: purple bands tightening round them. */
  snared(x: number, y: number, r: number): void {
    this.anim(10, 460, (g, t) => {
      g.lineStyle(3, this.tint(STRING.hex), 1 - t);
      g.strokeEllipse(x, y, (r * 2 + 30) * (1 - easeOut(t) * 0.5), (r + 22) * (1 - easeOut(t) * 0.5));
      g.lineStyle(1.5, this.tint(STRING.hexGlow), 1 - t);
      g.strokeEllipse(x, y - 6, (r * 2 + 18) * (1 - easeOut(t) * 0.45), (r + 14) * (1 - easeOut(t) * 0.45));
    });
  }

  /** The control bar lands: a clack of wood and its four strings lashing down. */
  barHit(x: number, y: number, r: number): void {
    this.anim(10, 420, (g, t) => {
      const by = y - r - 34 * easeOut(Math.min(1, t * 2));
      g.lineStyle(1.4, this.tint(STRING.silk), 1 - t);
      for (const ox of [-14, -5, 5, 14]) g.lineBetween(x + ox, by, x + ox * 0.6, y);
      g.lineStyle(2, this.tint(STRING.woodLit), 1 - t);
      g.strokeCircle(x, y, r + 4 + t * 14);
    });
  }

  /** Silk winding round a body as the tomb closes. */
  tombWrap(x: number, y: number, r: number): void {
    this.anim(10, 600, (g, t) => {
      const k = easeIn(t);
      g.lineStyle(2, this.tint(STRING.silk), 1 - t * 0.4);
      for (let i = 0; i < 7; i++) {
        const rr = (r * 3.2) * (1 - k) + r * 1.2;
        const a0 = i * 0.9 + t * 9;
        g.beginPath();
        g.arc(x, y + (i - 3) * 4, rr, a0, a0 + 1.6);
        g.strokePath();
      }
    });
  }

  /** The tomb bursts: shreds of silk thrown outward. */
  tombBreak(x: number, y: number): void {
    this.flashIn(x, y, 24, STRING.silkGlow, STRING.silk, 10);
    this.anim(10, 640, (g, t) => {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + 0.3;
        const d = 10 + easeOut(t) * 70;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + t * t * 20;
        g.fillStyle(this.tint(i % 3 ? STRING.silk : STRING.silkShade), 1 - t);
        g.fillTriangle(px, py, px + Math.cos(a + 1.2) * 7, py + Math.sin(a + 1.2) * 7, px + Math.cos(a - 0.7) * 5, py + Math.sin(a - 0.7) * 5);
      }
    });
  }

  /** A tear: the victim strained against the silk and paid for it. */
  tear(x: number, y: number): void {
    this.anim(10, 280, (g, t) => {
      g.lineStyle(1.6, this.tint(STRING.blood), 1 - t);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + 0.4;
        g.lineBetween(x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * (10 + t * 10), y + Math.sin(a) * (10 + t * 10));
      }
    });
  }

  /** A hit on the tomb: silk fibres puffing off it. */
  tombHit(x: number, y: number): void {
    this.anim(10, 300, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + 0.2;
        const d = 6 + easeOut(t) * 18;
        g.fillStyle(this.tint(STRING.silk), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.8);
      }
    });
  }
}

// ── Avatar ───────────────────────────────────────────────────────────────────

const STRING_AVATAR: AvatarSpec = {
  // The pedipalps: two small velvet feelers in front of the fangs.
  hands: [
    { r: 8, color: STRING.ink, alpha: 0.3 },
    { r: 6, color: STRING.spider, alpha: 1 },
    { r: 4.8, color: STRING.spiderLit, alpha: 1 },
    { r: 1.6, color: STRING.spiderHair, alpha: 0.9, ox: -1.4, oy: -1.4 },
  ],
  eyeWhite: STRING.spiderEye,
  eyePupil: STRING.ink,
  squash: { div: 18, x: 0.25, y: 0.16 },
};

/** Where each leg leaves the body, measured back from the facing (radians), front pair first. */
const LEG_ROOTS = [0.62, 1.12, 1.78, 2.4];
const LEG_REACH = [1.12, 1, 0.98, 1.08];

/**
 * The String rig: a big spider. The fighter sprite is its velvet head-and-thorax; under it, eight
 * jointed legs splay out and step in two alternating sets while it moves, and a long abdomen drags
 * behind it on a chain (`AbdomenChain`): a black lobe with a cream hourglass, then the red bulb.
 * Over it sit six more small eyes round the main pair and two fangs that flare on every throw.
 */
export class StringAvatar extends BaseAvatar {
  /** 0..1 — a throw: the fangs flare and the front legs reach along `lungeAng`. */
  private lunge = 0;
  private lungeAng = 0;
  /** 0..1 — Linen Tomb: silk spun in a ring round it. */
  private weave = 0;
  private lastX = Number.NaN;
  private lastY = Number.NaN;
  private stride = 0;
  private moving = 0;
  /** The abdomen: its own chain, unless the kit hands over the one the hitboxes ride. */
  private readonly chain = new AbdomenChain();
  private tail: readonly Pt[] | null = null;
  /** 0..1 — the red bulb was just hit. */
  private sting = 0;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, STRING_AVATAR);
  }

  /** A throw along `ang`: fangs out, front legs forward. */
  jerk(ang: number): void {
    this.lunge = 1;
    this.lungeAng = ang;
  }

  setWeave(k: number): void { this.weave = Phaser.Math.Clamp(k, 0, 1); }

  /** The kit's abdomen nodes (the ones the hitboxes sit on), or null to drag its own. */
  setTail(nodes: readonly Pt[] | null): void { this.tail = nodes; }

  /** The red bulb took a hit. */
  stung(): void { this.sting = 1; }

  update(delta: number, x: number, y: number, alpha: number): void {
    if (!Number.isNaN(this.lastX)) {
      const d = Math.hypot(x - this.lastX, y - this.lastY);
      this.stride += d * 0.11;
      this.moving += ((d > 0.3 ? 1 : 0) - this.moving) * Math.min(1, delta / 120);
    }
    this.lastX = x;
    this.lastY = y;
    this.lunge = Math.max(0, this.lunge - delta / 260);
    this.sting = Math.max(0, this.sting - delta / 320);
    if (!this.tail) this.chain.step(x, y, this.facing + Math.PI);
    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    // No mastery yet. The tell is ready: the feelers go brass.
    this.forEachHandLayer(2, (arc) => arc.setFillStyle(this.tint(on ? STRING.brass : STRING.spiderLit), 1));
  }

  /** The fangs, under the eyes and over the head. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const flare = this.lunge;
    for (const side of [-1, 1]) {
      const bx = x + side * 4;
      const by = y + 7;
      const tipX = bx + side * (2 + flare * 4);
      const tipY = by + 9 + flare * 2;
      g.fillStyle(this.tint(STRING.spider), alpha);
      g.fillEllipse(bx, by + 1, 6, 7);
      g.lineStyle(2.2, this.tint(STRING.spiderMark), alpha);
      g.beginPath();
      g.moveTo(bx, by + 3);
      g.lineTo((bx + tipX) / 2 + side * 1.5, (by + tipY) / 2 + 1);
      g.lineTo(tipX - side * 1.5, tipY);
      g.strokePath();
    }
    // A sheen of fine hair across the head.
    g.lineStyle(1, this.tint(STRING.spiderHair), alpha * 0.55);
    for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 4, y - 15, x + i * 4.6, y - 19);
  }

  /** The legs and the abdomen, under the sprite. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const face = this.facing;
    g.fillStyle(this.tint(STRING.ink), a * 0.45);
    g.fillEllipse(x - Math.cos(face) * 8, y + 18, 70, 18);
    if (this.weave > 0) {
      g.lineStyle(2, this.tint(STRING.silk), a * this.weave);
      g.strokeCircle(x, y, 44 + Math.sin(this.t * 6) * 3);
      g.lineStyle(1, this.tint(STRING.silkShade), a * this.weave * 0.8);
      g.strokeCircle(x, y, 50 + Math.cos(this.t * 5) * 3);
    }
    this.drawAbdomen(g, x, y, a, alpha);
    // The legs: four a side, a raised knee and a shin down to the floor.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const set = (i + (side > 0 ? 1 : 0)) % 2;
        const step = Math.sin(this.stride + set * Math.PI) * 0.2 * this.moving
          + Math.sin(this.t * 2.3 + i * 1.3 + side) * 0.035;
        let ang = face + side * (LEG_ROOTS[i] + step);
        if (i === 0 && this.lunge > 0) ang += (this.lungeAng + side * 0.35 - ang) * this.lunge * 0.6;
        const reach = 44 * LEG_REACH[i] * (i === 0 ? 1 + this.lunge * 0.2 : 1);
        const hip = { x: x + Math.cos(ang) * 13, y: y + Math.sin(ang) * 11 + 2 };
        const knee = { x: x + Math.cos(ang) * reach * 0.6, y: y + Math.sin(ang) * reach * 0.48 - 9 };
        const lift = set === 0 ? Math.max(0, Math.sin(this.stride)) : Math.max(0, -Math.sin(this.stride));
        const foot = {
          x: x + Math.cos(ang + side * 0.12) * reach,
          y: y + Math.sin(ang + side * 0.12) * reach * 0.78 + 6 - lift * 4 * this.moving,
        };
        g.lineStyle(4.4, this.tint(STRING.ink), alpha * 0.5);
        g.lineBetween(hip.x, hip.y + 1, knee.x, knee.y + 1);
        g.lineStyle(3.6, this.tint(STRING.spider), alpha);
        g.lineBetween(hip.x, hip.y, knee.x, knee.y);
        g.lineStyle(2.4, this.tint(STRING.spider), alpha);
        g.lineBetween(knee.x, knee.y, foot.x, foot.y);
        g.lineStyle(1, this.tint(STRING.spiderHair), alpha * 0.7);
        g.lineBetween(hip.x, hip.y - 1.2, knee.x, knee.y - 1.2);
        g.fillStyle(this.tint(STRING.spiderLit), alpha);
        g.fillCircle(knee.x, knee.y, 2.2);
        g.fillStyle(this.tint(STRING.spiderMark), alpha * 0.8);
        g.fillCircle(foot.x, foot.y, 1.1);
      }
    }
  }

  /**
   * The abdomen, drawn on the chain's nodes so what you see is what can be hit: a waist, a black
   * velvet lobe with the cream hourglass, and behind it the red bulb — glossy, pulsing, the soft
   * part — paying out a thread of silk.
   */
  private drawAbdomen(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const nodes = this.tail ?? this.chain.nodes;
    if (!nodes.length || Number.isNaN(nodes[0].x)) return;
    const front = (i: number): Pt => (i === 0 ? { x, y } : nodes[i - 1]);
    // Floor shadows, then the waists, so every lobe sits over its joints.
    for (let i = 0; i < nodes.length; i++) {
      g.fillStyle(this.tint(STRING.ink), a * 0.4);
      g.fillEllipse(nodes[i].x, nodes[i].y + ABDOMEN[i].r * 0.8, ABDOMEN[i].r * 2.1, ABDOMEN[i].r * 0.8);
    }
    for (let i = 0; i < nodes.length; i++) {
      const f = front(i);
      g.lineStyle(ABDOMEN[i].r * 0.9, this.tint(STRING.spider), alpha);
      g.lineBetween(f.x, f.y, nodes[i].x, nodes[i].y);
    }
    // The silk thread it pays out behind it.
    const tip = nodes[nodes.length - 1];
    const tipR = ABDOMEN[nodes.length - 1].r;
    const tf = front(nodes.length - 1);
    const ta = Math.atan2(tip.y - tf.y, tip.x - tf.x);
    const sx = tip.x + Math.cos(ta) * tipR;
    const sy = tip.y + Math.sin(ta) * tipR;
    g.lineStyle(1, this.tint(STRING.silk), alpha * 0.55);
    g.lineBetween(sx, sy, sx + Math.cos(ta) * 18 + Math.sin(this.t * 3) * 2, sy + Math.sin(ta) * 18 + 6);
    // Tail first, so each lobe overlaps the one behind it.
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = ABDOMEN[i].r;
      const f = front(i);
      const ang = Math.atan2(n.y - f.y, n.x - f.x);
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      const P = (px: number, py: number): Pt => ({ x: n.x + px * c - py * sn, y: n.y + px * sn + py * c });
      if (ABDOMEN[i].mult > 1) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 4.2);
        // The glow that gives it away.
        g.fillStyle(this.tint(STRING.spiderEye), alpha * (0.14 + pulse * 0.12 + this.sting * 0.3));
        g.fillCircle(n.x, n.y, r + 4 + pulse * 2 + this.sting * 5);
        // Spinnerets at the very tip.
        g.fillStyle(this.tint(STRING.spider), alpha);
        for (const side of [-1, 1]) { const sp = P(r + 1, side * 3); g.fillCircle(sp.x, sp.y, 2.4); }
        g.fillStyle(this.tint(STRING.spider), alpha);
        g.fillCircle(n.x, n.y, r + 1.2);
        g.fillStyle(this.tint(STRING.blood), alpha);
        g.fillCircle(n.x, n.y, r - 0.6);
        // Lit from above: a brighter belly of red and a wet highlight.
        g.fillStyle(this.tint(STRING.spiderEye), alpha * 0.85);
        g.fillCircle(n.x - r * 0.12, n.y - r * 0.18, r * 0.72);
        g.fillStyle(this.tint(STRING.backfireHot), alpha * 0.75);
        g.fillEllipse(n.x - r * 0.34, n.y - r * 0.42, r * 0.62, r * 0.38);
        g.fillStyle(this.tint(STRING.silkGlow), alpha * 0.8);
        g.fillCircle(n.x - r * 0.42, n.y - r * 0.48, r * 0.12);
        // Dark seams running back to the tip, so it reads as a bulb and not a ball.
        g.lineStyle(1.2, this.tint(STRING.spider), alpha * 0.55);
        for (const side of [-1, 1]) {
          const s0 = P(-r * 0.7, side * r * 0.35);
          const s1 = P(r * 0.2, side * r * 0.62);
          const s2 = P(r * 0.85, side * r * 0.2);
          g.beginPath();
          g.moveTo(s0.x, s0.y);
          g.lineTo(s1.x, s1.y);
          g.lineTo(s2.x, s2.y);
          g.strokePath();
        }
        if (this.sting > 0) {
          g.fillStyle(this.tint(STRING.silkGlow), alpha * this.sting * 0.7);
          g.fillCircle(n.x, n.y, r - 1);
        }
      } else {
        g.fillStyle(this.tint(STRING.spider), alpha);
        g.fillCircle(n.x, n.y, r);
        g.fillStyle(this.tint(STRING.spiderLit), alpha * 0.85);
        g.fillEllipse(n.x - r * 0.3, n.y - r * 0.38, r * 0.8, r * 0.52);
        // Fine hair along the top edge.
        g.lineStyle(1, this.tint(STRING.spiderHair), alpha * 0.6);
        for (let h = -2; h <= 2; h++) {
          const ha = -Math.PI / 2 + h * 0.38;
          g.lineBetween(
            n.x + Math.cos(ha) * (r - 1), n.y + Math.sin(ha) * (r - 1),
            n.x + Math.cos(ha) * (r + 2.5), n.y + Math.sin(ha) * (r + 2.5),
          );
        }
        // The cream hourglass, lying along the body.
        g.fillStyle(this.tint(STRING.spiderMark), alpha);
        const h0 = P(-r * 0.45, 0), h1 = P(r * 0.45, 0), hm0 = P(0, -r * 0.28), hm1 = P(0, r * 0.28);
        g.fillTriangle(h0.x, h0.y, hm0.x, hm0.y, hm1.x, hm1.y);
        g.fillTriangle(h1.x, h1.y, hm0.x, hm0.y, hm1.x, hm1.y);
      }
    }
  }

  /** Six small eyes round the main pair. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const look = this.facing;
    const lx = Math.cos(look) * 2.2;
    const ly = Math.sin(look) * 1.8;
    const eyes: [number, number, number][] = [[-3.4, -11, 2.1], [3.4, -11, 2.1], [-12.5, -8, 1.6], [12.5, -8, 1.6], [-13, -1.5, 1.4], [13, -1.5, 1.4]];
    for (const [ex, ey, r] of eyes) {
      const px = x + ex + lx;
      const py = y + ey + ly;
      g.fillStyle(this.tint(STRING.ink), alpha);
      g.fillCircle(px, py, r + 0.8);
      g.fillStyle(this.tint(STRING.spiderEye), alpha);
      g.fillCircle(px, py, r);
      g.fillStyle(this.tint(STRING.silkGlow), alpha * 0.85);
      g.fillCircle(px - r * 0.35, py - r * 0.35, r * 0.35);
    }
    if (this.mastered) {
      g.lineStyle(1.2, this.tint(STRING.brass), alpha * 0.8);
      g.strokeCircle(x, y - 6, 22);
    }
  }
}
