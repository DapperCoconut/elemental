import Phaser from 'phaser';
import { TAU, easeIn, easeOut } from '../ElementVisuals';
import { AIR, AirColorFn, AirDraft, AirFx, GustBurstOpts, MoteOpts, windCurl } from '../AirVisuals';

/**
 * The Sakura skin's ability art: every gust, curl and cut air throws becomes a stream of
 * drifting cherry blossom, and the dancer's fan work becomes ninja steel.
 *
 * **Visual only.** Every method here keeps the exact signature, footprint and duration of the
 * AirFx / AirDraft member it replaces, so AirKit just picks this Fx for a Sakura owner and the
 * fight underneath is untouched. Colours still go through the owner's mapper (`tint(AIR.*)`),
 * and the Sakura palette in `src/data/skins/sakura.ts` is what turns them pink — which also
 * keeps the Storm perk's thunderhead darkening working on the tornado.
 */

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * One cherry petal, base at `(x, y)` pointing along `angle`: a narrow claw at the root that
 * swells to a rounded blade, with the notch bitten into its tip that makes it *sakura* rather
 * than any other petal. `flat` squeezes the width — a petal turning over in the air is seen
 * edge-on half the time, and that flicker is the whole read on "falling, not flying".
 * Fills with the current fill style.
 */
export function sakuraPetal(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, angle: number, len: number, flat = 1,
): void {
  if (len < 0.8) return;
  const w = len * 0.36 * Math.max(0.12, flat);
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const P = (u: number, v: number) => new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
  const left: Phaser.Geom.Point[] = [];
  const right: Phaser.Geom.Point[] = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const f = (i / N) * 0.9;
    const wf = f < 0.6 ? Math.sin((Math.PI / 2) * (f / 0.6)) : 1 - ((f - 0.6) / 0.3) * 0.42;
    left.push(P(f * len, wf * w));
    right.push(P(f * len, -wf * w));
  }
  // The two lobes of the tip, and the notch between them.
  left.push(P(len * 0.99, w * 0.34));
  right.push(P(len * 0.99, -w * 0.34));
  right.reverse();
  g.fillPoints([...left, P(len * 0.83, 0), ...right], true);
}

/**
 * A whole five-petal blossom: pale petals, a flush of pink at the heart, and — when it is big
 * enough to see them — a ring of stamens tipped with gold.
 */
export function blossomFlower(
  g: Phaser.GameObjects.Graphics, tint: AirColorFn,
  x: number, y: number, r: number, rot: number, alpha: number,
): void {
  if (alpha <= 0.01 || r < 1) return;
  for (let k = 0; k < 5; k++) {
    const a = rot + (k / 5) * TAU;
    g.fillStyle(tint(AIR.sky), alpha * 0.9);
    sakuraPetal(g, x + Math.cos(a) * r * 0.06, y + Math.sin(a) * r * 0.06, a, r * 1.04, 1.1);
    g.fillStyle(tint(AIR.mist), alpha * 0.85);
    sakuraPetal(g, x + Math.cos(a) * r * 0.16, y + Math.sin(a) * r * 0.16, a, r * 0.8, 0.82);
  }
  g.fillStyle(tint(AIR.blue), alpha);
  g.fillCircle(x, y, r * 0.3);
  if (r >= 7) {
    g.lineStyle(0.8, tint(AIR.storm), alpha * 0.8);
    for (let k = 0; k < 7; k++) {
      const a = rot + 0.3 + (k / 7) * TAU;
      g.lineBetween(x, y, x + Math.cos(a) * r * 0.44, y + Math.sin(a) * r * 0.44);
    }
    g.fillStyle(tint(AIR.charge), alpha);
    for (let k = 0; k < 7; k++) {
      const a = rot + 0.3 + (k / 7) * TAU;
      g.fillCircle(x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46, Math.max(0.7, r * 0.06));
    }
  } else {
    g.fillStyle(tint(AIR.charge), alpha);
    g.fillCircle(x, y, Math.max(0.8, r * 0.12));
  }
}

/** Samples the same accelerating bend `windCurl` follows, so a petal stream keeps air's line. */
function curlPath(cx: number, cy: number, angle: number, len: number, curl: number, n: number):
  { x: number; y: number; a: number }[] {
  const out: { x: number; y: number; a: number }[] = [];
  let px = cx, py = cy;
  const step = len / n;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const a = angle + curl * f * f;
    out.push({ x: px, y: py, a });
    px += Math.cos(a) * step;
    py += Math.sin(a) * step;
  }
  return out;
}

const STREAM_COLS = [AIR.sky, AIR.mist, AIR.blue] as number[];

/**
 * The Sakura stand-in for `windCurlLayered`: the same curl, drawn as a faint ribbon of
 * displaced air with petals strung along it — fattest where the curl is fattest, each one
 * tipped off the line a little and turned over by a different amount. `seed` keeps one
 * stream's petals stable from frame to frame (pass the caller's loop index).
 */
export function petalCurl(
  g: Phaser.GameObjects.Graphics, tint: AirColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  curl: number, alpha: number, seed = 0,
): void {
  if (alpha <= 0.01 || len < 1) return;
  // The ribbon keeps the shape legible at gameplay zoom — petals alone would read as noise.
  g.fillStyle(tint(AIR.steel), alpha * 0.16);
  windCurl(g, cx, cy, angle, len, halfW * 1.1, curl);
  const n = Phaser.Math.Clamp(Math.round(len / 8), 2, 8);
  const path = curlPath(cx, cy, angle, len, curl, n);
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const prof = Math.sin(Math.PI * Math.pow(Math.min(0.98, f), 0.82));
    const size = 2.6 + halfW * 1.5 * prof;
    const p = path[i];
    const ang = p.a + Math.sin(seed * 1.3 + i * 2.39) * 0.9;
    const flat = 0.5 + 0.5 * Math.abs(Math.cos(seed * 1.7 + i * 1.3));
    g.fillStyle(tint(STREAM_COLS[(i + seed) % 3]), alpha * (0.6 + 0.4 * prof));
    sakuraPetal(g, p.x - Math.cos(ang) * size * 0.5, p.y - Math.sin(ang) * size * 0.5, ang, size, flat);
  }
}

/**
 * A tapered crescent of cut air following an arc — a blade's trail. Thin at the tail, full at
 * the leading end where the steel is right now, pinched again at the very tip.
 */
function slashArc(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, r: number, from: number, to: number, thick: number,
): void {
  const SEG = 20;
  const outer: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= SEG; i++) {
    const f = i / SEG;
    const a = from + (to - from) * f;
    const tip = f > 0.88 ? 0.35 + 0.65 * (1 - f) / 0.12 : 1;
    const w = thick * Math.pow(f, 1.3) * tip;
    outer.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    inner.push(new Phaser.Geom.Point(cx + Math.cos(a) * (r - w), cy + Math.sin(a) * (r - w)));
  }
  inner.reverse();
  g.fillPoints(outer.concat(inner), true);
}

/** A straight tapered slash from `(x1,y1)` to `(x2,y2)`, fullest two thirds of the way along. */
function slashLine(
  g: Phaser.GameObjects.Graphics,
  x1: number, y1: number, x2: number, y2: number, halfW: number,
): void {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const SEG = 10;
  const a: Phaser.Geom.Point[] = [];
  const b: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= SEG; i++) {
    const f = i / SEG;
    const w = halfW * Math.sin(Math.PI * Math.pow(f, 1.6));
    const px = x1 + (x2 - x1) * f, py = y1 + (y2 - y1) * f;
    a.push(new Phaser.Geom.Point(px + nx * w, py + ny * w));
    b.push(new Phaser.Geom.Point(px - nx * w * 0.4, py - ny * w * 0.4));
  }
  b.reverse();
  g.fillPoints(a.concat(b), true);
}

/** A four-point glint — where the steel catches the light at the head of a cut. */
function glint(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  if (r < 0.6) return;
  g.fillPoints([
    new Phaser.Geom.Point(x, y - r), new Phaser.Geom.Point(x + r * 0.22, y - r * 0.22),
    new Phaser.Geom.Point(x + r, y), new Phaser.Geom.Point(x + r * 0.22, y + r * 0.22),
    new Phaser.Geom.Point(x, y + r), new Phaser.Geom.Point(x - r * 0.22, y + r * 0.22),
    new Phaser.Geom.Point(x - r, y), new Phaser.Geom.Point(x - r * 0.22, y - r * 0.22),
  ], true);
}

// ── SakuraFx ──────────────────────────────────────────────────────────────

/**
 * AirFx for a Sakura owner. Every override keeps its parent's timing and reach; the composite
 * effects the parent builds out of these (gustBurst, the base half of slipstream, …) pick the
 * petal versions up through ordinary virtual dispatch.
 */
export class SakuraFx extends AirFx {
  constructor(scene: Phaser.Scene, tint: AirColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Petals flung on curving paths, turning over as they go and settling as they slow. */
  motes(x: number, y: number, count: number, opts: MoteOpts = {}): void {
    const speed = opts.speed ?? 130;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3;
    const life = opts.life ?? 520;
    const swirl = opts.swirl ?? 1.1;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, (_, i) => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.45 + Math.random() * 0.9),
      r: (size * (0.9 + Math.random() * 0.8) + 1.4) * 2,
      turn: swirl * (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8),
      spin: (Math.random() - 0.5) * 7,
      ph: Math.random() * TAU,
      col: STREAM_COLS[i % 3],
      bloom: Math.random() < 0.12,
      delay: Math.random() * 0.18,
    }));
    const dur = Math.round(life * 1.15);
    this.anim(depth, dur, (g, t) => {
      const secs = dur / 1000;
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * secs * 0.87;
        const a = p.a + p.turn * lt * lt;
        // Thrown, then caught by the air: a lazy sway and a slow fall once the push is spent.
        const px = x + Math.cos(a) * d + Math.sin(lt * 6 + p.ph) * 3 * lt;
        const py = y + Math.sin(a) * d + lt * lt * 14;
        const fade = 1 - lt * lt;
        const rot = p.a + p.spin * lt;
        if (p.bloom) {
          blossomFlower(g, this.tint, px, py, p.r * 0.62, rot, 0.95 * fade);
        } else {
          const flat = 0.3 + 0.7 * Math.abs(Math.cos(lt * 7 + p.ph));
          g.fillStyle(this.tint(p.col), 0.92 * fade);
          sakuraPetal(g, px - Math.cos(rot) * p.r * 0.5, py - Math.sin(rot) * p.r * 0.5, rot, p.r, flat);
        }
      }
    });
  }

  /** A hit knocks petals loose instead of feathers: thrown, then fluttering down. */
  featherPuff(x: number, y: number, count = 6, depth = 7): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      ang: Math.random() * TAU,
      spin: (Math.random() - 0.5) * 5,
      speed: 40 + Math.random() * 70,
      len: 8 + Math.random() * 5,
      ph: Math.random() * TAU,
      col: STREAM_COLS[i % 3],
      delay: Math.random() * 0.25,
      bloom: i === 0,
    }));
    this.anim(depth, 900, (g, t) => {
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const d = s.speed * easeOut(lt) * 0.9;
        const px = x + Math.cos(s.ang) * d + Math.sin(lt * 5 + s.ph) * 4 * lt;
        const py = y + Math.sin(s.ang) * d + lt * lt * 26;
        const fade = (1 - lt * lt) * 0.92;
        const rot = s.ang + s.spin * lt;
        if (s.bloom) {
          blossomFlower(g, this.tint, px, py, s.len * 0.6, rot, fade);
        } else {
          g.fillStyle(this.tint(s.col), fade);
          sakuraPetal(g, px, py, rot, s.len, 0.3 + 0.7 * Math.abs(Math.cos(lt * 6 + s.ph)));
        }
      }
    });
  }

  /** Petals swept into arcs on the ground, coasting to a stop and fading where they lie. */
  dustMark(x: number, y: number, radius: number, depth = 1): void {
    const seeds = Array.from({ length: 12 }, (_, i) => ({
      r: radius * (0.3 + Math.random() * 0.75),
      a: Math.random() * TAU,
      sweep: (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.6),
      rot: Math.random() * TAU,
      len: 5 + Math.random() * 4,
      col: STREAM_COLS[i % 3],
    }));
    this.anim(depth, 1100, (g, t) => {
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      for (const s of seeds) {
        const a = s.a + s.sweep * easeOut(t);
        g.fillStyle(this.tint(s.col), 0.6 * fade);
        sakuraPetal(g, x + Math.cos(a) * s.r, y + Math.sin(a) * s.r * 0.55, s.rot + s.sweep * t * 2, s.len, 0.75);
      }
    });
  }

  /** Counter-turning rings of petal streams over a blossom that opens at the eye. */
  vortexCore(x: number, y: number, radius: number, duration: number, depth = 6): void {
    const bands = [
      { count: 7, r: 0.72, len: 0.62, w: 0.15, spin: 3.2, dir: 1, alpha: 0.5 },
      { count: 6, r: 0.46, len: 0.5, w: 0.14, spin: -4.6, dir: -1, alpha: 0.7 },
      { count: 5, r: 0.24, len: 0.36, w: 0.12, spin: 6.4, dir: 1, alpha: 0.8 },
    ];
    const phases = bands.map((b) => Array.from({ length: b.count }, () => Math.random() * TAU));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.4 + easeOut(Math.min(1, t * 1.4)) * 0.75;
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      bands.forEach((b, bi) => {
        for (let i = 0; i < b.count; i++) {
          const a = phases[bi][i] + (i / b.count) * TAU + t * b.spin;
          const rr = radius * grow * b.r;
          petalCurl(
            g, this.tint, x + Math.cos(a) * rr, y + Math.sin(a) * rr,
            a + b.dir * Math.PI * 0.5, radius * grow * b.len, radius * grow * b.w,
            b.dir * 1.6, b.alpha * fade, i + bi * 5,
          );
        }
      });
      if (t < 0.55) blossomFlower(g, this.tint, x, y, radius * grow * 0.26, t * 4, (1 - t / 0.55) * 0.85);
    });
  }

  /** A pinwheel of petal streams thrown out from a point. */
  bloom(x: number, y: number, radius: number, petals = 10, depth = 4): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const seeds = Array.from({ length: petals }, (_, i) => ({
      ang: (i / petals) * TAU + (Math.random() - 0.5) * 0.8,
      root: radius * (0.1 + Math.random() * 0.28),
      len: radius * (0.4 + Math.random() * 0.7),
      w: radius * (0.1 + Math.random() * 0.1),
      curl: dir * (1.1 + Math.random() * 1.3),
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 460, (g, t) => {
      seeds.forEach((s, i) => {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(lt);
        const fade = 1 - easeIn(lt);
        const lean = s.ang + dir * 0.55 * lt;
        petalCurl(
          g, this.tint, x + Math.cos(s.ang) * s.root * grow, y + Math.sin(s.ang) * s.root * grow,
          lean, s.len * grow, s.w * (1 - lt * 0.35), s.curl * lt, 0.8 * fade, i,
        );
      });
    });
    this.ring(x, y, radius * 0.15, radius, AIR.mist, 400, 3, depth);
  }

  /** The parent's whole burst (now all petals), crowned by one big blossom bursting open. */
  gustBurst(x: number, y: number, radius: number, opts: GustBurstOpts = {}): void {
    super.gustBurst(x, y, radius, opts);
    const depth = (opts.depth ?? 6) + 1;
    const rot = Math.random() * TAU;
    this.anim(depth, 420, (g, t) => {
      const r = radius * 0.34 * (0.4 + easeOut(t) * 0.9);
      blossomFlower(g, this.tint, x, y, r, rot + t * 1.6, 0.9 * (1 - easeIn(t)));
    });
  }

  /** The throw's recoil: three short petal streams and a blossom at the hand. */
  muzzleGust(x: number, y: number, angle: number, scale = 1, depth = 6): void {
    this.anim(depth, 150, (g, t) => {
      const fade = 1 - t;
      const grow = 0.5 + easeOut(t) * 0.8;
      [1, -1, 0].forEach((s, i) => {
        petalCurl(g, this.tint, x, y, angle + s * 0.4, 24 * scale * grow, 6 * scale * fade, s * 1.6, 0.8 * fade, i);
      });
      blossomFlower(g, this.tint, x, y, 6 * scale * (1 - t * 0.3), angle, 0.85 * fade);
    });
    this.motes(x, y, 4, { angle, spread: 0.7, speed: 120, size: 2.2, life: 300, depth });
  }

  /**
   * A ninja's dash: a dark afterimage streak that snaps shut almost at once, and the petals
   * it tore loose left hanging in the channel, drifting apart and falling.
   */
  slipstream(x1: number, y1: number, x2: number, y2: number, depth = 4): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const count = Phaser.Math.Clamp(Math.round(dist / 12), 4, 30);
    const seeds = Array.from({ length: count }, (_, i) => ({
      f: (i + Math.random() * 0.8) / count,
      side: Math.random() < 0.5 ? 1 : -1,
      off: 4 + Math.random() * 14,
      rot: angle + (Math.random() - 0.5) * 2.4,
      spin: (Math.random() - 0.5) * 5,
      len: 6 + Math.random() * 5,
      ph: Math.random() * TAU,
      col: STREAM_COLS[i % 3],
    }));
    this.anim(depth, 620, (g, t) => {
      // The afterimage — gone in the first third.
      if (t < 0.35) {
        const k = 1 - t / 0.35;
        g.fillStyle(this.tint(AIR.slate), 0.4 * k);
        slashLine(g, x1, y1, x2, y2, 11 * k);
        g.fillStyle(this.tint(AIR.white), 0.75 * k);
        slashLine(g, x1, y1, x2, y2, 2.4 * k);
      }
      for (const s of seeds) {
        // The channel closes from the back forward, like the parent's.
        const local = Math.max(0, 1 - t - s.f * 0.3);
        if (local <= 0) continue;
        const spread = s.off * (0.4 + easeOut(t) * 0.9);
        const px = x1 + (x2 - x1) * s.f + nx * s.side * spread + Math.sin(t * 5 + s.ph) * 3;
        const py = y1 + (y2 - y1) * s.f + ny * s.side * spread + t * t * 18;
        g.fillStyle(this.tint(s.col), 0.9 * local);
        sakuraPetal(g, px, py, s.rot + s.spin * t, s.len, 0.3 + 0.7 * Math.abs(Math.cos(t * 7 + s.ph)));
      }
    });
    this.motes(x1, y1, 8, { angle: angle + Math.PI, spread: 0.9, speed: 170, size: 2.8, life: 460, swirl: 1.6, depth });
    this.ring(x1, y1, 6, 52, AIR.mist, 380, 3, depth);
  }

  /**
   * The grapple as a kusarigama chain: links swinging slack and snapping taut, petals knotted
   * along it, and a kunai biting in at the far end.
   */
  hookLine(x1: number, y1: number, x2: number, y2: number, duration: number, depth = 7): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const px = -Math.sin(angle), py = Math.cos(angle);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const links = Phaser.Math.Clamp(Math.round(dist / 7), 6, 60);
    this.anim(depth, duration, (g, t) => {
      const slack = 1 - easeIn(t);
      const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      const at = (f: number) => {
        const off = Math.sin(Math.PI * f) * 10 * slack * Math.sin(f * 2.5 * TAU + t * 9);
        return { x: x1 + (x2 - x1) * f + px * off, y: y1 + (y2 - y1) * f + py * off };
      };
      g.lineStyle(1.2 * fade, this.tint(AIR.slate), 0.8 * fade);
      g.beginPath();
      for (let i = 0; i <= links; i++) {
        const p = at(i / links);
        if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
      }
      g.strokePath();
      for (let i = 0; i <= links; i++) {
        const p = at(i / links);
        g.lineStyle(1.3 * fade, this.tint(i % 2 ? AIR.steel : AIR.frost), 0.9 * fade);
        g.strokeCircle(p.x, p.y, i % 2 ? 1.8 : 2.4);
        if (i % 5 === 2) {
          g.fillStyle(this.tint(STREAM_COLS[i % 3]), 0.85 * fade);
          sakuraPetal(g, p.x, p.y, angle + Math.PI * 0.5 + Math.sin(t * 8 + i) * 0.8, 7, 0.8);
        }
      }
      // Kunai: a leaf blade, the wrapped grip behind it, and the ring at its pommel.
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const K = (u: number, v: number) => new Phaser.Geom.Point(x2 + ca * u - sa * v, y2 + sa * u + ca * v);
      g.fillStyle(this.tint(AIR.mist), fade);
      g.fillPoints([K(13, 0), K(3, 4), K(0, 0), K(3, -4)], true);
      g.fillStyle(this.tint(AIR.white), fade);
      g.fillPoints([K(13, 0), K(3, 1.2), K(3, -0.4)], true);
      g.lineStyle(3.2 * fade, this.tint(AIR.void), fade);
      g.lineBetween(K(0, 0).x, K(0, 0).y, K(-7, 0).x, K(-7, 0).y);
      g.lineStyle(1.2 * fade, this.tint(AIR.blue), fade);
      for (let u = -6; u <= -1; u += 2.5) g.lineBetween(K(u, -1.6).x, K(u, -1.6).y, K(u + 1.2, 1.6).x, K(u + 1.2, 1.6).y);
      g.lineStyle(1.4 * fade, this.tint(AIR.steel), fade);
      g.strokeCircle(K(-9.5, 0).x, K(-9.5, 0).y, 2.6);
    });
  }

  /** A column of petals blown straight up, scattering at the top. */
  updraft(x: number, y: number, radius: number, height: number, depth = 7): void {
    const jets = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.44,
      h: height * (0.7 + Math.random() * 0.4),
      w: radius * (0.34 + Math.random() * 0.2),
      curl: (i % 2 ? 1 : -1) * (0.8 + Math.random() * 0.9),
      phase: Math.random() * TAU,
      delay: i * 0.05,
    }));
    this.anim(depth, 760, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      g.fillStyle(this.tint(AIR.blue), 0.28 * fade);
      g.fillEllipse(x, y, radius * 1.6, radius * 0.7);
      jets.forEach((j, i) => {
        const rise = easeOut(Math.max(0, (t - j.delay) / (1 - j.delay)));
        petalCurl(
          g, this.tint, x + j.ox, y + radius * 0.2,
          -Math.PI / 2 + Math.sin(t * 6 + j.phase) * 0.12,
          j.h * rise, j.w * (1 - t * 0.3), j.curl * rise * 1.6, 0.85 * fade, i,
        );
      });
    });
    this.motes(x, y - height * 0.5, 9, {
      speed: radius * 1.2, spread: 0.9, angle: -Math.PI / 2,
      size: 3.2, life: 800, swirl: 1.8, depth,
    });
  }

  /** Wind Splice's near cut as a ninja's slash: a steel crescent shedding petals off its tail. */
  fanCut(x: number, y: number, angle: number, radius: number, half: number, depth = 7): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const shed = Array.from({ length: 7 }, (_, i) => ({
      f: (i + 0.5) / 7, spin: (Math.random() - 0.5) * 6, ph: Math.random() * TAU, col: STREAM_COLS[i % 3],
    }));
    this.anim(depth, 260, (g, t) => {
      const swept = easeOut(Math.min(1, t / 0.45));
      const fade = 1 - easeIn(t);
      const from = angle - dir * half;
      const to = from + dir * half * 2 * swept;
      // The trail: a broad pink crescent, then the thin white line of the edge itself.
      g.fillStyle(this.tint(AIR.sky), 0.5 * fade);
      slashArc(g, x, y, radius, from, to, radius * 0.26);
      g.fillStyle(this.tint(AIR.white), 0.92 * fade);
      slashArc(g, x, y, radius * 0.97, from, to, radius * 0.07);
      g.fillStyle(this.tint(AIR.white), fade);
      glint(g, x + Math.cos(to) * radius * 0.95, y + Math.sin(to) * radius * 0.95, 7 * fade);
      // Petals peeling off the cut behind the blade, drifting outward and down.
      for (const s of shed) {
        if (s.f > swept) continue;
        const a = from + (to - from) * s.f;
        const rr = radius * (0.8 + 0.25 * (1 - fade));
        g.fillStyle(this.tint(s.col), 0.9 * fade);
        sakuraPetal(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr + t * 8, a + dir + s.spin * t, 8,
          0.4 + 0.6 * Math.abs(Math.cos(t * 9 + s.ph)));
      }
    });
    this.motes(x + Math.cos(angle) * radius * 0.6, y + Math.sin(angle) * radius * 0.6, 6, {
      angle, spread: half, speed: 190, size: 2.6, life: 380, swirl: 1.6, depth: depth - 1,
    });
  }

  /** Spin Dance: two blades chasing each other round a full turn inside a whirl of petals. */
  spinFlourish(x: number, y: number, radius: number, depth = 6): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const whirl = Array.from({ length: 14 }, (_, i) => ({
      a: (i / 14) * TAU, r: 0.6 + Math.random() * 0.5, ph: Math.random() * TAU, col: STREAM_COLS[i % 3],
    }));
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - easeIn(t);
      const spun = easeOut(t) * TAU * 1.15;
      const rr = radius * (0.55 + 0.45 * easeOut(t));
      for (const lead of [0, Math.PI]) {
        const head = lead + dir * spun;
        const tail = head - dir * 1.7;
        g.fillStyle(this.tint(AIR.sky), 0.5 * fade);
        slashArc(g, x, y, rr, tail, head, rr * 0.3);
        g.fillStyle(this.tint(AIR.white), 0.9 * fade);
        slashArc(g, x, y, rr * 0.97, tail, head, rr * 0.08);
        g.fillStyle(this.tint(AIR.white), fade);
        glint(g, x + Math.cos(head) * rr, y + Math.sin(head) * rr, 6 * fade);
      }
      for (const w of whirl) {
        const a = w.a + dir * spun * 0.8;
        const r = radius * w.r * (0.5 + easeOut(t) * 0.7);
        g.fillStyle(this.tint(w.col), 0.85 * fade);
        sakuraPetal(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, a + dir * Math.PI * 0.5, 8,
          0.4 + 0.6 * Math.abs(Math.cos(t * 8 + w.ph)));
      }
    });
    this.ring(x, y, radius * 0.2, radius * 1.1, AIR.mist, 380, 4, depth);
    this.dustMark(x, y, radius * 0.8);
  }

  /** E+'s flip: the box she vaults through, its two long edges cut clean, petals over the arc. */
  flipCut(x: number, y: number, angle: number, halfLen: number, halfWid: number, depth = 7): void {
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    this.anim(depth, 380, (g, t) => {
      const fade = 1 - easeIn(t);
      const open = easeOut(Math.min(1, t / 0.4));
      const L = halfLen * open, W = halfWid * (0.5 + open * 0.5);
      g.fillStyle(this.tint(AIR.sky), 0.18 * fade);
      g.fillPoints([
        new Phaser.Geom.Point(x + ca * L + nx * W, y + sa * L + ny * W),
        new Phaser.Geom.Point(x + ca * L - nx * W, y + sa * L - ny * W),
        new Phaser.Geom.Point(x - ca * L - nx * W, y - sa * L - ny * W),
        new Phaser.Geom.Point(x - ca * L + nx * W, y - sa * L + ny * W),
      ], true);
      for (const s of [1, -1]) {
        const ex1 = x - ca * L + nx * s * W, ey1 = y - sa * L + ny * s * W;
        const ex2 = x + ca * L + nx * s * W, ey2 = y + sa * L + ny * s * W;
        g.fillStyle(this.tint(AIR.sky), 0.55 * fade);
        slashLine(g, ex1, ey1, ex2, ey2, 6 * fade);
        g.fillStyle(this.tint(AIR.white), 0.9 * fade);
        slashLine(g, ex1, ey1, ex2, ey2, 1.8 * fade);
        for (let i = 0; i < 5; i++) {
          const f = (i + 0.5) / 5;
          g.fillStyle(this.tint(STREAM_COLS[i % 3]), 0.85 * fade);
          sakuraPetal(g, ex1 + (ex2 - ex1) * f + nx * s * 5 * t, ey1 + (ey2 - ey1) * f + ny * s * 5 * t + t * 6,
            angle + s * (1 + i), 7, 0.5 + 0.5 * Math.abs(Math.cos(t * 7 + i)));
        }
      }
      // Her arc over the top, traced in petals.
      for (let i = 0; i <= 10; i++) {
        const f = i / 10;
        const px = x + ca * halfLen * (f * 2 - 1) * open;
        const py = y + sa * halfLen * (f * 2 - 1) * open - Math.sin(f * Math.PI) * 34;
        g.fillStyle(this.tint(i % 2 ? AIR.mist : AIR.blue), 0.8 * fade);
        sakuraPetal(g, px, py, angle + i * 0.9, 7, 0.8);
      }
    });
    this.motes(x, y, 8, { speed: 200, size: 2.8, life: 420, swirl: 2, depth: depth - 1 });
  }

  /** Winds of Change: whole blossoms and loose petals circling in as the reset lands. */
  petalBurst(x: number, y: number, radius: number, count = 14, depth = 7): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU + Math.random() * 0.5,
      spin: (Math.random() - 0.5) * 6,
      r: radius * (0.5 + Math.random() * 0.6),
      bloom: i % 4 === 0,
    }));
    this.anim(depth, 1100, (g, t) => {
      const fade = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
      for (const s of seeds) {
        const a = s.ang + t * 3.2;
        const rr = s.r * (0.3 + easeOut(t) * 0.9);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.75;
        if (s.bloom) {
          blossomFlower(g, this.tint, px, py, 6, s.spin * t, 0.9 * fade);
        } else {
          g.fillStyle(this.tint(AIR.blossom), 0.9 * fade);
          sakuraPetal(g, px, py, a + Math.PI * 0.5 + s.spin * t, 10, 0.4 + 0.6 * Math.abs(Math.cos(t * 6 + s.spin)));
        }
      }
    });
    this.ring(x, y, radius * 0.2, radius * 1.2, AIR.blossom, 620, 4, depth - 1);
  }

  // ── Caller-owned painters (same signatures as AirFx's) ──────────────────

  /**
   * Gale Glaive as a four-bladed fuma shuriken: hooked plum-steel blades with a bright leading
   * edge and a petal etched on each, a blossom on the hub, petals caught in its wake.
   * `phantom` paints the R+ afterimage in faded cherry wood.
   */
  static drawGlaive(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, radius: number, spin: number, alpha: number, phantom = false,
  ): void {
    const a = phantom ? alpha * 0.55 : alpha;
    const blade = phantom ? AIR.wood : AIR.slate;
    const edge = phantom ? AIR.frost : AIR.white;

    g.fillStyle(tint(AIR.sky), a * 0.14);
    g.fillCircle(x, y, radius * 1.05);
    g.lineStyle(1.6, tint(AIR.steel), a * 0.3);
    g.strokeCircle(x, y, radius * 1.05);

    for (let k = 0; k < 4; k++) {
      const ba = spin + (k / 4) * TAU;
      const lead: Phaser.Geom.Point[] = [];
      const trail: Phaser.Geom.Point[] = [];
      const S = 8;
      for (let i = 0; i <= S; i++) {
        const f = i / S;
        const la = ba + 0.45 * (1 - f) + 0.2 * f + 0.14 * Math.sin(Math.PI * f);
        const lr = radius * (0.22 + 0.8 * f);
        lead.push(new Phaser.Geom.Point(x + Math.cos(la) * lr, y + Math.sin(la) * lr));
        // The trailing edge hooks in — that concave back is what reads as a fuma blade.
        const ta = ba + 0.2 * f - 0.4 * (1 - f) + 0.16 * Math.sin(Math.PI * f);
        const tr = radius * (0.22 + 0.8 * f) * (1 - 0.18 * Math.sin(Math.PI * f));
        trail.push(new Phaser.Geom.Point(x + Math.cos(ta) * tr, y + Math.sin(ta) * tr));
      }
      trail.reverse();
      g.fillStyle(tint(blade), a * 0.95);
      g.fillPoints(lead.concat(trail), true);
      g.lineStyle(1.6, tint(edge), a * 0.9);
      g.strokePoints(lead, false);
      const ea = ba + 0.12;
      g.fillStyle(tint(AIR.blue), a * 0.9);
      sakuraPetal(g, x + Math.cos(ea) * radius * 0.36, y + Math.sin(ea) * radius * 0.36, ea, radius * 0.32, 0.9);
    }

    g.lineStyle(2, tint(AIR.storm), a);
    g.strokeCircle(x, y, radius * 0.26);
    blossomFlower(g, tint, x, y, radius * 0.24, -spin * 0.5, a);

    // Petals caught in the wake, lagging the spin.
    for (let i = 0; i < 6; i++) {
      const pa = spin * 0.55 + (i / 6) * TAU;
      g.fillStyle(tint(STREAM_COLS[i % 3]), a * 0.7);
      sakuraPetal(g, x + Math.cos(pa) * radius * 1.18, y + Math.sin(pa) * radius * 1.18, pa + Math.PI * 0.5, 7,
        0.4 + 0.6 * Math.abs(Math.cos(spin + i)));
    }
  }

  /** Wind Splice's far half: a flying crescent cut with a tail of petals streaming behind it. */
  static drawShear(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, angle: number, t: number, scale = 1, alpha = 1,
  ): void {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const nx = -sa, ny = ca;
    const SEG = 14;
    const front: Phaser.Geom.Point[] = [];
    const back: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= SEG; i++) {
      const f = i / SEG - 0.5;
      const w = 17 * scale * Math.cos(f * Math.PI);
      front.push(new Phaser.Geom.Point(x + nx * f * 34 * scale + ca * w * 0.55, y + ny * f * 34 * scale + sa * w * 0.55));
      back.push(new Phaser.Geom.Point(x + nx * f * 34 * scale + ca * w * 0.12, y + ny * f * 34 * scale + sa * w * 0.12));
    }
    // Petal tail first, so the blade sits over it.
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const back2 = (6 + i * 5) * scale;
      const off = side * (4 + i * 1.3) * scale + Math.sin(t * 10 + i * 1.3) * 3 * scale;
      g.fillStyle(tint(STREAM_COLS[i % 3]), alpha * (0.9 - i * 0.07));
      sakuraPetal(g, x - ca * back2 + nx * off, y - sa * back2 + ny * off, angle + Math.PI + side * 0.6 + Math.sin(t * 7 + i) * 0.8,
        (8 - i * 0.35) * scale, 0.35 + 0.65 * Math.abs(Math.cos(t * 9 + i)));
    }
    g.fillStyle(tint(AIR.sky), 0.55 * alpha);
    g.fillPoints(front.concat([...back].reverse()), true);
    g.lineStyle(2.4 * scale, tint(AIR.white), 0.95 * alpha);
    g.strokePoints(front, false);
    g.fillStyle(tint(AIR.white), alpha);
    glint(g, front[SEG / 2].x, front[SEG / 2].y, 6 * scale);
  }

  /** Wind Breaker as a tornado of cherry blossom: a faint pink funnel wrapped in petal streams. */
  static drawTornado(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    const TOP = -radius * 1.35;
    const BOTTOM = radius * 0.55;
    const BANDS = 12;
    const prof = (f: number) => radius * (1.05 - 0.82 * Math.pow(f, 0.8));
    const leanAt = (f: number) => Math.sin(t * 2.4 + f * 3.4) * radius * 0.16 * (1 - f);

    for (let i = 0; i < BANDS; i++) {
      const f = i / (BANDS - 1);
      const by = y + TOP + (BOTTOM - TOP) * f;
      const bw = prof(f);
      const shade = 0.22 + 0.5 * (1 - f);
      g.fillStyle(tint(f > 0.6 ? AIR.slate : AIR.storm), shade * 0.34 * alpha);
      g.fillEllipse(x + leanAt(f), by, bw * 2, bw * 0.5);
      g.lineStyle(1.6, tint(AIR.steel), 0.3 * alpha);
      g.strokeEllipse(x + leanAt(f), by, bw * 2, bw * 0.5);
    }

    const wraps = 10;
    for (let i = 0; i < wraps; i++) {
      const p = (t * 1.1 + i / wraps) % 1;
      const f = 1 - p;
      const a = t * 5 + i * 1.9;
      const by = y + TOP + (BOTTOM - TOP) * f;
      const bw = prof(f);
      const near = 0.5 + 0.5 * Math.sin(a);
      petalCurl(
        g, tint, x + leanAt(f) + Math.cos(a) * bw, by + Math.sin(a) * bw * 0.25,
        a + Math.PI * 0.5, bw * 0.85 * near + 8, 4 + near * 4, 1.9, alpha * 0.75 * near, i,
      );
    }

    // Loose petals climbing the funnel between the streams.
    for (let i = 0; i < 18; i++) {
      const p = (t * 0.8 + i / 18) % 1;
      const f = 1 - p;
      const a = t * 4 + i * 2.1;
      const bw = prof(f);
      const near = 0.5 + 0.5 * Math.sin(a);
      g.fillStyle(tint(STREAM_COLS[i % 3]), alpha * (0.35 + 0.55 * near) * Math.min(1, p * 5));
      sakuraPetal(g, x + leanAt(f) + Math.cos(a) * bw * 1.05, y + TOP + (BOTTOM - TOP) * f + Math.sin(a) * bw * 0.26,
        a + Math.PI * 0.5, 6 + near * 3, 0.3 + 0.7 * Math.abs(Math.cos(t * 6 + i)));
    }

    // Fallen blossoms whipped round the throat.
    for (let i = 0; i < 5; i++) {
      const a = t * 7 + (i / 5) * TAU;
      const r = radius * (0.18 + 0.14 * Math.sin(t * 3 + i));
      blossomFlower(g, tint, x + Math.cos(a) * r, y + BOTTOM + Math.sin(a) * r * 0.4, 5, a, alpha * 0.85);
    }
    g.fillStyle(tint(AIR.void), 0.45 * alpha);
    g.fillEllipse(x, y + BOTTOM * 0.6, radius * 0.4, radius * 0.16);
  }

  /** Weather Cycle: a ring of petal streams at the waist, rewinding on playback. */
  static drawWeatherRing(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, radius: number, t: number, progress: number, replay: boolean, alpha: number,
  ): void {
    const dir = replay ? -1 : 1;
    const curls = 9;
    for (let i = 0; i < curls; i++) {
      const a = dir * t * (replay ? 3.4 : 2.6) + (i / curls) * TAU;
      const wob = Math.sin(t * 4 + i * 1.7) * radius * 0.08;
      const r = radius + wob + (replay ? Math.sin(t * 6 + i) * 6 : 0);
      const near = 0.5 + 0.5 * Math.sin(a);
      petalCurl(
        g, tint, x + Math.cos(a) * r, y - 6 + Math.sin(a) * r * 0.55, a + dir * Math.PI * 0.5,
        22 + near * 10, 4 + near * 3, 1.6 * dir, alpha * (0.3 + 0.55 * near) * (replay ? 1.1 : 1), i,
      );
    }
    g.lineStyle(2, tint(replay ? AIR.mist : AIR.sky), 0.35 * alpha);
    g.strokeEllipse(x, y + 6, radius * 2.1, radius * 1.1);
    g.lineStyle(3, tint(replay ? AIR.white : AIR.cyan), 0.85 * alpha);
    g.beginPath();
    g.arc(x, y + 6, radius * 0.72, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(progress, 0.001, 1), false);
    g.strokePath();
    for (let i = 0; i < 6; i++) {
      const a = dir * t * 5 + i * 1.05;
      const rr = radius * (0.55 + 0.3 * Math.sin(t * 3 + i));
      blossomFlower(g, tint, x + Math.cos(a) * rr, y - 12 + Math.sin(a) * rr * 0.55 - Math.sin(t * 2 + i) * 6, 3.4, a, 0.7 * alpha);
    }
  }

  /** The Hawk perk's bird as a swallow cut from petals: petal wings, a forked petal tail. */
  static drawHawk(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const px = -sa, py = ca;
    const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 16), 1.8);
    for (const s of [1, -1]) {
      const wa = angle + s * (1.25 + (1 - beat) * 0.55);
      g.fillStyle(tint(AIR.steel), 0.75);
      sakuraPetal(g, x, y, wa, 25, 0.75);
      g.fillStyle(tint(AIR.sky), 0.9);
      sakuraPetal(g, x, y, wa - s * 0.12, 19, 0.65);
      g.fillStyle(tint(AIR.mist), 0.85);
      sakuraPetal(g, x, y, wa - s * 0.3, 11, 0.7);
      // The forked tail.
      g.fillStyle(tint(AIR.blue), 0.9);
      sakuraPetal(g, x - ca * 5, y - sa * 5, angle + Math.PI + s * 0.28, 15, 0.45);
    }
    g.fillStyle(tint(AIR.frost), 0.95);
    g.fillEllipse(x, y, 15, 7.5);
    g.fillStyle(tint(AIR.mist), 1);
    g.fillCircle(x + ca * 7, y + sa * 7, 4.2);
    g.fillStyle(tint(AIR.charge), 1);
    g.fillPoints([
      new Phaser.Geom.Point(x + ca * 13, y + sa * 13),
      new Phaser.Geom.Point(x + ca * 8 + px * 2.2, y + sa * 8 + py * 2.2),
      new Phaser.Geom.Point(x + ca * 8 - px * 2.2, y + sa * 8 - py * 2.2),
    ], true);
    g.fillStyle(tint(AIR.void), 1);
    g.fillCircle(x + ca * 8 + px * 2, y + sa * 8 + py * 2, 1.2);
    // Petals shed in its wake.
    for (let i = 0; i < 4; i++) {
      const back = 14 + i * 7;
      g.fillStyle(tint(STREAM_COLS[i % 3]), 0.7 - i * 0.14);
      sakuraPetal(g, x - ca * back + px * Math.sin(t * 9 + i * 2) * 5, y - sa * back + py * Math.sin(t * 9 + i * 2) * 5,
        angle + t * 4 + i, 6, 0.4 + 0.6 * Math.abs(Math.cos(t * 7 + i)));
    }
  }
}

// ── SakuraDraft ───────────────────────────────────────────────────────────

/**
 * AirDraft for a Sakura owner: the banked-dodge / momentum ring as petals circling the ninja.
 * Same constructor and API as AirDraft so the kit's `wire` needs no change; the parent's own
 * Graphics is simply never drawn into.
 */
export class SakuraDraft extends AirDraft {
  private readonly pg: Phaser.GameObjects.Graphics;
  private readonly pfx: SakuraFx;
  private pt = 0;
  private pAccum = 0;
  private pIntensity: number;
  private pColor: number;
  private readonly petals: { ang: number; r: number; speed: number; phase: number; col: number }[];

  constructor(
    scene: Phaser.Scene,
    private readonly ptint: AirColorFn,
    private readonly pRadius: number,
    intensity: number,
    depth = 3,
    count = 9,
    color: number = AIR.sky,
  ) {
    super(scene, ptint, pRadius, intensity, depth, count, color);
    this.pIntensity = intensity;
    this.pColor = color;
    this.pg = scene.add.graphics().setDepth(depth);
    this.pfx = new SakuraFx(scene, ptint);
    this.petals = Array.from({ length: count + 3 }, (_, i) => ({
      ang: (i / (count + 3)) * TAU,
      r: 0.45 + Math.random() * 0.3,
      speed: 3 + Math.random() * 4,
      phase: Math.random() * TAU,
      col: i % 3 === 0 ? color : STREAM_COLS[i % 3],
    }));
  }

  setIntensity(v: number): void { super.setIntensity(v); this.pIntensity = v; }
  setColor(c: number): void { super.setColor(c); this.pColor = c; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.pg.active) return;
    this.pt += delta / 1000;
    const g = this.pg;
    g.clear();
    if (alpha <= 0.02) return;
    const R = this.pRadius;
    const spin = this.pt * 2.1;
    g.fillStyle(this.ptint(AIR.storm), 0.12 * this.pIntensity * alpha);
    g.fillEllipse(x, y + 4, R * 2, R * 1.3);
    this.petals.forEach((p, i) => {
      const wob = Math.sin(this.pt * p.speed + p.phase);
      const a = p.ang + spin + wob * 0.1;
      const rr = R * (p.r + 0.4) * (0.9 + 0.1 * this.pIntensity);
      const len = (6 + 3 * this.pIntensity) * (0.8 + wob * 0.2);
      g.fillStyle(this.ptint(i % 3 === 0 ? this.pColor : p.col), 0.8 * alpha);
      sakuraPetal(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72, a + Math.PI * 0.5, len,
        0.35 + 0.65 * Math.abs(Math.cos(this.pt * 4 + p.phase)));
    });
    this.pAccum += delta;
    const interval = 280 / Math.max(0.4, this.pIntensity);
    if (this.pAccum >= interval) {
      this.pAccum = 0;
      this.pfx.motes(x + (Math.random() - 0.5) * R * 1.4, y + (Math.random() - 0.5) * R * 0.9,
        1, { speed: 34, size: 2.4, life: 640, swirl: 2, depth: 4 });
    }
  }

  destroy(): void {
    super.destroy();
    this.pg.destroy();
  }
}
