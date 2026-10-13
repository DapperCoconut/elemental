import Phaser from 'phaser';
import { C, mix } from '../ui';

/**
 * The one Stronghold map: a cobbled road that snakes from the breach on the left to the keep
 * on the right. Husks walk it; towers stand beside it.
 *
 * Everything is expressed in the 960×640 logical space. The HUD owns the top band and the
 * build tray owns the bottom one, so the field proper runs from `FIELD_TOP` to `FIELD_BOTTOM`.
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

/** The road, as the centre line husks follow. Starts off-screen left, ends at the keep. */
export const PATH: Pt[] = [
  { x: -40, y: 150 },
  { x: 180, y: 150 },
  { x: 180, y: 400 },
  { x: 400, y: 400 },
  { x: 400, y: 130 },
  { x: 620, y: 130 },
  { x: 620, y: 470 },
  { x: 800, y: 470 },
  { x: 800, y: 290 },
  { x: 905, y: 290 },
];

/** Where the keep stands — the road's last point. */
export const KEEP: Pt = PATH[PATH.length - 1];
export const GATE: Pt = PATH[0];

const SEG_LEN: number[] = [];
let TOTAL = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const l = Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y);
  SEG_LEN.push(l);
  TOTAL += l;
}
export const PATH_LENGTH = TOTAL;

/** A point `dist` px along the road from the gate. Clamped to the road's ends. */
export function pointAlong(dist: number, out: Pt = { x: 0, y: 0 }): Pt {
  let d = Phaser.Math.Clamp(dist, 0, TOTAL);
  for (let i = 0; i < SEG_LEN.length; i++) {
    if (d <= SEG_LEN[i] || i === SEG_LEN.length - 1) {
      const t = SEG_LEN[i] > 0 ? d / SEG_LEN[i] : 0;
      out.x = PATH[i].x + (PATH[i + 1].x - PATH[i].x) * t;
      out.y = PATH[i].y + (PATH[i + 1].y - PATH[i].y) * t;
      return out;
    }
    d -= SEG_LEN[i];
  }
  out.x = KEEP.x; out.y = KEEP.y;
  return out;
}

/** Unit direction of travel at `dist` along the road. */
export function headingAlong(dist: number): Pt {
  let d = Phaser.Math.Clamp(dist, 0, TOTAL - 0.01);
  for (let i = 0; i < SEG_LEN.length; i++) {
    if (d <= SEG_LEN[i]) {
      const dx = PATH[i + 1].x - PATH[i].x, dy = PATH[i + 1].y - PATH[i].y;
      const l = SEG_LEN[i] || 1;
      return { x: dx / l, y: dy / l };
    }
    d -= SEG_LEN[i];
  }
  return { x: 1, y: 0 };
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Distance from a point to the road's centre line. */
export function distToPath(x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) {
    best = Math.min(best, segDist(x, y, PATH[i].x, PATH[i].y, PATH[i + 1].x, PATH[i + 1].y));
  }
  return best;
}

/** Road distance of the closest point on the road to (x, y) — used to park summons on the path. */
export function nearestPathDist(x: number, y: number): number {
  let best = Infinity;
  let bestD = 0;
  let acc = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const ax = PATH[i].x, ay = PATH[i].y, bx = PATH[i + 1].x, by = PATH[i + 1].y;
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Phaser.Math.Clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
    if (d < best) { best = d; bestD = acc + t * SEG_LEN[i]; }
    acc += SEG_LEN[i];
  }
  return bestD;
}

export function inField(x: number, y: number): boolean {
  return x >= 24 && x <= 936 && y >= FIELD_TOP + 24 && y <= FIELD_BOTTOM - 24;
}

/** Deterministic scatter for the decorative layer. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Paint the field: turf, the road, the breach gate and the keep. One Graphics each, drawn
 * once at scene start. Depths: 0.5 turf, 1 road, 1.5 props.
 */
export function drawMap(scene: Phaser.Scene): { turf: Phaser.GameObjects.Graphics; road: Phaser.GameObjects.Graphics; props: Phaser.GameObjects.Graphics } {
  const W = scene.scale.width;
  const rand = rng(7331);

  // ── Turf ──────────────────────────────────────────────────────────
  const turf = scene.add.graphics().setDepth(0.5);
  const grassA = 0x1f3a24, grassB = 0x24452b;
  turf.fillStyle(grassA, 1);
  turf.fillRect(0, FIELD_TOP - 8, W, FIELD_BOTTOM - FIELD_TOP + 16);
  // Mottling: soft blotches of the lighter green.
  for (let i = 0; i < 120; i++) {
    const x = rand() * W, y = FIELD_TOP + rand() * (FIELD_BOTTOM - FIELD_TOP);
    turf.fillStyle(grassB, 0.35 + rand() * 0.35);
    turf.fillEllipse(x, y, 30 + rand() * 60, 14 + rand() * 30);
  }
  // Grass blades.
  turf.lineStyle(1, 0x3d6a40, 0.5);
  for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = FIELD_TOP + rand() * (FIELD_BOTTOM - FIELD_TOP);
    if (distToPath(x, y) < PATH_HALF_WIDTH + 6) continue;
    const h = 4 + rand() * 5;
    turf.lineBetween(x, y, x + (rand() - 0.5) * 4, y - h);
  }
  // A vignette toward the HUD bands so the field reads as its own plate.
  for (let i = 0; i < 6; i++) {
    turf.fillStyle(0x000000, 0.08);
    turf.fillRect(0, FIELD_TOP - 8 + i * 3, W, 3);
    turf.fillRect(0, FIELD_BOTTOM + 8 - (i + 1) * 3, W, 3);
  }

  // ── Road ──────────────────────────────────────────────────────────
  const road = scene.add.graphics().setDepth(1);
  const strokePath = (w: number, color: number, alpha: number): void => {
    road.lineStyle(w, color, alpha);
    road.beginPath();
    road.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) road.lineTo(PATH[i].x, PATH[i].y);
    road.strokePath();
    // Round the corners: a disc at every joint hides the mitre.
    road.fillStyle(color, alpha);
    for (let i = 1; i < PATH.length - 1; i++) road.fillCircle(PATH[i].x, PATH[i].y, w / 2);
  };
  strokePath(PATH_HALF_WIDTH * 2 + 10, 0x2a2418, 1);   // verge shadow
  strokePath(PATH_HALF_WIDTH * 2, 0x5a4d3a, 1);        // packed earth
  strokePath(PATH_HALF_WIDTH * 2 - 10, 0x6b5d47, 1);   // worn centre
  // Cobbles: small rounded stones scattered along the centre line.
  for (let d = 10; d < PATH_LENGTH; d += 9) {
    const p = pointAlong(d);
    const h = headingAlong(d);
    for (let k = -2; k <= 2; k++) {
      const off = k * 10 + (rand() - 0.5) * 4;
      const x = p.x - h.y * off, y = p.y + h.x * off;
      road.fillStyle(mix(0x7a6b52, 0x4a3f2e, rand()), 0.9);
      road.fillEllipse(x, y, 5 + rand() * 3, 4 + rand() * 2);
    }
  }
  // Direction chevrons so the flow reads at a glance.
  road.lineStyle(2, 0xcfbf98, 0.28);
  for (let d = 60; d < PATH_LENGTH - 40; d += 110) {
    const p = pointAlong(d);
    const h = headingAlong(d);
    const bx = p.x - h.x * 6, by = p.y - h.y * 6;
    road.lineBetween(bx - h.y * 7, by + h.x * 7, p.x + h.x * 6, p.y + h.y * 6);
    road.lineBetween(bx + h.y * 7, by - h.x * 7, p.x + h.x * 6, p.y + h.y * 6);
  }

  // ── Props ─────────────────────────────────────────────────────────
  const props = scene.add.graphics().setDepth(1.5);
  // The breach: a broken arch at the left edge the road pours out of.
  const g = GATE;
  props.fillStyle(0x1a1420, 1);
  props.fillRect(0, g.y - 44, 26, 88);
  props.fillStyle(0x3a2f45, 1);
  props.fillRect(0, g.y - 50, 20, 14);
  props.fillRect(0, g.y + 36, 20, 14);
  props.lineStyle(3, C.corrupt, 0.8);
  props.strokeRect(0, g.y - 44, 26, 88);
  for (let i = 0; i < 5; i++) {
    props.lineStyle(1.5, C.corrupt, 0.35 + i * 0.1);
    props.lineBetween(26, g.y - 36 + i * 18, 40 + i * 6, g.y - 30 + i * 18);
  }

  // The keep: a stone tower with a banner at the road's end. Its door sits on the road's
  // last point; the body is kept inside the right edge.
  const k = KEEP;
  const kx = k.x - 26;
  props.fillStyle(0x000000, 0.35);
  props.fillEllipse(k.x + 10, k.y + 44, 110, 26);
  props.fillStyle(0x56576a, 1);
  props.fillRect(kx, k.y - 60, 72, 100);
  props.fillStyle(0x6c6d82, 1);
  props.fillRect(kx, k.y - 60, 72, 10);
  for (let i = 0; i < 4; i++) { props.fillStyle(0x7d7e95, 1); props.fillRect(kx + i * 20, k.y - 70, 12, 12); }
  props.fillStyle(0x2a2a38, 1);
  props.fillRect(k.x - 2, k.y - 10, 24, 50); // the door
  props.fillStyle(0x151520, 1);
  props.fillRect(kx + 14, k.y - 40, 8, 14); props.fillRect(kx + 50, k.y - 40, 8, 14);
  // Mortar lines.
  props.lineStyle(1, 0x3f4052, 0.7);
  for (let y = k.y - 48; y < k.y + 40; y += 12) props.lineBetween(kx, y, kx + 72, y);
  // Banner.
  props.fillStyle(C.gold, 1);
  props.fillTriangle(k.x + 10, k.y - 112, k.x + 10, k.y - 72, k.x + 36, k.y - 92);
  props.lineStyle(2, 0xcfbf98, 1);
  props.lineBetween(k.x + 10, k.y - 118, k.x + 10, k.y - 60);

  // Trees and rocks, kept off the road and out of the tower lanes near it.
  for (let i = 0; i < 26; i++) {
    const x = 40 + rand() * (W - 80), y = FIELD_TOP + 30 + rand() * (FIELD_BOTTOM - FIELD_TOP - 60);
    if (distToPath(x, y) < TOWER_PATH_CLEARANCE + 40) continue;
    if (Math.hypot(x - k.x - 10, y - k.y) < 90) continue;
    if (rand() < 0.65) {
      props.fillStyle(0x000000, 0.25); props.fillEllipse(x + 3, y + 8, 22, 9);
      props.fillStyle(0x3a2a1a, 1); props.fillRect(x - 2, y - 4, 4, 12);
      props.fillStyle(0x1d4a26, 1); props.fillCircle(x, y - 10, 12);
      props.fillStyle(0x2d6b35, 1); props.fillCircle(x - 3, y - 13, 7);
    } else {
      props.fillStyle(0x000000, 0.25); props.fillEllipse(x + 2, y + 5, 20, 8);
      props.fillStyle(0x5f6270, 1); props.fillEllipse(x, y, 16, 11);
      props.fillStyle(0x7a7d8c, 1); props.fillEllipse(x - 3, y - 3, 7, 4);
    }
  }

  return { turf, road, props };
}
