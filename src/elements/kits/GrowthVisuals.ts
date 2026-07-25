import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Growth renders: the microbial avatar (ball arms + eyes + a
 * crown of budding pseudopods), the culture aura, and the one-shot effects every growth ability
 * fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes growth
 * growth: the pseudopod, the palette, and the effects built out of them.
 *
 * Colours must come from the GROWTH palette below. Growth has no colour-slot cosmetic yet, but
 * every call still routes through the owner's `growthColor` mapper, so the day one lands it is a
 * table edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.growthColor bound to one owner. */
export type GrowthColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const GROWTH = {
  rot: 0x14290c,
  humus: 0x1a3a10,
  moss: 0x2f5a18,
  leaf: 0x3f7a1f,
  stem: 0x557733,
  lime: 0x88bb22,
  shoot: 0x99cc22,
  sprout: 0xaadd44,
  spring: 0xccee88,
  pollen: 0xddffcc,
  white: 0xffffff,
  /** The NPC's culture runs warm so two microbe fighters never blur together. */
  rust: 0x6a3a18,
  amber: 0xcc8833,
  ochre: 0xdd7733,
  /** Sickness, blood and the syringe. */
  clot: 0x8a0f1c,
  gore: 0xcc2233,
  flush: 0xff5566,
  /** DNA and the helix HUD. */
  helix: 0x44ddaa,
} as const;

/** One coherent set of shades. `shell → body → cyto → lit` runs dark to bright. */
export interface GrowthTones {
  shell: number;
  body: number;
  cyto: number;
  lit: number;
  spark: number;
}

export const CULTURE_TONES: GrowthTones = {
  shell: GROWTH.humus, body: GROWTH.leaf, cyto: GROWTH.lime, lit: GROWTH.sprout, spark: GROWTH.pollen,
};
export const NPC_TONES: GrowthTones = {
  shell: GROWTH.rot, body: GROWTH.rust, cyto: GROWTH.amber, lit: GROWTH.ochre, spark: GROWTH.spring,
};
export const SICK_TONES: GrowthTones = {
  shell: GROWTH.rot, body: GROWTH.clot, cyto: GROWTH.gore, lit: GROWTH.flush, spark: GROWTH.white,
};

/** Which culture a shot belongs to. Every growth effect takes this rather than a bare colour. */
export const tonesFor = (owner: 'player' | 'npc'): GrowthTones =>
  (owner === 'player' ? CULTURE_TONES : NPC_TONES);

// ── The primitive ─────────────────────────────────────────────────────────

const POD_SEGS = 8;

/**
 * A budding pseudopod: thin at the root, swelling into a fat bulb at the tip — a limb caught
 * mid-division. This is the primitive every growth shape is built from: the avatar's crown,
 * blast lobes, the culture aura, spore jets and drifting motes all call it.
 *
 * Note the silhouette is the exact inverse of a flame tongue or a shadow tendril, both of which
 * taper to a point. Life pushes *outward* into a bud, so the mass has to end up at the far end
 * or the thing reads as a spike instead of as something growing.
 */
export function growthPod(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve = 0, bud = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number) => ({
    x: cx + cos * len * f + px * curve * f * f,
    y: cy + sin * len * f + py * curve * f * f,
  });
  // Width swells toward the tip on a sine, so the shaft necks in before the bulb.
  const widthAt = (f: number) => halfW * (0.42 + 0.58 * Math.sin(Math.min(1, f * 1.05) * Math.PI * 0.62));

  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i <= POD_SEGS; i++) {
    const f = i / POD_SEGS;
    const p = at(f);
    const w = widthAt(f);
    left.push([p.x + px * w, p.y + py * w]);
    right.push([p.x - px * w, p.y - py * w]);
  }

  g.beginPath();
  g.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i++) g.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  g.fillPath();

  // The bud itself, plus a smaller daughter blister behind it. Without these a ring of pods
  // reads as a splat of triangles; with them it reads as a colony mid-division.
  const tip = at(1);
  const neck = at(0.62);
  g.fillCircle(tip.x, tip.y, halfW * bud);
  g.fillCircle(neck.x, neck.y, halfW * 0.5 * bud);
  g.fillCircle(cx, cy, halfW * 0.42);
}

/** Cilia beating along a pseudopod's flanks. */
function growthCilia(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, phase: number, count: number,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  for (let i = 1; i <= count; i++) {
    const f = i / (count + 1);
    const bx = cx + cos * len * f + px * curve * f * f;
    const by = cy + sin * len * f + py * curve * f * f;
    const w = halfW * (0.42 + 0.58 * Math.sin(f * Math.PI * 0.62));
    for (const side of [1, -1]) {
      // Cilia beat backward along the shaft on a travelling wave.
      const beat = Math.sin(phase + f * 6) * 0.5;
      const a = angle + side * (1.3 + beat);
      g.beginPath();
      g.moveTo(bx + px * side * w, by + py * side * w);
      g.lineTo(bx + px * side * w + Math.cos(a) * len * 0.16, by + py * side * w + Math.sin(a) * len * 0.16);
      g.strokePath();
    }
  }
}

export interface PodLayerOpts {
  /** Beating cilia along the flanks. Defaults to 3; 0 for a bare limb. */
  cilia?: number;
  /** Phase for the cilia wave. */
  phase?: number;
  /** Bulb scale at the tip. 1 = normal, >1 for a pod about to split. */
  bud?: number;
}

/**
 * Layered pseudopod: a dark membrane, a mid-green cytoplasm, and a bright nucleus riding the
 * bud — because in a real cell the dense material collects where the growth is happening, not
 * back at the root.
 */
export function growthPodLayered(
  g: Phaser.GameObjects.Graphics,
  tint: GrowthColorFn, tones: GrowthTones,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curve: number, alpha: number,
  opts: PodLayerOpts = {},
): void {
  const cilia = opts.cilia ?? 3;
  const bud = opts.bud ?? 1;

  g.fillStyle(tint(tones.shell), alpha * 0.6);
  growthPod(g, cx, cy, angle, len * 1.02, halfW * 1.3, curve, bud);
  g.fillStyle(tint(tones.body), alpha * 0.95);
  growthPod(g, cx, cy, angle, len, halfW, curve, bud);
  g.fillStyle(tint(tones.cyto), alpha * 0.85);
  growthPod(g, cx, cy, angle, len * 0.9, halfW * 0.6, curve * 0.92, bud);

  // Nucleus in the bud, offset so it reads as a body suspended in fluid.
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const tx = cx + cos * len * 0.94 + px * curve * 0.88;
  const ty = cy + sin * len * 0.94 + py * curve * 0.88;
  g.fillStyle(tint(tones.lit), alpha * 0.9);
  g.fillCircle(tx - px * halfW * 0.2, ty - py * halfW * 0.2, halfW * 0.42 * bud);
  g.fillStyle(tint(tones.spark), alpha * 0.7);
  g.fillCircle(tx - px * halfW * 0.38, ty - py * halfW * 0.38, halfW * 0.16 * bud);

  if (cilia > 0) {
    g.lineStyle(1.3, tint(tones.lit), alpha * 0.6);
    growthCilia(g, cx, cy, angle, len, halfW, curve, opts.phase ?? 0, cilia);
  }
}

export interface BurstOpts {
  /** Pods flung out of the bloom. Defaults to radius/7. */
  pods?: number;
  /** Drifting spore haze. Defaults to radius/26. */
  haze?: number;
  /** Leave a biofilm smear on the ground. Default true. */
  film?: boolean;
  /** Render depth of the bloom body. Default 6. */
  depth?: number;
  /** Total life of the bloom body in ms. Defaults to scale with radius. */
  duration?: number;
  tones?: GrowthTones;
}

export interface MoteOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Pixels the motes climb over their life. Negative to make them settle. */
  rise?: number;
  tones?: GrowthTones;
}

// ── GrowthFx ──────────────────────────────────────────────────────────────

/**
 * One-shot growth effects. Cheap to construct — build one per owner (or per cast, as the
 * ability files do) and hand it the owner's colour mapper.
 */
export class GrowthFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: GrowthColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding culture front. The rim swells on smooth lobes rather than per-vertex noise —
   * a colony spreads unevenly but continuously, so the wobble is low-frequency by design.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 3), 36, 120);
    const lobes = 4 + Math.floor(Math.random() * 4);
    const phase = Math.random() * TAU;
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      const wob = (1 - t) * 0.08;
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.65)), c, 0.85 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r * (1 + Math.sin(a * lobes + phase) * wob);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
    });
  }

  /** Blown-out pale core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7, tones: GrowthTones = CULTURE_TONES): void {
    this.flashIn(x, y, radius, tones.spark, tones.lit, depth);
  }

  /**
   * A biofilm smear that spreads from the impact point and then dries out. Deliberately blotchy
   * and short of a full disc, with a few colonies still budding at the edges — a solid circle
   * reads as placeholder art, a lumpy film with satellites reads as something living.
   */
  film(x: number, y: number, radius: number, depth = 1, tones: GrowthTones = CULTURE_TONES): void {
    const blots = Array.from({ length: 8 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.55;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.72,
        r: radius * (0.26 + Math.random() * 0.44),
      };
    });
    const colonies = Array.from({ length: 5 }, () => {
      const a = Math.random() * TAU;
      const d = radius * (0.4 + Math.random() * 0.5);
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, r: 2 + Math.random() * 2.6 };
    });
    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
      const grow = easeOut(Math.min(1, t * 2.6));
      for (const b of blots) {
        g.fillStyle(this.tint(tones.shell), 0.35 * a);
        g.fillEllipse(b.x, b.y, b.r * 2 * grow, b.r * 1.5 * grow);
        g.fillStyle(this.tint(tones.body), 0.16 * a);
        g.fillEllipse(b.x, b.y, b.r * 1.2 * grow, b.r * 0.9 * grow);
      }
      // Satellite colonies keep swelling after the film itself starts to dry.
      for (const c of colonies) {
        const swell = 0.6 + 0.6 * Math.min(1, t * 2);
        g.fillStyle(this.tint(tones.cyto), 0.5 * a);
        g.fillCircle(c.x, c.y, c.r * swell);
        g.fillStyle(this.tint(tones.spark), 0.4 * a);
        g.fillCircle(c.x - c.r * 0.25, c.y - c.r * 0.25, c.r * 0.3 * swell);
      }
    });
  }

  /**
   * Motes of spore shed off a moving thing. Each is a tiny pod drawn along its own drift path,
   * tumbling as it goes, so a fast burst reads as a spray of living cells and a dying one
   * settles into specks.
   */
  motes(x: number, y: number, count: number, opts: MoteOpts = {}): void {
    const tones = opts.tones ?? CULTURE_TONES;
    const speed = opts.speed ?? 90;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3;
    const life = opts.life ?? 500;
    const rise = opts.rise ?? 10;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        cos: Math.cos(a), sin: Math.sin(a),
        v: speed * (0.4 + Math.random() * 0.95),
        r: size * (0.5 + Math.random() * 0.9),
        spin: (Math.random() - 0.5) * 9,
        spin0: Math.random() * TAU,
        curl: (Math.random() - 0.5) * 12,
        delay: Math.random() * 0.2,
      };
    });

    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        const ex = x + p.cos * d;
        const ey = y + p.sin * d - rise * lt;
        const fade = 1 - lt * lt;
        const ang = p.spin0 + p.spin * lt;
        // Motes swell as they travel — spores grow, they don't burn out.
        const swell = 0.7 + lt * 0.5;
        g.fillStyle(this.tint(tones.body), 0.9 * fade);
        growthPod(g, ex, ey, ang, p.r * 2.6 * swell, p.r * 0.7 * swell, p.curl * lt);
        g.fillStyle(this.tint(tones.spark), 0.7 * fade);
        g.fillCircle(ex + Math.cos(ang) * p.r * 2.2 * swell, ey + Math.sin(ang) * p.r * 2.2 * swell, p.r * 0.4);
      }
    });
  }

  /** A cloud of spore haze rolling outward and up — the tail end of anything big. */
  haze(x: number, y: number, count: number, radius: number, depth = 4, tones: GrowthTones = CULTURE_TONES): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.3,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.26 + Math.random() * 0.34),
      drift: (Math.random() - 0.5) * 30,
      delay: Math.random() * 0.32,
    }));
    this.anim(depth, 1300, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const cx = x + p.ox + p.drift * lt;
        const cy = y + p.oy - 28 * lt;
        g.fillStyle(this.tint(tones.cyto), 0.24 * (1 - lt));
        g.fillCircle(cx, cy, p.r * (0.6 + lt * 1.35));
        g.fillStyle(this.tint(tones.spark), 0.12 * (1 - lt));
        g.fillCircle(cx, cy, p.r * (0.4 + lt * 0.9));
      }
    });
  }

  /**
   * The body of a bloom: a knot of pods that swells outward, buds, and then splits apart.
   * Reads as a colony erupting rather than as a disc being scaled.
   */
  bloomBody(x: number, y: number, radius: number, duration: number, depth = 6, tones: GrowthTones = CULTURE_TONES): void {
    const pods = Array.from({ length: 10 }, (_, i) => ({
      ang: (i / 10) * TAU + (Math.random() - 0.5) * 0.7,
      len: 0.55 + Math.random() * 0.6,
      w: 0.15 + Math.random() * 0.1,
      curve: (Math.random() - 0.5) * radius * 0.5,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, duration, (g, t) => {
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      const core = easeOut(Math.min(1, t * 3.5));
      // Membrane sac the pods push out of.
      g.fillStyle(this.tint(tones.shell), 0.65 * fade);
      g.fillCircle(x, y, radius * 0.44 * core);
      g.fillStyle(this.tint(tones.body), 0.7 * fade);
      g.fillCircle(x, y, radius * 0.3 * core);

      for (const p of pods) {
        const lt = Math.max(0, (t - p.delay) / (1 - p.delay));
        const grow = easeOut(Math.min(1, lt * 2.2));
        // The bud keeps swelling right up to the moment the whole thing lets go.
        const bud = 1 + easeIn(lt) * 0.8;
        growthPodLayered(
          g, this.tint, tones, x, y, p.ang,
          radius * p.len * grow, radius * p.w, p.curve * lt, 0.92 * fade,
          { cilia: 2, phase: p.phase + t * 8, bud },
        );
      }
      if (t < 0.4) {
        g.fillStyle(this.tint(tones.spark), (1 - t / 0.4) * 0.8);
        g.fillCircle(x, y, radius * 0.18);
      }
    });
  }

  /** Pale core + budding bloom + stacked culture fronts + flung motes + haze + biofilm. */
  burst(x: number, y: number, radius: number, opts: BurstOpts = {}): void {
    const tones = opts.tones ?? CULTURE_TONES;
    const pods = opts.pods ?? Math.max(6, Math.round(radius / 7));
    const hazeCount = opts.haze ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(340 + radius * 1.4);
    const depth = opts.depth ?? 6;

    if (opts.film !== false) this.film(x, y, radius * 0.6, 1, tones);
    this.bloomBody(x, y, radius * 0.7, dur, depth, tones);
    this.flash(x, y, radius * 0.3, depth + 1, tones);
    this.ring(x, y, radius * 0.2, radius * 1.1, tones.lit, Math.round(dur * 0.75), 5, depth);
    this.scene.time.delayedCall(90, () => this.ring(x, y, radius * 0.15, radius * 1.35, tones.cyto, dur, 4, depth));
    this.scene.time.delayedCall(190, () => this.ring(x, y, radius * 0.1, radius * 1.5, tones.body, dur, 3, depth));
    this.motes(x, y, pods, {
      speed: radius * 2, size: 2.6 + radius / 55,
      life: Math.round(dur * 1.4), rise: radius * 0.25, depth, tones,
    });
    if (hazeCount > 0) this.haze(x, y, hazeCount, radius * 0.85, depth - 2, tones);
  }

  /**
   * A jet of spores: nested pods of unequal length that re-roll every tick, so a held spray
   * churns instead of strobing one fixed wedge. Motes shear off the leading edge.
   */
  sporeJet(x: number, y: number, angle: number, length: number, depth = 4, tones: GrowthTones = CULTURE_TONES): void {
    const pods = Array.from({ length: 4 }, (_, i) => ({
      off: (i - 1.5) * 0.13,
      len: length * (0.65 + Math.random() * 0.42),
      w: 9 + Math.random() * 7,
      curve: (Math.random() - 0.5) * 26,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, 200, (g, t) => {
      const grow = 0.6 + easeOut(t) * 0.5;
      const fade = 1 - easeIn(t);
      for (const p of pods) {
        growthPodLayered(
          g, this.tint, tones,
          x + Math.cos(angle + p.off) * 14, y + Math.sin(angle + p.off) * 14,
          angle + p.off, p.len * grow, p.w, p.curve * t, 0.75 * fade,
          { cilia: 3, phase: p.phase + t * 10, bud: 1 + t * 0.5 },
        );
      }
      g.fillStyle(this.tint(tones.spark), 0.5 * fade);
      g.fillCircle(x + Math.cos(angle) * 18, y + Math.sin(angle) * 18, 9 * grow);
    });
    if (Math.random() < 0.5) {
      this.motes(x + Math.cos(angle) * length * 0.7, y + Math.sin(angle) * length * 0.7, 2,
        { angle, spread: 0.6, speed: 70, size: 2.4, life: 420, rise: 8, depth, tones });
    }
  }

  /** Recoil bud at the throwing hand — sells that a shot actually left a body. */
  muzzleBud(x: number, y: number, angle: number, scale = 1, depth = 6, tones: GrowthTones = CULTURE_TONES): void {
    this.anim(depth, 145, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(tones.cyto), 0.75 * fade);
      growthPod(g, x, y, angle, 26 * scale * (0.6 + t * 0.9), 7 * scale * fade, 0, 1 + t);
      g.fillStyle(this.tint(tones.spark), 0.85 * fade);
      g.fillCircle(x, y, 5 * scale * (1 - t * 0.4));
      // Cytoplasm shoved sideways as the cell pinches off.
      g.fillStyle(this.tint(tones.body), 0.42 * fade);
      growthPod(g, x, y, angle + Math.PI * 0.74, 13 * scale * fade, 3.2 * scale * fade, 0);
      growthPod(g, x, y, angle - Math.PI * 0.74, 13 * scale * fade, 3.2 * scale * fade, 0);
    });
    this.motes(x, y, 3, { angle, spread: 0.75, speed: 90, size: 2.2, life: 320, rise: 6, depth, tones });
  }

  /**
   * The creep left behind something moving through: a spreading mat of biofilm with pods
   * budding off both flanks, plus motes kicked backward out of the start point.
   */
  creep(x1: number, y1: number, x2: number, y2: number, depth = 4, tones: GrowthTones = CULTURE_TONES): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(3, Math.round(dist / 24));
    this.anim(depth, 460, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        const px = x1 + (x2 - x1) * f;
        const py = y1 + (y2 - y1) * f;
        const local = Math.max(0, fade - f * 0.32);
        const r = (5 + (1 - f) * 10) * local;
        if (r <= 0) continue;
        g.fillStyle(this.tint(tones.shell), 0.5 * local);
        g.fillCircle(px, py, r * 1.3);
        g.fillStyle(this.tint(tones.body), 0.45 * local);
        g.fillCircle(px, py, r);
        for (const s of [1, -1]) {
          g.fillStyle(this.tint(tones.cyto), 0.5 * local);
          growthPod(g, px, py, angle + s * (Math.PI / 2), (6 + f * 18) * local, 2.6 * local, s * 6 * f);
        }
      }
    });
    this.motes(x1, y1, 8, { angle: angle + Math.PI, spread: 0.95, speed: 120, size: 2.8, life: 460, rise: 10, depth, tones });
    this.ring(x1, y1, 6, 42, tones.lit, 360, 3, depth);
  }

  /** Ignition burst for a toggle or a transformation: pods thrown out of the body at once. */
  bloom(x: number, y: number, radius: number, count = 10, depth = 5, tones: GrowthTones = CULTURE_TONES): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU + (Math.random() - 0.5) * 0.7,
      len: radius * (0.45 + Math.random() * 0.6),
      w: radius * (0.1 + Math.random() * 0.09),
      curve: (Math.random() - 0.5) * radius * 0.55,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.24,
    }));
    this.anim(depth, 480, (g, t) => {
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(Math.min(1, lt * 1.9));
        const fade = 1 - easeIn(lt);
        growthPodLayered(
          g, this.tint, tones, x, y, s.ang,
          s.len * grow, s.w, s.curve * lt, 0.85 * fade,
          { cilia: 2, phase: s.phase + t * 9, bud: 1 + lt * 0.7 },
        );
      }
    });
    this.ring(x, y, 8, radius * 1.2, tones.lit, 400, 4, depth);
    this.motes(x, y, Math.round(count * 0.8), { speed: radius * 1.3, size: 2.8, life: 520, rise: 18, depth, tones });
  }

  /**
   * Inward-converging incubation: cells drawn from the rim into a swelling core while a
   * membrane closes around it. `follow` lets it track a moving caster through a channel.
   */
  channelIncubate(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6, tones: GrowthTones = CULTURE_TONES,
  ): void {
    const streams = Array.from({ length: 12 }, (_, i) => ({
      ang: (i / 12) * TAU,
      spin: 1.1 + Math.random() * 1.2,
      phase: Math.random(),
      len: 0.28 + Math.random() * 0.3,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.88 + Math.sin(t * 22) * 0.12;

      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.fillStyle(this.tint(tones.cyto), 0.75 * (1 - lt * 0.55));
        growthPod(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI, r * s.len, 3 * (1 - lt), r * 0.2);
      }

      // Core swelling toward the hatch.
      const cr = radius * (0.1 + easeIn(t) * 0.34) * pulse;
      g.fillStyle(this.tint(tones.shell), 0.6);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(tones.body), 0.85);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(tones.lit), 0.8);
      g.fillCircle(cx - cr * 0.25, cy - cr * 0.25, cr * 0.42);
      g.fillStyle(this.tint(tones.spark), 0.85 * easeIn(t));
      g.fillCircle(cx - cr * 0.3, cy - cr * 0.3, cr * 0.16);

      g.lineStyle(3, this.tint(tones.lit), 0.45 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /** A stalk erupting upward and unfurling into a cap of buds at its top. */
  stalk(x: number, y: number, radius: number, height: number, depth = 7, tones: GrowthTones = CULTURE_TONES): void {
    const shafts = Array.from({ length: 4 }, (_, i) => ({
      ox: (i - 1.5) * radius * 0.42,
      h: height * (0.68 + Math.random() * 0.42),
      w: radius * (0.32 + Math.random() * 0.24),
      lean: (Math.random() - 0.5) * radius * 0.5,
      phase: Math.random() * TAU,
      delay: i * 0.05,
    }));
    this.anim(depth, 780, (g, t) => {
      const fade = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
      g.fillStyle(this.tint(tones.shell), 0.55 * fade);
      g.fillEllipse(x, y, radius * 1.7, radius * 0.8);
      for (const s of shafts) {
        const rise = easeOut(Math.max(0, (t - s.delay) / (1 - s.delay)));
        growthPodLayered(
          g, this.tint, tones, x + s.ox, y + radius * 0.2,
          -Math.PI / 2, s.h * rise, s.w * (1 - t * 0.2), s.lean * rise, 0.9 * fade,
          { cilia: 3, phase: s.phase + t * 7, bud: 1 + rise * 0.6 },
        );
      }
      // Cap of spores released once the stalk tops out.
      if (t > 0.35) {
        const cap = (t - 0.35) / 0.65;
        g.fillStyle(this.tint(tones.spark), 0.4 * fade);
        g.fillEllipse(x, y - height * 0.9, radius * (1.4 + cap * 2.6), radius * (0.5 + cap * 1));
      }
    });
    this.motes(x, y - height * 0.4, 9, {
      speed: radius * 1.2, spread: 1, angle: -Math.PI / 2,
      size: 3.2, life: 800, rise: height * 0.5, depth, tones,
    });
  }

  /**
   * A nest: a nodule of packed cells with a membrane that pulses, ribs holding it together and
   * a bright yolk that brightens as it fills. Painted into a caller-owned Graphics so the kit
   * can repaint every nest it owns in one pass.
   */
  static drawNest(
    g: Phaser.GameObjects.Graphics, tint: GrowthColorFn, tones: GrowthTones,
    x: number, y: number, radius: number, t: number, fill: number,
  ): void {
    const beat = 1 + Math.sin(t * 3.4) * 0.07;

    g.fillStyle(tint(GROWTH.rot), 0.35);
    g.fillEllipse(x, y + radius * 0.5, radius * 2.2, radius * 0.8);

    // Roots anchoring it to the floor, drawn first so the sac covers their necks.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      g.fillStyle(tint(tones.shell), 0.8);
      growthPod(g, x, y, a, radius * (1.3 + 0.2 * Math.sin(t * 2 + i)), radius * 0.16, Math.sin(t + i) * radius * 0.3);
    }

    g.fillStyle(tint(tones.shell), 0.95);
    g.fillCircle(x, y, radius * beat);
    g.fillStyle(tint(tones.body), 0.95);
    g.fillCircle(x, y, radius * 0.82 * beat);
    // Yolk brightens with fill, so a nest's progress is readable without a bar.
    g.fillStyle(tint(tones.cyto), 0.55 + fill * 0.4);
    g.fillCircle(x - radius * 0.12, y - radius * 0.12, radius * (0.3 + fill * 0.32) * beat);
    g.fillStyle(tint(tones.spark), 0.4 + fill * 0.55);
    g.fillCircle(x - radius * 0.22, y - radius * 0.22, radius * 0.18 * beat);

    // Ribs across the sac.
    g.lineStyle(1.5, tint(tones.lit), 0.6);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI + t * 0.25;
      g.beginPath();
      g.arc(x, y, radius * 0.9 * beat, a, a + 1.1);
      g.strokePath();
    }
  }

  /**
   * A spore wall: a swollen sac of packed cells that visibly hardens as it matures. `maturity`
   * is 0–1 and thickens the membrane and raises the spikes. Painted into a caller-owned
   * Graphics because the kit already repaints every spore each frame.
   */
  static drawSporeWall(
    g: Phaser.GameObjects.Graphics, tint: GrowthColorFn, tones: GrowthTones,
    x: number, y: number, radius: number, t: number, maturity: number, hpRatio: number, spiked: boolean,
  ): void {
    const beat = 1 + Math.sin(t * 2.6 + x * 0.05) * 0.05;
    const r = radius * beat;

    g.fillStyle(tint(GROWTH.rot), 0.3);
    g.fillEllipse(x, y + r * 0.45, r * 1.9, r * 0.7);

    // Lobed membrane, deliberately not a circle.
    const segs = 20;
    g.fillStyle(tint(tones.shell), 0.92);
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i % segs) / segs * TAU;
      const rr = r * (1 + Math.sin(a * 4 + t * 0.9) * 0.08);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();

    g.fillStyle(tint(tones.body), 0.9);
    g.fillCircle(x, y, r * 0.82);
    // Damage shows as the cytoplasm receding, so a spore visibly wears down.
    g.fillStyle(tint(tones.cyto), 0.75);
    g.fillCircle(x, y, r * 0.6 * (0.4 + hpRatio * 0.6));
    g.fillStyle(tint(tones.spark), 0.6);
    g.fillCircle(x - r * 0.2, y - r * 0.22, r * 0.18);

    // Maturity thickens the wall.
    g.lineStyle(1 + maturity * 2.5, tint(tones.lit), 0.5 + maturity * 0.4);
    g.strokeCircle(x, y, r * 0.98);

    if (spiked) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t * 0.4;
        g.fillStyle(tint(tones.lit), 0.9);
        // Spikes are pods with the bud choked off — the one place growth points outward.
        growthPod(g, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, a, r * 0.5 * maturity, r * 0.13, 0, 0.25);
      }
    }
  }
}

// ── GrowthCulture ─────────────────────────────────────────────────────────

/**
 * Persistent mat of budding pods around a fighter (the mastery passive, transformations).
 * Driven by whoever owns it — call `update` every frame with the fighter's position.
 */
export class GrowthCulture {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private moteAccum = 0;
  private pods: { ang: number; len: number; w: number; speed: number; phase: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: GrowthColorFn,
    private tones: GrowthTones,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 9,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.pods = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.55 + Math.random() * 0.55,
      w: 0.11 + Math.random() * 0.07,
      speed: 1.6 + Math.random() * 2.2,
      phase: Math.random() * TAU,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    // A colony creeps rather than spins — the drift here is deliberately slow.
    const spin = this.t * 0.35;
    g.fillStyle(this.tint(this.tones.shell), 0.24 * this.intensity * alpha);
    g.fillCircle(x, y, this.radius * (0.9 + Math.sin(this.t * 2.4) * 0.05));

    for (const p of this.pods) {
      const wob = Math.sin(this.t * p.speed + p.phase);
      const len = this.radius * p.len * (0.75 + wob * 0.3) * this.intensity;
      const ang = p.ang + spin + wob * 0.1;
      growthPodLayered(
        g, this.tint, this.tones,
        x + Math.cos(ang) * this.radius * 0.4, y + Math.sin(ang) * this.radius * 0.4,
        ang, len, this.radius * p.w, wob * this.radius * 0.28, 0.62 * alpha,
        { cilia: 2, phase: p.phase + this.t * 6, bud: 1 + (0.5 + wob * 0.5) * 0.5 },
      );
    }

    this.moteAccum += delta;
    const interval = 300 / Math.max(0.4, this.intensity);
    if (this.moteAccum >= interval) {
      this.moteAccum = 0;
      new GrowthFx(this.scene, this.tint).motes(
        x + (Math.random() - 0.5) * this.radius * 1.3,
        y + (Math.random() - 0.5) * this.radius * 0.8,
        1, { speed: 20, size: 2.4, life: 760, rise: 22, depth: 4, tones: this.tones },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── GrowthAvatar ──────────────────────────────────────────────────────────

/** Concentric discs of one cell-blob hand, outermost first. */
const GROWTH_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: GROWTH.stem, alpha: 0.3 },
    { r: 6.6, color: GROWTH.leaf, alpha: 0.95 },
    { r: 3.6, color: GROWTH.lime, alpha: 1 },
    // Nucleus rather than a specular pip: a cell hand is a body, not a polished sphere.
    { r: 1.8, color: GROWTH.humus, alpha: 0.95, ox: -1.4, oy: -1.4 },
  ],
  eyeWhite: GROWTH.pollen,
  eyePupil: GROWTH.rot,
  // A cell hand is soft — it deforms more than most.
  squash: { div: 12, x: 0.6, y: 0.36 },
};

/**
 * The growth character rig: two cell-blob hands, a pair of eyes, and a crown of budding
 * pseudopods. The hands, eyes and gestures come from BaseAvatar; what growth adds is the
 * biofilm it stands in and the colony it wears.
 */
export class GrowthAvatar extends BaseAvatar {
  private fx: GrowthFx;
  private tones: GrowthTones;

  constructor(scene: Phaser.Scene, tint: GrowthColorFn, tones: GrowthTones = CULTURE_TONES, depth = 6) {
    super(scene, tint, depth, GROWTH_AVATAR);
    this.fx = new GrowthFx(scene, tint);
    this.tones = tones;
    if (tones !== CULTURE_TONES) this.repaintHands();
  }

  private repaintHands(): void {
    this.forEachHandLayer(0, (halo) => halo.setFillStyle(this.tint(this.tones.shell), 0.3));
    this.forEachHandLayer(1, (shell) => shell.setFillStyle(this.tint(this.tones.body), 0.95));
    this.forEachHandLayer(2, (core) => core.setFillStyle(this.tint(this.tones.cyto), 1));
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself, so a mastered growth
   * user is identifiable at a glance before they cast anything: pale eyes, a wider culture halo
   * and a membrane rim on each hand, a taller and denser crown, and three daughter cells
   * orbiting the head. Shape changes, not just brighter tints — a tint alone vanishes at
   * gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? GROWTH.white : GROWTH.pollen);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(this.tint(on ? this.tones.cyto : this.tones.shell), on ? 0.32 : 0.3);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(this.tones.spark), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed daughter cells. */
  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 16, size: 2.2, life: 620, rise: 16, depth: 5, tones: this.tones });
  }

  /** The biofilm the character is standing in, creeping outward along the ground. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(this.tones.shell), a * 0.34 * this.intensity);
    g.fillEllipse(x, y + 6, 56 * this.intensity, 32 * this.intensity);
    g.fillStyle(this.tint(this.tones.body), a * 0.16 * this.intensity);
    g.fillEllipse(x, y + 5, 36 * this.intensity, 20 * this.intensity);
    for (let i = 0; i < 5; i++) {
      const ang = this.t * 0.4 + (i / 5) * TAU;
      const reach = (14 + Math.sin(this.t * 1.9 + i * 1.3) * 5) * this.intensity;
      g.fillStyle(this.tint(this.tones.cyto), a * 0.45);
      growthPod(g, x, y + 6, ang, reach, 3, Math.sin(this.t + i) * 6);
    }
  }

  /**
   * The crown: pseudopods budding off the top of the head, each swelling and relaxing on its
   * own beat. Rooted at y - 18 so they never cover the face, and drawn over the sprite so the
   * bright nuclei in the buds show rather than only the dark membranes clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const rootY = y - 18;
    const count = this.mastered ? 5 : 3;
    const scale = this.mastered ? 1.35 : 1;

    for (let i = 0; i < count; i++) {
      const side = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
      const p = this.t * 1.9 + i * 1.6;
      const reach = (19 + Math.sin(p) * 5) * this.intensity * scale;
      growthPodLayered(
        g, this.tint, this.tones,
        x + side * 6.5, rootY,
        -Math.PI / 2 + side * 0.45, reach, 4.8 * scale,
        Math.sin(p * 0.8) * 8, a * 0.95,
        { cilia: 2, phase: p * 2, bud: 1 + (0.5 + 0.5 * Math.sin(p * 1.3)) * 0.6 },
      );
    }

    // Mastery colony: three daughter cells circling the head on a shallow ellipse, each with a
    // visible nucleus so they read as bodies rather than as beads on a wire.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.3 + (i / 3) * TAU;
        const cx = x + Math.cos(p) * 24;
        const cy = y - 30 + Math.sin(p) * 7;
        const beat = 1 + Math.sin(this.t * 3 + i * 2) * 0.15;
        g.fillStyle(this.tint(this.tones.shell), alpha * 0.6);
        g.fillCircle(cx, cy, 5.4 * beat);
        g.fillStyle(this.tint(this.tones.cyto), alpha * 0.95);
        g.fillCircle(cx, cy, 3.8 * beat);
        g.fillStyle(this.tint(this.tones.spark), alpha * 0.9);
        g.fillCircle(cx - 1.2, cy - 1.2, 1.5);
      }
    }
  }
}
