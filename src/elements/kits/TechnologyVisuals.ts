import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Technology renders in the *arena*: the terminal rig (screen
 * hands, a CRT head-window, a column of falling code), the virus / boxed / lag / VPN auras, and
 * every one-shot effect its crunchers, popups, cords and bombs throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig itself — live in
 * ElementVisuals.ts. What stays here is what makes Technology Technology: the bit.
 *
 * Note on scope: this element deliberately renders a lot of *interface* — a browser window, an
 * admin console, Clippy. That chrome stays as real Text and Rectangle objects, because the joke
 * is that it is chrome. What lives in this file is everything that is supposed to be a thing in
 * the world: the projectiles, the popups that block your view, the cable, the bomb, the fighter.
 */

/** `(base) => displayed` — SkinsKit.technologyColor bound to one owner. */
export type TechColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const TECH = {
  /** The case, the board, the bezel. */
  night: 0x0a1218,
  board: 0x0d2740,
  steel: 0x223344,
  slate: 0x2f2f4a,
  wire: 0x8899bb,
  /** The screen. */
  screen: 0x061a12,
  phosphor: 0x33ff88,
  phosphorDim: 0x18a05a,
  mint: 0x44ccaa,
  /** Signal. */
  cyan: 0x33aaee,
  ice: 0x88ddff,
  white: 0xffffff,
  /** Warnings and money. */
  amber: 0xffdd66,
  gold: 0xffaa44,
  rust: 0xff8822,
  alert: 0xff4444,
  /** Infection. */
  plague: 0x77dd33,
  bile: 0x55dd55,
  /** Chrome that is not yours: ads, assistants, admin. */
  adBlue: 0x2255aa,
  violet: 0xbb88ff,
  plum: 0x552277,
} as const;

export interface Pt { x: number; y: number }

// ── Path helpers ──────────────────────────────────────────────────────────

function fillPts(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: Phaser.GameObjects.Graphics, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

/** Local-to-world for a shape drawn along `angle` at (cx, cy). */
function frame(cx: number, cy: number, angle: number): (lx: number, ly: number) => Pt {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
}

// ── The primitive ─────────────────────────────────────────────────────────

/**
 * Technology's primitive: a **bit** — a beveled square cell carrying either a 0 or a 1, drawn as
 * geometry rather than as a font glyph.
 *
 * Drawing it rather than typing it is the whole point. A `scene.add.text('1')` is a character in
 * whatever font the browser felt like; a square with a lit bevel and a ring or a bar punched out
 * of it is a *cell on a board*, which is what this element is made of. It also means a bit can
 * be any size, rotate, and take the owner's skin — none of which a Text can.
 */
export function bitTile(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, angle: number, size: number, one: boolean,
): void {
  const at = frame(cx, cy, angle);
  const h = size / 2;
  fillPts(g, [at(-h, -h), at(h, -h), at(h, h), at(-h, h)]);
  void one;
}

/**
 * The bit in four passes: a dark cell, a lit top-left bevel, the glyph punched through it, and
 * a bloom for the ones that are currently "on".
 */
export function bitTileLayered(
  g: Phaser.GameObjects.Graphics, tint: TechColorFn,
  cx: number, cy: number, angle: number, size: number, one: boolean,
  color: number, alpha: number, lit = true,
): void {
  const at = frame(cx, cy, angle);
  const h = size / 2;

  if (lit) {
    g.fillStyle(tint(color), alpha * 0.22);
    bitTile(g, cx, cy, angle, size * 1.9, one);
  }
  g.fillStyle(tint(TECH.night), alpha * 0.85);
  bitTile(g, cx, cy, angle, size, one);
  // Bevel: two bright edges along the top-left, which is what makes a flat square read as a key.
  g.lineStyle(Math.max(0.6, size * 0.1), tint(color), alpha * 0.55);
  strokePts(g, [at(-h, h), at(-h, -h), at(h, -h)]);

  g.fillStyle(tint(color), alpha);
  if (one) {
    // A 1: a bar with a serif foot, so it never reads as a stray tick.
    fillPts(g, [at(-size * 0.09, -h * 0.62), at(size * 0.09, -h * 0.62), at(size * 0.09, h * 0.5), at(-size * 0.09, h * 0.5)]);
    fillPts(g, [at(-size * 0.26, h * 0.5), at(size * 0.26, h * 0.5), at(size * 0.26, h * 0.68), at(-size * 0.26, h * 0.68)]);
  } else {
    // A 0: a ring, drawn as a stroked ellipse so the hole is genuinely a hole.
    g.lineStyle(Math.max(0.9, size * 0.17), tint(color), alpha);
    const ring: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * TAU;
      ring.push(at(Math.cos(a) * size * 0.24, Math.sin(a) * size * 0.34));
    }
    strokePts(ring.length ? g : g, ring, true);
  }
}

// ── Element shapes ────────────────────────────────────────────────────────

/**
 * The Cruncher: a wedge-mouthed head that chomps as it flies, with one eye and a lit rim.
 *
 * "Addicting Cruncher" is a thing that eats, and the ability's whole loop is feeding it hits to
 * make it stronger. A shape that visibly opens and closes a mouth says that; a triangle does not.
 */
export function cruncherHead(
  g: Phaser.GameObjects.Graphics, tint: TechColorFn,
  cx: number, cy: number, angle: number, r: number, chomp: number,
  color: number, alpha: number,
): void {
  // Mouth opens to ~55° at full chomp and shuts to a seam.
  const gape = 0.06 + chomp * 0.92;
  const pts: Pt[] = [{ x: cx, y: cy }];
  const from = angle + gape;
  const to = angle + TAU - gape;
  for (let i = 0; i <= 22; i++) {
    const a = from + (to - from) * (i / 22);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  g.fillStyle(tint(TECH.night), alpha * 0.5);
  fillPts(g, pts.map((p) => ({ x: p.x + 1, y: p.y + 1.8 })));
  g.fillStyle(tint(color), alpha);
  fillPts(g, pts);
  g.lineStyle(Math.max(0.9, r * 0.12), tint(TECH.white), alpha * 0.55);
  strokePts(g, pts, true);
  // The eye, offset up and forward so the head has a direction even mouth-shut.
  const eye = frame(cx, cy, angle)(-r * 0.1, -r * 0.46);
  g.fillStyle(tint(TECH.night), alpha);
  g.fillCircle(eye.x, eye.y, r * 0.2);
  g.fillStyle(tint(TECH.white), alpha * 0.9);
  g.fillCircle(eye.x + Math.cos(angle) * r * 0.06, eye.y + Math.sin(angle) * r * 0.06, r * 0.09);
}

/**
 * A fake OS window: drop shadow, bezel, a title bar with the three buttons, a content area with
 * scanlines, and a couple of text-lines suggested by bars.
 *
 * Popups, boxed fighters and the byte bomb all wear this, which is what ties them together as
 * "software happening to you" rather than as three unrelated rectangles.
 */
export function windowPane(
  g: Phaser.GameObjects.Graphics, tint: TechColorFn,
  cx: number, cy: number, w: number, h: number, t: number, alpha: number,
  o: { body?: number; bar?: number; accent?: number; scan?: boolean; lines?: number } = {},
): void {
  const body = o.body ?? TECH.adBlue;
  const bar = o.bar ?? TECH.slate;
  const accent = o.accent ?? TECH.white;
  const x = cx - w / 2, y = cy - h / 2;
  const barH = Math.min(16, h * 0.22);

  g.fillStyle(tint(TECH.night), alpha * 0.45);
  g.fillRect(x + 3, y + 4, w, h);
  g.fillStyle(tint(body), alpha);
  g.fillRect(x, y, w, h);
  g.fillStyle(tint(bar), alpha);
  g.fillRect(x, y, w, barH);
  g.lineStyle(1.6, tint(accent), alpha * 0.85);
  g.strokeRect(x, y, w, h);

  // The three buttons, and only the close one is red — which is the joke.
  const br = Math.min(3.4, barH * 0.24);
  for (let i = 0; i < 3; i++) {
    g.fillStyle(tint(i === 2 ? TECH.alert : TECH.wire), alpha * 0.95);
    g.fillCircle(x + w - 8 - i * (br * 3), y + barH / 2, br);
  }
  // A title suggested by a bar rather than spelled out — it reads at any size.
  g.fillStyle(tint(accent), alpha * 0.5);
  g.fillRect(x + 6, y + barH / 2 - 1.4, Math.min(w * 0.4, 44), 2.8);

  if (o.scan !== false) {
    // Scanlines crawling down the content area.
    g.fillStyle(tint(TECH.night), alpha * 0.18);
    for (let sy = y + barH + ((t * 22) % 4); sy < y + h - 1; sy += 4) {
      g.fillRect(x + 1, sy, w - 2, 1.4);
    }
  }
  const lines = o.lines ?? 3;
  for (let i = 0; i < lines; i++) {
    const ly = y + barH + 8 + i * ((h - barH - 12) / Math.max(1, lines));
    if (ly > y + h - 5) break;
    g.fillStyle(tint(accent), alpha * 0.28);
    g.fillRect(x + 8, ly, (w - 16) * (0.9 - i * 0.22), 3);
  }
}

/** A sheathed cable: a dark jacket with a bright core stripe and a plug on the far end. */
export function cableRun(
  g: Phaser.GameObjects.Graphics, tint: TechColorFn,
  pts: Pt[], color: number, alpha: number, thick = 5, plug = true,
): void {
  if (pts.length < 2) return;
  g.lineStyle(thick * 1.7, tint(TECH.night), alpha * 0.5);
  strokePts(g, pts.map((p) => ({ x: p.x + 1, y: p.y + 2 })));
  g.lineStyle(thick, tint(TECH.steel), alpha);
  strokePts(g, pts);
  g.lineStyle(thick * 0.34, tint(color), alpha * 0.9);
  strokePts(g, pts);
  if (!plug) return;
  // The plug: a body, two pins, and a lit contact.
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const a = Math.atan2(end.y - prev.y, end.x - prev.x);
  const at = frame(end.x, end.y, a);
  g.fillStyle(tint(TECH.slate), alpha);
  fillPts(g, [at(-9, -6), at(3, -6), at(3, 6), at(-9, 6)]);
  g.fillStyle(tint(TECH.wire), alpha);
  fillPts(g, [at(3, -4), at(9, -4), at(9, -1), at(3, -1)]);
  fillPts(g, [at(3, 1), at(9, 1), at(9, 4), at(3, 4)]);
  g.fillStyle(tint(color), alpha);
  const led = at(-4, 0);
  g.fillCircle(led.x, led.y, 2);
}

/** Torn scanline bands — the look of a signal being interfered with. */
export function crtGlitch(
  g: Phaser.GameObjects.Graphics, tint: TechColorFn,
  cx: number, cy: number, w: number, h: number, color: number, alpha: number, bands = 5,
): void {
  for (let i = 0; i < bands; i++) {
    const by = cy - h / 2 + Math.random() * h;
    const bw = w * (0.3 + Math.random() * 0.7);
    const off = (Math.random() - 0.5) * w * 0.35;
    g.fillStyle(tint(Math.random() > 0.5 ? color : TECH.white), alpha * (0.25 + Math.random() * 0.5));
    g.fillRect(cx - bw / 2 + off, by, bw, 1.6 + Math.random() * 3);
  }
}

// ── TechnologyFx ──────────────────────────────────────────────────────────

export interface TechCrashOpts {
  /** Bits thrown clear. Defaults to radius/8. */
  bits?: number;
  /** Concentric rings. Defaults to 2. */
  rings?: number;
  duration?: number;
  depth?: number;
  color?: number;
  /** Leave a burned-in mark on the floor. Default true. */
  mark?: boolean;
}

/**
 * One-shot Technology effects. Cheap to construct — build one per owner and hand it that owner's
 * colour mapper.
 */
export class TechnologyFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: TechColorFn = (c) => c) {
    super(scene, tint);
  }

  // `color: number` is spelled out on every signature below: without it TypeScript infers the
  // literal type of the TECH default and refuses every other palette entry at the call site.

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 9, color: number = TECH.phosphor): void {
    this.flashIn(x, y, radius, TECH.white, color, depth);
  }

  /**
   * An expanding ring, drawn as a stepped polygon rather than a circle: this element's edges are
   * all axis-aligned, so its shockwaves are too. Segment count scales with radius.
   */
  ring(
    x: number, y: number, from: number, to: number, color: number,
    duration = 420, depth = 8, width = 3,
  ): void {
    const n = Phaser.Math.Clamp(Math.round(to / 7) * 4, 16, 64);
    this.anim(depth, duration, (g, t) => {
      const r = from + (to - from) * easeOut(t);
      g.lineStyle(width * (1 - t * 0.5), this.tint(color), (1 - t) * 0.9);
      const pts: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU;
        // Quantised radius: the ring advances in steps, like something being rasterised.
        const step = Math.round((r / 6)) * 6;
        pts.push({ x: x + Math.cos(a) * step, y: y + Math.sin(a) * step });
      }
      strokePts(g, pts, true);
    });
  }

  /** Bits flung out of something, tumbling and fading. */
  bits(
    x: number, y: number, count: number,
    o: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; color?: number; drift?: number } = {},
  ): void {
    const speed = o.speed ?? 200;
    const spread = o.spread ?? Math.PI;
    const baseAngle = o.angle ?? 0;
    const size = o.size ?? 9;
    const life = o.life ?? 620;
    const depth = o.depth ?? 9;
    const color = o.color ?? TECH.phosphor;
    const drift = o.drift ?? -18;

    const parts = Array.from({ length: count }, () => ({
      a: baseAngle + (Math.random() - 0.5) * spread * 2,
      v: speed * (0.4 + Math.random()),
      s: size * (0.65 + Math.random() * 0.7),
      spin: (Math.random() - 0.5) * 7,
      one: Math.random() < 0.5,
      delay: Math.random() * 0.2,
    }));
    this.anim(depth, life, (g, t) => {
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const d = p.v * easeOut(lt) * (life / 1000);
        bitTileLayered(g, this.tint,
          x + Math.cos(p.a) * d, y + Math.sin(p.a) * d + drift * lt,
          p.spin * lt, p.s * (1 - lt * 0.35), p.one, color, 0.95 * (1 - lt * lt));
      }
    });
  }

  /** A single bit peeling off a moving thing — the cruncher's trail, the VPN's wake. */
  bit(x: number, y: number, color: number, depth = 13, size = 9, life = 520): void {
    const one = Math.random() < 0.5;
    const spin = (Math.random() - 0.5) * 3;
    const drift = 8 + Math.random() * 14;
    this.anim(depth, life, (g, t) => {
      bitTileLayered(g, this.tint, x, y - drift * t, spin * t, size * (1 - t * 0.3), one,
        color, 0.95 * (1 - t * t));
    });
  }

  /**
   * A crash: white core, stepped shockwaves, bits thrown clear, a burst of torn scanlines and a
   * burned-in rectangle left on the floor.
   */
  crash(x: number, y: number, radius: number, o: TechCrashOpts = {}): void {
    const color = o.color ?? TECH.cyan;
    const count = o.bits ?? Math.max(4, Math.round(radius / 8));
    const rings = o.rings ?? 2;
    const dur = o.duration ?? Math.round(360 + radius * 1.2);
    const depth = o.depth ?? 9;

    if (o.mark !== false) this.burnIn(x, y, radius * 0.6, depth - 6, color);
    this.flash(x, y, radius * 0.42, depth + 2, color);
    for (let i = 0; i < rings; i++) {
      this.scene.time.delayedCall(i * 80, () =>
        this.ring(x, y, radius * 0.2, radius * (1 + i * 0.28),
          i === 0 ? color : TECH.white, Math.round(dur * (0.85 + i * 0.2)), depth, 3 - i * 0.9));
    }
    this.bits(x, y, count, {
      speed: radius * 2, size: 8 + radius / 14, life: Math.round(dur * 1.4), depth: depth + 1, color,
    });
    this.glitch(x, y, radius * 1.6, radius * 1.1, color, Math.round(dur * 0.7), depth + 1);
  }

  /** A burst of torn signal over a rectangle. */
  glitch(
    x: number, y: number, w: number, h: number, color: number = TECH.cyan,
    duration = 320, depth = 16,
  ): void {
    this.anim(depth, duration, (g, t) => {
      crtGlitch(g, this.tint, x, y, w, h, color, 1 - t, 8);
    });
  }

  /** A rectangle burned into the floor where something crashed, fading as the phosphor cools. */
  burnIn(x: number, y: number, radius: number, depth = 3, color: number = TECH.phosphor): void {
    const cells = 3 + Math.floor(Math.random() * 3);
    const seed = Math.random() * TAU;
    this.anim(depth, 1600, (g, t) => {
      const a = (t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94) * 0.5;
      g.fillStyle(this.tint(TECH.night), a * 0.7);
      g.fillRect(x - radius, y - radius * 0.7, radius * 2, radius * 1.4);
      g.lineStyle(1.4, this.tint(color), a);
      g.strokeRect(x - radius, y - radius * 0.7, radius * 2, radius * 1.4);
      // A few surviving cells still lit inside the burn.
      for (let i = 0; i < cells; i++) {
        const ang = seed + i * 2.399;
        bitTileLayered(g, this.tint,
          x + Math.cos(ang) * radius * 0.55, y + Math.sin(ang) * radius * 0.4, 0,
          radius * 0.28, i % 2 === 0, color, a * 1.6, false);
      }
    });
  }

  /** A packet travelling from one point to another — an upload, a payout, a handoff. */
  packet(
    sx: number, sy: number, tx: number, ty: number,
    o: { count?: number; duration?: number; depth?: number; color?: number; size?: number } = {},
  ): void {
    const count = o.count ?? 5;
    const dur = o.duration ?? 420;
    const depth = o.depth ?? 12;
    const color = o.color ?? TECH.phosphor;
    const size = o.size ?? 9;
    const lags = Array.from({ length: count }, (_, i) => (i / count) * 0.45);
    const ones = Array.from({ length: count }, () => Math.random() < 0.5);
    this.anim(depth, dur, (g, t) => {
      for (let i = 0; i < count; i++) {
        const lt = Phaser.Math.Clamp((t - lags[i]) / (1 - lags[i]), 0, 1);
        if (lt <= 0) continue;
        // Stepped travel: the packet hops rather than sliding, like a progress bar.
        const u = Math.round(lt * 8) / 8;
        bitTileLayered(g, this.tint, sx + (tx - sx) * u, sy + (ty - sy) * u, 0,
          size, ones[i], color, 1 - lt * lt);
      }
    });
  }

  /**
   * A wind-up: a progress bar filling over the caster with bits streaming into it, so a channel
   * reads as something *loading* rather than as a pause.
   */
  loading(
    x: number, y: number, radius: number, duration: number,
    o: { color?: number; depth?: number; follow?: () => { x: number; y: number } } = {},
  ): void {
    const color = o.color ?? TECH.cyan;
    const depth = o.depth ?? 12;
    const follow = o.follow;
    this.anim(depth, duration, (g, t) => {
      const c = follow ? follow() : { x, y };
      const w = radius * 1.9;
      const by = c.y - radius - 12;
      g.fillStyle(this.tint(TECH.night), 0.75);
      g.fillRect(c.x - w / 2, by - 5, w, 10);
      g.lineStyle(1.4, this.tint(color), 0.9);
      g.strokeRect(c.x - w / 2, by - 5, w, 10);
      // Quantised fill, so it ticks forward in blocks.
      const k = Math.round(t * 12) / 12;
      g.fillStyle(this.tint(color), 0.95);
      g.fillRect(c.x - w / 2 + 1.5, by - 3.5, (w - 3) * k, 7);
      // Bits falling into the bar from above.
      for (let i = 0; i < 6; i++) {
        const p = ((t * 2.4 + i / 6) % 1);
        bitTileLayered(g, this.tint,
          c.x + ((i / 5) - 0.5) * w * 0.9, by - 34 + p * 30, 0,
          8, i % 2 === 0, color, 0.9 * (1 - p), false);
      }
      // …and a ring of them closing on the caster.
      const closing = easeIn(t);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU - t * 3;
        const d = radius * (1.7 - closing * 1.2);
        bitTileLayered(g, this.tint, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d,
          0, 9, i % 2 === 0, color, 0.35 + 0.6 * t, false);
      }
    });
  }

  // ── Per-frame painters ──────────────────────────────────────────────────
  // Drawn into a Graphics the caller already owns, because these ride on live gameplay state: a
  // cruncher's chomp cycle, a popup's remaining life, how far down a bomb's fuse has burned.

  /** A Cruncher in flight, mouth working. */
  static drawCruncher(
    g: Phaser.GameObjects.Graphics, tint: TechColorFn,
    x: number, y: number, angle: number, t: number, color: number, alpha: number,
  ): void {
    // A full chomp cycle roughly six times a second — fast enough to read as eating.
    const chomp = 0.5 + 0.5 * Math.sin(t * 19);
    cruncherHead(g, tint, x, y, angle, 11, chomp, color, alpha);
  }

  /** One popup, fading out over its last moments. */
  static drawAd(
    g: Phaser.GameObjects.Graphics, tint: TechColorFn,
    x: number, y: number, w: number, h: number, t: number, alpha: number, mine: boolean,
  ): void {
    // Yours is a translucent overlay you can see past; theirs is opaque and in the way.
    windowPane(g, tint, x, y, w, h, t, alpha, {
      body: mine ? TECH.board : TECH.adBlue,
      bar: mine ? TECH.steel : TECH.slate,
      accent: TECH.white,
      lines: 2,
    });
    // The ad itself: a blaring cone and a couple of impact lines.
    const cx = x, cy = y + h * 0.06;
    const pulse = 1 + 0.08 * Math.sin(t * 9);
    g.fillStyle(tint(TECH.amber), alpha);
    fillPts(g, [
      { x: cx - w * 0.16, y: cy - h * 0.1 }, { x: cx - w * 0.16, y: cy + h * 0.1 },
      { x: cx + w * 0.2 * pulse, y: cy + h * 0.22 * pulse }, { x: cx + w * 0.2 * pulse, y: cy - h * 0.22 * pulse },
    ]);
    g.fillStyle(tint(TECH.gold), alpha);
    g.fillRect(cx - w * 0.24, cy - h * 0.07, w * 0.09, h * 0.14);
    g.lineStyle(2, tint(TECH.white), alpha * 0.8);
    for (let i = 1; i <= 2; i++) {
      const r = w * (0.24 + i * 0.06) * pulse;
      g.beginPath();
      g.arc(cx + w * 0.2, cy, r, -0.7, 0.7);
      g.strokePath();
    }
  }

  /** A fighter that has been turned into a box. */
  static drawBoxed(
    g: Phaser.GameObjects.Graphics, tint: TechColorFn,
    x: number, y: number, r: number, t: number, alpha: number,
  ): void {
    // A shipping crate: slabs, a taped seam and a stencil, snapping to the movement grid.
    const s = r * 1.5;
    g.fillStyle(tint(TECH.night), alpha * 0.4);
    g.fillEllipse(x, y + s * 0.85, s * 1.9, s * 0.5);
    g.fillStyle(tint(TECH.gold), alpha);
    g.fillRect(x - s, y - s * 0.8, s * 2, s * 1.6);
    g.fillStyle(tint(TECH.rust), alpha * 0.55);
    g.fillRect(x - s, y - s * 0.8, s * 2, s * 0.24);
    g.lineStyle(2, tint(TECH.night), alpha * 0.8);
    g.strokeRect(x - s, y - s * 0.8, s * 2, s * 1.6);
    // Tape down the seam.
    g.fillStyle(tint(TECH.wire), alpha * 0.85);
    g.fillRect(x - s * 0.12, y - s * 0.8, s * 0.24, s * 1.6);
    // A stencil that is unmistakably a fighter in a box.
    g.lineStyle(2, tint(TECH.night), alpha * 0.7);
    strokePts(g, [{ x: x - s * 0.5, y: y + s * 0.2 }, { x: x - s * 0.5, y: y - s * 0.2 }, { x: x - s * 0.2, y: y - s * 0.2 }]);
    strokePts(g, [{ x: x + s * 0.5, y: y + s * 0.2 }, { x: x + s * 0.5, y: y - s * 0.2 }, { x: x + s * 0.2, y: y - s * 0.2 }]);
    // The grid it is stuck on, faintly, under it.
    g.lineStyle(1, tint(TECH.cyan), alpha * (0.14 + 0.08 * Math.sin(t * 4)));
    for (let i = -1; i <= 1; i++) {
      g.lineBetween(x + i * s * 1.8, y - s * 2, x + i * s * 1.8, y + s * 2);
      g.lineBetween(x - s * 2, y + i * s * 1.8, x + s * 2, y + i * s * 1.8);
    }
  }

  /** A byte bomb: a cased charge with a seven-segment countdown on the front. */
  static drawByteBomb(
    g: Phaser.GameObjects.Graphics, tint: TechColorFn,
    x: number, y: number, secondsLeft: number, t: number, alpha: number,
  ): void {
    // Panic ramps as the fuse burns: faster flash, hotter casing.
    const panic = Phaser.Math.Clamp(1 - secondsLeft / 8, 0, 1);
    const beat = Math.sin(t * (5 + panic * 22)) > 0 ? 1 : 0;
    g.fillStyle(tint(TECH.night), alpha * 0.45);
    g.fillEllipse(x, y + 17, 34, 9);
    g.fillStyle(tint(TECH.board), alpha);
    g.fillCircle(x, y, 15);
    g.lineStyle(2, tint(panic > 0.6 ? TECH.alert : TECH.cyan), alpha * (0.6 + 0.4 * beat));
    g.strokeCircle(x, y, 15);
    // Circuit traces round the casing.
    g.lineStyle(1.2, tint(TECH.phosphorDim), alpha * 0.8);
    for (let i = 0; i < 4; i++) {
      const a = t * 0.6 + (i / 4) * TAU;
      strokePts(g, [
        { x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6 },
        { x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 6 },
        { x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 12 },
      ]);
    }
    // The display: a dark panel with the count drawn as blocks.
    g.fillStyle(tint(TECH.screen), alpha);
    g.fillRect(x - 10, y - 5, 20, 10);
    const digits = Math.max(0, Math.min(9, Math.ceil(secondsLeft)));
    g.fillStyle(tint(panic > 0.6 ? TECH.alert : TECH.phosphor), alpha * (0.55 + 0.45 * beat));
    for (let i = 0; i < digits; i++) {
      g.fillRect(x - 9 + (i % 5) * 3.6, y - 3.6 + Math.floor(i / 5) * 4, 2.4, 3);
    }
  }

  /** The Upload cord: a cable from the caster to a head that is looking for something to grab. */
  static drawCord(
    g: Phaser.GameObjects.Graphics, tint: TechColorFn,
    sx: number, sy: number, hx: number, hy: number, t: number, alpha: number, parked: boolean,
  ): void {
    // The cable sags between the two ends and swings, so it never reads as a laser.
    const mx = (sx + hx) / 2 + Math.sin(t * 2.2) * 12;
    const my = (sy + hy) / 2 + Math.abs(hx - sx) * 0.09 + Math.cos(t * 2.6) * 8;
    const pts: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      pts.push({ x: a * sx + b * mx + c * hx, y: a * sy + b * my + c * hy });
    }
    cableRun(g, tint, pts, TECH.phosphor, alpha, 5);
    if (!parked) return;
    // Parked: it sits there scanning, which is worth showing — it is still live.
    g.lineStyle(1.4, tint(TECH.phosphor), alpha * (0.3 + 0.3 * Math.sin(t * 5)));
    g.strokeCircle(hx, hy, 16 + 6 * Math.sin(t * 3));
  }

  /** A goose. It is a goose. */
  static drawGoose(
    g: Phaser.GameObjects.Graphics, tint: TechColorFn,
    x: number, y: number, facing: number, t: number, alpha: number,
  ): void {
    const look = Math.cos(facing) < 0 ? -1 : 1;
    const waddle = Math.sin(t * 9) * 2;
    g.fillStyle(tint(TECH.night), alpha * 0.35);
    g.fillEllipse(x, y + 13, 26, 7);
    // Legs.
    g.lineStyle(2, tint(TECH.gold), alpha);
    g.lineBetween(x - 3, y + 7, x - 3 + waddle * 0.5, y + 13);
    g.lineBetween(x + 3, y + 7, x + 3 - waddle * 0.5, y + 13);
    // Body, neck and head — one long S, which is the whole silhouette of a goose.
    g.fillStyle(tint(TECH.white), alpha);
    g.fillEllipse(x - look * 3, y + 3, 24, 17);
    g.lineStyle(6, tint(TECH.white), alpha);
    strokePts(g, [
      { x: x + look * 5, y: y + 1 },
      { x: x + look * 10, y: y - 8 + waddle * 0.3 },
      { x: x + look * 8, y: y - 15 + waddle * 0.3 },
    ]);
    g.fillStyle(tint(TECH.white), alpha);
    g.fillCircle(x + look * 8, y - 16 + waddle * 0.3, 5);
    g.fillStyle(tint(TECH.gold), alpha);
    fillPts(g, [
      { x: x + look * 11, y: y - 18 + waddle * 0.3 },
      { x: x + look * 19, y: y - 16 + waddle * 0.3 },
      { x: x + look * 11, y: y - 14 + waddle * 0.3 },
    ]);
    g.fillStyle(tint(TECH.night), alpha);
    g.fillCircle(x + look * 9.5, y - 17.5 + waddle * 0.3, 1.4);
    // A wing tucked against the body.
    g.lineStyle(1.6, tint(TECH.wire), alpha * 0.8);
    g.beginPath();
    g.arc(x - look * 3, y + 3, 9, -0.6, 1.4);
    g.strokePath();
  }
}

// ── TechnologyAura ────────────────────────────────────────────────────────

export type TechAuraStyle =
  | 'virus'      // infected: something is eating you from the inside
  | 'boxed'      // stuck on the movement grid
  | 'lag'        // your inputs are arriving late
  | 'vpn'        // mastery passive: the longer you move, the faster you go
  | 'shelter'    // standing under your own popup
  | 'invincible';// admin console, or an Admin Points cash-in

/**
 * A persistent Technology effect riding on a fighter. One Graphics, driven by whoever owns it.
 *
 * The styles differ in *shape* because several stack: a virus crawls, a box grids, lag tears,
 * a VPN streams behind you, shelter roofs you and invincibility encases you.
 */
export class TechnologyAura {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private intensity = 1;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    private tint: TechColorFn,
    private style: TechAuraStyle,
    private radius: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Usually a remaining or ramp fraction, 0–1. */
  setIntensity(v: number): void { this.intensity = v; }
  setAngle(a: number): void { this.angle = a; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;
    const k = Phaser.Math.Clamp(this.intensity, 0, 1);
    const r = this.radius;
    const t = this.t;

    switch (this.style) {
      case 'virus': {
        // Corrupted cells crawling over the body, plus the odd flipped bit.
        for (let i = 0; i < 7; i++) {
          const a = t * 1.6 + (i / 7) * TAU;
          const d = r * (0.75 + 0.25 * Math.sin(t * 3 + i * 2));
          bitTileLayered(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8,
            Math.sin(t * 4 + i) * 0.3, 8, (i + Math.floor(t * 3)) % 2 === 0,
            TECH.plague, alpha * 0.9, false);
        }
        crtGlitch(g, this.tint, x, y, r * 2, r * 1.7, TECH.plague, alpha * 0.5, 3);
        break;
      }
      case 'boxed': {
        // The grid it is locked to, brighter on the lines it can actually move along.
        g.lineStyle(1.4, this.tint(TECH.cyan), alpha * (0.28 + 0.14 * Math.sin(t * 5)));
        for (let i = -2; i <= 2; i++) {
          g.lineBetween(x + i * r, y - r * 2.4, x + i * r, y + r * 2.4);
          g.lineBetween(x - r * 2.4, y + i * r, x + r * 2.4, y + i * r);
        }
        break;
      }
      case 'lag': {
        // Ghosts of where you were, plus tearing across the body.
        for (let i = 1; i <= 3; i++) {
          g.lineStyle(1.6, this.tint(TECH.cyan), alpha * 0.3 / i);
          g.strokeRect(x - r - i * 4, y - r - i * 4, (r + i * 4) * 2, (r + i * 4) * 2);
        }
        crtGlitch(g, this.tint, x, y, r * 2.4, r * 2, TECH.cyan, alpha * 0.6, 5);
        break;
      }
      case 'vpn': {
        // A stream of packets pulled off behind you, denser the longer the ramp has run.
        if (k <= 0.05) break;
        const n = 2 + Math.round(k * 5);
        for (let i = 0; i < n; i++) {
          const p = (t * 3 + i / n) % 1;
          const a = this.angle + Math.PI + (i - n / 2) * 0.14;
          bitTileLayered(g, this.tint,
            x + Math.cos(a) * r * (0.5 + p * 1.6), y + Math.sin(a) * r * (0.5 + p * 1.6),
            0, 9 * (1 - p * 0.5), i % 2 === 0, TECH.cyan, alpha * 0.9 * (1 - p), false);
        }
        break;
      }
      case 'shelter': {
        // A roof of pixels over your head, and the resistance readout under it.
        g.fillStyle(this.tint(TECH.board), alpha * 0.3);
        g.fillRect(x - r * 1.3, y - r * 1.8, r * 2.6, r * 0.5);
        g.lineStyle(1.4, this.tint(TECH.mint), alpha * 0.7);
        g.strokeRect(x - r * 1.3, y - r * 1.8, r * 2.6, r * 0.5);
        for (let i = 0; i < 5; i++) {
          bitTileLayered(g, this.tint, x + (i - 2) * r * 0.45, y - r * 1.55, 0, 7,
            (i + Math.floor(t * 2)) % 2 === 0, TECH.mint, alpha * 0.85, false);
        }
        break;
      }
      case 'invincible': {
        // A wireframe cage: axis-aligned, unmistakably "not part of the simulation".
        const pulse = 0.5 + 0.5 * Math.sin(t * 6);
        g.lineStyle(2.4, this.tint(TECH.amber), alpha * (0.5 + 0.4 * pulse));
        g.strokeRect(x - r, y - r, r * 2, r * 2);
        g.lineStyle(1.2, this.tint(TECH.white), alpha * 0.6);
        for (let i = 1; i < 4; i++) {
          g.lineBetween(x - r + (i / 4) * r * 2, y - r, x - r + (i / 4) * r * 2, y + r);
          g.lineBetween(x - r, y - r + (i / 4) * r * 2, x + r, y - r + (i / 4) * r * 2);
        }
        break;
      }
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── TechnologyAvatar ──────────────────────────────────────────────────────

/** Concentric discs of one hand — a little screen in a dark bezel. */
const TECH_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: TECH.cyan, alpha: 0.22 },
    { r: 7.4, color: TECH.board, alpha: 1 },
    { r: 4.6, color: TECH.screen, alpha: 1 },
    { r: 2, color: TECH.phosphor, alpha: 1, ox: -2, oy: -2.2 },
  ],
  eyeWhite: TECH.phosphor,
  eyePupil: TECH.night,
  // Servo-driven hands: they snap to position and barely smear.
  squash: { div: 18, x: 0.3, y: 0.16 },
};

/**
 * The Technology character rig: two hands that are little screens, a pair of tracking eyes, and
 * a CRT monitor hovering over the crown with code scrolling down it.
 *
 * The monitor is the idea. Every ability in this element is a thing happening *on a computer* —
 * popups, uploads, a browser, an admin console — so the character has to be visibly the machine
 * those things are happening on, before it has cast anything.
 */
export class TechnologyAvatar extends BaseAvatar {
  private fx: TechnologyFx;
  /** Phosphor green for the player, cyan for the NPC, so two Tech fighters never blur together. */
  private accent: number;
  /** VPN ramp, 0–1 — how much speed the mastery passive has banked. */
  private vpn = 0;
  /** Rolling code rows on the head monitor. Regenerated as the display scrolls. */
  private rows: boolean[][] = [];
  private scroll = 0;

  constructor(scene: Phaser.Scene, tint: TechColorFn, owner: 'player' | 'npc' = 'player', depth = 6) {
    super(scene, tint, depth, TECH_AVATAR);
    this.fx = new TechnologyFx(scene, tint);
    this.accent = owner === 'player' ? TECH.phosphor : TECH.cyan;
    for (let i = 0; i < 6; i++) this.rows.push(Array.from({ length: 5 }, () => Math.random() < 0.5));
  }

  /** VPN ramp, 0–1. Drives the extra fans and the overclock read on the monitor. */
  setVpn(v: number): void { this.vpn = Phaser.Math.Clamp(v, 0, 1); }

  /**
   * Mastery tell — VPN, made visible: the hands gain a bright bezel, the eyes go amber, and (in
   * drawExtras) the head monitor grows a second stacked screen, a pair of antennae go up, and a
   * throughput bar runs along the bottom of the display. Shape changes, not brighter tints — a
   * tint alone vanishes at gameplay zoom.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? TECH.amber : TECH.phosphor);
    this.forEachHandLayer(0, (glow) => glow.setRadius(on ? 15 : 11));
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(2, this.tint(TECH.amber), 0.95);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands shed bits. */
  protected emitTrail(x: number, y: number): void {
    this.fx.bit(x, y, this.accent, 5, 8, 460);
  }

  /** Hands held flat and low, typing. */
  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    if (hold !== 'brace') return null;
    // Deliberately jittery: this is a keyboard, not a breath.
    const key = Math.random() < 0.4 ? 1 : 0;
    return {
      ang: Math.PI / 2 + side * 0.5,
      dist: 22 + key * 2,
      scale: idle.scale * (1 - key * 0.06),
    };
  }

  /** The pool of screen-light it stands in, and a grid on the floor under it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    const k = this.intensity;
    g.fillStyle(this.tint(TECH.night), a * 0.36);
    g.fillEllipse(x, y + 11, 48 * k, 17 * k);
    g.fillStyle(this.tint(this.accent), a * 0.11 * k);
    g.fillCircle(x, y, 25 * k);
    // A patch of grid, brighter under a mastered (overclocked) caster.
    const cell = 11;
    g.lineStyle(1, this.tint(TECH.cyan), a * (this.mastered ? 0.3 : 0.16) * k);
    for (let i = -2; i <= 2; i++) {
      g.lineBetween(x + i * cell, y - cell * 2 + 8, x + i * cell, y + cell * 2 + 8);
      g.lineBetween(x - cell * 2, y + i * cell + 8, x + cell * 2, y + i * cell + 8);
    }
  }

  /**
   * The screens in the hands, and the crown: a CRT monitor over the head with code scrolling
   * down it, on a little stand, with antennae once mastered.
   *
   * Rooted above the head so it never covers the face, and drawn over the sprite so the display
   * actually reads instead of only the dark bezel clearing the body.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const tint = this.tint;

    // ── The screens in the hands ──
    for (let i = 0; i < 2; i++) {
      const hx = this.armX[i], hy = this.armY[i];
      if (hx === 0 && hy === 0) continue;
      bitTileLayered(g, tint, hx, hy, 0, 7 * this.intensity,
        (i + Math.floor(this.t * 4)) % 2 === 0, this.accent, alpha * 0.95, false);
    }

    // ── The head monitor ──
    const bob = Math.sin(this.t * 1.8) * 1.8;
    const rootY = y - 22 + bob;
    const w = 30 * this.intensity;
    const h = 22 * this.intensity;

    // Stand: a neck and a foot, so the thing is standing on the head rather than floating.
    g.fillStyle(tint(TECH.slate), alpha);
    g.fillRect(x - 2.4, rootY + h / 2, 4.8, 6);
    g.fillRect(x - 7, rootY + h / 2 + 5, 14, 2.6);

    // Bezel and screen.
    g.fillStyle(tint(TECH.night), alpha * 0.5);
    g.fillRect(x - w / 2 + 2, rootY - h / 2 + 3, w, h);
    g.fillStyle(tint(TECH.slate), alpha);
    g.fillRect(x - w / 2, rootY - h / 2, w, h);
    g.fillStyle(tint(TECH.screen), alpha);
    g.fillRect(x - w / 2 + 3, rootY - h / 2 + 3, w - 6, h - 6);

    // Scrolling code: rows of bits that fall off the bottom and are re-rolled at the top.
    this.scroll += 0.03;
    if (this.scroll >= 1) {
      this.scroll -= 1;
      this.rows.pop();
      this.rows.unshift(Array.from({ length: 5 }, () => Math.random() < 0.5));
    }
    const cellW = (w - 8) / 5;
    for (let r = 0; r < this.rows.length; r++) {
      const ry = rootY - h / 2 + 5 + (r + this.scroll) * 3.4;
      if (ry > rootY + h / 2 - 5) continue;
      for (let c = 0; c < 5; c++) {
        if (!this.rows[r][c]) continue;
        g.fillStyle(tint(this.accent), alpha * (0.85 - r * 0.1));
        g.fillRect(x - w / 2 + 4.5 + c * cellW, ry, cellW * 0.55, 2);
      }
    }
    // Screen glare: one diagonal band across the glass.
    g.fillStyle(tint(TECH.white), alpha * 0.08);
    fillPts(g, [
      { x: x - w / 2 + 3, y: rootY + h / 2 - 3 },
      { x: x - w / 2 + 3 + w * 0.35, y: rootY - h / 2 + 3 },
      { x: x - w / 2 + 3 + w * 0.6, y: rootY - h / 2 + 3 },
      { x: x - w / 2 + 3 + w * 0.25, y: rootY + h / 2 - 3 },
    ]);

    // ── Mastery: a second stacked screen, antennae, and a throughput bar ──
    if (this.mastered) {
      const w2 = w * 0.62, h2 = h * 0.5;
      g.fillStyle(tint(TECH.slate), alpha);
      g.fillRect(x + w / 2 - 2, rootY - h / 2 - h2 + 2, w2, h2);
      g.fillStyle(tint(TECH.screen), alpha);
      g.fillRect(x + w / 2, rootY - h / 2 - h2 + 4, w2 - 4, h2 - 4);
      for (let i = 0; i < 3; i++) {
        g.fillStyle(tint(TECH.amber), alpha * 0.8);
        g.fillRect(x + w / 2 + 1.5, rootY - h / 2 - h2 + 6 + i * 3, (w2 - 7) * (0.4 + 0.6 * Math.abs(Math.sin(this.t * 2 + i))), 1.8);
      }
      // Antennae, leaning with the sway.
      for (const side of [-1, 1]) {
        const lean = side * (0.5 + Math.sin(this.t * 1.4) * 0.08);
        g.lineStyle(1.8, tint(TECH.wire), alpha);
        strokePts(g, [
          { x: x + side * w * 0.3, y: rootY - h / 2 },
          { x: x + side * w * 0.3 + Math.sin(lean) * 12, y: rootY - h / 2 - 14 },
        ]);
        g.fillStyle(tint(TECH.amber), alpha);
        g.fillCircle(x + side * w * 0.3 + Math.sin(lean) * 12, rootY - h / 2 - 14, 2.2);
      }
      // Throughput: the VPN ramp, read straight off the front of the machine.
      g.fillStyle(tint(TECH.night), alpha * 0.8);
      g.fillRect(x - w / 2 + 3, rootY + h / 2 - 4.5, w - 6, 3);
      g.fillStyle(tint(this.vpn > 0.8 ? TECH.amber : TECH.cyan), alpha);
      g.fillRect(x - w / 2 + 3, rootY + h / 2 - 4.5, (w - 6) * this.vpn, 3);
    }
    void a;
  }
}
