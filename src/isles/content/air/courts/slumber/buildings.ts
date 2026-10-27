import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../art/IsleArt';
import {
  BOTTLE, BRASS, BRASS_DARK, CLOUD, DREAM, DREAM_LIT, FEATHER, LAMP_DIM, LINEN, MAUVE, MOON, MOON_GOLD, PLASTER,
  PLUM, QUILT_LAV, QUILT_ROSE, QUILTS, SLATE, TICKING, WALNUT, WALNUT_LIT, breathBottle, breathMeter, moon,
  pillow, star, stitchLine,
} from './art';

type Rng = () => number;

/**
 * The set pieces of the Slumber Court, each drawn at its own base line for y-sorting. Houses here
 * wear their roofs like nightcaps; every window has its curtains drawn and a lamp turned low
 * behind them; and everything the King owns is brass. Functions that have something animated
 * on them (a chimney, a bell, a drape) return the point the painter animates.
 */

// ── Houses ───────────────────────────────────────────────────────────

/**
 * A cottage with a nightcap roof: lilac plaster walls, shutters, curtains drawn over a low glow,
 * and a tall soft cone of a roof that slumps over at the top and ends in a pompom chimney-pot.
 * Returns the pompom (where the sleep-smoke comes out).
 */
export function nightcapCottage(g: G, x: number, y: number, w: number, h: number, roof: number, rng: Rng, wall = PLASTER): Pt {
  shadow(g, x, y + 4, w * 1.2, 22);
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Timber framing: a sill beam and two posts.
  g.fillStyle(WALNUT, 1);
  g.fillRect(x - w / 2, y - 6, w, 6); g.fillRect(x - w / 2, y - h, 5, h); g.fillRect(x + w / 2 - 5, y - h, 5, h);
  g.fillRect(x - w / 2, y - h, w, 5);
  for (let i = 0; i < (w * h) / 300; i++) { g.fillStyle(dim(wall, 0.08), 0.5); g.fillRect(x - w / 2 + 6 + rng() * (w - 16), y - h + 8 + rng() * (h - 18), 6 + rng() * 6, 2); }
  // The nightcap roof: a cone that leans, slumps and ends in a pompom.
  const lean = (rng() < 0.5 ? -1 : 1) * w * 0.35;
  const base0 = x - w / 2 - 12, base1 = x + w / 2 + 12, by = y - h + 2;
  const tip = { x: x + lean, y: y - h - h * 1.05 };
  const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(base0, by)];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new Phaser.Geom.Point(base0 + (x - w * 0.1 - base0) * t + Math.sin(t * Math.PI) * -6, by + (y - h - h * 0.95 - by) * t));
  }
  pts.push(new Phaser.Geom.Point(tip.x, tip.y));
  for (let i = 12; i >= 0; i--) {
    const t = i / 12;
    pts.push(new Phaser.Geom.Point(base1 + (x + w * 0.18 - base1) * t + Math.sin(t * Math.PI) * 6, by + (y - h - h * 0.8 - by) * t));
  }
  g.fillStyle(dim(roof, 0.45), 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 2)), true, true);
  g.fillStyle(roof, 1); g.fillPoints(pts, true, true);
  // Shingles as soft quilted rows, a stitch line along each.
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    const lx = base0 + (x - w * 0.1 - base0) * t, rx = base1 + (x + w * 0.18 - base1) * t, ry = by + (y - h - h * 0.88 - by) * t;
    stitchLine(g, lx + 4, ry, rx - 4, ry, lit(roof, 0.25), 0.7, 6, 4);
  }
  // The turned-up brim of the cap along the eaves.
  g.fillStyle(lit(roof, 0.35), 1); g.fillRoundedRect(base0 - 2, by - 8, base1 - base0 + 4, 12, 6);
  g.fillStyle(FEATHER, 1); g.fillCircle(tip.x, tip.y, 9);
  g.fillStyle(LINEN, 1); g.fillCircle(tip.x + 2, tip.y + 2, 5);
  // Windows: curtains drawn, a lamp behind each turned right down.
  const wins = Math.max(1, Math.floor(w / 50));
  for (let i = 0; i < wins; i++) {
    const wx = x - w / 2 + (w / (wins + 1)) * (i + 1) + (i >= wins / 2 ? 14 : -14);
    const wy = y - h * 0.6;
    g.fillStyle(WALNUT, 1); g.fillRect(wx - 11, wy - 11, 22, 22);
    g.fillStyle(dim(LAMP_DIM, 0.35), 1); g.fillRect(wx - 9, wy - 9, 18, 18);
    g.fillStyle(LAMP_DIM, 0.12); g.fillCircle(wx, wy, 18);
    // The curtains meet in the middle, with a sliver of light between.
    const cur = QUILTS[Math.floor(rng() * QUILTS.length)];
    g.fillStyle(dim(cur, 0.15), 1); g.fillRect(wx - 9, wy - 9, 8, 18); g.fillRect(wx + 1, wy - 9, 8, 18);
    g.fillStyle(LAMP_DIM, 0.8); g.fillRect(wx - 1, wy - 7, 2, 14);
    // Shutters folded open.
    g.fillStyle(SLATE, 1); g.fillRect(wx - 18, wy - 11, 6, 22); g.fillRect(wx + 12, wy - 11, 6, 22);
  }
  // Door with a little HUSH plaque.
  g.fillStyle(WALNUT, 1); g.fillRoundedRect(x - 12, y - 34, 24, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.fillStyle(WALNUT_LIT, 1); g.fillRoundedRect(x - 10, y - 32, 20, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 7, y - 26, 14, 5, 2); g.fillCircle(x + 6, y - 14, 1.6);
  return { x: tip.x, y: tip.y - 8 };
}

/**
 * Mother Eiderdown's — the feather-shop: a broad bow-fronted shopfront with pillows and quilts
 * stacked in the window, a striped ticking awning and a hanging sign shaped like a goose.
 */
export function featherShop(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 170, h = 100;
  const tip = nightcapCottage(g, x, y, w, h, MAUVE, rng, 0xe4d8e8);
  // Bow window stacked with pillows and folded quilts.
  g.fillStyle(WALNUT, 1); g.fillRoundedRect(x - 78, y - 66, 58, 50, 6);
  g.fillStyle(dim(LAMP_DIM, 0.25), 1); g.fillRoundedRect(x - 74, y - 62, 50, 42, 5);
  for (let i = 0; i < 4; i++) { g.fillStyle(QUILTS[(i + 1) % QUILTS.length], 1); g.fillRect(x - 70, y - 28 - i * 6, 42, 5); }
  pillow(g, x - 49, y - 52, 30, 14, FEATHER, 1, 0.1);
  // Ticking-stripe awning.
  for (let i = 0; i < 10; i++) {
    g.fillStyle(i % 2 ? TICKING : LINEN, 1);
    g.fillRect(x - w / 2 + i * (w / 10), y - h + 10, w / 10, 14);
    g.fillTriangle(x - w / 2 + i * (w / 10), y - h + 24, x - w / 2 + (i + 1) * (w / 10), y - h + 24, x - w / 2 + (i + 0.5) * (w / 10), y - h + 30);
  }
  // Goose sign on a bracket.
  g.lineStyle(3, WALNUT, 1); g.lineBetween(x + w / 2, y - h + 4, x + w / 2 + 30, y - h + 4);
  g.lineStyle(1, 0x3a3030, 1); g.lineBetween(x + w / 2 + 14, y - h + 4, x + w / 2 + 14, y - h + 12); g.lineBetween(x + w / 2 + 28, y - h + 4, x + w / 2 + 28, y - h + 12);
  g.fillStyle(FEATHER, 1); g.fillEllipse(x + w / 2 + 21, y - h + 22, 30, 16);
  g.fillCircle(x + w / 2 + 36, y - h + 12, 5);
  g.lineStyle(3, FEATHER, 1); g.lineBetween(x + w / 2 + 32, y - h + 20, x + w / 2 + 36, y - h + 13);
  g.fillStyle(MOON_GOLD, 1); g.fillTriangle(x + w / 2 + 40, y - h + 11, x + w / 2 + 46, y - h + 13, x + w / 2 + 40, y - h + 14);
  return tip;
}

// ── The Lullaby Belfry ───────────────────────────────────────────────

/**
 * The lullaby bell tower: a tall square tower of grey-lilac stone, timber-framed at the top where
 * the bell hangs in an open chamber under a pointed felt-capped spire. The bell itself is drawn
 * swinging by the painter; this returns its hanging point.
 */
export function belfry(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 110, h = 260;
  const stone = 0x8a86a2;
  shadow(g, x, y + 6, w * 1.6, 30);
  // Steps up to the door.
  for (let i = 0; i < 3; i++) { g.fillStyle(dim(stone, 0.2 + i * 0.05), 1); g.fillRect(x - 40 + i * 6, y - 6 - i * 6, 80 - i * 12, 7); }
  g.fillStyle(dim(stone, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h - 14);
  g.fillStyle(stone, 1); g.fillRect(x - w / 2, y - h, w, h - 16);
  // Coursed stone.
  for (let row = 0, yy = y - 26; yy > y - h + 70; yy -= 16, row++) {
    g.lineStyle(1, dim(stone, 0.25), 0.8); g.lineBetween(x - w / 2, yy, x + w / 2, yy);
    for (let xx = x - w / 2 + (row % 2) * 14; xx < x + w / 2; xx += 28) g.lineBetween(xx, yy, xx, yy - 16);
  }
  for (let i = 0; i < 40; i++) { g.fillStyle(lit(stone, 0.15), 0.4); g.fillRect(x - w / 2 + rng() * w, y - h + 70 + rng() * (h - 90), 4, 2); }
  // Door: arched, studded.
  g.fillStyle(dim(stone, 0.5), 1); g.fillRoundedRect(x - 18, y - 60, 36, 44, { tl: 18, tr: 18, bl: 0, br: 0 });
  g.fillStyle(WALNUT, 1); g.fillRoundedRect(x - 15, y - 57, 30, 41, { tl: 15, tr: 15, bl: 0, br: 0 });
  for (let i = 0; i < 6; i++) { g.fillStyle(BRASS_DARK, 1); g.fillCircle(x - 9 + (i % 3) * 9, y - 44 + Math.floor(i / 3) * 14, 1.6); }
  // A clock face that has no hands — the Slumber Court tells no time.
  g.fillStyle(dim(stone, 0.4), 1); g.fillCircle(x, y - 130, 26);
  g.fillStyle(LINEN, 1); g.fillCircle(x, y - 130, 22);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(0x3a3448, 1); g.fillCircle(x + Math.cos(a) * 17, y - 130 + Math.sin(a) * 17, 1.4); }
  moon(g, x, y - 130, 7, 0.9, 0.7);
  // The open bell chamber: timber posts, a dark interior.
  const cy = y - h - 10;
  g.fillStyle(0x1e1a2a, 1); g.fillRect(x - w / 2 + 8, cy - 76, w - 16, 74);
  g.fillStyle(WALNUT, 1);
  g.fillRect(x - w / 2, cy - 80, 10, 80); g.fillRect(x + w / 2 - 10, cy - 80, 10, 80);
  g.fillRect(x - 5, cy - 80, 10, 10);
  g.fillRect(x - w / 2 - 4, cy - 2, w + 8, 8);
  g.fillStyle(WALNUT_LIT, 1); g.fillRect(x - w / 2 - 4, cy - 2, w + 8, 2);
  // The headstock beam the bell hangs from.
  g.fillStyle(WALNUT, 1); g.fillRect(x - w / 2 + 6, cy - 72, w - 12, 7);
  // Spire: a tall cone in felt, quilted, with a moon finial.
  g.fillStyle(dim(PLUM, 0.4), 1); g.fillTriangle(x - w / 2 - 12, cy - 78, x + w / 2 + 12, cy - 78, x, cy - 210);
  g.fillStyle(PLUM, 1); g.fillTriangle(x - w / 2 - 8, cy - 80, x + w / 2 + 8, cy - 80, x, cy - 204);
  for (let k = 1; k < 6; k++) {
    const t = k / 6, half = (w / 2 + 8) * (1 - t);
    stitchLine(g, x - half + 3, cy - 80 - 124 * t, x + half - 3, cy - 80 - 124 * t, lit(PLUM, 0.3), 0.7, 5, 3);
  }
  g.lineStyle(2, BRASS, 1); g.lineBetween(x, cy - 204, x, cy - 222);
  moon(g, x, cy - 228, 7, 1, 0.8);
  return { x, y: cy - 66 };
}

/**
 * The bell itself, muffled in a felt jacket, swinging by `angle` from its headstock — drawn per
 * frame by the painter and by the Lullaby fight's music box rhyme.
 */
export function bell(g: G, hub: Pt, angle: number, s = 1, muffled = true): void {
  const c = Math.cos(angle), sn = Math.sin(angle);
  const P = (dx: number, dy: number): Phaser.Geom.Point => new Phaser.Geom.Point(hub.x + dx * c - dy * sn, hub.y + dx * sn + dy * c);
  const outline = [P(-8 * s, 4 * s), P(8 * s, 4 * s), P(14 * s, 22 * s), P(22 * s, 46 * s), P(-22 * s, 46 * s), P(-14 * s, 22 * s)];
  g.fillStyle(BRASS_DARK, 1); g.fillPoints(outline, true, true);
  g.fillStyle(BRASS, 1); g.fillPoints(outline.map((p) => new Phaser.Geom.Point(hub.x + (p.x - hub.x) * 0.9, hub.y + (p.y - hub.y) * 0.95)), true, true);
  const lip0 = P(-24 * s, 46 * s), lip1 = P(24 * s, 46 * s);
  g.lineStyle(4 * s, BRASS_DARK, 1); g.lineBetween(lip0.x, lip0.y, lip1.x, lip1.y);
  if (muffled) {
    // A felt jacket tied round the waist of the bell with string.
    const j = [P(-15 * s, 18 * s), P(15 * s, 18 * s), P(21 * s, 40 * s), P(-21 * s, 40 * s)];
    g.fillStyle(QUILT_LAV, 1); g.fillPoints(j, true, true);
    const s0 = P(-17 * s, 28 * s), s1 = P(17 * s, 28 * s);
    g.lineStyle(1.4, 0x5a4a6a, 1); g.lineBetween(s0.x, s0.y, s1.x, s1.y);
    const kn = P(0, 28 * s); g.fillStyle(0x5a4a6a, 1); g.fillCircle(kn.x, kn.y, 2);
  }
  const hl = P(-8 * s, 14 * s); g.fillStyle(0xffffff, 0.3); g.fillEllipse(hl.x, hl.y, 4 * s, 10 * s);
}

// ── The Four-Poster ──────────────────────────────────────────────────

/**
 * Prince Reverie's residence, the Four-Poster: a manor built as a bed for a giant. Four carved
 * walnut posts as tall as towers stand at its corners with crescent-moon finials; a canopy of
 * quilted lilac silk is its roof, hung round with a scalloped valance; the front is a pair of bed
 * curtains tied back with gold cord on a door, and the great pillows of its upper storey bulge
 * under the canopy. Returns the middle of the valance (where the painter sways the drapes).
 */
export function fourPoster(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 380, h = 150;
  shadow(g, x, y + 8, w * 1.2, 50, 0.4);
  // The body: a padded headboard wall in quilted rose.
  g.fillStyle(dim(QUILT_ROSE, 0.45), 1); g.fillRect(x - w / 2 + 16, y - h - 4, w - 32, h + 4);
  g.fillStyle(QUILT_ROSE, 1); g.fillRect(x - w / 2 + 18, y - h, w - 36, h);
  // Deep-buttoned diamond tufting all over it.
  for (let row = 0; row < 6; row++) for (let col = 0; col < 14; col++) {
    const bx = x - w / 2 + 34 + col * 25 + (row % 2) * 12, by = y - h + 16 + row * 22;
    if (bx > x + w / 2 - 26) continue;
    g.lineStyle(1, dim(QUILT_ROSE, 0.2), 0.8);
    g.lineBetween(bx, by, bx + 12, by + 11); g.lineBetween(bx, by, bx - 12, by + 11);
    g.fillStyle(dim(QUILT_ROSE, 0.4), 1); g.fillCircle(bx, by, 2);
  }
  // Pillows bulging out along the top of the wall.
  for (let i = 0; i < 4; i++) pillow(g, x - 120 + i * 80, y - h - 10, 76, 30, i % 2 ? FEATHER : LINEN, 1, (rng() - 0.5) * 0.15);
  // The canopy roof: a broad flat tester of quilted silk.
  const cTop = y - h - 120;
  g.fillStyle(dim(QUILT_LAV, 0.45), 1); g.fillRect(x - w / 2 - 14, cTop - 4, w + 28, 40);
  g.fillStyle(QUILT_LAV, 1); g.fillRect(x - w / 2 - 12, cTop, w + 24, 34);
  for (let i = 0; i < 12; i++) stitchLine(g, x - w / 2 - 6 + i * ((w + 12) / 12), cTop + 4, x - w / 2 - 6 + i * ((w + 12) / 12), cTop + 30, lit(QUILT_LAV, 0.3), 0.7, 4, 3);
  // Four posts: carved, turned, crescent finials.
  for (const px of [x - w / 2 - 4, x + w / 2 + 4]) {
    for (const back of [true, false]) {
      const py = back ? y - h + 10 : y;
      const top = cTop - 40 - (back ? 10 : 0);
      g.fillStyle(dim(WALNUT, 0.3), 1); g.fillRect(px - 9, top, 18, py - top);
      g.fillStyle(WALNUT, 1); g.fillRect(px - 7, top, 14, py - top);
      g.fillStyle(WALNUT_LIT, 1); g.fillRect(px - 5, top, 3, py - top);
      // Turned bulbs up the post.
      for (let k = 0; k < 4; k++) {
        const by = py - 30 - k * ((py - top - 40) / 4);
        g.fillStyle(WALNUT, 1); g.fillEllipse(px, by, 24, 14);
        g.fillStyle(WALNUT_LIT, 1); g.fillEllipse(px - 3, by - 3, 10, 4);
      }
      // Crescent finial.
      g.fillStyle(MOON_GOLD, 1); g.fillCircle(px, top - 12, 11);
      g.fillStyle(back ? dim(WALNUT, 0.5) : 0x2a2a52, 1); g.fillCircle(px + 5, top - 15, 9);
      g.fillStyle(MOON, 1); g.fillCircle(px - 4, top - 14, 2);
    }
  }
  // The bed curtains at the front: two great swags tied back with gold cord over the door.
  for (const sgn of [-1, 1]) {
    const cx0 = x + sgn * 30, cx1 = x + sgn * 120;
    const pts = [
      new Phaser.Geom.Point(cx0, cTop + 34), new Phaser.Geom.Point(cx1 + sgn * 30, cTop + 34),
      new Phaser.Geom.Point(cx1 + sgn * 10, y - 70), new Phaser.Geom.Point(cx1 + sgn * 26, y),
      new Phaser.Geom.Point(cx0 + sgn * 34, y), new Phaser.Geom.Point(cx0 + sgn * 8, y - 70),
    ];
    g.fillStyle(dim(DREAM, 0.35), 1); g.fillPoints(pts, true, true);
    g.fillStyle(DREAM, 0.95); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x - sgn * 3, p.y)), true, true);
    for (let k = 1; k < 5; k++) {
      g.lineStyle(1.5, dim(DREAM, 0.25), 0.8);
      g.lineBetween(cx0 + sgn * k * 22, cTop + 36, cx0 + sgn * (8 + k * 6), y - 72);
    }
    // Gold tie-back.
    g.fillStyle(MOON_GOLD, 1); g.fillEllipse(cx1 + sgn * 8, y - 72, 18, 8);
    g.lineStyle(2, MOON_GOLD, 1); g.lineBetween(cx1 + sgn * 8, y - 70, cx1 + sgn * 12, y - 52);
    g.fillCircle(cx1 + sgn * 12, y - 50, 3);
  }
  // The door between the curtains: dark, with a moon knocker.
  g.fillStyle(0x1c1830, 1); g.fillRoundedRect(x - 26, y - 76, 52, 76, { tl: 26, tr: 26, bl: 0, br: 0 });
  g.fillStyle(WALNUT, 1); g.fillRoundedRect(x - 22, y - 72, 44, 72, { tl: 22, tr: 22, bl: 0, br: 0 });
  g.lineStyle(2, WALNUT_LIT, 1); g.lineBetween(x, y - 70, x, y);
  moon(g, x, y - 40, 6, 1, 0.75);
  // The King's breath-meter set over the lintel, needle well into the red.
  breathMeter(g, x, y - 92, 12, 0.08);
  return { x, y: cTop + 34 };
}

// ── Workshops and stalls ─────────────────────────────────────────────

/**
 * The Down Mill, where Pillowmaker Down stuffs the Long Ward's bedding: a tall timber barn, a
 * slatted plucking drum turning in its side, sacks of down stacked at the door, and a chute in
 * the gable that puffs feathers out over the town. Returns the chute mouth and the drum hub.
 */
export function downMill(g: G, x: number, y: number, rng: Rng): { chute: Pt; drum: Pt } {
  const w = 220, h = 140;
  shadow(g, x, y + 5, w * 1.2, 30);
  const wood = 0x8a7060;
  g.fillStyle(dim(wood, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wood, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let xx = x - w / 2 + 12; xx < x + w / 2; xx += 14) { g.lineStyle(1.5, dim(wood, 0.25), 0.9); g.lineBetween(xx, y - h, xx, y); }
  // Gable roof in slate felt.
  g.fillStyle(dim(SLATE, 0.45), 1); g.fillTriangle(x - w / 2 - 16, y - h + 2, x + w / 2 + 16, y - h + 2, x, y - h - 100);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - w / 2 - 10, y - h, x + w / 2 + 10, y - h, x, y - h - 94);
  for (let k = 1; k < 5; k++) { const t = k / 5; stitchLine(g, x - (w / 2 + 10) * (1 - t), y - h - 94 * t, x + (w / 2 + 10) * (1 - t), y - h - 94 * t, lit(SLATE, 0.25), 0.7); }
  // The feather chute out of the gable.
  const chute = { x: x + 10, y: y - h - 50 };
  g.fillStyle(0x6a5a50, 1); g.fillRect(chute.x - 10, chute.y - 6, 30, 18);
  g.fillStyle(0x2a2228, 1); g.fillEllipse(chute.x + 20, chute.y + 3, 10, 16);
  // Big sliding door, half open, down drifting out of it.
  g.fillStyle(0x2a2228, 1); g.fillRect(x - 44, y - 82, 88, 82);
  g.fillStyle(dim(wood, 0.15), 1); g.fillRect(x - 6, y - 84, 60, 84);
  g.lineStyle(2, dim(wood, 0.4), 1); g.lineBetween(x - 6, y - 84, x + 54, y); g.lineBetween(x + 54, y - 84, x - 6, y);
  for (let i = 0; i < 18; i++) { g.fillStyle(FEATHER, 0.7); g.fillEllipse(x - 40 + rng() * 34, y - 4 - rng() * 30, 5, 2.5); }
  // Sacks of down by the door, tied at the neck.
  for (let i = 0; i < 4; i++) {
    const sx = x - 90 + (i % 2) * 26, sy = y - (i >= 2 ? 22 : 0);
    g.fillStyle(dim(LINEN, 0.3), 1); g.fillEllipse(sx, sy - 14, 30, 30);
    g.fillStyle(LINEN, 1); g.fillEllipse(sx - 1, sy - 15, 27, 27);
    g.fillStyle(dim(LINEN, 0.35), 1); g.fillRect(sx - 4, sy - 32, 8, 5);
    stitchLine(g, sx - 8, sy - 14, sx + 8, sy - 14, TICKING, 0.6, 3, 2);
  }
  // The plucking drum hub on the east wall (the painter turns its slats).
  const drum = { x: x + w / 2 - 34, y: y - 60 };
  g.fillStyle(0x3a2e2a, 1); g.fillCircle(drum.x, drum.y, 34);
  g.fillStyle(0x5a4a40, 1); g.fillCircle(drum.x, drum.y, 30);
  return { chute, drum };
}

/** The plucking drum's slats, turned by the painter. */
export function drumSlats(g: G, hub: Pt, angle: number): void {
  for (let i = 0; i < 8; i++) {
    const a = angle + (i / 8) * Math.PI * 2;
    g.lineStyle(4, 0x8a7060, 1);
    g.lineBetween(hub.x + Math.cos(a) * 6, hub.y + Math.sin(a) * 6, hub.x + Math.cos(a) * 28, hub.y + Math.sin(a) * 28);
    g.fillStyle(FEATHER, 0.85); g.fillCircle(hub.x + Math.cos(a) * 26, hub.y + Math.sin(a) * 26, 3);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(hub.x, hub.y, 6);
}

/**
 * Dreamwright Lull's booth: a little striped tent with an ear-trumpet over the flap (he listens
 * to sleepers' pillows), a moon-and-stars pennant, and a lantern of blue glass.
 */
export function dreamBooth(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 3, 140, 22);
  // Tent: striped canvas in dream violet and linen.
  const pts = [new Phaser.Geom.Point(x - 60, y), new Phaser.Geom.Point(x + 60, y), new Phaser.Geom.Point(x, y - 110)];
  g.fillStyle(dim(DREAM, 0.4), 1); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 2)), true, true);
  g.fillStyle(LINEN, 1); g.fillPoints(pts, true, true);
  for (let i = 0; i < 6; i++) {
    if (i % 2) continue;
    const a0 = -60 + i * 20, a1 = a0 + 20;
    g.fillStyle(DREAM, 1);
    g.fillTriangle(x + a0, y, x + a1, y, x + (a0 + a1) / 2 * 0.02, y - 108);
  }
  // Flap, open.
  g.fillStyle(0x1e1a30, 1); g.fillTriangle(x - 20, y, x + 20, y, x, y - 56);
  g.fillStyle(DREAM_LIT, 1); g.fillTriangle(x + 2, y, x + 24, y, x + 6, y - 50);
  // Ear-trumpet sign.
  g.fillStyle(BRASS, 1); g.fillTriangle(x + 40, y - 80, x + 62, y - 90, x + 62, y - 66);
  g.fillRect(x + 26, y - 81, 16, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x + 62, y - 78, 6, 24);
  // Pennant at the peak.
  g.lineStyle(2, WALNUT, 1); g.lineBetween(x, y - 108, x, y - 130);
  g.fillStyle(SLATE, 1); g.fillTriangle(x, y - 130, x + 26, y - 125, x, y - 118);
  star(g, x + 8, y - 124, 3, MOON_GOLD, 1);
  // Blue lantern hanging by the flap.
  g.lineStyle(1, 0x2a2632, 1); g.lineBetween(x - 34, y - 62, x - 34, y - 52);
  g.fillStyle(0x6a8ad8, 0.9); g.fillRoundedRect(x - 39, y - 52, 10, 14, 3);
  return { x: x - 34, y: y - 45 };
}

/**
 * A collector's cart: the King's brass-bound wagon of breath bottles that does the rounds of the
 * Long Ward after the lullaby. Racks of corked bottles, a brass breath-meter on the tailboard, two
 * big spoked wheels.
 */
export function collectorCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 130, 22);
  g.fillStyle(dim(BRASS, 0.5), 1); g.fillRect(x - 54, y - 50, 108, 34);
  g.fillStyle(0x4a3a40, 1); g.fillRect(x - 52, y - 48, 104, 30);
  g.fillStyle(BRASS, 1); g.fillRect(x - 54, y - 50, 108, 4); g.fillRect(x - 54, y - 20, 108, 4);
  // Bottle racks.
  for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) breathBottle(g, x - 44 + i * 11, y - 52 - r * 14 + (r ? 0 : 0), 4, 0.6 + ((i * 7) % 5) * 0.08);
  // Wheels.
  for (const wx of [x - 34, x + 34]) {
    g.fillStyle(0x2a2228, 1); g.fillCircle(wx, y - 12, 15);
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(wx, y - 12, 12);
    g.fillStyle(0x2a2228, 1); g.fillCircle(wx, y - 12, 10);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineStyle(2, BRASS, 1); g.lineBetween(wx, y - 12, wx + Math.cos(a) * 10, y - 12 + Math.sin(a) * 10); }
  }
  // Shafts and the tailboard meter.
  g.lineStyle(3, WALNUT, 1); g.lineBetween(x + 54, y - 30, x + 84, y - 22);
  breathMeter(g, x - 54, y - 34, 8, 0.9);
}

/**
 * A wicker hurdle — the sheepfold is penned with them — from a to b. Woven withies between stakes.
 */
export function hurdle(g: G, a: Pt, b: Pt): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.floor(len / 26));
  const withy = 0xa08060;
  for (let row = 0; row < 3; row++) {
    const off = -8 - row * 8;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const wave = (i + row) % 2 ? 2 : -2;
      g.lineStyle(3.5, dim(withy, 0.3), 1);
      g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0 + off + wave, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1 + off - wave);
      g.lineStyle(2, withy, 1);
      g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0 + off + wave - 1, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1 + off - wave - 1);
    }
  }
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.fillStyle(0x5a4030, 1); g.fillRect(a.x + (b.x - a.x) * t - 2, a.y + (b.y - a.y) * t - 34, 4, 36);
  }
}

/**
 * The counting stile in the fold: a two-bar jump the dream-sheep take one at a time, each one
 * counted by a notch on the post. The painter makes the sheep leap it.
 */
export function countingStile(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 10);
  g.fillStyle(WALNUT, 1); g.fillRect(x - 40, y - 40, 7, 42); g.fillRect(x + 33, y - 40, 7, 42);
  g.fillStyle(WALNUT_LIT, 1); g.fillRect(x - 42, y - 30, 84, 6); g.fillRect(x - 42, y - 14, 84, 6);
  // Notches on the post: the town's count, a long one every fifth.
  for (let i = 0; i < 14; i++) { g.lineStyle(1.2, 0x2a1a14, 1); g.lineBetween(x + 34, y - 38 + i * 2.6, x + (i % 5 === 4 ? 40 : 37), y - 38 + i * 2.6); }
}

/** A bedside table in the street, with a brass collection tray and a dimmed candle on it. */
export function bedsideTable(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 1, 26, 8);
  g.fillStyle(WALNUT, 1); g.fillRect(x - 9, y - 22, 3, 22); g.fillRect(x + 6, y - 22, 3, 22);
  g.fillStyle(WALNUT_LIT, 1); g.fillRect(x - 12, y - 26, 24, 6);
  g.fillStyle(BRASS, 1); g.fillEllipse(x - 3, y - 27, 12, 4);
  g.fillStyle(LINEN, 1); g.fillRect(x + 4, y - 36, 4, 10);
  return { x: x + 6, y: y - 38 };
}

/** A dream-sheep's pasture cloud floating in the cloud sea past the cliff — a raft of wool-white puffs. */
export function pastureCloud(g: G, x: number, y: number, r: number): void {
  g.fillStyle(0x000000, 0.1); g.fillEllipse(x + 10, y + r * 0.7, r * 2.6, r * 0.5);
  for (let i = 0; i < 7; i++) {
    const k = (i / 6) * 2 - 1;
    g.fillStyle(0xc8c0e4, 1); g.fillCircle(x + k * r * 1.1, y + r * 0.2, r * (0.5 + 0.2 * Math.cos(i * 1.7)));
  }
  for (let i = 0; i < 7; i++) {
    const k = (i / 6) * 2 - 1;
    g.fillStyle(CLOUD, 1); g.fillCircle(x + k * r, y - (1 - Math.abs(k)) * r * 0.3, r * (0.45 + 0.2 * Math.cos(i * 1.7)));
  }
  // Clover tufts: dream-sheep graze on the tops of clouds.
  for (let i = 0; i < 8; i++) { g.fillStyle(0xd8f0d8, 0.8); g.fillCircle(x - r * 0.8 + i * r * 0.23, y - r * 0.32 - Math.sin(i) * 3, 2); }
}

/** The ward's drinking pump, wrapped in felt so it does not squeak. */
export function feltPump(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 10);
  g.fillStyle(0x3a4060, 1); g.fillRoundedRect(x - 8, y - 46, 16, 46, 4);
  g.fillStyle(QUILT_LAV, 1); g.fillRect(x - 9, y - 34, 18, 16);
  stitchLine(g, x - 8, y - 26, x + 8, y - 26, 0x5a4a6a, 0.8, 3, 2);
  g.lineStyle(4, 0x3a4060, 1); g.lineBetween(x + 4, y - 44, x + 22, y - 54);
  g.fillStyle(0x3a4060, 1); g.fillRect(x - 16, y - 34, 10, 5);
  g.fillStyle(0x2a3048, 1); g.fillEllipse(x - 16, y - 2, 22, 7);
  g.fillStyle(BOTTLE, 0.4); g.fillEllipse(x - 16, y - 3, 16, 4);
}
