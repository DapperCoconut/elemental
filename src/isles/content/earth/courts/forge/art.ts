import { dim, glow, groundFill, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BRICK, BRICK_DARK, BRICK_LIT, BRONZE, BRONZE_DARK, BRONZE_LIT, CINDER, CINDER_DARK, CINDER_LIT, COIL, COIL_LIT,
  HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, IRON_SHEEN, IRONSTONE, IRONSTONE_DARK,
  IRONSTONE_LIT, LEATHER, LEATHER_LIT, OCHRE, OCHRE_DARK, QUENCH, QUENCH_DEEP, QUENCH_LIT, RUST, RUST_LIT, SEAL, SLAG,
  SLAG_GLASS, SLAG_LIT, STONE, STONE_DARK, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT,
} from './palette';
import { heatColor } from './util';

/**
 * Forge set pieces — the shapes only a foundry town has. Everything here is *heavy*: riveted
 * plate, banded brick, iron hoops, stacked ingots, timber gone black with soot. Heat is the only
 * light: every door has a hearth behind it, every heap a red seam, every pour a yellow line. The
 * Regent's sealed tomb-door is riveted over every interred household's forge, and stamped into
 * every ingot that goes down the hill as Tithe.
 */

const TAU = Math.PI * 2;

/** A filled polygon. */
export function poly(g: G, pts: Pt[], color: number, a = 1): void {
  g.fillStyle(color, a);
  g.fillPoints(pts, true);
}

/** A row of rivets along a line. */
export function rivets(g: G, x1: number, y1: number, x2: number, y2: number, n: number, r = 1.4, color = IRON_LIT): void {
  for (let i = 0; i <= n; i++) {
    const k = n ? i / n : 0;
    const x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k;
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + 0.5, y + 0.6, r);
    g.fillStyle(color, 1); g.fillCircle(x, y, r);
  }
}

/**
 * The Regent's mark: a sealed tomb-door. An arched slab with a cross-bar and four rivets, on a
 * square plate. Riveted over interred households' forges, stamped on every Tithe ingot.
 */
export function regentSeal(g: G, x: number, y: number, r: number, color = SEAL, a = 1): void {
  g.fillStyle(dim(color, 0.3), a); g.fillRect(x - r, y - r, r * 2, r * 2);
  g.fillStyle(color, a); g.fillRect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
  // The slab: an arch over a rectangle.
  const sw = r * 1.1, sh = r * 1.2;
  g.fillStyle(lit(color, 0.25), a);
  g.fillRect(x - sw / 2, y - sh / 2 + sw / 2, sw, sh - sw / 2);
  g.fillCircle(x, y - sh / 2 + sw / 2, sw / 2);
  g.lineStyle(Math.max(1, r * 0.14), dim(color, 0.4), a);
  g.lineBetween(x - sw / 2, y + r * 0.1, x + sw / 2, y + r * 0.1);
  for (const [dx, dy] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
    g.fillStyle(lit(color, 0.45), a); g.fillCircle(x + dx * r, y + dy * r, Math.max(0.8, r * 0.1));
  }
}

// ── Ground ───────────────────────────────────────────────────────────

/** Trodden cinder: black grit, clinker lumps, flecks of slag glass catching the furnace light. */
export function cinderGround(g: G, r: Rect, rng: () => number): void {
  groundFill(g, r, CINDER, CINDER_LIT, CINDER_DARK, rng, 1.3);
  const n = Math.round((r.w * r.h) / 2600);
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.5) { g.fillStyle(CINDER_DARK, 0.6); g.fillEllipse(x, y, 5 + rng() * 8, 3 + rng() * 4); }
    else if (k < 0.8) { g.fillStyle(SLAG_GLASS, 0.4); g.fillRect(x, y, 2, 1.5); }
    else if (k < 0.93) { g.fillStyle(RUST, 0.35); g.fillCircle(x, y, 1.5 + rng() * 2); }
    else { g.fillStyle(IRONSTONE, 0.5); g.fillEllipse(x, y, 4, 3); }
  }
}

/**
 * A banded ironstone face, seen from the yard: strata of red-brown, ochre and dark iron with
 * wavy contacts, drill holes where the miners have been, scree at the foot. `y0` is the top.
 */
export function strata(g: G, x0: number, y0: number, w: number, h: number, rng: () => number): void {
  const bands = [IRONSTONE_DARK, IRONSTONE, OCHRE_DARK, IRONSTONE_LIT, IRONSTONE, OCHRE, IRONSTONE_DARK, IRONSTONE];
  let y = y0;
  let i = 0;
  const ph = rng() * 10;
  while (y < y0 + h) {
    const bh = 10 + rng() * 22;
    const c = bands[i % bands.length];
    g.fillStyle(c, 1);
    g.beginPath();
    g.moveTo(x0, y + Math.sin(ph + i) * 4);
    for (let x = x0; x <= x0 + w; x += 40) g.lineTo(x, y + Math.sin(ph + i + x / 140) * 5);
    g.lineTo(x0 + w, Math.min(y0 + h, y + bh + 8));
    g.lineTo(x0, Math.min(y0 + h, y + bh + 8));
    g.closePath(); g.fillPath();
    // The contact line, darker.
    g.lineStyle(1.5, dim(c, 0.35), 0.8);
    g.beginPath(); g.moveTo(x0, y + Math.sin(ph + i) * 4);
    for (let x = x0; x <= x0 + w; x += 40) g.lineTo(x, y + Math.sin(ph + i + x / 140) * 5);
    g.strokePath();
    y += bh; i++;
  }
  // Drill holes in a line, and the odd hanging iron spike.
  for (let k = 0; k < w / 70; k++) {
    const x = x0 + 20 + rng() * (w - 40), yy = y0 + h * (0.3 + rng() * 0.5);
    g.lineStyle(2, IRONSTONE_DARK, 0.8); g.lineBetween(x, yy, x + 1, yy + 12 + rng() * 10);
  }
  // Scree at the foot.
  for (let k = 0; k < w / 16; k++) {
    const x = x0 + rng() * w, yy = y0 + h - 4 + rng() * 10;
    const s = 3 + rng() * 7;
    g.fillStyle(dim(IRONSTONE, 0.3), 1); g.fillEllipse(x, yy + 1, s * 1.6, s);
    g.fillStyle(rng() < 0.5 ? IRONSTONE : OCHRE_DARK, 1); g.fillEllipse(x, yy, s * 1.4, s * 0.8);
  }
}

/** A run of railway: black sleepers, two rails with a bright worn top. */
export function railTrack(g: G, a: Pt, b: Pt, gauge = 20): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1) return;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  const nx = -uy, ny = ux;
  const half = gauge / 2;
  for (let d = 6; d < len; d += 15) {
    const x = a.x + ux * d, y = a.y + uy * d;
    g.lineStyle(6, TIMBER_DARK, 1);
    g.lineBetween(x + nx * (half + 7), y + ny * (half + 7), x - nx * (half + 7), y - ny * (half + 7));
    g.lineStyle(1, TIMBER, 0.6);
    g.lineBetween(x + nx * (half + 6) - ux, y + ny * (half + 6) - uy, x - nx * (half + 6) - ux, y - ny * (half + 6) - uy);
  }
  for (const k of [-1, 1]) {
    const ox = nx * half * k, oy = ny * half * k;
    g.lineStyle(3.5, IRON_DARK, 1); g.lineBetween(a.x + ox, a.y + oy + 1, b.x + ox, b.y + oy + 1);
    g.lineStyle(2, IRON_SHEEN, 0.9); g.lineBetween(a.x + ox, a.y + oy, b.x + ox, b.y + oy);
  }
}

/**
 * Pig beds on a casting floor: a sand bed with a main runner and a comb of side moulds, as the
 * furnace men cut them. `heat` 0..1 fills the runners with iron (0 = cold, empty sand).
 */
export function pigBed(g: G, x: number, y: number, w: number, h: number, heat: number): void {
  g.fillStyle(dim(OCHRE, 0.35), 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(OCHRE_DARK, 1); g.fillRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6);
  const metal = heat > 0 ? heatColor(heat) : dim(IRON, 0.1);
  g.lineStyle(5, dim(OCHRE_DARK, 0.4), 1); g.lineBetween(x - w / 2 + 10, y, x + w / 2 - 10, y);
  g.lineStyle(3, metal, heat > 0 ? 1 : 0.8); g.lineBetween(x - w / 2 + 10, y, x + w / 2 - 10, y);
  for (let px = x - w / 2 + 22; px < x + w / 2 - 10; px += 18) {
    for (const k of [-1, 1]) {
      g.fillStyle(dim(OCHRE_DARK, 0.4), 1); g.fillRect(px - 3, y + (k < 0 ? -h / 2 + 8 : 4), 6, h / 2 - 12);
      g.fillStyle(metal, heat > 0 ? 1 : 0.8); g.fillRect(px - 2, y + (k < 0 ? -h / 2 + 9 : 5), 4, h / 2 - 14);
    }
  }
}

/** A cut channel with a brick lining — a runnel for slag or molten iron. Fill is drawn by the caller. */
export function runnelBed(g: G, r: Rect): void {
  g.fillStyle(BRICK_DARK, 1); g.fillRect(r.x - 8, r.y, r.w + 16, r.h);
  for (let y = r.y; y < r.y + r.h; y += 9) {
    for (const x of [r.x - 8, r.x + r.w + 1]) {
      g.fillStyle(((y / 9) | 0) % 2 ? BRICK : BRICK_LIT, 1); g.fillRect(x, y, 7, 8);
    }
  }
  g.fillStyle(dim(HEAT_RED, 0.45), 1); g.fillRect(r.x, r.y, r.w, r.h);
}

// ── Set pieces ───────────────────────────────────────────────────────

/** An ironmonger's anvil on its stump, side-on. */
export function anvil(g: G, x: number, y: number, s = 1, hot = 0): void {
  shadow(g, x, y + 2, 40 * s, 10 * s);
  // The stump, banded.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 10 * s, y - 16 * s, 20 * s, 16 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 9 * s, y - 16 * s, 8 * s, 16 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 11 * s, y - 12 * s, 22 * s, 2.5 * s);
  // The body: waist, face, horn and heel.
  poly(g, [
    { x: x - 7 * s, y: y - 16 * s }, { x: x + 7 * s, y: y - 16 * s }, { x: x + 5 * s, y: y - 22 * s }, { x: x - 5 * s, y: y - 22 * s },
  ], IRON_DARK);
  poly(g, [
    { x: x - 14 * s, y: y - 22 * s }, { x: x + 12 * s, y: y - 22 * s }, { x: x + 13 * s, y: y - 29 * s }, { x: x - 13 * s, y: y - 29 * s },
  ], IRON);
  poly(g, [{ x: x + 13 * s, y: y - 29 * s }, { x: x + 13 * s, y: y - 24 * s }, { x: x + 26 * s, y: y - 27.5 * s }], IRON);
  poly(g, [{ x: x - 13 * s, y: y - 29 * s }, { x: x - 18 * s, y: y - 28 * s }, { x: x - 18 * s, y: y - 25 * s }, { x: x - 13 * s, y: y - 24 * s }], IRON);
  g.fillStyle(IRON_SHEEN, 0.9); g.fillRect(x - 13 * s, y - 30 * s, 26 * s, 2 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 10 * s, y - 29.5 * s, 2 * s, 1.5 * s);
  if (hot > 0) {
    g.fillStyle(heatColor(hot), 1); g.fillRoundedRect(x - 6 * s, y - 33 * s, 12 * s, 3.5 * s, 1.5 * s);
    glow(g, x, y - 32 * s, 12 * s, HEAT_ORANGE, 0.05 * hot, 3);
  }
}

/** A stack of Tithe ingots, laid crosswise in courses, each stamped with the Regent's seal. */
export function ingotStack(g: G, x: number, y: number, s: number, courses: number, rng: () => number): void {
  shadow(g, x, y + 2, 54 * s, 14 * s);
  for (let c = 0; c < courses; c++) {
    const yy = y - c * 7 * s;
    const n = c % 2 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const w = c % 2 ? 22 * s : 14 * s;
      const ix = x + (i - (n - 1) / 2) * (w + 2 * s);
      const tone = mixC(IRON, RUST, rng() * 0.35);
      poly(g, [
        { x: ix - w / 2, y: yy }, { x: ix + w / 2, y: yy }, { x: ix + w / 2 - 2 * s, y: yy - 6 * s }, { x: ix - w / 2 + 2 * s, y: yy - 6 * s },
      ], tone);
      g.fillStyle(lit(tone, 0.25), 1); g.fillRect(ix - w / 2 + 2 * s, yy - 6.5 * s, w - 4 * s, 1.5 * s);
      if (c === courses - 1) regentSeal(g, ix, yy - 3 * s, 1.8 * s, dim(tone, 0.35));
    }
  }
}

/**
 * A blast furnace: a tapering brick stack bound with iron hoops, the charging gallery and
 * bridge at the throat, the bustle main ringing the waist with its tuyeres, the arched tap-hole
 * at the hearth, and a domed hot-blast stove at its shoulder. `x,y` = hearth front centre.
 */
export function blastFurnace(g: G, x: number, y: number, s: number, rng: () => number): void {
  const H = 270 * s;
  const bw = 66 * s, tw = 40 * s;
  shadow(g, x, y + 6, 190 * s, 36 * s, 0.4);
  // The hot-blast stove: a tall domed cylinder to the right, a pipe across.
  const sx = x + 74 * s;
  g.fillStyle(IRON_DARK, 1); g.fillRect(sx - 22 * s, y - 200 * s, 44 * s, 196 * s);
  g.fillStyle(IRON, 1); g.fillRect(sx - 20 * s, y - 200 * s, 30 * s, 196 * s);
  g.fillStyle(IRON_LIT, 0.5); g.fillRect(sx - 16 * s, y - 196 * s, 4 * s, 190 * s);
  g.fillStyle(IRON, 1); g.fillEllipse(sx, y - 200 * s, 44 * s, 34 * s);
  g.fillStyle(IRON_LIT, 0.5); g.fillEllipse(sx - 6 * s, y - 206 * s, 16 * s, 10 * s);
  for (let k = 0; k < 6; k++) { g.lineStyle(1.5 * s, IRON_DARK, 1); g.lineBetween(sx - 22 * s, y - 30 * s - k * 30 * s, sx + 22 * s, y - 30 * s - k * 30 * s); }
  g.lineStyle(9 * s, IRON_DARK, 1); g.lineBetween(sx - 20 * s, y - 120 * s, x + 20 * s, y - 120 * s);
  g.lineStyle(6 * s, IRON, 1); g.lineBetween(sx - 20 * s, y - 121 * s, x + 20 * s, y - 121 * s);
  // The stack.
  poly(g, [{ x: x - bw, y: y - 30 * s }, { x: x + bw, y: y - 30 * s }, { x: x + tw, y: y - H }, { x: x - tw, y: y - H }], BRICK_DARK);
  poly(g, [{ x: x - bw + 4 * s, y: y - 30 * s }, { x: x + bw - 18 * s, y: y - 30 * s }, { x: x + tw - 12 * s, y: y - H }, { x: x - tw + 3 * s, y: y - H }], BRICK);
  // Brick courses.
  for (let yy = y - 36 * s; yy > y - H; yy -= 7 * s) {
    const k = (y - 30 * s - yy) / (H - 30 * s);
    const half = bw + (tw - bw) * k;
    g.lineStyle(1, BRICK_DARK, 0.5); g.lineBetween(x - half + 4 * s, yy, x + half - 4 * s, yy);
    for (let bx = x - half + 8 * s + (((yy / 7) | 0) % 2) * 6 * s; bx < x + half - 6 * s; bx += 12 * s) {
      g.fillStyle(rng() < 0.15 ? BRICK_LIT : BRICK_DARK, 0.35); g.fillRect(bx, yy - 6 * s, 1, 6 * s);
    }
  }
  // Soot running down from the throat.
  for (let i = 0; i < 6; i++) {
    const sxx = x - tw + 6 * s + rng() * (tw * 2 - 12 * s);
    g.fillStyle(0x000000, 0.18); g.fillRect(sxx, y - H, 4 * s + rng() * 5 * s, 40 * s + rng() * 70 * s);
  }
  // Iron hoops.
  for (let k = 1; k < 7; k++) {
    const yy = y - 30 * s - (k / 7) * (H - 30 * s);
    const half = bw + (tw - bw) * (k / 7);
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - half - 2 * s, yy - 3 * s, half * 2 + 4 * s, 5 * s);
    g.fillStyle(IRON_LIT, 0.7); g.fillRect(x - half - 2 * s, yy - 3 * s, half * 2 + 4 * s, 1.5 * s);
    rivets(g, x - half, yy - 0.5 * s, x + half, yy - 0.5 * s, Math.round(half / (8 * s)), 0.9 * s);
  }
  // The bustle main and the tuyeres.
  const by = y - 70 * s;
  g.lineStyle(10 * s, IRON_DARK, 1); g.strokeEllipse(x, by, bw * 2.3, 22 * s);
  g.lineStyle(6 * s, IRON, 1); g.strokeEllipse(x, by - 1, bw * 2.3, 22 * s);
  for (let k = -2; k <= 2; k++) {
    const tx = x + k * bw * 0.42;
    g.lineStyle(4 * s, IRON, 1); g.lineBetween(tx, by + 10 * s, tx, y - 44 * s);
    g.fillStyle(HEAT_ORANGE, 0.9); g.fillCircle(tx, y - 44 * s, 2.5 * s);
  }
  // The charging gallery at the throat, with its railing and the bridge going back to the hill.
  const gy = y - H + 8 * s;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - tw - 26 * s, gy, tw * 2 + 52 * s, 7 * s);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(x - tw - 26 * s, gy, tw * 2 + 52 * s, 2 * s);
  for (let rx = x - tw - 24 * s; rx <= x + tw + 24 * s; rx += 9 * s) { g.lineStyle(1.5 * s, IRON_DARK, 1); g.lineBetween(rx, gy, rx, gy - 13 * s); }
  g.lineStyle(2 * s, IRON, 1); g.lineBetween(x - tw - 26 * s, gy - 13 * s, x + tw + 26 * s, gy - 13 * s);
  g.lineStyle(7 * s, TIMBER_DARK, 1); g.lineBetween(x - tw - 26 * s, gy + 3 * s, x - tw - 70 * s, gy - 30 * s);
  g.lineStyle(1.5 * s, TIMBER_LIT, 0.6); g.lineBetween(x - tw - 26 * s, gy + 1 * s, x - tw - 70 * s, gy - 32 * s);
  // The throat: a lip of glowing charge.
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - H, tw * 2, 12 * s);
  g.fillStyle(HEAT_RED, 0.8); g.fillEllipse(x, y - H + 1 * s, tw * 1.6, 7 * s);
  // The hearth: a stone base with the arched tap-hole and its trough.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - bw - 6 * s, y - 34 * s, bw * 2 + 12 * s, 34 * s);
  g.fillStyle(STONE, 1); g.fillRect(x - bw - 4 * s, y - 34 * s, bw * 2 + 8 * s, 6 * s);
  for (let bx = x - bw; bx < x + bw; bx += 18 * s) { g.lineStyle(1, STONE_DARK, 0.7); g.lineBetween(bx, y - 28 * s, bx, y); }
  g.fillStyle(0x140806, 1); g.fillRect(x - 13 * s, y - 26 * s, 26 * s, 26 * s);
  g.fillCircle(x, y - 26 * s, 13 * s);
  g.fillStyle(HEAT_ORANGE, 0.85); g.fillRect(x - 9 * s, y - 18 * s, 18 * s, 18 * s);
  g.fillStyle(HEAT_YELLOW, 0.8); g.fillRect(x - 5 * s, y - 12 * s, 10 * s, 12 * s);
  g.lineStyle(3 * s, STONE_LIT, 1); g.beginPath(); g.arc(x, y - 26 * s, 15 * s, Math.PI, 0, false); g.strokePath();
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 3 * s, y - 44 * s, 6 * s, 6 * s);
}

/**
 * A smithy: soot-dark brick with stone quoins, a corrugated iron roof, a fat chimney, the open
 * forge door with the hearth glowing and an anvil at the threshold, a trade sign on a bracket.
 * An *interred* household's smithy is cold: the door bricked up, the Regent's seal riveted over
 * it, a chalk tally of the shortfall on the wall. `x,y` = front-wall base centre.
 */
export function smithy(
  g: G, x: number, y: number, w: number, h: number,
  o: { sign?: 'horseshoe' | 'anvil' | 'chain' | 'bell' | 'nail' | 'kettle'; interred?: boolean; roof?: number },
  rng: () => number,
): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.08, 22);
  // Walls.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(BRICK, 1); g.fillRect(x0 + 3, y - h + 3, w - 6, h - 3);
  for (let yy = y - 6; yy > y - h + 4; yy -= 7) {
    g.lineStyle(1, BRICK_DARK, 0.55); g.lineBetween(x0 + 3, yy, x0 + w - 3, yy);
    const off = (((y - yy) / 7) | 0) % 2 ? 7 : 0;
    for (let bx = x0 + 6 + off; bx < x0 + w - 4; bx += 14) { g.fillStyle(BRICK_DARK, 0.5); g.fillRect(bx, yy - 6, 1, 6); }
  }
  // Quoins.
  for (let yy = y; yy > y - h; yy -= 14) {
    for (const qx of [x0, x0 + w - 10]) {
      const long = (((y - yy) / 14) | 0) % 2;
      g.fillStyle(STONE_DARK, 1); g.fillRect(qx - (long && qx === x0 ? 2 : 0), yy - 13, long ? 12 : 10, 12);
      g.fillStyle(STONE, 1); g.fillRect(qx - (long && qx === x0 ? 2 : 0), yy - 13, long ? 12 : 10, 3);
    }
  }
  // Soot above the door.
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y - h * 0.62, w * 0.42, h * 0.5);
  // Corrugated iron roof, slanting back.
  const roof = o.roof ?? IRON;
  const ry = y - h;
  poly(g, [{ x: x0 - 10, y: ry + 4 }, { x: x0 + w + 10, y: ry + 4 }, { x: x0 + w - 6, y: ry - 34 }, { x: x0 + 6, y: ry - 34 }], dim(roof, 0.25));
  poly(g, [{ x: x0 - 8, y: ry + 2 }, { x: x0 + w + 8, y: ry + 2 }, { x: x0 + w - 7, y: ry - 33 }, { x: x0 + 7, y: ry - 33 }], roof);
  for (let rx = x0 - 4; rx < x0 + w + 6; rx += 7) {
    const k = (rx - (x0 - 8)) / (w + 16);
    g.lineStyle(1.5, lit(roof, 0.25), 0.7); g.lineBetween(rx, ry + 1, x0 + 7 + k * (w - 14), ry - 32);
  }
  // Rust weeping down the roof.
  for (let i = 0; i < 4; i++) { g.fillStyle(RUST, 0.35); g.fillRect(x0 + rng() * w, ry - 30 + rng() * 10, 3, 18 + rng() * 14); }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 10, ry + 1, w + 20, 4);
  // Chimney.
  const cx = x0 + w * 0.76;
  g.fillStyle(BRICK_DARK, 1); g.fillRect(cx - 13, ry - 82, 26, 70);
  g.fillStyle(BRICK, 1); g.fillRect(cx - 11, ry - 82, 16, 70);
  for (let yy = ry - 76; yy < ry - 12; yy += 7) { g.lineStyle(1, BRICK_DARK, 0.6); g.lineBetween(cx - 11, yy, cx + 11, yy); }
  g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 16, ry - 88, 32, 8);
  g.fillStyle(STONE, 1); g.fillRect(cx - 16, ry - 88, 32, 3);
  g.fillStyle(0x000000, 0.7); g.fillEllipse(cx, ry - 88, 18, 5);
  if (!o.interred) { g.fillStyle(HEAT_ORANGE, 0.35); g.fillEllipse(cx, ry - 88, 12, 3); }
  // The forge door.
  const dw = Math.min(54, w * 0.36), dh = Math.min(56, h * 0.62);
  const dx = x0 + w * 0.36;
  g.fillStyle(STONE_DARK, 1); g.fillRect(dx - dw / 2 - 5, y - dh - 8, dw + 10, dh + 8);
  g.fillStyle(STONE, 1); g.fillRect(dx - dw / 2 - 5, y - dh - 8, dw + 10, 5);
  if (o.interred) {
    // Bricked up, with the seal riveted on and a chalk tally.
    g.fillStyle(dim(BRICK, 0.2), 1); g.fillRect(dx - dw / 2, y - dh, dw, dh);
    for (let yy = y - 5; yy > y - dh; yy -= 6) { g.lineStyle(1, BRICK_DARK, 0.7); g.lineBetween(dx - dw / 2, yy, dx + dw / 2, yy); }
    g.fillStyle(IRON_DARK, 1); g.fillRect(dx - 13, y - dh * 0.68 - 13, 26, 26);
    regentSeal(g, dx, y - dh * 0.68, 11, IRON);
    rivets(g, dx - 12, y - dh * 0.68 - 12, dx + 12, y - dh * 0.68 - 12, 3, 1.2);
    rivets(g, dx - 12, y - dh * 0.68 + 12, dx + 12, y - dh * 0.68 + 12, 3, 1.2);
    const tx = x0 + w * 0.7;
    g.lineStyle(1.2, 0xd8d0c0, 0.7);
    for (let i = 0; i < 4; i++) g.lineBetween(tx + i * 4, y - 40, tx + i * 4, y - 30);
    g.lineBetween(tx - 2, y - 32, tx + 15, y - 38);
    g.lineBetween(tx, y - 24, tx + 10, y - 24);
  } else {
    // The hearth inside, an anvil at the threshold.
    g.fillStyle(0x1a0c08, 1); g.fillRect(dx - dw / 2, y - dh, dw, dh);
    g.fillStyle(HEAT_RED, 0.55); g.fillRect(dx - dw / 2 + 4, y - dh * 0.55, dw - 8, dh * 0.55);
    g.fillStyle(HEAT_ORANGE, 0.75); g.fillEllipse(dx + dw * 0.18, y - dh * 0.32, dw * 0.38, dh * 0.24);
    g.fillStyle(HEAT_YELLOW, 0.8); g.fillEllipse(dx + dw * 0.18, y - dh * 0.32, dw * 0.16, dh * 0.1);
    glow(g, dx, y - dh * 0.3, dw * 0.8, HEAT_ORANGE, 0.05, 3);
    // Tools hung inside the door.
    for (let i = 0; i < 3; i++) { g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(dx - dw / 2 + 6 + i * 5, y - dh + 4, dx - dw / 2 + 6 + i * 5, y - dh + 22); }
    anvil(g, dx - dw * 0.1, y + 10, 0.7);
  }
  // A shuttered window.
  const wx = x0 + w * 0.76;
  if (w > 120) {
    g.fillStyle(STONE_DARK, 1); g.fillRect(wx - 14, y - h * 0.6 - 14, 28, 26);
    g.fillStyle(o.interred ? 0x15100c : 0x3a1a0c, 1); g.fillRect(wx - 11, y - h * 0.6 - 11, 22, 20);
    if (!o.interred) { g.fillStyle(HEAT_ORANGE, 0.4); g.fillRect(wx - 9, y - h * 0.6 - 2, 18, 9); }
    g.lineStyle(2, IRON_DARK, 1); g.lineBetween(wx, y - h * 0.6 - 11, wx, y - h * 0.6 + 9);
  }
  // The trade sign on its bracket.
  if (o.sign) {
    const sx = x0 + w - 6, sy = y - h + 22;
    g.lineStyle(2.5, IRON_DARK, 1); g.lineBetween(sx, sy, sx + 26, sy); g.lineBetween(sx, sy + 8, sx + 10, sy);
    g.lineStyle(1, IRON_DARK, 1); g.lineBetween(sx + 20, sy, sx + 20, sy + 6);
    tradeSign(g, sx + 20, sy + 14, o.sign, o.interred ? 0.45 : 1);
  }
  // A water butt by the door.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 10, y - 22, 16, 22);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 + 11, y - 22, 7, 22);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 + 9, y - 18, 18, 2); g.fillRect(x0 + 9, y - 7, 18, 2);
  g.fillStyle(QUENCH, 1); g.fillEllipse(x0 + 18, y - 22, 14, 4);
}

/** A hanging trade sign: horseshoe, anvil, chain, bell, nail or kettle cut from sheet iron. */
export function tradeSign(g: G, x: number, y: number, kind: 'horseshoe' | 'anvil' | 'chain' | 'bell' | 'nail' | 'kettle', a = 1): void {
  const c = lit(IRON, 0.12);
  switch (kind) {
    case 'horseshoe':
      g.lineStyle(4, c, a); g.beginPath(); g.arc(x, y, 7, Math.PI * 0.85, Math.PI * 2.15, false); g.strokePath();
      g.fillStyle(IRON_DARK, a); for (let i = 0; i < 5; i++) { const b = Math.PI * (0.95 + i * 0.27); g.fillCircle(x + Math.cos(b) * 7, y + Math.sin(b) * 7, 0.9); }
      break;
    case 'anvil':
      poly(g, [{ x: x - 9, y: y - 4 }, { x: x + 6, y: y - 4 }, { x: x + 13, y: y - 2 }, { x: x + 6, y: y }, { x: x + 3, y: y + 6 }, { x: x - 5, y: y + 6 }, { x: x - 6, y: y }, { x: x - 9, y: y - 1 }], c, a);
      break;
    case 'chain':
      for (let i = 0; i < 3; i++) { g.lineStyle(2.5, c, a); g.strokeEllipse(x, y - 6 + i * 7, i % 2 ? 4 : 8, i % 2 ? 9 : 5); }
      break;
    case 'bell':
      g.fillStyle(BRONZE, a); g.fillTriangle(x - 8, y + 6, x + 8, y + 6, x, y - 8);
      g.fillCircle(x, y - 3, 5); g.fillStyle(BRONZE_LIT, a); g.fillRect(x - 9, y + 5, 18, 2);
      g.fillStyle(BRONZE_DARK, a); g.fillCircle(x, y + 8, 2);
      break;
    case 'nail':
      for (let i = -1; i <= 1; i++) { g.lineStyle(2, c, a); g.lineBetween(x + i * 5, y - 6, x + i * 5, y + 7); g.fillStyle(c, a); g.fillRect(x + i * 5 - 2.5, y - 7, 5, 2); }
      break;
    case 'kettle':
      g.fillStyle(c, a); g.fillEllipse(x, y + 2, 16, 11); g.fillRect(x - 3, y - 6, 6, 3);
      g.lineStyle(2, c, a); g.beginPath(); g.arc(x, y - 1, 7, Math.PI, 0, false); g.strokePath();
      g.lineBetween(x + 7, y + 1, x + 12, y - 3);
      break;
  }
}

/**
 * The Great Trip-Hammer's frame: two black timber posts, a cross-beam, the cam drum and its
 * flywheel off a steam engine, the helve's pivot block and the anvil block it falls on. The helve
 * and head move in `tripHammerHead`. `x,y` = the anvil block's foot.
 */
export function tripHammerFrame(g: G, x: number, y: number, s: number): void {
  shadow(g, x - 30 * s, y + 4, 220 * s, 34 * s, 0.38);
  // Stone bed.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 130 * s, y - 14 * s, 200 * s, 16 * s);
  g.fillStyle(STONE, 1); g.fillRect(x - 130 * s, y - 14 * s, 200 * s, 4 * s);
  // The anvil block (the "stithy"): iron on a great oak block.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 22 * s, y - 40 * s, 44 * s, 28 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 20 * s, y - 40 * s, 14 * s, 28 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 18 * s, y - 52 * s, 36 * s, 13 * s);
  g.fillStyle(IRON_SHEEN, 0.8); g.fillRect(x - 18 * s, y - 53 * s, 36 * s, 2.5 * s);
  // The posts and the cross-beam over the pivot.
  const px = x - 100 * s;
  for (const k of [-1, 1]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px + k * 20 * s - 7 * s, y - 120 * s, 14 * s, 108 * s);
    g.fillStyle(TIMBER, 1); g.fillRect(px + k * 20 * s - 5 * s, y - 120 * s, 5 * s, 108 * s);
    g.fillStyle(IRON_DARK, 1); g.fillRect(px + k * 20 * s - 8 * s, y - 80 * s, 16 * s, 4 * s); g.fillRect(px + k * 20 * s - 8 * s, y - 40 * s, 16 * s, 4 * s);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 36 * s, y - 128 * s, 72 * s, 12 * s);
  g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(px - 36 * s, y - 128 * s, 72 * s, 3 * s);
  // The pivot block.
  g.fillStyle(IRON, 1); g.fillCircle(px, y - 66 * s, 9 * s);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(px - 2 * s, y - 68 * s, 3 * s);
  // The cam drum and flywheel behind the tail.
  const cx = px - 56 * s, cy = y - 50 * s;
  g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, 30 * s);
  g.lineStyle(5 * s, IRON, 1); g.strokeCircle(cx, cy, 28 * s);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.lineStyle(3 * s, IRON, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 26 * s, cy + Math.sin(a) * 26 * s); }
  g.fillStyle(IRON_LIT, 1); g.fillCircle(cx, cy, 6 * s);
  // The engine cylinder and its exhaust pipe.
  g.fillStyle(IRON, 1); g.fillRect(cx - 40 * s, y - 34 * s, 30 * s, 20 * s);
  g.fillStyle(IRON_LIT, 0.5); g.fillRect(cx - 40 * s, y - 34 * s, 30 * s, 4 * s);
  g.lineStyle(5 * s, IRON_DARK, 1); g.lineBetween(cx - 30 * s, y - 34 * s, cx - 30 * s, y - 150 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 35 * s, y - 154 * s, 10 * s, 6 * s);
}

/** The helve and head of the trip-hammer. `lift` 0..1 (0 = down on the stithy). */
export function tripHammerHead(g: G, x: number, y: number, s: number, lift: number): void {
  const px = x - 100 * s, py = y - 66 * s;
  const a = -lift * 0.32;
  const len = 104 * s;
  const hx = px + Math.cos(a) * len, hy = py + Math.sin(a) * len;
  // The tail rides the cam.
  g.lineStyle(10 * s, TIMBER_DARK, 1); g.lineBetween(px - Math.cos(a) * 26 * s, py - Math.sin(a) * 26 * s, hx, hy);
  g.lineStyle(4 * s, TIMBER, 1); g.lineBetween(px - Math.cos(a) * 26 * s, py - Math.sin(a) * 26 * s - 2 * s, hx, hy - 2 * s);
  for (const k of [0.3, 0.7]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(px + Math.cos(a) * len * k, py + Math.sin(a) * len * k, 5 * s); }
  // The head: a great iron block.
  g.fillStyle(IRON_DARK, 1); g.fillRect(hx - 14 * s, hy - 10 * s, 28 * s, 30 * s);
  g.fillStyle(IRON, 1); g.fillRect(hx - 12 * s, hy - 8 * s, 12 * s, 26 * s);
  g.fillStyle(IRON_SHEEN, 0.7); g.fillRect(hx - 14 * s, hy + 18 * s, 28 * s, 2 * s);
}

/** A slag heap: a cone of glassy black-green clinker, dull red seams at the core. */
export function slagHeap(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 4, 200 * s, 40 * s, 0.4);
  const w = 180 * s, h = 90 * s;
  // Lumpy outline.
  const pts: Pt[] = [{ x: x - w / 2, y }];
  for (let i = 1; i < 12; i++) {
    const k = i / 12;
    const peak = Math.sin(k * Math.PI);
    pts.push({ x: x - w / 2 + k * w, y: y - peak * h * (0.85 + rng() * 0.3) });
  }
  pts.push({ x: x + w / 2, y });
  poly(g, pts, SLAG);
  // Facets of lighter slag down the slope, and glassy chips.
  for (let i = 0; i < 40 * s; i++) {
    const k = rng();
    const px = x - w / 2 + k * w;
    const top = y - Math.sin(k * Math.PI) * h * 0.85;
    const py = top + rng() * (y - top);
    const r = 3 + rng() * 6 * s;
    g.fillStyle(rng() < 0.5 ? SLAG_LIT : dim(SLAG, 0.3), 1); g.fillEllipse(px, py, r * 1.6, r);
    if (rng() < 0.3) { g.fillStyle(SLAG_GLASS, 0.8); g.fillRect(px - 1, py - 1, 2.5, 1.5); }
  }
  // Rust-coloured runs where it was tipped wet.
  for (let i = 0; i < 5; i++) {
    const k = 0.2 + rng() * 0.6;
    const px = x - w / 2 + k * w;
    g.lineStyle(3, RUST, 0.35); g.lineBetween(px, y - Math.sin(k * Math.PI) * h * 0.8, px + (rng() - 0.5) * 20, y - 6);
  }
  // The red seams: static; `animate` brightens them.
  for (let i = 0; i < 4; i++) {
    const k = 0.3 + rng() * 0.4;
    const px = x - w / 2 + k * w, py = y - Math.sin(k * Math.PI) * h * 0.5;
    g.lineStyle(2.5, HEAT_RED, 0.8);
    g.lineBetween(px - 12 * s, py + 4, px, py - 6); g.lineBetween(px, py - 6, px + 10 * s, py + 2);
  }
}

/** A scrap pile: gear wheels, bent bar, plates, a cart wheel and a tangle of chain. */
export function scrapPile(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 90 * s, 22 * s);
  for (let i = 0; i < 14; i++) {
    const px = x + (rng() - 0.5) * 70 * s, py = y - rng() * 30 * s * (1 - Math.abs(px - x) / (40 * s));
    const k = rng();
    const c = mixC(IRON, RUST, rng() * 0.6);
    if (k < 0.25) {
      // A gear.
      const r = 6 + rng() * 6 * s;
      g.fillStyle(dim(c, 0.3), 1); g.fillCircle(px, py, r + 2);
      for (let t = 0; t < 8; t++) { const a = (t / 8) * TAU; g.fillStyle(c, 1); g.fillRect(px + Math.cos(a) * r - 1.5, py + Math.sin(a) * r - 1.5, 3, 3); }
      g.fillStyle(c, 1); g.fillCircle(px, py, r);
      g.fillStyle(dim(c, 0.5), 1); g.fillCircle(px, py, r * 0.35);
    } else if (k < 0.55) {
      // A plate.
      const a = rng() * Math.PI, l = 10 + rng() * 14 * s;
      poly(g, [
        { x: px + Math.cos(a) * l, y: py + Math.sin(a) * l * 0.5 }, { x: px + Math.cos(a + 1.4) * l * 0.6, y: py + Math.sin(a + 1.4) * l * 0.3 },
        { x: px - Math.cos(a) * l, y: py - Math.sin(a) * l * 0.5 }, { x: px - Math.cos(a + 1.4) * l * 0.6, y: py - Math.sin(a + 1.4) * l * 0.3 },
      ], c);
    } else if (k < 0.8) {
      // A bent bar.
      g.lineStyle(3, c, 1); g.lineBetween(px - 12, py + 4, px, py - 2); g.lineBetween(px, py - 2, px + 10, py - 10);
    } else {
      // A chain tangle.
      for (let t = 0; t < 4; t++) { g.lineStyle(1.5, IRON_LIT, 1); g.strokeEllipse(px + t * 5, py + Math.sin(t) * 3, t % 2 ? 3 : 6, t % 2 ? 6 : 3); }
    }
  }
  // A cart wheel leaning on top.
  const wx = x + 14 * s, wy = y - 22 * s;
  g.lineStyle(3, RUST, 1); g.strokeCircle(wx, wy, 11 * s);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.lineStyle(1.5, RUST_LIT, 1); g.lineBetween(wx, wy, wx + Math.cos(a) * 10 * s, wy + Math.sin(a) * 10 * s); }
}

/**
 * An ore cart: a tapered iron tub riveted at the seams on four flanged wheels, heaped with ore.
 * `along` is the direction of travel in radians (the tub is drawn turned to it).
 */
export function oreCart(g: G, x: number, y: number, s: number, along: number, load: 'ore' | 'slag' | 'empty' = 'ore', glowK = 0): void {
  const c = Math.cos(along), sn = Math.sin(along);
  const L = 20 * s, Wd = 13 * s;
  const at = (u: number, v: number): Pt => ({ x: x + c * u - sn * v, y: y + sn * u + c * v * 0.8 });
  shadow(g, x, y + 8 * s, 46 * s, 14 * s);
  // Wheels.
  for (const [u, v] of [[-L * 0.6, -Wd], [L * 0.6, -Wd], [-L * 0.6, Wd], [L * 0.6, Wd]]) {
    const p = at(u, v);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(p.x, p.y + 4 * s, 4.5 * s);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(p.x, p.y + 4 * s, 1.5 * s);
  }
  // The tub: a bottom and a wider rim.
  poly(g, [at(-L * 0.8, -Wd * 0.8), at(L * 0.8, -Wd * 0.8), at(L * 0.8, Wd * 0.8), at(-L * 0.8, Wd * 0.8)], IRON_DARK);
  const rim = [at(-L, -Wd), at(L, -Wd), at(L, Wd), at(-L, Wd)].map((p) => ({ x: p.x, y: p.y - 9 * s }));
  poly(g, rim, mixC(IRON, RUST, 0.3));
  g.lineStyle(2 * s, IRON_LIT, 0.8); g.strokePoints(rim, true);
  for (let i = 0; i < 4; i++) {
    const a = rim[i], b = rim[(i + 1) % 4];
    rivets(g, a.x, a.y, b.x, b.y, 4, 0.9 * s, IRON_SHEEN);
  }
  // The load.
  if (load !== 'empty') {
    for (let i = 0; i < 9; i++) {
      const u = ((i % 3) - 1) * L * 0.55, v = (Math.floor(i / 3) - 1) * Wd * 0.5;
      const p = at(u, v);
      const r = (4 + ((i * 7) % 3)) * s;
      const tone = load === 'ore' ? (i % 3 ? IRONSTONE : OCHRE_DARK) : (i % 2 ? SLAG : SLAG_LIT);
      g.fillStyle(dim(tone, 0.3), 1); g.fillCircle(p.x, p.y - 11 * s, r + 0.6);
      g.fillStyle(tone, 1); g.fillCircle(p.x - 0.5, p.y - 12 * s, r);
      if (load === 'ore' && i % 4 === 0) { g.fillStyle(IRON_SHEEN, 0.8); g.fillRect(p.x - 1, p.y - 14 * s, 2, 1.5); }
    }
    if (load === 'slag' || glowK > 0) { const p = at(0, 0); glow(g, p.x, p.y - 12 * s, 14 * s, HEAT_ORANGE, 0.06 * Math.max(glowK, 0.4), 2); }
  }
  // The headlamp at the front.
  const f = at(L + 2 * s, 0);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(f.x, f.y - 6 * s, 3 * s);
  g.fillStyle(HEAT_YELLOW, 0.9); g.fillCircle(f.x, f.y - 6 * s, 1.8 * s);
}

/** The bell pit seen from above: a brick ring, rammed sand, the loam cope of a bell mould with its vents and runner. */
export function bellPitGround(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(BRICK_DARK, 1); g.fillEllipse(x, y, r * 2 + 24, r * 1.4 + 18);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    g.fillStyle(i % 2 ? BRICK : BRICK_LIT, 1);
    g.fillEllipse(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6) * 0.7, 14, 8);
  }
  g.fillStyle(dim(OCHRE, 0.5), 1); g.fillEllipse(x, y + 6, r * 2, r * 1.4);
  g.fillStyle(OCHRE_DARK, 1); g.fillEllipse(x, y + 10, r * 1.9, r * 1.3);
  for (let i = 0; i < 30; i++) { g.fillStyle(dim(OCHRE, 0.2), 0.5); g.fillCircle(x + (rng() - 0.5) * r * 1.6, y + (rng() - 0.5) * r, 1.5); }
  // The cope: a great loam dome, banded with iron straps.
  g.fillStyle(dim(IRONSTONE, 0.25), 1); g.fillEllipse(x, y + 8, r * 1.05, r * 0.72);
  g.fillStyle(IRONSTONE, 1); g.fillEllipse(x - 4, y + 2, r * 0.95, r * 0.62);
  g.fillStyle(IRONSTONE_LIT, 0.5); g.fillEllipse(x - 14, y - 8, r * 0.45, r * 0.25);
  for (let k = -2; k <= 2; k++) { g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x + k * r * 0.18, y - r * 0.28, x + k * r * 0.24, y + r * 0.32); }
  // Pouring cup and risers.
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y - 6, 9);
  g.fillStyle(0x140806, 1); g.fillCircle(x, y - 6, 5);
  for (const k of [-1, 1]) { g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k * 26, y + 4, 4); }
  // The runner from the furnace side.
  g.lineStyle(7, dim(OCHRE_DARK, 0.4), 1); g.lineBetween(x - r - 10, y - 30, x - 8, y - 8);
  g.lineStyle(3, dim(BRONZE, 0.4), 1); g.lineBetween(x - r - 10, y - 30, x - 8, y - 8);
}

/**
 * The bell derrick over the pit: a timber A-frame, a chain block, and the great bell half-raised
 * from an earlier casting, its lip lettered with the names of the interred (the Regent's order).
 */
export function bellDerrick(g: G, x: number, y: number, r: number): void {
  const top = y - 230;
  for (const k of [-1, 1]) {
    g.lineStyle(10, TIMBER_DARK, 1); g.lineBetween(x + k * (r + 6), y + 10, x + k * 18, top);
    g.lineStyle(3, TIMBER_LIT, 0.5); g.lineBetween(x + k * (r + 6) - 3, y + 10, x + k * 18 - 3, top);
    g.fillStyle(STONE_DARK, 1); g.fillRect(x + k * (r + 6) - 10, y + 4, 20, 10);
  }
  g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(x - (r * 0.55), y - 90, x + r * 0.55, y - 90);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 30, top - 10, 60, 14);
  g.fillStyle(IRON, 1); g.fillCircle(x, top + 10, 8);
  // Chain down to the bell's crown.
  const bellTop = y - 150;
  for (let yy = top + 18; yy < bellTop; yy += 7) { g.lineStyle(1.8, IRON_LIT, 1); g.strokeEllipse(x, yy, ((yy / 7) | 0) % 2 ? 3 : 6, ((yy / 7) | 0) % 2 ? 6 : 3); }
  // The bell.
  const bw = 54;
  g.fillStyle(BRONZE_DARK, 1);
  g.beginPath();
  g.moveTo(x - bw * 0.42, bellTop + 6);
  g.lineTo(x - bw * 0.52, bellTop + 50); g.lineTo(x - bw * 0.95, bellTop + 82); g.lineTo(x + bw * 0.95, bellTop + 82);
  g.lineTo(x + bw * 0.52, bellTop + 50); g.lineTo(x + bw * 0.42, bellTop + 6);
  g.closePath(); g.fillPath();
  g.fillStyle(BRONZE, 1);
  g.beginPath();
  g.moveTo(x - bw * 0.38, bellTop + 8);
  g.lineTo(x - bw * 0.48, bellTop + 50); g.lineTo(x - bw * 0.88, bellTop + 80); g.lineTo(x + bw * 0.2, bellTop + 80);
  g.lineTo(x + bw * 0.12, bellTop + 50); g.lineTo(x + bw * 0.05, bellTop + 8);
  g.closePath(); g.fillPath();
  g.fillStyle(BRONZE_LIT, 0.6); g.fillRect(x - bw * 0.3, bellTop + 12, 5, 50);
  g.fillStyle(BRONZE, 1); g.fillEllipse(x, bellTop + 6, bw * 0.84, 14);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 6, bellTop - 4, 12, 8);
  // Bands and the lettered lip.
  g.lineStyle(2, BRONZE_DARK, 1); g.lineBetween(x - bw * 0.5, bellTop + 30, x + bw * 0.5, bellTop + 30);
  g.lineStyle(3, BRONZE_DARK, 1); g.lineBetween(x - bw * 0.84, bellTop + 72, x + bw * 0.84, bellTop + 72);
  for (let i = 0; i < 16; i++) { g.fillStyle(dim(BRONZE, 0.45), 1); g.fillRect(x - bw * 0.78 + i * bw * 0.1, bellTop + 75, 3, 4); }
  g.fillStyle(0x1a1008, 1); g.fillEllipse(x, bellTop + 82, bw * 1.9, 10);
  regentSeal(g, x, bellTop + 48, 7, BRONZE_DARK);
}

/** The quench pond's iron kerb: riveted plates round the water, a ladder, a hanging chain. */
export function quenchKerb(g: G, r: Rect): void {
  g.fillStyle(QUENCH_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 18);
  g.fillStyle(QUENCH, 1); g.fillRoundedRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16, 14);
  g.fillStyle(QUENCH_LIT, 0.18); g.fillEllipse(r.x + r.w * 0.4, r.y + r.h * 0.4, r.w * 0.5, r.h * 0.3);
  // An oily sheen.
  for (let i = 0; i < 4; i++) { g.lineStyle(2, mixC(0x7a5aa8, 0x5aa8a0, i / 3), 0.12); g.strokeEllipse(r.x + r.w * (0.3 + i * 0.12), r.y + r.h * 0.55, 60 + i * 10, 14); }
  g.lineStyle(10, IRON_DARK, 1); g.strokeRoundedRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 20);
  g.lineStyle(6, IRON, 1); g.strokeRoundedRect(r.x - 4, r.y - 5, r.w + 8, r.h + 8, 20);
  for (let px = r.x + 20; px < r.x + r.w - 10; px += 40) {
    rivets(g, px, r.y - 5, px, r.y - 5, 0, 1.4, IRON_SHEEN);
    rivets(g, px, r.y + r.h + 3, px, r.y + r.h + 3, 0, 1.4, IRON_SHEEN);
  }
  // Ladder down the near side.
  const lx = r.x + r.w * 0.7;
  for (const k of [-1, 1]) { g.lineStyle(2.5, IRON_LIT, 1); g.lineBetween(lx + k * 7, r.y + r.h + 4, lx + k * 7, r.y + r.h - 34); }
  for (let yy = r.y + r.h - 2; yy > r.y + r.h - 34; yy -= 8) { g.lineStyle(2, IRON_LIT, 1); g.lineBetween(lx - 7, yy, lx + 7, yy); }
}

/**
 * The Tithe Hook: an iron gantry over the square with a great steelyard hung from it — a long
 * beam on a knife-edge, a stone counterpoise on the long arm, the hook and its cradle of ingots
 * on the short. Every household's iron is weighed here. `x,y` = between the gantry's feet.
 */
export function titheHook(g: G, x: number, y: number, tilt = 0): void {
  shadow(g, x, y + 4, 200, 30, 0.35);
  const top = y - 220;
  for (const k of [-1, 1]) {
    g.lineStyle(12, IRON_DARK, 1); g.lineBetween(x + k * 86, y, x + k * 66, top);
    g.lineStyle(4, IRON_LIT, 0.5); g.lineBetween(x + k * 86 - 3, y, x + k * 66 - 3, top);
    // Lattice bracing.
    for (let i = 0; i < 5; i++) {
      const y1 = y - i * 40, y2 = y - (i + 1) * 40;
      const x1 = x + k * (86 - i * 4), x2 = x + k * (86 - (i + 1) * 4);
      g.lineStyle(1.5, IRON, 1); g.lineBetween(x1, y1, x2 - k * 14, y2); g.lineBetween(x1 - k * 14, y1, x2, y2);
    }
    g.fillStyle(STONE_DARK, 1); g.fillRect(x + k * 86 - 14, y - 8, 28, 10);
  }
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 84, top - 12, 168, 16);
  g.fillStyle(IRON, 1); g.fillRect(x - 84, top - 12, 168, 5);
  rivets(g, x - 78, top - 3, x + 78, top - 3, 12, 1.2, IRON_SHEEN);
  // The steelyard.
  const py = top + 34;
  g.lineStyle(3, IRON_DARK, 1); g.lineBetween(x, top + 4, x, py);
  const L1 = 48, L2 = 130;
  const ax = x - Math.cos(tilt) * L1, ay = py - Math.sin(tilt) * L1;
  const bx = x + Math.cos(tilt) * L2, by = py + Math.sin(tilt) * L2;
  g.lineStyle(8, IRON_DARK, 1); g.lineBetween(ax, ay, bx, by);
  g.lineStyle(3, IRON_SHEEN, 0.7); g.lineBetween(ax, ay - 2, bx, by - 2);
  for (let i = 1; i < 12; i++) { const k = i / 12; g.fillStyle(HEAT_WHITE, 0.6); g.fillRect(x + (bx - x) * k - 0.5, py + (by - py) * k - 5, 1, 3); }
  g.fillStyle(IRON, 1); g.fillTriangle(x - 6, py + 6, x + 6, py + 6, x, py - 4);
  // Counterpoise: a dressed stone ball on a short chain.
  const cx = x + (bx - x) * 0.72, cy = py + (by - py) * 0.72;
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(cx, cy, cx, cy + 22);
  g.fillStyle(STONE_DARK, 1); g.fillCircle(cx, cy + 34, 14);
  g.fillStyle(STONE, 1); g.fillCircle(cx - 2, cy + 32, 12);
  g.fillStyle(STONE_LIT, 0.6); g.fillCircle(cx - 5, cy + 28, 4);
  // The hook and cradle with its load of ingots.
  g.lineStyle(2.5, IRON_LIT, 1); g.lineBetween(ax, ay, ax - 18, ay + 60); g.lineBetween(ax, ay, ax + 18, ay + 60);
  g.lineStyle(5, IRON, 1); g.beginPath(); g.arc(ax, ay + 14, 7, -Math.PI * 0.2, Math.PI * 1.1, false); g.strokePath();
  g.fillStyle(IRON_DARK, 1); g.fillRect(ax - 24, ay + 58, 48, 6);
  for (let i = 0; i < 3; i++) {
    g.fillStyle(mixC(IRON, RUST, 0.2), 1); g.fillRect(ax - 20 + i * 14, ay + 48, 12, 10);
    g.fillStyle(IRON_LIT, 0.6); g.fillRect(ax - 20 + i * 14, ay + 48, 12, 2);
  }
  regentSeal(g, x, top - 4, 7, IRON);
}

/**
 * Prince Anvil's hall: an ironstone plinth, walls of riveted black plate between buttresses
 * shaped like anvil horns, a roof that *is* an anvil — a flat face with a horn jutting west and a
 * heel to the east — two great chimneys, and the iron doors under the Regent's seal. `x,y` =
 * front base centre.
 */
export function anvilHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 8, w * 1.12, 46, 0.42);
  // Plinth.
  g.fillStyle(IRONSTONE_DARK, 1); g.fillRect(x0 - 16, y - 30, w + 32, 30);
  for (let bx = x0 - 16; bx < x0 + w + 16; bx += 32) {
    g.fillStyle(IRONSTONE, 1); g.fillRect(bx + 2, y - 28, 28, 12);
    g.fillStyle(IRONSTONE_LIT, 1); g.fillRect(bx + 2, y - 28, 28, 2);
    g.fillStyle(IRONSTONE, 0.8); g.fillRect(bx + 18, y - 14, 28, 12);
  }
  // The walls: black plate in panels.
  const wy = y - 30, wh = h;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0, wy - wh, w, wh);
  const panels = Math.round(w / 64);
  const pw = w / panels;
  for (let i = 0; i < panels; i++) {
    const px = x0 + i * pw;
    g.fillStyle(i % 2 ? IRON : mixC(IRON, IRON_DARK, 0.35), 1); g.fillRect(px + 3, wy - wh + 3, pw - 6, wh - 6);
    g.fillStyle(IRON_LIT, 0.25); g.fillRect(px + 3, wy - wh + 3, pw - 6, 3);
    rivets(g, px + 6, wy - wh + 8, px + pw - 6, wy - wh + 8, 5, 1.2, IRON_SHEEN);
    rivets(g, px + 6, wy - 8, px + pw - 6, wy - 8, 5, 1.2, IRON_SHEEN);
    if (rng() < 0.6) { g.fillStyle(RUST, 0.3); g.fillRect(px + 8 + rng() * (pw - 20), wy - wh + 12, 3, 30 + rng() * 40); }
    // Slit windows with the hall's forges behind.
    if (i % 2 === 1 && Math.abs(px + pw / 2 - x) > 70) {
      g.fillStyle(0x140806, 1); g.fillRect(px + pw / 2 - 5, wy - wh * 0.7, 10, wh * 0.36);
      g.fillStyle(HEAT_ORANGE, 0.75); g.fillRect(px + pw / 2 - 3, wy - wh * 0.7 + 4, 6, wh * 0.36 - 6);
    }
  }
  // Buttresses: little anvil horns between panels.
  for (let i = 0; i <= panels; i += 2) {
    const bx = x0 + i * pw;
    poly(g, [{ x: bx - 9, y: wy }, { x: bx + 9, y: wy }, { x: bx + 6, y: wy - wh + 10 }, { x: bx + 16, y: wy - wh + 2 }, { x: bx - 16, y: wy - wh + 2 }, { x: bx - 6, y: wy - wh + 10 }], IRON_DARK);
    g.fillStyle(IRON_LIT, 0.35); g.fillRect(bx - 6, wy - wh + 10, 3, wh - 10);
  }
  // The roof: an anvil. Face on top, horn to the west, heel to the east.
  const ry = wy - wh;
  const fh = 42;
  poly(g, [
    { x: x0 + 20, y: ry }, { x: x0 + w - 20, y: ry }, { x: x0 + w - 4, y: ry - 26 }, { x: x0 + w + 40, y: ry - 30 },
    { x: x0 + w + 40, y: ry - fh - 18 }, { x: x0 - 20, y: ry - fh - 18 }, { x: x0 - 130, y: ry - fh + 2 }, { x: x0 - 20, y: ry - 24 },
  ], ANVIL_BODY);
  g.fillStyle(IRON_SHEEN, 0.75); g.fillRect(x0 - 20, ry - fh - 20, w + 60, 5);
  g.lineStyle(2, IRON_LIT, 0.4); g.lineBetween(x0 - 128, ry - fh + 1, x0 - 20, ry - fh - 16);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 + w - 4, ry - fh - 14, 14, 10);
  g.fillCircle(x0 + w + 24, ry - fh - 9, 5);
  rivets(g, x0 - 10, ry - 10, x0 + w + 30, ry - 10, 24, 1.3, IRON_SHEEN);
  // Chimneys rising from the face.
  for (const cxr of [0.25, 0.75]) {
    const cx = x0 + w * cxr;
    g.fillStyle(BRICK_DARK, 1); g.fillRect(cx - 18, ry - fh - 120, 36, 104);
    g.fillStyle(BRICK, 1); g.fillRect(cx - 16, ry - fh - 120, 22, 104);
    for (let yy = ry - fh - 114; yy < ry - fh - 18; yy += 8) { g.lineStyle(1, BRICK_DARK, 0.6); g.lineBetween(cx - 16, yy, cx + 16, yy); }
    for (const yy of [ry - fh - 90, ry - fh - 50]) { g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 20, yy, 40, 5); }
    g.fillStyle(IRON_DARK, 1); g.fillRect(cx - 22, ry - fh - 128, 44, 10);
    g.fillStyle(HEAT_RED, 0.6); g.fillEllipse(cx, ry - fh - 128, 24, 5);
  }
  // The doors: iron leaves in a riveted frame, the Regent's seal over them, a hammer each side.
  const dw = 110, dh = Math.min(wh * 0.78, 130);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - dw / 2 - 12, wy - dh - 14, dw + 24, dh + 14);
  g.fillStyle(0x1a0c08, 1); g.fillRect(x - dw / 2, wy - dh, dw, dh);
  for (const k of [-1, 1]) {
    const lx = x + (k < 0 ? -dw / 2 + 2 : 2);
    g.fillStyle(IRON, 1); g.fillRect(lx, wy - dh + 2, dw / 2 - 4, dh - 2);
    for (let yy = wy - dh + 14; yy < wy; yy += 22) rivets(g, lx + 4, yy, lx + dw / 2 - 8, yy, 4, 1.4, IRON_SHEEN);
    g.fillStyle(IRON_DARK, 1); g.fillCircle(x + k * 10, wy - dh * 0.5, 6);
    g.lineStyle(2, IRON_SHEEN, 1); g.strokeCircle(x + k * 10, wy - dh * 0.5 + 6, 6);
  }
  // A line of forge-light under the doors.
  g.fillStyle(HEAT_ORANGE, 0.7); g.fillRect(x - dw / 2 + 2, wy - 3, dw - 4, 3);
  regentSeal(g, x, wy - dh - 30, 16, IRON);
  for (const k of [-1, 1]) {
    const hx = x + k * (dw / 2 + 40);
    g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(hx, wy - 10, hx, wy - dh + 10);
    g.fillStyle(IRON_DARK, 1); g.fillRect(hx - 18, wy - dh - 4, 36, 22);
    g.fillStyle(IRON_LIT, 0.6); g.fillRect(hx - 18, wy - dh - 4, 36, 4);
  }
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? IRONSTONE : IRONSTONE_LIT, 1); g.fillRect(x - dw / 2 - 20 - k * 8, y - 12 + k * 4, dw + 40 + k * 16, 5); }
}
const ANVIL_BODY = 0x2a2e34;

/**
 * A chain-bridge tower: an iron post with a pulley cap. The bridge's chains are drawn between
 * two of these by `bridgeChain`. `x,y` = post foot.
 */
export function bridgeTower(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 30, 10);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 10, y - 10, 20, 12);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 5, y - 70, 10, 62);
  g.fillStyle(IRON_LIT, 0.6); g.fillRect(x - 4, y - 70, 3, 62);
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 72, 7);
  g.fillStyle(IRON_SHEEN, 1); g.fillCircle(x - 2, y - 74, 2);
}

/** A sagging chain between two tower tops (`a` and `b` are the tower feet). */
export function bridgeChain(g: G, a: Pt, b: Pt, sag = 30): void {
  const n = Math.max(8, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 9));
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const x = a.x + (b.x - a.x) * k, y = a.y - 72 + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag;
    g.lineStyle(1.8, i % 2 ? IRON_LIT : IRON, 1);
    g.strokeEllipse(x, y, i % 2 ? 4 : 8, i % 2 ? 6 : 4);
  }
  // Hangers down to the deck.
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    const x = a.x + (b.x - a.x) * k, y = a.y - 72 + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag;
    g.lineStyle(1, IRON_LIT, 0.8); g.lineBetween(x, y, x, a.y + (b.y - a.y) * k - 6);
  }
}

/** A mine adit in the hillside: timber sets, a lamp, rails running in. `x,y` = mouth foot. */
export function mineAdit(g: G, x: number, y: number): void {
  g.fillStyle(0x0c0806, 1); g.fillRect(x - 30, y - 70, 60, 70);
  g.fillStyle(0x000000, 0.6); g.fillEllipse(x, y - 30, 50, 60);
  for (const k of [-1, 1]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 32 - 7, y - 76, 14, 76);
    g.fillStyle(TIMBER, 1); g.fillRect(x + k * 32 - 5, y - 76, 5, 76);
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 44, y - 88, 88, 14);
  g.fillStyle(TIMBER_LIT, 0.6); g.fillRect(x - 44, y - 88, 88, 3);
  // Spoil on the lintel and a hung lamp.
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? IRONSTONE : OCHRE_DARK, 1); g.fillEllipse(x - 40 + i * 11, y - 92, 12, 6); }
  g.lineStyle(1, IRON_DARK, 1); g.lineBetween(x + 22, y - 74, x + 22, y - 62);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 18, y - 62, 8, 10);
  g.fillStyle(HEAT_YELLOW, 0.9); g.fillRect(x + 19, y - 60, 6, 6);
  glow(g, x + 22, y - 56, 22, HEAT_YELLOW, 0.05, 3);
}

/** The court's waystone: a standing stone bound in three iron hoops, a little brazier on top. */
export function forgeWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 46, 14);
  poly(g, [{ x: x - 16, y }, { x: x + 16, y }, { x: x + 12, y: y - 70 }, { x: x + 2, y: y - 80 }, { x: x - 13, y: y - 72 }], IRONSTONE_DARK);
  poly(g, [{ x: x - 13, y }, { x: x + 4, y }, { x: x + 2, y: y - 78 }, { x: x - 11, y: y - 71 }], IRONSTONE);
  for (const yy of [y - 14, y - 38, y - 60]) {
    g.fillStyle(IRON_DARK, 1); g.fillRect(x - 17, yy - 3, 34, 6);
    g.fillStyle(IRON_LIT, 0.7); g.fillRect(x - 17, yy - 3, 34, 1.5);
  }
  g.fillStyle(IRON_DARK, 1); g.fillTriangle(x - 10, y - 80, x + 10, y - 80, x, y - 72);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 82, 22, 7);
  g.fillStyle(HEAT_ORANGE, 0.9); g.fillEllipse(x, y - 84, 14, 4);
}

/** A forge bellows: two boards and a leather bag, with its nozzle. `k` 0..1 = how far squeezed. */
export function bellows(g: G, x: number, y: number, s: number, k: number): void {
  const open = (1 - k) * 10 * s + 3 * s;
  poly(g, [{ x: x - 22 * s, y: y - open }, { x: x + 14 * s, y: y - 3 * s }, { x: x + 14 * s, y: y + 3 * s }, { x: x - 22 * s, y: y + open }], LEATHER);
  for (let i = 1; i < 4; i++) { g.lineStyle(1, dim(LEATHER, 0.35), 1); g.lineBetween(x - 22 * s + i * 8 * s, y - open * (1 - i / 4.5), x - 22 * s + i * 8 * s, y + open * (1 - i / 4.5)); }
  g.lineStyle(3 * s, TIMBER, 1); g.lineBetween(x - 26 * s, y - open, x + 14 * s, y - 3 * s); g.lineBetween(x - 26 * s, y + open, x + 14 * s, y + 3 * s);
  g.fillStyle(LEATHER_LIT, 0.5); g.fillRect(x - 20 * s, y - 1 * s, 30 * s, 2 * s);
  g.lineStyle(4 * s, IRON, 1); g.lineBetween(x + 14 * s, y, x + 26 * s, y);
  g.lineStyle(3 * s, TIMBER_DARK, 1); g.lineBetween(x - 26 * s, y - open, x - 34 * s, y - open - 4 * s);
}

/** A slack-tub: a coopered half-barrel of water for cooling iron, steaming faintly. */
export function slackTub(g: G, x: number, y: number, r: number): void {
  shadow(g, x, y + r * 0.5, r * 2.4, r * 0.7);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y + r * 0.25, r * 2.1, r * 1.3);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x, y, r * 2.1, r * 1.2);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.lineStyle(1, TIMBER_DARK, 0.8); g.lineBetween(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.55, x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 0.6); }
  g.lineStyle(3, IRON_DARK, 1); g.strokeEllipse(x, y, r * 2.12, r * 1.22);
  g.lineStyle(1.5, IRON_LIT, 0.6); g.strokeEllipse(x, y - 1, r * 2.12, r * 1.22);
  g.fillStyle(QUENCH, 1); g.fillEllipse(x, y, r * 1.8, r * 0.98);
  g.fillStyle(QUENCH_LIT, 0.35); g.fillEllipse(x - r * 0.3, y - r * 0.15, r * 0.7, r * 0.25);
}

/** A junction lever on a rail switch: a post, a quadrant and a handle thrown left or right. */
export function junctionLever(g: G, x: number, y: number, thrown: boolean, glowK = 0): void {
  shadow(g, x, y + 2, 30, 9);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 12, y - 6, 24, 8);
  g.lineStyle(3, IRON, 1); g.beginPath(); g.arc(x, y - 6, 12, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
  const a = thrown ? -Math.PI * 0.3 : -Math.PI * 0.7;
  const hx = x + Math.cos(a) * 26, hy = y - 6 + Math.sin(a) * 26;
  g.lineStyle(4, IRON_LIT, 1); g.lineBetween(x, y - 6, hx, hy);
  g.fillStyle(thrown ? HEAT_ORANGE : 0xd8d0c0, 1); g.fillCircle(hx, hy, 4.5);
  if (glowK > 0) glow(g, hx, hy, 16, HEAT_YELLOW, 0.06 * glowK, 3);
}

/** An electromagnet's disc, seen from above, with its coil windings; `live` 0..1 lights it blue. */
export function magnetDisc(g: G, x: number, y: number, r: number, live: number): void {
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, r);
  g.lineStyle(3, IRON, 1); g.strokeCircle(x, y, r - 3);
  for (let k = 1; k < 5; k++) { g.lineStyle(1.5, mixC(BRONZE_DARK, COIL, live), 0.8); g.strokeCircle(x, y, r * (0.25 + k * 0.15)); }
  g.fillStyle(mixC(IRON, COIL_LIT, live), 1); g.fillCircle(x, y, r * 0.18);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r); }
  if (live > 0) { g.lineStyle(2, COIL_LIT, 0.4 * live); g.strokeCircle(x, y, r + 3); glow(g, x, y, r * 1.4, COIL, 0.04 * live, 3); }
}
