import Phaser from 'phaser';
import { C, mix } from '../ui';

/**
 * Stronghold maps. Each map is one or more roads (tracks) that pour out of a breach and end at
 * the keep, plus the terrain around them: water that only naval towers can stand in, and
 * hazards (lava) nothing can stand on.
 *
 * Everything is expressed in the 960×640 logical space. The HUD owns the top band and the
 * build tray owns the bottom one, so the field proper runs from `FIELD_TOP` to `FIELD_BOTTOM`.
 *
 * The scene picks a map with `setActiveMap`; every geometry helper below reads the active one,
 * so towers, husks and combat never have to be handed a map.
 */

export const FIELD_TOP = 56;
export const FIELD_BOTTOM = 548;
/** Half the road's paved width. Towers must stand clear of it. */
export const PATH_HALF_WIDTH = 30;
/** Clearance a tower needs from the road's centre line. */
export const TOWER_PATH_CLEARANCE = PATH_HALF_WIDTH + 24;
/** Minimum distance between two tower centres. */
export const TOWER_SPACING = 50;
export const TOWER_RADIUS = 24;

export interface Pt { x: number; y: number }

// ── Tracks ──────────────────────────────────────────────────────────

/** One road: a polyline from the breach to the keep, with distance-along helpers. */
export class RoadTrack {
  readonly segLen: number[] = [];
  readonly length: number;

  constructor(readonly pts: Pt[]) {
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      this.segLen.push(l);
      total += l;
    }
    this.length = total;
  }

  get start(): Pt { return this.pts[0]; }
  get end(): Pt { return this.pts[this.pts.length - 1]; }

  /** A point `dist` px along the road from the breach. Clamped to the road's ends. */
  pointAlong(dist: number, out: Pt = { x: 0, y: 0 }): Pt {
    let d = Phaser.Math.Clamp(dist, 0, this.length);
    const P = this.pts;
    for (let i = 0; i < this.segLen.length; i++) {
      if (d <= this.segLen[i] || i === this.segLen.length - 1) {
        const t = this.segLen[i] > 0 ? Math.min(1, d / this.segLen[i]) : 0;
        out.x = P[i].x + (P[i + 1].x - P[i].x) * t;
        out.y = P[i].y + (P[i + 1].y - P[i].y) * t;
        return out;
      }
      d -= this.segLen[i];
    }
    out.x = this.end.x; out.y = this.end.y;
    return out;
  }

  /** Unit direction of travel at `dist` along the road. */
  headingAlong(dist: number): Pt {
    let d = Phaser.Math.Clamp(dist, 0, this.length - 0.01);
    const P = this.pts;
    for (let i = 0; i < this.segLen.length; i++) {
      if (d <= this.segLen[i]) {
        const l = this.segLen[i] || 1;
        return { x: (P[i + 1].x - P[i].x) / l, y: (P[i + 1].y - P[i].y) / l };
      }
      d -= this.segLen[i];
    }
    return { x: 1, y: 0 };
  }

  /** Distance from a point to this road's centre line, and how far along the road that closest point is. */
  nearest(x: number, y: number): { dist: number; along: number } {
    let best = Infinity, bestD = 0, acc = 0;
    const P = this.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i].x, ay = P[i].y, bx = P[i + 1].x, by = P[i + 1].y;
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy || 1;
      const t = Phaser.Math.Clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
      const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
      if (d < best) { best = d; bestD = acc + t * this.segLen[i]; }
      acc += this.segLen[i];
    }
    return { dist: best, along: bestD };
  }
}

// ── Terrain ─────────────────────────────────────────────────────────

export type TerrainShape =
  | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number }
  /** A channel of half-width `hw` along a polyline. */
  | { kind: 'river'; pts: Pt[]; hw: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number };

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** How far inside the shape the point is (positive = inside, px). */
function shapeDepth(s: TerrainShape, x: number, y: number): number {
  if (s.kind === 'ellipse') {
    const nx = (x - s.x) / s.rx, ny = (y - s.y) / s.ry;
    const r = Math.hypot(nx, ny);
    return (1 - r) * Math.min(s.rx, s.ry);
  }
  if (s.kind === 'rect') {
    return Math.min(x - s.x, s.x + s.w - x, y - s.y, s.y + s.h - y);
  }
  let best = Infinity;
  for (let i = 0; i < s.pts.length - 1; i++) best = Math.min(best, segDist(x, y, s.pts[i].x, s.pts[i].y, s.pts[i + 1].x, s.pts[i + 1].y));
  return s.hw - best;
}

export interface MapTheme {
  ground: [number, number];
  blade: number;
  verge: number;
  road: [number, number, number];
  stone: [number, number];
  water: { deep: number; shallow: number; foam: number };
  hazard: { deep: number; glow: number };
  chevron: number;
  /** Road surface: cobbles, boardwalk planks or basalt flags. */
  paving: 'cobble' | 'plank' | 'basalt';
  decor: 'meadow' | 'marsh' | 'volcanic';
}

export interface StrongholdMapDef {
  id: string;
  name: string;
  /** BEGINNER / ADVANCED / EXPERT. */
  tag: string;
  tagColor: number;
  blurb: string;
  /** Husk health multiplier stacked on the difficulty's. */
  hpMult: number;
  /** Gold-per-kill multiplier — hard maps pay a little more. */
  goldMult: number;
  /** Shard multiplier stacked on the difficulty's. */
  shardMult: number;
  tracks: Pt[][];
  water: TerrainShape[];
  hazards: TerrainShape[];
  theme: MapTheme;
}

const MEADOW: MapTheme = {
  ground: [0x1f3a24, 0x24452b], blade: 0x3d6a40, verge: 0x2a2418,
  road: [0x5a4d3a, 0x6b5d47, 0x7a6b52], stone: [0x7a6b52, 0x4a3f2e],
  water: { deep: 0x1d4f7a, shallow: 0x2f78a8, foam: 0xbfe6ff },
  hazard: { deep: 0x5a1405, glow: 0xff6a1e },
  chevron: 0xcfbf98, paving: 'cobble', decor: 'meadow',
};

const MARSH: MapTheme = {
  ground: [0x23352e, 0x2b4136], blade: 0x5b7a52, verge: 0x1a1a12,
  road: [0x4a3826, 0x5d4630, 0x6e5539], stone: [0x7d6244, 0x3e2e1e],
  water: { deep: 0x123f4f, shallow: 0x1f6670, foam: 0xa8e8e0 },
  hazard: { deep: 0x5a1405, glow: 0xff6a1e },
  chevron: 0xe6d3a8, paving: 'plank', decor: 'marsh',
};

const VOLCANIC: MapTheme = {
  ground: [0x1e1a1d, 0x2a2226], blade: 0x4a3a36, verge: 0x0c0a0b,
  road: [0x3a3438, 0x48424a, 0x56505a], stone: [0x66606c, 0x2c282e],
  water: { deep: 0x1b5a6a, shallow: 0x2f8f98, foam: 0xd8fff6 },
  hazard: { deep: 0x6a1a06, glow: 0xff7a22 },
  chevron: 0xffb070, paving: 'basalt', decor: 'volcanic',
};

export const STRONGHOLD_MAPS: StrongholdMapDef[] = [
  {
    id: 'kingsroad', name: "KING'S ROAD", tag: 'BEGINNER', tagColor: 0x88cc44,
    blurb: 'One long winding road through the meadow. A pond and a brook for the navy.',
    hpMult: 1, goldMult: 1, shardMult: 1,
    tracks: [[
      { x: -40, y: 150 }, { x: 180, y: 150 }, { x: 180, y: 400 }, { x: 400, y: 400 },
      { x: 400, y: 130 }, { x: 620, y: 130 }, { x: 620, y: 470 }, { x: 800, y: 470 },
      { x: 800, y: 290 }, { x: 905, y: 290 },
    ]],
    water: [
      { kind: 'ellipse', x: 290, y: 272, rx: 50, ry: 64 },
      { kind: 'river', pts: [{ x: -20, y: 512 }, { x: 140, y: 500 }, { x: 300, y: 516 }, { x: 470, y: 500 }, { x: 530, y: 508 }], hw: 18 },
      { kind: 'ellipse', x: 510, y: 300, rx: 40, ry: 70 },
    ],
    hazards: [],
    theme: MEADOW,
  },
  {
    id: 'wharf', name: 'SALTMARSH WHARF', tag: 'ADVANCED', tagColor: 0xffaa33,
    blurb: 'A short boardwalk over the tide. Little dry land, a lot of sea, 1.3× husk health.',
    hpMult: 1.3, goldMult: 1.08, shardMult: 1.4,
    tracks: [[
      { x: -40, y: 300 }, { x: 200, y: 300 }, { x: 200, y: 120 }, { x: 470, y: 120 },
      { x: 470, y: 460 }, { x: 720, y: 460 }, { x: 720, y: 280 }, { x: 905, y: 280 },
    ]],
    water: [
      { kind: 'ellipse', x: 200, y: 470, rx: 175, ry: 92 },
      { kind: 'river', pts: [{ x: 322, y: 40 }, { x: 332, y: 240 }, { x: 300, y: 330 }, { x: 250, y: 420 }], hw: 24 },
      { kind: 'river', pts: [{ x: 596, y: 580 }, { x: 590, y: 380 }, { x: 566, y: 250 }, { x: 600, y: 40 }], hw: 22 },
      { kind: 'rect', x: 770, y: 372, w: 220, h: 200 },
      { kind: 'ellipse', x: 860, y: 120, rx: 90, ry: 52 },
    ],
    hazards: [],
    theme: MARSH,
  },
  {
    id: 'sundered', name: 'THE SUNDERED PASS', tag: 'EXPERT', tagColor: 0xff3355,
    blurb: 'Two breaches, two roads, one keep — and lava where you would want to build. 1.55× health.',
    hpMult: 1.55, goldMult: 1.15, shardMult: 1.9,
    tracks: [
      [
        { x: -40, y: 130 }, { x: 300, y: 130 }, { x: 300, y: 250 }, { x: 560, y: 250 },
        { x: 560, y: 330 }, { x: 680, y: 330 }, { x: 905, y: 330 },
      ],
      [
        { x: -40, y: 470 }, { x: 240, y: 470 }, { x: 240, y: 380 }, { x: 460, y: 380 },
        { x: 460, y: 470 }, { x: 680, y: 470 }, { x: 680, y: 330 }, { x: 905, y: 330 },
      ],
    ],
    water: [
      { kind: 'ellipse', x: 118, y: 300, rx: 70, ry: 56 },
      { kind: 'ellipse', x: 830, y: 468, rx: 82, ry: 50 },
    ],
    hazards: [
      { kind: 'ellipse', x: 440, y: 168, rx: 92, ry: 44 },
      { kind: 'river', pts: [{ x: 575, y: 580 }, { x: 586, y: 470 }, { x: 600, y: 410 }], hw: 18 },
      { kind: 'ellipse', x: 780, y: 160, rx: 70, ry: 60 },
      { kind: 'river', pts: [{ x: 360, y: 560 }, { x: 352, y: 470 }], hw: 14 },
    ],
    theme: VOLCANIC,
  },
];

export function getStrongholdMap(id: string | undefined): StrongholdMapDef {
  return STRONGHOLD_MAPS.find((m) => m.id === id) ?? STRONGHOLD_MAPS[0];
}

// ── Active map ──────────────────────────────────────────────────────

let ACTIVE_DEF: StrongholdMapDef = STRONGHOLD_MAPS[0];
let TRACKS: RoadTrack[] = ACTIVE_DEF.tracks.map((p) => new RoadTrack(p));

export function setActiveMap(def: StrongholdMapDef): void {
  ACTIVE_DEF = def;
  TRACKS = def.tracks.map((p) => new RoadTrack(p));
}

export function activeMap(): StrongholdMapDef { return ACTIVE_DEF; }
export function tracks(): RoadTrack[] { return TRACKS; }
export function track(i: number): RoadTrack { return TRACKS[Phaser.Math.Clamp(i, 0, TRACKS.length - 1)]; }
/** Where the keep stands — every road ends there. */
export function keepPoint(): Pt { return TRACKS[0].end; }

/** Distance from a point to the nearest road centre line. */
export function distToPath(x: number, y: number): number {
  let best = Infinity;
  for (const t of TRACKS) best = Math.min(best, t.nearest(x, y).dist);
  return best;
}

/** Closest road point to (x, y): which track and how far along it. */
export function nearestRoad(x: number, y: number): { track: number; along: number; dist: number } {
  let best = { track: 0, along: 0, dist: Infinity };
  TRACKS.forEach((t, i) => {
    const n = t.nearest(x, y);
    if (n.dist < best.dist) best = { track: i, along: n.along, dist: n.dist };
  });
  return best;
}

export function isWater(x: number, y: number, margin = 0): boolean {
  return ACTIVE_DEF.water.some((s) => shapeDepth(s, x, y) >= margin);
}

export function isHazard(x: number, y: number, margin = -14): boolean {
  return ACTIVE_DEF.hazards.some((s) => shapeDepth(s, x, y) >= margin);
}

export function inField(x: number, y: number): boolean {
  return x >= 24 && x <= 936 && y >= FIELD_TOP + 24 && y <= FIELD_BOTTOM - 24;
}

/** Deterministic scatter for the decorative layer. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ── Painting ────────────────────────────────────────────────────────

function fillShape(g: Phaser.GameObjects.Graphics, s: TerrainShape, grow: number): void {
  if (s.kind === 'ellipse') g.fillEllipse(s.x, s.y, (s.rx + grow) * 2, (s.ry + grow) * 2);
  else if (s.kind === 'rect') g.fillRect(s.x - grow, s.y - grow, s.w + grow * 2, s.h + grow * 2);
  else {
    const w = (s.hw + grow) * 2;
    for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(len / 6));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, w / 2);
      }
    }
  }
}

/** Random points inside a terrain shape, for ripples and bubbles. */
function samplePoints(s: TerrainShape, n: number, rand: () => number): Pt[] {
  const out: Pt[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 30) {
    let x: number, y: number;
    if (s.kind === 'ellipse') { x = s.x + (rand() * 2 - 1) * s.rx; y = s.y + (rand() * 2 - 1) * s.ry; }
    else if (s.kind === 'rect') { x = s.x + rand() * s.w; y = s.y + rand() * s.h; }
    else {
      const i = Math.floor(rand() * (s.pts.length - 1));
      const a = s.pts[i], b = s.pts[i + 1], t = rand();
      x = a.x + (b.x - a.x) * t + (rand() * 2 - 1) * s.hw; y = a.y + (b.y - a.y) * t + (rand() * 2 - 1) * s.hw;
    }
    if (shapeDepth(s, x, y) > 6 && y > FIELD_TOP && y < FIELD_BOTTOM && distToPath(x, y) > PATH_HALF_WIDTH + 4) out.push({ x, y });
  }
  return out;
}

/**
 * Paint the field: ground, water, hazards, every road, the breaches and the keep. Drawn once at
 * scene start. Depths: 0.5 ground, 0.8 terrain, 1 road, 1.5 props. Returns an animator that the
 * scene ticks for the ripples and the lava glow.
 */
export function drawMap(scene: Phaser.Scene): { animate: (time: number) => void } {
  const W = scene.scale.width;
  const def = ACTIVE_DEF;
  const th = def.theme;
  const rand = rng(7331 + def.id.length * 97);

  // ── Ground ────────────────────────────────────────────────────────
  const turf = scene.add.graphics().setDepth(0.5);
  turf.fillStyle(th.ground[0], 1);
  turf.fillRect(0, FIELD_TOP - 8, W, FIELD_BOTTOM - FIELD_TOP + 16);
  for (let i = 0; i < 120; i++) {
    const x = rand() * W, y = FIELD_TOP + rand() * (FIELD_BOTTOM - FIELD_TOP);
    turf.fillStyle(th.ground[1], 0.35 + rand() * 0.35);
    turf.fillEllipse(x, y, 30 + rand() * 60, 14 + rand() * 30);
  }
  if (th.decor === 'volcanic') {
    // Cracked basalt: dark fissures with a faint ember line in some.
    for (let i = 0; i < 70; i++) {
      let x = rand() * W, y = FIELD_TOP + rand() * (FIELD_BOTTOM - FIELD_TOP);
      const hot = rand() < 0.25;
      turf.lineStyle(hot ? 1.5 : 1, hot ? th.hazard.glow : 0x0a0809, hot ? 0.35 : 0.7);
      turf.beginPath(); turf.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (rand() - 0.5) * 26; y += (rand() - 0.5) * 18; turf.lineTo(x, y); }
      turf.strokePath();
    }
  } else {
    turf.lineStyle(1, th.blade, 0.5);
    for (let i = 0; i < 260; i++) {
      const x = rand() * W, y = FIELD_TOP + rand() * (FIELD_BOTTOM - FIELD_TOP);
      if (distToPath(x, y) < PATH_HALF_WIDTH + 6) continue;
      const h = (th.decor === 'marsh' ? 6 : 4) + rand() * 5;
      turf.lineBetween(x, y, x + (rand() - 0.5) * 4, y - h);
    }
  }
  for (let i = 0; i < 6; i++) {
    turf.fillStyle(0x000000, 0.08);
    turf.fillRect(0, FIELD_TOP - 8 + i * 3, W, 3);
    turf.fillRect(0, FIELD_BOTTOM + 8 - (i + 1) * 3, W, 3);
  }

  // ── Water and hazards ─────────────────────────────────────────────
  const terrain = scene.add.graphics().setDepth(0.8);
  for (const s of def.water) { terrain.fillStyle(mix(th.ground[0], 0x000000, 0.4), 1); fillShape(terrain, s, 6); }
  for (const s of def.water) { terrain.fillStyle(th.water.shallow, 1); fillShape(terrain, s, 0); }
  for (const s of def.water) { terrain.fillStyle(th.water.deep, 1); fillShape(terrain, s, -10); }
  for (const s of def.hazards) { terrain.fillStyle(0x140a08, 1); fillShape(terrain, s, 7); }
  for (const s of def.hazards) { terrain.fillStyle(th.hazard.deep, 1); fillShape(terrain, s, 0); }
  for (const s of def.hazards) { terrain.fillStyle(th.hazard.glow, 0.55); fillShape(terrain, s, -8); }
  for (const s of def.hazards) { terrain.fillStyle(0xffd27a, 0.35); fillShape(terrain, s, -16); }
  // Reeds and lily pads around the water's edge.
  if (th.decor !== 'volcanic') {
    for (const s of def.water) {
      for (const p of samplePoints(s, 8, rand)) {
        terrain.fillStyle(0x2f7a3a, 0.9); terrain.fillEllipse(p.x, p.y, 10, 6);
        terrain.fillStyle(th.water.deep, 1); terrain.fillTriangle(p.x, p.y, p.x + 5, p.y - 2, p.x + 5, p.y + 2);
      }
    }
  }
  const ripples: Array<Pt & { ph: number; kind: 'water' | 'lava' }> = [];
  for (const s of def.water) for (const p of samplePoints(s, 7, rand)) ripples.push({ ...p, ph: rand() * Math.PI * 2, kind: 'water' });
  for (const s of def.hazards) for (const p of samplePoints(s, 5, rand)) ripples.push({ ...p, ph: rand() * Math.PI * 2, kind: 'lava' });

  // ── Roads ─────────────────────────────────────────────────────────
  const road = scene.add.graphics().setDepth(1);
  const strokeTrack = (t: RoadTrack, w: number, color: number, alpha: number): void => {
    road.lineStyle(w, color, alpha);
    road.beginPath();
    road.moveTo(t.pts[0].x, t.pts[0].y);
    for (let i = 1; i < t.pts.length; i++) road.lineTo(t.pts[i].x, t.pts[i].y);
    road.strokePath();
    road.fillStyle(color, alpha);
    for (let i = 1; i < t.pts.length - 1; i++) road.fillCircle(t.pts[i].x, t.pts[i].y, w / 2);
  };
  for (const t of TRACKS) strokeTrack(t, PATH_HALF_WIDTH * 2 + 10, th.verge, 1);
  for (const t of TRACKS) strokeTrack(t, PATH_HALF_WIDTH * 2, th.road[0], 1);
  for (const t of TRACKS) strokeTrack(t, PATH_HALF_WIDTH * 2 - 10, th.road[1], 1);
  for (const t of TRACKS) {
    for (let d = 6; d < t.length; d += th.paving === 'plank' ? 11 : 9) {
      const p = t.pointAlong(d);
      const h = t.headingAlong(d);
      const wet = isWater(p.x, p.y, -4) || isHazard(p.x, p.y, -4);
      if (th.paving === 'plank' || wet) {
        // Boardwalk / bridge planks laid across the direction of travel, with rails over water.
        const hw = PATH_HALF_WIDTH - 3;
        road.lineStyle(7, mix(th.stone[0], th.stone[1], rand() * 0.5), 1);
        road.lineBetween(p.x - h.y * hw, p.y + h.x * hw, p.x + h.y * hw, p.y - h.x * hw);
        road.lineStyle(1, 0x1a120a, 0.6);
        road.lineBetween(p.x - h.y * hw + h.x * 4, p.y + h.x * hw + h.y * 4, p.x + h.y * hw + h.x * 4, p.y - h.x * hw + h.y * 4);
        if (wet) {
          road.fillStyle(0x2a1c10, 1);
          road.fillCircle(p.x - h.y * (hw + 4), p.y + h.x * (hw + 4), 3);
          road.fillCircle(p.x + h.y * (hw + 4), p.y - h.x * (hw + 4), 3);
        }
      } else {
        for (let k = -2; k <= 2; k++) {
          const off = k * 10 + (rand() - 0.5) * 4;
          const x = p.x - h.y * off, y = p.y + h.x * off;
          road.fillStyle(mix(th.stone[0], th.stone[1], rand()), 0.9);
          if (th.paving === 'basalt') road.fillRect(x - 3.5, y - 3, 7 + rand() * 2, 6);
          else road.fillEllipse(x, y, 5 + rand() * 3, 4 + rand() * 2);
        }
      }
    }
    road.lineStyle(2, th.chevron, 0.28);
    for (let d = 60; d < t.length - 40; d += 110) {
      const p = t.pointAlong(d);
      const h = t.headingAlong(d);
      const bx = p.x - h.x * 6, by = p.y - h.y * 6;
      road.lineBetween(bx - h.y * 7, by + h.x * 7, p.x + h.x * 6, p.y + h.y * 6);
      road.lineBetween(bx + h.y * 7, by - h.x * 7, p.x + h.x * 6, p.y + h.y * 6);
    }
  }

  // ── Props ─────────────────────────────────────────────────────────
  const props = scene.add.graphics().setDepth(1.5);
  // A breach where each road enters: a broken arch the road pours out of.
  TRACKS.forEach((t, i) => {
    let d = 0;
    const p = { x: 0, y: 0 };
    while (d < t.length) { t.pointAlong(d, p); if (p.x >= 0 && p.y >= FIELD_TOP) break; d += 4; }
    const h = t.headingAlong(d);
    const gx = p.x, gy = p.y;
    const nx = -h.y, ny = h.x; // across the road
    const half = 44;
    props.fillStyle(0x1a1420, 1);
    props.fillPoints([
      { x: gx + nx * half, y: gy + ny * half }, { x: gx + nx * half + h.x * 26, y: gy + ny * half + h.y * 26 },
      { x: gx - nx * half + h.x * 26, y: gy - ny * half + h.y * 26 }, { x: gx - nx * half, y: gy - ny * half },
    ], true);
    props.lineStyle(3, C.corrupt, 0.8);
    props.strokePoints([
      { x: gx + nx * half, y: gy + ny * half }, { x: gx + nx * half + h.x * 26, y: gy + ny * half + h.y * 26 },
      { x: gx - nx * half + h.x * 26, y: gy - ny * half + h.y * 26 }, { x: gx - nx * half, y: gy - ny * half },
    ], true);
    for (let k = 0; k < 5; k++) {
      const o = -36 + k * 18;
      props.lineStyle(1.5, C.corrupt, 0.35 + k * 0.1);
      props.lineBetween(gx + nx * o + h.x * 26, gy + ny * o + h.y * 26, gx + nx * (o + 6) + h.x * (40 + k * 6), gy + ny * (o + 6) + h.y * (40 + k * 6));
    }
    if (TRACKS.length > 1) {
      // Number the breaches so "the north road" means something.
      props.fillStyle(C.corrupt, 0.9);
      props.fillCircle(gx + h.x * 14 + nx * (half + 10), gy + h.y * 14 + ny * (half + 10), 7);
      props.fillStyle(0x000000, 0.9);
      for (let k = 0; k <= i; k++) props.fillCircle(gx + h.x * 14 + nx * (half + 10) + (k - i / 2) * 4, gy + h.y * 14 + ny * (half + 10), 1.4);
    }
  });

  // The keep: a stone tower with a banner at the road's end.
  const k = keepPoint();
  const kx = k.x - 26;
  props.fillStyle(0x000000, 0.35);
  props.fillEllipse(k.x + 10, k.y + 44, 110, 26);
  const wall = th.decor === 'volcanic' ? 0x4a4450 : 0x56576a;
  props.fillStyle(wall, 1);
  props.fillRect(kx, k.y - 60, 72, 100);
  props.fillStyle(mix(wall, 0xffffff, 0.12), 1);
  props.fillRect(kx, k.y - 60, 72, 10);
  for (let i = 0; i < 4; i++) { props.fillStyle(mix(wall, 0xffffff, 0.2), 1); props.fillRect(kx + i * 20, k.y - 70, 12, 12); }
  props.fillStyle(0x2a2a38, 1);
  props.fillRect(k.x - 2, k.y - 10, 24, 50);
  props.fillStyle(0x151520, 1);
  props.fillRect(kx + 14, k.y - 40, 8, 14); props.fillRect(kx + 50, k.y - 40, 8, 14);
  props.lineStyle(1, mix(wall, 0x000000, 0.3), 0.7);
  for (let y = k.y - 48; y < k.y + 40; y += 12) props.lineBetween(kx, y, kx + 72, y);
  props.fillStyle(C.gold, 1);
  props.fillTriangle(k.x + 10, k.y - 112, k.x + 10, k.y - 72, k.x + 36, k.y - 92);
  props.lineStyle(2, 0xcfbf98, 1);
  props.lineBetween(k.x + 10, k.y - 118, k.x + 10, k.y - 60);

  // Scenery, kept off the roads, the water and the tower lanes near them.
  for (let i = 0; i < 30; i++) {
    const x = 40 + rand() * (W - 80), y = FIELD_TOP + 30 + rand() * (FIELD_BOTTOM - FIELD_TOP - 60);
    if (distToPath(x, y) < TOWER_PATH_CLEARANCE + 40) continue;
    if (isWater(x, y, -12) || isHazard(x, y, -20)) continue;
    if (Math.hypot(x - k.x - 10, y - k.y) < 90) continue;
    const roll = rand();
    if (th.decor === 'meadow') {
      if (roll < 0.65) {
        props.fillStyle(0x000000, 0.25); props.fillEllipse(x + 3, y + 8, 22, 9);
        props.fillStyle(0x3a2a1a, 1); props.fillRect(x - 2, y - 4, 4, 12);
        props.fillStyle(0x1d4a26, 1); props.fillCircle(x, y - 10, 12);
        props.fillStyle(0x2d6b35, 1); props.fillCircle(x - 3, y - 13, 7);
      } else {
        props.fillStyle(0x000000, 0.25); props.fillEllipse(x + 2, y + 5, 20, 8);
        props.fillStyle(0x5f6270, 1); props.fillEllipse(x, y, 16, 11);
        props.fillStyle(0x7a7d8c, 1); props.fillEllipse(x - 3, y - 3, 7, 4);
      }
    } else if (th.decor === 'marsh') {
      if (roll < 0.45) {
        // A stack of crates.
        props.fillStyle(0x000000, 0.25); props.fillEllipse(x + 2, y + 8, 26, 8);
        props.fillStyle(0x6e5236, 1); props.fillRect(x - 10, y - 6, 20, 14);
        props.lineStyle(1, 0x3a2a18, 1); props.strokeRect(x - 10, y - 6, 20, 14); props.lineBetween(x - 10, y - 6, x + 10, y + 8);
      } else if (roll < 0.75) {
        // A mooring post with rope.
        props.fillStyle(0x000000, 0.25); props.fillEllipse(x + 2, y + 6, 12, 5);
        props.fillStyle(0x4a3422, 1); props.fillRect(x - 3, y - 12, 6, 18);
        props.lineStyle(2, 0xc8b07a, 0.9); props.strokeCircle(x, y - 4, 4);
      } else {
        // Cattails.
        for (let c = 0; c < 4; c++) {
          const cx = x + (c - 1.5) * 4;
          props.lineStyle(1.5, 0x5b7a52, 1); props.lineBetween(cx, y + 6, cx + (c - 1.5), y - 10);
          props.fillStyle(0x5a3a22, 1); props.fillEllipse(cx + (c - 1.5), y - 10, 3, 7);
        }
      }
    } else {
      if (roll < 0.55) {
        // Obsidian spire.
        props.fillStyle(0x000000, 0.3); props.fillEllipse(x + 2, y + 6, 20, 7);
        props.fillStyle(0x15121a, 1); props.fillTriangle(x - 8, y + 6, x + 8, y + 6, x + 1, y - 20);
        props.fillStyle(0x3a3448, 1); props.fillTriangle(x - 2, y + 4, x + 3, y + 4, x + 1, y - 16);
      } else {
        // Smouldering vent.
        props.fillStyle(0x0c0a0b, 1); props.fillEllipse(x, y, 18, 9);
        props.fillStyle(th.hazard.glow, 0.6); props.fillEllipse(x, y, 8, 4);
      }
    }
  }

  // ── Animator: ripples on the water, bubbles in the lava ─────────
  const anim = scene.add.graphics().setDepth(0.9);
  const animate = (time: number): void => {
    anim.clear();
    for (const r of ripples) {
      const p = ((time / 1800 + r.ph) % 1);
      if (r.kind === 'water') {
        anim.lineStyle(1, th.water.foam, 0.35 * (1 - p));
        anim.strokeEllipse(r.x, r.y, 6 + p * 22, 3 + p * 10);
      } else {
        anim.fillStyle(0xffd27a, 0.55 * (1 - p));
        anim.fillCircle(r.x, r.y - p * 4, 2 + Math.sin(p * Math.PI) * 4);
      }
    }
  };
  return { animate };
}
