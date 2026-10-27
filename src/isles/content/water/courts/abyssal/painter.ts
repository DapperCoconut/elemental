import Phaser from 'phaser';
import type { AreaPainter, Pt, Rect } from '../../../../IslesTypes';
import { type G, blob, dim, glow, lit, mixC, shadow, stroke } from '../../../../art/IsleArt';
import { ABY, bubbleStream, drawCoral, drawEsca, drawFish, drawRib, samplePolyline } from './palette';
import {
  ARCH_HALF, BELL, BREATHWORKS, CORALS, GAPE, GREAT_LAMP, H, HOUSES, KELP, LAMPS, PIPE, PLAZA, RIB_ARCHES, ROADS, SHOP, SHRINE,
  STAIR, TRENCH, VERTEBRAE, W, WHALE_RIBS, WHALE_SKULL, WHALE_SPINE, spineAt,
} from './layout';

/**
 * The Abyssal Court, painted. At the bottom of the trench off the Drowned Reach, a whole city
 * sits inside one vast bubble of air. Outside its shimmering skin is the true deep — black
 * water, passing lights, the odd enormous shape. Inside: a floor of blue-black silt laid with
 * salvaged planking; houses made of drowned ships turned keel-up; whale-rib arches over the
 * processional; anglerfish kept alive in glass globes for street-lamps; coral that glows cyan
 * and rose in the north-east gardens; the old whale fall to the west, picked white and furred
 * with bone-worms; the trench fissure to the east where the floor opens into the deep below;
 * the Breathworks' bellows dragging air down the pipe; Prince Lanternjaw's palace — the skull
 * of an anglerfish the size of a cathedral — with its own lure hung over the gate; and on the
 * north rim, between two great jawbones, the maelstrom stair spiralling down to the Undertow.
 */

const inView = (v: Rect, x: number, y: number, pad: number): boolean =>
  x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;

/** The bubble's skin, as a rounded rectangle. Everything outside it is open water. */
const MEM = { x: 66, y: 104, w: W - 132, h: H - 104 - 38, r: 300 };

function insideMem(x: number, y: number, pad = 0): boolean {
  const x0 = MEM.x + pad, y0 = MEM.y + pad, x1 = MEM.x + MEM.w - pad, y1 = MEM.y + MEM.h - pad;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const r = MEM.r - pad;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return Math.hypot(x - cx, y - cy) <= r;
}

/** Points round the membrane's edge every `step` px (for the shimmer and the edge strokes). */
function membraneRing(step: number): Pt[] {
  const out: Pt[] = [];
  const { x, y, w, h, r } = MEM;
  const arc = (cx: number, cy: number, a0: number): void => {
    const n = Math.ceil((Math.PI / 2) * r / step);
    for (let i = 0; i < n; i++) { const a = a0 + (i / n) * (Math.PI / 2); out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
  };
  const line = (ax: number, ay: number, bx: number, by: number): void => {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
    for (let i = 0; i < n; i++) out.push({ x: ax + ((bx - ax) * i) / n, y: ay + ((by - ay) * i) / n });
  };
  line(x + r, y, x + w - r, y); arc(x + w - r, y + r, -Math.PI / 2);
  line(x + w, y + r, x + w, y + h - r); arc(x + w - r, y + h - r, 0);
  line(x + w - r, y + h, x + r, y + h); arc(x + r, y + h - r, Math.PI / 2);
  line(x, y + h - r, x, y + r); arc(x + r, y + r, Math.PI);
  return out;
}
const RING = membraneRing(18);

/** Six princes' seals on the stair's jaw-arch (tidewater, sailmaker, slickharbor, inkwell, rimefast, abyssal). */
const SEALS = [0x5ab8e8, 0xe8dcc0, 0x7a6a9a, 0x2a4a9a, 0xbfe8ff, ABY.lure];

// ── Ground pieces ────────────────────────────────────────────────────

function deepWater(g: G, rng: () => number): void {
  g.fillStyle(ABY.abyss, 1); g.fillRect(0, 0, W, H);
  // Slow currents out in the black: long faint bands.
  for (let i = 0; i < 40; i++) {
    const x = rng() * W, y = rng() * H;
    if (insideMem(x, y, -40)) continue;
    g.fillStyle(ABY.deepMid, 0.35 + rng() * 0.3); g.fillEllipse(x, y, 160 + rng() * 260, 18 + rng() * 26);
  }
  // Marine snow hanging out there.
  for (let i = 0; i < 900; i++) {
    const x = rng() * W, y = rng() * H;
    if (insideMem(x, y)) continue;
    g.fillStyle(0xc8dcf0, 0.05 + rng() * 0.18); g.fillRect(x, y, 1 + rng() * 1.5, 1 + rng() * 1.5);
  }
}

function siltFloor(g: G, rng: () => number): void {
  g.fillStyle(ABY.silt, 1);
  g.fillRoundedRect(MEM.x, MEM.y, MEM.w, MEM.h, MEM.r);
  // Mottling: darker silt drifts and paler washes, kept inside the skin.
  for (let i = 0; i < 260; i++) {
    const x = MEM.x + rng() * MEM.w, y = MEM.y + rng() * MEM.h;
    if (!insideMem(x, y, 40)) continue;
    g.fillStyle(rng() < 0.5 ? ABY.siltMid : dim(ABY.silt, 0.35), 0.35 + rng() * 0.35);
    g.fillEllipse(x, y, 70 + rng() * 200, 26 + rng() * 70);
  }
  // Sand ripples, the floor's memory of currents that stopped when the bubble formed.
  for (let i = 0; i < 160; i++) {
    const x = MEM.x + rng() * MEM.w, y = MEM.y + rng() * MEM.h;
    if (!insideMem(x, y, 30)) continue;
    const r = 20 + rng() * 40;
    g.lineStyle(1.2, ABY.siltLit, 0.18 + rng() * 0.16);
    g.beginPath(); g.arc(x, y + r, r, Math.PI * 1.25, Math.PI * 1.75, false); g.strokePath();
    g.lineStyle(1, ABY.siltPale, 0.1);
    g.beginPath(); g.arc(x, y + r + 6, r, Math.PI * 1.3, Math.PI * 1.7, false); g.strokePath();
  }
  // Grit, shell flecks, and the odd tithe coin that went down with its house.
  for (let i = 0; i < 2600; i++) {
    const x = MEM.x + rng() * MEM.w, y = MEM.y + rng() * MEM.h;
    if (!insideMem(x, y, 8)) continue;
    const k = rng();
    if (k < 0.92) { g.fillStyle(k < 0.6 ? ABY.siltPale : ABY.boneDark, 0.1 + rng() * 0.22); g.fillRect(x, y, 1 + rng() * 2, 1); }
    else if (k < 0.985) {
      // A little cockle shell.
      g.fillStyle(ABY.boneMid, 0.5); g.fillEllipse(x, y, 5, 3.5);
      g.lineStyle(0.8, ABY.boneDark, 0.6); g.lineBetween(x, y - 1.5, x, y + 1.5);
    } else { g.fillStyle(ABY.brass, 0.55); g.fillCircle(x, y, 2); g.fillStyle(lit(ABY.brass, 0.4), 0.6); g.fillCircle(x - 0.5, y - 0.6, 0.8); }
  }
}

/** Ship planks laid across a path, nailed down, some missing — the city's streets. */
function plankRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  stroke(g, pts, w + 14, dim(ABY.silt, 0.5));
  stroke(g, pts, w + 4, ABY.tar);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / (len || 1), uy = (b.y - a.y) / (len || 1), nx = -uy, ny = ux;
    for (let d = 0; d < len; d += 13) {
      if (rng() < 0.06) continue; // a missing board — silt shows through
      const cx = a.x + ux * d, cy = a.y + uy * d;
      const half = w / 2 - 1 - rng() * 4;
      const tone = mixC(ABY.hull, ABY.hullLit, rng() * 0.55);
      g.lineStyle(10, tone, 1);
      g.lineBetween(cx - nx * half, cy - ny * half, cx + nx * (half - rng() * 3), cy + ny * (half - rng() * 3));
      g.lineStyle(1, dim(tone, 0.5), 0.9);
      g.lineBetween(cx - nx * half + ux * 5, cy - ny * half + uy * 5, cx + nx * half + ux * 5, cy + ny * half + uy * 5);
      // Nail heads, rusted.
      g.fillStyle(ABY.rust, 0.8);
      g.fillCircle(cx - nx * (half - 4), cy - ny * (half - 4), 1.2);
      g.fillCircle(cx + nx * (half - 4), cy + ny * (half - 4), 1.2);
      // Barnacle scabs on the odd board.
      if (rng() < 0.08) { g.fillStyle(ABY.boneMid, 0.6); g.fillCircle(cx + nx * (rng() - 0.5) * w * 0.6, cy + ny * (rng() - 0.5) * w * 0.6, 2.4); }
    }
  }
}

/** The processional is paved with vertebrae discs instead — a road of the whale's own back. */
function boneRoad(g: G, pts: Pt[], w: number, rng: () => number): void {
  stroke(g, pts, w + 16, dim(ABY.silt, 0.55));
  stroke(g, pts, w + 4, mixC(ABY.boneShadow, ABY.silt, 0.4));
  for (const p of samplePolyline(pts, 16)) {
    for (let k = 0; k < 2; k++) {
      const ox = (rng() - 0.5) * w * 0.7, oy = (rng() - 0.5) * 10;
      const r = 9 + rng() * 6;
      g.fillStyle(ABY.boneShadow, 0.9); g.fillEllipse(p.x + ox, p.y + oy + 2, r * 2.1, r * 1.3);
      g.fillStyle(mixC(ABY.boneDark, ABY.boneMid, rng() * 0.7), 1); g.fillEllipse(p.x + ox, p.y + oy, r * 2, r * 1.2);
      g.fillStyle(ABY.boneShadow, 0.5); g.fillEllipse(p.x + ox, p.y + oy, r * 0.7, r * 0.4);
    }
  }
}

function plaza(g: G, rng: () => number): void {
  const { x, y, r } = PLAZA;
  g.fillStyle(dim(ABY.silt, 0.4), 1); g.fillEllipse(x, y, r * 2 + 30, r * 1.6 + 30);
  // Concentric courses of pale coral-stone, laid like a target round the lamp.
  for (let ring = 5; ring >= 0; ring--) {
    const rr = r * (0.2 + ring * 0.16);
    const n = 10 + ring * 8;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + ring * 0.2, a1 = ((i + 1) / n) * Math.PI * 2 + ring * 0.2;
      const pts: Phaser.Geom.Point[] = [];
      const r0 = Math.max(0, rr - r * 0.15), r1 = rr - 2;
      for (let k = 0; k <= 4; k++) { const a = a0 + ((a1 - a0 - 0.02) * k) / 4; pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.8)); }
      for (let k = 4; k >= 0; k--) { const a = a0 + ((a1 - a0 - 0.02) * k) / 4; pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.8)); }
      g.fillStyle(mixC(0x36485a, 0x5a6a78, rng() * 0.6 + (ring % 2) * 0.15), 1);
      g.fillPoints(pts, true, true);
    }
  }
  // The mosaic: an anglerfish curled round the lamp in amber tesserae.
  for (let i = 0; i < 160; i++) {
    const t = i / 160;
    const a = t * Math.PI * 1.8 - Math.PI * 0.4;
    const rr = r * (0.36 + 0.18 * Math.sin(t * Math.PI));
    g.fillStyle(i % 7 === 0 ? ABY.lureHot : ABY.lureDeep, 0.6);
    g.fillRect(x + Math.cos(a) * rr - 2, y + Math.sin(a) * rr * 0.8 - 2, 4, 4);
  }
  // Its lure, a ring of bright tiles where the illicium ends.
  const la = Math.PI * 1.4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillStyle(ABY.lure, 0.7); g.fillRect(x + Math.cos(la) * r * 0.62 + Math.cos(a) * 9 - 2, y + Math.sin(la) * r * 0.5 + Math.sin(a) * 7 - 2, 4, 4);
  }
  g.lineStyle(3, ABY.boneMid, 0.5); g.strokeEllipse(x, y, r * 2, r * 1.6);
}

function trench(g: G, rng: () => number): void {
  const { x, y, w, h } = TRENCH;
  const cx = x + w / 2, cy = y + h / 2;
  // The lip: torn silt and bedrock, then each step down a shade nearer black.
  blob(g, cx, cy, w * 0.62, h * 0.66, dim(ABY.siltMid, 0.2), 1, rng, 16);
  blob(g, cx, cy, w * 0.56, h * 0.58, ABY.siltLit, 1, rng, 16);
  blob(g, cx, cy, w * 0.52, h * 0.52, 0x141e2c, 1, rng, 15);
  blob(g, cx, cy, w * 0.44, h * 0.42, 0x0a111d, 1, rng, 14);
  blob(g, cx + 10, cy + 6, w * 0.34, h * 0.3, 0x050a14, 1, rng, 13);
  blob(g, cx + 14, cy + 10, w * 0.22, h * 0.18, ABY.abyss, 1, rng, 12);
  // Strata on the far wall.
  for (let k = 0; k < 6; k++) {
    g.lineStyle(1.5, ABY.siltPale, 0.18 - k * 0.02);
    const yy = y + 30 + k * 16;
    g.beginPath(); g.moveTo(x + 40 + k * 18, yy);
    for (let s = 1; s <= 10; s++) g.lineTo(x + 40 + k * 18 + s * (w - 80 - k * 36) / 10, yy + Math.sin(s * 1.3 + k) * 4);
    g.strokePath();
  }
  // A hagfish-white rim of bacterial mat — the trench breathes up something they eat.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    g.fillStyle(0xdfe8e0, 0.12 + rng() * 0.1);
    g.fillEllipse(cx + Math.cos(a) * w * 0.55, cy + Math.sin(a) * h * 0.58, 22 + rng() * 18, 6);
  }
  // Dorrit's whalebone jetty: two long jaw bones laid out over the drop, planked between.
  const jy = 1090;
  for (const o of [-12, 12]) {
    g.lineStyle(9, ABY.boneShadow, 1); g.lineBetween(x - 40, jy + o + 2, x + 150, jy + o + 6);
    g.lineStyle(7, ABY.boneMid, 1); g.lineBetween(x - 40, jy + o, x + 150, jy + o + 4);
  }
  for (let d = 0; d < 170; d += 12) {
    g.lineStyle(6, mixC(ABY.hull, ABY.hullLit, rng() * 0.5), 1);
    g.lineBetween(x - 34 + d, jy - 14, x - 34 + d, jy + 16);
  }
  // A rope and creel trailing off the end.
  g.lineStyle(1.5, 0x8a7a5a, 0.8); g.lineBetween(x + 150, jy + 4, x + 172, jy + 60);
  g.fillStyle(ABY.hullMid, 1); g.fillRect(x + 164, jy + 58, 16, 12);
}

/** The whale fall's footprint: a stain of bacterial mat and the bones that have sunk into the silt. */
function whaleGround(g: G, rng: () => number): void {
  for (const p of samplePolyline(WHALE_SPINE, 30)) {
    blob(g, p.x, p.y, 150, 110, 0x1b2018, 0.55, rng, 12);
    blob(g, p.x + (rng() - 0.5) * 40, p.y + (rng() - 0.5) * 40, 60, 34, 0xe8e4d2, 0.08, rng, 9);
    blob(g, p.x + (rng() - 0.5) * 60, p.y + (rng() - 0.5) * 50, 30, 18, 0xd89a4a, 0.08, rng, 8);
  }
  // The spine itself, lying in the silt: vertebrae in a chain, each with its spinous process.
  const pts = samplePolyline(WHALE_SPINE, 26);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const s = 1.15 - (i / pts.length) * 0.55;
    g.fillStyle(ABY.boneShadow, 0.9); g.fillEllipse(p.x, p.y + 4, 34 * s, 20 * s);
    g.fillStyle(mixC(ABY.boneDark, ABY.boneMid, 0.5 + rng() * 0.3), 1); g.fillEllipse(p.x, p.y, 30 * s, 17 * s);
    g.fillStyle(ABY.bone, 0.9); g.fillEllipse(p.x - 3, p.y - 2, 14 * s, 7 * s);
    // Bone-worms: tiny red plumes furring the vertebrae.
    for (let k = 0; k < 4; k++) {
      const wx = p.x + (rng() - 0.5) * 24 * s, wy = p.y + (rng() - 0.5) * 12 * s;
      g.lineStyle(1, ABY.blood, 0.8); g.lineBetween(wx, wy, wx + (rng() - 0.5) * 3, wy - 4);
      g.fillStyle(0xff6a6a, 0.8); g.fillCircle(wx, wy - 4, 1.1);
    }
  }
  // Flukes at the tail: two blades of cartilage-yellowed bone fanned out.
  const t = WHALE_SPINE[WHALE_SPINE.length - 1];
  for (const side of [-1, 1]) {
    g.fillStyle(ABY.boneShadow, 0.8);
    g.fillTriangle(t.x, t.y, t.x + 90, t.y - 40 + side * 70, t.x + 50, t.y - 20 + side * 20);
    g.fillStyle(ABY.boneDark, 0.9);
    g.fillTriangle(t.x, t.y - 2, t.x + 84, t.y - 42 + side * 66, t.x + 48, t.y - 22 + side * 18);
  }
}

function breathPipe(g: G): void {
  // The air main: riveted iron, brass collars, laid along the floor to the wall.
  stroke(g, PIPE, 26, 0x0b0f14);
  stroke(g, PIPE, 20, ABY.iron);
  stroke(g, PIPE.map((p) => ({ x: p.x, y: p.y - 4 })), 5, ABY.ironLit, 0.7);
  for (const p of samplePolyline(PIPE, 64)) {
    g.fillStyle(ABY.brassDark, 1); g.fillRect(p.x - 4, p.y - 12, 8, 24);
    g.fillStyle(ABY.brass, 1); g.fillRect(p.x - 3, p.y - 11, 3, 22);
  }
  // Where it pierces the skin: a brass collar with the membrane puckered round it.
  const e = PIPE[PIPE.length - 1];
  g.fillStyle(ABY.brass, 1); g.fillEllipse(e.x + 6, e.y, 16, 34);
  g.lineStyle(2, ABY.membrane, 0.5); g.strokeEllipse(e.x + 6, e.y, 28, 50);
}

function bellPad(g: G, rng: () => number): void {
  const { x, y } = BELL;
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y - 14, 170, 70);
  g.fillStyle(mixC(ABY.iron, ABY.silt, 0.4), 1); g.fillEllipse(x, y - 18, 150, 60);
  g.lineStyle(3, ABY.brassDark, 1); g.strokeEllipse(x, y - 18, 150, 60);
  // Chain marks scored where the bell sets down, and a painted tithe-tally: one stroke per head.
  g.lineStyle(1, ABY.siltPale, 0.5);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.lineBetween(x + Math.cos(a) * 50, y - 18 + Math.sin(a) * 20, x + Math.cos(a) * 70, y - 18 + Math.sin(a) * 27);
  }
  for (let i = 0; i < 26; i++) {
    const tx = x - 120 + (i % 13) * 7 + (i % 5 === 4 ? 4 : 0), ty = y + 10 + Math.floor(i / 13) * 12;
    g.lineStyle(1.4, ABY.bone, 0.35 + rng() * 0.2); g.lineBetween(tx, ty, tx + (i % 5 === 4 ? -20 : 0), ty + 8);
  }
}

/** The maelstrom stair, cut down through the bubble's floor: a spiral of steps into a whirl. */
function stairGround(g: G): void {
  const { x } = STAIR;
  const cy = 120;
  g.fillStyle(ABY.abyss, 1); g.fillEllipse(x, cy, 330, 170);
  // Steps: wedge-shaped treads winding down clockwise, each darker than the last.
  for (let i = 0; i < 26; i++) {
    const a0 = Math.PI * 0.05 + i * 0.36, a1 = a0 + 0.3;
    const r1 = 160 - i * 5.2, r0 = r1 - 26;
    if (r0 < 12) break;
    const pts: Phaser.Geom.Point[] = [];
    for (let k = 0; k <= 4; k++) { const a = a0 + ((a1 - a0) * k) / 4; pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.5)); }
    for (let k = 4; k >= 0; k--) { const a = a0 + ((a1 - a0) * k) / 4; pts.push(new Phaser.Geom.Point(x + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.5)); }
    g.fillStyle(mixC(0x4a5a6a, ABY.abyss, i / 26), 1); g.fillPoints(pts, true, true);
    g.lineStyle(1, mixC(ABY.siltPale, ABY.abyss, i / 26), 0.8);
    g.lineBetween(pts[0].x, pts[0].y, pts[9].x, pts[9].y);
  }
  // The top landing: a lip of worn stone the dungeon's door back opens onto.
  g.fillStyle(0x3a4656, 1); g.fillRoundedRect(x - 130, 196, 260, 34, 14);
  g.fillStyle(0x56677a, 1); g.fillRoundedRect(x - 124, 196, 248, 8, 6);
  g.lineStyle(1, ABY.siltPale, 0.5);
  for (let i = 0; i < 8; i++) g.lineBetween(x - 110 + i * 31, 206, x - 104 + i * 31, 226);
}

function membraneEdge(g: G): void {
  // Outside the skin a thin film of lit water clings to it; inside, a pale rim of condensation.
  g.lineStyle(26, ABY.membraneDim, 0.12);
  g.strokeRoundedRect(MEM.x - 10, MEM.y - 10, MEM.w + 20, MEM.h + 20, MEM.r + 10);
  g.lineStyle(10, ABY.membraneDim, 0.28);
  g.strokeRoundedRect(MEM.x - 2, MEM.y - 2, MEM.w + 4, MEM.h + 4, MEM.r + 2);
  g.lineStyle(2.5, ABY.membrane, 0.65);
  g.strokeRoundedRect(MEM.x, MEM.y, MEM.w, MEM.h, MEM.r);
  g.lineStyle(1, 0xffffff, 0.25);
  g.strokeRoundedRect(MEM.x + 6, MEM.y + 6, MEM.w - 12, MEM.h - 12, MEM.r - 6);
  // Droplets beaded on the inside of the skin.
  for (let i = 0; i < RING.length; i += 2) {
    const p = RING[i];
    const ix = p.x + (W / 2 - p.x) * 0.012, iy = p.y + (H / 2 - p.y) * 0.012;
    g.fillStyle(ABY.membrane, 0.25); g.fillCircle(ix, iy, 1.5 + (i % 3));
  }
  // The south neck: the road up to Tidewater leaves through a sleeve of stitched sharkskin.
  const nx = 1200, ny = MEM.y + MEM.h;
  g.fillStyle(0x0c141e, 1); g.fillRect(nx - 82, ny - 22, 164, 64);
  g.lineStyle(3, ABY.membrane, 0.55); g.lineBetween(nx - 82, ny - 22, nx - 82, H); g.lineBetween(nx + 82, ny - 22, nx + 82, H);
  for (let k = 0; k < 6; k++) { g.lineStyle(1.5, ABY.boneMid, 0.6); g.lineBetween(nx - 86, ny - 16 + k * 10, nx - 78, ny - 12 + k * 10); g.lineBetween(nx + 78, ny - 16 + k * 10, nx + 86, ny - 12 + k * 10); }
}

// ── Set pieces ───────────────────────────────────────────────────────

/** The jawbone arch over the maelstrom stair, with the six princes' lamps strung across it. */
function stairArch(g: G): void {
  const x = STAIR.x, y = 196;
  shadow(g, x, y + 6, 420, 26, 0.45);
  // Two lower jawbones of some vast whale, planted heel-down, leaning together at the top.
  for (const side of [-1, 1]) {
    const bx = x + side * 190;
    const pts: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push({ x: bx - side * (Math.sin(t * Math.PI * 0.5) * 168), y: y - 10 - t * 166 + Math.sin(t * Math.PI) * -18 });
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const w = 26 - i * 1.0;
      g.lineStyle(w + 6, ABY.boneShadow, 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const w = 26 - i * 1.0;
      g.lineStyle(w, mixC(ABY.boneMid, ABY.bone, 0.4 + i / 40), 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      g.lineStyle(3, 0xffffff, 0.25); g.lineBetween(pts[i].x - side * 5, pts[i].y, pts[i + 1].x - side * 5, pts[i + 1].y);
    }
    // Socket holes where the teeth were drawn.
    for (let k = 3; k < 14; k += 2) { g.fillStyle(ABY.boneShadow, 0.9); g.fillEllipse(pts[k].x + side * 6, pts[k].y, 7, 5); }
    // The heel: a cairn of vertebrae holding it upright.
    for (let k = 0; k < 3; k++) {
      g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(bx + side * (k - 1) * 18, y - k * 12 + 4, 40, 22);
      g.fillStyle(ABY.boneMid, 1); g.fillEllipse(bx + side * (k - 1) * 18, y - k * 12, 36, 18);
    }
  }
  // Where they meet: lashed with black rope, and a crown of the Queen's tide-sigil in brass.
  g.lineStyle(6, ABY.tar, 1); g.lineBetween(x - 22, y - 178, x + 22, y - 166); g.lineBetween(x - 22, y - 166, x + 22, y - 178);
  g.lineStyle(4, ABY.brass, 1);
  g.beginPath(); g.arc(x, y - 186, 13, Math.PI * 0.15, Math.PI * 0.85, true); g.strokePath();
  for (let i = -1; i <= 1; i++) { g.lineBetween(x + i * 8, y - 192, x + i * 8, y - 196 + Math.abs(i) * 3); }
  // The six lamp-locks strung on a chain across the arch: dark globes (lit in animateOver).
  g.lineStyle(2, ABY.ironLit, 1);
  g.beginPath(); g.moveTo(x - 130, y - 128);
  for (let i = 0; i <= 12; i++) { const t = i / 12; g.lineTo(x - 130 + 260 * t, y - 128 + Math.sin(t * Math.PI) * 24); }
  g.strokePath();
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    const lx = x - 130 + 260 * t, ly = y - 128 + Math.sin(t * Math.PI) * 24;
    g.lineStyle(1.5, ABY.ironLit, 1); g.lineBetween(lx, ly, lx, ly + 12);
    g.fillStyle(ABY.iron, 1); g.fillRect(lx - 6, ly + 10, 12, 4);
    g.fillStyle(0x0a1018, 1); g.fillCircle(lx, ly + 22, 10);
    g.fillStyle(dim(SEALS[i], 0.7), 1); g.fillCircle(lx, ly + 22, 7);
    g.lineStyle(1, 0xffffff, 0.3); g.strokeCircle(lx, ly + 22, 10);
  }
}

/**
 * The Gape — Prince Lanternjaw's palace, the skull of an anglerfish so large the court lives
 * in its jaw. The lower jaw juts forward as the forecourt, the upper is the roof, the needle
 * teeth are the colonnade, and the eye sockets are the state windows. From the brow its lure
 * stalk curves out over the gate, and the esca hangs there as the court's own lamp.
 */
function gape(g: G, rng: () => number): void {
  const x = GAPE.x, y = GAPE.y;
  shadow(g, x, y + 8, 560, 40, 0.5);
  // Cranium: a long low dome, bone gone grey-green with age, plated like armour.
  const top = y - 330;
  g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(x, y - 210, 470, 300);
  g.fillStyle(mixC(ABY.boneDark, 0x56604e, 0.3), 1); g.fillEllipse(x, y - 214, 452, 284);
  g.fillStyle(mixC(ABY.boneMid, 0x7a8670, 0.25), 1); g.fillEllipse(x - 14, y - 236, 380, 200);
  // Bony plates and sutures across the dome.
  g.lineStyle(2, ABY.boneShadow, 0.7);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.05 + i * 0.1);
    g.lineBetween(x + Math.cos(a) * 60, y - 230 + Math.sin(a) * 40, x + Math.cos(a) * 220, y - 220 + Math.sin(a) * 140);
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle(lit(ABY.boneMid, 0.15), 0.4); g.fillCircle(x - 200 + rng() * 400, y - 330 + rng() * 150, 2 + rng() * 4);
  }
  // Eye sockets: two great orbits, lit from inside with amber (the state rooms).
  for (const side of [-1, 1]) {
    const ex = x + side * 120, ey = y - 250;
    g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(ex, ey, 104, 82);
    g.fillStyle(0x140c08, 1); g.fillEllipse(ex, ey + 4, 86, 66);
    g.fillStyle(ABY.lureDeep, 0.8); g.fillEllipse(ex, ey + 10, 56, 38);
    g.fillStyle(ABY.lure, 0.7); g.fillEllipse(ex, ey + 12, 34, 20);
    // Window mullions of bone splint.
    g.lineStyle(3, ABY.boneMid, 1); g.lineBetween(ex, ey - 28, ex, ey + 32); g.lineBetween(ex - 40, ey + 6, ex + 40, ey + 6);
  }
  // The upper jaw: a heavy overbite across the whole front.
  g.fillStyle(ABY.boneShadow, 1); g.fillRect(x - 230, y - 168, 460, 42);
  g.fillStyle(ABY.boneMid, 1); g.fillRect(x - 226, y - 166, 452, 34);
  g.fillStyle(lit(ABY.boneMid, 0.2), 1); g.fillRect(x - 226, y - 166, 452, 6);
  // The throat: the great hall, dark and warm.
  g.fillStyle(0x0d0806, 1); g.fillRect(x - 210, y - 132, 420, 132);
  g.fillStyle(ABY.gum, 0.7); g.fillRect(x - 210, y - 132, 420, 14);
  g.fillStyle(ABY.lureDeep, 0.18); g.fillEllipse(x, y - 50, 300, 120);
  // Teeth: the colonnade — needle fangs hanging from the upper jaw and rising from the lower,
  // long ones by the gate, in two staggered rows.
  for (let i = 0; i < 15; i++) {
    const tx = x - 200 + i * 28.5;
    const gate = Math.abs(tx - x) < 50;
    const len = gate ? 22 : 64 + ((i * 37) % 30);
    g.fillStyle(ABY.boneShadow, 1); g.fillTriangle(tx - 9, y - 132, tx + 9, y - 132, tx + 2, y - 132 + len + 4);
    g.fillStyle(ABY.tooth, 1); g.fillTriangle(tx - 7, y - 132, tx + 7, y - 132, tx + 2, y - 132 + len);
    g.fillStyle(0xffffff, 0.6); g.fillTriangle(tx - 2, y - 132, tx + 1, y - 132, tx + 2, y - 132 + len);
  }
  for (let i = 0; i < 14; i++) {
    const tx = x - 186 + i * 28.5;
    if (Math.abs(tx - x) < 46) continue;
    const len = 50 + ((i * 53) % 26);
    g.fillStyle(ABY.boneShadow, 1); g.fillTriangle(tx - 8, y - 4, tx + 8, y - 4, tx - 3, y - 4 - len - 4);
    g.fillStyle(ABY.tooth, 1); g.fillTriangle(tx - 6, y - 4, tx + 6, y - 4, tx - 3, y - 4 - len);
  }
  // The lower jaw: thrust forward as a step-lip.
  g.fillStyle(ABY.boneShadow, 1); g.fillRoundedRect(x - 250, y - 10, 500, 22, 10);
  g.fillStyle(ABY.boneMid, 1); g.fillRoundedRect(x - 246, y - 12, 492, 16, 8);
  // The gate between the two long fangs: a door of black lacquered hull-plank with brass studs.
  g.fillStyle(ABY.tar, 1); g.fillRoundedRect(x - 40, y - 108, 80, 100, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.fillStyle(ABY.hull, 1); g.fillRoundedRect(x - 34, y - 102, 68, 94, { tl: 26, tr: 26, bl: 0, br: 0 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { g.fillStyle(ABY.brass, 1); g.fillCircle(x - 20 + c * 20, y - 80 + r * 20, 2.2); }
  // The illicium: the lure stalk springing from the brow and curling out over the gate.
  const stalk: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    stalk.push({ x: x - 40 + Math.sin(t * Math.PI * 0.95) * 150 - t * 30, y: top + 30 - Math.sin(t * Math.PI) * 130 + t * 200 });
  }
  for (let i = 0; i < stalk.length - 1; i++) {
    const w = 12 - i * 0.45;
    g.lineStyle(w + 4, ABY.boneShadow, 1); g.lineBetween(stalk[i].x, stalk[i].y, stalk[i + 1].x, stalk[i + 1].y);
  }
  for (let i = 0; i < stalk.length - 1; i++) {
    const w = 12 - i * 0.45;
    g.lineStyle(w, ABY.boneMid, 1); g.lineBetween(stalk[i].x, stalk[i].y, stalk[i + 1].x, stalk[i + 1].y);
  }
  // Its socket: a ring of brass where the stalk meets the skull.
  g.fillStyle(ABY.brassDark, 1); g.fillEllipse(stalk[0].x, stalk[0].y, 34, 20);
  g.fillStyle(ABY.brass, 1); g.fillEllipse(stalk[0].x, stalk[0].y - 2, 26, 14);
  // The esca's cage (the glow is animated).
  const e = stalk[stalk.length - 1];
  g.fillStyle(ABY.lureDeep, 1); g.fillCircle(e.x, e.y + 12, 16);
  g.lineStyle(2, ABY.brass, 1); g.strokeCircle(e.x, e.y + 12, 18);
  // Banners: deep blue silk with the Queen's tide sigil and the prince's lamp beneath it.
  for (const bx of [x - 268, x + 268]) {
    g.fillStyle(ABY.boneShadow, 1); g.fillRect(bx - 3, y - 220, 6, 220);
    g.fillStyle(0x1b2c5a, 1); g.fillRect(bx - 22, y - 214, 44, 110);
    g.fillTriangle(bx - 22, y - 104, bx + 22, y - 104, bx, y - 84);
    g.lineStyle(2, ABY.brass, 0.9);
    g.beginPath(); g.arc(bx, y - 182, 12, Math.PI * 0.15, Math.PI * 0.85, true); g.strokePath();
    g.fillStyle(ABY.lure, 0.9); g.fillCircle(bx, y - 140, 6);
    g.lineStyle(1.5, ABY.brass, 0.9); g.lineBetween(bx, y - 162, bx, y - 146);
  }
}
/** Where the Gape's esca hangs (the animation reads it). */
const GAPE_ESCA = { x: GAPE.x - 70 + Math.sin(Math.PI * 0.95) * 150, y: GAPE.y - 100 + 12 };

function shrine(g: G, rng: () => number): void {
  const { x, y } = SHRINE;
  shadow(g, x, y + 6, 220, 28);
  // A slab of black basalt dredged from the trench, carved with tide lines.
  g.fillStyle(0x0b1018, 1); g.fillRect(x - 70, y - 50, 140, 52);
  g.fillStyle(0x1a2430, 1); g.fillRect(x - 66, y - 54, 132, 10);
  g.lineStyle(1.5, ABY.membraneDim, 0.7);
  for (let k = 0; k < 3; k++) {
    g.beginPath(); g.moveTo(x - 60, y - 34 + k * 10);
    for (let s = 1; s <= 12; s++) g.lineTo(x - 60 + s * 10, y - 34 + k * 10 + Math.sin(s * 1.2 + k) * 3);
    g.strokePath();
  }
  // A whale's jaw for a reredos, hung with dried kelp streamers.
  g.lineStyle(14, ABY.boneShadow, 1);
  g.beginPath(); g.arc(x, y - 54, 92, Math.PI * 1.02, Math.PI * 1.98, false); g.strokePath();
  g.lineStyle(10, ABY.boneMid, 1);
  g.beginPath(); g.arc(x, y - 54, 92, Math.PI * 1.02, Math.PI * 1.98, false); g.strokePath();
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.08 + i * 0.105);
    const sx = x + Math.cos(a) * 92, sy = y - 54 + Math.sin(a) * 92;
    const len = 30 + rng() * 40;
    g.lineStyle(4, ABY.kelp, 1); g.lineBetween(sx, sy, sx + Math.sin(i) * 6, sy + len);
    g.lineStyle(1.5, ABY.kelpLit, 0.8); g.lineBetween(sx + 1, sy, sx + Math.sin(i) * 6 + 1, sy + len);
  }
  // The conch on the altar the tidepriests blow before the Queen's tide.
  g.fillStyle(ABY.boneMid, 1); g.fillTriangle(x - 24, y - 56, x + 20, y - 70, x + 30, y - 56);
  g.fillStyle(0xf2b8b0, 1); g.fillEllipse(x + 22, y - 62, 18, 12);
  g.lineStyle(1, ABY.boneDark, 1);
  for (let k = 0; k < 4; k++) g.lineBetween(x - 18 + k * 9, y - 58, x - 14 + k * 9, y - 66 + k);
  // Candles of rendered whale oil, cold.
  for (const cx of [x - 50, x + 50]) {
    g.fillStyle(ABY.bone, 1); g.fillRect(cx - 4, y - 72, 8, 18);
    g.fillStyle(0x1a1410, 1); g.fillRect(cx - 0.5, y - 76, 1, 4);
  }
}

function greatLamp(g: G): void {
  const { x, y } = GREAT_LAMP;
  shadow(g, x, y + 4, 80, 22);
  // A whale-rib mast, braced with iron, a hook at the top holding a globe the size of a cart.
  g.fillStyle(ABY.ironLit, 1); g.fillRect(x - 26, y - 14, 52, 14);
  g.fillStyle(ABY.iron, 1); g.fillRect(x - 22, y - 12, 44, 10);
  g.lineStyle(12, ABY.boneShadow, 1); g.lineBetween(x, y - 10, x - 4, y - 210);
  g.lineStyle(9, ABY.boneMid, 1); g.lineBetween(x, y - 10, x - 4, y - 210);
  g.lineStyle(3, ABY.bone, 0.6); g.lineBetween(x - 3, y - 14, x - 7, y - 206);
  g.lineStyle(6, ABY.boneMid, 1);
  g.beginPath(); g.arc(x + 26, y - 210, 30, Math.PI, Math.PI * 1.95, false); g.strokePath();
  g.lineStyle(2, ABY.ironLit, 1); g.lineBetween(x + 54, y - 214, x + 54, y - 196);
  // The globe: thick green glass, an angler the size of a dog turning slowly inside.
  const gx = x + 54, gy = y - 160;
  g.fillStyle(0x0d2028, 0.95); g.fillCircle(gx, gy, 38);
  drawFish(g, gx - 4, gy + 6, Math.PI, 18, 0x2a1a20, -1, 0.9);
  // Its jaw and needle teeth.
  g.fillStyle(ABY.tooth, 0.9);
  for (let i = 0; i < 4; i++) g.fillTriangle(gx - 22 + i * 3, gy + 2, gx - 20 + i * 3, gy + 2, gx - 21 + i * 3, gy + 8);
  g.lineStyle(3, ABY.brassDark, 1); g.strokeCircle(gx, gy, 39);
  g.lineStyle(1.5, ABY.brass, 1); g.lineBetween(gx - 38, gy, gx + 38, gy); g.lineBetween(gx, gy - 38, gx, gy + 38);
  g.fillStyle(0xffffff, 0.18); g.fillEllipse(gx - 14, gy - 16, 20, 12);
  g.fillStyle(ABY.brass, 1); g.fillRect(gx - 10, gy - 44, 20, 8);
}
const GREAT_ESCA = { x: GREAT_LAMP.x + 54 - 26, y: GREAT_LAMP.y - 160 - 8 };

function streetLamp(g: G, x: number, y: number, flip: number): void {
  shadow(g, x, y, 22, 7);
  // A bone post, a crook at the top, a small globe hanging off it.
  g.lineStyle(6, ABY.boneShadow, 1); g.lineBetween(x, y, x, y - 70);
  g.lineStyle(4, ABY.boneMid, 1); g.lineBetween(x, y, x, y - 70);
  g.lineStyle(4, ABY.boneMid, 1);
  g.beginPath(); g.arc(x + flip * 12, y - 70, 12, flip > 0 ? Math.PI : 0, flip > 0 ? Math.PI * 1.95 : -Math.PI * 0.95, flip < 0); g.strokePath();
  g.lineStyle(1, ABY.ironLit, 1); g.lineBetween(x + flip * 24, y - 72, x + flip * 24, y - 62);
  const gx = x + flip * 24, gy = y - 50;
  g.fillStyle(0x0d2028, 0.95); g.fillCircle(gx, gy, 12);
  drawFish(g, gx, gy + 2, flip > 0 ? Math.PI : 0, 6, 0x2a1a20, -1, 0.9);
  g.lineStyle(1.5, ABY.brassDark, 1); g.strokeCircle(gx, gy, 12);
  g.fillStyle(0xffffff, 0.2); g.fillEllipse(gx - 4, gy - 5, 6, 4);
}
const lampFlip = (i: number): number => (i % 2 ? -1 : 1);
const lampEsca = (l: Pt, i: number): Pt => ({ x: l.x + lampFlip(i) * 16, y: l.y - 53 });

/** A whale-rib arch over the processional: two ribs leaning in to touch. */
function ribArch(g: G, y: number): void {
  const x = 1200;
  drawRib(g, x - ARCH_HALF, y, 150, 70, 0.4, 0.3);
  drawRib(g, x + ARCH_HALF, y, 150, -70, -0.4, 0.5);
  // Lashed at the crown with a hanging tithe-bell.
  g.lineStyle(4, ABY.tar, 1); g.lineBetween(x - 10, y - 150, x + 10, y - 140);
  g.lineStyle(1.5, ABY.ironLit, 1); g.lineBetween(x, y - 146, x, y - 128);
  g.fillStyle(ABY.brassDark, 1); g.fillTriangle(x - 7, y - 116, x + 7, y - 116, x, y - 130);
  g.fillStyle(ABY.brass, 1); g.fillEllipse(x, y - 116, 16, 5);
}

/** One rib pair of the whale fall, arching up over its spine from both sides. */
function whaleRibPair(g: G, t: number, reach: number, h: number, tone: number): void {
  const p = spineAt(t);
  const nx = -Math.sin(p.a), ny = Math.cos(p.a);
  const ax = p.x + nx * reach, ay = p.y + ny * reach; // south foot
  const bx = p.x - nx * reach, by = p.y - ny * reach; // north foot
  shadow(g, ax, ay, 26, 8); shadow(g, bx, by, 26, 8);
  const draw = (fx: number, fy: number, tx: number, ty: number, k: number): void => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const s = i / 14;
      pts.push({ x: fx + (tx - fx) * s * 0.5 + Math.sin(s * Math.PI) * 4, y: fy + (ty - fy) * s * 0.5 - Math.sin(s * Math.PI * 0.85) * h });
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const w = 10 - i * 0.45;
      g.lineStyle(w + 3, ABY.boneShadow, 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const w = 10 - i * 0.45;
      g.lineStyle(w, mixC(ABY.boneMid, ABY.bone, k), 1); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
    // Bone-worm fur and a few white bacterial streaks.
    for (let i = 2; i < pts.length - 2; i += 3) {
      g.fillStyle(ABY.blood, 0.7); g.fillCircle(pts[i].x + 3, pts[i].y + 1, 1.4);
      g.lineStyle(1, 0xffffff, 0.3); g.lineBetween(pts[i].x - 2, pts[i].y, pts[i + 1].x - 2, pts[i + 1].y);
    }
  };
  draw(bx, by, ax, ay, tone);       // the far rib first
  draw(ax, ay, bx, by, tone + 0.15);
}

function whaleSkull(g: G, rng: () => number): void {
  const { x, y } = WHALE_SKULL;
  shadow(g, x, y + 8, 220, 40, 0.45);
  // A rorqual's skull, half sunk: the long rostrum pointing west, the braincase a hump.
  g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(x + 30, y - 40, 150, 92);
  g.fillStyle(ABY.boneMid, 1); g.fillEllipse(x + 30, y - 44, 140, 82);
  g.fillStyle(ABY.bone, 0.8); g.fillEllipse(x + 18, y - 62, 80, 34);
  g.fillStyle(ABY.boneShadow, 1); g.fillTriangle(x - 40, y - 72, x - 40, y - 8, x - 150, y - 34);
  g.fillStyle(ABY.boneMid, 1); g.fillTriangle(x - 40, y - 68, x - 40, y - 12, x - 144, y - 36);
  g.fillStyle(lit(ABY.boneMid, 0.2), 1); g.fillTriangle(x - 40, y - 68, x - 40, y - 52, x - 140, y - 38);
  // The blowhole notch and an eye orbit, black.
  g.fillStyle(0x0d0c0a, 1); g.fillEllipse(x + 4, y - 48, 26, 18); g.fillEllipse(x - 30, y - 70, 14, 6);
  // Bone-worms and a crab in residence.
  for (let i = 0; i < 26; i++) {
    const wx = x - 120 + rng() * 220, wy = y - 80 + rng() * 64;
    g.lineStyle(1, ABY.blood, 0.8); g.lineBetween(wx, wy, wx, wy - 4);
    g.fillStyle(0xff7a7a, 0.85); g.fillCircle(wx, wy - 4, 1.2);
  }
  g.fillStyle(0xb85a3a, 1); g.fillEllipse(x + 70, y - 14, 18, 10);
  g.lineStyle(1.5, 0xb85a3a, 1); g.lineBetween(x + 62, y - 14, x + 54, y - 22); g.lineBetween(x + 78, y - 14, x + 86, y - 22);
}

/**
 * A hull-house: a drowned ship turned keel-up and stood on its gunwales, a door cut in the
 * bow and portholes for windows, coral crusting the seams and a tithe-slate nailed by the door.
 */
function hullHouse(g: G, x: number, y: number, s: number, flip: boolean, rng: () => number): void {
  const f = flip ? -1 : 1;
  const w = 116 * s, h = 92 * s;
  shadow(g, x, y + 4, w * 1.2, 22);
  // The hull: a long dark curve with the keel along the top.
  const base = mixC(ABY.hull, ABY.hullMid, rng() * 0.5);
  g.fillStyle(dim(base, 0.5), 1);
  g.fillRoundedRect(x - w / 2 - 3, y - h - 3, w + 6, h + 6, { tl: h * 0.55, tr: h * 0.55, bl: 4, br: 4 });
  g.fillStyle(base, 1);
  g.fillRoundedRect(x - w / 2, y - h, w, h, { tl: h * 0.5, tr: h * 0.5, bl: 2, br: 2 });
  // Strakes (planks running bow to stern).
  g.lineStyle(1.5, dim(base, 0.45), 1);
  for (let k = 1; k < 6; k++) {
    const yy = y - h + (h / 6) * k;
    const inset = Math.max(0, h * 0.5 - (h / 6) * k) * 0.9;
    g.lineBetween(x - w / 2 + inset, yy, x + w / 2 - inset, yy);
  }
  // The keel, and the bow's stem post curling up at one end.
  g.lineStyle(6 * s, ABY.tar, 1); g.lineBetween(x - w / 2 + h * 0.4, y - h - 1, x + w / 2 - h * 0.4, y - h - 1);
  g.lineStyle(5 * s, ABY.tar, 1);
  g.beginPath(); g.arc(x + f * (w / 2 - 8), y - h + 8, 16 * s, f > 0 ? -Math.PI * 0.9 : -Math.PI * 0.1, f > 0 ? -Math.PI * 0.1 : -Math.PI * 0.9, f < 0); g.strokePath();
  // Portholes, glowing amber (anglers in jars indoors) or cyan (coral).
  for (let i = 0; i < 3; i++) {
    const px = x - w * 0.3 + i * w * 0.3, py = y - h * 0.55;
    if (Math.abs(px - (x - f * w * 0.18)) < 16 * s) continue;
    const c = rng() < 0.6 ? ABY.lure : ABY.coralCyan;
    g.fillStyle(ABY.brassDark, 1); g.fillCircle(px, py, 9 * s);
    g.fillStyle(c, 0.12); g.fillCircle(px, py, 18 * s);
    g.fillStyle(c, 0.85); g.fillCircle(px, py, 6 * s);
    g.lineStyle(1, ABY.brass, 1); g.strokeCircle(px, py, 8 * s);
  }
  // A door hacked into the planking, with an oar for a bar.
  const dx = x - f * w * 0.18;
  g.fillStyle(0x0c0806, 1); g.fillRoundedRect(dx - 12 * s, y - 38 * s, 24 * s, 38 * s, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.fillStyle(ABY.hullLit, 1); g.fillRoundedRect(dx - 10 * s, y - 36 * s, 20 * s, 36 * s, { tl: 7, tr: 7, bl: 0, br: 0 });
  g.lineStyle(3, ABY.boneMid, 1); g.lineBetween(dx - 14 * s, y - 20 * s, dx + 14 * s, y - 22 * s);
  // The tithe-slate: tally marks — one per head, struck through when paid.
  g.fillStyle(0x1a2028, 1); g.fillRect(dx + f * 18 * s - 8, y - 46 * s, 16, 12);
  g.lineStyle(1, ABY.bone, 0.8);
  const heads = 2 + Math.floor(rng() * 4);
  for (let k = 0; k < heads; k++) g.lineBetween(dx + f * 18 * s - 6 + k * 3, y - 44 * s, dx + f * 18 * s - 6 + k * 3, y - 37 * s);
  if (rng() < 0.6) g.lineBetween(dx + f * 18 * s - 7, y - 38 * s, dx + f * 18 * s + 7, y - 44 * s);
  // Coral and barnacles crusting the waterline that is no longer a waterline.
  for (let i = 0; i < 12; i++) {
    const bx = x - w / 2 + rng() * w, by = y - 4 - rng() * 14;
    g.fillStyle(rng() < 0.5 ? ABY.boneMid : ABY.coralRoseDark, 0.9); g.fillCircle(bx, by, 2 + rng() * 3);
  }
  // A name, still legible on the transom.
  g.fillStyle(ABY.bone, 0.35);
  for (let k = 0; k < 5; k++) g.fillRect(x + f * (w * 0.1) + k * 5 - 12, y - h * 0.22, 3, 4);
}

function kelpStand(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 40, 10);
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    let bx = x + (i - n / 2) * 6, by = y;
    const lean = (rng() - 0.5) * 0.5;
    const hh = 90 + rng() * 80;
    for (let k = 0; k < 10; k++) {
      const ny = by - hh / 10, nx = bx + Math.sin(k * 0.8 + i) * 5 + lean * 6;
      g.lineStyle(4, ABY.kelp, 1); g.lineBetween(bx, by, nx, ny);
      if (k % 2 === 0) {
        // Dried bladders (the floats that kept it upright when this was sea).
        g.fillStyle(mixC(ABY.kelpLit, ABY.brass, 0.3), 1); g.fillEllipse(nx + 4, ny, 7, 5);
      }
      bx = nx; by = ny;
    }
    g.fillStyle(ABY.kelpLit, 0.8); g.fillEllipse(bx, by - 6, 8, 16);
  }
}

function vertebra(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 56 * s, 16 * s);
  // The centrum (a squat drum) and its spinous process sticking up like a shark fin.
  g.fillStyle(ABY.boneShadow, 1); g.fillEllipse(x, y - 10 * s, 50 * s, 30 * s);
  g.fillStyle(ABY.boneMid, 1); g.fillEllipse(x, y - 12 * s, 46 * s, 26 * s);
  g.fillStyle(ABY.bone, 1); g.fillEllipse(x - 4 * s, y - 16 * s, 26 * s, 12 * s);
  g.fillStyle(ABY.boneShadow, 1); g.fillTriangle(x - 8 * s, y - 20 * s, x + 10 * s, y - 20 * s, x + 6 * s, y - 50 * s);
  g.fillStyle(ABY.boneMid, 1); g.fillTriangle(x - 6 * s, y - 20 * s, x + 8 * s, y - 20 * s, x + 5 * s, y - 47 * s);
  // Transverse wings.
  g.fillStyle(ABY.boneDark, 1);
  g.fillTriangle(x - 20 * s, y - 14 * s, x - 38 * s, y - 20 * s, x - 18 * s, y - 6 * s);
  g.fillTriangle(x + 20 * s, y - 14 * s, x + 38 * s, y - 20 * s, x + 18 * s, y - 6 * s);
}

/** The Breathworks: two great leather bellows, a brass pressure drum, gauges and a tithe-meter. */
function breathworks(g: G): void {
  const { x, y } = BREATHWORKS;
  shadow(g, x, y + 4, 200, 26);
  // Iron frame.
  g.fillStyle(ABY.iron, 1); g.fillRect(x - 80, y - 20, 160, 20);
  g.fillStyle(ABY.ironLit, 1); g.fillRect(x - 80, y - 22, 160, 4);
  for (const side of [-1, 1]) {
    const bx = x + side * 46;
    // A bellows: two wooden boards hinged at the nozzle, leather pleats between.
    g.fillStyle(ABY.hullMid, 1); g.fillRect(bx - 28, y - 96, 56, 8); g.fillRect(bx - 28, y - 40, 56, 8);
    g.fillStyle(0x5a3424, 1); g.fillRect(bx - 26, y - 88, 52, 48);
    g.lineStyle(2, 0x3a2016, 1);
    for (let k = 1; k < 5; k++) g.lineBetween(bx - 26, y - 88 + k * 10, bx + 26, y - 88 + k * 10);
    g.fillStyle(ABY.brass, 1); g.fillTriangle(bx - side * 26, y - 70, bx - side * 26, y - 58, bx - side * 40, y - 64);
    // The lever arm and its counterweight (a sunken anchor).
    g.lineStyle(4, ABY.ironLit, 1); g.lineBetween(bx, y - 96, bx + side * 12, y - 140);
    g.fillStyle(ABY.iron, 1); g.fillRect(bx + side * 12 - 8, y - 148, 16, 10);
  }
  // The pressure drum in the middle, its dials, and the meter that counts who has paid for air.
  g.fillStyle(ABY.brassDark, 1); g.fillRoundedRect(x - 18, y - 120, 36, 100, 10);
  g.fillStyle(ABY.brass, 1); g.fillRoundedRect(x - 15, y - 118, 30, 96, 8);
  g.fillStyle(lit(ABY.brass, 0.3), 1); g.fillRect(x - 12, y - 114, 6, 88);
  for (let k = 0; k < 2; k++) {
    const dy = y - 96 + k * 36;
    g.fillStyle(0xe8e0c8, 1); g.fillCircle(x, dy, 9);
    g.lineStyle(1.5, ABY.tar, 1); g.strokeCircle(x, dy, 9);
    g.lineBetween(x, dy, x + 6 - k * 10, dy - 4 - k * 2);
  }
  g.lineStyle(10, ABY.iron, 1); g.lineBetween(x, y - 120, x - 10, y - 160); g.lineBetween(x - 10, y - 160, x - 60, y - 160);
  // Pipe down to the main.
  g.lineStyle(14, ABY.iron, 1); g.lineBetween(x - 70, y - 30, x - 64, y - 30);
}

/** Purser Gilly's shop: an old diving bell on its side, a counter in its mouth, goods on hooks. */
function shopBell(g: G): void {
  const { x, y } = SHOP;
  shadow(g, x, y + 4, 160, 24);
  g.fillStyle(ABY.brassDark, 1); g.fillEllipse(x, y - 56, 140, 112);
  g.fillStyle(ABY.brass, 1); g.fillEllipse(x, y - 58, 130, 104);
  g.fillStyle(lit(ABY.brass, 0.25), 1); g.fillEllipse(x - 30, y - 82, 50, 26);
  // Rivet seams.
  g.lineStyle(1, ABY.brassDark, 1); g.strokeEllipse(x, y - 58, 100, 80); g.strokeEllipse(x, y - 58, 60, 50);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.fillStyle(ABY.brassDark, 1); g.fillCircle(x + Math.cos(a) * 58, y - 58 + Math.sin(a) * 46, 1.6); }
  // The open mouth facing out, with the counter across it.
  g.fillStyle(0x140e08, 1); g.fillEllipse(x, y - 48, 92, 66);
  g.fillStyle(ABY.lure, 0.1); g.fillEllipse(x, y - 52, 80, 50);
  g.fillStyle(ABY.hullMid, 1); g.fillRect(x - 58, y - 30, 116, 30);
  g.fillStyle(ABY.hullLit, 1); g.fillRect(x - 62, y - 34, 124, 6);
  // Wares: a ballast stone, a valve ring, a jar with a gulper in it, a string of glow studs.
  g.fillStyle(0x4a5058, 1); g.fillEllipse(x - 40, y - 40, 14, 10);
  g.lineStyle(2.5, ABY.brass, 1); g.strokeCircle(x - 16, y - 41, 5);
  g.fillStyle(0x0d2028, 0.9); g.fillRoundedRect(x + 4, y - 52, 16, 18, 4);
  drawFish(g, x + 12, y - 43, 0, 5, 0x1a1418, -1, 0.9);
  for (let i = 0; i < 5; i++) { g.fillStyle(ABY.photo, 0.95); g.fillCircle(x + 30 + i * 5, y - 40 - (i % 2) * 2, 1.8); }
  // A porthole sign over the mouth: three tally strokes and a coin.
  g.fillStyle(ABY.iron, 1); g.fillCircle(x, y - 118, 13);
  g.fillStyle(ABY.brass, 1); g.fillCircle(x, y - 118, 7);
  g.lineStyle(1, ABY.brassDark, 1); g.lineBetween(x - 3, y - 121, x + 3, y - 115);
}

/** The bell-lift: a great diving bell on a chain from the dark above, resting on its pad. */
function bellLift(g: G): void {
  const { x, y } = BELL;
  // The chain rising out of sight (into the ceiling of the bubble, far above).
  for (let k = 0; k < 18; k++) {
    const cy = y - 120 - k * 18;
    g.lineStyle(3, ABY.ironLit, 1 - k * 0.05); g.strokeEllipse(x + (k % 2) * 1.5, cy, k % 2 ? 6 : 10, 14);
  }
  shadow(g, x, y - 12, 120, 30);
  g.fillStyle(ABY.iron, 1); g.fillRoundedRect(x - 52, y - 118, 104, 104, { tl: 46, tr: 46, bl: 6, br: 6 });
  g.fillStyle(mixC(ABY.iron, ABY.brass, 0.25), 1); g.fillRoundedRect(x - 48, y - 116, 96, 98, { tl: 42, tr: 42, bl: 4, br: 4 });
  g.fillStyle(ABY.brass, 1); g.fillRect(x - 54, y - 26, 108, 10);
  for (const px of [x - 22, x + 22]) {
    g.fillStyle(ABY.brassDark, 1); g.fillCircle(px, y - 72, 13);
    g.fillStyle(0x16303a, 1); g.fillCircle(px, y - 72, 9);
    g.fillStyle(0xffffff, 0.25); g.fillCircle(px - 3, y - 75, 3);
  }
  g.fillStyle(ABY.brass, 1); g.fillCircle(x, y - 122, 8);
  // The door hatch is open: a step down onto the pad.
  g.fillStyle(0x0a0d10, 1); g.fillRect(x - 16, y - 50, 32, 32);
  g.fillStyle(ABY.ironLit, 1); g.fillRect(x - 20, y - 18, 40, 5);
}

// ── The painter ──────────────────────────────────────────────────────

const CORAL_HUE = { cyan: ABY.coralCyan, rose: ABY.coralRose, violet: ABY.coralViolet };

/** A few vents in the floor where air seeps in from below: bubble streams rise off them. */
const SEEPS: Pt[] = [
  { x: 1010, y: 1180 }, { x: 1520, y: 1100 }, { x: 760, y: 980 }, { x: 1900, y: 1300 }, { x: 1440, y: 650 },
  { x: 560, y: 1420 }, { x: 1700, y: 760 }, { x: 2120, y: 960 }, { x: 360, y: 640 },
];

/** Big shapes that pass outside the skin, so the deep never looks empty. */
const OUTSIDE_SHAPES = [
  { y: 52, speed: 26, len: 240, seed: 1 },
  { y: H - 14, speed: -18, len: 340, seed: 2 },
];

export function makeAbyssalPainter(): AreaPainter {
  const pieces: NonNullable<AreaPainter['pieces']> = [];
  const add = (x: number, y: number, w: number, h: number, draw: (g: G, rng: () => number) => void): void => {
    pieces.push({ x, y, w, h, draw });
  };

  add(STAIR.x, 200, 440, 230, (g) => stairArch(g));
  add(GAPE.x, GAPE.y + 12, 580, 520, (g, rng) => gape(g, rng));
  add(SHRINE.x, SHRINE.y + 4, 240, 170, (g, rng) => shrine(g, rng));
  add(GREAT_LAMP.x, GREAT_LAMP.y + 2, 140, 240, (g) => greatLamp(g));
  LAMPS.forEach((l, i) => add(l.x, l.y, 60, 90, (g) => streetLamp(g, l.x, l.y, lampFlip(i))));
  for (const y of RIB_ARCHES) add(1200, y, 300, 180, (g) => ribArch(g, y));
  WHALE_RIBS.forEach((r, i) => {
    const p = spineAt(r.t);
    const footY = p.y + Math.cos(p.a) * r.reach;
    add(p.x, footY, r.reach * 2 + 40, r.h + 80, (g) => whaleRibPair(g, r.t, r.reach, r.h, (i % 3) * 0.12));
  });
  add(WHALE_SKULL.x, WHALE_SKULL.y + 6, 260, 140, (g, rng) => whaleSkull(g, rng));
  for (const h of HOUSES) add(h.x, h.y + 2, 140 * h.s, 120 * h.s, (g, rng) => hullHouse(g, h.x, h.y, h.s, h.flip, rng));
  for (const c of CORALS) add(c.x, c.y + 2, 90 * c.s, 110 * c.s, (g, rng) => drawCoral(g, c.x, c.y, 1.3 * c.s, CORAL_HUE[c.hue], rng));
  for (const k of KELP) add(k.x, k.y + 2, 70, 200, (g, rng) => kelpStand(g, k.x, k.y, rng));
  for (const v of VERTEBRAE) add(v.x, v.y + 2, 90 * v.s, 60 * v.s, (g) => vertebra(g, v.x, v.y, v.s));
  add(BREATHWORKS.x, BREATHWORKS.y + 2, 200, 180, (g) => breathworks(g));
  add(SHOP.x, SHOP.y + 4, 160, 130, (g) => shopBell(g));
  add(BELL.x, BELL.y + 2, 140, 460, (g) => bellLift(g));

  return {
    ground(g, rng) {
      deepWater(g, rng);
      siltFloor(g, rng);
      whaleGround(g, rng);
      plaza(g, rng);
      trench(g, rng);
      ROADS.forEach((r, i) => (i === 0 ? boneRoad(g, r.pts, r.w, rng) : plankRoad(g, r.pts, r.w, rng)));
      breathPipe(g);
      bellPad(g, rng);
      stairGround(g);
      // Faint coral glow pooled on the floor round each clump.
      for (const c of CORALS) { glow(g, c.x, c.y - 10, 70 * c.s, CORAL_HUE[c.hue], 0.025, 3); }
      for (const s of SEEPS) { g.fillStyle(0x0a0f16, 0.8); g.fillEllipse(s.x, s.y, 16, 7); g.lineStyle(1, ABY.siltPale, 0.4); g.strokeEllipse(s.x, s.y, 20, 9); }
      membraneEdge(g);
    },

    pieces,

    animate(g, t, view) {
      // The membrane shimmers: a slow travelling sheen along the skin.
      for (let i = 0; i < RING.length; i++) {
        const p = RING[i];
        if (!inView(view, p.x, p.y, 30)) continue;
        const k = 0.5 + 0.5 * Math.sin(t * 0.9 - i * 0.12);
        if (k < 0.7) continue;
        g.fillStyle(ABY.membrane, (k - 0.7) * 1.6); g.fillCircle(p.x, p.y, 2.2);
      }
      // Lights moving out in the deep beyond it: siphonophores and the odd passing shape.
      for (let i = 0; i < 14; i++) {
        const ph = (t * 0.012 + i * 0.071) % 1;
        const p = RING[Math.floor(ph * RING.length)];
        const ox = (p.x - W / 2) * 0.03, oy = (p.y - H / 2) * 0.03;
        const x = p.x + ox + Math.sin(t * 0.7 + i) * 6, y = p.y + oy + Math.cos(t * 0.5 + i) * 6;
        if (!inView(view, x, y, 40)) continue;
        const c = i % 3 === 0 ? ABY.coralRose : ABY.photo;
        g.fillStyle(c, 0.12); g.fillCircle(x, y, 9);
        g.fillStyle(c, 0.6 + Math.sin(t * 3 + i) * 0.3); g.fillCircle(x, y, 1.8);
      }
      for (const s of OUTSIDE_SHAPES) {
        const span = W + s.len * 2;
        const x = (((t * s.speed + s.seed * 900) % span) + span) % span - s.len;
        if (!inView(view, x, s.y, s.len)) continue;
        // A whale-sized silhouette, darker than the dark, with a single eye-light.
        g.fillStyle(0x000000, 0.55); g.fillEllipse(x, s.y, s.len, s.len * 0.18);
        g.fillTriangle(x - Math.sign(s.speed) * s.len * 0.5, s.y, x - Math.sign(s.speed) * s.len * 0.72, s.y - 26, x - Math.sign(s.speed) * s.len * 0.72, s.y + 26);
        g.fillStyle(ABY.photo, 0.4); g.fillCircle(x + Math.sign(s.speed) * s.len * 0.38, s.y - 6, 2.5);
      }
      // The trench breathes light: lanternfish shoals turning far below the lip.
      const tc = { x: TRENCH.x + TRENCH.w / 2, y: TRENCH.y + TRENCH.h / 2 };
      if (inView(view, tc.x, tc.y, 280)) {
        glow(g, tc.x + 10, tc.y + 8, 80 + Math.sin(t * 0.6) * 10, ABY.photo, 0.025, 3);
        for (let i = 0; i < 16; i++) {
          const a = t * (0.25 + (i % 4) * 0.06) + i * 0.9;
          const x = tc.x + Math.cos(a) * (60 + (i % 5) * 22), y = tc.y + 8 + Math.sin(a) * (24 + (i % 3) * 12);
          g.fillStyle(ABY.photo, 0.35 + 0.35 * Math.sin(t * 4 + i)); g.fillCircle(x, y, 1.6);
        }
      }
      // The maelstrom stair's eye turning.
      if (inView(view, STAIR.x, 120, 220)) {
        for (let k = 0; k < 4; k++) {
          const r = 22 + k * 14;
          g.lineStyle(2, ABY.membraneDim, 0.5 - k * 0.1);
          g.beginPath(); g.arc(STAIR.x, 124, r, t * (1.6 - k * 0.25) + k, t * (1.6 - k * 0.25) + k + Math.PI * 1.2, false); g.strokePath();
        }
        g.fillStyle(0x000000, 0.7); g.fillCircle(STAIR.x, 124, 12);
      }
      // Coral tips breathing on the floor.
      for (const c of CORALS) {
        if (!inView(view, c.x, c.y, 120)) continue;
        const k = 0.5 + 0.5 * Math.sin(t * 1.3 + c.x * 0.01);
        g.fillStyle(CORAL_HUE[c.hue], 0.05 + k * 0.05); g.fillEllipse(c.x, c.y + 4, 120 * c.s, 40 * c.s);
      }
      // Air seeping in through the floor.
      SEEPS.forEach((s, i) => { if (inView(view, s.x, s.y, 80)) bubbleStream(g, s.x, s.y, 70, t, i, 4, 0.5); });
    },

    animateOver(g, t, view) {
      // Every anglerfish lamp: its esca pulses on its own slow heartbeat.
      LAMPS.forEach((l, i) => {
        if (!inView(view, l.x, l.y - 60, 120)) return;
        const e = lampEsca(l, i);
        const k = 0.7 + 0.3 * Math.sin(t * (1.1 + (i % 5) * 0.13) + i);
        glow(g, e.x, e.y, 54 * k, ABY.lure, 0.035, 4);
        g.fillStyle(ABY.lure, 0.85 * k); g.fillCircle(e.x, e.y, 2.6);
        g.fillStyle(ABY.lureHot, 0.8 * k); g.fillCircle(e.x - 0.6, e.y - 0.8, 1.2);
      });
      // The Great Lamp, the Gape's own lure.
      if (inView(view, GREAT_ESCA.x, GREAT_ESCA.y, 200)) {
        const k = 0.8 + 0.2 * Math.sin(t * 0.9);
        glow(g, GREAT_ESCA.x + 26, GREAT_ESCA.y + 8, 150 * k, ABY.lure, 0.03, 5);
        drawEsca(g, GREAT_ESCA.x, GREAT_ESCA.y, 5, t, 0.9);
      }
      if (inView(view, GAPE_ESCA.x, GAPE_ESCA.y, 240)) {
        const sway = Math.sin(t * 0.7) * 6;
        glow(g, GAPE_ESCA.x + sway, GAPE_ESCA.y, 190, ABY.lure, 0.03, 5);
        drawEsca(g, GAPE_ESCA.x + sway, GAPE_ESCA.y, 11, t, 1);
        // Moths of the deep — tiny copepods — circling the light.
        for (let i = 0; i < 9; i++) {
          const a = t * (1.4 + i * 0.1) + i;
          g.fillStyle(0xe8f0ff, 0.6); g.fillCircle(GAPE_ESCA.x + sway + Math.cos(a) * (24 + i * 3), GAPE_ESCA.y + Math.sin(a) * (14 + i * 2), 1);
        }
      }
      // The six lamp-locks on the stair arch: each glows while its prince stands.
      if (inView(view, STAIR.x, 0, 320)) {
        for (let i = 0; i < 6; i++) {
          const tt = (i + 0.5) / 6;
          const lx = STAIR.x - 130 + 260 * tt, ly = 196 - 128 + Math.sin(tt * Math.PI) * 24 + 22;
          const k = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 1.04);
          g.fillStyle(SEALS[i], 0.08); g.fillCircle(lx, ly, 22);
          g.fillStyle(SEALS[i], 0.45 + k * 0.45); g.fillCircle(lx, ly, 5);
        }
      }
      // Bubbles rising off the bell-lift's chain, and off the Breathworks' nozzles as they pump.
      if (inView(view, BELL.x, BELL.y - 200, 200)) bubbleStream(g, BELL.x + 4, BELL.y - 130, 260, t, 31, 6, 0.45);
      const bw = BREATHWORKS;
      if (inView(view, bw.x, bw.y - 80, 160)) {
        const pump = 0.5 + 0.5 * Math.sin(t * 2.4);
        for (const side of [-1, 1]) {
          const nx = bw.x + side * 46 - side * 40, ny = bw.y - 64;
          for (let i = 0; i < 3; i++) {
            const ph = (t * 1.2 + i / 3) % 1;
            g.lineStyle(1, ABY.membrane, (1 - ph) * 0.6 * pump);
            g.strokeCircle(nx - side * ph * 26, ny - ph * 18, 2 + ph * 3);
          }
        }
      }
    },
  };
}
