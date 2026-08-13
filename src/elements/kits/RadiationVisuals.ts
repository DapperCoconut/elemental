import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Radiation draws.
 *
 * One material and one silhouette rule. The material is **lead with something loose inside it**:
 * every shape in this file is a heavy, flat, dark-violet plate with a hard edge, and every one of
 * them has a seam in it that the green is getting out through. Nothing here glows all over — the
 * glow is always a crack, a vent, a window or a lamp, because a suit that is uniformly green is a
 * suit that is not containing anything.
 *
 * The rule is that the element is **instrumentation**: if a shape does something, it says so
 * first. Tracers blink before they confirm, the drum ticks before it goes, the airdrop paints its
 * own footprint on the floor a second and a half before it lands. Radiation never surprises
 * anybody; it just arrives on schedule.
 *
 * The palette is a lead ladder and a neon ladder with two colours off them: the hazard yellow of
 * a drum and the white-hot core of the railgun itself.
 */

export type RadiationColorFn = ColorFn;

export const RAD = {
  /** Under everything. */
  ink: 0x0b0614,
  /** Lead: the armour, the drums, every heavy plate in the element. */
  leadDeep: 0x1c1030,
  lead: 0x33194f,
  leadLit: 0x512b78,
  /** The seam colour — where lead stops working. */
  seam: 0x7a3fb0,
  /** Neon: the load. Five steps so a lamp, a puddle and a detonation are not the same green. */
  neonDeep: 0x1f5a10,
  neonMid: 0x3f9e18,
  neon: 0x7cff3d,
  neonLit: 0xc2ff8f,
  wash: 0xeeffdc,
  /** Hazard yellow — drums, stripes and nothing else. */
  hazard: 0xe0b52a,
  hazardDeep: 0x6d550c,
  /** The railgun's core, and the only white in the element. */
  core: 0xf6ffe8,
  /** Bones, under X-ray. */
  bone: 0xd9ffcf,
  boneShade: 0x5c8a4c,
  /**
   * The hot ladder — the shop upgrades' colour, and nothing else uses it.
   *
   * Everything Radiation owns is green because green is contained. These four are what the
   * element looks like when it stops being careful: a tracer landing dead centre, a Final Vision
   * that shrank the operative instead of swelling the target, and a body growing something it
   * should not. Deliberately the same five steps as the neon ladder so `redshift` can walk one
   * onto the other rung for rung.
   */
  hotDeep: 0x4d0c05,
  hotMid: 0xa8180b,
  hot: 0xff3524,
  hotLit: 0xff9b84,
  /** Meat, for the cancerous arm. The one organic colour in an element made of plate. */
  flesh: 0xc4566a,
  fleshDeep: 0x571f2c,
};

/** Channel-wise blend, `k` of `b` over `a`. */
export function mixColor(a: number, b: number, k: number): number {
  const t = Math.max(0, Math.min(1, k));
  const r = Math.round(((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t);
  const g = Math.round(((a >> 8) & 0xff) * (1 - t) + ((b >> 8) & 0xff) * t);
  const bl = Math.round((a & 0xff) * (1 - t) + (b & 0xff) * t);
  return (r << 16) | (g << 8) | bl;
}

/** The neon ladder walked onto the hot one, rung for rung. Lead is left exactly as it is. */
const RED_MAP: Record<number, number> = {
  [RAD.neonDeep]: RAD.hotDeep,
  [RAD.neonMid]: RAD.hotMid,
  [RAD.neon]: RAD.hot,
  [RAD.neonLit]: RAD.hotLit,
  [RAD.wash]: 0xffe4dc,
  [RAD.bone]: 0xffd4cb,
  [RAD.boneShade]: 0x8a4c4c,
  [RAD.core]: 0xfff0ea,
};

/**
 * Wrap a colour function so the green in it comes out red, `k` of the way.
 *
 * Every painter in this file takes its palette through a `RadiationColorFn` — that is how skins
 * recolour the element — so an upgrade that wants the *same* art in a different colour can wrap
 * the function rather than growing a `red` flag on nineteen signatures. Lead is deliberately
 * untouched: Heart Stopper reddens the load, not the suit carrying it.
 */
export function redshift(tint: RadiationColorFn, k: number): RadiationColorFn {
  if (k <= 0.002) return tint;
  return (base) => {
    const to = RED_MAP[base];
    return to === undefined ? tint(base) : mixColor(tint(base), tint(to), k);
  };
}

/** Deterministic 0–1 noise, so a puddle keeps its outline between frames. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 53.1 + i * 71.9) * 24571.317;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used to sink a fill into shadow, never to recolour it. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * The trefoil. Three blades around a hub, drawn from real sector geometry rather than three
 * triangles so the inner cut-out is a proper arc — the symbol is instantly readable at 8 px and
 * completely unreadable if the blades are wedges, which is why it is worth doing properly.
 */
export function trefoil(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number,
  { phase = 0, color = RAD.neon, hub = true } = {},
): void {
  const inner = r * 0.28;
  for (let b = 0; b < 3; b++) {
    const mid = phase + (b / 3) * TAU - Math.PI / 2;
    const half = 0.52;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = mid - half + (i / 8) * half * 2;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
    for (let i = 8; i >= 0; i--) {
      const a = mid - half + (i / 8) * half * 2;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * inner, y + Math.sin(a) * inner));
    }
    g.fillStyle(tint(color), alpha);
    g.fillPoints(pts, true);
  }
  if (hub) {
    g.fillStyle(tint(color), alpha);
    g.fillCircle(x, y, r * 0.19);
  }
}

/**
 * A Geiger Tracer: the little triangular device the click throws. Flat lead plate, a hazard
 * stripe down one edge, three legs it grips with, and a lamp that blinks faster the closer the
 * set is to confirming — which is the entire read on this ability, so the lamp is the brightest
 * thing on it.
 */
export function geigerTracer(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, ang: number, alpha: number,
  { lamp = 0, scale = 1, legs = false } = {},
): void {
  const r = 7 * scale;
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 3; i++) {
    const a = ang + (i / 3) * TAU;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r, y + Math.sin(a) * r));
  }

  if (legs) {
    // Splayed grips, so a stuck tracer reads as clamped on rather than floating alongside.
    g.lineStyle(1.6 * scale, tint(RAD.leadDeep), alpha * 0.9);
    for (const p of pts) g.lineBetween(x, y, x + (p.x - x) * 1.6, y + (p.y - y) * 1.6);
  }

  g.fillStyle(tint(RAD.ink), alpha * 0.85);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.25, y + (p.y - y) * 1.25)), true);
  g.fillStyle(tint(RAD.lead), alpha);
  g.fillPoints(pts, true);
  // Hazard stripe along the leading edge only — a fully striped triangle reads as a road sign.
  g.lineStyle(1.5 * scale, tint(RAD.hazard), alpha * 0.85);
  g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  g.lineStyle(1 * scale, tint(RAD.seam), alpha * 0.7);
  g.strokePoints(pts, true);

  if (lamp > 0) {
    g.fillStyle(tint(RAD.neon), alpha * 0.18 * lamp);
    g.fillCircle(x, y, r * 1.5);
    g.fillStyle(tint(RAD.neonLit), alpha * (0.4 + lamp * 0.6));
    g.fillCircle(x, y, r * 0.34);
  }
}

/**
 * The railgun's line. Four passes down the same segment — a wide dim wash, the violet sheath,
 * the neon body and a hairline white core — plus ionisation flaking off it at right angles.
 * Drawn as a single straight line on purpose: everything else in the element wobbles, and the
 * one thing that is genuinely instantaneous should be the one thing that is perfectly straight.
 */
export function railBeam(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number,
  { width = 1, seed = 0, spurs = true } = {},
): void {
  const passes: [number, number, number][] = [
    [13, 0.1, RAD.neonDeep],
    [6.5, 0.3, RAD.seam],
    [2.8, 0.85, RAD.neon],
    [1.0, 1.0, RAD.core],
  ];
  for (const [w, a, color] of passes) {
    g.lineStyle(w * width, tint(color), alpha * a);
    g.lineBetween(x0, y0, x1, y1);
  }
  if (!spurs) return;

  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.min(14, Math.max(4, Math.round(len / 44)));
  g.lineStyle(1.4 * width, tint(RAD.neonLit), alpha * 0.7);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const px = x0 + (x1 - x0) * u;
    const py = y0 + (y1 - y0) * u;
    const side = jitter(seed, i) > 0.5 ? 1 : -1;
    const l = (4 + jitter(seed, 30 + i) * 9) * width;
    g.lineBetween(px, py, px + Math.cos(ang + side * 1.57) * l, py + Math.sin(ang + side * 1.57) * l);
  }
}

/**
 * A puddle of live waste. An irregular blob with a bright rim, a paler skin inside it, the ghost
 * of a trefoil floating in the middle and bubbles working their way up — the rim is what makes it
 * legible against the arena floor, so it is drawn last and brightest.
 */
export function radPuddle(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number, seed: number, t: number,
): void {
  const pts: Phaser.Geom.Point[] = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const wob = 0.78 + jitter(seed, i) * 0.34 + Math.sin(t * 1.9 + i * 0.8) * 0.05;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r * wob, y + Math.sin(a) * r * wob * 0.62));
  }
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.72);
  g.fillPoints(pts, true);
  g.fillStyle(tint(RAD.neonMid), alpha * 0.55);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.7, y + (p.y - y) * 0.7)), true);
  g.lineStyle(1.8, tint(RAD.neon), alpha * 0.95);
  g.strokePoints(pts, true);

  trefoil(g, tint, x, y, r * 0.4, alpha * 0.28, { phase: t * 0.7, color: RAD.neonLit });

  // Bubbles: three, each on its own slow loop, popping at the top of its rise.
  for (let i = 0; i < 3; i++) {
    const u = (t * (0.5 + jitter(seed, 60 + i) * 0.4) + jitter(seed, 70 + i)) % 1;
    const bx = x + (jitter(seed, 80 + i) - 0.5) * r * 1.1;
    const by = y + r * 0.3 - u * r * 0.7;
    g.fillStyle(tint(RAD.neonLit), alpha * (1 - u) * 0.8);
    g.fillCircle(bx, by, 1.4 + (1 - u) * 1.6);
  }
}

/**
 * A drum of waste. A lead cylinder with two rolling ribs, a hazard band across the belly with the
 * trefoil stamped on it, and a seam down one side that is already leaking. `arm` (0–1) reddens
 * the leak and widens the crack, so the moment before it is shot is visibly different from the
 * moment it left your hands.
 */
export function wasteDrum(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, roll: number, alpha: number,
  { r = 15, arm = 0 } = {},
): void {
  const h = r * 1.5;
  g.fillStyle(tint(RAD.ink), alpha * 0.45);
  g.fillEllipse(x, y + h * 0.9, r * 2.2, r * 0.7);

  g.fillStyle(tint(RAD.leadDeep), alpha);
  g.fillRect(x - r, y - h * 0.8, r * 2, h * 1.6);
  g.fillEllipse(x, y - h * 0.8, r * 2, r * 0.72);
  g.fillStyle(tint(RAD.lead), alpha);
  g.fillRect(x - r * 0.86, y - h * 0.78, r * 1.35, h * 1.55);
  g.fillStyle(tint(RAD.leadLit), alpha * 0.9);
  g.fillEllipse(x, y - h * 0.8, r * 1.6, r * 0.52);

  // Hazard band + stamp. The band rolls with the drum, which is the only thing that sells it
  // as a cylinder travelling rather than a rectangle sliding.
  g.fillStyle(tint(RAD.hazardDeep), alpha * 0.95);
  g.fillRect(x - r, y - r * 0.36, r * 2, r * 0.72);
  g.fillStyle(tint(RAD.hazard), alpha);
  g.fillRect(x - r, y - r * 0.26, r * 2, r * 0.5);
  const stampX = x + Math.sin(roll) * r * 0.55;
  trefoil(g, tint, stampX, y, r * 0.38, alpha * (0.55 + 0.45 * Math.cos(roll)), {
    color: RAD.ink, hub: true,
  });

  // Rolling ribs.
  g.lineStyle(1.6, tint(RAD.leadDeep), alpha * 0.9);
  g.lineBetween(x - r, y - h * 0.45, x + r, y - h * 0.45);
  g.lineBetween(x - r, y + h * 0.45, x + r, y + h * 0.45);

  // The leak, down the right-hand seam.
  const crack = 0.5 + arm;
  g.lineStyle(2.2 * crack, tint(RAD.neonDeep), alpha * 0.8);
  g.lineBetween(x + r * 0.72, y - h * 0.6, x + r * 0.55, y + h * 0.6);
  g.lineStyle(1.1 * crack, tint(RAD.neon), alpha);
  g.lineBetween(x + r * 0.72, y - h * 0.6, x + r * 0.55, y + h * 0.6);
  g.fillStyle(tint(RAD.neon), alpha * 0.22 * (0.4 + arm));
  g.fillCircle(x + r * 0.64, y, r * (0.7 + arm * 0.8));
}

/**
 * A body seen through lead: skull, jaw, spine, four ribs and two arm bones, sized off the
 * fighter rig so it lands inside the silhouette rather than around it. Drawn even when the
 * fighter it belongs to is completely invisible — that is the entire point of the ability.
 */
export function boneOverlay(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, alpha: number, t: number, scale = 1,
): void {
  const s = scale;
  const breathe = 1 + Math.sin(t * 2.4) * 0.02;

  g.fillStyle(tint(RAD.boneShade), alpha * 0.35);
  g.fillEllipse(x, y, 34 * s, 42 * s);

  // Skull + jaw.
  g.fillStyle(tint(RAD.bone), alpha * 0.9);
  g.fillEllipse(x, y - 12 * s, 15 * s, 16 * s * breathe);
  g.fillRect(x - 4.6 * s, y - 6 * s, 9.2 * s, 5 * s);
  g.fillStyle(tint(RAD.ink), alpha * 0.85);
  g.fillEllipse(x - 3.6 * s, y - 13 * s, 4.2 * s, 5 * s);
  g.fillEllipse(x + 3.6 * s, y - 13 * s, 4.2 * s, 5 * s);
  g.fillTriangle(x, y - 8.6 * s, x - 1.6 * s, y - 6.4 * s, x + 1.6 * s, y - 6.4 * s);
  // Teeth.
  g.lineStyle(0.8 * s, tint(RAD.ink), alpha * 0.6);
  for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 1.9 * s, y - 5.6 * s, x + i * 1.9 * s, y - 1.4 * s);

  // Spine.
  g.fillStyle(tint(RAD.bone), alpha * 0.85);
  for (let i = 0; i < 5; i++) g.fillCircle(x, y - 1 * s + i * 3.6 * s, 1.9 * s);

  // Ribs: four pairs of arcs, narrowing downward.
  g.lineStyle(1.7 * s, tint(RAD.bone), alpha * 0.85);
  for (let i = 0; i < 4; i++) {
    const ry = y + (i * 3.6 - 0.5) * s;
    const w = (11 - i * 1.5) * s * breathe;
    g.beginPath();
    g.arc(x, ry, w, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
    g.beginPath();
    g.arc(x, ry, w, Math.PI * 1.15, Math.PI * 1.85, false);
    g.strokePath();
  }

  // Pelvis.
  g.lineStyle(2 * s, tint(RAD.bone), alpha * 0.8);
  g.beginPath();
  g.arc(x, y + 15 * s, 7 * s, Math.PI * 0.1, Math.PI * 0.9, false);
  g.strokePath();
}

/** A flare round: a stubby green dart with a burning tail. Small and fast, and it says so. */
export function flareRound(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, ang: number, alpha: number, t: number,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  // Tail first, so the head sits on top of it.
  for (let i = 1; i <= 5; i++) {
    const u = i / 5;
    const w = 3.4 * (1 - u) + 0.4;
    g.fillStyle(tint(u > 0.6 ? RAD.neonDeep : RAD.neonMid), alpha * (1 - u) * 0.7);
    g.fillCircle(x - c * u * 22 + (Math.sin(t * 30 + i) * 1.4) * s,
      y - s * u * 22 - (Math.sin(t * 30 + i) * 1.4) * c, w);
  }
  g.fillStyle(tint(RAD.neon), alpha * 0.28);
  g.fillCircle(x, y, 7);
  g.fillStyle(tint(RAD.neonLit), alpha);
  g.fillTriangle(x + c * 5, y + s * 5, x - c * 3 - s * 2.4, y - s * 3 + c * 2.4,
    x - c * 3 + s * 2.4, y - s * 3 - c * 2.4);
  g.fillStyle(tint(RAD.core), alpha);
  g.fillCircle(x + c * 1.5, y + s * 1.5, 1.5);
}

/**
 * The airdrop's footprint: a ring of trefoils and a converging crosshair painted on the floor
 * while the bomb is falling, shrinking as it arrives. Everything about this ability is a
 * telegraph, and this is the telegraph.
 */
export function dropFootprint(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number, k: number, t: number,
): void {
  const flash = 0.55 + 0.45 * Math.sin(t * (6 + k * 26));
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.18 * flash);
  g.fillCircle(x, y, r);
  g.lineStyle(3, tint(RAD.neon), alpha * 0.85 * flash);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.4, tint(RAD.neonLit), alpha * 0.6);
  g.strokeCircle(x, y, r * (1 - k * 0.72));

  for (let i = 0; i < 8; i++) {
    const a = t * 0.6 + (i / 8) * TAU;
    trefoil(g, tint, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, 9,
      alpha * 0.7 * flash, { phase: -t, color: RAD.neon });
  }
  // Crosshair arms sliding in from the rim.
  g.lineStyle(2.4, tint(RAD.core), alpha * 0.7 * flash);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const i0 = r * (0.2 + (1 - k) * 0.5);
    g.lineBetween(x + Math.cos(a) * i0, y + Math.sin(a) * i0,
      x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
  }
}

/**
 * The mushroom. Stem, a boiling cap built from overlapping discs, the collar skirt under it and
 * a shockwave ellipse racing out along the floor. `t` is 0→1 over the whole rise; the cap only
 * starts spreading once the stem is up, which is the shape that reads as a mushroom rather than
 * as a ball with a line under it.
 */
export function mushroomCloud(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, t: number, alpha: number, seed: number, scale = 1,
): void {
  const rise = easeOut(Math.min(1, t * 1.5));
  const spread = easeOut(Math.max(0, (t - 0.28) / 0.72));
  const H = 300 * scale;
  const stemW = 34 * scale;
  const capY = y - H * rise;

  // Ground shockwave.
  g.lineStyle(6 * (1 - t) + 1, tint(RAD.neon), alpha * (1 - t) * 0.8);
  g.strokeEllipse(x, y, 620 * scale * easeOut(t), 210 * scale * easeOut(t));
  g.fillStyle(tint(RAD.neonDeep), alpha * (1 - t) * 0.22);
  g.fillEllipse(x, y, 480 * scale * easeOut(t), 160 * scale * easeOut(t));

  // Stem: a widening column with a bright throat.
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.85);
  g.fillTriangle(x - stemW * 1.5, y, x + stemW * 1.5, y, x + stemW * 0.5, capY);
  g.fillTriangle(x - stemW * 1.5, y, x - stemW * 0.5, capY, x + stemW * 0.5, capY);
  g.fillStyle(tint(RAD.neonMid), alpha * 0.9);
  g.fillTriangle(x - stemW * 0.9, y, x + stemW * 0.9, y, x + stemW * 0.28, capY);
  g.fillTriangle(x - stemW * 0.9, y, x - stemW * 0.28, capY, x + stemW * 0.28, capY);
  g.fillStyle(tint(RAD.core), alpha * (1 - t) * 0.9);
  g.fillRect(x - 5 * scale, capY, 10 * scale, y - capY);

  // Cap: overlapping discs on a fixed seed so the silhouette boils without swimming.
  const capR = (26 + spread * 132) * scale;
  const lobes = 11;
  for (const [k, color, a] of [[1.25, RAD.neonDeep, 0.75], [1.0, RAD.neonMid, 0.9], [0.66, RAD.neonLit, 0.85]] as const) {
    g.fillStyle(tint(color), alpha * a);
    for (let i = 0; i < lobes; i++) {
      const ang = (i / lobes) * TAU;
      const d = capR * (0.42 + jitter(seed, i) * 0.5);
      const rr = capR * (0.34 + jitter(seed, 20 + i) * 0.26) * k;
      g.fillCircle(x + Math.cos(ang) * d, capY + Math.sin(ang) * d * 0.6 - capR * 0.15, rr);
    }
  }
  // Collar skirt.
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.55);
  g.fillEllipse(x, capY + capR * 0.42, capR * 2.3, capR * 0.46);
  g.fillStyle(tint(RAD.core), alpha * (1 - t) * 0.5);
  g.fillCircle(x, capY - capR * 0.1, capR * 0.42);
}

// ── Upgrade primitives ────────────────────────────────────────────────────

/**
 * Heart Stopper's afterimage: the rail line, still there after the shot that made it.
 *
 * Drawn thinner and dimmer than the shot itself and with the ionisation crawling along it, so
 * it reads as the ghost of a beam rather than a second beam. `left` (1→0) sags the whole thing
 * toward nothing as the four seconds run out.
 */
export function afterimageLance(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, left: number, t: number,
): void {
  const flick = 0.62 + 0.38 * Math.sin(t * 21) * Math.sin(t * 7.3);
  const a = alpha * left * flick;
  for (const [w, k, color] of [[11, 0.12, RAD.hotDeep], [5, 0.34, RAD.hotMid], [2.2, 0.8, RAD.hot], [0.9, 0.95, RAD.hotLit]] as const) {
    g.lineStyle(w * (0.55 + left * 0.45), tint(color), a * k);
    g.lineBetween(x0, y0, x1, y1);
  }
  // Motes crawling the length of it, so a static line still reads as live.
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.min(18, Math.max(5, Math.round(len / 38)));
  for (let i = 0; i < n; i++) {
    const u = ((i / n) + t * 0.35) % 1;
    const px = x0 + (x1 - x0) * u;
    const py = y0 + (y1 - y0) * u;
    const side = jitter(i * 17.3, 3) > 0.5 ? 1 : -1;
    const off = Math.sin(t * 6 + i) * 3.4 * side;
    g.fillStyle(tint(RAD.hotLit), a * 0.75);
    g.fillCircle(px + Math.cos(ang + 1.57) * off, py + Math.sin(ang + 1.57) * off, 1.5 + left * 1.3);
  }
}

/**
 * Final Vision's beam: not a hitscan flash but five seconds of held lance.
 *
 * The railgun's line is perfectly straight because it is instantaneous; this one is the opposite
 * kind of weapon, so it boils — a slow sine along its own length, a throat that flares at the
 * muzzle and a bloom where it lands. `bite` (0–1) grows with the escalating dose.
 */
export function sustainedBeam(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, t: number, bite: number,
): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = Math.cos(ang + Math.PI / 2);
  const ny = Math.sin(ang + Math.PI / 2);
  const SEG = Math.max(6, Math.round(len / 26));
  const wob = (u: number): number => Math.sin(u * 9 - t * 15) * (1.4 + bite * 1.8) * Math.sin(u * Math.PI);

  for (const [w, k, color] of [[18, 0.14, RAD.hotDeep], [9, 0.4, RAD.hotMid], [4.4, 0.9, RAD.hot], [1.7, 1, RAD.core]] as const) {
    g.lineStyle(w * (0.8 + bite * 0.5), tint(color), alpha * k);
    g.beginPath();
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const px = x0 + (x1 - x0) * u + nx * wob(u);
      const py = y0 + (y1 - y0) * u + ny * wob(u);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }

  // Throat at the muzzle: a cone of escaping load that widens with the bite.
  const throat = 9 + bite * 7;
  g.fillStyle(tint(RAD.hotLit), alpha * 0.4);
  g.fillTriangle(
    x0 + nx * throat, y0 + ny * throat,
    x0 - nx * throat, y0 - ny * throat,
    x0 + Math.cos(ang) * (26 + bite * 16), y0 + Math.sin(ang) * (26 + bite * 16),
  );
  g.fillStyle(tint(RAD.core), alpha * (0.55 + 0.45 * Math.abs(Math.sin(t * 30))));
  g.fillCircle(x0, y0, 4 + bite * 3);

  // The bloom where it lands, and the ring being pushed off the impact.
  const pulse = 0.6 + 0.4 * Math.sin(t * 24);
  g.fillStyle(tint(RAD.hot), alpha * 0.28 * pulse);
  g.fillCircle(x1, y1, 22 + bite * 12);
  g.fillStyle(tint(RAD.hotLit), alpha * 0.55 * pulse);
  g.fillCircle(x1, y1, 11 + bite * 6);
  g.fillStyle(tint(RAD.core), alpha * 0.9);
  g.fillCircle(x1, y1, 3.6 + bite * 2);
  g.lineStyle(2, tint(RAD.hot), alpha * (1 - ((t * 1.6) % 1)) * 0.8);
  g.strokeCircle(x1, y1, 12 + ((t * 1.6) % 1) * 34);
  trefoil(g, tint, x1, y1, 9 + bite * 4, alpha * 0.45, { phase: t * 5, color: RAD.hotLit });
}

/**
 * Cutdown's revolver. A stubby lead sidearm — six-shot cylinder, hazard-banded grip and a stripe
 * of green down the barrel where the rounds are coming from. `spent` (0–6) empties the chambers
 * one at a time; `recoil` kicks the whole thing back along its own line.
 */
export function revolver(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, ang: number, alpha: number,
  { spent = 0, recoil = 0 } = {},
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const px = x - c * recoil * 7;
  const py = y - s * recoil * 7;
  const at = (f: number, r: number): [number, number] => [px + c * f - s * r, py + s * f - c * -r];

  // Grip, canted back off the line of the barrel.
  const [gx, gy] = at(-5, 0);
  g.fillStyle(tint(RAD.ink), alpha * 0.9);
  g.fillCircle(gx - c * 2, gy - s * 2 + 4, 5.4);
  g.fillStyle(tint(RAD.hazardDeep), alpha);
  g.fillCircle(gx - c * 2, gy - s * 2 + 3.4, 4.4);

  // Barrel.
  const [bx0, by0] = at(0, 0);
  const [bx1, by1] = at(21 + recoil * 3, 0);
  g.lineStyle(7, tint(RAD.leadDeep), alpha);
  g.lineBetween(bx0, by0, bx1, by1);
  g.lineStyle(4, tint(RAD.lead), alpha);
  g.lineBetween(bx0, by0, bx1, by1);
  g.lineStyle(1.3, tint(RAD.neon), alpha * 0.85);
  g.lineBetween(bx0 + c * 3, by0 + s * 3, bx1 - c * 2, by1 - s * 2);

  // Cylinder: six chambers around the hub, going dark as they are fired.
  const [cx, cy] = at(2.5, 0);
  g.fillStyle(tint(RAD.leadDeep), alpha);
  g.fillCircle(cx, cy, 6.6);
  g.fillStyle(tint(RAD.leadLit), alpha * 0.9);
  g.fillCircle(cx, cy, 5.2);
  for (let i = 0; i < 6; i++) {
    const a = ang + (i / 6) * TAU + recoil * 0.9;
    const loaded = i >= spent;
    g.fillStyle(tint(loaded ? RAD.neon : RAD.ink), alpha * (loaded ? 0.95 : 0.8));
    g.fillCircle(cx + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2, 1.5);
  }
  g.fillStyle(tint(RAD.hazard), alpha * 0.9);
  g.fillCircle(cx, cy, 1.5);

  // Muzzle flash, only on the frames the recoil is live.
  if (recoil > 0.05) {
    g.fillStyle(tint(RAD.core), alpha * recoil);
    g.fillCircle(bx1, by1, 3 + recoil * 5);
    g.fillStyle(tint(RAD.neonLit), alpha * recoil * 0.6);
    g.fillTriangle(bx1 + c * (8 + recoil * 12), by1 + s * (8 + recoil * 12),
      bx1 - s * 6 * recoil, by1 + c * 6 * recoil,
      bx1 + s * 6 * recoil, by1 - c * 6 * recoil);
  }
}

/**
 * Supercritical's armour: four slabs of lead clamped over the wearer with the bolts still hot.
 *
 * `clamp` (0–1) runs the plates in from outside the body, so the moment it goes on is a machine
 * closing rather than a texture appearing. `cracked` (0–1) is the last half-second before it
 * fails, which is the only warning the wearer gets.
 */
export function leadArmour(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, alpha: number, t: number,
  { clamp = 1, cracked = 0 } = {},
): void {
  const out = (1 - clamp) * 26;
  const plates: [number, number, number, number][] = [
    // dx, dy, w, h — chest, back-skirt and two flank slabs.
    [0, -12 - out, 30, 13],
    [0, 12 + out, 26, 11],
    [-15 - out, 0, 11, 24],
    [15 + out, 0, 11, 24],
  ];
  for (const [dx, dy, w, h] of plates) {
    const px = x + dx;
    const py = y + dy;
    g.fillStyle(tint(RAD.ink), alpha * 0.9);
    g.fillRect(px - w / 2 - 1.4, py - h / 2 - 1.4, w + 2.8, h + 2.8);
    g.fillStyle(tint(RAD.leadDeep), alpha);
    g.fillRect(px - w / 2, py - h / 2, w, h);
    g.fillStyle(tint(RAD.leadLit), alpha * 0.85);
    g.fillRect(px - w / 2 + 1.6, py - h / 2 + 1.6, w - 3.2, h * 0.42);
    // Bolt heads at the corners.
    g.fillStyle(tint(RAD.hazard), alpha * 0.9);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) g.fillCircle(px + sx * (w / 2 - 2.4), py + sy * (h / 2 - 2.4), 1.3);
    }
    if (cracked > 0.02) {
      // The failure: a hot seam opening down the middle of every plate.
      g.lineStyle(1 + cracked * 2.4, tint(RAD.neon), alpha * cracked * (0.5 + 0.5 * Math.sin(t * 26)));
      g.lineBetween(px - w * 0.32, py - h * 0.4, px + w * 0.18, py + h * 0.42);
      g.lineBetween(px + w * 0.12, py - h * 0.44, px + w * 0.36, py + h * 0.2);
    }
  }
  // The trefoil stamped across the chest plate, which is how you tell it from any other armour.
  trefoil(g, tint, x, y - 12 - out, 5, alpha * (0.7 + cracked * 0.3),
    { phase: t * 0.6, color: cracked > 0.02 ? RAD.neonLit : RAD.hazard });
}

/**
 * Supercritical with the armour gone: the wearer as the source rather than the carrier.
 *
 * A hard white-green core, a boiling halo at the aura's real radius, and rungs of contamination
 * climbing out of it. The radius drawn is the radius that doses people — nothing here is
 * decoration for its own sake.
 */
export function criticalAura(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
): void {
  const breathe = 0.86 + 0.14 * Math.sin(t * 4.4);
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.2 * breathe);
  g.fillCircle(x, y, r * breathe);
  g.fillStyle(tint(RAD.neonMid), alpha * 0.14);
  g.fillCircle(x, y, r * 0.62 * breathe);
  g.lineStyle(2.6, tint(RAD.neon), alpha * 0.75 * breathe);
  g.strokeCircle(x, y, r * breathe);

  // Rungs riding out on their own loops, so the aura reads as emitting rather than sitting.
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.55 + i / 3) % 1;
    g.lineStyle(1.6 * (1 - u), tint(RAD.neonLit), alpha * (1 - u) * 0.6);
    g.strokeCircle(x, y, 18 + u * (r - 18));
  }
  for (let i = 0; i < 10; i++) {
    const a = t * 1.1 + (i / 10) * TAU;
    const d = r * (0.42 + 0.5 * ((t * 0.7 + jitter(i * 31.7, 2)) % 1));
    g.fillStyle(tint(RAD.neonLit), alpha * 0.7);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.8 + Math.sin(t * 9 + i) * 0.8);
  }
  // The wearer, lit from inside.
  g.fillStyle(tint(RAD.neon), alpha * 0.4 * breathe);
  g.fillCircle(x, y, 26);
  g.fillStyle(tint(RAD.neonLit), alpha * 0.55);
  g.fillCircle(x, y, 15);
  g.fillStyle(tint(RAD.core), alpha * 0.8);
  g.fillCircle(x, y, 6);
  trefoil(g, tint, x, y, 13, alpha * 0.55, { phase: -t * 2.2, color: RAD.core });
}

/**
 * Level 3 irradiated: the arm the victim has grown.
 *
 * Three segments of swollen meat hinged off the shoulder, veined in hot red, with a hand of four
 * hooked claws on the end. `wind` runs −1 → 1 across the slash: negative is the arm cocking back
 * behind the body, positive is it coming through. Drawn from the victim's own centre so it
 * tracks them wherever they run, because it is theirs now.
 */
export function cancerArm(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, ang: number, alpha: number, wind: number, t: number,
): void {
  const swing = ang + wind * 1.5;
  const pulse = 1 + 0.07 * Math.sin(t * 7);
  // Shoulder, elbow, wrist.
  const sx = x + Math.cos(ang - 1.9) * 13;
  const sy = y + Math.sin(ang - 1.9) * 13 - 3;
  const reach = (20 + Math.abs(wind) * 9) * pulse;
  const ex = sx + Math.cos(swing - 0.55) * reach;
  const ey = sy + Math.sin(swing - 0.55) * reach;
  const wx = ex + Math.cos(swing + 0.3) * reach * 1.05;
  const wy = ey + Math.sin(swing + 0.3) * reach * 1.05;

  // The limb: a dark casing with meat inside it, drawn as two tapering bones.
  for (const [x0, y0, x1, y1, w] of [[sx, sy, ex, ey, 9], [ex, ey, wx, wy, 7]] as const) {
    g.lineStyle(w * pulse + 2.5, tint(RAD.fleshDeep), alpha);
    g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(w * pulse, tint(RAD.flesh), alpha * 0.95);
    g.lineBetween(x0, y0, x1, y1);
    // Veins: a hot line worming down the inside of each segment.
    g.lineStyle(1.4, tint(RAD.hot), alpha * (0.5 + 0.5 * Math.abs(Math.sin(t * 5))));
    const mx = (x0 + x1) / 2 + Math.sin(t * 4) * 2;
    const my = (y0 + y1) / 2 + Math.cos(t * 4) * 2;
    g.beginPath();
    g.moveTo(x0, y0); g.lineTo(mx, my); g.lineTo(x1, y1);
    g.strokePath();
  }
  // Knuckles at the joints, so it reads as jointed rather than as a bent hose.
  g.fillStyle(tint(RAD.fleshDeep), alpha);
  g.fillCircle(sx, sy, 6.4 * pulse);
  g.fillCircle(ex, ey, 5.4 * pulse);
  g.fillStyle(tint(RAD.flesh), alpha * 0.9);
  g.fillCircle(sx, sy, 4.4 * pulse);

  // Four hooked claws, splayed wider as the arm comes through.
  const spread = 0.45 + Math.max(0, wind) * 0.45;
  for (let i = 0; i < 4; i++) {
    const a = swing + 0.3 + (i - 1.5) * spread * 0.5;
    const l = 11 + i % 2 * 3;
    const tipX = wx + Math.cos(a) * l;
    const tipY = wy + Math.sin(a) * l;
    g.lineStyle(3.4, tint(RAD.fleshDeep), alpha);
    g.lineBetween(wx, wy, tipX, tipY);
    g.lineStyle(1.8, tint(RAD.hotLit), alpha * 0.9);
    g.lineBetween(wx + Math.cos(a) * 3, wy + Math.sin(a) * 3, tipX, tipY);
    g.fillStyle(tint(RAD.core), alpha * 0.8);
    g.fillCircle(tipX, tipY, 1.5);
  }
  // The tumour it grew out of, sitting on the shoulder.
  g.fillStyle(tint(RAD.hotDeep), alpha * 0.85);
  g.fillCircle(sx - Math.cos(ang) * 3, sy - Math.sin(ang) * 3, 8 * pulse);
  g.fillStyle(tint(RAD.hot), alpha * (0.35 + 0.25 * Math.sin(t * 6)));
  g.fillCircle(sx - Math.cos(ang) * 3, sy - Math.sin(ang) * 3, 5 * pulse);
}

/** Roman numerals for the dose ladder — I, II, III — drawn as bars so no font is involved. */
export function doseTicks(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, level: number, alpha: number,
): void {
  const n = Math.max(1, Math.min(3, level));
  const color = n >= 3 ? RAD.hot : n === 2 ? RAD.hazard : RAD.neon;
  for (let i = 0; i < n; i++) {
    const px = x - ((n - 1) * 4) / 2 + i * 4;
    g.fillStyle(tint(RAD.ink), alpha * 0.8);
    g.fillRect(px - 1.4, y - 5, 2.8, 10);
    g.fillStyle(tint(color), alpha);
    g.fillRect(px - 0.9, y - 4.4, 1.8, 8.8);
  }
}

// ── Mastery primitives ────────────────────────────────────────────────────

/**
 * Gamma Tether's post.
 *
 * The one piece of *equipment* in an element made of ordnance: a squat lead housing on three
 * splayed legs, bolted to the floor, with a hazard band around its belly and a charge bar across
 * the front that is the whole read on how long it has left. The emitter head on top spins while
 * it is hunting and locks dead still the moment the chain catches — the only thing on the device
 * that says whether it has a body on the other end.
 *
 * `charge` (0–1) is the bar. `latched` stops the head and lights the lamp.
 */
export function tetherAnchor(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, alpha: number, t: number,
  { charge = 1, latched = false, plant = 1 } = {},
): void {
  // `plant` runs the whole device down onto the floor over its first frames.
  const drop = (1 - plant) * 26;
  const py = y - drop;
  const a = alpha * plant;

  // Footprint, so the post reads as standing on the floor rather than floating over it.
  g.fillStyle(tint(RAD.ink), alpha * 0.5);
  g.fillEllipse(x, y + 12, 34, 11);

  // Three legs, splayed forward-left, forward-right and back.
  for (const [dx, dy] of [[-13, 12], [13, 12], [0, 15]] as const) {
    g.lineStyle(4.4, tint(RAD.ink), a);
    g.lineBetween(x, py + 1, x + dx, y + dy);
    g.lineStyle(2.4, tint(RAD.lead), a);
    g.lineBetween(x, py + 1, x + dx, y + dy);
    g.fillStyle(tint(RAD.hazard), a * 0.8);
    g.fillCircle(x + dx, y + dy, 1.7);
  }

  // Housing: a hard flat box with a lit top face.
  g.fillStyle(tint(RAD.ink), a * 0.95);
  g.fillRect(x - 11.5, py - 15.5, 23, 27);
  g.fillStyle(tint(RAD.leadDeep), a);
  g.fillRect(x - 10, py - 14, 20, 24);
  g.fillStyle(tint(RAD.lead), a * 0.95);
  g.fillRect(x - 10, py - 14, 12, 24);
  g.fillStyle(tint(RAD.leadLit), a * 0.85);
  g.fillRect(x - 8.6, py - 12.6, 17.2, 4.4);

  // Hazard band across the belly, with the trefoil stamped on it.
  g.fillStyle(tint(RAD.hazardDeep), a * 0.95);
  g.fillRect(x - 10, py - 3.4, 20, 7);
  g.fillStyle(tint(RAD.hazard), a);
  g.fillRect(x - 10, py - 2.6, 20, 5);
  trefoil(g, tint, x, py, 3.4, a * 0.85, { color: RAD.ink, phase: t * 0.4 });

  // The charge bar. Drawn last on the front face so it is the first thing read, and it goes
  // hazard-yellow under a fifth left rather than simply getting shorter.
  const k = Phaser.Math.Clamp(charge, 0, 1);
  g.fillStyle(tint(RAD.ink), a * 0.9);
  g.fillRect(x - 8.4, py + 4.4, 16.8, 4.6);
  g.fillStyle(tint(RAD.neonDeep), a * 0.8);
  g.fillRect(x - 7.6, py + 5.1, 15.2, 3.2);
  g.fillStyle(tint(k < 0.2 ? RAD.hazard : RAD.neon), a * (0.7 + 0.3 * Math.abs(Math.sin(t * (k < 0.2 ? 11 : 3)))));
  g.fillRect(x - 7.6, py + 5.1, 15.2 * k, 3.2);

  // Emitter head: a ring with three prongs, spinning while it hunts and stopped once it has
  // somebody. The lamp in the middle is the lock light.
  const spin = latched ? 0.4 : t * 3.4;
  g.fillStyle(tint(RAD.leadDeep), a);
  g.fillCircle(x, py - 17, 6.6);
  g.lineStyle(1.6, tint(latched ? RAD.neonLit : RAD.seam), a * 0.9);
  g.strokeCircle(x, py - 17, 5.2);
  for (let i = 0; i < 3; i++) {
    const ang = spin + (i / 3) * TAU;
    g.lineStyle(2, tint(RAD.lead), a);
    g.lineBetween(x + Math.cos(ang) * 4, py - 17 + Math.sin(ang) * 4,
      x + Math.cos(ang) * 10, py - 17 + Math.sin(ang) * 10);
    g.fillStyle(tint(latched ? RAD.neon : RAD.neonMid), a * 0.9);
    g.fillCircle(x + Math.cos(ang) * 10, py - 17 + Math.sin(ang) * 10, 1.8);
  }
  const lamp = latched ? 0.6 + 0.4 * Math.abs(Math.sin(t * 7)) : 0.25 + 0.15 * Math.sin(t * 2);
  g.fillStyle(tint(RAD.neon), a * lamp * 0.6);
  g.fillCircle(x, py - 17, 4.4);
  g.fillStyle(tint(RAD.core), a * lamp);
  g.fillCircle(x, py - 17, 2);
}

/**
 * The leash the post is allowed to pay out, drawn on the floor.
 *
 * A dashed ring rather than a solid one — a solid circle reads as a hazard and this one hurts
 * nobody, it is simply the edge of where the victim is allowed to be. Tightens visibly as the
 * chain goes taut, which is how the victim learns where the wall is.
 */
export function leashRing(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x: number, y: number, r: number, alpha: number, t: number, taut = 0,
): void {
  const segs = 40;
  const spin = t * 0.5;
  g.lineStyle(1.6 + taut * 1.4, tint(taut > 0.5 ? RAD.hazard : RAD.neonMid), alpha * (0.4 + taut * 0.5));
  for (let i = 0; i < segs; i += 2) {
    const a0 = spin + (i / segs) * TAU;
    const a1 = spin + ((i + 1) / segs) * TAU;
    g.beginPath();
    g.arc(x, y, r, a0, a1, false);
    g.strokePath();
  }
  g.fillStyle(tint(RAD.neonDeep), alpha * 0.07);
  g.fillCircle(x, y, r);
}

/**
 * The chain itself: live waste on a wire.
 *
 * Real links rather than a beam — a row of tilted ovals laid along the span with a hot filament
 * threading through them, sagging while there is slack and pulling dead straight and bright the
 * moment the victim reaches the end of it. `taut` (0–1) is the whole animation.
 */
export function gammaChain(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, t: number, taut = 0,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);
  // Slack hangs below the line; a taut chain has none at all.
  const sag = (1 - taut) * Math.min(26, len * 0.16);
  const n = Math.max(4, Math.round(len / 15));
  const pt = (u: number): [number, number] => {
    const bow = Math.sin(u * Math.PI) * sag;
    return [x0 + dx * u, y0 + dy * u + bow];
  };

  // The filament, under the links, so the links read as riding on it.
  g.lineStyle(4.4, tint(RAD.ink), alpha * 0.7);
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) { const [px, py] = pt(i / n); g.lineTo(px, py); }
  g.strokePath();
  g.lineStyle(1.6 + taut * 1.6, tint(taut > 0.5 ? RAD.neonLit : RAD.neonMid),
    alpha * (0.55 + taut * 0.45) * (0.7 + 0.3 * Math.abs(Math.sin(t * 6 - len * 0.02))));
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) { const [px, py] = pt(i / n); g.lineTo(px, py); }
  g.strokePath();

  // Links, alternating their tilt so the chain reads as chain at a glance. Built from real
  // points rather than a canvas rotation — every painter in this file draws in world space.
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const [px, py] = pt(u);
    const tilt = ang + (i % 2 ? 1.57 : 0);
    const ca = Math.cos(tilt);
    const sa = Math.sin(tilt);
    const ring: Phaser.Geom.Point[] = [];
    for (let k = 0; k < 8; k++) {
      const a2 = (k / 8) * TAU;
      const ex = Math.cos(a2) * 4.5;
      const ey = Math.sin(a2) * 2.6;
      ring.push(new Phaser.Geom.Point(px + ex * ca - ey * sa, py + ex * sa + ey * ca));
    }
    g.lineStyle(2.2, tint(RAD.lead), alpha * 0.95);
    g.strokePoints(ring, true);
  }

  // Contamination running down the wire toward the victim, so it reads as feeding them.
  for (let i = 0; i < 3; i++) {
    const u = ((t * 0.55 + i / 3) % 1);
    const [px, py] = pt(u);
    g.fillStyle(tint(RAD.neonLit), alpha * 0.85);
    g.fillCircle(px, py, 2.2 + taut * 1.2);
  }
}

/**
 * Sniper's Instinct's sight.
 *
 * A hairline of lead from the weapon hand to wherever the next tracer would actually stop, with
 * range ticks along it and a reticle on the end. Deliberately thin and mostly dark: the ability
 * it is describing does no damage, and a bright beam across the arena would read as one.
 * `onBody` swaps the reticle from a hazard cross (this shot lands on nothing) to a green box.
 */
export function sightLine(
  g: Phaser.GameObjects.Graphics,
  tint: RadiationColorFn,
  x0: number, y0: number, x1: number, y1: number, alpha: number, t: number, onBody = false,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const lead = onBody ? RAD.neon : RAD.hazard;

  g.lineStyle(2.6, tint(RAD.ink), alpha * 0.35);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(1, tint(lead), alpha * 0.42);
  g.lineBetween(x0, y0, x1, y1);

  // Range ticks every 100px, so the line is a ruler as well as a pointer.
  g.lineStyle(1, tint(RAD.seam), alpha * 0.5);
  for (let d = 100; d < len; d += 100) {
    const px = x0 + ux * d;
    const py = y0 + uy * d;
    g.lineBetween(px - uy * 3, py + ux * 3, px + uy * 3, py - ux * 3);
  }
  // One bead running out along the line at roughly the tracer's own speed, so the sight reads
  // as measuring rather than as a laser sitting there.
  const run = ((t * 1.35) % 1) * len;
  g.fillStyle(tint(RAD.neonLit), alpha * 0.6);
  g.fillCircle(x0 + ux * run, y0 + uy * run, 1.6);

  // The reticle.
  const pulse = 0.7 + 0.3 * Math.abs(Math.sin(t * 4));
  g.lineStyle(1.4, tint(lead), alpha * pulse);
  if (onBody) {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.lineBetween(x1 + sx * 9, y1 + sy * 9, x1 + sx * 9, y1 + sy * 4);
      g.lineBetween(x1 + sx * 9, y1 + sy * 9, x1 + sx * 4, y1 + sy * 9);
    }
    g.fillStyle(tint(RAD.core), alpha * pulse * 0.9);
    g.fillCircle(x1, y1, 1.6);
    return;
  }
  g.strokeCircle(x1, y1, 5.5);
  g.lineBetween(x1 - 8, y1, x1 - 2.5, y1);
  g.lineBetween(x1 + 2.5, y1, x1 + 8, y1);
  g.lineBetween(x1, y1 - 8, x1, y1 - 2.5);
  g.lineBetween(x1, y1 + 2.5, x1, y1 + 8);
}

// ── Fx ────────────────────────────────────────────────────────────────────

/** Radiation's one-shot effects. Everything sustained is painted per-frame by the kit instead. */
export class RadiationFx extends FxBase {
  /** A tracer clamping on: the legs snapping shut and the lamp coming alive. */
  stick(x: number, y: number, depth = 16): void {
    this.anim(depth, 300, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2 * (1 - t) + 0.5, this.tint(RAD.neonLit), (1 - t) * 0.9);
      g.strokeCircle(x, y, 6 + e * 16);
      g.lineStyle(1.2, this.tint(RAD.hazard), (1 - t) * 0.8);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU - t * 2;
        g.lineBetween(x + Math.cos(a) * 14 * (1 - e), y + Math.sin(a) * 14 * (1 - e),
          x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      }
    });
  }

  /** A tracer set falling off: three little plates tumbling away and going dark. */
  shed(x: number, y: number, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 460, (g, t) => {
      for (let i = 0; i < 3; i++) {
        const a = jitter(seed, i) * TAU;
        const d = easeOut(t) * 26;
        geigerTracer(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d + t * t * 22,
          a + t * 7, (1 - t) * 0.85, { scale: 0.8 });
      }
    });
  }

  /** The railgun firing: the line itself, then the recoil bloom at the muzzle. */
  rail(x0: number, y0: number, x1: number, y1: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 260, (g, t) => {
      const a = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
      railBeam(g, this.tint, x0, y0, x1, y1, a, { width: 1 + (1 - t) * 0.7, seed });
      g.fillStyle(this.tint(RAD.core), a * 0.6);
      g.fillCircle(x0, y0, 9 * (1 - t) + 2);
    });
  }

  /** The railgun landing: a punched hole with a shock ring and a shower of ionisation. */
  railHit(x: number, y: number, ang: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 22, RAD.core, RAD.neon, depth);
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(RAD.neon), (1 - t) * 0.9);
      g.strokeCircle(x, y, 10 + e * 40);
      g.lineStyle(1.6 * (1 - t), this.tint(RAD.neonLit), (1 - t) * 0.8);
      for (let i = 0; i < 10; i++) {
        const a = ang + (jitter(seed, i) - 0.5) * 2.6;
        const l = (14 + jitter(seed, 20 + i) * 30) * e;
        g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      }
      trefoil(g, this.tint, x, y, 16 * (0.5 + e), (1 - t) * 0.5, { phase: t * 4 });
    });
  }

  /** The baton's sweep: a wedge of green scoured through the air along the swing. */
  batonArc(x: number, y: number, ang: number, reach: number, depth = 16): void {
    this.anim(depth, 300, (g, t) => {
      const spanA = ang - 1.1 + t * 0.5;
      const spanB = ang + 1.1 + t * 0.5;
      for (const [rk, color, a] of [[1.0, RAD.neonDeep, 0.35], [0.86, RAD.neon, 0.75], [0.7, RAD.neonLit, 0.5]] as const) {
        g.lineStyle(9 * rk * (1 - t) + 1, this.tint(color), (1 - t) * a);
        g.beginPath();
        g.arc(x, y, reach * rk, spanA, spanB, false);
        g.strokePath();
      }
      // The rod itself, at the leading edge.
      const lead = spanB - (1 - easeOut(t)) * 2.2;
      g.lineStyle(4 * (1 - t) + 1, this.tint(RAD.lead), (1 - t));
      g.lineBetween(x, y, x + Math.cos(lead) * reach, y + Math.sin(lead) * reach);
      g.lineStyle(1.6 * (1 - t), this.tint(RAD.neon), (1 - t));
      g.lineBetween(x + Math.cos(lead) * reach * 0.55, y + Math.sin(lead) * reach * 0.55,
        x + Math.cos(lead) * reach, y + Math.sin(lead) * reach);
    });
  }

  /** Someone taking a dose: a trefoil blooming out of them and green sweat coming off. */
  dose(x: number, y: number, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      trefoil(g, this.tint, x, y - 8, 8 + e * 16, (1 - t) * 0.85, { phase: t * 3 });
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = e * (16 + jitter(seed, 10 + i) * 20);
        g.fillStyle(this.tint(RAD.neonLit), (1 - t) * 0.7);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 10, 2.4 * (1 - t) + 0.6);
      }
    });
  }

  /** The drum going up: a hard flash, a violet shell and a spray of hot slag. */
  drumBlast(x: number, y: number, r: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.7, RAD.core, RAD.neon, depth);
    this.anim(depth, 640, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(RAD.neonDeep), (1 - t) * 0.35);
      g.fillCircle(x, y, r * e);
      g.lineStyle(6 * (1 - t) + 1, this.tint(RAD.neon), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * e);
      g.lineStyle(2.4 * (1 - t), this.tint(RAD.seam), (1 - t) * 0.7);
      g.strokeCircle(x, y, r * e * 1.28);
      for (let i = 0; i < 16; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * e * (0.5 + jitter(seed, 30 + i) * 0.8);
        g.fillStyle(this.tint(jitter(seed, 50 + i) > 0.5 ? RAD.hazard : RAD.neonLit), (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3.4 * (1 - t) + 0.6);
      }
    });
  }

  /** A puddle being sniped: the beam arrives, then the pool jumps. */
  puddleShot(x: number, y: number, r: number, depth = 16): void {
    const seed = Math.random() * 999;
    this.anim(depth, 460, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(4 * (1 - t) + 0.8, this.tint(RAD.neon), (1 - t) * 0.9);
      g.strokeEllipse(x, y, r * 2.4 * e, r * 1.4 * e);
      for (let i = 0; i < 9; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * e * (0.6 + jitter(seed, 20 + i) * 0.9);
        g.fillStyle(this.tint(RAD.neonLit), (1 - t) * 0.85);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - e * 16, 3 * (1 - t) + 0.5);
      }
      trefoil(g, this.tint, x, y - 6, 12 * (0.4 + e), (1 - t) * 0.45, { phase: -t * 3 });
    });
  }

  /** The airdrop landing. The mushroom is the ability, so it gets a full second and a half. */
  airdrop(x: number, y: number, depth = 24): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 260, RAD.core, RAD.neonLit, depth);
    this.anim(depth, 1600, (g, t) => {
      mushroomCloud(g, this.tint, x, y, t, 1 - easeIn(Math.max(0, (t - 0.6) / 0.4)), seed);
    });
  }

  // ── Upgrades ──

  /** A tracer landing dead centre: the lamp going red rather than green. */
  heartbeat(x: number, y: number, heat: number, depth = 17): void {
    const tint = redshift(this.tint, heat);
    this.anim(depth, 380, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.6 * (1 - t) + 0.6, tint(RAD.neon), (1 - t) * 0.95);
      g.strokeCircle(x, y, 8 + e * 22);
      // The trace on a monitor, jumping once: flat, spike, flat.
      const w = 34;
      g.lineStyle(1.8, tint(RAD.neonLit), (1 - t) * 0.9);
      g.beginPath();
      g.moveTo(x - w, y - 18 - e * 8);
      g.lineTo(x - 8, y - 18 - e * 8);
      g.lineTo(x - 3, y - 30 - e * 8);
      g.lineTo(x + 2, y - 8 - e * 8);
      g.lineTo(x + 7, y - 18 - e * 8);
      g.lineTo(x + w, y - 18 - e * 8);
      g.strokePath();
    });
  }

  /** A revolver round leaving the barrel — the rail line, cut down to a pistol's worth. */
  pistolShot(x0: number, y0: number, x1: number, y1: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 180, (g, t) => {
      const a = 1 - t;
      railBeam(g, this.tint, x0, y0, x1, y1, a * 0.85, { width: 0.45, seed, spurs: false });
      g.fillStyle(this.tint(RAD.hazard), a * 0.8);
      g.fillCircle(x1, y1, 5 * (1 - t) + 1);
    });
  }

  /** A spent casing tumbling out of the cylinder and rolling. */
  casing(x: number, y: number, depth = 16): void {
    const a = Math.random() * TAU;
    const spin = (Math.random() - 0.5) * 22;
    this.anim(depth, 700, (g, t) => {
      const e = easeOut(t);
      const cx = x + Math.cos(a) * 24 * e;
      const cy = y + Math.sin(a) * 10 * e + t * t * 26;
      g.fillStyle(this.tint(RAD.hazardDeep), (1 - t) * 0.9);
      g.fillRect(cx - 2.4, cy - 1.2, 4.8, 2.4);
      g.fillStyle(this.tint(RAD.hazard), (1 - t));
      g.fillRect(cx - 2 + Math.cos(spin * t) * 0.6, cy - 0.8, 3.6, 1.6);
    });
  }

  /** Supercritical opening: the plates slamming in from outside the body. */
  armourOn(x: number, y: number, depth = 17): void {
    this.flashIn(x, y, 40, RAD.core, RAD.hazard, depth);
    this.anim(depth, 420, (g, t) => {
      leadArmour(g, this.tint, x, y, 1 - t * 0.35, t * 3, { clamp: easeOut(t) });
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(RAD.hazard), (1 - t) * 0.9);
      g.strokeCircle(x, y, 26 + easeOut(t) * 22);
    });
  }

  /** Supercritical's armour failing: the plates blowing off and the load getting out. */
  armourBreak(x: number, y: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, 70, RAD.core, RAD.neonLit, depth);
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = e * (34 + jitter(seed, 20 + i) * 44);
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + t * t * 20;
        g.fillStyle(this.tint(RAD.ink), (1 - t) * 0.9);
        g.fillRect(px - 6, py - 3.4, 12, 6.8);
        g.fillStyle(this.tint(RAD.leadLit), (1 - t));
        g.fillRect(px - 5, py - 2.6, 10, 3);
      }
      g.lineStyle(5 * (1 - t) + 1, this.tint(RAD.neon), (1 - t) * 0.9);
      g.strokeCircle(x, y, 18 + e * 96);
      trefoil(g, this.tint, x, y, 14 + e * 20, (1 - t) * 0.6, { phase: t * 5, color: RAD.neonLit });
    });
  }

  /** The come-down: hot venting straight out of the wearer with nothing left to hold it. */
  meltdown(x: number, y: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (jitter(seed, i) - 0.5) * 2.2;
        const d = e * (16 + jitter(seed, 20 + i) * 30);
        g.fillStyle(this.tint(jitter(seed, 40 + i) > 0.5 ? RAD.hot : RAD.hotLit), (1 - t) * 0.85);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3.2 * (1 - t) + 0.8);
      }
      g.lineStyle(2.4 * (1 - t) + 0.5, this.tint(RAD.hot), (1 - t) * 0.8);
      g.strokeCircle(x, y, 12 + e * 30);
    });
  }

  /** The cancerous arm connecting: four claw lines opened across the body. */
  clawSlash(x: number, y: number, ang: number, depth = 17): void {
    this.anim(depth, 340, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 4; i++) {
        const off = (i - 1.5) * 7;
        const nx = Math.cos(ang + Math.PI / 2) * off;
        const ny = Math.sin(ang + Math.PI / 2) * off;
        const l = 22 * e;
        g.lineStyle(3.4 * (1 - t) + 0.5, this.tint(RAD.fleshDeep), (1 - t) * 0.9);
        g.lineBetween(x + nx - Math.cos(ang) * l, y + ny - Math.sin(ang) * l,
          x + nx + Math.cos(ang) * l, y + ny + Math.sin(ang) * l);
        g.lineStyle(1.4 * (1 - t) + 0.3, this.tint(RAD.hotLit), (1 - t));
        g.lineBetween(x + nx - Math.cos(ang) * l, y + ny - Math.sin(ang) * l,
          x + nx + Math.cos(ang) * l, y + ny + Math.sin(ang) * l);
      }
    });
  }

  /** Gamma Tether landing: the legs punching into the floor and the emitter spinning up. */
  anchorDrop(x: number, y: number, depth = 17): void {
    this.flashIn(x, y, 34, RAD.core, RAD.hazard, depth);
    this.anim(depth, 380, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(RAD.hazard), (1 - t) * 0.85);
      g.strokeCircle(x, y + 10, 8 + e * 30);
      // Dust kicked out sideways along the floor.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        g.fillStyle(this.tint(RAD.lead), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * e * 26, y + 10 + Math.sin(a) * e * 9, 2.4 * (1 - t) + 0.6);
      }
    });
  }

  /** The chain catching: a ring closing on the victim and the wire snapping straight. */
  chainSnap(x0: number, y0: number, x1: number, y1: number, depth = 17): void {
    this.flashIn(x1, y1, 30, RAD.neonLit, RAD.neon, depth);
    this.anim(depth, 320, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(4 * (1 - t) + 0.8, this.tint(RAD.neonLit), (1 - t) * 0.9);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(2.4 * (1 - t) + 0.5, this.tint(RAD.hazard), (1 - t) * 0.9);
      g.strokeCircle(x1, y1, 30 - e * 16);
      trefoil(g, this.tint, x1, y1, 9 + e * 8, (1 - t) * 0.7, { phase: t * 4, color: RAD.neonLit });
    });
  }

  /** The tether letting go: the links falling off the wire. */
  chainBreak(x: number, y: number, depth = 17): void {
    const seed = Math.random() * 999;
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 5; i++) {
        const a = jitter(seed, i) * TAU;
        const px = x + Math.cos(a) * e * (14 + jitter(seed, 20 + i) * 26);
        const py = y + Math.sin(a) * e * 12 + t * t * 30;
        g.lineStyle(2, this.tint(RAD.lead), (1 - t) * 0.9);
        g.strokeCircle(px, py, 3.4);
      }
      g.lineStyle(2 * (1 - t) + 0.4, this.tint(RAD.neonDeep), (1 - t) * 0.7);
      g.strokeCircle(x, y, 10 + e * 22);
    });
  }

  /** The shed particle behind a moving hand: a flake of hot dust. */
  mote(x: number, y: number, depth = 4): void {
    const a = Math.random() * TAU;
    this.anim(depth, 460, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(t < 0.4 ? RAD.neonLit : RAD.neonMid), (1 - t) * 0.65);
      g.fillCircle(x + Math.cos(a) * 10 * e, y + Math.sin(a) * 10 * e - t * 9, 2.2 * (1 - t) + 0.5);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const RADIATION_AVATAR: AvatarSpec = {
  hands: [
    { r: 13, color: RAD.neonDeep, alpha: 0.28 },
    { r: 7.6, color: RAD.lead, alpha: 0.95 },
    { r: 3.4, color: RAD.neon, alpha: 0.9, ox: -1.6, oy: -1.9 },
  ],
  eyeWhite: RAD.neonLit,
  eyePupil: RAD.ink,
  // Heavier than most: a man in lead plate does not skid.
  squash: { div: 22, x: 0.3, y: 0.16 },
};

/**
 * The operative.
 *
 * Three ideas, in order of how much they matter. First, the **plate**: a hard-edged dark violet
 * shell with a collar, a chest hatch and shoulder pauldrons, drawn as flat facets rather than
 * gradients because lead does not shine. Second, the **leak**: every seam between two plates is
 * a green line, and how bright those lines burn is `dose` — the kit feeds it the passive's
 * remaining charge, so a fresh operative is lit up and a spent one is nearly dark. Third, the
 * **visor**: a single wide slit across the helmet with a rangefinder lamp on one side that
 * tracks the aim, which is the only part of the character that ever moves quickly.
 *
 * `setDose` drives the first two; the third rides the rig's own facing.
 */
export class RadiationAvatar extends BaseAvatar {
  /** 0–1: how much of the passive's charge is left. Drives the seams and the backpack window. */
  private dose = 1;
  private doseTarget = 1;
  /** 0–1: raised while a shot is confirmed, which is the only time the visor goes wide. */
  private alert = 0;
  private alertTarget = 0;

  constructor(scene: Phaser.Scene, tint: RadiationColorFn, depth = 6) {
    super(scene, tint, depth, RADIATION_AVATAR);
  }

  /** How much load is still in the suit, 0–1. Lerped, so the twelve-second halving reads. */
  setDose(v: number): void { this.doseTarget = Phaser.Math.Clamp(v, 0, 1); }

  /** Flash the visor and the shoulder lamp — used the instant the railgun confirms. */
  ping(): void { this.alertTarget = 1; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.dose += (this.doseTarget - this.dose) * Math.min(1, delta / 420);
    this.alert += (this.alertTarget - this.alert) * Math.min(1, delta / 90);
    this.alertTarget *= Math.max(0, 1 - delta / 500);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.alertTarget = Math.max(this.alertTarget, 0.5);
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(2, (core) => {
      core.setRadius(on ? 4.6 : 3.4);
      core.setAlpha(on ? 1 : 0.9);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new RadiationFx(this.scene, this.tint).mote(x, y);
  }

  /** Contamination pooled under the boots — brighter the more charge is left in the suit. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(RAD.ink), a * 0.55);
    g.fillEllipse(x, y + 17, 46, 14);
    g.fillStyle(this.tint(RAD.neonDeep), a * (0.2 + this.dose * 0.45));
    g.fillEllipse(x, y + 17, 34 + this.dose * 22, 11);
    g.fillStyle(this.tint(RAD.neon), a * (0.08 + this.dose * 0.22));
    g.fillEllipse(x, y + 17, 18 + this.dose * 16, 6);
  }

  /**
   * The suit. Built as four flat facets — collar, chest, flank, skirt — each a slightly different
   * step on the lead ladder so the silhouette has volume without a single gradient, with the
   * seams between them drawn as glowing lines afterwards.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const lean = Math.sin(this.t * 1.5) * 0.8;
    const seamA = alpha * (0.25 + this.dose * 0.75);

    // Outline, then torso plate.
    const torso: Phaser.Geom.Point[] = [
      new Phaser.Geom.Point(x - 11, y - 15),
      new Phaser.Geom.Point(x + 11, y - 15),
      new Phaser.Geom.Point(x + 14, y - 2),
      new Phaser.Geom.Point(x + 12, y + 13),
      new Phaser.Geom.Point(x - 12, y + 13),
      new Phaser.Geom.Point(x - 14, y - 2),
    ];
    g.fillStyle(this.tint(RAD.ink), alpha * 0.95);
    g.fillPoints(torso.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.14, y + (p.y - y) * 1.1)), true);
    g.fillStyle(this.tint(RAD.leadDeep), alpha);
    g.fillPoints(torso, true);
    // Lit flank down the left, so there is a light source.
    g.fillStyle(this.tint(RAD.lead), alpha * 0.95);
    g.fillPoints(torso.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 0.74 - 2.6, y + (p.y - y) * 0.92)), true);

    // Pauldrons: two hard slabs sitting proud of the shoulders.
    for (const side of [-1, 1]) {
      g.fillStyle(this.tint(RAD.leadDeep), alpha);
      g.fillEllipse(x + side * 13.5, y - 10 + lean * side * 0.4, 12, 9);
      g.fillStyle(this.tint(RAD.leadLit), alpha * 0.9);
      g.fillEllipse(x + side * 13, y - 11 + lean * side * 0.4, 8.4, 5.6);
      g.fillStyle(this.tint(RAD.neon), seamA * 0.85);
      g.fillRect(x + side * 10 - 1.4, y - 12, 2.8, 4.4);
    }

    // Chest hatch: a recessed square with the trefoil stamped into it.
    g.fillStyle(this.tint(RAD.ink), alpha * 0.9);
    g.fillRect(x - 6.5, y - 6.5, 13, 13);
    g.fillStyle(this.tint(RAD.leadLit), alpha * 0.85);
    g.fillRect(x - 5.4, y - 5.4, 10.8, 10.8);
    trefoil(g, this.tint, x, y, 4.6, seamA * 0.95, { phase: this.t * 0.5 });

    // Collar, high and hard, sitting under the helmet.
    g.fillStyle(this.tint(RAD.leadDeep), alpha);
    g.fillRect(x - 9, y - 18, 18, 5);
    g.fillStyle(this.tint(RAD.neon), seamA * 0.7);
    g.fillRect(x - 9, y - 14.2, 18, 1.2);

    // Skirt plates: three tabs so the lower half isn't a slab.
    for (let i = -1; i <= 1; i++) {
      g.fillStyle(this.tint(RAD.lead), alpha * 0.95);
      g.fillRect(x + i * 8 - 3.4, y + 10, 6.8, 6.4);
      g.fillStyle(this.tint(RAD.neon), seamA * 0.5);
      g.fillRect(x + i * 8 - 3.4, y + 10, 6.8, 0.9);
    }

    // Seams: the vertical joins, and the belt line.
    g.lineStyle(1.3, this.tint(RAD.neon), seamA * 0.8);
    g.lineBetween(x - 9.5, y - 12, x - 8, y + 12);
    g.lineBetween(x + 9.5, y - 12, x + 8, y + 12);
    g.lineStyle(1.7, this.tint(RAD.neonLit), seamA * 0.6);
    g.lineBetween(x - 12, y + 7.5, x + 12, y + 7.5);
  }

  /**
   * The helmet, the backpack window and the vents. Rooted at the crown so none of it covers the
   * rig's eyes, which sit inside the visor slit and read as the lamps behind it.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crown = y - 18;
    const seamA = alpha * (0.25 + this.dose * 0.75);
    const look = this.facing;

    // ── Backpack ──
    // Behind the shoulder away from the aim, so it never sits on top of the weapon hand.
    const bpx = x - Math.cos(look) * 13;
    const bpy = y - Math.sin(look) * 6 - 4;
    g.fillStyle(this.tint(RAD.ink), alpha * 0.9);
    g.fillRect(bpx - 7, bpy - 9, 14, 18);
    g.fillStyle(this.tint(RAD.leadDeep), alpha);
    g.fillRect(bpx - 6, bpy - 8, 12, 16);
    // The window: the only place you can actually see the load.
    g.fillStyle(this.tint(RAD.neonDeep), alpha * 0.9);
    g.fillRect(bpx - 3.6, bpy - 5.4, 7.2, 10.8);
    g.fillStyle(this.tint(RAD.neon), seamA);
    g.fillRect(bpx - 3.6, bpy + 5.4 - 10.8 * this.dose, 7.2, 10.8 * this.dose);
    g.lineStyle(1.1, this.tint(RAD.hazard), alpha * 0.8);
    g.strokeRect(bpx - 3.6, bpy - 5.4, 7.2, 10.8);

    // Vents: two stubby pipes over the pack, venting when the dose is high.
    for (const side of [-1, 1]) {
      const vx = bpx + side * 4.4;
      g.fillStyle(this.tint(RAD.lead), alpha);
      g.fillRect(vx - 1.6, bpy - 13, 3.2, 5);
      if (this.dose > 0.2) {
        const puff = (this.t * 1.6 + (side > 0 ? 0.5 : 0)) % 1;
        g.fillStyle(this.tint(RAD.neonLit), seamA * (1 - puff) * 0.6);
        g.fillCircle(vx, bpy - 14 - puff * 12, 1.4 + puff * 3.4);
      }
    }

    // ── Helmet ──
    g.fillStyle(this.tint(RAD.ink), alpha * 0.95);
    g.fillEllipse(x, crown + 2, 24, 21);
    g.fillStyle(this.tint(RAD.leadDeep), alpha);
    g.fillEllipse(x, crown + 2, 21, 18);
    g.fillStyle(this.tint(RAD.leadLit), alpha * 0.85);
    g.fillEllipse(x - 2.5, crown, 13, 9);

    // Visor slit — widens on alert, and is the darkest thing on the character so the rig's
    // own eyes read as two lamps sitting inside it.
    const slitH = 4.6 + this.alert * 3.2;
    g.fillStyle(this.tint(RAD.ink), alpha);
    g.fillEllipse(x + Math.cos(look) * 2, crown + 3, 19, slitH);
    g.fillStyle(this.tint(RAD.neon), seamA * (0.3 + this.alert * 0.5));
    g.fillEllipse(x + Math.cos(look) * 2, crown + 3, 17, slitH * 0.6);

    // Rangefinder: a stalk with a lamp on it, on the aiming side.
    const rx = x + Math.cos(look) * 11;
    const ry = crown - 1 + Math.sin(look) * 4;
    g.lineStyle(2, this.tint(RAD.lead), alpha);
    g.lineBetween(x + Math.cos(look) * 5, crown - 2, rx, ry);
    g.fillStyle(this.tint(RAD.neon), alpha * (0.2 + this.alert * 0.3));
    g.fillCircle(rx, ry, 5 + this.alert * 3);
    g.fillStyle(this.tint(RAD.core), alpha * (0.55 + this.alert * 0.45));
    g.fillCircle(rx, ry, 1.9);

    // Antenna, with a bead that ticks — the dosimeter, and the only fidget the character has.
    const sway = Math.sin(this.t * 3.1) * 3;
    g.lineStyle(1.3, this.tint(RAD.lead), alpha * 0.9);
    g.lineBetween(x + 7, crown - 4, x + 9 + sway, crown - 17);
    g.fillStyle(this.tint(RAD.neonLit), alpha * (0.4 + 0.6 * Math.abs(Math.sin(this.t * (2 + this.dose * 9)))));
    g.fillCircle(x + 9 + sway, crown - 17, 2.2);

    // Mastered: a second trefoil rides above the crown, permanently lit.
    if (this.mastered) {
      trefoil(g, this.tint, x, crown - 24, 6.5, alpha * (0.5 + 0.3 * Math.sin(this.t * 2)),
        { phase: this.t * 1.4, color: RAD.hazard });
    }
  }
}
