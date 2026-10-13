import Phaser from 'phaser';
import { ColorFn, TAU, easeOut } from './ElementVisuals';
import { EARTH, stoneChunk, stoneChunkLayered } from './EarthVisuals';

/**
 * Everything Biome Builder draws — Earth's Q, which carves the arena into quarters and gives
 * each one a climate.
 *
 * The read the whole ability depends on is that a biome is *terrain*, not a tinted rectangle:
 * a lava quarter is a field of basalt plates with the melt showing between them, an ice
 * quarter is a floe with real cracks and a snowfall, a jungle has a leaf wall you can see the
 * fighters walk behind. Every floor is painted once from a seed (the static layer) so twenty
 * seconds of it never boils, and a thin live layer on top carries only what genuinely moves:
 * bubbles, snow, rolling wave crests, swaying fronds.
 *
 * Nothing here is a fighter. The seed stones, spikes, apples and stalactites are the
 * ability's furniture and the kit stores them as plain records; these painters are what the
 * kit (and the codex showcase) call to draw them.
 */

export type EarthBiome = 'lava' | 'ice' | 'jungle' | 'ocean' | 'mountain';

export const BIOME_KINDS: EarthBiome[] = ['lava', 'ice', 'jungle', 'ocean', 'mountain'];

/**
 * Biome colours. Earth's own palette covers the stone; these are the five climates, kept well
 * apart in hue so a quadrant is identifiable from its colour alone at arena zoom.
 */
export const BIOME = {
  // Lava — basalt over melt.
  basalt: 0x1c110f,
  basaltLit: 0x3a2622,
  melt: 0xff5a0f,
  meltHot: 0xffa030,
  meltWhite: 0xfff0c0,
  // Ice — a floe lit from below.
  floe: 0xd9eefb,
  floeDeep: 0x8fc4e6,
  crack: 0x4f8fc2,
  rime: 0xf7fcff,
  // Jungle — canopy greens and one fruit.
  loam: 0x203f1c,
  leaf: 0x3d8a3a,
  leafLit: 0x79c75a,
  leafDeep: 0x24602a,
  vine: 0x6b4a2a,
  apple: 0xe0342c,
  appleLit: 0xff7a6e,
  appleDeep: 0x8c1a16,
  // Ocean — shelf water with foam.
  deep: 0x0b3d66,
  swell: 0x1b6aa6,
  crest: 0x5fb6ea,
  foam: 0xeaf7ff,
  // Mountain — grey scree and a snow line.
  scree: 0x4e4843,
  ridge: 0x6c645c,
  ridgeLit: 0x978c80,
  snow: 0xf2eee6,
} as const;

export interface BiomeInfo {
  name: string;
  /** The card and label colour. */
  color: number;
  /** CSS form of `color`, for Text objects. */
  text: string;
  /** What it does to whoever is standing in it, in a line. */
  rule: string;
  /** Symbiosis — what the Earth user gets for standing in their own. */
  blessing: string;
}

export const BIOME_INFO: Record<EarthBiome, BiomeInfo> = {
  lava:     { name: 'LAVA',     color: 0xff6a22, text: '#ff9a55', rule: 'Burns enemies for 3 every half second', blessing: '+20% damage dealt' },
  ice:      { name: 'ICE',      color: 0x8fd4ff, text: '#c6ecff', rule: 'Enemies move at half speed', blessing: '20% less damage taken' },
  jungle:   { name: 'JUNGLE',   color: 0x5dc24e, text: '#9cef84', rule: 'Drops apples that heal you for 25', blessing: '+5 health a second' },
  ocean:    { name: 'OCEAN',    color: 0x3aa0e8, text: '#8ed6ff', rule: 'Drags enemies toward you', blessing: '+20% move speed' },
  mountain: { name: 'MOUNTAIN', color: 0xb3a38f, text: '#e2d6c2', rule: 'Spikes that hurt to touch — launch them with Click, rain them with Quake', blessing: 'Shield 25% stronger, rebuilds 20% faster' },
};

/** Deterministic 0–1 noise, so a floor painted from a seed is the same floor every frame. */
export function bnoise(seed: number, i: number): number {
  const v = Math.sin(seed * 73.7 + i * 171.3) * 29815.3133;
  return v - Math.floor(v);
}

type Rect = Phaser.Geom.Rectangle;

// ── Glyphs ────────────────────────────────────────────────────────────────

/** The carved symbol a seed stone wears and a biome's label leads with. `r` ≈ 11 at the stone. */
export function drawBiomeGlyph(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, kind: EarthBiome,
  x: number, y: number, r: number, alpha: number, t = 0,
): void {
  switch (kind) {
    case 'lava': {
      // Three tongues of melt licking up out of a crack.
      const tongues: Array<[number, number, number]> = [[-0.55, 0.9, 0], [0, 1.25, 0.4], [0.55, 0.85, 0.8]];
      g.fillStyle(tint(BIOME.melt), alpha);
      for (const [ox, h, ph] of tongues) {
        const sway = Math.sin(t * 6 + ph) * r * 0.08;
        g.fillTriangle(x + ox * r - r * 0.32, y + r * 0.5, x + ox * r + r * 0.32, y + r * 0.5, x + ox * r + sway, y + r * 0.5 - h * r);
      }
      g.fillStyle(tint(BIOME.meltHot), alpha);
      g.fillTriangle(x - r * 0.16, y + r * 0.45, x + r * 0.16, y + r * 0.45, x, y - r * 0.45);
      g.fillStyle(tint(BIOME.basalt), alpha);
      g.fillRect(x - r * 0.95, y + r * 0.45, r * 1.9, r * 0.32);
      break;
    }
    case 'ice': {
      // A six-armed flake with ticks on every arm.
      g.lineStyle(Math.max(1.2, r * 0.16), tint(BIOME.rime), alpha);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + t * 0.4;
        const c = Math.cos(a), s = Math.sin(a);
        g.lineBetween(x - c * r, y - s * r, x + c * r, y + s * r);
        for (const dir of [1, -1]) {
          const bx = x + c * r * 0.58 * dir, by = y + s * r * 0.58 * dir;
          for (const side of [1, -1]) {
            const ta = a + side * 0.9;
            g.lineBetween(bx, by, bx + Math.cos(ta) * r * 0.32 * dir, by + Math.sin(ta) * r * 0.32 * dir);
          }
        }
      }
      g.fillStyle(tint(BIOME.rime), alpha);
      g.fillCircle(x, y, r * 0.16);
      break;
    }
    case 'jungle': {
      // One broad leaf on a stem, with its midrib and side veins.
      const a = -0.75 + Math.sin(t * 2) * 0.05;
      g.save();
      g.translateCanvas(x, y);
      g.rotateCanvas(a);
      g.fillStyle(tint(BIOME.leaf), alpha);
      g.fillEllipse(0, -r * 0.1, r * 1.25, r * 2.1);
      g.fillStyle(tint(BIOME.leafLit), alpha * 0.85);
      g.fillEllipse(-r * 0.22, -r * 0.3, r * 0.5, r * 1.3);
      g.lineStyle(Math.max(1, r * 0.11), tint(BIOME.leafDeep), alpha);
      g.lineBetween(0, -r * 1.1, 0, r * 1.05);
      for (let i = -2; i <= 2; i++) {
        const vy = i * r * 0.36;
        g.lineBetween(0, vy, -r * 0.45, vy + r * 0.3);
        g.lineBetween(0, vy, r * 0.45, vy + r * 0.3);
      }
      g.lineStyle(Math.max(1.4, r * 0.16), tint(BIOME.vine), alpha);
      g.lineBetween(0, r * 0.95, r * 0.12, r * 1.45);
      g.restore();
      break;
    }
    case 'ocean': {
      // Two rolling crests, foam on top, the second one offset like a swell behind the first.
      for (let row = 0; row < 2; row++) {
        const oy = y + (row === 0 ? -r * 0.3 : r * 0.45);
        const ph = t * 3 + row * 1.3;
        g.lineStyle(Math.max(1.4, r * 0.2), tint(row === 0 ? BIOME.foam : BIOME.crest), alpha * (row === 0 ? 1 : 0.85));
        g.beginPath();
        for (let i = 0; i <= 12; i++) {
          const f = i / 12;
          const px = x - r + f * r * 2;
          const py = oy + Math.sin(f * TAU + ph) * r * 0.26;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
      break;
    }
    case 'mountain': {
      // Two peaks, the near one taller, a cap of snow on each.
      g.fillStyle(tint(BIOME.ridge), alpha);
      g.fillTriangle(x - r * 1.1, y + r * 0.75, x - r * 0.2, y - r * 0.55, x + r * 0.5, y + r * 0.75);
      g.fillStyle(tint(BIOME.ridgeLit), alpha);
      g.fillTriangle(x - r * 0.3, y + r * 0.75, x + r * 0.35, y - r * 1.05, x + r * 1.15, y + r * 0.75);
      g.fillStyle(tint(BIOME.snow), alpha);
      g.fillTriangle(x + r * 0.13, y - r * 0.5, x + r * 0.35, y - r * 1.05, x + r * 0.6, y - r * 0.45);
      g.fillTriangle(x - r * 0.35, y - r * 0.2, x - r * 0.2, y - r * 0.55, x - r * 0.02, y - r * 0.18);
      g.fillStyle(tint(BIOME.scree), alpha);
      g.fillRect(x - r * 1.15, y + r * 0.72, r * 2.35, r * 0.28);
      break;
    }
  }
}

// ── Floors ────────────────────────────────────────────────────────────────

/** A closed irregular polygon — a plate, a floe, a leaf cluster — jittered from a seed. */
function plate(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number, seed: number, sides = 6, rot = 0,
): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * TAU;
    const w = 0.72 + bnoise(seed, i) * 0.5;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w));
  }
  g.fillPoints(pts, true);
}

/**
 * The static floor of a biome, painted once at spawn. `seed` decides every plate, crack and
 * leaf, so a zone's floor is fixed for its whole life.
 */
export function drawBiomeFloor(g: Phaser.GameObjects.Graphics, tint: ColorFn, kind: EarthBiome, rect: Rect, seed: number): void {
  const { x, y, width: w, height: h } = rect;
  switch (kind) {
    case 'lava': {
      // The melt is the base; basalt plates sit on it, and wherever they fail to meet, it shows.
      g.fillStyle(tint(BIOME.melt), 0.9);
      g.fillRect(x, y, w, h);
      g.fillStyle(tint(BIOME.meltHot), 0.5);
      for (let i = 0; i < 7; i++) {
        g.fillEllipse(x + bnoise(seed, 300 + i) * w, y + bnoise(seed, 320 + i) * h, 60 + bnoise(seed, 340 + i) * 90, 40 + bnoise(seed, 360 + i) * 50);
      }
      const cell = 54;
      let n = 0;
      for (let py = y - 10; py < y + h + 10; py += cell * 0.86) {
        for (let px = x - 10; px < x + w + 10; px += cell) {
          n++;
          // A few plates are missing — those are the pools.
          if (bnoise(seed, n) < 0.11) continue;
          const jx = (bnoise(seed, 1000 + n) - 0.5) * 14;
          const jy = (bnoise(seed, 2000 + n) - 0.5) * 14;
          const cx = Phaser.Math.Clamp(px + (Math.round(py / (cell * 0.86)) % 2) * cell * 0.5 + jx, x + 6, x + w - 6);
          const cy = Phaser.Math.Clamp(py + jy, y + 6, y + h - 6);
          g.fillStyle(tint(BIOME.basalt), 0.96);
          plate(g, cx, cy, cell * 0.56, cell * 0.5, seed + n, 6, bnoise(seed, 3000 + n) * 0.6);
          g.fillStyle(tint(BIOME.basaltLit), 0.55);
          plate(g, cx - 3, cy - 3, cell * 0.36, cell * 0.3, seed + n + 0.5, 5, bnoise(seed, 4000 + n) * 0.6);
        }
      }
      // Cooled crust at the rim so the quarter reads as a field rather than a cut-out.
      g.lineStyle(6, tint(BIOME.basalt), 0.9);
      g.strokeRect(x + 3, y + 3, w - 6, h - 6);
      break;
    }
    case 'ice': {
      g.fillStyle(tint(BIOME.floeDeep), 0.62);
      g.fillRect(x, y, w, h);
      g.fillStyle(tint(BIOME.floe), 0.58);
      g.fillRect(x, y, w, h);
      // Thinner, bluer patches where the floe is wearing through.
      g.fillStyle(tint(BIOME.floeDeep), 0.38);
      for (let i = 0; i < 9; i++) {
        plate(g, x + bnoise(seed, 50 + i) * w, y + bnoise(seed, 70 + i) * h, 40 + bnoise(seed, 90 + i) * 70, 30 + bnoise(seed, 110 + i) * 50, seed + i * 3, 7);
      }
      // Cracks: branching polylines that fork once or twice.
      for (let c = 0; c < 8; c++) {
        let px = x + bnoise(seed, 200 + c) * w;
        let py = y + bnoise(seed, 220 + c) * h;
        let a = bnoise(seed, 240 + c) * TAU;
        g.lineStyle(2.2, tint(BIOME.crack), 0.75);
        for (let s = 0; s < 7; s++) {
          a += (bnoise(seed, 260 + c * 9 + s) - 0.5) * 1.3;
          const len = 18 + bnoise(seed, 400 + c * 9 + s) * 26;
          const nx = Phaser.Math.Clamp(px + Math.cos(a) * len, x + 2, x + w - 2);
          const ny = Phaser.Math.Clamp(py + Math.sin(a) * len, y + 2, y + h - 2);
          g.lineBetween(px, py, nx, ny);
          if (s === 3) {
            const fa = a + (bnoise(seed, 500 + c) > 0.5 ? 1.1 : -1.1);
            g.lineBetween(nx, ny, Phaser.Math.Clamp(nx + Math.cos(fa) * 30, x + 2, x + w - 2), Phaser.Math.Clamp(ny + Math.sin(fa) * 30, y + 2, y + h - 2));
          }
          px = nx; py = ny;
        }
        g.lineStyle(1, tint(BIOME.rime), 0.55);
        g.lineBetween(px + 1, py + 1, px - 6, py + 4);
      }
      // Frost crystals and a few standing shards.
      g.lineStyle(1.2, tint(BIOME.rime), 0.8);
      for (let i = 0; i < 26; i++) {
        const fx = x + 8 + bnoise(seed, 600 + i) * (w - 16);
        const fy = y + 8 + bnoise(seed, 640 + i) * (h - 16);
        const r = 3 + bnoise(seed, 680 + i) * 4;
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI + bnoise(seed, 700 + i) * 0.6;
          g.lineBetween(fx - Math.cos(a) * r, fy - Math.sin(a) * r, fx + Math.cos(a) * r, fy + Math.sin(a) * r);
        }
      }
      for (let i = 0; i < 5; i++) {
        const sx = x + 20 + bnoise(seed, 800 + i) * (w - 40);
        const sy = y + 20 + bnoise(seed, 820 + i) * (h - 40);
        const ht = 14 + bnoise(seed, 840 + i) * 16;
        g.fillStyle(tint(BIOME.crack), 0.55);
        g.fillEllipse(sx, sy + 4, ht * 0.9, ht * 0.3);
        g.fillStyle(tint(BIOME.floeDeep), 0.95);
        g.fillTriangle(sx - ht * 0.3, sy + 3, sx + ht * 0.3, sy + 3, sx + ht * 0.08, sy - ht);
        g.fillStyle(tint(BIOME.rime), 0.9);
        g.fillTriangle(sx - ht * 0.05, sy + 2, sx + ht * 0.12, sy + 2, sx + ht * 0.08, sy - ht * 0.9);
      }
      g.lineStyle(5, tint(BIOME.rime), 0.45);
      g.strokeRect(x + 2, y + 2, w - 4, h - 4);
      break;
    }
    case 'jungle': {
      g.fillStyle(tint(BIOME.loam), 0.78);
      g.fillRect(x, y, w, h);
      // Grass: short double strokes all over the interior.
      for (let i = 0; i < 110; i++) {
        const gx = x + 6 + bnoise(seed, 100 + i) * (w - 12);
        const gy = y + 6 + bnoise(seed, 200 + i) * (h - 12);
        const lean = (bnoise(seed, 300 + i) - 0.5) * 4;
        g.lineStyle(1.3, tint(i % 3 === 0 ? BIOME.leafLit : BIOME.leaf), 0.55);
        g.lineBetween(gx, gy, gx + lean, gy - 6 - bnoise(seed, 400 + i) * 5);
        g.lineBetween(gx + 3, gy, gx + 3 - lean, gy - 5);
      }
      // Vines snaking across.
      for (let v = 0; v < 4; v++) {
        let px = x + bnoise(seed, 500 + v) * w;
        let py = y;
        g.lineStyle(2.6, tint(BIOME.vine), 0.8);
        for (let s = 0; s < 12; s++) {
          const nx = Phaser.Math.Clamp(px + (bnoise(seed, 520 + v * 12 + s) - 0.5) * 60, x + 4, x + w - 4);
          const ny = Math.min(y + h - 4, py + h / 11);
          g.lineBetween(px, py, nx, ny);
          if (s % 3 === 1) {
            g.fillStyle(tint(BIOME.leafDeep), 0.9);
            g.fillEllipse(nx + 6, ny - 2, 11, 6);
          }
          px = nx; py = ny;
        }
      }
      // The leaf wall: big overlapping fronds all round the border, pointing inward.
      const fronds = Math.round((w + h) / 26);
      for (let i = 0; i < fronds; i++) {
        const f = i / fronds;
        const perim = f * 2 * (w + h);
        let lx: number, ly: number, inward: number;
        if (perim < w) { lx = x + perim; ly = y; inward = Math.PI / 2; }
        else if (perim < w + h) { lx = x + w; ly = y + (perim - w); inward = Math.PI; }
        else if (perim < 2 * w + h) { lx = x + w - (perim - w - h); ly = y + h; inward = -Math.PI / 2; }
        else { lx = x; ly = y + h - (perim - 2 * w - h); inward = 0; }
        const a = inward + (bnoise(seed, 600 + i) - 0.5) * 1.2;
        const len = 34 + bnoise(seed, 700 + i) * 30;
        const shade = i % 3 === 0 ? BIOME.leafLit : i % 3 === 1 ? BIOME.leaf : BIOME.leafDeep;
        g.save();
        g.translateCanvas(lx, ly);
        g.rotateCanvas(a);
        g.fillStyle(tint(BIOME.loam), 0.6);
        g.fillEllipse(len * 0.5 + 2, 3, len, len * 0.42);
        g.fillStyle(tint(shade), 0.96);
        g.fillEllipse(len * 0.5, 0, len, len * 0.42);
        g.lineStyle(1.2, tint(BIOME.leafDeep), 0.8);
        g.lineBetween(0, 0, len * 0.95, 0);
        for (let k = 1; k < 5; k++) {
          const vx = len * 0.2 * k;
          g.lineBetween(vx, 0, vx + len * 0.12, -len * 0.14);
          g.lineBetween(vx, 0, vx + len * 0.12, len * 0.14);
        }
        g.restore();
      }
      // A few flowers in the grass.
      for (let i = 0; i < 7; i++) {
        const fx = x + 24 + bnoise(seed, 900 + i) * (w - 48);
        const fy = y + 24 + bnoise(seed, 920 + i) * (h - 48);
        g.fillStyle(tint(i % 2 ? BIOME.appleLit : BIOME.snow), 0.85);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * TAU;
          g.fillCircle(fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.2);
        }
        g.fillStyle(tint(EARTH.gold), 0.95);
        g.fillCircle(fx, fy, 1.6);
      }
      break;
    }
    case 'ocean': {
      g.fillStyle(tint(BIOME.deep), 0.82);
      g.fillRect(x, y, w, h);
      // Depth banding: lighter toward the arena centre, where the shelf is shallow.
      g.fillStyle(tint(BIOME.swell), 0.32);
      for (let i = 0; i < 8; i++) {
        plate(g, x + bnoise(seed, 50 + i) * w, y + bnoise(seed, 70 + i) * h, 50 + bnoise(seed, 90 + i) * 80, 30 + bnoise(seed, 110 + i) * 40, seed + i * 7, 8);
      }
      // A sandbar in one corner and a scatter of rocks breaking the surface.
      g.fillStyle(tint(EARTH.sand), 0.45);
      plate(g, x + (bnoise(seed, 150) > 0.5 ? w * 0.82 : w * 0.18), y + (bnoise(seed, 151) > 0.5 ? h * 0.8 : h * 0.2), 60, 36, seed + 99, 7);
      for (let i = 0; i < 4; i++) {
        const rx = x + 30 + bnoise(seed, 160 + i) * (w - 60);
        const ry = y + 30 + bnoise(seed, 180 + i) * (h - 60);
        g.fillStyle(tint(BIOME.foam), 0.35);
        g.fillEllipse(rx, ry + 2, 26, 12);
        g.fillStyle(tint(EARTH.stone), 1);
        stoneChunk(g, rx - 8, ry, 0.2, 16, 6, seed + i);
      }
      g.lineStyle(5, tint(BIOME.crest), 0.4);
      g.strokeRect(x + 2, y + 2, w - 4, h - 4);
      break;
    }
    case 'mountain': {
      g.fillStyle(tint(BIOME.scree), 0.84);
      g.fillRect(x, y, w, h);
      // Scree: pebbles everywhere, denser toward the edges.
      for (let i = 0; i < 140; i++) {
        const px = x + 4 + bnoise(seed, 100 + i) * (w - 8);
        const py = y + 4 + bnoise(seed, 240 + i) * (h - 8);
        g.fillStyle(tint(i % 4 === 0 ? BIOME.ridgeLit : BIOME.ridge), 0.55 + bnoise(seed, 380 + i) * 0.4);
        plate(g, px, py, 2 + bnoise(seed, 500 + i) * 4, 1.5 + bnoise(seed, 640 + i) * 3, seed + i, 5, bnoise(seed, 780 + i) * TAU);
      }
      // Ridges: three ranks of peaks laid along the quarter's far edge, snow on the tallest.
      for (let rank = 0; rank < 3; rank++) {
        const baseY = y + h * (0.32 + rank * 0.26);
        const count = 5 + rank;
        for (let i = 0; i <= count; i++) {
          const px = x + (i / count) * w + (bnoise(seed, 900 + rank * 10 + i) - 0.5) * 30;
          const ht = (46 - rank * 9) * (0.7 + bnoise(seed, 950 + rank * 10 + i) * 0.6);
          const hw = 40 + bnoise(seed, 1000 + rank * 10 + i) * 30;
          g.fillStyle(tint(rank === 0 ? BIOME.ridge : rank === 1 ? BIOME.ridgeLit : EARTH.sand), 0.9 - rank * 0.15);
          g.fillTriangle(px - hw, baseY, px + hw * 0.9, baseY, px + hw * 0.1, baseY - ht);
          g.fillStyle(tint(BIOME.scree), 0.5);
          g.fillTriangle(px + hw * 0.1, baseY - ht, px + hw * 0.9, baseY, px + hw * 0.35, baseY);
          if (ht > 36) {
            g.fillStyle(tint(BIOME.snow), 0.92);
            g.fillTriangle(px + hw * 0.1 - hw * 0.22, baseY - ht * 0.62, px + hw * 0.1, baseY - ht, px + hw * 0.1 + hw * 0.22, baseY - ht * 0.6);
          }
        }
      }
      g.lineStyle(6, tint(EARTH.umber), 0.55);
      g.strokeRect(x + 3, y + 3, w - 6, h - 6);
      break;
    }
  }
}

/**
 * The live layer over a biome floor, redrawn every frame. Only what moves lives here, so
 * it stays cheap: a dozen bubbles, a snowfall, the wave crests rolling, a few fronds swaying.
 */
export function drawBiomeLive(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, kind: EarthBiome, rect: Rect, t: number, seed: number, alpha: number,
): void {
  const { x, y, width: w, height: h } = rect;
  switch (kind) {
    case 'lava': {
      // Seams breathe, bubbles rise and pop, heat lifts off the whole field.
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      g.lineStyle(3, tint(BIOME.meltHot), alpha * (0.08 + pulse * 0.12));
      g.strokeRect(x + 8, y + 8, w - 16, h - 16);
      for (let i = 0; i < 14; i++) {
        const life = (t * (0.35 + bnoise(seed, 20 + i) * 0.3) + bnoise(seed, 40 + i)) % 1;
        const bx = x + 14 + bnoise(seed, 60 + i) * (w - 28);
        const by = y + 14 + bnoise(seed, 80 + i) * (h - 28);
        const r = 2 + life * 5;
        if (life < 0.85) {
          g.lineStyle(1.5, tint(BIOME.meltHot), alpha * (1 - life) * 0.9);
          g.strokeCircle(bx, by, r);
          g.fillStyle(tint(BIOME.meltWhite), alpha * (1 - life) * 0.5);
          g.fillCircle(bx - r * 0.3, by - r * 0.3, r * 0.3);
        } else {
          // The pop: a spatter ring.
          const p = (life - 0.85) / 0.15;
          g.lineStyle(1, tint(BIOME.meltWhite), alpha * (1 - p));
          g.strokeCircle(bx, by, r + p * 6);
        }
      }
      for (let i = 0; i < 10; i++) {
        const life = (t * 0.5 + bnoise(seed, 120 + i)) % 1;
        const hx = x + bnoise(seed, 140 + i) * w + Math.sin(t * 3 + i) * 4;
        const hy = y + h - life * h;
        g.fillStyle(tint(BIOME.meltHot), alpha * 0.22 * (1 - life));
        g.fillCircle(hx, hy, 2.4);
      }
      break;
    }
    case 'ice': {
      // Snow drifting down and across, and the odd glint off a crystal.
      for (let i = 0; i < 26; i++) {
        const life = (t * (0.12 + bnoise(seed, 20 + i) * 0.08) + bnoise(seed, 40 + i)) % 1;
        const sx = x + ((bnoise(seed, 60 + i) * w + Math.sin(t * 1.3 + i) * 12 + t * 9) % w + w) % w;
        const sy = y + life * h;
        g.fillStyle(tint(BIOME.rime), alpha * 0.85 * Math.sin(life * Math.PI));
        g.fillCircle(sx, sy, 1.3 + bnoise(seed, 80 + i) * 1.2);
      }
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.7 + bnoise(seed, 100 + i) * 3) % 3;
        if (ph > 0.5) continue;
        const gx = x + 12 + bnoise(seed, 120 + i) * (w - 24);
        const gy = y + 12 + bnoise(seed, 140 + i) * (h - 24);
        const s = Math.sin(ph / 0.5 * Math.PI) * 7;
        g.lineStyle(1.2, tint(BIOME.rime), alpha);
        g.lineBetween(gx - s, gy, gx + s, gy);
        g.lineBetween(gx, gy - s, gx, gy + s);
      }
      break;
    }
    case 'jungle': {
      // Fronds at the near edge swaying over the floor, and pollen drifting up.
      for (let i = 0; i < 9; i++) {
        const fx = x + 20 + bnoise(seed, 20 + i) * (w - 40);
        const fy = y + 20 + bnoise(seed, 40 + i) * (h - 40);
        const sway = Math.sin(t * 1.6 + i * 1.1) * 0.18;
        const a = -Math.PI / 2 + (bnoise(seed, 60 + i) - 0.5) * 1.6 + sway;
        const len = 22 + bnoise(seed, 80 + i) * 14;
        g.fillStyle(tint(i % 2 ? BIOME.leafLit : BIOME.leaf), alpha * 0.85);
        g.fillTriangle(
          fx - Math.cos(a + Math.PI / 2) * 4, fy - Math.sin(a + Math.PI / 2) * 4,
          fx + Math.cos(a + Math.PI / 2) * 4, fy + Math.sin(a + Math.PI / 2) * 4,
          fx + Math.cos(a) * len, fy + Math.sin(a) * len,
        );
      }
      for (let i = 0; i < 12; i++) {
        const life = (t * 0.25 + bnoise(seed, 100 + i)) % 1;
        const px = x + bnoise(seed, 120 + i) * w + Math.sin(t * 2 + i) * 6;
        const py = y + h - life * h;
        g.fillStyle(tint(EARTH.gold), alpha * 0.5 * Math.sin(life * Math.PI));
        g.fillCircle(px, py, 1.5);
      }
      break;
    }
    case 'ocean': {
      // Wave crests rolling toward the arena centre, foam on the front of each.
      const rows = Math.ceil(h / 30);
      for (let r = 0; r < rows; r++) {
        const base = y + 14 + r * 30;
        const ph = t * 2.2 + r * 0.9;
        g.lineStyle(2.4, tint(BIOME.crest), alpha * 0.55);
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const f = i / 24;
          const px = x + f * w;
          const py = base + Math.sin(f * TAU * 2.2 + ph) * 5;
          if (py < y + 2 || py > y + h - 2) continue;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        g.lineStyle(1.4, tint(BIOME.foam), alpha * 0.5);
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const f = i / 24;
          const px = x + f * w;
          const py = base - 3 + Math.sin(f * TAU * 2.2 + ph) * 5;
          if (py < y + 2 || py > y + h - 2) continue;
          if (Math.sin(f * TAU * 2.2 + ph) < 0.35) { g.moveTo(px, py); continue; }
          g.lineTo(px, py);
        }
        g.strokePath();
      }
      // Caustic ripples: faint rings that open and fade.
      for (let i = 0; i < 6; i++) {
        const life = (t * 0.45 + bnoise(seed, 200 + i)) % 1;
        const cx = x + 20 + bnoise(seed, 220 + i) * (w - 40);
        const cy = y + 20 + bnoise(seed, 240 + i) * (h - 40);
        g.lineStyle(1.2, tint(BIOME.foam), alpha * (1 - life) * 0.45);
        g.strokeEllipse(cx, cy, 10 + life * 40, 6 + life * 22);
      }
      break;
    }
    case 'mountain': {
      // Thin cloud shadows crossing the scree and dust lifted off the ridges.
      for (let i = 0; i < 3; i++) {
        const cx = x + ((bnoise(seed, 20 + i) * w + t * 14) % (w + 120)) - 60;
        const cy = y + 20 + bnoise(seed, 40 + i) * (h - 40);
        g.fillStyle(tint(EARTH.umber), alpha * 0.1);
        g.fillEllipse(cx, cy, 120, 50);
      }
      for (let i = 0; i < 8; i++) {
        const life = (t * 0.6 + bnoise(seed, 60 + i)) % 1;
        const px = x + bnoise(seed, 80 + i) * w;
        const py = y + h * 0.3 + bnoise(seed, 100 + i) * h * 0.6 - life * 18;
        g.fillStyle(tint(EARTH.pale), alpha * 0.35 * (1 - life));
        g.fillCircle(px, py, 1.6);
      }
      break;
    }
  }
}

// ── Furniture ─────────────────────────────────────────────────────────────

/**
 * A seed stone: the floating faceted rock the rite offers, with its biome carved into the
 * face. Hovered it lifts and brightens; `grow` runs 0→1 as it arrives.
 */
export function drawSeedStone(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, kind: EarthBiome,
  x: number, y: number, t: number, seed: number, grow: number, hover: boolean, alpha: number,
): void {
  const info = BIOME_INFO[kind];
  const s = easeOut(grow) * (hover ? 1.18 : 1);
  const lift = (hover ? 10 : 0) + Math.sin(t * 2.6 + seed) * 3;
  const r = 24 * s;
  // Ground shadow: smaller and fainter the higher it floats.
  g.fillStyle(tint(EARTH.crevice), alpha * 0.4 * s);
  g.fillEllipse(x, y + 22, 44 * s * (1 - lift * 0.015), 14 * s * (1 - lift * 0.015));
  // Halo in the biome's colour, pulsing harder when hovered.
  const pulse = 0.5 + 0.5 * Math.sin(t * (hover ? 9 : 3.5) + seed);
  g.fillStyle(tint(info.color), alpha * (hover ? 0.3 : 0.14) * s);
  g.fillCircle(x, y - lift, r * (1.45 + pulse * 0.2));
  g.lineStyle(2.2, tint(info.color), alpha * (hover ? 0.95 : 0.55) * s);
  g.strokeCircle(x, y - lift, r * (1.3 + pulse * 0.15));
  // The stone itself: a slab seen face-on, with a lit top facet.
  const spin = Math.sin(t * 1.2 + seed) * 0.12;
  stoneChunkLayered(g, tint, x - r * 0.92, y - lift + r * 0.08, spin, r * 1.85, r * 0.78, alpha, seed);
  // The carved glyph sits in a recess so it reads as cut in rather than painted on.
  g.fillStyle(tint(EARTH.crevice), alpha * 0.55);
  g.fillCircle(x, y - lift, r * 0.6);
  drawBiomeGlyph(g, tint, kind, x, y - lift, r * 0.42, alpha, t);
}

/** A standing mountain spike. `rise` runs 0→1 as it grows out of the ground. */
export function drawSpike(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, h: number, seed: number, rise: number, alpha: number,
): void {
  const ht = h * easeOut(rise);
  g.fillStyle(tint(EARTH.crevice), alpha * 0.45);
  g.fillEllipse(x, y + 5, 30 + h * 0.3, 10 + h * 0.1);
  // Rubble collar at the base, then the spire, then a snow fleck on the tip.
  g.fillStyle(tint(EARTH.shale), alpha);
  for (let i = 0; i < 4; i++) {
    const a = seed * 3 + (i / 4) * TAU;
    stoneChunk(g, x + Math.cos(a) * 9, y + 2 + Math.sin(a) * 3, a, 7, 3, seed + i);
  }
  stoneChunkLayered(g, tint, x, y + 2, -Math.PI / 2 + (bnoise(seed, 1) - 0.5) * 0.18, ht, h * 0.3, alpha, seed);
  if (rise > 0.9) {
    g.fillStyle(tint(BIOME.snow), alpha * 0.9);
    g.fillTriangle(x - 3, y + 2 - ht * 0.78, x + 2, y + 2 - ht, x + 4, y + 2 - ht * 0.8);
  }
}

/** A launched spike in flight, nose along `angle`. */
export function drawFlyingSpike(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, angle: number, seed: number, alpha: number): void {
  // A dust wake behind it, then the spear of rock itself.
  g.fillStyle(tint(EARTH.dust), alpha * 0.35);
  for (let i = 1; i <= 3; i++) {
    g.fillCircle(x - Math.cos(angle) * i * 11, y - Math.sin(angle) * i * 11, 5 - i);
  }
  stoneChunkLayered(g, tint, x - Math.cos(angle) * 16, y - Math.sin(angle) * 16, angle, 34, 7, alpha, seed);
  g.fillStyle(tint(EARTH.chalk), alpha * 0.9);
  g.fillCircle(x + Math.cos(angle) * 15, y + Math.sin(angle) * 15, 2.2);
}

/** An apple, in the air or on the ground. `shadowScale` is 0 at the top of the drop, 1 landed. */
export function drawApple(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, groundY: number, alpha: number, shadowScale: number): void {
  g.fillStyle(tint(EARTH.crevice), alpha * (0.15 + shadowScale * 0.3));
  g.fillEllipse(x, groundY + 6, 16 * (0.4 + shadowScale * 0.6), 7 * (0.4 + shadowScale * 0.6));
  g.fillStyle(tint(BIOME.appleDeep), alpha);
  g.fillCircle(x, y + 1.5, 8.5);
  g.fillStyle(tint(BIOME.apple), alpha);
  g.fillCircle(x - 1, y - 0.5, 8);
  g.fillStyle(tint(BIOME.appleLit), alpha * 0.85);
  g.fillEllipse(x - 3.2, y - 3.2, 4.5, 3);
  g.lineStyle(1.8, tint(BIOME.vine), alpha);
  g.lineBetween(x, y - 6, x + 1.5, y - 11);
  g.fillStyle(tint(BIOME.leafLit), alpha);
  g.fillEllipse(x + 4.5, y - 9, 7, 3.5);
}

/** A stalactite falling point-first. */
export function drawStalactite(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, seed: number, alpha: number): void {
  stoneChunkLayered(g, tint, x, y - 26, Math.PI / 2 + (bnoise(seed, 3) - 0.5) * 0.2, 30, 7, alpha, seed);
  g.fillStyle(tint(EARTH.chalk), alpha * 0.85);
  g.fillCircle(x, y + 2, 2);
}

/**
 * The rite: a dais of slabs under the caster with a ring of runes turning over it, and a
 * countdown arc. `progress` is 0→1 of the window remaining.
 */
export function drawRiteDais(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, cx: number, cy: number, t: number, grow: number, progress: number, alpha: number,
): void {
  const s = easeOut(grow);
  // The dais: a wide low disc of fitted slabs.
  g.fillStyle(tint(EARTH.crevice), alpha * 0.5 * s);
  g.fillEllipse(cx, cy + 10, 150 * s, 60 * s);
  const slabs = 12;
  for (let i = 0; i < slabs; i++) {
    const a = (i / slabs) * TAU;
    g.fillStyle(tint(i % 2 ? EARTH.stone : EARTH.rock), alpha * 0.95 * s);
    stoneChunk(g, cx + Math.cos(a) * 44 * s, cy + 6 + Math.sin(a) * 18 * s, a, 22 * s, 9 * s, i * 1.7);
  }
  g.fillStyle(tint(EARTH.shale), alpha * 0.9 * s);
  g.fillEllipse(cx, cy + 6, 70 * s, 28 * s);
  g.fillStyle(tint(EARTH.sand), alpha * 0.5 * s);
  g.fillEllipse(cx, cy + 4, 46 * s, 16 * s);
  // Runes: small chunks orbiting at head height, lit gold.
  const runes = 10;
  for (let i = 0; i < runes; i++) {
    const a = (i / runes) * TAU + t * 0.9;
    const rx = cx + Math.cos(a) * 62 * s;
    const ry = cy - 34 + Math.sin(a) * 20 * s;
    g.fillStyle(tint(EARTH.gold), alpha * (0.35 + 0.35 * Math.sin(t * 5 + i)) * s);
    g.fillCircle(rx, ry, 5 * s);
    g.fillStyle(tint(EARTH.pale), alpha * 0.95 * s);
    stoneChunk(g, rx, ry, a + Math.PI / 2, 7 * s, 2.6 * s, i);
  }
  // Countdown arc around the caster.
  g.lineStyle(4, tint(EARTH.gold), alpha * 0.85 * s);
  g.beginPath();
  g.arc(cx, cy, 36 * s, -Math.PI / 2, -Math.PI / 2 + TAU * progress, false);
  g.strokePath();
  g.lineStyle(1.5, tint(EARTH.umber), alpha * 0.6 * s);
  g.strokeCircle(cx, cy, 36 * s);
}

/**
 * The quadrant sweeping in: a jagged shock front racing out from the centre along the biome
 * colour, drawn by the kit for the first half second of a zone's life.
 */
export function drawBiomeArrival(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, kind: EarthBiome, rect: Rect, cx: number, cy: number, p: number, alpha: number,
): void {
  const info = BIOME_INFO[kind];
  const far = Math.hypot(Math.max(Math.abs(rect.x - cx), Math.abs(rect.right - cx)), Math.max(Math.abs(rect.y - cy), Math.abs(rect.bottom - cy)));
  const r = easeOut(p) * far;
  const segs = 36;
  g.lineStyle(8 * (1 - p) + 2, tint(info.color), alpha * (1 - p) * 0.9);
  g.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const rr = r * (0.9 + bnoise(7, i) * 0.2);
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}
