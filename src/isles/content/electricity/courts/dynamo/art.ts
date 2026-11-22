import type { Pt } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, mulberry, shadow, type G } from '../../../../art/IsleArt';
import {
  ARC, ARC_CORE, ARC_VIOLET, BASALT, BASALT_LIT, BRASS, BRASS_DARK, BRASS_LIT, BRICK, BRICK_DARK, BRICK_LIT, CHALK,
  COIL_HOT, COPPER, COPPER_DARK, COPPER_LIT, CRUST, CRUST_DARK, FILAMENT, FILAMENT_DIM, FOAM, FOIL, GLASS, GLASS_LIT,
  INSULATOR, INSULATOR_LIT, IRON, IRON_DARK, IRON_LIT, OFF_RED, RACE, RACE_DEEP, RACE_LIT, RIVET, SLATE, SLATE_LIT,
  SPARK, TIMBER, TIMBER_DARK, TIMBER_LIT, VERDI, VERDI_DARK, VOLT,
} from './palette';

/**
 * The Dynamo Court's set pieces. Every function draws at a base/feet point (`x`, `y`) and builds
 * upward, so a piece sorts by its `y`. The animated parts (wheels turning, water running, arcs
 * jumping) are split out as their own functions for the area's `animate` hooks and the fights.
 */

// ── Shared: lightning ────────────────────────────────────────────────

/** A filled polygon from points. */
export function poly(g: G, pts: Pt[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

/** The jagged points of an arc from a to b, deterministic for a seed. */
export function boltPoints(ax: number, ay: number, bx: number, by: number, seed: number, jag = 14): Pt[] {
  const rng = mulberry((seed * 7919) | 0);
  const len = Math.hypot(bx - ax, by - ay);
  const n = Math.max(3, Math.round(len / 22));
  const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
  const pts: Pt[] = [{ x: ax, y: ay }];
  for (let k = 1; k < n; k++) {
    const f = k / n;
    const off = (rng() - 0.5) * 2 * jag * Math.sin(f * Math.PI);
    pts.push({ x: ax + (bx - ax) * f + nx * off, y: ay + (by - ay) * f + ny * off });
  }
  pts.push({ x: bx, y: by });
  return pts;
}

/**
 * A lightning arc: a wide soft glow, the coloured channel, and a white-hot core, with an
 * optional fork. `seed` should change a few times a second so the arc writhes.
 */
export function bolt(g: G, ax: number, ay: number, bx: number, by: number, seed: number, w = 3, color = ARC, alpha = 1, jag = 14, fork = true): void {
  const pts = boltPoints(ax, ay, bx, by, seed, jag);
  const line = (lw: number, c: number, a: number) => {
    g.lineStyle(lw, c, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  };
  line(w * 4, color, alpha * 0.14);
  line(w * 2, color, alpha * 0.35);
  line(w, color, alpha);
  line(Math.max(1, w * 0.4), ARC_CORE, alpha);
  if (fork && pts.length > 4) {
    const rng = mulberry((seed * 131) | 0);
    const i = 1 + Math.floor(rng() * (pts.length - 3));
    const p = pts[i];
    const a = Math.atan2(by - ay, bx - ax) + (rng() < 0.5 ? -0.8 : 0.8);
    const l = Math.hypot(bx - ax, by - ay) * (0.18 + rng() * 0.15);
    const f = boltPoints(p.x, p.y, p.x + Math.cos(a) * l, p.y + Math.sin(a) * l, seed + 3, jag * 0.6);
    g.lineStyle(w * 0.6, color, alpha * 0.7);
    g.beginPath(); g.moveTo(f[0].x, f[0].y);
    for (let k = 1; k < f.length; k++) g.lineTo(f[k].x, f[k].y);
    g.strokePath();
  }
}

/** Little sparks spitting off a point — a contact, a live tip. `t` in ms. */
export function sparks(g: G, x: number, y: number, r: number, t: number, n = 6, color = SPARK): void {
  for (let i = 0; i < n; i++) {
    const ph = ((t / 260) + i * 0.37) % 1;
    const a = i * 2.39 + Math.floor(t / 260 + i * 0.37) * 1.7;
    const d0 = r * 0.2 + ph * r, d1 = d0 + 4 + (1 - ph) * 5;
    g.lineStyle(1.4, ph < 0.5 ? ARC_CORE : color, 1 - ph);
    g.lineBetween(x + Math.cos(a) * d0, y + Math.sin(a) * d0, x + Math.cos(a) * d1, y + Math.sin(a) * d1 + ph * 3);
  }
}

/** A sagging cable between two points (a catenary, near enough). */
export function cablePoints(a: Pt, b: Pt, sag: number, n = 12): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * sag });
  }
  return pts;
}

export function cable(g: G, a: Pt, b: Pt, sag: number, color = COPPER_DARK, w = 2, alpha = 1): void {
  const pts = cablePoints(a, b, sag);
  g.lineStyle(w, color, alpha);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** The Empress's seal: a copper ring, a lightning bolt through it, three wires out of the top. */
export function gridSeal(g: G, x: number, y: number, r: number, color = COPPER, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.18), color, a); g.strokeCircle(x, y, r);
  poly(g, [
    { x: x + r * 0.15, y: y - r * 0.8 }, { x: x - r * 0.35, y: y + r * 0.08 }, { x: x, y: y + r * 0.08 },
    { x: x - r * 0.15, y: y + r * 0.8 }, { x: x + r * 0.38, y: y - r * 0.12 }, { x: x + r * 0.02, y: y - r * 0.12 },
  ], color, a);
  for (const k of [-1, 0, 1]) { g.lineStyle(Math.max(1, r * 0.1), color, a); g.lineBetween(x + k * r * 0.45, y - r * 0.9, x + k * r * 0.7, y - r * 1.5); }
}

// ── The storm's furniture ─────────────────────────────────────────────

/**
 * A lightning rod: a dressed basalt plinth, an iron mast banded with green glass insulators, a
 * three-pronged copper finial, and the copper earthing tape down to a plate in the ground.
 * `bend` (radians, 0 = upright) tips the mast's top half — the fights bend rods at people.
 */
export function lightningRod(g: G, x: number, y: number, h: number, bend = 0, glowK = 0): Pt {
  shadow(g, x, y + 2, 34, 10);
  // Earthing plate and the tape running to it.
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x + 16, y + 4, 18, 6);
  g.fillStyle(VERDI, 0.8); g.fillEllipse(x + 16, y + 3, 14, 4);
  g.lineStyle(2, COPPER, 1); g.lineBetween(x + 4, y - 12, x + 15, y + 2);
  // Plinth.
  g.fillStyle(dim(BASALT_LIT, 0.2), 1); g.fillRect(x - 11, y - 14, 22, 14);
  g.fillStyle(BASALT_LIT, 1); g.fillRect(x - 11, y - 16, 22, 4);
  g.fillStyle(lit(BASALT_LIT, 0.15), 1); g.fillRect(x - 11, y - 16, 22, 1.5);
  // The mast: straight lower half, the top half tipped by `bend`.
  const midY = y - 16 - h * 0.5;
  const tx = x + Math.sin(bend) * h * 0.5, ty = midY - Math.cos(bend) * h * 0.5;
  g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x, y - 16, x, midY);
  g.lineStyle(3, IRON_LIT, 1); g.lineBetween(x - 1, y - 16, x - 1, midY);
  g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x, midY, tx, ty);
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 1, midY, tx - 1, ty);
  // Insulators: stacked green glass skirts.
  for (const f of [0.25, 0.55]) {
    const iy = y - 16 - h * f;
    for (let k = 0; k < 3; k++) {
      g.fillStyle(dim(INSULATOR, 0.25), 1); g.fillEllipse(x, iy - k * 4 + 1, 13 - k, 5);
      g.fillStyle(INSULATOR, 1); g.fillEllipse(x, iy - k * 4, 12 - k, 4);
      g.fillStyle(INSULATOR_LIT, 0.7); g.fillEllipse(x - 2, iy - k * 4 - 1, 4, 1.6);
    }
  }
  // Finial: a copper ball with three prongs.
  const ux = Math.sin(bend), uy = -Math.cos(bend);
  for (const k of [-1, 0, 1]) {
    const a = Math.atan2(uy, ux) + k * 0.42;
    g.lineStyle(2, COPPER_LIT, 1);
    g.lineBetween(tx, ty, tx + Math.cos(a) * (k === 0 ? 14 : 10), ty + Math.sin(a) * (k === 0 ? 14 : 10));
  }
  g.fillStyle(COPPER_DARK, 1); g.fillCircle(tx, ty, 4.5);
  g.fillStyle(COPPER, 1); g.fillCircle(tx - 0.5, ty - 0.5, 3.5);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(tx - 1.5, ty - 1.5, 1.4);
  if (glowK > 0) glow(g, tx, ty, 22, ARC, 0.05 * glowK, 3);
  return { x: tx + ux * 14, y: ty + uy * 14 };
}

/** Where a pylon's two cable arms end, for stringing cable. */
export function pylonArms(x: number, y: number, h: number): [Pt, Pt] {
  const ay = y - h * 0.8 + 12;
  return [{ x: x - h * 0.24, y: ay }, { x: x + h * 0.24, y: ay }];
}

/**
 * A lattice pylon: two tapering riveted legs braced in a zigzag, a crossarm near the top with
 * green insulator strings hanging off each end, a little peak cap, and a danger plate with the
 * Empress's seal on it.
 */
export function pylon(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 4, h * 0.42, 14);
  const bw = h * 0.16, tw = h * 0.04;
  const leg = (s: number) => [{ x: x + s * bw, y }, { x: x + s * tw, y: y - h }];
  // Concrete footings.
  for (const s of [-1, 1]) { g.fillStyle(0x4a4a50, 1); g.fillRect(x + s * bw - 7, y - 5, 14, 7); }
  for (const s of [-1, 1]) {
    const [a, b] = leg(s);
    g.lineStyle(4, IRON_DARK, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(a.x - s, a.y, b.x - s, b.y);
  }
  // Zigzag bracing.
  const n = 7;
  for (let i = 0; i < n; i++) {
    const f0 = i / n, f1 = (i + 1) / n;
    const w0 = bw + (tw - bw) * f0, w1 = bw + (tw - bw) * f1;
    const y0 = y - h * f0, y1 = y - h * f1;
    g.lineStyle(1.5, IRON, 1);
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
    g.lineBetween(x - w1, y1, x + w1, y1);
  }
  // Crossarm and insulator strings.
  const ay = y - h * 0.8;
  g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x - h * 0.26, ay, x + h * 0.26, ay);
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x - h * 0.26, ay - 1.5, x + h * 0.26, ay - 1.5);
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x - h * 0.26, ay, x - tw * 2, ay - h * 0.08); g.lineBetween(x + h * 0.26, ay, x + tw * 2, ay - h * 0.08);
  for (const s of [-1, 1]) {
    const sx = x + s * h * 0.24;
    for (let k = 0; k < 3; k++) {
      g.fillStyle(dim(INSULATOR, 0.3), 1); g.fillEllipse(sx, ay + 3 + k * 3.5, 7, 3);
      g.fillStyle(INSULATOR, 1); g.fillEllipse(sx, ay + 2.5 + k * 3.5, 6, 2.4);
    }
  }
  // Peak cap and danger plate.
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(x - tw - 3, y - h, x + tw + 3, y - h, x, y - h - 10);
  g.fillStyle(0xe8d84a, 1); g.fillRect(x - 7, y - h * 0.32 - 7, 14, 12);
  g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 6, y - h * 0.32 - 6, 12, 2);
  gridSeal(g, x, y - h * 0.32, 3.4, 0x1a1a1a);
}

/** A cast-iron Grid street lamp, its filament bulb under a fluted glass shade. */
export function gridLamp(g: G, x: number, y: number, on: boolean): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 6, y - 6, 12, 6);
  g.fillStyle(IRON, 1); g.fillRect(x - 2.5, y - 60, 5, 56);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(x - 2, y - 60, 1.5, 56);
  // Swan-neck arm.
  g.lineStyle(3, IRON, 1);
  g.beginPath(); g.arc(x + 9, y - 60, 9, Math.PI, Math.PI * 1.75, false); g.strokePath();
  const bx = x + 15, by = y - 62;
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(bx - 9, by, bx + 9, by, bx, by - 7);
  g.fillStyle(on ? FILAMENT : FILAMENT_DIM, on ? 1 : 0.6); g.fillCircle(bx, by + 4, 4.5);
  g.fillStyle(GLASS, 0.3); g.fillEllipse(bx, by + 3, 16, 9);
  g.lineStyle(1, GLASS_LIT, 0.4); g.strokeEllipse(bx, by + 3, 16, 9);
  if (on) glow(g, bx, by + 6, 30, FILAMENT, 0.05, 3);
  // The meter collar every lamp wears.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 4, y - 30, 8, 6);
  g.fillStyle(BRASS, 1); g.fillRect(x - 3, y - 29, 6, 4);
}

/** A brass meter dial: bezel, cream face, ticks, a red zone, and a needle at `reading` (0–1). */
export function meterDial(g: G, x: number, y: number, r: number, reading: number): void {
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, r + 1.5);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, r);
  g.fillStyle(0xeee6cc, 1); g.fillCircle(x, y, r * 0.78);
  const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  g.lineStyle(Math.max(1, r * 0.16), OFF_RED, 0.9);
  g.beginPath(); g.arc(x, y, r * 0.6, a0, a0 + (a1 - a0) * 0.22, false); g.strokePath();
  for (let i = 0; i <= 6; i++) {
    const a = a0 + ((a1 - a0) * i) / 6;
    g.lineStyle(1, 0x2a2420, 1);
    g.lineBetween(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74);
  }
  const na = a0 + (a1 - a0) * Math.max(0, Math.min(1, reading));
  g.lineStyle(Math.max(1, r * 0.12), 0x1a1a1a, 1); g.lineBetween(x, y, x + Math.cos(na) * r * 0.68, y + Math.sin(na) * r * 0.68);
  g.fillStyle(0x1a1a1a, 1); g.fillCircle(x, y, Math.max(1, r * 0.12));
  g.fillStyle(ARC_CORE, 0.35); g.fillEllipse(x - r * 0.3, y - r * 0.35, r * 0.5, r * 0.25);
}

// ── Houses and shops ─────────────────────────────────────────────────

export interface CrankHouseOpts {
  /** Brick colour (a household's own). */
  wall: number;
  /** Household number painted over the door. */
  num: number;
  /** Times switched off (0–3): red tags on the door, and from 1 the windows go dark. */
  off: number;
  /** A crank wheel through the front wall (most have one). */
  crank?: boolean;
  /** A tall chimney — cold, by law (flame is contraband). */
  chimney?: boolean;
}

/**
 * A crank-house: a narrow soot-brick terrace with a slate roof, a lightning rod and the Grid wire
 * coming in at the gable on a glass insulator, a brass meter by the door, a crank wheel through
 * the wall, an electric lock box with its little lamp, and the windows — warm filament if the
 * house is on, black and frosted if it has been switched off. Returns the door point.
 */
export function crankHouse(g: G, x: number, y: number, w: number, h: number, o: CrankHouseOpts, rng: () => number): Pt {
  const x0 = x - w / 2;
  const top = y - h;
  shadow(g, x, y + 4, w * 1.05, 20);
  // Walls: brick courses with the odd darker brick.
  g.fillStyle(dim(o.wall, 0.15), 1); g.fillRect(x0, top, w, h);
  for (let ry = top + 2; ry < y; ry += 6) {
    const shift = ((ry - top) / 6) % 2 ? 0 : 5;
    for (let rx = x0 + shift - 10; rx < x0 + w; rx += 10) {
      const a = Math.max(x0, rx), b = Math.min(x0 + w, rx + 9);
      if (b <= a) continue;
      g.fillStyle(rng() < 0.15 ? dim(o.wall, 0.35) : rng() < 0.2 ? lit(o.wall, 0.1) : o.wall, 1);
      g.fillRect(a, ry, b - a, 5);
    }
  }
  // Soot streaks down from the eaves.
  for (let i = 0; i < 4; i++) { g.fillStyle(0x000000, 0.18); g.fillRect(x0 + 6 + rng() * (w - 12), top, 3 + rng() * 4, 10 + rng() * h * 0.5); }
  // Slate roof (a steep gable seen from the street).
  const rh = h * 0.55;
  poly(g, [{ x: x0 - 6, y: top + 2 }, { x: x0 + w + 6, y: top + 2 }, { x: x + w * 0.18, y: top - rh }, { x: x - w * 0.18, y: top - rh }], SLATE);
  for (let k = 1; k < 5; k++) {
    const yy = top + 2 - (rh * k) / 5;
    const inset = (w * 0.32 * k) / 5;
    g.lineStyle(1, SLATE_LIT, 0.5); g.lineBetween(x0 - 6 + inset, yy, x0 + w + 6 - inset, yy);
  }
  g.fillStyle(SLATE_LIT, 1); g.fillRect(x - w * 0.18, top - rh - 2, w * 0.36, 3);
  // Cold chimney with a lead cap (sealed by the Grid).
  if (o.chimney) {
    const cx = x0 + w * 0.78;
    g.fillStyle(BRICK_DARK, 1); g.fillRect(cx - 6, top - rh * 0.9, 12, rh * 0.7);
    g.fillStyle(0x6a6e74, 1); g.fillRect(cx - 8, top - rh * 0.9 - 4, 16, 5);
    g.fillStyle(0x9a9ea4, 1); g.fillRect(cx - 8, top - rh * 0.9 - 4, 16, 1.5);
  }
  // Roof rod and the Grid wire on its insulator.
  const rx = x - w * 0.1;
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(rx, top - rh, rx, top - rh - 22);
  g.fillStyle(COPPER, 1); g.fillCircle(rx, top - rh - 23, 2.2);
  g.fillStyle(INSULATOR, 1); g.fillEllipse(x + w * 0.12, top - rh + 6, 7, 4);
  g.lineStyle(1.5, COPPER_DARK, 1); g.lineBetween(x + w * 0.12, top - rh + 7, x + w * 0.12, top + 8);
  // Windows: upper pair and one beside the door.
  const on = o.off === 0;
  const win = (wx: number, wy: number, ww: number, wh: number) => {
    g.fillStyle(BRICK_DARK, 1); g.fillRect(wx - 2, wy - 2, ww + 4, wh + 5);
    if (on) {
      g.fillStyle(dim(FILAMENT, 0.25), 1); g.fillRect(wx, wy, ww, wh);
      g.fillStyle(FILAMENT, 0.7); g.fillRect(wx + 1, wy + wh * 0.4, ww - 2, wh * 0.6);
    } else {
      g.fillStyle(0x10141a, 1); g.fillRect(wx, wy, ww, wh);
      // Frost creeping in from the corners: a switched-off house has no heat.
      g.fillStyle(0xcfe6f0, 0.35); g.fillTriangle(wx, wy, wx + ww * 0.5, wy, wx, wy + wh * 0.5);
      g.fillTriangle(wx + ww, wy + wh, wx + ww * 0.5, wy + wh, wx + ww, wy + wh * 0.5);
    }
    g.lineStyle(1, 0x1a1210, 1); g.lineBetween(wx + ww / 2, wy, wx + ww / 2, wy + wh); g.lineBetween(wx, wy + wh / 2, wx + ww, wy + wh / 2);
    g.fillStyle(0x9a8a7a, 1); g.fillRect(wx - 3, wy + wh + 1, ww + 6, 2.5);
  };
  win(x0 + w * 0.14, top + h * 0.12, w * 0.24, h * 0.26);
  win(x0 + w * 0.62, top + h * 0.12, w * 0.24, h * 0.26);
  win(x0 + w * 0.64, top + h * 0.56, w * 0.22, h * 0.26);
  // The door, with the household number and the electric lock.
  const dx = x0 + w * 0.34, dw = w * 0.2, dh = h * 0.42;
  g.fillStyle(0x1a1210, 1); g.fillRect(dx - 2, y - dh - 2, dw + 4, dh + 2);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx, y - dh, dw, dh);
  g.lineStyle(1, TIMBER, 1); g.strokeRect(dx + 2, y - dh + 3, dw - 4, dh * 0.42); g.strokeRect(dx + 2, y - dh * 0.5, dw - 4, dh * 0.42);
  g.fillStyle(CHALK, 0.8);
  // Household number as tally strokes in a box.
  g.fillRect(dx + dw / 2 - 6, y - dh - 9, 12, 6);
  g.fillStyle(0x1a1a1a, 1);
  for (let k = 0; k < Math.min(5, (o.num % 5) + 1); k++) g.fillRect(dx + dw / 2 - 5 + k * 2.2, y - dh - 8, 1, 4);
  g.fillStyle(IRON_DARK, 1); g.fillRect(dx + dw + 1, y - dh * 0.6, 6, 9);
  g.fillStyle(on ? 0x5aff8a : OFF_RED, 1); g.fillCircle(dx + dw + 4, y - dh * 0.6 + 3, 1.6);
  // Red OFF tags, one per switch-off, tied to the knob.
  for (let k = 0; k < o.off; k++) {
    const tx = dx + dw - 4 - k * 5, ty = y - dh * 0.45 + k * 3;
    g.lineStyle(1, CHALK, 0.8); g.lineBetween(dx + dw - 3, y - dh * 0.5, tx, ty);
    g.fillStyle(OFF_RED, 1); g.fillRect(tx - 3, ty, 6, 8);
    g.fillStyle(CHALK, 0.9); g.fillRect(tx - 2, ty + 2, 4, 1);
  }
  // Brass meter on the wall by the door: on, it reads; off, the needle lies dead in the red.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 + w * 0.08 - 2, y - h * 0.5 - 2, 14, 18);
  meterDial(g, x0 + w * 0.08 + 5, y - h * 0.5 + 5, 5.5, on ? 0.35 + rng() * 0.5 : 0.02);
  // The crank wheel through the wall: the household's own dynamo is inside.
  if (o.crank !== false) {
    const cx = x0 + w * 0.9, cy = y - h * 0.3;
    g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, 8.5);
    g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(cx, cy, 7);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.lineBetween(cx, cy, cx + Math.cos(a) * 7, cy + Math.sin(a) * 7); }
    g.lineStyle(2.5, TIMBER_LIT, 1); g.lineBetween(cx + 5, cy - 5, cx + 11, cy - 11);
    g.fillStyle(TIMBER, 1); g.fillCircle(cx + 11, cy - 11, 2.4);
  }
  // Step and boot-scraper.
  g.fillStyle(BASALT_LIT, 1); g.fillRect(dx - 4, y - 2, dw + 8, 4);
  return { x: dx + dw / 2, y: y + 16 };
}

/**
 * Spool & Sons, the cablewright's: a wide brick workshop with a loading door, cable drums stacked
 * in the yard, a winding frame paying copper off a drum through a die, and a swinging sign of a
 * cable spool. Every charm Ottilie sells is wound on that frame.
 */
export function spoolShop(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  crankHouse(g, x - w * 0.18, y, w * 0.64, h, { wall: BRICK_LIT, num: 1, off: 0, crank: false, chimney: true }, rng);
  // The workshop wing: corrugated iron roof, big rolling door.
  const wx = x0 + w * 0.66, ww = w * 0.34, wh = h * 0.78;
  g.fillStyle(BRICK, 1); g.fillRect(wx, y - wh, ww, wh);
  g.fillStyle(IRON, 1); g.fillRect(wx - 4, y - wh - 10, ww + 8, 12);
  for (let k = 0; k < ww + 8; k += 5) { g.fillStyle(IRON_LIT, 0.5); g.fillRect(wx - 4 + k, y - wh - 10, 2, 12); }
  g.fillStyle(0x16181c, 1); g.fillRect(wx + 6, y - wh * 0.78, ww - 12, wh * 0.78);
  for (let k = 0; k < 7; k++) { g.fillStyle(IRON, 1); g.fillRect(wx + 6, y - wh * 0.78 + k * (wh * 0.78) / 7, ww - 12, 2); }
  glow(g, wx + ww / 2, y - wh * 0.3, 22, COPPER_LIT, 0.04, 2);
  // Hanging sign: a cable spool.
  const sx = x0 + w * 0.4, sy = y - h - 4;
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(sx, sy, sx + 30, sy); g.lineBetween(sx + 10, sy, sx + 10, sy + 6); g.lineBetween(sx + 26, sy, sx + 26, sy + 6);
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(sx + 4, sy + 6, 28, 18, 3);
  cableDrum(g, sx + 18, sy + 22, 0.32);
  // The yard: drums and the winding frame.
  for (let k = 0; k < 3; k++) cableDrum(g, x0 + 14 + k * 26, y + 26 + (k % 2) * 6, 0.62 + (k % 2) * 0.12);
  const fx = x0 + w * 0.82, fy = y + 30;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(fx - 20, fy - 26, 4, 26); g.fillRect(fx + 16, fy - 26, 4, 26);
  g.fillStyle(TIMBER, 1); g.fillRect(fx - 22, fy - 28, 44, 4);
  cableDrum(g, fx, fy - 4, 0.5);
  g.lineStyle(1.6, COPPER_LIT, 1); g.lineBetween(fx, fy - 18, fx + 34, fy - 24);
  g.fillStyle(IRON_DARK, 1); g.fillRect(fx + 30, fy - 30, 8, 12);
}

/** A cable drum on its side: two wooden flanges, copper wound between, a black-painted hub. */
export function cableDrum(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 1, 52 * s, 12 * s);
  const r = 22 * s, d = 14 * s;
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x + d, y - r, r * 0.7, r * 2);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - d, y - r * 0.78 - r * 0.0, d * 2, r * 1.56);
  for (let k = 0; k < 7; k++) { g.fillStyle(k % 2 ? COPPER : COPPER_LIT, 0.8); g.fillRect(x - d, y - r * 0.78 + k * r * 0.22, d * 2, r * 0.1); }
  g.fillStyle(TIMBER, 1); g.fillEllipse(x - d, y - r, r * 0.7, r * 2);
  g.lineStyle(1, TIMBER_LIT, 0.8); g.strokeEllipse(x - d, y - r, r * 0.5, r * 1.6);
  g.fillStyle(0x1a1a1a, 1); g.fillEllipse(x - d, y - r, r * 0.18, r * 0.44);
}

/**
 * The Ovenlight: a squat bake-house of pale brick with a great round window in its front — the
 * "oven light", the glow of the electric coil ovens behind it, the only warm window on the street
 * after the Bell. A copper steam vent instead of a chimney (flame is contraband), loaves on the
 * sill, a baker's peel crossed over the door, the bakery's own heavy meter, and its sign.
 */
export function ovenlight(g: G, x: number, y: number, w: number, h: number, rng: () => number): Pt {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.1, 24);
  const wall = 0x8a6a52;
  g.fillStyle(dim(wall, 0.2), 1); g.fillRect(x0, top, w, h);
  for (let ry = top + 2; ry < y; ry += 7) {
    const shift = ((ry - top) / 7) % 2 ? 0 : 6;
    for (let rx = x0 + shift - 12; rx < x0 + w; rx += 12) {
      const a = Math.max(x0, rx), b = Math.min(x0 + w, rx + 11);
      if (b > a) { g.fillStyle(rng() < 0.2 ? dim(wall, 0.12) : wall, 1); g.fillRect(a, ry, b - a, 6); }
    }
  }
  // Warm flour-dust and a lighter apron of brick round the window.
  g.fillStyle(0xffffff, 0.06); g.fillRect(x0, y - h * 0.45, w, h * 0.45);
  // Hipped slate roof and the copper steam vent with its puffing cap.
  poly(g, [{ x: x0 - 10, y: top + 2 }, { x: x0 + w + 10, y: top + 2 }, { x: x0 + w - 20, y: top - 34 }, { x: x0 + 20, y: top - 34 }], SLATE);
  g.fillStyle(SLATE_LIT, 1); g.fillRect(x0 + 20, top - 36, w - 40, 3);
  const vx = x0 + w * 0.72;
  g.fillStyle(COPPER_DARK, 1); g.fillRect(vx - 6, top - 64, 12, 34);
  g.fillStyle(COPPER, 1); g.fillRect(vx - 4, top - 64, 4, 34);
  g.fillStyle(VERDI, 1); g.fillTriangle(vx - 12, top - 62, vx + 12, top - 62, vx, top - 76);
  // The oven light: a round window, coils glowing behind it, a cross of glazing bars.
  const ox = x, oy = top + h * 0.42, orr = Math.min(w, h) * 0.24;
  g.fillStyle(BRICK_DARK, 1); g.fillCircle(ox, oy, orr + 7);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    g.fillStyle(k % 2 ? 0xa88468 : 0x9a765a, 1);
    g.fillCircle(ox + Math.cos(a) * (orr + 4), oy + Math.sin(a) * (orr + 4), 3.4);
  }
  g.fillStyle(0x3a1408, 1); g.fillCircle(ox, oy, orr);
  for (let k = 0; k < 5; k++) {
    const cy = oy - orr * 0.6 + k * orr * 0.3;
    const half = Math.sqrt(Math.max(0, orr * orr - (cy - oy) ** 2)) * 0.85;
    g.lineStyle(3, COIL_HOT, 0.9);
    g.beginPath();
    for (let i = 0; i <= 12; i++) {
      const xx = ox - half + (half * 2 * i) / 12, yy = cy + (i % 2 ? 3 : -3);
      if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
    }
    g.strokePath();
  }
  glow(g, ox, oy, orr * 1.6, COIL_HOT, 0.05, 3);
  g.lineStyle(3, 0x2a1810, 1); g.lineBetween(ox - orr, oy, ox + orr, oy); g.lineBetween(ox, oy - orr, ox, oy + orr);
  g.fillStyle(0xffe0b0, 0.15); g.fillEllipse(ox - orr * 0.35, oy - orr * 0.4, orr * 0.6, orr * 0.3);
  // Loaves cooling on the sill.
  g.fillStyle(0x6a5444, 1); g.fillRect(ox - orr - 10, oy + orr + 8, orr * 2 + 20, 5);
  for (let k = 0; k < 5; k++) {
    const lx = ox - orr + 4 + k * (orr * 2 - 8) / 4;
    g.fillStyle(CRUST_DARK, 1); g.fillEllipse(lx, oy + orr + 6, 14, 8);
    g.fillStyle(CRUST, 1); g.fillEllipse(lx, oy + orr + 5, 12, 6);
    g.lineStyle(1, CRUST_DARK, 1); g.lineBetween(lx - 3, oy + orr + 3, lx + 3, oy + orr + 6);
  }
  // Door with crossed peels over it.
  const dx = x0 + w * 0.12, dw = w * 0.18, dh = h * 0.5;
  g.fillStyle(0x1a1210, 1); g.fillRect(dx - 2, y - dh - 2, dw + 4, dh + 2);
  g.fillStyle(TIMBER, 1); g.fillRect(dx, y - dh, dw, dh);
  g.fillStyle(dim(FILAMENT, 0.2), 1); g.fillRect(dx + 3, y - dh + 4, dw - 6, dh * 0.3);
  for (const k of [-1, 1]) {
    g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(dx + dw / 2 - k * 16, y - dh - 4, dx + dw / 2 + k * 10, y - dh - 22);
    g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(dx + dw / 2 + k * 12, y - dh - 25, 10, 7);
  }
  // The bakery's meter: twice the size of a house's, because the ovens draw twice the Draw.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 + w * 0.84 - 10, y - h * 0.62 - 10, 20, 30);
  meterDial(g, x0 + w * 0.84, y - h * 0.62, 8, 0.82);
  meterDial(g, x0 + w * 0.84, y - h * 0.62 + 15, 4, 0.5);
  // Painted sign board under the eaves.
  g.fillStyle(0x2a1a14, 1); g.fillRect(x - w * 0.3, top + 6, w * 0.6, 14);
  g.fillStyle(BRASS, 1);
  for (let k = 0; k < 9; k++) g.fillRect(x - w * 0.26 + k * w * 0.058, top + 10, w * 0.04, 6);
  return { x: dx + dw / 2, y: y + 16 };
}

/**
 * The Meter Board at the court gate: a long black board under a little slate canopy, the Draw
 * chalked for every household in columns, red OFF tags pinned against the short, a brass master
 * meter at the end, and a clerk's lectern.
 */
export function meterBoard(g: G, x: number, y: number, w: number, rng: () => number): void {
  const x0 = x - w / 2, h = 70;
  shadow(g, x, y + 2, w * 1.05, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 4, y - h - 10, 6, h + 10); g.fillRect(x0 + w - 10, y - h - 10, 6, h + 10);
  g.fillStyle(0x15181c, 1); g.fillRect(x0, y - h - 6, w, h - 10);
  g.lineStyle(2, TIMBER, 1); g.strokeRect(x0, y - h - 6, w, h - 10);
  // Columns of chalk tallies.
  const cols = Math.floor(w / 26);
  for (let c = 0; c < cols; c++) {
    const cx = x0 + 8 + c * 26;
    g.fillStyle(CHALK, 0.85); g.fillRect(cx, y - h, 16, 2);
    for (let r = 0; r < 5; r++) {
      const ry = y - h + 8 + r * 9;
      const n = 1 + Math.floor(rng() * 5);
      for (let k = 0; k < n; k++) { g.fillStyle(CHALK, 0.7); g.fillRect(cx + k * 3, ry, 1.2, 6); }
      if (n === 5) { g.lineStyle(1, CHALK, 0.7); g.lineBetween(cx - 1, ry + 5, cx + 14, ry + 1); }
      if (rng() < 0.12) { g.fillStyle(OFF_RED, 1); g.fillRect(cx + 10, ry - 1, 6, 8); }
    }
  }
  // Canopy.
  poly(g, [{ x: x0 - 10, y: y - h - 6 }, { x: x0 + w + 10, y: y - h - 6 }, { x: x0 + w, y: y - h - 22 }, { x: x0, y: y - h - 22 }], SLATE);
  g.fillStyle(SLATE_LIT, 1); g.fillRect(x0, y - h - 23, w, 2);
  gridSeal(g, x, y - h - 30, 7, COPPER);
  // Master meter on its post.
  const mx = x0 + w + 22;
  g.fillStyle(IRON_DARK, 1); g.fillRect(mx - 3, y - 54, 6, 54);
  meterDial(g, mx, y - 62, 11, 0.7);
  // Lectern with the ledger.
  const lx = x0 + w * 0.3;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(lx - 3, y + 2 - 26, 6, 26);
  poly(g, [{ x: lx - 14, y: y - 26 }, { x: lx + 14, y: y - 26 }, { x: lx + 12, y: y - 34 }, { x: lx - 12, y: y - 34 }], TIMBER);
  g.fillStyle(CHALK, 1); g.fillRect(lx - 11, y - 33, 10, 6); g.fillRect(lx + 1, y - 33, 10, 6);
}

/**
 * The Brownout Bell: a tall riveted iron tower on basalt footings, the great bronze bell hung in
 * its top with an electric hammer on a solenoid beside it, a ladder up one leg, and a lamp-ring
 * of red bulbs round the belfry that burns for the hour after the Bell.
 */
export function bellTower(g: G, x: number, y: number, h: number): Pt {
  shadow(g, x, y + 4, 90, 22);
  const bw = 34, tw = 22;
  for (const s of [-1, 1]) {
    g.fillStyle(BASALT_LIT, 1); g.fillRect(x + s * bw - 10, y - 10, 20, 12);
    g.lineStyle(6, IRON_DARK, 1); g.lineBetween(x + s * bw, y - 10, x + s * tw, y - h);
    g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x + s * bw - s * 2, y - 10, x + s * tw - s * 2, y - h);
  }
  for (let i = 0; i < 6; i++) {
    const f0 = i / 6, f1 = (i + 1) / 6;
    const w0 = bw + (tw - bw) * f0, w1 = bw + (tw - bw) * f1;
    g.lineStyle(2, IRON, 1);
    g.lineBetween(x - w0, y - 10 - (h - 10) * f0, x + w1, y - 10 - (h - 10) * f1);
    g.lineBetween(x + w0, y - 10 - (h - 10) * f0, x - w1, y - 10 - (h - 10) * f1);
  }
  // Ladder up the left leg.
  for (let k = 0; k < 12; k++) { const yy = y - 14 - k * ((h - 30) / 12); g.lineStyle(1, RIVET, 0.8); g.lineBetween(x - bw + 4 + k * 1, yy, x - bw + 12 + k * 1, yy); }
  // Belfry: a platform, a pyramid cap, the bell.
  const by = y - h;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - tw - 10, by - 4, (tw + 10) * 2, 6);
  g.fillStyle(IRON, 1); g.fillRect(x - tw - 6, by - 56, 4, 52); g.fillRect(x + tw + 2, by - 56, 4, 52);
  poly(g, [{ x: x - tw - 14, y: by - 54 }, { x: x + tw + 14, y: by - 54 }, { x, y: by - 84 }], SLATE);
  g.lineStyle(2, COPPER, 1); g.lineBetween(x, by - 84, x, by - 104);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, by - 105, 2.5);
  // The bell.
  const bellTop = by - 50;
  poly(g, [{ x: x - 9, y: bellTop }, { x: x + 9, y: bellTop }, { x: x + 15, y: bellTop + 26 }, { x: x + 22, y: bellTop + 38 }, { x: x - 22, y: bellTop + 38 }, { x: x - 15, y: bellTop + 26 }], 0x8a6a2a);
  poly(g, [{ x: x - 6, y: bellTop + 2 }, { x: x - 2, y: bellTop + 2 }, { x: x - 8, y: bellTop + 36 }, { x: x - 16, y: bellTop + 36 }], BRASS_LIT, 0.4);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, bellTop + 38, 44, 7);
  g.fillStyle(0x1a1408, 1); g.fillEllipse(x, bellTop + 39, 36, 4);
  // Solenoid hammer.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x + 22, bellTop + 18, 12, 16);
  for (let k = 0; k < 5; k++) { g.fillStyle(COPPER_LIT, 0.8); g.fillRect(x + 22, bellTop + 19 + k * 3, 12, 1.2); }
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x + 22, bellTop + 26, x + 16, bellTop + 28);
  // Red lamp ring.
  for (let k = 0; k < 7; k++) { g.fillStyle(OFF_RED, 0.85); g.fillCircle(x - tw - 6 + k * ((tw + 6) * 2) / 6, by - 2, 2.4); }
  return { x, y: bellTop + 20 };
}

/**
 * The earthing cage: a wheeled cage of copper bars on an iron bed, a Faraday mesh over the top,
 * an electric padlock with a red lamp, a placard with the seal, and rails running off north
 * toward the Crown Coil. The earthed ride it up at the Bell.
 */
export function earthingCage(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 140, 22);
  // Rails north.
  g.lineStyle(3, IRON, 1); g.lineBetween(x - 22, y + 4, x - 22, y - 140); g.lineBetween(x + 22, y + 4, x + 22, y - 140);
  for (let k = 0; k < 8; k++) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30, y - k * 18, 60, 4); }
  // Bed and wheels.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 60, y - 20, 120, 12);
  for (const k of [-40, 40]) {
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k, y - 6, 9);
    g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(x + k, y - 6, 7);
  }
  // Bars.
  const top = y - 92;
  g.fillStyle(0x14161a, 0.6); g.fillRect(x - 56, top, 112, 72);
  for (let k = 0; k <= 12; k++) {
    const bx = x - 56 + k * (112 / 12);
    g.lineStyle(2.5, COPPER_DARK, 1); g.lineBetween(bx, top, bx, y - 20);
    g.lineStyle(1, COPPER_LIT, 0.8); g.lineBetween(bx - 0.8, top, bx - 0.8, y - 20);
  }
  g.fillStyle(COPPER, 1); g.fillRect(x - 60, top - 6, 120, 7); g.fillRect(x - 60, y - 54, 120, 4);
  // Faraday mesh roof.
  for (let k = 0; k <= 10; k++) { g.lineStyle(1, COPPER_LIT, 0.5); g.lineBetween(x - 60 + k * 12, top - 6, x - 50 + k * 10, top - 22); }
  g.lineStyle(2, COPPER, 1); g.lineBetween(x - 50, top - 22, x + 50, top - 22);
  // Lock and placard.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 50, y - 64, 14, 18);
  g.fillStyle(OFF_RED, 1); g.fillCircle(x + 57, y - 58, 2.4);
  g.fillStyle(CHALK, 0.9); g.fillRect(x - 24, top + 10, 48, 18);
  gridSeal(g, x, top + 19, 5, OFF_RED);
}

/** A switch cabinet: an iron box on legs, a knife switch on its face (up = on), and a lamp. */
export function switchCabinet(g: G, x: number, y: number, s: number, on: boolean, glowK = 0): void {
  shadow(g, x, y + 1, 34 * s, 10 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 12 * s, y - 6 * s, 3 * s, 6 * s); g.fillRect(x + 9 * s, y - 6 * s, 3 * s, 6 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 15 * s, y - 40 * s, 30 * s, 34 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 13 * s, y - 38 * s, 26 * s, 30 * s);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(x - 13 * s, y - 38 * s, 26 * s, 2 * s);
  for (const k of [-1, 1]) for (const j of [-1, 1]) { g.fillStyle(RIVET, 1); g.fillCircle(x + k * 11 * s, y - 23 * s + j * 13 * s, 1.1 * s); }
  // Knife switch: two blades on a slate base.
  g.fillStyle(0x2a2e34, 1); g.fillRect(x - 8 * s, y - 32 * s, 16 * s, 20 * s);
  const hinge = y - 16 * s;
  for (const k of [-1, 1]) {
    const tipY = on ? hinge - 14 * s : hinge + 10 * s;
    g.lineStyle(2.5 * s, COPPER_LIT, 1); g.lineBetween(x + k * 3.5 * s, hinge, x + k * 3.5 * s, tipY);
  }
  g.lineStyle(2 * s, 0x1a1a1a, 1); g.lineBetween(x - 6 * s, on ? hinge - 14 * s : hinge + 10 * s, x + 6 * s, on ? hinge - 14 * s : hinge + 10 * s);
  g.fillStyle(0x8a1a12, 1); g.fillRect(x - 3 * s, (on ? hinge - 18 * s : hinge + 10 * s), 6 * s, 4 * s);
  g.fillStyle(on ? 0x5aff8a : OFF_RED, 1); g.fillCircle(x + 9 * s, y - 35 * s, 2 * s);
  if (glowK > 0) glow(g, x, y - 22 * s, 30 * s, on ? FILAMENT : OFF_RED, 0.05 * glowK, 3);
}

/**
 * A fusebox: a riveted wall cabinet with a glass window over a fat brass-capped fuse cartridge;
 * its filament glows hotter as `fill` (0–1) climbs, and warning stripes run round its rim.
 */
export function fuseBox(g: G, x: number, y: number, s: number, fill: number, present = true, t = 0): void {
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - 17 * s, y - 21 * s, 36 * s, 44 * s, 4 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 18 * s, y - 22 * s, 36 * s, 44 * s, 4 * s);
  // Hazard stripes.
  for (let k = 0; k < 8; k++) {
    g.fillStyle(k % 2 ? 0x1a1a1a : 0xe8c838, 1);
    g.fillRect(x - 18 * s + k * 4.5 * s, y - 22 * s, 4.5 * s, 4 * s);
    g.fillRect(x - 18 * s + k * 4.5 * s, y + 18 * s, 4.5 * s, 4 * s);
  }
  g.fillStyle(IRON, 1); g.fillRect(x - 14 * s, y - 16 * s, 28 * s, 32 * s);
  // Window.
  g.fillStyle(0x0c0e12, 1); g.fillRect(x - 9 * s, y - 13 * s, 18 * s, 26 * s);
  if (present) {
    const hot = mixC(0x6a2a10, 0xfff0c0, fill);
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 5 * s, y - 12 * s, 10 * s, 4 * s); g.fillRect(x - 5 * s, y + 8 * s, 10 * s, 4 * s);
    g.fillStyle(BRASS, 1); g.fillRect(x - 4 * s, y - 12 * s, 8 * s, 2 * s);
    g.fillStyle(GLASS, 0.25); g.fillRect(x - 4 * s, y - 8 * s, 8 * s, 16 * s);
    g.lineStyle(1.5 * s, hot, 1);
    g.beginPath();
    for (let i = 0; i <= 8; i++) { const yy = y - 8 * s + i * 2 * s, xx = x + (i % 2 ? 2 : -2) * s; if (i === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
    g.strokePath();
    if (fill > 0.5) glow(g, x, y, 18 * s, hot, 0.05 * (fill - 0.4) * 2, 3);
    if (fill > 0.85) sparks(g, x, y - 14 * s, 10 * s, t, 4);
  } else {
    g.fillStyle(0x000000, 0.6); g.fillRect(x - 4 * s, y - 10 * s, 8 * s, 20 * s);
  }
  g.lineStyle(1.5 * s, GLASS_LIT, 0.25); g.lineBetween(x - 7 * s, y - 11 * s, x - 7 * s, y + 6 * s);
}

/** A fuse cartridge in the hand: a fibre tube, brass caps, and a fizzing spark at one end. */
export function fuseCartridge(g: G, x: number, y: number, a: number, t: number, s = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a);
  g.lineStyle(7 * s, 0x6a3a1a, 1); g.lineBetween(x - ux * 8 * s, y - uy * 8 * s, x + ux * 8 * s, y + uy * 8 * s);
  g.lineStyle(7 * s, BRASS, 1);
  g.lineBetween(x - ux * 10 * s, y - uy * 10 * s, x - ux * 7 * s, y - uy * 7 * s);
  g.lineBetween(x + ux * 7 * s, y + uy * 7 * s, x + ux * 10 * s, y + uy * 10 * s);
  sparks(g, x + ux * 11 * s, y + uy * 11 * s, 8 * s, t, 5);
}

// ── The big machines ─────────────────────────────────────────────────

/**
 * Prince Volt's generator hall: a long soot-brick hall with tall round-headed windows burning
 * blue-white, the great dynamo's ring showing through each; a clerestory roof of iron and glass;
 * a copper cupola with a forest of lightning-rod spires; the high double doors under a copper
 * lightning bolt; and the hall's cables leaving the gable on a bank of insulators.
 */
export function turbineHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 8, w * 1.06, 36);
  // Basalt plinth.
  g.fillStyle(BASALT_LIT, 1); g.fillRect(x0 - 10, y - 22, w + 20, 22);
  g.fillStyle(lit(BASALT_LIT, 0.12), 1); g.fillRect(x0 - 10, y - 22, w + 20, 3);
  // Brick body.
  g.fillStyle(BRICK, 1); g.fillRect(x0, top, w, h - 22);
  for (let ry = top + 3; ry < y - 22; ry += 7) {
    for (let rx = x0 + (((ry - top) / 7) % 2 ? 0 : 7); rx < x0 + w; rx += 14) {
      if (rng() < 0.3) { g.fillStyle(rng() < 0.5 ? BRICK_DARK : BRICK_LIT, 0.6); g.fillRect(rx, ry, 13, 6); }
    }
  }
  // Pilasters and tall windows.
  const bays = Math.max(5, Math.round(w / 90));
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x0 + i * bw;
    g.fillStyle(BRICK_DARK, 1); g.fillRect(bx, top, 8, h - 22);
    g.fillStyle(BRICK_LIT, 0.5); g.fillRect(bx + 1, top, 2, h - 22);
    if (i === Math.floor(bays / 2)) continue;
    const wx = bx + bw * 0.24, ww = bw * 0.56, wy = top + h * 0.14, wh = h * 0.6;
    g.fillStyle(0x0b1420, 1); g.fillRect(wx, wy + ww / 2, ww, wh - ww / 2);
    g.fillCircle(wx + ww / 2, wy + ww / 2, ww / 2);
    // The glow inside and the dynamo ring showing through.
    g.fillStyle(dim(ARC, 0.55), 1); g.fillRect(wx + 2, wy + ww / 2, ww - 4, wh - ww / 2 - 2);
    g.fillStyle(dim(ARC, 0.4), 1); g.fillCircle(wx + ww / 2, wy + ww / 2, ww / 2 - 2);
    g.lineStyle(3, dim(VOLT, 0.6), 0.9); g.strokeCircle(wx + ww / 2, wy + wh * 0.62, ww * 0.42);
    g.lineStyle(1.5, ARC, 0.6); g.strokeCircle(wx + ww / 2, wy + wh * 0.62, ww * 0.26);
    // Glazing bars.
    for (let k = 1; k < 4; k++) { g.lineStyle(1.5, 0x1a2a3a, 1); g.lineBetween(wx, wy + ww / 2 + ((wh - ww / 2) * k) / 4, wx + ww, wy + ww / 2 + ((wh - ww / 2) * k) / 4); }
    g.lineStyle(1.5, 0x1a2a3a, 1); g.lineBetween(wx + ww / 2, wy, wx + ww / 2, wy + wh);
    g.fillStyle(GLASS_LIT, 0.15); g.fillRect(wx + 3, wy + ww / 2, 3, wh * 0.6);
    // Stone sill and keystone.
    g.fillStyle(0x8a8478, 1); g.fillRect(wx - 4, wy + wh, ww + 8, 4);
    g.fillStyle(0x8a8478, 1); g.fillRect(wx + ww / 2 - 4, wy - 4, 8, 8);
  }
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0 + w - 8, top, 8, h - 22);
  // Cornice.
  g.fillStyle(0x6a6458, 1); g.fillRect(x0 - 8, top - 8, w + 16, 10);
  g.fillStyle(0x8a8478, 1); g.fillRect(x0 - 8, top - 10, w + 16, 3);
  // Clerestory: iron and glass, lit from inside.
  const ch = 46;
  poly(g, [{ x: x0 + 10, y: top - 8 }, { x: x0 + w - 10, y: top - 8 }, { x: x0 + w - 40, y: top - 8 - ch }, { x: x0 + 40, y: top - 8 - ch }], IRON_DARK);
  for (let k = 0; k < 18; k++) {
    const fx = x0 + 44 + (k * (w - 88)) / 18;
    g.fillStyle(dim(ARC, 0.5), 0.9); g.fillRect(fx + 2, top - 8 - ch + 8, (w - 88) / 18 - 4, ch - 14);
  }
  g.fillStyle(SLATE, 1); poly(g, [{ x: x0 + 30, y: top - 8 - ch }, { x: x0 + w - 30, y: top - 8 - ch }, { x: x0 + w - 70, y: top - 8 - ch - 26 }, { x: x0 + 70, y: top - 8 - ch - 26 }], SLATE);
  // Copper cupola and its spires.
  const cy = top - 8 - ch - 26;
  g.fillStyle(VERDI_DARK, 1); g.fillRect(x - 46, cy - 26, 92, 28);
  for (let k = 0; k < 6; k++) { g.fillStyle(dim(ARC, 0.4), 1); g.fillRect(x - 40 + k * 14, cy - 20, 8, 16); }
  g.fillStyle(VERDI, 1); g.fillEllipse(x, cy - 26, 100, 22);
  g.fillStyle(VERDI, 1); g.fillTriangle(x - 46, cy - 28, x + 46, cy - 28, x, cy - 70);
  g.fillStyle(lit(VERDI, 0.25), 0.6); g.fillTriangle(x - 30, cy - 30, x - 8, cy - 30, x - 2, cy - 64);
  for (const k of [-2, -1, 0, 1, 2]) {
    const sx = x + k * 20, sh = k === 0 ? 64 : 34 - Math.abs(k) * 4;
    const base = k === 0 ? cy - 68 : cy - 30;
    g.lineStyle(k === 0 ? 3 : 2, COPPER_LIT, 1); g.lineBetween(sx, base, sx, base - sh);
    g.fillStyle(COPPER_LIT, 1); g.fillCircle(sx, base - sh, k === 0 ? 3.5 : 2.2);
  }
  // The doors under a copper bolt.
  const dw = bw * 0.7, dh = h * 0.6, dx = x - dw / 2;
  g.fillStyle(0x0e1014, 1); g.fillRect(dx - 6, y - 22 - dh - 6, dw + 12, dh + 6);
  g.fillCircle(x, y - 22 - dh, dw / 2 + 6);
  g.fillStyle(IRON, 1); g.fillRect(dx, y - 22 - dh, dw, dh);
  g.fillStyle(IRON_LIT, 0.4);
  for (let k = 0; k < 6; k++) g.fillRect(dx + 3, y - 22 - dh + 6 + k * (dh / 6), dw - 6, 2);
  g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y - 22 - dh, x, y - 22);
  g.fillStyle(dim(ARC, 0.4), 1); g.fillCircle(x, y - 22 - dh, dw / 2);
  g.lineStyle(2, IRON_DARK, 1);
  for (let k = 0; k < 6; k++) { const a = Math.PI + (k / 5) * Math.PI; g.lineBetween(x, y - 22 - dh, x + Math.cos(a) * dw / 2, y - 22 - dh + Math.sin(a) * dw / 2); }
  gridSeal(g, x, y - 22 - dh - dw / 2 - 22, 14, COPPER_LIT);
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? BASALT_LIT : lit(BASALT_LIT, 0.1), 1); g.fillRect(dx - 12 - k * 8, y - 14 + k * 5, dw + 24 + k * 16, 5); }
  // Gable insulators and the cables leaving.
  for (const s of [-1, 1]) {
    const gx = s < 0 ? x0 + 30 : x0 + w - 30;
    for (let k = 0; k < 4; k++) {
      g.fillStyle(INSULATOR, 1); g.fillEllipse(gx + s * k * 9, top - 18 - k * 3, 8, 4);
      g.fillStyle(INSULATOR_LIT, 0.6); g.fillEllipse(gx + s * k * 9 - 1, top - 19 - k * 3, 3, 1.4);
    }
  }
}

/**
 * The frame of a great treadwheel: two A-frames of tarred timber, an iron axle and bearing, the
 * dynamo housing at its foot with the drive belt, a cranking gallery step, and the overseer's
 * meter post. The wheel itself turns in `treadwheelSpin` (drawn under this frame).
 */
export function treadwheelFrame(g: G, x: number, y: number, r: number): void {
  const ay = y - r - 18;
  for (const s of [-1, 1]) {
    g.lineStyle(9, TIMBER_DARK, 1); g.lineBetween(x + s * r * 0.75, y, x, ay);
    g.lineStyle(3, TIMBER, 1); g.lineBetween(x + s * r * 0.75 - s * 2, y, x - s * 1, ay);
    g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(x + s * r * 0.45, y - r * 0.38, x - s * r * 0.02, y - r * 0.38);
  }
  // Axle bearing.
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, ay, 11);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(x, ay, 6);
  g.fillStyle(RIVET, 1); g.fillCircle(x - 2, ay - 2, 2);
  // The dynamo at the foot: a fat drum of copper windings and the belt up to the axle.
  const dx = x + r * 0.95, dy = y - 16;
  g.lineStyle(3, 0x1a1210, 1); g.lineBetween(x + 6, ay, dx - 6, dy - 10); g.lineBetween(x - 2, ay + 6, dx - 12, dy + 2);
  shadow(g, dx, y + 2, 46, 12);
  g.fillStyle(IRON_DARK, 1); g.fillRect(dx - 18, dy - 16, 36, 30);
  for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? COPPER : COPPER_DARK, 1); g.fillRect(dx - 15 + k * 3.8, dy - 14, 3, 24); }
  g.fillStyle(IRON, 1); g.fillCircle(dx - 18, dy - 1, 9); g.fillCircle(dx + 18, dy - 1, 9);
  g.fillStyle(INSULATOR, 1); g.fillEllipse(dx, dy - 22, 8, 4);
  g.lineStyle(1.5, COPPER_DARK, 1); g.lineBetween(dx, dy - 22, dx + 4, dy - 60);
  // Gallery step.
  g.fillStyle(TIMBER, 1); g.fillRect(x - r * 0.6, y - 6, r * 1.2, 6);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - r * 0.6, y - 6, r * 1.2, 1.5);
  // Overseer's meter post.
  const mx = x - r * 0.95;
  g.fillStyle(IRON_DARK, 1); g.fillRect(mx - 2, y - 48, 4, 48);
  meterDial(g, mx, y - 54, 9, 0.6);
}

/**
 * The turning part of a treadwheel: rim, spokes, tread slats and two cranks walking the bottom
 * of the wheel in step. `a` is the wheel's angle (radians); `t` seconds for the walkers' bob.
 */
export function treadwheelSpin(g: G, x: number, y: number, r: number, a: number, t: number, walkers = 2): void {
  const ay = y - r - 18;
  g.fillStyle(0x0c0d10, 0.55); g.fillCircle(x, ay, r);
  // Tread slats on the inside of the rim.
  for (let k = 0; k < 28; k++) {
    const b = a + (k / 28) * Math.PI * 2;
    g.lineStyle(4, k % 2 ? TIMBER : TIMBER_LIT, 1);
    g.lineBetween(x + Math.cos(b) * (r - 10), ay + Math.sin(b) * (r - 10), x + Math.cos(b) * (r - 2), ay + Math.sin(b) * (r - 2));
  }
  g.lineStyle(5, TIMBER_DARK, 1); g.strokeCircle(x, ay, r);
  g.lineStyle(2, IRON_LIT, 0.8); g.strokeCircle(x, ay, r + 2);
  g.lineStyle(3, TIMBER_DARK, 1); g.strokeCircle(x, ay, r - 12);
  for (let k = 0; k < 8; k++) {
    const b = a + (k / 8) * Math.PI * 2;
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x, ay, x + Math.cos(b) * (r - 12), ay + Math.sin(b) * (r - 12));
  }
  // Two cranks walking the bottom of the wheel, leaning in.
  for (let i = 0; i < walkers; i++) {
    const wx = x - 14 + i * 26, bob = Math.abs(Math.sin(t * 5 + i * 1.6)) * 3;
    const wy = ay + r - 14 - bob;
    g.fillStyle(0x2a2a30, 1); g.fillEllipse(wx, wy - 10, 12, 18);
    g.fillStyle(0xc8a888, 1); g.fillCircle(wx + 2, wy - 22, 5);
    g.lineStyle(3, 0x2a2a30, 1);
    g.lineBetween(wx, wy - 2, wx - 5 + Math.sin(t * 10 + i) * 4, wy + 8); g.lineBetween(wx, wy - 2, wx + 5 - Math.sin(t * 10 + i) * 4, wy + 8);
  }
}

/**
 * A wheelhouse on the race bank: a little brick house with a dynamo window, the wheel's axle
 * coming out of its side on a bearing, a cable bundle up to the Grid on an insulator stack, and
 * a sluice lever. The wheel itself turns in `waterwheelSpin`.
 */
export function wheelhouse(g: G, x: number, y: number, rng: () => number): void {
  crankHouse(g, x, y, 92, 70, { wall: BRICK, num: 3, off: 0, crank: false }, rng);
  // Axle out of the south wall, down toward the race.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 6, y - 8, 12, 30);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 3, y - 8, 3, 30);
  // A sluice lever beside it.
  g.lineStyle(3, IRON, 1); g.lineBetween(x + 40, y + 6, x + 52, y - 26);
  g.fillStyle(OFF_RED, 1); g.fillCircle(x + 52, y - 27, 3.5);
  // Insulator stack and cables up.
  for (let k = 0; k < 4; k++) { g.fillStyle(INSULATOR, 1); g.fillEllipse(x - 38, y - 74 - k * 5, 9, 4); }
  g.lineStyle(2, COPPER_DARK, 1); g.lineBetween(x - 38, y - 94, x - 38, y - 116);
}

/** A waterwheel turning in the race: paddles, rims, spokes and the white water it throws. */
export function waterwheelSpin(g: G, x: number, y: number, r: number, a: number, t: number): void {
  g.fillStyle(0x0a1418, 0.6); g.fillEllipse(x, y + r * 0.2, r * 2.4, r * 0.7);
  g.lineStyle(4, TIMBER_DARK, 1); g.strokeEllipse(x, y, r * 2, r * 1.3);
  for (let k = 0; k < 12; k++) {
    const b = a + (k / 12) * Math.PI * 2;
    const px = x + Math.cos(b) * r, py = y + Math.sin(b) * r * 0.65;
    g.lineStyle(2, TIMBER, 1); g.lineBetween(x, y, px, py);
    g.fillStyle(Math.sin(b) > 0 ? TIMBER_LIT : TIMBER_DARK, 1);
    g.fillRect(px - 4, py - 6, 8, 12);
  }
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 6);
  // Spray off the paddles where they bite the water.
  for (let k = 0; k < 7; k++) {
    const ph = (t * 1.8 + k * 0.17) % 1;
    g.fillStyle(FOAM, 0.6 * (1 - ph)); g.fillCircle(x - r * 0.6 + k * r * 0.2, y + r * 0.55 - ph * 18, 2 + ph * 2);
  }
}

/**
 * A Leyden-jar bank: a rack of tall glass jars lined with foil, brass rods and knobs out of their
 * stoppers chained together along a copper bus bar, an iron rail round them, and a discharge fork
 * hung on a hook. `charge` (0–1) lights them from inside.
 */
export function leydenBank(g: G, x: number, y: number, n: number, charge = 0.5): void {
  const sp = 30, w = n * sp;
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w + 30, 18);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 10, y - 10, w + 20, 10);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 - 10, y - 12, w + 20, 3);
  for (let i = 0; i < n; i++) {
    const jx = x0 + sp / 2 + i * sp, jy = y - 12;
    g.fillStyle(GLASS, 0.25); g.fillRoundedRect(jx - 11, jy - 52, 22, 52, 6);
    g.fillStyle(FOIL, 0.9); g.fillRoundedRect(jx - 10, jy - 30, 20, 30, 5);
    g.fillStyle(lit(FOIL, 0.3), 0.6); g.fillRect(jx - 7, jy - 28, 3, 26);
    if (charge > 0) { g.fillStyle(ARC, 0.18 * charge); g.fillRoundedRect(jx - 9, jy - 50, 18, 20, 5); }
    g.lineStyle(1.5, GLASS_LIT, 0.5); g.strokeRoundedRect(jx - 11, jy - 52, 22, 52, 6);
    g.fillStyle(0x2a1a10, 1); g.fillRect(jx - 7, jy - 56, 14, 5);
    g.lineStyle(2, BRASS, 1); g.lineBetween(jx, jy - 56, jx, jy - 70);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(jx, jy - 72, 4);
  }
  g.lineStyle(3, COPPER, 1); g.lineBetween(x0 + sp / 2, y - 76, x0 + sp / 2 + (n - 1) * sp, y - 76);
  for (let i = 0; i < n; i++) { g.lineStyle(1, COPPER_LIT, 1); g.lineBetween(x0 + sp / 2 + i * sp, y - 72, x0 + sp / 2 + i * sp, y - 76); }
  // Guard rail.
  g.lineStyle(2, IRON, 1); g.strokeRect(x0 - 14, y - 34, w + 28, 2);
  for (const k of [0, 1]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 14 + k * (w + 26), y - 34, 3, 34); }
  // Discharge fork on its hook.
  g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x0 + w + 20, y - 60, x0 + w + 20, y - 20);
  g.lineBetween(x0 + w + 20, y - 20, x0 + w + 14, y - 10); g.lineBetween(x0 + w + 20, y - 20, x0 + w + 26, y - 10);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x0 + w + 14, y - 10, 2); g.fillCircle(x0 + w + 26, y - 10, 2);
}

/**
 * The Fuse House: a squat concrete blockhouse with a wall of fuseboxes on its front, a heavy
 * cable trunk into its roof, scorch on the concrete where fuses have blown, and sandbags.
 */
export function fuseHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 6, w * 1.08, 22);
  g.fillStyle(0x4c4e52, 1); g.fillRect(x0, top, w, h);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, 0x3a3c40, 1); g.lineBetween(x0, top + (h * k) / 5, x0 + w, top + (h * k) / 5); }
  g.fillStyle(0x5c5e62, 1); g.fillRect(x0 - 6, top - 10, w + 12, 12);
  // Scorch blooms.
  for (let k = 0; k < 4; k++) { g.fillStyle(0x0c0c0c, 0.35); g.fillEllipse(x0 + 20 + rng() * (w - 40), top + 10 + rng() * h * 0.5, 30 + rng() * 20, 20 + rng() * 14); }
  // A wall of fuseboxes.
  for (let i = 0; i < 4; i++) fuseBox(g, x0 + w * 0.16 + i * w * 0.23, top + h * 0.44, 0.7, rng() * 0.6, rng() > 0.15);
  // Cable trunk into the roof.
  g.lineStyle(10, 0x1a1a1a, 1); g.lineBetween(x0 + w * 0.8, top - 10, x0 + w * 0.8, top - 60);
  g.lineStyle(3, COPPER_DARK, 1); g.lineBetween(x0 + w * 0.8 - 3, top - 10, x0 + w * 0.8 - 3, top - 60);
  // Steel door and sandbags.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 14, y - 40, 28, 40);
  g.fillStyle(0xe8c838, 1); g.fillRect(x - 14, y - 44, 28, 4);
  for (let k = 0; k < 5; k++) { g.fillStyle(0x8a7a5a, 1); g.fillEllipse(x0 - 4 + k * 14, y - 4, 16, 9); g.fillEllipse(x0 + w + 4 - k * 14, y - 4, 16, 9); }
}

/** A basalt outcrop, sharp-edged and wet, with a rain sheen along its top. */
export function basaltRock(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 60 * s, 16 * s);
  const cols = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < cols; i++) {
    const cx = x - 22 * s + (i * 44 * s) / Math.max(1, cols - 1);
    const h = (26 + rng() * 34) * s, cw = (12 + rng() * 6) * s;
    poly(g, [{ x: cx - cw / 2, y }, { x: cx + cw / 2, y }, { x: cx + cw / 2, y: y - h }, { x: cx, y: y - h - 5 * s }, { x: cx - cw / 2, y: y - h }], i % 2 ? BASALT : BASALT_LIT);
    g.fillStyle(0x6f8ea8, 0.25); g.fillRect(cx - cw / 2, y - h, cw * 0.4, h);
    g.lineStyle(1, 0x000000, 0.4); g.lineBetween(cx + cw / 2, y, cx + cw / 2, y - h);
  }
}

/** The court's waystone: a basalt standing stone with a copper ring set in it and a live gap. */
export function stormWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 12);
  poly(g, [{ x: x - 16, y }, { x: x + 16, y }, { x: x + 12, y: y - 58 }, { x: x + 2, y: y - 70 }, { x: x - 12, y: y - 60 }], BASALT_LIT);
  g.fillStyle(0x6f8ea8, 0.2); g.fillRect(x - 12, y - 58, 6, 56);
  g.lineStyle(3, COPPER, 1);
  g.beginPath(); g.arc(x, y - 38, 10, -Math.PI * 0.35, Math.PI * 1.35, false); g.strokePath();
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x + Math.cos(-Math.PI * 0.35) * 10, y - 38 + Math.sin(-Math.PI * 0.35) * 10, 2);
  g.fillCircle(x + Math.cos(Math.PI * 1.35) * 10, y - 38 + Math.sin(Math.PI * 1.35) * 10, 2);
}

// ── Water ────────────────────────────────────────────────────────────

/** The race bed, baked: stone-kerbed channel, deep black-green water, pale weir lines. */
export function raceBed(g: G, x0: number, y0: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(0x3a3e46, 1); g.fillRect(x0, y0 - 10, w, h + 20);
  for (let x = x0; x < x0 + w; x += 18) {
    g.fillStyle(rng() < 0.5 ? 0x4a4e56 : 0x42464e, 1); g.fillRect(x, y0 - 10, 17, 8); g.fillRect(x, y0 + h + 2, 17, 8);
  }
  g.fillStyle(RACE, 1); g.fillRect(x0, y0, w, h);
  g.fillStyle(RACE_DEEP, 1); g.fillRect(x0, y0 + h * 0.25, w, h * 0.5);
  for (let i = 0; i < w / 30; i++) {
    g.fillStyle(RACE_LIT, 0.35); g.fillEllipse(x0 + rng() * w, y0 + 6 + rng() * (h - 12), 30 + rng() * 40, 3);
  }
}

/** The race running: foam streaks racing downstream (+x), faster in the middle. `t` seconds. */
export function raceFlow(g: G, x0: number, y0: number, w: number, h: number, t: number, view: { x: number; w: number }, speed = 160): void {
  const lo = Math.max(x0, view.x - 40), hi = Math.min(x0 + w, view.x + view.w + 40);
  for (let i = 0; i < 9; i++) {
    const lane = y0 + 8 + ((i * 0.618) % 1) * (h - 16);
    const mid = 1 - Math.abs((lane - (y0 + h / 2)) / (h / 2)) * 0.5;
    const len = 30 + (i % 3) * 14;
    const step = 140 + (i % 4) * 30;
    const off = (t * speed * mid + i * 57) % step;
    for (let x = lo - (lo % step) + off - step; x < hi; x += step) {
      g.lineStyle(1.5, FOAM, 0.35 + mid * 0.2);
      g.lineBetween(x, lane, x + len, lane + Math.sin(t * 3 + x * 0.02) * 1.5);
    }
  }
}

// ── Bakery things for the fights' floors and counters ────────────────

/** A spark leaping between two insulator tips in a gap (a little Jacob's ladder in a window). */
export function ladderSpark(g: G, x: number, y: number, h: number, t: number): void {
  g.lineStyle(2, COPPER_DARK, 1); g.lineBetween(x - 6, y, x - 10, y - h); g.lineBetween(x + 6, y, x + 10, y - h);
  const k = (t * 0.8) % 1;
  const yy = y - k * h, half = 6 + k * 4;
  bolt(g, x - half, yy, x + half, yy, Math.floor(t * 20), 1.5, ARC_VIOLET, 1 - k * 0.6, 3, false);
}
