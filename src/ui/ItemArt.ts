import Phaser from 'phaser';
import { C, mix } from './Theme';

/**
 * The shop's wares, drawn. Every upgrade used to be a text block on a plate; now each one is
 * an *object* standing on a shelf — a dagger, a flask, a tome, a crown — struck in its
 * element's colour. Which object a slot gets is decided by the slot (Click is always a
 * weapon, Q always a relic) with a second shape per slot picked off the upgrade's name, so a
 * shelf of five is five different silhouettes and two elements never look like the same
 * five things repainted.
 *
 * Everything is drawn around a centre `(cx, cy)` with half-extent `s`, feet at `cy + s`.
 */

export type ItemKind =
  // ── Ability upgrades, two per slot ──
  | 'dagger' | 'wand'          // Click
  | 'amulet' | 'ring'          // E
  | 'potion' | 'orb'           // R
  | 'tome' | 'scroll'          // F
  | 'crown' | 'idol'           // Q
  // ── Front counter ──
  | 'key' | 'keyDark' | 'nucleus'
  | 'beaker' | 'retort' | 'alembic' | 'crucible'
  // ── The empty shelf space where an unmade upgrade would stand ──
  | 'dust';

export interface ItemPaintOpts {
  alpha?: number;
  /** 0–1 hover lift: brighter, with a glint. */
  lit?: number;
  /** Greyed out: not for sale yet. */
  muted?: boolean;
  /** Time, for the few that shimmer or turn. */
  t?: number;
}

const GOLD = 0xd8a531;
const GOLD_LIT = 0xffe39a;
const GOLD_DARK = 0x7a5a16;
const LEATHER = 0x5a3a22;
const STEEL = 0xaab0bd;
const STEEL_DARK = 0x4a505c;
const GLASS = 0xd6ecff;
const PAPER = 0xe6d7b0;
const PAPER_DARK = 0xa08a5a;
const STONE = 0x6b6a74;
const STONE_DARK = 0x3a3942;

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

/** Which object an upgrade is, from its slot and (for the alternate) its name. */
export function itemKindFor(slot: string, name: string): ItemKind {
  const alt = hashName(name) % 2 === 1;
  switch (slot) {
    case 'click': return alt ? 'wand' : 'dagger';
    case 'e': return alt ? 'ring' : 'amulet';
    case 'r': return alt ? 'orb' : 'potion';
    case 'f': return alt ? 'scroll' : 'tome';
    default: return alt ? 'idol' : 'crown';
  }
}

/** Rotate a local point list about the origin and translate. */
function placed(pts: [number, number][], cx: number, cy: number, s: number, ang = 0): Phaser.Geom.Point[] {
  const c = Math.cos(ang);
  const sn = Math.sin(ang);
  return pts.map(([x, y]) => P(cx + (x * c - y * sn) * s, cy + (x * sn + y * c) * s));
}

function poly(g: Phaser.GameObjects.Graphics, pts: Phaser.Geom.Point[], color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts, true, true);
}

function outline(g: Phaser.GameObjects.Graphics, pts: Phaser.Geom.Point[], color: number, alpha: number, w = 1): void {
  g.lineStyle(w, color, alpha);
  g.strokePoints(pts, true);
}

/**
 * Paint one item. `color` is the element accent; the metals, glass and paper are shared so
 * a shelf reads as one shop's stock rather than fifty unrelated drawings.
 */
export function drawItem(
  g: Phaser.GameObjects.Graphics, kind: ItemKind, cx: number, cy: number, s: number, color: number,
  opts: ItemPaintOpts = {},
): void {
  const a = opts.alpha ?? 1;
  const lit = opts.lit ?? 0;
  const t = opts.t ?? 0;
  const muted = !!opts.muted;
  const tone = (c: number): number => muted ? mix(c, 0x4a4a56, 0.72) : mix(c, 0xffffff, lit * 0.18);
  const col = tone(color);
  const colLit = tone(mix(color, 0xffffff, 0.45));
  const colDeep = tone(mix(color, 0x000000, 0.55));
  const gold = tone(GOLD);
  const goldLit = tone(GOLD_LIT);
  const goldDark = tone(GOLD_DARK);
  const ink = muted ? 0x22222a : 0x12100e;

  // Drop shadow under the feet, so the thing stands on the shelf.
  g.fillStyle(0x000000, a * 0.35);
  g.fillEllipse(cx, cy + s * 1.02, s * 1.5, s * 0.34);

  switch (kind) {
    // ── Click: weapons ──────────────────────────────────────────────────
    case 'dagger': {
      const ang = -0.55;
      // Blade: a long leaf with a fuller, the steel tinted toward the element.
      const blade = placed([[0, -1.05], [0.17, -0.1], [0.14, 0.18], [-0.14, 0.18], [-0.17, -0.1]], cx, cy, s, ang);
      outline(g, blade, ink, a, 2.5);
      poly(g, blade, tone(mix(STEEL, color, 0.35)), a);
      poly(g, placed([[0, -1.0], [0.06, -0.1], [0, 0.1], [-0.06, -0.1]], cx, cy, s, ang), tone(mix(STEEL_DARK, color, 0.4)), a);
      g.lineStyle(1, tone(0xffffff), a * 0.7);
      const e = placed([[0.12, -0.9], [0.15, -0.12]], cx, cy, s, ang);
      g.lineBetween(e[0].x, e[0].y, e[1].x, e[1].y);
      // Guard, grip, pommel.
      poly(g, placed([[-0.38, 0.18], [0.38, 0.18], [0.3, 0.32], [-0.3, 0.32]], cx, cy, s, ang), gold, a);
      poly(g, placed([[-0.14, 0.32], [0.14, 0.32], [0.12, 0.82], [-0.12, 0.82]], cx, cy, s, ang), tone(LEATHER), a);
      for (let i = 0; i < 4; i++) {
        const w = placed([[-0.14, 0.4 + i * 0.1], [0.14, 0.44 + i * 0.1]], cx, cy, s, ang);
        g.lineStyle(1, ink, a * 0.7);
        g.lineBetween(w[0].x, w[0].y, w[1].x, w[1].y);
      }
      const pm = placed([[0, 0.92]], cx, cy, s, ang)[0];
      g.fillStyle(gold, a); g.fillCircle(pm.x, pm.y, s * 0.15);
      g.fillStyle(col, a); g.fillCircle(pm.x, pm.y, s * 0.08);
      break;
    }
    case 'wand': {
      const ang = -0.7;
      const stick = placed([[-0.07, 0.95], [0.07, 0.95], [0.05, -0.55], [-0.05, -0.55]], cx, cy, s, ang);
      outline(g, stick, ink, a, 2);
      poly(g, stick, tone(LEATHER), a);
      poly(g, placed([[-0.02, 0.9], [0.03, 0.9], [0.02, -0.5], [-0.02, -0.5]], cx, cy, s, ang), tone(0x8a6a44), a);
      // A wrap of cord where the hand goes.
      for (let i = 0; i < 5; i++) {
        const w = placed([[-0.09, 0.45 + i * 0.08], [0.09, 0.48 + i * 0.08]], cx, cy, s, ang);
        g.lineStyle(1.3, goldDark, a);
        g.lineBetween(w[0].x, w[0].y, w[1].x, w[1].y);
      }
      // The gem in its prongs, radiating.
      const tip = placed([[0, -0.72]], cx, cy, s, ang)[0];
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(col, a * 0.08 * (1 + lit));
        g.fillCircle(tip.x, tip.y, s * (0.22 + k * 0.1));
      }
      for (let i = 0; i < 4; i++) {
        const ra = i * Math.PI / 2 + t * 0.6 + 0.4;
        g.lineStyle(1, colLit, a * 0.6);
        g.lineBetween(tip.x + Math.cos(ra) * s * 0.2, tip.y + Math.sin(ra) * s * 0.2, tip.x + Math.cos(ra) * s * 0.38, tip.y + Math.sin(ra) * s * 0.38);
      }
      poly(g, placed([[0, -0.98], [0.17, -0.72], [0, -0.5], [-0.17, -0.72]], cx, cy, s, ang), colDeep, a);
      poly(g, placed([[0, -0.94], [0.12, -0.72], [0, -0.55], [-0.12, -0.72]], cx, cy, s, ang), col, a);
      poly(g, placed([[-0.02, -0.9], [0.08, -0.74], [-0.04, -0.7]], cx, cy, s, ang), colLit, a);
      for (const [px, py] of [[-0.15, -0.6], [0.15, -0.6]] as const) {
        const pr = placed([[px, py], [px * 0.5, py + 0.12]], cx, cy, s, ang);
        g.lineStyle(1.6, gold, a);
        g.lineBetween(pr[0].x, pr[0].y, pr[1].x, pr[1].y);
      }
      break;
    }
    // ── E: charms ───────────────────────────────────────────────────────
    case 'amulet': {
      // Chain in a loop, the pendant hanging from its bottom.
      g.lineStyle(1.6, goldDark, a);
      g.strokeEllipse(cx, cy - s * 0.35, s * 1.3, s * 0.95);
      g.lineStyle(0.8, goldLit, a * 0.8);
      g.strokeEllipse(cx - 1, cy - s * 0.36, s * 1.26, s * 0.9);
      for (let i = 0; i < 14; i++) {
        const ra = (i / 14) * Math.PI * 2;
        g.fillStyle(gold, a);
        g.fillCircle(cx + Math.cos(ra) * s * 0.65, cy - s * 0.35 + Math.sin(ra) * s * 0.47, 1.1);
      }
      // Bail and the bezel: a teardrop of gold with the stone inside.
      const py = cy + s * 0.3;
      g.fillStyle(gold, a);
      g.fillCircle(cx, cy + s * 0.08, s * 0.1);
      const bez = [P(cx, cy + s * 0.12), P(cx + s * 0.36, py), P(cx, py + s * 0.5), P(cx - s * 0.36, py)];
      outline(g, bez, ink, a, 2);
      poly(g, bez, gold, a);
      poly(g, [P(cx, cy + s * 0.2), P(cx + s * 0.26, py), P(cx, py + s * 0.4), P(cx - s * 0.26, py)], colDeep, a);
      poly(g, [P(cx, cy + s * 0.26), P(cx + s * 0.18, py), P(cx, py + s * 0.3), P(cx - s * 0.18, py)], col, a);
      g.fillStyle(tone(0xffffff), a * 0.85);
      g.fillCircle(cx - s * 0.08, py - s * 0.08, s * 0.06);
      for (let k = 2; k >= 1; k--) { g.fillStyle(col, a * 0.06 * (1 + lit * 2)); g.fillCircle(cx, py + s * 0.05, s * (0.3 + k * 0.14)); }
      break;
    }
    case 'ring': {
      // A band seen at a tilt, the stone up top catching the light.
      const ry = cy + s * 0.25;
      g.lineStyle(s * 0.16, goldDark, a);
      g.strokeEllipse(cx, ry, s * 1.1, s * 0.62);
      g.lineStyle(s * 0.1, gold, a);
      g.strokeEllipse(cx, ry, s * 1.06, s * 0.58);
      g.lineStyle(1, goldLit, a * 0.9);
      g.beginPath(); g.arc(cx, ry, s * 0.53, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
      // The band's front passes over the stone's prongs: draw the stone last.
      const sx = cx;
      const sy = cy - s * 0.3;
      for (let k = 3; k >= 1; k--) { g.fillStyle(col, a * 0.06 * (1 + lit * 2)); g.fillCircle(sx, sy, s * (0.2 + k * 0.12)); }
      g.fillStyle(gold, a);
      g.fillRect(sx - s * 0.22, sy, s * 0.44, s * 0.22);
      const stone = [P(sx, sy - s * 0.42), P(sx + s * 0.3, sy - s * 0.12), P(sx + s * 0.2, sy + s * 0.1), P(sx - s * 0.2, sy + s * 0.1), P(sx - s * 0.3, sy - s * 0.12)];
      outline(g, stone, ink, a, 1.5);
      poly(g, stone, colDeep, a);
      poly(g, [P(sx, sy - s * 0.34), P(sx + s * 0.2, sy - s * 0.12), P(sx - s * 0.2, sy - s * 0.12)], col, a);
      poly(g, [P(sx + s * 0.2, sy - s * 0.12), P(sx + s * 0.12, sy + s * 0.04), P(sx - s * 0.12, sy + s * 0.04), P(sx - s * 0.2, sy - s * 0.12)], colLit, a);
      g.fillStyle(tone(0xffffff), a * 0.9);
      g.fillCircle(sx - s * 0.06, sy - s * 0.22, s * 0.05);
      break;
    }
    // ── R: vessels ──────────────────────────────────────────────────────
    case 'potion': {
      // Round-bottom flask: bulb, neck, cork; liquid in the bulb with a meniscus and bubbles.
      const bx = cx;
      const by = cy + s * 0.35;
      const br = s * 0.52;
      g.fillStyle(ink, a * 0.9);
      g.fillCircle(bx, by, br + 1.5);
      g.fillRect(bx - s * 0.17, cy - s * 0.95, s * 0.34, s * 0.9);
      g.fillStyle(tone(mix(GLASS, color, 0.15)), a * 0.55);
      g.fillCircle(bx, by, br);
      g.fillRect(bx - s * 0.15, cy - s * 0.95, s * 0.3, s * 0.9);
      // Liquid: the lower part of the bulb, clipped by drawing a wedge of circle rows.
      const level = by - br * 0.15 + Math.sin(t * 2) * 1;
      for (let yy = Math.ceil(level); yy <= by + br - 1; yy++) {
        const dy = yy - by;
        const half = Math.sqrt(Math.max(0, br * br - dy * dy)) - 1.2;
        if (half <= 0) continue;
        g.fillStyle(yy < level + 3 ? colLit : col, a * 0.95);
        g.fillRect(bx - half, yy, half * 2, 1.1);
      }
      g.fillStyle(colLit, a * 0.8);
      g.fillEllipse(bx, level, (br - 2) * 2 * 0.95, 3);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.5 + i * 0.33) % 1;
        g.lineStyle(1, colLit, a * (1 - ph) * 0.9);
        g.strokeCircle(bx - br * 0.4 + i * br * 0.4, by + br * 0.6 - ph * br * 1.1, 1.2 + i * 0.5);
      }
      // Glass highlight, cork, a label.
      g.fillStyle(tone(0xffffff), a * 0.55);
      g.fillEllipse(bx - br * 0.45, by - br * 0.35, br * 0.22, br * 0.55);
      g.fillStyle(tone(LEATHER), a);
      g.fillRoundedRect(bx - s * 0.2, cy - s * 1.08, s * 0.4, s * 0.26, 2);
      g.fillStyle(tone(0x8a6a44), a);
      g.fillRect(bx - s * 0.16, cy - s * 1.04, s * 0.32, s * 0.08);
      g.fillStyle(tone(PAPER), a);
      g.fillRect(bx - s * 0.26, by - s * 0.05, s * 0.52, s * 0.22);
      g.lineStyle(1, ink, a * 0.5);
      g.lineBetween(bx - s * 0.18, by + s * 0.06, bx + s * 0.18, by + s * 0.06);
      break;
    }
    case 'orb': {
      // A sphere of the element on a three-clawed gold stand, slowly swirling inside.
      const oy = cy - s * 0.1;
      const r = s * 0.6;
      for (const dx of [-0.42, 0, 0.42]) {
        g.lineStyle(s * 0.12, goldDark, a);
        g.lineBetween(cx + dx * s * 0.6, oy + r * 0.55, cx + dx * s, cy + s * 0.95);
        g.lineStyle(s * 0.06, gold, a);
        g.lineBetween(cx + dx * s * 0.6, oy + r * 0.55, cx + dx * s, cy + s * 0.95);
      }
      g.fillStyle(goldDark, a);
      g.fillEllipse(cx, cy + s * 0.95, s * 1.1, s * 0.22);
      g.fillStyle(gold, a);
      g.fillEllipse(cx, cy + s * 0.9, s * 1.0, s * 0.18);
      for (let k = 3; k >= 1; k--) { g.fillStyle(col, a * 0.07 * (1 + lit * 2)); g.fillCircle(cx, oy, r + k * s * 0.12); }
      g.fillStyle(ink, a); g.fillCircle(cx, oy, r + 1.2);
      g.fillStyle(colDeep, a); g.fillCircle(cx, oy, r);
      g.fillStyle(col, a); g.fillCircle(cx - r * 0.1, oy - r * 0.1, r * 0.78);
      g.fillStyle(colLit, a * 0.8); g.fillCircle(cx - r * 0.25, oy - r * 0.25, r * 0.4);
      // Swirl.
      g.lineStyle(1.4, colLit, a * 0.7);
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const ra = u * Math.PI * 3 + t * 1.2;
        const rr = r * 0.7 * u;
        const px = cx + Math.cos(ra) * rr;
        const py = oy + Math.sin(ra) * rr * 0.6;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      g.fillStyle(tone(0xffffff), a * 0.85);
      g.fillEllipse(cx - r * 0.4, oy - r * 0.45, r * 0.3, r * 0.18);
      break;
    }
    // ── F: writings ─────────────────────────────────────────────────────
    case 'tome': {
      // A standing book, cover toward us: leather in the element's colour, gold corners, a clasp.
      const w = s * 1.2;
      const h = s * 1.6;
      const x0 = cx - w / 2;
      const y0 = cy - h / 2 + s * 0.15;
      // Pages showing along the right and bottom.
      g.fillStyle(tone(PAPER_DARK), a); g.fillRect(x0 + 6, y0 + 4, w, h);
      g.fillStyle(tone(PAPER), a); g.fillRect(x0 + 4, y0 + 3, w, h);
      g.lineStyle(1, tone(PAPER_DARK), a * 0.7);
      for (let i = 1; i < 5; i++) g.lineBetween(x0 + w + 2, y0 + 4 + i, x0 + w + 2, y0 + h + 1 - i * 0.3);
      g.fillStyle(ink, a); g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
      g.fillStyle(colDeep, a); g.fillRect(x0, y0, w, h);
      g.fillStyle(col, a * 0.85); g.fillRect(x0 + s * 0.18, y0 + s * 0.1, w - s * 0.28, h - s * 0.2);
      // Spine band.
      g.fillStyle(colDeep, a); g.fillRect(x0, y0, s * 0.16, h);
      g.lineStyle(1, goldDark, a); g.lineBetween(x0 + s * 0.16, y0, x0 + s * 0.16, y0 + h);
      // Gold corners and a central sigil.
      for (const [kx, ky, sx, sy] of [[x0, y0, 1, 1], [x0 + w, y0, -1, 1], [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1]]) {
        poly(g, [P(kx, ky), P(kx + sx * s * 0.28, ky), P(kx, ky + sy * s * 0.28)], gold, a);
      }
      const mx = cx + s * 0.08;
      const my = cy + s * 0.1;
      g.lineStyle(1.5, gold, a);
      g.strokeCircle(mx, my, s * 0.26);
      poly(g, [P(mx, my - s * 0.18), P(mx + s * 0.16, my), P(mx, my + s * 0.18), P(mx - s * 0.16, my)], goldLit, a);
      poly(g, [P(mx, my - s * 0.1), P(mx + s * 0.08, my), P(mx, my + s * 0.1), P(mx - s * 0.08, my)], colLit, a);
      // Clasp on the right edge.
      g.fillStyle(gold, a); g.fillRect(x0 + w - s * 0.1, cy - s * 0.1, s * 0.3, s * 0.2);
      g.fillStyle(goldDark, a); g.fillCircle(x0 + w + s * 0.1, cy, s * 0.05);
      break;
    }
    case 'scroll': {
      // Parchment unrolled between two rods, a wax seal in the element's colour.
      const w = s * 1.5;
      const h = s * 1.1;
      const x0 = cx - w / 2;
      const y0 = cy - h / 2;
      g.fillStyle(ink, a * 0.8); g.fillRect(x0 - 1, y0 + 5, w + 2, h);
      g.fillStyle(tone(PAPER), a); g.fillRect(x0, y0 + 4, w, h);
      g.fillStyle(tone(PAPER_DARK), a * 0.35); g.fillRect(x0, y0 + 4, w, 3);
      // Writing.
      g.lineStyle(1, tone(0x4a3a2a), a * 0.7);
      for (let i = 0; i < 4; i++) {
        const ly = y0 + 14 + i * s * 0.22;
        g.lineBetween(x0 + s * 0.2, ly, x0 + w - s * (0.2 + (i % 2) * 0.3), ly);
      }
      // Rods top and bottom with knobs.
      for (const ry of [y0 + 2, y0 + h + 2]) {
        g.fillStyle(tone(LEATHER), a); g.fillRoundedRect(x0 - s * 0.15, ry - 3, w + s * 0.3, 6, 3);
        g.fillStyle(tone(0x8a6a44), a); g.fillRect(x0 - s * 0.1, ry - 2, w + s * 0.2, 1.5);
        g.fillStyle(gold, a); g.fillCircle(x0 - s * 0.17, ry, 3.5); g.fillCircle(x0 + w + s * 0.17, ry, 3.5);
      }
      // Ribbon and seal.
      g.fillStyle(colDeep, a); g.fillRect(cx + s * 0.25, y0 + 6, s * 0.12, h - 4);
      g.fillStyle(col, a); g.fillRect(cx + s * 0.27, y0 + 6, s * 0.06, h - 4);
      g.fillStyle(colDeep, a); g.fillCircle(cx + s * 0.31, cy + s * 0.2, s * 0.22);
      g.fillStyle(col, a); g.fillCircle(cx + s * 0.31, cy + s * 0.2, s * 0.17);
      g.lineStyle(1, colLit, a * 0.8); g.strokeCircle(cx + s * 0.31, cy + s * 0.2, s * 0.1);
      break;
    }
    // ── Q: relics ───────────────────────────────────────────────────────
    case 'crown': {
      const w = s * 1.3;
      const base = cy + s * 0.45;
      const x0 = cx - w / 2;
      for (let k = 3; k >= 1; k--) { g.fillStyle(col, a * 0.05 * (1 + lit * 2)); g.fillCircle(cx, cy - s * 0.1, s * (0.5 + k * 0.15)); }
      // Band on a cushion.
      g.fillStyle(colDeep, a); g.fillEllipse(cx, base + s * 0.2, w * 1.15, s * 0.5);
      g.fillStyle(col, a * 0.8); g.fillEllipse(cx, base + s * 0.16, w * 1.05, s * 0.38);
      // Points.
      const pts: Phaser.Geom.Point[] = [P(x0, base)];
      const n = 5;
      for (let i = 0; i < n; i++) {
        const px = x0 + (i / (n - 1)) * w;
        const tall = i === 2 ? 1.1 : i % 2 === 0 ? 0.8 : 0.55;
        if (i > 0) pts.push(P(px - w / (n - 1) / 2, base - s * 0.2));
        pts.push(P(px, base - s * tall));
      }
      pts.push(P(x0 + w, base));
      outline(g, pts, ink, a, 2);
      poly(g, pts, goldDark, a);
      poly(g, pts.map((p) => P(p.x + (cx - p.x) * 0.08, p.y + (base - 4 - p.y) * 0.1)), gold, a);
      g.fillStyle(goldDark, a); g.fillRect(x0, base - s * 0.22, w, s * 0.22);
      g.fillStyle(gold, a); g.fillRect(x0, base - s * 0.2, w, s * 0.16);
      g.fillStyle(goldLit, a * 0.7); g.fillRect(x0, base - s * 0.2, w, 1.5);
      // Jewels on the points and the band.
      for (let i = 0; i < n; i++) {
        const px = x0 + (i / (n - 1)) * w;
        const tall = i === 2 ? 1.1 : i % 2 === 0 ? 0.8 : 0.55;
        g.fillStyle(colDeep, a); g.fillCircle(px, base - s * tall + 2.5, s * 0.1);
        g.fillStyle(colLit, a); g.fillCircle(px - 0.6, base - s * tall + 1.9, s * 0.055);
      }
      for (let i = 0; i < 3; i++) {
        const px = x0 + w * (0.25 + i * 0.25);
        poly(g, [P(px, base - s * 0.2), P(px + s * 0.09, base - s * 0.12), P(px, base - s * 0.04), P(px - s * 0.09, base - s * 0.12)], i === 1 ? colLit : col, a);
      }
      break;
    }
    case 'idol': {
      // A squat stone totem with carved rings and one lit eye of the element.
      const w = s * 0.9;
      const top = cy - s * 0.95;
      const bot = cy + s * 0.95;
      const body = [P(cx - w * 0.45, top + s * 0.2), P(cx, top), P(cx + w * 0.45, top + s * 0.2), P(cx + w * 0.55, bot), P(cx - w * 0.55, bot)];
      outline(g, body, ink, a, 2);
      poly(g, body, tone(STONE_DARK), a);
      poly(g, [P(cx - w * 0.35, top + s * 0.24), P(cx - w * 0.02, top + s * 0.06), P(cx - w * 0.02, bot - 2), P(cx - w * 0.45, bot - 2)], tone(STONE), a);
      // Carvings.
      g.lineStyle(1.2, ink, a * 0.8);
      for (let i = 0; i < 3; i++) {
        const ly = cy + s * (0.25 + i * 0.22);
        g.lineBetween(cx - w * 0.4, ly, cx + w * 0.4, ly);
      }
      g.lineStyle(1, ink, a * 0.6);
      g.lineBetween(cx - w * 0.2, cy + s * 0.25, cx - w * 0.2, bot - 3);
      g.lineBetween(cx + w * 0.2, cy + s * 0.25, cx + w * 0.2, bot - 3);
      // The eye.
      const ey = cy - s * 0.3;
      for (let k = 3; k >= 1; k--) { g.fillStyle(col, a * 0.08 * (1 + lit * 2)); g.fillCircle(cx, ey, s * (0.18 + k * 0.1)); }
      g.fillStyle(ink, a); g.fillEllipse(cx, ey, w * 0.7, s * 0.34);
      g.fillStyle(col, a); g.fillEllipse(cx, ey, w * 0.58, s * 0.26);
      g.fillStyle(colDeep, a); g.fillCircle(cx, ey, s * 0.1);
      g.fillStyle(tone(0xffffff), a * 0.9); g.fillCircle(cx - s * 0.05, ey - s * 0.05, s * 0.035);
      // Lit crown line.
      g.lineStyle(1, tone(0xffffff), a * 0.3);
      g.lineBetween(cx - w * 0.4, top + s * 0.22, cx, top + 1.5);
      break;
    }
    // ── Front counter ───────────────────────────────────────────────────
    case 'key':
    case 'keyDark': {
      const dark = kind === 'keyDark';
      const metal = dark ? tone(0x3a3440) : gold;
      const metalLit = dark ? tone(0x7a6f86) : goldLit;
      const metalDark = dark ? tone(0x15121a) : goldDark;
      const ang = -0.75;
      // Shank with two bits, and a trefoil bow.
      const shank = placed([[-0.08, -0.2], [0.08, -0.2], [0.08, 1.0], [-0.08, 1.0]], cx, cy, s, ang);
      outline(g, shank, ink, a, 2);
      poly(g, shank, metalDark, a);
      poly(g, placed([[-0.08, -0.2], [0.0, -0.2], [0.0, 1.0], [-0.08, 1.0]], cx, cy, s, ang), metal, a);
      for (const [by, bl] of [[0.55, 0.3], [0.78, 0.22]] as const) {
        const bit = placed([[0.08, by], [0.08 + bl, by], [0.08 + bl, by + 0.14], [0.08, by + 0.14]], cx, cy, s, ang);
        outline(g, bit, ink, a, 1.5);
        poly(g, bit, metal, a);
      }
      const bow = placed([[0, -0.5]], cx, cy, s, ang)[0];
      for (const [dx, dy] of [[0, -0.22], [-0.2, 0.08], [0.2, 0.08]] as const) {
        const c = placed([[dx, -0.5 + dy]], cx, cy, s, ang)[0];
        g.fillStyle(ink, a); g.fillCircle(c.x, c.y, s * 0.2);
      }
      for (const [dx, dy] of [[0, -0.22], [-0.2, 0.08], [0.2, 0.08]] as const) {
        const c = placed([[dx, -0.5 + dy]], cx, cy, s, ang)[0];
        g.fillStyle(metal, a); g.fillCircle(c.x, c.y, s * 0.17);
        g.fillStyle(metalDark, a); g.fillCircle(c.x, c.y, s * 0.07);
      }
      g.fillStyle(metal, a); g.fillCircle(bow.x, bow.y, s * 0.17);
      g.fillStyle(dark ? tone(C.blood) : col, a); g.fillCircle(bow.x, bow.y, s * 0.09);
      g.fillStyle(metalLit, a * 0.9); g.fillCircle(bow.x - s * 0.06, bow.y - s * 0.1, s * 0.04);
      // A tag on a string with a gauntlet mark.
      const tg = placed([[0.3, -0.75]], cx, cy, s, ang)[0];
      g.lineStyle(1, tone(0x9a7b4a), a); g.lineBetween(bow.x, bow.y - s * 0.1, tg.x, tg.y);
      g.fillStyle(tone(PAPER), a); g.fillRect(tg.x - s * 0.16, tg.y - s * 0.1, s * 0.32, s * 0.2);
      break;
    }
    case 'nucleus': {
      // An atom: the lit core, three orbits turning, an electron on each.
      const core = tone(C.arcane);
      for (let k = 4; k >= 1; k--) { g.fillStyle(core, a * 0.06 * (1 + lit)); g.fillCircle(cx, cy, s * (0.2 + k * 0.12)); }
      for (let i = 0; i < 3; i++) {
        const ra = i * Math.PI / 3 + t * 0.5;
        const c = Math.cos(ra);
        const sn = Math.sin(ra);
        g.lineStyle(1.3, mix(core, 0xffffff, 0.35), a * 0.8);
        g.beginPath();
        for (let k = 0; k <= 30; k++) {
          const u = (k / 30) * Math.PI * 2;
          const ex = Math.cos(u) * s * 0.95;
          const ey = Math.sin(u) * s * 0.36;
          const px = cx + ex * c - ey * sn;
          const py = cy + ex * sn + ey * c;
          if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        const eu = t * (1.6 + i * 0.4) + i * 2;
        const ex = Math.cos(eu) * s * 0.95;
        const ey = Math.sin(eu) * s * 0.36;
        g.fillStyle(tone(0xffffff), a);
        g.fillCircle(cx + ex * c - ey * sn, cy + ex * sn + ey * c, 2.2);
      }
      g.fillStyle(ink, a); g.fillCircle(cx, cy, s * 0.3);
      g.fillStyle(core, a); g.fillCircle(cx, cy, s * 0.26);
      g.fillStyle(mix(core, 0xffffff, 0.5), a); g.fillCircle(cx - s * 0.07, cy - s * 0.07, s * 0.13);
      g.fillStyle(tone(0xffffff), a * 0.9); g.fillCircle(cx - s * 0.1, cy - s * 0.11, s * 0.05);
      break;
    }
    case 'beaker': {
      // A graduated beaker with a lip, half full of something arcane.
      const w = s * 1.0;
      const x0 = cx - w / 2;
      const top = cy - s * 0.75;
      const bot = cy + s * 0.95;
      const liquid = tone(C.arcane);
      g.fillStyle(ink, a * 0.9); g.fillRoundedRect(x0 - 1.5, top - 1.5, w + 3, bot - top + 3, 4);
      g.fillStyle(tone(GLASS), a * 0.5); g.fillRoundedRect(x0, top, w, bot - top, 4);
      g.fillStyle(mix(liquid, 0x000000, 0.4), a * 0.95); g.fillRoundedRect(x0 + 1.5, cy + s * 0.05, w - 3, bot - cy - s * 0.05 - 1.5, 3);
      g.fillStyle(mix(liquid, 0xffffff, 0.3), a * 0.9); g.fillEllipse(cx, cy + s * 0.05 + Math.sin(t * 2) * 0.6, w - 4, 3);
      g.lineStyle(1, tone(0xffffff), a * 0.6);
      for (let i = 0; i < 5; i++) g.lineBetween(x0 + 3, top + 8 + i * s * 0.28, x0 + 3 + (i % 2 ? 5 : 9), top + 8 + i * s * 0.28);
      g.fillStyle(tone(0xffffff), a * 0.5); g.fillRect(x0 + w - 6, top + 6, 2.2, bot - top - 14);
      // Lip.
      g.fillStyle(tone(GLASS), a * 0.8); g.fillRect(x0 - 3, top - 1, w + 6, 2.5);
      break;
    }
    case 'retort': {
      // A bulb with a long bent neck, over a little flame.
      const liquid = tone(C.arcane);
      const bx = cx - s * 0.2;
      const by = cy + s * 0.35;
      const br = s * 0.5;
      g.fillStyle(0xff8a2a, a * 0.9); g.fillTriangle(bx - 5, by + br + 10, bx + 5, by + br + 10, bx, by + br + 1);
      g.fillStyle(0xffe08a, a); g.fillTriangle(bx - 2.5, by + br + 10, bx + 2.5, by + br + 10, bx, by + br + 4);
      g.fillStyle(tone(STEEL_DARK), a); g.fillRect(bx - 8, by + br + 10, 16, 3);
      const neck = [P(bx + br * 0.6, by - br * 0.6), P(bx + br * 0.9, by - br * 0.85), P(cx + s * 0.8, cy - s * 0.1), P(cx + s * 0.72, cy)];
      outline(g, neck, ink, a, 2.5);
      poly(g, neck, tone(GLASS), a * 0.6);
      g.fillStyle(ink, a); g.fillCircle(bx, by, br + 1.5);
      g.fillStyle(tone(GLASS), a * 0.55); g.fillCircle(bx, by, br);
      for (let yy = Math.ceil(by); yy <= by + br - 1; yy++) {
        const dy = yy - by;
        const half = Math.sqrt(Math.max(0, br * br - dy * dy)) - 1.2;
        if (half > 0) { g.fillStyle(yy < by + 2 ? mix(liquid, 0xffffff, 0.3) : liquid, a * 0.95); g.fillRect(bx - half, yy, half * 2, 1.1); }
      }
      g.fillStyle(tone(0xffffff), a * 0.5); g.fillEllipse(bx - br * 0.45, by - br * 0.35, br * 0.2, br * 0.5);
      // A drip at the spout.
      g.fillStyle(liquid, a * (0.5 + 0.5 * Math.sin(t * 3))); g.fillCircle(cx + s * 0.76, cy + s * 0.05, 1.8);
      break;
    }
    case 'alembic': {
      // A still: a domed boiler with a spiral coil running to a flask.
      const liquid = tone(C.arcane);
      const bx = cx - s * 0.35;
      const by = cy + s * 0.3;
      g.fillStyle(ink, a); g.fillRoundedRect(bx - s * 0.45, by - s * 0.35, s * 0.9, s * 1.0, 5);
      g.fillStyle(tone(0x8a6a2a), a); g.fillRoundedRect(bx - s * 0.43, by - s * 0.33, s * 0.86, s * 0.96, 5);
      g.fillStyle(tone(0xc9a04a), a * 0.8); g.fillRoundedRect(bx - s * 0.4, by - s * 0.3, s * 0.25, s * 0.85, 3);
      g.fillStyle(ink, a); g.fillCircle(bx, by - s * 0.35, s * 0.48);
      g.fillStyle(tone(0x8a6a2a), a); g.fillCircle(bx, by - s * 0.35, s * 0.45);
      g.fillStyle(tone(0xc9a04a), a * 0.8); g.fillCircle(bx - s * 0.15, by - s * 0.5, s * 0.18);
      g.lineStyle(1.5, ink, a); g.strokeRect(bx - s * 0.2, by - s * 0.05, s * 0.4, s * 0.3);
      g.fillStyle(liquid, a * 0.9); g.fillRect(bx - s * 0.18, by + s * 0.1, s * 0.36, s * 0.13);
      // Coil.
      g.lineStyle(2.4, tone(STEEL_DARK), a);
      g.beginPath();
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        const px = bx + s * 0.3 + u * s * 0.9;
        const py = by - s * 0.5 + Math.sin(u * Math.PI * 5) * s * 0.12 + u * s * 0.9;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      g.lineStyle(1, tone(STEEL), a * 0.8);
      g.beginPath();
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        const px = bx + s * 0.3 + u * s * 0.9 - 0.5;
        const py = by - s * 0.5 + Math.sin(u * Math.PI * 5) * s * 0.12 + u * s * 0.9 - 0.6;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
      // Receiving flask.
      const fx = cx + s * 0.62;
      const fy = cy + s * 0.65;
      g.fillStyle(ink, a); g.fillCircle(fx, fy, s * 0.3);
      g.fillStyle(tone(GLASS), a * 0.55); g.fillCircle(fx, fy, s * 0.27);
      g.fillStyle(liquid, a * 0.95); g.fillEllipse(fx, fy + s * 0.1, s * 0.42, s * 0.25);
      break;
    }
    case 'crucible': {
      // A squat iron crucible, lid off, something luminous boiling inside.
      const liquid = tone(0xd946ef);
      const w = s * 1.3;
      const top = cy - s * 0.2;
      const bot = cy + s * 0.95;
      const body = [P(cx - w / 2, top), P(cx + w / 2, top), P(cx + w * 0.36, bot), P(cx - w * 0.36, bot)];
      outline(g, body, ink, a, 2.5);
      poly(g, body, tone(0x2e2c36), a);
      poly(g, [P(cx - w / 2 + 3, top + 3), P(cx - w * 0.3, top + 3), P(cx - w * 0.3, bot - 3), P(cx - w * 0.36 + 3, bot - 3)], tone(0x4a4856), a);
      g.fillStyle(ink, a); g.fillEllipse(cx, top, w, s * 0.32);
      g.fillStyle(tone(0x3a3846), a); g.fillEllipse(cx, top, w - 4, s * 0.26);
      g.fillStyle(mix(liquid, 0x000000, 0.3), a); g.fillEllipse(cx, top + 1, w - 10, s * 0.18);
      g.fillStyle(mix(liquid, 0xffffff, 0.3), a * 0.9); g.fillEllipse(cx - 3, top, (w - 10) * 0.5, s * 0.08);
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.6 + i * 0.25) % 1;
        g.fillStyle(mix(liquid, 0xffffff, 0.5), a * (1 - ph));
        g.fillCircle(cx - w * 0.3 + i * w * 0.2 + Math.sin(t * 2 + i) * 2, top - 2 - ph * s * 0.7, 1.6 + (1 - ph) * 1.2);
      }
      for (let k = 3; k >= 1; k--) { g.fillStyle(liquid, a * 0.05 * (1 + lit * 2)); g.fillEllipse(cx, top - 4, w + k * 8, s * 0.3 + k * 6); }
      // Tongs leaning on it.
      g.lineStyle(2, tone(STEEL_DARK), a);
      g.lineBetween(cx + w * 0.3, bot, cx + w * 0.7, top - s * 0.4);
      g.lineBetween(cx + w * 0.36, bot, cx + w * 0.78, top - s * 0.36);
      break;
    }
    case 'dust': {
      // Nothing here yet: a dust ring and a chalk question mark.
      g.lineStyle(1, 0x7a7266, a * 0.35);
      g.strokeEllipse(cx, cy + s * 0.85, s * 1.3, s * 0.3);
      g.fillStyle(0x7a7266, a * 0.25);
      for (let i = 0; i < 5; i++) g.fillCircle(cx + Math.sin(i * 2.1) * s * 0.5, cy + s * 0.85 + Math.cos(i * 1.3) * s * 0.1, 1.2);
      break;
    }
  }
}
