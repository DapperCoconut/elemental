import Phaser from 'phaser';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BRONZE, BRONZE_DARK, BRONZE_LIT, FELT, FELT_BLUE, FELT_COLORS, FELT_MOSS, FELT_DARK, FELT_LIT, FELT_OAT, FELT_OAT_DARK, FELT_PLUM,
  FELT_PLUM_DARK, FINE_RED, HUSH, INK, IRON, IRON_LIT, LAMP, LAMP_DEEP, LAMP_GLOW, MERE, MERE_DEEP, MERE_LIT, MERE_SKY,
  PLASTER, PLASTER_DARK, REED, SILK, SILK_SHADE, SLATE, SLUSH, SNOW, SNOW_DEEP, SNOW_LIT, SNOW_SHADE, TIMBER,
  TIMBER_DARK, TIMBER_LIT, TRODDEN, VERDI, WARDEN,
} from './palette';

/**
 * Hush set pieces — the shapes only a muffled town has. Everything that could make a sound has
 * been padded: roofs are felted and snow-laden so the rain cannot drum, shutters are quilted, the
 * streets are laid with felt runners over the cobbles, door knockers are wrapped in wool, and the
 * great Hush Bell hangs in its frame with no clapper in it at all. Where the town still *shows*
 * sound it is in shapes: the hand-shapes on the signing-posts, the white ribbons of the muted,
 * the wardens' hooded lanterns that swing toward a noise.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

// ── Ground ───────────────────────────────────────────────────────────

/** Snow over everything: drifts in shade, wind ripples, a sparkle where the light catches. */
export function snowGround(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(SNOW, 1); g.fillRect(r.x, r.y, r.w, r.h);
  // Long soft drifts, blue in their lee.
  for (let i = 0; i < (r.w * r.h) / 26000; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h, w = 80 + rng() * 220;
    g.fillStyle(SNOW_SHADE, 0.35); g.fillEllipse(x, y + 6, w, w * 0.22);
    g.fillStyle(SNOW_LIT, 0.55); g.fillEllipse(x - w * 0.08, y, w * 0.8, w * 0.14);
  }
  // Wind ripples: short shallow arcs, all lying the same way.
  for (let i = 0; i < (r.w * r.h) / 9000; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.lineStyle(1, SNOW_SHADE, 0.45);
    g.beginPath(); g.arc(x, y, 10 + rng() * 10, Math.PI * 1.1, Math.PI * 1.75, false); g.strokePath();
  }
  // Glitter.
  for (let i = 0; i < (r.w * r.h) / 2600; i++) {
    g.fillStyle(rng() < 0.5 ? SNOW_LIT : 0xdfe9f6, 0.9); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 1.4, 1.4);
  }
}

/**
 * A padded street: trodden grey slush with felt runners laid down the middle — strips of
 * fulled wool, their edges blanket-stitched, a seam every few yards where two bolts meet — and
 * snow banked up along both kerbs where the wardens shovel it.
 */
export function paddedStreet(g: G, pts: Pt[], w: number, rng: () => number, felt = FELT): void {
  const seg = (fn: (a: Pt, b: Pt, ang: number, len: number) => void) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      fn(a, b, Math.atan2(b.y - a.y, b.x - a.x), Math.hypot(b.x - a.x, b.y - a.y));
    }
  };
  const band = (width: number, color: number, alpha: number) => {
    g.lineStyle(width, color, alpha);
    seg((a, b) => g.lineBetween(a.x, a.y, b.x, b.y));
    for (const p of pts) { g.fillStyle(color, alpha); g.fillCircle(p.x, p.y, width / 2); }
  };
  band(w + 26, SNOW_SHADE, 1);
  band(w + 14, SNOW_LIT, 0.6);
  band(w, SLUSH, 1);
  band(w - 8, TRODDEN, 1);
  band(w * 0.56, dim(felt, 0.15), 1);
  band(w * 0.5, felt, 1);
  // Blanket-stitched edges and the seams where bolts meet.
  seg((a, b, ang, len) => {
    const nx = -Math.sin(ang), ny = Math.cos(ang), hw = w * 0.25 - 2;
    for (let d = 0; d < len; d += 9) {
      const x = a.x + Math.cos(ang) * d, y = a.y + Math.sin(ang) * d;
      for (const k of [-1, 1]) {
        g.lineStyle(1, FELT_OAT, 0.75);
        g.lineBetween(x + nx * hw * k, y + ny * hw * k, x + nx * (hw - 4) * k, y + ny * (hw - 4) * k);
      }
    }
    for (let d = 40 + rng() * 40; d < len; d += 90 + rng() * 40) {
      const x = a.x + Math.cos(ang) * d, y = a.y + Math.sin(ang) * d;
      g.lineStyle(2, dim(felt, 0.3), 0.8); g.lineBetween(x + nx * w * 0.25, y + ny * w * 0.25, x - nx * w * 0.25, y - ny * w * 0.25);
    }
    // Slush puddles and cobbles showing where the runners have worn through.
    for (let d = 0; d < len; d += 30) {
      if (rng() > 0.35) continue;
      const side = rng() < 0.5 ? -1 : 1;
      const x = a.x + Math.cos(ang) * d + nx * side * w * 0.36, y = a.y + Math.sin(ang) * d + ny * side * w * 0.36;
      g.fillStyle(dim(SLUSH, 0.15), 0.8); g.fillEllipse(x, y, 10 + rng() * 6, 6);
      g.fillStyle(lit(SLUSH, 0.3), 0.5); g.fillEllipse(x - 1, y - 1, 5, 2.5);
    }
  });
}

/** A line of footprints in snow — every set the same: felt soles leave no tread. */
export function footprints(g: G, a: Pt, b: Pt, rng: () => number, color = SNOW_DEEP): void {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), len = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (let d = 0, k = 0; d < len; d += 18, k++) {
    const s = k % 2 ? 1 : -1;
    const x = a.x + Math.cos(ang) * d + nx * s * 5 + (rng() - 0.5) * 2, y = a.y + Math.sin(ang) * d + ny * s * 5;
    g.fillStyle(color, 0.45); g.fillEllipse(x, y, 7, 4);
  }
}

/**
 * The Hush Mere: still enough to be a mirror. Dark at the heart, holding the pale sky at its
 * edges, the snowy shore and the town's rooftops reflected upside down along the far rim, a
 * frozen reed-bed in one corner. No ripple is drawn — the animation adds the one or two it allows.
 */
export function mereWater(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // The snowy shore.
  g.fillStyle(SNOW_SHADE, 1); g.fillEllipse(cx, cy + 6, r.w + 60, r.h + 50);
  g.fillStyle(SNOW_LIT, 0.8); g.fillEllipse(cx, cy - 4, r.w + 40, r.h + 30);
  g.fillStyle(SLATE, 1); g.fillEllipse(cx, cy + 2, r.w + 8, r.h + 6);
  // Water: sky at the rim, dark at the heart.
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    g.fillStyle(mixC(MERE_SKY, MERE_DEEP, k), 1);
    g.fillEllipse(cx, cy, r.w * (1 - k * 0.55), r.h * (1 - k * 0.55));
  }
  // The reflection of the far shore: rooftops and pines, inverted, softened.
  const ry = r.y + r.h * 0.22;
  for (let x = r.x + 60; x < r.x + r.w - 60; x += 46 + rng() * 30) {
    const h = 18 + rng() * 26;
    if (rng() < 0.45) {
      g.fillStyle(dim(MERE, 0.25), 0.45); g.fillTriangle(x - 10, ry, x + 10, ry, x, ry + h * 1.4);
    } else {
      g.fillStyle(dim(MERE, 0.3), 0.4); g.fillRect(x - 16, ry, 32, h * 0.6);
      g.fillStyle(MERE_SKY, 0.3); g.fillTriangle(x - 20, ry + h * 0.6, x + 20, ry + h * 0.6, x, ry + h * 1.1);
      g.fillStyle(LAMP_GLOW, 0.35); g.fillRect(x - 4, ry + 4, 4, 5);
    }
  }
  // A long pale sheen across the middle: the mirror.
  g.fillStyle(MERE_LIT, 0.18); g.fillEllipse(cx - r.w * 0.08, cy + r.h * 0.08, r.w * 0.7, r.h * 0.12);
  g.fillStyle(SNOW_LIT, 0.12); g.fillEllipse(cx - r.w * 0.12, cy + r.h * 0.06, r.w * 0.4, r.h * 0.04);
  // Frozen reeds in the south-west corner, snow on their heads.
  for (let i = 0; i < 26; i++) {
    const x = r.x + 30 + rng() * 140, y = r.y + r.h - 30 - rng() * 60, h = 14 + rng() * 18;
    g.lineStyle(1.5, REED, 1); g.lineBetween(x, y, x + (rng() - 0.5) * 6, y - h);
    g.fillStyle(SNOW_LIT, 0.9); g.fillEllipse(x, y - h, 3, 2);
    g.fillStyle(dim(MERE, 0.2), 0.5); g.lineStyle(1, dim(REED, 0.4), 0.35); g.lineBetween(x, y, x + 2, y + h * 0.6);
  }
}

/** Planking: a boardwalk or the loose boards of a warden's floor. */
export function planks(g: G, r: Rect, rng: () => number, vertical = false, loose: number[] = []): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  const n = Math.max(1, Math.round((vertical ? r.w : r.h) / 14));
  const bw = (vertical ? r.w : r.h) / n;
  for (let i = 0; i < n; i++) {
    const c = mixC(TIMBER, TIMBER_LIT, rng() * 0.6);
    const rr = vertical ? { x: r.x + i * bw, y: r.y, w: bw - 1.5, h: r.h } : { x: r.x, y: r.y + i * bw, w: r.w, h: bw - 1.5 };
    g.fillStyle(loose.includes(i) ? dim(c, 0.15) : c, 1); g.fillRect(rr.x, rr.y, rr.w, rr.h);
    // Grain and nail heads.
    g.lineStyle(1, dim(c, 0.25), 0.6);
    if (vertical) g.lineBetween(rr.x + rr.w * 0.4, rr.y + 4, rr.x + rr.w * 0.5, rr.y + rr.h - 4);
    else g.lineBetween(rr.x + 4, rr.y + rr.h * 0.45, rr.x + rr.w - 4, rr.y + rr.h * 0.55);
    for (let d = 10; d < (vertical ? rr.h : rr.w); d += 46) {
      g.fillStyle(IRON, 0.8);
      if (vertical) g.fillCircle(rr.x + rr.w / 2, rr.y + d, 1.2); else g.fillCircle(rr.x + d, rr.y + rr.h / 2, 1.2);
    }
  }
  // Snow along the boards' edges.
  g.fillStyle(SNOW_LIT, 0.7);
  if (vertical) { g.fillRect(r.x, r.y - 3, r.w, 3); } else { g.fillRect(r.x - 2, r.y - 3, r.w + 4, 3); }
}

/** A long low snowbank — the court's walls, and the drifts the wardens shovel. */
export function snowbank(g: G, x0: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(SNOW_DEEP, 1); g.fillRect(x0, y - h * 0.5, w, h * 0.5 + 4);
  for (let x = x0; x < x0 + w; x += 26) {
    const r = h * (0.45 + rng() * 0.25);
    g.fillStyle(SNOW_SHADE, 1); g.fillCircle(x + 13, y - h * 0.45, r);
  }
  for (let x = x0; x < x0 + w; x += 26) {
    const r = h * (0.32 + rng() * 0.2);
    g.fillStyle(SNOW, 1); g.fillCircle(x + 10, y - h * 0.55, r);
    g.fillStyle(SNOW_LIT, 0.9); g.fillCircle(x + 6, y - h * 0.62, r * 0.5);
  }
}

// ── Hand-shapes ──────────────────────────────────────────────────────

/** The four hand-shapes of the Hush wardens' sign: every signing-post and every tile of Palm's floor. */
export type HandShape = 'palm' | 'fist' | 'point' | 'bell';
export const HAND_SHAPES: HandShape[] = ['palm', 'fist', 'point', 'bell'];
/** What each shape means, as the signing-posts gloss it. */
export const HAND_WORDS: Record<HandShape, string> = { palm: 'STOP', fist: 'HOLD', point: 'GO', bell: 'HUSH' };
/** Each shape's ink, so tiles read at a glance. */
export const HAND_COLORS: Record<HandShape, number> = { palm: 0x5a86c8, fist: 0xb85a4a, point: 0xd8b04a, bell: 0x8a6ab8 };

/**
 * One hand-shape, about 26×30 at s = 1, centred on (x, y): a palm and its fingers built from
 * rounded pieces with a knuckle crease, so the four read apart even small.
 */
export function handShape(g: G, x: number, y: number, s: number, shape: HandShape, color = INK, a = 1): void {
  const finger = (fx: number, fy: number, len: number, ang = -Math.PI / 2, w = 5) => {
    const ex = fx + Math.cos(ang) * len * s, ey = fy + Math.sin(ang) * len * s;
    g.lineStyle(w * s, color, a); g.lineBetween(fx, fy, ex, ey);
    g.fillStyle(color, a); g.fillCircle(ex, ey, (w * s) / 2); g.fillCircle(fx, fy, (w * s) / 2);
  };
  const palm = (h = 13) => { g.fillStyle(color, a); g.fillRoundedRect(x - 8 * s, y - 2 * s, 16 * s, h * s, 4 * s); };
  switch (shape) {
    case 'palm':
      palm();
      finger(x - 6 * s, y - 1 * s, 10, -Math.PI / 2 - 0.12);
      finger(x - 2 * s, y - 2 * s, 12, -Math.PI / 2 - 0.04);
      finger(x + 2.5 * s, y - 2 * s, 11.5, -Math.PI / 2 + 0.04);
      finger(x + 6.5 * s, y - 1 * s, 9, -Math.PI / 2 + 0.12);
      finger(x - 8 * s, y + 6 * s, 8, Math.PI + 0.6);
      break;
    case 'fist':
      palm(12);
      for (let i = 0; i < 4; i++) { g.fillStyle(color, a); g.fillCircle(x - 6 * s + i * 4 * s, y - 3 * s, 2.8 * s); }
      finger(x - 7 * s, y + 3 * s, 8, -0.2, 4.5);
      g.lineStyle(1.2 * s, lit(color, 0.5), a * 0.8); g.lineBetween(x - 7 * s, y + 1 * s, x + 7 * s, y + 1 * s);
      break;
    case 'point':
      palm(11);
      finger(x - 4 * s, y - 2 * s, 14, -Math.PI / 2 - 0.05);
      for (let i = 0; i < 3; i++) { g.fillStyle(color, a); g.fillCircle(x + 0.5 * s + i * 3.4 * s, y - 1 * s, 2.5 * s); }
      finger(x - 8 * s, y + 5 * s, 6, Math.PI + 0.9, 4.5);
      break;
    case 'bell': {
      // A cupped hand, fingers and thumb curled into a C — the shape of a bell's mouth.
      g.lineStyle(6 * s, color, a);
      g.beginPath(); g.arc(x, y + 2 * s, 9 * s, -Math.PI * 0.25, Math.PI * 1.25, true); g.strokePath();
      g.fillStyle(color, a); g.fillCircle(x + Math.cos(-Math.PI * 0.25) * 9 * s, y + 2 * s + Math.sin(-Math.PI * 0.25) * 9 * s, 3 * s);
      g.fillCircle(x + Math.cos(Math.PI * 1.25) * 9 * s, y + 2 * s + Math.sin(Math.PI * 1.25) * 9 * s, 3 * s);
      g.fillRoundedRect(x - 4 * s, y + 8 * s, 8 * s, 7 * s, 2 * s);
      break;
    }
  }
}

/** A signing-post: a snow-capped post carrying a board with one hand-shape and its word. */
export function signPost(g: G, x: number, y: number, shape: HandShape, rng: () => number): void {
  shadow(g, x, y + 2, 34, 9);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, y - 74, 6, 74);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 2, y - 74, 3, 74);
  // The board, a little skewed, with a felt-wrapped edge.
  const bx = x, by = y - 84;
  g.fillStyle(dim(FELT_OAT, 0.3), 1); g.fillRoundedRect(bx - 22, by - 22, 44, 40, 4);
  g.fillStyle(PLASTER, 1); g.fillRoundedRect(bx - 19, by - 19, 38, 34, 3);
  handShape(g, bx, by - 4, 0.72, shape, HAND_COLORS[shape]);
  g.fillStyle(INK, 0.75); g.fillRect(bx - 12, by + 9, 24, 2);
  // Snow on the board's top and the post's cap.
  g.fillStyle(SNOW_LIT, 1); g.fillEllipse(bx, by - 21, 46, 7);
  g.fillStyle(SNOW, 1); g.fillEllipse(bx + (rng() - 0.5) * 6, by - 23, 28, 5);
  // A fine notice pinned under it, its red seal.
  g.fillStyle(SILK_SHADE, 1); g.fillRect(x - 7, y - 50, 14, 16);
  g.fillStyle(FINE_RED, 1); g.fillCircle(x, y - 38, 2.5);
}

// ── Lights ───────────────────────────────────────────────────────────

/**
 * A warden's lantern on its post: an iron cage with a hinged hood that can be swung to throw its
 * light one way — the wardens point it at a noise. A felt collar under the cage stops it rattling.
 */
export function wardenLantern(g: G, x: number, y: number, on = true): void {
  shadow(g, x, y + 2, 24, 7);
  g.fillStyle(IRON, 1); g.fillRect(x - 2.5, y - 86, 5, 86);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 1, y - 86, 1.5, 86);
  g.fillStyle(IRON, 1); g.fillRect(x - 7, y - 4, 14, 4);
  // The bracket arm and the hanging cage.
  g.lineStyle(2.5, IRON, 1); g.lineBetween(x, y - 84, x + 18, y - 84); g.lineBetween(x + 4, y - 84, x + 14, y - 74);
  const lx = x + 18, ly = y - 66;
  g.fillStyle(FELT_PLUM, 1); g.fillRect(lx - 5, ly - 18, 10, 4);
  if (on) { glow(g, lx, ly, 22, LAMP_GLOW, 0.06, 3); g.fillStyle(LAMP, 1); g.fillRect(lx - 5, ly - 13, 10, 14); }
  else { g.fillStyle(dim(LAMP_DEEP, 0.5), 1); g.fillRect(lx - 5, ly - 13, 10, 14); }
  g.lineStyle(1.5, IRON, 1); g.strokeRect(lx - 6, ly - 14, 12, 16); g.lineBetween(lx, ly - 14, lx, ly + 2);
  // The hood, tilted down: a black iron cowl over the light.
  g.fillStyle(IRON, 1); g.fillTriangle(lx - 9, ly - 13, lx + 9, ly - 13, lx, ly - 24);
  g.fillStyle(SNOW_LIT, 1); g.fillEllipse(lx, ly - 22, 10, 3);
  g.fillStyle(IRON, 1); g.fillRect(lx - 3, ly + 2, 6, 3);
}

/** A warm window light breathing behind a quilted shutter (for `animate`). */
export function windowGlow(g: G, x: number, y: number, t: number, seed: number): void {
  const k = 0.75 + Math.sin(t * 1.3 + seed) * 0.12 + Math.sin(t * 3.1 + seed * 2) * 0.06;
  g.fillStyle(LAMP_GLOW, 0.06 * k); g.fillCircle(x, y, 22);
  g.fillStyle(LAMP, 0.35 * k); g.fillRect(x - 5, y - 6, 10, 12);
}

/** Chimney smoke, rising slow and straight in still air (for `animateOver`). */
export function chimneySmoke(g: G, x: number, y: number, t: number, seed: number): void {
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.12 + i / 6 + seed) % 1;
    g.fillStyle(0xd8dde4, 0.28 * (1 - ph)); g.fillCircle(x + Math.sin(ph * 4 + seed) * 4 * ph, y - ph * 70, 5 + ph * 12);
  }
}

/** A white silk ribbon fluttering from a knot at (x, y) — the mark of the muted. */
export function ribbon(g: G, x: number, y: number, len: number, t: number, seed: number, color = SILK, a = 1, wind = 1): void {
  let px = x, py = y;
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const nx = x + k * len * 0.6 * wind + Math.sin(t * 3 + seed + k * 4) * 3 * k;
    const ny = y + k * len * 0.8 + Math.cos(t * 2.4 + seed + k * 3) * 2 * k;
    g.lineStyle(3.2 * (1 - k * 0.5), color, a); g.lineBetween(px, py, nx, ny);
    px = nx; py = ny;
  }
  g.fillStyle(color, a); g.fillCircle(x, y, 2.4);
}

// ── Buildings ────────────────────────────────────────────────────────

export interface FeltHouseOpts {
  wall?: number;
  felt?: number;
  /** Window lights lit (default true). */
  lit?: boolean;
  /** A trade sign hung over the door. */
  sign?: (g: G, sx: number, sy: number) => void;
  /** A red fine notice nailed to the door. */
  fined?: boolean;
  /** A white ribbon tied to the door handle: someone here was muted. */
  ribbon?: boolean;
  chimney?: boolean;
}

/**
 * A Hush house: timber-framed plaster under a thick felted roof — quilted in rows, stitched at
 * the seams, a heavy roll of felt along the eaves to catch the drip — and a deep cap of snow on
 * top. Quilted shutters half-closed over warm windows, a door knocker wrapped in wool, icicles.
 * `x, y` is the front wall's base centre.
 */
export function feltHouse(g: G, x: number, y: number, w: number, h: number, o: FeltHouseOpts, rng: () => number): void {
  const wall = o.wall ?? PLASTER, felt = o.felt ?? FELT;
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.1, 22);
  // Plinth of rubble stone, snow drifted against it.
  g.fillStyle(SLATE, 1); g.fillRect(x0 - 2, y - 10, w + 4, 10);
  // Wall and timber frame.
  g.fillStyle(dim(wall, 0.12), 1); g.fillRect(x0, top, w, h - 10);
  g.fillStyle(wall, 1); g.fillRect(x0 + 3, top + 3, w - 6, h - 16);
  g.lineStyle(4, TIMBER_DARK, 1);
  g.strokeRect(x0 + 1, top + 1, w - 2, h - 12);
  g.lineBetween(x0, top + (h - 10) * 0.5, x0 + w, top + (h - 10) * 0.5);
  const posts = Math.max(2, Math.round(w / 46));
  for (let i = 1; i < posts; i++) {
    const px = x0 + (i * w) / posts;
    g.lineBetween(px, top, px, y - 10);
    if (i % 2) g.lineBetween(px - w / posts, top + (h - 10) * 0.5, px, top); else g.lineBetween(px, top + (h - 10) * 0.5, px - w / posts, top);
  }
  // Windows with quilted shutters, one each side of the door.
  const winY = top + (h - 10) * 0.26;
  for (const wx of [x0 + w * 0.2, x0 + w * 0.8]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 11, winY - 1, 22, 20);
    g.fillStyle(o.lit === false ? dim(SLATE, 0.3) : LAMP, 1); g.fillRect(wx - 9, winY + 1, 18, 16);
    g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(wx, winY + 1, wx, winY + 17); g.lineBetween(wx - 9, winY + 9, wx + 9, winY + 9);
    // Shutters: buttoned felt panels, the left one half-drawn.
    for (const k of [-1, 1]) {
      const sx = wx + k * 15 - (k < 0 ? 0 : 0);
      g.fillStyle(dim(felt, 0.15), 1); g.fillRect(sx - 6, winY - 2, 12, 22);
      g.fillStyle(felt, 1); g.fillRect(sx - 5, winY - 1, 10, 20);
      g.lineStyle(1, dim(felt, 0.35), 0.8); g.lineBetween(sx - 5, winY + 6, sx + 5, winY + 6); g.lineBetween(sx - 5, winY + 13, sx + 5, winY + 13);
      g.fillStyle(FELT_OAT, 1); g.fillCircle(sx, winY + 2, 1); g.fillCircle(sx, winY + 9.5, 1); g.fillCircle(sx, winY + 16, 1);
    }
    // Snow on the sill and an icicle or two.
    g.fillStyle(SNOW_LIT, 1); g.fillRect(wx - 12, winY + 18, 24, 3);
    g.fillStyle(0xdfeefa, 0.9); g.fillTriangle(wx - 6, winY + 21, wx - 4, winY + 21, wx - 5, winY + 28);
  }
  // The door: planked, under a felt-padded hood, its knocker bound in wool.
  const dh = Math.min(40, (h - 10) * 0.55);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 12, y - 10 - dh, 24, dh);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 10, y - 8 - dh, 20, dh - 2);
  g.lineStyle(1, TIMBER_DARK, 0.8); g.lineBetween(x - 3, y - 8 - dh, x - 3, y - 10); g.lineBetween(x + 4, y - 8 - dh, x + 4, y - 10);
  g.fillStyle(IRON, 1); g.strokeCircle(x, y - 10 - dh * 0.55, 3);
  g.fillStyle(FELT_OAT, 1); g.fillCircle(x, y - 10 - dh * 0.55, 3.4);
  g.fillStyle(felt, 1); g.fillRoundedRect(x - 16, y - 14 - dh, 32, 6, 3);
  if (o.fined) {
    g.fillStyle(SILK_SHADE, 1); g.fillRect(x + 1, y - 2 - dh * 0.8, 8, 10);
    g.fillStyle(FINE_RED, 1); g.fillRect(x + 2, y - dh * 0.8, 6, 1.5); g.fillCircle(x + 5, y + 5 - dh * 0.8, 1.6);
  }
  if (o.ribbon) {
    g.fillStyle(SILK, 1); g.fillCircle(x + 7, y - 10 - dh * 0.4, 2);
    g.lineStyle(2.4, SILK, 1); g.lineBetween(x + 7, y - 10 - dh * 0.4, x + 9, y - 2 - dh * 0.3); g.lineBetween(x + 7, y - 10 - dh * 0.4, x + 4, y - dh * 0.3);
  }
  g.fillStyle(SNOW_LIT, 0.9); g.fillEllipse(x, y - 8, 30, 4);
  // The felted roof: a low quilted hip, rows of stitched pads.
  const roofH = h * 0.62;
  const rx0 = x0 - 14, rx1 = x0 + w + 14, rTop = top - roofH;
  g.fillStyle(dim(felt, 0.3), 1); g.fillTriangle(rx0, top + 4, rx1, top + 4, x, rTop);
  g.fillStyle(felt, 1); g.fillTriangle(rx0 + 4, top, rx1 - 4, top, x, rTop + 4);
  const rows = 4;
  for (let r = 1; r <= rows; r++) {
    const k = r / (rows + 1);
    const yy = top - roofH * k, half = ((rx1 - rx0) / 2) * (1 - k);
    g.lineStyle(1.5, dim(felt, 0.28), 0.9); g.lineBetween(x - half, yy, x + half, yy);
    // Quilting: little diagonal stitches and buttons along each row.
    for (let sx = x - half + 8; sx < x + half - 4; sx += 14) {
      g.lineStyle(1, FELT_OAT, 0.5); g.lineBetween(sx, yy - 2, sx + 4, yy + 2);
      if ((sx | 0) % 28 < 14) { g.fillStyle(dim(felt, 0.4), 1); g.fillCircle(sx + 7, yy - roofH / (rows + 1) / 2, 1.3); }
    }
  }
  // The eave roll: a fat sausage of felt along the drip line.
  g.fillStyle(dim(felt, 0.2), 1); g.fillRoundedRect(rx0 - 2, top - 2, rx1 - rx0 + 4, 10, 5);
  g.fillStyle(lit(felt, 0.1), 1); g.fillRoundedRect(rx0, top - 3, rx1 - rx0, 6, 3);
  // Chimney: plaster, felt-capped so the wind cannot moan in it.
  if (o.chimney !== false) {
    const cxm = x + w * 0.24, cyb = top - roofH * 0.35;
    g.fillStyle(PLASTER_DARK, 1); g.fillRect(cxm - 7, cyb - 30, 14, 30);
    g.fillStyle(felt, 1); g.fillRoundedRect(cxm - 10, cyb - 36, 20, 8, 3);
    g.fillStyle(SNOW_LIT, 1); g.fillEllipse(cxm, cyb - 37, 20, 6);
  }
  // The snow cap, heavy and lumpy, overhanging the eaves.
  g.fillStyle(SNOW_SHADE, 1); g.fillTriangle(rx0 + 10, top - 6, rx1 - 10, top - 6, x, rTop - 6);
  for (let i = 0; i < 9; i++) {
    const k = i / 8;
    const sx = rx0 + 12 + k * (rx1 - rx0 - 24), sy = top - 8 - (1 - Math.abs(k - 0.5) * 2) * roofH * 0.9;
    g.fillStyle(SNOW, 1); g.fillCircle(sx, sy, 10 + rng() * 6);
  }
  g.fillStyle(SNOW_LIT, 0.95); g.fillEllipse(x - w * 0.1, rTop + roofH * 0.25, w * 0.4, roofH * 0.2);
  for (let i = 0; i < 6; i++) {
    const sx = rx0 + 8 + ((i + rng()) / 6) * (rx1 - rx0 - 16);
    g.fillStyle(0xdfeefa, 0.85); g.fillTriangle(sx - 2, top + 7, sx + 2, top + 7, sx, top + 13 + rng() * 9);
  }
  if (o.sign) {
    g.lineStyle(2, IRON, 1); g.lineBetween(x0 + w - 6, top + 10, x0 + w + 16, top + 10);
    o.sign(g, x0 + w + 12, top + 24);
  }
}

/** A cobbler's sign: a felt-soled boot hung on a bracket. */
export function bootSign(g: G, x: number, y: number): void {
  g.lineStyle(1.2, IRON, 1); g.lineBetween(x - 4, y - 14, x - 4, y - 8); g.lineBetween(x + 4, y - 14, x + 4, y - 8);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 6, y - 8, 10, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - 6, y + 2, 18, 7, 3);
  g.fillStyle(FELT_OAT, 1); g.fillRect(x - 6, y + 7, 18, 3);
}

/** A felter's sign: a rolled bolt of felt. */
export function boltSign(g: G, x: number, y: number): void {
  g.lineStyle(1.2, IRON, 1); g.lineBetween(x - 6, y - 14, x - 6, y - 6); g.lineBetween(x + 6, y - 14, x + 6, y - 6);
  g.fillStyle(FELT_PLUM, 1); g.fillRoundedRect(x - 12, y - 7, 24, 12, 6);
  g.fillStyle(FELT_PLUM_DARK, 1); g.fillEllipse(x + 11, y - 1, 6, 12);
  g.lineStyle(1, FELT_OAT, 0.7); g.strokeEllipse(x + 11, y - 1, 3, 7);
}

/**
 * The Hush Bell: a great bronze bell in a timber frame on the green, its mouth open and empty —
 * the clapper was drawn when the Maestro came and the hook hangs bare inside. A band of letters
 * round its waist (HE THAT HATH EARS), green weeping down from every ledge the snow sits on, a
 * felt-bound bell rope coiled on a peg, and snow along the headstock.
 */
export function hushBell(g: G, x: number, y: number, s = 1): void {
  const W = 170 * s, Hh = 200 * s;
  shadow(g, x, y + 4, W * 1.1, 30 * s);
  // Sill beams and the A-frame legs.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - W / 2 - 10 * s, y - 12 * s, W + 20 * s, 12 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - W / 2 - 10 * s, y - 14 * s, W + 20 * s, 4 * s);
  for (const k of [-1, 1]) {
    const fx = x + k * W / 2, tx = x + k * W * 0.36;
    g.lineStyle(14 * s, TIMBER_DARK, 1); g.lineBetween(fx, y - 12 * s, tx, y - Hh);
    g.lineStyle(9 * s, TIMBER, 1); g.lineBetween(fx, y - 12 * s, tx, y - Hh);
    g.lineStyle(7 * s, TIMBER_DARK, 1); g.lineBetween(fx - k * 40 * s, y - 12 * s, fx - k * 4 * s, y - Hh * 0.55);
    // Iron straps on the joints.
    g.fillStyle(IRON, 1); g.fillRect(tx - 7 * s, y - Hh + 4 * s, 14 * s, 8 * s);
    g.fillRect(fx - 8 * s, y - 22 * s, 16 * s, 6 * s);
  }
  // Headstock across the top, snow along it.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - W * 0.46, y - Hh - 12 * s, W * 0.92, 16 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - W * 0.46, y - Hh - 12 * s, W * 0.92, 4 * s);
  g.fillStyle(SNOW_LIT, 1); g.fillRoundedRect(x - W * 0.48, y - Hh - 19 * s, W * 0.96, 9 * s, 4 * s);
  // The bell.
  const by = y - Hh + 2 * s, bh = 112 * s, bw = 104 * s;
  const pts = [
    P(x - bw * 0.2, by + 10 * s), P(x + bw * 0.2, by + 10 * s),
    P(x + bw * 0.3, by + bh * 0.35), P(x + bw * 0.36, by + bh * 0.72),
    P(x + bw * 0.5, by + bh), P(x - bw * 0.5, by + bh),
    P(x - bw * 0.36, by + bh * 0.72), P(x - bw * 0.3, by + bh * 0.35),
  ];
  g.fillStyle(BRONZE_DARK, 1); g.fillPoints(pts.map((p) => P(p.x + 2 * s, p.y + 2 * s)), true);
  g.fillStyle(BRONZE, 1); g.fillPoints(pts, true);
  // Light down the left shoulder.
  g.fillStyle(BRONZE_LIT, 0.65);
  g.fillPoints([P(x - bw * 0.16, by + 14 * s), P(x - bw * 0.08, by + 14 * s), P(x - bw * 0.18, by + bh * 0.9), P(x - bw * 0.34, by + bh * 0.9)], true);
  // Crown and canons.
  g.fillStyle(BRONZE_DARK, 1); g.fillRoundedRect(x - bw * 0.22, by - 2 * s, bw * 0.44, 14 * s, 6 * s);
  g.lineStyle(5 * s, BRONZE_DARK, 1); g.beginPath(); g.arc(x, by - 4 * s, 10 * s, Math.PI, 0, false); g.strokePath();
  // Waist band of letters, and the sound-bow ridges.
  g.lineStyle(2 * s, BRONZE_DARK, 1); g.lineBetween(x - bw * 0.3, by + bh * 0.36, x + bw * 0.3, by + bh * 0.36);
  g.lineBetween(x - bw * 0.31, by + bh * 0.46, x + bw * 0.31, by + bh * 0.46);
  for (let i = 0; i < 9; i++) { g.fillStyle(BRONZE_DARK, 0.8); g.fillRect(x - bw * 0.26 + i * bw * 0.065, by + bh * 0.39, 3 * s, 4 * s); }
  g.lineStyle(3 * s, BRONZE_DARK, 1); g.lineBetween(x - bw * 0.44, by + bh * 0.9, x + bw * 0.44, by + bh * 0.9);
  // Verdigris weeping from the ledges.
  for (let i = 0; i < 8; i++) {
    const vx = x - bw * 0.3 + i * bw * 0.085;
    g.fillStyle(VERDI, 0.55); g.fillRect(vx, by + bh * 0.37, 2.5 * s, (10 + (i * 7) % 16) * s);
    g.fillRect(vx + 3 * s, by + bh * 0.91, 2 * s, (5 + (i * 5) % 8) * s);
  }
  // The mouth: dark inside, and the empty clapper hook hanging in it.
  g.fillStyle(0x1a1610, 1); g.fillEllipse(x, by + bh, bw * 0.98, 18 * s);
  g.fillStyle(dim(BRONZE, 0.5), 1); g.fillEllipse(x, by + bh - 2 * s, bw * 0.8, 10 * s);
  g.lineStyle(2 * s, IRON_LIT, 1); g.lineBetween(x, by + bh - 30 * s, x, by + bh - 6 * s);
  g.beginPath(); g.arc(x + 3 * s, by + bh - 6 * s, 3 * s, Math.PI, Math.PI * 0.1, true); g.strokePath();
  // Snow on the shoulders.
  g.fillStyle(SNOW_LIT, 1); g.fillEllipse(x, by + 10 * s, bw * 0.5, 7 * s);
  g.fillStyle(SNOW, 1); g.fillEllipse(x - bw * 0.22, by + bh * 0.33, bw * 0.16, 4 * s); g.fillEllipse(x + bw * 0.28, by + bh * 0.88, bw * 0.2, 4 * s);
  // The rope: felt-bound, coiled on a peg in the right leg.
  const px = x + W * 0.43, py = y - 60 * s;
  g.fillStyle(IRON, 1); g.fillRect(px - 2 * s, py - 2 * s, 8 * s, 4 * s);
  g.lineStyle(3 * s, FELT_OAT_DARK, 1); g.lineBetween(x + bw * 0.1, by + 6 * s, px, py);
  for (let i = 0; i < 3; i++) { g.lineStyle(3 * s, i % 2 ? FELT_OAT : FELT_OAT_DARK, 1); g.strokeEllipse(px + 4 * s, py + 12 * s + i * 4 * s, 16 * s, 10 * s); }
  g.fillStyle(FELT_PLUM, 1); g.fillRoundedRect(px - 2 * s, py + 26 * s, 12 * s, 16 * s, 5 * s);
}

/**
 * The Quiet House — Prince Mute's hall, where the muted are taken. A long, windowless-looking
 * front padded from eaves to plinth in quilted felt (diamond-tufted, a bronze button at every
 * crossing), tall shuttered windows sewn shut, a bell-cote on the roof with no bell in it, and a
 * railing along the front where every muted voice's ribbon is tied — hundreds, end to end.
 */
export function quietHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 8, w * 1.1, 40);
  // Plinth and steps.
  g.fillStyle(SLATE, 1); g.fillRect(x0 - 10, y - 18, w + 20, 18);
  g.fillStyle(dim(SLATE, 0.2), 1); g.fillRect(x0 - 10, y - 4, w + 20, 4);
  // The padded front: quilted diamonds in pale grey felt.
  g.fillStyle(FELT_DARK, 1); g.fillRect(x0, top, w, h - 18);
  g.fillStyle(FELT_LIT, 1); g.fillRect(x0 + 4, top + 4, w - 8, h - 26);
  const step = 26;
  for (let yy = top + 4; yy < y - 22; yy += step) {
    for (let xx = x0 + 4 + ((((yy - top) / step) | 0) % 2) * (step / 2); xx < x0 + w - 4; xx += step) {
      g.fillStyle(lit(FELT_LIT, 0.08), 1); g.fillEllipse(xx + step / 2, yy + step / 2 - 2, step * 0.8, step * 0.6);
      g.fillStyle(dim(FELT_LIT, 0.18), 0.5); g.fillEllipse(xx + step / 2, yy + step / 2 + 4, step * 0.7, step * 0.3);
      g.fillStyle(BRONZE, 1); g.fillCircle(xx, yy, 1.8);
      g.fillStyle(BRONZE_LIT, 1); g.fillCircle(xx - 0.5, yy - 0.5, 0.8);
    }
  }
  // Tall windows, sewn shut with big cross stitches.
  const nWin = Math.max(2, Math.round(w / 110));
  for (let i = 0; i < nWin; i++) {
    const wx = x0 + ((i + 0.5) * w) / nWin;
    if (Math.abs(wx - x) < 70) continue;
    g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(wx - 18, top + 24, 36, h * 0.52, { tl: 18, tr: 18, bl: 0, br: 0 });
    g.fillStyle(FELT_PLUM, 1); g.fillRoundedRect(wx - 14, top + 28, 28, h * 0.52 - 6, { tl: 14, tr: 14, bl: 0, br: 0 });
    for (let k = 0; k < 4; k++) {
      const sy = top + 46 + k * (h * 0.11);
      g.lineStyle(2.5, SILK_SHADE, 1); g.lineBetween(wx - 10, sy - 5, wx + 10, sy + 5); g.lineBetween(wx + 10, sy - 5, wx - 10, sy + 5);
    }
    g.fillStyle(SNOW_LIT, 1); g.fillRect(wx - 20, top + 24 + h * 0.52, 40, 4);
  }
  // Great double doors, padded, under a lintel carved with a closed mouth.
  const dh = h * 0.6;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 46, y - 18 - dh, 92, dh);
  for (const k of [-1, 1]) {
    g.fillStyle(FELT_PLUM_DARK, 1); g.fillRect(x + (k < 0 ? -42 : 2), y - 14 - dh, 40, dh - 4);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
      g.fillStyle(FELT_PLUM, 1); g.fillRoundedRect(x + (k < 0 ? -40 : 4) + c * 19, y - 12 - dh + r * (dh / 4.2), 17, dh / 4.6, 5);
    }
  }
  g.fillStyle(PLASTER, 1); g.fillRect(x - 54, y - 30 - dh, 108, 14);
  g.lineStyle(2, INK, 0.8); g.lineBetween(x - 14, y - 23 - dh, x + 14, y - 23 - dh);
  for (let i = -3; i <= 3; i++) { g.lineStyle(1.2, INK, 0.8); g.lineBetween(x + i * 4, y - 27 - dh, x + i * 4, y - 19 - dh); }
  // Roof: dark felt, steep, snow-laden; a bell-cote at the ridge with an empty arch.
  const roofH = h * 0.5;
  g.fillStyle(FELT_DARK, 1); g.fillTriangle(x0 - 20, top + 4, x0 + w + 20, top + 4, x, top - roofH);
  g.fillStyle(dim(FELT_DARK, 0.2), 1); g.fillRoundedRect(x0 - 22, top - 4, w + 44, 12, 6);
  for (let i = 0; i < 14; i++) {
    const k = i / 13;
    g.fillStyle(SNOW, 1); g.fillCircle(x0 - 10 + k * (w + 20), top - 6 - (1 - Math.abs(k - 0.5) * 2) * roofH * 0.92, 14 + rng() * 8);
  }
  g.fillStyle(SNOW_LIT, 1); g.fillEllipse(x - w * 0.12, top - roofH * 0.6, w * 0.4, roofH * 0.22);
  const cy = top - roofH + 10;
  g.fillStyle(PLASTER_DARK, 1); g.fillRect(x - 22, cy - 56, 44, 56);
  g.fillStyle(0x23262e, 1); g.fillRoundedRect(x - 13, cy - 48, 26, 40, { tl: 13, tr: 13, bl: 0, br: 0 });
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x, cy - 48, x, cy - 30);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 28, cy - 54, x + 28, cy - 54, x, cy - 80);
  g.fillStyle(SNOW_LIT, 1); g.fillTriangle(x - 18, cy - 62, x + 18, cy - 62, x, cy - 79);
  // The ribbon railing along the front.
  const ry = y + 10;
  g.lineStyle(3, IRON, 1); g.lineBetween(x0 - 6, ry - 22, x - 60, ry - 22); g.lineBetween(x + 60, ry - 22, x0 + w + 6, ry - 22);
  for (let xx = x0 - 6; xx <= x0 + w + 6; xx += 12) {
    if (Math.abs(xx - x) < 60) continue;
    g.lineStyle(2, IRON, 1); g.lineBetween(xx, ry - 22, xx, ry);
    g.fillStyle(IRON, 1); g.fillTriangle(xx - 2, ry - 22, xx + 2, ry - 22, xx, ry - 28);
  }
  for (let xx = x0; xx <= x0 + w; xx += 5) {
    if (Math.abs(xx - x) < 62) continue;
    g.lineStyle(1.6, rng() < 0.1 ? SILK_SHADE : SILK, 1);
    g.lineBetween(xx, ry - 21, xx + 1 + rng() * 2, ry - 10 - rng() * 6);
  }
  // Lanterns either side of the door, hooded low.
  for (const k of [-1, 1]) {
    const lx = x + k * 66, ly = y - 18 - dh * 0.55;
    glow(g, lx, ly, 26, LAMP_GLOW, 0.06, 3);
    g.fillStyle(LAMP, 1); g.fillRect(lx - 5, ly - 8, 10, 13);
    g.fillStyle(IRON, 1); g.fillTriangle(lx - 9, ly - 8, lx + 9, ly - 8, lx, ly - 18);
    g.lineStyle(1.5, IRON, 1); g.strokeRect(lx - 6, ly - 9, 12, 15);
  }
}

/**
 * The fulling mill, where wool is beaten into felt: a long open-fronted shed with a felted roof,
 * the great wooden fulling-stocks inside (two hammers on a cam shaft over a trough of steaming
 * soapy water), bolts of finished felt stacked at the side. The hammers themselves are drawn in
 * `animate` (they rise and fall without a sound — the trough is lined with felt).
 */
export function fullingMill(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.08, 26);
  g.fillStyle(SLATE, 1); g.fillRect(x0, y - 8, w, 8);
  // Back wall, dim inside.
  g.fillStyle(dim(TIMBER, 0.45), 1); g.fillRect(x0 + 4, top, w - 8, h - 8);
  for (let xx = x0 + 10; xx < x0 + w - 8; xx += 16) { g.lineStyle(1, dim(TIMBER, 0.6), 1); g.lineBetween(xx, top, xx, y - 8); }
  // The trough, lined with felt, steaming water.
  const tx = x - w * 0.12;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(tx - 70, y - 40, 140, 32);
  g.fillStyle(FELT_OAT_DARK, 1); g.fillRect(tx - 64, y - 36, 128, 8);
  g.fillStyle(0xaab8c4, 1); g.fillRect(tx - 64, y - 30, 128, 6);
  g.fillStyle(SNOW_LIT, 0.6); for (let i = 0; i < 8; i++) g.fillCircle(tx - 56 + i * 16, y - 30, 2.5);
  // The cam shaft and the stocks' frame.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(tx - 80, top + 30, 12, h - 38); g.fillRect(tx + 68, top + 30, 12, h - 38);
  g.fillStyle(TIMBER, 1); g.fillRect(tx - 84, top + 24, 168, 10);
  g.fillStyle(IRON, 1); g.fillCircle(tx - 74, top + 50, 6); g.fillCircle(tx + 74, top + 50, 6);
  // Finished felt bolts stacked by the far post.
  for (let i = 0; i < 6; i++) {
    const bx = x0 + w - 60 + (i % 2) * 22, byy = y - 14 - Math.floor(i / 2) * 16;
    const c = FELT_COLORS[(i + 1) % FELT_COLORS.length];
    g.fillStyle(dim(c, 0.2), 1); g.fillRoundedRect(bx - 12, byy - 8, 26, 16, 7);
    g.fillStyle(c, 1); g.fillRoundedRect(bx - 12, byy - 9, 24, 15, 7);
    g.lineStyle(1, lit(c, 0.3), 0.8); g.strokeEllipse(bx + 10, byy - 2, 4, 12);
  }
  // Front posts and the felted roof.
  for (const px of [x0 + 4, x0 + w / 2, x0 + w - 4]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 5, top, 10, h - 8); g.fillStyle(TIMBER_LIT, 1); g.fillRect(px - 5, top, 3, h - 8); }
  g.fillStyle(FELT_DARK, 1); g.fillPoints([P(x0 - 18, top + 6), P(x0 + w + 18, top + 6), P(x0 + w - 10, top - 46), P(x0 + 10, top - 46)], true);
  for (let r = 0; r < 3; r++) { g.lineStyle(1.5, dim(FELT_DARK, 0.3), 1); g.lineBetween(x0 - 10 + r * 6, top - 8 - r * 13, x0 + w + 10 - r * 6, top - 8 - r * 13); }
  g.fillStyle(SNOW, 1);
  for (let i = 0; i < 10; i++) g.fillCircle(x0 + 6 + (i / 9) * (w - 12), top - 44 + rng() * 6, 10 + rng() * 5);
  g.fillStyle(SNOW_LIT, 1); g.fillRect(x0 + 2, top - 52, w - 4, 8);
  g.fillStyle(dim(FELT_DARK, 0.2), 1); g.fillRoundedRect(x0 - 20, top + 2, w + 40, 9, 4);
  // A steam vent out of the roof.
  g.fillStyle(IRON, 1); g.fillRect(x - w * 0.12 - 6, top - 70, 12, 26);
}

/** One fulling hammer at its lift (0 down in the trough, 1 at the top of its stroke). */
export function millHammer(g: G, x: number, y: number, lift: number): void {
  const hy = y - 44 - lift * 38;
  g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(x - 40, y - 96, x, hy - 8);
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(x - 14, hy - 14, 30, 26, 4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 14, hy + 6, 30, 6);
  g.fillStyle(FELT_OAT, 1); g.fillRect(x - 13, hy + 10, 28, 3);
  if (lift < 0.1) { g.fillStyle(SNOW_LIT, 0.6); g.fillEllipse(x + 1, y - 30, 40, 6); }
}

/** A drying rack of felt sheets — colours hung like washing, snow on the top rail. */
export function feltRack(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 2, w, 10);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + (k * w) / 2 - 3, y - 70, 6, 70); }
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 - 4, y - 72, w + 8, 5);
  const n = Math.max(2, Math.round(w / 28));
  for (let i = 0; i < n; i++) {
    const c = FELT_COLORS[(i * 2 + Math.floor(rng() * 3)) % FELT_COLORS.length];
    const sx = x - w / 2 + 4 + (i * (w - 8)) / n, sw = (w - 8) / n - 3, sh = 34 + rng() * 18;
    g.fillStyle(dim(c, 0.2), 1); g.fillRect(sx + 1, y - 67, sw, sh + 1);
    g.fillStyle(c, 1); g.fillRect(sx, y - 67, sw, sh);
    g.fillStyle(lit(c, 0.18), 0.6); g.fillRect(sx, y - 67, 2, sh);
    g.fillStyle(IRON, 1); g.fillRect(sx + sw / 2 - 1.5, y - 69, 3, 4);
  }
  g.fillStyle(SNOW_LIT, 1); g.fillEllipse(x, y - 74, w + 10, 5);
}

/** A snow-laden fir. */
export function snowPine(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 44 * s, 12 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3 * s, y - 14 * s, 6 * s, 14 * s);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers;
    const tw = (46 - k * 30) * s, ty = y - 10 * s - k * 70 * s, th = 32 * s;
    g.fillStyle(0x24382e, 1); g.fillTriangle(x - tw / 2, ty, x + tw / 2, ty, x, ty - th);
    g.fillStyle(0x345244, 1); g.fillTriangle(x - tw / 2 + 4 * s, ty - 2 * s, x, ty - 2 * s, x, ty - th + 2 * s);
    // Snow heaped on each tier's skirt.
    g.fillStyle(SNOW, 1); g.fillEllipse(x - tw * 0.18, ty - 3 * s, tw * 0.5, 7 * s);
    g.fillStyle(SNOW_LIT, 1); g.fillEllipse(x + tw * 0.18 + (rng() - 0.5) * 4, ty - 4 * s, tw * 0.36, 5 * s);
  }
  g.fillStyle(SNOW_LIT, 1); g.fillCircle(x, y - 10 * s - 70 * s - 28 * s, 4 * s);
}

/**
 * Fleece's felt stall: a covered market barrow under a quilted awning, with muffs and earmuffs
 * hung from the frame, mufflers draped over the counter and a pyramid of felt balls in a basket.
 */
export function feltStall(g: G, x: number, y: number, rng: () => number): void {
  const w = 150;
  shadow(g, x, y + 4, w * 1.1, 18);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - 44, w, 40);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 3, y - 42, w - 6, 34);
  // Mufflers draped over the counter.
  for (let i = 0; i < 5; i++) {
    const c = FELT_COLORS[i % FELT_COLORS.length];
    const mx = x - w / 2 + 16 + i * 28;
    g.fillStyle(c, 1); g.fillRect(mx - 9, y - 46, 18, 30);
    g.fillStyle(dim(c, 0.2), 1); for (let f = 0; f < 4; f++) g.fillRect(mx - 8 + f * 5, y - 16, 2, 6);
    g.lineStyle(1, lit(c, 0.3), 0.6); g.lineBetween(mx - 9, y - 38, mx + 9, y - 38); g.lineBetween(mx - 9, y - 30, mx + 9, y - 30);
  }
  // Posts and the quilted awning.
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + (k * w) / 2 - 4, y - 116, 6, 116); }
  for (let i = 0; i < 6; i++) {
    const sx = x - w / 2 - 10 + i * ((w + 20) / 6), sw = (w + 20) / 6;
    g.fillStyle(i % 2 ? FELT_PLUM : FELT_OAT, 1); g.fillRect(sx, y - 128, sw, 22);
    g.fillStyle(i % 2 ? FELT_PLUM : FELT_OAT, 1); g.fillCircle(sx + sw / 2, y - 106, sw / 2);
    g.fillStyle(BRONZE, 1); g.fillCircle(sx + sw / 2, y - 118, 1.5);
  }
  g.fillStyle(SNOW_LIT, 1); g.fillRoundedRect(x - w / 2 - 12, y - 134, w + 24, 9, 4);
  // Earmuffs and muffs hung from the awning rail.
  for (let i = 0; i < 4; i++) {
    const hx = x - w / 2 + 22 + i * 36, hy = y - 92 + (i % 2) * 6;
    g.lineStyle(1, IRON, 1); g.lineBetween(hx, y - 106, hx, hy - 8);
    if (i % 2) {
      g.lineStyle(2.5, FELT_DARK, 1); g.beginPath(); g.arc(hx, hy, 8, Math.PI, 0, false); g.strokePath();
      g.fillStyle(FELT_COLORS[(i + 2) % 5], 1); g.fillCircle(hx - 8, hy + 2, 5); g.fillCircle(hx + 8, hy + 2, 5);
    } else {
      g.fillStyle(FELT_COLORS[(i + 1) % 5], 1); g.fillRoundedRect(hx - 9, hy - 6, 18, 14, 7);
      g.fillStyle(dim(FELT_COLORS[(i + 1) % 5], 0.4), 1); g.fillEllipse(hx, hy + 1, 7, 9);
    }
  }
  // A basket of felt balls.
  g.fillStyle(TIMBER_LIT, 1); g.fillRoundedRect(x + w / 2 - 34, y - 22, 30, 18, 4);
  for (let i = 0; i < 6; i++) { g.fillStyle(FELT_COLORS[(i + Math.floor(rng() * 5)) % 5], 1); g.fillCircle(x + w / 2 - 28 + (i % 3) * 9, y - 24 - Math.floor(i / 3) * 7, 5); }
}

/**
 * The Quiet Table: the soup kitchen for the muted, who cannot pay fines and so cannot pay for
 * anything. A long trestle under a felt canopy, bowls set out, a copper soup pot steaming on a
 * brazier, and a slate where the day's soup is drawn rather than written.
 */
export function quietTable(g: G, x: number, y: number, rng: () => number): void {
  const w = 220;
  shadow(g, x, y + 4, w * 1.05, 18);
  // Canopy posts and felt.
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + (k * w) / 2 - 3, y - 104, 6, 104); }
  g.fillStyle(FELT_MOSS, 1); g.fillPoints([P(x - w / 2 - 14, y - 96), P(x + w / 2 + 14, y - 96), P(x + w / 2, y - 124), P(x - w / 2, y - 124)], true);
  for (let i = 0; i < 9; i++) { g.fillStyle(dim(FELT_MOSS, 0.2), 1); g.fillTriangle(x - w / 2 - 14 + i * ((w + 28) / 9), y - 96, x - w / 2 - 14 + (i + 1) * ((w + 28) / 9), y - 96, x - w / 2 - 14 + (i + 0.5) * ((w + 28) / 9), y - 88); }
  g.fillStyle(SNOW_LIT, 1); g.fillRoundedRect(x - w / 2, y - 130, w, 8, 4);
  // Trestle and benches.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 10, y - 34, w - 20, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w / 2 + 10, y - 36, w - 20, 4);
  for (const lx of [x - w / 2 + 20, x + w / 2 - 20]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(lx - 3, y - 28, 6, 26); }
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 6, y - 10, w - 12, 5);
  // Bowls, each with a spoon wrapped in a twist of cloth so it will not clink.
  for (let i = 0; i < 7; i++) {
    const bx = x - w / 2 + 26 + i * 26;
    g.fillStyle(PLASTER, 1); g.fillEllipse(bx, y - 38, 14, 6);
    g.fillStyle(0xc89a5a, 1); g.fillEllipse(bx, y - 39, 10, 3);
    g.lineStyle(1.5, SILK_SHADE, 1); g.lineBetween(bx + 6, y - 40, bx + 10, y - 46);
  }
  // The brazier and copper pot at the end.
  const px = x + w / 2 + 34;
  g.fillStyle(IRON, 1); g.fillRect(px - 14, y - 22, 28, 20);
  g.fillStyle(LAMP_DEEP, 1); g.fillRect(px - 10, y - 26, 20, 5);
  glow(g, px, y - 22, 18, LAMP_GLOW, 0.06, 3);
  g.fillStyle(0xa8643a, 1); g.fillRoundedRect(px - 16, y - 50, 32, 26, 8);
  g.fillStyle(0xd08a5a, 1); g.fillRect(px - 12, y - 48, 4, 20);
  g.fillStyle(0x6a3a1a, 1); g.fillEllipse(px, y - 50, 30, 6);
  // The slate: a bowl and a fish drawn in chalk.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 34, y - 64, 30, 40);
  g.fillStyle(0x30343a, 1); g.fillRect(x - w / 2 - 32, y - 62, 26, 30);
  g.lineStyle(1.2, SNOW_LIT, 0.9);
  g.beginPath(); g.arc(x - w / 2 - 19, y - 46, 7, 0, Math.PI, false); g.strokePath();
  g.strokeEllipse(x - w / 2 - 19, y - 54, 10, 4);
  g.lineBetween(x - w / 2 - 11, y - 54, x - w / 2 - 8, y - 50 + rng());
}

/** A fine box on a post: an iron slot box with FINES in red, for coins paid on the spot. */
export function fineBox(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 22, 6);
  g.fillStyle(IRON, 1); g.fillRect(x - 2, y - 40, 4, 40);
  g.fillStyle(IRON, 1); g.fillRoundedRect(x - 11, y - 60, 22, 22, 3);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 9, y - 58, 18, 2);
  g.fillStyle(0x000000, 1); g.fillRect(x - 6, y - 54, 12, 2);
  g.fillStyle(FINE_RED, 1); g.fillRect(x - 8, y - 48, 16, 5);
  g.fillStyle(SNOW_LIT, 1); g.fillEllipse(x, y - 61, 24, 4);
}

/** The Hush waystone: a squat grey stone with a cupped hand carved in it, capped with snow. */
export function hushWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 44, 12);
  g.fillStyle(dim(SLATE, 0.2), 1); g.fillRoundedRect(x - 18, y - 56, 36, 56, 8);
  g.fillStyle(SLATE, 1); g.fillRoundedRect(x - 16, y - 54, 30, 52, 7);
  g.fillStyle(lit(SLATE, 0.15), 1); g.fillRect(x - 14, y - 50, 4, 44);
  handShape(g, x, y - 30, 0.62, 'bell', lit(HUSH, 0.3), 0.9);
  g.fillStyle(SNOW_LIT, 1); g.fillEllipse(x, y - 55, 38, 10);
  g.fillStyle(SNOW, 1); g.fillEllipse(x + 6, y - 58, 20, 6);
}

/** A brass listening-trumpet poking out of the eaves, its bell turned to the street. */
export function listeningTrumpet(g: G, x: number, y: number, dir: number): void {
  g.lineStyle(3, BRONZE_DARK, 1); g.lineBetween(x, y, x + dir * 14, y + 8);
  g.lineStyle(2, BRONZE, 1); g.lineBetween(x, y, x + dir * 14, y + 8);
  g.fillStyle(BRONZE, 1); g.fillTriangle(x + dir * 12, y + 4, x + dir * 12, y + 14, x + dir * 22, y + 13);
  g.fillStyle(dim(BRONZE, 0.5), 1); g.fillEllipse(x + dir * 21, y + 12, 4, 8);
}

/**
 * The Sign School: a low hall where children learn the four shapes — big hand-shape banners on
 * its front, a slate porch, a snowman in the yard with mittens for hands making the HUSH sign.
 */
export function signSchool(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  feltHouse(g, x, y, w, h, { wall: PLASTER, felt: FELT_BLUE, chimney: true }, rng);
  const shapes: ('palm' | 'fist' | 'point' | 'bell')[] = ['palm', 'fist', 'point', 'bell'];
  for (let i = 0; i < 4; i++) {
    const bx = x - w / 2 + 16 + (i + 0.5) * ((w - 32) / 4);
    if (Math.abs(bx - x) < 22) continue;
    g.fillStyle(SILK, 1); g.fillRect(bx - 11, y - h + 6, 22, 30);
    g.fillStyle(SILK, 1); g.fillTriangle(bx - 11, y - h + 36, bx + 11, y - h + 36, bx, y - h + 42);
    handShape(g, bx, y - h + 22, 0.5, shapes[i], [0x5a86c8, 0xb85a4a, 0xd8b04a, 0x8a6ab8][i]);
  }
}

/** A snowman making the HUSH sign with his mittens — the Sign School's yard. */
export function snowman(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 34, 9);
  g.fillStyle(SNOW_SHADE, 1); g.fillCircle(x + 1, y - 13, 15);
  g.fillStyle(SNOW, 1); g.fillCircle(x, y - 14, 14);
  g.fillStyle(SNOW_SHADE, 1); g.fillCircle(x + 1, y - 35, 11);
  g.fillStyle(SNOW, 1); g.fillCircle(x, y - 36, 10);
  g.fillStyle(SNOW, 1); g.fillCircle(x, y - 52, 8);
  g.fillStyle(INK, 1); g.fillCircle(x - 3, y - 54, 1.2); g.fillCircle(x + 3, y - 54, 1.2);
  g.fillStyle(0xe07a2a, 1); g.fillTriangle(x, y - 52, x, y - 50, x + 7, y - 51);
  // A white ribbon at his throat, and mittens raised to his mouth.
  g.fillStyle(SILK, 1); g.fillRect(x - 6, y - 46, 12, 3);
  g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(x - 8, y - 38, x - 4, y - 48);
  g.fillStyle(FINE_RED, 1); g.fillCircle(x - 3, y - 49, 3);
  g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(x + 9, y - 36, x + 18, y - 44);
  g.fillStyle(FINE_RED, 1); g.fillCircle(x + 19, y - 45, 3);
  g.fillStyle(FELT_DARK, 1); g.fillRoundedRect(x - 9, y - 66, 18, 8, 3);
  g.fillStyle(FELT_PLUM, 1); g.fillCircle(x - 9, y - 60, 3.5); g.fillCircle(x + 9, y - 60, 3.5);
}

/** A warden's sentry box: a narrow padded hut with a hooded lantern and a fine box beside it. */
export function sentryBox(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 10);
  g.fillStyle(WARDEN, 1); g.fillRect(x - 16, y - 70, 32, 70);
  g.fillStyle(dim(WARDEN, 0.3), 1); g.fillRect(x - 11, y - 60, 22, 58);
  g.fillStyle(FELT_DARK, 1); g.fillRect(x - 10, y - 58, 20, 56);
  for (let r = 0; r < 4; r++) { g.fillStyle(FELT, 1); g.fillRoundedRect(x - 9, y - 57 + r * 14, 18, 12, 4); }
  g.fillStyle(WARDEN, 1); g.fillTriangle(x - 22, y - 70, x + 22, y - 70, x, y - 92);
  g.fillStyle(SNOW_LIT, 1); g.fillTriangle(x - 14, y - 76, x + 14, y - 76, x, y - 90);
  g.fillStyle(LAMP, 1); g.fillRect(x - 3, y - 84, 6, 6);
}

/** A ripple on the still mere — rare, slow, the only movement on it. */
export function mereRing(g: G, x: number, y: number, k: number): void {
  g.lineStyle(1.2, MERE_LIT, 0.55 * (1 - k)); g.strokeEllipse(x, y, 6 + k * 70, 2 + k * 22);
  g.lineStyle(1, SNOW_LIT, 0.25 * (1 - k)); g.strokeEllipse(x, y, 3 + k * 46, 1 + k * 14);
}

/** The still reflection of a lit window on the mere: a long, unbroken stripe. */
export function mereLamp(g: G, x: number, y: number, t: number, seed: number): void {
  const k = 0.7 + Math.sin(t * 0.7 + seed) * 0.1;
  g.fillStyle(LAMP_GLOW, 0.22 * k); g.fillRect(x - 2, y, 4, 34);
  g.fillStyle(LAMP, 0.18 * k); g.fillRect(x - 1, y + 2, 2, 22);
}

/** The prince's mark: a closed mouth stitched shut, inside a ring. Painted over doors and gates. */
export function stitchedMouth(g: G, x: number, y: number, r: number, color = INK, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.12), color, a); g.strokeCircle(x, y, r);
  g.lineStyle(Math.max(1.5, r * 0.14), color, a);
  g.beginPath(); g.arc(x, y - r * 0.15, r * 0.6, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
  for (let i = -2; i <= 2; i++) {
    const sx = x + i * r * 0.18;
    g.lineStyle(Math.max(1, r * 0.08), color, a); g.lineBetween(sx, y + r * 0.18, sx, y + r * 0.46);
  }
}

/** Fluttering ribbons along the Quiet House railing — every one a voice in the Organ. */
export function ribbonRow(g: G, x0: number, x1: number, y: number, t: number, seed: number): void {
  for (let x = x0; x < x1; x += 22) {
    ribbon(g, x, y, 14, t, seed + x * 0.03, SILK, 0.9, 0.6 + Math.sin(t * 0.5 + x * 0.01) * 0.4);
  }
}

/** A felt baffle standing on its frame (the floor of Batting's fight reuses the shape). */
export function baffle(g: G, x: number, y: number, len: number, ang: number, color: number, a = 1): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const hx = (c * len) / 2, hy = (s * len) / 2;
  const nx = -s * 9, ny = c * 9;
  g.fillStyle(dim(color, 0.35), a);
  g.fillPoints([P(x - hx + nx, y - hy + ny + 3), P(x + hx + nx, y + hy + ny + 3), P(x + hx - nx, y + hy - ny + 3), P(x - hx - nx, y - hy - ny + 3)], true);
  g.fillStyle(color, a);
  g.fillPoints([P(x - hx + nx, y - hy + ny), P(x + hx + nx, y + hy + ny), P(x + hx - nx, y + hy - ny), P(x - hx - nx, y - hy - ny)], true);
  // Quilting lines across it and buttons down the middle.
  const n = Math.max(2, Math.round(len / 18));
  for (let i = 1; i < n; i++) {
    const k = i / n - 0.5;
    const px = x + c * len * k, py = y + s * len * k;
    g.lineStyle(1.2, dim(color, 0.3), a * 0.9); g.lineBetween(px + nx, py + ny, px - nx, py - ny);
    g.fillStyle(FELT_OAT, a); g.fillCircle(px, py, 1.6);
  }
  g.lineStyle(1.5, lit(color, 0.25), a * 0.8); g.lineBetween(x - hx + nx, y - hy + ny, x + hx + nx, y + hy + ny);
}


