import type { G } from '../../../../art/IsleArt';
import { OBS, councilMask, crackPath, lit, mixC, seam, shard, slab, starGlow } from '../../../../art/PinnacleArt';
import { glow, mulberry, shadow } from '../../../../art/IsleArt';

/**
 * The Noon Bench's own drawings. The tenth bench sits right under the throne hall, where the
 * King's shell is thinnest, so this is the one room on the spire where the star's warm gold
 * actually reaches the floor: it pours through the Ceiling Seam, lies in pools on the black glass
 * and burns in every mirror. Gold here is never paint — it is always light, coming through.
 *
 * Every drawing takes `x, y` as its base / feet point (or centre, where it says so).
 */

/** The bench's one extra family of colour: Solmara's noon — gold, white-gold and brass. */
export const NOON = {
  /** The bench colour: the pale gold of a sun that will not set. */
  gold: 0xfff2b0,
  /** A sunbeam's body. */
  beam: 0xfff6dc,
  /** Starlight proper (from the shell). */
  star: OBS.star,
  starCore: OBS.starCore,
  starDeep: OBS.starDeep,
  /** Brass fittings: the meridian strip, the ticket-punch, mirror screws. */
  brass: 0xd0a85a,
  brassDark: 0x6a4e22,
  /** A bleached Clear, seen through. */
  clear: 0xe8eef4,
} as const;

type Pt = { x: number; y: number };

// ── Light ─────────────────────────────────────────────────────────────

/**
 * A god-ray: a soft trapezoid of light from (x0, y0) — `w0` wide — to (x1, y1) — `w1` wide —
 * built of five widening passes so the edges feather, with a hot thin core.
 */
export function sunShaft(g: G, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, a = 1, color: number = NOON.beam): void {
  for (let i = 4; i >= 0; i--) {
    const k = 1 + i * 0.32;
    g.fillStyle(color, 0.028 * a * (5 - i));
    g.fillPoints([
      { x: x0 - (w0 * k) / 2, y: y0 }, { x: x0 + (w0 * k) / 2, y: y0 },
      { x: x1 + (w1 * k) / 2, y: y1 }, { x: x1 - (w1 * k) / 2, y: y1 },
    ], true);
  }
  g.fillStyle(NOON.starCore, 0.07 * a);
  g.fillPoints([
    { x: x0 - w0 * 0.08, y: y0 }, { x: x0 + w0 * 0.08, y: y0 },
    { x: x1 + w1 * 0.06, y: y1 }, { x: x1 - w1 * 0.06, y: y1 },
  ], true);
}

/** Light lying on the floor where a shaft lands: layered warm ellipses, hot in the middle. */
export function lightPool(g: G, x: number, y: number, rx: number, ry: number, a = 1): void {
  for (let i = 5; i >= 1; i--) {
    g.fillStyle(i > 3 ? NOON.starDeep : NOON.gold, 0.035 * a);
    g.fillEllipse(x, y, rx * 2 * (0.4 + i * 0.16), ry * 2 * (0.4 + i * 0.16));
  }
  g.fillStyle(NOON.starCore, 0.08 * a);
  g.fillEllipse(x, y, rx * 0.6, ry * 0.6);
}

/**
 * The image of a crack thrown on the floor by the star above it: a branching gold line, soft
 * and wide, the way light through a slit lands. Seeded by `seed` so it holds still.
 */
export function crackCaustic(g: G, x: number, y: number, len: number, seed: number, a = 1, angle = Math.PI / 2): void {
  const rng = mulberry(seed);
  const b = { x: x + Math.cos(angle) * len, y: y + Math.sin(angle) * len * 0.55 };
  const main = crackPath({ x, y }, b, rng, len * 0.08, 7);
  seam(g, main, 2.4, 0.55 * a, 0.3, NOON.star);
  // Two or three branches off the main run.
  for (let i = 1; i < main.length - 1; i += 2) {
    if (rng() < 0.35) continue;
    const p = main[i];
    const ba = angle + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.7);
    const bl = len * (0.18 + rng() * 0.22);
    seam(g, crackPath(p, { x: p.x + Math.cos(ba) * bl, y: p.y + Math.sin(ba) * bl * 0.55 }, rng, bl * 0.12, 3), 1.3, 0.45 * a, 0.2, NOON.star);
  }
}

// ── The room ──────────────────────────────────────────────────────────

/**
 * A tall obsidian mirror on the wall: `x` centre, `y` base. A lancet frame of black glass,
 * a pane that holds the room's gold (diagonal streaks of reflected light, one bright star-glint),
 * screw-heads of brass, and a thin violet crack in some. `side` -1 hangs on the west wall
 * (the pane faces east), 1 on the east. `cracked` 0–1.
 */
export function wallMirror(g: G, x: number, y: number, w: number, h: number, side: -1 | 1, cracked: number, seed: number): void {
  const rng = mulberry(seed);
  shadow(g, x, y, w * 1.2, 10, 0.4);
  // The frame: a dressed obsidian slab with a pointed head.
  const l = x - w / 2, r = x + w / 2, top = y - h, apex = top - w * 0.55;
  g.fillStyle(OBS.glass, 1);
  g.fillPoints([{ x: l, y }, { x: l, y: top }, { x, y: apex }, { x: r, y: top }, { x: r, y }], true);
  g.fillStyle(OBS.facet, 1);
  g.fillPoints(side < 0
    ? [{ x: r - w * 0.14, y }, { x: r - w * 0.14, y: top + 4 }, { x, y: apex + 6 }, { x: r, y: top }, { x: r, y }]
    : [{ x: l, y }, { x: l, y: top }, { x, y: apex + 6 }, { x: l + w * 0.14, y: top + 4 }, { x: l + w * 0.14, y }], true);
  g.lineStyle(1.4, OBS.edge, 0.7);
  g.strokePoints([{ x: l, y }, { x: l, y: top }, { x, y: apex }, { x: r, y: top }, { x: r, y }], false);
  // The pane, inset: polished to a near-black that holds the gold.
  const pl = l + w * 0.16, pr = r - w * 0.16, pt = top + 6, pb = y - 10, papex = apex + w * 0.32;
  g.fillStyle(0x16121f, 1);
  g.fillPoints([{ x: pl, y: pb }, { x: pl, y: pt }, { x, y: papex }, { x: pr, y: pt }, { x: pr, y: pb }], true);
  // Reflected light: three diagonal streaks of gold, falling the way the Seam's light falls.
  for (let i = 0; i < 3; i++) {
    const sy = pt + 10 + i * (pb - pt) * 0.26 + rng() * 10;
    const sw = 6 + rng() * 10;
    g.fillStyle(i === 1 ? NOON.gold : NOON.star, 0.1 + rng() * 0.12);
    g.fillPoints([{ x: pl, y: sy }, { x: pl, y: sy + sw }, { x: pr, y: sy + sw - 24 * side }, { x: pr, y: sy - 24 * side }], true);
  }
  // The reflected room: a far gold window (the Seam) and the dark mouths of the seats.
  g.fillStyle(NOON.gold, 0.22); g.fillEllipse(x, pt + (pb - pt) * 0.3, (pr - pl) * 0.5, 9);
  g.fillStyle(NOON.starCore, 0.5); g.fillEllipse(x, pt + (pb - pt) * 0.3, (pr - pl) * 0.18, 3);
  for (let i = 0; i < 3; i++) { g.fillStyle(OBS.glass, 0.7); g.fillRect(pl + 4 + i * ((pr - pl - 8) / 3), pb - 18, (pr - pl - 20) / 3, 14); }
  g.lineStyle(1, OBS.edge, 0.35);
  g.strokePoints([{ x: pl, y: pb }, { x: pl, y: pt }, { x, y: papex }, { x: pr, y: pt }, { x: pr, y: pb }], true);
  // A star-glint high on the pane.
  const gx = x + side * -6, gy = pt + 14;
  g.fillStyle(NOON.starCore, 0.9); g.fillCircle(gx, gy, 2);
  g.lineStyle(1, NOON.starCore, 0.6); g.lineBetween(gx - 7, gy, gx + 7, gy); g.lineBetween(gx, gy - 7, gx, gy + 7);
  // Brass screw-heads at the frame's corners.
  for (const [sx, sy] of [[l + 5, y - 6], [r - 5, y - 6], [l + 5, top + 6], [r - 5, top + 6]] as [number, number][]) {
    g.fillStyle(NOON.brassDark, 1); g.fillCircle(sx, sy, 2.6);
    g.fillStyle(NOON.brass, 1); g.fillCircle(sx - 0.5, sy - 0.5, 1.6);
  }
  if (cracked > 0) {
    const a = { x: pl + (pr - pl) * rng(), y: pt + 8 };
    seam(g, crackPath(a, { x: pl + (pr - pl) * rng(), y: pb - 4 }, rng, 6, 5), 1, 0.7 * cracked, 0.2);
  }
}

/** One of the six seats' inlaid emblems — what clause that seat drafted — in gold light. */
export type Emblem = 'sun' | 'scales' | 'lantern' | 'sigil' | 'compass' | 'brush';

export function emblem(g: G, kind: Emblem, x: number, y: number, r: number, a = 1, color: number = NOON.gold): void {
  g.lineStyle(Math.max(1, r * 0.12), color, a);
  switch (kind) {
    case 'sun': {
      g.fillStyle(color, a); g.fillCircle(x, y, r * 0.42);
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * Math.PI * 2;
        const r1 = r * 0.56, r2 = r * (i % 2 ? 0.82 : 1);
        g.lineBetween(x + Math.cos(an) * r1, y + Math.sin(an) * r1, x + Math.cos(an) * r2, y + Math.sin(an) * r2);
      }
      // The pin through it: the sun held in place.
      g.lineStyle(Math.max(1, r * 0.1), OBS.glass, a); g.lineBetween(x - r * 0.3, y + r * 0.3, x + r * 0.3, y - r * 0.3);
      break;
    }
    case 'scales': {
      g.lineBetween(x, y - r, x, y + r * 0.8);
      g.lineBetween(x - r * 0.9, y - r * 0.55, x + r * 0.9, y - r * 0.55);
      g.lineBetween(x - r * 0.5, y + r * 0.8, x + r * 0.5, y + r * 0.8);
      for (const s of [-1, 1]) {
        const px = x + s * r * 0.9;
        g.lineBetween(px, y - r * 0.55, px - r * 0.28, y + r * 0.1); g.lineBetween(px, y - r * 0.55, px + r * 0.28, y + r * 0.1);
        g.beginPath(); g.arc(px, y + r * 0.1, r * 0.3, 0, Math.PI, false); g.strokePath();
      }
      g.fillStyle(color, a); g.fillCircle(x, y - r, r * 0.12);
      break;
    }
    case 'lantern': {
      g.lineBetween(x, y - r, x, y - r * 0.72);
      g.strokeCircle(x, y - r * 1.05, r * 0.1);
      g.fillStyle(color, a * 0.25); g.fillRoundedRect(x - r * 0.45, y - r * 0.7, r * 0.9, r * 1.3, r * 0.2);
      g.strokeRoundedRect(x - r * 0.45, y - r * 0.7, r * 0.9, r * 1.3, r * 0.2);
      g.lineBetween(x - r * 0.6, y - r * 0.7, x + r * 0.6, y - r * 0.7);
      g.lineBetween(x - r * 0.6, y + r * 0.6, x + r * 0.6, y + r * 0.6);
      // The caught soul, a teardrop flame.
      g.fillStyle(color, a); g.fillTriangle(x - r * 0.18, y + r * 0.1, x + r * 0.18, y + r * 0.1, x, y - r * 0.42);
      g.fillCircle(x, y + r * 0.12, r * 0.18);
      break;
    }
    case 'sigil': {
      g.strokeCircle(x, y, r);
      g.strokeCircle(x, y, r * 0.72);
      const tri = [0, 1, 2].map((i) => ({ x: x + Math.cos(-Math.PI / 2 + (i * Math.PI * 2) / 3) * r * 0.72, y: y + Math.sin(-Math.PI / 2 + (i * Math.PI * 2) / 3) * r * 0.72 }));
      g.strokePoints(tri, true);
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2 + 0.2;
        g.fillStyle(color, a); g.fillRect(x + Math.cos(an) * r * 0.86 - 1, y + Math.sin(an) * r * 0.86 - 1, 2.4, 2.4);
      }
      g.fillStyle(color, a); g.fillCircle(x, y, r * 0.14);
      break;
    }
    case 'compass': {
      // A pair of dividers standing on a gear: the mirror-grinders' specification.
      g.strokeCircle(x, y + r * 0.35, r * 0.48);
      for (let i = 0; i < 10; i++) {
        const an = (i / 10) * Math.PI * 2;
        g.lineBetween(x + Math.cos(an) * r * 0.48, y + r * 0.35 + Math.sin(an) * r * 0.48, x + Math.cos(an) * r * 0.64, y + r * 0.35 + Math.sin(an) * r * 0.64);
      }
      g.lineBetween(x, y - r, x - r * 0.55, y + r * 0.95);
      g.lineBetween(x, y - r, x + r * 0.55, y + r * 0.95);
      g.lineBetween(x - r * 0.3, y + r * 0.1, x + r * 0.3, y + r * 0.1);
      g.fillStyle(color, a); g.fillCircle(x, y - r, r * 0.14);
      break;
    }
    case 'brush': {
      // A palette with a brush laid across it.
      g.fillStyle(color, a * 0.2); g.fillEllipse(x, y + r * 0.1, r * 1.8, r * 1.3);
      g.strokeEllipse(x, y + r * 0.1, r * 1.8, r * 1.3);
      g.fillStyle(OBS.glass, a); g.fillCircle(x - r * 0.4, y + r * 0.3, r * 0.16);
      for (let i = 0; i < 3; i++) { g.fillStyle(color, a); g.fillCircle(x - r * 0.2 + i * r * 0.32, y - r * 0.18, r * 0.12); }
      g.lineStyle(Math.max(1, r * 0.16), color, a); g.lineBetween(x - r * 0.9, y + r * 0.9, x + r * 0.7, y - r * 0.7);
      g.fillStyle(color, a); g.fillTriangle(x + r * 0.62, y - r * 0.82, x + r * 0.82, y - r * 0.62, x + r * 1.02, y - r * 1.02);
      break;
    }
  }
}

/**
 * One of the six seats: a tall obsidian chair on a two-step plinth. `x` centre, `y` the front of
 * the plinth. The back is three shards (the middle one tallest, its emblem inlaid in gold), the
 * arms are dressed blocks, and the seat itself is worn glassy by decades of sitting. `empty`:
 * the councilor has been unseated — their split mask lies on the plinth and starlight leaks out of it.
 */
export function councilSeat(g: G, x: number, y: number, s: number, kind: Emblem, seed: number, empty = false): void {
  const rng = mulberry(seed);
  shadow(g, x, y + 2, 150 * s, 30 * s, 0.45);
  // Plinth: a wide lower step and a narrower upper one, a brass rail along the riser.
  slab(g, x, y, 136 * s, 18 * s, rng, 1);
  slab(g, x, y - 18 * s, 108 * s, 18 * s, rng, 0);
  g.lineStyle(1.6, NOON.brass, 0.7); g.lineBetween(x - 64 * s, y - 6 * s, x + 64 * s, y - 6 * s);
  const by = y - 36 * s;
  // Back shards.
  shard(g, x - 34 * s, by - 26 * s, 34 * s, 118 * s, -8 * s, 0.15);
  shard(g, x + 34 * s, by - 26 * s, 34 * s, 122 * s, 8 * s, 0.15);
  shard(g, x, by - 26 * s, 50 * s, 176 * s, 0, 0.35);
  // The back plate, where the emblem is inlaid.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 28 * s, by - 92 * s, 56 * s, 66 * s);
  g.fillStyle(OBS.facet, 0.85); g.fillTriangle(x - 28 * s, by - 92 * s, x + 14 * s, by - 92 * s, x - 28 * s, by - 40 * s);
  g.lineStyle(1.2, OBS.edge, 0.55); g.strokeRect(x - 28 * s, by - 92 * s, 56 * s, 66 * s);
  glow(g, x, by - 60 * s, 30 * s, NOON.gold, empty ? 0.03 : 0.05, 3);
  emblem(g, kind, x, by - 60 * s, 16 * s, empty ? 0.55 : 0.95);
  // Arms and seat.
  slab(g, x - 40 * s, by, 18 * s, 40 * s);
  slab(g, x + 40 * s, by, 18 * s, 40 * s);
  slab(g, x, by, 62 * s, 22 * s);
  g.fillStyle(0xffffff, 0.08); g.fillEllipse(x, by - 20 * s, 44 * s, 6 * s);
  // A gold seam up the tall shard, the light behind it showing.
  seam(g, [{ x: x - 2 * s, y: by - 100 * s }, { x: x + 4 * s, y: by - 130 * s }, { x: x - 3 * s, y: by - 160 * s }, { x, y: by - 196 * s }], 1.2 * s, 0.7, 0.3, empty ? NOON.star : OBS.seam);
  if (empty) {
    // The split mask, two halves lying where it fell, light spilling between them.
    glow(g, x, by + 8 * s, 20 * s, NOON.star, 0.08, 3);
    councilMask(g, x - 9 * s, by + 6 * s, 9 * s, { crack: 1, alpha: 0.95 });
    g.fillStyle(NOON.starCore, 0.8); g.fillTriangle(x - 2 * s, by - 4 * s, x + 3 * s, by - 4 * s, x, by + 14 * s);
  }
}

/**
 * The captured sunbeam's well: a round shaft through the floor, rimmed by eight inward-angled
 * mirror panels that once caught the Heliostat's beam and piped it up here to light the bench.
 * `x, y` centre; `r` radius of the rim. Baked; the beam itself is animated over it.
 */
export function sunWell(g: G, x: number, y: number, r: number, seed: number): void {
  const rng = mulberry(seed);
  shadow(g, x, y + r * 0.12, r * 2.5, r * 0.9, 0.5);
  // The pit: black, falling away, with the light at the bottom.
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y, r * 2.1, r * 1.3);
  g.fillStyle(0x050409, 1); g.fillEllipse(x, y + 4, r * 1.6, r * 0.95);
  for (let i = 4; i >= 1; i--) { g.fillStyle(NOON.gold, 0.06 * i); g.fillEllipse(x, y + 10, r * 0.3 * i, r * 0.17 * i); }
  g.fillStyle(NOON.starCore, 0.95); g.fillEllipse(x, y + 10, r * 0.34, r * 0.16);
  // Eight mirror panels round the rim, each a tilted shard catching gold.
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = x + Math.cos(an) * r * 0.98, py = y + Math.sin(an) * r * 0.6;
    const front = Math.sin(an) > 0;
    const hgt = front ? 18 : 34;
    g.fillStyle(front ? OBS.facet : OBS.glass, 1);
    g.fillPoints([{ x: px - 16, y: py }, { x: px + 16, y: py }, { x: px + 12, y: py - hgt }, { x: px - 12, y: py - hgt }], true);
    g.fillStyle(NOON.gold, front ? 0.16 : 0.32);
    g.fillPoints([{ x: px - 10, y: py - 3 }, { x: px + 10, y: py - 3 }, { x: px + 7, y: py - hgt + 4 }, { x: px - 7, y: py - hgt + 4 }], true);
    g.lineStyle(1, OBS.edge, 0.6);
    g.lineBetween(px - 12, py - hgt, px + 12, py - hgt);
    g.fillStyle(NOON.brass, 0.9); g.fillCircle(px, py - 2, 1.6);
  }
  // The rim: a dressed ring of black glass with a brass lip.
  g.lineStyle(7, OBS.sheen, 1); g.strokeEllipse(x, y, r * 2.1, r * 1.3);
  g.lineStyle(2, NOON.brass, 0.85); g.strokeEllipse(x, y - 2, r * 2.12, r * 1.32);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeEllipse(x, y + 3, r * 2.0, r * 1.22);
  for (let i = 0; i < 3; i++) {
    const an = rng() * Math.PI * 2;
    const a = { x: x + Math.cos(an) * r * 1.05, y: y + Math.sin(an) * r * 0.65 };
    seam(g, crackPath(a, { x: a.x + Math.cos(an) * 40, y: a.y + Math.sin(an) * 24 }, rng, 5, 3), 1, 0.7, 0.2, NOON.star);
  }
}

/**
 * The Seam itself, seen up the stair at the head of the room: the underside of the throne hall,
 * a ceiling of black shell plates that has split, and the star burning through the splits. `cx`
 * is its middle, `y` the bottom of its lowest plate, `w` its width. `t` seconds breathes the light.
 */
export function ceilingSeam(g: G, cx: number, y: number, w: number, h: number, t: number, seed: number, heat = 1): void {
  const rng = mulberry(seed);
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.9);
  // The star behind it all: a blaze filling the back of the rift.
  starGlow(g, cx, y - h * 0.55, h * 0.16, t, 0.75 * heat);
  // The plates: big jagged black-glass slabs hanging edge to edge, separated by bright splits.
  const n = 7;
  const plates: Pt[][] = [];
  const xs: number[] = [];
  for (let i = 0; i <= n; i++) xs.push(cx - w / 2 + (w * i) / n + (i > 0 && i < n ? (rng() - 0.5) * w * 0.06 : 0));
  for (let i = 0; i < n; i++) {
    const x0 = xs[i] + 6, x1 = xs[i + 1] - 6;
    const sag = h * (0.18 + rng() * 0.18) * (1 - Math.abs((i + 0.5) / n - 0.5) * 1.2);
    plates.push([
      { x: x0, y: y - h }, { x: x1, y: y - h },
      { x: x1 - rng() * 8, y: y - sag * 0.5 }, { x: (x0 + x1) / 2 + (rng() - 0.5) * 20, y: y + sag * 0.2 },
      { x: x0 + rng() * 8, y: y - sag * 0.4 },
    ]);
  }
  // Light falling out of each split, before the plates go over it.
  for (let i = 1; i < n; i++) {
    const sx = xs[i];
    sunShaft(g, sx, y - h * 0.8, sx + (sx - cx) * 0.25, y + h * 1.1, 12, 70, (0.55 + pulse * 0.3) * heat);
  }
  for (const pl of plates) {
    g.fillStyle(OBS.glass, 1); g.fillPoints(pl, true);
    g.fillStyle(OBS.facet, 0.9); g.fillPoints([pl[0], pl[1], pl[2], pl[3]], true);
    g.fillStyle(OBS.sheen, 0.35); g.fillTriangle(pl[0].x + 6, pl[0].y + 4, pl[1].x - 6, pl[1].y + 4, (pl[0].x + pl[1].x) / 2, pl[0].y + 24);
    g.lineStyle(1.2, OBS.edge, 0.55); g.strokePoints(pl, true);
    // The splits glow along every plate's edge — gold, not violet: the shell is open here.
    seam(g, [pl[2], pl[3], pl[4]], 1.6, 0.9 * heat, pulse * 0.6, NOON.star);
  }
  // The splits between plates: the hottest lines on the spire.
  for (let i = 1; i < n; i++) {
    const pts = crackPath({ x: xs[i], y: y - h }, { x: xs[i] + (rng() - 0.5) * 12, y: y - h * 0.1 }, rng, 5, 5);
    seam(g, pts, 2.4, heat, 0.4 + pulse * 0.6, NOON.star);
    g.lineStyle(1, NOON.starCore, 0.9 * heat);
    for (let k = 1; k < pts.length; k++) g.lineBetween(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
  }
  // Drips of light falling from the lowest points.
  for (let i = 0; i < n; i++) {
    const p = plates[i][3];
    const ph = (t * 0.5 + i * 0.37) % 1;
    g.fillStyle(NOON.starCore, 0.8 * (1 - ph) * heat);
    g.fillCircle(p.x, p.y + ph * h * 0.9, 1.6);
  }
}

/**
 * A stair of black glass going up (north): `x` centre, `y` the foot, `w` wide, `n` steps of
 * `rise` px. Each step a dressed slab, getting lighter toward the top where the gold comes in.
 */
export function glassStair(g: G, x: number, y: number, w: number, n: number, rise: number, warmTop = 0): void {
  for (let i = n - 1; i >= 0; i--) {
    const sy = y - i * rise;
    const k = i / Math.max(1, n - 1);
    g.fillStyle(mixC(OBS.glass, OBS.facet, 0.3 + k * 0.4), 1); g.fillRect(x - w / 2, sy - rise, w, rise);
    g.fillStyle(mixC(OBS.sheen, NOON.gold, k * warmTop * 0.5), 1); g.fillRect(x - w / 2, sy - rise, w, Math.max(2, rise * 0.28));
    g.lineStyle(1, mixC(OBS.edge, NOON.gold, k * warmTop), 0.7); g.lineBetween(x - w / 2, sy - rise, x + w / 2, sy - rise);
    if (warmTop > 0 && k > 0.45) { g.fillStyle(NOON.gold, 0.05 * k * warmTop); g.fillRect(x - w / 2, sy - rise, w, rise); }
  }
  // Cheek walls.
  for (const s of [-1, 1]) {
    const cx = x + (s * w) / 2;
    g.fillStyle(OBS.glass, 1); g.fillRect(cx - (s > 0 ? 0 : 14), y - n * rise - 10, 14, n * rise + 10);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(cx + (s > 0 ? 14 : -14), y - n * rise - 10, cx + (s > 0 ? 14 : -14), y);
  }
}

/**
 * The Dusk-Ticket clerk's desk: a slab desk with a brass ticket-punch, pigeonholes of unissued
 * tickets (one hour of shade each, never to be issued again), a stamp and its pad, a stopwatch.
 */
export function ticketDesk(g: G, x: number, y: number, seed: number): void {
  const rng = mulberry(seed);
  slab(g, x, y, 150, 34, rng, 1);
  // Pigeonholes behind: a tall black-glass rack.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 60, y - 96, 120, 62);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeRect(x - 60, y - 96, 120, 62);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const cx = x - 58 + c * 19.5, cy = y - 94 + r * 20;
      g.fillStyle(0x08070c, 1); g.fillRect(cx + 1, cy + 1, 17, 18);
      const n = 1 + Math.floor(rng() * 4);
      for (let k = 0; k < n; k++) { g.fillStyle(k % 2 ? 0xd8c890 : 0xe8dcae, 0.95); g.fillRect(cx + 3 + k, cy + 6 + k * 2, 12, 4); }
    }
  }
  // The punch: a brass lever press with a black handle.
  const px = x + 44, py = y - 34;
  g.fillStyle(NOON.brassDark, 1); g.fillRect(px - 12, py - 6, 24, 6);
  g.fillStyle(NOON.brass, 1); g.fillRect(px - 4, py - 26, 8, 20);
  g.lineStyle(3, NOON.brass, 1); g.lineBetween(px, py - 24, px - 20, py - 34);
  g.fillStyle(OBS.glass, 1); g.fillCircle(px - 21, py - 35, 4);
  // A spread of tickets on the desk, each punched once, a little sun stamped on.
  for (let i = 0; i < 7; i++) {
    const tx = x - 60 + rng() * 80, ty = y - 32 + rng() * 6;
    g.fillStyle(0xe8dcae, 1); g.fillRect(tx, ty - 5, 18, 8);
    g.fillStyle(0x8a6a2a, 0.9); g.fillCircle(tx + 5, ty - 1, 2);
    g.fillStyle(0x07060d, 1); g.fillCircle(tx + 13, ty - 1, 1.2);
  }
  // The stopwatch, open, on its chain.
  g.fillStyle(NOON.brass, 1); g.fillCircle(x - 30, y - 40, 7);
  g.fillStyle(0xf8f0dc, 1); g.fillCircle(x - 30, y - 40, 5.4);
  g.lineStyle(1, 0x2a2010, 1); g.lineBetween(x - 30, y - 40, x - 30, y - 44); g.lineBetween(x - 30, y - 40, x - 27, y - 40);
}

/** A councilor-scribe's lectern: a tilted black slab with the open Book of the Noon on it, the ink long dry. */
export function lectern(g: G, x: number, y: number): void {
  shadow(g, x, y, 60, 14);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 6, y - 50, 12, 50);
  g.fillStyle(OBS.facet, 1); g.fillRect(x - 6, y - 50, 4, 50);
  slab(g, x, y, 40, 8);
  g.fillStyle(OBS.sheen, 1);
  g.fillPoints([{ x: x - 28, y: y - 50 }, { x: x + 28, y: y - 50 }, { x: x + 24, y: y - 70 }, { x: x - 24, y: y - 70 }], true);
  // The book: two pages of close gold script, a ribbon.
  g.fillStyle(0xe8dcae, 1);
  g.fillPoints([{ x: x - 24, y: y - 53 }, { x: x - 1, y: y - 52 }, { x: x - 1, y: y - 69 }, { x: x - 21, y: y - 68 }], true);
  g.fillPoints([{ x: x + 1, y: y - 52 }, { x: x + 24, y: y - 53 }, { x: x + 21, y: y - 68 }, { x: x + 1, y: y - 69 }], true);
  g.lineStyle(1, 0x6a5a3a, 0.6);
  for (let i = 0; i < 6; i++) { g.lineBetween(x - 20, y - 56 - i * 2.3, x - 4, y - 56 - i * 2.3); g.lineBetween(x + 4, y - 56 - i * 2.3, x + 20, y - 56 - i * 2.3); }
  g.lineStyle(2, NOON.starDeep, 0.9); g.lineBetween(x, y - 52, x + 2, y - 44);
}

export { lit, mixC };
