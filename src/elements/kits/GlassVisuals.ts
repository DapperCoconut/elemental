import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Glass draws.
 *
 * The element is a mosaic, so there is exactly one primitive underneath all of it: a *pane* —
 * a flat, irregular, four-cornered piece of coloured glass with a dark lead edge and one
 * specular streak across it. A shard is a long thin pane. The character is a ring of short fat
 * panes. The Q explosion is fifteen panes leaving at once. Nothing here is a circle.
 *
 * The second rule is that no two adjacent panes share a colour. `MOSAIC` is walked by index
 * everywhere rather than sampled at random, so a burst of fifteen shards always comes out as a
 * rainbow rather than as a lucky dip that might land on five reds in a row — "a mosaic of many
 * different colours" is the whole brief, and randomness is bad at it.
 *
 * The third: glass is *transparent*. Every fill here is well under 1 alpha and every pane gets
 * a bright rim, because the read is "I can see the arena through him" rather than "he is
 * painted light blue".
 */

export type GlassColorFn = ColorFn;

export const GLA = {
  /** The came between tiles — every pane is outlined in it. */
  lead: 0x1b1430,
  shadow: 0x0b0818,
  /** Undyed glass: the body's base and the specular rim on everything. */
  pane: 0xdff2ff,
  bright: 0xffffff,
  ruby: 0xe0424f,
  amber: 0xf2a33c,
  citrine: 0xf5e055,
  emerald: 0x3fc98a,
  sapphire: 0x3f8ce8,
  amethyst: 0xa25ce8,
  rose: 0xf07ab8,
};

/**
 * The mosaic, in order. Always indexed, never sampled — see the file comment. Seven is
 * deliberately coprime with the six orbiting shards, so the ring's colours rotate every time
 * it is rebuilt instead of settling into the same six.
 */
export const MOSAIC = [GLA.ruby, GLA.amber, GLA.citrine, GLA.emerald, GLA.sapphire, GLA.amethyst, GLA.rose];

/** Nth colour of the mosaic, wrapping. */
export function hueOf(i: number): number {
  return MOSAIC[((i % MOSAIC.length) + MOSAIC.length) % MOSAIC.length];
}

/** Deterministic 0–1 noise, so a pane breaks the same way every frame. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 53.7 + i * 191.3) * 21841.719;
  return v - Math.floor(v);
}

/** Scale a colour's channels — Temper's darkening, applied *after* the skin remap. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * One pane of coloured glass, centred on (x, y) with its long axis along `ang`.
 *
 * Four corners rather than three: a triangle reads as a dart, and this has to read as a piece
 * broken out of something bigger. The two shoulders are pushed off-centre independently so no
 * pane is symmetrical, the lead outline is drawn *under* the fill so it shows as a rim rather
 * than a border, and the specular streak runs corner-to-corner across the face — which is the
 * single thing that makes a flat fill look like glass instead of paper.
 */
export function glassPane(
  g: Phaser.GameObjects.Graphics,
  tint: GlassColorFn,
  x: number, y: number, ang: number,
  len: number, width: number, alpha: number,
  { color = GLA.pane, seed = 0, dark = 1, rim = true } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  // Shoulders sit at different points down the length, which is what stops the silhouette
  // from being a symmetrical kite.
  const s1 = 0.12 + jitter(seed, 1) * 0.3;
  const s2 = -0.05 - jitter(seed, 2) * 0.3;
  const w1 = width * (0.62 + jitter(seed, 3) * 0.5);
  const w2 = width * (0.62 + jitter(seed, 4) * 0.5);

  const tip = P(len * 0.5, 0);
  const tail = P(-len * 0.5, (jitter(seed, 5) - 0.5) * width * 0.4);
  const face = [tip, P(len * s1, -w1), tail, P(len * s2, w2)];

  const fill = shade(tint(color), dark);
  const lead = shade(tint(GLA.lead), dark);

  // Lead came: the same shape a touch bigger, so it reads as the metal the pane is set into.
  g.fillStyle(lead, alpha * 0.85);
  g.fillPoints(face.map((p) => new Phaser.Geom.Point(x + (p.x - x) * 1.18, y + (p.y - y) * 1.18)), true);
  g.fillStyle(fill, alpha * 0.62);
  g.fillPoints(face, true);

  // The specular streak — a thin bright wedge across the face, not down the middle.
  const st0 = P(len * 0.34, -w1 * 0.42);
  const st1 = P(-len * 0.26, w2 * 0.1);
  g.lineStyle(Math.max(1, width * 0.22), shade(tint(GLA.bright), dark), alpha * 0.55);
  g.lineBetween(st0.x, st0.y, st1.x, st1.y);

  if (!rim) return;
  g.lineStyle(1.1, shade(tint(GLA.pane), dark), alpha * 0.75);
  g.strokePoints(face, true, true);
}

/**
 * A shard in flight: a pane with the air behind it still lit. The smear is drawn first and
 * long, so a shard crossing the arena leaves a streak of its own colour rather than a blur.
 */
export function flyingShard(
  g: Phaser.GameObjects.Graphics,
  tint: GlassColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  { color = GLA.pane, seed = 0, dark = 1, trail = 1 } = {},
): void {
  if (trail > 0) {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
    g.fillStyle(shade(tint(color), dark), alpha * 0.16);
    g.fillPoints([
      P(-len * 0.3, -len * 0.16), P(-len * 2.1 * trail, -len * 0.03),
      P(-len * 2.1 * trail, len * 0.03), P(-len * 0.3, len * 0.16),
    ], true);
  }
  glassPane(g, tint, x, y, ang, len, len * 0.34, alpha, { color, seed, dark });
}

/**
 * Cracks running through glass, spreading from a point.
 *
 * Deliberately *not* the same shape as a crack in stone: glass breaks in long straight radials
 * with concentric hoops strung between them, so each run here is drawn near-straight and every
 * other one gets a chord hung across to its neighbour. `grow` (0–1) sweeps how far the break
 * has travelled, which is what animates a fracture opening.
 */
export function crackLace(
  g: Phaser.GameObjects.Graphics,
  tint: GlassColorFn,
  x: number, y: number, r: number, seed: number, alpha: number, grow = 1,
  { runs = 8, color = GLA.bright, width = 1.4, squash = 1, dark = 1 } = {},
): void {
  const ends: Phaser.Geom.Point[] = [];
  for (let i = 0; i < runs; i++) {
    const a = (i / runs) * TAU + jitter(seed, i) * 0.55;
    const reach = r * (0.5 + jitter(seed, 20 + i) * 0.5) * grow;
    // Two segments with a slight kink: glass runs almost straight, then jogs once.
    const midA = a + (jitter(seed, 40 + i) - 0.5) * 0.3;
    const mx = x + Math.cos(midA) * reach * 0.55;
    const my = y + Math.sin(midA) * reach * 0.55 * squash;
    const ex = x + Math.cos(a) * reach;
    const ey = y + Math.sin(a) * reach * squash;
    g.lineStyle(width, shade(tint(color), dark), alpha * 0.8);
    g.lineBetween(x, y, mx, my);
    g.lineStyle(width * 0.7, shade(tint(color), dark), alpha * 0.55);
    g.lineBetween(mx, my, ex, ey);
    ends.push(new Phaser.Geom.Point(mx, my));
  }
  // The hoops: chords strung between every other radial, at the kink.
  g.lineStyle(width * 0.6, shade(tint(color), dark), alpha * 0.4);
  for (let i = 0; i < ends.length; i += 2) {
    const a = ends[i];
    const b = ends[(i + 1) % ends.length];
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
}

/**
 * A disc tiled into coloured facets with lead between them — the mosaic itself.
 *
 * Used for the character's torso, the Q charge-up and the reassembled ball at the cursor. Every
 * wedge takes the next colour off `MOSAIC` by index, so the tiling is a rainbow by construction.
 * `spin` turns the whole tiling; `open` (0–1) pushes the wedges outward off the centre, which
 * is how the body comes apart during Glass Blow.
 */
export function mosaicDisc(
  g: Phaser.GameObjects.Graphics,
  tint: GlassColorFn,
  x: number, y: number, r: number, alpha: number,
  { seed = 0, wedges = 9, spin = 0, open = 0, dark = 1, hue0 = 0 } = {},
): void {
  const lead = shade(tint(GLA.lead), dark);
  for (let i = 0; i < wedges; i++) {
    const a0 = (i / wedges) * TAU + spin;
    const a1 = ((i + 1) / wedges) * TAU + spin;
    const mid = (a0 + a1) / 2;
    // Each facet has its own inner hole and outer reach, so the tiling isn't a pie chart.
    const inner = r * (0.16 + jitter(seed, i) * 0.2);
    const outer = r * (0.82 + jitter(seed, 30 + i) * 0.22);
    const push = open * r * (0.5 + jitter(seed, 60 + i) * 0.9);
    const ox = Math.cos(mid) * push;
    const oy = Math.sin(mid) * push;
    const face = [
      new Phaser.Geom.Point(x + ox + Math.cos(a0) * inner, y + oy + Math.sin(a0) * inner),
      new Phaser.Geom.Point(x + ox + Math.cos(a0) * outer, y + oy + Math.sin(a0) * outer),
      new Phaser.Geom.Point(x + ox + Math.cos(a1) * outer, y + oy + Math.sin(a1) * outer),
      new Phaser.Geom.Point(x + ox + Math.cos(a1) * inner, y + oy + Math.sin(a1) * inner),
    ];
    g.fillStyle(lead, alpha * 0.7);
    g.fillPoints(face.map((p) => new Phaser.Geom.Point(x + ox + (p.x - x - ox) * 1.1, y + oy + (p.y - y - oy) * 1.1)), true);
    g.fillStyle(shade(tint(hueOf(hue0 + i)), dark), alpha * (0.38 + jitter(seed, 90 + i) * 0.2));
    g.fillPoints(face, true);
    // One lit edge per facet — the light is coming from the same side for all of them.
    g.lineStyle(1, shade(tint(GLA.bright), dark), alpha * 0.4);
    g.lineBetween(face[1].x, face[1].y, face[2].x, face[2].y);
  }
}

/**
 * The caustic a piece of coloured glass throws on the floor: overlapping soft blots of the
 * mosaic, drifting slowly. Cheap, and it is what makes the character read as lit *through*.
 */
export function caustic(
  g: Phaser.GameObjects.Graphics,
  tint: GlassColorFn,
  x: number, y: number, r: number, t: number, alpha: number,
  { blots = 5, seed = 0, dark = 1, hue0 = 0 } = {},
): void {
  for (let i = 0; i < blots; i++) {
    const a = (i / blots) * TAU + t * 0.4 + jitter(seed, i) * 2;
    const d = r * (0.2 + jitter(seed, 20 + i) * 0.55);
    g.fillStyle(shade(tint(hueOf(hue0 + i)), dark), alpha * 0.16);
    g.fillEllipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.4,
      r * (0.5 + jitter(seed, 40 + i) * 0.5), r * (0.2 + jitter(seed, 60 + i) * 0.2));
  }
}

/**
 * The ring the orbit rides on: a faint circle of hairline arcs, one per shard slot, brightening
 * as the shards are pushed out. Without it the six shards read as six unrelated objects rather
 * than as one thing you are wearing.
 */
export function orbitRing(
  g: Phaser.GameObjects.Graphics,
  tint: GlassColorFn,
  x: number, y: number, r: number, phase: number, alpha: number,
  { arcs = 6, dark = 1, hue0 = 0 } = {},
): void {
  for (let i = 0; i < arcs; i++) {
    const a0 = phase + (i / arcs) * TAU + 0.18;
    const a1 = phase + ((i + 1) / arcs) * TAU - 0.18;
    g.lineStyle(1.4, shade(tint(hueOf(hue0 + i)), dark), alpha * 0.3);
    g.beginPath();
    g.arc(x, y, r, a0, a1, false);
    g.strokePath();
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class GlassFx extends FxBase {
  /** Something made of glass stopped being one thing. Panes thrown off a point, tumbling. */
  shatter(x: number, y: number, count = 8, spread = 34, ms = 460, depth = 10, hue0 = 0, dark = 1): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU,
      d: spread * (0.4 + Math.random() * 0.85),
      s: 4 + Math.random() * 6,
      r: (Math.random() - 0.5) * 11,
      i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + e * e * 16;
        glassPane(g, this.tint, px, py, p.a + p.r * t, p.s * 1.9, p.s * 0.8, (1 - t) * 0.95,
          { color: hueOf(hue0 + p.i), seed: p.i * 7 + 3, dark, rim: false });
      }
    });
  }

  /** A hoop of coloured light going out — casts, eruptions, the moment a pane rejoins. */
  chime(x: number, y: number, r0: number, r1: number, ms = 460, depth = 9, hue0 = 0, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      // Each sixth of the hoop is a different colour, so the ring itself is the mosaic.
      for (let i = 0; i < 6; i++) {
        g.lineStyle(3.2 * (1 - t) + 0.8, shade(this.tint(hueOf(hue0 + i)), dark), (1 - t) * 0.8);
        g.beginPath();
        g.arc(x, y, r, (i / 6) * TAU + 0.06, ((i + 1) / 6) * TAU - 0.06, false);
        g.strokePath();
      }
    });
  }

  /** Fine glass dust hanging where something broke. */
  dust(x: number, y: number, count = 8, spread = 22, ms = 620, depth = 9, hue0 = 0, dark = 1): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU, d: spread * (0.3 + Math.random() * 0.9), s: 1.2 + Math.random() * 2, i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + e * 10;
        g.fillStyle(shade(this.tint(hueOf(hue0 + p.i)), dark), (1 - t) * 0.7);
        g.fillRect(px, py, p.s, p.s);
      }
    });
  }

  /** A crack opening through the air and healing shut — Temper, and the Q charge. */
  fracture(x: number, y: number, r = 50, ms = 560, depth = 9, dark = 1): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      crackLace(g, this.tint, x, y, r, seed, 1 - t, Math.min(1, t * 2.2), { runs: 9, width: 1.8, dark });
    });
  }

  /** Impact: the standard "a piece of glass hit you" beat. */
  ping(x: number, y: number, size = 22, hue = GLA.pane, depth = 10, dark = 1): void {
    this.flashIn(x, y, size * 0.5, shade(GLA.bright, dark), shade(hue, dark), depth);
    this.dust(x, y, 4, size, 380, depth);
  }

  /**
   * Glass Blow's detonation. Everything at once and deliberately over the top: a white core, the
   * full rainbow hoop, and the whole mosaic thrown outward — this is a character exploding.
   */
  burst(x: number, y: number, r: number, ms = 700, depth = 11, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(shade(this.tint(GLA.bright), dark), (1 - t) * (1 - t) * 0.9);
      g.fillCircle(x, y, r * 0.35 * (0.3 + e));
      for (let i = 0; i < 7; i++) {
        g.lineStyle(6 * (1 - t) + 1, shade(this.tint(hueOf(i)), dark), (1 - t) * 0.7);
        g.beginPath();
        g.arc(x, y, r * e * (0.7 + i * 0.05), (i / 7) * TAU, ((i + 1) / 7) * TAU, false);
        g.strokePath();
      }
    });
    this.shatter(x, y, 14, r * 0.9, ms, depth, 0, dark);
  }

  /**
   * A pane arriving from off to one side and settling — the reassembly beat. Drawn as a bright
   * seam sealing shut, because the point being made is that the piece is *joining*, not landing.
   */
  seal(x: number, y: number, ang: number, size = 20, ms = 340, depth = 11, hue = GLA.pane, dark = 1): void {
    this.anim(depth, ms, (g, t) => {
      const e = easeIn(t);
      g.lineStyle(3 * (1 - e) + 0.6, shade(this.tint(GLA.bright), dark), (1 - t) * 0.85);
      g.lineBetween(
        x + Math.cos(ang + Math.PI / 2) * size * (1 - e * 0.6),
        y + Math.sin(ang + Math.PI / 2) * size * (1 - e * 0.6),
        x - Math.cos(ang + Math.PI / 2) * size * (1 - e * 0.6),
        y - Math.sin(ang + Math.PI / 2) * size * (1 - e * 0.6),
      );
      g.fillStyle(shade(this.tint(hue), dark), (1 - t) * 0.5);
      g.fillCircle(x, y, size * 0.3 * (1 - t));
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const GLASS_AVATAR: AvatarSpec = {
  hands: [
    { r: 12, color: GLA.pane, alpha: 0.18 },
    { r: 7, color: GLA.sapphire, alpha: 0.55 },
    { r: 2.6, color: GLA.bright, alpha: 0.95, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: GLA.pane,
  eyePupil: GLA.lead,
  squash: { div: 14, x: 0.5, y: 0.3 },
};

/**
 * Glass himself: a figure assembled out of coloured panes with the light coming through him.
 *
 * Three things carry the read. The torso is a `mosaicDisc` at low alpha, so the arena is
 * genuinely visible through his chest; he throws a coloured caustic on the floor rather than a
 * plain shadow; and above his crown sits a small leaded arch — a church window — which is what
 * makes "stained glass" rather than "ice" land at a glance.
 *
 * `setTemper` is the one state the rig owns. Tempered glass is darker and denser, so the whole
 * palette is scaled down at once through `dark` rather than by picking second colours — which
 * also keeps every fill a real palette key, so a future skin's remap still works.
 */
export class GlassAvatar extends BaseAvatar {
  /** 0 = clear, 1 = fully tempered. Lerped, so the tint slides in rather than snapping. */
  private temper = 0;
  private temperTarget = 0;
  /** 0–1 — how far the mosaic has come apart. Driven by the Q. */
  private open = 0;
  /** Ability tell: brightens the seams for a moment after a cast. */
  private flare = 0;
  private seed = Math.random() * 999;
  private hue0 = Math.floor(Math.random() * MOSAIC.length);

  constructor(scene: Phaser.Scene, tint: GlassColorFn, depth = 6) {
    super(scene, tint, depth, GLASS_AVATAR);
  }

  /** Temper (F): the body goes dark and dense for the duration. */
  setTemper(on: boolean): void { this.temperTarget = on ? 1 : 0; }

  /** Glass Blow: 0 while whole, 1 the instant before he comes apart. */
  setOpen(v: number): void { this.open = Phaser.Math.Clamp(v, 0, 1); }

  /** The darkening factor every Glass drawing call should be passed. */
  get dark(): number { return 1 - this.temper * 0.42; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 420);
    this.temper += (this.temperTarget - this.temper) * Math.min(1, delta / 160);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.32 : 0.18);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new GlassFx(this.scene, this.tint).dust(x, y, 2, 6, 340, 4, this.hue0, this.dark);
  }

  /** The coloured light he throws on the floor — a caustic, never a shadow. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const d = this.dark;
    g.fillStyle(shade(this.tint(GLA.shadow), d), a * 0.3);
    g.fillEllipse(x, y + 15, 40, 14);
    caustic(g, this.tint, x, y + 14, 34 + Math.sin(this.t * 1.6) * 3, this.t, a,
      { blots: 6, seed: this.seed, dark: d, hue0: this.hue0 });
  }

  /** The torso: a leaded mosaic you can see the arena through. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const d = this.dark;
    mosaicDisc(g, this.tint, x, y + 1, 17, alpha * (0.9 + this.flare * 0.1), {
      seed: this.seed, wedges: 9, spin: this.t * 0.18, open: this.open, dark: d, hue0: this.hue0,
    });
    // Hairline breaks across the whole body, brighter for a beat after every cast.
    crackLace(g, this.tint, x, y + 1, 16, this.seed + 3, alpha * (0.18 + this.flare * 0.4), 1,
      { runs: 6, width: 1, dark: d });
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const d = this.dark;
    const heat = 0.5 + this.flare * 0.5;
    const crown = y - 18;

    // ── The leaded arch over his crown ──
    // A church window in miniature: two uprights, a round head, and three panes inside it.
    // Rooted at the crown so it never covers the face, and it leans with the aim.
    const lean = Math.cos(this.facing) * 2.4;
    const w = this.mastered ? 13 : 10.5;
    const h = this.mastered ? 15 : 12;
    for (let i = 0; i < 3; i++) {
      const u = (i - 1) * (w * 0.62);
      const paneH = h * (i === 1 ? 1 : 0.78);
      g.fillStyle(shade(this.tint(GLA.lead), d), alpha * 0.8);
      g.fillRect(x + lean + u - w * 0.3, crown - paneH, w * 0.6, paneH);
      g.fillStyle(shade(this.tint(hueOf(this.hue0 + i + 2)), d), alpha * (0.4 + heat * 0.3));
      g.fillRect(x + lean + u - w * 0.22, crown - paneH + 1.4, w * 0.44, paneH - 2.4);
    }
    // The round head of the arch, and one bright spine down the middle.
    g.lineStyle(2.2, shade(this.tint(GLA.lead), d), alpha * 0.85);
    g.beginPath();
    g.arc(x + lean, crown - h, w, Math.PI, TAU, false);
    g.strokePath();
    g.lineStyle(1.2, shade(this.tint(GLA.bright), d), alpha * 0.45 * heat);
    g.lineBetween(x + lean, crown - h - w * 0.9, x + lean, crown - h * 0.2);

    // ── Shoulder panes ──
    // Two short thick panes set into his sides, which is what gives the silhouette corners.
    for (const side of [-1, 1]) {
      const ang = this.facing + side * (Math.PI / 2);
      glassPane(g, this.tint, x + Math.cos(ang) * 15, y + 3 + Math.sin(ang) * 10, ang,
        14, 8, alpha * 0.85, { color: hueOf(this.hue0 + (side > 0 ? 4 : 1)), seed: this.seed + side * 11, dark: d });
    }

    // ── The seam down the face ──
    // One lead line running from the crown between the eyes: he isn't a figure with a crack in
    // him, he is two panes leaded together, which is a different and better read.
    g.lineStyle(1.6, shade(this.tint(GLA.lead), d), alpha * 0.7);
    g.lineBetween(x + Math.cos(this.facing) * 2, crown + 2, x + Math.cos(this.facing) * 3, y + 8);
  }
}
