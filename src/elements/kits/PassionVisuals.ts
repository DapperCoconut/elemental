import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Passion draws.
 *
 * The element never lands a blow it means as a blow, so its art has to carry the whole fight:
 * you can't read a Passion match off the health bars, only off how flushed the other fighter
 * is. That makes three things load-bearing rather than decorative — the heart-filled meter over
 * the enemy's head, the blush that deepens in three visible stages on their face, and the
 * hearts their eyes turn into once it is nearly over. Everything else in this file exists to
 * make those three legible at a glance.
 *
 * The rule for the rest: pink is never flat. Every fill is a deep wine shadow with a hot core
 * and a cream highlight on the upper-left, because a single mid-pink circle reads as a bubble
 * and this element already has enough of those.
 */

export type PassionColorFn = ColorFn;

export const PSN = {
  /** The dark everything is drawn against — a wine-black, never a neutral one. */
  ink: 0x2a0a1c,
  wine: 0x7a1338,
  /** The deep-red blush, and the heart of the rose. */
  deep: 0xc21e5b,
  /** The element colour, and the hot core of every fill. */
  hot: 0xff2f7d,
  pink: 0xff5fa2,
  /** The light blush, at 25%. */
  blush: 0xff9ec4,
  /** Highlights, lace, the cream of a camera flash cooling off. */
  cream: 0xffe3ef,
  /** Pistol trim and the warm edge of a flashbulb. */
  gold: 0xf7d774,
  leaf: 0x3f8f52,
  stem: 0x2c6b3a,
  /**
   * Bare skin, for the two mature-mode scenes. The only colours in the palette that aren't a
   * pink — which is the point: the suit coming off has to change the silhouette's *hue*, or a
   * pink character losing a pink suit reads as nothing happening at all.
   */
  tan: 0xd9a066,
  tanDeep: 0xa06d3e,
  /** The bar itself, and the white of a bulb going off. */
  censor: 0x101014,
  flash: 0xfff6d8,
};

// ── Primitives ────────────────────────────────────────────────────────────

/** Deterministic 0–1 noise, so anything that has to wobble the same way every frame can. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 61.3 + i * 293.7) * 24571.317;
  return v - Math.floor(v);
}

/** Local (u across, v along) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

/**
 * The outline of a heart, tip pointing along `ang`.
 *
 * Built off the classic parametric curve rather than two circles and a triangle — the lobes
 * have to meet in a real cusp at the top, and a bullet the player sees a hundred times a match
 * is exactly the wrong place to approximate that.
 */
export function heartPoints(
  x: number, y: number, size: number, ang = Math.PI / 2, segs = 26,
): Phaser.Geom.Point[] {
  // Local +v is the tip; rotate so that axis lands on `ang`.
  const th = ang - Math.PI / 2;
  const ca = Math.cos(th);
  const sa = Math.sin(th);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < segs; i++) {
    const t = (i / segs) * TAU;
    const hu = 16 * Math.sin(t) ** 3;
    const hv = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push(pt(x, y, ca, sa, (hu / 17) * size, (hv / 17) * size));
  }
  return pts;
}

/**
 * A filled heart with its shadow, core and highlight — the element's one universal shape.
 * `lit` pushes the highlight toward white for the things that are supposed to glow.
 */
export function heart(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, size: number, ang: number, color: number, alpha: number, lit = false,
): void {
  g.fillStyle(tint(PSN.wine), alpha * 0.85);
  g.fillPoints(heartPoints(x, y + size * 0.09, size * 1.06, ang), true);
  g.fillStyle(tint(color), alpha);
  g.fillPoints(heartPoints(x, y, size, ang), true);
  // Highlight on the upper-left lobe, offset along the shape's own axes so it survives rotation.
  const ca = Math.cos(ang - Math.PI / 2);
  const sa = Math.sin(ang - Math.PI / 2);
  const h = pt(x, y, ca, sa, -size * 0.34, -size * 0.34);
  g.fillStyle(tint(lit ? PSN.flash : PSN.cream), alpha * (lit ? 0.95 : 0.7));
  g.fillEllipse(h.x, h.y, size * 0.44, size * 0.3);
}

/** Just the outline — for the ghost hearts a cone or a ring is made of. */
export function heartOutline(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, size: number, ang: number, color: number, alpha: number, width = 1.6,
): void {
  g.lineStyle(width, tint(color), alpha);
  g.strokePoints(heartPoints(x, y, size, ang), true);
}

/**
 * The pink pistol, muzzle pointing along `ang`.
 *
 * A revolver rather than an automatic, because the cylinder is what makes it read as a *pistol*
 * at 20px instead of a pink rectangle. `kick` rocks the whole thing back around the grip on the
 * frame a shot is fired.
 */
export function pistol(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, ang: number, alpha: number, scale = 1, kick = 0,
): { x: number; y: number } {
  const a = ang - kick * 0.5;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const s = scale;
  const P = (u: number, v: number) => pt(x, y, ca, sa, u * s, v * s);

  // Grip: raked back and down, with a cream inlay panel.
  const grip = [P(-3, 1), P(-9, 9), P(-4.5, 11), P(1, 2.5)];
  g.fillStyle(tint(PSN.ink), alpha);
  g.fillPoints(grip, true);
  g.fillStyle(tint(PSN.cream), alpha * 0.5);
  g.fillPoints([P(-4.2, 2.6), P(-7.6, 8), P(-5.6, 8.8), P(-2.6, 3.2)], true);

  // Frame and barrel, one tapering run from the hammer to the muzzle.
  g.fillStyle(tint(PSN.deep), alpha);
  g.fillPoints([P(-4, -2.6), P(9, -2.2), P(13, -1.4), P(13, 1.2), P(-3.5, 2.2)], true);
  g.fillStyle(tint(PSN.hot), alpha);
  g.fillPoints([P(-3.4, -1.9), P(9, -1.6), P(12.4, -1), P(12.4, 0.2), P(-3, 0.6)], true);
  // The top strap catches the light along its whole length.
  g.lineStyle(0.9 * s, tint(PSN.cream), alpha * 0.65);
  g.lineBetween(P(-3.2, -2.2).x, P(-3.2, -2.2).y, P(12.6, -1.5).x, P(12.6, -1.5).y);

  // Cylinder — the part that says revolver.
  const cyl = P(2.4, -0.2);
  g.fillStyle(tint(PSN.wine), alpha);
  g.fillCircle(cyl.x, cyl.y, 3.4 * s);
  g.fillStyle(tint(PSN.pink), alpha);
  g.fillCircle(cyl.x, cyl.y, 2.6 * s);
  g.fillStyle(tint(PSN.ink), alpha * 0.9);
  for (let i = 0; i < 5; i++) {
    const ch = i * (TAU / 5) + a * 0.6;
    g.fillCircle(cyl.x + Math.cos(ch) * 1.5 * s, cyl.y + Math.sin(ch) * 1.5 * s, 0.62 * s);
  }

  // Trigger guard, hammer spur, gold bead at the muzzle.
  g.lineStyle(1.2 * s, tint(PSN.ink), alpha * 0.9);
  g.beginPath();
  const guard = P(-0.5, 3.4);
  g.arc(guard.x, guard.y, 2.8 * s, a - 0.4, a + Math.PI + 0.4, false);
  g.strokePath();
  g.fillStyle(tint(PSN.ink), alpha);
  g.fillPoints([P(-4.4, -2.4), P(-6.6, -3.6), P(-5.4, -0.8)], true);
  const tip = P(13.4, -0.1);
  g.fillStyle(tint(PSN.gold), alpha);
  g.fillCircle(tip.x, tip.y, 1.1 * s);

  // The engraving. Small, but it is the reason this is a Passion pistol and not a Hunt one.
  heart(g, tint, P(6.4, 0.2).x, P(6.4, 0.2).y, 2.6 * s, a + Math.PI / 2, PSN.cream, alpha * 0.8);
  return { x: tip.x, y: tip.y };
}

/**
 * A rose, head at (x, y) with the stem running back along `ang + π`.
 *
 * Petals are drawn as four rings of overlapping arcs working inward, each ring rotated off the
 * last, so the bloom has a spiral rather than a bullseye — the single detail that separates a
 * rose from a red circle at this size.
 */
export function rose(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, ang: number, alpha: number, scale = 1, wilt = 0,
): void {
  const back = ang + Math.PI;
  const s = scale;
  const droop = wilt * 0.5;

  // Stem: three segments, each bending further under the wilt.
  let px = x;
  let py = y;
  g.lineStyle(2.1 * s, tint(PSN.stem), alpha * (1 - wilt * 0.35));
  for (let i = 1; i <= 3; i++) {
    const seg = back + droop * i * 0.42;
    const cx = px + Math.cos(seg) * 7 * s;
    const cy = py + Math.sin(seg) * 7 * s + droop * i * 1.4 * s;
    g.lineBetween(px, py, cx, cy);
    px = cx;
    py = cy;
  }

  // Two leaves off the middle of the stem, angled apart.
  const mid = { x: (x + px) / 2, y: (y + py) / 2 };
  for (const side of [-1, 1]) {
    const la = back + side * 0.85 + droop * 0.5;
    const lca = Math.cos(la);
    const lsa = Math.sin(la);
    g.fillStyle(tint(side < 0 ? PSN.leaf : PSN.stem), alpha * (1 - wilt * 0.5));
    g.fillPoints([
      pt(mid.x, mid.y, lca, lsa, 0, 0),
      pt(mid.x, mid.y, lca, lsa, 2.2 * s, 4.5 * s),
      pt(mid.x, mid.y, lca, lsa, 0, 9 * s),
      pt(mid.x, mid.y, lca, lsa, -2.2 * s, 4.5 * s),
    ], true);
  }

  // The bloom: outer sepals, then the spiral.
  g.fillStyle(tint(PSN.wine), alpha);
  g.fillCircle(x, y, 5.4 * s);
  const rings: Array<[number, number, number]> = [
    [4.9, PSN.deep, 5], [3.7, PSN.hot, 4], [2.5, PSN.pink, 3],
  ];
  rings.forEach(([r, color, count], ri) => {
    g.fillStyle(tint(color), alpha * (1 - wilt * 0.3));
    for (let i = 0; i < count; i++) {
      const pa = ang + (i / count) * TAU + ri * 0.7;
      g.fillEllipse(
        x + Math.cos(pa) * r * 0.42 * s, y + Math.sin(pa) * r * 0.42 * s,
        r * 1.15 * s, r * 0.86 * s,
      );
    }
  });
  g.fillStyle(tint(PSN.cream), alpha * 0.55);
  g.fillEllipse(x - 1.1 * s, y - 1.3 * s, 2.1 * s, 1.5 * s);

  // A petal or two already on their way to the floor once it starts going.
  if (wilt > 0.4) {
    g.fillStyle(tint(PSN.deep), alpha * (wilt - 0.4) * 1.4);
    g.fillEllipse(x + 6 * s, y + 6 * s * wilt, 3.4 * s, 2.2 * s);
  }
}

/** The fedora, sitting on a crown at (x, y). Brim, pinched crown, band, and a rose in the band. */
export function fedora(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, alpha: number, tilt: number, scale = 1,
): void {
  const s = scale;
  const ca = Math.cos(tilt);
  const sa = Math.sin(tilt);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u * s, v * s);

  // Brim: a wide ellipse with the near edge rolled up, drawn as a second darker sliver.
  g.fillStyle(tint(PSN.wine), alpha);
  const brim = P(0, 1.5);
  g.fillEllipse(brim.x, brim.y, 34 * s, 11 * s);
  g.fillStyle(tint(PSN.ink), alpha * 0.55);
  g.fillEllipse(brim.x, brim.y + 1.6 * s, 34 * s, 6 * s);

  // Crown: a tapering box with the front pinch cut into its top edge.
  g.fillStyle(tint(PSN.deep), alpha);
  g.fillPoints([P(-11, 0), P(-8.5, -11), P(-2.5, -13), P(0, -10),
    P(2.5, -13), P(8.5, -11), P(11, 0)], true);
  g.fillStyle(tint(PSN.hot), alpha * 0.75);
  g.fillPoints([P(-8.5, -1), P(-6.6, -10), P(-2.5, -11.6), P(-1.4, -9)], true);

  // Band, and the rosebud tucked into it.
  g.fillStyle(tint(PSN.ink), alpha);
  g.fillPoints([P(-10.4, -1.4), P(-8.9, -6.4), P(8.9, -6.4), P(10.4, -1.4)], true);
  g.fillStyle(tint(PSN.cream), alpha * 0.35);
  g.lineStyle(0.8 * s, tint(PSN.cream), alpha * 0.35);
  g.lineBetween(P(-9.6, -4).x, P(-9.6, -4).y, P(9.6, -4).x, P(9.6, -4).y);
  const bud = P(8.2, -4.4);
  heart(g, tint, bud.x, bud.y, 4.2 * s, Math.PI / 2 + tilt, PSN.pink, alpha);
}

/**
 * The blush. Three stages, and the whole passive is legible off which one is on a face:
 * 1 = a hint at 25%, 2 = the deep red at 50%, 3 = the same red plus a shimmer at 75%.
 */
export function blush(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, stage: 1 | 2 | 3, alpha: number, t: number,
): void {
  const pulse = 1 + Math.sin(t * (stage === 1 ? 2.2 : 4.4)) * (stage === 1 ? 0.05 : 0.11);
  const color = stage === 1 ? PSN.blush : PSN.deep;
  const w = (stage === 1 ? 8.4 : 11.4) * pulse;
  const h = (stage === 1 ? 4.6 : 6.2) * pulse;
  const a = alpha * (stage === 1 ? 0.5 : 0.78);
  for (const side of [-1, 1]) {
    const bx = x + side * 11.5;
    const by = y - 1;
    g.fillStyle(tint(color), a * 0.45);
    g.fillEllipse(bx, by, w * 1.35, h * 1.3);
    g.fillStyle(tint(color), a);
    g.fillEllipse(bx, by, w, h);
    // The three little stroke marks that make a blush read as a blush and not a bruise.
    if (stage >= 2) {
      g.lineStyle(1.1, tint(PSN.hot), a * 0.8);
      for (let i = -1; i <= 1; i++) {
        g.lineBetween(bx + i * 3.1 - 1.2, by - 2.4, bx + i * 3.1 + 1.2, by + 2.4);
      }
    }
  }
  if (stage === 3) {
    // Shimmer: sparkles lifting off the cheeks, so 75% is never mistaken for 50%.
    for (let i = 0; i < 4; i++) {
      const ph = t * 2.4 + i * 1.7;
      const sx = x + (i < 2 ? -1 : 1) * (9 + jitter(i, 1) * 7);
      const sy = y - 6 - ((ph % 1) * 9);
      const sa2 = alpha * (1 - (ph % 1)) * 0.9;
      g.fillStyle(tint(PSN.cream), sa2);
      g.fillCircle(sx, sy, 1.5 * (1 - (ph % 1) * 0.5));
    }
  }
}

/** Heart-shaped eyes, replacing whatever the victim's own face was doing. Beat on their own clock. */
export function heartEyes(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, alpha: number, t: number,
): void {
  // Two beats per cycle, like a real one — a single sine reads as breathing, not a pulse.
  const beat = Math.max(Math.sin(t * 7), Math.sin(t * 7 - 0.9) * 0.7);
  const size = 6.4 + Math.max(0, beat) * 1.9;
  for (const side of [-1, 1]) {
    const ex = x + side * 7.4;
    const ey = y - 4;
    g.fillStyle(tint(PSN.hot), alpha * 0.28);
    g.fillCircle(ex, ey, size * 1.15);
    heart(g, tint, ex, ey, size, Math.PI / 2, PSN.hot, alpha, true);
  }
}

/** A lipstick print, left where a kiss landed. */
export function kissMark(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u * size, v * size);
  g.fillStyle(tint(PSN.deep), alpha);
  // Upper lip: two lobes meeting in a cupid's bow. Lower lip: one fuller sweep.
  g.fillPoints([P(-1, -0.05), P(-0.55, -0.42), P(-0.16, -0.14), P(0, -0.3),
    P(0.16, -0.14), P(0.55, -0.42), P(1, -0.05)], true);
  g.fillPoints([P(-1, 0.05), P(-0.5, 0.52), P(0.5, 0.52), P(1, 0.05)], true);
  g.lineStyle(1, tint(PSN.ink), alpha * 0.5);
  g.lineBetween(P(-1, 0).x, P(-1, 0).y, P(1, 0).x, P(1, 0).y);
  g.fillStyle(tint(PSN.cream), alpha * 0.4);
  g.fillEllipse(P(-0.4, 0.24).x, P(-0.4, 0.24).y, size * 0.4, size * 0.18);
}

/** The five things that come off during a censored Exhibition, in the order they leave. */
export type GarmentKind = 'hat' | 'jacket' | 'shirt' | 'tie' | 'trousers';

/**
 * One discarded piece of the suit, centred at (x, y) and rotated to `ang`.
 *
 * `settle` is 0 while the garment is still tumbling through the air and 1 once it has come to
 * rest on the floor. On landing the whole shape is squashed toward the floor plane *after* it
 * is rotated — squashing in the garment's own frame just makes a thinner jacket — and given a
 * contact shadow. Those two things are the entire difference between "in the air" and "on the
 * ground" when both are drawn from the same flat set of polygons.
 */
export function garment(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  kind: GarmentKind,
  x: number, y: number, ang: number, alpha: number, scale = 1, settle = 0,
): void {
  const s = scale;
  if (settle > 0.02) {
    g.fillStyle(tint(PSN.ink), alpha * 0.32 * settle);
    g.fillEllipse(x, y + 6 * s, 32 * s, 9 * s);
  }

  // The hat is the one piece that already has a drawing, and it lands brim-down anyway.
  if (kind === 'hat') {
    fedora(g, tint, x, y + 2 * s * settle, alpha, ang, s * (1 - 0.12 * settle));
    return;
  }

  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const fy = 1 - 0.42 * settle;
  const P = (u: number, v: number): Phaser.Geom.Point => {
    const p = pt(x, y, ca, sa, u * s, v * s);
    return new Phaser.Geom.Point(p.x, y + (p.y - y) * fy);
  };
  const poly = (pts: Array<[number, number]>, color: number, a: number): void => {
    g.fillStyle(tint(color), alpha * a);
    g.fillPoints(pts.map(([u, v]) => P(u, v)), true);
  };

  if (kind === 'jacket') {
    // Sleeves first, so the body reads as sitting in front of them rather than between them.
    poly([[-8, -9], [-18, -3], [-15, 4], [-7, 1]], PSN.wine, 0.95);
    poly([[8, -9], [18, -3], [15, 4], [7, 1]], PSN.wine, 0.95);
    poly([[-9, -10], [9, -10], [12, 11], [-12, 11]], PSN.ink, 0.95);
    // It came off open, so the cream lining is showing down the middle.
    poly([[-3.4, -10], [3.4, -10], [2.4, 10], [-2.4, 10]], PSN.cream, 0.5);
    poly([[-9, -10], [-2.6, -9], [-4.6, 1]], PSN.deep, 0.9);
    poly([[9, -10], [2.6, -9], [4.6, 1]], PSN.deep, 0.9);
    poly([[-6, -11.6], [6, -11.6], [4, -8.6], [-4, -8.6]], PSN.deep, 0.95);
    // The pin off the left lapel — the detail that makes this *his* jacket on the floor.
    const pin = P(-6.2, -5.6);
    heart(g, tint, pin.x, pin.y, 3.2 * s, Math.PI / 2 + ang, PSN.hot, alpha * 0.95);
  } else if (kind === 'shirt') {
    poly([[-7, -8], [-15, -2], [-12.5, 3.5], [-6, 0.5]], PSN.cream, 0.78);
    poly([[7, -8], [15, -2], [12.5, 3.5], [6, 0.5]], PSN.cream, 0.78);
    poly([[-8, -9], [8, -9], [9.5, 10], [-9.5, 10]], PSN.cream, 0.9);
    poly([[-5.4, -10.4], [0, -6], [-1.5, -9.8]], PSN.blush, 0.9);
    poly([[5.4, -10.4], [0, -6], [1.5, -9.8]], PSN.blush, 0.9);
    g.fillStyle(tint(PSN.blush), alpha * 0.7);
    for (let i = 0; i < 4; i++) {
      const b = P(0, -3.5 + i * 4);
      g.fillCircle(b.x, b.y, 0.9 * s);
    }
  } else if (kind === 'tie') {
    poly([[-2.6, -8], [2.6, -8], [2, -4.6], [-2, -4.6]], PSN.deep, 0.95);
    poly([[-2, -4.6], [2, -4.6], [3.4, 7], [0, 11], [-3.4, 7]], PSN.hot, 0.95);
    g.lineStyle(0.9 * s, tint(PSN.cream), alpha * 0.4);
    g.lineBetween(P(-1.6, -3).x, P(-1.6, -3).y, P(2.4, 6).x, P(2.4, 6).y);
  } else {
    // Trousers: a waistband and two legs with daylight between them, or it reads as a skirt.
    poly([[-8, -9], [8, -9], [8, -5], [-8, -5]], PSN.ink, 0.95);
    poly([[-8, -5], [-1, -5], [-1.6, 12], [-6.5, 12]], PSN.wine, 0.95);
    poly([[8, -5], [1, -5], [1.6, 12], [6.5, 12]], PSN.wine, 0.95);
    g.lineStyle(1 * s, tint(PSN.cream), alpha * 0.26);
    g.lineBetween(P(-7, -3).x, P(-7, -3).y, P(-5.4, 11).x, P(-5.4, 11).y);
    g.lineBetween(P(7, -3).x, P(7, -3).y, P(5.4, 11).x, P(5.4, 11).y);
  }
}

/**
 * The bare head, drawn over the fighter sprite while the suit is off.
 *
 * This exists because the `elem-passion` texture has the fedora *baked into it* — the sprite is
 * a heart, a revolver and a hat brim, and the rig's own fedora has always been a second hat sat
 * on top of the first. Suppressing the rig's one therefore leaves the sprite's one behind, so
 * the only way to actually take the hat off is to paint over the sprite. It is drawn on the rig's
 * body layer, which sits above the sprite and below the eyes.
 *
 * The hair is the payoff: nobody has seen this character's head before, because the hat has
 * covered it in every frame the game has ever drawn.
 */
export function bareHead(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, alpha: number, t: number,
): void {
  // Neck first, so the jaw and the torso both close over it.
  g.fillStyle(tint(PSN.tanDeep), alpha * 0.95);
  g.fillRect(x - 6, y + 2, 12, 10);

  g.fillStyle(tint(PSN.tanDeep), alpha * 0.9);
  g.fillCircle(x, y - 3, 21);
  g.fillStyle(tint(PSN.tan), alpha);
  g.fillCircle(x, y - 4, 20);
  // Ears, and the jaw shadow under the cheekbones.
  for (const side of [-1, 1]) {
    g.fillStyle(tint(PSN.tan), alpha);
    g.fillEllipse(x + side * 19.5, y - 2, 6, 9);
    g.fillStyle(tint(PSN.tanDeep), alpha * 0.5);
    g.fillEllipse(x + side * 19.5, y - 2, 2.6, 4.4);
  }
  g.fillStyle(tint(PSN.tanDeep), alpha * 0.34);
  g.fillEllipse(x, y + 8, 26, 9);

  // Hair: a slicked-back cap with a fringe swept to the left, breathing a little so it doesn't
  // read as a helmet.
  const sway = Math.sin(t * 1.7) * 0.7;
  g.fillStyle(tint(PSN.ink), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(x - 20, y - 6),
    new Phaser.Geom.Point(x - 17, y - 17),
    new Phaser.Geom.Point(x - 6, y - 23),
    new Phaser.Geom.Point(x + 8, y - 23),
    new Phaser.Geom.Point(x + 18, y - 16),
    new Phaser.Geom.Point(x + 20, y - 5),
    new Phaser.Geom.Point(x + 15, y - 9),
    new Phaser.Geom.Point(x + 4, y - 12 + sway),
    new Phaser.Geom.Point(x - 9, y - 10 + sway),
    new Phaser.Geom.Point(x - 15, y - 7),
  ], true);
  // The kiss-curl that escapes the sweep, and the shine along the top of it.
  g.fillStyle(tint(PSN.ink), alpha * 0.95);
  g.fillEllipse(x - 12, y - 8 + sway, 7, 5);
  g.fillStyle(tint(PSN.wine), alpha * 0.55);
  g.fillEllipse(x - 5, y - 18, 13, 4);
  g.fillStyle(tint(PSN.cream), alpha * 0.28);
  g.fillEllipse(x - 8, y - 19, 6, 2.2);

  // Cheek highlight, upper-left like every other fill in the element.
  g.fillStyle(tint(PSN.cream), alpha * 0.22);
  g.fillEllipse(x - 8, y - 1, 9, 6);
}

/**
 * The bed, thrown down under a mature-mode Make-out. The head end is along `ang`, so the two
 * fighters standing on it line up with the pillows.
 *
 * `rise` is 0 while it is still dropping into the arena and 1 once it has arrived: it scales the
 * whole thing up from nothing and drags a shadow out from under it, because a bed that simply
 * appears at full size reads as a texture pop rather than as something that landed.
 */
export function bed(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, ang: number, alpha: number, rise = 1, scale = 1,
): void {
  const s = scale * (0.55 + easeOut(Phaser.Math.Clamp(rise, 0, 1)) * 0.45);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  // Local u runs across the bed, v from the head (-) to the foot (+).
  const P = (u: number, v: number) => pt(x, y, ca, sa, u * s, v * s);
  const poly = (pts: Array<[number, number]>, color: number, a: number): void => {
    g.fillStyle(tint(color), alpha * a);
    g.fillPoints(pts.map(([u, v]) => P(u, v)), true);
  };

  // Contact shadow, offset down-screen rather than along the bed's own axis.
  g.fillStyle(tint(PSN.ink), alpha * 0.34);
  g.fillEllipse(x, y + 9 * s, 78 * s, 44 * s);

  // Frame, then the mattress inset into it.
  poly([[-33, -46], [33, -46], [33, 46], [-33, 46]], PSN.ink, 0.95);
  poly([[-29, -42], [29, -42], [29, 42], [-29, 42]], PSN.cream, 0.9);

  // Headboard: a slab with a heart cut into its top edge.
  poly([[-35, -56], [35, -56], [35, -44], [-35, -44]], PSN.wine, 0.98);
  poly([[-31, -54], [31, -54], [31, -47], [-31, -47]], PSN.deep, 0.6);
  const crest = P(0, -50);
  heart(g, tint, crest.x, crest.y, 9 * s, ang + Math.PI / 2, PSN.hot, alpha * 0.95);

  // Two pillows at the head end, each with a crease down its middle.
  for (const side of [-1, 1]) {
    const pc = P(side * 14, -33);
    g.fillStyle(tint(PSN.cream), alpha * 0.98);
    g.fillEllipse(pc.x, pc.y, 26 * s, 17 * s);
    g.fillStyle(tint(PSN.blush), alpha * 0.45);
    g.fillEllipse(pc.x, pc.y, 18 * s, 10 * s);
  }

  // The duvet, pulled up over the foot half, with a turned-back cream cuff along its top edge.
  poly([[-31, 2], [31, 2], [31, 44], [-31, 44]], PSN.wine, 0.96);
  poly([[-31, 2], [31, 2], [31, 9], [-31, 9]], PSN.cream, 0.75);
  // Quilting: hearts in a staggered grid, the pattern that makes it a Passion bed.
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col++) {
      const hp = P(col * 17 + (row % 2 ? 8.5 : 0), 17 + row * 11);
      heart(g, tint, hp.x, hp.y, 5 * s, ang + Math.PI / 2, PSN.hot, alpha * 0.55);
    }
  }
  // Folds running the length of the duvet.
  g.lineStyle(1.1 * s, tint(PSN.ink), alpha * 0.25);
  for (const u of [-16, 0, 16]) {
    g.lineBetween(P(u, 10).x, P(u, 10).y, P(u * 1.1, 43).x, P(u * 1.1, 43).y);
  }
}

/** A censor bar — black, hard-edged, with the hazard hatching along its long sides. */
export function censorBar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number, ang: number, alpha: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  g.fillStyle(PSN.censor, alpha);
  g.fillPoints([P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)], true);
  g.lineStyle(1.2, 0xffffff, alpha * 0.55);
  g.strokePoints([P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)], true);
  g.lineStyle(1, 0xffffff, alpha * 0.22);
  for (let u = -w / 2 + 3; u < w / 2; u += 5) {
    g.lineBetween(P(u, -h / 2).x, P(u, -h / 2).y, P(u + 2.4, h / 2).x, P(u + 2.4, h / 2).y);
  }
}

/**
 * The love meter, above whatever health bar the victim already has.
 *
 * Filled with hearts rather than a solid colour because it has to be unmistakable at a glance:
 * a plain pink bar in a game full of coloured bars would read as another shield layer, and this
 * one is the only bar in the game that kills you when it *finishes*.
 */
export function loveBar(
  g: Phaser.GameObjects.Graphics,
  tint: PassionColorFn,
  x: number, y: number, w: number, h: number, ratio: number, t: number, alpha = 1,
): void {
  const bx = x - w / 2;
  const r = Phaser.Math.Clamp(ratio, 0, 1);
  g.fillStyle(PSN.ink, alpha * 0.9);
  g.fillRect(bx - 1, y - 1, w + 2, h + 2);
  g.fillStyle(PSN.wine, alpha * 0.5);
  g.fillRect(bx, y, w, h);

  const fw = w * r;
  if (fw > 0.5) {
    g.fillStyle(tint(PSN.hot), alpha);
    g.fillRect(bx, y, fw, h);
    // The hearts inside the fill scroll slowly, so a full bar still looks like it is filling.
    for (let hx = bx + 3; hx < bx + fw - 1; hx += 6) {
      const drift = ((t * 8 + hx) % 6) - 3;
      const cx = hx + drift * 0.15;
      if (cx < bx + 1 || cx > bx + fw - 1) continue;
      g.fillStyle(tint(PSN.cream), alpha * 0.42);
      g.fillPoints(heartPoints(cx, y + h / 2, h * 0.62), true);
    }
    // A live heart riding the leading edge, beating faster the closer it is to done.
    const head = bx + fw;
    const beat = 1 + Math.sin(t * (5 + r * 12)) * 0.16;
    heart(g, tint, head, y + h / 2, (h * 0.95) * beat, Math.PI / 2, PSN.cream, alpha);
  }

  // The three stage marks, so the thresholds the blush announces are also on the meter.
  g.lineStyle(1, PSN.cream, alpha * 0.4);
  for (const mark of [0.25, 0.5, 0.75]) {
    g.lineBetween(bx + w * mark, y, bx + w * mark, y + h);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class PassionFx extends FxBase {
  /** Hearts drifting up and apart. The element's default "something happened". */
  hearts(x: number, y: number, count = 8, spread = 30, color = PSN.hot, ms = 720, depth = 9): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: -Math.PI / 2 + (Math.random() - 0.5) * 2.4,
      d: spread * (0.35 + Math.random() * 0.65),
      r: 4 + Math.random() * 5,
      s: i * 1.7 + Math.random() * 3,
      w: 0.6 + Math.random() * 1.4,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e + Math.sin(t * 7 + p.s) * p.w * 4;
        const py = y + Math.sin(p.a) * p.d * e - e * 26;
        heart(g, this.tint, px, py, p.r * (0.5 + e * 0.7), Math.PI / 2, color, (1 - t) * 0.9);
      }
    });
  }

  /** A ring of hearts opening outward — casts that affect an area rather than a direction. */
  heartRing(x: number, y: number, r0: number, r1: number, color = PSN.pink, ms = 600, depth = 9): void {
    const n = 12;
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      const r = r0 + (r1 - r0) * e;
      g.lineStyle(2, this.tint(color), (1 - t) * 0.5);
      g.strokeCircle(x, y, r);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + t * 0.6;
        heart(g, this.tint, x + Math.cos(a) * r, y + Math.sin(a) * r,
          6 * (1 - t * 0.4), a + Math.PI / 2, color, (1 - t) * 0.95);
      }
    });
  }

  /** The Flirt cone: a wedge that sweeps out along the aim, hearts riding its leading arc. */
  flirtCone(x: number, y: number, ang: number, reach: number, half: number, ms = 520): void {
    this.anim(9, ms, (g, t) => {
      const e = easeOut(t);
      const r = reach * e;
      const fade = 1 - t;
      g.fillStyle(this.tint(PSN.pink), fade * 0.16);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, r, ang - half, ang + half, false);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, this.tint(PSN.hot), fade * 0.6);
      g.beginPath();
      g.arc(x, y, r, ang - half, ang + half, false);
      g.strokePath();
      for (let i = 0; i <= 6; i++) {
        const a = ang - half + (i / 6) * half * 2;
        heart(g, this.tint, x + Math.cos(a) * r, y + Math.sin(a) * r,
          7 * (0.5 + e * 0.6), a, PSN.hot, fade * 0.95);
      }
    });
  }

  /** The pistol going off: a heart-shaped muzzle bloom and a puff of smoke behind it. */
  muzzle(x: number, y: number, ang: number): void {
    this.anim(10, 190, (g, t) => {
      const fade = 1 - t;
      heart(g, this.tint, x + Math.cos(ang) * 6, y + Math.sin(ang) * 6,
        13 * (0.6 + t * 0.9), ang, PSN.cream, fade * 0.9, true);
      for (let i = 0; i < 4; i++) {
        const a = ang + (jitter(i, 3) - 0.5) * 1.5;
        const d = 8 + t * 22 * (0.5 + jitter(i, 7));
        g.fillStyle(this.tint(PSN.blush), fade * 0.4);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.5 + t * 3.5);
      }
    });
  }

  /** A kiss landing: the print, and the hearts coming off it. */
  smooch(x: number, y: number, ang: number): void {
    this.anim(11, 620, (g, t) => {
      const fade = 1 - easeIn(t);
      kissMark(g, this.tint, x, y, ang + Math.PI / 2, 15 + t * 6, fade);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (jitter(i, 11) - 0.5) * 2;
        const d = t * (22 + jitter(i, 13) * 20);
        heart(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d,
          5 + jitter(i, 17) * 3, Math.PI / 2, PSN.hot, fade * 0.9);
      }
    });
  }

  /** Petals bursting off a thrown rose that connected. */
  petals(x: number, y: number, count = 10): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU, d: 16 + Math.random() * 34, spin: (Math.random() - 0.5) * 9, s: i,
    }));
    this.anim(9, 760, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + e * e * 16;
        const pa = p.a + p.spin * t;
        g.fillStyle(this.tint(p.s % 2 ? PSN.deep : PSN.hot), (1 - t) * 0.9);
        g.fillEllipse(px, py, 6 * Math.abs(Math.cos(pa)) + 2, 4);
      }
    });
  }

  /**
   * A flashbulb going off at the edge of the screen. Two of these a second, alternating sides,
   * is the whole read on Exhibition being up — the pose itself is on the character.
   */
  cameraFlash(x: number, y: number, facing: number): void {
    this.anim(24, 260, (g, t) => {
      const fade = 1 - t;
      // The bulb, then the cone of light it throws across the arena.
      g.fillStyle(PSN.flash, fade * 0.95);
      g.fillCircle(x, y, 7 + t * 5);
      g.fillStyle(PSN.gold, fade * 0.55);
      g.fillCircle(x, y, 13 + t * 12);
      g.fillStyle(PSN.flash, fade * 0.14);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, 240 * (0.4 + t * 0.9), facing - 0.42, facing + 0.42, false);
      g.closePath();
      g.fillPath();
      // Four-point star glint.
      g.lineStyle(2.2, PSN.flash, fade * 0.9);
      for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + 0.4;
        const r = 12 + t * 26;
        g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
    });
  }

  /**
   * The charm. Hearts close in around the victim, then everything goes at once — this plays
   * over a fighter that is already dead, so it is the only explanation the player gets.
   */
  charm(x: number, y: number): void {
    const n = 14;
    const seeds = Array.from({ length: n }, (_, i) => ({
      a: (i / n) * TAU + Math.random() * 0.3, r: 6 + Math.random() * 5,
    }));
    this.anim(12, 900, (g, t) => {
      // First half: the cage tightens. Second half: it blows outward and fades.
      const close = t < 0.45 ? 1 - easeIn(t / 0.45) : (t - 0.45) / 0.55;
      const d = t < 0.45 ? 20 + close * 46 : 20 + easeOut(close) * 120;
      const fade = t < 0.45 ? 1 : 1 - close;
      for (const s of seeds) {
        const px = x + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d;
        heart(g, this.tint, px, py, s.r * (t < 0.45 ? 1 + (1 - close) * 0.5 : 1 + close),
          s.a + Math.PI / 2, PSN.hot, fade * 0.95, true);
      }
      if (t >= 0.4) {
        const b = (t - 0.4) / 0.6;
        g.fillStyle(this.tint(PSN.cream), (1 - b) * 0.5);
        g.fillCircle(x, y, 26 * (1 + b * 2));
      }
      heart(g, this.tint, x, y, 26 * (1 + (t < 0.45 ? 0 : (t - 0.45))), Math.PI / 2,
        PSN.deep, fade * 0.85, true);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const PASSION_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: PSN.pink, alpha: 0.24 },
    { r: 7, color: PSN.hot, alpha: 0.95 },
    { r: 2.6, color: PSN.cream, alpha: 0.95, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: PSN.cream,
  eyePupil: PSN.ink,
  squash: { div: 14, x: 0.45, y: 0.26 },
};

/** What each hand layer becomes once the suit is off, indexed against `PASSION_AVATAR.hands`. */
const BARE_HANDS = [PSN.tan, PSN.tan, PSN.cream];

/**
 * The fighter sprite's colours while stripped — the head is the sprite, not part of the rig.
 * Top and bottom, because the repaint has to be a `setTintFill`: a plain multiplicative tint can
 * only ever darken the sprite's own pink, so tan comes out red rather than tan.
 */
export const PASSION_SKIN_TINT: [number, number] = [PSN.tan, PSN.tanDeep];

/**
 * The gunner: a fedora, a pink revolver and a rose when there is one. Nothing about the
 * silhouette is threatening on purpose — the pistol is held low and loose, and the only time
 * the character stops looking relaxed is while it is posing for the cameras.
 */
export class PassionAvatar extends BaseAvatar {
  private rose = false;
  private roseWilt = 0;
  /** 0–1 — how far into an Exhibition pose the character is. */
  private posing = 0;
  private censored = false;
  /** The suit and the hat are off — they are world objects on the floor for the pose's duration. */
  private stripped = false;
  private kick = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: PassionColorFn, depth = 6) {
    super(scene, tint, depth, PASSION_AVATAR);
  }

  setRose(on: boolean, wilt = 0): void { this.rose = on; this.roseWilt = Phaser.Math.Clamp(wilt, 0, 1); }
  setPosing(v: number): void { this.posing = Phaser.Math.Clamp(v, 0, 1); }
  setCensored(on: boolean): void { this.censored = on; }

  /**
   * The suit coming off, and with it the character's whole colour. The hands are the one part
   * of the silhouette the base class owns, so they have to be repainted here or they read as
   * gloves somebody kept on. Early-outs, because kits call this every frame.
   */
  setStripped(on: boolean): void {
    if (on === this.stripped) return;
    this.stripped = on;
    PASSION_AVATAR.hands.forEach((layer, i) => {
      const color = on ? BARE_HANDS[i] ?? layer.color : layer.color;
      this.forEachHandLayer(i, (arc) => arc.setFillStyle(this.tint(color), layer.alpha));
    });
  }
  /** Rocks the pistol back. Decays on its own, so a kit can fire this and forget it. */
  recoil(): void { this.kick = 1; }

  /**
   * Where the muzzle actually is. The pistol always rides hand 1 (see `drawExtras`), so this
   * is the only honest spawn point for a bullet — `castHand` answers with whichever hand the
   * last gesture used, which is the wrong one half the time.
   */
  pistolTip(): { x: number; y: number } {
    return {
      x: this.armX[1] + Math.cos(this.facing) * 13,
      y: this.armY[1] + Math.sin(this.facing) * 13,
    };
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.kick = Math.max(0, this.kick - delta / 130);
    super.update(delta, x, y, alpha);
  }

  /** The pose: one hand on the hip, the other thrown up behind the head. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'ride') return null;
    const sway = Math.sin(this.t * 2.6) * 0.12;
    return side < 0
      ? { ang: Math.PI * 0.78 + sway, dist: 26, scale: idle.scale * 1.05 }
      : { ang: -Math.PI * 0.62 + sway, dist: 40, scale: idle.scale * 1.2 };
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.36 : 0.24);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new PassionFx(this.scene, this.tint).hearts(x, y, 1, 8, PSN.blush, 420, 4);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(PSN.wine), a * 0.38);
    g.fillEllipse(x, y + 13, 48, 17);
    g.fillStyle(this.tint(PSN.pink), a * 0.16 * (1 + this.posing));
    g.fillEllipse(x, y + 10, 66 + Math.sin(this.t * 2) * 5, 26);
    // Hearts circling the feet, faster and wider while posing.
    const n = 3;
    for (let i = 0; i < n; i++) {
      const ha = this.t * (0.9 + this.posing * 2.2) + (i / n) * TAU;
      const hr = 26 + this.posing * 10 + Math.sin(this.t * 1.6 + i) * 3;
      heart(g, this.tint, x + Math.cos(ha) * hr, y + 12 + Math.sin(ha) * hr * 0.34,
        4.6, Math.PI / 2, PSN.pink, a * 0.5);
    }
  }

  /** A pink suit under a dark jacket: lapels, a collar, and a heart pin on the left one. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.stripped) {
      // The head goes on first and covers the sprite outright — hat, heart, revolver and all.
      // See `bareHead`: the fedora is part of the texture, so this is the only way it comes off.
      bareHead(g, this.tint, x, y, alpha, this.t);
      // Suit's on the floor. What is left has to be a shape in its own right rather than a hole,
      // because the censor bars only cover the middle of it — and it is tan rather than pink so
      // that the change is legible on a character whose every other part is already pink.
      g.fillStyle(this.tint(PSN.tan), alpha * 0.98);
      g.fillPoints([
        new Phaser.Geom.Point(x - 12, y + 2), new Phaser.Geom.Point(x + 12, y + 2),
        new Phaser.Geom.Point(x + 8, y + 10), new Phaser.Geom.Point(x + 11, y + 19),
        new Phaser.Geom.Point(x - 11, y + 19), new Phaser.Geom.Point(x - 8, y + 10),
      ], true);
      // Shading down the right-hand side, and the waist crease across the middle.
      g.fillStyle(this.tint(PSN.tanDeep), alpha * 0.45);
      g.fillPoints([
        new Phaser.Geom.Point(x + 4, y + 2), new Phaser.Geom.Point(x + 12, y + 2),
        new Phaser.Geom.Point(x + 8, y + 10), new Phaser.Geom.Point(x + 11, y + 19),
        new Phaser.Geom.Point(x + 3, y + 19),
      ], true);
      g.lineStyle(1.2, this.tint(PSN.tanDeep), alpha * 0.5);
      g.lineBetween(x - 8, y + 10, x + 8, y + 10);
      g.fillStyle(this.tint(PSN.cream), alpha * 0.32);
      g.fillEllipse(x - 6, y + 6, 8, 5);
      return;
    }
    g.fillStyle(this.tint(PSN.ink), alpha * 0.9);
    g.fillPoints([
      new Phaser.Geom.Point(x - 15, y + 4), new Phaser.Geom.Point(x - 6, y + 1),
      new Phaser.Geom.Point(x - 4, y + 18), new Phaser.Geom.Point(x - 16, y + 16),
    ], true);
    g.fillPoints([
      new Phaser.Geom.Point(x + 15, y + 4), new Phaser.Geom.Point(x + 6, y + 1),
      new Phaser.Geom.Point(x + 4, y + 18), new Phaser.Geom.Point(x + 16, y + 16),
    ], true);
    g.fillStyle(this.tint(PSN.cream), alpha * 0.85);
    g.fillPoints([
      new Phaser.Geom.Point(x - 5, y + 2), new Phaser.Geom.Point(x + 5, y + 2),
      new Phaser.Geom.Point(x + 3, y + 17), new Phaser.Geom.Point(x - 3, y + 17),
    ], true);
    g.fillStyle(this.tint(PSN.hot), alpha * 0.95);
    g.fillPoints([
      new Phaser.Geom.Point(x - 2.6, y + 3), new Phaser.Geom.Point(x + 2.6, y + 3),
      new Phaser.Geom.Point(x + 1.6, y + 16), new Phaser.Geom.Point(x - 1.6, y + 16),
    ], true);
    heart(g, this.tint, x - 10, y + 7, 4, Math.PI / 2, PSN.hot, alpha * 0.95);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const tilt = Math.sin(this.t * 1.4) * 0.06 - 0.14 + this.posing * 0.18;
    // The hat is the first thing to go when the suit comes off — the kit is drawing it on the
    // floor for as long as this is set, so drawing it on the head too would duplicate it.
    if (!this.stripped) fedora(g, this.tint, x, y - 19, alpha, tilt, this.mastered ? 1.12 : 1);

    // The pistol rides the right hand, muzzle along the aim.
    const hx = this.armX[1];
    const hy = this.armY[1];
    if (Number.isFinite(hx)) {
      pistol(g, this.tint, hx, hy, this.facing, alpha, 1, this.kick);
    }

    // The rose is held crosswise in the teeth — the one readout of whether F is armed.
    if (this.rose) {
      rose(g, this.tint, x + 13, y + 8, 0.35 + Math.sin(this.t * 2.2) * 0.08,
        alpha * 0.98, 0.95, this.roseWilt);
      g.lineStyle(1.4, this.tint(PSN.ink), alpha * 0.6);
      g.lineBetween(x - 4, y + 9, x + 4, y + 9);
    }

    if (this.posing <= 0.01) return;

    // ── Posing ──
    const p = this.posing;
    if (this.censored) {
      // The joke version. One small bar, over the only part that needs one — the face and the
      // chest stay visible, because the point of the pose is being looked at. It jitters a frame
      // at a time so it reads as broadcast censorship rather than as costume.
      const j = Math.floor(this.t * 9);
      censorBar(g, x + (jitter(this.seed, j) - 0.5) * 1.4, y + 15, 22, 10,
        (jitter(this.seed, j + 1) - 0.5) * 0.07, alpha * p);
    } else {
      // A sash of light across the chest and a burst of glamour sparkle.
      g.fillStyle(this.tint(PSN.cream), alpha * p * 0.22);
      g.fillPoints([
        new Phaser.Geom.Point(x - 17, y - 2), new Phaser.Geom.Point(x + 17, y + 8),
        new Phaser.Geom.Point(x + 17, y + 14), new Phaser.Geom.Point(x - 17, y + 4),
      ], true);
    }
    for (let i = 0; i < 5; i++) {
      const ph = (this.t * 1.6 + i * 0.37) % 1;
      const sa2 = alpha * p * (1 - ph) * 0.9;
      const sx = x + Math.cos(i * 1.9 + this.t) * (18 + ph * 22);
      const sy = y - 6 + Math.sin(i * 2.3 + this.t) * (16 + ph * 18);
      g.lineStyle(1.6, this.tint(PSN.flash), sa2);
      g.lineBetween(sx - 4, sy, sx + 4, sy);
      g.lineBetween(sx, sy - 4, sx, sy + 4);
    }
  }
}
