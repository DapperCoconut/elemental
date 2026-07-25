import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Acid renders: the dripping avatar (globule ball hands, a
 * crown of running ribbons, eyes), the corrosion auras, and the one-shot effects every acid
 * ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes acid
 * acid: the drop, the palette, and the effects built out of them.
 *
 * Colours must come from the ACID palette below. Acid has no colour-slot cosmetic yet, but every
 * call still routes through the owner's `acidColor` mapper, so the day one lands it is a table
 * edit in CosmeticsKit rather than a sweep through this file.
 *
 * (The element's id in code is still `slime`; it was remastered into Acid without renaming.)
 */

/** `(base) => displayed` — CosmeticsKit.acidColor bound to one owner. */
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
  | 'burrow'     // Snake Burrow: submerged under a churning mound of acid
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
 * BaseAvatar; what acid adds is the pool underfoot and the running above.
 */
export class AcidAvatar extends BaseAvatar {
  private fx: AcidFx;
  private tones: AcidTones;
  /** Drip timers for the crest ribbons — each one lets go on its own schedule. */
  private dripAt = 0;

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
