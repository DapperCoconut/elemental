import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Life renders: the eight bespoke plants, the sprouting
 * character rig, the overgrowth aura, and the one-shot effects every life ability fires off.
 *
 * The generic halves — the animation runner and the ball-hands-and-eyes rig — come from
 * ElementVisuals.ts. What lives here is what makes life life: the curling vine, the leaf,
 * and the flora built out of them.
 *
 * Life has no skin yet, but every call still routes through the owner's
 * `lifeColor` mapper, so the day one lands it is a table edit in SkinsKit rather than a
 * sweep through this file. That is also why the eight seed accents are palette entries rather
 * than literals scattered through the plant art.
 */

/** `(base) => displayed` — SkinsKit.lifeColor bound to one owner. */
export type LifeColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const LIFE = {
  soil: 0x2a1d12,
  bark: 0x6b4a2a,
  shade: 0x1d4718,
  deep: 0x2d6b28,
  stem: 0x44aa3a,
  leaf: 0x5ec44a,
  lime: 0x8fdd5a,
  pale: 0xc8f59a,
  glow: 0xe8ffd0,
  white: 0xffffff,
  pollen: 0xffe98a,
  rot: 0x7a5a2a,
  /** Deep chlorophyll green — eye pupils and anything that reads as "inside the plant". */
  ink: 0x14300f,
  /** Sap green, brighter than any leaf: the colour of the link Thrive! opens. */
  vital: 0x44ff88,
  /** Cherry-blossom pink, for the Sakura petals thrown by the upgraded click. */
  blossom: 0xff88aa,
  /** Drab thorn green — barbs and the seeds Thorn Thrash sprays. */
  thorn: 0x7a9c3e,
  // Seed accents — the plants and everything that references one of them.
  sun: 0xffcc22,
  rose: 0xdd3366,
  lily: 0x88ffcc,
  night: 0x8844cc,
  pitcher: 0x55aa44,
  cotton: 0xeeeeff,
  /** The Sunflower's link at full burn — the red its gold ramps into. */
  solar: 0xff3a1a,
  /** Helicopter rotor green — a yellower, harder leaf than the rest of the garden. */
  heli: 0xa6d63c,
  /** Mushroom Colony caps. */
  shroom: 0xd2783a,
  /** Frost Lily petals and shards, and the white of the rime on them. */
  frost: 0x9fe6ff,
  ice: 0xe6f8ff,
  /** Flaming Sprout: the outer flame and the ember core inside it. */
  flame: 0xff6a1a,
  ember: 0xffb030,
  /** Lotus petals. */
  lotus: 0xffa8d8,
  /** Pitcher's sprinkler water, and every plant it has watered. */
  water: 0x5ec0ff,
} as const;

// ── Primitives ────────────────────────────────────────────────────────────

/** Where a stem ended up, so a leaf, bud or bloom can be hung off its tip. */
export interface StemTip { x: number; y: number; angle: number }

/**
 * A curling vine segment: thick at the root, tapering to a point, and turning harder the
 * further out it goes so the tip coils rather than bending in a uniform arc. This is the
 * primitive every life shape is built from — sprigs, blooms, roots, the aura's grass and the
 * avatar's crown all call it.
 *
 * Note the curvature ramp (`0.3 + f * 1.7`) is the whole trick. A constant turn rate gives a
 * banana; a growing one gives the tendril curl that reads instantly as a living plant.
 */
export function vineStem(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curl = 0, segs = 9,
): StemTip {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  const step = len / segs;
  let x = cx, y = cy, a = angle;

  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    // Taper is deliberately not linear: a stem holds its thickness then narrows late.
    const w = halfW * Math.pow(1 - f, 0.7);
    const nx = -Math.sin(a), ny = Math.cos(a);
    left.push({ x: x + nx * w, y: y + ny * w });
    right.push({ x: x - nx * w, y: y - ny * w });
    a += (curl * (0.3 + f * 1.7)) / segs;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
  }

  g.beginPath();
  g.moveTo(left[0].x, left[0].y);
  for (const p of left) g.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
  g.closePath();
  g.fillPath();
  // Rounded root, so a stem growing out of something joins it instead of butting against it.
  g.fillCircle(cx, cy, halfW);

  return { x, y, angle: a };
}

/**
 * A single leaf blade: a pointed oval swelling to its widest a third of the way out, with a
 * midrib running to the tip. The rib matters more than it sounds — without it the blade is
 * just a green almond, and a pair of them reads as a butterfly rather than foliage.
 */
export function leafBlade(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  droop = 0,
): void {
  const segs = 8;
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    // Widest at f≈0.35, pinched at both ends.
    const w = halfW * Math.sin(Math.PI * Math.pow(f, 0.72));
    const bend = droop * f * f;
    const px = cx + Math.cos(angle) * len * f - Math.sin(angle) * bend;
    const py = cy + Math.sin(angle) * len * f + Math.cos(angle) * bend;
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    left.push({ x: px + nx * w, y: py + ny * w });
    right.push({ x: px - nx * w, y: py - ny * w });
  }
  g.beginPath();
  g.moveTo(left[0].x, left[0].y);
  for (const p of left) g.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
  g.closePath();
  g.fillPath();
}

/** Midrib + two side veins, drawn over a blade in a darker shade. */
function leafVeins(
  g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number, droop: number, alpha: number,
): void {
  const at = (f: number) => {
    const bend = droop * f * f;
    return {
      x: cx + Math.cos(angle) * len * f - Math.sin(angle) * bend,
      y: cy + Math.sin(angle) * len * f + Math.cos(angle) * bend,
    };
  };
  g.lineStyle(Math.max(0.7, halfW * 0.16), tint(LIFE.shade), 0.55 * alpha);
  const tip = at(1);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(tip.x, tip.y);
  g.strokePath();
  for (const f of [0.34, 0.6]) {
    const root = at(f);
    const w = halfW * Math.sin(Math.PI * Math.pow(f, 0.72)) * 0.85;
    for (const s of [1, -1]) {
      g.beginPath();
      g.moveTo(root.x, root.y);
      g.lineTo(
        root.x - Math.sin(angle) * w * s + Math.cos(angle) * len * 0.12,
        root.y + Math.cos(angle) * w * s + Math.sin(angle) * len * 0.12,
      );
      g.strokePath();
    }
  }
}

/** Layered leaf: shaded underside, body, lit upper edge, veins. */
export function leafLayered(
  g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number,
  droop: number, alpha: number, body: number = LIFE.leaf,
): void {
  g.fillStyle(tint(LIFE.shade), alpha * 0.75);
  leafBlade(g, cx, cy + 1.2, angle, len, halfW, droop);
  g.fillStyle(tint(body), alpha);
  leafBlade(g, cx, cy, angle, len, halfW, droop);
  g.fillStyle(tint(LIFE.lime), alpha * 0.55);
  leafBlade(g, cx, cy - 0.9, angle, len * 0.88, halfW * 0.6, droop * 0.8);
  leafVeins(g, tint, cx, cy, angle, len, halfW, droop, alpha);
}

/**
 * Stem plus leaf pairs — the composite behind almost every life effect. Leaves alternate
 * sides up the stem and shrink toward the tip, which is what separates a plant from a stick.
 */
export function sprig(
  g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curl: number, alpha: number, leaves = 2,
): StemTip {
  g.fillStyle(tint(LIFE.shade), alpha * 0.8);
  vineStem(g, cx, cy + 1.4, angle, len, halfW * 1.15, curl);
  g.fillStyle(tint(LIFE.stem), alpha);
  const tip = vineStem(g, cx, cy, angle, len, halfW, curl);
  g.fillStyle(tint(LIFE.lime), alpha * 0.5);
  vineStem(g, cx, cy - 0.8, angle, len * 0.82, halfW * 0.42, curl);

  for (let i = 0; i < leaves; i++) {
    const f = 0.3 + (i / Math.max(1, leaves)) * 0.5;
    const a = angle + curl * (0.3 + f * 1.7) * f;
    const lx = cx + Math.cos(a) * len * f;
    const ly = cy + Math.sin(a) * len * f;
    const side = i % 2 === 0 ? 1 : -1;
    const ll = len * (0.42 - i * 0.07);
    if (ll < 3) continue;
    leafLayered(g, tint, lx, ly, a + side * 1.05, ll, ll * 0.34, side * ll * 0.2, alpha);
  }
  return tip;
}

/** A ring of rounded petals around a core — the shared skeleton of every flower head. */
export function bloomHead(
  g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
  cx: number, cy: number, radius: number,
  petals: number, petalColor: number, coreColor: number,
  alpha: number, spin = 0, rings = 1,
): void {
  for (let r = rings - 1; r >= 0; r--) {
    const scale = 1 - r * 0.28;
    const off = r * 0.4 + spin;
    g.fillStyle(tint(petalColor), alpha * (1 - r * 0.12));
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * TAU + off;
      leafBlade(
        g,
        cx + Math.cos(a) * radius * 0.3 * scale,
        cy + Math.sin(a) * radius * 0.3 * scale,
        a, radius * 0.78 * scale, radius * 0.3 * scale, 0,
      );
    }
  }
  g.fillStyle(tint(coreColor), alpha);
  g.fillCircle(cx, cy, radius * 0.3);
  g.fillStyle(tint(LIFE.soil), alpha * 0.45);
  g.fillCircle(cx, cy, radius * 0.19);
}

export interface BlastOpts {
  /** Petal/leaf shards flung outward. Defaults to radius/6. */
  shards?: number;
  /** Drifting spore puffs. Defaults to radius/26. */
  spores?: number;
  /** Leave a fading patch of new growth on the ground. Default true. */
  overgrow?: boolean;
  /** Render depth of the bloom body. Default 6. */
  depth?: number;
  /** Total life of the bloom body in ms. Defaults to scale with radius. */
  duration?: number;
}

export interface PollenOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Pixels the mote floats upward over its life. Negative to make it sink. */
  rise?: number;
  color?: number;
}

// ── LifeFx ────────────────────────────────────────────────────────────────

/**
 * One-shot life effects. Cheap to construct — build one per owner (or per cast, as the
 * ability file does) and hand it the owner's colour mapper.
 */
export class LifeFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: LifeColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * A growth front racing outward: a ragged ring with new shoots pushing out of it. The
   * shoots are what make it read as *spreading* rather than as a shockwave — a bare ring in
   * green just looks like a recoloured explosion.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 3.5), 36, 110);
    const jitter = Array.from({ length: segs }, () => 0.95 + Math.random() * 0.1);
    const shoots = Array.from({ length: Math.max(5, Math.round(toR / 26)) }, () => ({
      ang: Math.random() * TAU,
      len: 0.1 + Math.random() * 0.13,
      curl: (Math.random() - 0.5) * 2.4,
    }));
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const fade = 1 - t * t;
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.8)), c, 0.85 * fade);
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r * (1 + (jitter[i % segs] - 1) * (1 - t * 0.5));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      // Shoots riding the front.
      g.fillStyle(c, 0.8 * fade);
      for (const s of shoots) {
        vineStem(g, x + Math.cos(s.ang) * r, y + Math.sin(s.ang) * r, s.ang, toR * s.len * easeOut(t), width * 0.7 * fade, s.curl);
      }
    });
  }

  /** Blown-out pale-green core — the first two frames of anything bursting into life. */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, LIFE.glow, LIFE.pale, depth);
  }

  /**
   * Drifting pollen: motes that fan out, slow down, rise as they lose momentum and flutter
   * sideways the whole way. The flutter is the point — pollen that travels in a straight
   * line is just a spark, and life should never look ballistic.
   */
  pollen(x: number, y: number, count: number, opts: PollenOpts = {}): void {
    const speed = opts.speed ?? 110;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3;
    const life = opts.life ?? 620;
    const rise = opts.rise ?? 30;
    const depth = opts.depth ?? 6;
    const color = opts.color ?? LIFE.pollen;

    const motes = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 0.9),
        r: size * (0.5 + Math.random() * 0.9),
        flutter: 4 + Math.random() * 9,
        rate: 5 + Math.random() * 7,
        phase: Math.random() * TAU,
        bright: Math.random() < 0.4,
        delay: Math.random() * 0.2,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const m of motes) {
        const lt = (t - m.delay) / (1 - m.delay);
        if (lt <= 0) continue;
        const travel = m.v * easeOut(lt) * (life / 1000);
        const wobble = Math.sin(m.phase + lt * m.rate) * m.flutter * lt;
        const ex = x + m.cos * travel - m.sin * wobble;
        const ey = y + m.sin * travel + m.cos * wobble - rise * easeIn(lt);
        const fade = 1 - lt;
        const r = m.r * fade;
        g.fillStyle(this.tint(m.bright ? LIFE.pale : color), 0.9 * fade);
        // Four tiny lobes: a mote of pollen is a clump, not a dot.
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * TAU + lt * 3;
          g.fillCircle(ex + Math.cos(a) * r * 0.45, ey + Math.sin(a) * r * 0.45, r * 0.62);
        }
        g.fillStyle(this.tint(LIFE.white), 0.5 * fade * fade);
        g.fillCircle(ex, ey, r * 0.4);
      }
    });
  }

  /** Fat spore clouds that swell and drift — the tail end of anything that bursts. */
  spores(x: number, y: number, count: number, radius: number, depth = 4, color: number = LIFE.deep): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.2,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.25 + Math.random() * 0.3),
      drift: (Math.random() - 0.5) * 28,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1150, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const px = x + p.ox + p.drift * lt;
        const py = y + p.oy - 40 * lt;
        g.fillStyle(this.tint(color), 0.26 * (1 - lt));
        g.fillCircle(px, py, p.r * (0.6 + lt * 1.2));
        g.fillStyle(this.tint(LIFE.lime), 0.13 * (1 - lt));
        g.fillCircle(px, py, p.r * (0.4 + lt * 0.8));
      }
    });
  }

  /**
   * A lingering patch of new growth: moss blotches with grass tufts pushing through, which
   * yellow off and wither. Deliberately ragged — a solid green disc reads as a bug.
   */
  overgrowth(x: number, y: number, radius: number, depth = 1): void {
    const blots = Array.from({ length: 7 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.55;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.75,
        r: radius * (0.3 + Math.random() * 0.45),
      };
    });
    const tufts = Array.from({ length: 9 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.8;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7,
        len: radius * (0.16 + Math.random() * 0.2),
        lean: (Math.random() - 0.5) * 1.6,
      };
    });
    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;
      for (const b of blots) {
        g.fillStyle(this.tint(LIFE.deep), 0.17 * a);
        g.fillEllipse(b.x, b.y, b.r * 2, b.r * 1.6);
        g.fillStyle(this.tint(LIFE.stem), 0.1 * a);
        g.fillEllipse(b.x, b.y, b.r * 1.2, b.r * 0.9);
      }
      // Blades stand up, then wither back down and brown off.
      const stand = Math.min(1, t * 5);
      const wither = Math.max(0, (t - 0.5) / 0.5);
      g.fillStyle(this.tint(wither > 0.4 ? LIFE.rot : LIFE.leaf), 0.6 * a);
      for (const s of tufts) {
        vineStem(g, s.x, s.y, -Math.PI / 2 + s.lean * 0.3, s.len * stand * (1 - wither * 0.5), 1.6 * a, s.lean);
      }
    });
  }

  /**
   * Life bursting out of a point: a ring of sprigs unfurling from a swelling seed pod. Used
   * wherever something takes root rather than detonates — planting, fertilising, ignition.
   */
  bloomBurst(x: number, y: number, radius: number, petals = 10, depth = 4): void {
    const seeds = Array.from({ length: petals }, (_, i) => ({
      // Uneven lengths, staggered roots and per-sprig delays: sprigs fired from one point at
      // one length read as a starburst, so every one of these is deliberately out of step.
      ang: (i / petals) * TAU + (Math.random() - 0.5) * 0.85,
      root: radius * (0.1 + Math.random() * 0.28),
      len: radius * (0.4 + Math.random() * 0.7),
      w: radius * (0.08 + Math.random() * 0.07),
      curl: (Math.random() - 0.5) * 3.2,
      delay: Math.random() * 0.32,
    }));
    this.anim(depth, 500, (g, t) => {
      // Seed pod at the base, so the sprigs grow out of something.
      const pod = 1 - easeIn(t);
      g.fillStyle(this.tint(LIFE.deep), 0.45 * pod);
      g.fillCircle(x, y, radius * 0.42 * easeOut(t));
      g.fillStyle(this.tint(LIFE.lime), 0.5 * pod);
      g.fillCircle(x, y, radius * 0.26 * easeOut(t));
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        if (lt <= 0) continue;
        const grow = easeOut(lt);
        const fade = 1 - easeIn(lt);
        sprig(
          g, this.tint,
          x + Math.cos(s.ang) * s.root * grow, y + Math.sin(s.ang) * s.root * grow,
          s.ang, s.len * grow, s.w * (1 - lt * 0.35), s.curl * lt, 0.85 * fade, 2,
        );
      }
    });
    this.ring(x, y, radius * 0.15, radius, LIFE.lime, 420, 3, depth);
  }

  /**
   * The boiling mass of foliage at the centre of a life detonation: overlapping lobes that
   * swell and roll, wrapped in leaves pushing out of the surface. Reads as volume, where a
   * flat expanding disc always reads as placeholder.
   */
  thicket(x: number, y: number, radius: number, duration: number, depth = 6): void {
    const lobes = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + Math.random() * 0.5,
      off: 0.25 + Math.random() * 0.4,
      r: 0.4 + Math.random() * 0.28,
      phase: Math.random() * TAU,
    }));
    const fronds = Array.from({ length: 11 }, (_, i) => ({
      ang: (i / 11) * TAU + Math.random() * 0.4,
      len: 0.5 + Math.random() * 0.5,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.35 + easeOut(Math.min(1, t * 1.5)) * 0.8;
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      const wob = t * 8;

      const shell = [
        { c: LIFE.shade, s: 1.05, a: 0.55 },
        { c: LIFE.deep, s: 0.86, a: 0.8 },
        { c: LIFE.stem, s: 0.62, a: 0.85 },
        { c: LIFE.lime, s: 0.36, a: 0.9 },
      ];
      for (const layer of shell) {
        g.fillStyle(this.tint(layer.c), layer.a * fade);
        g.fillCircle(x, y, radius * grow * layer.s);
        for (const l of lobes) {
          const lr = radius * grow * layer.s * l.r * (0.85 + Math.sin(wob + l.phase) * 0.15);
          const ld = radius * grow * layer.s * l.off;
          g.fillCircle(x + Math.cos(l.ang) * ld, y + Math.sin(l.ang) * ld, lr);
        }
      }
      // Leaves breaking the silhouette, so the mass has an edge made of plant.
      for (const f of fronds) {
        const a = f.ang + Math.sin(wob * 0.4 + f.phase) * 0.14;
        const r = radius * grow * 0.75;
        leafLayered(
          g, this.tint,
          x + Math.cos(a) * r, y + Math.sin(a) * r, a,
          radius * grow * f.len * 0.55, radius * grow * f.len * 0.18, 0, 0.85 * fade,
        );
      }
      if (t < 0.5) {
        g.fillStyle(this.tint(LIFE.glow), (1 - t / 0.5) * 0.8);
        g.fillCircle(x, y, radius * grow * 0.2);
      }
    });
  }

  /** Flash + thicket + stacked growth fronts + petal shards + pollen + spores + ground patch. */
  verdantBlast(x: number, y: number, radius: number, opts: BlastOpts = {}): void {
    const shards = opts.shards ?? Math.round(radius / 6);
    const sporeCount = opts.spores ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(320 + radius * 1.5);
    const depth = opts.depth ?? 6;

    if (opts.overgrow !== false) this.overgrowth(x, y, radius * 0.6);
    this.thicket(x, y, radius * 0.74, dur, depth);
    this.flash(x, y, radius * 0.36, depth + 1);
    this.bloomBurst(x, y, radius * 0.9, Math.max(8, Math.round(radius / 9)), depth);
    this.ring(x, y, radius * 0.2, radius * 1.12, LIFE.pale, Math.round(dur * 0.75), 5, depth);
    this.scene.time.delayedCall(80, () => this.ring(x, y, radius * 0.15, radius * 1.38, LIFE.lime, dur, 4, depth));
    this.scene.time.delayedCall(170, () => this.ring(x, y, radius * 0.1, radius * 1.55, LIFE.deep, dur, 3, depth));
    this.petalShards(x, y, shards, radius * 2.1, Math.round(dur * 1.4), depth);
    this.pollen(x, y, shards, { speed: radius * 1.5, size: 3 + radius / 55, life: Math.round(dur * 1.5), rise: radius * 0.5, depth });
    if (sporeCount > 0) this.spores(x, y, sporeCount, radius * 0.85, depth - 2);
  }

  /** Torn leaves and petals flung outward, tumbling as they go. */
  petalShards(x: number, y: number, count: number, speed: number, life: number, depth = 6, color: number = LIFE.leaf): void {
    const bits = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 0.85),
        len: 5 + Math.random() * 7,
        spin: (Math.random() - 0.5) * 16,
        tilt: Math.random() * TAU,
        delay: Math.random() * 0.15,
      };
    });
    this.anim(depth, life, (g, t) => {
      for (const b of bits) {
        const lt = (t - b.delay) / (1 - b.delay);
        if (lt <= 0) continue;
        const d = b.v * easeOut(lt) * (life / 1000);
        const ex = x + b.cos * d;
        const ey = y + b.sin * d + 26 * lt * lt;
        const fade = 1 - lt;
        // Tumble: the blade rotates as it flies, so a shower reads as debris not as rays.
        g.fillStyle(this.tint(color), 0.9 * fade);
        leafBlade(g, ex, ey, b.tilt + lt * b.spin, b.len * fade, b.len * 0.34 * fade, 0);
      }
    });
  }

  /** Muzzle burst for a thrown petal — the blade leaving the hand plus a puff of pollen. */
  petalMuzzle(x: number, y: number, angle: number, scale = 1, depth = 6, color: number = LIFE.leaf): void {
    this.anim(depth, 140, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(color), 0.8 * fade);
      leafBlade(g, x, y, angle, 24 * scale * (0.6 + t * 0.9), 7 * scale * fade, 0);
      g.fillStyle(this.tint(LIFE.glow), 0.85 * fade);
      g.fillCircle(x, y, 5 * scale * (1 - t * 0.4));
      // Two small leaves shed sideways as the shot leaves.
      g.fillStyle(this.tint(LIFE.lime), 0.5 * fade);
      for (const s of [1, -1]) {
        leafBlade(g, x, y, angle + s * 1.9, 11 * scale * fade, 3 * scale * fade, 0);
      }
    });
    this.pollen(x, y, 3, { angle, spread: 0.7, speed: 95, size: 2.2, life: 320, rise: 14, depth });
  }

  /** Thorns spat out in every direction — short, hard, and unmistakably not petals. */
  thornSpray(x: number, y: number, count: number, depth = 6): void {
    const thorns = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return { cos: Math.cos(a), sin: Math.sin(a), ang: a, v: 150 + Math.random() * 160, len: 9 + Math.random() * 7 };
    });
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - easeIn(t);
      for (const th of thorns) {
        const d = th.v * easeOut(t) * 0.42;
        const ex = x + th.cos * d, ey = y + th.sin * d;
        g.fillStyle(this.tint(LIFE.shade), 0.85 * fade);
        vineStem(g, ex, ey, th.ang, th.len, 2.6 * fade, 0, 3);
        g.fillStyle(this.tint(LIFE.pale), 0.7 * fade);
        vineStem(g, ex, ey, th.ang, th.len * 0.6, 1.2 * fade, 0, 3);
      }
    });
  }

  /**
   * A vine whipping out from one point to another and snapping back. Used for every link
   * between two things — a lashing root, a healing tether, a damage share.
   */
  vineLash(x1: number, y1: number, x2: number, y2: number, color: number = LIFE.stem, depth = 6): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const waves = 2 + Math.random() * 1.5;
    const phase = Math.random() * TAU;
    const segs = Math.max(8, Math.round(dist / 12));
    this.anim(depth, 300, (g, t) => {
      // Snaps taut, then goes slack and fades — a straight line the whole way reads as a laser.
      const reach = Math.min(1, t * 3);
      const slack = t < 0.33 ? 0 : (t - 0.33) / 0.67;
      const fade = 1 - easeIn(t);
      const amp = dist * 0.09 * (1 - reach * 0.7 + slack * 0.9);
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= segs; i++) {
        const f = (i / segs) * reach;
        const w = Math.sin(f * Math.PI * waves + phase) * amp * Math.sin(f * Math.PI);
        pts.push({
          x: x1 + (x2 - x1) * f - Math.sin(ang) * w,
          y: y1 + (y2 - y1) * f + Math.cos(ang) * w,
        });
      }
      for (const layer of [
        { c: LIFE.shade, w: 5, a: 0.6 },
        { c: color, w: 3.2, a: 0.9 },
        { c: LIFE.lime, w: 1.3, a: 0.6 },
      ]) {
        g.lineStyle(layer.w * fade, this.tint(layer.c), layer.a * fade);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) g.lineTo(p.x, p.y);
        g.strokePath();
      }
      // Leaves riding the vine.
      g.fillStyle(this.tint(LIFE.leaf), 0.85 * fade);
      for (let i = 2; i < pts.length - 1; i += 3) {
        const p = pts[i];
        const side = i % 2 === 0 ? 1 : -1;
        leafBlade(g, p.x, p.y, ang + side * 1.2, 8 * fade, 3 * fade, 0);
      }
    });
  }

  /**
   * Rising leaves and a soft ring — the readable "something good happened here". Mint is
   * healing; pass gold for fertiliser, so a heal and a buff never look like the same event.
   */
  healBloom(x: number, y: number, radius: number, depth = 6, color: number = LIFE.lily): void {
    const leaves = Array.from({ length: 7 }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.1,
      lean: (Math.random() - 0.5) * 0.9,
      len: radius * (0.3 + Math.random() * 0.25),
      delay: Math.random() * 0.35,
    }));
    this.anim(depth, 700, (g, t) => {
      for (const l of leaves) {
        const lt = (t - l.delay) / (1 - l.delay);
        if (lt <= 0) continue;
        const fade = 1 - easeIn(lt);
        leafLayered(
          g, this.tint,
          x + l.ox + l.lean * 14 * lt, y - radius * 1.2 * easeOut(lt),
          -Math.PI / 2 + l.lean, l.len, l.len * 0.36, l.lean * 5, 0.85 * fade, color,
        );
      }
    });
    this.ring(x, y, radius * 0.2, radius, color, 460, 3, depth);
  }

  /**
   * Column of growth punching upward — the vertical half of a very big bloom. Kept to a few
   * broad stems: thin ones read as scratches over the thicket beneath.
   */
  canopy(x: number, y: number, radius: number, height: number, depth = 7): void {
    const trunks = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.42,
      h: height * (0.7 + Math.random() * 0.4),
      w: radius * (0.34 + Math.random() * 0.2),
      curl: (Math.random() - 0.5) * 1.8,
      phase: Math.random() * TAU,
      delay: i * 0.05,
    }));
    this.anim(depth, 800, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      // Root mound at the base, so the column looks anchored in the ground.
      g.fillStyle(this.tint(LIFE.soil), 0.5 * fade);
      g.fillEllipse(x, y, radius * 1.6, radius * 0.7);
      for (const tr of trunks) {
        const rise = easeOut(Math.max(0, (t - tr.delay) / (1 - tr.delay)));
        sprig(
          g, this.tint, x + tr.ox, y + radius * 0.2,
          -Math.PI / 2, tr.h * rise, tr.w * (1 - t * 0.3),
          tr.curl + Math.sin(t * 6 + tr.phase) * 0.25, 0.9 * fade, 3,
        );
      }
      // Canopy spreading once the trunks top out.
      if (t > 0.3) {
        const spread = (t - 0.3) / 0.7;
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.42;
          leafLayered(
            g, this.tint, x, y - height * 0.85, a,
            radius * (1 + spread * 1.8), radius * (0.35 + spread * 0.4), 0, 0.75 * fade,
          );
        }
      }
    });
    this.pollen(x, y - height * 0.5, 9, {
      speed: radius * 1.2, spread: 0.9, angle: -Math.PI / 2,
      size: 3.4, life: 850, rise: height * 0.4, depth,
    });
  }

  /**
   * Inward-spiralling gather: runners drawn in from the rim toward a swelling seed while a
   * containment ring of roots closes. `follow` lets it track a moving caster during a channel.
   */
  channelRoots(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const runners = Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * TAU,
      spin: 1.6 + Math.random() * 1.4,
      phase: Math.random(),
      len: 0.3 + Math.random() * 0.3,
      curl: (Math.random() - 0.5) * 2.6,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 30) * 0.15;

      for (const r of runners) {
        const lt = (t * (1 + r.phase) + r.phase) % 1;
        const rr = radius * (1 - easeIn(lt));
        const a = r.ang + t * r.spin * TAU;
        g.fillStyle(this.tint(LIFE.stem), 0.75 * (1 - lt * 0.6));
        vineStem(
          g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr,
          a + Math.PI * 0.72, rr * r.len, 2.6 * (1 - lt), r.curl,
        );
      }

      // Swelling seed.
      const cr = radius * (0.08 + easeIn(t) * 0.32) * pulse;
      g.fillStyle(this.tint(LIFE.soil), 0.5);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(LIFE.deep), 0.78);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(LIFE.lime), 0.85);
      g.fillCircle(cx, cy, cr * 0.55);
      g.fillStyle(this.tint(LIFE.glow), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.22);

      // Ring of roots closing in.
      g.lineStyle(3, this.tint(LIFE.leaf), 0.45 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /**
   * Something dying: the plant browns off, its leaves curl loose and tumble down, and a puff
   * of dust rises off the spot. The counterpart to `bloomBurst`.
   */
  wilt(x: number, y: number, radius: number, depth = 4): void {
    const leaves = Array.from({ length: 8 }, () => {
      const a = Math.random() * TAU;
      return {
        ang: a, dist: radius * (0.2 + Math.random() * 0.6),
        len: radius * (0.24 + Math.random() * 0.2),
        spin: (Math.random() - 0.5) * 7,
        tilt: Math.random() * TAU,
        drift: (Math.random() - 0.5) * 22,
      };
    });
    this.anim(depth, 620, (g, t) => {
      const fade = 1 - easeIn(t);
      // Collapsing husk.
      g.fillStyle(this.tint(LIFE.rot), 0.5 * fade);
      g.fillEllipse(x, y, radius * 1.6 * (1 - t * 0.4), radius * (1 - t * 0.7));
      for (const l of leaves) {
        const ex = x + Math.cos(l.ang) * l.dist + l.drift * t;
        const ey = y + Math.sin(l.ang) * l.dist * 0.7 + 30 * t * t;
        g.fillStyle(this.tint(t > 0.4 ? LIFE.rot : LIFE.deep), 0.85 * fade);
        leafBlade(g, ex, ey, l.tilt + t * l.spin, l.len, l.len * 0.34, l.len * 0.4);
      }
    });
    this.spores(x, y, 2, radius * 0.7, depth - 1, LIFE.rot);
  }

  // ── Painters into a caller-owned Graphics ───────────────────────────────

  /**
   * A pool of spores on the ground: rippling rim, fruiting bodies pushing up through it and
   * a slow churn of drifting caps. Painted into a caller-owned Graphics so the kit can
   * repaint every puddle it owns in one pass rather than animating each separately.
   */
  static drawSporePool(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x: number, y: number, radius: number, t: number, alpha: number, seed: number,
  ): void {
    const segs = Phaser.Math.Clamp(Math.round(radius / 2.2), 20, 56);
    const rim = (rr: number, wob: number) => {
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const r = rr * (1 + Math.sin(a * 3 + t * 1.2 + seed) * wob + Math.sin(a * 5 - t * 0.8 + seed) * wob * 0.6);
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.82;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };

    g.fillStyle(tint(LIFE.night), 0.42 * alpha);
    rim(radius, 0.06); g.fillPath();
    g.fillStyle(tint(LIFE.soil), 0.34 * alpha);
    rim(radius * 0.78, 0.08); g.fillPath();
    g.lineStyle(2, tint(LIFE.night), 0.55 * alpha);
    rim(radius * 0.98, 0.06); g.strokePath();

    // Fruiting bodies breaking the surface, each bobbing on its own phase.
    for (let i = 0; i < 4; i++) {
      const a = seed + i * 1.7;
      const d = radius * (0.15 + 0.45 * ((i + 1) / 5));
      const bx = x + Math.cos(a) * d;
      const by = y + Math.sin(a) * d * 0.7;
      const h = radius * 0.3 * (0.8 + Math.sin(t * 2 + i) * 0.2);
      g.fillStyle(tint(LIFE.pale), 0.55 * alpha);
      g.fillRect(bx - radius * 0.04, by - h, radius * 0.08, h);
      g.fillStyle(tint(LIFE.night), 0.85 * alpha);
      g.fillEllipse(bx, by - h, radius * 0.3, radius * 0.2);
      g.fillStyle(tint(LIFE.pale), 0.5 * alpha);
      g.fillCircle(bx - radius * 0.06, by - h - radius * 0.02, radius * 0.035);
    }
  }

  /**
   * Revitalize: the root ball tears itself out of the ground and becomes six walking legs.
   *
   * Each leg is two vine segments — a thigh out and down, a shin back under the body — so the
   * silhouette is a spider's crouch rather than six spokes. `phase` advances with the plant's
   * travel, and alternating legs are half a cycle apart, so at any moment three legs are planted
   * and three are swinging: the gait is what sells the plant as walking rather than sliding.
   * `facing` leans the whole rig into the direction of travel.
   */
  static drawRootLegs(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x: number, y: number, phase: number,
    opts: { scale?: number; alpha?: number; facing?: number } = {},
  ): void {
    const s = opts.scale ?? 1;
    const alpha = opts.alpha ?? 1;
    const facing = opts.facing ?? 0;
    const hipY = y + 8 * s;
    const lean = Math.cos(facing) * 2.4 * s;

    // Shadow the legs stand in, so the plant reads as lifted off the soil.
    g.fillStyle(tint(LIFE.soil), 0.3 * alpha);
    g.fillEllipse(x, y + 15 * s, 34 * s, 9 * s);

    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor(i / 2);            // 0 front, 1 middle, 2 back
      const step = phase + i * (Math.PI / 3);
      const lift = Math.max(0, Math.sin(step));  // 0 planted, 1 at the top of the swing
      // Splay: front legs reach forward, back legs trail.
      const out = (0.55 + rank * 0.28) * Math.PI * side * -1 + (rank - 1) * 0.18 * side;
      const thighA = out * 0.5 - Math.PI * 0.06 + lift * 0.22 * side;
      const len = (13 + rank * 1.6) * s;

      g.fillStyle(tint(LIFE.rot), 0.9 * alpha);
      const knee = vineStem(
        g, x + lean * 0.4, hipY - lift * 3 * s,
        thighA, len, 2.6 * s, side * 0.5,
      );
      g.fillStyle(tint(LIFE.bark), 0.95 * alpha);
      const foot = vineStem(
        g, knee.x, knee.y,
        knee.angle + Math.PI * 0.34 * side * -1 + 0.5, len * 1.15, 1.9 * s, side * -0.7,
      );
      // The toe: a claw of fine roots gripping (or reaching for) the ground.
      g.fillStyle(tint(lift > 0.15 ? LIFE.stem : LIFE.soil), (lift > 0.15 ? 0.8 : 0.95) * alpha);
      for (let k = -1; k <= 1; k++) {
        vineStem(g, foot.x, foot.y, foot.angle + k * 0.5, 4.2 * s, 0.9 * s, k * 0.4);
      }
    }

    // The bulb the legs hang off, drawn last so the joints disappear under it.
    g.fillStyle(tint(LIFE.shade), 0.9 * alpha);
    g.fillEllipse(x + lean, hipY - 1 * s, 20 * s, 12 * s);
    g.fillStyle(tint(LIFE.deep), 0.85 * alpha);
    g.fillEllipse(x + lean, hipY - 3 * s, 14 * s, 8 * s);
  }

  /** The Lotus orb: a little sun with a halo, a white glint and six slow rays. */
  static drawLotusOrb(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x: number, y: number, t: number, s = 1, alpha = 1,
  ): void {
    const pulse = 0.85 + Math.sin(t * 4) * 0.15;
    g.fillStyle(tint(LIFE.pollen), 0.22 * alpha * pulse);
    g.fillCircle(x, y, 13 * s * pulse);
    g.lineStyle(1.4 * s, tint(LIFE.pollen), 0.6 * alpha);
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + (i / 6) * TAU;
      g.lineBetween(x + Math.cos(a) * 8 * s, y + Math.sin(a) * 8 * s, x + Math.cos(a) * 12.5 * s, y + Math.sin(a) * 12.5 * s);
    }
    g.fillStyle(tint(LIFE.sun), alpha);
    g.fillCircle(x, y, 6 * s);
    g.fillStyle(tint(LIFE.pollen), alpha);
    g.fillCircle(x - 1 * s, y - 1 * s, 4 * s);
    g.fillStyle(tint(LIFE.white), 0.9 * alpha);
    g.fillCircle(x - 2.2 * s, y - 2.2 * s, 1.6 * s);
  }

  /**
   * The Sunflower's solar link from (x1,y1) to (x2,y2). `heat` 0–1 runs it from a thin gold
   * thread to a fat scorching red cable: the glow widens, a twisting strand of light winds
   * round the core faster, and the flare where it bites into its victim grows.
   */
  static drawSolarBeam(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x1: number, y1: number, x2: number, y2: number, heat: number, t: number, alpha = 1,
  ): void {
    const col = tint(mixColor(LIFE.sun, LIFE.solar, heat));
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const w = 3 + heat * 6;
    const flick = 0.85 + Math.sin(t * 30) * 0.15;
    g.lineStyle(w * 3.2, col, 0.14 * alpha * flick);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(w * 1.7, col, 0.4 * alpha);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(w, tint(mixColor(LIFE.pollen, LIFE.ember, heat)), 0.85 * alpha);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(Math.max(1, w * 0.35), tint(LIFE.white), 0.9 * alpha);
    g.lineBetween(x1, y1, x2, y2);
    // Two strands of light twisting around the core, spinning faster as it heats.
    const segs = Math.max(8, Math.round(len / 10));
    for (const phase of [0, Math.PI]) {
      g.lineStyle(1.4, tint(LIFE.pollen), 0.75 * alpha);
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const f = i / segs;
        const off = Math.sin(f * len * 0.08 - t * (10 + heat * 18) + phase) * (w * 0.9 + 2);
        const px = x1 + (x2 - x1) * f + nx * off;
        const py = y1 + (y2 - y1) * f + ny * off;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
    // Motes racing down the beam toward the victim.
    for (let i = 0; i < 5; i++) {
      const f = (t * (1.4 + heat * 1.6) + i / 5) % 1;
      g.fillStyle(tint(LIFE.white), 0.8 * alpha);
      g.fillCircle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 1.6 + heat * 1.2);
    }
    // Flare where it bites, and a smaller one at the source.
    const fr = (8 + heat * 10) * flick;
    g.fillStyle(col, 0.3 * alpha);
    g.fillCircle(x2, y2, fr * 1.6);
    g.fillStyle(tint(mixColor(LIFE.pollen, LIFE.solar, heat * 0.6)), 0.7 * alpha);
    g.fillCircle(x2, y2, fr);
    g.fillStyle(tint(LIFE.white), 0.85 * alpha);
    g.fillCircle(x2, y2, fr * 0.4);
    for (let i = 0; i < 6; i++) {
      const a = t * 4 + (i / 6) * TAU;
      g.lineStyle(1.5, col, 0.7 * alpha);
      g.lineBetween(x2 + Math.cos(a) * fr * 0.9, y2 + Math.sin(a) * fr * 0.9, x2 + Math.cos(a) * fr * 1.7, y2 + Math.sin(a) * fr * 1.7);
    }
    g.fillStyle(tint(LIFE.pollen), 0.55 * alpha);
    g.fillCircle(x1, y1, 5 + heat * 3);
  }

  /** A Frost Lily shard in flight: a long faceted spike with a sparkling frost wake. */
  static drawIceShard(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x: number, y: number, angle: number, t: number, alpha = 1,
  ): void {
    const c = Math.cos(angle), s = Math.sin(angle);
    const nx = -s, ny = c;
    // Wake.
    for (let i = 1; i <= 4; i++) {
      g.fillStyle(tint(LIFE.ice), 0.3 * alpha * (1 - i / 5));
      g.fillCircle(x - c * i * 7 + nx * Math.sin(t * 20 + i) * 2, y - s * i * 7 + ny * Math.sin(t * 20 + i) * 2, 3 - i * 0.5);
    }
    const P = (f: number, w: number) => ({ x: x + c * f + nx * w, y: y + s * f + ny * w });
    const tip = P(11, 0), back = P(-9, 0), l = P(-1, 4), r = P(-1, -4);
    g.fillStyle(tint(LIFE.frost), 0.95 * alpha);
    g.fillTriangle(tip.x, tip.y, l.x, l.y, back.x, back.y);
    g.fillTriangle(tip.x, tip.y, r.x, r.y, back.x, back.y);
    g.fillStyle(tint(LIFE.ice), alpha);
    const l2 = P(0, 1.6);
    g.fillTriangle(tip.x, tip.y, l2.x, l2.y, back.x, back.y);
    g.lineStyle(1, tint(LIFE.white), 0.9 * alpha);
    g.lineBetween(back.x, back.y, tip.x, tip.y);
  }

  /** A Flaming Sprout shot: a fireball with its tail streaming back along its flight. */
  static drawFlameBolt(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x: number, y: number, angle: number, t: number, alpha = 1,
  ): void {
    const back = angle + Math.PI;
    g.fillStyle(tint(LIFE.flame), 0.25 * alpha);
    g.fillCircle(x, y, 9);
    g.fillStyle(tint(LIFE.flame), 0.95 * alpha);
    flameTongue(g, x, y, back, 16, 6, t, x * 0.1);
    g.fillStyle(tint(LIFE.ember), alpha);
    flameTongue(g, x, y, back, 10, 4, t, x * 0.1 + 1.3);
    g.fillStyle(tint(LIFE.white), 0.9 * alpha);
    g.fillCircle(x, y, 2.4);
  }

  /**
   * A Nightcap spore bomb in flight: a tiny capped puffball tumbling along its arc, with its
   * shadow on the ground under it so the landing spot is readable before it lands.
   */
  static drawSporeBomb(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    gx: number, gy: number, height: number, t: number, alpha = 1,
  ): void {
    g.fillStyle(0x000000, 0.25 * alpha);
    g.fillEllipse(gx, gy, 14 - Math.min(8, height * 0.08), 5);
    const y = gy - height;
    const spin = t * 9;
    g.fillStyle(tint(LIFE.pale), alpha);
    g.fillCircle(gx, y + 2, 4.5);
    g.fillStyle(tint(LIFE.night), alpha);
    g.beginPath();
    g.arc(gx, y, 6.5, Math.PI + spin * 0.1, spin * 0.1);
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(LIFE.lime), 0.9 * alpha);
    g.fillCircle(gx + Math.cos(spin) * 3, y - 2 + Math.sin(spin) * 1.2, 1.4);
    g.fillCircle(gx - Math.cos(spin) * 2.5, y - 1.5, 1.1);
    // Spores sputtering off it.
    for (let i = 0; i < 3; i++) {
      const p = (t * 3 + i / 3) % 1;
      g.fillStyle(tint(LIFE.night), 0.5 * alpha * (1 - p));
      g.fillCircle(gx + Math.sin(i * 2.4 + t * 5) * 6 * p, y + 4 + p * 8, 1.5);
    }
  }

  /**
   * Reap (Helicopter): three grass blades sweeping round a fighter at `radius`. Same serrated
   * blade the plant carries, smaller and greener, so it reads as the plant's gift.
   */
  static drawGrassRotor(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x: number, y: number, radius: number, spin: number, alpha = 1,
  ): void {
    g.lineStyle(1.2, tint(LIFE.heli), 0.25 * alpha);
    g.strokeCircle(x, y, radius);
    for (let i = 0; i < 3; i++) {
      const a = spin + (i / 3) * TAU;
      const bx = x + Math.cos(a) * radius * 0.55;
      const by = y + Math.sin(a) * radius * 0.55;
      g.lineStyle(2.4, tint(LIFE.heli), 0.25 * alpha);
      g.beginPath();
      g.arc(x, y, radius * 0.85, a - 0.6, a - 0.1, false);
      g.strokePath();
      // Each blade is a long grass leaf pointing along the sweep.
      leafLayered(g, tint, bx, by, a + Math.PI / 2, radius * 0.75, 4.2, 1.5, alpha, LIFE.heli);
    }
  }

  /** Reap (Lotus): the lotus flower worn on the head, waiting to be spent on a dash. */
  static drawLotusCrown(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    x: number, y: number, t: number, alpha = 1,
  ): void {
    const bob = Math.sin(t * 2.5) * 1.5;
    g.fillStyle(tint(LIFE.pollen), 0.2 * alpha);
    g.fillCircle(x, y + bob, 12);
    g.fillStyle(tint(LIFE.lotus), alpha);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      leafBlade(g, x, y + 4 + bob, a, 11, 3.6, 0);
    }
    g.fillStyle(tint(LIFE.white), 0.9 * alpha);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.7;
      leafBlade(g, x, y + 5 + bob, a, 7.5, 2.6, 0);
    }
    g.fillStyle(tint(LIFE.sun), alpha);
    g.fillCircle(x, y + 1 + bob, 2.2);
  }

  /**
   * One plant, drawn from scratch every frame into a caller-owned Graphics. `t` drives the
   * sway, `hp` droops a dying plant, `fert` brightens a fertilised one, and `aim` turns
   * whichever part of the plant has a face toward the thing it is about to attack.
   */
  static drawPlant(
    g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
    type: PlantArtType, x: number, y: number,
    t: number, opts: PlantArtOpts = {},
  ): void {
    const hp = opts.hp ?? 1;
    const fert = opts.fert ?? false;
    const alpha = opts.alpha ?? 1;
    const aim = opts.aim ?? -Math.PI / 2;
    const scale = (opts.scale ?? 1) * (fert ? 1.12 : 1);
    // A hurt plant leans and shrinks; a fertilised one stands taller and sways faster.
    const droop = (1 - hp) * 0.5;
    const sway = Math.sin(t * (fert ? 2.6 : 1.7) + x * 0.05) * (0.07 + droop * 0.06);
    const up = -Math.PI / 2 + sway + droop * 0.35;

    // Root mound — every plant is growing out of something.
    g.fillStyle(tint(LIFE.soil), 0.55 * alpha);
    g.fillEllipse(x, y + 14 * scale, 26 * scale, 9 * scale);
    g.fillStyle(tint(LIFE.shade), 0.35 * alpha);
    g.fillEllipse(x, y + 13 * scale, 17 * scale, 5.5 * scale);

    if (opts.mushroom) {
      drawMushroomForm(g, tint, type, x, y, t, scale, alpha, up, fert);
    } else {
      PLANT_ART[type](g, tint, x, y, t, scale, alpha, up, aim, fert, hp, opts);
    }

    // Watered by a Pitcher: droplets beaded over it and a wet sheen on the mound.
    if (opts.wet) {
      g.fillStyle(tint(LIFE.water), 0.3 * alpha);
      g.fillEllipse(x, y + 14 * scale, 30 * scale, 8 * scale);
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.8 + i * 0.25) % 1;
        const dx = Math.sin(i * 2.3) * 13 * scale;
        g.fillStyle(tint(LIFE.water), 0.85 * alpha * (1 - p));
        g.fillCircle(x + dx, y - 14 * scale + p * 24 * scale, 1.7 * scale);
        g.fillStyle(tint(LIFE.white), 0.7 * alpha * (1 - p));
        g.fillCircle(x + dx - 0.5, y - 14.5 * scale + p * 24 * scale, 0.6 * scale);
      }
    }

    // Fertiliser motes orbiting whatever just got drawn.
    if (fert) {
      for (let i = 0; i < 3; i++) {
        const p = t * 2.2 + (i / 3) * TAU;
        const mx = x + Math.cos(p) * 20 * scale;
        const my = y - 6 * scale + Math.sin(p) * 7 * scale;
        g.fillStyle(tint(LIFE.pollen), 0.75 * alpha);
        g.fillCircle(mx, my, 2.6 * scale);
        g.fillStyle(tint(LIFE.white), 0.8 * alpha);
        g.fillCircle(mx, my, 1.1 * scale);
      }
    }
  }
}

// ── Plant art ─────────────────────────────────────────────────────────────

export type PlantArtType =
  | 'sunflower' | 'nightcap' | 'helicopter' | 'mushroom'
  | 'frost-lily' | 'flaming-sprout' | 'lotus' | 'pitcher';

export interface PlantArtOpts {
  /** 0–1 health ratio. A hurt plant droops and browns. */
  hp?: number;
  /** Fertilised: bigger, faster, ringed with motes. */
  fert?: boolean;
  alpha?: number;
  /** Direction the plant's business end should face (sunflower head, lily bell, pitcher lid). */
  aim?: number;
  scale?: number;
  /** Mycology perk: every seed grows as a mushroom in that seed's colour. */
  mushroom?: boolean;
  /**
   * 0–1, meaning depends on the plant: the Sunflower's beam heat, the Nightcap's and Mushroom
   * Colony's wind-up, the Frost Lily's shard forming, the Flaming Sprout's fuse left to burn,
   * the Lotus orb's growth (1 = ripe), the Pitcher's next spray.
   */
  charge?: number;
  /** Helicopter rotor angle, so the art and the damage tick agree on where the blades are. */
  spin?: number;
  /** Watered by a Pitcher: beaded with droplets. */
  wet?: boolean;
}

type PlantPainter = (
  g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
  x: number, y: number, t: number, s: number, alpha: number,
  up: number, aim: number, fert: boolean, hp: number, o: PlantArtOpts,
) => void;

/** Colour that identifies each seed, shared with the seed bar and every reap effect. */
export const SEED_COLOR: Record<PlantArtType, number> = {
  'sunflower': LIFE.sun,
  'nightcap': LIFE.night,
  'helicopter': LIFE.heli,
  'mushroom': LIFE.shroom,
  'frost-lily': LIFE.frost,
  'flaming-sprout': LIFE.flame,
  'lotus': LIFE.lotus,
  'pitcher': LIFE.water,
};

/** Straight per-channel blend between two colours — the Sunflower's yellow-to-red ramp. */
export function mixColor(a: number, b: number, f: number): number {
  const k = Phaser.Math.Clamp(f, 0, 1);
  const ch = (sh: number) => Math.round(((a >> sh) & 0xff) + ((((b >> sh) & 0xff) - ((a >> sh) & 0xff)) * k));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * A licking tongue of fire: a teardrop that narrows to a point in direction `angle`, its tip
 * wavering on `t`. Layered three deep (flame, ember, white-hot) by the callers.
 */
function flameTongue(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number,
  angle: number, len: number, halfW: number, t: number, seed = 0,
): void {
  const segs = 10;
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    // Round belly at the root, a whip of a tip that flickers sideways.
    const w = halfW * Math.sin(Math.PI * Math.pow(1 - f, 1.4) * 0.5 + 0.0001) * (f < 0.15 ? f / 0.15 : 1);
    const wob = Math.sin(t * 13 + f * 5 + seed) * halfW * 0.45 * f * f;
    const px = cx + Math.cos(angle) * len * f + nx * wob;
    const py = cy + Math.sin(angle) * len * f + ny * wob;
    left.push({ x: px + nx * w, y: py + ny * w });
    right.push({ x: px - nx * w, y: py - ny * w });
  }
  g.beginPath();
  g.moveTo(cx - Math.cos(angle) * halfW * 0.6, cy - Math.sin(angle) * halfW * 0.6);
  for (const p of left) g.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
  g.closePath();
  g.fillPath();
}

/** One mushroom of a cluster: fattening stipe, gill shadow, domed cap with pale spots. */
function shroom(
  g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
  x: number, y: number, h: number, r: number, cap: number, alpha: number, lean: number,
): void {
  const cx = x + lean * h;
  const cy = y - h;
  g.fillStyle(tint(LIFE.pale), 0.92 * alpha);
  g.beginPath();
  g.moveTo(x - r * 0.36, y);
  g.lineTo(cx - r * 0.22, cy);
  g.lineTo(cx + r * 0.22, cy);
  g.lineTo(x + r * 0.36, y);
  g.closePath();
  g.fillPath();
  g.fillStyle(tint(LIFE.soil), 0.8 * alpha);
  g.fillEllipse(cx, cy + r * 0.1, r * 1.8, r * 0.5);
  g.fillStyle(tint(cap), alpha);
  g.beginPath();
  g.arc(cx, cy + r * 0.12, r, Math.PI, 0);
  g.closePath();
  g.fillPath();
  g.fillEllipse(cx, cy + r * 0.12, r * 2, r * 0.62);
  g.fillStyle(tint(LIFE.white), 0.26 * alpha);
  g.fillEllipse(cx - r * 0.3, cy - r * 0.42, r * 0.7, r * 0.32);
  g.fillStyle(tint(LIFE.cotton), 0.85 * alpha);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + 0.55 + (i / 3) * (Math.PI - 1.1);
    const d = r * (0.5 + (i % 2) * 0.22);
    g.fillCircle(cx + Math.cos(a) * d, cy + r * 0.12 + Math.sin(a) * d * 0.8, r * 0.13);
  }
}

const PLANT_ART: Record<PlantArtType, PlantPainter> = {
  /**
   * Sunflower: a tall stem with two big leaves and a head that tracks whatever it is linked
   * to. While the solar link runs the petals ripen from gold to scorched red and a corona burns
   * around the disc — the beam's heat is readable from the flower alone.
   */
  'sunflower': (g, tint, x, y, t, s, alpha, up, aim, fert, _hp, o) => {
    const heat = o.charge ?? 0;
    const tip = sprig(g, tint, x, y + 12 * s, up, 26 * s, 3.4 * s, 0.25, alpha, 2);
    // Head leans toward the aim, further while it is beaming — it is staring the beam down.
    const lean = Phaser.Math.Angle.Wrap(aim - up) * (heat > 0 ? 0.45 : 0.28);
    const hx = tip.x + Math.cos(up + lean) * 3 * s;
    const hy = tip.y + Math.sin(up + lean) * 3 * s;
    const r = (11 + (fert ? 2 : 0) + heat * 2) * s;
    const petal = mixColor(LIFE.sun, LIFE.solar, heat);

    if (heat > 0) {
      // Corona: a hot halo that widens and reddens as the link climbs.
      const flick = 0.85 + Math.sin(t * 22) * 0.15;
      g.fillStyle(tint(petal), 0.18 * alpha * flick);
      g.fillCircle(hx, hy, r * (1.9 + heat * 0.6));
      g.fillStyle(tint(LIFE.pollen), 0.22 * alpha * flick);
      g.fillCircle(hx, hy, r * 1.35);
    }
    // Back ring of petals sits offset so the front ring reads as a second, closer layer.
    g.fillStyle(tint(heat > 0.5 ? LIFE.solar : LIFE.bark), 0.9 * alpha);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.26 + Math.sin(t * 1.2) * 0.04;
      leafBlade(g, hx + Math.cos(a) * r * 0.3, hy + Math.sin(a) * r * 0.3, a, r * 0.95, r * 0.28, 0);
    }
    g.fillStyle(tint(petal), alpha);
    for (let i = 0; i < 12; i++) {
      // A beaming head's petals flare outward on a fast shimmer.
      const a = (i / 12) * TAU + Math.sin(t * 1.2) * 0.04;
      const flare = 1 + heat * 0.18 * (0.5 + 0.5 * Math.sin(t * 18 + i * 1.7));
      leafBlade(g, hx + Math.cos(a) * r * 0.3, hy + Math.sin(a) * r * 0.3, a, r * 1.05 * flare, r * 0.32, 0);
    }
    // Seeded disc: concentric rings of dots, not a flat brown circle.
    g.fillStyle(tint(LIFE.bark), alpha);
    g.fillCircle(hx, hy, r * 0.52);
    g.fillStyle(tint(heat > 0 ? mixColor(LIFE.soil, LIFE.solar, heat * 0.7) : LIFE.soil), alpha);
    for (let ring = 0; ring < 2; ring++) {
      const rr = r * (0.18 + ring * 0.2);
      const n = 6 + ring * 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ring * 0.4 + t * (0.15 + heat * 2);
        g.fillCircle(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr, r * 0.075);
      }
    }
    g.fillStyle(tint(heat > 0 ? LIFE.white : LIFE.pollen), (0.5 + heat * 0.4) * alpha);
    g.fillCircle(hx - r * 0.16 + Math.cos(aim) * r * 0.1, hy - r * 0.16 + Math.sin(aim) * r * 0.1, r * (0.12 + heat * 0.08));
  },

  /** Nightcap: a fat domed cap over gills that squashes down and puffs up to lob a bomb. */
  'nightcap': (g, tint, x, y, t, s, alpha, up, _aim, fert, _hp, o) => {
    const wind = o.charge ?? 0;
    // Wind-up: the cap squats lower and wider before the throw, then springs back.
    const squash = wind > 0.75 ? (wind - 0.75) * 4 : 0;
    const h = (18 + (fert ? 3 : 0) - squash * 4) * s;
    const cx = x + Math.cos(up) * h * 0.2;
    const cy = y + 12 * s - h;

    g.fillStyle(tint(LIFE.pale), 0.9 * alpha);
    g.beginPath();
    g.moveTo(x - 5.5 * s, y + 13 * s);
    g.lineTo(x - 3.2 * s, cy);
    g.lineTo(x + 3.2 * s, cy);
    g.lineTo(x + 5.5 * s, y + 13 * s);
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(LIFE.cotton), 0.7 * alpha);
    g.fillEllipse(x, cy + 5 * s, 11 * s, 3.4 * s);

    const r = (14 + (fert ? 2 : 0) + squash * 3) * s;
    g.fillStyle(tint(LIFE.soil), 0.85 * alpha);
    g.fillEllipse(cx, cy + 1.5 * s, r * 1.8, r * 0.55);
    g.fillStyle(tint(LIFE.night), alpha);
    g.beginPath();
    g.arc(cx, cy + 2 * s, r, Math.PI, 0);
    g.closePath();
    g.fillPath();
    g.fillEllipse(cx, cy + 2 * s, r * 2, r * 0.7);
    g.fillStyle(tint(LIFE.rose), 0.3 * alpha);
    g.fillEllipse(cx - r * 0.3, cy - r * 0.35, r * 0.7, r * 0.35);
    // Pale spots — swelling into glowing blisters as the next bomb ripens under the cap.
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + 0.35 + (i / 5) * (Math.PI - 0.7);
      const d = r * (0.45 + (i % 2) * 0.28);
      const sr = r * (0.1 + (i % 3) * 0.03) * (1 + wind * 0.5);
      g.fillStyle(tint(wind > 0.6 ? LIFE.lime : LIFE.cotton), 0.85 * alpha);
      g.fillCircle(cx + Math.cos(a) * d, cy + 2 * s + Math.sin(a) * d * 0.85, sr);
    }
    // The ripening bomb itself, peeking out of the crown.
    if (wind > 0.3) {
      const k = (wind - 0.3) / 0.7;
      g.fillStyle(tint(LIFE.ink), 0.8 * alpha * k);
      g.fillCircle(cx, cy - r * 0.62, r * 0.32 * k);
      g.fillStyle(tint(LIFE.lime), 0.8 * alpha * k);
      g.fillCircle(cx - r * 0.08, cy - r * 0.7, r * 0.1 * k);
    }
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.7 + i * 0.33) % 1;
      g.fillStyle(tint(LIFE.night), 0.4 * alpha * (1 - p));
      g.fillCircle(cx + Math.sin(t * 2 + i * 2) * r * 0.6, cy + 4 * s + p * 14 * s, 1.8 * s);
    }
  },

  /**
   * Helicopter Plant: a squat trunk carrying a rotor of three serrated leaf blades that sweeps
   * the ground around it. The blades are drawn top-down at their real reach, so the circle you
   * see is the circle that cuts.
   */
  'helicopter': (g, tint, x, y, t, s, alpha, up, _aim, fert, _hp, o) => {
    const spin = o.spin ?? t * 7;
    const R = 62 * s;
    const hubX = x + Math.cos(up) * 2;
    const hubY = y - 6 * s;

    // Rotor disc: a faint blur of the sweep plus the cut ring at the blade tips.
    g.fillStyle(tint(LIFE.heli), 0.07 * alpha);
    g.fillCircle(hubX, hubY, R);
    g.lineStyle(1.4, tint(LIFE.heli), 0.28 * alpha);
    g.strokeCircle(hubX, hubY, R * 0.98);
    g.lineStyle(1, tint(LIFE.pale), 0.16 * alpha);
    g.strokeCircle(hubX, hubY, R * 0.62);

    for (let i = 0; i < 3; i++) {
      const a = spin + (i / 3) * TAU;
      // Motion streaks trailing each blade.
      for (let k = 1; k <= 3; k++) {
        g.lineStyle(3.2 - k * 0.7, tint(LIFE.heli), (0.26 - k * 0.06) * alpha);
        g.beginPath();
        g.arc(hubX, hubY, R * (0.55 + k * 0.13), a - 0.55, a - 0.08, false);
        g.strokePath();
      }
      leafLayered(g, tint, hubX, hubY, a, R, 7.5 * s, 2 * s, alpha, LIFE.heli);
      // Saw teeth along the leading edge — the read that these cut.
      g.fillStyle(tint(LIFE.deep), 0.95 * alpha);
      for (let k = 0; k < 4; k++) {
        const f = 0.4 + k * 0.15;
        const bx = hubX + Math.cos(a) * R * f;
        const by = hubY + Math.sin(a) * R * f;
        const w = 7.5 * s * Math.sin(Math.PI * Math.pow(f, 0.72));
        const ex = bx + Math.cos(a + Math.PI / 2) * w;
        const ey = by + Math.sin(a + Math.PI / 2) * w;
        g.fillTriangle(
          ex, ey,
          ex + Math.cos(a + Math.PI / 2) * 4 * s + Math.cos(a) * 2 * s, ey + Math.sin(a + Math.PI / 2) * 4 * s + Math.sin(a) * 2 * s,
          ex + Math.cos(a) * 5 * s, ey + Math.sin(a) * 5 * s,
        );
      }
    }

    // Trunk, thick and ridged, then the hub cap over the rotor's root.
    g.fillStyle(tint(LIFE.bark), alpha);
    vineStem(g, x, y + 13 * s, up, 18 * s, 6.5 * s, 0.1, 6);
    g.fillStyle(tint(LIFE.rot), 0.8 * alpha);
    vineStem(g, x - 1.5 * s, y + 13 * s, up, 14 * s, 2 * s, 0.1, 5);
    g.fillStyle(tint(LIFE.shade), alpha);
    g.fillCircle(hubX, hubY, (9 + (fert ? 1.5 : 0)) * s);
    g.fillStyle(tint(LIFE.heli), alpha);
    g.fillCircle(hubX, hubY - 1 * s, 7 * s);
    g.fillStyle(tint(LIFE.lime), 0.8 * alpha);
    g.fillCircle(hubX - 2 * s, hubY - 3 * s, 2.6 * s);
    // A bolt-head bud spinning with the rotor.
    g.fillStyle(tint(LIFE.ink), 0.9 * alpha);
    g.fillCircle(hubX + Math.cos(spin) * 3 * s, hubY - 1 * s + Math.sin(spin) * 3 * s, 1.5 * s);
  },

  /**
   * Mushroom Colony: five caps of different heights crowded into one patch. Before a volley
   * the caps swell and their undersides glow; then they blow eight spores out in a ring.
   */
  'mushroom': (g, tint, x, y, t, s, alpha, up, _aim, fert, _hp, o) => {
    const wind = o.charge ?? 0;
    const swell = 1 + Math.pow(wind, 3) * 0.16 + (fert ? 0.1 : 0);
    const lean = Math.cos(up) * 0.15;
    // Underglow pooling on the soil as the volley loads.
    if (wind > 0.5) {
      const k = (wind - 0.5) * 2;
      g.fillStyle(tint(LIFE.pollen), 0.22 * alpha * k);
      g.fillEllipse(x, y + 8 * s, 46 * s, 16 * s);
    }
    const caps = [
      { ox: -13, oy: 6, h: 11, r: 7.5 },
      { ox: 12, oy: 8, h: 9, r: 6.5 },
      { ox: 4, oy: -4, h: 13, r: 8 },
      { ox: 0, oy: 10, h: 18, r: 11 },
      { ox: -6, oy: 15, h: 7, r: 5 },
    ].sort((a, b) => a.oy - b.oy);
    for (const c of caps) {
      const bob = Math.sin(t * 2.2 + c.ox) * 0.6 * s;
      shroom(
        g, tint, x + c.ox * s, y + c.oy * s, c.h * s * swell + bob, c.r * s * swell,
        LIFE.shroom, alpha, lean + Math.sin(t * 1.3 + c.ox) * 0.04,
      );
    }
    // Spore motes hanging over the patch; they thicken right before a volley.
    for (let i = 0; i < 4 + Math.round(wind * 4); i++) {
      const p = (t * 0.45 + i * 0.21) % 1;
      g.fillStyle(tint(LIFE.pollen), 0.45 * alpha * (1 - p));
      g.fillCircle(x + Math.sin(t * 1.7 + i * 2.1) * 16 * s, y - 6 * s - p * 22 * s, 1.5 * s);
    }
  },

  /**
   * Frost Lily: a rimed stem under a bell of icy, pointed petals turned toward its target, with
   * a crystal spike growing in the throat — the shard it is about to throw.
   */
  'frost-lily': (g, tint, x, y, t, s, alpha, up, aim, fert, _hp, o) => {
    const form = o.charge ?? 0;
    const tip = sprig(g, tint, x, y + 12 * s, up, 22 * s, 2.8 * s, -0.15, alpha, 2);
    // Frost riming the leaves.
    g.fillStyle(tint(LIFE.ice), 0.7 * alpha);
    for (let i = 0; i < 4; i++) {
      const f = 0.3 + i * 0.16;
      const px = x + Math.cos(up) * 22 * s * f + (i % 2 ? 4 : -4) * s;
      const py = y + 12 * s + Math.sin(up) * 22 * s * f;
      g.fillTriangle(px, py - 2 * s, px + 1.2 * s, py, px, py + 2 * s);
      g.fillTriangle(px, py - 2 * s, px - 1.2 * s, py, px, py + 2 * s);
    }

    // The bell faces partway toward the aim.
    const face = up + Phaser.Math.Angle.Wrap(aim - up) * 0.5;
    const hx = tip.x, hy = tip.y;
    const r = (12 + (fert ? 2 : 0)) * s;
    // Back petals, then front: six pointed icy blades flaring around the facing.
    for (const layer of [{ c: LIFE.frost, k: 1, a: 0.95 }, { c: LIFE.ice, k: 0.7, a: 0.9 }]) {
      g.fillStyle(tint(layer.c), layer.a * alpha);
      for (let i = 0; i < 6; i++) {
        const a = face + (i - 2.5) * 0.48;
        leafBlade(g, hx, hy, a, r * 1.1 * layer.k, r * 0.26 * layer.k, Math.sin(t * 1.5 + i) * 1.2);
      }
    }
    g.lineStyle(1, tint(LIFE.white), 0.6 * alpha);
    for (let i = 0; i < 6; i++) {
      const a = face + (i - 2.5) * 0.48;
      g.lineBetween(hx, hy, hx + Math.cos(a) * r * 0.9, hy + Math.sin(a) * r * 0.9);
    }
    // The forming shard in the throat, brightening as it nears release.
    const len = r * (0.4 + form * 0.7);
    const sx = hx + Math.cos(face) * len, sy = hy + Math.sin(face) * len;
    const nx = -Math.sin(face) * r * 0.18, ny = Math.cos(face) * r * 0.18;
    g.fillStyle(tint(LIFE.frost), (0.5 + form * 0.5) * alpha);
    g.fillTriangle(hx + nx, hy + ny, hx - nx, hy - ny, sx, sy);
    g.fillStyle(tint(LIFE.white), (0.3 + form * 0.6) * alpha);
    g.fillTriangle(hx + nx * 0.4, hy + ny * 0.4, hx - nx * 0.4, hy - ny * 0.4, sx, sy);
    // Cold mist curling off the bell.
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.5 + i * 0.33) % 1;
      g.fillStyle(tint(LIFE.ice), 0.3 * alpha * (1 - p));
      g.fillCircle(hx + Math.sin(t + i * 2) * 10 * s, hy + 4 * s + p * 16 * s, (2 + p * 3) * s);
    }
  },

  /**
   * Flaming Sprout: a seedling with a live flame for a head. It burns itself out — the leaves
   * char and curl and the flame gutters as `charge` (fuse left) runs down to nothing.
   */
  'flaming-sprout': (g, tint, x, y, t, s, alpha, up, aim, fert, _hp, o) => {
    const fuse = o.charge ?? 1;
    const burnt = 1 - fuse;
    const tip = sprig(g, tint, x, y + 12 * s, up, 15 * s, 2.6 * s, 0.2, alpha, 2);
    // Char creeping up the seedling.
    g.fillStyle(tint(LIFE.soil), 0.75 * alpha * burnt);
    vineStem(g, x, y + 12 * s, up, 15 * s * Math.min(1, burnt * 1.3), 2.8 * s, 0.2);

    const lean = Phaser.Math.Angle.Wrap(aim - up) * 0.25;
    const fa = up + lean;
    const h = (14 + (fert ? 3 : 0)) * s * (0.55 + fuse * 0.45);
    // Heat haze around the head.
    g.fillStyle(tint(LIFE.flame), 0.14 * alpha);
    g.fillCircle(tip.x, tip.y - h * 0.3, h * 0.9);
    g.fillStyle(tint(LIFE.flame), 0.95 * alpha);
    flameTongue(g, tip.x, tip.y, fa, h, h * 0.42, t, 0);
    g.fillStyle(tint(LIFE.ember), alpha);
    flameTongue(g, tip.x, tip.y + 1 * s, fa, h * 0.72, h * 0.3, t, 1.7);
    g.fillStyle(tint(LIFE.white), 0.85 * alpha);
    flameTongue(g, tip.x, tip.y + 1.5 * s, fa, h * 0.4, h * 0.16, t, 3.1);
    // Embers spitting up and away.
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.3 + i * 0.25) % 1;
      g.fillStyle(tint(i % 2 ? LIFE.ember : LIFE.flame), alpha * (1 - p));
      g.fillCircle(
        tip.x + Math.sin(t * 3 + i * 1.9) * 7 * s,
        tip.y - h * 0.5 - p * 18 * s,
        (1.6 - p) * s,
      );
    }
  },

  /**
   * Lotus: a floating pad on a ring of still water, a cup of pointed pink petals around a seed
   * pod — and, every five seconds, a golden orb ripening in the middle for its owner to collect.
   */
  'lotus': (g, tint, x, y, t, s, alpha, _up, _aim, fert, _hp, o) => {
    const ripe = o.charge ?? 0;
    // Water ring with a slow ripple.
    const rip = (t * 0.6) % 1;
    g.fillStyle(tint(LIFE.water), 0.22 * alpha);
    g.fillEllipse(x, y + 10 * s, 50 * s, 18 * s);
    g.lineStyle(1.2, tint(LIFE.water), 0.45 * alpha * (1 - rip));
    g.strokeEllipse(x, y + 10 * s, (34 + rip * 22) * s, (12 + rip * 8) * s);
    g.fillStyle(tint(LIFE.deep), 0.9 * alpha);
    g.fillEllipse(x, y + 10 * s, 34 * s, 12 * s);
    g.fillStyle(tint(LIFE.stem), 0.75 * alpha);
    g.fillEllipse(x, y + 9 * s, 28 * s, 9 * s);

    const r = (14 + (fert ? 2 : 0)) * s;
    const breathe = 1 + Math.sin(t * 1.8) * 0.04;
    const cx = x, cy = y + 2 * s;
    // Back row, then front: petals fanned upward so the flower reads as a cup, not a daisy.
    for (const row of [
      { n: 5, spread: 0.46, len: 1.05, c: LIFE.lotus, a: 0.95, dy: -2 },
      { n: 4, spread: 0.62, len: 0.85, c: LIFE.white, a: 0.92, dy: 1 },
    ]) {
      g.fillStyle(tint(row.c), row.a * alpha);
      for (let i = 0; i < row.n; i++) {
        const a = -Math.PI / 2 + (i - (row.n - 1) / 2) * row.spread;
        leafBlade(g, cx, cy + row.dy * s, a, r * row.len * breathe, r * 0.3, 0);
      }
    }
    g.fillStyle(tint(LIFE.lotus), 0.55 * alpha);
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.62;
      leafBlade(g, cx, cy + 1 * s, a, r * 0.5, r * 0.12, 0);
    }
    // Seed pod.
    g.fillStyle(tint(LIFE.lime), alpha);
    g.fillEllipse(cx, cy - 2 * s, 8 * s, 4 * s);

    // The orb: a seed of light growing, then a ripe gold sun bobbing over the pod.
    if (ripe >= 1) {
      LifeFx.drawLotusOrb(g, tint, cx, cy - 14 * s + Math.sin(t * 3) * 2 * s, t, s, alpha);
    } else if (ripe > 0) {
      g.fillStyle(tint(LIFE.pollen), 0.35 * alpha * ripe);
      g.fillCircle(cx, cy - 6 * s, (2 + ripe * 5) * s);
      g.fillStyle(tint(LIFE.sun), 0.8 * alpha * ripe);
      g.fillCircle(cx, cy - 6 * s, (1 + ripe * 2.5) * s);
    }
  },

  /**
   * Pitcher Plant: a hooded jug with a sprinkler rose on its lid that turns and throws arcs of
   * water over the garden around it. The arcs fatten for a moment every time it waters.
   */
  'pitcher': (g, tint, x, y, t, s, alpha, up, aim, fert, _hp, o) => {
    const spray = o.charge ?? 0; // 1 right after a watering, decaying to 0
    const w = (11 + (fert ? 1.5 : 0)) * s;
    const h = (26 + (fert ? 3 : 0)) * s;
    const topY = y + 12 * s - h;
    const lean = Math.sin(t * 1.3) * 0.05;

    g.fillStyle(tint(LIFE.stem), 0.9 * alpha);
    vineStem(g, x - w * 0.9, y + 10 * s, Math.PI * 0.85, 16 * s, 2.2 * s, 3.4);

    const body = (scaleX: number, color: number, a: number) => {
      g.fillStyle(tint(color), a * alpha);
      g.beginPath();
      g.moveTo(x - w * 0.62 * scaleX, topY);
      g.lineTo(x - w * scaleX, topY + h * 0.55);
      g.lineTo(x - w * 0.78 * scaleX, y + 12 * s);
      g.lineTo(x + w * 0.78 * scaleX, y + 12 * s);
      g.lineTo(x + w * scaleX, topY + h * 0.55);
      g.lineTo(x + w * 0.62 * scaleX, topY);
      g.closePath();
      g.fillPath();
    };
    body(1, LIFE.shade, 0.95);
    body(0.86, LIFE.pitcher, 1);
    g.lineStyle(1.4 * s, tint(LIFE.water), 0.45 * alpha);
    for (const sx of [-0.45, 0, 0.45]) {
      g.beginPath();
      g.moveTo(x + w * sx * 0.8, y + 11 * s);
      g.lineTo(x + w * sx * 0.6, topY + 2 * s);
      g.strokePath();
    }
    // Water sloshing in the jug, catching the light.
    g.fillStyle(tint(LIFE.water), 0.7 * alpha);
    g.fillEllipse(x, y + 4 * s + Math.sin(t * 2) * 0.8 * s, w * 1.35, 5 * s);
    g.fillStyle(tint(LIFE.white), 0.35 * alpha);
    g.fillEllipse(x - w * 0.25, y + 3.4 * s, w * 0.5, 1.8 * s);

    g.fillStyle(tint(LIFE.water), 0.85 * alpha);
    g.fillEllipse(x, topY, w * 1.3, w * 0.5);
    g.fillStyle(tint(LIFE.soil), 0.9 * alpha);
    g.fillEllipse(x, topY + 0.5 * s, w * 1.02, w * 0.34);
    const lidLean = Phaser.Math.Angle.Wrap(aim - up) * 0.2 + lean;
    leafLayered(
      g, tint, x, topY - 1.5 * s,
      -Math.PI / 2 - 0.75 + lidLean, w * 1.7, w * 0.62, 4 * s, alpha, LIFE.pitcher,
    );

    // The sprinkler rose: a bud on a stalk over the mouth, turning, throwing two arcs of water.
    const nx = x + 2 * s, ny = topY - 8 * s;
    g.fillStyle(tint(LIFE.stem), alpha);
    vineStem(g, x, topY, -Math.PI / 2, 8 * s, 1.6 * s, 0.1, 4);
    g.fillStyle(tint(LIFE.deep), alpha);
    g.fillCircle(nx, ny, 3.2 * s);
    const turn = t * 2.4;
    for (let arm = 0; arm < 2; arm++) {
      const a = turn + arm * Math.PI;
      const reach = (34 + spray * 30) * s;
      for (let i = 1; i <= 7; i++) {
        const f = i / 7;
        // Parabolic throw: outward along `a`, up then down.
        const px = nx + Math.cos(a) * reach * f;
        const py = ny + Math.sin(a) * reach * f * 0.5 - Math.sin(f * Math.PI) * 12 * s + f * 8 * s;
        g.fillStyle(tint(f > 0.7 ? LIFE.white : LIFE.water), (0.35 + spray * 0.45) * alpha * (1 - f * 0.5));
        g.fillCircle(px, py, (1.4 + spray * 1.1) * s);
      }
    }
    g.fillStyle(tint(LIFE.water), alpha);
    g.fillCircle(nx + Math.cos(turn) * 2 * s, ny + Math.sin(turn) * 1 * s, 1.4 * s);
  },
};

/**
 * Mycology turns every seed into a mushroom. Rather than six mushroom drawings, one cap+stipe
 * form is drawn in the seed's own colour with that seed's motif on the cap, so a Rose-shroom
 * still reads as the rose you planted.
 */
function drawMushroomForm(
  g: Phaser.GameObjects.Graphics, tint: LifeColorFn,
  type: PlantArtType, x: number, y: number, t: number,
  s: number, alpha: number, up: number, fert: boolean,
): void {
  const color = SEED_COLOR[type];
  const h = (17 + (fert ? 3 : 0)) * s;
  const cx = x + Math.cos(up) * h * 0.15;
  const cy = y + 12 * s - h;
  const r = (13 + (fert ? 2 : 0)) * s;

  g.fillStyle(tint(LIFE.pale), 0.9 * alpha);
  g.beginPath();
  g.moveTo(x - 5 * s, y + 13 * s);
  g.lineTo(x - 3 * s, cy);
  g.lineTo(x + 3 * s, cy);
  g.lineTo(x + 5 * s, y + 13 * s);
  g.closePath();
  g.fillPath();

  g.fillStyle(tint(LIFE.soil), 0.85 * alpha);
  g.fillEllipse(cx, cy + 1.5 * s, r * 1.75, r * 0.5);
  g.fillStyle(tint(color), alpha);
  g.beginPath();
  g.arc(cx, cy + 2 * s, r, Math.PI, 0);
  g.closePath();
  g.fillPath();
  g.fillEllipse(cx, cy + 2 * s, r * 2, r * 0.66);
  g.fillStyle(tint(LIFE.white), 0.28 * alpha);
  g.fillEllipse(cx - r * 0.3, cy - r * 0.32, r * 0.65, r * 0.3);
  g.fillStyle(tint(LIFE.cotton), 0.8 * alpha);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI + 0.45 + (i / 4) * (Math.PI - 0.9);
    const d = r * (0.45 + (i % 2) * 0.3);
    g.fillCircle(cx + Math.cos(a) * d, cy + 2 * s + Math.sin(a) * d * 0.8, r * 0.11);
  }
  // Motif: a leaf silhouetted on the cap. Drawn in the shade tone rather than the seed's own
  // colour — the cap is already that colour, so a matching leaf would be invisible.
  g.fillStyle(tint(LIFE.shade), 0.8 * alpha);
  leafBlade(g, cx, cy + r * 0.1, -Math.PI / 2 + Math.sin(t * 1.5) * 0.15, r * 0.7, r * 0.24, 0);
  g.fillStyle(tint(LIFE.lime), 0.7 * alpha);
  leafBlade(g, cx, cy + r * 0.05, -Math.PI / 2 + Math.sin(t * 1.5) * 0.15, r * 0.5, r * 0.15, 0);
}

// ── LifeAura ──────────────────────────────────────────────────────────────

/**
 * Persistent ring of grass and creeping vine around a fighter (Thrive!, a fertiliser field).
 * Driven by whoever owns it — call `update` every frame with the fighter's position.
 */
export class LifeAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private pollenAccum = 0;
  private blades: { ang: number; len: number; w: number; speed: number; phase: number; curl: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: LifeColorFn,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 12,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.blades = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.65 + Math.random() * 0.6,
      w: 0.1 + Math.random() * 0.07,
      speed: 2.4 + Math.random() * 3.2,
      phase: Math.random() * TAU,
      curl: (Math.random() - 0.5) * 2.4,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const spin = this.t * 0.4;
    g.fillStyle(this.tint(LIFE.deep), 0.2 * this.intensity * alpha);
    g.fillCircle(x, y, this.radius * (0.92 + Math.sin(this.t * 3.4) * 0.05));

    for (const b of this.blades) {
      const wob = Math.sin(this.t * b.speed + b.phase);
      const len = this.radius * b.len * (0.8 + wob * 0.25) * this.intensity;
      const ang = b.ang + spin + wob * 0.09;
      sprig(
        g, this.tint,
        x + Math.cos(ang) * this.radius * 0.5, y + Math.sin(ang) * this.radius * 0.5,
        ang, len, this.radius * b.w, b.curl + wob * 0.3, 0.62 * alpha, 1,
      );
    }

    // Occasional mote lifting off the growth.
    this.pollenAccum += delta;
    const interval = 280 / Math.max(0.4, this.intensity);
    if (this.pollenAccum >= interval) {
      this.pollenAccum = 0;
      new LifeFx(this.scene, this.tint).pollen(
        x + (Math.random() - 0.5) * this.radius * 1.3,
        y + (Math.random() - 0.5) * this.radius * 0.8,
        1, { speed: 22, size: 2.6, life: 780, rise: 40, depth: 4 },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── LifeAvatar ────────────────────────────────────────────────────────────

/** Concentric discs of one budding ball hand, outermost first. */
const LIFE_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: LIFE.deep, alpha: 0.3 },
    { r: 6.4, color: LIFE.stem, alpha: 0.92 },
    { r: 3.6, color: LIFE.lime, alpha: 1 },
    { r: 1.5, color: LIFE.glow, alpha: 0.95, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: LIFE.pale,
  eyePupil: LIFE.ink,
  // Heavier than water, lighter than stone — a hand full of sap.
  squash: { div: 15, x: 0.45, y: 0.24 },
};

/**
 * The life character rig: two budding ball hands, a pair of eyes, and a sprouting crown of
 * curling stems that sways. Hands, eyes and gestures come from BaseAvatar; what life adds is
 * the mossy glow beneath, an ivy tendril and moss freckles on the lower body, a young leaf
 * on each hand, and the growth above.
 *
 * Mastered, the plant is in full bloom: a laurel wreath of leaves and pink blossoms rings
 * the head, the crown's buds have opened into gold flowers, a ring of flowers blooms on the
 * floor around the feet, pollen orbits the head and the hands wear a pale bud ring.
 */
export class LifeAvatar extends BaseAvatar {
  private fx: LifeFx;

  constructor(scene: Phaser.Scene, tint: LifeColorFn, depth = 6) {
    super(scene, tint, depth, LIFE_AVATAR);
    this.fx = new LifeFx(scene, tint);
  }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? LIFE.glow : LIFE.pale);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13.5 : 9);
      halo.setFillStyle(this.tint(on ? LIFE.leaf : LIFE.deep), on ? 0.38 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.8, this.tint(LIFE.pollen), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed pollen. */
  protected emitTrail(x: number, y: number): void {
    this.fx.pollen(x, y, 1, { speed: 16, size: 2.2, life: 560, rise: 24, depth: 5 });
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    g.fillStyle(this.tint(LIFE.deep), a * 0.28 * this.intensity);
    g.fillEllipse(x, y + 4, 56 * this.intensity, 40 * this.intensity);
    g.fillStyle(this.tint(LIFE.lime), a * 0.13 * this.intensity);
    g.fillEllipse(x, y + 6, 34 * this.intensity, 22 * this.intensity);
    if (!this.mastered) return;
    // Mastery: a meadow ring blooming around the feet — grass tufts and small flowers.
    for (let i = 0; i < 12; i++) {
      const p = (i / 12) * TAU + this.t * 0.15;
      const fx = x + Math.cos(p) * 30;
      const fy = y + 15 + Math.sin(p) * 10;
      const sway = Math.sin(this.t * 2 + i) * 0.25;
      g.fillStyle(this.tint(LIFE.leaf), alpha * 0.75);
      leafBlade(g, fx, fy, -Math.PI / 2 + sway - 0.3, 8, 1.6, 0);
      leafBlade(g, fx, fy, -Math.PI / 2 + sway + 0.3, 7, 1.5, 0);
      if (i % 2 === 0) {
        bloomHead(g, this.tint, fx, fy - 6, 2.8, 5, i % 4 === 0 ? LIFE.blossom : LIFE.pollen, LIFE.sun, alpha * 0.9, p);
      }
    }
  }

  /**
   * Ivy wrapping the lower body: a tendril curving round under the face with small leaves
   * along it, and a few moss freckles. Kept below the eye band so the face stays clean.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    // Moss freckles.
    g.fillStyle(this.tint(LIFE.shade), alpha * 0.45);
    for (const [fx, fy, r] of [[-12, 10, 1.6], [-8, 15, 1.2], [11, 12, 1.4], [6, 17, 1.1], [15, 6, 1]] as const) {
      g.fillCircle(x + fx, y + fy, r);
    }
    // The tendril: an arc round the lower body.
    g.lineStyle(2, this.tint(LIFE.shade), alpha * 0.85);
    g.beginPath();
    g.arc(x, y + 1, 18.5, Math.PI * 0.12, Math.PI * 0.88, false);
    g.strokePath();
    g.lineStyle(1, this.tint(LIFE.lime), alpha * 0.7);
    g.beginPath();
    g.arc(x, y + 0.5, 18.5, Math.PI * 0.14, Math.PI * 0.86, false);
    g.strokePath();
    // Leaves along it, nodding out of step.
    for (let i = 0; i < 5; i++) {
      const p = Math.PI * (0.2 + i * 0.15);
      const lx = x + Math.cos(p) * 18.5, ly = y + 1 + Math.sin(p) * 18.5;
      const ang = p + (i % 2 === 0 ? 0.9 : -0.9) + Math.sin(this.t * 2.2 + i) * 0.15;
      g.fillStyle(this.tint(i % 2 ? LIFE.leaf : LIFE.stem), alpha * 0.95);
      leafBlade(g, lx, ly, ang, 6.5, 2.4, 0);
    }
    // Curl at the tendril's end.
    g.lineStyle(1.2, this.tint(LIFE.stem), alpha * 0.85);
    g.beginPath();
    g.arc(x + Math.cos(Math.PI * 0.12) * 18.5 + 2, y + 1 + Math.sin(Math.PI * 0.12) * 18.5 - 2, 2.4, 0, Math.PI * 1.5, false);
    g.strokePath();
  }

  /**
   * The crown: three curling stems out of the head, each carrying leaves and topped with a
   * bud that opens into a flower once mastered. Rooted at `y - 18` so it never covers the
   * face, and drawn over the sprite so the bright middles show instead of dark tips.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const m = this.mastered;
    const mastery = m ? 1.35 : 1;
    const rootY = y - 18;

    for (let i = 0; i < 3; i++) {
      const side = i - 1;
      const p = this.t * 1.9 + i * 2.1;
      const len = (27 + Math.sin(p) * 5) * this.intensity * mastery;
      const ang = -Math.PI / 2 + side * 0.5 + Math.sin(p) * 0.13;
      const tip = sprig(g, this.tint, x + side * 6, rootY, ang, len, 3 * mastery, side * 0.5 + Math.sin(p * 0.7) * 0.2, a, 2);

      if (m) {
        bloomHead(g, this.tint, tip.x, tip.y, 7, 6, LIFE.pollen, LIFE.sun, alpha * 0.95, p * 0.4, 2);
      } else {
        g.fillStyle(this.tint(LIFE.stem), alpha * 0.95);
        leafBlade(g, tip.x, tip.y, tip.angle, 9, 4, 0);
        g.fillStyle(this.tint(LIFE.pale), alpha * 0.85);
        leafBlade(g, tip.x, tip.y, tip.angle, 6, 2.3, 0);
      }
    }

    // A young leaf sprouting off the top of each hand.
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      const ang = -Math.PI / 2 + (i === 0 ? -0.5 : 0.5) + Math.sin(this.t * 2.6 + i) * 0.2;
      g.fillStyle(this.tint(LIFE.leaf), alpha * 0.95);
      leafBlade(g, hx, hy - 4, ang, m ? 10 : 8, m ? 3.4 : 2.8, 0);
      g.fillStyle(this.tint(LIFE.pale), alpha * 0.6);
      leafBlade(g, hx, hy - 4, ang, m ? 6 : 5, 1.1, 0);
      if (m) bloomHead(g, this.tint, hx + (i === 0 ? 4 : -4), hy - 3, 2.6, 5, LIFE.blossom, LIFE.pollen, alpha, this.t + i);
    }

    if (!m) return;

    // Laurel wreath ringing the head: leaves paired along an ellipse, blossoms at the front.
    const wy = y - 15;
    const rx = 19, ry = 6;
    for (let k = 0; k < 14; k++) {
      const p = Math.PI * 1.02 + (k / 13) * Math.PI * 0.96; // back half arc over the crown
      const lx = x + Math.cos(p) * rx, ly = wy + Math.sin(p) * ry;
      const out = Math.atan2(Math.sin(p) * ry, Math.cos(p) * rx);
      g.fillStyle(this.tint(k % 2 ? LIFE.leaf : LIFE.deep), alpha);
      leafBlade(g, lx, ly, out - 0.7, 7, 2.6, 0);
      g.fillStyle(this.tint(LIFE.lime), alpha * 0.9);
      leafBlade(g, lx, ly, out - 1.6, 6, 2.2, 0);
    }
    for (const bx of [-17, 17]) {
      bloomHead(g, this.tint, x + bx, wy - 1, 4, 5, LIFE.blossom, LIFE.pollen, alpha, this.t * 0.5 + bx, 2);
    }
    bloomHead(g, this.tint, x, wy - ry - 1, 4.4, 6, LIFE.blossom, LIFE.sun, alpha, this.t * 0.4, 2);

    // Pollen motes circling the head.
    for (let i = 0; i < 4; i++) {
      const p = this.t * 1.5 + (i / 4) * TAU;
      const cx = x + Math.cos(p) * 25;
      const cy = y - 29 + Math.sin(p) * 7;
      g.fillStyle(this.tint(LIFE.leaf), alpha * 0.5);
      g.fillCircle(cx, cy, 4.4);
      g.fillStyle(this.tint(LIFE.pollen), alpha * 0.95);
      g.fillCircle(cx, cy, 2.6);
      g.fillStyle(this.tint(LIFE.white), alpha * 0.9);
      g.fillCircle(cx, cy, 1.2);
    }
  }
}
