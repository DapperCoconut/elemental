import Phaser from 'phaser';
import { C, DEPTH, mix } from './Theme';

/**
 * Drawn iconography for the menus — "Arcane Forge" glyphs.
 *
 * Every menu used to identify itself with an emoji: 💎 for shards, ⚗ for the Lab, 🏆 for
 * gauntlets, 🔒 for anything gated. Emoji are a different picture on every machine, they
 * ignore the accent colour of the surface they sit on, and at 12px they collapse into
 * coloured mush — which is exactly why the element cards dropped them for live portraits.
 *
 * These are the same idea for everything that is not an element: machined vector glyphs that
 * take the accent of whatever plate they sit on, sit on the pixel grid at any size, and read
 * as part of the frame rather than as a sticker on it.
 *
 * Each icon is drawn into a `2s × 2s` box centred on `(cx, cy)`. The house recipe is a body
 * pushed toward black, a bright accent edge, and one near-white highlight — the same three
 * strokes every plate in `Panel.ts` uses, so a glyph and its plate look machined from one
 * piece of metal.
 */

export type IconName =
  // ── Currency + resources ──
  | 'shard' | 'corrupt' | 'nucleus' | 'key' | 'coin' | 'ticket'
  // ── Destinations ──
  | 'sword' | 'map' | 'husk' | 'flask' | 'trophy' | 'globe' | 'bag' | 'book'
  | 'chest' | 'crown' | 'door' | 'anvil' | 'portal' | 'target'
  // ── State ──
  | 'lock' | 'unlock' | 'check' | 'cross' | 'active' | 'shelved' | 'star'
  | 'gift' | 'warning' | 'plus' | 'minus' | 'question' | 'skull'
  // ── Controls ──
  | 'play' | 'pause' | 'speaker' | 'mute' | 'gear' | 'refresh'
  | 'chevronLeft' | 'chevronRight' | 'screwdriver' | 'eye' | 'scroll' | 'hourglass'
  | 'search' | 'chain' | 'cart' | 'moon' | 'scales' | 'coffin'
  // ── Combat ──
  | 'heart' | 'shield' | 'bolt' | 'spark' | 'fist'
  // ── The base five, plus the abstract five the Lab forges with ──
  | 'flame' | 'droplet' | 'leaf' | 'wind' | 'rock'
  | 'acid' | 'cards' | 'note';

type Pt = [number, number];

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

function fillPoly(g: Phaser.GameObjects.Graphics, pts: Pt[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map(([x, y]) => P(x, y)), true, true);
}

function strokePoly(
  g: Phaser.GameObjects.Graphics, pts: Pt[], color: number, alpha = 1, w = 1, close = true,
): void {
  g.lineStyle(w, color, alpha);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
  g.strokePath();
}

function line(
  g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number,
  color: number, alpha = 1, w = 1,
): void {
  g.lineStyle(w, color, alpha);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath();
}

/** Body / edge / highlight, the three tones every glyph is built from. */
const dark = (c: number): number => mix(c, 0x000000, 0.55);
const deep = (c: number): number => mix(c, 0x000000, 0.72);
const lit = (c: number): number => mix(c, 0xffffff, 0.55);
const hot = (c: number): number => mix(c, 0xffffff, 0.8);

/**
 * Paint one glyph. `s` is the half-extent — the icon fills a box of `2s`.
 *
 * Line weights scale off `s` so a 9px status pip and a 40px feature-card glyph carry the
 * same visual weight rather than the small one turning into a solid blob.
 */
export function drawIcon(
  g: Phaser.GameObjects.Graphics,
  name: IconName,
  cx: number, cy: number, s: number,
  color: number, alpha = 1,
): void {
  // Stroke weight: thin glyphs at small sizes, but never below a hairline.
  const w = Math.max(1, s * 0.13);
  const t = Math.max(0.8, s * 0.09);
  const at = (x: number, y: number): Pt => [cx + x * s, cy + y * s];

  switch (name) {
    // ── Currency + resources ────────────────────────────────────────────

    case 'shard': {
      // Brilliant-cut gem: table, crown facets, pavilion point.
      const table: Pt[] = [at(-0.42, -0.6), at(0.42, -0.6), at(0.86, -0.14), at(-0.86, -0.14)];
      const pav: Pt[] = [at(-0.86, -0.14), at(0.86, -0.14), at(0, 0.92)];
      fillPoly(g, pav, dark(color), alpha);
      fillPoly(g, table, mix(color, 0x000000, 0.3), alpha);
      // Facet rays — what makes it read as cut rather than as a hexagon.
      line(g, ...at(-0.42, -0.6), ...at(-0.32, 0.34), lit(color), alpha * 0.45, t);
      line(g, ...at(0.42, -0.6), ...at(0.32, 0.34), lit(color), alpha * 0.45, t);
      line(g, ...at(-0.86, -0.14), ...at(0, 0.92), lit(color), alpha * 0.3, t);
      line(g, ...at(0.86, -0.14), ...at(0, 0.92), lit(color), alpha * 0.3, t);
      line(g, ...at(-0.42, -0.6), ...at(0.42, -0.6), hot(color), alpha * 0.8, t);
      strokePoly(g, [at(-0.42, -0.6), at(0.42, -0.6), at(0.86, -0.14), at(0, 0.92), at(-0.86, -0.14)],
        color, alpha, w);
      break;
    }

    case 'corrupt': {
      // A shard of something that bled: jagged crystal with a crack down it.
      const p: Pt[] = [at(0, -0.95), at(0.52, -0.3), at(0.36, 0.62), at(0, 0.95), at(-0.36, 0.62), at(-0.52, -0.3)];
      fillPoly(g, p, dark(color), alpha);
      fillPoly(g, [at(0, -0.95), at(0.52, -0.3), at(0, 0.1), at(-0.52, -0.3)], mix(color, 0x000000, 0.34), alpha);
      strokePoly(g, p, color, alpha, w);
      // The crack.
      strokePoly(g, [at(-0.12, -0.55), at(0.1, -0.1), at(-0.08, 0.24), at(0.06, 0.62)],
        hot(color), alpha * 0.75, t, false);
      break;
    }

    case 'nucleus': {
      // Atom: two tilted orbits, a core, and one electron caught mid-lap.
      for (const a of [-Math.PI / 3, Math.PI / 3]) {
        g.save();
        g.translateCanvas(cx, cy);
        g.rotateCanvas(a);
        g.lineStyle(w * 0.8, color, alpha * 0.85);
        g.strokeEllipse(0, 0, s * 1.9, s * 0.82);
        g.restore();
      }
      g.lineStyle(w * 0.8, color, alpha * 0.55);
      g.strokeEllipse(cx, cy, s * 1.9, s * 0.82);
      g.fillStyle(dark(color), alpha);
      g.fillCircle(cx, cy, s * 0.34);
      g.lineStyle(t, hot(color), alpha);
      g.strokeCircle(cx, cy, s * 0.34);
      g.fillStyle(hot(color), alpha);
      g.fillCircle(cx + s * 0.72, cy - s * 0.42, s * 0.14);
      break;
    }

    case 'key': {
      // Bow, shaft, two wards.
      g.lineStyle(w * 1.2, color, alpha);
      g.strokeCircle(cx - s * 0.48, cy - s * 0.3, s * 0.36);
      g.fillStyle(deep(color), alpha);
      g.fillCircle(cx - s * 0.48, cy - s * 0.3, s * 0.2);
      line(g, ...at(-0.26, -0.06), ...at(0.6, 0.76), color, alpha, w * 1.1);
      line(g, ...at(0.3, 0.34), ...at(0.56, 0.16), color, alpha, w);
      line(g, ...at(0.46, 0.5), ...at(0.72, 0.32), color, alpha, w);
      line(g, ...at(-0.42, -0.42), ...at(-0.3, -0.3), hot(color), alpha * 0.8, t);
      break;
    }

    case 'coin': {
      g.fillStyle(dark(color), alpha);
      g.fillCircle(cx, cy, s * 0.86);
      g.lineStyle(w, color, alpha);
      g.strokeCircle(cx, cy, s * 0.86);
      g.lineStyle(t, lit(color), alpha * 0.5);
      g.strokeCircle(cx, cy, s * 0.6);
      fillPoly(g, [at(0, -0.34), at(0.28, 0), at(0, 0.34), at(-0.28, 0)], lit(color), alpha * 0.9);
      // Rim light along the upper-left arc.
      g.lineStyle(t, hot(color), alpha * 0.6);
      g.beginPath(); g.arc(cx, cy, s * 0.86, Math.PI * 1.05, Math.PI * 1.6); g.strokePath();
      break;
    }

    case 'ticket': {
      const p: Pt[] = [at(-0.9, -0.5), at(0.9, -0.5), at(0.9, 0.5), at(-0.9, 0.5)];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      // Punched notches on either side and a perforation down the middle.
      g.fillStyle(deep(color), alpha);
      g.fillCircle(cx - s * 0.9, cy, s * 0.18);
      g.fillCircle(cx + s * 0.9, cy, s * 0.18);
      g.lineStyle(t, lit(color), alpha * 0.6);
      for (let i = -2; i <= 2; i++) {
        line(g, cx + s * 0.22, cy + i * s * 0.22 - s * 0.04, cx + s * 0.22, cy + i * s * 0.22 + s * 0.06,
          lit(color), alpha * 0.6, t);
      }
      break;
    }

    // ── Destinations ────────────────────────────────────────────────────

    case 'sword': {
      // Blade up, fullered, with a crossguard and a diamond pommel.
      fillPoly(g, [at(0, -1), at(0.2, -0.66), at(0.2, 0.1), at(-0.2, 0.1), at(-0.2, -0.66)], dark(color), alpha);
      strokePoly(g, [at(0, -1), at(0.2, -0.66), at(0.2, 0.1), at(-0.2, 0.1), at(-0.2, -0.66)], color, alpha, w);
      line(g, ...at(0, -0.86), ...at(0, 0.06), hot(color), alpha * 0.7, t);
      // Crossguard.
      fillPoly(g, [at(-0.72, 0.1), at(0.72, 0.1), at(0.62, 0.28), at(-0.62, 0.28)], mix(color, 0x000000, 0.4), alpha);
      strokePoly(g, [at(-0.72, 0.1), at(0.72, 0.1), at(0.62, 0.28), at(-0.62, 0.28)], color, alpha, t);
      // Grip + pommel.
      g.fillStyle(deep(color), alpha);
      g.fillRect(cx - s * 0.13, cy + s * 0.28, s * 0.26, s * 0.5);
      fillPoly(g, [at(0, 0.68), at(0.24, 0.86), at(0, 1.02), at(-0.24, 0.86)], lit(color), alpha);
      break;
    }

    case 'map': {
      // Folded parchment: zigzag top and bottom edges, a dotted route, a pin.
      const top: Pt[] = [at(-0.92, -0.6), at(-0.3, -0.76), at(0.3, -0.56), at(0.92, -0.74)];
      const bot: Pt[] = [at(0.92, 0.62), at(0.3, 0.78), at(-0.3, 0.58), at(-0.92, 0.76)];
      fillPoly(g, [...top, ...bot], dark(color), alpha);
      strokePoly(g, [...top, ...bot], color, alpha, w);
      // Fold creases.
      line(g, ...at(-0.3, -0.76), ...at(-0.3, 0.58), lit(color), alpha * 0.4, t);
      line(g, ...at(0.3, -0.56), ...at(0.3, 0.78), lit(color), alpha * 0.4, t);
      // Route.
      g.lineStyle(t * 1.2, hot(color), alpha * 0.7);
      g.beginPath();
      g.moveTo(...at(-0.6, 0.3));
      g.lineTo(...at(-0.16, -0.06));
      g.lineTo(...at(0.16, 0.24));
      g.lineTo(...at(0.6, -0.2));
      g.strokePath();
      fillPoly(g, [at(0.6, -0.44), at(0.74, -0.24), at(0.6, -0.04), at(0.46, -0.24)], hot(color), alpha);
      break;
    }

    case 'husk': {
      // Angular head with swept horns and two lit eyes — the invasion motif.
      const head: Pt[] = [at(0, -0.5), at(0.58, -0.2), at(0.5, 0.5), at(0, 0.92), at(-0.5, 0.5), at(-0.58, -0.2)];
      fillPoly(g, head, dark(color), alpha);
      strokePoly(g, head, color, alpha, w);
      // Horns.
      strokePoly(g, [at(-0.44, -0.34), at(-0.8, -0.8), at(-0.5, -0.68)], color, alpha, t);
      strokePoly(g, [at(0.44, -0.34), at(0.8, -0.8), at(0.5, -0.68)], color, alpha, t);
      // Eyes — the one part that stays bright, so it reads at 10px.
      fillPoly(g, [at(-0.4, -0.02), at(-0.1, 0.06), at(-0.16, 0.24), at(-0.42, 0.16)], hot(color), alpha);
      fillPoly(g, [at(0.4, -0.02), at(0.1, 0.06), at(0.16, 0.24), at(0.42, 0.16)], hot(color), alpha);
      // Grimace.
      line(g, ...at(-0.2, 0.56), ...at(0.2, 0.56), deep(color), alpha, t);
      break;
    }

    case 'flask': {
      // Erlenmeyer: neck, shoulders, liquid, bubbles.
      const body: Pt[] = [at(-0.22, -0.9), at(0.22, -0.9), at(0.22, -0.3), at(0.78, 0.78), at(-0.78, 0.78)];
      fillPoly(g, body, deep(color), alpha);
      // Liquid line — the flask is two-thirds full.
      fillPoly(g, [at(-0.5, 0.14), at(0.5, 0.14), at(0.78, 0.78), at(-0.78, 0.78)], dark(color), alpha);
      g.fillStyle(lit(color), alpha * 0.5);
      g.fillRect(cx - s * 0.5, cy + s * 0.1, s, s * 0.08);
      strokePoly(g, body, color, alpha, w);
      // Cork band.
      line(g, ...at(-0.3, -0.9), ...at(0.3, -0.9), lit(color), alpha, w);
      // Bubbles.
      g.fillStyle(hot(color), alpha * 0.75);
      g.fillCircle(cx - s * 0.2, cy + s * 0.42, s * 0.1);
      g.fillCircle(cx + s * 0.16, cy + s * 0.56, s * 0.07);
      g.fillCircle(cx + s * 0.3, cy + s * 0.34, s * 0.05);
      break;
    }

    case 'trophy': {
      // Bowl, handles, stem, plinth.
      const bowl: Pt[] = [at(-0.56, -0.72), at(0.56, -0.72), at(0.42, 0.06), at(-0.42, 0.06)];
      fillPoly(g, bowl, dark(color), alpha);
      strokePoly(g, bowl, color, alpha, w);
      g.lineStyle(t, hot(color), alpha * 0.7);
      line(g, ...at(-0.44, -0.6), ...at(-0.36, -0.04), hot(color), alpha * 0.6, t);
      // Handles.
      g.lineStyle(w * 0.9, color, alpha);
      g.beginPath(); g.arc(cx - s * 0.56, cy - s * 0.38, s * 0.3, Math.PI * 0.5, Math.PI * 1.5, true); g.strokePath();
      g.beginPath(); g.arc(cx + s * 0.56, cy - s * 0.38, s * 0.3, Math.PI * 1.5, Math.PI * 0.5, true); g.strokePath();
      // Stem + plinth.
      g.fillStyle(deep(color), alpha);
      g.fillRect(cx - s * 0.12, cy + s * 0.06, s * 0.24, s * 0.36);
      fillPoly(g, [at(-0.5, 0.42), at(0.5, 0.42), at(0.6, 0.78), at(-0.6, 0.78)], mix(color, 0x000000, 0.4), alpha);
      strokePoly(g, [at(-0.5, 0.42), at(0.5, 0.42), at(0.6, 0.78), at(-0.6, 0.78)], color, alpha, t);
      break;
    }

    case 'globe': {
      g.fillStyle(deep(color), alpha);
      g.fillCircle(cx, cy, s * 0.88);
      g.lineStyle(w, color, alpha);
      g.strokeCircle(cx, cy, s * 0.88);
      // Meridians as nested ellipses, parallels as chords.
      g.lineStyle(t, lit(color), alpha * 0.7);
      g.strokeEllipse(cx, cy, s * 0.9, s * 1.76);
      g.strokeEllipse(cx, cy, s * 1.76, s * 1.76);
      for (const dy of [-0.46, 0, 0.46]) {
        const half = Math.sqrt(Math.max(0, 0.88 * 0.88 - dy * dy));
        line(g, cx - half * s, cy + dy * s, cx + half * s, cy + dy * s, lit(color), alpha * 0.6, t);
      }
      break;
    }

    case 'bag': {
      const body: Pt[] = [at(-0.76, -0.24), at(0.76, -0.24), at(0.62, 0.84), at(-0.62, 0.84)];
      fillPoly(g, body, dark(color), alpha);
      strokePoly(g, body, color, alpha, w);
      // Strap arc over the mouth.
      g.lineStyle(w * 0.9, color, alpha * 0.9);
      g.beginPath(); g.arc(cx, cy - s * 0.24, s * 0.42, Math.PI, 0); g.strokePath();
      // Flap + buckle.
      fillPoly(g, [at(-0.76, -0.24), at(0.76, -0.24), at(0.66, 0.2), at(-0.66, 0.2)],
        mix(color, 0x000000, 0.38), alpha);
      strokePoly(g, [at(-0.66, 0.2), at(0.66, 0.2)], color, alpha * 0.8, t, false);
      fillPoly(g, [at(0, 0.08), at(0.16, 0.26), at(0, 0.44), at(-0.16, 0.26)], hot(color), alpha);
      break;
    }

    case 'book': {
      // Open book: two page blocks tipped away from a central spine.
      const leftPg: Pt[] = [at(-0.9, -0.5), at(-0.06, -0.66), at(-0.06, 0.62), at(-0.9, 0.76)];
      const rightPg: Pt[] = [at(0.9, -0.5), at(0.06, -0.66), at(0.06, 0.62), at(0.9, 0.76)];
      fillPoly(g, leftPg, dark(color), alpha);
      fillPoly(g, rightPg, mix(color, 0x000000, 0.44), alpha);
      strokePoly(g, leftPg, color, alpha, w);
      strokePoly(g, rightPg, color, alpha, w);
      // Spine + text rules.
      line(g, ...at(0, -0.66), ...at(0, 0.62), hot(color), alpha * 0.8, t);
      g.lineStyle(t, lit(color), alpha * 0.4);
      for (let i = 0; i < 3; i++) {
        const yy = -0.24 + i * 0.28;
        line(g, ...at(-0.74, yy), ...at(-0.2, yy - 0.05), lit(color), alpha * 0.4, t);
        line(g, ...at(0.2, yy - 0.05), ...at(0.74, yy), lit(color), alpha * 0.4, t);
      }
      break;
    }

    case 'chest': {
      // Lid arc, banded body, lock plate.
      const box: Pt[] = [at(-0.86, -0.02), at(0.86, -0.02), at(0.86, 0.74), at(-0.86, 0.74)];
      fillPoly(g, box, dark(color), alpha);
      g.fillStyle(mix(color, 0x000000, 0.38), alpha);
      g.beginPath();
      g.arc(cx, cy - s * 0.02, s * 0.86, Math.PI, 0);
      g.fillPath();
      g.lineStyle(w, color, alpha);
      g.beginPath(); g.arc(cx, cy - s * 0.02, s * 0.86, Math.PI, 0); g.strokePath();
      strokePoly(g, box, color, alpha, w);
      line(g, ...at(-0.86, -0.02), ...at(0.86, -0.02), color, alpha * 0.8, t);
      // Iron bands.
      for (const bx of [-0.5, 0.5]) line(g, ...at(bx, -0.5), ...at(bx, 0.74), lit(color), alpha * 0.5, t);
      // Lock.
      g.fillStyle(hot(color), alpha);
      g.fillRect(cx - s * 0.14, cy - s * 0.2, s * 0.28, s * 0.36);
      g.fillStyle(deep(color), alpha);
      g.fillCircle(cx, cy - s * 0.02, s * 0.07);
      break;
    }

    case 'crown': {
      // Three-point crown on a jewelled band, with the right arm snapped short —
      // the same broken silhouette the King's door wears.
      const p: Pt[] = [
        at(-0.86, 0.36), at(-0.86, -0.56), at(-0.4, -0.1), at(0, -0.76),
        at(0.4, -0.1), at(0.86, -0.56), at(0.86, 0.36),
      ];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      // Band.
      g.fillStyle(mix(color, 0x000000, 0.36), alpha);
      g.fillRect(cx - s * 0.86, cy + s * 0.36, s * 1.72, s * 0.32);
      g.lineStyle(t, color, alpha);
      g.strokeRect(cx - s * 0.86, cy + s * 0.36, s * 1.72, s * 0.32);
      // Jewels on the points.
      for (const jx of [-0.86, 0, 0.86]) {
        g.fillStyle(hot(color), alpha);
        g.fillCircle(cx + jx * s, cy - s * (jx === 0 ? 0.76 : 0.56), s * 0.11);
      }
      break;
    }

    case 'door': {
      // Arched slab in a stepped frame, with a ring handle.
      const frame: Pt[] = [at(-0.8, 0.9), at(-0.8, -0.4), at(0, -0.96), at(0.8, -0.4), at(0.8, 0.9)];
      fillPoly(g, frame, deep(color), alpha);
      strokePoly(g, frame, color, alpha, w);
      const slab: Pt[] = [at(-0.56, 0.9), at(-0.56, -0.32), at(0, -0.74), at(0.56, -0.32), at(0.56, 0.9)];
      fillPoly(g, slab, dark(color), alpha);
      strokePoly(g, slab, color, alpha, t);
      // Straps + ring.
      for (const by of [-0.06, 0.42]) line(g, ...at(-0.56, by), ...at(0.56, by), lit(color), alpha * 0.45, t);
      g.lineStyle(t * 1.4, hot(color), alpha * 0.9);
      g.strokeCircle(cx + s * 0.3, cy + s * 0.2, s * 0.13);
      break;
    }

    case 'anvil': {
      const p: Pt[] = [
        at(-0.6, -0.5), at(0.5, -0.5), at(0.92, -0.24), at(0.5, -0.24),
        at(0.34, 0.1), at(0.52, 0.5), at(-0.52, 0.5), at(-0.34, 0.1), at(-0.6, -0.24),
      ];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      line(g, ...at(-0.6, -0.5), ...at(0.5, -0.5), hot(color), alpha * 0.85, t);
      // Sparks off the horn.
      for (const [sx, sy] of [[0.88, -0.56], [1.02, -0.34], [0.74, -0.72]] as Pt[]) {
        g.fillStyle(hot(color), alpha * 0.8);
        g.fillCircle(cx + sx * s, cy + sy * s, s * 0.06);
      }
      break;
    }

    case 'portal': {
      for (let i = 4; i >= 1; i--) {
        g.lineStyle(w * (i === 1 ? 1.2 : 0.7), color, alpha * (0.25 + i * 0.15));
        g.strokeEllipse(cx, cy, s * 1.7 * (i / 4), s * 1.9 * (i / 4));
      }
      g.fillStyle(hot(color), alpha * 0.9);
      g.fillCircle(cx, cy, s * 0.12);
      break;
    }

    case 'target': {
      g.lineStyle(w, color, alpha);
      g.strokeCircle(cx, cy, s * 0.86);
      g.lineStyle(t, color, alpha * 0.7);
      g.strokeCircle(cx, cy, s * 0.5);
      g.fillStyle(hot(color), alpha);
      g.fillCircle(cx, cy, s * 0.16);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) {
        line(g, cx + dx * s * 0.7, cy + dy * s * 0.7, cx + dx * s * 1.06, cy + dy * s * 1.06,
          color, alpha, t * 1.2);
      }
      break;
    }

    // ── State ───────────────────────────────────────────────────────────

    case 'lock':
    case 'unlock': {
      const open = name === 'unlock';
      // Shackle.
      g.lineStyle(w * 1.2, color, alpha * (open ? 0.7 : 1));
      g.beginPath();
      g.arc(cx + (open ? s * 0.34 : 0), cy - s * 0.32, s * 0.42, Math.PI, 0);
      g.strokePath();
      line(g, cx - s * 0.42 + (open ? s * 0.34 : 0), cy - s * 0.32,
        cx - s * 0.42 + (open ? s * 0.34 : 0), cy - s * 0.04, color, alpha * (open ? 0.7 : 1), w * 1.2);
      if (!open) line(g, cx + s * 0.42, cy - s * 0.32, cx + s * 0.42, cy - s * 0.04, color, alpha, w * 1.2);
      // Body.
      const body: Pt[] = [at(-0.62, -0.04), at(0.62, -0.04), at(0.62, 0.84), at(-0.62, 0.84)];
      fillPoly(g, body, dark(color), alpha);
      strokePoly(g, body, color, alpha, w);
      // Keyhole.
      g.fillStyle(open ? hot(color) : deep(color), alpha);
      g.fillCircle(cx, cy + s * 0.3, s * 0.15);
      fillPoly(g, [at(-0.09, 0.36), at(0.09, 0.36), at(0.06, 0.64), at(-0.06, 0.64)],
        open ? hot(color) : deep(color), alpha);
      break;
    }

    case 'check': {
      g.lineStyle(w * 1.7, deep(color), alpha * 0.8);
      g.beginPath();
      g.moveTo(...at(-0.74, 0.06)); g.lineTo(...at(-0.2, 0.62)); g.lineTo(...at(0.78, -0.62));
      g.strokePath();
      g.lineStyle(w * 1.1, hot(color), alpha);
      g.beginPath();
      g.moveTo(...at(-0.74, 0.06)); g.lineTo(...at(-0.2, 0.62)); g.lineTo(...at(0.78, -0.62));
      g.strokePath();
      break;
    }

    case 'cross': {
      g.lineStyle(w * 1.5, deep(color), alpha * 0.8);
      line(g, ...at(-0.66, -0.66), ...at(0.66, 0.66), deep(color), alpha * 0.8, w * 1.5);
      line(g, ...at(0.66, -0.66), ...at(-0.66, 0.66), deep(color), alpha * 0.8, w * 1.5);
      line(g, ...at(-0.66, -0.66), ...at(0.66, 0.66), hot(color), alpha, w);
      line(g, ...at(0.66, -0.66), ...at(-0.66, 0.66), hot(color), alpha, w);
      break;
    }

    case 'active': {
      // A live socket: lit core inside a ring, with a bloom.
      for (let i = 3; i >= 1; i--) {
        g.fillStyle(color, alpha * 0.1);
        g.fillCircle(cx, cy, s * (0.5 + i * 0.2));
      }
      g.lineStyle(w, color, alpha);
      g.strokeCircle(cx, cy, s * 0.74);
      g.fillStyle(hot(color), alpha);
      g.fillCircle(cx, cy, s * 0.38);
      break;
    }

    case 'shelved': {
      g.lineStyle(w, color, alpha * 0.75);
      g.strokeCircle(cx, cy, s * 0.74);
      g.lineStyle(t, color, alpha * 0.4);
      g.strokeCircle(cx, cy, s * 0.34);
      break;
    }

    case 'star': {
      const pts: Pt[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 1 : 0.42;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(at(Math.cos(a) * r, Math.sin(a) * r));
      }
      fillPoly(g, pts, dark(color), alpha);
      strokePoly(g, pts, lit(color), alpha, t);
      break;
    }

    case 'gift': {
      const box: Pt[] = [at(-0.8, -0.2), at(0.8, -0.2), at(0.8, 0.82), at(-0.8, 0.82)];
      fillPoly(g, box, dark(color), alpha);
      strokePoly(g, box, color, alpha, w);
      g.fillStyle(mix(color, 0x000000, 0.34), alpha);
      g.fillRect(cx - s * 0.9, cy - s * 0.42, s * 1.8, s * 0.28);
      g.lineStyle(t, color, alpha);
      g.strokeRect(cx - s * 0.9, cy - s * 0.42, s * 1.8, s * 0.28);
      // Ribbon down the front and the bow loops.
      g.fillStyle(hot(color), alpha * 0.9);
      g.fillRect(cx - s * 0.13, cy - s * 0.42, s * 0.26, s * 1.24);
      g.lineStyle(w * 0.9, hot(color), alpha);
      g.strokeCircle(cx - s * 0.26, cy - s * 0.62, s * 0.22);
      g.strokeCircle(cx + s * 0.26, cy - s * 0.62, s * 0.22);
      break;
    }

    case 'warning': {
      const p: Pt[] = [at(0, -0.88), at(0.94, 0.74), at(-0.94, 0.74)];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      g.fillStyle(hot(color), alpha);
      g.fillRect(cx - s * 0.1, cy - s * 0.32, s * 0.2, s * 0.62);
      g.fillCircle(cx, cy + s * 0.52, s * 0.12);
      break;
    }

    case 'plus': {
      g.fillStyle(color, alpha);
      g.fillRect(cx - s * 0.72, cy - s * 0.16, s * 1.44, s * 0.32);
      g.fillRect(cx - s * 0.16, cy - s * 0.72, s * 0.32, s * 1.44);
      break;
    }

    case 'minus': {
      g.fillStyle(color, alpha);
      g.fillRect(cx - s * 0.72, cy - s * 0.16, s * 1.44, s * 0.32);
      break;
    }

    case 'question': {
      g.lineStyle(w * 1.4, color, alpha);
      g.beginPath();
      g.arc(cx, cy - s * 0.36, s * 0.42, Math.PI * 0.9, Math.PI * 0.35);
      g.strokePath();
      line(g, cx + s * 0.02, cy - s * 0.02, cx + s * 0.02, cy + s * 0.32, color, alpha, w * 1.4);
      g.fillStyle(hot(color), alpha);
      g.fillCircle(cx + s * 0.02, cy + s * 0.68, s * 0.14);
      break;
    }

    case 'skull': {
      // Cranium, sockets, nasal notch, a row of teeth.
      g.fillStyle(dark(color), alpha);
      g.fillCircle(cx, cy - s * 0.16, s * 0.72);
      g.fillRect(cx - s * 0.44, cy - s * 0.2, s * 0.88, s * 0.72);
      g.lineStyle(w, color, alpha);
      g.beginPath(); g.arc(cx, cy - s * 0.16, s * 0.72, Math.PI, 0); g.strokePath();
      strokePoly(g, [at(-0.72, -0.16), at(-0.44, 0.52), at(0.44, 0.52), at(0.72, -0.16)], color, alpha, w, false);
      g.fillStyle(deep(color), alpha);
      g.fillCircle(cx - s * 0.3, cy - s * 0.18, s * 0.22);
      g.fillCircle(cx + s * 0.3, cy - s * 0.18, s * 0.22);
      fillPoly(g, [at(0, 0.02), at(0.12, 0.26), at(-0.12, 0.26)], deep(color), alpha);
      g.lineStyle(t, deep(color), alpha);
      for (const tx of [-0.22, 0, 0.22]) line(g, ...at(tx, 0.36), ...at(tx, 0.52), deep(color), alpha, t);
      break;
    }

    // ── Controls ────────────────────────────────────────────────────────

    case 'play': {
      fillPoly(g, [at(-0.5, -0.8), at(0.82, 0), at(-0.5, 0.8)], dark(color), alpha);
      strokePoly(g, [at(-0.5, -0.8), at(0.82, 0), at(-0.5, 0.8)], lit(color), alpha, w);
      break;
    }

    case 'pause': {
      for (const dx of [-0.42, 0.42]) {
        g.fillStyle(dark(color), alpha);
        g.fillRect(cx + dx * s - s * 0.2, cy - s * 0.76, s * 0.4, s * 1.52);
        g.lineStyle(t, lit(color), alpha);
        g.strokeRect(cx + dx * s - s * 0.2, cy - s * 0.76, s * 0.4, s * 1.52);
      }
      break;
    }

    case 'speaker':
    case 'mute': {
      const cone: Pt[] = [at(-0.82, -0.28), at(-0.4, -0.28), at(0.06, -0.76), at(0.06, 0.76), at(-0.4, 0.28), at(-0.82, 0.28)];
      fillPoly(g, cone, dark(color), alpha);
      strokePoly(g, cone, color, alpha, w);
      if (name === 'speaker') {
        g.lineStyle(t * 1.2, lit(color), alpha);
        for (let i = 1; i <= 3; i++) {
          g.beginPath();
          g.arc(cx + s * 0.1, cy, s * (0.2 + i * 0.26), -Math.PI / 3, Math.PI / 3);
          g.strokePath();
        }
      } else {
        line(g, ...at(0.34, -0.4), ...at(0.94, 0.4), hot(color), alpha, w);
        line(g, ...at(0.94, -0.4), ...at(0.34, 0.4), hot(color), alpha, w);
      }
      break;
    }

    case 'gear': {
      const teeth = 8;
      const pts: Pt[] = [];
      for (let i = 0; i < teeth * 4; i++) {
        const a = (Math.PI * 2 * i) / (teeth * 4);
        const r = i % 4 < 2 ? 0.94 : 0.66;
        pts.push(at(Math.cos(a) * r, Math.sin(a) * r));
      }
      fillPoly(g, pts, dark(color), alpha);
      strokePoly(g, pts, color, alpha, t);
      g.fillStyle(deep(color), alpha);
      g.fillCircle(cx, cy, s * 0.3);
      g.lineStyle(t, lit(color), alpha);
      g.strokeCircle(cx, cy, s * 0.3);
      break;
    }

    case 'refresh': {
      g.lineStyle(w * 1.2, color, alpha);
      g.beginPath(); g.arc(cx, cy, s * 0.7, Math.PI * 0.35, Math.PI * 1.85); g.strokePath();
      const ax = cx + Math.cos(Math.PI * 0.35) * s * 0.7;
      const ay = cy + Math.sin(Math.PI * 0.35) * s * 0.7;
      fillPoly(g, [[ax + s * 0.3, ay - s * 0.1], [ax - s * 0.16, ay - s * 0.28], [ax - s * 0.02, ay + s * 0.3]],
        hot(color), alpha);
      break;
    }

    case 'chevronLeft':
    case 'chevronRight': {
      const d = name === 'chevronLeft' ? -1 : 1;
      for (let i = 0; i < 2; i++) {
        const ox = (i * 0.44 - 0.22) * d;
        g.lineStyle(w * 1.2, color, alpha * (i === 0 ? 1 : 0.45));
        g.beginPath();
        g.moveTo(cx + (ox - 0.24 * d) * s, cy - s * 0.62);
        g.lineTo(cx + (ox + 0.24 * d) * s, cy);
        g.lineTo(cx + (ox - 0.24 * d) * s, cy + s * 0.62);
        g.strokePath();
      }
      break;
    }

    case 'screwdriver': {
      // Amber grip with moulded ridges, ferrule, shaft, flat tip.
      g.save();
      g.translateCanvas(cx, cy);
      g.rotateCanvas(-Math.PI / 4);
      g.fillStyle(dark(color), alpha);
      g.fillRoundedRect(-s * 0.95, -s * 0.3, s * 0.75, s * 0.6, s * 0.16);
      g.lineStyle(t, deep(color), alpha);
      for (const rx of [-0.72, -0.5]) {
        g.beginPath(); g.moveTo(rx * s, -s * 0.3); g.lineTo(rx * s, s * 0.3); g.strokePath();
      }
      g.fillStyle(lit(color), alpha);
      g.fillRect(-s * 0.22, -s * 0.16, s * 0.2, s * 0.32);
      g.fillRect(-s * 0.05, -s * 0.09, s * 0.85, s * 0.18);
      g.fillStyle(hot(color), alpha);
      g.fillRect(-s * 0.05, -s * 0.09, s * 0.85, s * 0.06);
      g.fillRect(s * 0.72, -s * 0.15, s * 0.24, s * 0.3);
      g.restore();
      break;
    }

    case 'eye': {
      const lid: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const tt = i / 12;
        lid.push(at(-0.96 + tt * 1.92, -Math.sin(tt * Math.PI) * 0.62));
      }
      for (let i = 12; i >= 0; i--) {
        const tt = i / 12;
        lid.push(at(-0.96 + tt * 1.92, Math.sin(tt * Math.PI) * 0.62));
      }
      fillPoly(g, lid, deep(color), alpha);
      strokePoly(g, lid, color, alpha, w);
      g.fillStyle(lit(color), alpha);
      g.fillCircle(cx, cy, s * 0.34);
      g.fillStyle(0x000000, alpha * 0.85);
      g.fillCircle(cx, cy, s * 0.16);
      g.fillStyle(0xffffff, alpha * 0.8);
      g.fillCircle(cx - s * 0.12, cy - s * 0.14, s * 0.07);
      break;
    }

    case 'scroll': {
      fillPoly(g, [at(-0.62, -0.62), at(0.62, -0.62), at(0.62, 0.62), at(-0.62, 0.62)], dark(color), alpha);
      strokePoly(g, [at(-0.62, -0.62), at(0.62, -0.62), at(0.62, 0.62), at(-0.62, 0.62)], color, alpha, t);
      for (const ry of [-0.62, 0.62]) {
        g.fillStyle(mix(color, 0x000000, 0.34), alpha);
        g.fillRect(cx - s * 0.86, cy + ry * s - s * 0.17, s * 1.72, s * 0.34);
        g.lineStyle(t, color, alpha);
        g.strokeRect(cx - s * 0.86, cy + ry * s - s * 0.17, s * 1.72, s * 0.34);
      }
      g.lineStyle(t, lit(color), alpha * 0.5);
      for (let i = 0; i < 3; i++) line(g, ...at(-0.42, -0.3 + i * 0.3), ...at(0.42, -0.3 + i * 0.3), lit(color), alpha * 0.5, t);
      break;
    }

    case 'hourglass': {
      const p: Pt[] = [at(-0.66, -0.82), at(0.66, -0.82), at(0.1, 0), at(0.66, 0.82), at(-0.66, 0.82), at(-0.1, 0)];
      fillPoly(g, p, deep(color), alpha);
      strokePoly(g, p, color, alpha, w);
      // Sand: a wedge left in the top, a cone piling in the bottom.
      fillPoly(g, [at(-0.44, -0.6), at(0.44, -0.6), at(0.06, -0.1), at(-0.06, -0.1)], hot(color), alpha * 0.85);
      fillPoly(g, [at(-0.4, 0.72), at(0.4, 0.72), at(0, 0.34)], hot(color), alpha * 0.85);
      for (const cy2 of [-0.82, 0.82]) {
        g.fillStyle(mix(color, 0x000000, 0.3), alpha);
        g.fillRect(cx - s * 0.78, cy + cy2 * s - s * 0.1, s * 1.56, s * 0.2);
      }
      break;
    }

    // ── Combat ──────────────────────────────────────────────────────────

    case 'heart': {
      g.fillStyle(dark(color), alpha);
      g.fillCircle(cx - s * 0.36, cy - s * 0.26, s * 0.42);
      g.fillCircle(cx + s * 0.36, cy - s * 0.26, s * 0.42);
      fillPoly(g, [at(-0.76, -0.1), at(0.76, -0.1), at(0, 0.88)], dark(color), alpha);
      strokePoly(g, [at(-0.76, -0.14), at(-0.36, -0.62), at(0, -0.2), at(0.36, -0.62), at(0.76, -0.14), at(0, 0.88)],
        color, alpha, w);
      g.fillStyle(hot(color), alpha * 0.55);
      g.fillCircle(cx - s * 0.34, cy - s * 0.34, s * 0.14);
      break;
    }

    case 'shield': {
      const p: Pt[] = [at(-0.72, -0.72), at(0.72, -0.72), at(0.72, 0.1), at(0, 0.92), at(-0.72, 0.1)];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      strokePoly(g, [at(-0.4, -0.34), at(0, 0.06), at(0.4, -0.34)], hot(color), alpha * 0.9, t * 1.4, false);
      line(g, ...at(-0.72, -0.72), ...at(0.72, -0.72), hot(color), alpha * 0.7, t);
      break;
    }

    case 'bolt': {
      const p: Pt[] = [at(0.24, -0.96), at(-0.62, 0.1), at(-0.06, 0.1), at(-0.28, 0.96), at(0.64, -0.16), at(0.06, -0.16)];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      line(g, ...at(0.14, -0.7), ...at(-0.3, 0.0), hot(color), alpha * 0.8, t);
      break;
    }

    case 'spark': {
      // Four-point sparkle with tapered arms.
      for (const [ax, ay] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as Pt[]) {
        fillPoly(g, [
          at(ax * 1, ay * 1),
          at(ay * 0.22 + ax * 0.24, -ax * 0.22 + ay * 0.24),
          at(-ay * 0.22 + ax * 0.24, ax * 0.22 + ay * 0.24),
        ], lit(color), alpha);
      }
      g.fillStyle(hot(color), alpha);
      g.fillCircle(cx, cy, s * 0.2);
      break;
    }

    case 'fist': {
      g.fillStyle(dark(color), alpha);
      g.fillRoundedRect(cx - s * 0.7, cy - s * 0.5, s * 1.3, s * 1.1, s * 0.28);
      g.lineStyle(w, color, alpha);
      g.strokeRoundedRect(cx - s * 0.7, cy - s * 0.5, s * 1.3, s * 1.1, s * 0.28);
      g.lineStyle(t, deep(color), alpha);
      for (let i = 0; i < 3; i++) {
        line(g, cx - s * 0.4 + i * s * 0.36, cy - s * 0.42, cx - s * 0.4 + i * s * 0.36, cy + s * 0.1,
          deep(color), alpha, t);
      }
      g.fillStyle(mix(color, 0x000000, 0.38), alpha);
      g.fillRoundedRect(cx + s * 0.5, cy - s * 0.2, s * 0.3, s * 0.6, s * 0.14);
      break;
    }

    // ── The base five ───────────────────────────────────────────────────

    case 'flame': {
      const outer: Pt[] = [
        at(0, -1), at(0.42, -0.32), at(0.62, 0.02), at(0.5, 0.56), at(0, 0.9),
        at(-0.5, 0.56), at(-0.62, 0.02), at(-0.36, -0.4),
      ];
      fillPoly(g, outer, dark(color), alpha);
      strokePoly(g, outer, color, alpha, w);
      fillPoly(g, [at(0, -0.3), at(0.3, 0.16), at(0.16, 0.62), at(-0.2, 0.6), at(-0.3, 0.1)], hot(color), alpha * 0.85);
      break;
    }

    case 'droplet': {
      // A round belly with a drawn-out point — built as a circle plus a wedge rather
      // than one polygon, so the belly stays smooth at any size.
      g.fillStyle(dark(color), alpha);
      g.fillCircle(cx, cy + s * 0.24, s * 0.66);
      fillPoly(g, [at(0, -1), at(0.5, 0.3), at(-0.5, 0.3)], dark(color), alpha);
      g.lineStyle(w, color, alpha);
      g.beginPath(); g.arc(cx, cy + s * 0.24, s * 0.66, Math.PI * 0.14, Math.PI * 0.86); g.strokePath();
      strokePoly(g, [at(-0.6, 0.06), at(0, -1), at(0.6, 0.06)], color, alpha, w, false);
      g.fillStyle(hot(color), alpha * 0.7);
      g.fillCircle(cx - s * 0.24, cy + s * 0.3, s * 0.14);
      break;
    }

    case 'leaf': {
      const p: Pt[] = [];
      for (let i = 0; i <= 14; i++) {
        const tt = i / 14;
        p.push(at(-0.8 + tt * 1.6, -Math.sin(tt * Math.PI) * 0.72 - 0.06 + tt * 0.5));
      }
      for (let i = 14; i >= 0; i--) {
        const tt = i / 14;
        p.push(at(-0.8 + tt * 1.6, Math.sin(tt * Math.PI) * 0.18 - 0.06 + tt * 0.5));
      }
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      // Midrib + veins.
      line(g, ...at(-0.8, -0.06), ...at(0.8, 0.44), hot(color), alpha * 0.8, t);
      for (let i = 1; i <= 3; i++) {
        const tt = i / 4;
        line(g, cx + (-0.8 + tt * 1.6) * s, cy + (-0.06 + tt * 0.5) * s,
          cx + (-0.8 + tt * 1.6 + 0.06) * s, cy + (-Math.sin(tt * Math.PI) * 0.5 - 0.06 + tt * 0.5) * s,
          lit(color), alpha * 0.5, t);
      }
      break;
    }

    case 'wind': {
      g.lineStyle(w * 1.1, color, alpha);
      for (let i = 0; i < 3; i++) {
        const yy = -0.52 + i * 0.52;
        const len = i === 1 ? 0.9 : 0.66;
        g.beginPath();
        g.moveTo(cx - s * 0.94, cy + yy * s);
        g.lineTo(cx + len * s, cy + yy * s);
        g.strokePath();
        // The curl at the end of each gust.
        g.beginPath();
        g.arc(cx + len * s, cy + (yy - 0.2) * s, s * 0.2, Math.PI * 0.5, Math.PI * 1.9);
        g.strokePath();
      }
      g.lineStyle(t, hot(color), alpha * 0.6);
      line(g, cx - s * 0.9, cy - s * 0.44, cx + s * 0.3, cy - s * 0.44, hot(color), alpha * 0.6, t);
      break;
    }

    case 'rock': {
      const p: Pt[] = [at(-0.9, 0.18), at(-0.5, -0.62), at(0.24, -0.86), at(0.86, -0.24), at(0.76, 0.62), at(-0.44, 0.8)];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      // Facet creases, so it reads as a chipped block rather than a blob.
      strokePoly(g, [at(-0.5, -0.62), at(-0.12, 0.02), at(0.76, 0.62)], lit(color), alpha * 0.45, t, false);
      strokePoly(g, [at(-0.12, 0.02), at(-0.9, 0.18)], lit(color), alpha * 0.45, t, false);
      strokePoly(g, [at(-0.12, 0.02), at(0.86, -0.24)], lit(color), alpha * 0.3, t, false);
      break;
    }

    case 'search': {
      g.lineStyle(w * 1.2, color, alpha);
      g.strokeCircle(cx - s * 0.2, cy - s * 0.2, s * 0.56);
      g.fillStyle(mix(C.void_, color, 0.2), alpha * 0.7);
      g.fillCircle(cx - s * 0.2, cy - s * 0.2, s * 0.56);
      line(g, ...at(0.22, 0.22), ...at(0.82, 0.82), color, alpha, w * 1.5);
      g.lineStyle(t, hot(color), alpha * 0.7);
      g.beginPath(); g.arc(cx - s * 0.2, cy - s * 0.2, s * 0.36, Math.PI * 1.1, Math.PI * 1.6); g.strokePath();
      break;
    }

    case 'chain': {
      // Two interlocked links, drawn on the diagonal.
      for (const [ox, oy] of [[-0.3, 0.3], [0.3, -0.3]] as Pt[]) {
        g.save();
        g.translateCanvas(cx + ox * s, cy + oy * s);
        g.rotateCanvas(-Math.PI / 4);
        g.lineStyle(w * 1.3, color, alpha);
        g.strokeRoundedRect(-s * 0.46, -s * 0.26, s * 0.92, s * 0.52, s * 0.24);
        g.lineStyle(t, hot(color), alpha * 0.55);
        g.strokeRoundedRect(-s * 0.34, -s * 0.16, s * 0.68, s * 0.32, s * 0.15);
        g.restore();
      }
      break;
    }

    case 'cart': {
      const basket: Pt[] = [at(-0.5, -0.24), at(0.86, -0.24), at(0.66, 0.34), at(-0.3, 0.34)];
      fillPoly(g, basket, dark(color), alpha);
      strokePoly(g, basket, color, alpha, w);
      g.lineStyle(t, lit(color), alpha * 0.5);
      for (const bx of [-0.06, 0.28]) line(g, ...at(bx, -0.24), ...at(bx - 0.05, 0.34), lit(color), alpha * 0.5, t);
      // Handle and wheels.
      strokePoly(g, [at(-0.92, -0.62), at(-0.66, -0.62), at(-0.5, -0.24)], color, alpha, w, false);
      g.fillStyle(lit(color), alpha);
      g.fillCircle(cx - s * 0.14, cy + s * 0.66, s * 0.15);
      g.fillCircle(cx + s * 0.5, cy + s * 0.66, s * 0.15);
      break;
    }

    case 'moon': {
      // Crescent: a disc with a second disc bitten out of it.
      g.fillStyle(dark(color), alpha);
      g.fillCircle(cx, cy, s * 0.88);
      g.fillStyle(C.void_, alpha);
      g.fillCircle(cx + s * 0.44, cy - s * 0.24, s * 0.78);
      g.lineStyle(w, color, alpha);
      g.beginPath(); g.arc(cx, cy, s * 0.88, Math.PI * 0.32, Math.PI * 1.42); g.strokePath();
      g.fillStyle(hot(color), alpha * 0.8);
      g.fillCircle(cx - s * 0.5, cy + s * 0.2, s * 0.08);
      break;
    }

    case 'scales': {
      // Beam, fulcrum, two pans.
      line(g, ...at(0, -0.9), ...at(0, 0.62), color, alpha, w);
      line(g, ...at(-0.82, -0.62), ...at(0.82, -0.62), color, alpha, w);
      for (const px of [-0.62, 0.62]) {
        line(g, cx + px * s, cy - s * 0.62, cx + px * s, cy - s * 0.28, color, alpha * 0.7, t);
        fillPoly(g, [at(px - 0.3, -0.28), at(px + 0.3, -0.28), at(px + 0.18, 0.06), at(px - 0.18, 0.06)],
          dark(color), alpha);
        strokePoly(g, [at(px - 0.3, -0.28), at(px + 0.3, -0.28), at(px + 0.18, 0.06), at(px - 0.18, 0.06)],
          color, alpha, t);
      }
      fillPoly(g, [at(-0.44, 0.86), at(0.44, 0.86), at(0.2, 0.62), at(-0.2, 0.62)], dark(color), alpha);
      strokePoly(g, [at(-0.44, 0.86), at(0.44, 0.86), at(0.2, 0.62), at(-0.2, 0.62)], color, alpha, t);
      g.fillStyle(hot(color), alpha);
      g.fillCircle(cx, cy - s * 0.62, s * 0.1);
      break;
    }

    case 'coffin': {
      const p: Pt[] = [at(-0.32, -0.92), at(0.32, -0.92), at(0.58, -0.24), at(0.4, 0.92), at(-0.4, 0.92), at(-0.58, -0.24)];
      fillPoly(g, p, dark(color), alpha);
      strokePoly(g, p, color, alpha, w);
      // Lid seam and a cut cross.
      line(g, ...at(-0.5, -0.24), ...at(0.5, -0.24), lit(color), alpha * 0.4, t);
      line(g, ...at(0, -0.62), ...at(0, 0.18), hot(color), alpha * 0.75, t * 1.2);
      line(g, ...at(-0.24, -0.34), ...at(0.24, -0.34), hot(color), alpha * 0.75, t * 1.2);
      break;
    }

    case 'acid': {
      // A vial tipped over its own puddle, fuming.
      const vial: Pt[] = [at(-0.5, -0.9), at(0.1, -0.9), at(0.34, -0.2), at(0.34, 0.34), at(-0.26, 0.34), at(-0.26, -0.2)];
      fillPoly(g, vial, deep(color), alpha);
      fillPoly(g, [at(-0.26, -0.06), at(0.34, -0.06), at(0.34, 0.34), at(-0.26, 0.34)], dark(color), alpha);
      strokePoly(g, vial, color, alpha, w);
      // Drips leaving the lip and the puddle they land in.
      g.fillStyle(hot(color), alpha * 0.9);
      g.fillCircle(cx + s * 0.5, cy + s * 0.16, s * 0.1);
      g.fillCircle(cx + s * 0.62, cy + s * 0.48, s * 0.07);
      fillPoly(g, [at(-0.86, 0.86), at(0.86, 0.86), at(0.62, 0.66), at(-0.6, 0.66)], dark(color), alpha);
      strokePoly(g, [at(-0.86, 0.86), at(0.62, 0.66)], hot(color), alpha * 0.6, t, false);
      break;
    }

    case 'cards': {
      // Two cards fanned, the front one pipped.
      g.save();
      g.translateCanvas(cx - s * 0.2, cy);
      g.rotateCanvas(-0.34);
      fillPoly(g, [[-s * 0.44, -s * 0.72], [s * 0.44, -s * 0.72], [s * 0.44, s * 0.72], [-s * 0.44, s * 0.72]],
        deep(color), alpha);
      strokePoly(g, [[-s * 0.44, -s * 0.72], [s * 0.44, -s * 0.72], [s * 0.44, s * 0.72], [-s * 0.44, s * 0.72]],
        color, alpha * 0.7, w * 0.8);
      g.restore();
      g.save();
      g.translateCanvas(cx + s * 0.22, cy + s * 0.06);
      g.rotateCanvas(0.2);
      fillPoly(g, [[-s * 0.46, -s * 0.74], [s * 0.46, -s * 0.74], [s * 0.46, s * 0.74], [-s * 0.46, s * 0.74]],
        dark(color), alpha);
      strokePoly(g, [[-s * 0.46, -s * 0.74], [s * 0.46, -s * 0.74], [s * 0.46, s * 0.74], [-s * 0.46, s * 0.74]],
        color, alpha, w);
      fillPoly(g, [[0, -s * 0.3], [s * 0.24, 0], [0, s * 0.3], [-s * 0.24, 0]], hot(color), alpha);
      g.restore();
      break;
    }

    case 'note': {
      // A beamed quaver.
      g.fillStyle(dark(color), alpha);
      g.save();
      g.translateCanvas(cx - s * 0.36, cy + s * 0.56);
      g.rotateCanvas(-0.35);
      g.fillEllipse(0, 0, s * 0.56, s * 0.42);
      g.restore();
      g.save();
      g.translateCanvas(cx + s * 0.42, cy + s * 0.34);
      g.rotateCanvas(-0.35);
      g.fillEllipse(0, 0, s * 0.56, s * 0.42);
      g.restore();
      g.lineStyle(w, color, alpha);
      line(g, ...at(-0.1, 0.5), ...at(-0.1, -0.78), color, alpha, w);
      line(g, ...at(0.68, 0.28), ...at(0.68, -0.94), color, alpha, w);
      // Beam.
      fillPoly(g, [at(-0.1, -0.78), at(0.68, -0.94), at(0.68, -0.62), at(-0.1, -0.46)], lit(color), alpha);
      break;
    }

    default: {
      // Anything unmapped still gets a mark rather than a hole in the layout.
      fillPoly(g, [at(0, -0.8), at(0.8, 0), at(0, 0.8), at(-0.8, 0)], dark(color), alpha);
      strokePoly(g, [at(0, -0.8), at(0.8, 0), at(0, 0.8), at(-0.8, 0)], color, alpha, w);
    }
  }
}

/** One icon on its own Graphics, ready to drop into a scene or a container. */
export function addIcon(scene: Phaser.Scene, opts: {
  x: number; y: number; size: number; name: IconName;
  color?: number; alpha?: number; depth?: number;
}): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(opts.depth ?? DEPTH.content);
  drawIcon(g, opts.name, opts.x, opts.y, opts.size, opts.color ?? C.steel, opts.alpha ?? 1);
  return g;
}

/**
 * An icon set into a hexagonal socket — the shape currency chips and stat tiles use, so a
 * glyph never floats loose on a plate.
 */
export function drawIconSocket(
  g: Phaser.GameObjects.Graphics,
  name: IconName, cx: number, cy: number, r: number, color: number, alpha = 1,
): void {
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(color, alpha * 0.05);
    g.fillCircle(cx, cy, r * (0.8 + i * 0.18));
  }
  g.fillStyle(mix(C.void_, color, 0.16), alpha);
  g.fillCircle(cx, cy, r);
  g.lineStyle(Math.max(1, r * 0.09), color, alpha * 0.6);
  g.strokeCircle(cx, cy, r);
  drawIcon(g, name, cx, cy, r * 0.62, color, alpha);
}
