import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BRASS, CANE, CANE_DARK, CARAMEL, CHERRY, CHOCOLATE, FLOSS, GINGER, GINGER_DARK, GINGER_PALE, GLASS,
  GRAPE, ICING, ICING_SHADE, IRON, LEMON, LICORICE, MINT, PINK, PINK_PALE, SALT, SALT_DARK, SALT_LIT,
  SUGAR, SWEETS, VERDIGRA, VERDIGRA_DARK,
  candyCane, drips, gardenerMark, gumdrop, lollipop, piping, rosette, sugarCube, sugarLoaf, twist, wrappedSweet,
} from './art';

/**
 * The Confection Court's set pieces. Each draws at its base line (`y` is where it meets the
 * ground) and returns any point the area wants to animate from — a chimney, a wheel hub, a flag.
 * The town is gingerbread on top: iced eaves, gumdrop ridges, boiled-sweet windows. The
 * Saltcellar underneath is grey salt-block and weeps when it rains.
 */

type Rng = () => number;

const pt = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** A boiled-sweet window: a pane of coloured sugar glass in an iced frame. */
function sweetWindow(g: G, x: number, y: number, w: number, h: number, pane: number, lit_ = true): void {
  g.fillStyle(ICING, 1); g.fillRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 4);
  g.fillStyle(lit_ ? lit(pane, 0.25) : dim(pane, 0.5), 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
  g.fillStyle(0xffffff, 0.45); g.fillRect(x - w / 2 + 2, y - h / 2 + 2, w * 0.3, h * 0.5);
  g.fillStyle(ICING, 1); g.fillRect(x - 1, y - h / 2, 2, h); g.fillRect(x - w / 2, y - 1, w, 2);
}

/**
 * A gingerbread house: baked walls with piped edges, a roof tiled in iced biscuit shingles with
 * gumdrops along the ridge, icing dripping off the eaves, boiled-sweet windows and a chocolate
 * door. Returns the chimney top.
 */
export function gingerHouse(g: G, x: number, y: number, w: number, h: number, roof: number, rng: Rng, pane = LEMON): Pt {
  shadow(g, x, y + 3, w * 1.2, 22);
  const wall = mixC(GINGER, GINGER_PALE, rng() * 0.3);
  g.fillStyle(GINGER_DARK, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Baked texture: freckles of darker crust.
  for (let i = 0; i < (w * h) / 160; i++) { g.fillStyle(dim(wall, 0.18), 0.5); g.fillCircle(x - w / 2 + 4 + rng() * (w - 8), y - h + 4 + rng() * (h - 8), 1 + rng()); }
  // Piped corners and a zig-zag band.
  piping(g, [{ x: x - w / 2, y }, { x: x - w / 2, y: y - h }], 2.4);
  piping(g, [{ x: x + w / 2, y }, { x: x + w / 2, y: y - h }], 2.4);
  const band: Pt[] = [];
  for (let k = 0; k <= 12; k++) band.push({ x: x - w / 2 + (w * k) / 12, y: y - h * 0.35 + (k % 2 ? -5 : 5) });
  piping(g, band, 1.8, PINK_PALE);
  // Roof.
  const rh = h * 0.75;
  const rp = [pt(x - w / 2 - 14, y - h + 2), pt(x + w / 2 + 14, y - h + 2), pt(x, y - h - rh)];
  g.fillStyle(dim(roof, 0.45), 1); g.fillTriangle(rp[0].x - 2, rp[0].y + 3, rp[1].x + 2, rp[1].y + 3, rp[2].x, rp[2].y - 3);
  g.fillStyle(roof, 1); g.fillTriangle(rp[0].x, rp[0].y, rp[1].x, rp[1].y, rp[2].x, rp[2].y);
  // Shingles: rows of biscuit scallops.
  for (let r = 1; r < 6; r++) {
    const t = r / 6;
    const yy = y - h - rh * (1 - t);
    const half = (w / 2 + 14) * t;
    for (let sx = x - half + 6; sx < x + half - 4; sx += 12) {
      g.fillStyle(r % 2 ? lit(roof, 0.15) : dim(roof, 0.08), 1);
      g.fillCircle(sx, yy, 6);
    }
  }
  drips(g, x - w / 2 - 14, x + w / 2 + 14, y - h + 3, 10, rng);
  // Gumdrops along the ridge lines.
  for (let k = 1; k < 5; k++) {
    const t = k / 5;
    gumdrop(g, x - (w / 2 + 14) * (1 - t), y - h - rh * t + 4, 4, SWEETS[(k + Math.floor(x)) % SWEETS.length]);
    gumdrop(g, x + (w / 2 + 14) * (1 - t), y - h - rh * t + 4, 4, SWEETS[(k + 2 + Math.floor(x)) % SWEETS.length]);
  }
  gumdrop(g, x, y - h - rh + 6, 6, CHERRY);
  // Chimney: a stick of rock.
  const cx = x + w * 0.24, cy = y - h - rh * 0.55;
  twist(g, [{ x: cx, y: cy + 16 }, { x: cx, y: cy - 22 }], 12, ICING, PINK, 1, 8);
  // Windows and a chocolate door.
  const wins = Math.max(1, Math.floor(w / 50));
  for (let i = 0; i < wins; i++) {
    const wx = x - w / 2 + (w / (wins + 1)) * (i + 1) + (i >= wins / 2 ? 14 : -14);
    sweetWindow(g, wx, y - h * 0.62, 16, 18, pane, rng() < 0.8);
  }
  g.fillStyle(dim(CHOCOLATE, 0.4), 1); g.fillRoundedRect(x - 12, y - 32, 24, 32, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.fillStyle(CHOCOLATE, 1); g.fillRoundedRect(x - 10, y - 30, 20, 30, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.lineStyle(1, dim(CHOCOLATE, 0.3), 1); g.lineBetween(x - 10, y - 20, x + 10, y - 20); g.lineBetween(x - 10, y - 10, x + 10, y - 10); g.lineBetween(x, y - 30, x, y);
  wrappedSweet(g, x + 6, y - 14, 2.4, LEMON);
  return { x: cx, y: cy - 24 };
}

/** A Saltcellar hovel: grey salt-block walls, a slab roof, brine stains weeping down. */
export function saltHovel(g: G, x: number, y: number, w: number, h: number, rng: Rng): Pt {
  shadow(g, x, y + 3, w * 1.15, 16);
  g.fillStyle(SALT_DARK, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(SALT, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Blocks.
  for (let r = 0; r * 12 < h; r++) {
    for (let c = 0; c * 18 < w + 18; c++) {
      const bx = x - w / 2 + c * 18 - (r % 2) * 9, by = y - h + r * 12;
      if (bx > x + w / 2 - 2) continue;
      g.lineStyle(1, SALT_DARK, 0.7); g.strokeRect(Math.max(x - w / 2, bx), by, Math.min(18, x + w / 2 - Math.max(x - w / 2, bx)), 12);
      if (rng() < 0.3) { g.fillStyle(SALT_LIT, 0.6); g.fillRect(Math.max(x - w / 2, bx) + 2, by + 2, 5, 2); }
    }
  }
  // Brine weeping down from the roof.
  for (let i = 0; i < 4; i++) {
    const sx = x - w / 2 + 8 + rng() * (w - 16);
    g.fillStyle(0x8a8a7a, 0.5); g.fillRect(sx, y - h, 3, h * (0.3 + rng() * 0.5));
  }
  // Slab roof and a sackcloth door.
  g.fillStyle(dim(SALT_DARK, 0.3), 1); g.fillRect(x - w / 2 - 8, y - h - 10, w + 16, 12);
  g.fillStyle(SALT_DARK, 1); g.fillRect(x - w / 2 - 6, y - h - 10, w + 12, 8);
  g.fillStyle(0x7a6a52, 1); g.fillRect(x - 9, y - 26, 18, 26);
  g.lineStyle(1, 0x5a4a3a, 1); for (let k = 0; k < 4; k++) g.lineBetween(x - 9, y - 22 + k * 6, x + 9, y - 20 + k * 6);
  // A single small window with a candle.
  g.fillStyle(0x2a2a26, 1); g.fillRect(x + w * 0.22 - 5, y - h * 0.6 - 5, 10, 10);
  g.fillStyle(0xffd890, 0.9); g.fillRect(x + w * 0.22 - 2, y - h * 0.6 - 2, 4, 5);
  return { x: x - w * 0.3, y: y - h - 12 };
}

/**
 * The Sweet-Tax House: a tall narrow counting-house of dark gingerbread with verdigris shutters,
 * the Gardener's rose iced on the pediment and a clock that tells you how long till Tithe-Day.
 */
export function sweetTaxHouse(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 240, h = 170;
  shadow(g, x, y + 4, w * 1.15, 26);
  const wall = dim(GINGER, 0.25);
  g.fillStyle(dim(wall, 0.5), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Pilasters of candy twist.
  for (const px of [x - w / 2 + 10, x - 40, x + 40, x + w / 2 - 10]) twist(g, [{ x: px, y }, { x: px, y: y - h }], 8, ICING, VERDIGRA, 1, 9);
  // Two rows of shuttered windows.
  for (const wy of [y - h * 0.72, y - h * 0.4]) {
    for (const wx of [x - 80, x, x + 80]) {
      if (wx === x && wy > y - h * 0.5) continue;
      g.fillStyle(VERDIGRA_DARK, 1); g.fillRect(wx - 18, wy - 14, 8, 28); g.fillRect(wx + 10, wy - 14, 8, 28);
      sweetWindow(g, wx, wy, 18, 24, 0x6ab8f0, true);
    }
  }
  // Pediment.
  g.fillStyle(dim(wall, 0.4), 1); g.fillTriangle(x - w / 2 - 14, y - h + 2, x + w / 2 + 14, y - h + 2, x, y - h - 70);
  g.fillStyle(lit(wall, 0.1), 1); g.fillTriangle(x - w / 2 - 8, y - h, x + w / 2 + 8, y - h, x, y - h - 64);
  drips(g, x - w / 2 - 14, x + w / 2 + 14, y - h + 2, 9, rng);
  gardenerMark(g, x, y - h - 26, 18, ICING, 1);
  // The clock over the door, counting down to Tithe-Day.
  g.fillStyle(ICING, 1); g.fillCircle(x, y - h * 0.62, 14);
  g.lineStyle(2, LICORICE, 1); g.strokeCircle(x, y - h * 0.62, 14);
  g.lineBetween(x, y - h * 0.62, x, y - h * 0.62 - 9); g.lineBetween(x, y - h * 0.62, x + 7, y - h * 0.62 + 3);
  // Great doors with brass studs, and a counting-hatch.
  g.fillStyle(LICORICE, 1); g.fillRoundedRect(x - 22, y - 50, 44, 50, { tl: 20, tr: 20, bl: 0, br: 0 });
  g.fillStyle(dim(CHOCOLATE, 0.2), 1); g.fillRoundedRect(x - 19, y - 47, 38, 47, { tl: 18, tr: 18, bl: 0, br: 0 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle(BRASS, 1); g.fillCircle(x - 10 + j * 20, y - 38 + i * 10, 1.6); }
  g.fillStyle(VERDIGRA, 1); g.fillRect(x - w / 2 + 6, y - 12, 34, 12);
  g.fillStyle(ICING, 1); g.fillRect(x - w / 2 + 8, y - 10, 30, 2);
  // The vault door, iron-banded, at the west side.
  g.fillStyle(IRON, 1); g.fillRect(x - w / 2 + 30, y - 34, 34, 34);
  g.lineStyle(2, dim(IRON, 0.4), 1); g.lineBetween(x - w / 2 + 30, y - 22, x - w / 2 + 64, y - 22); g.lineBetween(x - w / 2 + 30, y - 10, x - w / 2 + 64, y - 10);
  g.fillStyle(BRASS, 1); g.fillCircle(x - w / 2 + 56, y - 18, 2.5);
  // A tithe-board by the door.
  g.fillStyle(VERDIGRA_DARK, 1); g.fillRect(x + 50, y - 60, 46, 40);
  g.fillStyle(ICING, 0.85); for (let k = 0; k < 5; k++) g.fillRect(x + 54, y - 55 + k * 7, 20 + (k * 7) % 18, 2);
  return { x, y: y - h - 70 };
}

/** The Sweet-Tax scales: a brass balance taller than a man, sugar loaves in one pan. */
export function taxScales(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 2, 90, 22);
  g.fillStyle(dim(BRASS, 0.4), 1); g.fillRect(x - 24, y - 8, 48, 10);
  g.fillStyle(BRASS, 1); g.fillRect(x - 22, y - 10, 44, 8);
  g.fillStyle(dim(BRASS, 0.3), 1); g.fillRect(x - 4, y - 150, 8, 142);
  g.fillStyle(BRASS, 1); g.fillRect(x - 3, y - 150, 4, 142);
  // The beam, tipped toward the loaves — it always tips that way.
  const lx = x - 70, ly = y - 140, rx = x + 70, ry = y - 152;
  g.lineStyle(6, dim(BRASS, 0.4), 1); g.lineBetween(lx, ly + 2, rx, ry + 2);
  g.lineStyle(4, BRASS, 1); g.lineBetween(lx, ly, rx, ry);
  g.fillStyle(lit(BRASS, 0.3), 1); g.fillCircle(x, y - 146, 6);
  gardenerMark(g, x, y - 168, 10, VERDIGRA, 1);
  for (const [px, py, loaded] of [[lx, ly, true], [rx, ry, false]] as [number, number, boolean][]) {
    g.lineStyle(1.5, dim(BRASS, 0.2), 1); g.lineBetween(px, py, px - 26, py + 52); g.lineBetween(px, py, px + 26, py + 52);
    g.fillStyle(dim(BRASS, 0.35), 1); g.fillEllipse(px, py + 56, 64, 18);
    g.fillStyle(BRASS, 1); g.fillEllipse(px, py + 54, 60, 15);
    if (loaded) { sugarLoaf(g, px - 12, py + 54, 34); sugarLoaf(g, px + 10, py + 55, 30, 0x5a3ab0); }
    else { g.fillStyle(IRON, 1); g.fillRoundedRect(px - 10, py + 42, 20, 12, 3); g.fillStyle(ICING, 0.9); g.fillRect(px - 9, py + 42, 18, 3); }
  }
  return { x, y: y - 168 };
}

/**
 * The Bonbonnière — Prince Saccharo's palace: a wedding cake of a building in three round tiers,
 * each walled in pink fondant and piped round with rosettes, candy-cane columns at the doors,
 * cherries on the battlements and a dome of spun sugar on top with the Empress's green pennant.
 */
export function bonbonniere(g: G, x: number, y: number, rng: Rng): Pt {
  shadow(g, x, y + 6, 470, 50, 0.3);
  const tiers = [{ w: 400, h: 110, c: PINK_PALE }, { w: 300, h: 90, c: ICING }, { w: 200, h: 80, c: PINK }];
  let base = y;
  tiers.forEach((t, i) => {
    const top = base - t.h;
    // Drum wall.
    g.fillStyle(dim(t.c, 0.35), 1); g.fillRect(x - t.w / 2 - 2, top, t.w + 4, t.h + 2);
    g.fillStyle(t.c, 1); g.fillRect(x - t.w / 2, top, t.w, t.h);
    g.fillStyle(dim(t.c, 0.12), 1); g.fillEllipse(x, base, t.w, 28);
    g.fillStyle(lit(t.c, 0.2), 1); g.fillEllipse(x, top, t.w, 30);
    g.fillStyle(t.c, 1); g.fillEllipse(x, top + 2, t.w - 6, 26);
    // Vertical fluting.
    for (let fx = x - t.w / 2 + 14; fx < x + t.w / 2 - 6; fx += 20) { g.fillStyle(dim(t.c, 0.08), 1); g.fillRect(fx, top + 10, 6, t.h - 14); }
    // Rosettes round the rim, drips over the edge.
    drips(g, x - t.w / 2 + 6, x + t.w / 2 - 6, top + 12, 12, rng, i === 1 ? PINK_PALE : ICING);
    for (let rx = x - t.w / 2 + 12; rx < x + t.w / 2 - 6; rx += 26) rosette(g, rx, top + 4, 6, i === 1 ? PINK : ICING);
    // Windows of sugar glass in each tier.
    const wins = Math.floor(t.w / 70);
    for (let k = 0; k < wins; k++) {
      const wx = x - t.w / 2 + (t.w / (wins + 1)) * (k + 1);
      g.fillStyle(ICING, 1); g.fillRoundedRect(wx - 11, top + 26, 22, t.h * 0.5, { tl: 11, tr: 11, bl: 0, br: 0 });
      g.fillStyle(lit(GLASS, 0.1), 1); g.fillRoundedRect(wx - 8, top + 29, 16, t.h * 0.5 - 4, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.fillStyle(FLOSS, 0.4); g.fillRect(wx - 6, top + 34, 5, t.h * 0.3);
    }
    // Cherries on the battlements.
    for (let cx = x - t.w / 2 + 20; cx < x + t.w / 2; cx += 46) {
      g.fillStyle(dim(CHERRY, 0.3), 1); g.fillCircle(cx + 1, top - 3, 6);
      g.fillStyle(CHERRY, 1); g.fillCircle(cx, top - 4, 5.5);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(cx - 2, top - 6, 1.6);
      g.lineStyle(1.2, CANE_DARK, 1); g.lineBetween(cx, top - 9, cx + 3, top - 16);
    }
    base = top + 6;
  });
  // The dome: a cloud of spun sugar.
  const dy = base - 30;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI;
    g.fillStyle(i % 2 ? FLOSS : lit(FLOSS, 0.3), 0.95);
    g.fillCircle(x + Math.cos(a + Math.PI) * 60, dy + Math.sin(a + Math.PI) * 40 + 14, 24);
  }
  g.fillStyle(lit(FLOSS, 0.4), 1); g.fillCircle(x, dy - 4, 34);
  g.lineStyle(1.2, 0xffffff, 0.6);
  for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x, dy, 14 + i * 7, Math.PI * 1.1 + i * 0.2, Math.PI * 1.7 + i * 0.2, false); g.strokePath(); }
  // Flagstaff of rock candy.
  twist(g, [{ x, y: dy - 30 }, { x, y: dy - 110 }], 5, ICING, VERDIGRA, 1, 7);
  // The great door with candy-cane columns.
  for (const s of [-1, 1]) candyCane(g, x + s * 44, y, 96, s > 0 ? -1 : 1, CHERRY, 7);
  g.fillStyle(dim(CHOCOLATE, 0.3), 1); g.fillRoundedRect(x - 30, y - 70, 60, 70, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.fillStyle(CHOCOLATE, 1); g.fillRoundedRect(x - 26, y - 66, 52, 66, { tl: 26, tr: 26, bl: 0, br: 0 });
  piping(g, [{ x: x - 26, y: y - 40 }, { x: x + 26, y: y - 40 }], 2, PINK_PALE);
  rosette(g, x, y - 52, 7, PINK);
  gardenerMark(g, x, y - 84, 9, VERDIGRA, 1);
  return { x, y: dy - 110 };
}

/** The cane mill: a timber mill-house with its roof of barley-sugar tiles; the wheel is animated. */
export function caneMill(g: G, x: number, y: number, rng: Rng): void {
  const w = 200, h = 130;
  shadow(g, x, y + 3, w * 1.15, 24);
  g.fillStyle(dim(0x8a5a32, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(0x8a5a32, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let px = x - w / 2 + 8; px < x + w / 2; px += 14) { g.lineStyle(1, dim(0x8a5a32, 0.3), 0.8); g.lineBetween(px, y - h, px, y); }
  // Barley-sugar roof.
  g.fillStyle(dim(CARAMEL, 0.4), 1); g.fillTriangle(x - w / 2 - 16, y - h + 2, x + w / 2 + 16, y - h + 2, x, y - h - 80);
  g.fillStyle(CARAMEL, 1); g.fillTriangle(x - w / 2 - 12, y - h, x + w / 2 + 12, y - h, x, y - h - 74);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    g.lineStyle(3, lit(CARAMEL, 0.3), 0.8);
    g.lineBetween(x - (w / 2 + 12) * (1 - t), y - h - 74 * t, x + (w / 2 + 12) * (1 - t), y - h - 74 * t);
  }
  // Loading hatch with a sack on the hoist.
  g.fillStyle(dim(0x8a5a32, 0.6), 1); g.fillRect(x - 20, y - h - 30, 40, 30);
  g.fillStyle(0xd8c8a0, 1); g.fillEllipse(x, y - h - 10, 18, 22);
  // Barn doors and a sign: cane leaf.
  g.fillStyle(dim(0x8a5a32, 0.55), 1); g.fillRect(x - 30, y - 56, 60, 56);
  g.lineStyle(2, 0x5a3a1e, 1); g.lineBetween(x - 30, y - 56, x + 30, y); g.lineBetween(x + 30, y - 56, x - 30, y);
  g.fillStyle(CANE, 1); g.fillEllipse(x + 70, y - 90, 18, 40);
  // Sugar sacks stacked at the side.
  for (let i = 0; i < 5; i++) {
    const sx = x + w / 2 + 14 + (i % 3) * 16, sy = y - 4 - Math.floor(i / 3) * 14;
    g.fillStyle(dim(0xe8dcc0, 0.3), 1); g.fillEllipse(sx, sy + 1, 18, 14);
    g.fillStyle(0xe8dcc0, 1); g.fillEllipse(sx, sy, 16, 12);
    gardenerMark(g, sx, sy, 3.5, VERDIGRA, 0.8);
  }
  void rng;
}

/** The waterwheel on the mill race, turned by syrup. Drawn per frame. */
export function waterWheel(g: G, hub: Pt, angle: number): void {
  const r = 52;
  g.lineStyle(8, dim(0x6a4024, 0.3), 1); g.strokeCircle(hub.x, hub.y, r);
  g.lineStyle(6, 0x6a4024, 1); g.strokeCircle(hub.x, hub.y, r);
  for (let i = 0; i < 10; i++) {
    const a = angle + (i / 10) * Math.PI * 2;
    g.lineStyle(3, 0x5a3a1e, 1); g.lineBetween(hub.x, hub.y, hub.x + Math.cos(a) * r, hub.y + Math.sin(a) * r);
    g.fillStyle(0x8a5a32, 1);
    const px = hub.x + Math.cos(a) * (r + 4), py = hub.y + Math.sin(a) * (r + 4);
    g.fillRect(px - 5, py - 5, 10, 10);
    // Syrup dripping off the paddles on the way up.
    if (Math.sin(a) < -0.2) { g.fillStyle(0xe2902e, 0.8); g.fillCircle(px, py + 6, 2.2); }
  }
  g.fillStyle(IRON, 1); g.fillCircle(hub.x, hub.y, 8);
}

/** A windmill tower of gingerbread; its pinwheel sails are animated. Returns the hub. */
export function windmill(g: G, x: number, y: number, rng: Rng): Pt {
  shadow(g, x, y + 2, 70, 18);
  g.fillStyle(GINGER_DARK, 1); g.fillTriangle(x - 30, y, x + 30, y, x + 14, y - 130);
  g.fillTriangle(x - 30, y, x + 14, y - 130, x - 14, y - 130);
  g.fillStyle(GINGER, 1); g.fillTriangle(x - 27, y - 2, x + 27, y - 2, x + 12, y - 128);
  g.fillTriangle(x - 27, y - 2, x + 12, y - 128, x - 12, y - 128);
  for (let k = 1; k < 5; k++) piping(g, [{ x: x - 27 + k * 3.8, y: y - k * 26 }, { x: x + 27 - k * 3.8, y: y - k * 26 }], 1.5, ICING);
  g.fillStyle(MINT, 1); g.fillTriangle(x - 20, y - 126, x + 20, y - 126, x, y - 156);
  g.fillStyle(CHOCOLATE, 1); g.fillRoundedRect(x - 8, y - 22, 16, 22, { tl: 8, tr: 8, bl: 0, br: 0 });
  sweetWindow(g, x, y - 70, 10, 12, PINK, true);
  void rng;
  return { x, y: y - 128 };
}

/** Pinwheel sails turning — four striped vanes. */
export function pinwheel(g: G, hub: Pt, angle: number, r = 62): void {
  const cols = [PINK, MINT, LEMON, GRAPE];
  for (let i = 0; i < 4; i++) {
    const a = angle + (i / 4) * Math.PI * 2;
    const tip = { x: hub.x + Math.cos(a) * r, y: hub.y + Math.sin(a) * r };
    const side = { x: hub.x + Math.cos(a + 0.5) * r * 0.62, y: hub.y + Math.sin(a + 0.5) * r * 0.62 };
    g.fillStyle(dim(cols[i], 0.3), 1); g.fillTriangle(hub.x, hub.y, tip.x + 2, tip.y + 2, side.x + 2, side.y + 2);
    g.fillStyle(cols[i], 1); g.fillTriangle(hub.x, hub.y, tip.x, tip.y, side.x, side.y);
    g.fillStyle(0xffffff, 0.35); g.fillTriangle(hub.x, hub.y, tip.x, tip.y, (hub.x + tip.x) / 2 + 2, (hub.y + tip.y) / 2 + 4);
  }
  g.fillStyle(ICING, 1); g.fillCircle(hub.x, hub.y, 6);
  g.fillStyle(CHERRY, 1); g.fillCircle(hub.x, hub.y, 3);
}

/** The Cube Store: an open-fronted shed with the cube press and stacks of cubes. */
export function cubeStore(g: G, x: number, y: number, rng: Rng): void {
  const w = 140, h = 80;
  shadow(g, x, y + 3, w * 1.2, 18);
  g.fillStyle(dim(0x7a5030, 0.4), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(0x3a2418, 1); g.fillRect(x - w / 2, y - h, w, h);
  // Lean-to roof in pink-and-white stripes.
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 2 ? PINK : ICING, 1);
    g.fillPoints([pt(x - w / 2 - 10 + i * ((w + 20) / 8), y - h), pt(x - w / 2 - 10 + (i + 1) * ((w + 20) / 8), y - h), pt(x - w / 2 - 6 + (i + 1) * ((w + 12) / 8), y - h - 30), pt(x - w / 2 - 6 + i * ((w + 12) / 8), y - h - 30)], true, true);
  }
  // The press: an iron screw over a mould tray.
  g.fillStyle(IRON, 1); g.fillRect(x - 34, y - h + 6, 8, h - 10); g.fillRect(x + 26, y - h + 6, 8, h - 10); g.fillRect(x - 34, y - h + 6, 68, 8);
  g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(x - 3, y - h + 14, 6, 30);
  g.fillStyle(0x9a8a7a, 1); g.fillRect(x - 26, y - 22, 52, 10);
  // Stacks of cubes inside and out.
  for (let i = 0; i < 9; i++) sugarCube(g, x + 40 + (i % 3) * 12 - (Math.floor(i / 3) % 2) * 6, y - 4 - Math.floor(i / 3) * 12, 6);
  for (let i = 0; i < 6; i++) sugarCube(g, x - 56 + (i % 3) * 12, y - 4 - Math.floor(i / 3) * 12, 6);
  void rng;
}

/** The bakehouse: a brick oven house with a gingerbread front and a great chimney. */
export function ovenHouse(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 240, h = 120;
  shadow(g, x, y + 3, w * 1.15, 24);
  g.fillStyle(dim(0x8a3a24, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(0x8a3a24, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let r = 0; r * 10 < h; r++) for (let c = 0; c * 20 < w + 20; c++) {
    const bx = x - w / 2 + c * 20 - (r % 2) * 10;
    if (bx < x - w / 2 || bx > x + w / 2 - 20) continue;
    g.lineStyle(1, 0x5a2414, 0.6); g.strokeRect(bx, y - h + r * 10, 20, 10);
  }
  // Gingerbread front panel with the oven mouths glowing.
  g.fillStyle(GINGER_DARK, 1); g.fillRect(x - 80, y - 90, 160, 90);
  g.fillStyle(GINGER, 1); g.fillRect(x - 76, y - 86, 152, 86);
  drips(g, x - 80, x + 80, y - 90, 8, rng);
  for (const ox of [x - 40, x + 40]) {
    g.fillStyle(0xff9a40, 1); g.fillRoundedRect(ox - 20, y - 46, 40, 28, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffd080, 1); g.fillRoundedRect(ox - 14, y - 40, 28, 22, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.lineStyle(3, ICING, 1); g.beginPath(); g.arc(ox, y - 30, 24, Math.PI, 0, false); g.strokePath();
  }
  // Roof and chimney.
  g.fillStyle(dim(0x5a2414, 0.3), 1); g.fillRect(x - w / 2 - 8, y - h - 14, w + 16, 16);
  g.fillStyle(0x5a2414, 1); g.fillRect(x - w / 2 - 6, y - h - 14, w + 12, 12);
  const cx = x + 70;
  g.fillStyle(0x6a2a1a, 1); g.fillRect(cx - 14, y - h - 80, 28, 70);
  g.fillStyle(0x4a1a10, 1); g.fillRect(cx - 18, y - h - 86, 36, 10);
  // Racks of cooling gingerbread men by the door.
  g.fillStyle(0x5a3a1e, 1); g.fillRect(x - w / 2 + 6, y - 50, 30, 4); g.fillRect(x - w / 2 + 6, y - 30, 30, 4);
  g.fillStyle(GINGER_PALE, 1);
  for (let i = 0; i < 3; i++) { g.fillCircle(x - w / 2 + 12 + i * 9, y - 56, 3); g.fillCircle(x - w / 2 + 12 + i * 9, y - 36, 3); }
  return { x: cx, y: y - h - 88 };
}

/** The Taffy Works: a striped-awning hall with a pulling hook out front and taffy looped on it. */
export function taffyWorks(g: G, x: number, y: number, rng: Rng): Pt {
  const w = 240, h = 110;
  shadow(g, x, y + 3, w * 1.15, 22);
  g.fillStyle(dim(MINT, 0.5), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(lit(MINT, 0.3), 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let px = x - w / 2; px < x + w / 2; px += 16) { g.fillStyle(lit(MINT, 0.45), 1); g.fillRect(px, y - h, 8, h); }
  // Awning.
  for (let i = 0; i < 10; i++) {
    const ax = x - w / 2 - 10 + i * ((w + 20) / 10);
    g.fillStyle(i % 2 ? PINK : ICING, 1); g.fillRect(ax, y - h - 6, (w + 20) / 10, 26);
    g.fillStyle(i % 2 ? PINK : ICING, 1); g.fillCircle(ax + (w + 20) / 20, y - h + 20, (w + 20) / 20);
  }
  // Flat roof with a sign: a twist of taffy.
  g.fillStyle(dim(MINT, 0.5), 1); g.fillRect(x - w / 2 - 4, y - h - 22, w + 8, 16);
  twist(g, [{ x: x - 60, y: y - h - 40 }, { x: x + 60, y: y - h - 40 }], 12, PINK_PALE, ICING, 1, 10);
  // Wide doors.
  g.fillStyle(dim(CHOCOLATE, 0.2), 1); g.fillRect(x - 36, y - 60, 72, 60);
  sweetWindow(g, x - 80, y - 60, 24, 22, LEMON, true);
  sweetWindow(g, x + 80, y - 60, 24, 22, LEMON, true);
  void rng;
  return { x: x + 100, y: y - h - 20 };
}

/** A taffy-pulling hook post with a great loop of taffy hung on it (animated stretch in the area). */
export function pullingHook(g: G, x: number, y: number): Pt {
  candyCane(g, x, y, 80, -1, MINT, 8);
  return { x: x - 12, y: y - 72 };
}

/** The kettle beam on the Treacle Pool bank: three copper kettles over banked fires. */
export function kettleRack(g: G, x: number, y: number): Pt[] {
  const w = 180;
  shadow(g, x, y + 2, w * 1.1, 18);
  g.fillStyle(0x3a2418, 1); g.fillRect(x - w / 2, y - 96, 8, 96); g.fillRect(x + w / 2 - 8, y - 96, 8, 96);
  g.fillRect(x - w / 2 - 6, y - 102, w + 12, 10);
  const kettles: Pt[] = [];
  for (let i = 0; i < 3; i++) {
    const kx = x - 54 + i * 54, ky = y - 40;
    g.lineStyle(2, 0x2a1a10, 1); g.lineBetween(kx, y - 92, kx, ky - 16);
    g.fillStyle(dim(0xc8703a, 0.4), 1); g.fillEllipse(kx, ky + 1, 44, 34);
    g.fillStyle(0xc8703a, 1); g.fillEllipse(kx, ky, 42, 32);
    g.fillStyle(lit(0xc8703a, 0.4), 1); g.fillEllipse(kx - 8, ky - 6, 12, 8);
    g.fillStyle(CARAMEL, 1); g.fillEllipse(kx, ky - 12, 30, 8);
    // Fire stones under each.
    for (let s = 0; s < 5; s++) { g.fillStyle(0x5a5048, 1); g.fillCircle(kx - 16 + s * 8, y - 4, 4); }
    g.fillStyle(0x2a1a10, 1); g.fillRect(kx - 14, y - 14, 28, 8);
    kettles.push({ x: kx, y: y - 12 });
  }
  return kettles;
}

/** The piñata gallows on the Fête Ground: two posts, a beam, and bunting. The piñata swings (animated). */
export function pinataGallows(g: G, x: number, y: number): Pt {
  const w = 120;
  for (const s of [-1, 1]) {
    shadow(g, x + s * w / 2, y + 2, 26, 8);
    twist(g, [{ x: x + s * w / 2, y }, { x: x + s * w / 2, y: y - 150 }], 9, ICING, s > 0 ? PINK : MINT, 1, 10);
  }
  g.fillStyle(0x5a3a1e, 1); g.fillRect(x - w / 2 - 10, y - 158, w + 20, 10);
  g.fillStyle(lit(0x5a3a1e, 0.2), 1); g.fillRect(x - w / 2 - 10, y - 158, w + 20, 3);
  return { x, y: y - 150 };
}

/** A fête stall: a striped canopy over a counter of sweets. */
export function fairStall(g: G, x: number, y: number, color: number, rng: Rng): void {
  const w = 90;
  shadow(g, x, y + 2, w * 1.2, 14);
  g.fillStyle(0x6a4a2a, 1); g.fillRect(x - w / 2, y - 70, 5, 70); g.fillRect(x + w / 2 - 5, y - 70, 5, 70);
  g.fillStyle(dim(0xd8b080, 0.3), 1); g.fillRect(x - w / 2, y - 30, w, 30);
  g.fillStyle(0xd8b080, 1); g.fillRect(x - w / 2, y - 32, w, 6);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i % 2 ? color : ICING, 1);
    g.fillTriangle(x - w / 2 - 6 + i * ((w + 12) / 6), y - 72, x - w / 2 - 6 + (i + 1) * ((w + 12) / 6), y - 72, x - w / 2 - 6 + (i + 0.5) * ((w + 12) / 6), y - 56);
  }
  g.fillStyle(color, 1); g.fillRect(x - w / 2 - 6, y - 84, w + 12, 12);
  for (let i = 0; i < 5; i++) wrappedSweet(g, x - 30 + i * 15, y - 36, 4, SWEETS[Math.floor(rng() * SWEETS.length)], rng() * 3);
}

/** A child in sugar-glass on a plinth — the Prince's Glass Walk. Translucent, with a glint. */
export function glassFigure(g: G, x: number, y: number, s: number, seed: number): void {
  shadow(g, x, y + 2, 34, 10, 0.2);
  g.fillStyle(ICING_SHADE, 1); g.fillRect(x - 14, y - 12, 28, 12);
  g.fillStyle(ICING, 1); g.fillRect(x - 14, y - 14, 28, 4);
  const top = y - 14;
  const tint = mixC(GLASS, [PINK_PALE, 0xc8f0ff, LEMON][seed % 3], 0.25);
  g.fillStyle(tint, 0.55); g.fillEllipse(x, top - s * 0.9, s * 1.1, s * 1.6);
  g.fillStyle(tint, 0.6); g.fillCircle(x, top - s * 2.1, s * 0.48);
  g.fillStyle(tint, 0.5); g.fillCircle(x - s * 0.7, top - s * 1.1 + (seed % 2) * 4, s * 0.25); g.fillCircle(x + s * 0.7, top - s * 1.2, s * 0.25);
  g.lineStyle(1, 0xffffff, 0.7); g.strokeEllipse(x, top - s * 0.9, s * 1.1, s * 1.6); g.strokeCircle(x, top - s * 2.1, s * 0.48);
  g.fillStyle(0xffffff, 0.75); g.fillEllipse(x - s * 0.25, top - s * 1.3, s * 0.2, s * 0.6);
  // A name tag on the plinth.
  g.fillStyle(VERDIGRA, 1); g.fillRect(x - 8, y - 9, 16, 4);
}

/** A sugar-glass fountain running pink syrup (water animated over it). */
export function glassFountain(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 2, 120, 30);
  g.fillStyle(ICING_SHADE, 1); g.fillEllipse(x, y - 6, 120, 36);
  g.fillStyle(PINK_PALE, 1); g.fillEllipse(x, y - 10, 104, 28);
  g.fillStyle(FLOSS, 1); g.fillEllipse(x, y - 10, 90, 22);
  g.fillStyle(ICING, 1); g.fillRect(x - 6, y - 60, 12, 50);
  g.fillStyle(lit(GLASS, 0.2), 0.8); g.fillEllipse(x, y - 60, 46, 14);
  return { x, y: y - 64 };
}

/** A lollipop tree with a sugar-grass skirt. */
export function lollipopTree(g: G, x: number, y: number, s: number, c1: number, c2: number, spin: number): void {
  for (let i = 0; i < 6; i++) { g.lineStyle(2, i % 2 ? MINT : lit(MINT, 0.3), 1); g.lineBetween(x - 10 + i * 4, y + 2, x - 12 + i * 5, y - 8); }
  lollipop(g, x, y, s, s * 2.6, c1, c2, spin);
}

/** A gumdrop bush — three sugared domes in a clump. */
export function gumdropBush(g: G, x: number, y: number, s: number, rng: Rng): void {
  const cols = [MINT, PINK, LEMON, GRAPE, CHERRY];
  gumdrop(g, x - s * 0.9, y, s * 0.8, cols[Math.floor(rng() * cols.length)]);
  gumdrop(g, x + s * 0.9, y + 1, s * 0.75, cols[Math.floor(rng() * cols.length)]);
  gumdrop(g, x, y + 4, s, cols[Math.floor(rng() * cols.length)]);
}

/** A stand of sugar cane — tall jointed green stalks with ragged leaves. */
export function caneStand(g: G, x: number, y: number, h: number, rng: Rng): void {
  shadow(g, x, y + 1, 36, 8, 0.2);
  for (let i = 0; i < 5; i++) {
    const sx = x - 12 + i * 6, sh = h * (0.7 + rng() * 0.3);
    g.lineStyle(3.5, CANE_DARK, 1); g.lineBetween(sx, y, sx + (rng() - 0.5) * 6, y - sh);
    g.lineStyle(2.2, CANE, 1); g.lineBetween(sx, y, sx + (rng() - 0.5) * 4, y - sh);
    for (let j = 12; j < sh; j += 14) { g.lineStyle(2, dim(CANE, 0.4), 1); g.lineBetween(sx - 2, y - j, sx + 2, y - j); }
    g.lineStyle(1.5, lit(CANE, 0.2), 1);
    g.lineBetween(sx, y - sh, sx - 12, y - sh + 10); g.lineBetween(sx, y - sh, sx + 10, y - sh + 12);
  }
}

/** A sugar-loaf monument: a giant blue-papered loaf on a plinth — the town's pride and its tax. */
export function loafMonument(g: G, x: number, y: number): Pt {
  shadow(g, x, y + 2, 70, 18);
  g.fillStyle(SALT_DARK, 1); g.fillRect(x - 26, y - 18, 52, 18);
  g.fillStyle(SALT, 1); g.fillRect(x - 24, y - 20, 48, 6);
  sugarLoaf(g, x, y - 18, 96);
  return { x, y: y - 114 };
}

/** Exported so the area's ground can lay the same scattered wares. */
export const BAKE_COLORS = [GINGER, GINGER_PALE, SUGAR, CHERRY, MINT];
