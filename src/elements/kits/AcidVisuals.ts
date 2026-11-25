import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';
import { ACID_CELL, AcidGrid, CellState } from './AcidGrid';

/**
 * Shared drawing kit for everything Acid renders: the dripping avatar (globule ball hands, a
 * crown of running ribbons, eyes), the corrosion auras, and the one-shot effects every acid
 * ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes acid
 * acid: the drop, the palette, and the effects built out of them.
 *
 * Colours must come from the ACID palette below. Acid has no skin yet, but every
 * call still routes through the owner's `acidColor` mapper, so the day one lands it is a table
 * edit in SkinsKit rather than a sweep through this file.
 *
 * (The element's id in code is still `slime`; it was remastered into Acid without renaming.)
 */

/** `(base) => displayed` — SkinsKit.acidColor bound to one owner. */
export type AcidColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const ACID = {
  /** Everything acid has already eaten through. */
  rot: 0x07140a,
  bog: 0x143d0a,
  moss: 0x2a6b1a,
  /** The live liquid. */
  sludge: 0x448822,
  lime: 0x66cc44,
  neon: 0x88ff33,
  caustic: 0xaaff44,
  glow: 0xccff88,
  white: 0xffffff,
  /** Pool states — a fresh pool is neon and bites; a spent one has gone dark. */
  hot: 0x33ff33,
  hotRim: 0x99ff66,
  cool: 0x225511,
  coolRim: 0x448822,
  /** Rattling Strike's un-burrow detonation is the one warm thing in the element. */
  sting: 0xff4444,
  bruise: 0x992222,
  /** The NPC's acid runs bilious yellow-green, so two acid fighters never blur together. */
  bile: 0xccdd22,
  bileDark: 0x556611,
} as const;

/** One coherent set of acid shades. `rind → body → live → hot → wet` runs dark to bright. */
export interface AcidTones {
  rind: number;
  body: number;
  live: number;
  hot: number;
  wet: number;
}

/** The player's acid: the element's own neon green. */
export const VILE_TONES: AcidTones = {
  rind: ACID.rot, body: ACID.moss, live: ACID.lime, hot: ACID.neon, wet: ACID.glow,
};
/** The NPC's runs bilious, so both sides' spray stays readable in a crossfire. */
export const NPC_TONES: AcidTones = {
  rind: 0x1a1a04, body: ACID.bileDark, live: 0x99aa22, hot: ACID.bile, wet: 0xeeff99,
};
/** Rattling Strike: the one effect in the element that runs warm. */
export const STING_TONES: AcidTones = {
  rind: 0x330606, body: ACID.bruise, live: 0xdd3333, hot: ACID.sting, wet: 0xffaaaa,
};

export const tonesFor = (owner: 'player' | 'npc'): AcidTones =>
  (owner === 'player' ? VILE_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

export interface Pt { x: number; y: number }

export interface DropOpts {
  /** How much the head bulges relative to `halfW`. Default 1.35. */
  head?: number;
  /** Bites taken out of the flanks. Acid is *corrosive*, so its own edge is eaten. Default 2. */
  bites?: number;
  /** Phase for the bite positions, so a drop's damage doesn't crawl frame to frame. */
  seed?: number;
}

/**
 * An acid drop: a fat, heavy head with a thin whipping tail behind it — and a flank that has
 * been eaten into.
 *
 * The bites are the point. Water's ribbon is smooth because water only pushes; acid dissolves
 * whatever it touches including its own surface tension, so every acid shape carries notches
 * chewed out of its edge. Without them this is a green water droplet, which is a different
 * element entirely.
 *
 * The head sits at `t = 1` (the end of the run), so a drop drawn along its velocity leads with
 * its heavy end, the way a falling drop actually does.
 */
export function acidDrop(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  opts: DropOpts = {},
): void {
  const head = opts.head ?? 1.35;
  const bites = opts.bites ?? 2;
  const seed = opts.seed ?? 0;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number, w: number): Pt => ({
    x: cx + cos * len * f + px * w,
    y: cy + sin * len * f + py * w,
  });

  // Half-width along the run: pinched at the tail, swelling into the head.
  const profile = (f: number): number => {
    const swell = Math.sin(Math.pow(f, 0.62) * Math.PI * 0.5);
    return halfW * (0.12 + swell * (head - 0.12));
  };

  const steps = 12;
  const side: Pt[] = [];
  const other: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    let w = profile(f);
    // Bites: shallow scallops chewed out of one flank, fixed by `seed` so they don't crawl.
    for (let b = 0; b < bites; b++) {
      const at0 = 0.28 + b * 0.3 + (seed % 1) * 0.14;
      const d = Math.abs(f - at0);
      if (d < 0.1) w *= 1 - 0.42 * (1 - d / 0.1);
    }
    side.push(at(f, w));
    other.push(at(f, -w * (1 - 0.18 * Math.sin(f * 5 + seed))));
  }

  g.beginPath();
  g.moveTo(side[0].x, side[0].y);
  for (let i = 1; i < side.length; i++) g.lineTo(side[i].x, side[i].y);
  for (let i = other.length - 1; i >= 0; i--) g.lineTo(other[i].x, other[i].y);
  g.closePath();
  g.fillPath();
}

export interface DropLayerOpts extends DropOpts {
  /** Wet bead of highlight on the head. Default true. */
  bead?: boolean;
}

/**
 * Layered drop: a dark rind, a body, a live inner run, a hot core down the spine, and a wet bead
 * on the head.
 *
 * The bead is what stops a stack of green shapes reading as a leaf. Acid is *wet*, so it always
 * carries one small, hard specular that sits slightly off the head's centre.
 */
export function acidDropLayered(
  g: Phaser.GameObjects.Graphics,
  tint: AcidColorFn, tones: AcidTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number,
  opts: DropLayerOpts = {},
): void {
  g.fillStyle(tint(tones.rind), alpha * 0.9);
  acidDrop(g, cx, cy, angle, len, halfW, opts);
  g.fillStyle(tint(tones.body), alpha * 0.95);
  acidDrop(g, cx, cy, angle, len * 0.96, halfW * 0.82, opts);
  g.fillStyle(tint(tones.live), alpha * 0.9);
  acidDrop(g, cx, cy, angle, len * 0.88, halfW * 0.55, opts);
  g.fillStyle(tint(tones.hot), alpha * 0.85);
  acidDrop(g, cx, cy, angle, len * 0.7, halfW * 0.26, { ...opts, bites: 0 });

  if (opts.bead !== false) {
    const hx = cx + Math.cos(angle) * len * 0.82;
    const hy = cy + Math.sin(angle) * len * 0.82;
    g.fillStyle(tint(tones.wet), alpha * 0.9);
    g.fillCircle(hx - Math.sin(angle) * halfW * 0.35, hy + Math.cos(angle) * halfW * 0.35, halfW * 0.3);
  }
}

/**
 * The creeping outline of a pool of acid: a closed loop of lobes that breathe in and out on
 * their own phases, so a puddle never stops eating outward at its edges.
 */
export function acidBlob(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, radius: number, t: number, seed: number, lobes = 9,
): void {
  g.beginPath();
  const steps = lobes * 3;
  for (let i = 0; i <= steps; i++) {
    const a = (i % steps) / steps * TAU;
    // Two beating harmonics: the pool bulges unevenly rather than pulsing as one circle.
    const r = radius * (
      1
      + 0.075 * Math.sin(a * lobes + t * 1.3 + seed)
      + 0.045 * Math.sin(a * (lobes - 4) - t * 0.9 + seed * 2)
    );
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fillPath();
}

export interface DropletOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Downward drift over the droplet's life. Acid is heavy — it falls. */
  fall?: number;
  tones?: AcidTones;
}

export interface SplashOpts {
  /** Droplets flung clear. Defaults to radius/5. */
  droplets?: number;
  /** Rising bubbles. Defaults to radius/16. */
  fizz?: number;
  /** Leave a pitted burn on the ground. Default true. */
  etch?: boolean;
  depth?: number;
  duration?: number;
  tones?: AcidTones;
}

// ── AcidFx ────────────────────────────────────────────────────────────────

/**
 * One-shot acid effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class AcidFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: AcidColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: AcidTones = VILE_TONES): void {
    this.flashIn(x, y, radius, tones.wet, tones.hot, depth);
  }

  /**
   * Expanding corrosion front: a rim that eats outward, drawn as a ragged loop whose lobes
   * churn as it grows. Acid fronts *dissolve* outward, so the edge is never a clean circle.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 5), 18, 80);
    const seed = Math.random() * TAU;
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 1 - t * t;
      const trace = (rr: number) => {
        g.beginPath();
        for (let i = 0; i <= segs; i++) {
          const a = (i % segs) / segs * TAU;
          const wob = rr * (1 + 0.05 * Math.sin(a * 7 + t * 9 + seed) + 0.03 * Math.sin(a * 3 - t * 6));
          const px = x + Math.cos(a) * wob, py = y + Math.sin(a) * wob;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.strokePath();
      };
      g.lineStyle(Math.max(0.5, width * 2.6 * (1 - t * 0.6)), c, 0.16 * fade);
      trace(r);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.55)), c, 0.72 * fade);
      trace(r);
      g.lineStyle(Math.max(0.4, width * 0.34), this.tint(ACID.glow), 0.7 * fade);
      trace(r * 0.94);
    });
  }

  /** Flung droplets: heavy heads leading, thin tails behind, sinking as they go. */
  droplets(x: number, y: number, count: number, opts: DropletOpts = {}): void {
    const tones = opts.tones ?? VILE_TONES;
    const speed = opts.speed ?? 170;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 4;
    const life = opts.life ?? 520;
    const fall = opts.fall ?? 60;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 1.05),
        r: size * (0.55 + Math.random() * 0.85),
        seed: Math.random() * 6,
        delay: Math.random() * 0.2,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * d;
        const ey = y + p.sin * d + fall * lt * lt;
        // Velocity includes the growing downward pull, so a droplet visibly noses over.
        const vy = p.sin * p.v * (1 - lt) + fall * 2 * lt;
        const heading = Math.atan2(vy, p.cos * p.v * (1 - lt) + 0.001);
        const fade = 1 - lt * lt;
        acidDropLayered(
          g, this.tint, tones,
          ex - Math.cos(heading) * p.r * 2.4, ey - Math.sin(heading) * p.r * 2.4,
          heading, p.r * 3.6 * fade, p.r * fade, 0.92 * fade,
          { seed: p.seed, bites: 1 },
        );
      }
    });
  }

  /**
   * A pitted burn left on the floor: an irregular stain with holes eaten clean through it, so
   * the ground under an acid fight visibly wears down. This is acid's ground mark — it doesn't
   * scorch like fire or litter like crystal, it *pits*.
   */
  etch(x: number, y: number, radius: number, depth = 1, tones: AcidTones = VILE_TONES): void {
    const seed = Math.random() * TAU;
    const holes = Array.from({ length: 7 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.7;
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.75, r: radius * (0.07 + Math.random() * 0.13) };
    });
    this.anim(depth, 2600, (g, t) => {
      const a = t < 0.05 ? t / 0.05 : 1 - (t - 0.05) / 0.95;
      g.fillStyle(this.tint(tones.rind), 0.5 * a);
      acidBlob(g, x, y, radius, t * 2, seed, 8);
      g.fillStyle(this.tint(tones.body), 0.3 * a);
      acidBlob(g, x, y, radius * 0.72, t * 2 + 1, seed * 1.7, 7);
      // Pits: bright rims around holes eaten clean through, dimming as the burn cools.
      for (const h of holes) {
        g.fillStyle(this.tint(ACID.rot), 0.75 * a);
        g.fillCircle(h.x, h.y, h.r);
        g.lineStyle(1.2, this.tint(tones.hot), 0.8 * a * Math.max(0, 1 - t * 2.2));
        g.strokeCircle(h.x, h.y, h.r);
      }
    });
  }

  /** Bubbles boiling up out of acid and popping. */
  fizz(x: number, y: number, count: number, radius: number, depth = 4, tones: AcidTones = VILE_TONES): void {
    const bubbles = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.5,
      oy: (Math.random() - 0.5) * radius * 0.9,
      r: 1.6 + Math.random() * 3.2,
      rise: 16 + Math.random() * 26,
      delay: Math.random() * 0.35,
      sway: (Math.random() - 0.5) * 14,
    }));
    this.anim(depth, 1100, (g, t) => {
      for (const b of bubbles) {
        const lt = (t - b.delay) / (1 - b.delay);
        if (lt <= 0) continue;
        const cx = x + b.ox + Math.sin(lt * 6) * b.sway;
        const cy = y + b.oy - b.rise * lt;
        // Bubbles swell as they rise, then burst into a ring in their last beat.
        if (lt > 0.82) {
          const pop = (lt - 0.82) / 0.18;
          g.lineStyle(1.4 * (1 - pop), this.tint(tones.hot), 0.8 * (1 - pop));
          g.strokeCircle(cx, cy, b.r * (1 + pop * 2.2));
          continue;
        }
        const grow = b.r * (0.6 + lt * 0.7);
        g.fillStyle(this.tint(tones.live), 0.5);
        g.fillCircle(cx, cy, grow);
        g.lineStyle(1, this.tint(tones.hot), 0.85);
        g.strokeCircle(cx, cy, grow);
        g.fillStyle(this.tint(tones.wet), 0.9);
        g.fillCircle(cx - grow * 0.32, cy - grow * 0.32, grow * 0.24);
      }
    });
  }

  /**
   * The body of a splash: lobes of acid thrown out of the impact that stretch, sag and run back
   * down. Reads as liquid hitting a surface rather than as a disc being scaled.
   */
  splat(x: number, y: number, radius: number, duration: number, depth = 6, tones: AcidTones = VILE_TONES): void {
    const arms = Array.from({ length: 11 }, (_, i) => ({
      ang: (i / 11) * TAU + Math.random() * 0.35,
      len: 0.55 + Math.random() * 0.6,
      w: 0.16 + (i % 3) * 0.05,
      seed: Math.random() * 6,
      delay: (i % 4) * 0.045,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      const core = easeOut(Math.min(1, t * 3.4));
      g.fillStyle(this.tint(tones.body), 0.8 * fade);
      acidBlob(g, x, y, radius * 0.42 * core, t * 3, 1.1, 8);
      g.fillStyle(this.tint(tones.live), 0.85 * fade);
      acidBlob(g, x, y, radius * 0.26 * core, t * 3 + 2, 2.3, 7);

      for (const a of arms) {
        const lt = Math.max(0, (t - a.delay) / (1 - a.delay));
        const reach = radius * a.len * easeOut(Math.min(1, lt * 2.1));
        if (reach < 3) continue;
        // Arms sag as they run out — gravity acting on a thrown ribbon of liquid.
        const droop = a.ang + easeIn(lt) * 0.35;
        acidDropLayered(
          g, this.tint, tones, x, y, droop,
          reach, radius * a.w * (1 - lt * 0.35), 0.92 * fade,
          { seed: a.seed, head: 1.1 },
        );
      }
      if (t < 0.4) {
        g.fillStyle(this.tint(tones.wet), (1 - t / 0.4) * 0.85);
        g.fillCircle(x, y, radius * 0.15);
      }
    });
  }

  /** White core + splat lobes + two corrosion fronts + flung droplets + fizz + a pitted burn. */
  splash(x: number, y: number, radius: number, opts: SplashOpts = {}): void {
    const tones = opts.tones ?? VILE_TONES;
    const drops = opts.droplets ?? Math.max(6, Math.round(radius / 5));
    const bubbles = opts.fizz ?? Math.max(2, Math.round(radius / 16));
    const dur = opts.duration ?? Math.round(320 + radius * 1.3);
    const depth = opts.depth ?? 6;

    if (opts.etch !== false) this.etch(x, y, radius * 0.6, 1, tones);
    this.splat(x, y, radius * 0.85, dur, depth, tones);
    this.flash(x, y, radius * 0.28, depth + 2, tones);
    this.ring(x, y, radius * 0.2, radius * 1.05, tones.hot, Math.round(dur * 0.72), 4.5, depth);
    this.scene.time.delayedCall(80, () =>
      this.ring(x, y, radius * 0.15, radius * 1.3, tones.live, dur, 3, depth));
    this.droplets(x, y, drops, {
      speed: radius * 2.2, size: 3.4 + radius / 50,
      life: Math.round(dur * 1.35), fall: radius * 0.8, depth, tones,
    });
    this.fizz(x, y, bubbles, radius * 0.8, depth - 2, tones);
  }

  /** Recoil spray at the throwing hand — a mouthful of acid leaving a body. */
  muzzleSpray(x: number, y: number, angle: number, scale = 1, depth = 7, tones: AcidTones = VILE_TONES): void {
    this.anim(depth, 150, (g, t) => {
      const fade = 1 - t;
      for (const s of [-1, -0.4, 0.4, 1]) {
        const a = angle + s * 0.42;
        acidDropLayered(
          g, this.tint, tones, x, y, a,
          22 * scale * (0.45 + t * 1.1) * (1 - Math.abs(s) * 0.28),
          4.2 * scale * fade, 0.85 * fade,
          { seed: s + 3, bites: 1 },
        );
      }
      g.fillStyle(this.tint(tones.wet), 0.85 * fade);
      g.fillCircle(x, y, 4 * scale * (1 - t * 0.4));
    });
  }

  /**
   * The Burrow bite: a snake's head lunging out along `angle` with its jaws gaping, then snapping
   * shut at `reach`. Two hooked fangs lead each jaw and drip on the close; the bigger the stage,
   * the wider the gape and the longer the head. Drawn as one short animation over the caster.
   */
  bite(x: number, y: number, angle: number, reach: number, stage: number, depth = 8, tones: AcidTones = VILE_TONES): void {
    const seed = Math.random() * 6;
    const gape = 0.5 + stage * 0.12;
    this.anim(depth, 260, (g, t) => {
      // Lunge out over the first 60%, snap shut at 60–75%, hang and fade after.
      const out = easeOut(Math.min(1, t / 0.6));
      const shut = t < 0.6 ? 0 : easeIn(Math.min(1, (t - 0.6) / 0.15));
      const fade = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      const hx = x + Math.cos(angle) * reach * out;
      const hy = y + Math.sin(angle) * reach * out;
      const open = gape * (1 - shut);
      const len = 16 + stage * 5;
      const nx = Math.cos(angle + Math.PI / 2), ny = Math.sin(angle + Math.PI / 2);

      // The neck: a tapering acid ribbon back to the caster, so the head reads as attached.
      acidDropLayered(g, this.tint, tones, x, y, angle, reach * out, 5 + stage, 0.8 * fade, { seed, bites: 1, head: 1 });

      for (const side of [-1, 1]) {
        const ja = angle + side * open;
        const jx = hx + Math.cos(ja) * len;
        const jy = hy + Math.sin(ja) * len;
        // Jaw plate: a wedge from the hinge to the tip, scaled dark-to-bright.
        g.fillStyle(this.tint(tones.rind), 0.95 * fade);
        g.fillTriangle(hx - nx * side * 2, hy - ny * side * 2, hx + nx * side * 8, hy + ny * side * 8, jx, jy);
        g.fillStyle(this.tint(tones.body), 0.95 * fade);
        g.fillTriangle(hx, hy, hx + nx * side * 6, hy + ny * side * 6, jx, jy);
        g.lineStyle(1.6, this.tint(tones.hot), 0.85 * fade);
        g.lineBetween(hx + nx * side * 6, hy + ny * side * 6, jx, jy);
        // The fang: hooked inward off the jaw tip, white at the point.
        const fa = ja - side * 1.9;
        const fx = jx + Math.cos(fa) * (6 + stage * 1.5);
        const fy = jy + Math.sin(fa) * (6 + stage * 1.5);
        g.lineStyle(3, this.tint(ACID.glow), fade);
        g.lineBetween(jx, jy, fx, fy);
        g.fillStyle(this.tint(ACID.white), fade);
        g.fillCircle(fx, fy, 1.4);
        // Venom beading off the fang once the jaws are shut.
        if (shut > 0.5) {
          const drip = (t - 0.68) * 40;
          g.fillStyle(this.tint(tones.hot), 0.9 * fade);
          g.fillCircle(fx, fy + drip, 2);
        }
      }
      // Eyes on the head, slitted, so the thing biting is plainly a snake.
      g.fillStyle(this.tint(tones.hot), fade);
      g.fillCircle(hx - Math.cos(angle) * 6 + nx * 5, hy - Math.sin(angle) * 6 + ny * 5, 2.6);
      g.fillCircle(hx - Math.cos(angle) * 6 - nx * 5, hy - Math.sin(angle) * 6 - ny * 5, 2.6);
      g.fillStyle(0x0a0602, fade);
      g.fillEllipse(hx - Math.cos(angle) * 6 + nx * 5, hy - Math.sin(angle) * 6 + ny * 5, 1, 3.4);
      g.fillEllipse(hx - Math.cos(angle) * 6 - nx * 5, hy - Math.sin(angle) * 6 - ny * 5, 1, 3.4);
    });
  }

  /** Two puncture wounds left on a bitten body, weeping venom for a moment. */
  punctures(x: number, y: number, angle: number, depth = 9, tones: AcidTones = VILE_TONES): void {
    const nx = Math.cos(angle + Math.PI / 2), ny = Math.sin(angle + Math.PI / 2);
    this.anim(depth, 700, (g, t) => {
      const fade = 1 - t;
      for (const side of [-1, 1]) {
        const px = x + nx * side * 6, py = y + ny * side * 6;
        g.fillStyle(this.tint(tones.rind), 0.9 * fade);
        g.fillCircle(px, py, 2.6);
        g.fillStyle(this.tint(tones.hot), 0.9 * fade);
        g.fillEllipse(px, py + 2 + t * 10, 2, 3 + t * 6);
      }
    });
  }

  /**
   * A single drop falling from height and breaking where it lands. Used for acid rain, so each
   * drop is a real event rather than a line sliding down the screen.
   */
  rainDrop(x: number, groundY: number, height: number, depth = 6, tones: AcidTones = VILE_TONES): void {
    const seed = Math.random() * 6;
    this.anim(depth, 340, (g, t) => {
      if (t >= 0.72) {
        // Landed: a small crown of splash-back kicking up off the surface.
        const lt = (t - 0.72) / 0.28;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.42;
          acidDropLayered(
            g, this.tint, tones,
            x, groundY, a, 12 * easeOut(lt), 2.2 * (1 - lt), 0.85 * (1 - lt),
            { seed: seed + i, bites: 0 },
          );
        }
        g.lineStyle(1.6 * (1 - lt), this.tint(tones.hot), 0.7 * (1 - lt));
        g.strokeEllipse(x, groundY, 22 * lt, 8 * lt);
        return;
      }
      const f = easeIn(t / 0.72);
      const y = groundY - height * (1 - f);
      // Stretches as it accelerates, the way a falling drop actually does.
      acidDropLayered(g, this.tint, tones, x, y - 14 - f * 8, Math.PI / 2,
        14 + f * 10, 3, 0.9, { seed, bites: 1 });
    });
  }

  /**
   * Inward-gathering corrosion: acid running in from the rim toward a swelling core while a
   * ragged containment rim closes on it. `follow` lets it track a caster who can still move.
   */
  gather(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, tones: AcidTones = VILE_TONES,
  ): void {
    const runs = Array.from({ length: 10 }, (_, i) => ({
      ang: (i / 10) * TAU,
      spin: 0.5 + (i % 3) * 0.3,
      phase: i / 10,
      seed: i * 1.7,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;

      for (const r of runs) {
        const lt = (t * (1 + r.phase) + r.phase) % 1;
        const rad = radius * (1 - easeIn(lt));
        const a = r.ang + t * r.spin * TAU;
        if (rad < 3) continue;
        acidDropLayered(
          g, this.tint, tones,
          cx + Math.cos(a) * radius, cy + Math.sin(a) * radius,
          a + Math.PI, radius - rad, 3.4 * (1 - lt * 0.5), 0.8 * (1 - lt * 0.4),
          { seed: r.seed, bites: 1 },
        );
      }

      const core = radius * (0.1 + easeIn(t) * 0.3);
      g.fillStyle(this.tint(tones.body), 0.75);
      acidBlob(g, cx, cy, core * 1.5, t * 4, 0.6, 8);
      g.fillStyle(this.tint(tones.hot), 0.85);
      acidBlob(g, cx, cy, core, t * 4 + 1, 1.9, 7);
      g.fillStyle(this.tint(tones.wet), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, core * 0.35);
    });
  }

  /**
   * A pool of acid on the ground: a creeping blob with a bright rim while it is still fresh,
   * gone dark and quiet once it has spent its first bite. Painted into a caller-owned Graphics
   * because the kit already owns every pool's position, radius and state.
   */
  static drawPool(
    g: Phaser.GameObjects.Graphics, tint: AcidColorFn,
    x: number, y: number, radius: number, t: number, seed: number, hot: boolean, alpha = 1,
  ): void {
    const body = hot ? ACID.hot : ACID.cool;
    const rim = hot ? ACID.hotRim : ACID.coolRim;

    g.fillStyle(tint(ACID.rot), 0.35 * alpha);
    acidBlob(g, x, y + 2, radius * 1.02, t * 0.7, seed, 9);
    g.fillStyle(tint(body), 0.55 * alpha);
    acidBlob(g, x, y, radius, t * 0.7, seed, 9);
    g.fillStyle(tint(hot ? ACID.neon : ACID.moss), 0.4 * alpha);
    acidBlob(g, x, y, radius * 0.66, t * 0.9 + 1.6, seed * 1.7, 7);

    // Rim: the edge that is actively eating outward.
    g.lineStyle(hot ? 2.4 : 1.6, tint(rim), (hot ? 0.95 : 0.7) * alpha);
    g.beginPath();
    const segs = 27;
    for (let i = 0; i <= segs; i++) {
      const a = (i % segs) / segs * TAU;
      const r = radius * (1 + 0.075 * Math.sin(a * 9 + t * 1.3 + seed) + 0.045 * Math.sin(a * 5 - t * 0.9 + seed * 2));
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();

    // Bubbles working the surface — how you tell a live pool from a painted circle.
    const count = Math.max(2, Math.round(radius / 14));
    for (let i = 0; i < count; i++) {
      const p = (t * (hot ? 0.9 : 0.4) + i / count) % 1;
      const a = seed + i * 2.4;
      const bx = x + Math.cos(a) * radius * 0.6;
      const by = y + Math.sin(a) * radius * 0.45;
      const br = (hot ? 3.2 : 2) * Math.sin(p * Math.PI);
      if (br <= 0.3) continue;
      g.fillStyle(tint(hot ? ACID.caustic : ACID.sludge), 0.7 * alpha);
      g.fillCircle(bx, by, br);
      g.fillStyle(tint(ACID.glow), 0.7 * alpha);
      g.fillCircle(bx - br * 0.3, by - br * 0.3, br * 0.3);
    }
  }

  /**
   * Electrolysis (perk): the discharge between two pools. Built as three passes over one
   * deterministic jag — a wide caustic halo, the green body, then a near-white core — so the
   * bolt reads as something with heat in the middle rather than a drawn polyline. The jag is
   * re-derived from `t` every frame, which is what makes it crackle instead of sit still.
   */
  static drawElectroArc(
    g: Phaser.GameObjects.Graphics, tint: AcidColorFn,
    x1: number, y1: number, x2: number, y2: number,
    t: number, seed: number, surge: boolean, alpha: number,
  ): void {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    // Perpendicular, for the sideways kick at each joint.
    const px = -uy, py = ux;
    const segs = Math.max(6, Math.round(len / 26));
    const swing = (surge ? 16 : 10);

    // One jag, sampled once and reused by all three passes so they stay registered.
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      // Pinned at both ends — the current is leaving one pool and arriving at the other.
      const taper = Math.sin(f * Math.PI);
      const n = Math.sin(f * 11 + t * 27 + seed) * 0.6 + Math.sin(f * 23 - t * 41 + seed * 2.3) * 0.4;
      const off = n * swing * taper;
      pts.push({ x: x1 + ux * len * f + px * off, y: y1 + uy * len * f + py * off });
    }

    const trace = (width: number, color: number, a: number) => {
      g.lineStyle(width, tint(color), a * alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokePath();
    };
    trace(surge ? 11 : 7, ACID.moss, 0.28);
    trace(surge ? 6 : 4, surge ? ACID.caustic : ACID.neon, 0.75);
    trace(surge ? 2.6 : 1.6, ACID.glow, 0.95);

    // Forks: short dead-end branches off the joints, which is most of what sells a bolt.
    const forks = surge ? 5 : 3;
    for (let i = 0; i < forks; i++) {
      const idx = 1 + Math.floor(((Math.sin(seed * 3.1 + i * 2.7 + Math.floor(t * 30) * 0.37) + 1) / 2) * (segs - 2));
      const from = pts[Math.min(idx, pts.length - 2)];
      const ang = Math.atan2(uy, ux) + (i % 2 === 0 ? 1 : -1) * (0.7 + (i * 0.21) % 0.6);
      const fl = (surge ? 26 : 17) * (0.55 + ((i * 0.37) % 0.45));
      const mid = { x: from.x + Math.cos(ang) * fl * 0.55, y: from.y + Math.sin(ang) * fl * 0.55 };
      g.lineStyle(surge ? 2.4 : 1.5, tint(ACID.caustic), 0.6 * alpha);
      g.beginPath();
      g.moveTo(from.x, from.y);
      g.lineTo(mid.x + px * fl * 0.18, mid.y + py * fl * 0.18);
      g.lineTo(from.x + Math.cos(ang) * fl, from.y + Math.sin(ang) * fl);
      g.strokePath();
    }

    // Both terminals boil where the current is being torn out of the liquid.
    for (const e of [{ x: x1, y: y1 }, { x: x2, y: y2 }]) {
      g.fillStyle(tint(ACID.glow), 0.5 * alpha);
      g.fillCircle(e.x, e.y, surge ? 9 : 6);
      g.fillStyle(tint(ACID.white), 0.75 * alpha);
      g.fillCircle(e.x, e.y, surge ? 4 : 2.6);
    }
  }

  /**
   * A melt puddle: a pool dyed with the melting victim's own element colour, with the buffs it
   * carries glinting on its surface. Reads as "something of theirs is lying here", which is
   * exactly what it is.
   */
  static drawMeltPuddle(
    g: Phaser.GameObjects.Graphics, tint: AcidColorFn,
    x: number, y: number, radius: number, color: number, t: number, seed: number, buffs: number,
  ): void {
    g.fillStyle(tint(ACID.rot), 0.3);
    acidBlob(g, x, y + 2, radius * 1.05, t * 0.8, seed, 8);
    g.fillStyle(tint(color), 0.62);
    acidBlob(g, x, y, radius, t * 0.8, seed, 8);
    g.fillStyle(tint(color), 0.85);
    acidBlob(g, x, y, radius * 0.55, t + 1.4, seed * 1.6, 6);
    g.lineStyle(2, tint(color), 0.95);
    g.strokeCircle(x, y, radius * 0.94);
    // One mote per banked buff, orbiting the puddle — the pickup's value at a glance.
    for (let i = 0; i < buffs; i++) {
      const a = t * 1.6 + (i / Math.max(1, buffs)) * TAU;
      g.fillStyle(tint(ACID.glow), 0.9);
      g.fillCircle(x + Math.cos(a) * radius * 0.7, y + Math.sin(a) * radius * 0.5, 2.6);
    }
  }
}

// ── AcidAura ──────────────────────────────────────────────────────────────

export type AcidAuraStyle =
  | 'burrow'     // Burrow: submerged under a churning mound of acid
  | 'breakdown'  // Mastery bindable: the body coming apart and leaking
  | 'melt'       // Meltdown: a victim visibly dissolving
  | 'purge';     // Purged: stripped bare, with the stolen buffs boiling off

/**
 * A persistent field riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The four styles differ in *shape*: burrow sinks and churns, breakdown sprays outward, melt
 * runs downward off the body, purge boils upward off it. Two can be up at once, so they have to
 * stay distinguishable at a glance.
 */
export class AcidAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;

  constructor(
    scene: Phaser.Scene,
    private tint: AcidColorFn,
    private style: AcidAuraStyle,
    private tones: AcidTones,
    private radius: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = this.intensity;
    const r = this.radius;

    switch (this.style) {
      case 'burrow': {
        // A mound of acid closed over the top of the fighter, churning where they moved through.
        g.fillStyle(this.tint(ACID.rot), 0.55 * alpha);
        acidBlob(g, x, y + 4, r * 1.15, this.t * 1.4, 0.7, 9);
        g.fillStyle(this.tint(this.tones.body), 0.8 * alpha);
        acidBlob(g, x, y + 2, r * 0.95, this.t * 1.6, 2.1, 8);
        g.fillStyle(this.tint(this.tones.live), 0.55 * alpha);
        acidBlob(g, x, y, r * 0.6, this.t * 2 + 1, 3.4, 7);
        // Wake bubbles, faster than a resting pool's — something is moving under there.
        for (let i = 0; i < 6; i++) {
          const p = (this.t * 1.6 + i / 6) % 1;
          const a = i * 2.2;
          const br = 3.4 * Math.sin(p * Math.PI);
          if (br <= 0.3) continue;
          g.fillStyle(this.tint(this.tones.hot), 0.85 * alpha);
          g.fillCircle(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.4, br);
        }
        break;
      }
      case 'breakdown': {
        // Coming apart: the body leaks in every direction at once.
        g.fillStyle(this.tint(this.tones.body), 0.22 * alpha * k);
        acidBlob(g, x, y, r * 1.25, this.t * 3, 1.4, 10);
        for (let i = 0; i < 9; i++) {
          const a = this.t * 2.6 + (i / 9) * TAU;
          const p = (this.t * 2 + i / 9) % 1;
          acidDropLayered(
            g, this.tint, this.tones,
            x, y, a, r * (0.5 + p * 0.9), 4.4 * (1 - p * 0.6), 0.85 * alpha * (1 - p * 0.5),
            { seed: i, bites: 1 },
          );
        }
        g.fillStyle(this.tint(this.tones.wet), (0.4 + 0.3 * Math.sin(this.t * 14)) * alpha);
        g.fillCircle(x, y, r * 0.24);
        break;
      }
      case 'melt': {
        // Runs *downward* off the body and pools at the feet — the shape of something losing mass.
        for (let i = 0; i < 6; i++) {
          const p = (this.t * 1.1 + i / 6) % 1;
          const ox = Math.sin(i * 2.3) * r * 0.65;
          acidDropLayered(
            g, this.tint, this.tones,
            x + ox, y - r * 0.3 + p * r * 1.4, Math.PI / 2,
            9 * (1 - p * 0.4), 3 * (1 - p * 0.5), 0.85 * alpha * (1 - p * 0.4),
            { seed: i, bites: 1 },
          );
        }
        g.fillStyle(this.tint(this.tones.body), 0.4 * alpha);
        acidBlob(g, x, y + r * 0.85, r * 0.7, this.t * 1.2, 2.6, 8);
        break;
      }
      case 'purge': {
        // Boils *upward* off the body — the stripped buffs leaving.
        g.lineStyle(2, this.tint(this.tones.hot), (0.35 + 0.25 * Math.sin(this.t * 6)) * alpha);
        g.strokeCircle(x, y, r * (0.95 + 0.05 * Math.sin(this.t * 5)));
        for (let i = 0; i < 7; i++) {
          const p = (this.t * 1.5 + i / 7) % 1;
          const a = (i / 7) * TAU + this.t * 0.6;
          g.fillStyle(this.tint(this.tones.live), (1 - p) * 0.8 * alpha);
          g.fillCircle(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.5 - p * r * 1.2, 2.6 * (1 - p * 0.5));
        }
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── AcidAvatar ────────────────────────────────────────────────────────────

/** Concentric discs of one globule ball hand, outermost first. */
const ACID_AVATAR: AvatarSpec = {
  hands: [
    { r: 10.5, color: ACID.moss, alpha: 0.3 },
    { r: 6.8, color: ACID.sludge, alpha: 0.92 },
    { r: 3.8, color: ACID.neon, alpha: 1 },
    { r: 1.5, color: ACID.glow, alpha: 1, ox: -2.2, oy: -2.2 },
  ],
  eyeWhite: ACID.caustic,
  eyePupil: ACID.rot,
  // A hand made of liquid smears more than any other element's and barely springs back.
  squash: { div: 10, x: 0.7, y: 0.4 },
};

/**
 * The acid character rig: two globule ball hands that sling as they move, a pair of eyes, and a
 * crest of ribbons running off the crown and dripping. Hands, eyes and gestures come from
 * BaseAvatar; what acid adds is the pool underfoot and the running above. The orb is pitted
 * with corrosion and slow bubbles, with a drip running down one cheek; bubbles rise off the
 * hands. Mastery adds a turning caustic hazard sigil behind the crest, a bubbling ring round
 * the pool, five ribbons, orbiting globules and wide caustic-rimmed hand halos.
 */
export class AcidAvatar extends BaseAvatar {
  private fx: AcidFx;
  private tones: AcidTones;
  /** Drip timers for the crest ribbons — each one lets go on its own schedule. */
  private dripAt = 0;
  /** The syringe gun: how full the barrel is (0–1), what is loaded, and the reload stab (0 = not reloading). */
  private syringeFill = 1;
  private syringeColor: number | null = null;
  private stab = 0;

  /** The kit reports the gun every frame: barrel fill, the loaded poison's colour (null = plain venom), reload progress 0–1 (0 when not reloading). */
  setSyringe(fill: number, color: number | null, stab: number): void {
    this.syringeFill = fill;
    this.syringeColor = color;
    this.stab = stab;
  }

  constructor(scene: Phaser.Scene, tint: AcidColorFn, tones: AcidTones = VILE_TONES, depth = 6) {
    super(scene, tint, depth, ACID_AVATAR);
    this.fx = new AcidFx(scene, tint);
    this.tones = tones;
    if (tones !== VILE_TONES) {
      this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(tones.body), 0.92));
      this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(tones.hot), 1));
      this.setEyeWhite(tones.hot);
    }
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character, so a mastered acid user is
   * identifiable before they cast anything: bleached-bright eyes, a much wider corrosion halo
   * and a hard caustic rim on each hand, five running ribbons instead of three, and globules
   * orbiting the head. Shape changes, not just brighter tints.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? ACID.white : (this.tones === VILE_TONES ? ACID.caustic : this.tones.hot));
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14.5 : 10.5);
      halo.setFillStyle(this.tint(on ? this.tones.live : ACID.moss), on ? 0.34 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, this.tint(ACID.caustic), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands sling acid. */
  protected emitTrail(x: number, y: number): void {
    this.fx.droplets(x, y, 2, { speed: 26, size: 2.6, life: 460, fall: 46, depth: 5, tones: this.tones });
  }

  /** Burrowed: hands pulled down under the surface, working low. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    // Reloading: the gun hand swings out wide, then drives the needle into the body and draws.
    if (hold === 'gun' && side > 0 && this.stab > 0) {
      const p = this.stab;
      const out = p < 0.25 ? easeOut(p / 0.25) : p < 0.4 ? 1 - easeIn((p - 0.25) / 0.15) * 0.75 : 0.25;
      return { ang: this.facing + 1.35, dist: 14 + out * 26, scale: idle.scale };
    }
    if (hold !== 'brace') return null;
    const churn = Math.sin(this.t * 6 + side * 1.4);
    return {
      ang: this.facing + side * 1.5 + churn * 0.2,
      dist: 13 + churn * 3,
      scale: idle.scale * 0.8,
    };
  }

  /** A pool of the caster's own acid, always eating outward under their feet. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(this.tones.rind), a * 0.3 * k);
    acidBlob(g, x, y + 7, 27 * k, this.t * 0.8, 0.9, 9);
    g.fillStyle(this.tint(this.tones.body), a * 0.32 * k);
    acidBlob(g, x, y + 6, 21 * k, this.t * 0.9 + 1.3, 2.2, 8);
    g.fillStyle(this.tint(this.tones.live), a * 0.22 * k);
    acidBlob(g, x, y + 6, 13 * k, this.t * 1.2 + 2.6, 3.5, 7);
    // Surface bubbles, so the pool is visibly live rather than a shadow.
    for (let i = 0; i < 3; i++) {
      const p = (this.t * 0.9 + i / 3) % 1;
      const ang = i * 2.4 + this.t * 0.4;
      const br = 2.6 * Math.sin(p * Math.PI);
      if (br <= 0.2) continue;
      g.fillStyle(this.tint(this.tones.hot), a * 0.8);
      g.fillCircle(x + Math.cos(ang) * 15 * k, y + 6 + Math.sin(ang) * 7 * k, br);
    }
    if (this.mastered) {
      // A ring of boiling bubbles round the pool's edge — the pool itself is now caustic.
      g.lineStyle(1.8, this.tint(this.tones.hot), a * 0.55);
      g.strokeEllipse(x, y + 8, 64, 22);
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * TAU + this.t * 0.5;
        const p = (this.t * 1.4 + i * 0.37) % 1;
        const br = 1 + 2.4 * Math.sin(p * Math.PI);
        g.fillStyle(this.tint(i % 2 ? this.tones.hot : this.tones.wet), a * 0.9);
        g.fillCircle(x + Math.cos(ang) * 32, y + 8 + Math.sin(ang) * 11 - p * 3, br);
      }
    }
  }

  /**
   * Corrosion on the orb: a few dark pits with lit rims, bubbles rising through the lower half,
   * and a drip running down the side of the face. Mastered, the pits glow from inside.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    const m = this.mastered;
    const pits: [number, number, number][] = [[-10, 8, 2.4], [8, 11, 1.9], [12, 2, 1.5], [-4, 14, 1.4], [-13, -1, 1.3]];
    for (const [px, py, r] of pits) {
      g.fillStyle(this.tint(this.tones.rind), 0.65 * alpha);
      g.fillCircle(x + px, y + py, r);
      g.fillStyle(this.tint(m ? this.tones.hot : this.tones.live), (m ? 0.85 : 0.5) * alpha);
      g.fillCircle(x + px + r * 0.15, y + py + r * 0.2, r * 0.45);
    }
    // Bubbles rising through the liquid body.
    for (let i = 0; i < 4; i++) {
      const p = (this.t * 0.45 + i * 0.27) % 1;
      const bx = x + Math.sin(i * 2.3 + this.t) * 8;
      const by = y + 16 - p * 18;
      const r = 0.8 + p * 1.4;
      g.lineStyle(0.8, this.tint(this.tones.wet), (1 - p) * 0.7 * alpha);
      g.strokeCircle(bx, by, r);
    }
    // A drip running down the cheek.
    const run = (this.t * 0.6) % 1;
    g.fillStyle(this.tint(this.tones.live), 0.85 * alpha);
    g.fillRect(x + 14.2, y - 6, 1.6, 6 + run * 6);
    g.fillCircle(x + 15, y + run * 6, 1.6 + run * 0.6);
    g.fillStyle(this.tint(this.tones.wet), 0.7 * alpha);
    g.fillCircle(x + 14.6, y - 0.4 + run * 6, 0.6);
    this.drawPlagueMask(g, x, y, alpha);
  }

  /**
   * The plague doctor's mask, strapped over the same dripping orb: a stitched leather face plate
   * the eyes look out through (they are drawn over this layer, so they read as the lenses, each
   * in a brass rim), and a long bone beak that swings round with the aim. Mastered, the beak is
   * capped in gold and fumes from the tip.
   */
  private drawPlagueMask(g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    const m = this.mastered;
    const leather = 0x241a12, seam = 0x5a4630, bone = 0xe2d9c0, boneShade = 0xa89c7e, brass = m ? 0xffd75a : 0xc9a24a;
    const fx = Math.cos(this.facing), fy = Math.sin(this.facing);
    // The face rides with the eyes (BaseAvatar's own placement), so the lenses always frame them.
    const cx = x + fx * 2.4;
    const cy = y - 4 + fy * 2 + Math.sin(this.t * 2.6) * 1.1;
    // Straps round the orb, then the face plate.
    g.lineStyle(2.4, leather, 0.9 * alpha);
    g.beginPath();
    g.arc(x, y - 1, 17.5, Math.PI * 1.05, Math.PI * 1.95, false);
    g.strokePath();
    g.fillStyle(leather, 0.97 * alpha);
    g.fillEllipse(cx, cy + 1, 31, 17);
    g.lineStyle(1, seam, 0.9 * alpha);
    g.strokeEllipse(cx, cy + 1, 31, 17);
    // Brass lens rims round the eyes.
    for (const side of [-1, 1]) {
      g.fillStyle(0x0a0d08, 0.9 * alpha);
      g.fillCircle(cx + side * 7.2, cy, 5.6);
      g.lineStyle(1.8, brass, alpha);
      g.strokeCircle(cx + side * 7.2, cy, 5.8);
    }
    // The beak: a long bone cone from under the lenses, swinging with the aim and always drooping.
    const px = 1, py = 0;
    const bx = cx, by = cy + 5.5;
    const tx = bx + fx * 25, ty = by + 15 + fy * 8;
    const w = 6.6;
    g.fillStyle(boneShade, alpha);
    g.beginPath();
    g.moveTo(bx + px * w, by + py * w * 0.7);
    g.lineTo(tx, ty + 1.6);
    g.lineTo(bx - px * w, by - py * w * 0.7);
    g.closePath();
    g.fillPath();
    g.fillStyle(bone, alpha);
    g.beginPath();
    g.moveTo(bx + px * w * 0.35, by - 0.6);
    g.lineTo(tx, ty);
    g.lineTo(bx - px * w, by - 0.6);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, leather, 0.85 * alpha);
    g.beginPath();
    g.moveTo(bx + px * w, by + py * w * 0.7);
    g.lineTo(tx, ty + 1.6);
    g.lineTo(bx - px * w, by - py * w * 0.7);
    g.strokePath();
    // Stitches along the ridge, a breathing slit, and the brass collar where beak meets plate.
    for (let i = 1; i <= 4; i++) {
      const k = i / 5.5;
      const sx = bx + (tx - bx) * k, sy = by + (ty - by) * k;
      g.lineStyle(1, seam, 0.9 * alpha);
      g.lineBetween(sx - px * 1.8, sy - py * 1.8 - 0.6, sx + px * 1.8, sy + py * 1.8 - 0.6);
    }
    g.lineStyle(1.2, 0x0a0d08, 0.8 * alpha);
    g.lineBetween(bx + (tx - bx) * 0.3 + px * 2.6, by + (ty - by) * 0.3 + py * 2.2 + 1.5, bx + (tx - bx) * 0.55 + px * 1.6, by + (ty - by) * 0.55 + py * 1.4 + 1.5);
    g.lineStyle(2.2, brass, alpha);
    g.lineBetween(bx + px * w, by + py * w * 0.7, bx - px * w, by - py * w * 0.7);
    if (m) {
      // Gilded tip, and green fume leaking out of it.
      g.fillStyle(brass, alpha);
      const bl = Math.hypot(tx - bx, ty - by) || 1;
      const ux = (tx - bx) / bl, uy = (ty - by) / bl;
      g.fillTriangle(tx, ty + 1.2, tx - ux * 9 - uy * 2.6, ty - uy * 9 + ux * 2.6, tx - ux * 9 + uy * 2.6, ty - uy * 9 - ux * 2.6);
    }
    for (let i = 0; i < (m ? 3 : 1); i++) {
      const p = (this.t * 0.7 + i / 3) % 1;
      g.fillStyle(this.tint(this.tones.hot), (1 - p) * (m ? 0.55 : 0.3) * alpha);
      g.fillCircle(tx + fx * 2 + Math.sin(this.t * 3 + i * 2) * 2.5, ty - p * 11, 1.4 + p * 2.6);
    }
  }

  /**
   * The crest: ribbons of acid running up off the crown and hanging over, each with a bead
   * swelling at its tip until it lets go. Rooted at y - 18 so they never cover the face, and
   * drawn over the sprite so the lit runs show rather than only the dark roots clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 18;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.3 : 1;

    // Mastery regalia, behind the crest: a caustic hazard sigil turning slowly — three lobes
    // round a ring, glowing hot.
    if (this.mastered) {
      // Above the over-head health bar (y-39..y-31), which would otherwise cover it.
      const sx = x, sy = rootY - 36;
      const spin = this.t * 0.7;
      g.fillStyle(this.tint(this.tones.live), a * 0.25);
      g.fillCircle(sx, sy, 15);
      for (let i = 0; i < 3; i++) {
        const ang = spin + (i / 3) * TAU - Math.PI / 2;
        const lx = sx + Math.cos(ang) * 7, ly = sy + Math.sin(ang) * 7;
        g.lineStyle(3.2, this.tint(this.tones.rind), alpha * 0.85);
        g.beginPath();
        g.arc(lx, ly, 5.6, ang + 0.9, ang + TAU - 0.9, false);
        g.strokePath();
        g.lineStyle(1.8, this.tint(this.tones.hot), alpha);
        g.beginPath();
        g.arc(lx, ly, 5.6, ang + 0.9, ang + TAU - 0.9, false);
        g.strokePath();
      }
      g.lineStyle(2.2, this.tint(ACID.white), alpha * 0.9);
      g.strokeCircle(sx, sy, 4);
      g.fillStyle(this.tint(this.tones.hot), alpha);
      g.fillCircle(sx, sy, 1.6);
    }

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      // Ribbons sway on their own phase — liquid never holds a pose.
      const sway = Math.sin(this.t * 2.1 + i * 1.3) * 0.28;
      const lean = -Math.PI / 2 + side * 0.5 + sway;
      const height = 20 * this.intensity * scale * (1 - Math.abs(side) * 0.18);
      const bx = x + side * 7;
      acidDropLayered(
        g, this.tint, this.tones, bx, rootY, lean, height, 4.6 * scale, a * 0.95,
        { seed: i * 1.6, head: 1.5 },
      );
      // A bead swelling at the tip, on its own cycle, until it drops.
      const swell = (this.t * 0.8 + i / count) % 1;
      const tx = bx + Math.cos(lean) * height;
      const ty = rootY + Math.sin(lean) * height + swell * 5;
      g.fillStyle(this.tint(this.tones.hot), alpha * 0.9 * (1 - swell * 0.5));
      g.fillCircle(tx, ty, (1.6 + swell * 2.6) * scale);
      g.fillStyle(this.tint(this.tones.wet), alpha * 0.9 * (1 - swell * 0.5));
      g.fillCircle(tx - 0.8, ty - 0.8, (0.6 + swell) * scale);
    }

    // The syringe gun in the right hand: levelled along the aim, or turned on its owner to refill.
    {
      const hx = this.armX[1], hy = this.armY[1];
      const stabbing = this.stab > 0;
      const ang = stabbing ? Math.atan2(y - hy, x - hx) : this.facing;
      const liquid = this.syringeColor ?? this.tint(this.mastered ? ACID.caustic : this.tones.hot);
      drawSyringe(g, this.tint, hx, hy, ang, this.syringeFill, liquid, alpha, this.mastered, this.t);
    }

    // Bubbles fizzing up off each hand.
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < 2; k++) {
        const p = (this.t * 1.3 + k * 0.5 + i * 0.25) % 1;
        const bx = this.armX[i] + Math.sin(this.t * 4 + k * 3 + i) * 3;
        const by = this.armY[i] - 6 - p * 10;
        g.lineStyle(0.9, this.tint(this.mastered ? ACID.white : this.tones.wet), (1 - p) * 0.8 * alpha);
        g.strokeCircle(bx, by, 0.9 + p * 1.3);
      }
    }

    // Mastery orbit: globules circling the head on a shallow ellipse, each with its own bead.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.5 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 25;
        const cy = y - 31 + Math.sin(p) * 7;
        g.fillStyle(this.tint(this.tones.body), alpha * 0.9);
        acidBlob(g, cx, cy, 5.4, this.t * 3 + i, i * 2, 6);
        g.fillStyle(this.tint(this.tones.hot), alpha * 0.9);
        g.fillCircle(cx, cy, 2.4);
        g.fillStyle(this.tint(this.tones.wet), alpha * 0.9);
        g.fillCircle(cx - 1, cy - 1, 1);
      }
    }
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    super.update(delta, x, y, alpha);
    // The crest actually sheds: a drop lets go off the head every so often and falls away.
    this.dripAt -= delta;
    if (this.dripAt <= 0) {
      this.dripAt = (this.mastered ? 260 : 520) + Math.random() * 700;
      if (alpha > 0.02) {
        this.fx.droplets(x + (Math.random() - 0.5) * 16, y - 24, 1, {
          speed: 8, angle: Math.PI / 2, spread: 0.3, size: 2.6,
          life: 620, fall: 44, depth: 5, tones: this.tones,
        });
      }
    }
  }
}

// ── Venom: the floor and the gauge ────────────────────────────────

/** Small deterministic hash per cell, so a cell's wobble and sheen never crawl between repaints. */
function cellHash(i: number, k = 0): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * The acid floor, painted from the grid. Repainted only when the grid's `version` moves, so it
 * is cheap however much of the arena is covered. Interior cells merge into runs of rectangles —
 * one per contiguous strip — and only the rim cells are rounded off with blobs, which is what
 * gives the floor an eaten, liquid edge instead of a staircase.
 */
export function drawAcidFloor(
  g: Phaser.GameObjects.Graphics, tint: AcidColorFn, grid: AcidGrid, tones: AcidTones,
): void {
  g.clear();
  if (grid.count === 0) return;
  const S = ACID_CELL;
  const { cols, rows, cells, x0, y0 } = grid;

  // Rim shadow: the dark etched lip the acid has eaten into the floor around itself.
  g.fillStyle(tint(tones.rind), 0.85);
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 0 || !grid.isEdge(i)) continue;
    g.fillCircle(grid.centerX(i) + (cellHash(i) - 0.5) * 3, grid.centerY(i) + 2 + (cellHash(i, 1) - 0.5) * 3, S * 0.86);
  }

  // Body: interior strips as rects, rim cells as blobs. Spent acid first, fresh over it.
  for (const state of [CellState.Cool, CellState.Hot, CellState.Red] as const) {
    // Red acid is a Melting bomb's: untinted, so it reads as a warning whatever the skin.
    g.fillStyle(state === CellState.Red ? 0xd42a1c : tint(state === CellState.Hot ? tones.live : tones.body), 1);
    for (let r = 0; r < rows; r++) {
      let run = -1;
      for (let c = 0; c <= cols; c++) {
        const i = r * cols + c;
        const solid = c < cols && cells[i] === state && !grid.isEdge(i);
        if (solid && run < 0) run = c;
        if (!solid && run >= 0) {
          g.fillRect(x0 + run * S - 0.5, y0 + r * S - 0.5, (c - run) * S + 1, S + 1);
          run = -1;
        }
      }
    }
    for (let i = 0; i < cells.length; i++) {
      // A red patch is usually cut out of the middle of a pool, so every red cell is a blob —
      // otherwise it would have the grid's square outline.
      if (cells[i] !== state || (state !== CellState.Red && !grid.isEdge(i))) continue;
      g.fillCircle(grid.centerX(i) + (cellHash(i, 2) - 0.5) * 3, grid.centerY(i) + (cellHash(i, 3) - 0.5) * 3, S * (state === CellState.Red ? 0.82 : 0.74));
    }
  }

  // Sheen and pitting, scattered by hash: a few lit flecks on fresh acid, dark pits on spent.
  for (let i = 0; i < cells.length; i++) {
    const st = cells[i];
    if (st === 0) continue;
    const h = cellHash(i, 4);
    if (h > 0.22) continue;
    const px = grid.centerX(i) + (cellHash(i, 5) - 0.5) * S * 0.6;
    const py = grid.centerY(i) + (cellHash(i, 6) - 0.5) * S * 0.6;
    if (st === CellState.Red) {
      g.fillStyle(0xff6a3d, 0.8);
      g.fillCircle(px, py, 2.4 + h * 9);
      g.fillStyle(0xffd0a0, 0.7);
      g.fillCircle(px - 1, py - 1, 0.9 + h * 3);
    } else if (st === CellState.Hot) {
      g.fillStyle(tint(tones.hot), 0.7);
      g.fillCircle(px, py, 2 + h * 8);
      g.fillStyle(tint(tones.wet), 0.6);
      g.fillCircle(px - 1, py - 1, 0.8 + h * 3);
    } else {
      g.fillStyle(tint(tones.rind), 0.45);
      g.fillCircle(px, py, 1.4 + h * 7);
    }
  }
}

/**
 * The live surface over the floor: bubbles swelling and popping on a rotating handful of acid
 * cells. Called every frame on its own Graphics, so the static floor never has to be repainted
 * for the acid to look alive.
 */
export function drawAcidBubbles(
  g: Phaser.GameObjects.Graphics, tint: AcidColorFn, spots: { x: number; y: number; born: number; hot: boolean }[],
  now: number, tones: AcidTones,
): void {
  for (const b of spots) {
    const p = Phaser.Math.Clamp((now - b.born) / 900, 0, 1);
    const r = (b.hot ? 3.6 : 2.6) * Math.sin(p * Math.PI);
    if (r <= 0.3) continue;
    g.fillStyle(tint(b.hot ? tones.hot : tones.live), 0.8);
    g.fillCircle(b.x, b.y, r);
    g.fillStyle(tint(tones.wet), 0.7);
    g.fillCircle(b.x - r * 0.3, b.y - r * 0.3, r * 0.3);
  }
}


/** Toxin quarters (the cap is 100) — the mark on a poisoned body gains drips at each. */
export const TOXIN_TIERS = [25, 50, 75, 100];

/**
 * The toxin tell on a poisoned body: a ring of drips round the feet, one more drip per tier
 * reached, running faster and brighter as it climbs. Drawn on the kit's overlay every frame.
 */
export function drawToxinMark(
  g: Phaser.GameObjects.Graphics, tint: AcidColorFn, x: number, y: number, stacks: number, t: number,
  tones: AcidTones, alpha = 1,
): void {
  let tier = 0;
  for (const th of TOXIN_TIERS) if (stacks >= th) tier++;
  const k = Math.min(1, stacks / 25);
  if (k <= 0 || alpha <= 0.02) return;
  g.lineStyle(1.6, tint(tones.live), (0.25 + 0.15 * tier) * alpha * k);
  g.strokeEllipse(x, y + 14, 34, 12);
  const drips = 2 + tier * 2;
  for (let i = 0; i < drips; i++) {
    const p = (t * (0.6 + tier * 0.25) + i / drips) % 1;
    const a = (i / drips) * TAU;
    const dx = x + Math.cos(a) * 14;
    const dy = y + Math.sin(a) * 6 - 8 + p * 22;
    g.fillStyle(tint(tier >= 4 ? ACID.white : tones.hot), (1 - p) * 0.85 * alpha * k);
    g.fillEllipse(dx, dy, 2.4, 3.6);
  }
}

/**
 * The acidification gauge across the top of the screen: a glass tube filling with acid, ticks at
 * the four Shed Skin milestones (lit once passed), and red lines at the coverage where Acid
 * Reflux's bomb grows. Screen-space; the kit owns the Graphics.
 */
export function drawAcidBar(
  g: Phaser.GameObjects.Graphics, tint: AcidColorFn, x: number, y: number, w: number, h: number,
  coverage: number, t: number, tones: AcidTones, milestones: number[], reached: number,
  marks: number[] = [],
): void {
  const k = Phaser.Math.Clamp(coverage, 0, 1);
  // The tube.
  g.fillStyle(0x0b0f0a, 0.85);
  g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
  g.lineStyle(1.5, tint(tones.body), 0.9);
  g.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
  // The acid in it, with a wobbling meniscus at the front.
  if (k > 0.002) {
    const fw = Math.max(h, w * k);
    g.fillStyle(tint(tones.body), 1);
    g.fillRoundedRect(x, y, fw, h, h / 2);
    g.fillStyle(tint(tones.live), 1);
    g.fillRoundedRect(x, y, fw, h * 0.55, { tl: h / 2, tr: h / 2, bl: 0, br: 0 });
    g.fillStyle(tint(tones.hot), 0.9);
    g.fillCircle(x + fw - h / 2 + Math.sin(t * 6) * 1.2, y + h / 2, h * 0.42);
    // Bubbles climbing inside the fill.
    for (let i = 0; i < 5; i++) {
      const bx = x + ((t * 22 + i * 47) % Math.max(1, fw - 4)) + 2;
      g.fillStyle(tint(tones.wet), 0.55);
      g.fillCircle(bx, y + h * (0.3 + 0.4 * ((i * 0.37) % 1)), 1.2);
    }
  }
  // Red lines: where Acid Reflux's bomb grows a size.
  for (const mk of marks) {
    const hx = x + w * mk;
    g.lineStyle(2, tint(ACID.sting), k >= mk ? 1 : 0.55);
    g.lineBetween(hx, y - 5, hx, y + h + 5);
  }
  // Shed Skin milestones: diamonds, lit once passed.
  milestones.forEach((m, i) => {
    const mx = x + w * m;
    const lit = i < reached;
    g.fillStyle(lit ? tint(tones.hot) : 0x2a2f28, 1);
    g.fillTriangle(mx, y - 7, mx - 4, y - 2, mx + 4, y - 2);
    g.fillTriangle(mx, y + 3, mx - 4, y - 2, mx + 4, y - 2);
    g.lineStyle(1, tint(lit ? tones.wet : tones.body), 1);
    g.strokeTriangle(mx, y - 7, mx - 4, y - 2, mx + 4, y - 2);
  });
}

// ── Venom rework: the syringe gun, the four poisons, the bomb ─────────────

/** The four poisons Pick Your Poison offers, in wheel order. `angle` is where the vial sits round the caster. */
export const POISONS = [
  { id: 'rot', name: 'DISINTEGRATING', color: 0xff5533, dark: 0x5a160a, angle: -Math.PI / 2 },
  { id: 'para', name: 'PARALYZING', color: 0xffdd33, dark: 0x5c4a08, angle: 0 },
  { id: 'purge', name: 'PURGING', color: 0xe8f4ff, dark: 0x4a5a6e, angle: Math.PI / 2 },
  { id: 'melt', name: 'MELTING', color: 0xcc55ff, dark: 0x431260, angle: Math.PI },
] as const;
export type PoisonKind = 0 | 1 | 2 | 3;

/** A filled quad in a rotated local frame: `a` runs along the angle, `p` across it. */
function localQuad(
  g: Phaser.GameObjects.Graphics, ox: number, oy: number, ca: number, sa: number,
  a0: number, p0: number, a1: number, p1: number, a2: number, p2: number, a3: number, p3: number,
): void {
  g.beginPath();
  g.moveTo(ox + ca * a0 - sa * p0, oy + sa * a0 + ca * p0);
  g.lineTo(ox + ca * a1 - sa * p1, oy + sa * a1 + ca * p1);
  g.lineTo(ox + ca * a2 - sa * p2, oy + sa * a2 + ca * p2);
  g.lineTo(ox + ca * a3 - sa * p3, oy + sa * a3 + ca * p3);
  g.closePath();
  g.fillPath();
}

/**
 * The syringe gun: a pistol grip under a brass-banded glass barrel, a plunger that rides in as
 * the barrel empties, and a long needle with a bead swelling at its tip. `fill` is 0–1; the
 * liquid is whatever is loaded.
 */
export function drawSyringe(
  g: Phaser.GameObjects.Graphics, tint: AcidColorFn, hx: number, hy: number, ang: number,
  fill: number, liquid: number, alpha: number, gilded: boolean, t: number,
): void {
  if (alpha <= 0.02) return;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const brass = gilded ? 0xffd75a : 0xc9a24a;
  const k = Phaser.Math.Clamp(fill, 0, 1);
  const at = (a: number, p: number): [number, number] => [hx + ca * a - sa * p, hy + sa * a + ca * p];
  // Grip, under the barrel.
  g.fillStyle(0x2c2016, alpha);
  localQuad(g, hx, hy, ca, sa, 1, 3, 7, 3, 5, 11, -1, 10);
  // Plunger: rod and thumb plate, further out the fuller the barrel.
  const rod = -3 - 9 * k;
  g.lineStyle(1.8, 0x8a8f94, alpha);
  g.lineBetween(...at(rod, 0), ...at(2, 0));
  g.lineStyle(2.6, brass, alpha);
  g.lineBetween(...at(rod, -4), ...at(rod, 4));
  // Barrel: glass with the load inside it.
  g.fillStyle(0x0c120c, 0.75 * alpha);
  localQuad(g, hx, hy, ca, sa, 2, -4.6, 25, -4.6, 25, 4.6, 2, 4.6);
  if (k > 0.02) {
    g.fillStyle(liquid, 0.95 * alpha);
    localQuad(g, hx, hy, ca, sa, 24 - 20 * k, -3.4, 24, -3.4, 24, 3.4, 24 - 20 * k, 3.4);
    // A bubble riding the meniscus.
    const [bx, by] = at(24 - 20 * k + 2.4 + Math.sin(t * 5) * 0.8, -1);
    g.fillStyle(ACID.white, 0.7 * alpha);
    g.fillCircle(bx, by, 1);
  }
  g.fillStyle(ACID.white, 0.22 * alpha);
  localQuad(g, hx, hy, ca, sa, 3, -4, 24, -4, 24, -2.2, 3, -2.2);
  // Brass bands and graduations.
  g.lineStyle(2, brass, alpha);
  g.lineBetween(...at(2, -5.2), ...at(2, 5.2));
  g.lineBetween(...at(25, -5.2), ...at(25, 5.2));
  g.lineStyle(1, 0xdfe8e0, 0.6 * alpha);
  for (const a of [8, 13, 18]) g.lineBetween(...at(a, 1.4), ...at(a, 4.2));
  // Hub and needle.
  g.fillStyle(brass, alpha);
  localQuad(g, hx, hy, ca, sa, 25, -3, 29, -1.2, 29, 1.2, 25, 3);
  g.lineStyle(1.5, 0xe6ecef, alpha);
  g.lineBetween(...at(29, 0), ...at(40, 0));
  if (k > 0.02) {
    const swell = (t * 1.2) % 1;
    const [dx, dy] = at(40.5, 0);
    g.fillStyle(liquid, (1 - swell * 0.4) * alpha);
    g.fillCircle(dx, dy + swell * 2.5, 0.9 + swell * 1.3);
  }
  void tint;
}

/** One poison vial: stoppered glass, the poison sloshing inside, and its own mark on the label. */
export function drawPoisonVial(
  g: Phaser.GameObjects.Graphics, x: number, y: number, kind: PoisonKind, scale: number, t: number, alpha: number,
): void {
  const p = POISONS[kind];
  const w = 13 * scale, h = 20 * scale;
  g.fillStyle(0x05080a, 0.35 * alpha);
  g.fillEllipse(x, y + h * 0.62, w * 1.5, 5 * scale);
  // Glass.
  g.fillStyle(0x0e1414, 0.9 * alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4 * scale);
  // The poison, with a slosh line.
  const level = 0.68 + Math.sin(t * 3 + kind * 1.7) * 0.05;
  const top = y + h / 2 - h * level;
  g.fillStyle(p.dark, alpha);
  g.fillRoundedRect(x - w / 2 + 1.4 * scale, top, w - 2.8 * scale, y + h / 2 - top - 1.2 * scale, 3 * scale);
  g.fillStyle(p.color, alpha);
  g.fillRoundedRect(x - w / 2 + 1.4 * scale, top, w - 2.8 * scale, (y + h / 2 - top) * 0.6, 3 * scale);
  for (let i = 0; i < 2; i++) {
    const bp = (t * 0.9 + i * 0.5 + kind * 0.2) % 1;
    g.fillStyle(ACID.white, (1 - bp) * 0.7 * alpha);
    g.fillCircle(x + (i ? 2.5 : -2.5) * scale, y + h / 2 - 3 * scale - bp * h * 0.5, (0.8 + bp * 0.8) * scale);
  }
  g.lineStyle(1.3 * scale, 0xbfe0d0, 0.8 * alpha);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4 * scale);
  // Neck and cork.
  g.fillStyle(0x0e1414, 0.9 * alpha);
  g.fillRect(x - 3.2 * scale, y - h / 2 - 4 * scale, 6.4 * scale, 5 * scale);
  g.lineStyle(1.2 * scale, 0xbfe0d0, 0.8 * alpha);
  g.strokeRect(x - 3.2 * scale, y - h / 2 - 4 * scale, 6.4 * scale, 5 * scale);
  g.fillStyle(0x9a6b3c, alpha);
  g.fillRoundedRect(x - 3.8 * scale, y - h / 2 - 8 * scale, 7.6 * scale, 5 * scale, 1.5 * scale);
  // The mark: cracks, a bolt, a cross, a drop.
  g.lineStyle(1.5 * scale, 0x0a0a0a, 0.9 * alpha);
  const my = y + 2 * scale;
  if (kind === 0) {
    g.lineBetween(x - 3 * scale, my - 3 * scale, x, my);
    g.lineBetween(x, my, x - 1.5 * scale, my + 3.5 * scale);
    g.lineBetween(x, my, x + 3 * scale, my + 1.5 * scale);
  } else if (kind === 1) {
    g.beginPath();
    g.moveTo(x + 1.5 * scale, my - 4 * scale);
    g.lineTo(x - 2 * scale, my + 0.5 * scale);
    g.lineTo(x + 1.5 * scale, my + 0.5 * scale);
    g.lineTo(x - 1.5 * scale, my + 4.5 * scale);
    g.strokePath();
  } else if (kind === 2) {
    g.lineBetween(x - 3 * scale, my - 3 * scale, x + 3 * scale, my + 3 * scale);
    g.lineBetween(x + 3 * scale, my - 3 * scale, x - 3 * scale, my + 3 * scale);
  } else {
    g.fillStyle(0x0a0a0a, 0.9 * alpha);
    g.fillCircle(x, my + 1.5 * scale, 2.6 * scale);
    g.fillTriangle(x, my - 4 * scale, x - 2.2 * scale, my + 0.5 * scale, x + 2.2 * scale, my + 0.5 * scale);
  }
}

/**
 * Pick Your Poison's wheel: four vials round the caster on a faint ring, the one the cursor
 * leans toward swollen and haloed in its own colour, a tether running from it to the syringe.
 */
export function drawPoisonWheel(
  g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, picked: PoisonKind, open: number, t: number,
): void {
  const k = easeOut(Phaser.Math.Clamp(open, 0, 1));
  g.lineStyle(1.5, ACID.glow, 0.25 * k);
  g.strokeCircle(x, y, radius * k);
  for (let i = 0; i < 4; i++) {
    const kind = i as PoisonKind;
    const p = POISONS[kind];
    const on = kind === picked;
    const r = radius * k + (on ? 6 : 0);
    const vx = x + Math.cos(p.angle) * r;
    const vy = y + Math.sin(p.angle) * r + Math.sin(t * 2.4 + i * 1.6) * 2;
    if (on) {
      g.fillStyle(p.color, 0.22 * k);
      g.fillCircle(vx, vy, 24 + Math.sin(t * 7) * 2);
      g.lineStyle(2, p.color, 0.85 * k);
      g.strokeCircle(vx, vy, 21);
      g.lineStyle(1.6, p.color, 0.5 * k);
      g.lineBetween(x + Math.cos(p.angle) * 22, y + Math.sin(p.angle) * 22, vx - Math.cos(p.angle) * 20, vy - Math.sin(p.angle) * 20);
    }
    drawPoisonVial(g, vx, vy, kind, (on ? 1.35 : 1) * k, t, k * (on ? 1 : 0.8));
  }
}

/** The glow that rides a flying Inject blob: a wobbling skin in the load's colour and a bright core. */
export function drawVenomBlob(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, color: number, dark: number, t: number, seed: number,
): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // Tail, stretched out behind.
  g.fillStyle(dark, 0.85);
  g.fillTriangle(x - ca * 20, y - sa * 20, x - sa * 5.5, y + ca * 5.5, x + sa * 5.5, y - ca * 5.5);
  g.fillStyle(dark, 0.9);
  acidBlob(g, x, y, 9.5, t * 9 + seed, seed, 8);
  g.fillStyle(color, 0.95);
  acidBlob(g, x + ca * 1.2, y + sa * 1.2, 6.8, t * 11 + seed * 2, seed + 1.3, 7);
  g.fillStyle(ACID.white, 0.85);
  g.fillCircle(x + ca * 2.5 - sa * 2, y + sa * 2.5 + ca * 2 - 1, 1.8);
  // Beads shaken loose behind it.
  for (let i = 0; i < 2; i++) {
    const p = (t * 3 + i * 0.5 + seed) % 1;
    g.fillStyle(color, (1 - p) * 0.8);
    g.fillCircle(x - ca * (14 + p * 16) + sa * (i ? 3 : -3), y - sa * (14 + p * 16) - ca * (i ? 3 : -3), 2.2 * (1 - p * 0.6));
  }
}

/**
 * Acid Reflux's bomb, in its three sizes. Tier 1 is a stoppered round flask of sloshing acid with
 * a fizzing fuse. Tier 2 is banded in brass with a second chamber bubbling. Tier 3 is a spiked,
 * cracked sphere glowing red-hot from inside. `spin` turns it in flight.
 */
export function drawAcidBomb(
  g: Phaser.GameObjects.Graphics, tint: AcidColorFn, x: number, y: number, r: number, tier: number,
  t: number, spin: number, tones: AcidTones, alpha = 1,
): void {
  const brass = 0xc9a24a;
  g.fillStyle(0x05080a, 0.3 * alpha);
  g.fillEllipse(x, y + r + 5, r * 1.9, r * 0.55);
  if (tier >= 3) {
    // Spikes first, so the shell overlaps their roots.
    for (let i = 0; i < 8; i++) {
      const a = spin + (i / 8) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      g.fillStyle(tint(tones.rind), alpha);
      g.fillTriangle(x + ca * (r + 7), y + sa * (r + 7), x + ca * r * 0.8 - sa * 3.4, y + sa * r * 0.8 + ca * 3.4, x + ca * r * 0.8 + sa * 3.4, y + sa * r * 0.8 - ca * 3.4);
    }
    g.fillStyle(tint(ACID.sting), (0.22 + Math.sin(t * 9) * 0.08) * alpha);
    g.fillCircle(x, y, r + 11);
  }
  // Shell, the acid inside it, the slosh line.
  g.fillStyle(tint(tones.rind), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(tones.body), alpha);
  acidBlob(g, x, y + r * 0.18, r * 0.82, t * 4 + spin, 1.7, 9);
  g.fillStyle(tint(tier >= 3 ? ACID.caustic : tones.live), alpha);
  acidBlob(g, x, y + r * 0.3, r * 0.6, t * 5 + spin * 1.3, 3.1, 8);
  for (let i = 0; i < 2 + tier; i++) {
    const p = (t * 1.3 + i / (2 + tier)) % 1;
    g.fillStyle(tint(tones.wet), (1 - p) * 0.8 * alpha);
    g.fillCircle(x + Math.sin(i * 2.4 + spin) * r * 0.45, y + r * 0.55 - p * r * 0.9, 1 + p * 1.6);
  }
  if (tier >= 3) {
    // Cracks glowing through.
    g.lineStyle(1.6, tint(ACID.sting), 0.95 * alpha);
    for (let i = 0; i < 3; i++) {
      const a = spin * 0.6 + i * 2.1;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
      g.lineTo(x + Math.cos(a + 0.35) * r * 0.6, y + Math.sin(a + 0.35) * r * 0.6);
      g.lineTo(x + Math.cos(a + 0.1) * r * 0.95, y + Math.sin(a + 0.1) * r * 0.95);
      g.strokePath();
    }
  }
  if (tier >= 2) {
    // Brass bands, riveted.
    g.lineStyle(2.2, brass, alpha);
    g.strokeEllipse(x, y, r * 2, r * 0.7);
    g.strokeEllipse(x, y, r * 0.7, r * 2);
    for (let i = 0; i < 4; i++) {
      const a = spin + (i / 4) * TAU;
      g.fillStyle(0xfff0b0, alpha);
      g.fillCircle(x + Math.cos(a) * r * 0.98, y + Math.sin(a) * r * 0.34, 1.3);
    }
  }
  g.lineStyle(1.6, tint(tones.hot), 0.9 * alpha);
  g.strokeCircle(x, y, r);
  g.fillStyle(ACID.white, 0.5 * alpha);
  g.fillEllipse(x - r * 0.4, y - r * 0.45, r * 0.5, r * 0.28);
  // Cork and a spitting fuse.
  const na = spin * 0.35 - Math.PI / 2;
  const nx = x + Math.cos(na) * r, ny = y + Math.sin(na) * r;
  g.fillStyle(0x9a6b3c, alpha);
  g.fillCircle(nx, ny, 3.6 + tier * 0.4);
  const fz = (t * 6) % 1;
  g.lineStyle(1.4, 0x3a2a1a, alpha);
  g.lineBetween(nx, ny, nx + Math.cos(na) * 7, ny + Math.sin(na) * 7);
  g.fillStyle(tint(tier >= 3 ? ACID.sting : tones.wet), (1 - fz * 0.5) * alpha);
  g.fillCircle(nx + Math.cos(na) * 8, ny + Math.sin(na) * 8, 1.6 + fz * 1.8);
}

/**
 * What the three lingering poisons look like on a body (Purged has its own aura): red fissures
 * crawling over a disintegrating one, yellow sparks locking a paralyzed one's legs, violet wax
 * runs sagging off a melting one. `k` per effect is 0–1 strength (0 = not afflicted).
 */
export function drawAfflictions(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, rot: number, vuln: number, para: number, melt: number,
): void {
  if (rot > 0 || vuln > 0) {
    const n = 2 + Math.round(vuln * 5);
    g.lineStyle(1.5, POISONS[0].color, 0.5 + 0.4 * Math.max(rot, vuln));
    for (let i = 0; i < n; i++) {
      const a = i * 2.39 + Math.floor(t * 2) * 0.7;
      const r0 = 5, r1 = 15 + Math.sin(t * 6 + i) * 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      g.lineTo(x + Math.cos(a + 0.4) * (r0 + r1) * 0.5, y + Math.sin(a + 0.4) * (r0 + r1) * 0.5);
      g.lineTo(x + Math.cos(a - 0.1) * r1, y + Math.sin(a - 0.1) * r1);
      g.strokePath();
    }
    if (rot > 0) {
      for (let i = 0; i < 3; i++) {
        const p = (t * 1.1 + i / 3) % 1;
        g.fillStyle(POISONS[0].color, (1 - p) * 0.8);
        g.fillRect(x - 12 + i * 11 + Math.sin(t * 4 + i) * 2, y + 6 + p * 16, 2.2, 2.2);
      }
    }
  }
  if (para > 0) {
    g.lineStyle(1.6, POISONS[1].color, 0.85);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + Math.floor(t * 9) * 1.3;
      const bx = x + Math.cos(a) * 15, by = y + 13 + Math.sin(a) * 5;
      g.beginPath();
      g.moveTo(bx, by - 6);
      g.lineTo(bx + 3, by - 2);
      g.lineTo(bx - 2, by);
      g.lineTo(bx + 2, by + 5);
      g.strokePath();
    }
    g.lineStyle(1.2, POISONS[1].color, 0.45);
    g.strokeEllipse(x, y + 14, 38, 13);
  }
  if (melt > 0) {
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.8 + i * 0.21) % 1;
      const dx = x - 13 + i * 6.5;
      const top = y - 10 + Math.abs(i - 2) * 4;
      g.fillStyle(POISONS[3].dark, 0.8);
      g.fillRect(dx - 1.4, top, 2.8, 6 + p * 14);
      g.fillStyle(POISONS[3].color, 0.9);
      g.fillCircle(dx, top + 6 + p * 14, 2 + p * 1.2);
    }
  }
}

/**
 * The poison a filled Acid Reflux bomb carries (R+): a core of it turning inside the flask, with
 * three beads orbiting the shell so the colour reads at a glance in the hand and in the air.
 */
export function drawBombFill(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, kind: PoisonKind, t: number, alpha = 1,
): void {
  const p = POISONS[kind];
  g.fillStyle(p.dark, 0.85 * alpha);
  acidBlob(g, x, y + r * 0.15, r * 0.62, t * 5, 2.3, 8);
  g.fillStyle(p.color, 0.95 * alpha);
  acidBlob(g, x, y + r * 0.2, r * 0.42, -t * 6, 4.1, 7);
  g.fillStyle(ACID.white, 0.7 * alpha);
  g.fillCircle(x - r * 0.14, y + r * 0.06, Math.max(1, r * 0.1));
  for (let i = 0; i < 3; i++) {
    const a = t * 3.2 + (i / 3) * TAU;
    g.fillStyle(p.color, 0.9 * alpha);
    g.fillCircle(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4) * 0.7, 1.8);
  }
  g.lineStyle(1.4, p.color, (0.55 + Math.sin(t * 7) * 0.2) * alpha);
  g.strokeCircle(x, y, r + 2.5);
}

/**
 * Consume's bottle of blood (F+): a corked phial hanging at the venom's side, the blood in it
 * sloshing with the clock. `flecks` are the colours of the poisons that were in the bitten body —
 * each rides in the blood as a bright bead. `full` (0–1) is how much is in it.
 */
export function drawBloodBottle(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, flecks: readonly number[], full = 1, alpha = 1,
): void {
  const w = 11, h = 16;
  const sway = Math.sin(t * 3.1) * 0.18;
  const ca = Math.cos(sway), sa = Math.sin(sway);
  // A point in the bottle's own frame (a across, b down from the neck).
  const px = (a: number, b: number): number => x + ca * a - sa * b;
  const py = (a: number, b: number): number => y + sa * a + ca * b;
  // The cord it hangs from.
  g.lineStyle(1.2, 0x3a2a1a, 0.9 * alpha);
  g.lineBetween(px(0, -9), py(0, -9), px(0, -3), py(0, -3));
  // Glass: a round belly under a short neck.
  g.fillStyle(0x1a0507, 0.55 * alpha);
  g.fillCircle(px(0, h * 0.5), py(0, h * 0.5), w * 0.62);
  g.fillRect(px(0, 0) - 2.6, py(0, 0) - 1, 5.2, 6);
  // The blood, with a slosh line that tips against the sway.
  const level = h * 0.5 + w * 0.5 - w * 1.05 * Phaser.Math.Clamp(full, 0, 1);
  const tip = Math.sin(t * 4.3) * 1.6;
  g.fillStyle(0x7a0a12, alpha);
  g.beginPath();
  g.moveTo(px(-w * 0.5, level + tip), py(-w * 0.5, level + tip));
  g.lineTo(px(w * 0.5, level - tip), py(w * 0.5, level - tip));
  g.lineTo(px(w * 0.46, h * 0.72), py(w * 0.46, h * 0.72));
  g.lineTo(px(0, h * 0.5 + w * 0.56), py(0, h * 0.5 + w * 0.56));
  g.lineTo(px(-w * 0.46, h * 0.72), py(-w * 0.46, h * 0.72));
  g.closePath();
  g.fillPath();
  g.fillStyle(0xd81c2c, 0.9 * alpha);
  g.fillEllipse(px(0, level + 1.5), py(0, level + 1.5), w * 0.8, 2.6);
  flecks.forEach((c, i) => {
    const a = t * 2.4 + i * 1.9;
    g.fillStyle(c, 0.95 * alpha);
    g.fillCircle(px(Math.cos(a) * w * 0.24, h * 0.56 + Math.sin(a * 1.3) * 2.6), py(Math.cos(a) * w * 0.24, h * 0.56 + Math.sin(a * 1.3) * 2.6), 1.5);
  });
  // Rim light, the neck's lip, the cork.
  g.lineStyle(1.3, 0xffc9c9, 0.75 * alpha);
  g.strokeCircle(px(0, h * 0.5), py(0, h * 0.5), w * 0.62);
  g.fillStyle(ACID.white, 0.55 * alpha);
  g.fillEllipse(px(-w * 0.26, h * 0.34), py(-w * 0.26, h * 0.34), 2.4, 4.6);
  g.fillStyle(0xe8d8c0, alpha);
  g.fillRect(px(0, -1) - 3.4, py(0, -1) - 1, 6.8, 1.8);
  g.fillStyle(0x9a6b3c, alpha);
  g.fillRect(px(0, -3.6) - 2.4, py(0, -3.6) - 1.6, 4.8, 3.4);
}

/**
 * The venom's own boons (Self-Inject, a drunk bottle): one vein of each running poison's colour
 * climbing the body from the floor. Bright and fast while the venom stands on its acid — which is
 * the only place a boon does anything — and a dim ember off it.
 */
export function drawBoons(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, active: readonly boolean[], onAcid: boolean, alpha = 1,
): void {
  const lit = onAcid ? 1 : 0.35;
  active.forEach((on, k) => {
    if (!on) return;
    const p = POISONS[k];
    const base = (k / 4) * TAU + t * (onAcid ? 1.6 : 0.5);
    g.lineStyle(2, p.color, 0.8 * lit * alpha);
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const a = base + u * 1.5;
      const rr = 22 - u * 7;
      const vx = x + Math.cos(a) * rr, vy = y + 16 - u * 30 + Math.sin(a) * rr * 0.32;
      if (i === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
    }
    g.strokePath();
    const head = base + 1.5;
    g.fillStyle(p.color, lit * alpha);
    g.fillCircle(x + Math.cos(head) * 15, y - 14 + Math.sin(head) * 4.8, onAcid ? 2.6 : 1.8);
    if (onAcid) {
      const q = (t * 1.4 + k * 0.25) % 1;
      g.fillStyle(p.color, (1 - q) * 0.8 * alpha);
      g.fillCircle(x + Math.cos(base * 0.7) * 12, y + 14 - q * 26, 1.6);
    }
  });
}

/**
 * Poison Synergy (E+): two poisons reacting on one body. A braid of the pair's colours wound
 * round the victim's waist, with a bright knot wherever the strands cross.
 */
export function drawSynergy(
  g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, a: PoisonKind, b: PoisonKind, slot: number,
): void {
  const ry = y - 2 + slot * 7;
  const R = 24 + slot * 3;
  [POISONS[a].color, POISONS[b].color].forEach((color, s) => {
    g.lineStyle(1.8, color, 0.9);
    g.beginPath();
    for (let i = 0; i <= 28; i++) {
      const u = (i / 28) * TAU;
      const wob = Math.sin(u * 3 + t * 5 + s * Math.PI) * 3.2;
      const vx = x + Math.cos(u) * R, vy = ry + Math.sin(u) * R * 0.3 + wob;
      if (i === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
    }
    g.strokePath();
  });
  for (let i = 0; i < 3; i++) {
    const u = (i / 3) * TAU + (Math.PI / 6) - t * (5 / 3);
    g.fillStyle(ACID.white, 0.85);
    g.fillCircle(x + Math.cos(u) * R, ry + Math.sin(u) * R * 0.3, 1.7);
  }
}
