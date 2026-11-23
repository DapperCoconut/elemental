import Phaser from 'phaser';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  CALF, GILT, GILT_DARK, GILT_LIT, GLOW, GLOW_LIT, GRASS_DARK, INK, INK_BLUE, INK_SHEEN, INK_SOFT, IRON, LEAD, LEAD_LIT,
  LEATHER, LEATHER_DARK, LEATHER_LIT, OAK, OAK_DARK, OAK_LIT, PAPER, PAPER_DARK, PAPER_FOX, PAPER_LIT, PAPER_OLD, RACE,
  RACE_DEEP, RACE_LIT, RED, RED_DARK, RED_LIT, SETT, SETT_DARK, SETT_LIT, SLATE, SLATE_DARK, SLATE_LIT, SNOW, WASH,
  WASH_SHADE, WELL, WELL_DEEP, WELL_SHEEN,
} from './palette';

/**
 * Libretto set pieces — the shapes only a copyists' town has. Everything here is paper or a thing
 * that marks paper: cream sheets, ruled lines, black type, a quill's slit nib, a press's screw,
 * the Censor's red. Buildings are half-timbered limewash under steep wet slate, windows leaded
 * in small panes and lit from inside, because the copying goes on through the dark between the
 * Hours. Where a word has been struck it is struck in red, and the eye goes to it.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

// ── Small marks ──────────────────────────────────────────────────────

/** Lines of "text" in a box: grey strokes with word gaps, the way a page reads from across a room. */
export function textLines(g: G, x: number, y: number, w: number, h: number, color: number, a: number, rng: () => number, gap = 5, struck = 0): void {
  for (let ly = y; ly < y + h; ly += gap) {
    let lx = x;
    const end = x + w * (ly + gap >= y + h ? 0.55 : 1);
    while (lx < end) {
      const ww = Math.min(end - lx, 4 + rng() * 14);
      g.fillStyle(color, a); g.fillRect(lx, ly, ww, Math.max(1, gap * 0.32));
      lx += ww + 2 + rng() * 2;
    }
    if (struck > 0 && rng() < struck) { g.lineStyle(1.5, RED, 0.9); g.lineBetween(x - 1, ly + gap * 0.16, x + w * (0.4 + rng() * 0.6), ly + gap * 0.16); }
  }
}

/** A sheet of paper lying flat (or pinned), with its text, at angle `rot`. */
export function sheet(g: G, x: number, y: number, w: number, h: number, rot: number, color = PAPER, a = 1): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const pt = (u: number, v: number) => P(x + u * c - v * s, y + u * s + v * c);
  g.fillStyle(0x000000, 0.12 * a); g.fillPoints([pt(-w / 2 + 2, -h / 2 + 3), pt(w / 2 + 2, -h / 2 + 3), pt(w / 2 + 2, h / 2 + 3), pt(-w / 2 + 2, h / 2 + 3)], true);
  g.fillStyle(color, a); g.fillPoints([pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)], true);
  g.lineStyle(1, INK_SOFT, 0.35 * a);
  for (let v = -h / 2 + 4; v < h / 2 - 2; v += 4) {
    const p0 = pt(-w / 2 + 3, v), p1 = pt(w / 2 - 3 - ((v * 7) % 5), v);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }
}

/** A little page tumbling in the wind — for the pages weather and the storm gimmick. `flip` 0..1 shows its turn. */
export function loosePage(g: G, x: number, y: number, s: number, rot: number, flip: number, a = 1): void {
  const w = 12 * s * Math.max(0.15, Math.abs(Math.cos(flip * Math.PI))), h = 15 * s;
  const back = Math.cos(flip * Math.PI) < 0;
  sheet(g, x, y, w, h, rot, back ? PAPER_DARK : PAPER_LIT, a);
}

/** A quill feather: a white vane curving off a shaft, a cut nib at the tip. */
export function quill(g: G, x: number, y: number, len: number, a: number, vane = PAPER_LIT): void {
  const c = Math.cos(a), s = Math.sin(a);
  const nx = -s, ny = c;
  const tipX = x, tipY = y, endX = x + c * len, endY = y + s * len;
  // The vane: a lens down the upper two-thirds of the shaft.
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = 0.3 + (i / 10) * 0.7;
    const wv = Math.sin(((i / 10)) * Math.PI) * len * 0.16;
    pts.push(P(x + c * len * t + nx * wv, y + s * len * t + ny * wv));
  }
  for (let i = 10; i >= 0; i--) {
    const t = 0.3 + (i / 10) * 0.7;
    const wv = Math.sin(((i / 10)) * Math.PI) * len * 0.08;
    pts.push(P(x + c * len * t - nx * wv, y + s * len * t - ny * wv));
  }
  g.fillStyle(dim(vane, 0.15), 1); g.fillPoints(pts, true);
  // Barbs.
  g.lineStyle(1, dim(vane, 0.3), 0.7);
  for (let i = 1; i < 9; i++) {
    const t = 0.32 + i * 0.075;
    const bx = x + c * len * t, by = y + s * len * t;
    g.lineBetween(bx, by, bx + nx * len * 0.12 + c * len * 0.05, by + ny * len * 0.12 + s * len * 0.05);
  }
  g.lineStyle(1.6, PAPER_LIT, 1); g.lineBetween(tipX, tipY, endX, endY);
  // The cut nib, inked.
  g.lineStyle(2, INK, 1); g.lineBetween(tipX, tipY, tipX + c * len * 0.12, tipY + s * len * 0.12);
}

/** A red strike-through, slightly wavering, as the Censor draws it. */
export function strikeLine(g: G, x1: number, y1: number, x2: number, y2: number, w: number, a = 1): void {
  g.lineStyle(w + 2, RED_DARK, 0.5 * a); g.lineBetween(x1, y1 + 1, x2, y2 + 1);
  g.lineStyle(w, RED, a); g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(Math.max(1, w * 0.3), RED_LIT, 0.6 * a); g.lineBetween(x1, y1 - w * 0.2, x2, y2 - w * 0.2);
}

/** A printer's fleuron (❦), drawn as a leaf on a curling stem — set in paving and on bindings. */
export function fleuron(g: G, x: number, y: number, s: number, color: number, a = 1): void {
  g.lineStyle(1.6 * s, color, a);
  g.beginPath(); g.arc(x - 4 * s, y, 5 * s, -Math.PI * 0.2, Math.PI * 1.1, false); g.strokePath();
  g.fillStyle(color, a);
  g.fillTriangle(x, y - 7 * s, x + 9 * s, y, x, y + 7 * s);
  g.fillEllipse(x + 3 * s, y, 9 * s, 10 * s);
  g.fillStyle(dim(color, 0.4), a); g.fillRect(x + 1 * s, y - 0.5 * s, 7 * s, 1 * s);
}

/** A paper lantern: a ribbed cream globe between wooden caps, a red tassel. `on` 0..1 is its light; `burn` 0..1 chars it. */
export function paperLantern(g: G, x: number, y: number, r: number, on: number, burn = 0): void {
  if (on > 0) glow(g, x, y, r * 3.2, GLOW, 0.05 * on, 4);
  const body = burn > 0 ? mixC(on > 0 ? mixC(PAPER, GLOW, 0.6) : PAPER, 0x3a2a1a, burn * 0.8) : on > 0 ? mixC(PAPER, GLOW, 0.55 * on) : PAPER_DARK;
  g.fillStyle(dim(body, 0.25), 1); g.fillEllipse(x + 1, y + 1, r * 2, r * 2.3);
  g.fillStyle(body, 1); g.fillEllipse(x, y, r * 2, r * 2.3);
  if (on > 0) { g.fillStyle(GLOW_LIT, 0.45 * on); g.fillEllipse(x - r * 0.15, y - r * 0.1, r * 1.1, r * 1.5); }
  // Ribs.
  g.lineStyle(1, dim(body, 0.35), 0.8);
  for (let k = -2; k <= 2; k++) {
    const yy = y + k * r * 0.42;
    const hw = r * Math.sqrt(Math.max(0, 1 - (k * 0.42 / 1.15) ** 2));
    g.lineBetween(x - hw, yy, x + hw, yy);
  }
  // Charred holes.
  if (burn > 0.3) {
    for (let i = 0; i < Math.floor(burn * 5); i++) {
      const a = i * 2.2 + 0.4;
      g.fillStyle(0x1a120a, 0.9); g.fillCircle(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.6, r * (0.18 + burn * 0.12));
      if (on > 0) { g.lineStyle(1, 0xff8a3a, 0.9); g.strokeCircle(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.6, r * (0.18 + burn * 0.12)); }
    }
  }
  // Caps and tassel.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - r * 0.6, y - r * 1.2, r * 1.2, r * 0.3); g.fillRect(x - r * 0.6, y + r * 0.95, r * 1.2, r * 0.28);
  g.lineStyle(1.4, RED, 1); g.lineBetween(x, y + r * 1.22, x, y + r * 1.8);
  g.fillStyle(RED, 1); g.fillTriangle(x - r * 0.25, y + r * 2.1, x + r * 0.25, y + r * 2.1, x, y + r * 1.6);
}

/**
 * An origami crane, side-on: a diamond body, two wings that flap (`flap` −1..1), a long neck
 * folded down into a head and a raised tail point. `a` is its heading (it faces +x at 0).
 */
export function crane(g: G, x: number, y: number, s: number, a: number, flap: number, color = PAPER_LIT, alpha = 1): void {
  const c = Math.cos(a), sn = Math.sin(a);
  const flip = Math.cos(a) < 0 ? -1 : 1;
  const pt = (u: number, v: number) => P(x + u * c - v * sn * flip, y + u * sn + v * c * flip);
  const shade = dim(color, 0.22);
  // Far wing, under the body.
  g.fillStyle(dim(color, 0.32), alpha);
  g.fillPoints([pt(-3 * s, -1 * s), pt(4 * s, -1 * s), pt(-2 * s, (-10 - flap * 6) * s)], true);
  // Body: two triangles, the crease down the middle.
  g.fillStyle(shade, alpha); g.fillPoints([pt(-7 * s, 0), pt(0, 3 * s), pt(7 * s, 0), pt(0, -2 * s)], true);
  g.fillStyle(color, alpha); g.fillPoints([pt(-7 * s, 0), pt(0, -2 * s), pt(7 * s, 0)], true);
  // Neck forward and up, head folded down; tail back and up.
  g.fillStyle(color, alpha); g.fillPoints([pt(4 * s, -1 * s), pt(7 * s, 0), pt(12 * s, -9 * s)], true);
  g.fillStyle(shade, alpha); g.fillPoints([pt(12 * s, -9 * s), pt(11 * s, -7 * s), pt(15 * s, -6 * s)], true);
  g.fillStyle(color, alpha); g.fillPoints([pt(-4 * s, -1 * s), pt(-7 * s, 0), pt(-12 * s, -8 * s)], true);
  // Near wing, over the body.
  g.fillStyle(lit(color, 0.1), alpha);
  g.fillPoints([pt(-3 * s, -1 * s), pt(4 * s, -1 * s), pt(0, (-12 - flap * 8) * s)], true);
  g.lineStyle(0.8, dim(color, 0.4), alpha * 0.8);
  const w0 = pt(0.5 * s, -1 * s), w1 = pt(0, (-12 - flap * 8) * s);
  g.lineBetween(w0.x, w0.y, w1.x, w1.y);
}

/**
 * A sheet being folded into a crane, crease by crease: `k` 0 = a flat square, 0.25 = folded
 * corner to corner, 0.5 = a kite, 0.75 = a bird base with its points up, 1 = a crane.
 */
export function foldingSheet(g: G, x: number, y: number, s: number, k: number, rot: number, crumpled = 0): void {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const pt = (u: number, v: number) => P(x + u * c - v * sn, y + u * sn + v * c);
  shadow(g, x, y + 4, 30 * s * (1 - k * 0.4), 10 * s, 0.22);
  if (crumpled > 0) {
    // A ball of crumpled paper: facets of light and dark.
    const r = 10 * s * (1 - crumpled * 0.35);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + rot;
      g.fillStyle(i % 2 ? PAPER : PAPER_DARK, 1);
      g.fillTriangle(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, x + Math.cos(a + 1) * r, y + Math.sin(a + 1) * r * 0.8);
    }
    g.lineStyle(1, PAPER_FOX, 0.8); g.strokeCircle(x, y, r * 0.9);
    return;
  }
  const h = 16 * s;
  if (k < 0.25) {
    // The square, its diagonal crease forming.
    const t = k / 0.25;
    g.fillStyle(PAPER, 1); g.fillPoints([pt(-h, -h), pt(h, -h), pt(h, h), pt(-h, h)], true);
    g.lineStyle(1, PAPER_DARK, 1); g.strokePoints([pt(-h, -h), pt(h, -h), pt(h, h), pt(-h, h)], true);
    // The far corner lifting over toward the near one.
    g.fillStyle(PAPER_DARK, 0.9); g.fillPoints([pt(-h, -h), pt(h, h), pt(h - t * 2 * h * 0.9, -h + t * 0.4 * h)], true);
    g.lineStyle(1, INK_SOFT, 0.25 + t * 0.4); { const a0 = pt(-h, -h), a1 = pt(h, h); g.lineBetween(a0.x, a0.y, a1.x, a1.y); }
  } else if (k < 0.5) {
    // Folded to a triangle; the kite flaps swinging in.
    const t = (k - 0.25) / 0.25;
    g.fillStyle(PAPER, 1); g.fillPoints([pt(-h, h), pt(h, h), pt(0, -h)], true);
    g.fillStyle(PAPER_DARK, 1);
    g.fillPoints([pt(-h * (1 - t * 0.6), h), pt(0, h), pt(0, -h)], true);
    g.fillPoints([pt(h * (1 - t * 0.6), h), pt(0, h), pt(0, -h)], true);
    g.lineStyle(1, INK_SOFT, 0.5); { const a0 = pt(0, -h), a1 = pt(0, h); g.lineBetween(a0.x, a0.y, a1.x, a1.y); }
  } else if (k < 0.75) {
    // The kite, and its points beginning to stand up: the bird base.
    const t = (k - 0.5) / 0.25;
    g.fillStyle(PAPER, 1); g.fillPoints([pt(0, -h * 1.1), pt(h * 0.55, h * 0.2), pt(0, h * 0.7), pt(-h * 0.55, h * 0.2)], true);
    g.fillStyle(PAPER_DARK, 1); g.fillPoints([pt(0, -h * 1.1), pt(h * 0.55, h * 0.2), pt(0, h * 0.7)], true);
    g.lineStyle(1.2, PAPER_LIT, 1);
    { const a0 = pt(-h * 0.3, h * 0.4), a1 = pt(-h * (0.3 + t * 0.6), -h * t * 0.9); g.lineBetween(a0.x, a0.y, a1.x, a1.y); }
    { const a0 = pt(h * 0.3, h * 0.4), a1 = pt(h * (0.3 + t * 0.6), -h * t * 0.9); g.lineBetween(a0.x, a0.y, a1.x, a1.y); }
  } else {
    // A crane, wings rising as the last crease takes.
    const t = (k - 0.75) / 0.25;
    crane(g, x, y - 4 * s * t, s * (1.1 + t * 0.2), rot * 0.2, 0.6 - t * 1.2);
  }
}

/** A dip-pen nib, seen from above: steel, slit and breather hole, its point at (x,y) facing `a`. */
export function nib(g: G, x: number, y: number, len: number, a: number, inkColor = RED): void {
  const c = Math.cos(a), s = Math.sin(a);
  const nx = -s, ny = c;
  const bx = x - c * len, by = y - s * len;
  g.fillStyle(0x000000, 0.25); g.fillTriangle(x + 3, y + 4, bx + nx * len * 0.32 + 3, by + ny * len * 0.32 + 4, bx - nx * len * 0.32 + 3, by - ny * len * 0.32 + 4);
  g.fillStyle(LEAD_LIT, 1); g.fillTriangle(x, y, bx + nx * len * 0.32, by + ny * len * 0.32, bx - nx * len * 0.32, by - ny * len * 0.32);
  g.fillStyle(LEAD, 1); g.fillTriangle(x, y, bx - nx * len * 0.32, by - ny * len * 0.32, bx, by);
  g.lineStyle(1.2, INK, 1); g.lineBetween(x, y, x - c * len * 0.55, y - s * len * 0.55);
  g.fillStyle(INK, 1); g.fillCircle(x - c * len * 0.58, y - s * len * 0.58, len * 0.06 + 1);
  g.fillStyle(inkColor, 1); g.fillCircle(x, y, 2.4);
  // The holder behind it.
  g.lineStyle(len * 0.36, RED_DARK, 1); g.lineBetween(bx, by, bx - c * len * 0.9, by - s * len * 0.9);
  g.lineStyle(len * 0.26, RED, 1); g.lineBetween(bx, by, bx - c * len * 0.9, by - s * len * 0.9);
  g.fillStyle(GILT, 1); g.fillCircle(bx, by, len * 0.2);
}

// ── Buildings ────────────────────────────────────────────────────────

/** A pane of small leaded diamonds, lit from inside by `glowA` (0 = dark). */
function leaded(g: G, x: number, y: number, w: number, h: number, glowA: number): void {
  g.fillStyle(glowA > 0 ? mixC(0x3a3020, GLOW, glowA) : 0x2a2c34, 1); g.fillRect(x, y, w, h);
  g.lineStyle(0.8, 0x1a1612, 0.85);
  for (let d = -h; d < w; d += 5) { g.lineBetween(x + d, y, x + d + h, y + h); g.lineBetween(x + d + h, y, x + d, y + h); }
  g.lineStyle(1.6, OAK_DARK, 1); g.strokeRect(x, y, w, h);
}

export interface CopybookOpts { wall?: number; roof?: number; glow?: number; sign?: 'quill' | 'ream' | 'ink' | 'none'; snow?: boolean }

/**
 * A copybook house: stone footing, limewashed ground floor in an oak frame, a jettied upper
 * floor with X-braces, small leaded windows lit for the night's copying, a steep wet slate gable
 * with a chimney, and the day's hymn sheet pasted on the door as the law requires.
 */
export function copybookHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, o: CopybookOpts = {}): void {
  const wall = o.wall ?? WASH, roof = o.roof ?? SLATE, gl = o.glow ?? 0.7;
  shadow(g, x, y + 4, w * 1.15, 20);
  const x0 = x - w / 2;
  const h1 = h * 0.45, h2 = h * 0.55;
  // Footing.
  g.fillStyle(SETT_DARK, 1); g.fillRect(x0 - 2, y - 10, w + 4, 10);
  for (let bx = x0; bx < x0 + w; bx += 12) { g.fillStyle(rng() < 0.5 ? SETT : SETT_LIT, 1); g.fillRect(bx + 1, y - 9, 10, 8); }
  // Ground floor.
  g.fillStyle(wall, 1); g.fillRect(x0, y - 10 - h1, w, h1);
  g.fillStyle(OAK, 1);
  for (let px = x0; px <= x0 + w; px += w / 4) g.fillRect(px - 2.5, y - 10 - h1, 5, h1);
  g.fillRect(x0, y - 10 - h1, w, 5);
  // Upper floor, jettied out over the street.
  const ux0 = x0 - 6, uw = w + 12, uy = y - 10 - h1 - h2;
  g.fillStyle(OAK_DARK, 1); g.fillRect(ux0, y - 10 - h1 - 4, uw, 6);
  g.fillStyle(lit(wall, 0.04), 1); g.fillRect(ux0, uy, uw, h2 - 4);
  g.lineStyle(4, OAK, 1);
  const bays = Math.max(2, Math.round(uw / 34));
  for (let i = 0; i <= bays; i++) { const bx = ux0 + (uw * i) / bays; g.lineBetween(bx, uy, bx, uy + h2 - 4); }
  g.lineStyle(3, OAK, 1);
  for (let i = 0; i < bays; i++) {
    if (i % 2) continue;
    const bx = ux0 + (uw * i) / bays, bw = uw / bays;
    g.lineBetween(bx, uy, bx + bw, uy + h2 - 4); g.lineBetween(bx + bw, uy, bx, uy + h2 - 4);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(ux0, uy - 3, uw, 5);
  // Windows: the lit bays.
  for (let i = 0; i < bays; i++) {
    if (i % 2 === 0) continue;
    const bx = ux0 + (uw * i) / bays, bw = uw / bays;
    leaded(g, bx + bw * 0.2, uy + h2 * 0.22, bw * 0.6, h2 * 0.45, gl * (0.6 + rng() * 0.4));
  }
  leaded(g, x0 + w * 0.08, y - 10 - h1 + h1 * 0.3, w * 0.16, h1 * 0.4, gl);
  leaded(g, x0 + w * 0.76, y - 10 - h1 + h1 * 0.3, w * 0.16, h1 * 0.4, gl * 0.7);
  // Door with the pasted sheet.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 11, y - 10 - h1 * 0.82, 22, h1 * 0.82);
  g.fillStyle(OAK, 1); g.fillRect(x - 9, y - 10 - h1 * 0.8, 18, h1 * 0.8);
  sheet(g, x, y - 10 - h1 * 0.55, 10, 13, 0.04, PAPER_LIT);
  g.fillStyle(GILT, 1); g.fillCircle(x + 6, y - 10 - h1 * 0.35, 1.4);
  // The slate gable.
  const ry = uy - 3;
  const peak = ry - h * 0.62;
  g.fillStyle(dim(roof, 0.25), 1); g.fillTriangle(ux0 - 8, ry + 2, ux0 + uw + 8, ry + 2, x, peak - 2);
  g.fillStyle(roof, 1); g.fillTriangle(ux0 - 6, ry, ux0 + uw + 6, ry, x, peak);
  for (let k = 1; k < 7; k++) {
    const t = k / 7, yy = ry - (ry - peak) * t, hw = (uw / 2 + 6) * (1 - t);
    g.lineStyle(1, dim(roof, 0.3), 0.8); g.lineBetween(x - hw, yy, x + hw, yy);
    for (let sx = x - hw + 4; sx < x + hw - 2; sx += 7) { g.lineStyle(1, lit(roof, 0.12), 0.5); g.lineBetween(sx, yy, sx, yy + (ry - peak) / 7); }
  }
  if (o.snow) { g.fillStyle(SNOW, 0.85); g.fillTriangle(x - 18, peak + 14, x + 18, peak + 14, x, peak + 1); }
  // Barge boards and the gable's little leaded window.
  g.lineStyle(3, OAK_DARK, 1); g.lineBetween(ux0 - 6, ry, x, peak); g.lineBetween(ux0 + uw + 6, ry, x, peak);
  leaded(g, x - 7, ry - (ry - peak) * 0.55, 14, 12, gl * 0.8);
  // Chimney.
  const cx = x + uw * 0.28, cy = ry - (ry - peak) * 0.42;
  g.fillStyle(SETT_DARK, 1); g.fillRect(cx - 6, cy - 26, 12, 30);
  g.fillStyle(SETT, 1); g.fillRect(cx - 5, cy - 26, 10, 28);
  g.fillStyle(SETT_DARK, 1); g.fillRect(cx - 7, cy - 28, 14, 4);
  // A hanging trade sign on an iron bracket.
  if (o.sign && o.sign !== 'none') {
    const sx = x0 + w + 2, sy = y - 10 - h1 * 0.95;
    g.lineStyle(2, IRON, 1); g.lineBetween(sx, sy, sx + 22, sy); g.lineBetween(sx, sy + 8, sx + 10, sy);
    g.lineStyle(1, IRON, 1); g.lineBetween(sx + 6, sy, sx + 6, sy + 4); g.lineBetween(sx + 20, sy, sx + 20, sy + 4);
    g.fillStyle(OAK, 1); g.fillRect(sx + 3, sy + 4, 20, 18);
    g.lineStyle(1, GILT, 1); g.strokeRect(sx + 3, sy + 4, 20, 18);
    if (o.sign === 'quill') quill(g, sx + 7, sy + 19, 16, -1.0);
    else if (o.sign === 'ream') { g.fillStyle(PAPER, 1); g.fillRect(sx + 7, sy + 9, 12, 9); g.fillStyle(RED, 1); g.fillRect(sx + 12, sy + 9, 2, 9); }
    else { g.fillStyle(INK, 1); g.fillRect(sx + 9, sy + 11, 8, 8); g.fillStyle(LEAD_LIT, 1); g.fillRect(sx + 11, sy + 8, 4, 3); }
  }
}

/**
 * A scriptorium: a long stone-and-oak copying hall with tall pointed windows down its front,
 * each lit gold, and in each a copyist bent over a sloped desk with a quill — the court's work,
 * seen from the street. Buttresses between the windows, a steep slate roof with dormers, a
 * bell-cote that rings the copyists in for each Hour, and a carved quill over the door.
 */
export function scriptorium(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.08, 28);
  // Plinth and stone lower course.
  g.fillStyle(SETT_DARK, 1); g.fillRect(x0 - 6, y - 16, w + 12, 16);
  g.fillStyle(SETT, 1); g.fillRect(x0 - 4, y - 18, w + 8, 12);
  // The wall: dressed stone, coursed.
  const top = y - 16 - h;
  g.fillStyle(WASH_SHADE, 1); g.fillRect(x0, top, w, h);
  for (let cy = top + 8; cy < y - 16; cy += 10) {
    g.lineStyle(1, dim(WASH_SHADE, 0.15), 0.8); g.lineBetween(x0, cy, x0 + w, cy);
    for (let cx = x0 + ((cy / 10) % 2) * 9; cx < x0 + w; cx += 18) g.lineBetween(cx, cy, cx, cy + 10);
  }
  // Windows and the copyists in them.
  const n = Math.max(3, Math.round(w / 70));
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + bw * (i + 0.5);
    const ww = bw * 0.46, wh = h * 0.62, wy = top + h * 0.16;
    if (i === Math.floor(n / 2)) continue;
    g.fillStyle(SETT_DARK, 1); g.fillRect(cx - ww / 2 - 3, wy - 2, ww + 6, wh + 5);
    g.fillStyle(SETT_DARK, 1); g.fillTriangle(cx - ww / 2 - 3, wy, cx + ww / 2 + 3, wy, cx, wy - ww * 0.75);
    leaded(g, cx - ww / 2, wy, ww, wh, 0.85);
    g.fillStyle(mixC(0x3a3020, GLOW, 0.85), 1); g.fillTriangle(cx - ww / 2, wy + 1, cx + ww / 2, wy + 1, cx, wy - ww * 0.62);
    // A copyist: hunched back, cowl, the desk's slope, the quill raised.
    const fx = cx + (i % 2 ? -3 : 3), fy = wy + wh * 0.78;
    g.fillStyle(0x2a2018, 0.85); g.fillEllipse(fx, fy - 8, 14, 18); g.fillCircle(fx + 4, fy - 18, 5);
    g.lineStyle(2, 0x2a2018, 0.85); g.lineBetween(fx - 10, fy - 2, fx + 10, fy - 9);
    g.lineStyle(1, 0x2a2018, 0.9); g.lineBetween(fx + 7, fy - 12, fx + 12, fy - 22);
    g.fillStyle(GLOW_LIT, 0.6); g.fillCircle(fx - 8, fy - 6, 1.6);
    g.lineStyle(1.5, PAPER_LIT, 0.5); g.lineBetween(cx - ww / 2 + 2, wy + 3, cx - ww / 2 + 2, wy + wh - 3);
    g.fillStyle(SETT_LIT, 1); g.fillRect(cx - ww / 2 - 4, wy + wh + 1, ww + 8, 4);
  }
  // Buttresses.
  for (let i = 0; i <= n; i++) {
    const bx = x0 + bw * i;
    g.fillStyle(SETT_DARK, 1); g.fillRect(bx - 6, top + h * 0.2, 12, h * 0.8);
    g.fillStyle(SETT, 1); g.fillRect(bx - 5, top + h * 0.2, 9, h * 0.8);
    g.fillStyle(SETT_LIT, 1); g.fillTriangle(bx - 6, top + h * 0.2, bx + 6, top + h * 0.2, bx, top + h * 0.08);
  }
  // The door: deep arch, oak, a carved quill above it.
  const mid = x0 + bw * (Math.floor(n / 2) + 0.5);
  g.fillStyle(SETT_DARK, 1); g.fillRect(mid - 22, y - 16 - h * 0.6, 44, h * 0.6);
  g.fillTriangle(mid - 22, y - 16 - h * 0.6, mid + 22, y - 16 - h * 0.6, mid, y - 16 - h * 0.6 - 22);
  g.fillStyle(OAK, 1); g.fillRect(mid - 16, y - 16 - h * 0.52, 32, h * 0.52);
  g.fillStyle(OAK_DARK, 1); g.fillRect(mid - 1, y - 16 - h * 0.52, 2, h * 0.52);
  for (let k = 0; k < 4; k++) { g.fillStyle(IRON, 1); g.fillRect(mid - 16, y - 16 - h * 0.48 + k * h * 0.12, 32, 2); }
  quill(g, mid - 12, y - 16 - h * 0.62, 30, -0.55, SETT_LIT);
  // Roof: steep slate with dormers, ridge tiles.
  const peak = top - h * 0.75;
  g.fillStyle(SLATE_DARK, 1); g.fillPoints([P(x0 - 12, top + 2), P(x0 + w + 12, top + 2), P(x0 + w - 20, peak), P(x0 + 20, peak)], true);
  g.fillStyle(SLATE, 1); g.fillPoints([P(x0 - 10, top), P(x0 + w + 10, top), P(x0 + w - 22, peak + 2), P(x0 + 22, peak + 2)], true);
  for (let k = 1; k < 9; k++) {
    const yy = top - (top - peak) * (k / 9);
    g.lineStyle(1, SLATE_DARK, 0.7); g.lineBetween(x0 - 10 + k * 3.5, yy, x0 + w + 10 - k * 3.5, yy);
  }
  for (let i = 0; i < 26; i++) { g.fillStyle(rng() < 0.5 ? SLATE_LIT : SLATE_DARK, 0.4); g.fillRect(x0 + rng() * w, peak + rng() * (top - peak), 6, 2); }
  for (let i = 0; i < n; i++) {
    if (i % 2) continue;
    const dx = x0 + bw * (i + 0.5), dy = top - (top - peak) * 0.4;
    g.fillStyle(WASH, 1); g.fillRect(dx - 9, dy - 12, 18, 14);
    leaded(g, dx - 6, dy - 9, 12, 9, 0.7);
    g.fillStyle(SLATE_DARK, 1); g.fillTriangle(dx - 12, dy - 11, dx + 12, dy - 11, dx, dy - 22);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 + 20, peak - 3, w - 40, 5);
  // Snow along the ridge.
  g.fillStyle(SNOW, 0.8); g.fillRect(x0 + 24, peak - 5, w - 48, 3);
  // The bell-cote at the east end: two posts, a little roof, a bell.
  const bx = x0 + w - 50;
  g.fillStyle(SETT, 1); g.fillRect(bx - 14, peak - 40, 5, 38); g.fillRect(bx + 9, peak - 40, 5, 38);
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(bx - 20, peak - 38, bx + 20, peak - 38, bx, peak - 56);
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(bx - 8, peak - 14, bx + 8, peak - 14, bx, peak - 32);
  g.fillStyle(GILT, 1); g.fillEllipse(bx, peak - 15, 18, 6); g.fillCircle(bx, peak - 30, 3);
}

/**
 * The paper mill: a stone ground storey with arched culverts where the race runs under, the vat
 * room's lit window, a timber upper storey of louvred drying-loft slats (the sheets dry inside on
 * the wind), a hoist beam with a bale of rags swinging from it, and a tall roof. The water-wheel
 * turns beside it in `waterWheel`, drawn live.
 */
export function paperMill(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.1, 26);
  const h1 = h * 0.42, h2 = h * 0.58;
  // Stone storey.
  g.fillStyle(SETT_DARK, 1); g.fillRect(x0 - 3, y - h1, w + 6, h1);
  for (let cy = y - h1 + 2; cy < y; cy += 11) {
    for (let cx = x0 - 3 + ((cy / 11) % 2) * 10; cx < x0 + w; cx += 20) {
      g.fillStyle(rng() < 0.5 ? SETT : mixC(SETT, SETT_DARK, 0.4), 1); g.fillRect(cx + 1, cy + 1, 18, 9);
    }
  }
  // The culvert arch on the race side, dark water under it.
  g.fillStyle(0x15181a, 1); g.fillRect(x0 + w - 70, y - h1 * 0.55, 56, h1 * 0.55);
  g.beginPath(); g.arc(x0 + w - 42, y - h1 * 0.55, 28, Math.PI, 0, false); g.fillPath();
  g.lineStyle(3, SETT_LIT, 1); g.beginPath(); g.arc(x0 + w - 42, y - h1 * 0.55, 30, Math.PI, 0, false); g.strokePath();
  g.fillStyle(RACE, 0.8); g.fillRect(x0 + w - 70, y - 10, 56, 10);
  // Vat-room window, steamy and lit; the door with a rag-bale beside it.
  leaded(g, x0 + 30, y - h1 * 0.8, 46, h1 * 0.5, 0.75);
  g.fillStyle(0xffffff, 0.12); g.fillEllipse(x0 + 53, y - h1 * 0.85, 60, 18);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 + w * 0.42, y - h1 * 0.78, 30, h1 * 0.78);
  g.fillStyle(OAK, 1); g.fillRect(x0 + w * 0.42 + 2, y - h1 * 0.76, 26, h1 * 0.76);
  // Timber storey: louvred slats.
  const uy = y - h1 - h2;
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 - 8, uy, w + 16, h2);
  for (let ly = uy + 6; ly < y - h1 - 4; ly += 7) {
    g.fillStyle(OAK_LIT, 1); g.fillRect(x0 - 4, ly, w + 8, 3);
    g.fillStyle(0x1a120c, 1); g.fillRect(x0 - 4, ly + 3, w + 8, 2);
  }
  // Glimpses of hung sheets between slats.
  for (let i = 0; i < 9; i++) { g.fillStyle(PAPER, 0.75); g.fillRect(x0 + 10 + i * (w - 20) / 9, uy + 14 + (i % 3) * 7, 10, 2); }
  for (let px = x0 - 8; px <= x0 + w + 8; px += (w + 16) / 5) { g.fillStyle(OAK, 1); g.fillRect(px - 3, uy, 6, h2); }
  // Roof.
  const peak = uy - h * 0.55;
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x0 - 22, uy + 2, x0 + w + 22, uy + 2, x, peak);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 18, uy, x0 + w + 18, uy, x, peak + 3);
  for (let k = 1; k < 8; k++) {
    const t = k / 8, yy = uy - (uy - peak) * t, hw = (w / 2 + 18) * (1 - t);
    g.lineStyle(1, SLATE_DARK, 0.8); g.lineBetween(x - hw, yy, x + hw, yy);
  }
  g.fillStyle(SNOW, 0.8); g.fillTriangle(x - 30, peak + 22, x + 30, peak + 22, x, peak + 4);
  // Hoist beam with a swinging rag bale.
  const hx = x0 + 18, hy = uy + 10;
  g.fillStyle(OAK_DARK, 1); g.fillRect(hx - 34, hy, 40, 7);
  g.lineStyle(1.5, 0x3a3428, 1); g.lineBetween(hx - 30, hy + 7, hx - 30, hy + 44);
  g.fillStyle(0x8a7a64, 1); g.fillEllipse(hx - 30, hy + 54, 26, 22);
  for (let i = 0; i < 5; i++) { g.fillStyle([RED, 0x4a6a9a, PAPER, 0x6a8a4a, GILT][i], 0.8); g.fillEllipse(hx - 38 + i * 4, hy + 50 + (i % 2) * 6, 6, 4); }
  g.lineStyle(1.5, 0x3a3428, 1); g.lineBetween(hx - 40, hy + 46, hx - 20, hy + 62); g.lineBetween(hx - 20, hy + 46, hx - 40, hy + 62);
  // Chimney with a vat-fire.
  g.fillStyle(SETT_DARK, 1); g.fillRect(x + w * 0.18, peak + 20, 16, 40);
  g.fillStyle(SETT, 1); g.fillRect(x + w * 0.18 + 2, peak + 20, 12, 38);
}

/** The mill's undershot water-wheel at hub (x,y), turned to angle `ang`. */
export function waterWheel(g: G, x: number, y: number, r: number, ang: number): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + r * 0.95, r * 2.1, 14);
  // Paddles.
  for (let i = 0; i < 16; i++) {
    const a = ang + (i / 16) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    g.lineStyle(7, OAK_DARK, 1); g.lineBetween(px, py, px + Math.cos(a) * 10, py + Math.sin(a) * 10);
    g.lineStyle(4, OAK_LIT, 1); g.lineBetween(px, py, px + Math.cos(a) * 9, py + Math.sin(a) * 9);
  }
  g.lineStyle(6, OAK_DARK, 1); g.strokeCircle(x, y, r);
  g.lineStyle(3, OAK, 1); g.strokeCircle(x, y, r - 1);
  g.lineStyle(3, OAK_DARK, 1); g.strokeCircle(x, y, r * 0.6);
  for (let i = 0; i < 8; i++) {
    const a = ang + (i / 8) * Math.PI * 2;
    g.lineStyle(4, OAK, 1); g.lineBetween(x + Math.cos(a) * 8, y + Math.sin(a) * 8, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.fillStyle(IRON, 1); g.fillCircle(x, y, 10);
  g.fillStyle(LEAD_LIT, 1); g.fillCircle(x - 2, y - 2, 4);
}

/**
 * A hand-press for hymn sheets: two oak cheeks under a head, the iron screw and the long bar,
 * the platen, the bed on its rails with the tympan raised and a fresh printed sheet in it, and
 * an ink ball on its rest. `s` scales it.
 */
export function handPress(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 90 * s, 18 * s);
  // The bed and rails out in front.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 40 * s, y - 12 * s, 80 * s, 8 * s);
  g.fillStyle(IRON, 1); g.fillRect(x - 40 * s, y - 14 * s, 80 * s, 3 * s);
  // Cheeks.
  for (const k of [-1, 1]) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x + k * 22 * s - 5 * s, y - 92 * s, 10 * s, 86 * s);
    g.fillStyle(OAK, 1); g.fillRect(x + k * 22 * s - 4 * s, y - 92 * s, 7 * s, 86 * s);
  }
  // Head and winter beam.
  g.fillStyle(OAK, 1); g.fillRect(x - 30 * s, y - 98 * s, 60 * s, 12 * s); g.fillRect(x - 26 * s, y - 40 * s, 52 * s, 8 * s);
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 30 * s, y - 98 * s, 60 * s, 3 * s);
  // The screw and platen.
  g.fillStyle(IRON, 1); g.fillRect(x - 4 * s, y - 86 * s, 8 * s, 30 * s);
  for (let k = 0; k < 5; k++) { g.lineStyle(1.5 * s, LEAD_LIT, 1); g.lineBetween(x - 4 * s, y - 84 * s + k * 6 * s, x + 4 * s, y - 81 * s + k * 6 * s); }
  g.fillStyle(LEAD, 1); g.fillRect(x - 16 * s, y - 56 * s, 32 * s, 6 * s);
  // The bar, swung out.
  g.lineStyle(3 * s, IRON, 1); g.lineBetween(x + 4 * s, y - 70 * s, x + 44 * s, y - 62 * s);
  g.fillStyle(OAK_LIT, 1); g.fillCircle(x + 44 * s, y - 62 * s, 4 * s);
  // The tympan, raised, with a printed sheet.
  g.fillStyle(LEAD, 1); g.fillPoints([P(x - 40 * s, y - 14 * s), P(x - 18 * s, y - 14 * s), P(x - 28 * s, y - 46 * s), P(x - 50 * s, y - 46 * s)], true);
  g.fillStyle(PAPER_LIT, 1); g.fillPoints([P(x - 38 * s, y - 17 * s), P(x - 21 * s, y - 17 * s), P(x - 30 * s, y - 43 * s), P(x - 47 * s, y - 43 * s)], true);
  for (let k = 0; k < 5; k++) { g.lineStyle(1, INK, 0.7); g.lineBetween(x - 39 * s + k * 1.2 * s, y - 21 * s - k * 4.5 * s, x - 25 * s - k * 1.6 * s, y - 21 * s - k * 4.5 * s); }
  // Ink ball on its rest.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x + 28 * s, y - 24 * s, 3 * s, 12 * s);
  g.fillStyle(INK, 1); g.fillEllipse(x + 30 * s, y - 26 * s, 12 * s, 9 * s);
  g.fillStyle(INK_SHEEN, 0.6); g.fillEllipse(x + 28 * s, y - 28 * s, 5 * s, 3 * s);
  // Ink smudges on the bed where the forme was beaten.
  for (let i = 0; i < 4; i++) { g.fillStyle(INK, 0.35); g.fillEllipse(x - 30 * s + rng() * 60 * s, y - 9 * s, 6 * s, 2 * s); }
}

/**
 * The Press Hall: a wide timber-and-brick works with an open arcade of three arches, the
 * presses black in the lamplit dark inside, bundles of hymn sheets tied in red tape stacked by
 * the piers, a tall chimney for the ink-boiling and a ventilator ridge along the roof.
 */
export function pressHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.08, 26);
  // Brick wall.
  g.fillStyle(0x6a3a2c, 1); g.fillRect(x0, y - h, w, h);
  for (let cy = y - h + 2; cy < y; cy += 6) {
    for (let cx = x0 + ((cy / 6) % 2) * 6; cx < x0 + w; cx += 12) { g.fillStyle(rng() < 0.4 ? 0x7e4636 : 0x5a3024, 1); g.fillRect(cx, cy, 11, 5); }
  }
  // Three arches open on the dark works.
  const aw = w * 0.22;
  for (let i = 0; i < 3; i++) {
    const ax = x0 + w * (0.2 + i * 0.3);
    const ay = y - h * 0.08, ah = h * 0.62;
    g.fillStyle(0x15121a, 1); g.fillRect(ax - aw / 2, ay - ah, aw, ah);
    g.beginPath(); g.arc(ax, ay - ah, aw / 2, Math.PI, 0, false); g.fillPath();
    g.lineStyle(4, SETT_LIT, 1); g.beginPath(); g.arc(ax, ay - ah, aw / 2 + 2, Math.PI, 0, false); g.strokePath();
    // Lamp glow and a press silhouette inside.
    g.fillStyle(GLOW, 0.22); g.fillCircle(ax + aw * 0.2, ay - ah * 0.8, aw * 0.35);
    g.fillStyle(0x0a080c, 1);
    g.fillRect(ax - aw * 0.3, ay - ah * 0.9, aw * 0.08, ah * 0.9); g.fillRect(ax + aw * 0.12, ay - ah * 0.9, aw * 0.08, ah * 0.9);
    g.fillRect(ax - aw * 0.34, ay - ah * 0.95, aw * 0.58, ah * 0.08);
    g.lineStyle(2, 0x0a080c, 1); g.lineBetween(ax, ay - ah * 0.7, ax + aw * 0.4, ay - ah * 0.62);
    g.fillStyle(GLOW_LIT, 0.8); g.fillCircle(ax + aw * 0.2, ay - ah * 0.8, 2.5);
    // Bundles of sheets in red tape by the pier.
    for (let k = 0; k < 3; k++) {
      const bx = ax + aw / 2 + 10, by = y - 4 - k * 9;
      g.fillStyle(PAPER, 1); g.fillRect(bx - 10, by - 8, 20, 8);
      g.fillStyle(PAPER_DARK, 1); g.fillRect(bx - 10, by - 2, 20, 2);
      g.fillStyle(RED, 1); g.fillRect(bx - 1, by - 8, 2, 8);
    }
  }
  // Cornice and roof with a ventilator ridge.
  g.fillStyle(SETT, 1); g.fillRect(x0 - 6, y - h - 8, w + 12, 10);
  const peak = y - h - 8 - h * 0.45;
  g.fillStyle(SLATE_DARK, 1); g.fillPoints([P(x0 - 10, y - h - 6), P(x0 + w + 10, y - h - 6), P(x0 + w - 30, peak), P(x0 + 30, peak)], true);
  g.fillStyle(SLATE, 1); g.fillPoints([P(x0 - 6, y - h - 8), P(x0 + w + 6, y - h - 8), P(x0 + w - 32, peak + 3), P(x0 + 32, peak + 3)], true);
  for (let k = 1; k < 6; k++) { const yy = y - h - 8 - (h * 0.45) * (k / 6); g.lineStyle(1, SLATE_DARK, 0.8); g.lineBetween(x0 + k * 5, yy, x0 + w - k * 5, yy); }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - w * 0.3, peak - 12, w * 0.6, 12);
  for (let vx = x - w * 0.3 + 4; vx < x + w * 0.3; vx += 10) { g.fillStyle(0x0c0a08, 1); g.fillRect(vx, peak - 9, 5, 6); }
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - w * 0.32, peak - 11, x + w * 0.32, peak - 11, x, peak - 26);
  // The ink-boiling chimney.
  const cx = x0 + w - 40;
  g.fillStyle(0x5a3024, 1); g.fillRect(cx - 10, peak - 70, 20, 80);
  g.fillStyle(0x7e4636, 1); g.fillRect(cx - 8, peak - 70, 6, 80);
  g.fillStyle(SETT_DARK, 1); g.fillRect(cx - 13, peak - 74, 26, 6);
  // A gilt sign of a hand-press over the middle arch.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 30, y - h + 4, 60, 18);
  g.lineStyle(1.5, GILT, 1); g.strokeRect(x - 28, y - h + 6, 56, 14);
  g.fillStyle(GILT, 1); g.fillRect(x - 10, y - h + 9, 3, 9); g.fillRect(x + 7, y - h + 9, 3, 9); g.fillRect(x - 12, y - h + 8, 24, 3);
}

/**
 * The Censor's giant red pen: a dip-pen taller than the office roof, planted nib-down through a
 * cracked plinth at a lean, lacquered red with gilt bands, red ink weeping from the nib into a
 * pool on the stones. Everyone in the court walks round it. Nobody looks at it.
 */
export function giantPen(g: G, x: number, y: number, h: number): void {
  shadow(g, x + h * 0.12, y + 4, h * 0.5, 18, 0.35);
  // The ink pool.
  g.fillStyle(RED_DARK, 0.85); g.fillEllipse(x + 8, y + 4, 92, 22);
  g.fillStyle(RED, 0.75); g.fillEllipse(x + 4, y + 2, 64, 14);
  g.fillStyle(RED_LIT, 0.4); g.fillEllipse(x - 8, y, 20, 4);
  // The plinth, cracked where the nib went in.
  g.fillStyle(SETT_DARK, 1); g.fillRect(x - 40, y - 18, 80, 18);
  g.fillStyle(SETT, 1); g.fillRect(x - 38, y - 22, 76, 14);
  g.fillStyle(SETT_LIT, 1); g.fillRect(x - 38, y - 22, 76, 3);
  g.lineStyle(1.5, SETT_DARK, 1); g.lineBetween(x - 2, y - 20, x - 14, y - 8); g.lineBetween(x - 14, y - 8, x - 26, y - 4); g.lineBetween(x + 2, y - 18, x + 16, y - 10);
  // Lean: the pen goes up and to the right.
  const lean = 0.2;
  const tx = x + Math.sin(lean) * h, ty = y - 20 - Math.cos(lean) * h;
  const ax = Math.cos(lean), ay = Math.sin(lean);
  const at = (t: number, off: number) => P(x + (tx - x) * t + ax * off, y - 20 + (ty - y + 20) * t + ay * off);
  // The nib: a steel lozenge with its slit and breather hole.
  const nibT = 0.22;
  g.fillStyle(LEAD, 1); g.fillPoints([at(0, 0), at(nibT, -16), at(nibT + 0.03, -14), at(nibT + 0.03, 14), at(nibT, 16)], true);
  g.fillStyle(LEAD_LIT, 1); g.fillPoints([at(0, 0), at(nibT, -16), at(nibT + 0.03, -14), at(nibT * 0.4, 0)], true);
  { const a0 = at(0.01, 0), a1 = at(nibT * 0.7, 0); g.lineStyle(2, INK, 1); g.lineBetween(a0.x, a0.y, a1.x, a1.y); }
  { const c = at(nibT * 0.72, 0); g.fillStyle(INK, 1); g.fillCircle(c.x, c.y, 4); }
  { const c = at(0.02, 0); g.fillStyle(RED, 1); g.fillCircle(c.x, c.y, 4); }
  // The ferrule and the holder, lacquered red, banded in gilt, tapering to its end.
  g.fillStyle(GILT_DARK, 1); g.fillPoints([at(nibT + 0.02, -17), at(nibT + 0.08, -18), at(nibT + 0.08, 18), at(nibT + 0.02, 17)], true);
  g.fillStyle(GILT, 1); g.fillPoints([at(nibT + 0.02, -17), at(nibT + 0.08, -18), at(nibT + 0.08, -6), at(nibT + 0.02, -6)], true);
  g.fillStyle(RED_DARK, 1); g.fillPoints([at(nibT + 0.08, -16), at(1, -9), at(1.02, 0), at(1, 9), at(nibT + 0.08, 16)], true);
  g.fillStyle(RED, 1); g.fillPoints([at(nibT + 0.08, -15), at(1, -8), at(1.01, -1), at(nibT + 0.08, 2)], true);
  g.fillStyle(RED_LIT, 0.55); g.fillPoints([at(nibT + 0.1, -12), at(0.95, -6), at(0.95, -4), at(nibT + 0.1, -8)], true);
  for (const t of [0.5, 0.78]) { g.fillStyle(GILT, 1); g.fillPoints([at(t, -14), at(t + 0.025, -14), at(t + 0.025, 14), at(t, 14)], true); }
  // Drips running down the plinth.
  for (const dx of [-8, 6, 18]) { g.fillStyle(RED, 0.9); g.fillRect(x + dx, y - 20, 3, 10 + Math.abs(dx) * 0.4); g.fillCircle(x + dx + 1.5, y - 9 + Math.abs(dx) * 0.4, 2.4); }
}

/**
 * The Censor's Office: a narrow, severe house of soot-dark brick, barred slit windows, an
 * iron-banded door under the red seal of the struck line, a brass letter-slot marked DEAD
 * LETTERS, wire bins of confiscated sheets on the step, and a chimney that burns what is struck.
 */
export function censorsOffice(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.1, 24);
  g.fillStyle(0x3a2a2a, 1); g.fillRect(x0, y - h, w, h);
  for (let cy = y - h + 1; cy < y; cy += 6) {
    for (let cx = x0 + ((cy / 6) % 2) * 7; cx < x0 + w; cx += 14) { g.fillStyle(rng() < 0.3 ? 0x4a3434 : 0x2e2222, 1); g.fillRect(cx, cy, 13, 5); }
  }
  // Stone quoins.
  for (let qy = y - h; qy < y; qy += 16) { g.fillStyle(SETT_LIT, 1); g.fillRect(x0 - 3, qy, 12, 8); g.fillRect(x0 + w - 9, qy + 8, 12, 8); }
  // Slit windows, barred, one floor and the next.
  for (const row of [0.25, 0.6]) {
    for (let i = 0; i < 6; i++) {
      if (row > 0.5 && (i === 2 || i === 3)) continue;
      const wx = x0 + w * (0.1 + i * 0.16), wy = y - h + h * row;
      g.fillStyle(SETT, 1); g.fillRect(wx - 7, wy - 3, 14, h * 0.2 + 6);
      g.fillStyle(row < 0.5 ? mixC(0x221a10, GLOW, 0.35) : 0x14101a, 1); g.fillRect(wx - 5, wy, 10, h * 0.2);
      g.lineStyle(1.2, IRON, 1); for (let b = -3; b <= 3; b += 3) g.lineBetween(wx + b, wy, wx + b, wy + h * 0.2);
    }
  }
  // The door and the seal over it.
  g.fillStyle(SETT, 1); g.fillRect(x - 24, y - h * 0.42, 48, h * 0.42);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 19, y - h * 0.38, 38, h * 0.38);
  for (let k = 0; k < 4; k++) { g.fillStyle(IRON, 1); g.fillRect(x - 19, y - h * 0.36 + k * h * 0.09, 38, 3); }
  g.fillStyle(IRON, 1); g.fillCircle(x + 12, y - h * 0.2, 2.5);
  const sx = x, sy = y - h * 0.5;
  g.fillStyle(RED_DARK, 1); g.fillCircle(sx, sy, 15);
  g.fillStyle(RED, 1); g.fillCircle(sx, sy, 13);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(RED, 1); g.fillCircle(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14, 2.5); }
  g.lineStyle(1.5, RED_LIT, 1); g.strokeCircle(sx, sy, 9);
  strikeLine(g, sx - 10, sy + 5, sx + 10, sy - 5, 3);
  // The DEAD LETTERS slot: a brass plate, an envelope engraved on it.
  const lx = x0 + w * 0.2, ly = y - h * 0.3;
  g.fillStyle(GILT_DARK, 1); g.fillRect(lx - 14, ly - 9, 28, 18);
  g.fillStyle(GILT, 1); g.fillRect(lx - 13, ly - 8, 26, 16);
  g.fillStyle(0x100c0a, 1); g.fillRect(lx - 10, ly - 1, 20, 3);
  g.lineStyle(1, GILT_DARK, 1); g.strokeRect(lx - 7, ly - 7, 14, 5); g.lineBetween(lx - 7, ly - 7, lx, ly - 4); g.lineBetween(lx + 7, ly - 7, lx, ly - 4);
  // Wire bins on the step, overflowing with struck sheets.
  for (const bx of [x0 + w * 0.72, x0 + w * 0.86]) {
    for (let i = 0; i < 6; i++) sheet(g, bx - 8 + (i % 3) * 7, y - 26 - Math.floor(i / 3) * 6, 9, 11, (i - 3) * 0.3, PAPER);
    g.lineStyle(1, LEAD, 1);
    g.strokeRect(bx - 14, y - 24, 28, 22);
    for (let k = -10; k < 14; k += 5) g.lineBetween(bx + k, y - 24, bx + k, y - 2);
    g.lineBetween(bx - 14, y - 13, bx + 14, y - 13);
    strikeLine(g, bx - 10, y - 30, bx + 6, y - 32, 1.5);
  }
  // Parapet and a burning chimney.
  g.fillStyle(SETT_DARK, 1); g.fillRect(x0 - 6, y - h - 12, w + 12, 12);
  for (let px = x0 - 4; px < x0 + w; px += 14) { g.fillStyle(SETT, 1); g.fillRect(px, y - h - 20, 9, 9); }
  const cx = x0 + w * 0.7;
  g.fillStyle(0x2e2222, 1); g.fillRect(cx - 10, y - h - 64, 20, 54);
  g.fillStyle(SETT, 1); g.fillRect(cx - 12, y - h - 68, 24, 6);
  g.fillStyle(0xff8a3a, 0.55); g.fillEllipse(cx, y - h - 70, 14, 6);
}

/**
 * Prince Folio's Bindery — the hall built as a great book standing on its tail. The front is
 * the spine: oxblood leather in raised bands picked out in gilt, a lettered title-panel, the
 * head-cap rounding over the top. The two boards stand angled back to either side like wings,
 * corner-pieces of gilt at their edges, the cream page-block showing between them along the
 * top. A red silk bookmark ribbon hangs from the head of the spine to the step; the doors are
 * set into the spine's foot under a gilt clasp.
 */
export function bindery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.15, 34);
  const sw = w * 0.34;
  const s0 = x - sw / 2, s1 = x + sw / 2;
  const top = y - h;
  // The boards, angled back as wings.
  for (const k of [-1, 1]) {
    const inner = k < 0 ? s0 : s1, outer = x + k * w / 2;
    const back = 28;
    g.fillStyle(LEATHER_DARK, 1);
    g.fillPoints([P(inner, y), P(outer, y - back), P(outer, top + back * 0.6 - 10), P(inner, top + 14)], true);
    g.fillStyle(LEATHER, 1);
    g.fillPoints([P(inner, y - 3), P(outer - k * 4, y - back - 1), P(outer - k * 4, top + back * 0.6 - 6), P(inner, top + 18)], true);
    // Blind-tooled frame lines on the board.
    g.lineStyle(1.5, dim(LEATHER, 0.35), 1);
    g.strokePoints([P(inner + k * 12, y - 16), P(outer - k * 16, y - back - 10), P(outer - k * 16, top + back * 0.6 + 8), P(inner + k * 12, top + 32)], true);
    g.lineStyle(1, GILT, 0.6);
    g.strokePoints([P(inner + k * 18, y - 24), P(outer - k * 22, y - back - 16), P(outer - k * 22, top + back * 0.6 + 14), P(inner + k * 18, top + 38)], true);
    // Gilt corner-pieces.
    for (const [cx, cy] of [[outer - k * 6, y - back - 4], [outer - k * 6, top + back * 0.6 - 4]] as [number, number][]) {
      g.fillStyle(GILT_DARK, 1); g.fillTriangle(cx, cy, cx - k * 22, cy, cx, cy + (cy > y - 60 ? -22 : 22));
      g.fillStyle(GILT, 1); g.fillTriangle(cx, cy, cx - k * 16, cy, cx, cy + (cy > y - 60 ? -16 : 16));
    }
    // A lit window in each board — the binders at work.
    const wx = (inner + outer) / 2, wy = y - h * 0.5 - (k < 0 ? 4 : 4);
    g.fillStyle(LEATHER_DARK, 1); g.fillRect(wx - 16, wy - 26, 32, 46);
    g.fillStyle(mixC(0x3a2010, GLOW, 0.8), 1); g.fillRect(wx - 12, wy - 22, 24, 38);
    g.beginPath(); g.arc(wx, wy - 22, 12, Math.PI, 0, false); g.fillPath();
    g.lineStyle(1, LEATHER_DARK, 1); g.lineBetween(wx, wy - 34, wx, wy + 16); g.lineBetween(wx - 12, wy - 4, wx + 12, wy - 4);
    // The page block, cream and layered, along the top between boards and spine.
    g.fillStyle(PAPER, 1);
    g.fillPoints([P(inner, top + 14), P(outer - k * 4, top + back * 0.6 - 10), P(outer - k * 10, top + back * 0.6 - 22), P(inner, top + 2)], true);
    for (let i = 1; i < 5; i++) {
      g.lineStyle(1, PAPER_DARK, 0.9);
      g.lineBetween(inner, top + 2 + i * 2.6, outer - k * (10 - i), top + back * 0.6 - 22 + i * 2.6);
    }
    g.fillStyle(GILT, 0.7);
    g.fillPoints([P(inner, top + 2), P(outer - k * 10, top + back * 0.6 - 22), P(outer - k * 10, top + back * 0.6 - 20), P(inner, top + 4)], true);
  }
  // The spine.
  g.fillStyle(LEATHER_DARK, 1); g.fillRect(s0 - 3, top - 4, sw + 6, h + 4);
  g.fillStyle(LEATHER, 1); g.fillRect(s0, top, sw, h);
  g.fillStyle(LEATHER_LIT, 0.6); g.fillRect(s0 + sw * 0.18, top, sw * 0.16, h);
  g.fillStyle(LEATHER_DARK, 0.5); g.fillRect(s1 - sw * 0.14, top, sw * 0.14, h);
  // Grain.
  for (let i = 0; i < 60; i++) { g.fillStyle(rng() < 0.5 ? LEATHER_DARK : LEATHER_LIT, 0.3); g.fillRect(s0 + rng() * sw, top + rng() * h, 3, 1); }
  // Raised bands with gilt fillets.
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const by = top + 24 + i * (h * 0.16);
    g.fillStyle(LEATHER_DARK, 1); g.fillRect(s0 - 4, by, sw + 8, 10);
    g.fillStyle(LEATHER_LIT, 1); g.fillRect(s0 - 4, by + 1, sw + 8, 4);
    g.fillStyle(GILT, 1); g.fillRect(s0 - 4, by - 3, sw + 8, 2); g.fillRect(s0 - 4, by + 11, sw + 8, 2);
    if (i < bands - 1) fleuron(g, x - 4, by + 24, 1.1, GILT, 0.9);
  }
  // The title panel: a red label, gilt-ruled, with two lines of gilt lettering.
  const ty = top + 24 + h * 0.16 * 0.5 + 6;
  g.fillStyle(RED_DARK, 1); g.fillRect(s0 + 8, ty - 1, sw - 16, 24);
  g.fillStyle(RED, 1); g.fillRect(s0 + 9, ty, sw - 18, 22);
  g.lineStyle(1, GILT, 1); g.strokeRect(s0 + 11, ty + 2, sw - 22, 18);
  for (let k = 0; k < 2; k++) {
    let lx = s0 + 16;
    while (lx < s1 - 18) { const ww = 3 + rng() * 5; g.fillStyle(GILT_LIT, 1); g.fillRect(lx, ty + 6 + k * 6, ww, 3); lx += ww + 2; }
  }
  // Head-cap.
  g.fillStyle(LEATHER_DARK, 1); g.fillEllipse(x, top, sw + 8, 22);
  g.fillStyle(LEATHER, 1); g.fillEllipse(x, top - 2, sw + 2, 16);
  g.fillStyle(PAPER, 1); g.fillEllipse(x, top - 6, sw * 0.7, 6);
  // The bookmark ribbon from the head to the step.
  const rx = x + sw * 0.32;
  g.fillStyle(RED_DARK, 1); g.fillRect(rx - 4, top - 6, 9, h - 4);
  g.fillStyle(RED, 1); g.fillRect(rx - 3, top - 6, 6, h - 4);
  g.fillStyle(RED_LIT, 0.5); g.fillRect(rx - 2, top - 6, 2, h - 4);
  g.fillStyle(RED, 1); g.fillTriangle(rx - 4, y - 10, rx + 5, y - 10, rx - 4, y + 2); g.fillTriangle(rx - 4, y - 10, rx + 5, y - 10, rx + 5, y + 2);
  // The doors at the foot of the spine, under a gilt clasp.
  const dw = sw * 0.6, dh = h * 0.28;
  g.fillStyle(LEATHER_DARK, 1); g.fillRect(x - dw / 2 - 4, y - dh - 4, dw + 8, dh + 4);
  g.beginPath(); g.arc(x, y - dh - 4, dw / 2 + 4, Math.PI, 0, false); g.fillPath();
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
  g.beginPath(); g.arc(x, y - dh, dw / 2, Math.PI, 0, false); g.fillPath();
  g.lineStyle(1.5, GILT_DARK, 1); g.lineBetween(x, y - dh - dw / 2, x, y);
  g.fillStyle(GILT, 1); g.fillRect(x - dw / 2 - 6, y - dh * 0.6, dw + 12, 7);
  g.fillStyle(GILT_LIT, 1); g.fillRect(x - 6, y - dh * 0.6 - 3, 12, 13);
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y - dh * 0.6 + 3, 2.5);
  // Steps and two standing lanterns.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? SETT : SETT_LIT, 1); g.fillRect(x - dw / 2 - 18 - k * 8, y - 6 + k * 4, dw + 36 + k * 16, 5); }
  for (const k of [-1, 1]) {
    const lx = x + k * (dw / 2 + 32);
    g.fillStyle(IRON, 1); g.fillRect(lx - 2, y - 46, 4, 46);
    paperLantern(g, lx, y - 54, 8, 0.9);
  }
}

/**
 * The Lectern of Proof Square: a stepped stone plinth, a brass column, a brass eagle with its
 * wings spread and on them the Book of the Score lying open at today's page — read aloud at
 * each Hour, the words the whole isle will sing.
 */
export function lectern(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 4, 90 * s, 22 * s);
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? SETT : SETT_LIT, 1);
    g.fillEllipse(x, y - k * 6 * s, (90 - k * 18) * s, (26 - k * 5) * s);
    g.fillStyle(SETT_DARK, 0.6); g.fillEllipse(x, y - k * 6 * s + 3 * s, (90 - k * 18) * s, (12 - k * 2) * s);
  }
  // The column.
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 6 * s, y - 70 * s, 12 * s, 54 * s);
  g.fillStyle(GILT, 1); g.fillRect(x - 4 * s, y - 70 * s, 5 * s, 54 * s);
  for (let k = 0; k < 3; k++) { g.fillStyle(GILT_LIT, 1); g.fillEllipse(x, y - 24 * s - k * 18 * s, 18 * s, 6 * s); }
  // The eagle: body, spread wings carrying the book, a hooked head.
  const ey = y - 80 * s;
  for (const k of [-1, 1]) {
    for (let f = 0; f < 5; f++) {
      g.fillStyle(f % 2 ? GILT : GILT_DARK, 1);
      g.fillTriangle(x, ey, x + k * (34 - f * 4) * s, ey - (6 - f * 3) * s, x + k * (28 - f * 5) * s, ey + (8 + f) * s);
    }
  }
  g.fillStyle(GILT, 1); g.fillEllipse(x, ey + 4 * s, 14 * s, 22 * s);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x, ey - 10 * s, 5 * s);
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x + 3 * s, ey - 10 * s, x + 9 * s, ey - 7 * s, x + 3 * s, ey - 6 * s);
  // The open Book.
  const by = ey - 14 * s;
  g.fillStyle(LEATHER_DARK, 1); g.fillPoints([P(x - 36 * s, by + 2 * s), P(x, by + 6 * s), P(x + 36 * s, by + 2 * s), P(x + 34 * s, by - 18 * s), P(x, by - 14 * s), P(x - 34 * s, by - 18 * s)], true);
  g.fillStyle(PAPER_LIT, 1); g.fillPoints([P(x - 33 * s, by), P(x, by + 3 * s), P(x, by - 15 * s), P(x - 31 * s, by - 18 * s)], true);
  g.fillStyle(PAPER, 1); g.fillPoints([P(x + 33 * s, by), P(x, by + 3 * s), P(x, by - 15 * s), P(x + 31 * s, by - 18 * s)], true);
  for (let k = 0; k < 4; k++) {
    for (const side of [-1, 1]) {
      g.lineStyle(1, INK, 0.6);
      g.lineBetween(x + side * 4 * s, by - 12 * s + k * 3.5 * s, x + side * (26 - rng() * 6) * s, by - 14 * s + k * 3.5 * s);
    }
  }
  // Stave lines and a few notes on the right page — it is a Score.
  g.fillStyle(INK, 0.8); g.fillCircle(x + 12 * s, by - 9 * s, 1.4 * s); g.fillCircle(x + 20 * s, by - 6 * s, 1.4 * s);
  g.lineStyle(1.5, RED, 1); g.lineBetween(x, by - 16 * s, x + 2 * s, by + 12 * s);
}

/** The Galley: a roofed notice-board where the day's verses are posted — half of every line struck red. */
export function noticeBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 110, 18);
  for (const k of [-1, 1]) { g.fillStyle(OAK_DARK, 1); g.fillRect(x + k * 46 - 4, y - 84, 8, 84); }
  g.fillStyle(OAK, 1); g.fillRect(x - 50, y - 78, 100, 56);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 46, y - 74, 92, 48);
  for (let i = 0; i < 6; i++) {
    const sx = x - 36 + (i % 3) * 30, sy = y - 62 + Math.floor(i / 3) * 24;
    sheet(g, sx, sy, 22, 20, (rng() - 0.5) * 0.12, i === 4 ? PAPER_OLD : PAPER_LIT);
    for (let l = 0; l < 3; l++) if (rng() < 0.65) strikeLine(g, sx - 9, sy - 5 + l * 5, sx + 9, sy - 5 + l * 5, 1.2);
    g.fillStyle(GILT, 1); g.fillCircle(sx, sy - 9, 1.5);
  }
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - 60, y - 80, x + 60, y - 80, x, y - 104);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 54, y - 82, x + 54, y - 82, x, y - 100);
  g.fillStyle(SNOW, 0.7); g.fillTriangle(x - 16, y - 92, x + 16, y - 92, x, y - 100);
}

/** A stationer's stall: a trestle of reams and quills in pots and ink bottles under a striped awning. */
export function stall(g: G, x: number, y: number, rng: () => number, stripe = RED): void {
  shadow(g, x, y + 3, 120, 18);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 50, y - 30, 100, 8); g.fillRect(x - 46, y - 22, 5, 22); g.fillRect(x + 41, y - 22, 5, 22);
  g.fillStyle(OAK, 1); g.fillRect(x - 50, y - 32, 100, 4);
  for (let i = 0; i < 4; i++) {
    const rx = x - 40 + i * 14;
    for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? PAPER : PAPER_LIT, 1); g.fillRect(rx - 6, y - 38 - k * 4, 12, 4); }
    g.fillStyle(RED, 1); g.fillRect(rx - 1, y - 46, 2, 12);
  }
  for (let i = 0; i < 3; i++) {
    const px = x + 14 + i * 12;
    g.fillStyle(i === 1 ? INK_BLUE : INK, 1); g.fillRect(px - 4, y - 42, 8, 10);
    g.fillStyle(LEAD_LIT, 0.6); g.fillRect(px - 3, y - 41, 2, 8);
    if (i !== 1) quill(g, px, y - 42, 22, -1.4 + i * 0.3);
  }
  // Rolled scrolls.
  for (let i = 0; i < 3; i++) { g.fillStyle(PAPER_OLD, 1); g.fillEllipse(x - 6 + i * 6, y - 26, 5, 5); }
  // Awning.
  for (const k of [-1, 1]) { g.fillStyle(OAK_DARK, 1); g.fillRect(x + k * 54 - 2, y - 82, 4, 82); }
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 2 ? stripe : PAPER_LIT, 1);
    g.fillPoints([P(x - 60 + i * 15, y - 84), P(x - 45 + i * 15, y - 84), P(x - 47 + i * 15, y - 70), P(x - 62 + i * 15, y - 70)], true);
    g.fillTriangle(x - 62 + i * 15, y - 70, x - 47 + i * 15, y - 70, x - 54.5 + i * 15, y - 64);
  }
  // Loose sheets blown against the trestle legs.
  for (let i = 0; i < 3; i++) sheet(g, x - 44 + rng() * 88, y - 2, 9, 7, rng() * 3, PAPER, 0.8);
}

/** Drying lines in a mill yard: posts, two lines, sheets pegged in rows to dry in the wind. */
export function dryingLines(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 2, w, 14, 0.2);
  for (const k of [-1, 1]) {
    const px = x + k * w / 2;
    g.fillStyle(OAK_DARK, 1); g.fillRect(px - 3, y - 70, 6, 70);
    g.fillStyle(OAK, 1); g.fillRect(px - 10, y - 70, 20, 4); g.fillRect(px - 10, y - 50, 20, 4);
  }
  for (const ly of [y - 68, y - 48]) {
    g.lineStyle(1, 0x3a3428, 1);
    g.beginPath(); g.moveTo(x - w / 2, ly);
    for (let i = 1; i <= 12; i++) { const t = i / 12; g.lineTo(x - w / 2 + w * t, ly + Math.sin(t * Math.PI) * 6); }
    g.strokePath();
    for (let sx = x - w / 2 + 14; sx < x + w / 2 - 10; sx += 20 + rng() * 4) {
      const t = (sx - (x - w / 2)) / w, sy = ly + Math.sin(t * Math.PI) * 6;
      g.fillStyle(rng() < 0.2 ? PAPER_OLD : PAPER_LIT, 0.95); g.fillRect(sx - 7, sy, 14, 16);
      g.fillStyle(PAPER_DARK, 0.6); g.fillRect(sx - 7, sy + 14, 14, 2);
      g.fillStyle(OAK_LIT, 1); g.fillRect(sx - 1, sy - 2, 2, 4);
    }
  }
}

/** A rag-picker's handcart heaped with the rags paper is made from. */
export function ragCart(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 80, 14);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 32, y - 26, 64, 14);
  g.fillStyle(OAK, 1); g.fillRect(x - 32, y - 28, 64, 4);
  const cols = [RED, 0x4a6a9a, PAPER, 0x6a8a4a, GILT, 0x8a5a8a, PAPER_OLD];
  for (let i = 0; i < 16; i++) { g.fillStyle(cols[i % cols.length], 0.95); g.fillEllipse(x - 26 + rng() * 52, y - 30 - rng() * 14, 12 + rng() * 6, 7 + rng() * 4); }
  g.lineStyle(3, OAK_DARK, 1); g.lineBetween(x + 30, y - 22, x + 54, y - 12);
  g.fillStyle(OAK_DARK, 1); g.fillCircle(x - 14, y - 8, 10);
  g.fillStyle(OAK, 1); g.fillCircle(x - 14, y - 8, 8);
  g.lineStyle(1.5, OAK_DARK, 1); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; g.lineBetween(x - 14 - Math.cos(a) * 7, y - 8 - Math.sin(a) * 7, x - 14 + Math.cos(a) * 7, y - 8 + Math.sin(a) * 7); }
}

/** A stack of bound books, spines out, gilt bands catching the light. */
export function bookStack(g: G, x: number, y: number, n: number, rng: () => number): void {
  shadow(g, x, y + 2, 40, 10);
  const cols = [LEATHER, 0x2a3a5a, 0x3a5a3a, CALF, RED_DARK];
  let by = y;
  for (let i = 0; i < n; i++) {
    const bw = 26 + rng() * 8, bh = 6 + rng() * 3, off = (rng() - 0.5) * 6;
    const c = cols[Math.floor(rng() * cols.length)];
    g.fillStyle(PAPER, 1); g.fillRect(x - bw / 2 + off + 2, by - bh, bw - 2, bh);
    g.fillStyle(c, 1); g.fillRect(x - bw / 2 + off, by - bh, 4, bh); g.fillRect(x - bw / 2 + off, by - bh, bw, 1.5); g.fillRect(x - bw / 2 + off, by - 1.5, bw, 1.5);
    g.fillStyle(GILT, 1); g.fillRect(x - bw / 2 + off + 0.5, by - bh + 2, 3, 1);
    by -= bh;
  }
}

/** A compositor's type cabinet: shallow drawers, one pulled out to show its little sorts of lead. */
export function typeCase(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 60, 12);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 26, y - 58, 52, 58);
  for (let k = 0; k < 7; k++) {
    g.fillStyle(OAK, 1); g.fillRect(x - 24, y - 56 + k * 8, 48, 6);
    g.fillStyle(GILT, 1); g.fillRect(x - 3, y - 54 + k * 8, 6, 2);
  }
  // The pulled drawer, seen from above, sorts in their boxes.
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 30, y - 34, 60, 16);
  for (let cx = x - 28; cx < x + 28; cx += 7) for (let cy = y - 32; cy < y - 20; cy += 6) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(cx, cy, 6, 5);
    for (let k = 0; k < 2; k++) { g.fillStyle(rng() < 0.5 ? LEAD_LIT : LEAD, 1); g.fillRect(cx + 1 + k * 2.5, cy + 1, 1.5, 3); }
  }
}

/** A stone pulp vat with grey rag-pulp in it and a mould-and-deckle resting on the rim. */
export function pulpVat(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 80, 16);
  g.fillStyle(SETT_DARK, 1); g.fillEllipse(x, y - 14, 76, 32);
  g.fillStyle(SETT, 1); g.fillEllipse(x, y - 18, 72, 26);
  g.fillStyle(0xb8b4a8, 1); g.fillEllipse(x, y - 18, 60, 18);
  g.fillStyle(0xd4d0c4, 0.7); for (let i = 0; i < 6; i++) g.fillEllipse(x - 20 + i * 8, y - 18 + (i % 2) * 3, 10, 4);
  // The mould: a wire-faced frame with a fresh sheet on it.
  g.fillStyle(OAK, 1); g.fillPoints([P(x + 10, y - 32), P(x + 44, y - 30), P(x + 46, y - 14), P(x + 12, y - 16)], true);
  g.fillStyle(PAPER, 0.95); g.fillPoints([P(x + 13, y - 30), P(x + 42, y - 28.5), P(x + 43.5, y - 16.5), P(x + 14.5, y - 18)], true);
  g.lineStyle(0.6, PAPER_DARK, 0.7); for (let k = 0; k < 6; k++) g.lineBetween(x + 15 + k * 5, y - 29, x + 16 + k * 5, y - 17);
}

/** The court's waystone: a standing stone cut as a closed book, brass clasps, a glowing ex-libris on its board. */
export function librettoWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 64, 16);
  g.fillStyle(SETT_DARK, 1); g.fillRect(x - 30, y - 10, 60, 10);
  g.fillStyle(SETT, 1); g.fillRect(x - 28, y - 12, 56, 6);
  // The book: boards and page edge.
  g.fillStyle(SETT_DARK, 1); g.fillRect(x - 22, y - 86, 44, 76);
  g.fillStyle(SETT_LIT, 1); g.fillRect(x - 20, y - 86, 38, 74);
  g.fillStyle(PAPER_DARK, 1); g.fillRect(x + 16, y - 82, 5, 68);
  for (let k = 0; k < 10; k++) { g.lineStyle(0.6, SETT_DARK, 0.7); g.lineBetween(x + 16, y - 80 + k * 7, x + 21, y - 80 + k * 7); }
  g.fillStyle(SETT, 1); g.fillRect(x - 22, y - 86, 6, 76);
  // Clasps.
  for (const cy of [y - 70, y - 30]) { g.fillStyle(GILT_DARK, 1); g.fillRect(x + 12, cy - 4, 14, 8); g.fillStyle(GILT, 1); g.fillRect(x + 12, cy - 3, 12, 5); }
  // The ex-libris: a quill in a ring.
  glow(g, x - 2, y - 50, 22, 0x9ad0ff, 0.06, 3);
  g.lineStyle(2, 0x9ad0ff, 0.9); g.strokeCircle(x - 2, y - 50, 12);
  quill(g, x - 9, y - 43, 18, -0.8, 0xd8f0ff);
  g.fillStyle(SNOW, 0.8); g.fillRect(x - 22, y - 89, 44, 4);
}

/**
 * The Proving Stage — a little open-air stage of planks where new verses are read aloud to the
 * Censor before they may be copied, with a shell-hooded prompter's box at its lip, a painted
 * backcloth of a stave and two paper-lantern footlights.
 */
export function provingStage(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 20);
  const h = 22;
  // Backcloth on two poles.
  for (const k of [-1, 1]) { g.fillStyle(OAK_DARK, 1); g.fillRect(x + k * (w / 2 - 6) - 3, y - h - 110, 6, 110); }
  g.fillStyle(0x3a2a4a, 1); g.fillRect(x - w / 2 + 6, y - h - 104, w - 12, 80);
  for (let k = 0; k < 5; k++) { g.lineStyle(1.5, GILT, 0.7); g.lineBetween(x - w / 2 + 14, y - h - 88 + k * 9, x + w / 2 - 14, y - h - 88 + k * 9); }
  for (let i = 0; i < 7; i++) { const nx = x - w / 2 + 28 + i * (w - 56) / 6, ny = y - h - 86 + ((i * 5) % 5) * 9; g.fillStyle(PAPER_LIT, 0.9); g.fillEllipse(nx, ny, 7, 5); g.lineStyle(1, PAPER_LIT, 0.9); g.lineBetween(nx + 3, ny, nx + 3, ny - 14); }
  g.fillStyle(RED, 1); for (let i = 0; i < 9; i++) g.fillTriangle(x - w / 2 + 6 + i * (w - 12) / 9, y - h - 104, x - w / 2 + 6 + (i + 1) * (w - 12) / 9, y - h - 104, x - w / 2 + 6 + (i + 0.5) * (w - 12) / 9, y - h - 94);
  // The planks.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(OAK, 1); g.fillRect(x - w / 2, y - h - 8, w, 10);
  for (let px = x - w / 2; px < x + w / 2; px += 18) { g.lineStyle(1, OAK_DARK, 0.8); g.lineBetween(px, y - h - 8, px, y - h + 2); }
  for (let i = 0; i < 6; i++) { g.fillStyle(OAK_LIT, 0.4); g.fillRect(x - w / 2 + rng() * w, y - h - 6, 10, 1); }
  // The prompter's box: a hooded shell at the lip.
  g.fillStyle(OAK_DARK, 1); g.fillEllipse(x, y - h - 6, 40, 16);
  g.beginPath(); g.arc(x, y - h - 4, 20, Math.PI, 0, false); g.fillPath();
  g.fillStyle(0x0c0a10, 1); g.beginPath(); g.arc(x, y - h - 4, 15, Math.PI, 0, false); g.fillPath();
  g.fillStyle(GLOW_LIT, 0.8); g.fillCircle(x - 4, y - h - 9, 1.6); g.fillCircle(x + 4, y - h - 9, 1.6);
  // Footlights.
  for (const k of [-1, 1]) paperLantern(g, x + k * (w / 2 - 20), y - h - 14, 6, 0.8);
}

/** A string of paper lanterns slung between two points, sagging; `t` seconds sways it, `on` lights it. */
export function lanternString(g: G, a: Pt, b: Pt, n: number, t: number, on: number, seed = 0): void {
  const sag = Math.hypot(b.x - a.x, b.y - a.y) * 0.08;
  const at = (k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag });
  g.lineStyle(1, 0x2a2420, 0.9);
  g.beginPath(); g.moveTo(a.x, a.y);
  for (let i = 1; i <= 16; i++) { const p = at(i / 16); g.lineTo(p.x, p.y); }
  g.strokePath();
  for (let i = 1; i <= n; i++) {
    const p = at(i / (n + 1));
    const sw = Math.sin(t * 1.3 + i * 1.7 + seed) * 2;
    g.lineStyle(1, 0x2a2420, 0.9); g.lineBetween(p.x, p.y, p.x + sw, p.y + 6);
    const flick = on * (0.85 + Math.sin(t * 7 + i * 3 + seed) * 0.15);
    paperLantern(g, p.x + sw, p.y + 14, 6, flick);
  }
}

/** A string of origami cranes hung down from a line, turning on their threads. */
export function craneString(g: G, x: number, y: number, n: number, t: number, seed = 0): void {
  g.lineStyle(0.8, 0x4a4038, 0.8); g.lineBetween(x, y, x, y + n * 16 + 4);
  for (let i = 0; i < n; i++) {
    const yy = y + 10 + i * 16;
    const a = Math.sin(t * 0.7 + i * 1.3 + seed) * 1.2;
    const col = [PAPER_LIT, RED_LIT, 0x9ab8e8, GILT_LIT, 0xb8e0b0][(i + Math.floor(seed)) % 5];
    crane(g, x, yy, 0.7, Math.cos(a) < 0 ? Math.PI : 0, Math.sin(t * 2 + i) * 0.15, col);
  }
}

// ── Ground ───────────────────────────────────────────────────────────

/** Setts laid in rows like lines of set type, a darker "word gap" every few, inside a rect. */
export function typeSetts(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(SETT_DARK, 1); g.fillRect(x, y, w, h);
  for (let ry = y + 1; ry < y + h - 1; ry += 9) {
    let rx = x + 1 + (rng() * 6);
    while (rx < x + w - 2) {
      const sw = Math.min(x + w - 1 - rx, 8 + rng() * 9);
      g.fillStyle(rng() < 0.15 ? SETT_LIT : rng() < 0.5 ? SETT : mixC(SETT, SETT_DARK, 0.3), 1);
      g.fillRect(rx, ry, sw, 7);
      rx += sw + (rng() < 0.12 ? 6 : 1.5);
    }
  }
}

/** A grass terrace with snow lying in drifts along its edges. */
export function snowyGrass(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(GRASS_DARK, 1); g.fillRect(x, y, w, h);
  for (let i = 0; i < (w * h) / 900; i++) {
    g.fillStyle(rng() < 0.5 ? 0x5a6e44 : 0x4c5e38, 0.6);
    g.fillEllipse(x + rng() * w, y + rng() * h, 20 + rng() * 40, 8 + rng() * 14);
  }
  for (let i = 0; i < (w * h) / 6000; i++) {
    g.fillStyle(SNOW, 0.25 + rng() * 0.3); g.fillEllipse(x + rng() * w, y + rng() * h, 30 + rng() * 60, 8 + rng() * 14);
  }
}

/** The mill-race: a stone-banked channel of rag-clouded water along a polyline. */
export function millRace(g: G, pts: Pt[], w: number): void {
  const st = (pp: Pt[], ww: number, c: number, a = 1) => {
    g.lineStyle(ww, c, a); g.beginPath(); g.moveTo(pp[0].x, pp[0].y);
    for (let i = 1; i < pp.length; i++) g.lineTo(pp[i].x, pp[i].y);
    g.strokePath();
  };
  st(pts, w + 16, SETT_DARK);
  st(pts, w + 10, SETT);
  st(pts, w, RACE_DEEP);
  st(pts, w * 0.7, RACE);
  st(pts, w * 0.2, RACE_LIT, 0.4);
}

/**
 * The Inkwell: the court's pond, black with the run-off of a hundred years of presses, set in a
 * round stone well-head with a brass collar like the neck of a copyist's well. A giant quill
 * lies across its rim; its surface catches a violet-blue sheen.
 */
export function inkwellPond(g: G, x: number, y: number, rx: number, ry: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 6, y + 10, rx * 2 + 40, ry * 2 + 30);
  g.fillStyle(SETT_DARK, 1); g.fillEllipse(x, y, rx * 2 + 40, ry * 2 + 30);
  g.fillStyle(SETT, 1); g.fillEllipse(x, y - 2, rx * 2 + 32, ry * 2 + 22);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    g.lineStyle(1, SETT_DARK, 0.8);
    g.lineBetween(x + Math.cos(a) * (rx + 2), y - 2 + Math.sin(a) * (ry + 2), x + Math.cos(a) * (rx + 15), y - 2 + Math.sin(a) * (ry + 10));
  }
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, y, rx * 2 + 8, ry * 2 + 6);
  g.fillStyle(GILT, 1); g.fillEllipse(x, y - 1, rx * 2 + 4, ry * 2 + 3);
  g.fillStyle(WELL_DEEP, 1); g.fillEllipse(x, y, rx * 2, ry * 2);
  g.fillStyle(WELL, 1); g.fillEllipse(x - rx * 0.05, y - ry * 0.05, rx * 1.8, ry * 1.75);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(WELL_SHEEN, 0.12 + rng() * 0.1);
    g.fillEllipse(x - rx * 0.4 + rng() * rx * 0.6, y - ry * 0.4 + rng() * ry * 0.4, rx * (0.3 + rng() * 0.3), ry * 0.12);
  }
  // Ink tide-marks on the stone.
  g.lineStyle(2, INK, 0.35); g.strokeEllipse(x, y + 2, rx * 2 + 14, ry * 2 + 10);
  quill(g, x - rx - 26, y + ry * 0.5, rx * 0.9, -0.35, PAPER_LIT);
}

/** A soft red ink stain spreading on the stones. */
export function redStain(g: G, x: number, y: number, r: number, rng: () => number): void {
  for (let i = 0; i < 7; i++) { g.fillStyle(RED_DARK, 0.12); g.fillEllipse(x + (rng() - 0.5) * r, y + (rng() - 0.5) * r * 0.4, r * (0.6 + rng() * 0.6), r * 0.3); }
}

/** A scatter of fallen, trodden sheets on the ground. */
export function litter(g: G, x: number, y: number, w: number, h: number, n: number, rng: () => number): void {
  for (let i = 0; i < n; i++) sheet(g, x + rng() * w, y + rng() * h, 8 + rng() * 4, 10 + rng() * 4, rng() * Math.PI, rng() < 0.3 ? PAPER_OLD : PAPER, 0.75);
}

/** A slant copy-desk with a stool, an inkhorn and a quill — for the fight floor's margins. */
export function copyDesk(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 50 * s, 12 * s);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 18 * s, y - 26 * s, 4 * s, 26 * s); g.fillRect(x + 14 * s, y - 30 * s, 4 * s, 30 * s);
  g.fillStyle(OAK, 1); g.fillPoints([P(x - 22 * s, y - 24 * s), P(x + 22 * s, y - 34 * s), P(x + 22 * s, y - 30 * s), P(x - 22 * s, y - 20 * s)], true);
  sheet(g, x, y - 30 * s, 20 * s, 12 * s, -0.22, PAPER_LIT);
  g.fillStyle(INK, 1); g.fillRect(x + 14 * s, y - 40 * s, 5 * s, 6 * s);
  quill(g, x + 16 * s, y - 40 * s, 18 * s, -1.2);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 30 * s, y - 12 * s, 10 * s, 3 * s); g.fillRect(x - 29 * s, y - 10 * s, 2 * s, 10 * s); g.fillRect(x - 23 * s, y - 10 * s, 2 * s, 10 * s);
  if (rng() < 0.5) { g.fillStyle(PAPER, 0.8); g.fillRect(x - 10 * s, y - 4 * s, 12 * s, 3 * s); }
}

/** Ink, blue-black, splashed — a blot with tendrils. */
export function inkBlot(g: G, x: number, y: number, r: number, rng: () => number, color = INK, a = 1): void {
  g.fillStyle(color, a); g.fillCircle(x, y, r);
  for (let i = 0; i < 9; i++) {
    const ang = rng() * Math.PI * 2, d = r * (0.8 + rng() * 0.8);
    g.fillCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.8, r * (0.15 + rng() * 0.3));
    g.lineStyle(r * 0.18, color, a); g.lineBetween(x, y, x + Math.cos(ang) * d * 0.9, y + Math.sin(ang) * d * 0.7);
  }
  g.fillStyle(INK_SHEEN, 0.25 * a); g.fillEllipse(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.3);
}

/** A shelf-bay of the Bindery seen in the floor's back wall: books in rows, spines in many colours. */
export function shelfBay(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(OAK_DARK, 1); g.fillRect(x, y, w, h);
  const rows = Math.max(1, Math.floor(h / 22));
  for (let r = 0; r < rows; r++) {
    const ry = y + 3 + r * (h / rows);
    let bx = x + 3;
    while (bx < x + w - 4) {
      const bw = 3 + rng() * 5, bh = (h / rows) - 6 - rng() * 4;
      const c = [LEATHER, 0x2a3a5a, 0x3a5a3a, CALF, RED_DARK, LEATHER_LIT][Math.floor(rng() * 6)];
      g.fillStyle(c, 1); g.fillRect(bx, ry + (h / rows) - 4 - bh, bw, bh);
      g.fillStyle(GILT, 0.8); g.fillRect(bx, ry + (h / rows) - 4 - bh + 2, bw, 1);
      bx += bw + 0.6;
    }
    g.fillStyle(OAK, 1); g.fillRect(x, ry + (h / rows) - 4, w, 3);
  }
}

