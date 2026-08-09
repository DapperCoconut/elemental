import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Gluttony draws.
 *
 * The element is two characters wearing the same body, and every primitive here has to work in
 * both of them. The chef is clean geometry — a pressed toque, a double-breasted jacket, a blade
 * with a mirror spine — and the butcher is the same shapes with the edges broken: the hat
 * collapses, the whites take spatter, and the knife goes behind the back where you cannot see
 * what it is doing. Nothing about the transformation is a tint. Every tell is a silhouette.
 *
 * The other half of the file is food, and food has one rule: raw and cooked must be legible from
 * across the arena without reading a label. Raw is pale, soft-edged and wet; cooked is smaller,
 * darker, and carries grill stripes. `foodShape` therefore takes `cooked` as a real parameter
 * rather than a colour, because a browned potato splits its skin and a browned mushroom shrinks
 * — those are different drawings, not different fills.
 *
 * Nothing here picks a colour on its own: every call takes a `tint` so a skin can remap the
 * whole element.
 */

export type GluttonyColorFn = ColorFn;

export const GLT = {
  /** Chef whites, and the shadow inside their folds. */
  white: 0xf6f2e8,
  linen: 0xd6cfbe,
  linenDark: 0x9d9483,
  /** The neckerchief, the trouser check, the burnt edges of everything. */
  band: 0x2a2930,
  char: 0x1b1a1f,
  /** Steel — the knife, the skewer, the grate. */
  steel: 0xd6dee6,
  steelMid: 0x94a1ad,
  steelDark: 0x5d6873,
  /** A blade that has been left over the coals. */
  heat: 0xff7a2a,
  ember: 0xffb347,
  emberHot: 0xffe9a8,
  flame: 0xff5218,
  /** The grill itself. */
  iron: 0x35343d,
  ironLit: 0x585767,
  coal: 0x191519,
  /** Butchery. */
  blood: 0xa81f2b,
  bloodDark: 0x59101a,
  flesh: 0xd4707b,
  fleshDark: 0x7f3039,
  gut: 0x3d0f18,
  tooth: 0xf7f1de,
  /** The larder. */
  mushroom: 0xc9a184,
  mushroomCap: 0x8a5a37,
  carrot: 0xe4762a,
  frond: 0x63a53c,
  potato: 0xbb9058,
  potatoFlesh: 0xf2e6c2,
  meat: 0xd0525c,
  bone: 0xf1ead0,
  /** The Head Chef larder — the four things only an upgraded forage turns up. */
  berry: 0x9b3fd4,
  berryDark: 0x54186f,
  mint: 0x74d6a6,
  mintFrost: 0xdff5ec,
  pineapple: 0xe8c447,
  pineappleSkin: 0x9b7a1c,
  deathcap: 0xd3d9bc,
  deathcapGill: 0x8f9a74,
  venom: 0x6fe04a,
  /** Leftovers, and the film that grows on anything left on the maw. */
  parcel: 0xc9b48a,
  rot: 0x7d9b34,
  rotDark: 0x3c4d18,
  /** Pit Master's blue coals, and the char an over-seared thing carries. */
  blueCoal: 0x3fa9ff,
  blueHot: 0xd6f0ff,
  /** The ichor a cleaver picks up off the maw. */
  ichor: 0x5c0a14,
  ichorLit: 0x9c1524,
  /** The Feast pot. */
  pot: 0x43424c,
  stew: 0xc8823a,
  stewLit: 0xefb45e,
};

// ── The larder ────────────────────────────────────────────────────────────

export type FoodKind =
  | 'mushroom' | 'carrot' | 'potato' | 'meat'
  // Head Chef (E+) opens the second half of the larder.
  | 'berries' | 'mint' | 'pineapple' | 'deathcap'
  // Resourceful (Q+) — what is scraped out of the pot afterwards.
  | 'leftovers';

export interface FoodProfile {
  label: string;
  emoji: string;
  /** Card/HUD colour. Raw and cooked read differently in the drawing, not just the hue. */
  color: number;
  cookedColor: number;
  /** Milliseconds on a normal grill. A superheated one halves it. */
  cookMs: number;
  healRaw: number;
  healCooked: number;
  /**
   * Fractions of the eater's own max HP, added on top of the flat figures above. Only Winter
   * Mint uses them — it is the one ingredient written as a percentage rather than a number,
   * and a flat value would mean something different on a 400 HP player and a husk.
   */
  healPctRaw?: number;
  healPctCooked?: number;
  /** Seconds of butcher form eating it is worth. */
  hungerSec: number;
  /** Head Chef's rare drop: one entry in ten rather than one in seven. */
  rare?: boolean;
}

export const FOOD: Record<FoodKind, FoodProfile> = {
  mushroom: {
    label: 'MUSHROOM', emoji: '🍄', color: GLT.mushroom, cookedColor: 0x7c4c2c,
    cookMs: 10000, healRaw: 15, healCooked: 30, hungerSec: 5,
  },
  carrot: {
    label: 'CARROT', emoji: '🥕', color: GLT.carrot, cookedColor: 0xb8531b,
    cookMs: 5000, healRaw: 10, healCooked: 20, hungerSec: 3,
  },
  potato: {
    label: 'POTATO', emoji: '🥔', color: GLT.potato, cookedColor: 0x8a6231,
    cookMs: 12000, healRaw: 20, healCooked: 40, hungerSec: 8,
  },
  meat: {
    label: 'MEAT', emoji: '🍖', color: GLT.meat, cookedColor: 0x8e4327,
    cookMs: 15000, healRaw: 20, healCooked: 50, hungerSec: 15,
  },
  berries: {
    label: 'BRISTLE BERRIES', emoji: '🫐', color: GLT.berry, cookedColor: GLT.berryDark,
    cookMs: 5000, healRaw: 5, healCooked: 12, hungerSec: 2,
  },
  mint: {
    label: 'WINTER MINT', emoji: '🍃', color: GLT.mint, cookedColor: 0x6c7a4a,
    cookMs: 2000, healRaw: 0, healCooked: 0, healPctRaw: 0.10, healPctCooked: 0.01, hungerSec: 3,
  },
  pineapple: {
    label: 'PINEAPPLE', emoji: '🍍', color: GLT.pineapple, cookedColor: 0xd08e1e,
    cookMs: 20000, healRaw: 30, healCooked: 50, hungerSec: 10,
  },
  deathcap: {
    label: 'DEATH CAP', emoji: '☠️', color: GLT.deathcap, cookedColor: 0x8a6d3f,
    cookMs: 25000, healRaw: -30, healCooked: 50, hungerSec: 12, rare: true,
  },
  leftovers: {
    label: 'LEFTOVERS', emoji: '🥡', color: GLT.parcel, cookedColor: 0xb08334,
    cookMs: 25000, healRaw: 0, healCooked: 0, hungerSec: 4,
  },
};

/** What Forage can turn up. Meat is butchery, not foraging — it only comes off a skewer. */
export const FORAGEABLE: FoodKind[] = ['mushroom', 'carrot', 'potato'];

/**
 * What Forage turns up once Head Chef is owned. Death Cap is listed once against six common
 * entries and gated behind {@link FoodProfile.rare} on top of that, so it stays the thing you
 * are pleased to see rather than the thing you expect.
 */
export const FORAGEABLE_PLUS: FoodKind[] = [
  'mushroom', 'carrot', 'potato', 'berries', 'mint', 'pineapple', 'deathcap',
];

/**
 * One thing in a slot, everywhere it can be drawn — the strip, the grate, in flight, in hand.
 * `rotten` and `overseared` are mutually exclusive by construction: one comes off the maw and
 * the other off the grill, and the two are never the same object at the same time.
 */
export interface FoodStamp {
  kind: FoodKind;
  cooked: boolean;
  rotten?: boolean;
  overseared?: boolean;
}

export function foodColor(kind: FoodKind, cooked: boolean): number {
  return cooked ? FOOD[kind].cookedColor : FOOD[kind].color;
}

export function foodHeal(kind: FoodKind, cooked: boolean): number {
  return cooked ? FOOD[kind].healCooked : FOOD[kind].healRaw;
}

// ── Primitives ────────────────────────────────────────────────────────────

/** Deterministic 0–1 noise, so anything that has to wobble the same way every frame can. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 61.3 + i * 289.7) * 30211.457;
  return v - Math.floor(v);
}

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

/**
 * The kitchen knife, tip-first along `ang`.
 *
 * A chef's knife is three parts and all three have to be there or it reads as a shard: a blade
 * whose spine is dead straight and whose edge bellies out to the tip, a bolster thick enough to
 * see, and a riveted handle. `heat` (0–1) lights the edge from the tip back, because that is the
 * end that was over the coals — a knife that glowed evenly would look like a magic sword.
 */
export function kitchenKnife(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, ang: number,
  len: number,
  heat: number,
  alpha: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const h = len * 0.13;

  // Heat haze first, under the steel, so the blade sits inside its own glow.
  if (heat > 0.02) {
    g.fillStyle(tint(GLT.heat), alpha * 0.22 * heat);
    g.fillEllipse(x + ca * len * 0.18, y + sa * len * 0.18, len * 0.9, h * 4.2);
  }

  // ── Blade: straight spine, bellied edge, needle tip ──
  const blade = [
    P(len * 0.5, 0),              // tip
    P(len * 0.08, -h * 0.92),     // spine
    P(-len * 0.16, -h * 0.98),    // heel, spine side
    P(-len * 0.16, h * 0.62),     // heel, edge side
    P(len * 0.02, h * 0.86),      // belly
    P(len * 0.28, h * 0.5),
  ];
  g.fillStyle(tint(GLT.steelDark), alpha * 0.9);
  g.fillPoints(blade.map((p) => new Phaser.Geom.Point(p.x + sa * 1.4, p.y - ca * 1.4)), true);
  g.fillStyle(tint(GLT.steel), alpha * 0.96);
  g.fillPoints(blade, true);

  // The mirror line down the spine — the one highlight that makes flat grey read as steel.
  g.lineStyle(1.4, tint(0xffffff), alpha * 0.5);
  g.lineBetween(P(len * 0.42, -h * 0.1).x, P(len * 0.42, -h * 0.1).y,
    P(-len * 0.12, -h * 0.62).x, P(-len * 0.12, -h * 0.62).y);

  // The edge. Cold it is a hairline; hot it burns back from the tip.
  const edgeA = P(len * 0.5, 0);
  const edgeB = P(-len * 0.16, h * 0.62);
  g.lineStyle(1.6, tint(GLT.steel), alpha * 0.9);
  g.lineBetween(edgeA.x, edgeA.y, edgeB.x, edgeB.y);
  if (heat > 0.02) {
    const back = 0.25 + 0.75 * heat;
    const hotB = P(len * 0.5 - (len * 0.66) * back, h * 0.62 * back);
    g.lineStyle(3.4, tint(GLT.heat), alpha * 0.55 * heat);
    g.lineBetween(edgeA.x, edgeA.y, hotB.x, hotB.y);
    g.lineStyle(1.7, tint(heat > 0.85 ? GLT.emberHot : GLT.ember), alpha * heat);
    g.lineBetween(edgeA.x, edgeA.y, hotB.x, hotB.y);
  }

  // ── Bolster ──
  const bolster = [P(-len * 0.16, -h), P(-len * 0.24, -h * 0.95),
    P(-len * 0.24, h * 0.72), P(-len * 0.16, h * 0.66)];
  g.fillStyle(tint(GLT.steelMid), alpha);
  g.fillPoints(bolster, true);

  // ── Handle: tapered, with three rivets ──
  const grip = [P(-len * 0.24, -h * 0.9), P(-len * 0.52, -h * 0.72),
    P(-len * 0.54, h * 0.5), P(-len * 0.24, h * 0.68)];
  g.fillStyle(tint(GLT.char), alpha);
  g.fillPoints(grip, true);
  g.fillStyle(tint(GLT.band), alpha * 0.9);
  g.fillPoints(grip.map((p) => new Phaser.Geom.Point(p.x - sa * 1.1, p.y + ca * 1.1)), true);
  g.fillStyle(tint(GLT.steelMid), alpha * 0.95);
  for (let i = 0; i < 3; i++) {
    const r = P(-len * (0.3 + i * 0.09), -h * 0.06);
    g.fillCircle(r.x, r.y, Math.max(0.9, len * 0.022));
  }
}

/**
 * The cleaver a Click upgrade turns the knife into.
 *
 * Deliberately the opposite shape to `kitchenKnife`: where that is a needle with a bellied
 * edge, this is a rectangle — a deep rectangular blade with a spine you could stand on, a
 * lightening hole punched near the heel, and a stubby handle that reads as an afterthought.
 * The silhouette has to say "this goes *through* people" from across the arena, because that
 * is exactly what it now does. `ichor` (0–1) hangs a dark film off the edge with drips.
 */
export function chefCleaver(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, ang: number,
  len: number,
  heat: number,
  alpha: number,
  ichor = 0,
  t = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const h = len * 0.3;

  if (heat > 0.02) {
    g.fillStyle(tint(GLT.heat), alpha * 0.24 * heat);
    g.fillEllipse(x + ca * len * 0.14, y + sa * len * 0.14, len * 0.86, h * 2.4);
  }

  // ── Blade: a slab. Square tip, square heel, dead-flat spine. ──
  const blade = [
    P(len * 0.46, -h * 0.86),
    P(len * 0.5, -h * 0.6),
    P(len * 0.5, h * 0.72),
    P(len * 0.42, h * 0.92),
    P(-len * 0.14, h * 0.86),
    P(-len * 0.14, -h * 0.9),
  ];
  g.fillStyle(tint(GLT.steelDark), alpha * 0.9);
  g.fillPoints(blade.map((p) => new Phaser.Geom.Point(p.x + sa * 1.8, p.y - ca * 1.8)), true);
  g.fillStyle(tint(GLT.steel), alpha * 0.96);
  g.fillPoints(blade, true);
  // The forge line across the middle, and the lightening hole above the heel.
  g.lineStyle(1.5, tint(0xffffff), alpha * 0.45);
  g.lineBetween(P(len * 0.44, -h * 0.5).x, P(len * 0.44, -h * 0.5).y,
    P(-len * 0.1, -h * 0.56).x, P(-len * 0.1, -h * 0.56).y);
  g.fillStyle(tint(GLT.steelDark), alpha * 0.9);
  const hole = P(-len * 0.02, -h * 0.42);
  g.fillCircle(hole.x, hole.y, len * 0.05);
  g.lineStyle(1, tint(GLT.char), alpha * 0.7);
  g.strokeCircle(hole.x, hole.y, len * 0.05);

  // The edge, along the whole bottom. Hot, it burns the full length rather than the tip.
  const edgeA = P(len * 0.5, h * 0.72);
  const edgeB = P(-len * 0.14, h * 0.86);
  g.lineStyle(2, tint(GLT.steel), alpha * 0.92);
  g.lineBetween(edgeA.x, edgeA.y, edgeB.x, edgeB.y);
  if (heat > 0.02) {
    g.lineStyle(4.2, tint(GLT.heat), alpha * 0.5 * heat);
    g.lineBetween(edgeA.x, edgeA.y, edgeB.x, edgeB.y);
    g.lineStyle(2, tint(heat > 0.85 ? GLT.emberHot : GLT.ember), alpha * heat);
    g.lineBetween(edgeA.x, edgeA.y, edgeB.x, edgeB.y);
  }
  if (ichor > 0.02) {
    // A skin of it over the steel, thickest along the edge, with two drips falling off.
    g.fillStyle(tint(GLT.ichor), alpha * 0.6 * ichor);
    g.fillPoints(blade, true);
    g.lineStyle(4, tint(GLT.ichorLit), alpha * 0.9 * ichor);
    g.lineBetween(edgeA.x, edgeA.y, edgeB.x, edgeB.y);
    for (let i = 0; i < 2; i++) {
      const ph = ((t * 1.1 + i * 0.5) % 1);
      const u = len * (0.32 - i * 0.3);
      const d = P(u, h * 0.8);
      g.fillStyle(tint(GLT.ichorLit), alpha * ichor * (1 - ph));
      g.fillCircle(d.x, d.y + ph * len * 0.3, len * 0.035 * (1 - ph * 0.4));
    }
  }

  // ── Bolster and handle ──
  const bolster = [P(-len * 0.14, -h * 0.92), P(-len * 0.22, -h * 0.8),
    P(-len * 0.22, h * 0.72), P(-len * 0.14, h * 0.88)];
  g.fillStyle(tint(GLT.steelMid), alpha);
  g.fillPoints(bolster, true);
  const grip = [P(-len * 0.22, -h * 0.62), P(-len * 0.52, -h * 0.48),
    P(-len * 0.54, h * 0.4), P(-len * 0.22, h * 0.56)];
  g.fillStyle(tint(GLT.char), alpha);
  g.fillPoints(grip, true);
  g.fillStyle(tint(GLT.band), alpha * 0.9);
  g.fillPoints(grip.map((p) => new Phaser.Geom.Point(p.x - sa * 1.2, p.y + ca * 1.2)), true);
  g.fillStyle(tint(GLT.steelMid), alpha * 0.95);
  for (let i = 0; i < 2; i++) {
    const r = P(-len * (0.3 + i * 0.11), 0);
    g.fillCircle(r.x, r.y, Math.max(1, len * 0.026));
  }
}

/**
 * A briquette of charcoal. Deliberately a square — it is the one thing Gluttony throws that is
 * not organic, and the silhouette has to say "lump of fuel" mid-flight — with the cracks between
 * its faces lit from inside. `blue` is Pit Master's: the same lump burning far hotter, so the
 * cracks go cyan-white instead of orange.
 */
export function charcoalLump(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, ang: number,
  size: number,
  glow: number,
  alpha: number,
  seed = 3,
  blue = false,
): void {
  const hotA = blue ? GLT.blueCoal : GLT.heat;
  const hotB = blue ? GLT.blueHot : GLT.ember;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const s = size * 0.5;

  if (glow > 0.02) {
    g.fillStyle(tint(hotA), alpha * 0.2 * glow);
    g.fillCircle(x, y, size * (0.95 + 0.12 * Math.sin(seed + glow * 9)));
  }

  // A knocked-about cube: four corners, each pushed in or out by its own noise.
  const corners: Array<[number, number]> = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const pts = corners.map(([u, v], i) => {
    const k = 0.78 + jitter(seed, i) * 0.42;
    return P(u * s * k, v * s * k);
  });
  g.fillStyle(tint(GLT.coal), alpha);
  g.fillPoints(pts, true);
  // Top face, so it reads as a solid rather than a black square.
  g.fillStyle(tint(0x2c2830), alpha * 0.95);
  g.fillPoints([pts[0], pts[1], P(s * 0.2, -s * 0.1), P(-s * 0.35, -s * 0.05)], true);

  // Cracks — lit only when the lump is live.
  g.lineStyle(Math.max(1, size * 0.09), tint(glow > 0.5 ? hotB : hotA), alpha * (0.25 + glow * 0.7));
  for (let i = 0; i < 3; i++) {
    const a = P(-s * 0.7 + i * s * 0.55, -s * (0.5 - jitter(seed, 10 + i) * 0.9));
    const b = P(-s * 0.3 + i * s * 0.5, s * (0.3 + jitter(seed, 20 + i) * 0.7));
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
  g.lineStyle(1.1, tint(GLT.char), alpha * 0.9);
  g.strokePoints(pts, true, true);
}

/** Grill stripes — the one mark that says "this was cooked" whatever it is drawn on. */
function sear(
  g: Phaser.GameObjects.Graphics, tint: GluttonyColorFn,
  x: number, y: number, w: number, h: number, ang: number, alpha: number, count = 3,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  g.lineStyle(Math.max(1.1, h * 0.13), tint(GLT.char), alpha * 0.6);
  for (let i = 0; i < count; i++) {
    const v = (i - (count - 1) / 2) * h * 0.42;
    const a = pt(x, y, ca, sa, -w * 0.4, v);
    const b = pt(x, y, ca, sa, w * 0.4, v);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
}

/**
 * One ingredient, drawn at `size` (roughly its long axis in pixels).
 *
 * Every kind is a genuinely different construction rather than a recoloured blob, because the
 * player is asked to read four of them at once out of a HUD strip 30 pixels tall. `cooked`
 * changes the build too: mushrooms shrink and curl, carrots glaze and lose their fronds, potatoes
 * split to show the flesh, and meat sears and darkens around a bone that never changes colour.
 */
export function foodShape(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number,
  kind: FoodKind,
  cooked: boolean,
  size: number,
  alpha: number,
  wob = 0,
): void {
  const body = foodColor(kind, cooked);
  const tilt = Math.sin(wob) * 0.12;

  switch (kind) {
    case 'mushroom': {
      const s = size * (cooked ? 0.86 : 1);
      const capW = s * 0.92;
      const capH = s * 0.5;
      // Stalk first, so the cap sits on it.
      g.fillStyle(tint(cooked ? 0x9a7550 : 0xe6dcc4), alpha);
      g.fillEllipse(x + tilt * 3, y + s * 0.24, s * 0.3, s * 0.52);
      // Cap: a dome with a rolled rim, flattened and wavy once it has been over the fire.
      g.fillStyle(tint(cooked ? body : GLT.mushroomCap), alpha);
      g.fillEllipse(x, y - s * 0.06, capW, capH * (cooked ? 0.78 : 1));
      g.fillStyle(tint(cooked ? 0x5d3720 : GLT.mushroom), alpha * 0.85);
      g.fillEllipse(x - s * 0.1, y - s * 0.14, capW * 0.62, capH * 0.5);
      // Gills under the rim.
      g.lineStyle(1, tint(cooked ? GLT.char : 0xcbb6a0), alpha * 0.6);
      for (let i = -2; i <= 2; i++) {
        g.lineBetween(x + i * s * 0.16, y + s * 0.08, x + i * s * 0.2, y + s * 0.02);
      }
      if (cooked) sear(g, tint, x, y - s * 0.06, capW, capH, 0.3, alpha, 2);
      else {
        // Spots — raw only, and the fastest read on "mushroom" there is.
        g.fillStyle(tint(0xf2e8d6), alpha * 0.8);
        g.fillCircle(x - s * 0.2, y - s * 0.14, s * 0.07);
        g.fillCircle(x + s * 0.14, y - s * 0.2, s * 0.055);
        g.fillCircle(x + s * 0.26, y - s * 0.02, s * 0.045);
      }
      break;
    }

    case 'carrot': {
      const s = size;
      const ang = -1.15 + tilt;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
      // A cone with a rounded shoulder, tip down.
      const root = [P(-s * 0.42, -s * 0.2), P(-s * 0.5, 0), P(-s * 0.42, s * 0.2),
        P(s * 0.02, s * 0.1), P(s * 0.5, 0), P(s * 0.02, -s * 0.1)];
      g.fillStyle(tint(cooked ? 0x8a3a12 : 0xb85a1c), alpha * 0.9);
      g.fillPoints(root.map((p) => new Phaser.Geom.Point(p.x + 1.2, p.y + 1.4)), true);
      g.fillStyle(tint(body), alpha);
      g.fillPoints(root, true);
      // Ridges across the root — a plain orange triangle is a traffic cone.
      g.lineStyle(1, tint(cooked ? GLT.char : 0x9c4614), alpha * 0.55);
      for (let i = 0; i < 4; i++) {
        const u = -s * 0.34 + i * s * 0.2;
        const spread = s * 0.19 * (1 - i * 0.2);
        g.lineBetween(P(u, -spread).x, P(u, -spread).y, P(u + s * 0.03, spread).x, P(u + s * 0.03, spread).y);
      }
      if (cooked) {
        g.fillStyle(tint(GLT.emberHot), alpha * 0.22);
        g.fillEllipse(P(-s * 0.2, -s * 0.06).x, P(-s * 0.2, -s * 0.06).y, s * 0.3, s * 0.14);
        sear(g, tint, x, y, s * 0.7, s * 0.34, ang, alpha, 2);
      } else {
        // Fronds, only while raw — cooking wilts them off.
        g.lineStyle(1.5, tint(GLT.frond), alpha * 0.95);
        for (let i = -1; i <= 1; i++) {
          const a = P(-s * 0.46, 0);
          const b = P(-s * 0.46 - s * 0.3, i * s * 0.26 + Math.sin(wob + i) * 1.5);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      break;
    }

    case 'potato': {
      const s = size;
      // A lumpy body: an ellipse walked round with per-vertex noise.
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const r = s * (0.42 + jitter(7, i) * 0.13);
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 0.82));
      }
      g.fillStyle(tint(cooked ? 0x5f4320 : 0x8a6a3d), alpha * 0.9);
      g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 1.2, p.y + 1.6)), true);
      g.fillStyle(tint(body), alpha);
      g.fillPoints(pts, true);
      if (cooked) {
        // Split skin with the fluffy inside showing — the whole read on a baked potato.
        g.fillStyle(tint(GLT.potatoFlesh), alpha * 0.95);
        g.fillEllipse(x, y - s * 0.02, s * 0.62, s * 0.2);
        g.fillStyle(tint(0xd9c48c), alpha * 0.7);
        g.fillEllipse(x + s * 0.06, y + s * 0.03, s * 0.4, s * 0.1);
        g.lineStyle(1.2, tint(GLT.char), alpha * 0.7);
        g.strokeEllipse(x, y - s * 0.02, s * 0.62, s * 0.2);
        sear(g, tint, x, y + s * 0.2, s * 0.7, s * 0.24, 0.1, alpha, 2);
      } else {
        // Eyes.
        g.fillStyle(tint(0x6e5228), alpha * 0.85);
        g.fillCircle(x - s * 0.2, y - s * 0.1, s * 0.05);
        g.fillCircle(x + s * 0.16, y + s * 0.06, s * 0.045);
        g.fillCircle(x + s * 0.02, y - s * 0.2, s * 0.04);
      }
      break;
    }

    case 'meat': {
      const s = size;
      const ang = 0.22 + tilt;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
      // A bone-in chop: muscle mass on one end, bone sticking out of the other.
      const chop = [P(-s * 0.18, -s * 0.34), P(s * 0.24, -s * 0.3), P(s * 0.42, -s * 0.02),
        P(s * 0.24, s * 0.32), P(-s * 0.18, s * 0.34), P(-s * 0.34, 0)];
      g.fillStyle(tint(cooked ? 0x4e2313 : GLT.bloodDark), alpha * 0.9);
      g.fillPoints(chop.map((p) => new Phaser.Geom.Point(p.x + 1.2, p.y + 1.6)), true);
      g.fillStyle(tint(body), alpha);
      g.fillPoints(chop, true);
      // Marbling — bright while raw, gone dark once seared.
      g.lineStyle(1.2, tint(cooked ? 0xb98a5c : 0xf0aab0), alpha * 0.6);
      for (let i = -1; i <= 1; i++) {
        g.lineBetween(P(-s * 0.16, i * s * 0.14).x, P(-s * 0.16, i * s * 0.14).y,
          P(s * 0.3, i * s * 0.17).x, P(s * 0.3, i * s * 0.17).y);
      }
      // The bone. Never changes colour, so it is the anchor between raw and cooked.
      g.fillStyle(tint(GLT.bone), alpha);
      const b0 = P(-s * 0.3, 0);
      const b1 = P(-s * 0.62, -s * 0.04);
      g.lineStyle(Math.max(2, s * 0.13), tint(GLT.bone), alpha);
      g.lineBetween(b0.x, b0.y, b1.x, b1.y);
      g.fillCircle(b1.x, b1.y, s * 0.11);
      g.fillCircle(b1.x - sa * s * 0.08, b1.y + ca * s * 0.08, s * 0.08);
      if (cooked) sear(g, tint, P(s * 0.08, 0).x, P(s * 0.08, 0).y, s * 0.62, s * 0.6, ang + 0.5, alpha, 3);
      break;
    }

    case 'berries': {
      // Four beads on a common stem, each one wearing the bristles it is named for. Cooking
      // bursts them: the bristles singe off and the skins go glossy and near-black.
      const s = size;
      const beads: Array<[number, number, number]> = [
        [-0.22, -0.14, 0.26], [0.18, -0.2, 0.22], [0.02, 0.14, 0.28], [0.3, 0.12, 0.19],
      ];
      g.lineStyle(Math.max(1.2, s * 0.06), tint(cooked ? 0x4a3a1e : GLT.frond), alpha * 0.9);
      g.lineBetween(x - s * 0.34, y + s * 0.3, x + s * 0.1, y - s * 0.02);
      g.lineBetween(x + s * 0.1, y - s * 0.02, x + s * 0.26, y - s * 0.18);
      for (let i = 0; i < beads.length; i++) {
        const [ox, oy, br] = beads[i];
        const bx = x + ox * s + Math.sin(wob + i) * 0.6;
        const by = y + oy * s;
        const r = br * s;
        if (!cooked) {
          // Bristles first, so the bead sits on top of its own halo of spines.
          g.lineStyle(1, tint(0xd8a8f0), alpha * 0.85);
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * TAU + i * 0.6 + wob * 0.2;
            g.lineBetween(bx + Math.cos(a) * r * 0.8, by + Math.sin(a) * r * 0.8,
              bx + Math.cos(a) * r * 1.6, by + Math.sin(a) * r * 1.6);
          }
        }
        g.fillStyle(tint(cooked ? 0x2c0c3d : GLT.berryDark), alpha * 0.95);
        g.fillCircle(bx + 0.8, by + 1, r);
        g.fillStyle(tint(body), alpha);
        g.fillCircle(bx, by, r * (cooked ? 0.92 : 1));
        g.fillStyle(tint(cooked ? 0xd88ff0 : 0xf0d4ff), alpha * (cooked ? 0.8 : 0.55));
        g.fillCircle(bx - r * 0.34, by - r * 0.36, r * 0.3);
        // The calyx star on the crown — what makes a purple circle read as a berry.
        g.lineStyle(0.9, tint(cooked ? 0x1a0725 : 0x5f2a7a), alpha * 0.7);
        for (let k = 0; k < 3; k++) {
          const a = k * 2.09 + i;
          g.lineBetween(bx, by, bx + Math.cos(a) * r * 0.55, by + Math.sin(a) * r * 0.55);
        }
      }
      if (cooked) sear(g, tint, x, y, s * 0.7, s * 0.5, 0.25, alpha, 2);
      break;
    }

    case 'mint': {
      // Two lance leaves off a shared stem. Raw they carry a frost rim and stand up; cooked
      // they curl in on themselves and brown, because the nerf has to be visible in the tile.
      const s = size;
      const droop = cooked ? 0.55 : 0;
      g.lineStyle(Math.max(1.2, s * 0.055), tint(cooked ? 0x5a5030 : 0x3f7a35), alpha);
      g.lineBetween(x, y + s * 0.42, x, y - s * 0.06);
      for (const side of [-1, 1]) {
        const a = side * (0.72 + droop * 0.5) - Math.PI / 2 + Math.sin(wob + side) * 0.05;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const P = (u: number, v: number) => pt(x, y + s * 0.04, ca, sa, u, v);
        const leaf = [
          P(0, 0), P(s * 0.16, -s * 0.15 * (1 - droop * 0.5)), P(s * 0.4, -s * 0.08),
          P(s * 0.5, 0), P(s * 0.4, s * 0.08), P(s * 0.16, s * 0.15 * (1 - droop * 0.5)),
        ];
        g.fillStyle(tint(cooked ? 0x3f4426 : 0x3f8c62), alpha * 0.9);
        g.fillPoints(leaf.map((p) => new Phaser.Geom.Point(p.x + 1, p.y + 1.4)), true);
        g.fillStyle(tint(body), alpha);
        g.fillPoints(leaf, true);
        // Midrib and side veins.
        g.lineStyle(0.9, tint(cooked ? 0x2c3018 : 0xcdf2e0), alpha * 0.7);
        g.lineBetween(P(0, 0).x, P(0, 0).y, P(s * 0.48, 0).x, P(s * 0.48, 0).y);
        for (let k = 1; k <= 3; k++) {
          const u = s * 0.1 * k;
          g.lineBetween(P(u, 0).x, P(u, 0).y, P(u + s * 0.08, -s * 0.1).x, P(u + s * 0.08, -s * 0.1).y);
          g.lineBetween(P(u, 0).x, P(u, 0).y, P(u + s * 0.08, s * 0.1).x, P(u + s * 0.08, s * 0.1).y);
        }
        if (!cooked) {
          // Frost along the serrated edge. This is the whole reason it is a *winter* mint.
          g.lineStyle(1.4, tint(GLT.mintFrost), alpha * 0.85);
          g.strokePoints(leaf, true, true);
          for (let k = 0; k < 4; k++) {
            const u = s * (0.12 + k * 0.1);
            const p = P(u, -s * 0.14);
            g.fillStyle(tint(GLT.mintFrost), alpha * 0.9);
            g.fillCircle(p.x, p.y, s * 0.035);
          }
        }
      }
      if (cooked) sear(g, tint, x, y + s * 0.02, s * 0.6, s * 0.3, 0.1, alpha, 2);
      break;
    }

    case 'pineapple': {
      // A barrel of diamond scales under a crown of blades. Cooked it loses the crown and
      // becomes a ring: the two silhouettes are unmistakable at HUD size.
      const s = size;
      if (cooked) {
        g.fillStyle(tint(0x6d4a10), alpha * 0.9);
        g.fillEllipse(x + 1, y + 1.6, s * 0.92, s * 0.62);
        g.fillStyle(tint(body), alpha);
        g.fillEllipse(x, y, s * 0.92, s * 0.6);
        g.fillStyle(tint(0xf5dc86), alpha * 0.85);
        g.fillEllipse(x, y - s * 0.02, s * 0.66, s * 0.4);
        // The hole in the middle of the ring.
        g.fillStyle(tint(0x2a1f0a), alpha * 0.85);
        g.fillEllipse(x, y, s * 0.2, s * 0.13);
        g.lineStyle(1, tint(0x8a6110), alpha * 0.7);
        g.strokeEllipse(x, y, s * 0.66, s * 0.4);
        sear(g, tint, x, y, s * 0.8, s * 0.5, 0.05, alpha, 3);
      } else {
        const crown = s * 0.34;
        // Crown blades, drawn first so the body's rim overlaps their bases.
        for (let i = -2; i <= 2; i++) {
          const lean = i * 0.28 + Math.sin(wob + i) * 0.05;
          g.fillStyle(tint(i % 2 ? 0x3f7a2c : GLT.frond), alpha * 0.95);
          g.fillTriangle(x + i * s * 0.06 - s * 0.05, y - s * 0.24,
            x + i * s * 0.06 + s * 0.05, y - s * 0.24,
            x + i * s * 0.06 + lean * crown, y - s * 0.24 - crown);
        }
        g.fillStyle(tint(GLT.pineappleSkin), alpha * 0.95);
        g.fillEllipse(x + 1, y + s * 0.12, s * 0.66, s * 0.86);
        g.fillStyle(tint(body), alpha);
        g.fillEllipse(x, y + s * 0.1, s * 0.6, s * 0.8);
        // Diamond lattice — a plain yellow oval is an egg.
        g.lineStyle(1, tint(GLT.pineappleSkin), alpha * 0.8);
        for (let i = -2; i <= 2; i++) {
          g.lineBetween(x - s * 0.3, y + s * (0.1 + i * 0.14) - s * 0.16,
            x + s * 0.3, y + s * (0.1 + i * 0.14) + s * 0.16);
          g.lineBetween(x - s * 0.3, y + s * (0.1 + i * 0.14) + s * 0.16,
            x + s * 0.3, y + s * (0.1 + i * 0.14) - s * 0.16);
        }
        g.fillStyle(tint(0xfaeaa2), alpha * 0.45);
        g.fillEllipse(x - s * 0.14, y - s * 0.06, s * 0.16, s * 0.34);
      }
      break;
    }

    case 'deathcap': {
      // Pale cap, hanging skirt, bulbous cup at the base — the three field marks of the real
      // thing, plus a green breath off it while raw so nobody eats one by accident.
      const s = size * (cooked ? 0.86 : 1);
      if (!cooked) {
        g.fillStyle(tint(GLT.venom), alpha * (0.1 + 0.06 * Math.sin(wob * 2)));
        g.fillCircle(x, y, s * 0.62);
      }
      // Volva: the cup the stalk grows out of.
      g.fillStyle(tint(cooked ? 0x6b5330 : 0xe7e4d2), alpha * 0.9);
      g.fillEllipse(x, y + s * 0.4, s * 0.36, s * 0.22);
      // Stalk.
      g.fillStyle(tint(cooked ? 0x8f7448 : 0xf1efdf), alpha);
      g.fillEllipse(x, y + s * 0.2, s * 0.2, s * 0.5);
      // Skirt, burnt off once cooked.
      if (!cooked) {
        g.fillStyle(tint(0xe7e4d2), alpha * 0.95);
        g.fillEllipse(x, y + s * 0.06, s * 0.44, s * 0.12);
      }
      // Cap: a smooth dome, greenish while raw and shrunken brown once cooked.
      g.fillStyle(tint(cooked ? 0x5c4526 : GLT.deathcapGill), alpha * 0.9);
      g.fillEllipse(x, y - s * 0.1, s * 0.9, s * 0.5);
      g.fillStyle(tint(body), alpha);
      g.fillEllipse(x, y - s * 0.14, s * 0.86, s * 0.44);
      g.fillStyle(tint(cooked ? 0xb59258 : 0xeff2e0), alpha * 0.6);
      g.fillEllipse(x - s * 0.14, y - s * 0.2, s * 0.4, s * 0.18);
      if (cooked) {
        sear(g, tint, x, y - s * 0.12, s * 0.66, s * 0.4, 0.2, alpha, 2);
      } else {
        // The skull the cap wears, small enough to be a texture and clear enough to be a warning.
        g.fillStyle(tint(GLT.char), alpha * 0.8);
        g.fillCircle(x - s * 0.08, y - s * 0.2, s * 0.055);
        g.fillCircle(x + s * 0.08, y - s * 0.2, s * 0.055);
        g.fillRect(x - s * 0.05, y - s * 0.13, s * 0.1, s * 0.05);
        // Spore drift.
        for (let i = 0; i < 3; i++) {
          const a = wob * 1.4 + i * 2.1;
          g.fillStyle(tint(GLT.venom), alpha * 0.5);
          g.fillCircle(x + Math.cos(a) * s * 0.5, y - s * 0.3 - ((wob * 8 + i * 5) % 10),
            s * 0.045);
        }
      }
      break;
    }

    case 'leftovers': {
      // A folded parcel tied with string. Rested (cooked) it is warm, open at one corner and
      // steaming; fresh out of the pot it is cold, shut and tied tight.
      const s = size;
      const box = [
        new Phaser.Geom.Point(x - s * 0.34, y - s * 0.18),
        new Phaser.Geom.Point(x + s * 0.34, y - s * 0.18),
        new Phaser.Geom.Point(x + s * 0.28, y + s * 0.34),
        new Phaser.Geom.Point(x - s * 0.28, y + s * 0.34),
      ];
      g.fillStyle(tint(cooked ? 0x6d5218 : 0x8f7f5c), alpha * 0.9);
      g.fillPoints(box.map((p) => new Phaser.Geom.Point(p.x + 1.2, p.y + 1.6)), true);
      g.fillStyle(tint(body), alpha);
      g.fillPoints(box, true);
      // Folded lid: two flaps meeting at a crease, one of them peeled back once rested.
      const peel = cooked ? s * 0.14 : 0;
      g.fillStyle(tint(cooked ? 0xdcb460 : 0xe3d6b4), alpha * 0.95);
      g.fillTriangle(x - s * 0.34, y - s * 0.18, x, y - s * 0.34, x, y - s * 0.14);
      g.fillTriangle(x + s * 0.34, y - s * 0.18, x, y - s * 0.34 - peel, x, y - s * 0.14);
      g.lineStyle(1, tint(cooked ? 0x6d5218 : 0x8f7f5c), alpha * 0.8);
      g.lineBetween(x, y - s * 0.32, x, y + s * 0.34);
      // String, and the knot on it.
      g.lineStyle(1.3, tint(GLT.band), alpha * 0.9);
      g.lineBetween(x - s * 0.32, y + s * 0.08, x + s * 0.31, y + s * 0.08);
      g.fillStyle(tint(GLT.band), alpha * 0.9);
      g.fillCircle(x + s * 0.04, y + s * 0.08, s * 0.05);
      if (cooked) {
        for (let i = 0; i < 3; i++) {
          const ph = (wob * 0.3 + i * 0.33) % 1;
          g.fillStyle(tint(0xe6dcc0), alpha * 0.25 * (1 - ph));
          g.fillCircle(x + Math.sin(wob + i * 2) * s * 0.2, y - s * 0.4 - ph * s * 0.5,
            s * (0.07 + ph * 0.1));
        }
      }
      break;
    }
  }
}

/**
 * The film something grows after a spell on the maw. Drawn over `foodShape` rather than as a
 * fifth branch of it, because rot is a state any ingredient can be in and duplicating nine
 * drawings to add a green haze to each would be nine places to get it wrong.
 */
export function rotFilm(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, size: number, alpha: number, t: number,
): void {
  // Bloom: a wet green skin over the whole thing.
  g.fillStyle(tint(GLT.rot), alpha * 0.3);
  g.fillCircle(x, y, size * 0.5);
  g.fillStyle(tint(GLT.rotDark), alpha * 0.45);
  for (let i = 0; i < 5; i++) {
    const a = jitter(31, i) * TAU;
    const d = size * 0.3 * jitter(31, 10 + i);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, size * (0.05 + jitter(31, 20 + i) * 0.09));
  }
  // A drip off the underside — the read that says "this is going to hurt somebody".
  const drip = (t * 0.9) % 1;
  g.fillStyle(tint(GLT.rot), alpha * 0.8 * (1 - drip));
  g.fillCircle(x + size * 0.16, y + size * 0.3 + drip * size * 0.4, size * 0.06 * (1 - drip * 0.4));
  // Flies. Three of them, on their own orbits, and they are what sells it from across the arena.
  for (let i = 0; i < 3; i++) {
    const a = t * (3.4 + i) + i * 2.3;
    const r = size * (0.5 + 0.12 * Math.sin(t * 6 + i * 2));
    g.fillStyle(tint(GLT.char), alpha * 0.9);
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7 - size * 0.12, size * 0.055);
  }
}

/** Pit Master's second pass: a blue-black char edge with a bright rim inside it. */
export function searGlaze(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, size: number, alpha: number, t: number,
): void {
  g.lineStyle(Math.max(1.4, size * 0.07), tint(GLT.blueCoal), alpha * 0.55);
  g.strokeCircle(x, y, size * 0.5);
  g.lineStyle(Math.max(1, size * 0.04), tint(GLT.blueHot), alpha * (0.5 + 0.3 * Math.sin(t * 4)));
  g.strokeCircle(x, y, size * 0.42);
  for (let i = 0; i < 4; i++) {
    const a = t * 1.2 + (i / 4) * TAU;
    g.fillStyle(tint(GLT.blueHot), alpha * 0.75);
    g.fillCircle(x + Math.cos(a) * size * 0.46, y + Math.sin(a) * size * 0.46, size * 0.05);
  }
}

/**
 * One inventory item, wherever it is drawn. The single entry point every caller should use —
 * it puts the rot film and the over-sear glaze on top of the base drawing so no caller has to
 * remember that either state exists.
 */
export function itemShape(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number,
  item: FoodStamp,
  size: number,
  alpha: number,
  wob = 0,
): void {
  foodShape(g, tint, x, y, item.kind, item.cooked, size, alpha, wob);
  if (item.rotten) rotFilm(g, tint, x, y, size, alpha, wob);
  else if (item.overseared) searGlaze(g, tint, x, y, size, alpha, wob);
}

/**
 * The grill: a kettle on legs with a grate over it, glowing from underneath.
 *
 * Drawn on the floor layer, so it is deliberately squashed on the vertical — the arena is
 * top-down and a grill drawn in true elevation would read as a wall. `superheat` (0–1) does not
 * simply brighten it: the coals go from orange to white and the grate itself starts to glow,
 * which is the readable difference between "cooking" and "cooking twice as fast".
 */
export function grillRig(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number,
  r: number,
  t: number,
  superheat: number,
  alpha: number,
  blue = false,
): void {
  const HEAT = blue ? GLT.blueCoal : GLT.heat;
  const EMBER = blue ? GLT.blueCoal : GLT.ember;
  const EMBER_HOT = blue ? GLT.blueHot : GLT.emberHot;
  // Shadow and legs.
  g.fillStyle(tint(0x000000), alpha * 0.35);
  g.fillEllipse(x, y + r * 0.42, r * 2.1, r * 0.7);
  g.lineStyle(Math.max(2, r * 0.09), tint(GLT.iron), alpha);
  for (const a of [-2.3, -0.85, 0.6]) {
    g.lineBetween(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.34,
      x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 0.52 + r * 0.36);
  }

  // The bowl.
  g.fillStyle(tint(GLT.iron), alpha);
  g.fillEllipse(x, y + r * 0.1, r * 2, r * 1.16);
  g.fillStyle(tint(GLT.coal), alpha);
  g.fillEllipse(x, y, r * 1.78, r * 0.98);

  // Coals: a bed of lumps whose brightness breathes, hottest at the middle.
  for (let i = 0; i < 13; i++) {
    const a = jitter(11, i) * TAU;
    const d = Math.sqrt(jitter(11, 40 + i)) * r * 0.78;
    const cx = x + Math.cos(a) * d;
    const cy = y + Math.sin(a) * d * 0.55;
    const beat = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.6 + i * 0.7));
    const hot = beat * (0.55 + superheat * 0.45);
    g.fillStyle(tint(GLT.coal), alpha);
    g.fillCircle(cx, cy, r * 0.15);
    g.fillStyle(tint(superheat > 0.5 ? EMBER_HOT : HEAT), alpha * hot * 0.85);
    g.fillCircle(cx, cy, r * 0.115 * (0.7 + hot * 0.5));
    g.fillStyle(tint(EMBER_HOT), alpha * hot * hot * 0.7);
    g.fillCircle(cx - r * 0.02, cy - r * 0.02, r * 0.05);
  }

  // Grate: bars across, plus the rim they are welded to. The bars glow when superheated.
  const barColor = superheat > 0.35 ? HEAT : GLT.steelDark;
  g.lineStyle(Math.max(1.6, r * 0.07), tint(barColor), alpha * (0.75 + superheat * 0.25));
  for (let i = -3; i <= 3; i++) {
    const v = i * r * 0.24;
    const half = Math.sqrt(Math.max(0, 1 - (v / (r * 0.92)) ** 2)) * r * 0.94;
    if (half < 2) continue;
    g.lineBetween(x - half, y + v * 0.55, x + half, y + v * 0.55);
  }
  g.lineStyle(Math.max(2, r * 0.1), tint(GLT.steelDark), alpha);
  g.strokeEllipse(x, y, r * 1.9, r * 1.05);
  if (superheat > 0.02) {
    g.lineStyle(Math.max(1.4, r * 0.06), tint(EMBER), alpha * superheat * 0.8);
    g.strokeEllipse(x, y, r * 1.9, r * 1.05);
  }
}

/** Flame licks, shimmer and smoke, drawn over the fighters rather than under them. */
export function grillHeat(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number,
  r: number,
  t: number,
  superheat: number,
  alpha: number,
  blue = false,
): void {
  const FLAME = blue ? GLT.blueCoal : GLT.flame;
  const EMBER = blue ? 0x8fd4ff : GLT.ember;
  const EMBER_HOT = blue ? GLT.blueHot : GLT.emberHot;
  const licks = 5 + Math.round(superheat * 4);
  for (let i = 0; i < licks; i++) {
    const ph = t * (2.2 + jitter(19, i)) + i * 1.9;
    const sway = Math.sin(ph) * r * 0.2;
    const hgt = r * (0.5 + 0.4 * Math.abs(Math.sin(ph * 0.8))) * (1 + superheat * 0.7);
    const bx = x + (jitter(19, 30 + i) - 0.5) * r * 1.4;
    const by = y - r * 0.1;
    const tip = new Phaser.Geom.Point(bx + sway, by - hgt);
    g.fillStyle(tint(FLAME), alpha * 0.5);
    g.fillPoints([new Phaser.Geom.Point(bx - r * 0.13, by), tip,
      new Phaser.Geom.Point(bx + r * 0.13, by)], true);
    g.fillStyle(tint(superheat > 0.4 ? EMBER_HOT : EMBER), alpha * 0.65);
    g.fillPoints([new Phaser.Geom.Point(bx - r * 0.07, by), tip,
      new Phaser.Geom.Point(bx + r * 0.07, by)], true);
  }
  // Smoke: slow, wide, and only ever faint — the fire is the loud part.
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.5 + i * 0.33) % 1;
    g.fillStyle(tint(0x8b8478), alpha * 0.16 * (1 - ph));
    g.fillCircle(x + Math.sin(t * 1.1 + i * 2) * r * 0.5, y - r * (0.7 + ph * 2.2),
      r * (0.2 + ph * 0.5));
  }
}

/**
 * The maw the grill becomes: a hole in the floor with a lip, a ring of teeth and a tongue.
 *
 * Built as concentric rings rather than a drawn mouth because it has to work from every angle —
 * it sits in the middle of a top-down arena and there is no "front" of a hole. `gape` opens the
 * tooth ring, `rage` (0–1) reddens the gullet and lengthens the teeth.
 */
export function mawBody(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number,
  r: number,
  t: number,
  gape: number,
  rage: number,
  alpha: number,
  dread = 0,
): void {
  const breathe = 1 + Math.sin(t * 2.4) * 0.05;

  // ── Dread (Resourceful, Q+): what an awakened maw becomes when it is fed properly ──
  // A halo of bone spurs pushed up out of the floor around the lip, and a ring of eyes
  // between them. Drawn under the lip so the mouth still reads first.
  if (dread > 0.02) {
    const pulse = 0.7 + 0.3 * Math.sin(t * 3.1);
    g.fillStyle(tint(GLT.blood), alpha * 0.16 * dread * pulse);
    g.fillEllipse(x, y, r * 4.2, r * 2.6);
    const spurs = 12;
    for (let i = 0; i < spurs; i++) {
      const a = (i / spurs) * TAU + t * 0.12;
      const base = r * 1.5;
      const tipR = base + r * (0.5 + 0.3 * jitter(13, i)) * dread;
      const bx = x + Math.cos(a) * base;
      const by = y + Math.sin(a) * base * 0.62;
      const txp = x + Math.cos(a) * tipR;
      const typ = y + Math.sin(a) * tipR * 0.62 - r * 0.18 * dread;
      const nx = -Math.sin(a) * r * 0.11;
      const ny = Math.cos(a) * r * 0.07;
      g.fillStyle(tint(GLT.bone), alpha * 0.9 * dread);
      g.fillPoints([new Phaser.Geom.Point(bx + nx, by + ny),
        new Phaser.Geom.Point(bx - nx, by - ny), new Phaser.Geom.Point(txp, typ)], true);
      g.lineStyle(0.9, tint(GLT.bloodDark), alpha * 0.6 * dread);
      g.lineBetween(bx + nx, by + ny, txp, typ);
    }
    // The eyes. Odd count, unevenly spaced, all of them looking the same way at once.
    const look = Math.sin(t * 0.9) * 0.5;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.4 + Math.sin(i * 2.3) * 0.12;
      const d = r * (1.22 + 0.1 * jitter(17, i));
      const ex = x + Math.cos(a) * d;
      const ey = y + Math.sin(a) * d * 0.62;
      const er = r * 0.13 * dread;
      const lid = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.3 + i * 1.7));
      g.fillStyle(tint(GLT.bloodDark), alpha * dread);
      g.fillEllipse(ex, ey, er * 2.3, er * 2 * lid);
      g.fillStyle(tint(0xf6e2c8), alpha * dread * 0.95);
      g.fillEllipse(ex, ey, er * 1.9, er * 1.6 * lid);
      g.fillStyle(tint(0x1a0206), alpha * dread);
      g.fillCircle(ex + look * er * 0.7, ey, er * 0.7 * Math.max(0.2, lid));
      g.fillStyle(tint(0xff5a66), alpha * dread * 0.55);
      g.fillCircle(ex + look * er * 0.7, ey, er * 0.35 * Math.max(0.2, lid));
    }
  }

  // Lip: a fleshy annulus, walked with noise so it never reads as a circle.
  const lip: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 22; i++) {
    const a = (i / 22) * TAU;
    const rr = r * breathe * (1.18 + Math.sin(a * 3 + t * 1.7) * 0.07 + jitter(5, i) * 0.06);
    lip.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62));
  }
  g.fillStyle(tint(GLT.fleshDark), alpha * 0.95);
  g.fillPoints(lip, true);
  g.fillStyle(tint(GLT.flesh), alpha * 0.8);
  g.fillPoints(lip.map((p) => new Phaser.Geom.Point(
    x + (p.x - x) * 0.88, y + (p.y - y) * 0.88 - r * 0.05)), true);

  // The throat: darkest at the middle, with a wet sheen off to one side.
  g.fillStyle(tint(GLT.gut), alpha);
  g.fillEllipse(x, y, r * 1.5 * breathe, r * 0.9 * breathe);
  g.fillStyle(tint(0x0b0308), alpha);
  g.fillEllipse(x, y + r * 0.04, r * 1.1, r * 0.62);
  if (rage > 0.02) {
    g.fillStyle(tint(GLT.blood), alpha * 0.35 * rage);
    g.fillEllipse(x, y + r * 0.04, r * 1.1, r * 0.62);
  }

  // Tongue, rolling out of the dark.
  const roll = Math.sin(t * 1.9) * r * 0.22;
  g.fillStyle(tint(GLT.flesh), alpha * 0.85);
  g.fillEllipse(x + roll, y + r * 0.16, r * 0.62, r * 0.3);
  g.lineStyle(1.2, tint(GLT.fleshDark), alpha * 0.8);
  g.lineBetween(x + roll - r * 0.24, y + r * 0.16, x + roll + r * 0.24, y + r * 0.16);

  // Teeth: two staggered rings, pointing inward, longer the angrier it is.
  const count = 16;
  const open = 0.62 + gape * 0.42;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + Math.sin(t * 0.6) * 0.04;
    const base = r * (1.0 + 0.06 * (i % 2)) * open;
    const len = r * (0.3 + 0.16 * (i % 2)) * (1 + rage * 0.5 + dread * 0.6);
    const bx = x + Math.cos(a) * base;
    const by = y + Math.sin(a) * base * 0.62;
    const tx = x + Math.cos(a) * (base - len);
    const ty = y + Math.sin(a) * (base - len) * 0.62;
    const nx = -Math.sin(a) * r * 0.1;
    const ny = Math.cos(a) * r * 0.06;
    g.fillStyle(tint(GLT.tooth), alpha * 0.95);
    g.fillPoints([new Phaser.Geom.Point(bx + nx, by + ny),
      new Phaser.Geom.Point(bx - nx, by - ny), new Phaser.Geom.Point(tx, ty)], true);
    g.lineStyle(0.8, tint(GLT.fleshDark), alpha * 0.5);
    g.lineBetween(bx + nx, by + ny, tx, ty);
  }

  // The second jaw, deep in the throat and turning the other way. Only ever on a dread maw,
  // and the reason the awakened version reads as a different creature rather than a bigger one.
  if (dread > 0.02) {
    const inner = 9;
    for (let i = 0; i < inner; i++) {
      const a = (i / inner) * TAU - t * 0.9;
      const base = r * 0.62 * open;
      const len = r * 0.26 * dread;
      const bx = x + Math.cos(a) * base;
      const by = y + Math.sin(a) * base * 0.62;
      const txp = x + Math.cos(a) * (base - len);
      const typ = y + Math.sin(a) * (base - len) * 0.62;
      const nx = -Math.sin(a) * r * 0.06;
      const ny = Math.cos(a) * r * 0.04;
      g.fillStyle(tint(0xe8cfae), alpha * 0.9 * dread);
      g.fillPoints([new Phaser.Geom.Point(bx + nx, by + ny),
        new Phaser.Geom.Point(bx - nx, by - ny), new Phaser.Geom.Point(txp, typ)], true);
    }
    g.lineStyle(1.4, tint(GLT.blood), alpha * 0.7 * dread);
    g.strokeEllipse(x, y, r * 1.3 * open, r * 0.8 * open);
  }
}

/**
 * One tentacle off the maw. Tapered, swaying on its own phase, barbed down the outer edge —
 * the same construction Shadow's use, because a tentacle drawn as a curve with no thickness
 * gradient reads as a wire.
 */
export function mawTentacle(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number,
  ang: number, len: number,
  t: number, seed: number,
  thick: number,
  alpha: number,
  rage: number,
): void {
  const segs = 9;
  let px = x;
  let py = y;
  const pts: Array<{ x: number; y: number; w: number }> = [{ x, y, w: thick }];
  for (let i = 1; i <= segs; i++) {
    const s = i / segs;
    const curl = Math.sin(t * (2.1 + jitter(seed, 0) * 1.4) + s * 3.2 + seed) * (0.5 + rage * 0.5);
    const a = ang + curl * s * 0.9;
    const step = (len / segs) * (1 - s * 0.18);
    px += Math.cos(a) * step;
    py += Math.sin(a) * step * 0.72;
    pts.push({ x: px, y: py, w: thick * (1 - s * 0.82) });
  }

  // Ground shadow first, so the limb sits on the floor rather than floating over it.
  g.lineStyle(thick * 0.9, tint(0x000000), alpha * 0.22);
  for (let i = 1; i < pts.length; i++) {
    g.lineBetween(pts[i - 1].x, pts[i - 1].y + thick * 0.6, pts[i].x, pts[i].y + thick * 0.6);
  }
  for (let i = 1; i < pts.length; i++) {
    g.lineStyle(Math.max(1, pts[i].w * 2), tint(GLT.fleshDark), alpha * 0.95);
    g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }
  for (let i = 1; i < pts.length; i++) {
    g.lineStyle(Math.max(0.8, pts[i].w * 1.1), tint(GLT.flesh), alpha * 0.7);
    g.lineBetween(pts[i - 1].x, pts[i - 1].y - pts[i].w * 0.3, pts[i].x, pts[i].y - pts[i].w * 0.3);
  }
  // Barbs down the outer edge.
  g.fillStyle(tint(GLT.tooth), alpha * 0.9);
  for (let i = 2; i < pts.length; i += 2) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const w = pts[i].w * 1.6;
    g.fillTriangle(pts[i].x, pts[i].y,
      pts[i].x + nx * w - dx * 0.2, pts[i].y + ny * w - dy * 0.2,
      pts[i].x - dx * 0.4, pts[i].y - dy * 0.4);
  }
}

/** A wet gobbet of meat, spinning, with a string of sinew trailing behind it. */
export function gobbet(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, r: number, spin: number, alpha: number, hot: boolean,
): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + spin;
    const rr = r * (0.75 + jitter(2, i) * 0.5);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(tint(GLT.bloodDark), alpha * 0.9);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 1, p.y + 1.4)), true);
  g.fillStyle(tint(hot ? GLT.blood : GLT.meat), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(0xf0a8ae), alpha * 0.5);
  g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.3);
  // Sinew.
  g.lineStyle(1.2, tint(GLT.flesh), alpha * 0.7);
  g.lineBetween(x, y, x - Math.cos(spin) * r * 2.2, y - Math.sin(spin) * r * 1.6);
  if (hot) {
    g.lineStyle(1.4, tint(GLT.heat), alpha * 0.5);
    g.strokePoints(pts, true, true);
  }
}

/** The Poach skewer: a long rod with a ring pull, a needle point, and maybe a chunk on it. */
export function skewerShape(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, ang: number, len: number,
  meat: boolean,
  alpha: number,
  t = 0,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  const tail = P(-len * 0.5, 0);
  const tip = P(len * 0.5, 0);
  g.lineStyle(4.2, tint(GLT.steelDark), alpha * 0.8);
  g.lineBetween(tail.x, tail.y, tip.x, tip.y);
  g.lineStyle(2.4, tint(GLT.steel), alpha);
  g.lineBetween(tail.x, tail.y, tip.x, tip.y);
  g.lineStyle(1, tint(0xffffff), alpha * 0.55);
  g.lineBetween(P(-len * 0.4, -1.2).x, P(-len * 0.4, -1.2).y, P(len * 0.4, -1.2).x, P(len * 0.4, -1.2).y);

  // Needle point.
  g.fillStyle(tint(GLT.steel), alpha);
  g.fillPoints([tip, P(len * 0.4, -3.2), P(len * 0.4, 3.2)], true);
  // Ring pull at the back.
  g.lineStyle(2, tint(GLT.steelMid), alpha);
  g.strokeCircle(P(-len * 0.55, 0).x, P(-len * 0.55, 0).y, len * 0.055);

  if (meat) {
    const m = P(len * 0.22, 0);
    foodShape(g, tint, m.x, m.y, 'meat', false, len * 0.24, alpha, t * 3);
  }
}

/** The Feast pot: a cauldron of everything you own, swirling. */
export function stewPot(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, r: number, t: number, fill: number, alpha: number,
): void {
  g.fillStyle(tint(0x000000), alpha * 0.3);
  g.fillEllipse(x, y + r * 0.6, r * 1.9, r * 0.5);
  // Body + handles.
  g.lineStyle(Math.max(2, r * 0.11), tint(GLT.pot), alpha);
  g.strokeCircle(x - r * 1.02, y - r * 0.05, r * 0.24);
  g.strokeCircle(x + r * 1.02, y - r * 0.05, r * 0.24);
  g.fillStyle(tint(GLT.pot), alpha);
  g.fillEllipse(x, y + r * 0.12, r * 2, r * 1.25);
  g.fillStyle(tint(0x2a2932), alpha);
  g.fillEllipse(x, y, r * 1.86, r * 0.96);

  // Stew: a spiral of broth, wound tighter the fuller it is.
  const turns = 2.4;
  const steps = 46;
  g.lineStyle(Math.max(2, r * 0.16), tint(GLT.stew), alpha * (0.35 + fill * 0.65));
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const a = s * TAU * turns - t * 3.2;
    const rr = r * 0.8 * (1 - s * 0.86);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.52;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.lineStyle(Math.max(1, r * 0.07), tint(GLT.stewLit), alpha * (0.3 + fill * 0.6));
  g.strokeEllipse(x, y, r * 1.5, r * 0.76);

  // Bubbles and steam.
  for (let i = 0; i < 5; i++) {
    const ph = (t * 1.4 + i * 0.2) % 1;
    g.fillStyle(tint(GLT.stewLit), alpha * (1 - ph) * 0.8);
    g.fillCircle(x + Math.sin(i * 2.3 + t) * r * 0.6, y - ph * r * 0.4, r * 0.09 * (1 - ph * 0.5));
  }
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + i * 0.33) % 1;
    g.fillStyle(tint(0xdad2c0), alpha * 0.2 * (1 - ph));
    g.fillCircle(x + Math.sin(t * 1.4 + i * 2) * r * 0.5, y - r * (0.6 + ph * 1.9), r * (0.16 + ph * 0.4));
  }
}

/** A splash of blood, or of anything else that has just been thrown at a wall. */
export function spatter(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, size: number, color: number, seed: number, alpha: number,
): void {
  g.fillStyle(tint(color), alpha * 0.75);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const rr = size * (0.4 + jitter(seed, i) * 0.6);
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7));
  }
  g.fillPoints(pts, true);
  for (let i = 0; i < 7; i++) {
    const a = jitter(seed, 20 + i) * TAU;
    const d = size * (0.8 + jitter(seed, 40 + i) * 1.1);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7,
      size * (0.08 + jitter(seed, 60 + i) * 0.16));
  }
}

/**
 * The hunger bar. Not a rectangle: a notched steel trough with a ribbed meat fill, a running
 * gloss, and a bite already taken out of the right-hand end — the bar is the thing eating you.
 */
export function hungerBar(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, w: number, h: number,
  ratio: number, t: number, alpha: number,
): void {
  const cut = h * 0.42;
  const plate = [
    new Phaser.Geom.Point(x + cut, y), new Phaser.Geom.Point(x + w, y),
    new Phaser.Geom.Point(x + w, y + h - cut), new Phaser.Geom.Point(x + w - cut, y + h),
    new Phaser.Geom.Point(x, y + h), new Phaser.Geom.Point(x, y + cut),
  ];
  g.fillStyle(tint(0x0a0508), alpha * 0.92);
  g.fillPoints(plate, true);

  const fw = Math.max(0, (w - 4) * Phaser.Math.Clamp(ratio, 0, 1));
  if (fw > 1) {
    // Meat fill, ribbed like muscle rather than flat.
    g.fillStyle(tint(GLT.bloodDark), alpha);
    g.fillRect(x + 2, y + 2, fw, h - 4);
    g.fillStyle(tint(GLT.blood), alpha);
    g.fillRect(x + 2, y + 2, fw, (h - 4) * 0.62);
    g.fillStyle(tint(GLT.flesh), alpha * 0.55);
    g.fillRect(x + 2, y + 2, fw, (h - 4) * 0.24);
    g.lineStyle(1, tint(GLT.bloodDark), alpha * 0.55);
    for (let vx = x + 6; vx < x + 2 + fw; vx += 7) g.lineBetween(vx, y + 3, vx - 2, y + h - 3);
    // A gloss travelling along it — the bar is alive, and it is draining.
    const gx = x + 2 + ((t * 90) % Math.max(1, fw));
    g.fillStyle(tint(0xffd8dc), alpha * 0.22);
    g.fillRect(gx, y + 2, Math.min(14, fw), h - 4);
  }

  // The bite out of the end, and the teeth that took it.
  g.fillStyle(tint(0x0a0508), alpha * 0.95);
  g.fillCircle(x + w - 2, y + h * 0.5, h * 0.46);
  g.fillStyle(tint(GLT.tooth), alpha * 0.9);
  for (let i = 0; i < 4; i++) {
    const ty = y + 2 + i * (h - 4) / 4;
    g.fillTriangle(x + w - h * 0.5, ty, x + w - h * 0.5, ty + (h - 4) / 4,
      x + w - h * 0.5 - h * 0.22, ty + (h - 4) / 8);
  }

  g.lineStyle(1.4, tint(GLT.blood), alpha * 0.8);
  g.strokePoints(plate, true, true);
}

/** One slot of the prep strip: a notched steel tile, brighter when it is the item in hand. */
export function prepSlot(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, s: number,
  selected: boolean, empty: boolean, alpha: number,
): void {
  const cut = s * 0.22;
  const plate = [
    new Phaser.Geom.Point(x + cut, y), new Phaser.Geom.Point(x + s, y),
    new Phaser.Geom.Point(x + s, y + s - cut), new Phaser.Geom.Point(x + s - cut, y + s),
    new Phaser.Geom.Point(x, y + s), new Phaser.Geom.Point(x, y + cut),
  ];
  g.fillStyle(tint(0x0b0a0e), alpha * (empty ? 0.55 : 0.88));
  g.fillPoints(plate, true);
  if (!empty) {
    g.fillStyle(tint(GLT.linenDark), alpha * 0.12);
    g.fillPoints(plate.map((p) => new Phaser.Geom.Point(p.x, p.y - s * 0.32)), true);
  }
  g.lineStyle(selected ? 2 : 1.1, tint(selected ? GLT.ember : GLT.steelDark),
    alpha * (selected ? 0.95 : empty ? 0.3 : 0.6));
  g.strokePoints(plate, true, true);
}

/**
 * The cook's own progress ring, drawn around whatever is sitting on the grate. `oversear` is
 * Pit Master's: the same ring run in blue rather than ember, so a glance at the grate says
 * whether what is on it is going to come off worth 25% more. Green on completion either way.
 */
export function cookRing(
  g: Phaser.GameObjects.Graphics,
  tint: GluttonyColorFn,
  x: number, y: number, r: number, ratio: number, alpha: number, done: boolean,
  oversear = false,
): void {
  g.lineStyle(2.4, tint(GLT.char), alpha * 0.5);
  g.strokeCircle(x, y, r);
  g.lineStyle(2.4, tint(done ? 0x7ada6a : oversear ? GLT.blueCoal : GLT.ember), alpha * 0.95);
  g.beginPath();
  g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(ratio, 0, 1), false);
  g.strokePath();
  if (oversear && !done) {
    g.lineStyle(1, tint(GLT.blueHot), alpha * 0.5);
    g.strokeCircle(x, y, r + 2.6);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class GluttonyFx extends FxBase {
  /** Fat hitting the coals: sparks that arc up and die. */
  sizzle(x: number, y: number, count = 8, spread = 26, ms = 520, depth = 9): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: -Math.PI / 2 + (Math.random() - 0.5) * 2.4,
      d: spread * (0.4 + Math.random() * 0.8),
      s: i * 7.3,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + e * e * 22;
        g.fillStyle(this.tint(t < 0.5 ? GLT.emberHot : GLT.heat), (1 - t) * 0.95);
        g.fillCircle(px, py, 2.2 * (1 - t * 0.6));
        g.lineStyle(1, this.tint(GLT.ember), (1 - t) * 0.5);
        g.lineBetween(px, py, px - Math.cos(p.a) * 5, py - Math.sin(p.a) * 5);
      }
    });
  }

  /** A blade going through something. */
  slashArc(x: number, y: number, ang: number, reach: number, color = GLT.steel, depth = 10): void {
    this.anim(depth, 280, (g, t) => {
      const sweep = 1.75;
      const a0 = ang - sweep / 2;
      const span = Phaser.Math.Clamp(t * 1.8, 0, 1);
      for (const [w, c, al] of [[7, GLT.white, 0.3], [3, color, 0.95]] as [number, number, number][]) {
        g.lineStyle(w * (1 - t * 0.55), this.tint(c), (1 - t) * al);
        g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const s = (i / 16) * span;
          const a = a0 + s * sweep;
          const r = reach * (0.6 + 0.4 * Math.sin(s * Math.PI));
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    });
  }

  /** Teeth closing on something. Cannibalize, and every maw bite. */
  bite(x: number, y: number, ang: number, size = 30, depth = 11): void {
    this.anim(depth, 320, (g, t) => {
      const close = easeIn(t);
      const gape = (1 - close) * 0.95 + 0.06;
      for (const side of [-1, 1]) {
        const base = ang + side * gape;
        g.fillStyle(this.tint(GLT.tooth), (1 - t) * 0.95);
        for (let i = 0; i <= 5; i++) {
          const a = base + (i / 5 - 0.5) * 1.4 * side;
          const r = size;
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          const ix = x + Math.cos(a) * r * 0.68;
          const iy = y + Math.sin(a) * r * 0.68;
          const nx = -Math.sin(a) * size * 0.09;
          const ny = Math.cos(a) * size * 0.09;
          g.fillTriangle(px + nx, py + ny, px - nx, py - ny, ix, iy);
        }
      }
      g.fillStyle(this.tint(GLT.blood), (1 - t) * 0.45);
      g.fillCircle(x, y, size * (0.25 + close * 0.6));
    });
    this.splat(x, y, size * 0.6, GLT.blood, depth);
  }

  /** Blood, gravy, whatever came out. */
  splat(x: number, y: number, size = 26, color = GLT.blood, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      spatter(g, this.tint, x, y, size * (0.4 + e * 0.7), color, seed, (1 - t) * 0.9);
    });
  }

  /** An expanding ring — casts, transformations, the pot going off. */
  ring(x: number, y: number, r0: number, r1: number, color = GLT.ember, ms = 460, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * TAU;
        const rr = r * (1 + (jitter(seed, i) - 0.5) * 0.1);
        pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.74));
      }
      g.lineStyle(3 * (1 - t) + 0.8, this.tint(color), (1 - t) * 0.85);
      g.strokePoints(pts, false, false);
    });
  }

  /** Something went up in a gout of flame — the charcoal landing, the grill catching. */
  flare(x: number, y: number, r: number, depth = 11): void {
    this.flashIn(x, y, r * 0.5, GLT.emberHot, GLT.flame, depth);
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(GLT.flame), (1 - t) * 0.35);
      g.fillCircle(x, y, r * e);
      g.lineStyle(3 * (1 - t) + 1, this.tint(GLT.ember), (1 - t) * 0.85);
      g.strokeCircle(x, y, r * e);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + t;
        g.fillStyle(this.tint(GLT.emberHot), (1 - t) * 0.7);
        g.fillCircle(x + Math.cos(a) * r * e * 0.9, y + Math.sin(a) * r * e * 0.9, 3 * (1 - t));
      }
    });
    this.sizzle(x, y, 10, r * 0.7, 600, depth);
  }

  /** Crumbs off something being eaten. */
  crumbs(x: number, y: number, color: number, depth = 10): void {
    const seeds = Array.from({ length: 7 }, () => ({
      a: Math.random() * TAU, d: 10 + Math.random() * 20, r: 1.4 + Math.random() * 2.2,
    }));
    this.anim(depth, 460, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        g.fillStyle(this.tint(color), (1 - t) * 0.9);
        g.fillCircle(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e + e * e * 16, p.r);
      }
    });
  }

  /** The smell of it. Slow curls, used for cooking and for the transformation. */
  smoke(x: number, y: number, count = 5, rise = 40, color = 0x8b8478, ms = 900, depth = 8): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 22, r: 5 + Math.random() * 8, s: i * 1.7,
    }));
    this.anim(depth, ms, (g, t) => {
      for (const p of seeds) {
        g.fillStyle(this.tint(color), (1 - t) * 0.24);
        g.fillCircle(x + p.x + Math.sin(t * 5 + p.s) * 8, y - t * rise, p.r * (0.6 + t));
      }
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const GLUTTONY_AVATAR: AvatarSpec = {
  hands: [
    { r: 11.5, color: GLT.white, alpha: 0.2 },
    { r: 7, color: GLT.white, alpha: 0.96 },
    { r: 2.4, color: GLT.linen, alpha: 0.9, ox: -1.5, oy: -1.6 },
  ],
  eyeWhite: GLT.white,
  eyePupil: 0x1a1820,
  squash: { div: 14, x: 0.46, y: 0.28 },
};

/**
 * The cook.
 *
 * Chef form is all pressed cloth: a tall pleated toque, a double-breasted jacket with two rows of
 * knotted buttons, a neckerchief, and the knife held out in front where the whole arena can see
 * exactly how long it is. Butcher form is the same rig with everything broken — the toque
 * collapses into a matted flat cap, the whites take spatter that persists (seeded, so it does not
 * crawl), the jacket hangs open over an apron, and the knife goes behind the back.
 *
 * The red glint is drawn in `drawExtras`, which sits above the eyes in the rig's depth stack, so
 * it lands *on* the leading eye rather than beside it.
 */
export class GluttonyAvatar extends BaseAvatar {
  private butcher = 0;
  /** 0–1, how hot the blade is. Only ever visible on the knife itself. */
  private knifeHeat = 0;
  /** What is being held out in front instead of the knife, if anything. */
  private heldFood: FoodStamp | null = null;
  /** 0–1 — how full the belly is, which is how far the jacket strains. */
  private fed = 0;
  /** Click upgrade: the knife is a cleaver, in both forms and in every drawing of it. */
  private cleaver = false;
  /** 0–1 — how much of the maw is currently running down the blade. */
  private ichor = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: GluttonyColorFn, depth = 6) {
    super(scene, tint, depth, GLUTTONY_AVATAR);
  }

  /** Ramped rather than switched, so the transformation is something you watch happen. */
  setButcher(v: number): void { this.butcher = Phaser.Math.Clamp(v, 0, 1); }
  setKnifeHeat(v: number): void { this.knifeHeat = Phaser.Math.Clamp(v, 0, 1); }
  setHeld(food: FoodStamp | null): void { this.heldFood = food; }
  setFed(v: number): void { this.fed = Phaser.Math.Clamp(v, 0, 1); }
  setCleaver(on: boolean): void { this.cleaver = on; }
  setIchor(v: number): void { this.ichor = Phaser.Math.Clamp(v, 0, 1); }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 14.5 : 11.5);
      glow.setAlpha(on ? 0.32 : 0.2);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new GluttonyFx(this.scene, this.tint).sizzle(x, y, 1, 5, 320, 4);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    // A kitchen's own pool of warm light, souring to red as the butcher comes out.
    g.fillStyle(this.tint(0x000000), a * 0.4);
    g.fillEllipse(x, y + 14, 48, 17);
    g.fillStyle(this.tint(this.butcher > 0.5 ? GLT.blood : GLT.ember), a * (0.1 + this.butcher * 0.1));
    g.fillEllipse(x, y + 12, 62 + Math.sin(this.t * 2) * 5, 24);
    for (let i = 0; i < 2; i++) {
      const r = 20 + i * 11 + Math.sin(this.t * 1.7 + i) * 3;
      g.lineStyle(1.2, this.tint(this.butcher > 0.5 ? GLT.bloodDark : GLT.linenDark), a * (0.16 - i * 0.05));
      g.strokeEllipse(x, y + 13, r * 2, r * 0.76);
    }
  }

  /** The whites, and what has been done to them. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const b = this.butcher;
    const swell = 1 + this.fed * 0.12;

    // Jacket: a torso panel with a lapel fold down the middle.
    g.fillStyle(this.tint(GLT.linen), alpha * 0.95);
    g.fillEllipse(x, y + 7, 30 * swell, 24);
    g.fillStyle(this.tint(GLT.white), alpha * 0.95);
    g.fillEllipse(x - 1.5, y + 6, 26 * swell, 21);
    // The double-breasted overlap, and the buttons on it. The butcher's hangs open.
    const lapel = 5 - b * 3.5;
    g.fillStyle(this.tint(GLT.linen), alpha * 0.9);
    g.fillTriangle(x - lapel, y - 3, x + lapel, y - 3, x, y + 15);
    g.fillStyle(this.tint(this.butcher > 0.5 ? GLT.bloodDark : GLT.band), alpha * (1 - b * 0.5));
    for (let i = 0; i < 3; i++) {
      const by = y + 1 + i * 5;
      g.fillCircle(x - 5 - b * 2, by, 1.5);
      g.fillCircle(x + 5 + b * 2, by, 1.5);
    }

    // Apron, only once the butcher is out: a heavy panel under the open jacket.
    if (b > 0.05) {
      g.fillStyle(this.tint(0xbfb6a4), alpha * b * 0.95);
      g.fillPoints([
        new Phaser.Geom.Point(x - 8, y - 2), new Phaser.Geom.Point(x + 8, y - 2),
        new Phaser.Geom.Point(x + 10, y + 17), new Phaser.Geom.Point(x - 10, y + 17),
      ], true);
      // Spatter. Seeded, so it stays exactly where it landed instead of crawling.
      for (let i = 0; i < 9; i++) {
        const sx = x - 9 + jitter(this.seed, i) * 18;
        const sy = y - 1 + jitter(this.seed, 30 + i) * 17;
        g.fillStyle(this.tint(i % 3 === 0 ? GLT.bloodDark : GLT.blood), alpha * b * 0.85);
        g.fillCircle(sx, sy, 0.9 + jitter(this.seed, 60 + i) * 2.4);
      }
      // One long run down the front, because spatter alone reads as a pattern.
      g.lineStyle(1.6, this.tint(GLT.bloodDark), alpha * b * 0.7);
      g.lineBetween(x + 3, y + 1, x + 4.5, y + 15);
    }

    // Neckerchief — knotted at the throat in both forms, dirty in one of them.
    g.fillStyle(this.tint(b > 0.5 ? GLT.bloodDark : GLT.band), alpha * 0.95);
    g.fillTriangle(x - 8, y - 4, x + 8, y - 4, x, y + 3);
    g.fillStyle(this.tint(b > 0.5 ? GLT.blood : 0x3d3c45), alpha * 0.9);
    g.fillCircle(x + 6, y - 3.4, 2.2);
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const b = this.butcher;
    const crown = y - 17;

    // ── The hat ──
    if (b < 0.95) {
      const h = (1 - b) * (16 + this.fed * 3);
      // Band, then the pleated crown above it. Pleats are what make a toque a toque.
      g.fillStyle(this.tint(GLT.linen), alpha * (1 - b));
      g.fillRect(x - 11, crown - 3, 22, 5);
      g.fillStyle(this.tint(GLT.white), alpha * (1 - b));
      g.fillEllipse(x, crown - 3 - h * 0.5, 24 + h * 0.35, h);
      g.fillEllipse(x, crown - 3 - h, 22, h * 0.5);
      g.lineStyle(1, this.tint(GLT.linenDark), alpha * (1 - b) * 0.7);
      for (let i = -2; i <= 2; i++) {
        const px = x + i * 5;
        g.lineBetween(px, crown - 3, px + i * 0.8, crown - 3 - h * 0.9);
      }
    }
    if (b > 0.05) {
      // What is left of it: a flat, sodden cap pulled down over matted hair.
      g.fillStyle(this.tint(0x8e8577), alpha * b);
      g.fillEllipse(x, crown + 1, 25, 8);
      g.fillStyle(this.tint(0x6d6558), alpha * b);
      g.fillEllipse(x - 1, crown - 2, 19, 8);
      g.fillStyle(this.tint(GLT.blood), alpha * b * 0.55);
      g.fillCircle(x + 6, crown - 1, 2.6);
      g.fillCircle(x - 4, crown + 1.6, 1.8);
    }

    // ── The knife, and whatever replaced it ──
    // Chef: held out at the leading hand, so its length is public information. Butcher: tucked
    // behind the spine, pointing back the way he came.
    const lead = Math.cos(this.facing) * (this.armX[1] - x) + Math.sin(this.facing) * (this.armY[1] - y)
      >= Math.cos(this.facing) * (this.armX[0] - x) + Math.sin(this.facing) * (this.armY[0] - y) ? 1 : 0;
    const blade = (bx: number, by: number, ba: number, len: number, al: number) => {
      if (this.cleaver) {
        chefCleaver(g, this.tint, bx, by, ba, len, this.knifeHeat, al, this.ichor, this.t);
      } else {
        kitchenKnife(g, this.tint, bx, by, ba, len, this.knifeHeat, al);
      }
    };
    if (b < 0.5) {
      const hx = this.armX[lead];
      const hy = this.armY[lead];
      if (this.heldFood) {
        itemShape(g, this.tint, hx, hy, this.heldFood, 20, alpha, this.t * 3);
      } else {
        blade(hx + Math.cos(this.facing) * 8, hy + Math.sin(this.facing) * 8,
          this.facing, 30, alpha * (1 - b * 2));
      }
    } else {
      const back = this.facing + Math.PI;
      const bx = x + Math.cos(back) * 15;
      const by = y + Math.sin(back) * 9 + 3;
      blade(bx, by, back - 0.5 + Math.sin(this.t * 2.2) * 0.12, 32, alpha * b);
      if (this.heldFood) {
        itemShape(g, this.tint, this.armX[lead], this.armY[lead], this.heldFood, 20, alpha, this.t * 3);
      }
    }

    // ── The glint ──
    // Painted over the eyes, on the one nearer the aim, because a pair of red eyes is a monster
    // and a single red catchlight is a person who has decided something.
    if (b > 0.15) {
      const side = Math.cos(this.facing) >= 0 ? 1 : -1;
      const ex = x + side * 7.2 + Math.cos(this.facing) * 2.4;
      const ey = y - 4 + Math.sin(this.facing) * 2 + Math.sin(this.t * 2.6) * 1.1;
      const pulse = 0.6 + 0.4 * Math.sin(this.t * 5.5);
      g.fillStyle(this.tint(GLT.blood), alpha * b * 0.3 * pulse);
      g.fillCircle(ex, ey, 6.5);
      g.fillStyle(this.tint(0xff2e3a), alpha * b);
      g.fillCircle(ex + Math.cos(this.facing) * 1.6, ey + Math.sin(this.facing) * 1.4, 2.1);
      g.fillStyle(this.tint(0xffd4d8), alpha * b * pulse);
      g.fillCircle(ex + Math.cos(this.facing) * 1.6 - 0.7, ey + Math.sin(this.facing) * 1.4 - 0.7, 0.8);
    }

    // Mastered cooks wear the medal. Small, and only ever on the chef.
    if (this.mastered && b < 0.5) {
      g.fillStyle(this.tint(0xe8c65c), alpha * (1 - b));
      g.fillCircle(x - 8, y + 2, 2.6);
      g.lineStyle(1, this.tint(0x8a6a1c), alpha * (1 - b));
      g.strokeCircle(x - 8, y + 2, 2.6);
    }
  }
}
