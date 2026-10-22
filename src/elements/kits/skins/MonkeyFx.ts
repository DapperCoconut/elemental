import Phaser from 'phaser';
import { FxBase, TAU, easeOut } from '../ElementVisuals';
import { FONT_DISPLAY, FONT_UI } from '../../../ui/Theme';

/**
 * The Monkey skin's bespoke art for Growth — a dart monkey. Visual only: every painter here
 * stands in for one Growth painter for an owner wearing the skin, at the same footprint, so
 * hitboxes, timings and the upgrade tree's rules stay exactly the element's.
 *
 * - `buildDart` — Bacterium: a dart with a steel tip and red flights.
 * - `buildTacks` — a Virus in flight: a spinning cluster of tacks.
 * - `buildSpikePile` — a floor virus: a spike-factory pile of road spikes.
 * - `drawBloon` — a spore: a balloon whose colour is its health, popping down a layer as it
 *   is hit (red → blue → green → yellow → pink).
 * - `drawBloontoniumGauge` — the DNA bar: a glass canister of glowing green bloontonium.
 * - `renderUpgradePanel` — Evolve: the three-path tower upgrade panel, with the dart monkey's
 *   own fifteen upgrades standing over Growth's fifteen nodes.
 *
 * Colours are final (the skin owns them), so nothing routes through Growth's mapper.
 */
export const MON = {
  furDark: 0x3e2410,
  fur: 0x7a4a22,
  furLit: 0xa06a36,
  tan: 0xe8c08a,
  tanShade: 0xc09060,
  ink: 0x120a04,
  steel: 0x9aa3ae,
  steelDark: 0x4a525c,
  steelLit: 0xe6ecf2,
  flight: 0xd8262e,
  flightDark: 0x7a1016,
  wood: 0x8a5a2a,
  woodDark: 0x4e3014,
  bloonRed: 0xe0302a,
  bloonBlue: 0x2f7fe0,
  bloonGreen: 0x5ac83a,
  bloonYellow: 0xf2d22a,
  bloonPink: 0xff6aa8,
  goo: 0x6dff3a,
  gooDark: 0x1e7a1a,
  gooHot: 0xd8ffc0,
  glass: 0xcfe8f0,
  gold: 0xf2c22e,
  goldDark: 0x9a6a12,
  plasma: 0xb05aff,
  plasmaHot: 0xf0d8ff,
  cape: 0xd8262e,
  capeBlue: 0x2f5fd0,
  hood: 0x3e7a2a,
  hoodDark: 0x22461a,
  hat: 0x6a4420,
  hatDark: 0x3e2410,
  white: 0xffffff,
  // ── Upgrade panel ──
  panel: 0x8a5a2e,
  panelDark: 0x3a2412,
  panelLit: 0xc89058,
  tile: 0x2f7fd0,
  tileLit: 0x6ab4f4,
  tileDone: 0x4caf2a,
  tileDoneLit: 0x8ae05a,
  tileLocked: 0x5a6068,
  tileLockedLit: 0x8a9098,
  outline: 0x0b1a2e,
  price: 0x5ad13a,
  priceDark: 0x226a12,
};

type Pt = Phaser.Geom.Point;
const P = (x: number, y: number): Pt => new Phaser.Geom.Point(x, y);

// ── Dart (Bacterium) ─────────────────────────────────────────────────────────

/** A dart pointing along +x from the local origin, for a container that rotates it. */
export function buildDart(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawDart(g, 0, 0, 0, 1, 1);
  return g;
}

/** A dart at (`x`,`y`) pointing along `ang`, `s` scale — shaft, steel point, red flights. */
export function drawDart(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, s: number, alpha: number): void {
  const c = Math.cos(ang), sn = Math.sin(ang);
  const F = (u: number, v: number) => P(x + (c * u - sn * v) * s, y + (sn * u + c * v) * s);
  // Flights: two red vanes and a dark spine.
  g.fillStyle(MON.flight, alpha);
  g.fillPoints([F(-9, 0), F(-14, -5), F(-11, 0)], true);
  g.fillPoints([F(-9, 0), F(-14, 5), F(-11, 0)], true);
  g.fillStyle(MON.flightDark, alpha);
  g.fillPoints([F(-9, 0), F(-14, 5), F(-12, 1.5)], true);
  // Shaft.
  g.fillStyle(MON.woodDark, alpha);
  g.fillPoints([F(-12, -1.1), F(4, -1.1), F(4, 1.1), F(-12, 1.1)], true);
  g.fillStyle(MON.wood, alpha);
  g.fillPoints([F(-12, -1.1), F(4, -1.1), F(4, 0), F(-12, 0)], true);
  // Steel point, tapered.
  g.fillStyle(MON.steelDark, alpha);
  g.fillPoints([F(3, -2), F(12, 0), F(3, 2)], true);
  g.fillStyle(MON.steelLit, alpha);
  g.fillPoints([F(3, -2), F(12, 0), F(4, -0.2)], true);
}

// ── Tacks (Virus) ────────────────────────────────────────────────────────────

/** One tack: a round head with a spike out along `ang`. */
function tack(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, alpha: number): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  g.fillStyle(MON.steelDark, alpha);
  g.fillPoints([P(x - s * 1.4, y + c * 1.4), P(x + c * len, y + s * len), P(x + s * 1.4, y - c * 1.4)], true);
  g.fillStyle(MON.steelLit, alpha);
  g.fillPoints([P(x - s * 1.4, y + c * 1.4), P(x + c * len, y + s * len), P(x, y)], true);
}

/** A cluster of eight tacks around a hub, for the in-flight virus. Local origin. */
export function buildTacks(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(MON.ink, 0.3);
  g.fillCircle(1.5, 2, 9);
  for (let i = 0; i < 8; i++) tack(g, 0, 0, (i / 8) * TAU, 12, 1);
  g.fillStyle(MON.steelDark, 1);
  g.fillCircle(0, 0, 4.4);
  g.fillStyle(MON.flight, 1);
  g.fillCircle(0, 0, 3.2);
  g.fillStyle(MON.white, 0.7);
  g.fillCircle(-1, -1, 1.1);
  return g;
}

/**
 * A spike-factory pile: three road-spike caltrops heaped together, steel with lit points.
 * `healing` is the one only the caster can pick up — glowing bloontonium instead of steel.
 */
export function buildSpikePile(scene: Phaser.Scene, healing: boolean): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(MON.ink, 0.35);
  g.fillEllipse(0, 3, 22, 9);
  if (healing) {
    g.fillStyle(MON.goo, 0.3);
    g.fillCircle(0, 0, 12);
  }
  const spots: [number, number, number][] = [[-4, 1, 0.3], [4, 1.5, 1.4], [0, -3, 2.3]];
  for (const [sx, sy, rot] of spots) {
    for (let k = 0; k < 4; k++) {
      const a = rot + (k / 4) * TAU;
      const c = Math.cos(a), s = Math.sin(a);
      g.fillStyle(healing ? MON.gooDark : MON.steelDark, 1);
      g.fillPoints([P(sx - s * 1.6, sy + c * 1.6), P(sx + c * 7, sy + s * 7 * 0.7), P(sx + s * 1.6, sy - c * 1.6)], true);
      g.fillStyle(healing ? MON.goo : MON.steelLit, 1);
      g.fillPoints([P(sx - s * 1.6, sy + c * 1.6), P(sx + c * 7, sy + s * 7 * 0.7), P(sx, sy)], true);
    }
    // The upright spike every caltrop keeps pointing up.
    g.fillStyle(healing ? MON.gooHot : MON.steelLit, 1);
    g.fillPoints([P(sx - 1.4, sy), P(sx, sy - 6), P(sx + 1.4, sy)], true);
  }
  return g;
}

// ── Bloons (Spores) ──────────────────────────────────────────────────────────

const BLOON_LAYERS = [MON.bloonRed, MON.bloonBlue, MON.bloonGreen, MON.bloonYellow, MON.bloonPink];

/** Which layer a spore of `hp` reads as: every 25 HP is one more bloon in the stack. */
export function bloonLayer(hp: number): number {
  return Phaser.Math.Clamp(Math.floor((hp - 1) / 25), 0, BLOON_LAYERS.length - 1);
}

export function bloonColor(hp: number): number {
  return BLOON_LAYERS[bloonLayer(hp)];
}

function shadeOf(color: number, k: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * k));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * k));
  const b = Math.min(255, Math.round((color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

/**
 * A balloon standing where a spore wall does, `radius` its body. The colour is its health; it
 * bobs on its knot, its string trails to the floor, and `spiked` (the spores that hit back)
 * studs it with tacks.
 */
export function drawBloon(
  g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, t: number, hp: number, spiked: boolean,
): void {
  const bob = Math.sin(t * 2.4 + x * 0.05) * 2;
  const r = radius;
  const by = y - r * 0.15 + bob;
  const col = bloonColor(hp);
  // Shadow on the floor.
  g.fillStyle(MON.ink, 0.28);
  g.fillEllipse(x, y + r * 0.95, r * 1.5, r * 0.45);
  // String, swaying down from the knot.
  g.lineStyle(1, MON.white, 0.7);
  g.beginPath();
  g.moveTo(x, by + r * 1.12);
  g.lineTo(x + Math.sin(t * 3 + x) * 3, by + r * 1.5);
  g.lineTo(x - Math.sin(t * 3 + x) * 2, y + r * 0.95);
  g.strokePath();
  // Body: a teardrop, rounder at the top, built point by point.
  const body: Pt[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    const sy = Math.sin(a);
    const k = sy > 0 ? 1 + sy * 0.12 : 1;
    body.push(P(x + Math.cos(a) * r * (sy > 0 ? 1 - sy * 0.18 : 1), by + sy * r * 1.08 * k));
  }
  g.fillStyle(shadeOf(col, 0.62), 1);
  g.fillPoints(body.map((p) => P(p.x + 1.2, p.y + 1.2)), true);
  g.fillStyle(col, 1);
  g.fillPoints(body, true);
  // Shade side and the bright highlight that makes it rubber.
  g.fillStyle(shadeOf(col, 0.78), 0.8);
  g.fillEllipse(x + r * 0.35, by + r * 0.3, r * 0.8, r * 1.2);
  g.fillStyle(MON.white, 0.55);
  g.fillEllipse(x - r * 0.38, by - r * 0.45, r * 0.32, r * 0.5);
  g.fillStyle(MON.white, 0.85);
  g.fillCircle(x - r * 0.42, by - r * 0.55, r * 0.09);
  // Knot.
  g.fillStyle(shadeOf(col, 0.7), 1);
  g.fillTriangle(x, by + r * 1.02, x - 3, by + r * 1.22, x + 3, by + r * 1.22);
  if (spiked) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + t * 0.4;
      tack(g, x + Math.cos(a) * r * 0.82, by + Math.sin(a) * r * 0.88, a, r * 0.45, 0.95);
    }
  }
}

// ── Bloontonium gauge (the DNA bar) ──────────────────────────────────────────

/** A glass canister across the HUD, filled with glowing bloontonium; bubbles rise in it. */
export function drawBloontoniumGauge(
  g: Phaser.GameObjects.Graphics, left: number, cy: number, w: number, h: number, frac: number, now: number, cells = 10,
): void {
  const px = left - 10, py = cy - h / 2 - 4, pw = w + 20, ph = h + 8;
  const full = frac >= 1;
  // Steel end caps and the glass.
  g.fillStyle(MON.ink, 0.4);
  g.fillRoundedRect(px + 2, py + 3, pw, ph, ph / 2);
  g.fillStyle(0x0a1a0a, 0.92);
  g.fillRoundedRect(px, py, pw, ph, ph / 2);
  // Liquid.
  const lw = Math.max(0, (w + 8) * Math.min(1, frac));
  if (lw > 1) {
    g.fillStyle(MON.gooDark, 1);
    g.fillRoundedRect(px + 6, py + 3, lw, ph - 6, (ph - 6) / 2);
    g.fillStyle(MON.goo, 0.95);
    g.fillRoundedRect(px + 6, py + 3, lw, (ph - 6) * 0.62, (ph - 6) * 0.3);
    // Bubbles riding the liquid.
    for (let i = 0; i < 9; i++) {
      const u = ((now / 1000) * (0.35 + (i % 3) * 0.12) + i * 0.137) % 1;
      const bx = px + 8 + (i / 9) * lw;
      if (bx > px + 6 + lw - 3) continue;
      g.fillStyle(MON.gooHot, 0.7 * (1 - u));
      g.fillCircle(bx, py + ph - 5 - u * (ph - 8), 1.2 + u * 1.2);
    }
  }
  // Cell ticks etched on the glass.
  g.lineStyle(1, MON.glass, 0.25);
  for (let i = 1; i < cells; i++) {
    const tx = px + 6 + ((w + 8) * i) / cells;
    g.lineBetween(tx, py + 4, tx, py + ph - 4);
  }
  // Glass sheen and rim.
  g.fillStyle(MON.white, 0.12);
  g.fillRoundedRect(px + 8, py + 2, pw - 16, ph * 0.3, ph * 0.15);
  const pulse = full ? 0.5 + 0.5 * Math.sin(now / 160) : 0;
  g.lineStyle(2, full ? MON.gooHot : MON.steel, full ? 0.6 + pulse * 0.4 : 0.9);
  g.strokeRoundedRect(px, py, pw, ph, ph / 2);
  for (const ex of [px + 3, px + pw - 3]) {
    g.fillStyle(MON.steelDark, 1);
    g.fillCircle(ex, cy, 5);
    g.fillStyle(MON.steelLit, 1);
    g.fillCircle(ex - 1, cy - 1, 1.6);
  }
  if (full) {
    g.lineStyle(3, MON.goo, 0.18 + pulse * 0.22);
    g.strokeRoundedRect(px - 3, py - 3, pw + 6, ph + 6, ph / 2 + 3);
  }
}

// ── Pops ─────────────────────────────────────────────────────────────────────

export class MonkeyAnims extends FxBase {
  /** A bloon popping: a star of rubber shreds flung out and a white flash. */
  pop(x: number, y: number, r: number, color: number, ms = 320, depth = 8): void {
    const shreds = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU + Math.random() * 0.4, d: r * (1.2 + Math.random()) }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(MON.white, (1 - t) * 0.8);
      g.fillCircle(x, y, r * (0.6 + e * 0.6));
      for (const s of shreds) {
        const px = x + Math.cos(s.a) * s.d * e;
        const py = y + Math.sin(s.a) * s.d * e + t * t * 10;
        g.fillStyle(color, 1 - t);
        g.fillTriangle(px, py, px + Math.cos(s.a + 2) * 4, py + Math.sin(s.a + 2) * 4, px + Math.cos(s.a - 2) * 4, py + Math.sin(s.a - 2) * 4);
      }
      // The comic-book POP star.
      g.lineStyle(2, MON.bloonYellow, (1 - t) * 0.9);
      const star: Pt[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const rr = (i % 2 ? 0.55 : 1) * r * (0.9 + e * 0.5);
        star.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
      }
      g.strokePoints(star, true);
    });
  }
}

// ── The upgrade panel (Evolve) ───────────────────────────────────────────────

/**
 * The dart monkey's fifteen upgrades, standing over Growth's fifteen nodes. Effects are
 * Growth's own, reworded in the skin's nouns; names and order are the dart monkey's.
 * Top path is offense, middle is efficiency, bottom is defense.
 */
export const MONKEY_NODES: Record<string, { name: string; desc: string }> = {
  // Top path — Sharp Shots → Ultra-Juggernaut (offense)
  'teeth': { name: 'Sharp Shots', desc: '+3 dart damage per tier' },
  'viral-spikes': { name: 'Razor Sharp Shots', desc: 'Tack clusters hit for +2 and floor spikes +2 per tier' },
  'more-teeth': { name: 'Spike-o-pult', desc: '+4 dart damage per tier' },
  'spiked-spores': { name: 'Juggernaut', desc: 'Every 20 damage your bloons soak, the enemy takes 2 per tier' },
  'claws': { name: 'Ultra-Juggernaut', desc: 'Clicking near an enemy smashes them for 35 instead of throwing a dart.' },
  // Middle path — Quick Shots → Plasma Monkey Fan Club (efficiency)
  'enhanced-flagellum': { name: 'Quick Shots', desc: 'Darts fly 20% faster and throw 15% sooner per tier' },
  'system-efficiency': { name: 'Very Quick Shots', desc: 'All cooldowns 10% shorter per tier' },
  'enhanced-brain': { name: 'Triple Shot', desc: 'Bloontonium drops need 5% less damage per tier' },
  'fast-evolution': { name: 'Super Monkey Fan Club', desc: 'Right-click sells for 50/75/100% back per tier; tier 4-5 cost 1 less' },
  'sweating': { name: 'Plasma Monkey Fan Club', desc: 'Bank up to 3 tack clusters (R) and bloon sprays (F).' },
  // Bottom path — Long Range Darts → Crossbow Master (defense)
  'thick-flesh': { name: 'Long Range Darts', desc: '10% damage resistance per tier' },
  'digestive-system': { name: 'Enhanced Eyesight', desc: 'Every 20 dart damage heals you 2 HP per tier' },
  'gut-bacteria': { name: 'Crossbow', desc: '+1 bloon per spray per tier; bloons inflate +5 HP/s faster per tier' },
  'spiked-shell': { name: 'Sharp Shooter', desc: 'Enemies touching you take 5 damage per tier every second' },
  'chitin-shell': { name: 'Crossbow Master', desc: 'A 75 HP armour plate. Once broken it is rebuilt in full after 15s.' },
};

/** The order the panel shows Growth's paths in, top to bottom. */
export const MONKEY_PATH_ORDER = ['offense', 'efficiency', 'defense'] as const;
export const MONKEY_PATH_LABEL: Record<string, string> = { offense: 'TOP', efficiency: 'MIDDLE', defense: 'BOTTOM' };

export interface MonkeyTierView {
  id: string;
  name: string;
  desc: string;
  level: number;
  maxLevel: number;
  cost: number;
  /** Why it can't be bought right now, or null. */
  lockText: string | null;
  isUltimate: boolean;
  /** False when the tier isn't on offer at all this match (no Evolve+): drawn closed, no click. */
  offered: boolean;
}

export interface MonkeyPathView {
  /** Path key into MONKEY_PATH_LABEL / glyphs, or any label for a non-monkey tree. */
  key: string;
  label: string;
  color: number;
  tiers: MonkeyTierView[];
}

export interface MonkeyExtraView {
  id: string;
  name: string;
  desc: string;
  costText: string;
  owned: boolean;
  affordable: boolean;
}

export interface MonkeyPanelModel {
  title: string;
  currency: number;
  cap: number;
  tabs: { id: string; label: string; on: boolean }[] | null;
  paths: MonkeyPathView[];
  extrasTitle: string;
  extras: MonkeyExtraView[];
  hint: string;
  /** Path tiers reached, top-middle-bottom, for the crosspath code under the title. */
  crosspath: string;
}

export interface PanelArea { id: string; x: number; y: number; w: number; h: number }

const TEXT_STROKE = { stroke: '#0b1a2e', strokeThickness: 4 };

/** A tier's icon, drawn in a ~36px box. `key` is the path, `tier` 1–5. */
function glyph(g: Phaser.GameObjects.Graphics, key: string, tier: number, cx: number, cy: number, dim: boolean): void {
  const a = dim ? 0.45 : 1;
  g.fillStyle(MON.outline, 0.35 * a);
  g.fillCircle(cx, cy, 18);
  if (key === 'offense') {
    if (tier <= 2) {
      drawDart(g, cx, cy, -0.6, 1.4, a);
      if (tier === 2) { drawDart(g, cx + 6, cy + 5, -0.6, 1.1, a); }
    } else {
      if (tier === 3) {
        // Spike-o-pult: a wooden catapult arm with a cup.
        g.fillStyle(MON.woodDark, a);
        g.fillRect(cx - 12, cy + 6, 24, 5);
        g.lineStyle(3, MON.wood, a);
        g.lineBetween(cx - 6, cy + 6, cx + 8, cy - 10);
        g.fillStyle(MON.wood, a);
        g.fillCircle(cx + 9, cy - 11, 4);
      }
      const R = tier === 3 ? 4 : tier === 4 ? 9 : 12;
      const bx = tier === 3 ? cx + 9 : cx, by = tier === 3 ? cy - 12 : cy;
      for (let i = 0; i < 10; i++) tack(g, bx, by, (i / 10) * TAU, R * 1.45, a);
      g.fillStyle(tier === 5 ? MON.flightDark : MON.steelDark, a);
      g.fillCircle(bx, by, R);
      g.fillStyle(MON.white, 0.5 * a);
      g.fillCircle(bx - R * 0.35, by - R * 0.35, R * 0.25);
    }
  } else if (key === 'efficiency') {
    if (tier <= 3) {
      const n = tier === 3 ? 3 : tier;
      for (let i = 0; i < n; i++) drawDart(g, cx - 2, cy + (i - (n - 1) / 2) * 8, tier === 3 ? (i - 1) * 0.3 : 0, 1.2, a);
      g.lineStyle(1.6, MON.white, 0.7 * a);
      for (let i = 0; i < tier; i++) g.lineBetween(cx - 18, cy - 8 + i * 8, cx - 10, cy - 8 + i * 8);
    } else {
      // A cape: red for the Super Monkey club, plasma violet for the Plasma one.
      const c = tier === 4 ? MON.cape : MON.plasma;
      g.fillStyle(shadeOf(c, 0.6), a);
      g.fillPoints([P(cx - 8, cy - 12), P(cx + 8, cy - 12), P(cx + 15, cy + 14), P(cx - 15, cy + 14)], true);
      g.fillStyle(c, a);
      g.fillPoints([P(cx - 8, cy - 12), P(cx + 8, cy - 12), P(cx + 9, cy + 13), P(cx - 9, cy + 13)], true);
      g.fillStyle(tier === 4 ? MON.bloonYellow : MON.plasmaHot, a);
      g.fillCircle(cx, cy - 2, 5);
    }
  } else if (key === 'defense') {
    if (tier === 1) {
      drawDart(g, cx + 4, cy, 0, 1.3, a);
      g.lineStyle(1.4, MON.white, 0.6 * a);
      g.lineBetween(cx - 18, cy, cx - 8, cy);
      g.lineBetween(cx - 16, cy - 4, cx - 9, cy - 4);
    } else if (tier === 2) {
      g.fillStyle(MON.white, a);
      g.fillEllipse(cx, cy, 30, 18);
      g.fillStyle(MON.bloonBlue, a);
      g.fillCircle(cx, cy, 7);
      g.fillStyle(MON.ink, a);
      g.fillCircle(cx, cy, 3.4);
      g.fillStyle(MON.white, a);
      g.fillCircle(cx - 2, cy - 2, 1.4);
    } else if (tier === 4) {
      g.lineStyle(2.4, MON.flight, a);
      g.strokeCircle(cx, cy, 12);
      g.lineBetween(cx - 17, cy, cx - 5, cy);
      g.lineBetween(cx + 5, cy, cx + 17, cy);
      g.lineBetween(cx, cy - 17, cx, cy - 5);
      g.lineBetween(cx, cy + 5, cx, cy + 17);
    } else {
      drawCrossbow(g, cx, cy, -0.5, tier === 5 ? 1.25 : 1, a, tier === 5);
    }
  } else {
    // A non-monkey tree on the same panel (the sickness tab): a plain bloon in the path colour.
    g.fillStyle(MON.white, 0.8 * a);
    g.fillCircle(cx, cy, 10 + tier);
  }
}

/** A crossbow pointing along `ang`, stock at (`x`,`y`). Gold when it is the Master's. */
export function drawCrossbow(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, s: number, alpha: number, gold = false): void {
  const c = Math.cos(ang), sn = Math.sin(ang);
  const F = (u: number, v: number) => P(x + (c * u - sn * v) * s, y + (sn * u + c * v) * s);
  const wood = gold ? MON.gold : MON.wood;
  const woodDark = gold ? MON.goldDark : MON.woodDark;
  // Stock.
  g.fillStyle(woodDark, alpha);
  g.fillPoints([F(-12, -2.4), F(10, -1.6), F(10, 1.6), F(-12, 2.4)], true);
  g.fillStyle(wood, alpha);
  g.fillPoints([F(-12, -2.4), F(10, -1.6), F(10, 0), F(-12, 0)], true);
  // Limbs, bowed back from the nose.
  g.lineStyle(2.4 * s, woodDark, alpha);
  g.beginPath();
  const l0 = F(4, -12), l1 = F(9, 0), l2 = F(4, 12);
  g.moveTo(l0.x, l0.y); g.lineTo(l1.x, l1.y); g.lineTo(l2.x, l2.y);
  g.strokePath();
  // String drawn back to the nut.
  const n = F(-3, 0);
  g.lineStyle(0.8, MON.white, alpha * 0.85);
  g.lineBetween(l0.x, l0.y, n.x, n.y);
  g.lineBetween(l2.x, l2.y, n.x, n.y);
  // The loaded bolt.
  drawDart(g, F(5, 0).x, F(5, 0).y, ang, 0.7 * s, alpha);
}

/**
 * The three-path tower upgrade panel. Each path is a row of five tier tiles (Growth's four
 * nodes and the path's ultimate); a tile shows its tier badge, icon, name, what it does, three
 * pips for the levels bought, and a price tag. Click areas carry the node ids, so the kit's
 * own buy/sell handler runs unchanged.
 */
export function renderUpgradePanel(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, W: number, H: number, model: MonkeyPanelModel,
): { labels: Phaser.GameObjects.Text[]; areas: PanelArea[] } {
  const labels: Phaser.GameObjects.Text[] = [];
  const areas: PanelArea[] = [];
  const text = (x: number, y: number, s: string, style: Phaser.Types.GameObjects.Text.TextStyle, ox = 0.5, oy = 0.5) => {
    const t = scene.add.text(x, y, s, style).setOrigin(ox, oy).setDepth(41);
    labels.push(t);
    return t;
  };

  g.fillStyle(0x000000, 0.72);
  g.fillRect(0, 0, W, H);

  const panelW = Math.min(904, W - 24);
  const x0 = W / 2 - panelW / 2;
  const y0 = 22;
  const labelW = 96;
  const gap = 8;
  const tileW = (panelW - 16 - labelW - gap * 4) / 5;
  const tileH = 98;
  const rowGap = 10;
  const headerH = 62;
  const tabsH = model.tabs ? 30 : 0;
  const extrasH = model.extras.length ? 78 : 0;
  const panelH = headerH + tabsH + model.paths.length * (tileH + rowGap) + extrasH + 34;

  // Panel: a chunky brown frame with a lighter inset and a thick dark outline.
  g.fillStyle(0x000000, 0.4);
  g.fillRoundedRect(x0 + 5, y0 + 7, panelW, panelH, 18);
  g.fillStyle(MON.panel, 1);
  g.fillRoundedRect(x0, y0, panelW, panelH, 18);
  g.fillStyle(MON.panelLit, 0.35);
  g.fillRoundedRect(x0 + 6, y0 + 6, panelW - 12, 24, 12);
  g.lineStyle(5, MON.panelDark, 1);
  g.strokeRoundedRect(x0, y0, panelW, panelH, 18);
  g.lineStyle(2, MON.panelLit, 0.6);
  g.strokeRoundedRect(x0 + 6, y0 + 6, panelW - 12, panelH - 12, 13);

  // Header: portrait medallion, the tower's name, its crosspath code, and the bloontonium purse.
  const mx = x0 + 44, my = y0 + headerH / 2 + 2;
  g.fillStyle(MON.outline, 1);
  g.fillCircle(mx, my, 27);
  g.fillStyle(MON.tile, 1);
  g.fillCircle(mx, my, 24);
  g.fillStyle(MON.tileLit, 0.5);
  g.fillEllipse(mx, my - 10, 34, 14);
  drawMonkeyHead(g, mx, my + 3, 0.78);
  text(x0 + 82, y0 + 22, model.title, { fontSize: '24px', fontFamily: FONT_DISPLAY, color: '#ffffff', ...TEXT_STROKE }, 0, 0.5);
  text(x0 + 84, y0 + 46, `Upgrades  ${model.crosspath}`, { fontSize: '13px', fontFamily: FONT_DISPLAY, color: '#ffe9a8', ...TEXT_STROKE }, 0, 0.5);
  // Purse: a little canister and the count.
  const cx1 = x0 + panelW - 170, cy1 = y0 + 30;
  g.fillStyle(MON.outline, 1);
  g.fillRoundedRect(cx1 - 6, cy1 - 18, 160, 36, 18);
  g.fillStyle(0x0a1a0a, 1);
  g.fillRoundedRect(cx1 - 3, cy1 - 15, 154, 30, 15);
  g.fillStyle(MON.gooDark, 1);
  g.fillRoundedRect(cx1 + 4, cy1 - 10, 18, 20, 5);
  g.fillStyle(MON.goo, 1);
  g.fillRoundedRect(cx1 + 4, cy1 - 10 + 20 * (1 - Math.min(1, model.currency / model.cap)), 18, 20 * Math.min(1, model.currency / model.cap), 5);
  g.lineStyle(1.5, MON.glass, 0.8);
  g.strokeRoundedRect(cx1 + 4, cy1 - 10, 18, 20, 5);
  text(cx1 + 30, cy1, `${model.currency} / ${model.cap}`, { fontSize: '18px', fontFamily: FONT_DISPLAY, color: '#9dff6a', ...TEXT_STROKE }, 0, 0.5);

  let top = y0 + headerH;

  // Tabs.
  if (model.tabs) {
    const tw = 150, th = 24;
    model.tabs.forEach((tab, i) => {
      const tx = W / 2 + (i - (model.tabs!.length - 1) / 2) * (tw + 10) - tw / 2;
      g.fillStyle(MON.outline, 1);
      g.fillRoundedRect(tx - 2, top - 2, tw + 4, th + 4, 12);
      g.fillStyle(tab.on ? MON.tileDone : MON.tileLocked, 1);
      g.fillRoundedRect(tx, top, tw, th, 10);
      g.fillStyle(MON.white, 0.18);
      g.fillRoundedRect(tx + 3, top + 2, tw - 6, th / 2 - 2, 7);
      text(tx + tw / 2, top + th / 2, tab.label, { fontSize: '12px', fontFamily: FONT_DISPLAY, color: '#ffffff', stroke: '#0b1a2e', strokeThickness: 3 });
      areas.push({ id: `__tab:${tab.id}`, x: tx, y: top, w: tw, h: th });
    });
    top += tabsH;
  }

  // Path rows.
  model.paths.forEach((path, row) => {
    const ry = top + row * (tileH + rowGap);
    // Row label: the path's name over a five-pip tier bar.
    const lx = x0 + 10;
    g.fillStyle(MON.outline, 1);
    g.fillRoundedRect(lx, ry, labelW - 4, tileH, 12);
    g.fillStyle(MON.panelDark, 1);
    g.fillRoundedRect(lx + 3, ry + 3, labelW - 10, tileH - 6, 10);
    text(lx + (labelW - 4) / 2, ry + 26, path.label, {
      fontSize: '15px', fontFamily: FONT_DISPLAY, color: `#${path.color.toString(16).padStart(6, '0')}`, ...TEXT_STROKE,
    });
    const reached = path.tiers.reduce((n, t, i) => (t.level > 0 ? i + 1 : n), 0);
    text(lx + (labelW - 4) / 2, ry + 50, `TIER ${reached}`, { fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#ffe9a8', stroke: '#0b1a2e', strokeThickness: 3 });
    for (let i = 0; i < 5; i++) {
      const px = lx + 12 + i * 15;
      g.fillStyle(MON.outline, 1);
      g.fillRoundedRect(px - 1, ry + 66, 13, 18, 4);
      g.fillStyle(i < reached ? MON.tileDoneLit : 0x2a2a2a, 1);
      g.fillRoundedRect(px + 1, ry + 68, 9, 14, 3);
    }

    path.tiers.forEach((tier, col) => {
      const tx = x0 + 8 + labelW + col * (tileW + gap);
      const maxed = tier.level >= tier.maxLevel;
      const locked = !tier.offered || tier.lockText !== null;
      const affordable = !maxed && !locked && model.currency >= tier.cost;
      const fill = maxed ? MON.tileDone : locked ? MON.tileLocked : MON.tile;
      const lit = maxed ? MON.tileDoneLit : locked ? MON.tileLockedLit : MON.tileLit;
      // Outline, body, a glossy band across the top.
      g.fillStyle(MON.outline, 1);
      g.fillRoundedRect(tx - 3, ry - 3, tileW + 6, tileH + 6, 14);
      if (tier.isUltimate && tier.offered) {
        g.fillStyle(MON.gold, 1);
        g.fillRoundedRect(tx - 1.5, ry - 1.5, tileW + 3, tileH + 3, 13);
      }
      g.fillStyle(fill, 1);
      g.fillRoundedRect(tx, ry, tileW, tileH, 12);
      g.fillStyle(lit, 0.55);
      g.fillRoundedRect(tx + 4, ry + 3, tileW - 8, 18, 9);
      if (tier.level > 0 && !maxed) {
        g.fillStyle(MON.tileDone, 0.35);
        g.fillRoundedRect(tx, ry + tileH * (1 - tier.level / tier.maxLevel), tileW, tileH * (tier.level / tier.maxLevel), 12);
      }
      // Tier badge.
      g.fillStyle(MON.outline, 1);
      g.fillCircle(tx + 12, ry + 12, 10);
      g.fillStyle(tier.isUltimate ? MON.gold : MON.panelLit, 1);
      g.fillCircle(tx + 12, ry + 12, 8);
      text(tx + 12, ry + 12, `${col + 1}`, { fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#ffffff', stroke: '#0b1a2e', strokeThickness: 3 });

      glyph(g, path.key, col + 1, tx + 28, ry + 42, locked && !maxed);
      // Name, then the description directly under however many lines the name took, cut off
      // above the pips and price tag along the foot of the tile.
      const name = text(tx + 50, ry + 8, tier.name, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: tier.offered ? '#ffffff' : '#c8ccd0',
        stroke: '#0b1a2e', strokeThickness: 3, wordWrap: { width: tileW - 54 }, maxLines: 2,
      }, 0, 0);
      const descY = name.y + name.height + 1;
      const lines = Math.max(1, Math.floor((ry + tileH - 27 - descY) / 11));
      text(tx + 50, descY, tier.offered ? tier.desc : 'Needs the Evolve shop upgrade.', {
        fontSize: '9px', fontFamily: FONT_UI, color: tier.offered ? '#eef6ff' : '#c8ccd0',
        stroke: '#0b1a2e', strokeThickness: 2, wordWrap: { width: tileW - 54 }, maxLines: lines,
      }, 0, 0);

      // Level pips, bottom left.
      for (let i = 0; i < tier.maxLevel; i++) {
        const px = tx + 8 + i * 13;
        g.fillStyle(MON.outline, 1);
        g.fillRoundedRect(px - 1, ry + tileH - 18, 12, 11, 3);
        g.fillStyle(i < tier.level ? MON.tileDoneLit : 0x1a2a3a, 1);
        g.fillRoundedRect(px + 1, ry + tileH - 16, 8, 7, 2);
      }

      // Price tag, bottom right.
      const tag = maxed ? 'MAX' : !tier.offered ? '🔒' : tier.lockText ?? `${tier.cost}`;
      const tagW = 54, tagH = 20;
      const tgx = tx + tileW - tagW - 6, tgy = ry + tileH - tagH - 5;
      g.fillStyle(MON.outline, 1);
      g.fillRoundedRect(tgx - 2, tgy - 2, tagW + 4, tagH + 4, 9);
      g.fillStyle(maxed ? MON.tileDone : affordable ? MON.price : locked ? 0x3a3a3a : 0x6a1a1a, 1);
      g.fillRoundedRect(tgx, tgy, tagW, tagH, 8);
      g.fillStyle(MON.white, 0.2);
      g.fillRoundedRect(tgx + 3, tgy + 2, tagW - 6, tagH / 2 - 2, 5);
      if (!maxed && tier.offered && tier.lockText === null) {
        // A drop of bloontonium beside the number.
        g.fillStyle(MON.goo, 1);
        g.fillCircle(tgx + 11, tgy + tagH / 2 + 1, 4);
        g.fillTriangle(tgx + 7.5, tgy + tagH / 2, tgx + 14.5, tgy + tagH / 2, tgx + 11, tgy + 3);
        g.fillStyle(MON.white, 0.7);
        g.fillCircle(tgx + 9.8, tgy + tagH / 2, 1.1);
      }
      text(tgx + tagW / 2 + (maxed || !tier.offered || tier.lockText ? 0 : 7), tgy + tagH / 2, tag, {
        fontSize: '12px', fontFamily: FONT_DISPLAY, color: affordable || maxed ? '#ffffff' : '#ff8a8a',
        stroke: '#0b1a2e', strokeThickness: 3,
      });

      if (tier.offered) areas.push({ id: tier.id, x: tx, y: ry, w: tileW, h: tileH });
    });
  });

  let bottom = top + model.paths.length * (tileH + rowGap);

  // Extras: clone maturity and the mastery's secret rolls, as a row of knowledge cards.
  if (model.extras.length) {
    text(W / 2, bottom + 6, model.extrasTitle, { fontSize: '12px', fontFamily: FONT_DISPLAY, color: '#ffe9a8', ...TEXT_STROKE });
    const cw = 250, ch = 54;
    model.extras.forEach((ex, i) => {
      const ex0 = W / 2 + (i - (model.extras.length - 1) / 2) * (cw + 12) - cw / 2;
      const ey0 = bottom + 18;
      g.fillStyle(MON.outline, 1);
      g.fillRoundedRect(ex0 - 3, ey0 - 3, cw + 6, ch + 6, 12);
      g.fillStyle(ex.owned ? MON.tileDone : ex.affordable ? 0x7a4ad0 : 0x4a3a6a, 1);
      g.fillRoundedRect(ex0, ey0, cw, ch, 10);
      g.fillStyle(MON.white, 0.15);
      g.fillRoundedRect(ex0 + 3, ey0 + 2, cw - 6, 14, 7);
      text(ex0 + 10, ey0 + 6, ex.name, { fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#ffffff', stroke: '#0b1a2e', strokeThickness: 3 }, 0, 0);
      text(ex0 + cw - 10, ey0 + 6, ex.costText, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: ex.owned || ex.affordable ? '#9dff6a' : '#ff8a8a', stroke: '#0b1a2e', strokeThickness: 3,
      }, 1, 0);
      text(ex0 + 10, ey0 + 23, ex.desc, {
        fontSize: '9px', fontFamily: FONT_UI, color: '#f0eaff', wordWrap: { width: cw - 20 }, maxLines: 2,
      }, 0, 0);
      areas.push({ id: ex.id, x: ex0, y: ey0, w: cw, h: ch });
    });
    bottom += extrasH;
  }

  text(W / 2, bottom + 14, model.hint, { fontSize: '11px', fontFamily: FONT_UI, color: '#fff3d8', stroke: '#2a1808', strokeThickness: 3 });
  return { labels, areas };
}

/** A small dart monkey head, for the panel's portrait medallion. */
export function drawMonkeyHead(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.fillStyle(MON.furDark, 1);
  g.fillCircle(x - 15 * s, y - 2 * s, 7 * s);
  g.fillCircle(x + 15 * s, y - 2 * s, 7 * s);
  g.fillStyle(MON.tanShade, 1);
  g.fillCircle(x - 15 * s, y - 2 * s, 4 * s);
  g.fillCircle(x + 15 * s, y - 2 * s, 4 * s);
  g.fillStyle(MON.fur, 1);
  g.fillCircle(x, y, 17 * s);
  g.fillStyle(MON.tan, 1);
  g.fillEllipse(x - 5 * s, y - 2 * s, 12 * s, 14 * s);
  g.fillEllipse(x + 5 * s, y - 2 * s, 12 * s, 14 * s);
  g.fillEllipse(x, y + 7 * s, 18 * s, 11 * s);
  g.fillStyle(MON.ink, 1);
  g.fillCircle(x - 5 * s, y - 3 * s, 2.4 * s);
  g.fillCircle(x + 5 * s, y - 3 * s, 2.4 * s);
  g.fillCircle(x - 2 * s, y + 5 * s, 1 * s);
  g.fillCircle(x + 2 * s, y + 5 * s, 1 * s);
  g.lineStyle(1.4 * s, MON.ink, 1);
  g.beginPath();
  g.arc(x, y + 7 * s, 4 * s, 0.3, Math.PI - 0.3);
  g.strokePath();
}
