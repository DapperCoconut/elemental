import Phaser from 'phaser';
import { FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';
import { SILENCE, SilenceColorFn, fogBank, silenceEye } from '../SilenceVisuals';

/**
 * The Jason skin's ability art for Silence. Visual only: every painter here is called from a
 * branch in `SilenceKit` *in place of* the stock drawing, with the same position, footprint and
 * timing, so nothing about the hitboxes changes.
 *
 * - Stab / slashes → a **machete** swung through the arc, a steel crescent left behind it.
 * - Watch (stalker) → a **sack-hooded watcher** peering out of lake mist; seekers carry crow wings.
 * - Ritual grabber → the **drowned boy** rising out of a pool of black lake water.
 * - Ritual mark → a ring of **camp stakes** strung with red rope, closing in.
 * - Run (Q) chase → no blob: Jason himself, burning, with an **inferno** spread under him.
 *
 * Colours that belong to Silence go through the owner's mapper (`tint`) so the skin palette
 * lands; fire and steel are this skin's own and are drawn as-is.
 */

interface Pt { x: number; y: number }

export const JASON_FIRE = {
  deep: 0x4a0c03,
  red: 0xb8250a,
  orange: 0xf2620f,
  amber: 0xffa128,
  yellow: 0xffd45a,
  pale: 0xfff2c4,
  ember: 0xff7a1a,
};

export const JASON_STEEL = {
  dark: 0x3b3f42,
  mid: 0x8a9196,
  lit: 0xc9d0d4,
  edge: 0xf2f6f8,
  grip: 0x3a2414,
  gripLit: 0x6b4426,
  rivet: 0xb5a27a,
};

function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
}

function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A machete: wrapped grip from the hand back, a stub guard, then a long blade that widens
 * toward a clipped, angled tip. `len` is the blade length; the grip adds about a third.
 * Built in local (along, across) coordinates and rotated by `ang`.
 */
export function drawMachete(
  g: Phaser.GameObjects.Graphics, hx: number, hy: number, ang: number, len: number, alpha: number,
  bloody = false, hot = 0,
): void {
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const to = (u: number, v: number): Pt => ({ x: hx + u * cos - v * sin, y: hy + u * sin + v * cos });
  const s = len / 30;

  // Grip, behind the fist.
  g.fillStyle(JASON_STEEL.grip, alpha);
  fillPts(g, [to(-9 * s, -2.4 * s), to(3 * s, -2.6 * s), to(3 * s, 2.6 * s), to(-9 * s, 2.4 * s)]);
  g.fillStyle(JASON_STEEL.gripLit, alpha * 0.8);
  fillPts(g, [to(-8 * s, -2.2 * s), to(2 * s, -2.3 * s), to(2 * s, -0.8 * s), to(-8 * s, -0.7 * s)]);
  g.fillStyle(JASON_STEEL.rivet, alpha);
  g.fillCircle(to(-5 * s, 0).x, to(-5 * s, 0).y, 0.9 * s);
  g.fillCircle(to(-1 * s, 0).x, to(-1 * s, 0).y, 0.9 * s);

  // Blade: spine straight, edge bellying out toward the tip, tip clipped on the spine side.
  const blade: Pt[] = [
    to(3 * s, -2.8 * s),
    to(len * 0.75, -3.2 * s),
    to(len, -1.2 * s),
    to(len * 0.98, 2.6 * s),
    to(len * 0.6, 4.6 * s),
    to(3 * s, 3.2 * s),
  ];
  g.fillStyle(JASON_STEEL.dark, alpha);
  fillPts(g, blade.map((p) => ({ x: p.x + 0.8, y: p.y + 1.2 })));
  g.fillStyle(JASON_STEEL.mid, alpha);
  fillPts(g, blade);
  // Bevel: the lit flat along the edge.
  g.fillStyle(JASON_STEEL.lit, alpha * 0.9);
  fillPts(g, [to(4 * s, 1 * s), to(len * 0.6, 2.2 * s), to(len * 0.96, 1.2 * s), to(len * 0.6, 4.2 * s), to(4 * s, 2.9 * s)]);
  g.lineStyle(1, JASON_STEEL.edge, alpha * 0.9);
  strokePts(g, [to(4 * s, 3.1 * s), to(len * 0.6, 4.5 * s), to(len * 0.98, 2.5 * s)]);
  // Nicks along the spine — a camp tool, not a sword.
  g.fillStyle(JASON_STEEL.dark, alpha);
  for (const u of [0.35, 0.52, 0.7]) g.fillCircle(to(len * u, -3 * s).x, to(len * u, -3 * s).y, 0.8 * s);
  if (bloody) {
    g.fillStyle(SILENCE.blood, alpha * 0.85);
    fillPts(g, [to(len * 0.55, -1 * s), to(len * 0.99, -1 * s), to(len * 0.97, 2.4 * s), to(len * 0.7, 3.6 * s)]);
  }
  if (hot > 0) {
    // Heat glow along the edge while he burns.
    g.fillStyle(JASON_FIRE.orange, alpha * 0.35 * hot);
    fillPts(g, [to(len * 0.3, 2 * s), to(len * 0.98, 1.6 * s), to(len * 0.6, 5.4 * s)]);
  }
  // Guard stub.
  g.fillStyle(JASON_STEEL.dark, alpha);
  fillPts(g, [to(2 * s, -4 * s), to(4 * s, -4 * s), to(4 * s, 4.2 * s), to(2 * s, 4.2 * s)]);
}

/** A fire tongue: teardrop widest a third of the way up, drawn out to a leaning point. */
export function flameTongue(
  g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, w: number, lean: number,
): void {
  const steps = 10;
  const half = (u: number) => w * Math.pow(Math.sin(Math.PI * (0.3 + 0.7 * u)), 0.9);
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push({ x: x + lean * u * u - half(u), y: y - h * u });
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push({ x: x + lean * u * u + half(u), y: y - h * u });
  }
  fillPts(g, pts);
}

/** Layered flame: deep shell, red body, orange, yellow core. */
export function flameLayered(
  g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, w: number, lean: number, alpha: number,
): void {
  g.fillStyle(JASON_FIRE.deep, alpha * 0.45);
  flameTongue(g, x, y + 1, h * 1.1, w * 1.25, lean);
  g.fillStyle(JASON_FIRE.red, alpha * 0.85);
  flameTongue(g, x, y, h, w, lean);
  g.fillStyle(JASON_FIRE.orange, alpha * 0.9);
  flameTongue(g, x, y - 0.5, h * 0.72, w * 0.7, lean * 0.8);
  g.fillStyle(JASON_FIRE.yellow, alpha * 0.9);
  flameTongue(g, x, y - 1, h * 0.4, w * 0.4, lean * 0.5);
}

// ── JasonFx ───────────────────────────────────────────────────────────────

export class JasonFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: SilenceColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * A machete swing: the blade itself sweeps through `angle ± halfArc` at `range` from the
   * pivot, leaving a steel crescent that fades behind it — the same arc and footprint as the
   * stock claw slash. `cuts` > 1 adds fainter echo crescents for a heavier swing.
   */
  machete(
    x: number, y: number, angle: number, range: number, halfArc: number,
    o: { duration?: number; depth?: number; cuts?: number; bloody?: boolean } = {},
  ): void {
    const dur = o.duration ?? 260;
    const depth = o.depth ?? 10;
    const cuts = Math.max(1, Math.min(4, o.cuts ?? 1));
    const bloody = o.bloody ?? false;
    const drops = Array.from({ length: bloody ? 7 : 0 }, () => ({
      u: 0.3 + Math.random() * 0.7, v: 30 + Math.random() * 60, s: 1.4 + Math.random() * 1.8,
    }));
    this.anim(depth, dur, (g, t) => {
      const sweep = easeOut(Math.min(1, t / 0.7));
      const fade = 1 - easeIn(t);
      const from = angle - halfArc;
      const head = from + halfArc * 2 * sweep;

      for (let c = 0; c < cuts; c++) {
        const rr = range * (1 - c * 0.16);
        const w = rr * 0.22 * (1 - c * 0.2);
        const a = fade * (c === 0 ? 1 : 0.45);
        // Crescent: outer arc out, inner arc back, thick behind the blade and thin at its tail.
        const outer: Pt[] = [];
        const inner: Pt[] = [];
        for (let i = 0; i <= 14; i++) {
          const u = i / 14;
          const aa = from + (head - from) * u;
          const thick = w * Math.pow(u, 1.4);
          outer.push({ x: x + Math.cos(aa) * rr, y: y + Math.sin(aa) * rr });
          inner.push({ x: x + Math.cos(aa) * (rr - thick), y: y + Math.sin(aa) * (rr - thick) });
        }
        const band = [...outer, ...[...inner].reverse()];
        g.fillStyle(this.tint(SILENCE.void), a * 0.4);
        fillPts(g, band.map((p) => ({ x: p.x + 1.5, y: p.y + 2 })));
        g.fillStyle(JASON_STEEL.lit, a * 0.55);
        fillPts(g, band);
        g.lineStyle(1.6, JASON_STEEL.edge, a * 0.95);
        strokePts(g, outer);
        if (bloody) {
          g.lineStyle(1.2, SILENCE.blood, a * 0.8);
          strokePts(g, inner);
        }
      }

      // The blade itself, riding the head of the swing.
      if (t < 0.85) {
        const bl = Math.min(34, range * 0.62);
        const hx = x + Math.cos(head) * (range - bl * 0.95);
        const hy = y + Math.sin(head) * (range - bl * 0.95);
        drawMachete(g, hx, hy, head, bl, fade, bloody);
      }
      // Blood flung off the tip along the swing.
      for (const d of drops) {
        if (sweep < d.u) continue;
        const aa = from + halfArc * 2 * d.u;
        const k = (sweep - d.u) / (1 - d.u + 0.001);
        const px = x + Math.cos(aa) * (range + d.v * k) + Math.cos(aa + Math.PI / 2) * d.v * 0.3 * k;
        const py = y + Math.sin(aa) * (range + d.v * k) + Math.sin(aa + Math.PI / 2) * d.v * 0.3 * k + 10 * k * k;
        g.fillStyle(SILENCE.blood, fade * 0.9);
        g.fillCircle(px, py, d.s * (1 - k * 0.4));
      }
    });
  }

  /**
   * The ritual mark: camp stakes driven in a ring, red rope strung between them, the ring
   * cinching toward a painted X over the `duration` of the wind-up. Same radius as `dread`.
   */
  stakes(x: number, y: number, radius: number, duration: number, depth = 4): void {
    const n = 8;
    this.anim(depth, duration, (g, t) => {
      const k = easeIn(t);
      const r = radius * (1.35 - k * 0.45);
      const pts: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 0.2 - t * 0.6;
        pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.8 });
      }
      // Trampled ground inside.
      g.fillStyle(this.tint(SILENCE.void), 0.18 + 0.3 * t);
      g.fillEllipse(x, y, r * 2, r * 1.6);
      // Rope, sagging between stakes.
      g.lineStyle(2, this.tint(SILENCE.rust), 0.5 + 0.5 * t);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        const mx = (p.x + q.x) / 2 + (x - (p.x + q.x) / 2) * 0.08;
        const my = (p.y + q.y) / 2 + 4;
        strokePts(g, [{ x: p.x, y: p.y - 8 }, { x: mx, y: my - 6 }, { x: q.x, y: q.y - 8 }]);
      }
      // Stakes: split wood, sharpened tops, a shadow side.
      for (const p of pts) {
        g.fillStyle(this.tint(SILENCE.void), 0.4);
        g.fillEllipse(p.x + 2, p.y + 2, 8, 3.5);
        g.fillStyle(this.tint(SILENCE.twine), 0.95);
        fillPts(g, [{ x: p.x - 2.6, y: p.y }, { x: p.x - 2.4, y: p.y - 11 }, { x: p.x, y: p.y - 15 },
          { x: p.x + 2.4, y: p.y - 11 }, { x: p.x + 2.6, y: p.y }]);
        g.fillStyle(this.tint(SILENCE.burlap), 0.9);
        fillPts(g, [{ x: p.x - 2.4, y: p.y }, { x: p.x - 2.2, y: p.y - 11 }, { x: p.x, y: p.y - 15 }, { x: p.x - 0.4, y: p.y }]);
      }
      // The painted X, brightening as the strike comes.
      const xs = radius * 0.32;
      g.lineStyle(4, this.tint(SILENCE.blood), 0.25 + 0.7 * t);
      g.lineBetween(x - xs, y - xs * 0.8, x + xs, y + xs * 0.8);
      g.lineBetween(x + xs, y - xs * 0.8, x - xs, y + xs * 0.8);
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────

  /**
   * Watcher: a burlap sack-hood with one ragged eye-hole, looking out of a knot of lake mist.
   * The eye in the hole reddens with maturity exactly like the stock watcher. A seeker grows
   * crow wings; a ripe watcher has a ring of rusted hooks round it.
   */
  static drawWatcher(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, maturity: number, seeker: boolean, t: number, alpha: number, ownerSees: boolean,
  ): void {
    const r = 13;
    fogBank(g, x, y + 4, r * 1.25, x * 0.01, t, tint(SILENCE.plum), alpha * 0.7, 5);

    if (seeker) {
      const beat = Math.sin(t * 9) * 0.3;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const a = (side > 0 ? -0.35 + i * 0.3 + beat : Math.PI + 0.35 - i * 0.3 - beat);
          const len = r * (1.7 - i * 0.22);
          const bx = x + side * r * 0.5, by = y - 1;
          const ca = Math.cos(a), sa = Math.sin(a);
          g.fillStyle(tint(SILENCE.void), alpha * 0.95);
          fillPts(g, [
            { x: bx - sa * 2.6, y: by + ca * 2.6 },
            { x: bx + ca * len - sa * 1.2, y: by + sa * len + ca * 1.2 },
            { x: bx + ca * len * 1.05, y: by + sa * len * 1.05 },
            { x: bx + sa * 2.6, y: by - ca * 2.6 },
          ]);
        }
      }
    }

    // Shoulders of a coat under the hood.
    g.fillStyle(tint(SILENCE.bruise), alpha);
    g.fillEllipse(x, y + r * 0.75, r * 2.1, r * 1.0);
    // The sack: lumpy, cinched at the neck with twine, a tied-off peak lolling to one side.
    const sway = Math.sin(t * 1.3) * 1.2;
    g.fillStyle(tint(SILENCE.twine), alpha);
    fillPts(g, [
      { x: x - r * 0.85, y: y + r * 0.5 }, { x: x - r * 0.95, y: y - r * 0.2 },
      { x: x - r * 0.6, y: y - r * 0.85 }, { x: x + sway, y: y - r * 1.05 },
      { x: x + r * 0.75 + sway, y: y - r * 1.25 }, { x: x + r * 0.7, y: y - r * 0.6 },
      { x: x + r * 0.95, y: y - r * 0.1 }, { x: x + r * 0.8, y: y + r * 0.5 },
    ]);
    g.fillStyle(tint(SILENCE.burlap), alpha);
    fillPts(g, [
      { x: x - r * 0.78, y: y + r * 0.42 }, { x: x - r * 0.86, y: y - r * 0.2 },
      { x: x - r * 0.52, y: y - r * 0.78 }, { x: x + sway * 0.8, y: y - r * 0.96 },
      { x: x + r * 0.3, y: y - r * 0.6 }, { x: x + r * 0.2, y: y + r * 0.42 },
    ]);
    // Weave stitches and the neck cinch.
    g.lineStyle(1, tint(SILENCE.twine), alpha * 0.8);
    for (let i = 0; i < 3; i++) {
      const yy = y - r * 0.55 + i * r * 0.32;
      g.lineBetween(x - r * 0.6, yy, x - r * 0.2, yy + 1.5);
    }
    g.lineStyle(2, tint(SILENCE.rust), alpha);
    g.lineBetween(x - r * 0.8, y + r * 0.45, x + r * 0.8, y + r * 0.45);
    // The one eye-hole, torn, with the eye looking out.
    g.fillStyle(tint(SILENCE.void), alpha);
    g.fillEllipse(x - 1, y - 2, r * 0.95, r * 0.75);
    const iris = maturity > 0.7 ? SILENCE.gore : maturity > 0.35 ? SILENCE.rust : SILENCE.amethyst;
    const open = ownerSees ? 1 : 0.3 + maturity * 0.7;
    silenceEye(g, tint, x - 1, y - 2, 0, r * 0.4, Math.sin(t * 1.7) * 0.9, open, iris, alpha);

    if (maturity >= 1) {
      // Ripe: rusted fish-hooks on lines, swinging round it.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 0.5;
        const hx = x + Math.cos(a) * r * 1.5, hy = y + Math.sin(a) * r * 1.3;
        g.lineStyle(1, tint(SILENCE.pale), alpha * 0.5);
        g.lineBetween(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.8, hx, hy);
        g.lineStyle(1.6, tint(SILENCE.gore), alpha * 0.9);
        g.beginPath();
        g.arc(hx, hy + 2, 2.4, Math.PI * 1.1 + a, Math.PI * 2.4 + a);
        g.strokePath();
      }
    }
  }

  /**
   * The grabber: the drowned boy coming up out of a black pool — a bloated, lopsided head
   * breaking the surface with water rings spreading round it, fingers on the rim. While it
   * is hunting he rises higher and both eyes open.
   */
  static drawGrabber(
    g: Phaser.GameObjects.Graphics, tint: SilenceColorFn,
    x: number, y: number, seed: number, t: number, alpha: number, hunting: boolean,
  ): void {
    const r = 22;
    // The pool.
    g.fillStyle(tint(SILENCE.void), alpha * 0.9);
    g.fillEllipse(x, y + 6, r * 2.7, r * 1.35);
    g.fillStyle(tint(SILENCE.pitch), alpha);
    g.fillEllipse(x, y + 6, r * 2.3, r * 1.1);
    for (let k = 0; k < 2; k++) {
      const p = (t * 0.45 + k * 0.5 + seed) % 1;
      g.lineStyle(1.4, tint(SILENCE.lilac), alpha * 0.45 * (1 - p));
      g.strokeEllipse(x, y + 6, r * (1.2 + p * 1.1), r * (0.55 + p * 0.5));
    }
    // Weed floating on it.
    g.lineStyle(1.6, tint(SILENCE.bile), alpha * 0.8);
    for (let i = 0; i < 4; i++) {
      const a = seed + i * 1.6;
      const bx = x + Math.cos(a) * r * 0.95, by = y + 6 + Math.sin(a) * r * 0.45;
      strokePts(g, [{ x: bx, y: by }, { x: bx + 4 + Math.sin(t + i) * 2, y: by - 2 }, { x: bx + 8, y: by + 1 }]);
    }

    const rise = hunting ? 1 : 0.55 + 0.08 * Math.sin(t * 1.2 + seed);
    const hy = y + 4 - r * 0.55 * rise;
    // Head: bloated, skewed, the brow heavy on one side.
    g.fillStyle(tint(SILENCE.bile), alpha);
    fillPts(g, [
      { x: x - r * 0.62, y: y + 6 }, { x: x - r * 0.7, y: hy - r * 0.1 },
      { x: x - r * 0.45, y: hy - r * 0.55 }, { x: x + r * 0.1, y: hy - r * 0.7 },
      { x: x + r * 0.6, y: hy - r * 0.45 }, { x: x + r * 0.66, y: hy + r * 0.1 }, { x: x + r * 0.58, y: y + 6 },
    ]);
    g.fillStyle(tint(SILENCE.bileHi), alpha * 0.8);
    fillPts(g, [
      { x: x - r * 0.5, y: hy }, { x: x - r * 0.38, y: hy - r * 0.45 },
      { x: x + r * 0.05, y: hy - r * 0.58 }, { x: x - r * 0.05, y: hy - r * 0.1 },
    ]);
    // Wet hair plastered on the scalp.
    g.lineStyle(1.4, tint(SILENCE.bruise), alpha);
    for (let i = 0; i < 5; i++) {
      const sx = x - r * 0.4 + i * r * 0.2;
      strokePts(g, [{ x: sx, y: hy - r * 0.58 }, { x: sx - 2, y: hy - r * 0.3 }, { x: sx - 1, y: hy - r * 0.1 }]);
    }
    // Eyes: one droops lower and smaller. Both stare once it hunts.
    const open = hunting ? 1 : Phaser.Math.Clamp(Math.sin(t * 1.3 + seed) * 2, 0.15, 1);
    silenceEye(g, tint, x - r * 0.25, hy - r * 0.05, 0, 4.6, Math.sin(t * 2) * 0.8, open, hunting ? SILENCE.gore : SILENCE.rust, alpha);
    silenceEye(g, tint, x + r * 0.28, hy + r * 0.06, 0.2, 3.4, Math.sin(t * 2 + 1) * 0.8, open * 0.8, hunting ? SILENCE.gore : SILENCE.rust, alpha);
    // Water line across the chin, so he is *in* the pool.
    g.fillStyle(tint(SILENCE.pitch), alpha);
    g.fillEllipse(x, y + 7, r * 1.5, r * 0.32);
    // Fingers hooked on the rim.
    for (const side of [-1, 1]) {
      const fx = x + side * r * 0.95, fy = y + 3;
      g.fillStyle(tint(SILENCE.bile), alpha);
      for (let f = 0; f < 3; f++) {
        g.fillEllipse(fx + side * f * 2.6, fy - (hunting ? 3 : 1) + f * 0.6, 2.6, 5.5);
      }
    }
  }

  /**
   * Under the burning Jason during the Q chase: a scorched ring of fire on the floor, the
   * same `radius` the blob filled, with tongues standing up round its rim.
   */
  static drawInferno(
    g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    const flick = 0.92 + Math.sin(t * 11) * 0.05 + Math.sin(t * 17.3) * 0.03;
    g.fillStyle(JASON_FIRE.deep, alpha * 0.55);
    g.fillEllipse(x, y + radius * 0.25, radius * 2.4 * flick, radius * 1.4 * flick);
    g.fillStyle(JASON_FIRE.red, alpha * 0.35);
    g.fillEllipse(x, y + radius * 0.2, radius * 2.0 * flick, radius * 1.15 * flick);
    g.fillStyle(JASON_FIRE.amber, alpha * 0.22);
    g.fillEllipse(x, y + radius * 0.15, radius * 1.3, radius * 0.75);
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.4;
      const bx = x + Math.cos(a) * radius * 0.95;
      const by = y + radius * 0.2 + Math.sin(a) * radius * 0.55;
      const h = radius * (0.38 + 0.18 * Math.abs(Math.sin(t * 6 + i * 1.9)));
      flameLayered(g, bx, by, h, radius * 0.11, Math.sin(t * 3 + i) * 4, alpha * 0.9);
    }
    // Embers lifting.
    for (let i = 0; i < 10; i++) {
      const p = (t * 0.7 + i / 10) % 1;
      const ex = x + Math.sin(i * 2.7 + t) * radius * 0.9;
      const ey = y + radius * 0.3 - p * radius * 1.6;
      g.fillStyle(JASON_FIRE.ember, alpha * (1 - p));
      g.fillCircle(ex, ey, 1.8 * (1 - p * 0.5));
    }
  }

  /** An ember spat off a burning hand. */
  ember(x: number, y: number): void {
    const dx = (Math.random() - 0.5) * 24;
    const r = 1.4 + Math.random() * 1.6;
    this.anim(9, 520, (g, t) => {
      const f = 1 - t;
      const px = x + dx * easeOut(t), py = y - 26 * easeIn(t) - 8 * t;
      g.fillStyle(JASON_FIRE.orange, 0.45 * f);
      g.fillCircle(px, py, r * 2 * f);
      g.fillStyle(JASON_FIRE.yellow, 0.95 * f);
      g.fillCircle(px, py, r * f);
    });
  }

  /** A drip of lake water off a moving hand. */
  drip(x: number, y: number): void {
    this.anim(5, 480, (g, t) => {
      g.fillStyle(this.tint(SILENCE.lilac), 0.6 * (1 - t));
      g.fillEllipse(x, y + 14 * easeIn(t), 2.2, 3.6);
    });
  }
}
