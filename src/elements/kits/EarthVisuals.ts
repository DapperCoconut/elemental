import Phaser from 'phaser';
import { ArmHold, ArmPose, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Earth renders: the standing-stone avatar (boulder hands +
 * eyes + a crown of hovering slabs), the shield, the golem, and every one-shot effect earth's
 * abilities fire off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live
 * in ElementVisuals.ts and are shared with fire, water, life and air. What stays here is what
 * makes earth earth: the stone chunk, the palette, and the things built out of them.
 *
 * Colours must come from the EARTH palette below. Earth has no colour-slot cosmetic yet, but
 * every call still routes through the owner's `earthColor` mapper, so the day one lands it is
 * a table edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.earthColor bound to one owner. */
export type EarthColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const EARTH = {
  crevice:  0x1c1409,   // the black inside a split rock
  umber:    0x342b20,   // outline / deep shadow
  shale:    0x4a3d2d,
  stone:    0x5b4c39,
  rock:     0x6d5c45,
  clay:     0x887755,   // the element's own colour
  sand:     0xa8926c,
  dust:     0xccaa66,
  pale:     0xe3d2a8,
  chalk:    0xfff3d6,
  // Molten seams — lava rocks, magma quake, the titan's face
  ember:    0xff5a0f,
  magma:    0xff8a2a,
  gold:     0xffd070,
  // Double Shield's plated grey
  iron:     0x6f6f6f,
  steel:    0x9a9a9a,
  chrome:   0xc8c8c8,
  // Shield Enhancement's brass
  brass:    0xffcc44,
  brassLit: 0xffe899,
} as const;

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Deterministic per-vertex jitter. Rock has to look *carved*, not noisy: if the wobble were
 * re-rolled every frame every chunk would boil, and a chunk that boils reads as static, not
 * as stone.
 */
const FACET = [0.92, 1.14, 0.86, 1.06, 0.95, 1.16, 0.9, 1.04, 0.88, 1.12, 1.0, 0.97];
const facet = (seed: number, i: number): number =>
  FACET[(Math.abs(Math.round(seed * 97)) + i * 5) % FACET.length];

/** A small irregular pebble — the rubble that collars a chunk where it broke free. */
function pebble(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, r: number, rot: number, seed: number,
): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * TAU;
    const rr = r * facet(seed, i);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillPoints(pts, true);
}

/**
 * A chunk of broken stone: a squat, blunt-ended slab whose edges are cut into flat facets, with
 * a collar of rubble where it tore loose. This is the primitive every earth shape is built
 * from — orbiting rocks, shrapnel, the shield's plates, the crown of the avatar and the ridges
 * of a quake all call it.
 *
 * Note it is the opposite of a flame tongue in every way that matters: it does not taper to a
 * point (rock shears, it doesn't lick), it is widest across its middle rather than its root,
 * and its outline is straight segments rather than curves — a curve anywhere on it immediately
 * reads as clay or as flesh instead of as stone.
 */
export function stoneChunk(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  seed = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number, w: number) =>
    new Phaser.Geom.Point(cx + cos * len * f + px * w, cy + sin * len * f + py * w);

  g.fillPoints([
    at(0.00,  halfW * 0.52 * facet(seed, 0)),
    at(0.30,  halfW * 1.02 * facet(seed, 1)),
    at(0.68,  halfW * 0.90 * facet(seed, 2)),
    at(1.00,  halfW * 0.36 * facet(seed, 3)),
    at(1.00, -halfW * 0.40 * facet(seed, 4)),
    at(0.66, -halfW * 0.98 * facet(seed, 5)),
    at(0.28, -halfW * 0.88 * facet(seed, 6)),
    at(0.00, -halfW * 0.50 * facet(seed, 7)),
  ], true);

  // Rubble collar. Without it a ring of chunks fired from one point reads as a spiked star;
  // real debris always drags a scatter of smaller pieces along at its root.
  if (halfW > 2.2) {
    const a = at(0.10, halfW * 0.74);
    const b = at(0.12, -halfW * 0.76);
    const c = at(0.48, halfW * 0.96);
    pebble(g, a.x, a.y, halfW * 0.34, angle + 0.7, seed);
    pebble(g, b.x, b.y, halfW * 0.30, angle - 0.5, seed + 1);
    pebble(g, c.x, c.y, halfW * 0.24, angle + 1.3, seed + 2);
  }
}

/**
 * Layered chunk: umber silhouette, stone body, a lit top facet offset off the axis, and a hard
 * rim highlight along that facet's edge. `vein` paints a molten seam through the middle — that
 * one argument is the whole difference between a rock and a lava rock.
 */
export function stoneChunkLayered(
  g: Phaser.GameObjects.Graphics,
  tint: EarthColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number,
  seed = 0,
  vein?: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;

  g.fillStyle(tint(EARTH.umber), alpha);
  stoneChunk(g, cx, cy, angle, len * 1.05, halfW * 1.16, seed);
  g.fillStyle(tint(EARTH.stone), alpha);
  stoneChunk(g, cx, cy, angle, len, halfW, seed);

  // The lit face sits off the axis rather than nested at the root: a slab catches the light on
  // one flank, so centring the highlight makes it glow from within like a coal instead.
  const ox = px * -halfW * 0.36, oy = py * -halfW * 0.36;
  g.fillStyle(tint(EARTH.sand), alpha * 0.95);
  stoneChunk(g, cx + cos * len * 0.1 + ox, cy + sin * len * 0.1 + oy, angle, len * 0.76, halfW * 0.46, seed + 3);

  if (halfW > 2) {
    g.lineStyle(Math.max(0.8, halfW * 0.16), tint(EARTH.dust), alpha * 0.7);
    g.lineBetween(
      cx + cos * len * 0.14 + px * -halfW * 0.78, cy + sin * len * 0.14 + py * -halfW * 0.78,
      cx + cos * len * 0.9 + px * -halfW * 0.32, cy + sin * len * 0.9 + py * -halfW * 0.32,
    );
  }

  if (vein !== undefined) {
    g.lineStyle(Math.max(1, halfW * 0.28), tint(vein), alpha * 0.85);
    g.lineBetween(
      cx + cos * len * 0.18 + px * halfW * 0.3, cy + sin * len * 0.18 + py * halfW * 0.3,
      cx + cos * len * 0.82 - px * halfW * 0.2, cy + sin * len * 0.82 - py * halfW * 0.2,
    );
  }
}

// ── Option bags ───────────────────────────────────────────────────────────

export interface DebrisOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Pixels of gravity sag over the chunk's life. Rock always falls; never pass 0 lightly. */
  fall?: number;
  /** Paint a molten seam through each chunk. */
  molten?: boolean;
}

export interface ImpactOpts {
  /** Chunks flung out of the crater. Defaults to radius/7. */
  shards?: number;
  /** Rising dust plumes. Defaults to radius/22. */
  dust?: number;
  /** Leave a crater on the ground. Default true. */
  crater?: boolean;
  /** Render depth of the rubble body. Default 6. */
  depth?: number;
  /** Total life of the rubble body in ms. Defaults to scale with radius. */
  duration?: number;
  /** Magma flavour: the crater glows and the shards carry veins. */
  molten?: boolean;
}

// ── EarthFx ───────────────────────────────────────────────────────────────

/**
 * One-shot earth effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class EarthFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: EarthColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding shock front. Heavily faceted rather than round — a shockwave through ground is a
   * ring of lifted plates, so this is deliberately drawn as a jagged closed polyline whose
   * vertices sit at fixed angles and only move outward.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    // Segment count tracks the radius: a fixed count turns big blasts into visible polygons.
    const segs = Phaser.Math.Clamp(Math.round(toR / 7), 14, 48);
    const jitter = Array.from({ length: segs }, () => 0.88 + Math.random() * 0.24);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.65)), c, 0.9 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r * jitter[i % segs];
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /** Blown-out grit core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, EARTH.chalk, EARTH.dust, depth);
  }

  /**
   * Chunks of ground flung out and pulled back down, each one tumbling on its own axis. The
   * gravity sag is what separates a rock burst from a fire one: stone arcs and lands, it never
   * drifts.
   */
  debris(x: number, y: number, count: number, opts: DebrisOpts = {}): void {
    const speed = opts.speed ?? 150;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 4;
    const life = opts.life ?? 620;
    const fall = opts.fall ?? 90;
    const depth = opts.depth ?? 6;
    const vein = opts.molten ? EARTH.ember : undefined;

    const parts = Array.from({ length: count }, (_, i) => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 1.0),
        r: size * (0.5 + Math.random() * 0.9),
        spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 7),
        rot: Math.random() * TAU,
        seed: i * 0.37 + Math.random(),
        delay: Math.random() * 0.15,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * d;
        const ey = y + p.sin * d + fall * lt * lt;
        const fade = 1 - easeIn(lt);
        stoneChunkLayered(
          g, this.tint, ex, ey, p.rot + p.spin * lt,
          p.r * 2.1, p.r, 0.95 * fade, p.seed, vein,
        );
      }
    });
  }

  /** Fine grit shed off something moving fast — the cheap cousin of `debris`. */
  grit(x: number, y: number, count: number, opts: DebrisOpts = {}): void {
    this.debris(x, y, count, {
      speed: 46, size: 1.9, life: 520, fall: 46, spread: Math.PI, ...opts,
    });
  }

  /** Dust plumes that swell and drift upward — the tail end of every heavy impact. */
  dust(x: number, y: number, count: number, radius: number, depth = 4): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.3,
      oy: (Math.random() - 0.5) * radius * 0.7,
      r: radius * (0.28 + Math.random() * 0.34),
      drift: (Math.random() - 0.5) * 30,
      lobes: Array.from({ length: 3 }, () => ({
        a: Math.random() * TAU, d: 0.3 + Math.random() * 0.5, s: 0.4 + Math.random() * 0.4,
      })),
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1200, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const cx = x + p.ox + p.drift * lt;
        const cy = y + p.oy - 30 * lt;
        const r = p.r * (0.6 + lt * 1.3);
        // Billowed out of overlapping lobes rather than one disc, so a plume boils.
        for (const [col, a, s] of [[EARTH.rock, 0.3, 1], [EARTH.sand, 0.2, 0.66]] as const) {
          g.fillStyle(this.tint(col), a * (1 - lt));
          g.fillCircle(cx, cy, r * s);
          for (const l of p.lobes) {
            g.fillCircle(cx + Math.cos(l.a) * r * l.d, cy + Math.sin(l.a) * r * l.d * 0.7, r * l.s * s);
          }
        }
      }
    });
  }

  /**
   * A lingering pit with cracks radiating out of it. Deliberately short of a full disc and
   * ragged at the lip — a solid circle on the ground reads as a bug, while a broken hole with
   * fracture lines running off it reads as damage.
   */
  crater(x: number, y: number, radius: number, depth = 1, molten = false): void {
    const segs = 13;
    const lip = Array.from({ length: segs }, () => 0.7 + Math.random() * 0.5);
    const cracks = Array.from({ length: 6 }, () => ({
      a: Math.random() * TAU,
      len: radius * (0.9 + Math.random() * 1.1),
      kink: (Math.random() - 0.5) * 0.9,
    }));
    const rubble = Array.from({ length: 7 }, (_, i) => {
      const a = Math.random() * TAU;
      const d = radius * (0.75 + Math.random() * 0.45);
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, r: radius * 0.12, rot: a, seed: i * 0.7 };
    });

    this.anim(depth, molten ? 3400 : 2400, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;

      // The pit itself.
      g.fillStyle(this.tint(EARTH.crevice), 0.5 * a);
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const ang = (i % segs) / segs * TAU;
        const rr = radius * lip[i % segs];
        const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.78;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.fillStyle(this.tint(molten ? EARTH.ember : EARTH.shale), (molten ? 0.4 : 0.34) * a);
      g.fillEllipse(x, y, radius * 1.05, radius * 0.8);

      // Fractures walking away from the rim.
      g.lineStyle(2, this.tint(molten ? EARTH.magma : EARTH.umber), 0.55 * a);
      for (const c of cracks) {
        const mx = x + Math.cos(c.a) * c.len * 0.55;
        const my = y + Math.sin(c.a) * c.len * 0.45;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(mx, my);
        g.lineTo(
          x + Math.cos(c.a + c.kink) * c.len,
          y + Math.sin(c.a + c.kink) * c.len * 0.8,
        );
        g.strokePath();
      }

      // Chunks thrown onto the lip settle first, so the mark dulls before it fades.
      const settle = Math.max(0, 1 - t * 2.2);
      g.fillStyle(this.tint(EARTH.rock), 0.7 * settle);
      for (const r of rubble) pebble(g, r.x, r.y, r.r, r.rot, r.seed);
    });
  }

  /**
   * The heaving mound of rubble at the centre of an impact: overlapping stone lobes that punch
   * up, crack apart and collapse. Reads as volume rather than a flat disc.
   */
  rubbleDome(x: number, y: number, radius: number, duration: number, depth = 6, molten = false): void {
    const lobes = Array.from({ length: 8 }, (_, i) => ({
      ang: (i / 8) * TAU + Math.random() * 0.5,
      off: 0.3 + Math.random() * 0.4,
      len: 0.6 + Math.random() * 0.5,
      w: 0.3 + Math.random() * 0.2,
      seed: i * 0.61,
    }));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.4 + easeOut(Math.min(1, t * 1.6)) * 0.85;
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      // Slabs shoved up and outward off a central heap.
      for (const l of lobes) {
        const d = radius * grow * l.off;
        stoneChunkLayered(
          g, this.tint,
          x + Math.cos(l.ang) * d, y + Math.sin(l.ang) * d * 0.85,
          l.ang, radius * grow * l.len, radius * grow * l.w,
          0.9 * fade, l.seed, molten ? EARTH.ember : undefined,
        );
      }
      g.fillStyle(this.tint(molten ? EARTH.magma : EARTH.rock), 0.75 * fade);
      g.fillCircle(x, y, radius * grow * 0.34);
      if (t < 0.4) {
        g.fillStyle(this.tint(molten ? EARTH.gold : EARTH.pale), (1 - t / 0.4) * 0.7);
        g.fillCircle(x, y, radius * grow * 0.18);
      }
    });
  }

  /**
   * The full detonation stack: flash, heaving rubble body, three staggered shock fronts,
   * shrapnel, rising dust and a crater left behind. Six layers, because a single expanding disc
   * always reads as placeholder art.
   */
  impact(x: number, y: number, radius: number, opts: ImpactOpts = {}): void {
    const shards = opts.shards ?? Math.round(radius / 7);
    const dustCount = opts.dust ?? Math.round(radius / 22);
    const dur = opts.duration ?? Math.round(300 + radius * 1.4);
    const depth = opts.depth ?? 6;
    const molten = opts.molten ?? false;

    if (opts.crater !== false) this.crater(x, y, radius * 0.55, 1, molten);
    this.rubbleDome(x, y, radius * 0.66, dur, depth, molten);
    this.flash(x, y, radius * 0.3, depth + 1);
    this.ring(x, y, radius * 0.2, radius * 1.1, molten ? EARTH.gold : EARTH.pale, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(90, () =>
      this.ring(x, y, radius * 0.15, radius * 1.35, molten ? EARTH.magma : EARTH.dust, dur, 4, depth));
    this.scene.time.delayedCall(190, () =>
      this.ring(x, y, radius * 0.1, radius * 1.55, EARTH.umber, dur, 3, depth));
    this.debris(x, y, shards, {
      speed: radius * 2.1, size: 3 + radius / 40,
      life: Math.round(dur * 1.5), fall: radius * 1.1, depth, molten,
    });
    if (dustCount > 0) this.dust(x, y, dustCount, radius * 0.9, depth - 2);
  }

  /**
   * A spire of rock punched up out of the ground and crumbling back down. Kept to a few broad
   * slabs: thin ones read as scratches over whatever is beneath.
   */
  pillar(x: number, y: number, radius: number, height: number, depth = 7): void {
    const spires = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.44,
      h: height * (0.65 + Math.random() * 0.45),
      w: radius * (0.36 + Math.random() * 0.22),
      lean: (Math.random() - 0.5) * 0.4,
      seed: i * 0.83,
      delay: i * 0.06,
    }));
    this.anim(depth, 700, (g, t) => {
      const fade = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
      // Broken ground at the base, so the spire looks anchored rather than pasted on.
      g.fillStyle(this.tint(EARTH.umber), 0.55 * fade);
      g.fillEllipse(x, y, radius * 1.7, radius * 0.7);
      for (const s of spires) {
        const rise = easeOut(Math.max(0, (t - s.delay) / (1 - s.delay)));
        // Sinks back as it dies, rather than fading in place like smoke would.
        const sink = t > 0.55 ? (t - 0.55) / 0.45 : 0;
        stoneChunkLayered(
          g, this.tint, x + s.ox, y + radius * 0.2 + sink * s.h * 0.5,
          -Math.PI / 2 + s.lean, s.h * rise * (1 - sink * 0.55), s.w,
          0.95 * fade, s.seed,
        );
      }
    });
    this.grit(x, y - height * 0.35, 6, { speed: radius * 1.4, angle: -Math.PI / 2, spread: 1.0, fall: height * 0.9, depth });
  }

  /**
   * The furrow a bash ploughs through the ground: a tapered channel of turned earth with slabs
   * kicked out along both flanks, plus grit thrown back out of the launch point.
   */
  furrow(x1: number, y1: number, x2: number, y2: number, depth = 4): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(3, Math.round(dist / 26));
    const seeds = Array.from({ length: steps }, (_, i) => i * 0.53);
    this.anim(depth, 480, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        const px = x1 + (x2 - x1) * f;
        const py = y1 + (y2 - y1) * f;
        // The trench drains from the back forward, so it looks like it is being cut.
        const local = Math.max(0, fade - f * 0.3);
        if (local <= 0) continue;
        g.fillStyle(this.tint(EARTH.crevice), 0.4 * local);
        g.fillEllipse(px, py, (10 + (1 - f) * 16) * local, (5 + (1 - f) * 7) * local);
        // Spoil thrown out to either side, angled backward like a plough's mouldboard.
        for (const s of [1, -1]) {
          stoneChunkLayered(
            g, this.tint,
            px, py, angle + s * (Math.PI / 2) + s * 0.4,
            (7 + f * 17) * local, (2.4 + (1 - f) * 1.6) * local,
            0.75 * local, seeds[i] + s,
          );
        }
      }
    });
    this.debris(x1, y1, 8, { angle: angle + Math.PI, spread: 0.9, speed: 170, size: 3.4, life: 540, fall: 80, depth });
    this.ring(x1, y1, 8, 48, EARTH.dust, 380, 3, depth);
  }

  /** Recoil rubble at the muzzle — sells that a rock was actually thrown rather than teleported. */
  muzzleRubble(x: number, y: number, angle: number, scale = 1, depth = 6, molten = false): void {
    this.anim(depth, 150, (g, t) => {
      const fade = 1 - t;
      stoneChunkLayered(g, this.tint, x, y, angle, 26 * scale * (0.6 + t * 0.9), 7 * scale * fade,
        0.8 * fade, 0.2, molten ? EARTH.ember : undefined);
      g.fillStyle(this.tint(EARTH.pale), 0.75 * fade);
      g.fillCircle(x, y, 5 * scale * (1 - t * 0.4));
      // Back-blast: the ground shoved sideways as the shot leaves.
      g.fillStyle(this.tint(EARTH.sand), 0.45 * fade);
      stoneChunk(g, x, y, angle + Math.PI * 0.74, 13 * scale * fade, 3.2 * scale * fade, 1.1);
      stoneChunk(g, x, y, angle - Math.PI * 0.74, 13 * scale * fade, 3.2 * scale * fade, 2.3);
    });
    this.grit(x, y, 4, { angle, spread: 0.7, speed: 120, size: 2, life: 320, fall: 40, depth });
  }

  /**
   * Inward gather: slabs dragged out of the ground from the rim toward a compressing core while
   * a containment ring closes. `follow` lets it track a caster who can still walk.
   */
  channelCharge(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const streams = Array.from({ length: 12 }, (_, i) => ({
      ang: (i / 12) * TAU,
      spin: 0.7 + Math.random() * 0.8,
      phase: Math.random(),
      len: 0.2 + Math.random() * 0.22,
      seed: i * 0.41,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.88 + Math.sin(t * 26) * 0.12;

      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        stoneChunkLayered(
          g, this.tint,
          cx + Math.cos(a) * r, cy + Math.sin(a) * r,
          a + Math.PI, r * s.len, 3.4 * (1 - lt * 0.5),
          0.85 * (1 - lt * 0.5), s.seed,
        );
      }

      const cr = radius * (0.1 + easeIn(t) * 0.3) * pulse;
      g.fillStyle(this.tint(EARTH.umber), 0.6);
      g.fillCircle(cx, cy, cr * 1.4);
      g.fillStyle(this.tint(EARTH.rock), 0.85);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(EARTH.dust), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.45);

      // Containment ring squeezing shut, drawn faceted so it reads as a tightening wall of rock.
      const rr = radius * (1 - easeIn(t) * 0.5) * pulse;
      g.lineStyle(3, this.tint(EARTH.dust), 0.4 + 0.45 * easeIn(t));
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = (i % 14) / 14 * TAU;
        const px = cx + Math.cos(a) * rr * (0.92 + (i % 3) * 0.05);
        const py = cy + Math.sin(a) * rr * (0.92 + (i % 3) * 0.05);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /**
   * The Dust Screen cone: a wall of billowing grit kicked forward, thickening with distance and
   * blowing itself apart. Painted as overlapping puffs inside the wedge rather than as a flat
   * filled slice, so it reads as airborne dirt rather than as a UI cone.
   */
  dustCone(x: number, y: number, angle: number, range: number, halfAngle: number, depth = 4): void {
    const puffs = Array.from({ length: 22 }, () => {
      const f = 0.15 + Math.random() * 0.9;
      const a = angle + (Math.random() - 0.5) * halfAngle * 2 * Math.min(1, f + 0.25);
      return {
        f, a,
        r: range * (0.09 + Math.random() * 0.12) * (0.5 + f),
        rise: 10 + Math.random() * 26,
        delay: f * 0.35 + Math.random() * 0.12,
      };
    });
    const chips = Array.from({ length: 10 }, (_, i) => ({
      a: angle + (Math.random() - 0.5) * halfAngle * 1.7,
      v: range * (0.5 + Math.random() * 0.8),
      seed: i * 0.6,
      spin: (Math.random() < 0.5 ? -1 : 1) * 5,
    }));
    this.anim(depth, 900, (g, t) => {
      for (const p of puffs) {
        const lt = Phaser.Math.Clamp((t - p.delay) / (1 - p.delay), 0, 1);
        if (lt <= 0) continue;
        const d = range * p.f * easeOut(Math.min(1, lt * 2.2));
        const cx = x + Math.cos(p.a) * d;
        const cy = y + Math.sin(p.a) * d - p.rise * lt;
        const rr = p.r * (0.6 + lt * 1.5);
        g.fillStyle(this.tint(EARTH.rock), 0.34 * (1 - lt));
        g.fillCircle(cx, cy, rr);
        g.fillStyle(this.tint(EARTH.sand), 0.24 * (1 - lt));
        g.fillCircle(cx - rr * 0.2, cy - rr * 0.2, rr * 0.62);
      }
      // A few real chips riding the cloud, so the screen has weight behind the haze.
      for (const c of chips) {
        const d = c.v * easeOut(t);
        stoneChunkLayered(
          g, this.tint,
          x + Math.cos(c.a) * d, y + Math.sin(c.a) * d + 40 * t * t,
          c.a + c.spin * t, 9, 3.4, 0.85 * (1 - t), c.seed,
        );
      }
    });
  }

  /**
   * Shield plates blowing apart. Distinct from `debris` in that the fragments are wide flat
   * slabs rather than lumps — a shattered shield should be recognisably the shield.
   */
  shatter(x: number, y: number, angle: number, color: number, count = 9, depth = 8): void {
    const parts = Array.from({ length: count }, (_, i) => {
      const a = angle + (Math.random() - 0.5) * 2.6;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: 90 + Math.random() * 190,
        w: 4 + Math.random() * 7,
        l: 10 + Math.random() * 16,
        rot: a, spin: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6),
        seed: i * 0.29,
      };
    });
    this.anim(depth, 700, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const p of parts) {
        const d = p.v * easeOut(t) * 0.7;
        const ex = x + p.cos * d, ey = y + p.sin * d + 110 * t * t;
        g.fillStyle(this.tint(EARTH.umber), 0.9 * fade);
        stoneChunk(g, ex, ey, p.rot + p.spin * t, p.l * 1.1, p.w * 1.15, p.seed);
        g.fillStyle(this.tint(color), 0.95 * fade);
        stoneChunk(g, ex, ey, p.rot + p.spin * t, p.l, p.w, p.seed);
      }
    });
    this.ring(x, y, 6, 54, color, 340, 3, depth - 2);
    this.dust(x, y, 2, 26, depth - 3);
  }

  // ── Painters into caller-owned Graphics ─────────────────────────────────
  //
  // These are used where the kit already owns a long-lived Graphics and repaints it every
  // frame, so running them through `anim` would mean one tween per object per frame.

  /**
   * One orbiting rock, painted once into its own Graphics around the origin so the kit can
   * fly and tumble it as a whole.
   */
  static drawRock(
    g: Phaser.GameObjects.Graphics, tint: EarthColorFn,
    size: number, seed: number, molten = false,
  ): void {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const r = size * facet(seed, i);
      pts.push(new Phaser.Geom.Point(Math.cos(a) * r, Math.sin(a) * r));
    }
    g.fillStyle(tint(molten ? EARTH.crevice : EARTH.umber), 1);
    g.fillPoints(pts, true);
    g.lineStyle(2, tint(molten ? EARTH.ember : EARTH.umber), 1);
    g.strokePoints(pts, true);

    // Lit top-left facet plus a hard rim, so a spinning rock catches the light as it turns.
    g.fillStyle(tint(molten ? EARTH.shale : EARTH.rock), 1);
    g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x * 0.72 - size * 0.1, p.y * 0.72 - size * 0.12)), true);
    g.fillStyle(tint(molten ? EARTH.magma : EARTH.sand), 1);
    g.fillPoints([
      new Phaser.Geom.Point(-size * 0.5, -size * 0.34),
      new Phaser.Geom.Point(size * 0.1, -size * 0.62),
      new Phaser.Geom.Point(size * 0.44, -size * 0.14),
      new Phaser.Geom.Point(-size * 0.16, 0),
    ], true);

    if (molten) {
      // Cracks lit from inside — the rock is a shell around something still liquid.
      g.lineStyle(Math.max(1.5, size * 0.2), tint(EARTH.gold), 0.95);
      g.lineBetween(-size * 0.55, -size * 0.15, size * 0.1, size * 0.3);
      g.lineBetween(size * 0.1, size * 0.3, size * 0.6, size * 0.05);
      g.lineStyle(Math.max(1, size * 0.12), tint(EARTH.ember), 0.8);
      g.lineBetween(-size * 0.2, size * 0.5, size * 0.05, size * 0.28);
    } else {
      g.lineStyle(Math.max(1, size * 0.14), tint(EARTH.dust), 0.7);
      g.lineBetween(-size * 0.48, -size * 0.36, size * 0.12, -size * 0.58);
      g.lineStyle(Math.max(1, size * 0.12), tint(EARTH.crevice), 0.6);
      g.lineBetween(size * 0.1, -size * 0.1, -size * 0.25, size * 0.5);
    }
  }

  /**
   * The quake zone: ground broken into heaving plates with fissures crawling between them and
   * grit bouncing off the surface. Repainted every frame because the whole point of the ability
   * is that the floor will not hold still.
   */
  static drawQuakeField(
    g: Phaser.GameObjects.Graphics, tint: EarthColorFn,
    x: number, y: number, radius: number, t: number, magma: boolean, tectonic: boolean,
  ): void {
    const plates = 9;
    const deep = magma ? EARTH.ember : EARTH.crevice;
    const face = magma ? EARTH.magma : (tectonic ? EARTH.pale : EARTH.rock);
    const seam = magma ? EARTH.gold : (tectonic ? EARTH.chalk : EARTH.dust);

    // Sunken floor under the plates — what shows through the cracks.
    g.fillStyle(tint(deep), magma ? 0.4 : 0.34);
    g.fillCircle(x, y, radius);

    // Plates, each shivering out of step with its neighbours.
    for (let i = 0; i < plates; i++) {
      const a = (i / plates) * TAU;
      const shake = Math.sin(t * 7 + i * 2.1) * (tectonic ? 3.4 : 2.4);
      const d = radius * (0.24 + ((i * 37) % 11) / 11 * 0.5);
      const px = x + Math.cos(a) * d + Math.cos(a) * shake;
      const py = y + Math.sin(a) * d + Math.sin(a) * shake;
      const size = radius * (0.26 + ((i * 53) % 7) / 7 * 0.18);
      g.fillStyle(tint(EARTH.umber), 0.55);
      pebble(g, px, py + 2, size * 1.1, a, i * 0.44);
      g.fillStyle(tint(face), magma ? 0.62 : 0.5);
      pebble(g, px, py, size, a, i * 0.44);
      g.fillStyle(tint(seam), 0.3);
      pebble(g, px - size * 0.2, py - size * 0.22, size * 0.42, a + 0.6, i * 0.44 + 2);
    }

    // Fissure network, redrawn each frame so the cracks visibly work themselves wider.
    const breathe = 0.6 + 0.4 * Math.sin(t * 5);
    g.lineStyle(magma ? 4 : 3, tint(seam), 0.45 + 0.35 * breathe);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 0.15;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a + 0.25) * radius * 0.5, y + Math.sin(a + 0.25) * radius * 0.5);
      g.lineTo(x + Math.cos(a - 0.2) * radius * 0.96, y + Math.sin(a - 0.2) * radius * 0.96);
      g.strokePath();
    }

    // Faceted rim: the edge of the zone is a lip of lifted ground, not a drawn circle.
    g.lineStyle(magma ? 3.5 : 2.5, tint(seam), 0.8);
    g.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = (i % 18) / 18 * TAU;
      const rr = radius * (0.95 + ((i * 29) % 9) / 9 * 0.09);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();

    // Grit bouncing off the shaking floor.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + i;
      const bounce = Math.abs(Math.sin(t * 6 + i * 1.7));
      const d = radius * (0.2 + ((i * 41) % 13) / 13 * 0.7);
      g.fillStyle(tint(magma ? EARTH.gold : EARTH.sand), 0.5 + 0.3 * bounce);
      pebble(g, x + Math.cos(a) * d, y + Math.sin(a) * d - bounce * 9, 2.6, a, i);
    }
  }

  /**
   * The tether between a summoner and their golem: chips of stone strung along the line and
   * drifting, rather than a drawn wire. A straight line reads as debug art.
   */
  static drawTether(
    g: Phaser.GameObjects.Graphics, tint: EarthColorFn,
    x1: number, y1: number, x2: number, y2: number, t: number,
  ): void {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const beads = Phaser.Math.Clamp(Math.round(dist / 22), 3, 14);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const perp = ang + Math.PI / 2;
    for (let i = 0; i <= beads; i++) {
      const f = i / beads;
      // Sags in the middle and rolls along its length, so the link feels loaded.
      const sag = Math.sin(f * Math.PI) * 9;
      const wobble = Math.sin(t * 3 + f * 6) * 3;
      const bx = Phaser.Math.Linear(x1, x2, f) + Math.cos(perp) * (sag + wobble);
      const by = Phaser.Math.Linear(y1, y2, f) + Math.sin(perp) * (sag + wobble) + sag * 0.4;
      const r = 2 + Math.sin(f * Math.PI) * 2.4;
      g.fillStyle(tint(EARTH.umber), 0.75);
      pebble(g, bx, by, r * 1.3, ang + f * 4, i * 0.5);
      g.fillStyle(tint(EARTH.dust), 0.7);
      pebble(g, bx, by, r * 0.72, ang + f * 4 + 0.5, i * 0.5 + 1);
    }
  }

  /** The golem's Fault Line: a raised wall of jammed-together slabs. */
  static drawFaultWall(
    g: Phaser.GameObjects.Graphics, tint: EarthColorFn,
    x: number, y: number, halfLen: number, angle: number, t: number, riseT: number,
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const rise = easeOut(Phaser.Math.Clamp(riseT, 0, 1));
    const slabs = 9;
    // Rubble kicked up along the base where the ground split.
    g.fillStyle(tint(EARTH.umber), 0.5 * rise);
    g.fillEllipse(x, y, halfLen * 2.1, 16);
    for (let i = 0; i < slabs; i++) {
      const f = (i / (slabs - 1)) * 2 - 1;
      const px = x + cos * halfLen * f;
      const py = y + sin * halfLen * f;
      // Taller in the middle, and each slab pops a fraction after its neighbour.
      const h = (16 + Math.cos(f * 1.5) * 12) * rise * (0.85 + 0.15 * Math.sin(t * 4 + i));
      stoneChunkLayered(
        g, tint, px, py + 6, -Math.PI / 2 + f * 0.22, h, 9 + Math.cos(f * 2) * 3,
        0.95, i * 0.37,
      );
    }
  }

  /** The reticle a titan hand tracks toward: a cracked footprint, not a plain circle. */
  static drawSmashMarker(
    g: Phaser.GameObjects.Graphics, tint: EarthColorFn,
    x: number, y: number, radius: number, t: number,
  ): void {
    g.clear();
    const pulse = 0.72 + 0.28 * Math.sin(t / 70);
    g.fillStyle(tint(EARTH.ember), 0.13 * pulse);
    g.fillCircle(x, y, radius * pulse);
    g.lineStyle(4, tint(EARTH.magma), 0.85 * pulse);
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i % 12) / 12 * TAU;
      const rr = radius * (0.94 + ((i * 31) % 7) / 7 * 0.12) * pulse;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();
    // Fracture lines already spreading out of the point of contact.
    g.lineStyle(2.5, tint(EARTH.gold), 0.6 * pulse);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + t / 900;
      g.lineBetween(x + Math.cos(a) * radius * 0.3, y + Math.sin(a) * radius * 0.3,
        x + Math.cos(a) * radius * 1.25, y + Math.sin(a) * radius * 1.25);
    }
  }
}

// ── StoneShield ───────────────────────────────────────────────────────────

export interface ShieldLook {
  /** Double Shield's plated grey rather than raw rock. */
  steel?: boolean;
  /** Shield Enhancement's brass banding. */
  enhanced?: boolean;
  depth?: number;
}

/**
 * The earth shield: a slab of stacked plates carried on one arm. It is a class rather than a
 * Rectangle because it has four independent states to show at once — how much HP is left (how
 * chipped it is), whether a bash is charging (how hot the seams glow), whether Shield Splinter
 * is about to blow it, and which of the three materials it is made of.
 */
export class StoneShield {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private x = 0;
  private y = 0;
  private angle = 0;
  private hp = 1;
  private charge = 0;
  private splinter = 0;
  private steel: boolean;
  private enhanced: boolean;
  /** Fixed chip pattern so the damage on the rim doesn't crawl around between frames. */
  private readonly chips = Array.from({ length: 9 }, () => 0.82 + Math.random() * 0.34);

  constructor(scene: Phaser.Scene, private tint: EarthColorFn, look: ShieldLook = {}) {
    this.steel = look.steel ?? false;
    this.enhanced = look.enhanced ?? false;
    this.g = scene.add.graphics().setDepth(look.depth ?? 7);
  }

  setEnhanced(on: boolean): void { this.enhanced = on; }
  setSteel(on: boolean): void { this.steel = on; }
  /** 0–1 bash charge. Drives the shudder and how far the molten seams have spread. */
  setCharge(v: number): void { this.charge = Phaser.Math.Clamp(v, 0, 1); }
  /** 0–1 Shield Splinter throb. Overrides charge — the plate is about to come apart. */
  setSplinter(v: number): void { this.splinter = Phaser.Math.Clamp(v, 0, 1); }
  /** 0–1 remaining HP. Bites chunks out of the rim as it falls. */
  setHp(v: number): void { this.hp = Phaser.Math.Clamp(v, 0, 1); }

  setPose(x: number, y: number, angle: number): void {
    this.x = x; this.y = y; this.angle = angle;
  }

  /** Blow the shield apart where it stands. The caller still owns `destroy`. */
  shatter(fx: EarthFx): void {
    fx.shatter(this.x, this.y, this.angle, this.body(), this.enhanced ? 12 : 9);
  }

  private body(): number {
    if (this.enhanced) return EARTH.brass;
    return this.steel ? EARTH.steel : EARTH.rock;
  }

  private rim(): number {
    if (this.enhanced) return EARTH.brassLit;
    return this.steel ? EARTH.chrome : EARTH.dust;
  }

  update(delta: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();

    const heat = Math.max(this.charge, this.splinter);
    // A charged shield judders in the grip; a splintering one judders hard.
    const shake = heat * (this.splinter > 0 ? 2.6 : 1.4);
    const cx = this.x + (Math.random() - 0.5) * shake;
    const cy = this.y + (Math.random() - 0.5) * shake;
    const a = this.angle;
    const cos = Math.cos(a), sin = Math.sin(a);
    // Across the shield face; the aim direction is its thickness.
    const px = -sin, py = cos;

    const halfW = (this.enhanced ? 30 : 25) * (1 + this.splinter * 0.16);
    const thick = this.enhanced ? 8 : 6.5;

    const face = (out: number, w: number, colour: number, alpha: number, chipped: boolean) => {
      const pts: Phaser.Geom.Point[] = [];
      const segs = this.chips.length;
      for (let i = 0; i < segs; i++) {
        const f = (i / (segs - 1)) * 2 - 1;
        // The outward face bows; the inner face is flat against the arm.
        const bow = (1 - f * f) * thick * 0.9;
        const bite = chipped ? (1 - this.hp) * (this.chips[i] - 0.7) * 16 : 0;
        pts.push(new Phaser.Geom.Point(
          cx + px * w * f + cos * (out + bow - bite),
          cy + py * w * f + sin * (out + bow - bite),
        ));
      }
      for (let i = segs - 1; i >= 0; i--) {
        const f = (i / (segs - 1)) * 2 - 1;
        pts.push(new Phaser.Geom.Point(
          cx + px * w * f - cos * thick * 0.55,
          cy + py * w * f - sin * thick * 0.55,
        ));
      }
      g.fillStyle(this.tint(colour), alpha);
      g.fillPoints(pts, true);
    };

    // Shadow slab, body, then a lit band along the leading edge.
    face(1.5, halfW * 1.06, EARTH.umber, 0.95, false);
    face(0, halfW, this.body(), 1, true);
    face(thick * 0.5, halfW * 0.78, this.rim(), this.enhanced ? 0.85 : 0.5, true);

    // Boss at the centre — the thing you actually bash people with.
    g.fillStyle(this.tint(EARTH.umber), 1);
    pebble(g, cx + cos * 2, cy + sin * 2, thick * 1.5, a, 3);
    g.fillStyle(this.tint(this.enhanced ? EARTH.brassLit : (this.steel ? EARTH.chrome : EARTH.sand)), 1);
    pebble(g, cx + cos * 2, cy + sin * 2, thick * 1.05, a + 0.4, 5);

    // Plate seams running across the face.
    g.lineStyle(1.6, this.tint(EARTH.crevice), 0.55);
    for (const f of [-0.55, 0.55]) {
      g.lineBetween(
        cx + px * halfW * f - cos * thick * 0.5, cy + py * halfW * f - sin * thick * 0.5,
        cx + px * halfW * f + cos * thick * 1.2, cy + py * halfW * f + sin * thick * 1.2,
      );
    }

    // Damage: as HP drops, fractures open across the plate.
    if (this.hp < 0.75) {
      const cracks = this.hp < 0.35 ? 3 : this.hp < 0.6 ? 2 : 1;
      g.lineStyle(2, this.tint(EARTH.crevice), 0.75);
      for (let i = 0; i < cracks; i++) {
        const f = -0.6 + i * 0.6;
        g.beginPath();
        g.moveTo(cx + px * halfW * f - cos * thick * 0.4, cy + py * halfW * f - sin * thick * 0.4);
        g.lineTo(cx + px * halfW * (f + 0.14) + cos * thick * 0.4, cy + py * halfW * (f + 0.14) + sin * thick * 0.4);
        g.lineTo(cx + px * halfW * (f - 0.05) + cos * thick * 1.3, cy + py * halfW * (f - 0.05) + sin * thick * 1.3);
        g.strokePath();
      }
    }

    // Heat: a bash charge lights the seams from inside; a splinter cooks the whole plate.
    if (heat > 0.02) {
      const glow = 0.35 + 0.4 * Math.sin(this.t * (this.splinter > 0 ? 26 : 14));
      const hot = this.splinter > 0 ? EARTH.ember : EARTH.magma;
      g.lineStyle(2 + heat * 3, this.tint(hot), heat * (0.5 + glow * 0.5));
      g.beginPath();
      for (let i = 0; i < this.chips.length; i++) {
        const f = (i / (this.chips.length - 1)) * 2 - 1;
        const spread = halfW * heat;
        if (Math.abs(f * halfW) > spread) continue;
        const bx = cx + px * halfW * f, by = cy + py * halfW * f;
        if (i === 0) g.moveTo(bx, by); else g.lineTo(bx + cos * thick * 0.8, by + sin * thick * 0.8);
      }
      g.strokePath();
      g.fillStyle(this.tint(this.splinter > 0 ? EARTH.gold : EARTH.magma), heat * 0.55 * glow);
      pebble(g, cx + cos * 2, cy + sin * 2, thick * (1.1 + heat), a, 5);
    }

    // Full charge is worth its own tell: a ring snaps around the boss.
    if (this.charge > 0.95) {
      g.lineStyle(2.5, this.tint(EARTH.gold), 0.5 + 0.5 * Math.sin(this.t * 22));
      g.strokeCircle(cx + cos * 4, cy + sin * 4, halfW * 0.62);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── EarthAura ─────────────────────────────────────────────────────────────

/**
 * Persistent stonework circling a fighter (Repair's scaffold). Driven by whoever owns it —
 * call `update` every frame with the fighter's position.
 */
export class EarthAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private slabs: { ang: number; d: number; len: number; w: number; speed: number; seed: number }[];

  constructor(
    scene: Phaser.Scene,
    private tint: EarthColorFn,
    private radius: number,
    depth = 3,
    count = 7,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.slabs = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      d: 0.72 + Math.random() * 0.3,
      len: 0.36 + Math.random() * 0.2,
      w: 0.13 + Math.random() * 0.06,
      speed: 0.5 + Math.random() * 0.5,
      seed: i * 0.43,
    }));
  }

  /** 0–1: how far along the repair is. Drives the ring closing in around the fighter. */
  update(delta: number, x: number, y: number, progress: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const close = 1 - easeIn(Phaser.Math.Clamp(progress, 0, 1)) * 0.45;

    g.fillStyle(this.tint(EARTH.umber), 0.2 * alpha);
    g.fillEllipse(x, y + 6, this.radius * 2.3 * close, this.radius * 1.3 * close);

    for (const s of this.slabs) {
      const a = s.ang + this.t * s.speed;
      const d = this.radius * s.d * close;
      const wob = Math.sin(this.t * 4 + s.seed * 9) * 2;
      stoneChunkLayered(
        g, this.tint,
        x + Math.cos(a) * d, y + Math.sin(a) * d * 0.72 + wob,
        a + Math.PI / 2, this.radius * s.len, this.radius * s.w,
        0.9 * alpha, s.seed,
      );
    }

    // Chisel sparks: the work being done, not just stone hanging in the air.
    const spark = (this.t * 3) % 1;
    for (let i = 0; i < 3; i++) {
      const a = this.t * 2.2 + i * 2.1;
      const d = this.radius * (0.5 + spark * 0.4);
      g.fillStyle(this.tint(EARTH.pale), (1 - spark) * 0.8 * alpha);
      pebble(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 2.2 * (1 - spark), a, i);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── EarthGather ───────────────────────────────────────────────────────────

/**
 * The Titan Form wind-up: rock hauled off the arena floor and stacked around the caster, with a
 * containment ring closing as the hold completes. Driven by progress rather than a tween,
 * because releasing Q early has to be able to cancel it mid-gather.
 */
export class EarthGather {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private shards = Array.from({ length: 16 }, (_, i) => ({
    ang: (i / 16) * TAU,
    phase: Math.random(),
    speed: 0.6 + Math.random() * 0.7,
    seed: i * 0.31,
  }));

  constructor(scene: Phaser.Scene, private tint: EarthColorFn, private radius = 84, depth = 14) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  update(delta: number, x: number, y: number, progress: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    const p = Phaser.Math.Clamp(progress, 0, 1);

    // Ground giving way underneath.
    g.fillStyle(this.tint(EARTH.crevice), 0.3 + 0.25 * p);
    g.fillEllipse(x, y + 10, this.radius * (1.4 + p), this.radius * (0.5 + p * 0.4));

    for (const s of this.shards) {
      // Each shard falls inward on its own loop, so the gather never stalls.
      const lt = (this.t * s.speed + s.phase) % 1;
      const r = this.radius * (1 - easeIn(lt)) * (1.15 - p * 0.35);
      const a = s.ang + this.t * 1.1;
      const lift = -easeIn(lt) * 26 * p;
      stoneChunkLayered(
        g, this.tint,
        x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8 + lift,
        a + Math.PI, 12 + p * 16, 4 + p * 3,
        0.9 * (1 - lt * 0.4), s.seed,
      );
    }

    // Stone stacking onto the caster: the column that becomes the titan.
    const stack = p * 34;
    for (let i = 0; i < 4; i++) {
      const f = i / 4;
      if (f > p) continue;
      stoneChunkLayered(
        g, this.tint, x, y - 6 - f * stack, -Math.PI / 2,
        14 + p * 8, 13 - i * 1.6, 0.95, i * 0.9,
      );
    }

    // Containment ring, faceted and closing.
    g.lineStyle(3 + p * 3, this.tint(p > 0.92 ? EARTH.gold : EARTH.dust), 0.5 + 0.45 * p);
    g.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i % 14) / 14 * TAU;
      const rr = this.radius * (1.1 - p * 0.5) * (0.94 + (i % 3) * 0.05);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.8;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── StoneGolem ────────────────────────────────────────────────────────────

/**
 * The summoned golem: a hunched slab of a body with boulder fists it swings, eye-slits lit from
 * inside, and cracks that open as it takes damage. Owns one Graphics repainted every frame —
 * a golem that never moves its arms reads as a crate.
 */
export class StoneGolem {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private swingT = 1;
  private swingKind: 'punch' | 'pound' = 'punch';
  private swingSide = 1;
  private facing = 0;
  private lastX = 0;
  private lastY = 0;
  private stepAccum = 0;

  constructor(scene: Phaser.Scene, private tint: EarthColorFn, depth = 6) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Fire a swing animation — the golem's own tell that it just hit something. */
  swing(kind: 'punch' | 'pound'): void {
    this.swingKind = kind;
    this.swingT = 0;
    this.swingSide = -this.swingSide;
  }

  /** True on the frames a step lands, so the caller can kick up dust under its feet. */
  update(delta: number, x: number, y: number, hpRatio: number, aimAngle: number): boolean {
    if (!this.g.active) return false;
    const dt = delta / 1000;
    this.t += dt;
    if (this.swingT < 1) this.swingT = Math.min(1, this.swingT + dt * (this.swingKind === 'pound' ? 1.6 : 2.6));
    this.facing = aimAngle;

    const moved = Phaser.Math.Distance.Between(x, y, this.lastX, this.lastY);
    this.lastX = x; this.lastY = y;
    this.stepAccum += moved;
    let stepped = false;
    if (this.stepAccum > 26) { this.stepAccum = 0; stepped = true; }

    const g = this.g;
    g.clear();

    const hp = Phaser.Math.Clamp(hpRatio, 0, 1);
    // Lumbering gait: the whole body rocks side to side as it walks.
    const gait = Math.sin(this.t * 4.4) * 3;
    const bob = Math.abs(Math.cos(this.t * 4.4)) * 2.4;
    const cx = x + gait * 0.4;
    const cy = y - bob;
    const cos = Math.cos(this.facing), sin = Math.sin(this.facing);
    const px = -sin, py = cos;

    // Ground shadow.
    g.fillStyle(this.tint(EARTH.crevice), 0.32);
    g.fillEllipse(x, y + 20, 46, 15);

    // Legs — two stubby columns that alternate.
    for (const s of [-1, 1]) {
      const stride = Math.sin(this.t * 4.4 + (s > 0 ? 0 : Math.PI)) * 4;
      stoneChunkLayered(
        g, this.tint,
        cx + px * s * 9, cy + py * s * 9 + 6,
        Math.PI / 2, 16, 7, 1, s + 4,
      );
      void stride;
    }

    // Torso: a broad slab leaning into whatever it is walking toward.
    stoneChunkLayered(g, this.tint, cx - cos * 4, cy + 2, this.facing, 26, 19, 1, 0.2);
    // Shoulder plates stacked on top of it.
    for (const s of [-1, 1]) {
      stoneChunkLayered(
        g, this.tint,
        cx + px * s * 16 - cos * 2, cy - 8,
        this.facing + s * 0.9, 15, 9, 1, s * 2 + 7,
      );
    }

    // Head: a wedge sunk between the shoulders, with lit slits for eyes.
    const hx = cx + cos * 6, hy = cy - 16;
    stoneChunkLayered(g, this.tint, hx - cos * 6, hy, this.facing, 15, 9, 1, 0.9);
    const glow = 0.6 + 0.4 * Math.sin(this.t * 3.2);
    for (const s of [-1, 1]) {
      g.fillStyle(this.tint(hp < 0.35 ? EARTH.ember : EARTH.gold), 0.55 + glow * 0.45);
      g.fillEllipse(hx + px * s * 3.4 + cos * 2, hy + py * s * 3.4 + sin * 2, 5.4, 3);
    }

    // Fists on springs, swung out along the aim when the golem strikes.
    const swing = this.swingT < 1
      ? (this.swingT < 0.35 ? -easeOut(this.swingT / 0.35) * 0.5 : (1 - easeIn((this.swingT - 0.35) / 0.65)))
      : 0;
    for (const s of [-1, 1]) {
      const active = this.swingKind === 'pound' || s === this.swingSide;
      const reach = 20 + (active ? swing * 26 : 0);
      const drop = this.swingKind === 'pound' && active ? swing * 16 : 0;
      const fx = cx + px * s * 20 + cos * reach;
      const fy = cy + py * s * 20 + sin * reach + 4 + drop + Math.sin(this.t * 4.4 + s) * 2;
      // Forearm bridging shoulder to fist, so the punch isn't a floating rock.
      const sxp = cx + px * s * 17, syp = cy - 4;
      stoneChunkLayered(
        g, this.tint, sxp, syp,
        Math.atan2(fy - syp, fx - sxp), Phaser.Math.Distance.Between(sxp, syp, fx, fy), 6,
        1, s * 3 + 1,
      );
      g.fillStyle(this.tint(EARTH.umber), 1);
      pebble(g, fx, fy, 10.5, this.t * 0.6 + s, s + 8);
      g.fillStyle(this.tint(EARTH.rock), 1);
      pebble(g, fx, fy, 8.6, this.t * 0.6 + s + 0.4, s + 8);
      g.fillStyle(this.tint(EARTH.sand), 1);
      pebble(g, fx - 2, fy - 2.4, 4, this.t * 0.6 + s + 1.1, s + 9);
      // Knuckles lit while a blow is in flight.
      if (active && this.swingT < 1) {
        g.lineStyle(2.5, this.tint(EARTH.magma), (1 - this.swingT) * 0.85);
        g.strokeCircle(fx, fy, 12);
      }
    }

    // Damage: fractures open across the torso as it is worn down.
    if (hp < 0.8) {
      const cracks = hp < 0.3 ? 4 : hp < 0.55 ? 3 : 2;
      g.lineStyle(2.2, this.tint(hp < 0.3 ? EARTH.ember : EARTH.crevice), 0.8);
      for (let i = 0; i < cracks; i++) {
        const f = (i / cracks) * 2 - 0.8;
        g.beginPath();
        g.moveTo(cx + px * 14 * f, cy - 10);
        g.lineTo(cx + px * 14 * f + px * 5, cy + 2);
        g.lineTo(cx + px * 14 * f - px * 3, cy + 14);
        g.strokePath();
      }
    }

    return stepped;
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── EarthAvatar ───────────────────────────────────────────────────────────

/** Concentric discs of one boulder hand, outermost first. */
const EARTH_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: EARTH.umber, alpha: 0.26 },
    { r: 7.2, color: EARTH.stone, alpha: 1 },
    { r: 4.6, color: EARTH.rock, alpha: 1 },
    // Lit facet up-and-left of centre. Dead centre and the hand reads as a bulb, not as rock
    // catching the light on one side.
    { r: 2.1, color: EARTH.sand, alpha: 0.95, ox: -2, oy: -2.1 },
  ],
  eyeWhite: EARTH.pale,
  eyePupil: EARTH.crevice,
  // Stone barely deforms: the squash here is a fraction of what water gets, which is most of
  // why the same rig reads as heavy rather than fluid.
  squash: { div: 20, x: 0.26, y: 0.12 },
};

/**
 * The earth character rig: two boulder hands with real facets cut into them, a pair of eyes,
 * and a crown of slabs hovering off the head like a broken ring of standing stones. The hands,
 * eyes and gestures come from BaseAvatar; what earth adds is the dust it stands in, the faceting
 * over the hands, and the crown above.
 */
export class EarthAvatar extends BaseAvatar {
  private fx: EarthFx;

  constructor(scene: Phaser.Scene, tint: EarthColorFn, depth = 6) {
    super(scene, tint, depth, EARTH_AVATAR);
    this.fx = new EarthFx(scene, tint);
  }

  /**
   * Mastery tell for Unbreakable — a permanent, readable upgrade to the character so a mastered
   * earth user is identifiable before they cast anything: molten eyes, a granite rim welded
   * around each hand over a wider dust corona, and (in `drawExtras`) a crown that fuses from
   * loose slabs into a solid armoured collar with two boulders riding it. Shape changes, not
   * brighter tints — a tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? EARTH.gold : EARTH.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13.5 : 10);
      halo.setFillStyle(this.tint(on ? EARTH.dust : EARTH.umber), on ? 0.3 : 0.26);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(EARTH.umber), 1);
      else shell.setStrokeStyle();
    });
  }

  /**
   * `brace` — both hands hauled in behind the shield and shaking with the strain, the pose a
   * charging bash holds. It reads as effort precisely because the hands come *closer* to the
   * body: pushing them out along the aim would read as a beam being fired instead.
   */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    const strain = (Math.random() - 0.5) * 0.16;
    return {
      ang: this.holdAngle + side * 1.05 + strain,
      dist: 17 + Math.abs(Math.sin(this.t * 9)) * 2.5,
      scale: idle.scale * 1.22,
    };
  }

  /** Fast-moving hands shed grit. */
  protected emitTrail(x: number, y: number): void {
    this.fx.grit(x, y, 1, { speed: 16, size: 1.7, life: 460, fall: 44, depth: 5 });
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    // Earth doesn't glow — it casts. The under-layer is the shadow it sits in plus the loose
    // stones that have collected around its feet.
    g.fillStyle(this.tint(EARTH.crevice), a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 8, 54 * this.intensity, 26 * this.intensity);
    g.fillStyle(this.tint(EARTH.umber), a * 0.22 * this.intensity);
    g.fillEllipse(x, y + 10, 34 * this.intensity, 15 * this.intensity);
    for (let i = 0; i < 4; i++) {
      const ang = this.t * 0.25 + (i / 4) * TAU;
      const d = 22 * this.intensity;
      g.fillStyle(this.tint(EARTH.stone), a * 0.55);
      pebble(g, x + Math.cos(ang) * d, y + 11 + Math.sin(ang) * d * 0.3, 3.2, ang, i);
    }
  }

  /**
   * Faceting cut over both hands plus a crown of slabs turning over the head. Drawn over the
   * sprite — beneath it only the dark edges would clear the 22px body and the crown would read
   * as a stray spike. Rooted at the crown (y - 18) so it never covers the face.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const mastery = this.mastered ? 1.35 : 1;
    const rootY = y - 18;

    // Hard facets over each ball hand: the single cheapest thing that stops the hands reading
    // as spheres. The rig's live hand positions are right here, so this costs nothing.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      const spin = this.t * 0.5 + i * 2.1;
      g.fillStyle(this.tint(EARTH.shale), alpha * 0.75);
      pebble(g, hx, hy, 6.6 * (this.mastered ? 1.15 : 1), spin, i * 2);
      g.fillStyle(this.tint(EARTH.pale), alpha * 0.55);
      pebble(g, hx - 2, hy - 2.2, 2.6, spin + 1.2, i * 2 + 1);
      if (this.mastered) {
        // Welded granite band — the mastery read at hand scale.
        g.lineStyle(1.8, this.tint(EARTH.dust), alpha * 0.8);
        g.strokeCircle(hx, hy, 9.4);
      }
    }

    // The crown: slabs standing off the head on a shallow ellipse, each leaning outward and
    // rocking, so it reads as a ring of megaliths orbiting rather than a hat.
    const crownN = this.mastered ? 6 : 4;
    for (let i = 0; i < crownN; i++) {
      const p = this.t * 0.9 + (i / crownN) * TAU;
      const depthF = Math.sin(p);                       // behind the head vs in front of it
      const cx = x + Math.cos(p) * 19 * mastery;
      const cy = rootY - 6 + depthF * 5;
      const lean = Math.cos(p) * 0.42;
      const h = (13 + Math.sin(this.t * 3 + i) * 1.6) * mastery * this.intensity;
      stoneChunkLayered(
        g, this.tint, cx, cy, -Math.PI / 2 + lean,
        h, 4.6 * mastery, alpha * (0.72 + depthF * 0.24), i * 0.7,
      );
    }

    // A slab keystone directly over the crown ties the ring together.
    stoneChunkLayered(
      g, this.tint, x, rootY - 4, -Math.PI / 2 + Math.sin(this.t * 1.6) * 0.12,
      (15 + Math.sin(this.t * 2.4) * 2) * mastery * this.intensity, 5.4 * mastery,
      a * 0.95, 4.2,
    );

    // Dust sifting off the crown, so the stones look like they are grinding against each other.
    const fall = (this.t * 1.1) % 1;
    for (let i = 0; i < 2; i++) {
      const p = this.t * 0.9 + i * Math.PI;
      g.fillStyle(this.tint(EARTH.sand), alpha * 0.5 * (1 - fall));
      pebble(g, x + Math.cos(p) * 19 * mastery, rootY + fall * 16, 1.8 * (1 - fall * 0.5), p, i);
    }

    if (this.mastered) {
      // Mastery boulders riding the collar, orbiting slower and lower than the crown itself so
      // the two rings read as one heavy silhouette rather than as a blur.
      for (let i = 0; i < 2; i++) {
        const p = -this.t * 0.7 + (i / 2) * TAU;
        const bx = x + Math.cos(p) * 26;
        const by = y - 26 + Math.sin(p) * 7;
        g.fillStyle(this.tint(EARTH.umber), alpha * 0.9);
        pebble(g, bx, by, 6.4, p, i * 3);
        g.fillStyle(this.tint(EARTH.rock), alpha * 0.95);
        pebble(g, bx, by, 5, p + 0.5, i * 3 + 1);
        g.fillStyle(this.tint(EARTH.gold), alpha * 0.7);
        pebble(g, bx - 1.4, by - 1.6, 1.8, p + 1, i * 3 + 2);
      }
      // Molten seam running around the collar.
      g.lineStyle(2, this.tint(EARTH.magma), alpha * (0.35 + 0.25 * Math.sin(this.t * 4)));
      g.strokeEllipse(x, y - 24, 50, 15);
    }
  }
}
