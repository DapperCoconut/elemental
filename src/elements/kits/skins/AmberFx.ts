import Phaser from 'phaser';
import { TAU } from '../ElementVisuals';

/**
 * The Amber skin's bespoke ability art for Oil. Visual only — every painter here replaces one
 * OilFx painter for an owner wearing the skin, at the same footprint and in the same local
 * space, so hitboxes and timings stay exactly the element's.
 *
 * - `drawPterosaur` — a Drone: a laser-eyed pterosaur, flapping where the rotors spun.
 * - `drawRexMount` — the Train's head: a T-rex with the hatchling riding it in a resin saddle.
 * - `drawStampeder` — every Train car: a running dinosaur (trike, stego, raptor, ankylo).
 * - `drawMeat` — the coal pickups: a drumstick for the rex.
 * - `drawInclusion` — a mosquito trapped in each amber puddle.
 *
 * Colours are final (the skin owns them), so nothing routes through oil's mapper.
 */
export const AMBER = {
  resinDeep: 0x3a1a05,
  resinDark: 0x5c2a07,
  resinShade: 0x7a3c0c,
  resin: 0xd9861f,
  resinLit: 0xffb52e,
  honey: 0xffd27a,
  honeyPale: 0xfff6e0,
  bone: 0xe8d6b0,
  boneShade: 0xb59e72,
  boneDark: 0x6b5a45,
  laser: 0xff3b1f,
  laserHot: 0xffb3a0,
  wing: 0x9a5212,
  wingDark: 0x5e300a,
  rex: 0x5e7a2c,
  rexDark: 0x34461a,
  rexLit: 0x8fa848,
  trike: 0x8a6a3a,
  trikeDark: 0x56401f,
  stego: 0x5f7046,
  stegoDark: 0x3a4628,
  plate: 0xc8582a,
  raptor: 0xa0522d,
  raptorDark: 0x5a2c16,
  ankylo: 0x6e6450,
  ankyloDark: 0x433c2e,
  eye: 0xffd23a,
  pupil: 0x1a0d04,
  meat: 0x9c3b22,
  meatLit: 0xd8664a,
  dust: 0xc9a878,
  shadow: 0x1a0d04,
  white: 0xfffaf0,
};

type Frame = (f: number, s: number) => Phaser.Geom.Point;

/** Local frame along `angle`: `f` forward, `s` to the right. */
function frame(x: number, y: number, angle: number): Frame {
  const c = Math.cos(angle), sn = Math.sin(angle);
  return (f, s) => new Phaser.Geom.Point(x + c * f - sn * s, y + sn * f + c * s);
}

/** An ellipse in a frame, so it turns with the creature. */
function blob(g: Phaser.GameObjects.Graphics, F: Frame, cf: number, cs: number, L: number, W: number): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    pts.push(F(cf + Math.cos(a) * L, cs + Math.sin(a) * W));
  }
  g.fillPoints(pts, true);
}

/**
 * A tapering limb along the frame's spine from `f0` (width `w0`) to `f1` (width `w1`), the
 * spine bending sideways by `sway` toward the far end. Tails, necks, snouts and beaks.
 */
function taper(
  g: Phaser.GameObjects.Graphics, F: Frame,
  f0: number, f1: number, w0: number, w1: number, sway = 0, s0 = 0,
): void {
  const steps = 9;
  const pts: Phaser.Geom.Point[] = [];
  const at = (u: number) => s0 + sway * u * u;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(F(f0 + (f1 - f0) * u, at(u) - (w0 + (w1 - w0) * u)));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(F(f0 + (f1 - f0) * u, at(u) + (w0 + (w1 - w0) * u)));
  }
  g.fillPoints(pts, true);
}

function tri(g: Phaser.GameObjects.Graphics, a: Phaser.Geom.Point, b: Phaser.Geom.Point, c: Phaser.Geom.Point): void {
  g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
}

/** A running leg seen from above: thigh, shin, and three toe claws pointing forward. */
function leg(
  g: Phaser.GameObjects.Graphics, F: Frame, f: number, s: number, size: number,
  skin: number, dark: number, claw: number,
): void {
  g.fillStyle(dark, 1);
  blob(g, F, f, s, size * 1.15, size * 0.75);
  g.fillStyle(skin, 1);
  blob(g, F, f - 0.4, s, size, size * 0.62);
  g.lineStyle(Math.max(1, size * 0.28), claw, 0.95);
  for (const k of [-1, 0, 1]) {
    const a = F(f + size * 0.8, s + k * size * 0.35);
    const b = F(f + size * 1.5, s + k * size * 0.55);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
}

/** A slit-pupil reptile eye. */
function reptileEye(g: Phaser.GameObjects.Graphics, p: Phaser.Geom.Point, r: number, hot: boolean): void {
  g.fillStyle(hot ? AMBER.laser : AMBER.eye, 1);
  g.fillCircle(p.x, p.y, r);
  g.fillStyle(AMBER.pupil, 1);
  g.fillEllipse(p.x, p.y, r * 0.55, r * 1.6);
  g.fillStyle(AMBER.white, 0.8);
  g.fillCircle(p.x - r * 0.35, p.y - r * 0.35, r * 0.3);
}

export class AmberFx {
  /**
   * A Drone, drawn as a pterosaur in its own local space (centre 0,0) so the kit's tweens and
   * orbit read its position exactly as they read the drone's. Wings beat on the rotor clock,
   * the long beak points along `aim`, and its eyes are the laser emitters — red while loaded,
   * dull once spent, white-hot overcharged. Spine pips count the shots left.
   */
  static drawPterosaur(
    g: Phaser.GameObjects.Graphics,
    aim: number, spin: number, shots: number, maxShots: number, overcharged: boolean,
  ): void {
    const F = frame(0, 0, aim);
    const flap = Math.sin(spin * 0.2);
    const span = 15 + flap * 3.5;
    const sweep = flap * 2;
    const lamp = overcharged ? AMBER.white : shots > 0 ? AMBER.laser : AMBER.boneDark;

    // Under-glow from the laser eyes, so the dark wings still read over a dark floor.
    g.fillStyle(lamp, 0.16);
    g.fillCircle(0, 0, 13);

    // Wing membranes: leading-edge finger bone out to the tip, trailing edge sweeping back.
    for (const side of [-1, 1]) {
      const root = F(2.5, side * 2.4);
      const elbow = F(1.5 + sweep * 0.3, side * span * 0.5);
      const tip = F(-2 - sweep, side * span);
      const trail = F(-7.5, side * span * 0.55);
      const hip = F(-5.5, side * 2.2);
      g.fillStyle(overcharged ? AMBER.resinLit : AMBER.wingDark, 0.95);
      g.fillPoints([root, elbow, tip, trail, hip], true);
      g.fillStyle(overcharged ? AMBER.honey : AMBER.wing, 0.95);
      g.fillPoints([F(1.6, side * 3), elbow, F(-2.4 - sweep, side * span * 0.92), F(-6.2, side * span * 0.52), F(-4.6, side * 2.6)], true);
      // Wing fingers' bone along the leading edge.
      g.lineStyle(1.3, AMBER.bone, 0.95);
      g.beginPath();
      g.moveTo(root.x, root.y); g.lineTo(elbow.x, elbow.y); g.lineTo(tip.x, tip.y);
      g.strokePath();
      // Membrane folds.
      g.lineStyle(0.8, AMBER.wingDark, 0.7);
      const m1 = F(-1.2, side * span * 0.68), m2 = F(-4.6, side * span * 0.6);
      g.lineBetween(elbow.x, elbow.y, m1.x, m1.y);
      g.lineBetween(elbow.x, elbow.y, m2.x, m2.y);
    }

    // Body and the short tail.
    g.fillStyle(AMBER.resinDark, 1);
    taper(g, F, 4, -9, 3.6, 0.6);
    g.fillStyle(AMBER.resin, 1);
    taper(g, F, 3.6, -7.5, 2.6, 0.5);

    // Head, the long crest sweeping back off the skull, and the beak along the aim.
    g.fillStyle(AMBER.boneShade, 1);
    taper(g, F, 6, -2.5, 1.6, 0.4, 0, 0.6);
    g.fillStyle(AMBER.resinDark, 1);
    blob(g, F, 5.6, 0, 3, 2.6);
    g.fillStyle(AMBER.bone, 1);
    taper(g, F, 6.5, 14.5, 1.6, 0.25);
    g.fillStyle(AMBER.resin, 1);
    blob(g, F, 5.4, -0.4, 2.2, 1.8);

    // Laser eyes.
    for (const side of [-1, 1]) {
      const e = F(6.4, side * 1.8);
      g.fillStyle(lamp, 0.4);
      g.fillCircle(e.x, e.y, 2.4);
      g.fillStyle(lamp, 1);
      g.fillCircle(e.x, e.y, 1.1);
      g.fillStyle(AMBER.white, 0.9);
      g.fillCircle(e.x - 0.3, e.y - 0.3, 0.45);
    }

    // Ammo: one resin pip per shot left down the spine, dark ones spent.
    for (let i = 0; i < maxShots; i++) {
      const p = F(1.4 - i * 1.7, 0);
      g.fillStyle(i < shots ? AMBER.honey : AMBER.resinDeep, i < shots ? 0.95 : 0.7);
      g.fillCircle(p.x, p.y, 0.85);
    }

    if (overcharged) {
      g.lineStyle(1.4, AMBER.white, 0.7);
      for (let i = 0; i < 3; i++) {
        const a0 = spin * 1.7 + i * 2.1;
        g.beginPath();
        g.moveTo(Math.cos(a0) * 7, Math.sin(a0) * 7);
        g.lineTo(Math.cos(a0 + 1.1) * 10, Math.sin(a0 + 1.1) * 10);
        g.lineTo(Math.cos(a0 + 1.8) * 7.5, Math.sin(a0 + 1.8) * 7.5);
        g.strokePath();
      }
    }
  }

  /**
   * The Train's head: a T-rex seen from above, striding along `angle`, the amber hatchling
   * riding a resin saddle on its back with the reins run up to the jaw. Big enough to cover
   * the radius-22 fighter it is drawn over. `overload` (all the meat eaten) opens the jaws on
   * a roar with the eyes gone red.
   */
  static drawRexMount(
    g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, t: number, overload: boolean,
  ): void {
    const F = frame(x, y, angle);
    const stride = Math.sin(t * 11);
    const tailSway = Math.sin(t * 5.5) * 9;

    g.fillStyle(AMBER.shadow, 0.35);
    blob(g, F, -6, 3, 36, 20);

    // Dust kicked up off the heels.
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.8 + i / 3) % 1;
      const d = F(-14 - p * 30, (i - 1) * 12 + Math.sin(p * 6 + i) * 4);
      g.fillStyle(AMBER.dust, 0.38 * (1 - p));
      g.fillCircle(d.x, d.y, 4 + p * 9);
    }

    // Tail, counter-swinging the stride.
    g.fillStyle(AMBER.rexDark, 1);
    taper(g, F, -10, -50, 11.5, 1.2, tailSway);
    g.fillStyle(AMBER.rex, 1);
    taper(g, F, -10, -47, 9.5, 0.8, tailSway);

    // Legs, alternating.
    for (const side of [-1, 1]) {
      leg(g, F, -3 + side * stride * 6, side * 15.5, 6.5, AMBER.rex, AMBER.rexDark, AMBER.bone);
    }

    // Body.
    g.fillStyle(AMBER.rexDark, 1);
    blob(g, F, 0, 0, 23, 17);
    g.fillStyle(AMBER.rex, 1);
    blob(g, F, -0.5, -0.5, 21.5, 15.5);
    // Sun on the near flank, stripes across the back.
    g.fillStyle(AMBER.rexLit, 0.6);
    blob(g, F, 2, -7, 15, 5);
    g.lineStyle(2, AMBER.rexDark, 0.55);
    for (const f of [-14, -6, 10]) {
      const a = F(f, -12), b = F(f + 2, 12);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Spine scutes running from the neck down onto the tail.
    for (let i = 0; i < 8; i++) {
      const f = 18 - i * 6;
      const s = i > 4 ? tailSway * ((i - 4) / 8) * 0.4 : 0;
      g.fillStyle(AMBER.rexDark, 0.9);
      const p = F(f, s);
      g.fillCircle(p.x, p.y, 2);
    }

    // Tiny arms.
    g.lineStyle(2.4, AMBER.rexDark, 1);
    for (const side of [-1, 1]) {
      const a = F(14, side * 9), b = F(19, side * 10 + Math.sin(t * 9 + side) * 1.5);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.fillStyle(AMBER.bone, 1);
      g.fillCircle(b.x, b.y, 1.1);
    }

    // Neck and the great head.
    g.fillStyle(AMBER.rexDark, 1);
    taper(g, F, 14, 26, 11, 9.5);
    const jaw = overload ? 0.55 + 0.45 * Math.sin(t * 14) : 0.15 + 0.1 * Math.sin(t * 3);
    const head = [F(20, -10.5), F(30, -12), F(40, -9), F(46, -5), F(48, 0), F(46, 5), F(40, 9), F(30, 12), F(20, 10.5)];
    g.fillStyle(AMBER.rexDark, 1);
    g.fillPoints(head, true);
    g.fillStyle(AMBER.rex, 1);
    g.fillPoints([F(21, -9), F(30, -10.5), F(39.5, -7.8), F(45, -4.2), F(46.5, 0), F(45, 4.2), F(39.5, 7.8), F(30, 10.5), F(21, 9)], true);
    g.fillStyle(AMBER.rexLit, 0.55);
    blob(g, F, 33, -3, 9, 3);
    // Mouth: a dark gape down the centre line, teeth along both lips.
    const gape = 0.8 + jaw * 4.5;
    g.fillStyle(overload ? AMBER.laser : AMBER.shadow, overload ? 0.85 : 0.9);
    g.fillPoints([F(33, 0), F(40, -gape * 0.7), F(47, -gape), F(48.5, 0), F(47, gape), F(40, gape * 0.7)], true);
    g.fillStyle(AMBER.bone, 1);
    for (let i = 0; i < 5; i++) {
      const f = 36 + i * 2.6;
      for (const side of [-1, 1]) {
        const w = gape * (0.55 + i * 0.1);
        tri(g, F(f, side * (w + 0.9)), F(f + 1.8, side * (w + 0.9)), F(f + 0.9, side * Math.max(0, w - 1.4)));
      }
    }
    // Nostrils and the brow ridges over the eyes.
    g.fillStyle(AMBER.shadow, 0.9);
    for (const side of [-1, 1]) {
      const n = F(44, side * 2.6);
      g.fillCircle(n.x, n.y, 1);
    }
    for (const side of [-1, 1]) {
      g.fillStyle(AMBER.rexDark, 1);
      blob(g, F, 29, side * 8.2, 4.4, 2);
      reptileEye(g, F(29.5, side * 7.4), 2.1, overload);
    }
    if (overload) {
      // The roar: a hot cone of breath and a shiver of rings ahead of the jaws.
      g.fillStyle(AMBER.laser, 0.18);
      g.fillPoints([F(48, 0), F(90, -26), F(96, 0), F(90, 26)], true);
      g.lineStyle(2, AMBER.resinLit, 0.5);
      for (let i = 0; i < 2; i++) {
        const p = (t * 2.4 + i * 0.5) % 1;
        const r = 10 + p * 34;
        const c = F(50 + p * 20, 0);
        g.strokeCircle(c.x, c.y, r * 0.6);
      }
    }

    // ── The rider ─────────────────────────────────────────────────────────
    // Resin saddle with bone pommel, the hatchling on it, and the reins up to the jaw.
    g.fillStyle(AMBER.resinDark, 1);
    blob(g, F, -3, 0, 10, 12);
    g.fillStyle(AMBER.resin, 1);
    blob(g, F, -3, 0, 8.5, 10.5);
    g.fillStyle(AMBER.bone, 1);
    blob(g, F, 6, 0, 2.6, 4);

    const bob = Math.abs(stride) * 1.2;
    const r = F(-3 + bob * 0.3, 0);
    g.fillStyle(AMBER.resinDeep, 1);
    g.fillCircle(r.x, r.y, 9.6);
    g.fillStyle(AMBER.resin, 1);
    g.fillCircle(r.x, r.y, 8.6);
    g.fillStyle(AMBER.resinLit, 0.8);
    g.fillCircle(r.x - 2.4, r.y - 2.6, 4.6);
    g.fillStyle(AMBER.honeyPale, 0.85);
    g.fillCircle(r.x - 3.4, r.y - 3.8, 1.6);
    // The eggshell cap, cracked rim showing.
    g.fillStyle(AMBER.bone, 1);
    const cap = [F(-9, -6), F(-8, -2), F(-10, 0), F(-8, 2), F(-9, 6), F(-12, 3), F(-12.5, -3)];
    g.fillPoints(cap, true);
    // Eyes looking down the track.
    for (const side of [-1, 1]) {
      const e = F(1, side * 3.4);
      g.fillStyle(AMBER.honeyPale, 1);
      g.fillCircle(e.x, e.y, 2.2);
      g.fillStyle(AMBER.pupil, 1);
      const p = F(1.8, side * 3.4);
      g.fillCircle(p.x, p.y, 1.1);
    }
    // Reins: from both bead hands to the corners of the jaw.
    g.lineStyle(1.2, AMBER.resinDeep, 0.9);
    for (const side of [-1, 1]) {
      const h = F(4, side * 8.5);
      const j = F(34, side * 9.5);
      g.lineBetween(h.x, h.y, j.x, j.y);
      g.fillStyle(AMBER.resin, 1);
      g.fillCircle(h.x, h.y, 3);
      g.fillStyle(AMBER.honey, 0.9);
      g.fillCircle(h.x - 0.8, h.y - 0.8, 1.1);
    }
  }

  /**
   * One car of the Train, as a dinosaur stampeding behind the rex. The kind cycles down the
   * line so the herd is mixed: triceratops, stegosaurus, raptor, ankylosaurus. Same footprint
   * as a hopper wagon (≈30×22). `overload` turns their eyes red and thickens the dust.
   */
  static drawStampeder(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, angle: number, t: number, overload: boolean, index: number,
  ): void {
    const F = frame(x, y, angle);
    const kind = index % 4;
    const stride = Math.sin(t * 13 + index * 1.3);
    const sway = Math.sin(t * 6 + index) * 5;

    g.fillStyle(AMBER.shadow, 0.3);
    blob(g, F, -3, 2, 22, 13);

    // Dust behind each runner.
    for (let i = 0; i < 2; i++) {
      const p = (t * 2 + i * 0.5 + index * 0.21) % 1;
      const d = F(-12 - p * 20, (i ? 1 : -1) * 7);
      g.fillStyle(AMBER.dust, (overload ? 0.42 : 0.3) * (1 - p));
      g.fillCircle(d.x, d.y, 3 + p * 7);
    }

    if (kind === 0) {
      // Triceratops: heavy body, bony frill, two brow horns and a nose horn.
      taperTail(g, F, AMBER.trikeDark, AMBER.trike, -10, -26, 6, sway);
      quadLegs(g, F, stride, 9, 11, 4, AMBER.trike, AMBER.trikeDark);
      g.fillStyle(AMBER.trikeDark, 1); blob(g, F, -1, 0, 14, 10.5);
      g.fillStyle(AMBER.trike, 1); blob(g, F, -1.5, -0.5, 12.8, 9.4);
      // Frill.
      const frill: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI;
        frill.push(F(11 - Math.cos(a) * 4.5, Math.sin(a) * 12));
      }
      frill.push(F(14, 7), F(14, -7));
      g.fillStyle(AMBER.bone, 1); g.fillPoints(frill, true);
      g.fillStyle(AMBER.plate, 0.75);
      for (let i = 1; i < 10; i += 2) {
        const p = frill[i];
        g.fillCircle(p.x, p.y, 1.3);
      }
      g.fillStyle(AMBER.trikeDark, 1); taper(g, F, 12, 23, 6, 2.6);
      g.fillStyle(AMBER.trike, 1); taper(g, F, 12.5, 22, 5, 2);
      g.fillStyle(AMBER.bone, 1);
      for (const side of [-1, 1]) taper(g, F, 15, 26, 1.4, 0.2, 0, side * 3.6);
      taper(g, F, 20, 25, 1.1, 0.2);
      for (const side of [-1, 1]) reptileEye(g, F(15.5, side * 4.4), 1.3, overload);
    } else if (kind === 1) {
      // Stegosaurus: small head low, two rows of plates up the back, spiked tail.
      taperTail(g, F, AMBER.stegoDark, AMBER.stego, -10, -27, 5.5, sway);
      const tt = F(-26, sway);
      g.lineStyle(1.6, AMBER.bone, 1);
      for (const side of [-1, 1]) {
        const sp = F(-24, sway * 0.9 + side * 6);
        g.lineBetween(tt.x, tt.y, sp.x, sp.y);
      }
      quadLegs(g, F, stride, 8, 9.5, 3.6, AMBER.stego, AMBER.stegoDark);
      g.fillStyle(AMBER.stegoDark, 1); blob(g, F, -1, 0, 14, 9);
      g.fillStyle(AMBER.stego, 1); blob(g, F, -1.5, -0.4, 12.6, 7.8);
      g.fillStyle(AMBER.stegoDark, 1); taper(g, F, 10, 20, 4, 2.2);
      g.fillStyle(AMBER.stego, 1); taper(g, F, 10.5, 19, 3.2, 1.6);
      for (let i = 0; i < 5; i++) {
        const f = 9 - i * 4.6;
        const h = 4 + Math.sin((i / 4) * Math.PI) * 3;
        for (const side of [-1, 1]) {
          const base = f + (side > 0 ? 2.2 : 0);
          g.fillStyle(AMBER.plate, 1);
          tri(g, F(base - 2.2, side * 0.8), F(base + 2.2, side * 0.8), F(base, side * (0.8 + h)));
          g.fillStyle(AMBER.resinLit, 0.6);
          tri(g, F(base - 1, side * 1.2), F(base + 1, side * 1.2), F(base, side * (0.8 + h * 0.7)));
        }
      }
      for (const side of [-1, 1]) reptileEye(g, F(16, side * 2.2), 1, overload);
    } else if (kind === 2) {
      // Raptor: slim, two long legs, long stiff tail, striped back, feather tufts.
      taperTail(g, F, AMBER.raptorDark, AMBER.raptor, -6, -28, 3.6, sway * 0.6);
      for (const side of [-1, 1]) {
        leg(g, F, -1 + side * stride * 5, side * 6.5, 3.6, AMBER.raptor, AMBER.raptorDark, AMBER.bone);
      }
      g.fillStyle(AMBER.raptorDark, 1); blob(g, F, 0, 0, 10, 6);
      g.fillStyle(AMBER.raptor, 1); blob(g, F, -0.4, -0.3, 9, 5.2);
      g.lineStyle(1.4, AMBER.raptorDark, 0.8);
      for (const f of [-5, -1, 3]) {
        const a = F(f, -4.6), b = F(f - 1.5, 4.6);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      g.fillStyle(AMBER.raptorDark, 1); taper(g, F, 7, 21, 3.4, 1.4);
      g.fillStyle(AMBER.raptor, 1); taper(g, F, 7.5, 20, 2.6, 1);
      g.fillStyle(AMBER.plate, 0.9);
      for (let i = 0; i < 3; i++) {
        const p = F(8 - i * 3, (i % 2 ? 1 : -1) * 1.5);
        g.fillCircle(p.x, p.y, 1.4);
      }
      g.lineStyle(1.2, AMBER.bone, 0.9);
      for (const side of [-1, 1]) {
        const a = F(8, side * 5), b = F(11, side * 7);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (const side of [-1, 1]) reptileEye(g, F(15, side * 2), 1.1, overload);
    } else {
      // Ankylosaurus: wide armoured oval studded with osteoderms, club on the tail.
      taperTail(g, F, AMBER.ankyloDark, AMBER.ankylo, -10, -25, 5, sway);
      const club = F(-27, sway);
      g.fillStyle(AMBER.ankyloDark, 1); g.fillCircle(club.x, club.y, 5);
      g.fillStyle(AMBER.boneShade, 1); g.fillCircle(club.x, club.y, 3.8);
      quadLegs(g, F, stride, 8, 12, 3.6, AMBER.ankylo, AMBER.ankyloDark);
      g.fillStyle(AMBER.ankyloDark, 1); blob(g, F, -1, 0, 14, 11.5);
      g.fillStyle(AMBER.ankylo, 1); blob(g, F, -1.5, -0.4, 12.6, 10.2);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const p = F(7 - c * 5.4 + (r % 2) * 2.7, (r - 1) * 5.4);
          g.fillStyle(AMBER.ankyloDark, 0.9); g.fillCircle(p.x + 0.6, p.y + 0.6, 1.9);
          g.fillStyle(AMBER.boneShade, 1); g.fillCircle(p.x, p.y, 1.6);
        }
      }
      for (const side of [-1, 1]) {
        g.fillStyle(AMBER.bone, 1);
        tri(g, F(4, side * 10.5), F(8, side * 10.5), F(6, side * 14));
        tri(g, F(-6, side * 11), F(-2, side * 11), F(-4, side * 14.5));
      }
      g.fillStyle(AMBER.ankyloDark, 1); taper(g, F, 11, 19, 5, 3.4);
      g.fillStyle(AMBER.ankylo, 1); taper(g, F, 11.5, 18.5, 4.2, 2.8);
      for (const side of [-1, 1]) reptileEye(g, F(15.5, side * 3), 1.1, overload);
    }
  }

  /** The Train's coal: a drumstick for the rex, glistening and faintly glowing. */
  static drawMeat(g: Phaser.GameObjects.Graphics, t: number, seed: number): void {
    const glow = 0.55 + 0.45 * Math.sin(t * 3 + seed);
    const F = frame(0, 0, seed);
    g.fillStyle(AMBER.resinLit, 0.22 * glow);
    g.fillCircle(0, 0, 14);
    // Bone shaft with its two knuckles.
    g.fillStyle(AMBER.bone, 1);
    taper(g, F, -2, -11, 1.8, 1.6);
    for (const side of [-1, 1]) {
      const k = F(-11.5, side * 2);
      g.fillCircle(k.x, k.y, 2.3);
    }
    // The meat.
    g.fillStyle(AMBER.resinDeep, 1);
    blob(g, F, 3, 0, 8.4, 6.6);
    g.fillStyle(AMBER.meat, 1);
    blob(g, F, 2.8, -0.3, 7.6, 5.8);
    g.fillStyle(AMBER.meatLit, 0.85);
    blob(g, F, 4, -2, 4, 2.2);
    g.fillStyle(AMBER.honeyPale, 0.7 * glow);
    const hi = F(5, -2.6);
    g.fillCircle(hi.x, hi.y, 1.2);
  }

  /**
   * A mosquito caught in an amber puddle — the one thing that says "resin" rather than
   * "orange oil". Seeded so it doesn't swim about between frames.
   */
  static drawInclusion(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, seed: number, alpha: number,
  ): void {
    const ang = seed * 7.3;
    const off = radius * 0.22;
    const cx = x + Math.cos(seed * 3.1) * off, cy = y + Math.sin(seed * 3.1) * off * 0.8;
    const k = Phaser.Math.Clamp(radius / 40, 0.6, 1.6);
    const F = frame(cx, cy, ang);
    g.lineStyle(0.9 * k, AMBER.resinDeep, 0.55 * alpha);
    for (const side of [-1, 1]) {
      for (const f of [-1.5, 0.5, 2.5]) {
        const a = F(f * k, side * 1 * k);
        const b = F((f - 1.5) * k, side * 6 * k);
        const c = F((f - 3) * k, side * 7.5 * k);
        g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineBetween(b.x, b.y, c.x, c.y);
      }
    }
    g.fillStyle(AMBER.honeyPale, 0.22 * alpha);
    for (const side of [-1, 1]) blob(g, F, -2 * k, side * 3.6 * k, 4.6 * k, 1.8 * k);
    g.fillStyle(AMBER.resinDeep, 0.6 * alpha);
    taper(g, F, 3 * k, -7 * k, 1.3 * k, 0.4 * k);
    const h = F(4 * k, 0);
    g.fillCircle(h.x, h.y, 1.4 * k);
    const p = F(8 * k, 0);
    g.lineStyle(0.7 * k, AMBER.resinDeep, 0.55 * alpha);
    g.lineBetween(h.x, h.y, p.x, p.y);
  }
}

function taperTail(
  g: Phaser.GameObjects.Graphics, F: Frame, dark: number, skin: number,
  f0: number, f1: number, w0: number, sway: number,
): void {
  g.fillStyle(dark, 1);
  taper(g, F, f0, f1, w0, 0.8, sway);
  g.fillStyle(skin, 1);
  taper(g, F, f0 + 0.5, f1 + 1.5, w0 * 0.8, 0.5, sway);
}

/** Four legs at a gallop: diagonal pairs move together. */
function quadLegs(
  g: Phaser.GameObjects.Graphics, F: Frame, stride: number,
  fore: number, side: number, size: number, skin: number, dark: number,
): void {
  for (const s of [-1, 1]) {
    leg(g, F, fore + s * stride * 3.5, s * side, size, skin, dark, AMBER.bone);
    leg(g, F, -fore + 1 - s * stride * 3.5, s * side, size, skin, dark, AMBER.bone);
  }
}
