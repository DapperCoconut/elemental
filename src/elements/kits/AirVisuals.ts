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
 * Colours must come from the AIR palette below. Air has no colour-slot cosmetic yet, but every
 * call still routes through the owner's `airColor` mapper, so the day one lands it is a table
 * edit in CosmeticsKit rather than a sweep through this file.
 */

/** `(base) => displayed` — CosmeticsKit.airColor bound to one owner. */
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
  /** Electro Charge's stored static — the one warm colour air is allowed. */
  charge: 0xffee44,
  bolt: 0xfff7bb,
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

export interface CrackShotOpts {
  /** Half-width of the compressed-air shaft. Default 6. */
  width?: number;
  /** Colour of the core lance. Default AIR.sky. */
  color?: number;
  /** Curls sheared off the shaft. Defaults to scale with length. */
  curls?: number;
  duration?: number;
  depth?: number;
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

  /**
   * The lance of compressed air a hitscan actually is: a lens of displaced air bowing out from
   * the shaft, a hard bright core racing to the far end, and curls shearing off both flanks as
   * the pressure wall passes. Everything else about air's sniper identity hangs off this one.
   */
  crackShot(x1: number, y1: number, x2: number, y2: number, opts: CrackShotOpts = {}): void {
    const color = opts.color ?? AIR.sky;
    const w = opts.width ?? 6;
    const dur = opts.duration ?? 280;
    const depth = opts.depth ?? 8;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nCurls = opts.curls ?? Phaser.Math.Clamp(Math.round(dist / 70), 5, 16);
    const px = -Math.sin(ang), py = Math.cos(ang);

    const shear = Array.from({ length: nCurls }, (_, i) => ({
      f: (i + 0.5) / nCurls,
      side: i % 2 === 0 ? 1 : -1,
      len: 15 + Math.random() * 28,
      w: 2.6 + Math.random() * 3.4,
      curl: 1.2 + Math.random() * 1.4,
    }));

    this.anim(depth, dur, (g, t) => {
      // The pressure wall reaches the far end in the first fifth; the rest is it dissipating.
      const front = Math.min(1, t / 0.2);
      const fade = 1 - easeIn(t);

      // Displaced-air envelope: a long lens either side of the shaft, fattest mid-flight.
      const SEG = 14;
      const bulge = (f: number) => Math.sin(Math.PI * Math.pow(f, 0.65)) * w * 2.4 * (0.35 + fade * 0.65);
      g.fillStyle(this.tint(AIR.steel), 0.22 * fade);
      g.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const f = (i / SEG) * front;
        const b = bulge(f);
        const ex = x1 + (x2 - x1) * f + px * b, ey = y1 + (y2 - y1) * f + py * b;
        if (i === 0) g.moveTo(ex, ey); else g.lineTo(ex, ey);
      }
      for (let i = SEG; i >= 0; i--) {
        const f = (i / SEG) * front;
        const b = bulge(f);
        g.lineTo(x1 + (x2 - x1) * f - px * b, y1 + (y2 - y1) * f - py * b);
      }
      g.closePath();
      g.fillPath();

      // Core lance, drawn only as far as the wall has travelled.
      const fx2 = x1 + (x2 - x1) * front, fy2 = y1 + (y2 - y1) * front;
      g.lineStyle(Math.max(0.6, w * 0.6 * fade), this.tint(color), 0.92 * fade);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(fx2, fy2); g.strokePath();
      g.lineStyle(Math.max(0.4, w * 0.24 * fade), this.tint(AIR.white), fade);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(fx2, fy2); g.strokePath();

      // Air torn off the flanks as the wall goes past, peeling further out as it ages.
      for (const s of shear) {
        if (front < s.f) continue;
        const lt = Math.min(1, (t - s.f * 0.2) / 0.8);
        if (lt <= 0) continue;
        const bx = x1 + (x2 - x1) * s.f, by = y1 + (y2 - y1) * s.f;
        windCurlLayered(
          g, this.tint,
          bx + px * s.side * w * 0.5, by + py * s.side * w * 0.5,
          ang + s.side * 0.5 * lt, s.len * easeOut(lt), s.w * (1 - lt * 0.5),
          s.curl * s.side * lt * 2, 0.65 * (1 - lt),
        );
      }

      // Leading bead while the wall is still in flight, and the crack at the muzzle.
      if (front < 1) {
        g.fillStyle(this.tint(AIR.white), 0.9);
        g.fillCircle(fx2, fy2, w * 1.3);
        g.fillStyle(this.tint(AIR.cyan), 0.5);
        g.fillCircle(fx2, fy2, w * 2.2);
      }
      g.fillStyle(this.tint(AIR.mist), 0.6 * fade);
      g.fillCircle(x1, y1, w * 1.7 * fade);
    });

    this.ring(x1, y1, w, w * 7, AIR.mist, 240, 3, depth - 1);
    this.motes(x1, y1, 5, { angle: ang + Math.PI, spread: 0.8, speed: 130, size: 2.4, life: 320, depth: depth - 1 });
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
   * Inward-spiralling gather: air drawn from the rim toward a compressing point while a
   * containment ring squeezes shut. `follow` lets it track a moving caster during a channel.
   */
  channelCharge(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const streams = Array.from({ length: 14 }, (_, i) => ({
      ang: (i / 14) * TAU,
      spin: 1.6 + Math.random() * 1.4,
      phase: Math.random(),
      len: 0.3 + Math.random() * 0.3,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.85 + Math.sin(t * 32) * 0.15;

      // Curls fall in from the rim, whipping round faster as the pressure builds.
      for (const s of streams) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.fillStyle(this.tint(AIR.cyan), 0.65 * (1 - lt * 0.6));
        windCurl(
          g, cx + Math.cos(a) * r, cy + Math.sin(a) * r,
          a + Math.PI * 0.62, r * s.len, 2.8 * (1 - lt), 1.8,
        );
      }

      // Compressing core.
      const cr = radius * (0.07 + easeIn(t) * 0.3) * pulse;
      g.fillStyle(this.tint(AIR.storm), 0.45);
      g.fillCircle(cx, cy, cr * 1.5);
      g.fillStyle(this.tint(AIR.sky), 0.7);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(AIR.mist), 0.85);
      g.fillCircle(cx, cy, cr * 0.52);
      g.fillStyle(this.tint(AIR.white), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.22);

      // Containment ring closing in.
      g.lineStyle(3, this.tint(AIR.frost), 0.45 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
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
   * The crackle of stored static around a readied Electro Charge: forked bolts re-rolled every
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

  // ── Caller-owned painters ───────────────────────────────────────────────

  /**
   * A Wind Trap, painted into a caller-owned Graphics because it is repainted every frame for
   * as long as the trap is up. A cylindrical cage of rising wind with a hard rim the quarry
   * cannot cross, plus grit spinning round the floor of it.
   */
  static drawTrapCage(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x: number, y: number, radius: number, t: number, alpha: number,
  ): void {
    // Floor: grit dragged round the inside of the wall.
    g.fillStyle(tint(AIR.storm), 0.12 * alpha);
    g.fillCircle(x, y, radius);
    for (let i = 0; i < 3; i++) {
      const r = radius * (0.45 + i * 0.24);
      g.lineStyle(1.8, tint(AIR.steel), 0.28 * alpha);
      g.beginPath();
      const from = t * (1.2 + i * 0.5) * (i % 2 ? -1 : 1);
      const segs = 14;
      for (let s = 0; s <= segs; s++) {
        const a = from + (s / segs) * 2.4;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.55;
        if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }

    // Wall: curls climbing the rim, sized by how near the front of the orbit they are, so the
    // cage reads as a cylinder rather than as a flat ring of tick marks.
    const bars = 12;
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * TAU + t * 0.9;
      const near = 0.55 + 0.45 * Math.sin(a);
      const cx = x + Math.cos(a) * radius;
      const cy = y + Math.sin(a) * radius * 0.55;
      const climb = ((t * 0.7 + i / bars) % 1);
      windCurlLayered(
        g, tint, cx, cy - climb * 10,
        -Math.PI / 2 + Math.cos(a) * 0.5,
        (26 + near * 16) * (1 - climb * 0.35), 4.4 * near,
        Math.cos(a) * 2, alpha * 0.7 * near * (1 - climb * 0.5),
      );
    }

    // The boundary itself, broken into rotating arcs so it never reads as a UI circle.
    for (let i = 0; i < 5; i++) {
      const from = t * 1.6 + (i / 5) * TAU;
      g.lineStyle(3, tint(AIR.frost), 0.55 * alpha);
      g.beginPath();
      const segs = 10;
      for (let s = 0; s <= segs; s++) {
        const a = from + (s / segs) * 0.9;
        const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius * 0.55;
        if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  /**
   * The Sweeping Tornado funnel, painted into a caller-owned Graphics every frame: stacked
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
   * The lingering beam left by the Q upgrade, painted into a caller-owned Graphics each frame:
   * a standing wall of compressed air with ripples running down it.
   */
  static drawBeamLine(
    g: Phaser.GameObjects.Graphics, tint: AirColorFn,
    x1: number, y1: number, x2: number, y2: number, t: number, alpha: number,
  ): void {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const px = -Math.sin(ang), py = Math.cos(ang);
    const SEG = 20;

    // Standing pressure envelope.
    g.fillStyle(tint(AIR.storm), 0.16 * alpha);
    g.beginPath();
    for (const s of [1, -1]) {
      for (let i = 0; i <= SEG; i++) {
        const f = s > 0 ? i / SEG : 1 - i / SEG;
        const b = (5 + Math.sin(f * 9 - t * 5) * 2.4) * (0.6 + 0.4 * Math.sin(Math.PI * f));
        const ex = x1 + (x2 - x1) * f + px * s * b;
        const ey = y1 + (y2 - y1) * f + py * s * b;
        if (i === 0 && s > 0) g.moveTo(ex, ey); else g.lineTo(ex, ey);
      }
    }
    g.closePath();
    g.fillPath();

    g.lineStyle(3.4, tint(AIR.blue), 0.75 * alpha);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    g.lineStyle(1.4, tint(AIR.white), 0.9 * alpha);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();

    // Ripples running down the beam — the tell that it is still live and still moving air.
    for (let i = 0; i < 5; i++) {
      const f = ((t * 0.45 + i / 5) % 1);
      const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f;
      const puff = 1 - Math.abs(f - 0.5) * 0.6;
      for (const s of [1, -1]) {
        g.fillStyle(tint(AIR.cyan), 0.5 * alpha * puff);
        windCurl(g, cx, cy, ang + s * 0.9, 16 * puff, 3.2 * puff, s * 1.8);
      }
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
 * Persistent ring of turning air around a fighter (Swift as the Wind stacks, the grapple dodge
 * window, a readied Electro Charge). Driven by whoever owns it — call `update` every frame
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

// ── AirAvatar ─────────────────────────────────────────────────────────────

/** Concentric discs of one ball of compressed air, outermost first. */
const AIR_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: AIR.steel, alpha: 0.26 },
    { r: 6.4, color: AIR.sky, alpha: 0.85 },
    { r: 3.6, color: AIR.mist, alpha: 1 },
    // Glint up-and-left of centre: dead centre and the hand reads as a bulb, not a sphere.
    { r: 1.6, color: AIR.white, alpha: 0.95, ox: -1.7, oy: -1.7 },
  ],
  eyeWhite: AIR.mist,
  eyePupil: AIR.void,
  // Air's hands are the fastest of any element's — they smear harder than fire's or water's.
  squash: { div: 11, x: 0.7, y: 0.36 },
};

/**
 * The air character rig: two balls of compressed air for hands, a pair of eyes, and a small
 * cyclone turning over the crown. Hands, eyes and gestures come from BaseAvatar; what air adds
 * is the pressure wash beneath and the cyclone above.
 */
export class AirAvatar extends BaseAvatar {
  private fx: AirFx;

  constructor(scene: Phaser.Scene, tint: AirColorFn, depth = 6) {
    super(scene, tint, depth, AIR_AVATAR);
    this.fx = new AirFx(scene, tint);
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character itself so a mastered air
   * user is identifiable at a glance, before they cast anything: white eyes, a wider corona
   * and a frost rim on each hand, and a crown cyclone that grows a second tier of curls plus
   * a ring of debris. Shape changes, not just brighter tints — a tint alone vanishes in play.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? AIR.white : AIR.mist);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 13 : 9.5);
      halo.setFillStyle(this.tint(on ? AIR.cyan : AIR.steel), on ? 0.32 : 0.26);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(AIR.frost), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed motes of dust. */
  protected emitTrail(x: number, y: number): void {
    this.fx.motes(x, y, 1, { speed: 26, size: 2.2, life: 440, swirl: 1.8, depth: 5 });
  }

  /** Pressure wash under the fighter, plus the grit it keeps shoving out from underfoot. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(AIR.steel), a * 0.22 * this.intensity);
    g.fillEllipse(x, y + 6, 62 * this.intensity, 30 * this.intensity);
    g.fillStyle(this.tint(AIR.sky), a * 0.12 * this.intensity);
    g.fillEllipse(x, y + 9, 40 * this.intensity, 16 * this.intensity);
    g.lineStyle(1.6, this.tint(AIR.mist), a * 0.3 * this.intensity);
    g.strokeEllipse(x, y + 12, 46 + Math.sin(this.t * 3) * 6, 15);
  }

  /**
   * A cyclone turning over the crown: curls orbiting a shallow ellipse, drawn tangent to their
   * own orbit and scaled by how near the front they are, so it reads as a funnel with depth
   * rather than as a flat ring. Rooted at `y - 18` so it never covers the face, and drawn over
   * the sprite so the bright middles show instead of only the dark tips.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const m = this.mastered ? 1.35 : 1;
    const tiers = this.mastered ? 2 : 1;
    const per = 3;

    for (let tier = 0; tier < tiers; tier++) {
      // Upper tiers are tighter and faster — that convergence is what makes it a funnel.
      const rx = (15 - tier * 4.5) * m;
      const cy = y - 18 - tier * 9 * m;
      for (let i = 0; i < per; i++) {
        const p = this.t * (2.6 + tier * 1.1) * this.intensity + (i / per) * TAU;
        const cx = x + Math.cos(p) * rx;
        const oy = cy + Math.sin(p) * rx * 0.34;
        const tan = Math.atan2(Math.cos(p) * rx * 0.34, -Math.sin(p) * rx);
        const near = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(p));
        windCurlLayered(
          g, this.tint, cx, oy, tan,
          15 * near * m * this.intensity, 3.6 * near * m, 1.7, a * 0.9 * near,
        );
      }
    }

    // Mastery debris: five specks caught in the funnel, circling the head on a flat orbit.
    if (this.mastered) {
      for (let i = 0; i < 5; i++) {
        const p = this.t * 2.2 + (i / 5) * TAU;
        const cx = x + Math.cos(p) * 23;
        const oy = y - 30 + Math.sin(p) * 6.5;
        const tan = Math.atan2(Math.cos(p) * 6.5, -Math.sin(p) * 23);
        g.fillStyle(this.tint(AIR.frost), alpha * 0.85);
        windCurl(g, cx, oy, tan, 9, 2.2, 1.6);
        g.fillStyle(this.tint(AIR.white), alpha * 0.9);
        g.fillCircle(cx, oy, 1.3);
      }
    }
  }
}
