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
};

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
