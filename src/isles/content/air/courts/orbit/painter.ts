import Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { G, blob, dim, groundFill, lit, mulberry, shadow, stroke } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_DEEP, BRASS_LIT, CLIFF, CLIFF_DARK, COPPER, COPPER_LIT, ENAMEL,
  ENAMEL_SHADE, GROUT, IRON, IRON_DARK, IRON_LIT, LAMPLIGHT, LODE, LODE_GLINT, LODE_MID, LODE_SHEEN, LODE_WASH,
  METER, NAVY, NAVY_DARK, NAVY_LIT, PAVE, PAVE_LIT, POOL, POOL_DEEP, POOL_LIT, SKY, SKY_DEEP, SKY_PALE, STONE,
  STONE_DARK, STONE_LIT, TURF, TURF_DARK, TURF_LIT, VERD, VERD_DARK,
} from './palette';
import {
  ANCHORS, ARCHIVE, AREA_H, AREA_W, CRADLE_R, E_BRIDGES, EDGE_N, EDGE_S, GULF_E, GULF_S, GULF_W, HOOPS, HOUSES, LAMPS,
  MANOR, MOON, NORTH_GAP, OrbHouse, ORRERY, PINES, POOL_AT, POOL_CRADLE, RING, ROADS, S_BRIDGES, SHOP, W_BRIDGES,
  ZEROG,
} from './layout';
import {
  breathMeter, chain, chainLite, clockFace, cloudPuff, dashedEllipse, filings, gear, hoop, inView, lodestone, pebble,
  planet,
} from './orbitArt';

/**
 * The Orbit Court — a brass orrery town hung in the sky round a black moon.
 *
 * Nothing here is drawn like anywhere else on the isles:
 * • There is no ground between places. The court is four islets of grey-violet rock with the
 *   cloud-sea a mile under them; gulfs of open sky run between the islets, crossed by plank
 *   bridges slung on chain, and the islets' cliff-faces hang down into the blue like upturned
 *   mountains.
 * • The Lodestone hovers over the middle islet: a black moon with a violet rim, held over an iron
 *   cradle, ringed by the brass-plated Ring-Street. Iron chains run from it to bollards on every
 *   islet — the tethers that hold the town in its orbit.
 * • Everything leans toward the moon. Lamp-posts, pines and the houses themselves are sheared
 *   toward it; weathervanes point at it; every iron filing in the paving is combed toward it,
 *   and dust drifts sideways across the town to fall into it.
 * • Houses are cream enamel and brass under navy domes and copper cones, each with a clock for
 *   a window and the King's red-needled breath-meter by the door.
 */

const CENTRE: Pt = { x: MOON.x, y: MOON.y };
/** Where the moon's sphere hangs on screen. */
const SPHERE: Pt = { x: MOON.x, y: MOON.y - MOON.lift };

/** How far a vertical thing at x leans toward the moon (px of top shift per px of height). */
const leanAt = (x: number): number => Phaser.Math.Clamp((MOON.x - x) / 2600, -0.28, 0.28);
/** Angle from a ground point toward the moon's foot. */
const toMoon = (x: number, y: number): number => Math.atan2(CENTRE.y - y, CENTRE.x - x);

/** The walkable islets, as rects. */
const ISLETS: { r: Rect; cliff: boolean; seed: number }[] = [
  { r: { x: 0, y: EDGE_N, w: GULF_W.x, h: EDGE_S - EDGE_N }, cliff: true, seed: 1 },
  { r: { x: GULF_W.x + GULF_W.w, y: EDGE_N, w: GULF_E.x - GULF_W.x - GULF_W.w, h: GULF_S.y - EDGE_N }, cliff: true, seed: 2 },
  { r: { x: GULF_E.x + GULF_E.w, y: EDGE_N, w: AREA_W - GULF_E.x - GULF_E.w, h: GULF_S.y - EDGE_N }, cliff: true, seed: 3 },
  { r: { x: GULF_W.x + GULF_W.w, y: GULF_S.y + GULF_S.h, w: AREA_W - GULF_W.x - GULF_W.w, h: EDGE_S - GULF_S.y - GULF_S.h }, cliff: true, seed: 4 },
];

/** The open sky, for cloud drift: the gulfs and the bands top and bottom. */
const SKIES: Rect[] = [
  { x: 0, y: 0, w: AREA_W, h: EDGE_N },
  { x: 0, y: EDGE_S, w: AREA_W, h: AREA_H - EDGE_S },
  { x: GULF_W.x, y: EDGE_N, w: GULF_W.w, h: EDGE_S - EDGE_N },
  { x: GULF_E.x, y: EDGE_N, w: GULF_E.w, h: GULF_S.y - EDGE_N },
  { x: GULF_W.x + GULF_W.w, y: GULF_S.y, w: AREA_W - GULF_W.x - GULF_W.w, h: GULF_S.h },
];

// ── Ground ──────────────────────────────────────────────────────────────

/** The cloud-sea far below: blue, banded, with soft cloud drifts. */
function skyBelow(g: G, rng: () => number): void {
  g.fillStyle(SKY, 1); g.fillRect(0, 0, AREA_W, AREA_H);
  for (let i = 0; i < 40; i++) {
    g.fillStyle(rng() < 0.5 ? SKY_DEEP : SKY_PALE, 0.18);
    g.fillEllipse(rng() * AREA_W, rng() * AREA_H, 300 + rng() * 500, 30 + rng() * 60);
  }
  for (let i = 0; i < 90; i++) cloudPuff(g, rng() * AREA_W, rng() * AREA_H, 14 + rng() * 26, 0.35 + rng() * 0.3, i);
}

/** An islet: its shadow on the clouds, its hanging cliff, a ragged rim, and the stone top. */
function islet(g: G, r: Rect, cliff: boolean, rng: () => number): void {
  g.fillStyle(SKY_DEEP, 0.28); g.fillRoundedRect(r.x + 30, r.y + 90, r.w, r.h, 40);
  if (cliff) {
    // The underside: an upturned mountain of strata hanging into the sky.
    const by = r.y + r.h;
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(r.x, by)];
    const steps = Math.max(4, Math.floor(r.w / 40));
    for (let i = 0; i <= steps; i++) {
      const x = r.x + (i / steps) * r.w;
      const mid = 1 - Math.abs(i / steps - 0.5) * 2;
      pts.push(new Phaser.Geom.Point(x, by + 18 + mid * 50 + rng() * 22));
    }
    pts.push(new Phaser.Geom.Point(r.x + r.w, by));
    g.fillStyle(CLIFF_DARK, 1); g.fillPoints(pts, true, true);
    g.fillStyle(CLIFF, 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x, by + (p.y - by) * 0.72)), true, true);
    for (let k = 0; k < 3; k++) {
      g.lineStyle(2, CLIFF_DARK, 0.6);
      g.beginPath(); g.moveTo(r.x + 6, by + 10 + k * 12);
      for (let x = r.x; x <= r.x + r.w; x += 30) g.lineTo(x, by + 10 + k * 12 + Math.sin(x * 0.03 + k) * 4);
      g.strokePath();
    }
    // Roots and old chain hanging off the underside.
    for (let x = r.x + 20; x < r.x + r.w - 20; x += 70 + rng() * 90) {
      g.lineStyle(2, rng() < 0.3 ? IRON : TURF_DARK, 0.8);
      g.lineBetween(x, by + 20, x + (rng() - 0.5) * 10, by + 50 + rng() * 40);
    }
  }
  // The rim: lumps of rock spilling a little over every edge.
  g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 10, 26);
  g.fillStyle(STONE, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 24);
  for (let x = r.x + 10; x < r.x + r.w; x += 34) {
    blob(g, x, r.y + 4, 16, 6, STONE_LIT, 0.8, rng, 6);
    blob(g, x + 10, r.y + r.h - 2, 18, 7, STONE_DARK, 0.9, rng, 6);
  }
  groundFill(g, { x: r.x + 10, y: r.y + 10, w: r.w - 20, h: r.h - 20 }, STONE, STONE_LIT, STONE_DARK, rng, 0.8);
}

/** A paved road with brass kerbs and cross-joints. */
function pavedRoad(g: G, pts: Pt[], w: number): void {
  stroke(g, pts, w + 8, GROUT, 1);
  stroke(g, pts, w, PAVE, 1);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1) continue;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = -uy, ny = ux;
    for (const side of [-1, 1]) {
      g.lineStyle(2, BRASS_DARK, 0.9);
      g.lineBetween(a.x + nx * (w / 2) * side, a.y + ny * (w / 2) * side, b.x + nx * (w / 2) * side, b.y + ny * (w / 2) * side);
      g.lineStyle(1, BRASS_LIT, 0.4);
      g.lineBetween(a.x + nx * (w / 2 - 2) * side, a.y + ny * (w / 2 - 2) * side, b.x + nx * (w / 2 - 2) * side, b.y + ny * (w / 2 - 2) * side);
    }
    for (let d = 14; d < len; d += 26) {
      const cx = a.x + ux * d, cy = a.y + uy * d;
      g.lineStyle(1, GROUT, 0.55); g.lineBetween(cx - nx * (w / 2 - 3), cy - ny * (w / 2 - 3), cx + nx * (w / 2 - 3), cy + ny * (w / 2 - 3));
    }
  }
}

/** The Ring-Street and the Well inside it, where the moon's foot is. */
function ringStreet(g: G, rng: () => number): void {
  // The Well: a disc of filing-dark stone grooved in rings, everything combed to the middle.
  g.fillStyle(LODE_MID, 0.5); g.fillEllipse(RING.x, RING.y, (RING.rx - 40) * 2, (RING.ry - 34) * 2);
  for (let k = 1; k <= 5; k++) { g.lineStyle(1.5, LODE_SHEEN, 0.5); g.strokeEllipse(RING.x, RING.y, (RING.rx - 40) * 2 * (k / 5), (RING.ry - 34) * 2 * (k / 5)); }
  for (let i = 0; i < 240; i++) {
    const a = rng() * Math.PI * 2, d = 0.25 + rng() * 0.72;
    const x = RING.x + Math.cos(a) * (RING.rx - 40) * d, y = RING.y + Math.sin(a) * (RING.ry - 34) * d;
    filings(g, x, y, toMoon(x, y), 5 + rng() * 6, 0.55);
  }
  // The street: a brass-kerbed paved band all the way round.
  g.lineStyle(84, GROUT, 1); g.strokeEllipse(RING.x, RING.y, RING.rx * 2, RING.ry * 2);
  g.lineStyle(74, PAVE, 1); g.strokeEllipse(RING.x, RING.y, RING.rx * 2, RING.ry * 2);
  for (const off of [-37, 37]) {
    g.lineStyle(3, BRASS_DARK, 1); g.strokeEllipse(RING.x, RING.y, (RING.rx + off) * 2, (RING.ry + off) * 2);
    g.lineStyle(1, BRASS_LIT, 0.5); g.strokeEllipse(RING.x, RING.y - 1, (RING.rx + off) * 2, (RING.ry + off) * 2);
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    g.lineStyle(1, GROUT, 0.6);
    g.lineBetween(RING.x + Math.cos(a) * (RING.rx - 34), RING.y + Math.sin(a) * (RING.ry - 34), RING.x + Math.cos(a) * (RING.rx + 34), RING.y + Math.sin(a) * (RING.ry + 34));
  }
  // Twelve brass plaques round the street — one for each month's perigee.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = RING.x + Math.cos(a) * RING.rx, y = RING.y + Math.sin(a) * RING.ry;
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y + 1, 22, 13);
    g.fillStyle(BRASS, 1); g.fillEllipse(x, y, 20, 11);
    g.fillStyle(LODE, 0.8); g.fillCircle(x - 3 + (i % 3) * 3, y, 3);
  }
}

/** A plank bridge slung on chain over a gulf. `vertical` runs north–south. */
function chainBridge(g: G, x0: number, y0: number, x1: number, y1: number, vertical: boolean): void {
  // Its shadow far below on the clouds.
  g.fillStyle(SKY_DEEP, 0.25); g.fillRect(x0 + 24, y0 + 60, x1 - x0, y1 - y0);
  g.fillStyle(0x000000, 0.35); g.fillRect(x0 + 3, y0 + 5, x1 - x0, y1 - y0);
  if (vertical) {
    for (let y = y0; y < y1; y += 11) {
      g.fillStyle(Math.floor(y / 11) % 4 === 0 ? BRASS_DEEP : 0x7a5a38, 1); g.fillRect(x0, y, x1 - x0, 9);
      g.fillStyle(0xa8845a, 0.4); g.fillRect(x0, y, x1 - x0, 2);
    }
    chain(g, { x: x0 + 2, y: y0 }, { x: x0 + 2, y: y1 }, 0, 1, 10);
    chain(g, { x: x1 - 2, y: y0 }, { x: x1 - 2, y: y1 }, 0, 1, 10);
  } else {
    for (let x = x0; x < x1; x += 11) {
      g.fillStyle(Math.floor(x / 11) % 4 === 0 ? BRASS_DEEP : 0x7a5a38, 1); g.fillRect(x, y0, 9, y1 - y0);
      g.fillStyle(0xa8845a, 0.4); g.fillRect(x, y0, 2, y1 - y0);
    }
    chain(g, { x: x0, y: y0 + 2 }, { x: x1, y: y0 + 2 }, 6, 1, 10);
    chain(g, { x: x0, y: y1 - 2 }, { x: x1, y: y1 - 2 }, 6, 1, 10);
  }
}

/** Tycho's yard: a brass dial inlaid in the paving round the Great Orrery's post. */
function orreryYard(g: G): void {
  g.fillStyle(PAVE_LIT, 0.6); g.fillEllipse(ORRERY.x, ORRERY.y + 10, 300, 180);
  for (let k = 1; k <= 3; k++) {
    g.lineStyle(2, BRASS_DARK, 0.9); g.strokeEllipse(ORRERY.x, ORRERY.y + 10, 90 * k, 54 * k);
    g.lineStyle(1, BRASS_LIT, 0.5); g.strokeEllipse(ORRERY.x, ORRERY.y + 9, 90 * k, 54 * k);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineStyle(2, BRASS, 0.8);
    g.lineBetween(ORRERY.x + Math.cos(a) * 140, ORRERY.y + 10 + Math.sin(a) * 84, ORRERY.x + Math.cos(a) * 152, ORRERY.y + 10 + Math.sin(a) * 91);
  }
}

/** Lofty's yard: a verdigris ring painted on the paving, the "0 G" stencil, a rail of posts. */
function zeroGYard(g: G): void {
  g.fillStyle(PAVE, 1); g.fillCircle(ZEROG.x, ZEROG.y, ZEROG.r + 20);
  g.fillStyle(VERD_DARK, 0.25); g.fillCircle(ZEROG.x, ZEROG.y, ZEROG.r);
  dashedEllipse(g, ZEROG.x, ZEROG.y, ZEROG.r, ZEROG.r, 28, 0, 4, VERD, 0.9);
  g.lineStyle(5, VERD, 0.6);
  g.strokeEllipse(ZEROG.x - 20, ZEROG.y, 22, 32);
  g.beginPath(); g.arc(ZEROG.x + 20, ZEROG.y, 15, Math.PI * 1.75, Math.PI * 1.45, false); g.strokePath();
  g.lineBetween(ZEROG.x + 20, ZEROG.y, ZEROG.x + 34, ZEROG.y);
}

/** The Archive forecourt: slate laid in a spiral, falling in to a round iron plate. */
function archiveCourt(g: G): void {
  const cx = ARCHIVE.x, cy = ARCHIVE.y - 70;
  g.fillStyle(LODE_MID, 0.7); g.fillEllipse(cx, cy, 340, 120);
  g.lineStyle(2, LODE_SHEEN, 0.8);
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 6, r = 1 - i / 120;
    const x = cx + Math.cos(a) * 160 * r, y = cy + Math.sin(a) * 54 * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  g.fillStyle(IRON, 1); g.fillEllipse(cx, cy, 30, 12);
  g.fillStyle(LODE, 1); g.fillEllipse(cx, cy, 18, 7);
}

// ── Set pieces ──────────────────────────────────────────────────────────

/** A quad from a base line up a height, sheared by `lean`: returns its four corners. */
function sheared(x: number, y: number, w: number, h: number, lean: number): Phaser.Geom.Point[] {
  return [
    new Phaser.Geom.Point(x - w / 2, y), new Phaser.Geom.Point(x + w / 2, y),
    new Phaser.Geom.Point(x + w / 2 + lean * h, y - h), new Phaser.Geom.Point(x - w / 2 + lean * h, y - h),
  ];
}

function drawHouse(g: G, hs: OrbHouse, rng: () => number): void {
  const { x, y, w, h } = hs;
  const ln = leanAt(x);
  const sx = (k: number): number => x + ln * h * k;
  shadow(g, x, y + 3, w * 1.2, 20);
  // Walls: cream enamel with brass banding at the floors.
  g.fillStyle(ENAMEL_SHADE, 1); g.fillPoints(sheared(x, y + 2, w + 6, h + 4, ln), true, true);
  g.fillStyle(ENAMEL, 1); g.fillPoints(sheared(x, y, w, h, ln), true, true);
  for (const k of [0.08, 0.55]) {
    g.lineStyle(4, BRASS, 1); g.lineBetween(x - w / 2 + ln * h * k, y - h * k, x + w / 2 + ln * h * k, y - h * k);
    g.lineStyle(1, BRASS_LIT, 0.6); g.lineBetween(x - w / 2 + ln * h * k, y - h * k - 2, x + w / 2 + ln * h * k, y - h * k - 2);
  }
  for (let i = 0; i < 8; i++) {
    const k = 0.1 + rng() * 0.8;
    g.fillStyle(ENAMEL_SHADE, 0.4); g.fillRect(x - w / 2 + 6 + rng() * (w - 20) + ln * h * k, y - h * k, 10, 2);
  }
  // A clock for a window, and two round portholes.
  const cy = y - h * 0.72;
  clockFace(g, sx(0.72), cy, Math.min(16, w * 0.14), rng() * 40, 1);
  for (const side of [-1, 1]) {
    const wx = sx(0.3) + side * w * 0.3, wy = y - h * 0.32;
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(wx, wy, 9);
    g.fillStyle(LAMPLIGHT, 0.85); g.fillCircle(wx, wy, 7);
    g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(wx - 7, wy, wx + 7, wy);
  }
  // Door with the breath-meter beside it.
  g.fillStyle(NAVY_DARK, 1); g.fillRoundedRect(x - 11, y - 30, 22, 30, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(NAVY, 1); g.fillRoundedRect(x - 9, y - 28, 18, 28, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + 4, y - 14, 1.6);
  breathMeter(g, x + 20, y - 22, 5, 0.3 + rng() * 0.6, 1);
  // Roof.
  const rx = sx(1), ry = y - h;
  if (hs.roof === 0) {
    g.fillStyle(NAVY_DARK, 1); g.fillEllipse(rx, ry, w + 14, w * 0.6);
    g.fillStyle(NAVY, 1); g.fillEllipse(rx, ry - 4, w + 6, w * 0.56);
    g.fillStyle(NAVY_DARK, 1); g.fillRect(rx - w / 2 - 6, ry - 2, w + 12, 8);
    g.fillStyle(NAVY_LIT, 0.6); g.fillEllipse(rx - w * 0.18, ry - w * 0.16, w * 0.3, w * 0.12);
    // Little stars pricked in the dome.
    for (let i = 0; i < 5; i++) { g.fillStyle(BRASS_LIT, 0.9); g.fillCircle(rx - w * 0.3 + rng() * w * 0.6, ry - 6 - rng() * w * 0.18, 1.2); }
  } else if (hs.roof === 1) {
    g.fillStyle(dim(COPPER, 0.4), 1); g.fillTriangle(rx - w / 2 - 10, ry + 2, rx + w / 2 + 10, ry + 2, rx + ln * 40, ry - w * 0.75);
    g.fillStyle(COPPER, 1); g.fillTriangle(rx - w / 2 - 6, ry, rx + w / 2 + 6, ry, rx + ln * 40, ry - w * 0.72);
    g.lineStyle(2, VERD, 0.7); g.lineBetween(rx - w / 4, ry - 2, rx + ln * 40 - 4, ry - w * 0.6);
    g.fillStyle(COPPER_LIT, 0.5); g.fillTriangle(rx - w / 2 - 6, ry, rx - w * 0.15, ry, rx + ln * 40 - 3, ry - w * 0.7);
  } else {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(rx - w / 2 - 6, ry - 8, w + 12, 10);
    g.fillStyle(BRASS, 1); g.fillEllipse(rx, ry - 10, w * 0.7, w * 0.4);
    g.fillStyle(BRASS_LIT, 0.6); g.fillEllipse(rx - w * 0.12, ry - 16, w * 0.24, w * 0.1);
    // A little orrery on the cupola.
    g.lineStyle(1.5, BRASS_DARK, 1); g.strokeEllipse(rx, ry - 30, 34, 10);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(rx, ry - 30, 4);
    planet(g, rx + 16, ry - 30, 3, COPPER, false, 1);
  }
  // A weathervane — pointing at the moon, never the wind.
  const vx = rx + ln * 30, vy = ry - (hs.roof === 1 ? w * 0.72 : w * 0.3) - 8;
  g.lineStyle(2, IRON, 1); g.lineBetween(vx, vy + 10, vx, vy - 12);
  const va = SPHERE.x > vx ? 0 : Math.PI;
  g.fillStyle(IRON, 1);
  g.fillTriangle(vx + Math.cos(va) * 14, vy - 12, vx - Math.cos(va) * 4, vy - 16, vx - Math.cos(va) * 4, vy - 8);
  g.lineStyle(2, IRON, 1); g.lineBetween(vx - Math.cos(va) * 12, vy - 12, vx + Math.cos(va) * 8, vy - 12);
}

/** The moon's iron cradle with the Lodestone hovering over it. */
function drawMoon(g: G): void {
  const { x, y } = MOON;
  // The cradle: a ring of iron bollards with brass caps round the Well's mouth.
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 4, CRADLE_R * 2.3, CRADLE_R * 0.8);
  g.fillStyle(LODE, 1); g.fillEllipse(x, y, CRADLE_R * 1.7, CRADLE_R * 0.56);
  g.lineStyle(4, IRON, 1); g.strokeEllipse(x, y, CRADLE_R * 2, CRADLE_R * 0.66);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const bx = x + Math.cos(a) * CRADLE_R, by = y + Math.sin(a) * CRADLE_R * 0.33;
    if (Math.sin(a) < -0.2) continue;
    g.fillStyle(IRON_DARK, 1); g.fillRect(bx - 6, by - 26, 12, 26);
    g.fillStyle(IRON, 1); g.fillRect(bx - 5, by - 26, 7, 26);
    g.fillStyle(BRASS, 1); g.fillEllipse(bx, by - 27, 14, 6);
  }
  // A faint column of violet between cradle and moon: the pull, holding it up.
  for (let i = 0; i < 6; i++) {
    const k = i / 6;
    g.fillStyle(LODE_SHEEN, 0.06); g.fillEllipse(x, y - MOON.lift * k - 20, 90 - k * 30, 26);
  }
  // Brass armillary hoops round the sphere, back halves first.
  g.lineStyle(5, BRASS_DARK, 1);
  g.beginPath(); g.arc(SPHERE.x, SPHERE.y, MOON.r + 26, Math.PI, Math.PI * 2, false); g.strokePath();
  lodestone(g, SPHERE.x, SPHERE.y, MOON.r, 0, 1);
  g.lineStyle(5, BRASS, 1);
  g.beginPath(); g.arc(SPHERE.x, SPHERE.y, MOON.r + 26, 0, Math.PI, false); g.strokePath();
  g.lineStyle(4, BRASS_DARK, 1); g.strokeEllipse(SPHERE.x, SPHERE.y, (MOON.r + 18) * 2, (MOON.r + 18) * 0.5);
  g.lineStyle(2, BRASS_LIT, 0.7); g.strokeEllipse(SPHERE.x, SPHERE.y - 2, (MOON.r + 18) * 2, (MOON.r + 18) * 0.5);
  // Chain-eyes on its flank where the tethers fasten.
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 0.15 + (i / 7) * Math.PI * 0.7;
    const ex = SPHERE.x + Math.cos(a + Math.PI / 2) * MOON.r * 0.98, ey = SPHERE.y + Math.sin(a + Math.PI / 2) * MOON.r * 0.98;
    g.lineStyle(3, IRON_LIT, 1); g.strokeCircle(ex, ey, 5);
  }
}

/** The Periapsis: Prince Perigee's observatory-house, leaning hard toward the moon. */
function drawManor(g: G): void {
  const { x, y, w } = MANOR;
  const ln = leanAt(x) * 1.3;
  const h = 170;
  shadow(g, x, y + 4, w * 1.15, 30);
  // Main block.
  g.fillStyle(NAVY_DARK, 1); g.fillPoints(sheared(x, y + 2, w + 8, h + 4, ln), true, true);
  g.fillStyle(NAVY, 1); g.fillPoints(sheared(x, y, w, h, ln), true, true);
  for (let k = 0.15; k < 1; k += 0.28) {
    g.lineStyle(4, BRASS, 1); g.lineBetween(x - w / 2 + ln * h * k, y - h * k, x + w / 2 + ln * h * k, y - h * k);
  }
  // Tall windows, lit violet — the Prince works at night.
  for (let i = 0; i < 5; i++) {
    const wx = x - w * 0.38 + i * w * 0.19 + ln * h * 0.55, wy = y - h * 0.55;
    g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(wx - 12, wy - 30, 24, 56, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.fillStyle(LODE_GLINT, 0.75); g.fillRoundedRect(wx - 9, wy - 27, 18, 52, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(wx, wy - 26, wx, wy + 24);
  }
  // Great door with the Prince's sign: a small circle on a long ellipse (a perigee).
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 26, y - 64, 52, 64, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.fillStyle(LODE, 1); g.fillRoundedRect(x - 22, y - 60, 44, 60, { tl: 22, tr: 22, bl: 0, br: 0 });
  g.lineStyle(2, LODE_GLINT, 0.9); g.strokeEllipse(x, y - 40, 32, 14);
  g.fillStyle(LODE_GLINT, 1); g.fillCircle(x + 14, y - 40, 3);
  // The observatory tower on the moon side, its dome slit open and a telescope aimed at the moon.
  const tx = x - w * 0.32 + ln * h, ty = y - h;
  const th = 110;
  g.fillStyle(NAVY_DARK, 1); g.fillPoints(sheared(tx, ty + 2, 100, th + 4, ln), true, true);
  g.fillStyle(NAVY_LIT, 1); g.fillPoints(sheared(tx, ty, 92, th, ln), true, true);
  const dx = tx + ln * th, dy = ty - th;
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(dx, dy, 112, 84);
  g.fillStyle(BRASS, 1); g.fillEllipse(dx, dy - 3, 104, 78);
  g.fillStyle(BRASS_LIT, 0.5); g.fillEllipse(dx - 20, dy - 20, 34, 16);
  g.fillStyle(NAVY_DARK, 1); g.fillRect(dx - 9, dy - 40, 18, 44);
  const ta = Math.atan2(SPHERE.y - (dy - 20), SPHERE.x - dx);
  g.lineStyle(14, BRASS_DARK, 1); g.lineBetween(dx, dy - 20, dx + Math.cos(ta) * 90, dy - 20 + Math.sin(ta) * 90);
  g.lineStyle(10, BRASS, 1); g.lineBetween(dx, dy - 22, dx + Math.cos(ta) * 88, dy - 22 + Math.sin(ta) * 88);
  g.fillStyle(LODE_GLINT, 1); g.fillCircle(dx + Math.cos(ta) * 90, dy - 20 + Math.sin(ta) * 90, 5);
  // The great brass ring round the upper storey, back half then front.
  const ringY = y - h * 0.8 + 0;
  g.lineStyle(6, BRASS_DARK, 1); g.strokeEllipse(x + ln * h * 0.8, ringY, w * 1.2, 50);
  g.lineStyle(3, BRASS_LIT, 0.8); g.strokeEllipse(x + ln * h * 0.8, ringY - 2, w * 1.2, 50);
  planet(g, x + ln * h * 0.8 + w * 0.6, ringY, 12, COPPER, false, 1);
  planet(g, x + ln * h * 0.8 - w * 0.45, ringY + 16, 9, VERD, false, 1);
  // Steps.
  for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? PAVE : PAVE_LIT, 1); g.fillRect(x - 46 - i * 8, y + i * 7, 92 + i * 16, 7); }
}

/** The Great Orrery: a brass sun on a tall post (its arms turn in `animateOver`). */
function drawOrrery(g: G): void {
  const { x, y } = ORRERY;
  shadow(g, x, y + 4, 90, 24);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 30, y - 16, 60, 18);
  g.fillStyle(BRASS, 1); g.fillRect(x - 26, y - 22, 52, 8);
  gear(g, x - 20, y - 36, 14, 12, BRASS_DARK, 0.2, 1);
  gear(g, x + 18, y - 40, 18, 14, BRASS, 0.6, 1);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 6, y - 150, 12, 130);
  g.fillStyle(BRASS_LIT, 0.6); g.fillRect(x - 5, y - 150, 3, 130);
  // The sun.
  g.fillStyle(LAMPLIGHT, 0.15); g.fillCircle(x, y - 160, 40);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 160, 22);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillStyle(BRASS_LIT, 1);
    g.fillTriangle(x + Math.cos(a - 0.15) * 22, y - 160 + Math.sin(a - 0.15) * 22, x + Math.cos(a + 0.15) * 22, y - 160 + Math.sin(a + 0.15) * 22, x + Math.cos(a) * 32, y - 160 + Math.sin(a) * 32);
  }
  g.fillStyle(LAMPLIGHT, 1); g.fillCircle(x - 5, y - 165, 7);
}

/** The Brass Almanac: a shop with a bay window of charts and a giant open book for a sign. */
function drawShop(g: G): void {
  const { x, y } = SHOP;
  const w = 220, h = 120;
  const ln = leanAt(x);
  shadow(g, x, y + 4, w * 1.15, 24);
  g.fillStyle(ENAMEL_SHADE, 1); g.fillPoints(sheared(x, y + 2, w + 6, h + 4, ln), true, true);
  g.fillStyle(ENAMEL, 1); g.fillPoints(sheared(x, y, w, h, ln), true, true);
  g.lineStyle(5, BRASS, 1); g.lineBetween(x - w / 2 + ln * h, y - h, x + w / 2 + ln * h, y - h);
  // Bay window with star-charts pinned in it.
  const bx = x - 50 + ln * 50, by = y - 50;
  g.fillStyle(BRASS_DARK, 1); g.fillRect(bx - 44, by - 34, 88, 56);
  g.fillStyle(NAVY_DARK, 1); g.fillRect(bx - 40, by - 30, 80, 48);
  for (let i = 0; i < 3; i++) {
    g.fillStyle(0xe8dcb5, 1); g.fillRect(bx - 36 + i * 26, by - 26, 22, 30);
    g.lineStyle(1, NAVY, 0.8); g.strokeCircle(bx - 25 + i * 26, by - 12, 7);
    g.fillStyle(NAVY, 1); g.fillCircle(bx - 25 + i * 26 + 7, by - 12, 1.5);
  }
  // Door.
  g.fillStyle(NAVY, 1); g.fillRoundedRect(x + 46 + ln * 20, y - 44, 30, 44, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + 68 + ln * 20, y - 22, 2);
  breathMeter(g, x + 90 + ln * 20, y - 34, 6, 0.5, 1);
  // Navy dome roof with a brass telescope.
  const rx = x + ln * h;
  g.fillStyle(NAVY_DARK, 1); g.fillEllipse(rx, y - h, w + 20, 80);
  g.fillStyle(NAVY, 1); g.fillEllipse(rx, y - h - 4, w + 10, 74);
  g.fillStyle(NAVY_DARK, 1); g.fillRect(rx - w / 2 - 10, y - h - 2, w + 20, 10);
  g.lineStyle(8, BRASS_DARK, 1); g.lineBetween(rx + 20, y - h - 30, rx - 40, y - h - 70);
  g.lineStyle(5, BRASS, 1); g.lineBetween(rx + 20, y - h - 31, rx - 40, y - h - 71);
  // The sign: a giant open book on brackets.
  const sx = rx - 70, sy = y - h - 46;
  g.lineStyle(3, IRON, 1); g.lineBetween(sx, sy + 34, sx, sy + 10);
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(sx - 34, sy - 4, sx, sy + 6, sx, sy - 24);
  g.fillTriangle(sx + 34, sy - 4, sx, sy + 6, sx, sy - 24);
  g.fillStyle(0xf4ead2, 1); g.fillTriangle(sx - 30, sy - 4, sx - 2, sy + 3, sx - 2, sy - 20);
  g.fillTriangle(sx + 30, sy - 4, sx + 2, sy + 3, sx + 2, sy - 20);
  g.lineStyle(1, NAVY, 0.8);
  for (let i = 0; i < 3; i++) { g.lineBetween(sx - 24, sy - 6 - i * 4 + i, sx - 6, sy - 3 - i * 5); g.lineBetween(sx + 24, sy - 6 - i * 4 + i, sx + 6, sy - 3 - i * 5); }
}

/** The Archive of Falling Things: a squat black dome, half sunk, with its own caged hole on top. */
function drawArchive(g: G): void {
  const { x, y, w } = ARCHIVE;
  shadow(g, x, y + 4, w * 1.1, 30);
  g.fillStyle(LODE, 1); g.fillRect(x - w / 2, y - 70, w, 70);
  g.fillStyle(LODE_MID, 1); g.fillRect(x - w / 2 + 6, y - 66, w - 12, 62);
  // Drawer-fronts set into the wall in rows, each with a brass pull.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      const dx = x - w / 2 + 18 + c * ((w - 36) / 8.5), dy = y - 60 + r * 18;
      if (Math.abs(dx - x) < 40) continue;
      g.fillStyle(LODE_SHEEN, 0.7); g.fillRect(dx - 12, dy, 24, 14);
      g.fillStyle(BRASS, 1); g.fillRect(dx - 3, dy + 6, 6, 2);
    }
  }
  // The dome.
  g.fillStyle(LODE, 1);
  g.beginPath(); g.arc(x, y - 70, w / 2, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(LODE_MID, 1);
  g.beginPath(); g.arc(x - 6, y - 72, w / 2 - 10, Math.PI, 0, false); g.closePath(); g.fillPath();
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    g.lineStyle(2, LODE_SHEEN, 0.8); g.lineBetween(x, y - 70 - w / 2 + 6, x + Math.cos(a) * (w / 2 - 6), y - 70 + Math.sin(a) * (w / 2 - 6) * 0.2);
  }
  // The vault door: round, banded, a spiral on its face.
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y - 40, 40);
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 40, 34);
  g.lineStyle(2, BRASS, 1);
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 5, r = 28 * (1 - i / 60);
    const px = x + Math.cos(a) * r, py = y - 40 + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.fillStyle(0x000000, 0.5); g.fillRect(x - 40, y - 2, 80, 4);
  // The cage on top, and the little black hole held in it.
  const cy = y - 70 - w / 2 - 30;
  g.lineStyle(3, BRASS_DARK, 1);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; g.lineBetween(x + Math.cos(a) * 22, cy + 26, x + Math.cos(a) * 22, cy - 22); }
  g.strokeEllipse(x, cy - 22, 46, 12); g.strokeEllipse(x, cy + 26, 46, 12);
  g.fillStyle(LODE_GLINT, 0.25); g.fillCircle(x, cy, 16);
  g.fillStyle(0x000000, 1); g.fillCircle(x, cy, 10);
  g.lineStyle(1.5, LODE_WASH, 0.9); g.strokeCircle(x, cy, 11);
}

/** The Moonpool's brass cradle (the floating ball itself is drawn live in `animateOver`). */
function drawPoolCradle(g: G): void {
  const c = POOL_CRADLE;
  const cx = c.x + c.w / 2, cy = c.y + c.h;
  shadow(g, cx, cy, c.w * 1.1, 24);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(cx, cy - 12, c.w, 34);
  g.fillStyle(BRASS, 1); g.fillEllipse(cx, cy - 16, c.w - 10, 26);
  g.fillStyle(POOL_DEEP, 0.7); g.fillEllipse(cx, cy - 18, c.w - 34, 14);
  // Three brass claws reaching up toward the ball.
  for (const ox of [-c.w * 0.4, 0, c.w * 0.4]) {
    g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(cx + ox, cy - 18, cx + ox * 0.6, cy - 70);
    g.lineStyle(2, BRASS_LIT, 0.8); g.lineBetween(cx + ox - 1, cy - 18, cx + ox * 0.6 - 1, cy - 70);
    g.fillStyle(BRASS, 1); g.fillCircle(cx + ox * 0.6, cy - 72, 4);
  }
}

/** The Sling Hoops on Tether Quay: two great brass rings on posts, and the courier's post-box. */
function drawPostBox(g: G): void {
  const px = HOOPS.x + 120, py = HOOPS.y + 10;
  shadow(g, px, py, 40, 10);
  g.fillStyle(NAVY_DARK, 1); g.fillRoundedRect(px - 14, py - 50, 28, 50, 6);
  g.fillStyle(NAVY, 1); g.fillRoundedRect(px - 12, py - 48, 24, 46, 5);
  g.fillStyle(BRASS, 1); g.fillRect(px - 8, py - 38, 16, 3);
  g.lineStyle(2, IRON, 1); g.lineBetween(px + 14, py - 30, px + 14, py - 64);
  // A red flag up: notices waiting to go out.
  g.fillStyle(METER, 1); g.fillTriangle(px + 14, py - 64, px + 30, py - 58, px + 14, py - 52);
}

/** A leaning brass lamp-post. */
function drawLamp(g: G, p: Pt): void {
  const ln = leanAt(p.x);
  const h = 58;
  shadow(g, p.x, p.y, 18, 6);
  g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(p.x, p.y, p.x + ln * h, p.y - h);
  g.lineStyle(2, BRASS, 1); g.lineBetween(p.x - 1, p.y, p.x + ln * h - 1, p.y - h);
  const tx = p.x + ln * h, ty = p.y - h;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(tx, ty - 6, 9);
  g.fillStyle(LAMPLIGHT, 0.95); g.fillCircle(tx, ty - 6, 6);
  g.fillStyle(LAMPLIGHT, 0.12); g.fillCircle(tx, ty - 6, 22);
  g.fillStyle(BRASS, 1); g.fillTriangle(tx - 8, ty - 14, tx + 8, ty - 14, tx, ty - 22);
}

/** A tether bollard: iron, brass-banded, the chain leaving its eye for the moon. */
function drawAnchor(g: G, p: Pt): void {
  shadow(g, p.x, p.y, 34, 10);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(p.x - 12, p.y - 34, 24, 34, 6);
  g.fillStyle(IRON, 1); g.fillRoundedRect(p.x - 10, p.y - 34, 16, 34, 5);
  g.fillStyle(BRASS, 1); g.fillRect(p.x - 13, p.y - 26, 26, 4);
  g.lineStyle(3, IRON_LIT, 1); g.strokeCircle(p.x, p.y - 38, 6);
  // The first stretch of chain, rising toward the moon.
  const a = Math.atan2(SPHERE.y - (p.y - 38), SPHERE.x - p.x);
  chain(g, { x: p.x, y: p.y - 38 }, { x: p.x + Math.cos(a) * 60, y: p.y - 38 + Math.sin(a) * 60 }, 0, 1, 10);
}

/** A lean-pine: wind-cropped, grown slantwise toward the moon. */
function drawPine(g: G, p: Pt, rng: () => number): void {
  const ln = leanAt(p.x) * 2.2;
  shadow(g, p.x, p.y, 50, 12);
  g.lineStyle(7, 0x4a3828, 1); g.lineBetween(p.x, p.y, p.x + ln * 90, p.y - 90);
  for (let k = 0; k < 4; k++) {
    const t = 0.35 + k * 0.18;
    const cx = p.x + ln * 90 * t, cy = p.y - 90 * t;
    const w = 34 - k * 6;
    g.fillStyle(TURF_DARK, 1); g.fillTriangle(cx - w, cy + 8, cx + w, cy + 8, cx + ln * 30, cy - 26);
    g.fillStyle(TURF, 1); g.fillTriangle(cx - w + 4, cy + 4, cx + w - 4, cy + 4, cx + ln * 30, cy - 24);
    if (rng() < 0.6) { g.fillStyle(TURF_LIT, 0.6); g.fillTriangle(cx - w + 6, cy + 2, cx - 2, cy + 2, cx + ln * 28 - 2, cy - 20); }
  }
}

// ── Painter ─────────────────────────────────────────────────────────────

/** The chains from each anchor's eye to the moon's flank (sag, per-chain sway seed). */
const TETHERS = ANCHORS.map((a, i) => {
  const from = { x: a.x, y: a.y - 38 };
  const ang = Math.atan2(from.y - SPHERE.y, from.x - SPHERE.x);
  const to = { x: SPHERE.x + Math.cos(ang) * MOON.r, y: SPHERE.y + Math.sin(ang) * MOON.r };
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  return { from, to, sag: 20 + len * 0.05, seed: i * 1.7 };
});

export const ORBIT_PAINTER: AreaPainter = {
  ground(g, rng) {
    skyBelow(g, rng);
    for (const i of ISLETS) islet(g, i.r, i.cliff, rng);
    // Turf clinging on in the lee of things.
    for (let i = 0; i < 70; i++) {
      const isl = ISLETS[Math.floor(rng() * ISLETS.length)].r;
      const x = isl.x + 20 + rng() * (isl.w - 40), y = isl.y + 20 + rng() * (isl.h - 40);
      const r = 18 + rng() * 40;
      blob(g, x, y, r, r * 0.45, TURF_DARK, 0.7, rng, 8);
      blob(g, x - 2, y - 2, r * 0.75, r * 0.32, TURF, 0.6, rng, 8);
    }
    // Filings in every crack of every islet, combed toward the moon.
    for (let i = 0; i < 900; i++) {
      const isl = ISLETS[Math.floor(rng() * ISLETS.length)].r;
      const x = isl.x + 8 + rng() * (isl.w - 16), y = isl.y + 8 + rng() * (isl.h - 16);
      const d = Math.hypot(CENTRE.x - x, CENTRE.y - y);
      filings(g, x, y, toMoon(x, y), 3 + Math.min(8, 1800 / Math.max(200, d)), 0.25 + rng() * 0.3);
    }
    // Districts, then roads, then the Ring-Street over them.
    orreryYard(g);
    zeroGYard(g);
    archiveCourt(g);
    for (const r of ROADS) pavedRoad(g, r, r === ROADS[2] || r === ROADS[3] ? 36 : 46);
    ringStreet(g, rng);
    // The Moonpool's shadow: a round blue-tinted shade under the floating ball.
    g.fillStyle(POOL_DEEP, 0.25); g.fillEllipse(POOL_AT.x, POOL_AT.y + 10, POOL_AT.r * 2.2, POOL_AT.r * 0.7);
    // Bridges over the gulfs.
    for (const b of W_BRIDGES) chainBridge(g, GULF_W.x - 6, b.y0, GULF_W.x + GULF_W.w + 6, b.y1, false);
    for (const b of E_BRIDGES) chainBridge(g, GULF_E.x - 6, b.y0, GULF_E.x + GULF_E.w + 6, b.y1, false);
    for (const b of S_BRIDGES) chainBridge(g, b.x0, GULF_S.y - 6, b.x1, GULF_S.y + GULF_S.h + 6, true);
    chainBridge(g, NORTH_GAP.x0 + 30, 0, NORTH_GAP.x1 - 30, EDGE_N + 6, true);
  },

  pieces: [
    { x: MOON.x, y: MOON.y + CRADLE_R * 0.33, w: MOON.r * 2 + 120, h: MOON.lift + MOON.r + 120, draw: (g: G) => drawMoon(g) },
    { x: MANOR.x, y: MANOR.y, w: MANOR.w + 200, h: 420, draw: (g: G) => drawManor(g) },
    { x: ORRERY.x, y: ORRERY.y, w: 120, h: 210, draw: (g: G) => drawOrrery(g) },
    { x: SHOP.x, y: SHOP.y, w: 300, h: 260, draw: (g: G) => drawShop(g) },
    { x: ARCHIVE.x, y: ARCHIVE.y, w: ARCHIVE.w + 40, h: 300, draw: (g: G) => drawArchive(g) },
    { x: POOL_CRADLE.x + POOL_CRADLE.w / 2, y: POOL_CRADLE.y + POOL_CRADLE.h, w: POOL_CRADLE.w + 40, h: 100, draw: (g: G) => drawPoolCradle(g) },
    { x: HOOPS.x - 70, y: HOOPS.y, w: 110, h: 120, draw: (g: G) => hoop(g, HOOPS.x - 70, HOOPS.y, 40, 1, 1) },
    { x: HOOPS.x + 30, y: HOOPS.y + 30, w: 90, h: 100, draw: (g: G) => hoop(g, HOOPS.x + 30, HOOPS.y + 30, 32, 1, 1) },
    { x: HOOPS.x + 120, y: HOOPS.y + 10, w: 60, h: 80, draw: (g: G) => drawPostBox(g) },
    ...HOUSES.map((h) => ({ x: h.x, y: h.y, w: h.w + 80, h: h.h + h.w + 40, draw: (g: G, rng: () => number) => drawHouse(g, h, rng) })),
    ...LAMPS.map((p) => ({ x: p.x, y: p.y, w: 60, h: 90, draw: (g: G) => drawLamp(g, p) })),
    ...ANCHORS.map((p) => ({ x: p.x, y: p.y, w: 120, h: 110, draw: (g: G) => drawAnchor(g, p) })),
    ...PINES.map((p) => ({ x: p.x, y: p.y, w: 120, h: 130, draw: (g: G, rng: () => number) => drawPine(g, p, rng) })),
  ],

  animate(g, t, view) {
    // Cloud drifting through the gulfs and along the sky edges, far below.
    SKIES.forEach((s, si) => {
      if (!inView(view, s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) / 2 + 60)) return;
      const n = Math.max(2, Math.floor((s.w * s.h) / 26000));
      for (let i = 0; i < Math.min(n, 18); i++) {
        const tall = s.h > s.w;
        const ph = ((t * (0.012 + (i % 3) * 0.004) + i * 0.137 + si * 0.21) % 1);
        const x = tall ? s.x + ((i * 53) % Math.max(1, s.w)) : s.x + ph * s.w;
        const y = tall ? s.y + ph * s.h : s.y + ((i * 37) % Math.max(1, s.h));
        if (!inView(view, x, y, 40)) continue;
        cloudPuff(g, x, y, 12 + (i % 4) * 5, 0.45, i + si);
      }
    });
    // Gravity made visible on the Ring-Street: faint violet ripples running in to the moon's foot.
    if (inView(view, RING.x, RING.y, RING.rx + 80)) {
      for (let i = 0; i < 3; i++) {
        const q = 1 - ((t * 0.18 + i / 3) % 1);
        g.lineStyle(2, LODE_GLINT, 0.18 * (1 - q)); g.strokeEllipse(RING.x, RING.y, RING.rx * 2 * q, RING.ry * 2 * q);
      }
    }
    // Lamp glow pooled on the paving.
    LAMPS.forEach((p, i) => {
      if (!inView(view, p.x, p.y, 80)) return;
      const fl = 0.8 + 0.2 * Math.sin(t * 2.1 + i * 1.3);
      g.fillStyle(LAMPLIGHT, 0.08 * fl); g.fillEllipse(p.x + leanAt(p.x) * 58, p.y + 6, 110, 34);
    });
    // The Periapsis's violet windows spill on its steps.
    if (inView(view, MANOR.x, MANOR.y, 220)) {
      const k = 0.5 + 0.5 * Math.sin(t * 0.8);
      g.fillStyle(LODE_GLINT, 0.08 + 0.06 * k); g.fillEllipse(MANOR.x, MANOR.y + 24, 260, 40);
    }
  },

  animateOver(g, t, view) {
    // The tethers: chains from every islet up to the moon's flank, swaying a little.
    for (const c of TETHERS) {
      const minX = Math.min(c.from.x, c.to.x), maxX = Math.max(c.from.x, c.to.x);
      const minY = Math.min(c.from.y, c.to.y), maxY = Math.max(c.from.y, c.to.y) + c.sag;
      if (maxX < view.x - 20 || minX > view.x + view.w + 20 || maxY < view.y - 20 || minY > view.y + view.h + 20) continue;
      chainLite(g, c.from, c.to, c.sag + Math.sin(t * 0.6 + c.seed) * 6, 0.9);
    }
    if (inView(view, SPHERE.x, SPHERE.y, MOON.r + 260)) {
      // The sheen sliding over the moon's face, and moonlets of rubble circling it.
      g.fillStyle(LODE_SHEEN, 0.25); g.fillEllipse(SPHERE.x + Math.sin(t * 0.3) * MOON.r * 0.4 - 30, SPHERE.y - MOON.r * 0.45, MOON.r * 0.7, MOON.r * 0.16);
      for (let i = 0; i < 9; i++) {
        const a = t * (0.25 + (i % 3) * 0.08) + i * 0.7;
        const rr = MOON.r + 50 + (i % 4) * 22;
        const x = SPHERE.x + Math.cos(a) * rr, y = SPHERE.y + Math.sin(a) * rr * 0.35;
        if (Math.sin(a) < 0 && Math.hypot(x - SPHERE.x, (y - SPHERE.y) / 0.35) < MOON.r + 60) continue;
        pebble(g, x, y, 3 + (i % 3) * 1.5, i % 2 ? STONE_LIT : STONE, 0.95);
      }
      // The Low Orbit: the becalmed, asleep on chains on the moon's flank, turning slowly.
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.12 + i * 0.13 + Math.sin(t * 0.2 + i) * 0.02;
        const ex = SPHERE.x + Math.cos(a) * (MOON.r + 4), ey = SPHERE.y + Math.sin(a) * (MOON.r + 4);
        const sx = ex + 24 + Math.sin(t * 0.4 + i) * 3, sy = ey + 26 + i * 4;
        g.lineStyle(1.5, IRON_LIT, 0.8); g.lineBetween(ex, ey, sx, sy - 6);
        const rot = Math.sin(t * 0.3 + i * 1.3) * 0.4;
        g.fillStyle(ENAMEL, 0.9); g.fillEllipse(sx, sy, 22, 9);
        g.fillStyle(NAVY_LIT, 0.9); g.fillEllipse(sx + Math.cos(rot) * 3, sy + 1, 14, 7);
        g.fillStyle(ENAMEL_SHADE, 1); g.fillCircle(sx - 10, sy - 1, 4);
        // A slow "z" rising off each sleeper.
        const zq = (t * 0.3 + i * 0.27) % 1;
        g.lineStyle(1, LODE_WASH, 0.6 * (1 - zq));
        const zx = sx - 10 + zq * 10, zy = sy - 10 - zq * 20;
        g.lineBetween(zx, zy, zx + 4, zy); g.lineBetween(zx + 4, zy, zx, zy + 4); g.lineBetween(zx, zy + 4, zx + 4, zy + 4);
      }
    }
    // The Great Orrery's arms, turning high over Tycho's yard.
    if (inView(view, ORRERY.x, ORRERY.y - 160, 220)) {
      const cx = ORRERY.x, cy = ORRERY.y - 160;
      const arms: [number, number, number, number][] = [[46, 0.9, COPPER, 5], [78, 0.55, VERD, 7], [112, 0.32, BRASS, 9]];
      arms.forEach(([r, w, col, pr], i) => {
        const a = t * w + i * 2.1;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.32;
        g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(cx, cy, x, y);
        planet(g, x, y, pr, col, i === 2, 1);
      });
    }
    // The Moonpool: a ball of water held up in the air, fish swimming toward the moon side.
    if (inView(view, POOL_AT.x, POOL_AT.y - POOL_AT.lift, POOL_AT.r + 40)) {
      const bx = POOL_AT.x, by = POOL_AT.y - POOL_AT.lift;
      const wob = Math.sin(t * 1.4) * 3;
      g.fillStyle(POOL_DEEP, 0.85); g.fillEllipse(bx, by, POOL_AT.r * 2 + wob, POOL_AT.r * 2 - wob);
      g.fillStyle(POOL, 0.8); g.fillEllipse(bx - 6, by - 6, POOL_AT.r * 1.7 + wob, POOL_AT.r * 1.7 - wob);
      for (let i = 0; i < 5; i++) {
        const a = t * (0.6 + i * 0.15) + i * 1.3;
        const fx = bx + Math.cos(a) * POOL_AT.r * (0.3 + (i % 3) * 0.18), fy = by + Math.sin(a) * POOL_AT.r * 0.5;
        const dir = Math.cos(a + Math.PI / 2) >= 0 ? 1 : -1;
        g.fillStyle(i < 2 ? 0xdfe8f0 : POOL_DEEP, 0.85); g.fillEllipse(fx, fy, 12, 5);
        g.fillTriangle(fx - dir * 6, fy, fx - dir * 11, fy - 3, fx - dir * 11, fy + 3);
      }
      g.fillStyle(POOL_LIT, 0.5); g.fillEllipse(bx - POOL_AT.r * 0.35, by - POOL_AT.r * 0.45, POOL_AT.r * 0.6, POOL_AT.r * 0.25);
      g.lineStyle(2, POOL_LIT, 0.6); g.strokeEllipse(bx, by, POOL_AT.r * 2 + wob, POOL_AT.r * 2 - wob);
      // Droplets orbiting the ball.
      for (let i = 0; i < 6; i++) {
        const a = t * 0.9 + i * 1.05;
        g.fillStyle(POOL_LIT, 0.85); g.fillCircle(bx + Math.cos(a) * (POOL_AT.r + 16), by + Math.sin(a) * (POOL_AT.r + 16) * 0.3, 2.5);
      }
    }
    // Crates and tools floating over Lofty's yard.
    if (inView(view, ZEROG.x, ZEROG.y, ZEROG.r + 60)) {
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + t * 0.12;
        const x = ZEROG.x + Math.cos(a) * ZEROG.r * 0.55, y = ZEROG.y + Math.sin(a) * ZEROG.r * 0.45 - 34 + Math.sin(t * 0.9 + i) * 8;
        const rot = t * 0.4 + i;
        g.fillStyle(0x000000, 0.15); g.fillEllipse(x, ZEROG.y + Math.sin(a) * ZEROG.r * 0.45 + 6, 18, 6);
        const c = Math.cos(rot) * 8, s = Math.sin(rot) * 8;
        g.fillStyle(i % 2 ? 0x8a6a44 : VERD_DARK, 1);
        g.fillPoints([new Phaser.Geom.Point(x - c + s, y - s - c), new Phaser.Geom.Point(x + c + s, y + s - c), new Phaser.Geom.Point(x + c - s, y + s + c), new Phaser.Geom.Point(x - c - s, y - s + c)], true, true);
      }
    }
    // Dust drifting across the town to fall into the moon.
    const r = mulberry(17);
    for (let i = 0; i < 28; i++) {
      const sx = view.x + r() * view.w, sy = view.y + r() * view.h;
      const ph = (t * 0.06 + r()) % 1;
      const x = sx + (SPHERE.x - sx) * ph * 0.5, y = sy + (SPHERE.y - sy) * ph * 0.5;
      g.fillStyle(lit(LODE_GLINT, 0.4), 0.3 * Math.sin(ph * Math.PI)); g.fillCircle(x, y, 1.4);
    }
    // Lamplight halos.
    LAMPS.forEach((p, i) => {
      if (!inView(view, p.x, p.y, 60)) return;
      const fl = 0.8 + 0.2 * Math.sin(t * 2.7 + i);
      g.fillStyle(LAMPLIGHT, 0.08 * fl); g.fillCircle(p.x + leanAt(p.x) * 58, p.y - 64, 16);
    });
  },
};
