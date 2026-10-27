import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Cloth draws.
 *
 * Two materials and one silhouette rule. The materials are **wool** — soft, banded, always in
 * motion, and always the warmest thing on screen — and **steel**, which is every pin and needle:
 * hard, thin, and drawn with a single bright highlight down one edge so it reads as metal at four
 * pixels wide. Nothing here is a plain circle; the scarf is a knitted ribbon, the hand on the end
 * of it has fingers, a needle has an eye with thread through it, and a pincushion is a tomato.
 *
 * The silhouette rule is that **the scarf is the arm**. The tailor is a round ball of wool, and the
 * one long limb they have is the scarf wound round their crown, paid out to wherever the cursor
 * is and ending in a stitched cloth hand. The kit draws the scarf and the hand as world geometry
 * (the hand is the hitbox and the grip), so the rig only has to own the ball and the collar.
 *
 * Fire is the third material and it only ever arrives with the ultimate: wool takes it as glowing
 * stripes and scorched fringe, steel goes cherry-red, and the Father of the Flame is a charred
 * effigy towering over the ball with a crown of fire.
 */

export type ClothColorFn = ColorFn;

export const CLT = {
  /** Under everything. */
  ink: 0x1a0d12,
  deep: 0x30161f,
  /** The wool. The element's whole identity. */
  cloth: 0xd1435c,
  clothLit: 0xf5788c,
  clothDeep: 0x8a2135,
  /** The orb body's outer rim and mid tier — the same rose hue, darker and between. */
  clothRim: 0x52101f,
  clothMid: 0xae2f48,
  clothPale: 0xf7c3cc,
  /** Steel. Every pin and needle. */
  steel: 0xd8dfe8,
  steelLit: 0xffffff,
  steelDark: 0x6d7684,
  /** Brass: pin heads, needle eyes, clothes pegs. */
  brass: 0xe0a33c,
  brassLit: 0xffd98a,
  brassDark: 0x7a5312,
  /** Pinned — the bruised purple of wool full of needles, and the Recycle cushion. */
  pinned: 0x9b5de5,
  pinnedLit: 0xd0a8ff,
  pinnedDark: 0x4b2472,
  /** The pincushion: a ripe tomato with a green crown. */
  tomato: 0xd33b2c,
  tomatoLit: 0xff7a5c,
  tomatoDeep: 0x7a1710,
  leaf: 0x3f9b46,
  leafLit: 0x8fdc7a,
  leafDeep: 0x1d4f22,
  /** Undyed wool: the bola, the wrap and the bandage strips. */
  web: 0xe8ddc4,
  webDark: 0x9a8d6f,
  /** The Mystical Jacket — R+. Velvet violet with a gold lining. */
  jacket: 0x5b3fc4,
  jacketLit: 0x9d86ff,
  jacketDeep: 0x24165e,
  spark: 0xfff2a8,
  /** Clothesline rope and the laundry pegged on it. */
  rope: 0xc9b48a,
  ropeDark: 0x6e5a33,
  sheet: 0xf2ede4,
  sky: 0x7fb2e5,
  /** Burning Man. */
  ember: 0xff9130,
  emberLit: 0xffd98a,
  emberDark: 0x8c3a06,
  flame: 0xff5a1f,
  /** Red-hot steel. */
  hot: 0xff4d2e,
  hotLit: 0xffb27a,
  /** The Father of the Flame: charred wicker. */
  char: 0x241612,
  charMid: 0x3e2820,
  charLit: 0x6a4434,
  mask: 0xe9dcc4,
};

/** A cheap deterministic hash — the same seed always gives the same wobble. */
export function jitter(seed: number, n: number): number {
  const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

// ── Primitives ───────────────────────────────────────────────────────────────

/**
 * A pin: shaft, point, and a rounded head. `len` is the whole thing tip to head, `ang` points
 * from head toward tip, so a pin drawn at the caster's aim points the way it is travelling.
 */
export function pinGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  opts: { head?: number; hot?: boolean; headColor?: number } = {},
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const tipX = x + c * len * 0.5;
  const tipY = y + s * len * 0.5;
  const headX = x - c * len * 0.5;
  const headY = y - s * len * 0.5;
  const w = Math.max(0.9, len * 0.055);

  // The shaft, doubled: a dark body with a bright edge offset perpendicular. That offset is the
  // only thing that makes a 3px line read as round metal rather than as a scratch.
  const px = -s * w * 0.45;
  const py = c * w * 0.45;
  g.lineStyle(w * 1.9, tint(opts.hot ? CLT.emberDark : CLT.steelDark), alpha * 0.9);
  g.lineBetween(headX, headY, tipX, tipY);
  g.lineStyle(w * 0.8, tint(opts.hot ? CLT.hotLit : CLT.steelLit), alpha);
  g.lineBetween(headX - px, headY - py, tipX - px, tipY - py);

  g.fillStyle(tint(opts.hot ? CLT.hot : CLT.steelLit), alpha);
  g.fillPoints([
    P(tipX + c * w * 2.2, tipY + s * w * 2.2),
    P(tipX - s * w, tipY + c * w),
    P(tipX + s * w, tipY - c * w),
  ], true);

  const hr = opts.head ?? Math.max(1.4, len * 0.11);
  const head = opts.headColor ?? CLT.brass;
  g.fillStyle(tint(CLT.brassDark), alpha);
  g.fillCircle(headX, headY, hr);
  g.fillStyle(tint(head), alpha);
  g.fillCircle(headX - c * hr * 0.2, headY - s * hr * 0.2, hr * 0.72);
  g.fillStyle(tint(CLT.steelLit), alpha * 0.8);
  g.fillCircle(headX - hr * 0.3, headY - hr * 0.35, hr * 0.3);
}

/** One small flame: three nested tongues, licking upward and flickering on the clock. */
export function flameTongue(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, size: number, alpha: number, t: number, seed = 0,
): void {
  const flick = Math.sin(t * 13 + seed * 7) * 0.18 + Math.sin(t * 21 + seed * 3) * 0.08;
  const sway = Math.sin(t * 6 + seed) * size * 0.25;
  const layers: [number, number, number][] = [
    [CLT.flame, 1, 0.85],
    [CLT.ember, 0.7, 0.9],
    [CLT.emberLit, 0.4, 0.95],
  ];
  for (const [col, k, a] of layers) {
    const h = size * (1.6 + flick) * k;
    const w = size * 0.62 * k;
    g.fillStyle(tint(col), alpha * a);
    g.fillPoints([
      P(x - w, y),
      P(x - w * 0.6, y - h * 0.45),
      P(x + sway * k, y - h),
      P(x + w * 0.6, y - h * 0.45),
      P(x + w, y),
      P(x, y + w * 0.55),
    ], true);
  }
}

/**
 * The scarf, paid out from the collar to the hand. A knitted ribbon: a dark edge, the wool, bands
 * of a lighter and darker red crossing it, and a fringe of loose stitches along both sides. The
 * curve sags off the straight line by `slack` (0 taut, 1 hanging loose) so a free arm droops and a
 * hauling one snaps straight.
 *
 * `burn` (0–1) is Burning Man: the bands glow orange and flames lick off the top edge. `char`
 * is the Father of the Flame's blackened rope.
 */
export function scarfArm(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, t: number,
  opts: { width?: number; slack?: number; seed?: number; burn?: number; char?: boolean } = {},
): void {
  const width = opts.width ?? 10;
  const slack = opts.slack ?? 0.4;
  const seed = opts.seed ?? 0;
  const burn = opts.burn ?? 0;
  const char = !!opts.char;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // The sag always falls "down" on screen, whichever way the arm points.
  const down = ny >= 0 ? 1 : -1;
  const sag = slack * Math.min(60, len * 0.22) * down + Math.sin(t * 2.2 + seed) * 3 * slack;
  const cx = (x0 + x1) / 2 + nx * sag;
  const cy = (y0 + y1) / 2 + ny * sag;

  const n = Math.max(6, Math.min(40, Math.round(len / 9)));
  const pts: { x: number; y: number; ax: number; ay: number; w: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    const x = a * x0 + b * cx + c * x1;
    const y = a * y0 + b * cy + c * y1;
    // Tangent of the quadratic, for the ribbon's cross direction.
    const tx = 2 * (1 - u) * (cx - x0) + 2 * u * (x1 - cx);
    const ty = 2 * (1 - u) * (cy - y0) + 2 * u * (y1 - cy);
    const tl = Math.hypot(tx, ty) || 1;
    // Wider at the collar, narrowing to the wrist, with a soft ripple along it.
    const w = width * (1 - u * 0.35) * (1 + Math.sin(u * 14 + t * 4 + seed) * 0.06);
    pts.push({ x, y, ax: -ty / tl, ay: tx / tl, w });
  }

  const edge = (sideSign: number, k: number) => pts.map((p) => P(p.x + p.ax * p.w * k * sideSign, p.y + p.ay * p.w * k * sideSign));
  const outline = [...edge(1, 0.62), ...edge(-1, 0.62).reverse()];
  const body = [...edge(1, 0.5), ...edge(-1, 0.5).reverse()];

  g.fillStyle(tint(char ? CLT.ink : CLT.clothRim), alpha);
  g.fillPoints(outline, true);
  g.fillStyle(tint(char ? CLT.char : CLT.cloth), alpha);
  g.fillPoints(body, true);

  // Knitted bands crossing the ribbon.
  for (let i = 1; i < pts.length; i += 2) {
    const p = pts[i];
    const glow = burn > 0 ? 0.5 + 0.5 * Math.sin(t * 9 + i) : 0;
    const col = char ? (i % 4 === 1 ? CLT.emberDark : CLT.charMid)
      : burn > 0 ? (i % 4 === 1 ? CLT.ember : CLT.clothDeep)
        : (i % 4 === 1 ? CLT.clothLit : CLT.clothDeep);
    g.lineStyle(Math.max(1.4, p.w * 0.32), tint(col), alpha * (char ? 0.7 + glow * 0.3 : 0.75 + glow * 0.25));
    g.lineBetween(p.x + p.ax * p.w * 0.48, p.y + p.ay * p.w * 0.48, p.x - p.ax * p.w * 0.48, p.y - p.ay * p.w * 0.48);
  }
  // A pale rib down the middle, which is what makes it read as knitted rather than painted.
  g.lineStyle(1.1, tint(char ? CLT.charLit : CLT.clothPale), alpha * 0.45);
  g.beginPath();
  pts.forEach((p, i) => { if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); });
  g.strokePath();

  // Fringe: loose stitches off both edges.
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i];
    for (const sideSign of [1, -1]) {
      const fl = 2.4 + jitter(seed, i * 2 + (sideSign > 0 ? 0 : 1)) * 2.4;
      const bx = p.x + p.ax * p.w * 0.6 * sideSign;
      const by = p.y + p.ay * p.w * 0.6 * sideSign;
      g.lineStyle(1, tint(char ? CLT.emberDark : CLT.clothDeep), alpha * 0.8);
      g.lineBetween(bx, by, bx + p.ax * fl * sideSign, by + p.ay * fl * sideSign);
    }
  }

  if (burn > 0 || char) {
    // Flames along the top edge, thinning toward the hand.
    const step = Math.max(2, Math.round(pts.length / 6));
    for (let i = 1; i < pts.length; i += step) {
      const p = pts[i];
      flameTongue(g, tint, p.x, p.y - p.w * 0.3, (char ? 5 : 4) * (1 - (i / pts.length) * 0.4),
        alpha * Math.max(burn, char ? 1 : 0), t, seed + i);
    }
  }
}

/**
 * The scarf's hand: a stitched cloth mitten with four fingers and a thumb, at the end of the
 * scarf, pointing along `ang`. `grip` 0 is spread open, 1 is a closed fist on something.
 *
 * `char` turns it into the Father of the Flame's claw: blackened, glowing at the seams, and the
 * fingertips drawn out into hooked talons.
 */
export function scarfHand(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, alpha: number, t: number,
  opts: { grip?: number; scale?: number; burn?: number; char?: boolean } = {},
): void {
  const grip = Phaser.Math.Clamp(opts.grip ?? 0, 0, 1);
  const k = opts.scale ?? 1;
  const char = !!opts.char;
  const burn = opts.burn ?? 0;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const fwd = (d: number, side: number) => ({ x: x + c * d - s * side, y: y + s * d + c * side });

  const palmFill = char ? CLT.char : CLT.cloth;
  const palmEdge = char ? CLT.ink : CLT.clothRim;
  const fingerLen = (char ? 16 : 12) * k * (1 - grip * 0.55);
  const spread = (1 - grip) * 0.32 + 0.1;

  // Fingers: four capsules fanned forward. Drawn first so the palm overlaps their roots.
  for (let i = 0; i < 4; i++) {
    const side = (i - 1.5) * 4.4 * k;
    const a = ang + (i - 1.5) * spread * 0.55;
    const root = fwd(5 * k, side);
    const tip = { x: root.x + Math.cos(a) * fingerLen, y: root.y + Math.sin(a) * fingerLen };
    g.lineStyle(5.4 * k, tint(palmEdge), alpha);
    g.lineBetween(root.x, root.y, tip.x, tip.y);
    g.lineStyle(3.6 * k, tint(palmFill), alpha);
    g.lineBetween(root.x, root.y, tip.x, tip.y);
    // The knuckle stitch.
    const mid = { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 };
    g.lineStyle(0.9, tint(char ? CLT.ember : CLT.clothPale), alpha * (char ? 0.9 : 0.6));
    g.lineBetween(mid.x - s * 1.6 * k, mid.y + c * 1.6 * k, mid.x + s * 1.6 * k, mid.y - c * 1.6 * k);
    if (char) {
      // A hooked talon off every fingertip.
      const ta = a + 0.5;
      g.fillStyle(tint(CLT.ink), alpha);
      g.fillPoints([
        P(tip.x - s * 1.8 * k, tip.y + c * 1.8 * k),
        P(tip.x + Math.cos(ta) * 7 * k, tip.y + Math.sin(ta) * 7 * k),
        P(tip.x + s * 1.8 * k, tip.y - c * 1.8 * k),
      ], true);
      g.fillStyle(tint(CLT.ember), alpha * (0.6 + 0.4 * Math.sin(t * 8 + i)));
      g.fillCircle(tip.x, tip.y, 1.2 * k);
    }
  }

  // Thumb, off the lower side.
  {
    const a = ang + 1.1 - grip * 0.7;
    const root = fwd(0, 6 * k);
    const tl = 9 * k * (1 - grip * 0.3);
    const tip = { x: root.x + Math.cos(a) * tl, y: root.y + Math.sin(a) * tl };
    g.lineStyle(5.6 * k, tint(palmEdge), alpha);
    g.lineBetween(root.x, root.y, tip.x, tip.y);
    g.lineStyle(3.8 * k, tint(palmFill), alpha);
    g.lineBetween(root.x, root.y, tip.x, tip.y);
  }

  // Palm: a rounded mitten body.
  const palm = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
    const a = (i / 10) * TAU;
    return fwd(Math.cos(a) * 7 * k + 1 * k, Math.sin(a) * 8 * k);
  }).map((p) => P(p.x, p.y));
  g.fillStyle(tint(palmEdge), alpha);
  g.fillCircle(x + c * k, y + s * k, 9.2 * k);
  g.fillStyle(tint(palmFill), alpha);
  g.fillPoints(palm, true);
  // Stitched seam round the cuff and a highlight.
  g.lineStyle(1, tint(char ? CLT.ember : CLT.clothPale), alpha * (char ? 0.85 : 0.55));
  for (let i = -2; i <= 2; i++) {
    const a = fwd(-5 * k, i * 3 * k);
    const b = fwd(-3 * k, i * 3 * k + 1.2 * k);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
  if (!char) {
    const hl = fwd(2 * k, -3 * k);
    g.fillStyle(tint(CLT.clothLit), alpha * 0.6);
    g.fillEllipse(hl.x, hl.y, 6 * k, 3.2 * k);
  } else {
    // Glowing cracks across the charred palm.
    g.lineStyle(1.2, tint(CLT.ember), alpha * (0.6 + 0.4 * Math.sin(t * 6)));
    const a = fwd(-3 * k, -4 * k);
    const b = fwd(2 * k, 1 * k);
    const d = fwd(5 * k, -2 * k);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineBetween(b.x, b.y, d.x, d.y);
  }
  if (burn > 0 && !char) flameTongue(g, tint, x, y - 6 * k, 4.5 * k, alpha * burn, t, 3);
}

/**
 * A sewing needle, the size of a javelin. Long tapering steel, a slotted eye at the back with a
 * loop of red thread through it. `hot` is Burning Man's cherry-red; `wrapped` is the E+ bomb — a
 * bundle of cloth wound round the middle and tied off; `stuck` buries the point (a wall or the
 * floor took it) so only the back two thirds and a little crater show.
 */
export function needleGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, len: number, alpha: number, t: number,
  opts: { hot?: boolean; wrapped?: boolean; stuck?: boolean; seed?: number } = {},
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const hot = !!opts.hot;
  const tipK = opts.stuck ? 0.18 : 0.5;
  const tip = { x: x + c * len * tipK, y: y + s * len * tipK };
  const back = { x: x - c * len * 0.5, y: y - s * len * 0.5 };
  const w = Math.max(1.6, len * 0.06);
  const px = -s;
  const py = c;

  if (hot) {
    g.fillStyle(tint(CLT.flame), alpha * (0.2 + 0.1 * Math.sin(t * 10)));
    g.fillEllipse(x, y, len * 1.05, w * 6);
  }

  // Shaft as a long tapering quad.
  g.fillStyle(tint(hot ? CLT.emberDark : CLT.steelDark), alpha);
  g.fillPoints([
    P(back.x + px * w, back.y + py * w),
    P(tip.x + px * w * 0.3, tip.y + py * w * 0.3),
    P(tip.x + c * (opts.stuck ? 0 : w * 3), tip.y + s * (opts.stuck ? 0 : w * 3)),
    P(tip.x - px * w * 0.3, tip.y - py * w * 0.3),
    P(back.x - px * w, back.y - py * w),
  ], true);
  g.lineStyle(w * 0.55, tint(hot ? CLT.hotLit : CLT.steelLit), alpha);
  g.lineBetween(back.x + px * w * 0.35, back.y + py * w * 0.35, tip.x + px * w * 0.12, tip.y + py * w * 0.12);
  if (hot) {
    g.lineStyle(w * 0.9, tint(CLT.hot), alpha * 0.7);
    g.lineBetween(x - c * len * 0.1, y - s * len * 0.1, tip.x, tip.y);
  }

  // The eye: a slot in the flattened back end, with thread through it.
  const eye = { x: back.x + c * w * 2.2, y: back.y + s * w * 2.2 };
  g.fillStyle(tint(hot ? CLT.hot : CLT.steel), alpha);
  g.fillEllipse(eye.x, eye.y, w * 3.4, w * 3.4);
  g.fillStyle(tint(CLT.ink), alpha);
  g.fillPoints([
    P(eye.x - c * w * 1.1, eye.y - s * w * 1.1),
    P(eye.x + px * w * 0.4, eye.y + py * w * 0.4),
    P(eye.x + c * w * 1.1, eye.y + s * w * 1.1),
    P(eye.x - px * w * 0.4, eye.y - py * w * 0.4),
  ], true);
  g.lineStyle(1.4, tint(CLT.cloth), alpha * 0.95);
  g.beginPath();
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const d = u * len * 0.32;
    const wob = Math.sin(u * 5 + t * 3 + (opts.seed ?? 0)) * 4 * u;
    const qx = eye.x - c * d + px * (wob + u * 5);
    const qy = eye.y - s * d + py * (wob + u * 5);
    if (i === 0) g.moveTo(qx, qy); else g.lineTo(qx, qy);
  }
  g.strokePath();

  if (opts.wrapped) {
    // The bomb: a fat knot of wool bound round the shaft, its tied ends fluttering.
    const m = { x: x - c * len * 0.06, y: y - s * len * 0.06 };
    g.fillStyle(tint(CLT.clothRim), alpha);
    g.fillEllipse(m.x, m.y, len * 0.36 + 4, w * 6 + 3);
    g.fillStyle(tint(hot ? CLT.ember : CLT.cloth), alpha);
    g.fillEllipse(m.x, m.y, len * 0.34, w * 5.4);
    for (let i = -2; i <= 2; i++) {
      const bx = m.x + c * i * len * 0.06;
      const by = m.y + s * i * len * 0.06;
      g.lineStyle(1.4, tint(i % 2 ? CLT.clothDeep : CLT.clothLit), alpha * 0.85);
      g.lineBetween(bx + px * w * 2.6, by + py * w * 2.6, bx - px * w * 2.6, by - py * w * 2.6);
    }
    const flick = Math.sin(t * 12 + (opts.seed ?? 0)) * 3;
    g.fillStyle(tint(CLT.clothLit), alpha);
    g.fillTriangle(m.x, m.y - w * 2.4, m.x - 5 + flick, m.y - w * 2.4 - 7, m.x + 3 + flick, m.y - w * 2.4 - 6);
    // The fuse: a little spark at the knot.
    g.fillStyle(tint(CLT.emberLit), alpha * (0.5 + 0.5 * Math.sin(t * 16)));
    g.fillCircle(m.x + flick * 0.4, m.y - w * 2.4 - 6, 1.6);
  }

  if (opts.stuck) {
    // Where it went in: a dark crater with a crack or two.
    g.fillStyle(tint(CLT.ink), alpha * 0.5);
    g.fillEllipse(tip.x, tip.y, w * 4, w * 2.4);
    g.lineStyle(1, tint(CLT.ink), alpha * 0.5);
    g.lineBetween(tip.x, tip.y, tip.x + c * 6 - px * 4, tip.y + s * 6 - py * 4);
    g.lineBetween(tip.x, tip.y, tip.x + c * 5 + px * 5, tip.y + s * 5 + py * 5);
  }
}

/**
 * The bola: three weighted balls of wool on cords, spinning round a knot. With R+ it is no longer
 * a bola at all — it is the Mystical Jacket, flying sleeves-first with a trail of gold sparks.
 */
export function bolaGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, spin: number, alpha: number, t: number,
  opts: { jacket?: boolean; hot?: boolean; heading?: number } = {},
): void {
  if (opts.jacket) {
    jacketGlyph(g, tint, x, y, opts.heading ?? 0, 15, alpha, t, { flying: true, hot: opts.hot });
    return;
  }
  const R = 15;
  const pts = [0, 1, 2].map((i) => ({ x: x + Math.cos(spin + (i / 3) * TAU) * R, y: y + Math.sin(spin + (i / 3) * TAU) * R }));
  g.lineStyle(1.6, tint(CLT.webDark), alpha);
  for (const p of pts) g.lineBetween(x, y, p.x, p.y);
  g.fillStyle(tint(CLT.clothDeep), alpha);
  g.fillCircle(x, y, 2.6);
  for (const p of pts) {
    g.fillStyle(tint(CLT.clothRim), alpha);
    g.fillCircle(p.x, p.y, 6.2);
    g.fillStyle(tint(opts.hot ? CLT.ember : CLT.web), alpha);
    g.fillCircle(p.x, p.y, 5);
    g.lineStyle(1, tint(opts.hot ? CLT.emberDark : CLT.webDark), alpha * 0.8);
    g.lineBetween(p.x - 4, p.y - 1.5, p.x + 4, p.y + 1.5);
    g.lineBetween(p.x - 1.5, p.y - 4, p.x + 1.5, p.y + 4);
    if (opts.hot) flameTongue(g, tint, p.x, p.y - 3, 3, alpha, t, p.x);
  }
  // A blur ring, so a spinning bola reads as spinning.
  g.lineStyle(2, tint(CLT.web), alpha * 0.22);
  g.strokeCircle(x, y, R);
}

/**
 * The Mystical Jacket: a violet velvet jacket with gold piping. Flying, the sleeves trail behind
 * it; worn (wrapped round a victim), the sleeves cross over the chest and buckle at the back.
 */
export function jacketGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, ang: number, r: number, alpha: number, t: number,
  opts: { flying?: boolean; hot?: boolean } = {},
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const L = (fx: number, fy: number) => P(x + c * fx - s * fy, y + s * fx + c * fy);
  if (opts.flying) {
    // Body of the coat, collar forward.
    g.fillStyle(tint(CLT.jacketDeep), alpha);
    g.fillPoints([L(r, -r * 0.7), L(r * 0.2, -r), L(-r, -r * 0.8), L(-r * 1.1, r * 0.8), L(r * 0.2, r), L(r, r * 0.7)], true);
    g.fillStyle(tint(opts.hot ? CLT.ember : CLT.jacket), alpha);
    g.fillPoints([L(r * 0.85, -r * 0.55), L(r * 0.1, -r * 0.85), L(-r * 0.9, -r * 0.65), L(-r * 0.95, r * 0.65), L(r * 0.1, r * 0.85), L(r * 0.85, r * 0.55)], true);
    // Sleeves streaming back.
    const flap = Math.sin(t * 14) * r * 0.25;
    for (const side of [-1, 1]) {
      g.lineStyle(r * 0.42, tint(CLT.jacketDeep), alpha);
      const a = L(r * 0.1, side * r * 0.8);
      const b = L(-r * 1.6, side * (r * 1.1 + flap * side));
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(r * 0.28, tint(CLT.jacketLit), alpha);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Gold piping and the lapel.
    g.lineStyle(1.4, tint(CLT.brassLit), alpha);
    const l1 = L(r * 0.85, 0);
    const l2 = L(-r * 0.4, 0);
    g.lineBetween(l1.x, l1.y, l2.x, l2.y);
  } else {
    // Worn: a jacket hugging a body, sleeves crossed.
    g.fillStyle(tint(CLT.jacketDeep), alpha * 0.9);
    g.fillCircle(x, y, r + 2);
    g.fillStyle(tint(CLT.jacket), alpha * 0.85);
    g.fillCircle(x, y, r);
    for (const side of [-1, 1]) {
      g.lineStyle(r * 0.34, tint(CLT.jacketLit), alpha * 0.9);
      g.lineBetween(x - r * 0.9 * side, y - r * 0.4, x + r * 0.7 * side, y + r * 0.5);
    }
    g.fillStyle(tint(CLT.brass), alpha);
    g.fillRect(x - 3, y + r * 0.36, 6, 4);
    g.lineStyle(1.4, tint(CLT.brassLit), alpha * 0.9);
    g.strokeCircle(x, y, r);
  }
  // Gold motes.
  for (let i = 0; i < 5; i++) {
    const a = t * 2 + i * 1.3;
    const d = r * (1.05 + 0.25 * Math.sin(t * 3 + i));
    g.fillStyle(tint(CLT.spark), alpha * (0.5 + 0.5 * Math.sin(t * 7 + i * 2)));
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5);
  }
}

/**
 * Somebody caught by Constraining Cloth: bound in strips of undyed wool wound diagonally round
 * them, the loose ends fluttering. `hot` smoulders (Burning Man), and `life` 0–1 thins the
 * wrapping as it works loose.
 */
export function clothWrap(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
  opts: { hot?: boolean; life?: number; seed?: number } = {},
): void {
  const life = opts.life ?? 1;
  const seed = opts.seed ?? 0;
  g.fillStyle(tint(CLT.webDark), alpha * 0.45);
  g.fillCircle(x, y, r + 1);
  const bands = Math.max(2, Math.round(5 * life + 1));
  for (let i = 0; i < bands; i++) {
    const off = (i / bands - 0.5) * r * 1.6;
    const tilt = 0.55 + (i % 2) * -1.1;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const half = Math.sqrt(Math.max(0, r * r - off * off)) + 2;
    const ax = x - s * off - c * half;
    const ay = y + c * off - s * half;
    const bx = x - s * off + c * half;
    const by = y + c * off + s * half;
    g.lineStyle(6, tint(CLT.webDark), alpha);
    g.lineBetween(ax, ay, bx, by);
    g.lineStyle(4.2, tint(opts.hot ? (i % 2 ? CLT.ember : CLT.emberDark) : (i % 2 ? CLT.web : CLT.sheet)), alpha);
    g.lineBetween(ax, ay, bx, by);
  }
  // Loose ends.
  for (let i = 0; i < 2; i++) {
    const a = jitter(seed, i) * TAU;
    const ex = x + Math.cos(a) * r;
    const ey = y + Math.sin(a) * r;
    const flick = Math.sin(t * 8 + i * 3) * 4;
    g.fillStyle(tint(CLT.web), alpha);
    g.fillTriangle(ex - 2, ey, ex + 2, ey, ex + Math.cos(a) * 11 + flick, ey + Math.sin(a) * 11 - flick);
  }
  if (opts.hot) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + t;
      flameTongue(g, tint, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.5, 4, alpha, t, i + seed);
    }
  }
}

/**
 * The pincushion: a fat tomato with a leafy crown and a strawberry on a thread, pins stuck all
 * over its top. `pins` of `maxPins` are drawn — they come out one by one as it fires. Recycle (F+)
 * makes it purple, Burning Man sets it alight, and `squash` is the flinch from a punch.
 */
export function pincushion(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, r: number, pins: number, maxPins: number, alpha: number, t: number,
  opts: { purple?: boolean; burn?: boolean; squash?: number; seed?: number; life?: number } = {},
): void {
  const sq = opts.squash ?? 0;
  const seed = opts.seed ?? 0;
  const w = r * (1 + sq * 0.25);
  const h = r * 0.82 * (1 - sq * 0.25);
  const fill = opts.purple ? CLT.pinned : CLT.tomato;
  const lit = opts.purple ? CLT.pinnedLit : CLT.tomatoLit;
  const deep = opts.purple ? CLT.pinnedDark : CLT.tomatoDeep;

  g.fillStyle(tint(CLT.ink), alpha * 0.35);
  g.fillEllipse(x, y + h * 0.85, w * 2.1, h * 0.7);
  g.fillStyle(tint(deep), alpha);
  g.fillEllipse(x, y, w * 2 + 3, h * 2 + 3);
  g.fillStyle(tint(fill), alpha);
  g.fillEllipse(x, y, w * 2, h * 2);
  // The tomato's segments: curved seams converging on the crown.
  g.lineStyle(1.3, tint(deep), alpha * 0.7);
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const px = x + i * w * 0.32 * Math.sin(u * Math.PI);
      const py = y - h + u * h * 2;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  g.fillStyle(tint(lit), alpha * 0.7);
  g.fillEllipse(x - w * 0.35, y - h * 0.35, w * 0.6, h * 0.4);

  // Pins, round the upper half, heads in a few colours.
  const heads = [CLT.brass, CLT.sky, CLT.leafLit, CLT.sheet, CLT.clothLit, CLT.pinnedLit, CLT.ember, CLT.jacketLit];
  for (let i = 0; i < pins; i++) {
    const u = maxPins > 1 ? i / (maxPins - 1) : 0.5;
    const a = Math.PI * (1.12 + u * 0.76) + (jitter(seed, i) - 0.5) * 0.15;
    const bx = x + Math.cos(a) * w * 0.72;
    const by = y + Math.sin(a) * h * 0.72;
    const out = a + (jitter(seed, i + 20) - 0.5) * 0.4;
    const len = r * 0.95;
    pinGlyph(g, tint, bx + Math.cos(out) * len * 0.35, by + Math.sin(out) * len * 0.35, out + Math.PI, len, alpha,
      { head: 2.2, headColor: heads[i % heads.length], hot: opts.burn });
  }

  // Crown of leaves, then the strawberry hanging off it.
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55;
    g.fillStyle(tint(CLT.leafDeep), alpha);
    g.fillTriangle(x - 2, y - h + 1, x + 2, y - h + 1, x + Math.cos(a) * r * 0.5, y - h + Math.sin(a) * r * 0.2 + 2);
    g.fillStyle(tint(CLT.leaf), alpha);
    g.fillTriangle(x - 1.2, y - h + 1, x + 1.2, y - h + 1, x + Math.cos(a) * r * 0.42, y - h + Math.sin(a) * r * 0.16 + 2);
  }
  const sway = Math.sin(t * 2 + seed) * 3;
  g.lineStyle(1, tint(CLT.leafDeep), alpha);
  g.lineBetween(x + 2, y - h, x + w * 0.9 + sway, y - h * 0.2);
  g.fillStyle(tint(opts.purple ? CLT.pinnedDark : CLT.tomatoDeep), alpha);
  g.fillTriangle(x + w * 0.9 + sway - 4, y - h * 0.2, x + w * 0.9 + sway + 4, y - h * 0.2, x + w * 0.9 + sway, y - h * 0.2 + 9);
  g.fillStyle(tint(CLT.leafLit), alpha);
  g.fillCircle(x + w * 0.9 + sway, y - h * 0.2, 1.8);

  if (opts.burn) {
    // Charred patches and flames licking off the top.
    g.fillStyle(tint(CLT.char), alpha * 0.45);
    g.fillEllipse(x + w * 0.3, y + h * 0.2, w * 0.7, h * 0.5);
    for (let i = 0; i < 4; i++) {
      flameTongue(g, tint, x + (i - 1.5) * w * 0.45, y - h * 0.55, 6, alpha, t, i + seed);
    }
  }
  if (opts.life !== undefined && opts.life < 1) {
    // A thin ring counting the cushion's own life down.
    g.lineStyle(2, tint(CLT.clothPale), alpha * 0.55);
    g.beginPath();
    g.arc(x, y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * opts.life);
    g.strokePath();
  }
}

/**
 * A clothesline strung from one side of the arena to the other: sagging rope, wooden pegs, and
 * laundry hung along it swaying in the draught. `lit` brightens the rope while it is being ridden.
 */
export function clothesline(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, t: number,
  opts: { seed?: number; lit?: boolean } = {},
): void {
  const seed = opts.seed ?? 0;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Laundry always hangs toward the bottom of the screen.
  const hx = 0;
  const hy = 1;
  // Kept nearly taut on purpose: the hand has to find the rope where it is drawn.
  const at = (u: number) => ({ x: x0 + dx * u, y: y0 + dy * u + Math.sin(u * Math.PI) * 4 * Math.abs(ux) });

  g.lineStyle(3.4, tint(CLT.ropeDark), alpha);
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const p = at(i / 24); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
  g.strokePath();
  g.lineStyle(1.8, tint(opts.lit ? CLT.brassLit : CLT.rope), alpha);
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const p = at(i / 24); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
  g.strokePath();
  // Twist marks, so it reads as rope.
  for (let i = 1; i < 24; i += 2) {
    const p = at(i / 24);
    g.lineStyle(1, tint(CLT.ropeDark), alpha * 0.7);
    g.lineBetween(p.x - uy * 1.6 - ux * 1.2, p.y + ux * 1.6 - uy * 1.2, p.x + uy * 1.6 + ux * 1.2, p.y - ux * 1.6 + uy * 1.2);
  }

  // Laundry: a few garments, each pegged at two points.
  const items = Math.max(3, Math.round(len / 160));
  const kinds = ['sock', 'shirt', 'sheet', 'sock', 'scarf'];
  const cols = [CLT.sky, CLT.sheet, CLT.clothLit, CLT.brass, CLT.leafLit, CLT.cloth];
  for (let i = 0; i < items; i++) {
    const u = (i + 0.5 + (jitter(seed, i) - 0.5) * 0.4) / items;
    const p = at(u);
    const kind = kinds[(i + Math.floor(seed)) % kinds.length];
    const col = cols[(i * 3 + Math.floor(seed)) % cols.length];
    const sway = Math.sin(t * 1.7 + i * 1.9 + seed) * 3;
    const wv = kind === 'sheet' ? 30 : kind === 'shirt' ? 22 : kind === 'scarf' ? 10 : 9;
    const hv = kind === 'sheet' ? 26 : kind === 'shirt' ? 20 : kind === 'scarf' ? 30 : 16;
    const lx = p.x - ux * wv * 0.5;
    const ly = p.y - uy * wv * 0.5;
    const rx = p.x + ux * wv * 0.5;
    const ry = p.y + uy * wv * 0.5;
    g.fillStyle(tint(col), alpha * 0.92);
    if (kind === 'sock') {
      g.fillPoints([P(lx, ly), P(rx, ry), P(rx + hx * hv + sway, ry + hy * hv * 0.7), P(rx + hx * hv + 6 + sway, ry + hy * hv),
        P(lx + hx * hv + sway, ly + hy * hv), P(lx + hx * hv * 0.8 + sway, ly + hy * hv * 0.8)], true);
    } else if (kind === 'shirt') {
      g.fillPoints([P(lx - 4, ly + 2), P(lx, ly), P(rx, ry), P(rx + 4, ry + 2), P(rx + 6, ry + 7),
        P(rx + sway, ry + hv), P(lx + sway, ly + hv), P(lx - 6, ly + 7)], true);
    } else {
      g.fillPoints([P(lx, ly), P(rx, ry), P(rx + sway * 1.4, ry + hv), P(lx + sway, ly + hv)], true);
    }
    g.lineStyle(1, tint(CLT.ink), alpha * 0.35);
    g.lineBetween(lx + sway * 0.5, ly + hv * 0.6, rx + sway * 0.7, ry + hv * 0.6);
    // Pegs.
    for (const q of [{ x: lx + ux * 2, y: ly + uy * 2 }, { x: rx - ux * 2, y: ry - uy * 2 }]) {
      g.fillStyle(tint(CLT.brassDark), alpha);
      g.fillRect(q.x - 1.6, q.y - 4, 3.2, 8);
      g.fillStyle(tint(CLT.brass), alpha);
      g.fillRect(q.x - 1, q.y - 3.4, 2, 6.8);
    }
  }
  // Posts at the walls.
  for (const p of [{ x: x0, y: y0 }, { x: x1, y: y1 }]) {
    g.fillStyle(tint(CLT.ropeDark), alpha);
    g.fillCircle(p.x, p.y, 5);
    g.fillStyle(tint(CLT.rope), alpha);
    g.fillCircle(p.x, p.y, 3);
  }
}

/** A scrap of burning cloth, tumbling: a ragged red triangle eaten by an orange edge and a flame. */
export function burnScrap(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, spin: number, size: number, alpha: number, t: number, seed = 0,
): void {
  const pts = [0, 1, 2, 3, 4].map((i) => {
    const a = spin + (i / 5) * TAU;
    const r = size * (0.6 + jitter(seed, i) * 0.6);
    return P(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7);
  });
  g.fillStyle(tint(CLT.ember), alpha);
  g.fillPoints(pts, true);
  const inner = pts.map((p) => P(x + (p.x - x) * 0.7, y + (p.y - y) * 0.7));
  g.fillStyle(tint(CLT.clothDeep), alpha);
  g.fillPoints(inner, true);
  g.fillStyle(tint(CLT.char), alpha * 0.8);
  g.fillCircle(x + Math.cos(spin) * size * 0.2, y, size * 0.3);
  flameTongue(g, tint, x, y - size * 0.3, size * 0.55, alpha, t, seed);
}

/**
 * The Father of the Flame: a charred wicker effigy looming over the tailor, robed in black, a pale
 * mask with hollow eyes, a crown of flame. Drawn behind the ball (`back`) and as a ring of fire
 * over it (`front`), so the tailor stands inside the figure.
 */
export function effigy(
  g: Phaser.GameObjects.Graphics, tint: ColorFn,
  x: number, y: number, size: number, alpha: number, t: number, layer: 'back' | 'front',
): void {
  const k = size / 40;
  if (layer === 'back') {
    // Heat haze.
    g.fillStyle(tint(CLT.flame), alpha * (0.12 + 0.05 * Math.sin(t * 4)));
    g.fillEllipse(x, y - 18 * k, 120 * k, 150 * k);
    // The robe: a tall tapering cloak.
    g.fillStyle(tint(CLT.ink), alpha);
    g.fillPoints([P(x - 44 * k, y + 26 * k), P(x - 26 * k, y - 34 * k), P(x - 14 * k, y - 58 * k), P(x + 14 * k, y - 58 * k),
      P(x + 26 * k, y - 34 * k), P(x + 44 * k, y + 26 * k), P(x, y + 34 * k)], true);
    g.fillStyle(tint(CLT.char), alpha);
    g.fillPoints([P(x - 38 * k, y + 22 * k), P(x - 22 * k, y - 32 * k), P(x - 12 * k, y - 54 * k), P(x + 12 * k, y - 54 * k),
      P(x + 22 * k, y - 32 * k), P(x + 38 * k, y + 22 * k), P(x, y + 29 * k)], true);
    // Wicker ribs glowing through the char.
    for (let i = 0; i < 6; i++) {
      const yy = y - 46 * k + i * 12 * k;
      const ww = 12 * k + i * 4.6 * k;
      g.lineStyle(1.6 * k, tint(i % 2 ? CLT.emberDark : CLT.ember), alpha * (0.45 + 0.35 * Math.sin(t * 5 + i)));
      g.lineBetween(x - ww, yy, x + ww, yy + 3 * k);
    }
    g.lineStyle(1.2 * k, tint(CLT.charLit), alpha * 0.6);
    for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 8 * k, y - 50 * k, x + i * 15 * k, y + 24 * k);
    // The mask, above the ball.
    const my = y - 46 * k;
    g.fillStyle(tint(CLT.mask), alpha);
    g.fillEllipse(x, my, 18 * k, 22 * k);
    g.fillStyle(tint(CLT.ink), alpha);
    g.fillEllipse(x - 4 * k, my - 2 * k, 4.4 * k, 6 * k);
    g.fillEllipse(x + 4 * k, my - 2 * k, 4.4 * k, 6 * k);
    g.fillStyle(tint(CLT.emberLit), alpha * (0.6 + 0.4 * Math.sin(t * 7)));
    g.fillCircle(x - 4 * k, my - 1.6 * k, 1.2 * k);
    g.fillCircle(x + 4 * k, my - 1.6 * k, 1.2 * k);
    g.lineStyle(1 * k, tint(CLT.ink), alpha * 0.8);
    g.lineBetween(x - 3 * k, my + 6 * k, x + 3 * k, my + 6 * k);
    // The crown of fire.
    for (let i = 0; i < 7; i++) {
      flameTongue(g, tint, x + (i - 3) * 4.6 * k, my - 9 * k - Math.abs(i - 3) * -1.2 * k, (6 - Math.abs(i - 3)) * k * 1.5, alpha, t, i);
    }
    return;
  }
  // Front: fire licking round the hem and the shoulders.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI + Math.PI;
    const fx = x + Math.cos(a) * 36 * k;
    const fy = y + 22 * k + Math.sin(a) * -6 * k;
    flameTongue(g, tint, fx, fy, 7 * k, alpha * 0.9, t, i + 11);
  }
  for (const side of [-1, 1]) flameTongue(g, tint, x + side * 24 * k, y - 30 * k, 6 * k, alpha * 0.8, t, side + 30);
}

// ── Fx ───────────────────────────────────────────────────────────────────────

/** Every transient Cloth throws. Persistent art lives in the kit's own layers. */
export class ClothFx extends FxBase {
  /** A pin landing: a short steel star and a puff of lint. */
  stab(x: number, y: number, ang: number, scale = 1): void {
    this.anim(11, 180, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(2.4 * (1 - t) * scale, this.tint(CLT.steelLit), 1 - t);
      for (let i = 0; i < 4; i++) {
        const a = ang + (i - 1.5) * 0.5;
        g.lineBetween(x, y, x + Math.cos(a) * (6 + k * 13) * scale, y + Math.sin(a) * (6 + k * 13) * scale);
      }
      g.fillStyle(this.tint(CLT.clothPale), (1 - t) * 0.6);
      for (let i = 0; i < 4; i++) {
        const a = ang + Math.PI + (jitter(i, 1) - 0.5) * 1.6;
        g.fillCircle(x + Math.cos(a) * k * 14, y + Math.sin(a) * k * 14, 1.6 * (1 - t) * scale);
      }
    });
  }

  /** Wool coming apart — the generic Cloth hurt puff. */
  lint(x: number, y: number, n = 6, spread = 16, ms = 420, color = CLT.cloth): void {
    const seed = Math.random() * 999;
    this.anim(10, ms, (g, t) => {
      for (let i = 0; i < n; i++) {
        const a = jitter(seed, i) * TAU;
        const d = easeOut(t) * spread * (0.4 + jitter(seed, i + 40) * 0.9);
        g.fillStyle(this.tint(i % 3 === 0 ? CLT.clothPale : color), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 6, 2.4 * (1 - t * 0.6));
      }
    });
  }

  /** The hand closing on the floor or a wall: a puckered patch and a few flicked stitches. */
  grip(x: number, y: number, wall: boolean): void {
    this.anim(9, 260, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(2.2 * (1 - t), this.tint(wall ? CLT.clothPale : CLT.cloth), 1 - t);
      g.strokeCircle(x, y, 5 + k * 14);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.4;
        g.lineStyle(1.2, this.tint(CLT.clothDeep), (1 - t) * 0.8);
        g.lineBetween(x + Math.cos(a) * (6 + k * 6), y + Math.sin(a) * (6 + k * 6),
          x + Math.cos(a) * (10 + k * 12), y + Math.sin(a) * (10 + k * 12));
      }
    });
  }

  /** A needle dropping out of the sky: a falling streak, then a bite and a ring of dust. */
  needleFall(x: number, y: number, hot = false): void {
    this.anim(12, 420, (g, t) => {
      const fall = Math.min(1, t / 0.55);
      if (fall < 1) {
        const yy = y - 220 * (1 - easeIn(fall));
        g.lineStyle(2, this.tint(hot ? CLT.ember : CLT.steelLit), 0.5);
        g.lineBetween(x, yy - 40, x, yy);
        needleGlyph(g, this.tint, x, yy, Math.PI / 2, 34, 1, t, { hot });
      } else {
        const k = easeOut((t - 0.55) / 0.45);
        g.lineStyle(2.4 * (1 - k), this.tint(CLT.clothPale), 1 - k);
        g.strokeEllipse(x, y, 10 + k * 34, 4 + k * 12);
      }
    });
  }

  /** A shotgun spray of pins leaving one point (E+'s bomb, or a pincushion firing). */
  barrage(x: number, y: number, r: number, color = CLT.clothPale): void {
    this.flashIn(x, y, r * 0.4, CLT.steelLit, color, 11);
    this.anim(11, 300, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(4 * (1 - t), this.tint(color), (1 - t) * 0.7);
      g.strokeCircle(x, y, r * k);
    });
  }

  /** Burning Man lighting: a flash, a fireball ring, scraps thrown off. */
  ignite(x: number, y: number, r: number): void {
    this.flashIn(x, y, r * 0.5, CLT.emberLit, CLT.flame, 12);
    this.anim(12, 520, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(10 * (1 - t), this.tint(CLT.flame), (1 - t) * 0.55);
      g.strokeCircle(x, y, r * k);
      g.lineStyle(3 * (1 - t), this.tint(CLT.emberLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * k * 0.82);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.2;
        flameTongue(g, this.tint, x + Math.cos(a) * r * k, y + Math.sin(a) * r * k, 6 * (1 - t), 1 - t, t * 3, i);
      }
    });
  }

  /** Embers lifting off something burning. */
  embers(x: number, y: number, n = 6, spread = 18): void {
    const seed = Math.random() * 999;
    this.anim(12, 620, (g, t) => {
      for (let i = 0; i < n; i++) {
        const a = jitter(seed, i) * TAU;
        const d = easeOut(t) * spread * (0.3 + jitter(seed, i + 9));
        g.fillStyle(this.tint(i % 2 ? CLT.emberLit : CLT.ember), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 26, 1.8 * (1 - t * 0.5));
      }
    });
  }

  /** Cloth binding round somebody: strips wind in from outside. */
  wrap(x: number, y: number, r: number, jacket = false): void {
    this.anim(11, 380, (g, t) => {
      const k = easeOut(t);
      for (let i = 0; i < 4; i++) {
        const a = t * 6 + (i / 4) * TAU;
        const d = r * (2 - k);
        g.lineStyle(5 * (1 - t * 0.5), this.tint(jacket ? CLT.jacketLit : CLT.web), 1 - t * 0.4);
        g.beginPath();
        g.arc(x, y, d, a, a + 1.4);
        g.strokePath();
      }
      if (jacket) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + t;
          g.fillStyle(this.tint(CLT.spark), 1 - t);
          g.fillCircle(x + Math.cos(a) * r * (1 + k), y + Math.sin(a) * r * (1 + k), 1.8);
        }
      }
    });
  }

  /** Something made of cloth giving way: a ring of torn fabric. */
  burst(x: number, y: number, r: number, color = CLT.cloth): void {
    this.flashIn(x, y, r * 0.35, CLT.clothPale, color, 11);
    this.anim(11, 420, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(7 * (1 - t), this.tint(color), (1 - t) * 0.5);
      g.strokeCircle(x, y, r * k);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + t * 0.7;
        const d = r * k;
        g.fillStyle(this.tint(color), (1 - t) * 0.7);
        g.fillPoints([
          P(x + Math.cos(a) * d, y + Math.sin(a) * d),
          P(x + Math.cos(a + 0.16) * (d - 12), y + Math.sin(a + 0.16) * (d - 12)),
          P(x + Math.cos(a - 0.16) * (d - 12), y + Math.sin(a - 0.16) * (d - 12)),
        ], true);
      }
    });
  }

  /** Pins driven into the tailor off the cushion: three stabs converging on the body. */
  selfPin(x: number, y: number): void {
    this.anim(11, 300, (g, t) => {
      const k = easeIn(t);
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.8;
        const d = 34 * (1 - k) + 10;
        pinGlyph(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI, 16, 1, { headColor: CLT.pinnedLit });
      }
      g.fillStyle(this.tint(CLT.pinnedLit), t * 0.4 * (1 - t) * 4);
      g.fillCircle(x, y, 22);
    });
  }
}

// ── The tailor ───────────────────────────────────────────────────────────────

const CLOTH_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: CLT.clothDeep, alpha: 0.3 },
    { r: 5.5, color: CLT.cloth, alpha: 0.92 },
    { r: 2.2, color: CLT.clothPale, alpha: 0.95, ox: -1.3, oy: -1.6 },
  ],
  eyeWhite: CLT.clothPale,
  eyePupil: CLT.ink,
  squash: { div: 14, x: 0.5, y: 0.32 },
};

/**
 * A round ball of red wool with a scarf wound twice round its crown.
 *
 * Cloth has no sprite underneath (`elem-bodyless`), so `drawBody` paints the torso: the one-hue
 * orb every early element is — dark wine rim, rose core, one rim light, one glint — wound with
 * strands of yarn so it reads as a ball of wool. The two little ball hands are the tailor's own;
 * the long arm is the scarf, which the kit paints from the collar out to the stitched hand. The
 * free end leaves the collar on the side the kit is reaching.
 *
 * Burning Man (`setBurn`) scorches the wool and puts fire on the crown; the Father of the Flame
 * (`setEffigy`) chars the ball black with ember seams — the effigy itself is world art the kit
 * paints round it.
 */
export class ClothAvatar extends BaseAvatar {
  private flare = 0;
  private burn = 0;
  private burnTarget = 0;
  private charred = false;
  /** Pins stuck in the ball right now (the self-pin from touching your own cushion). */
  private pins = 0;

  constructor(scene: Phaser.Scene, tint: ClothColorFn, depth = 6) {
    super(scene, tint, depth, CLOTH_AVATAR);
  }

  setBurn(on: boolean): void { this.burnTarget = on ? 1 : 0; }
  setEffigy(on: boolean): void { this.charred = on; }
  setPins(n: number): void { this.pins = Math.max(0, Math.min(3, n)); }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 340);
    this.burn += (this.burnTarget - this.burn) * Math.min(1, delta / 220);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  /** Brass eyes and a brighter corona round each hand. */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CLT.brassLit : CLT.clothPale);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 12 : 9);
      glow.setFillStyle(this.tint(on ? CLT.brass : CLT.clothDeep), on ? 0.4 : 0.3);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new ClothFx(this.scene, this.tint).lint(x, y, 2, 7, 300, this.burn > 0.5 ? CLT.ember : CLT.clothDeep);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(this.burn > 0.3 ? CLT.flame : CLT.clothDeep), a * (0.4 + this.burn * 0.15));
    g.fillEllipse(x, y + 19, 52, 14);
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const ch = this.charred;
    g.fillStyle(this.tint(ch ? CLT.ink : CLT.clothRim), alpha);
    g.fillCircle(x, y, 22);
    g.fillStyle(this.tint(ch ? CLT.char : CLT.clothDeep), alpha);
    g.fillCircle(x, y, 19.5);
    g.fillStyle(this.tint(ch ? CLT.charMid : CLT.clothMid), alpha);
    g.fillCircle(x, y + 1, 16);
    g.fillStyle(this.tint(ch ? CLT.charMid : CLT.cloth), alpha);
    g.fillCircle(x, y + 2.5, 12);
    g.fillStyle(this.tint(ch ? CLT.charLit : CLT.clothLit), alpha * 0.85);
    g.fillEllipse(x, y + 7, 16, 8);
    g.lineStyle(2.5, this.tint(ch ? CLT.ember : CLT.clothLit), alpha * 0.9);
    g.strokeCircle(x, y, 21);
    g.fillStyle(this.tint(ch ? CLT.charLit : CLT.clothPale), alpha * 0.85);
    g.fillEllipse(x - 6.5, y - 8, 8, 5);

    // Wound yarn: strands crossing the orb in three directions.
    const spin = this.t * 0.15;
    for (let i = 0; i < 7; i++) {
      const tilt = spin + (i % 3) * (Math.PI / 3) + (i * 0.21);
      const r = 8 + (i % 4) * 3.3;
      const c = Math.cos(tilt), sn = Math.sin(tilt);
      const arc = (rr: number, col: number, al: number, w: number) => {
        g.lineStyle(w, this.tint(col), alpha * al);
        g.beginPath();
        for (let k = 0; k <= 10; k++) {
          const u = Math.PI * 0.15 + (k / 10) * Math.PI * 0.7;
          const ex = Math.cos(u) * rr, ey = Math.sin(u) * rr * 0.42;
          const px = x + ex * c - ey * sn, py = y + 3 + ex * sn + ey * c;
          if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      };
      arc(r, ch ? CLT.ink : CLT.clothRim, 0.35, 1.6);
      arc(r - 0.8, ch ? CLT.ember : (this.burn > 0.5 && i % 2 ? CLT.ember : CLT.clothLit), ch ? 0.5 : 0.35, 0.9);
    }
    // Pins it has been stabbed with off its own cushion.
    for (let i = 0; i < this.pins; i++) {
      const ang = Math.PI * (1.3 + i * 0.22);
      pinGlyph(g, this.tint, x + Math.cos(ang) * 17, y + Math.sin(ang) * 17, ang + Math.PI, 13, alpha,
        { head: 2.2, headColor: CLT.pinnedLit });
    }
    if (this.burn > 0.05 && !ch) {
      g.fillStyle(this.tint(CLT.emberDark), alpha * this.burn * 0.35);
      g.fillCircle(x + 5, y + 6, 9);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 16;
    const lean = Math.cos(this.facing) * 1.5;
    const ch = this.charred;

    // The collar: the scarf wound twice round the crown. The arm leaves from here.
    for (let i = 0; i < 2; i++) {
      const cy = crown + i * 4;
      g.fillStyle(this.tint(CLT.ink), alpha * 0.5);
      g.fillEllipse(x + lean, cy + 1.2, 28 - i * 3.6, 9 - i * 1.4);
      g.fillStyle(this.tint(ch ? CLT.char : i ? CLT.clothDeep : CLT.cloth), alpha);
      g.fillEllipse(x + lean, cy, 27 - i * 3.6, 8.4 - i * 1.4);
      g.fillStyle(this.tint(ch ? CLT.ember : CLT.clothPale), alpha * 0.3);
      g.fillEllipse(x + lean - 3, cy - 1.6, 14 - i * 2.6, 2.6);
    }
    // Brass thimble on the off hand.
    const tx = this.armX[0], ty = this.armY[0] - 3;
    g.fillStyle(this.tint(CLT.brassDark), alpha);
    g.fillRoundedRect(tx - 3.5, ty - 4.5, 7, 7, { tl: 3.5, tr: 3.5, bl: 1, br: 1 });
    g.fillStyle(this.tint(this.mastered ? CLT.brassLit : CLT.brass), alpha);
    g.fillRoundedRect(tx - 2.8, ty - 4, 5.6, 6, { tl: 2.8, tr: 2.8, bl: 1, br: 1 });

    if (this.burn > 0.05) {
      for (let i = 0; i < 3; i++) {
        flameTongue(g, this.tint, x + lean + (i - 1) * 8, crown - 3, 5 + (i === 1 ? 2 : 0), alpha * this.burn, this.t, i);
      }
    }
    if (this.flare > 0.01) {
      g.fillStyle(this.tint(CLT.clothPale), alpha * this.flare * 0.25);
      g.fillCircle(x, y, 24);
    }
  }
}
