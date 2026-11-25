import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Air renders: the living-wind avatar (ball arms + eyes +
 * a cyclone crown), the draft aura, and the one-shot effects every air ability fires off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live
 * in ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * air air: the curl, the palette, and the effects built out of them.
 *
 * Colours must come from the AIR palette below. Air has no skin yet, but every
 * call still routes through the owner's `airColor` mapper, so the day one lands it is a table
 * edit in SkinsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — SkinsKit.airColor bound to one owner. */
export type AirColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const AIR = {
  void: 0x24303c,
  slate: 0x445668,
  storm: 0x6688aa,
  steel: 0x88aacc,
  blue: 0x88ccff,
  sky: 0xaaddff,
  cyan: 0xbbe8ff,
  frost: 0xccddff,
  mist: 0xe4f2ff,
  white: 0xffffff,
  /** Storm's earthed static — the one hot colour air is allowed. */
  charge: 0xffee44,
  bolt: 0xfff7bb,
  /** The dancer's fan ribs, and the phantom glaives the R upgrade leaves behind. */
  wood: 0xb4854a,
  woodDark: 0x6a4a26,
  /** Winds of Change: the blossom carried in on the mastery's petals. */
  blossom: 0xffd2e4,
} as const;

/**
 * A wind curl: a crescent that bends along its own length, pinched to nothing at both ends and
 * fattest a little past the middle, hooking harder the further out it runs. This is the
 * primitive every air shape is built from — gusts, the cyclone crown, trap cages, the tornado
 * funnel and the curls that peel off a hitscan all call it.
 *
 * Note it is neither a flame tongue (fat root, sharp tip) nor a water ribbon (sharp root, fat
 * head). Moving air has no root and no head — it is a sheared band with two feathered ends,
 * and the bend is what makes it read as air rather than as a leaf or a blade.
 */
export function windCurl(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curl = 0,
): void {
  const SEG = 10;
  const step = len / SEG;
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  let px = cx, py = cy;
  let crestX = cx, crestY = cy, beadX = cx, beadY = cy;

  for (let i = 0; i <= SEG; i++) {
    const f = i / SEG;
    // The bend accelerates along the length, so the tail hooks instead of arcing evenly.
    const a = angle + curl * f * f;
    // Crescent width profile: zero at both ends, peaking just past the middle.
    const w = halfW * Math.sin(Math.PI * Math.pow(f, 0.82));
    const nx = -Math.sin(a), ny = Math.cos(a);
    left.push({ x: px + nx * w, y: py + ny * w });
    right.push({ x: px - nx * w, y: py - ny * w });
    if (i === Math.round(SEG * 0.45)) { crestX = px; crestY = py; }
    if (i === Math.round(SEG * 0.72)) { beadX = px; beadY = py; }
    px += Math.cos(a) * step;
    py += Math.sin(a) * step;
  }

  g.beginPath();
  g.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) g.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
  g.closePath();
  g.fillPath();

  // Rounded crest and shoulder. Without them a ring of curls reads as a ring of blades; air
  // needs the swollen middle to look like a body of moving gas rather than a cut.
  g.fillCircle(crestX, crestY, halfW * 0.92);
  g.fillCircle(beadX, beadY, halfW * 0.52);
}

/** Layered curl: a wide soft envelope of displaced air, the visible band, and a bright edge. */
export function windCurlLayered(
  g: Phaser.GameObjects.Graphics,
  tint: AirColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  curl: number, alpha: number,
): void {
  g.fillStyle(tint(AIR.steel), alpha * 0.3);
  windCurl(g, cx, cy, angle, len * 1.06, halfW * 1.55, curl * 0.86);
  g.fillStyle(tint(AIR.sky), alpha * 0.62);
  windCurl(g, cx, cy, angle, len, halfW, curl);
  // The highlight rides the leading half of the band rather than nesting at the root: air is
  // lit where it is moving fastest, and a core-lit curl reads as a glowing worm instead.
  const a2 = angle + curl * 0.09;
  g.fillStyle(tint(AIR.mist), alpha * 0.85);
  windCurl(
    g,
    cx + Math.cos(a2) * len * 0.18, cy + Math.sin(a2) * len * 0.18,
    a2, len * 0.66, halfW * 0.4, curl * 0.75,
  );
}

/**
 * A single feather: a tapered shaft with barbs combed off both sides, the vane fullest a third
 * of the way up and split at the tip. Air's fluff — what the dancer sheds, and what a landed
 * strike scatters.
 */
export function feather(
  g: Phaser.GameObjects.Graphics,
  tint: AirColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  alpha: number,
  // Typed wide on purpose: `AIR` is an `as const` table, so an inferred default would pin this
  // to that one literal and refuse every other palette key.
  color: number = AIR.mist,
): void {
  const nx = -Math.sin(angle), ny = Math.cos(angle);
  const vane = (f: number) => halfW * Math.sin(Math.PI * Math.pow(f, 0.55)) * (1 - f * 0.25);

  g.fillStyle(tint(color), alpha * 0.6);
  g.beginPath();
  const SEG = 12;
  for (let i = 0; i <= SEG; i++) {
    const f = i / SEG;
    const px = cx + Math.cos(angle) * len * f + nx * vane(f);
    const py = cy + Math.sin(angle) * len * f + ny * vane(f);
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  for (let i = SEG; i >= 0; i--) {
    const f = i / SEG;
    g.lineTo(
      cx + Math.cos(angle) * len * f - nx * vane(f),
      cy + Math.sin(angle) * len * f - ny * vane(f),
    );
  }
  g.closePath();
  g.fillPath();

  // Barbs: fine strokes raked back off the shaft, which is what separates a feather from a leaf.
  g.lineStyle(0.8, tint(AIR.white), alpha * 0.45);
  for (let i = 1; i < 7; i++) {
    const f = i / 7;
    const bx = cx + Math.cos(angle) * len * f;
    const by = cy + Math.sin(angle) * len * f;
    const w = vane(f);
    for (const s of [1, -1]) {
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + nx * s * w + Math.cos(angle) * len * 0.09, by + ny * s * w + Math.sin(angle) * len * 0.09);
      g.strokePath();
    }
  }
  // Shaft.
  g.lineStyle(1.1, tint(AIR.white), alpha * 0.8);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
  g.strokePath();
}

export interface MoteOpts {
  speed?: number;
  spread?: number;
  angle?: number;
  size?: number;
  life?: number;
  depth?: number;
  /** Radians the mote's heading sweeps over its life — what makes air curl and dust fall.  */
  swirl?: number;
}

export interface GustBurstOpts {
  /** Curls flung outward. Defaults to radius/8. */
  curls?: number;
  /** Drifting haze puffs. Defaults to radius/26. */
  haze?: number;
  /** Leave a swept dust mark on the ground. Default true. */
  dust?: boolean;
  /** Render depth of the vortex body. Default 6. */
  depth?: number;
  /** Total life of the vortex body in ms. Defaults to scale with radius. */
  duration?: number;
}


// ── AirFx ─────────────────────────────────────────────────────────────────

/**
 * One-shot air effects. Cheap to construct — build one per owner (or per cast, as the ability
 * file does) and hand it the owner's colour mapper.
 */
export class AirFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: AirColorFn = (c) => c) {
    super(scene, tint);
  }

  /**
   * Expanding pressure front. A blast front is ragged and a ripple is smooth; a pressure wave
   * in air is neither, so this one is a clean ring that leans elliptically along a fixed axis,
   * which is what sells it as a compression wave rather than a UI circle.
   */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 4, depth = 6): void {
    const c = this.tint(color);
    // Segment count tracks the radius: a fixed count turns big fronts into visible polygons.
    const segs = Phaser.Math.Clamp(Math.round(toR / 3), 40, 120);
    const lean = Math.random() * TAU;
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      // The front stretches along its lean axis as it outruns itself.
      const squash = 1 + (1 - t) * 0.14;
      g.lineStyle(Math.max(0.5, width * (1 - t * 0.75)), c, 0.8 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r * (1 + Math.cos((a - lean) * 2) * (squash - 1));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    });
  }

  /** Blown-out white core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, AIR.white, AIR.mist, depth);
  }

  /**
   * The mark a gust leaves behind: dust swept into rotating arcs that spin down and settle.
   * Deliberately broken into arcs — a closed ring reads as a decal, while a few sweeping
   * strokes read as loose grit that was pushed and is still coasting.
   */
  dustMark(x: number, y: number, radius: number, depth = 1): void {
    const arcs = Array.from({ length: 6 }, (_, i) => ({
      r: radius * (0.35 + (i / 6) * 0.75),
      from: Math.random() * TAU,
      span: 0.6 + Math.random() * 1.5,
      spin: (0.5 + Math.random()) * (i % 2 ? 1 : -1),
    }));
    this.anim(depth, 1700, (g, t) => {
      const a = (t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92);
      // Rotation bleeds off as the dust loses the wind that was carrying it.
      const spun = easeOut(t) * 1.5;
      for (const arc of arcs) {
        g.lineStyle(2.4 * a, this.tint(AIR.steel), 0.3 * a);
        g.beginPath();
        const from = arc.from + arc.spin * spun;
        const segs = 10;
        for (let i = 0; i <= segs; i++) {
          const ang = from + (i / segs) * arc.span;
          const px = x + Math.cos(ang) * arc.r;
          const py = y + Math.sin(ang) * arc.r * 0.6;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    });
  }

  /**
   * Flung motes of dust and vapour. Unlike embers (which rise) or droplets (which fall), these
   * curve: each one's heading sweeps through `swirl` over its life, so a burst of them spirals
   * outward instead of radiating in straight spokes.
   */
  motes(x: number, y: number, count: number, opts: MoteOpts = {}): void {
    const speed = opts.speed ?? 130;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 3;
    const life = opts.life ?? 520;
    const swirl = opts.swirl ?? 1.1;
    const depth = opts.depth ?? 6;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      return {
        a, v: speed * (0.45 + Math.random() * 0.9),
        r: size * (0.5 + Math.random() * 0.9),
        turn: swirl * (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8),
        bright: Math.random() < 0.4,
        delay: Math.random() * 0.18,
      };
    });

    this.anim(depth, life, (g, t) => {
      const secs = life / 1000;
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        // Integrating a turning heading in closed form: the path is an arc, so sample the
        // previous position too and draw the mote as the streak between the two.
        const at = (f: number) => {
          const d = p.v * easeOut(f) * secs;
          const a = p.a + p.turn * f * f;
          return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, a };
        };
        const cur = at(lt);
        const old = at(Math.max(0, lt - 0.12));
        const fade = 1 - lt * lt;
        const stretch = Math.hypot(cur.x - old.x, cur.y - old.y);
        g.fillStyle(this.tint(p.bright ? AIR.mist : AIR.sky), 0.85 * fade);
        windCurl(g, old.x, old.y, old.a, stretch + p.r * 2, p.r * fade, p.turn * 0.5);
        g.fillStyle(this.tint(AIR.white), 0.5 * fade * fade);
        g.fillCircle(cur.x, cur.y, p.r * fade * 0.4);
      }
    });
  }

  /** Thin vapour that swells and slides sideways — the tail end of a big displacement. */
  haze(x: number, y: number, count: number, radius: number, depth = 4): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.2,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.25 + Math.random() * 0.3),
      // Haze rides the wind sideways instead of rising the way smoke does.
      driftX: (Math.random() - 0.5) * 90,
      driftY: -14 - Math.random() * 20,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1100, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const cx = x + p.ox + p.driftX * lt;
        const cy = y + p.oy + p.driftY * lt;
        g.fillStyle(this.tint(AIR.mist), 0.2 * (1 - lt));
        g.fillEllipse(cx, cy, p.r * (1.6 + lt * 2.4), p.r * (0.9 + lt * 1.2));
        g.fillStyle(this.tint(AIR.steel), 0.1 * (1 - lt));
        g.fillEllipse(cx, cy, p.r * (1.1 + lt * 1.6), p.r * (0.6 + lt * 0.8));
      }
    });
  }

  /**
   * The turning body of air at the centre of a burst: two counter-rotating rings of curls that
   * swell and spin down over a compressed core. Reads as rotation rather than as a flat disc,
   * which is the whole difference between an air blast and a fire one.
   */
  vortexCore(x: number, y: number, radius: number, duration: number, depth = 6): void {
    const bands = [
      { count: 7, r: 0.72, len: 0.62, w: 0.15, spin: 3.2, dir: 1, color: AIR.storm, alpha: 0.5 },
      { count: 6, r: 0.46, len: 0.5, w: 0.14, spin: -4.6, dir: -1, color: AIR.sky, alpha: 0.7 },
      { count: 5, r: 0.24, len: 0.36, w: 0.12, spin: 6.4, dir: 1, color: AIR.mist, alpha: 0.8 },
    ];
    const phases = bands.map((b) => Array.from({ length: b.count }, () => Math.random() * TAU));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.4 + easeOut(Math.min(1, t * 1.4)) * 0.75;
      const fade = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      bands.forEach((b, bi) => {
        for (let i = 0; i < b.count; i++) {
          const a = phases[bi][i] + (i / b.count) * TAU + t * b.spin;
          const rr = radius * grow * b.r;
          const cx = x + Math.cos(a) * rr;
          const cy = y + Math.sin(a) * rr;
          // Tangent to the band, so every curl lies along the direction it is travelling.
          const tan = a + b.dir * Math.PI * 0.5;
          g.fillStyle(this.tint(b.color), b.alpha * fade);
          windCurl(g, cx, cy, tan, radius * grow * b.len, radius * grow * b.w, b.dir * 1.6);
        }
      });
      // Compressed eye, first half only.
      if (t < 0.5) {
        g.fillStyle(this.tint(AIR.white), (1 - t / 0.5) * 0.75);
        g.fillCircle(x, y, radius * grow * 0.2);
      }
    });
  }

  /**
   * Ring of curls thrown outward from a point, each leaning into the spin so the burst turns
   * as it opens. Used wherever air erupts rather than detonates.
   */
  bloom(x: number, y: number, radius: number, petals = 10, depth = 4): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const seeds = Array.from({ length: petals }, (_, i) => ({
      // Uneven lengths, staggered roots and per-petal delays: petals fired from one point at
      // one length read as a starburst, so every one of these is deliberately out of step.
      ang: (i / petals) * TAU + (Math.random() - 0.5) * 0.8,
      root: radius * (0.1 + Math.random() * 0.28),
      len: radius * (0.4 + Math.random() * 0.7),
      w: radius * (0.1 + Math.random() * 0.1),
      curl: dir * (1.1 + Math.random() * 1.3),
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 460, (g, t) => {
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(lt);
        const fade = 1 - easeIn(lt);
        // Petals lean further off-radial as they open, which is what turns a starburst into
        // a pinwheel — the single cheapest read on "this is spinning".
        const lean = s.ang + dir * 0.55 * lt;
        const rx = x + Math.cos(s.ang) * s.root * grow;
        const ry = y + Math.sin(s.ang) * s.root * grow;
        windCurlLayered(g, this.tint, rx, ry, lean, s.len * grow, s.w * (1 - lt * 0.35), s.curl * lt, 0.75 * fade);
      }
    });
    this.ring(x, y, radius * 0.15, radius, AIR.mist, 400, 3, depth);
  }

  /** Flash + turning vortex + stacked pressure fronts + curl shrapnel + haze + dust mark. */
  gustBurst(x: number, y: number, radius: number, opts: GustBurstOpts = {}): void {
    const curls = opts.curls ?? Math.round(radius / 8);
    const hazeCount = opts.haze ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(320 + radius * 1.4);
    const depth = opts.depth ?? 6;

    if (opts.dust !== false) this.dustMark(x, y, radius * 0.7);
    this.vortexCore(x, y, radius * 0.72, dur, depth);
    this.flash(x, y, radius * 0.32, depth + 1);
    this.bloom(x, y, radius * 0.9, Math.max(8, Math.round(radius / 10)), depth);
    this.ring(x, y, radius * 0.2, radius * 1.15, AIR.white, Math.round(dur * 0.7), 5, depth);
    this.scene.time.delayedCall(70, () => this.ring(x, y, radius * 0.15, radius * 1.42, AIR.cyan, dur, 4, depth));
    this.scene.time.delayedCall(160, () => this.ring(x, y, radius * 0.1, radius * 1.6, AIR.storm, dur, 3, depth));
    this.motes(x, y, curls, {
      speed: radius * 2.3, size: 2.8 + radius / 55,
      life: Math.round(dur * 1.4), swirl: 1.4, depth,
    });
    if (hazeCount > 0) this.haze(x, y, hazeCount, radius * 0.85, depth - 2);
  }

  /** Recoil cone at the muzzle — sells that something was actually thrown. */
  muzzleGust(x: number, y: number, angle: number, scale = 1, depth = 6): void {
    this.anim(depth, 150, (g, t) => {
      const fade = 1 - t;
      const grow = 0.5 + easeOut(t) * 0.8;
      for (const s of [1, -1, 0]) {
        windCurlLayered(
          g, this.tint, x, y, angle + s * 0.4,
          24 * scale * grow, 6 * scale * fade, s * 1.6, 0.7 * fade,
        );
      }
      g.fillStyle(this.tint(AIR.white), 0.8 * fade);
      g.fillCircle(x, y, 5.5 * scale * (1 - t * 0.4));
    });
    this.motes(x, y, 4, { angle, spread: 0.7, speed: 120, size: 2.2, life: 300, depth });
  }

  /**
   * The channel a dash or grapple cuts through the air: curls collapsing back into the gap
   * behind the runner, plus the shove kicked out of the launch point.
   */
  slipstream(x1: number, y1: number, x2: number, y2: number, depth = 4): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.max(3, Math.round(dist / 26));
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < steps; i++) {
        const f = i / (steps - 1 || 1);
        const cx = x1 + (x2 - x1) * f;
        const cy = y1 + (y2 - y1) * f;
        // The channel is widest where the runner started and closes from the back forward.
        const local = Math.max(0, fade - f * 0.35);
        if (local <= 0) continue;
        // Curls fold in from both flanks as the low-pressure gap fills.
        for (const s of [1, -1]) {
          const off = (14 + f * 12) * (1 - local);
          windCurlLayered(
            g, this.tint,
            cx - Math.sin(angle) * s * off, cy + Math.cos(angle) * s * off,
            angle + s * 0.45 * (1 - local), (10 + (1 - f) * 26) * local, 4.2 * local,
            -s * 1.5, 0.65 * local,
          );
        }
        g.fillStyle(this.tint(AIR.mist), 0.25 * local);
        g.fillCircle(cx, cy, (3 + (1 - f) * 8) * local);
      }
    });
    this.motes(x1, y1, 10, { angle: angle + Math.PI, spread: 0.9, speed: 170, size: 2.8, life: 460, swirl: 1.6, depth });
    this.ring(x1, y1, 6, 52, AIR.mist, 380, 3, depth);
  }

  /**
   * The rope a grapple throws: three wind strands braiding around a taut line, snapping
   * straight as the hook bites. Drawn once per cast for the length of the flight.
   */
  hookLine(x1: number, y1: number, x2: number, y2: number, duration: number, depth = 7): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const px = -Math.sin(angle), py = Math.cos(angle);
    const strands = [
      { phase: 0, amp: 9, waves: 3 },
      { phase: 2.1, amp: 6, waves: 4 },
      { phase: 4.2, amp: 4, waves: 5 },
    ];
    this.anim(depth, duration, (g, t) => {
      // Strands wrap loosely at first and pull flat as the line goes taut.
      const slack = 1 - easeIn(t);
      const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      for (const s of strands) {
        g.lineStyle(2.2 * fade, this.tint(AIR.sky), 0.65 * fade);
        g.beginPath();
        const SEG = 24;
        for (let i = 0; i <= SEG; i++) {
          const f = i / SEG;
          // Amplitude tapers at both ends so the braid is anchored, not floating.
          const env = Math.sin(Math.PI * f) * s.amp * slack;
          const off = Math.sin(f * s.waves * TAU + s.phase + t * 9) * env;
          const ex = x1 + (x2 - x1) * f + px * off;
          const ey = y1 + (y2 - y1) * f + py * off;
          if (i === 0) g.moveTo(ex, ey); else g.lineTo(ex, ey);
        }
        g.strokePath();
      }
      g.lineStyle(1.4 * fade, this.tint(AIR.white), 0.8 * fade);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
      // The hook itself: a curl biting into the far end.
      g.fillStyle(this.tint(AIR.mist), 0.85 * fade);
      windCurl(g, x2, y2, angle + Math.PI * 0.6, 20, 5, 2.4);
      windCurl(g, x2, y2, angle - Math.PI * 0.6, 20, 5, -2.4);
    });
  }

  /**
   * Column of air punching upward and fanning out at the top. Kept to a few broad curls: thin
   * ones just read as scratches over whatever is beneath.
   */
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
      // Turning throat at the base, so the column looks anchored in something.
      g.fillStyle(this.tint(AIR.mist), 0.42 * fade);
      g.fillEllipse(x, y, radius * 1.6, radius * 0.7);
      for (const j of jets) {
        const rise = easeOut(Math.max(0, (t - j.delay) / (1 - j.delay)));
        windCurlLayered(
          g, this.tint, x + j.ox, y + radius * 0.2,
          -Math.PI / 2 + Math.sin(t * 6 + j.phase) * 0.12,
          j.h * rise, j.w * (1 - t * 0.3), j.curl * rise * 1.6, 0.8 * fade,
        );
      }
      // Cap blown off the top once the column tops out.
      if (t > 0.3) {
        const cap = (t - 0.3) / 0.7;
        g.fillStyle(this.tint(AIR.mist), 0.3 * fade);
        g.fillEllipse(x, y - height * 0.9, radius * (1.4 + cap * 2.6), radius * (0.4 + cap * 0.8));
      }
    });
    this.motes(x, y - height * 0.5, 9, {
      speed: radius * 1.2, spread: 0.9, angle: -Math.PI / 2,
      size: 3.2, life: 800, swirl: 1.8, depth,
    });
  }

  /**
   * The crackle of a Storm-perk lightning strike: forked bolts re-rolled every
   * tick, so the charge fizzes rather than sitting there as a coloured disc.
   */
  staticSnap(x: number, y: number, radius: number, depth = 7): void {
    const forks = Array.from({ length: 5 }, (_, i) => ({
      ang: (i / 5) * TAU + Math.random() * 0.6,
      len: radius * (0.7 + Math.random() * 0.7),
    }));
    this.anim(depth, 200, (g, t) => {
      const fade = 1 - t;
      for (const f of forks) {
        g.lineStyle(2.2 * fade, this.tint(AIR.charge), 0.9 * fade);
        g.beginPath();
        g.moveTo(x, y);
        // Three jagged joints, re-rolled per frame — the whole point of drawn lightning.
        let cx = x, cy = y;
        for (let j = 1; j <= 3; j++) {
          const jf = j / 3;
          const a = f.ang + (Math.random() - 0.5) * 0.8;
          cx = x + Math.cos(a) * f.len * jf;
          cy = y + Math.sin(a) * f.len * jf;
          g.lineTo(cx, cy);
        }
        g.strokePath();
      }
      g.fillStyle(this.tint(AIR.bolt), 0.8 * fade);
      g.fillCircle(x, y, radius * 0.3 * fade);
    });
  }

  /**
   * Wind Splice's near cut: a fan opened through an arc, leaving a crescent of severed air that
   * peels apart down the middle. Drawn as a swept band rather than a cone — the cut is the edge
   * of the fan travelling, not a spray coming off the dancer.
   */
  fanCut(x: number, y: number, angle: number, radius: number, half: number, depth = 7): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    this.anim(depth, 260, (g, t) => {
      const swept = easeOut(Math.min(1, t / 0.45));
      const fade = 1 - easeIn(t);
      // The blade travels from one lip of the arc to the other, so the cut has a direction.
      const from = angle - dir * half;
      const to = from + dir * half * 2 * swept;

      // Severed air: a crescent band that thins and drifts outward as the two halves part.
      for (const s of [1, -1]) {
        const off = 6 * (1 - fade) * s;
        g.lineStyle(7 * fade, this.tint(s > 0 ? AIR.mist : AIR.sky), 0.55 * fade);
        g.beginPath();
        const SEG = 22;
        for (let i = 0; i <= SEG; i++) {
          const a = from + (to - from) * (i / SEG);
          const rr = radius * (0.94 + 0.1 * Math.sin(i * 1.7)) + off;
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      // Hard bright edge exactly where the fan is right now.
      g.fillStyle(this.tint(AIR.white), 0.9 * fade);
      windCurl(g, x + Math.cos(to) * radius * 0.55, y + Math.sin(to) * radius * 0.55,
        to + dir * Math.PI * 0.5, radius * 0.7, 4.5 * fade, dir * 1.2);
      // Feathers shaken loose along the arc.
      for (let i = 0; i < 4; i++) {
        const a = from + (to - from) * ((i + 0.5) / 4);
        feather(g, this.tint,
          x + Math.cos(a) * radius * (0.7 + 0.25 * i / 4), y + Math.sin(a) * radius * (0.7 + 0.25 * i / 4),
          a + dir * 1.2 + t * dir, 16 * fade, 3.4 * fade, 0.7 * fade);
      }
    });
    this.motes(x + Math.cos(angle) * radius * 0.6, y + Math.sin(angle) * radius * 0.6, 6, {
      angle, spread: half, speed: 190, size: 2.6, life: 380, swirl: 1.6, depth: depth - 1,
    });
  }

  /**
   * Spin Dance: the dancer turned through a full revolution, drawn as a closing ring of fan
   * edges that chase each other round her. E+'s flip reuses `flipCut` instead — a spin and a
   * flip must not look alike or the two-charge rhythm is unreadable.
   */
  spinFlourish(x: number, y: number, radius: number, depth = 6): void {
    const dir = Math.random() < 0.5 ? 1 : -1;
    this.anim(depth, 420, (g, t) => {
      const fade = 1 - easeIn(t);
      const spun = easeOut(t) * TAU * 1.15;
      // Two fan edges 180° apart — one per hand — sweeping the whole circle.
      for (const lead of [0, Math.PI]) {
        for (let i = 0; i < 9; i++) {
          const trail = i / 9;
          const a = lead + dir * (spun - trail * 1.5);
          const rr = radius * (0.55 + 0.45 * easeOut(t));
          windCurlLayered(
            g, this.tint,
            x + Math.cos(a) * rr, y + Math.sin(a) * rr,
            a + dir * Math.PI * 0.5, radius * 0.42 * (1 - trail * 0.5), 5.5 * (1 - trail * 0.7),
            dir * 1.5, fade * 0.85 * (1 - trail * 0.8),
          );
        }
      }
      // Skirt: the feathered hem flaring out with the turn.
      g.lineStyle(2.4 * fade, this.tint(AIR.frost), 0.5 * fade);
      g.strokeEllipse(x, y + 8, radius * 1.7 * (0.6 + easeOut(t) * 0.6), radius * 0.6 * (0.6 + easeOut(t) * 0.6));
    });
    this.ring(x, y, radius * 0.2, radius * 1.1, AIR.mist, 380, 4, depth);
    this.dustMark(x, y, radius * 0.8);
  }

  /**
   * E+'s flip: the dancer vaults along the aim, so the strike is a long rectangle with her in
   * the middle of it rather than a circle round her. Drawn as the box she passes through plus
   * the arc of her body going over.
   */
  flipCut(x: number, y: number, angle: number, halfLen: number, halfWid: number, depth = 7): void {
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    this.anim(depth, 380, (g, t) => {
      const fade = 1 - easeIn(t);
      const open = easeOut(Math.min(1, t / 0.4));
      // The swept box, opening from the dancer outward along both halves at once.
      g.fillStyle(this.tint(AIR.sky), 0.2 * fade);
      g.beginPath();
      const L = halfLen * open, W = halfWid * (0.5 + open * 0.5);
      g.moveTo(x + Math.cos(angle) * L + nx * W, y + Math.sin(angle) * L + ny * W);
      g.lineTo(x + Math.cos(angle) * L - nx * W, y + Math.sin(angle) * L - ny * W);
      g.lineTo(x - Math.cos(angle) * L - nx * W, y - Math.sin(angle) * L - ny * W);
      g.lineTo(x - Math.cos(angle) * L + nx * W, y - Math.sin(angle) * L + ny * W);
      g.closePath();
      g.fillPath();
      // Both long edges as travelling curls, which is where the cut actually reads.
      for (const s of [1, -1]) {
        for (let i = 0; i < 5; i++) {
          const f = (i / 4 - 0.5) * 2;
          windCurlLayered(
            g, this.tint,
            x + Math.cos(angle) * L * f + nx * s * W, y + Math.sin(angle) * L * f + ny * s * W,
            angle, halfLen * 0.42 * open, 4.2 * fade, s * 0.9, fade * 0.7,
          );
        }
      }
      // The dancer's own arc over the top of it.
      g.lineStyle(3 * fade, this.tint(AIR.white), 0.7 * fade);
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const f = i / 16;
        const px = x + Math.cos(angle) * halfLen * (f * 2 - 1) * open;
        const py = y + Math.sin(angle) * halfLen * (f * 2 - 1) * open - Math.sin(f * Math.PI) * 34;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    });
    this.motes(x, y, 8, { speed: 200, size: 2.8, life: 420, swirl: 2, depth: depth - 1 });
  }

  /** Feathers knocked loose — the tell that a dance strike actually connected. */
  featherPuff(x: number, y: number, count = 6, depth = 7): void {
    const seeds = Array.from({ length: count }, () => ({
      ang: Math.random() * TAU,
      spin: (Math.random() - 0.5) * 5,
      speed: 40 + Math.random() * 70,
      len: 12 + Math.random() * 9,
      delay: Math.random() * 0.25,
    }));
    this.anim(depth, 900, (g, t) => {
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const d = s.speed * easeOut(lt) * 0.9;
        // Feathers do not fly — they are thrown, then flutter down turning over themselves.
        const fx2 = x + Math.cos(s.ang) * d;
        const fy2 = y + Math.sin(s.ang) * d + lt * lt * 26;
        feather(g, this.tint, fx2, fy2, s.ang + s.spin * lt, s.len, s.len * 0.26, (1 - lt * lt) * 0.9);
      }
    });
  }

  /** Winds of Change: blossom carried in on the reset, circling the dancer as it lands. */
  petalBurst(x: number, y: number, radius: number, count = 14, depth = 7): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU + Math.random() * 0.5,
      spin: (Math.random() - 0.5) * 6,
      r: radius * (0.5 + Math.random() * 0.6),
    }));
    this.anim(depth, 1100, (g, t) => {
      const fade = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
      for (const s of seeds) {
        const a = s.ang + t * 3.2;
        const rr = s.r * (0.3 + easeOut(t) * 0.9);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.75;
        g.fillStyle(this.tint(AIR.blossom), 0.85 * fade);
        windCurl(g, px, py, a + Math.PI * 0.5 + s.spin * t, 11, 4.2, 2.2);
        g.fillStyle(this.tint(AIR.white), 0.5 * fade);
        g.fillCircle(px, py, 1.6);
      }
    });
    this.ring(x, y, radius * 0.2, radius * 1.2, AIR.blossom, 620, 4, depth - 1);
  }

  // ── Caller-owned painters ───────────────────────────────────────────────

  /**
   * The Gale Glaive in flight or parked: the two fans locked back to back on one spindle,
   * spinning fast enough to blur into a disc of ribs. `phantom` paints the R+ afterimage
   * instead — the same shape cut out of pale wood and half faded, so it is obvious which pair
   * is the real one and which is the memory of it.
   */
  static drawGlaive(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, radius: number, spin: number, alpha: number, phantom = false,
  ): void {
    const leaf = phantom ? AIR.wood : AIR.frost;
    const rib = phantom ? AIR.woodDark : AIR.wood;
    const a = phantom ? alpha * 0.55 : alpha;

    // Blur disc: the shape the two leaves sweep out, so the glaive has mass at speed.
    g.fillStyle(tint(leaf), a * 0.18);
    g.fillCircle(x, y, radius * 1.02);
    g.lineStyle(2, tint(rib), a * 0.35);
    g.strokeCircle(x, y, radius * 1.02);

    // Two leaves, back to back on one spindle.
    for (const side of [0, Math.PI]) {
      const ang = spin + side;
      const spread = 0.62;
      g.fillStyle(tint(leaf), a * 0.72);
      g.beginPath();
      g.moveTo(x, y);
      const SEG = 16;
      for (let i = 0; i <= SEG; i++) {
        const f = i / SEG;
        const aa = ang - spread + f * spread * 2;
        const dip = 1 - 0.1 * Math.pow(Math.sin(f * 5 * Math.PI), 2);
        g.lineTo(x + Math.cos(aa) * radius * dip, y + Math.sin(aa) * radius * dip);
      }
      g.closePath();
      g.fillPath();
      for (let i = 0; i < 5; i++) {
        const aa = ang - spread + (i / 4) * spread * 2;
        g.lineStyle(1.6, tint(rib), a * 0.9);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(aa) * radius * 1.05, y + Math.sin(aa) * radius * 1.05);
        g.strokePath();
      }
      // Cutting edge: a bright curl riding the leading lip of each leaf.
      g.fillStyle(tint(phantom ? AIR.mist : AIR.white), a * 0.85);
      windCurl(g, x + Math.cos(ang + spread) * radius * 0.8, y + Math.sin(ang + spread) * radius * 0.8,
        ang + spread + Math.PI * 0.5, radius * 0.8, 3.2, 1.4);
    }

    // Spindle.
    g.fillStyle(tint(rib), a);
    g.fillCircle(x, y, radius * 0.16);
    g.fillStyle(tint(AIR.white), a * 0.8);
    g.fillCircle(x - radius * 0.05, y - radius * 0.05, radius * 0.07);
  }

  /**
   * Wind Splice's far half: a thin sheet of sheared air travelling edge-on. Painted every frame
   * into the kit's Graphics because it flies rather than flashing — a crescent with the bright
   * side leading and a pair of tails combed off the back.
   */
  static drawShear(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, angle: number, t: number, scale = 1, alpha = 1,
  ): void {
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    // Body: a crescent standing across the flight line, thin along it.
    g.fillStyle(tint(AIR.sky), 0.55 * alpha);
    g.beginPath();
    const SEG = 14;
    for (let i = 0; i <= SEG; i++) {
      const f = i / SEG - 0.5;
      const w = 17 * scale * Math.cos(f * Math.PI);
      g.lineTo(x + nx * f * 34 * scale + Math.cos(angle) * w * 0.55,
        y + ny * f * 34 * scale + Math.sin(angle) * w * 0.55);
    }
    for (let i = SEG; i >= 0; i--) {
      const f = i / SEG - 0.5;
      const w = 17 * scale * Math.cos(f * Math.PI);
      g.lineTo(x + nx * f * 34 * scale - Math.cos(angle) * w * 0.12,
        y + ny * f * 34 * scale - Math.sin(angle) * w * 0.12);
    }
    g.closePath();
    g.fillPath();

    // Leading edge, and the two tails wagging off the back of it.
    g.lineStyle(2.4 * scale, tint(AIR.white), 0.9 * alpha);
    g.beginPath();
    for (let i = 0; i <= SEG; i++) {
      const f = i / SEG - 0.5;
      const w = 17 * scale * Math.cos(f * Math.PI);
      const px = x + nx * f * 34 * scale + Math.cos(angle) * w * 0.55;
      const py = y + ny * f * 34 * scale + Math.sin(angle) * w * 0.55;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    for (const s of [1, -1]) {
      g.fillStyle(tint(AIR.mist), 0.5 * alpha);
      windCurl(
        g, x + nx * s * 15 * scale, y + ny * s * 15 * scale,
        angle + Math.PI + s * 0.3, 26 * scale, 3.4 * scale,
        s * (1.2 + Math.sin(t * 12) * 0.4),
      );
    }
  }

  /**
   * The Wind Breaker funnel, painted into a caller-owned Graphics every frame: stacked
   * bands wide at the top and pinched at the ground, wrapped by spiral curls, with debris
   * whipping round the base.
   */
  static drawTornado(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    const TOP = -radius * 1.35;
    const BOTTOM = radius * 0.55;
    const BANDS = 12;

    // Body: each band is an ellipse whose width follows the funnel profile and whose centre
    // wobbles, so the column leans and writhes instead of standing like a stack of plates.
    for (let i = 0; i < BANDS; i++) {
      const f = i / (BANDS - 1);
      const by = y + TOP + (BOTTOM - TOP) * f;
      // Funnel profile: wide mouth, throat pinched to a fifth of it.
      const bw = radius * (1.05 - 0.82 * Math.pow(f, 0.8));
      const lean = Math.sin(t * 2.4 + f * 3.4) * radius * 0.16 * (1 - f);
      const shade = 0.22 + 0.5 * (1 - f);
      g.fillStyle(tint(f > 0.6 ? AIR.slate : AIR.storm), shade * 0.5 * alpha);
      g.fillEllipse(x + lean, by, bw * 2, bw * 0.5);
      g.lineStyle(2, tint(AIR.steel), 0.4 * alpha);
      g.strokeEllipse(x + lean, by, bw * 2, bw * 0.5);
    }

    // Spiral: curls wrapped round the outside, climbing as they orbit.
    const wraps = 10;
    for (let i = 0; i < wraps; i++) {
      const p = (t * 1.1 + i / wraps) % 1;
      const f = 1 - p;
      const a = t * 5 + i * 1.9;
      const by = y + TOP + (BOTTOM - TOP) * f;
      const bw = radius * (1.05 - 0.82 * Math.pow(f, 0.8));
      const lean = Math.sin(t * 2.4 + f * 3.4) * radius * 0.16 * (1 - f);
      const near = 0.5 + 0.5 * Math.sin(a);
      windCurlLayered(
        g, tint,
        x + lean + Math.cos(a) * bw, by + Math.sin(a) * bw * 0.25,
        a + Math.PI * 0.5, bw * 0.85 * near + 8, 4 + near * 4, 1.9,
        alpha * 0.65 * near,
      );
    }

    // Debris torn along the ground at the throat.
    for (let i = 0; i < 6; i++) {
      const a = t * 7 + (i / 6) * TAU;
      const r = radius * (0.18 + 0.14 * Math.sin(t * 3 + i));
      g.fillStyle(tint(AIR.void), 0.7 * alpha);
      windCurl(g, x + Math.cos(a) * r, y + BOTTOM + Math.sin(a) * r * 0.4, a + Math.PI * 0.5, 12, 3, 2);
    }

    // Dark eye at the throat so the funnel has somewhere to disappear into.
    g.fillStyle(tint(AIR.void), 0.45 * alpha);
    g.fillEllipse(x, y + BOTTOM * 0.6, radius * 0.4, radius * 0.16);
  }

  /**
   * Weather Cycle: a ring of wind wrapped round the dancer at waist height. Recording, the
   * curls orbit one way and a band at the feet fills as the window runs down; playing back, they
   * run the other way, brighter and looser — the same weather, rewound.
   */
  /**
   * The Vacuum perk's standing draw: a faint floor disc, a breathing rim, and wind curls born
   * on the rim that spiral inward and thin out as they reach her — air being drawn in, never
   * thrown out. `holding` (someone is caught) runs it brighter and faster.
   */
  static drawVacuum(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, radius: number, t: number, holding: boolean,
  ): void {
    const k = holding ? 1 : 0.7;
    const cy = y + 6;
    g.fillStyle(tint(AIR.steel), 0.05 * k);
    g.fillEllipse(x, cy, radius * 2, radius * 1.1);
    g.lineStyle(1.6, tint(AIR.sky), 0.28 * k);
    g.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * TAU;
      const w = Math.sin(a * 5 - t * 3) * 3 + Math.sin(a * 9 + t * 2) * 1.5;
      const px = x + Math.cos(a) * (radius + w), py = cy + Math.sin(a) * (radius + w) * 0.55;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();

    // Inward spiral: each curl's life runs rim → centre, swinging a quarter turn on the way.
    const curls = 8;
    const speed = holding ? 0.8 : 0.55;
    for (let i = 0; i < curls; i++) {
      const life = (t * speed + i / curls) % 1;
      const r = radius * (1 - life * 0.82);
      const a = (i / curls) * TAU - life * Math.PI * 0.5 + t * 0.4;
      const px = x + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r * 0.55;
      // Pointing at her, bent with the swirl.
      const heading = Math.atan2(cy - py, x - px) - 0.5;
      const fade = Math.sin(Math.PI * life);
      windCurlLayered(g, tint, px, py, heading, 18 + 14 * (1 - life), 3 + 2 * (1 - life), 1.1, 0.5 * k * fade);
    }

    // Grit riding the draw.
    for (let i = 0; i < 10; i++) {
      const life = (t * speed * 1.3 + i * 0.37) % 1;
      const a = i * 2.1 - life * 1.2;
      const r = radius * (0.95 - life * 0.85);
      g.fillStyle(tint(AIR.mist), 0.5 * k * (1 - life));
      g.fillCircle(x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55 - 4, 1.4);
    }
  }

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
      const cx = x + Math.cos(a) * r;
      const cy = y - 6 + Math.sin(a) * r * 0.55;
      // Front curls pass in front of the body and read brighter; the back ones sit behind.
      const near = 0.5 + 0.5 * Math.sin(a);
      windCurlLayered(
        g, tint, cx, cy, a + dir * Math.PI * 0.5,
        22 + near * 10, 4 + near * 3, 1.6 * dir, alpha * (0.3 + 0.55 * near) * (replay ? 1.1 : 1),
      );
    }

    // Dust stirred at the feet, and the band that shows how much of the window is left.
    g.lineStyle(2, tint(replay ? AIR.mist : AIR.sky), 0.35 * alpha);
    g.strokeEllipse(x, y + 6, radius * 2.1, radius * 1.1);
    g.lineStyle(3, tint(replay ? AIR.white : AIR.cyan), 0.85 * alpha);
    g.beginPath();
    g.arc(x, y + 6, radius * 0.72, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(progress, 0.001, 1), false);
    g.strokePath();

    // Motes caught in the ring, riding it round.
    for (let i = 0; i < 7; i++) {
      const a = dir * t * 5 + i * 0.9;
      const rr = radius * (0.55 + 0.3 * Math.sin(t * 3 + i));
      g.fillStyle(tint(AIR.white), 0.55 * alpha);
      g.fillCircle(x + Math.cos(a) * rr, y - 12 + Math.sin(a) * rr * 0.55 - Math.sin(t * 2 + i) * 6, 1.6);
    }
  }

  /**
   * The Hawk perk's bird, painted into a caller-owned Graphics each frame: a raptor cut out of
   * moving air, wings beating on `t`, with a wake curling off its tail.
   */
  static drawHawk(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, angle: number, t: number,
  ): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const px = -sin, py = cos;
    // Wing beat: the downstroke is fast and the recovery slow, which is what makes a bird
    // read as flapping rather than as a pair of oscillating triangles.
    const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 16), 1.8);
    const sweep = 0.35 + beat * 0.85;

    for (const s of [1, -1]) {
      // Primaries.
      g.fillStyle(tint(AIR.storm), 0.55);
      windCurl(g, x, y, angle + s * sweep, 26, 7, -s * 1.5);
      g.fillStyle(tint(AIR.sky), 0.85);
      windCurl(g, x, y, angle + s * sweep, 21, 5, -s * 1.4);
      // Coverts, tucked closer to the body.
      g.fillStyle(tint(AIR.mist), 0.75);
      windCurl(g, x, y, angle + s * (sweep * 0.7), 13, 3.2, -s * 1.1);
    }

    // Body and fanned tail.
    g.fillStyle(tint(AIR.frost), 0.9);
    g.fillEllipse(x, y, 15, 7.5);
    g.fillStyle(tint(AIR.slate), 0.8);
    windCurl(g, x - cos * 6, y - sin * 6, angle + Math.PI, 14, 5, 0);
    // Head and beak.
    g.fillStyle(tint(AIR.mist), 1);
    g.fillCircle(x + cos * 7, y + sin * 7, 4.2);
    g.fillStyle(tint(AIR.charge), 1);
    g.beginPath();
    g.moveTo(x + cos * 13, y + sin * 13);
    g.lineTo(x + cos * 8 + px * 2.2, y + sin * 8 + py * 2.2);
    g.lineTo(x + cos * 8 - px * 2.2, y + sin * 8 - py * 2.2);
    g.closePath();
    g.fillPath();
    // Eye.
    g.fillStyle(tint(AIR.void), 1);
    g.fillCircle(x + cos * 8 + px * 2, y + sin * 8 + py * 2, 1.2);

    // Wake peeling off behind.
    g.fillStyle(tint(AIR.steel), 0.4);
    windCurl(g, x - cos * 12, y - sin * 12, angle + Math.PI, 22, 4, 1.4);
    windCurl(g, x - cos * 12, y - sin * 12, angle + Math.PI, 18, 3, -1.4);
  }
}

// ── AirDraft ──────────────────────────────────────────────────────────────

/**
 * Persistent ring of turning air around a fighter (banked wind dodge, the mastery's momentum).
 * Driven by whoever owns it — call `update` every frame
 * with the fighter's position.
 */
export class AirDraft {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private moteAccum = 0;
  private curls: { ang: number; len: number; w: number; speed: number; phase: number }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: AirColorFn,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 9,
    /** Ring colour — the mastery passive and the dodge window need to read apart. */
    private color: number = AIR.sky,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.curls = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      len: 0.7 + Math.random() * 0.6,
      w: 0.12 + Math.random() * 0.08,
      speed: 3 + Math.random() * 4,
      phase: Math.random() * TAU,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }
  setColor(c: number): void { this.color = c; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    // Air spins faster than flame licks or surging water — the speed is the read.
    const spin = this.t * 2.1;
    g.fillStyle(this.tint(AIR.storm), 0.15 * this.intensity * alpha);
    g.fillEllipse(x, y + 4, this.radius * 2, this.radius * 1.3);

    for (const c of this.curls) {
      const wob = Math.sin(this.t * c.speed + c.phase);
      const a = c.ang + spin + wob * 0.1;
      const len = this.radius * c.len * (0.8 + wob * 0.28) * this.intensity;
      g.fillStyle(this.tint(AIR.steel), 0.28 * alpha);
      windCurl(g, x + Math.cos(a) * this.radius * 0.55, y + Math.sin(a) * this.radius * 0.4,
        a + Math.PI * 0.5, len * 1.05, this.radius * c.w * 1.5, 1.7);
      g.fillStyle(this.tint(this.color), 0.6 * alpha);
      windCurl(g, x + Math.cos(a) * this.radius * 0.55, y + Math.sin(a) * this.radius * 0.4,
        a + Math.PI * 0.5, len, this.radius * c.w, 1.7);
    }

    // Occasional mote flicked off the draft.
    this.moteAccum += delta;
    const interval = 280 / Math.max(0.4, this.intensity);
    if (this.moteAccum >= interval) {
      this.moteAccum = 0;
      new AirFx(this.scene, this.tint).motes(
        x + (Math.random() - 0.5) * this.radius * 1.4,
        y + (Math.random() - 0.5) * this.radius * 0.9,
        1, { speed: 34, size: 2.4, life: 640, swirl: 2, depth: 4 },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}


// ── The air knife ─────────────────────────────────────────────────────────

/**
 * A knife made of air: a leaf-shaped blade that is mostly an outline — a pale body you can see
 * through, one bright edge, and a curl of wind wrapped round the grip where a handle would be.
 * The assassin has no steel; this is what the stab, the volley, the dagger field and the knives
 * swinging round the Tornado Blade are all drawn with. `(x, y)` is the grip, the blade runs
 * along `angle`.
 */
export function drawAirKnife(
  g: Phaser.GameObjects.Graphics,
  tint: AirColorFn,
  x: number, y: number,
  angle: number, len: number,
  alpha = 1,
  spin = 0,
): void {
  if (alpha <= 0.01) return;
  const c = Math.cos(angle), s = Math.sin(angle);
  const nx = -s, ny = c;
  const w = len * 0.16;
  const at = (f: number, side: number): [number, number] =>
    [x + c * len * f + nx * w * side, y + s * len * f + ny * w * side];
  const tip = at(1, 0), belly = at(0.42, 1), back = at(0.5, -0.55), heelA = at(0.12, 0.7), heelB = at(0.12, -0.5);

  // Displaced air around the blade.
  g.fillStyle(tint(AIR.sky), alpha * 0.22);
  g.fillEllipse(x + c * len * 0.5, y + s * len * 0.5, len * 1.15, len * 0.5);
  // Blade body.
  g.fillStyle(tint(AIR.mist), alpha * 0.62);
  g.beginPath();
  g.moveTo(heelA[0], heelA[1]);
  g.lineTo(belly[0], belly[1]);
  g.lineTo(tip[0], tip[1]);
  g.lineTo(back[0], back[1]);
  g.lineTo(heelB[0], heelB[1]);
  g.closePath();
  g.fillPath();
  // The cutting edge, bright; the spine, faint.
  g.lineStyle(1.6, tint(AIR.white), alpha * 0.95);
  g.beginPath();
  g.moveTo(heelA[0], heelA[1]); g.lineTo(belly[0], belly[1]); g.lineTo(tip[0], tip[1]);
  g.strokePath();
  g.lineStyle(1, tint(AIR.steel), alpha * 0.7);
  g.beginPath();
  g.moveTo(tip[0], tip[1]); g.lineTo(back[0], back[1]); g.lineTo(heelB[0], heelB[1]);
  g.strokePath();
  // Guard and the wind-wrapped grip.
  g.lineStyle(1.8, tint(AIR.cyan), alpha * 0.9);
  g.lineBetween(x + c * len * 0.1 + nx * w * 1.25, y + s * len * 0.1 + ny * w * 1.25,
    x + c * len * 0.1 - nx * w * 1.05, y + s * len * 0.1 - ny * w * 1.05);
  g.fillStyle(tint(AIR.frost), alpha * 0.8);
  windCurl(g, x - c * len * 0.16, y - s * len * 0.16, angle + 0.5 + Math.sin(spin * 5) * 0.4, len * 0.34, 1.6, 1.4);
}

// ── AirAvatar ─────────────────────────────────────────────────────────────

/** Gloved hands: a slate halo, a dark shell, a storm-blue core and one cold glint. */
const AIR_AVATAR: AvatarSpec = {
  hands: [
    { r: 9, color: AIR.storm, alpha: 0.22 },
    { r: 6.4, color: AIR.slate, alpha: 0.95 },
    { r: 3.8, color: AIR.storm, alpha: 1 },
    { r: 1.5, color: AIR.mist, alpha: 0.9, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: AIR.cyan,
  eyePupil: AIR.void,
  squash: { div: 11, x: 0.7, y: 0.36 },
};

/**
 * The hooded assassin. The pale sky orb (the baked `elem-air`) is the face inside a deep cowl:
 * the hood sits over the top of the body and throws a shadow across the eye band, so the eyes
 * are two slivers of light and nothing else. A cloak streams off the back in three tails that
 * flap against the facing, and three chimes hang off its hem on threads, swinging with her.
 *
 * `setKnife` shows the air knife in the casting hand (it forms just before a stab and blows
 * away just after). `setSolidBody` paints the orb itself, for the moments the kit has hidden the
 * fighter sprite and drawn the rig somewhere else — levitating over the fight.
 *
 * Mastered: gilded chimes with a glow, a gold hood trim, white eyes, a longer cloak.
 */
export class AirAvatar extends BaseAvatar {
  private fx: AirFx;
  private knife = 0;
  private knifeTarget = 0;
  private solidBody = false;
  private chimeSwing = 0;
  private lastX = 0;

  constructor(scene: Phaser.Scene, tint: AirColorFn, depth = 6) {
    super(scene, tint, depth, AIR_AVATAR);
    this.fx = new AirFx(scene, tint);
  }

  /** 0 = empty hand, 1 = the knife fully formed. Eased, so it condenses and disperses. */
  setKnife(v: number): void { this.knifeTarget = Phaser.Math.Clamp(v, 0, 1); }
  /** Paint the orb body as well — for when the fighter sprite itself is hidden. */
  setSolidBody(on: boolean): void { this.solidBody = on; }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? AIR.white : AIR.cyan);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 12 : 9);
      halo.setFillStyle(this.tint(on ? AIR.cyan : AIR.storm), on ? 0.34 : 0.22);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.4, this.tint(AIR.bolt), 0.9);
      else shell.setStrokeStyle();
    });
  }

  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 26, size: 2.2, life: 380, swirl: 1.8, depth: 5 });
  }

  /** Under the sprite: the ground shade and the cloak streaming off her back. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    g.fillStyle(this.tint(AIR.steel), a * 0.16 * this.intensity);
    g.fillEllipse(x, y + 9, 40, 15);

    // Three cloak tails, rooted on the far side of the body from where she is looking.
    const back = this.facing + Math.PI;
    const len = (this.mastered ? 40 : 32) * (0.9 + 0.1 * this.intensity);
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.42;
      const rootA = back + off;
      const rx = x + Math.cos(rootA) * 13, ry = y + Math.sin(rootA) * 13 + 3;
      const SEG = 7;
      const L: [number, number][] = [], R: [number, number][] = [];
      for (let k = 0; k <= SEG; k++) {
        const f = k / SEG;
        // The flap: a wave running down the tail, bigger toward the tip.
        const wave = Math.sin(this.t * 9 - f * 4.2 + i * 1.7) * (0.1 + f * 0.42);
        const ang = back + off * (1 - f * 0.5) + wave;
        const px = rx + Math.cos(ang) * len * f, py = ry + Math.sin(ang) * len * f;
        const w = (i === 1 ? 8.5 : 6.5) * (1 - f * 0.86);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        L.push([px + nx * w, py + ny * w]);
        R.push([px - nx * w, py - ny * w]);
      }
      g.fillStyle(this.tint(i === 1 ? AIR.slate : AIR.void), alpha * 0.94);
      g.beginPath();
      g.moveTo(L[0][0], L[0][1]);
      for (let k = 1; k <= SEG; k++) g.lineTo(L[k][0], L[k][1]);
      for (let k = SEG; k >= 0; k--) g.lineTo(R[k][0], R[k][1]);
      g.closePath();
      g.fillPath();
      // A lighter fold line down the middle tail.
      if (i === 1) {
        g.lineStyle(1, this.tint(AIR.storm), alpha * 0.7);
        g.beginPath();
        g.moveTo((L[0][0] + R[0][0]) / 2, (L[0][1] + R[0][1]) / 2);
        for (let k = 1; k <= SEG; k++) g.lineTo((L[k][0] + R[k][0]) / 2, (L[k][1] + R[k][1]) / 2);
        g.strokePath();
      }
    }
  }

  /** Over the sprite, under the eyes: the orb when asked for, and the mantle on her shoulders. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, _a: number, alpha: number): void {
    if (this.solidBody) {
      g.fillStyle(this.tint(AIR.storm), alpha);
      g.fillCircle(x, y, 22);
      g.fillStyle(this.tint(AIR.sky), alpha);
      g.fillCircle(x - 1, y - 1, 19.5);
      g.fillStyle(this.tint(AIR.mist), alpha * 0.8);
      g.fillCircle(x - 6, y - 7, 8);
    }
    // Mantle: a dark collar across the lower third, cut to a point at the chest.
    g.fillStyle(this.tint(AIR.slate), alpha * 0.96);
    g.beginPath();
    for (let k = 0; k <= 14; k++) {
      const ang = 0.12 + (k / 14) * (Math.PI - 0.24);
      const px = x + Math.cos(ang) * 22.5, py = y + Math.sin(ang) * 22.5;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.lineTo(x - 13, y + 7);
    g.lineTo(x, y + 13);
    g.lineTo(x + 13, y + 7);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.2, this.tint(AIR.storm), alpha * 0.8);
    g.beginPath();
    g.moveTo(x - 13, y + 7); g.lineTo(x, y + 13); g.lineTo(x + 13, y + 7);
    g.strokePath();
    // The clasp.
    g.fillStyle(this.tint(this.mastered ? AIR.charge : AIR.steel), alpha);
    g.fillCircle(x, y + 13, 2.2);
  }

  /** Over everything: the hood and its shadow, the chimes, and the knife. */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const lean = Math.cos(this.facing) * 2;

    // The shadow the cowl throws over the face — this is what leaves the eyes barely there.
    g.fillStyle(this.tint(AIR.void), alpha * 0.66);
    g.fillEllipse(x + lean * 0.6, y - 4.5, 36, 13);

    // Hood: a cowl over the top of the orb, peaked, with the point blown back.
    const tipA = this.facing + Math.PI + Math.sin(this.t * 7) * 0.18;
    const tipX = x + Math.cos(tipA) * 9, tipY = y - 31 + Math.sin(this.t * 7 + 1) * 1.2;
    g.fillStyle(this.tint(AIR.slate), alpha);
    g.beginPath();
    g.moveTo(x - 24.5, y - 2);
    for (let k = 0; k <= 12; k++) {
      const ang = Math.PI + (k / 12) * Math.PI;
      const bulge = 24.5 + Math.sin((k / 12) * Math.PI) * 3;
      const px = x + Math.cos(ang) * bulge, py = y - 2 + Math.sin(ang) * bulge;
      if (k === 6) g.lineTo(tipX, tipY);
      g.lineTo(px, py);
    }
    // The opening: a shallow arch over the brow, so the face is a slot under the cowl.
    for (let k = 0; k <= 10; k++) {
      const f = k / 10;
      g.lineTo(x + 24.5 - f * 49 + lean * 0.4 * Math.sin(f * Math.PI), y - 2 - Math.sin(f * Math.PI) * 6.5);
    }
    g.closePath();
    g.fillPath();
    // Fold shading on the crown, and the rim of the opening.
    g.fillStyle(this.tint(AIR.void), alpha * 0.55);
    g.fillEllipse(x + 6 - lean, y - 19, 20, 9);
    g.lineStyle(m ? 2 : 1.5, this.tint(m ? AIR.charge : AIR.storm), alpha * 0.95);
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const f = k / 10;
      const px = x + 24.5 - f * 49 + lean * 0.4 * Math.sin(f * Math.PI), py = y - 2 - Math.sin(f * Math.PI) * 6.5;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();

    // Chimes: three tubes on threads off the cloak's hem. They swing with her own movement
    // (the rig has no velocity, so it is read off how far the anchor moved) and with the wind.
    const moved = x - this.lastX;
    this.lastX = x;
    this.chimeSwing += (Phaser.Math.Clamp(-moved * 0.09, -0.9, 0.9) - this.chimeSwing) * 0.12;
    for (let i = 0; i < 3; i++) {
      const hx = x + (i - 1) * 13, hy = y + (i === 1 ? 19 : 15);
      const sw = this.chimeSwing + Math.sin(this.t * (3.4 + i * 0.6) + i * 2.1) * 0.22;
      const tl = 5 + (i === 1 ? 2 : 0), cl = i === 1 ? 9 : 7;
      const ex = hx + Math.sin(sw) * tl, ey = hy + Math.cos(sw) * tl;
      const bx = ex + Math.sin(sw) * cl, by = ey + Math.cos(sw) * cl;
      g.lineStyle(0.8, this.tint(AIR.steel), alpha * 0.9);
      g.lineBetween(hx, hy, ex, ey);
      if (m) {
        g.lineStyle(5.5, this.tint(AIR.bolt), alpha * 0.3);
        g.lineBetween(ex, ey, bx, by);
      }
      g.lineStyle(3, this.tint(m ? AIR.charge : AIR.steel), alpha);
      g.lineBetween(ex, ey, bx, by);
      g.lineStyle(1, this.tint(m ? AIR.bolt : AIR.white), alpha * 0.9);
      g.lineBetween(ex - 0.8, ey, bx - 0.8, by);
      // The striker bead under the tube.
      g.fillStyle(this.tint(m ? AIR.bolt : AIR.mist), alpha);
      g.fillCircle(bx + Math.sin(sw * 1.6) * 1.5, by + 2.4, 1.2);
    }

    // The knife, condensing in the casting hand.
    this.knife += (this.knifeTarget - this.knife) * 0.3;
    if (this.knife > 0.03) {
      const h = this.castHand();
      drawAirKnife(g, this.tint, h.x, h.y, this.facing, 12 + 14 * this.knife, alpha * this.knife, this.t);
    }
  }
}
