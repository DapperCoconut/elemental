import { type G, dim, glow, lit, mixC, shadow } from '../../../../art/IsleArt';
import { poly } from '../../../water/isle/port/art';

export { poly };

/**
 * Carillon Quay's set pieces — a harbour of bells. Everything here is bronze, granite, snow and
 * cream plaster: bells hung, bells cooling, bells cast in a pit, bells on buoys, bells in the tower.
 * Every helper draws at a base/feet point `x,y` and builds upward, so it can be a piece.
 */

// ── Palette ─────────────────────────────────────────────────────────

export const GRANITE = 0x8a8478;
export const GRANITE_DARK = 0x5a554c;
export const GRANITE_LIT = 0xb4aea0;
export const COBBLE = 0x958a7c;
export const COBBLE_ALT = 0x7e7468;
export const SNOW = 0xf0f4f8;
export const SNOW_SHADE = 0xc6d0dc;
export const BRONZE = 0xb27a3c;
export const BRONZE_DARK = 0x6a4420;
export const BRONZE_LIT = 0xe8b878;
export const VERDIGRIS = 0x5aa894;
export const BRASS = 0xd8b048;
export const BRASS_LIT = 0xf8e090;
export const BRASS_DARK = 0x8a6a20;
export const SILVER = 0xc8d0dc;
export const PLASTER = 0xe8dcc0;
export const OCHRE = 0xd8b88a;
export const ROSE = 0xc89a8a;
export const SLATE = 0x4a5a6a;
export const TILE = 0xa85a3a;
export const INK = 0x1c1a24;
export const PAPER = 0xf2ead2;
export const SEA = 0x2a5a78;
export const SEA_DEEP = 0x18344e;
export const SEA_SHALLOW = 0x3c7a90;
export const FOAM = 0xd8eef4;
export const WOOD = 0x6a4a30;
export const WOOD_DARK = 0x3a2a1a;
export const WOOD_LIT = 0x9a7650;
export const TAR = 0x2a2420;
export const EMBER = 0xffa04a;
export const MELT = 0xffd27a;
export const LAMP = 0xffe0a0;
export const TUNER_RED = 0x8a2a2e;
export const MAESTRO_GOLD = 0xe0c070;
export const RIBBON = 0xf8f6ff;

// ── Small shared marks ──────────────────────────────────────────────

/**
 * The Maestro's mark, which the Tuners stamp on everything they own: five stave lines inside a
 * gold ring, cut through by a baton.
 */
export function maestroMark(g: G, x: number, y: number, r: number, a = 1): void {
  g.fillStyle(INK, a); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.14), MAESTRO_GOLD, a); g.strokeCircle(x, y, r);
  g.lineStyle(Math.max(0.8, r * 0.06), MAESTRO_GOLD, a * 0.85);
  for (let k = -2; k <= 2; k++) {
    const yy = y + k * r * 0.26;
    const half = Math.sqrt(Math.max(0, r * r * 0.72 - (yy - y) * (yy - y)));
    g.lineBetween(x - half, yy, x + half, yy);
  }
  g.lineStyle(Math.max(1.2, r * 0.16), lit(MAESTRO_GOLD, 0.3), a);
  g.lineBetween(x - r * 0.62, y + r * 0.62, x + r * 0.62, y - r * 0.62);
  g.fillStyle(lit(MAESTRO_GOLD, 0.5), a); g.fillCircle(x + r * 0.62, y - r * 0.62, r * 0.12);
}

/** A quaver (eighth note) glyph, head at x,y. */
export function quaver(g: G, x: number, y: number, s: number, color: number, a = 1): void {
  g.fillStyle(color, a); g.fillEllipse(x, y, 7 * s, 5 * s);
  g.lineStyle(1.4 * s, color, a); g.lineBetween(x + 3.2 * s, y - 1, x + 3.2 * s, y - 14 * s);
  g.lineBetween(x + 3.2 * s, y - 14 * s, x + 8 * s, y - 9 * s);
}

/**
 * A bronze bell: `x,y` is the middle of the lip. Shoulder, waist and flared lip from a turned
 * profile, a shaded flank, an inscription band, verdigris weeping from the crown, canons on top,
 * and (optionally) a clapper ball hanging under the mouth.
 */
export function bell(g: G, x: number, y: number, s: number, metal = BRONZE, opts: { clapper?: boolean; warm?: number; patina?: number } = {}): void {
  const h = 40 * s;
  const prof: [number, number][] = [[-0.26, -1], [-0.31, -0.9], [-0.33, -0.66], [-0.36, -0.4], [-0.43, -0.18], [-0.52, -0.03], [-0.54, 0]];
  const pts: [number, number][] = [];
  for (const [px, py] of prof) pts.push([x + px * h, y + py * h]);
  for (let i = prof.length - 1; i >= 0; i--) pts.push([x - prof[i][0] * h, y + prof[i][1] * h]);
  // Dark outline a touch bigger, then the body.
  poly(g, pts.map(([px, py]) => [x + (px - x) * 1.06, y + (py - y) * 1.03 + 0.5] as [number, number]), dim(metal, 0.55), 1);
  poly(g, pts, metal, 1);
  // The shaded right flank.
  const right: [number, number][] = [[x + 0.06 * h, y - h], ...prof.map(([px, py]) => [x - px * h, y + py * h] as [number, number]), [x + 0.1 * h, y]];
  poly(g, right, dim(metal, 0.28), 0.75);
  // A long highlight down the left shoulder.
  g.fillStyle(lit(metal, 0.45), 0.7);
  poly(g, [[x - 0.2 * h, y - 0.92 * h], [x - 0.14 * h, y - 0.9 * h], [x - 0.24 * h, y - 0.2 * h], [x - 0.33 * h, y - 0.12 * h]], lit(metal, 0.45), 0.6);
  // Inscription band and sound-bow rings.
  g.lineStyle(Math.max(1, 1.2 * s), dim(metal, 0.4), 0.9);
  g.lineBetween(x - 0.33 * h, y - 0.66 * h, x + 0.33 * h, y - 0.66 * h);
  g.lineBetween(x - 0.34 * h, y - 0.58 * h, x + 0.34 * h, y - 0.58 * h);
  for (let k = 0; k < 6; k++) { g.fillStyle(dim(metal, 0.45), 0.8); g.fillRect(x - 0.28 * h + k * 0.1 * h, y - 0.64 * h, 0.05 * h, 0.04 * h); }
  g.lineStyle(Math.max(1, 1.4 * s), lit(metal, 0.25), 0.8);
  g.lineBetween(x - 0.46 * h, y - 0.12 * h, x + 0.46 * h, y - 0.12 * h);
  // The lip: an ellipse showing the dark mouth.
  g.fillStyle(dim(metal, 0.7), 1); g.fillEllipse(x, y, 1.08 * h, 0.16 * h);
  g.fillStyle(lit(metal, 0.2), 1); g.fillEllipse(x, y - 0.02 * h, 1.08 * h, 0.06 * h);
  // Patina weeping from the crown.
  const pat = opts.patina ?? 0.5;
  if (pat > 0) {
    for (let k = 0; k < 5; k++) {
      const vx = x - 0.22 * h + k * 0.11 * h;
      g.fillStyle(VERDIGRIS, pat * (0.5 + (k % 2) * 0.3));
      g.fillRect(vx, y - 0.96 * h, 0.035 * h, (0.18 + ((k * 37) % 5) * 0.07) * h);
    }
  }
  // Crown and canons (the cast loops it hangs by).
  g.fillStyle(dim(metal, 0.3), 1); g.fillRect(x - 0.26 * h, y - 1.04 * h, 0.52 * h, 0.06 * h);
  g.lineStyle(Math.max(1.5, 2.4 * s), dim(metal, 0.2), 1);
  g.beginPath(); g.arc(x, y - 1.06 * h, 0.1 * h, Math.PI, 0, false); g.strokePath();
  g.beginPath(); g.arc(x - 0.14 * h, y - 1.04 * h, 0.06 * h, Math.PI, 0, false); g.strokePath();
  g.beginPath(); g.arc(x + 0.14 * h, y - 1.04 * h, 0.06 * h, Math.PI, 0, false); g.strokePath();
  if (opts.clapper) {
    g.lineStyle(Math.max(1, 1.5 * s), 0x2a2420, 1); g.lineBetween(x, y - 0.4 * h, x, y + 0.1 * h);
    g.fillStyle(0x2a2420, 1); g.fillCircle(x, y + 0.12 * h, 0.07 * h);
  }
  if (opts.warm) {
    // Still hot from the pit: a dull red bloom on the waist and a glow round it.
    g.fillStyle(0xff5a2a, 0.22 * opts.warm); g.fillEllipse(x, y - 0.35 * h, 0.7 * h, 0.5 * h);
    glow(g, x, y - 0.4 * h, 0.8 * h, EMBER, 0.04 * opts.warm, 3);
  }
}

/** A post-and-pent lamp with a little brass bell hung under it (every quay lamp here rings in a gale). */
export function bellLamp(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 18, 6);
  g.fillStyle(0x2a2622, 1); g.fillRect(x - 2, y - 58, 4, 58);
  g.fillStyle(0x3a3530, 1); g.fillRect(x - 5, y - 4, 10, 4);
  g.fillRect(x - 2, y - 58, 16, 3);
  g.fillStyle(0x2a2622, 1); g.fillTriangle(x - 7, y - 66, x + 7, y - 66, x, y - 74);
  g.fillStyle(LAMP, 0.95); g.fillRect(x - 5, y - 66, 10, 9);
  glow(g, x, y - 61, 26, LAMP, 0.05, 3);
  bell(g, x + 12, y - 44, 0.28, BRASS, { patina: 0 });
}

// ── The carillon tower ──────────────────────────────────────────────

/** Where the tower's belfry sits relative to its base, for the swinging bells in `animateOver`. */
export const TOWER = { w: 136, shaft: 330, belfry: 120 };

/**
 * The carillon tower: a granite shaft with long quoins, a clock that has three marks instead of
 * twelve (Matins, Vespers, Compline), an open belfry of three arches (the bells are drawn live,
 * swinging), a lead spire with a gilt tuning-fork vane, and the ringing-room door at its foot with
 * bell-ropes looped beside it.
 */
export function carillonTower(g: G, x: number, y: number, rng: () => number): void {
  const w = TOWER.w;
  const x0 = x - w / 2;
  const shaftTop = y - TOWER.shaft;
  shadow(g, x, y + 6, w * 1.3, 34, 0.36);
  // Plinth.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x0 - 12, y - 30, w + 24, 30);
  g.fillStyle(GRANITE, 1); g.fillRect(x0 - 10, y - 32, w + 20, 24);
  g.fillStyle(0xb4aea0, 1); g.fillRect(x0 - 10, y - 32, w + 20, 3);
  // Shaft courses.
  g.fillStyle(dim(GRANITE, 0.2), 1); g.fillRect(x0, shaftTop, w, TOWER.shaft - 30);
  for (let cy = shaftTop; cy < y - 30; cy += 16) {
    const off = ((cy / 16) | 0) % 2 ? 0 : 18;
    for (let cx = x0 - off; cx < x0 + w; cx += 36) {
      const sx = Math.max(x0, cx), ex = Math.min(x0 + w, cx + 35);
      if (ex <= sx) continue;
      g.fillStyle(mixC(GRANITE, rng() < 0.5 ? 0xb4aea0 : GRANITE_DARK, rng() * 0.3), 1); g.fillRect(sx, cy + 1, ex - sx - 1, 14);
    }
  }
  // Right flank in shade; quoins on both corners.
  g.fillStyle(0x000000, 0.18); g.fillRect(x0 + w * 0.68, shaftTop, w * 0.32, TOWER.shaft - 30);
  for (let cy = shaftTop; cy < y - 30; cy += 32) {
    g.fillStyle(0xc8c2b4, 1); g.fillRect(x0 - 4, cy, 14, 15); g.fillRect(x0 + w - 10, cy + 16, 14, 15);
  }
  // The ringing-room door: oak under a pointed arch, studded, a brass knocker shaped like a bell.
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x - 22, y - 92, 44, 62);
  g.fillTriangle(x - 22, y - 92, x + 22, y - 92, x, y - 116);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 17, y - 90, 34, 60); g.fillTriangle(x - 17, y - 90, x + 17, y - 90, x, y - 108);
  g.fillStyle(WOOD, 1); g.fillRect(x - 15, y - 88, 14, 58); g.fillRect(x + 1, y - 88, 14, 58);
  for (let k = 0; k < 4; k++) { g.fillStyle(0x2a2420, 1); g.fillCircle(x - 9, y - 80 + k * 14, 1.5); g.fillCircle(x + 9, y - 80 + k * 14, 1.5); }
  bell(g, x, y - 58, 0.22, BRASS, { patina: 0 });
  // Bell-ropes looped on cleats by the door, red-and-white sallies.
  for (const [rx, side] of [[x - 34, -1], [x + 34, 1]] as [number, number][]) {
    g.fillStyle(0x3a3530, 1); g.fillRect(rx - 4, y - 70, 8, 4);
    g.lineStyle(2, 0xd8c8a0, 1); g.lineBetween(rx, y - 200, rx, y - 62);
    g.fillStyle(TUNER_RED, 1); g.fillRoundedRect(rx - 3, y - 120, 6, 22, 3);
    g.fillStyle(RIBBON, 1); g.fillRect(rx - 3, y - 112, 6, 3); g.fillRect(rx - 3, y - 106, 6, 3);
    g.lineStyle(2, 0xd8c8a0, 1);
    g.beginPath(); g.arc(rx + side * 5, y - 56, 7, 0, Math.PI, false); g.strokePath();
  }
  // The clock of Hours: three gilt marks, a single hand, the Maestro's mark at the hub.
  const cy = shaftTop + 70;
  g.fillStyle(GRANITE_DARK, 1); g.fillCircle(x, cy, 40);
  g.fillStyle(INK, 1); g.fillCircle(x, cy, 35);
  g.lineStyle(2, MAESTRO_GOLD, 1); g.strokeCircle(x, cy, 35);
  g.lineStyle(1, MAESTRO_GOLD, 0.5); g.strokeCircle(x, cy, 28);
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
    g.fillStyle(MAESTRO_GOLD, 1); g.fillCircle(x + Math.cos(a) * 30, cy + Math.sin(a) * 30, 4);
    g.fillStyle(INK, 1); g.fillCircle(x + Math.cos(a) * 30, cy + Math.sin(a) * 30, 1.6);
  }
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    g.lineStyle(1, MAESTRO_GOLD, 0.6); g.lineBetween(x + Math.cos(a) * 32, cy + Math.sin(a) * 32, x + Math.cos(a) * 35, cy + Math.sin(a) * 35);
  }
  g.lineStyle(3, MAESTRO_GOLD, 1); g.lineBetween(x, cy, x + 18, cy - 14);
  maestroMark(g, x, cy, 7);
  // Cornice under the belfry.
  const bfY = shaftTop;
  g.fillStyle(GRANITE_DARK, 1); g.fillRect(x0 - 10, bfY - 8, w + 20, 12);
  g.fillStyle(0xc8c2b4, 1); g.fillRect(x0 - 10, bfY - 10, w + 20, 4);
  // The belfry: three open arches, the beam the bells hang from, louvre shadows behind.
  const bTop = bfY - TOWER.belfry;
  g.fillStyle(dim(GRANITE, 0.15), 1); g.fillRect(x0, bTop, w, TOWER.belfry - 8);
  const aw = (w - 16) / 3;
  for (let k = 0; k < 3; k++) {
    const ax = x0 + 6 + k * (aw + 2) + aw / 2;
    g.fillStyle(0x1a1c22, 1); g.fillRect(ax - aw / 2 + 4, bTop + 30, aw - 8, TOWER.belfry - 40);
    g.fillEllipse(ax, bTop + 30, aw - 8, 34);
    g.fillStyle(0x262830, 1); for (let l = 0; l < 4; l++) g.fillRect(ax - aw / 2 + 4, bTop + 64 + l * 12, aw - 8, 4);
  }
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x0 + 4, bTop + 26, w - 8, 6);
  // Snow on the belfry sill and the cornice.
  g.fillStyle(SNOW, 1); g.fillRoundedRect(x0 - 12, bfY - 14, w + 24, 6, 3); g.fillRoundedRect(x0 - 4, bTop - 4, w + 8, 6, 3);
  // The lead spire, ribbed, with snow in its ribs and a gilt tuning-fork vane.
  g.fillStyle(0x3a4250, 1); g.fillTriangle(x0 - 8, bTop, x0 + w + 8, bTop, x, bTop - 150);
  g.fillStyle(0x4e5868, 1); g.fillTriangle(x0 - 4, bTop, x, bTop, x, bTop - 146);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    g.lineStyle(1.5, SNOW, 0.7);
    g.lineBetween(x - (w / 2 + 8) * (1 - t), bTop - 150 * t, x + (w / 2 + 8) * (1 - t), bTop - 150 * t);
  }
  g.fillStyle(SNOW, 0.9); g.fillTriangle(x - 10, bTop - 120, x + 10, bTop - 120, x, bTop - 150);
  g.lineStyle(2.5, BRASS, 1); g.lineBetween(x, bTop - 150, x, bTop - 176);
  g.lineBetween(x - 7, bTop - 176, x - 7, bTop - 196); g.lineBetween(x + 7, bTop - 176, x + 7, bTop - 196);
  g.beginPath(); g.arc(x, bTop - 176, 7, 0, Math.PI, false); g.strokePath();
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, bTop - 150, 3);
}

// ── The bell-foundry ────────────────────────────────────────────────

/**
 * The bell-foundry: a long soot-dark brick hall with a round furnace stack, its doors open on the
 * orange of the melt, cope-moulds stacked by the wall, a crane jib over the yard, and the founders'
 * own mark (a bell with a crack in it, mended) over the door.
 */
export function foundry(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 120;
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.12, 30);
  // Brick walls, soot-streaked.
  g.fillStyle(0x3a2420, 1); g.fillRect(x0 - 2, y - h - 2, w + 4, h + 2);
  g.fillStyle(0x7a3e2e, 1); g.fillRect(x0, y - h, w, h);
  for (let by = y - h + 2; by < y; by += 8) {
    const off = ((by / 8) | 0) % 2 ? 0 : 9;
    for (let bx = x0 - off; bx < x0 + w; bx += 18) {
      const sx = Math.max(x0, bx), ex = Math.min(x0 + w, bx + 17);
      if (ex > sx) { g.fillStyle(mixC(0x7a3e2e, rng() < 0.5 ? 0x9a5640 : 0x5a2e22, rng() * 0.6), 1); g.fillRect(sx, by, ex - sx, 7); }
    }
  }
  for (let k = 0; k < 7; k++) { g.fillStyle(0x1a1210, 0.35); g.fillRect(x0 + rng() * w, y - h, 10 + rng() * 14, 30 + rng() * 60); }
  // A sawtooth roof of slate under snow, vents in each tooth.
  const teeth = Math.round(w / 70);
  const tw = w / teeth;
  for (let k = 0; k < teeth; k++) {
    const tx = x0 + k * tw;
    g.fillStyle(SLATE, 1); g.fillTriangle(tx - 4, y - h, tx + tw + 4, y - h, tx + tw + 4, y - h - 44);
    g.fillStyle(0x222a32, 1); g.fillRect(tx + tw - 2, y - h - 44, 6, 44);
    g.fillStyle(EMBER, 0.5); g.fillRect(tx + tw - 1, y - h - 36, 4, 30);
    g.fillStyle(SNOW, 1); g.fillTriangle(tx + 4, y - h - 4, tx + tw - 2, y - h - 40, tx + tw - 2, y - h - 34);
  }
  // The furnace stack, round, banded with iron, top blackened.
  const sx = x0 + w * 0.78;
  g.fillStyle(0x4a2a22, 1); g.fillRect(sx - 24, y - h - 150, 48, 150);
  g.fillStyle(0x6a3a2c, 1); g.fillRect(sx - 22, y - h - 148, 30, 148);
  for (let k = 0; k < 6; k++) { g.fillStyle(0x2a2a2e, 1); g.fillRect(sx - 25, y - h - 140 + k * 26, 50, 4); }
  g.fillStyle(0x1a1210, 1); g.fillRect(sx - 27, y - h - 158, 54, 12);
  g.fillStyle(EMBER, 0.35); g.fillEllipse(sx, y - h - 158, 40, 6);
  // Big doors thrown open on the melt.
  const dx = x0 + w * 0.34;
  g.fillStyle(0x1a1210, 1); g.fillRect(dx - 44, y - 86, 88, 86);
  g.fillStyle(0xff7a2a, 0.85); g.fillRect(dx - 38, y - 80, 76, 80);
  g.fillStyle(MELT, 0.8); g.fillEllipse(dx, y - 20, 60, 26);
  g.fillStyle(0xfff4c8, 0.7); g.fillEllipse(dx, y - 22, 28, 9);
  // A ladle crucible tipped on a gantry, silhouetted against the glow.
  g.fillStyle(0x1a1210, 1); g.fillRect(dx - 30, y - 68, 60, 4); g.fillEllipse(dx + 4, y - 54, 26, 22);
  g.fillStyle(MELT, 1); g.fillEllipse(dx + 4, y - 62, 18, 5);
  glow(g, dx, y - 30, 80, EMBER, 0.05, 4);
  // Open door leaves, planked, iron-strapped.
  for (const side of [-1, 1]) {
    const lx = dx + side * 52;
    g.fillStyle(WOOD_DARK, 1); g.fillRect(lx - 9, y - 84, 18, 84);
    g.fillStyle(WOOD, 1); g.fillRect(lx - 7, y - 82, 14, 82);
    g.fillStyle(0x2a2a2e, 1); g.fillRect(lx - 9, y - 70, 18, 3); g.fillRect(lx - 9, y - 26, 18, 3);
  }
  // Cope-moulds stacked against the wall, clay-grey bells waiting for metal.
  for (let k = 0; k < 3; k++) {
    const mx = x0 + w * 0.6 + k * 22;
    g.fillStyle(0x8a7e6a, 1); g.fillEllipse(mx, y - 18, 22, 32);
    g.fillStyle(0x6a604e, 1); g.fillEllipse(mx + 4, y - 16, 12, 26);
    g.fillStyle(0x5a5040, 1); g.fillRect(mx - 11, y - 4, 22, 4);
  }
  // The founders' mark over the doors: a bell with a crack, mended with a brass staple.
  g.fillStyle(0x2a1a14, 1); g.fillRoundedRect(dx - 22, y - 116, 44, 26, 4);
  bell(g, dx, y - 94, 0.42, BRONZE_LIT, { patina: 0 });
  g.lineStyle(1.5, 0x2a1a14, 1); g.lineBetween(dx - 2, y - 110, dx + 3, y - 102); g.lineBetween(dx + 3, y - 102, dx - 1, y - 96);
  g.lineStyle(2, BRASS_LIT, 1); g.lineBetween(dx - 4, y - 104, dx + 5, y - 104);
  // Crane jib out over the yard (east side), a chain and hook.
  const cx = x0 + w - 6;
  g.fillStyle(WOOD_DARK, 1); g.fillRect(cx - 4, y - h - 40, 8, h + 40);
  g.lineStyle(6, WOOD_DARK, 1); g.lineBetween(cx, y - h - 36, cx + 130, y - h - 20);
  g.lineStyle(2, WOOD_DARK, 1); g.lineBetween(cx, y - h - 70, cx + 130, y - h - 20); g.lineBetween(cx, y - h - 70, cx, y - h - 36);
  g.lineStyle(1.5, 0x3a3a40, 1); g.lineBetween(cx + 126, y - h - 18, cx + 126, y - 70);
  g.lineStyle(2.5, 0x3a3a40, 1); g.beginPath(); g.arc(cx + 126, y - 64, 6, -Math.PI / 2, Math.PI * 0.9, false); g.strokePath();
}

/**
 * The casting pit: a round brick-lined hole in the yard, a bell-mould packed in sand at the bottom,
 * a glowing runner-channel leading to it from the foundry doors, and pegs of the strickle-board.
 */
export function castingPit(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(0x3a2420, 1); g.fillEllipse(x, y, r * 2 + 16, r * 1.2 + 10);
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    g.fillStyle(mixC(0x7a3e2e, 0x9a5640, rng()), 1);
    g.fillRect(x + Math.cos(a) * (r + 4) - 4, y + Math.sin(a) * (r * 0.6 + 2) - 2, 8, 5);
  }
  g.fillStyle(0x140c08, 1); g.fillEllipse(x, y, r * 2, r * 1.2);
  // Packed sand at the bottom and the mould's crown, the pouring-cup glowing.
  g.fillStyle(0x6a5232, 1); g.fillEllipse(x, y + r * 0.18, r * 1.6, r * 0.7);
  g.fillStyle(0x8a7e6a, 1); g.fillEllipse(x, y + r * 0.1, r * 0.8, r * 0.44);
  g.fillStyle(0x5a5040, 1); g.fillEllipse(x, y + r * 0.04, r * 0.5, r * 0.2);
  g.fillStyle(EMBER, 0.9); g.fillCircle(x, y, r * 0.08);
  // Runner-channel, a dried channel of iron-black with a glow at the lip.
  g.lineStyle(6, 0x2a1a14, 1); g.lineBetween(x - r - 6, y - 6, x - r - 90, y - 40);
  g.lineStyle(2.5, EMBER, 0.6); g.lineBetween(x - r - 6, y - 6, x - r - 90, y - 40);
  // Strickle pegs and a trowel left on the rim.
  for (let k = 0; k < 4; k++) { g.fillStyle(WOOD, 1); g.fillRect(x + r - 4 + k * 6, y - r * 0.5 - 8 + k * 2, 3, 10); }
  g.fillStyle(0x8a8a90, 1); poly(g, [[x + r * 0.6, y + r * 0.62], [x + r * 0.84, y + r * 0.58], [x + r * 0.76, y + r * 0.7]], 0x8a8a90, 1);
}

/** A great new bell hung on a timber A-frame in the yard to cool, still blushing on the waist. */
export function coolingFrame(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 120, 22);
  for (const side of [-1, 1]) {
    g.lineStyle(9, WOOD_DARK, 1); g.lineBetween(x + side * 40, y, x + side * 18, y - 150);
    g.lineStyle(6, WOOD, 1); g.lineBetween(x + side * 40, y - 2, x + side * 18, y - 148);
    g.lineStyle(4, WOOD_DARK, 1); g.lineBetween(x + side * 34, y - 40, x + side * 22, y - 110);
  }
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 34, y - 158, 68, 12);
  g.fillStyle(WOOD_LIT, 1); g.fillRect(x - 34, y - 158, 68, 3);
  g.fillStyle(SNOW, 1); g.fillRoundedRect(x - 36, y - 162, 72, 5, 2);
  g.lineStyle(3, 0x3a3a40, 1); g.lineBetween(x, y - 146, x, y - 128);
  bell(g, x, y - 34, 2.3, BRONZE_LIT, { warm: 1, patina: 0 });
  // A wet sack thrown over the beam steaming, a bucket under it.
  g.fillStyle(0x8a7a5a, 1); g.fillRoundedRect(x + 18, y - 160, 16, 20, 4);
  g.fillStyle(0x4a4a50, 1); g.fillRect(x + 44, y - 16, 16, 16); g.fillStyle(0x6a6a70, 1); g.fillRect(x + 43, y - 17, 18, 3);
}

// ── Quay buildings ──────────────────────────────────────────────────

/** Snow on a roof line: a soft cap along a slope from (ax,ay) to (bx,by). */
export function snowCap(g: G, ax: number, ay: number, bx: number, by: number, thick = 6): void {
  const n = Math.max(2, Math.round(Math.hypot(bx - ax, by - ay) / 10));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
    g.fillStyle(SNOW_SHADE, 1); g.fillEllipse(px, py + 1.5, 13, thick + 1);
    g.fillStyle(SNOW, 1); g.fillEllipse(px, py, 12, thick);
  }
}

/**
 * A terrace house on Choirholm: tall, narrow and plastered, a steep slate gable under snow, a
 * brass Part-plaque by the door naming the household's notes, a window box of winter heather, and
 * — because the whole isle faces the summit — a little balcony on the north wall for the Hours.
 */
export function terraceHouse(g: G, x: number, y: number, w: number, h: number, wall: number, rng: () => number, opts: { glow?: number; muted?: boolean } = {}): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.18, 22);
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x0 - 2, y - h - 2, w + 4, h + 2);
  g.fillStyle(wall, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(0x000000, 0.12); g.fillRect(x0 + w * 0.7, y - h, w * 0.3, h);
  for (let k = 0; k < (w * h) / 300; k++) {
    g.fillStyle(rng() < 0.5 ? dim(wall, 0.08) : lit(wall, 0.08), 0.6);
    g.fillRect(x0 + rng() * (w - 8), y - h + rng() * h, 6 + rng() * 5, 2);
  }
  // A granite plinth course and string-course.
  g.fillStyle(GRANITE, 1); g.fillRect(x0 - 1, y - 10, w + 2, 10);
  g.fillStyle(lit(wall, 0.2), 1); g.fillRect(x0 - 2, y - h * 0.5, w + 4, 3);
  // Steep slate gable.
  const rh = h * 0.7;
  g.fillStyle(dim(SLATE, 0.4), 1); g.fillTriangle(x0 - 10, y - h + 2, x0 + w + 10, y - h + 2, x, y - h - rh - 3);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 6, y - h, x0 + w + 6, y - h, x, y - h - rh);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    g.lineStyle(1, lit(SLATE, 0.15), 0.8);
    g.lineBetween(x - (w / 2 + 6) * (1 - t), y - h - rh * t, x + (w / 2 + 6) * (1 - t), y - h - rh * t);
  }
  snowCap(g, x0 - 6, y - h - 2, x, y - h - rh, 7);
  snowCap(g, x, y - h - rh, x0 + w + 6, y - h - 2, 7);
  // Icicles under the eaves.
  for (let ix = x0 - 4; ix < x0 + w + 4; ix += 7) {
    const len = 3 + ((ix * 13) % 9);
    g.fillStyle(0xdaeaf6, 0.9); g.fillTriangle(ix, y - h + 1, ix + 3, y - h + 1, ix + 1.5, y - h + 1 + len);
  }
  // Windows: two storeys, glazing bars, sills with snow.
  const glowC = opts.glow ?? LAMP;
  const cols = Math.max(1, Math.floor(w / 38));
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x0 + (w / (cols + 1)) * (c + 1);
      const wy = y - h * (r === 0 ? 0.78 : 0.36) + (r === 1 ? 0 : 0);
      if (r === 1 && Math.abs(wx - x) < 14) continue;
      g.fillStyle(dim(wall, 0.5), 1); g.fillRect(wx - 8, wy - 11, 16, 22);
      g.fillStyle(rng() < 0.7 ? glowC : 0x2a3040, rng() < 0.7 ? 0.9 : 1); g.fillRect(wx - 6, wy - 9, 12, 18);
      g.fillStyle(dim(wall, 0.5), 1); g.fillRect(wx - 0.75, wy - 9, 1.5, 18); g.fillRect(wx - 6, wy - 1, 12, 1.5);
      g.fillStyle(SNOW, 1); g.fillRoundedRect(wx - 10, wy + 10, 20, 4, 2);
      if (r === 1) {
        // Window box of winter heather.
        g.fillStyle(WOOD, 1); g.fillRect(wx - 9, wy + 13, 18, 5);
        for (let k = 0; k < 5; k++) { g.fillStyle(rng() < 0.5 ? 0xb06aa0 : 0x8a4a8a, 1); g.fillCircle(wx - 7 + k * 3.5, wy + 12, 1.8); }
      }
    }
  }
  // Door, step, and the brass Part-plaque.
  g.fillStyle(dim(wall, 0.5), 1); g.fillRoundedRect(x - 11, y - 38, 22, 38, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(opts.muted ? 0xe8e8f0 : TUNER_RED, 1); g.fillRoundedRect(x - 9, y - 36, 18, 36, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1); g.fillCircle(x + 5, y - 18, 1.5);
  g.fillStyle(GRANITE, 1); g.fillRect(x - 14, y - 3, 28, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x + 14, y - 34, 12, 16);
  g.fillStyle(BRASS, 1); g.fillRect(x + 15, y - 33, 10, 14);
  g.lineStyle(0.8, BRASS_DARK, 1); for (let k = 0; k < 4; k++) g.lineBetween(x + 16, y - 31 + k * 3, x + 24, y - 31 + k * 3);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + 18, y - 28, 1); g.fillCircle(x + 22, y - 25, 1);
  if (opts.muted) {
    // A white silk ribbon tied to the knocker: someone in this house is in the Organ.
    g.lineStyle(2, RIBBON, 1); g.lineBetween(x + 5, y - 18, x + 2, y - 6); g.lineBetween(x + 5, y - 18, x + 9, y - 7);
    g.fillStyle(RIBBON, 1); g.fillCircle(x + 5, y - 18, 2.5);
  }
}

/**
 * The Tuners' customs house: grey ashlar and a red door, the Tuners' tuning-fork over the pediment,
 * a counter window with a rack of blank brass tuning-reeds behind the glass, a pitch-pipe on a
 * chain for testing sailors, and a queue rail out front.
 */
export function customsHouse(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 110;
  const x0 = x - w / 2;
  shadow(g, x, y + 6, w * 1.12, 28);
  g.fillStyle(0x4a4a52, 1); g.fillRect(x0 - 2, y - h - 2, w + 4, h + 2);
  g.fillStyle(0x8a8c94, 1); g.fillRect(x0, y - h, w, h);
  for (let by = y - h; by < y; by += 14) {
    const off = ((by / 14) | 0) % 2 ? 0 : 20;
    for (let bx = x0 - off; bx < x0 + w; bx += 40) {
      const sx = Math.max(x0, bx), ex = Math.min(x0 + w, bx + 39);
      if (ex > sx) { g.fillStyle(mixC(0x8a8c94, rng() < 0.5 ? 0xa8aab2 : 0x6a6c74, rng() * 0.4), 1); g.fillRect(sx, by + 1, ex - sx, 12); }
    }
  }
  g.fillStyle(0x000000, 0.14); g.fillRect(x0 + w * 0.72, y - h, w * 0.28, h);
  // Flat roof with a balustrade, snow along it, and a pediment over the middle bay.
  g.fillStyle(0x5a5c64, 1); g.fillRect(x0 - 8, y - h - 12, w + 16, 12);
  for (let bx = x0; bx < x0 + w; bx += 12) { g.fillStyle(0xa8aab2, 1); g.fillRect(bx, y - h - 26, 4, 14); }
  g.fillStyle(0x5a5c64, 1); g.fillRect(x0 - 8, y - h - 30, w + 16, 5);
  snowCap(g, x0 - 6, y - h - 31, x0 + w + 6, y - h - 31, 5);
  g.fillStyle(0x6a6c74, 1); g.fillTriangle(x - 60, y - h - 30, x + 60, y - h - 30, x, y - h - 70);
  g.fillStyle(0x8a8c94, 1); g.fillTriangle(x - 52, y - h - 32, x + 52, y - h - 32, x, y - h - 64);
  snowCap(g, x - 60, y - h - 31, x, y - h - 70, 5); snowCap(g, x, y - h - 70, x + 60, y - h - 31, 5);
  maestroMark(g, x, y - h - 44, 10);
  // The Tuners' great fork, gilt, standing up from the pediment.
  g.lineStyle(4, BRASS, 1); g.lineBetween(x, y - h - 70, x, y - h - 92);
  g.lineBetween(x - 9, y - h - 92, x - 9, y - h - 124); g.lineBetween(x + 9, y - h - 92, x + 9, y - h - 124);
  g.beginPath(); g.arc(x, y - h - 92, 9, 0, Math.PI, false); g.strokePath();
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - 9, y - h - 124, 2); g.fillCircle(x + 9, y - h - 124, 2);
  // The red door.
  g.fillStyle(0x4a4a52, 1); g.fillRect(x - 18, y - 56, 36, 56);
  g.fillStyle(TUNER_RED, 1); g.fillRect(x - 15, y - 53, 30, 53);
  g.fillStyle(dim(TUNER_RED, 0.3), 1); g.fillRect(x - 13, y - 50, 12, 22); g.fillRect(x + 1, y - 50, 12, 22);
  g.fillStyle(BRASS, 1); g.fillCircle(x + 9, y - 26, 2);
  // Counter window left of the door, reeds on a rack behind the glass.
  const cw = x0 + w * 0.22;
  g.fillStyle(0x3a3c44, 1); g.fillRect(cw - 34, y - 78, 68, 44);
  g.fillStyle(0xffe6b0, 0.85); g.fillRect(cw - 31, y - 75, 62, 38);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) {
    g.fillStyle(r === 1 && k === 4 ? 0xe8e0c8 : BRASS, 1); g.fillRect(cw - 27 + k * 6, y - 71 + r * 12, 3, 9);
  }
  g.fillStyle(0x3a3c44, 1); g.fillRect(cw - 38, y - 36, 76, 6);
  g.lineStyle(1, 0x6a6a70, 1); g.lineBetween(cw + 20, y - 36, cw + 22, y - 22);
  g.fillStyle(SILVER, 1); g.fillCircle(cw + 22, y - 20, 4); g.fillStyle(0x4a4a52, 1); g.fillCircle(cw + 22, y - 20, 1.4);
  // A tall barred window right of the door.
  const rw = x0 + w * 0.8;
  g.fillStyle(0x3a3c44, 1); g.fillRect(rw - 16, y - 90, 32, 56);
  g.fillStyle(0x2a3040, 1); g.fillRect(rw - 13, y - 87, 26, 50);
  g.lineStyle(1.5, 0x8a8c94, 1); for (let k = 0; k < 4; k++) g.lineBetween(rw - 10 + k * 7, y - 87, rw - 10 + k * 7, y - 37);
  // The queue rail.
  g.fillStyle(BRASS_DARK, 1);
  for (let k = 0; k < 4; k++) g.fillRect(x0 + 20 + k * 40, y + 16, 3, 18);
  g.lineStyle(2, TUNER_RED, 1); g.lineBetween(x0 + 21, y + 19, x0 + 141, y + 19);
}

/**
 * The Rising Loaf: a cream bakehouse with a great domed brick oven built onto its east end, a
 * hairpin crescendo painted on the sign under a loaf that swells, a rack of loaves at the door and
 * a bread-peel leaned on the wall.
 */
export function bakery(g: G, x: number, y: number, w: number, rng: () => number): void {
  terraceHouse(g, x, y, w, 110, 0xecd8b4, rng, { glow: 0xffc87a });
  // The oven on the east end: a brick dome with a black mouth and a fire.
  const ox = x + w / 2 + 26;
  shadow(g, ox, y + 2, 76, 16);
  g.fillStyle(0x5a2e22, 1); g.fillEllipse(ox, y - 28, 74, 64);
  for (let k = 0; k < 40; k++) {
    const a = Math.PI + rng() * Math.PI, d = rng() * 30;
    g.fillStyle(mixC(0x8a4a34, 0xb06a4a, rng()), 1); g.fillRect(ox + Math.cos(a) * d - 3, y - 28 + Math.sin(a) * d * 0.85 - 1.5, 6, 3);
  }
  g.fillStyle(SNOW, 1); g.fillEllipse(ox - 6, y - 56, 40, 10);
  g.fillStyle(0x1a0e08, 1); g.fillEllipse(ox, y - 12, 30, 22);
  g.fillStyle(0xff8a3a, 0.9); g.fillEllipse(ox, y - 9, 24, 14);
  g.fillStyle(0xffd88a, 0.9); g.fillEllipse(ox, y - 6, 12, 5);
  g.fillStyle(0x4a2a22, 1); g.fillRect(ox + 12, y - 80, 12, 30);
  // The sign: a loaf rising out of a crescendo hairpin.
  const sx = x - w / 2 - 18;
  g.lineStyle(3, WOOD_DARK, 1); g.lineBetween(sx, y, sx, y - 92); g.lineBetween(sx, y - 92, sx + 34, y - 92);
  g.fillStyle(WOOD_DARK, 1); g.fillRoundedRect(sx + 4, y - 88, 56, 34, 5);
  g.fillStyle(PAPER, 1); g.fillRoundedRect(sx + 6, y - 86, 52, 30, 4);
  g.lineStyle(1.5, INK, 1); g.lineBetween(sx + 10, y - 66, sx + 54, y - 72); g.lineBetween(sx + 10, y - 66, sx + 54, y - 60);
  g.fillStyle(0x8a5a2a, 1); g.fillEllipse(sx + 40, y - 76, 26, 14);
  g.fillStyle(0xd8a060, 1); g.fillEllipse(sx + 40, y - 78, 20, 8);
  g.lineStyle(1, 0x8a5a2a, 1); for (let k = 0; k < 3; k++) g.lineBetween(sx + 33 + k * 6, y - 81, sx + 36 + k * 6, y - 76);
  // The loaf rack by the door.
  const rx = x - 34;
  g.fillStyle(WOOD, 1); g.fillRect(rx - 18, y - 30, 3, 30); g.fillRect(rx + 15, y - 30, 3, 30);
  for (let s = 0; s < 3; s++) {
    g.fillStyle(WOOD_DARK, 1); g.fillRect(rx - 18, y - 28 + s * 9, 36, 2);
    for (let k = 0; k < 3; k++) { g.fillStyle(0x9a6230, 1); g.fillEllipse(rx - 10 + k * 10, y - 31 + s * 9, 9, 5); g.fillStyle(0xd8a060, 1); g.fillEllipse(rx - 10 + k * 10, y - 32 + s * 9, 6, 2); }
  }
  // A bread-peel leaned on the wall.
  g.lineStyle(2.5, WOOD_LIT, 1); g.lineBetween(x + w / 2 - 12, y - 4, x + w / 2 - 22, y - 70);
  g.fillStyle(WOOD_LIT, 1); g.fillEllipse(x + w / 2 - 22, y - 76, 14, 18);
}

/**
 * The general store, Chime & Sundry: a bow-fronted shop window full of little charms hung on
 * threads (each with a bell on it, stuffed with wool), a striped awning sagging under snow, and a
 * sandwich board chalked with the day's prices.
 */
export function sundryShop(g: G, x: number, y: number, w: number, rng: () => number): void {
  terraceHouse(g, x, y, w, 118, 0xc8a8b8, rng);
  // Bow window.
  const bx = x - w * 0.26;
  g.fillStyle(WOOD_DARK, 1); g.fillRoundedRect(bx - 34, y - 74, 68, 50, 10);
  g.fillStyle(0xffe6b0, 0.9); g.fillRoundedRect(bx - 30, y - 70, 60, 42, 8);
  for (let k = 0; k < 7; k++) {
    const cx = bx - 24 + k * 8, cy = y - 58 + (k % 2) * 8;
    g.lineStyle(0.8, 0x6a5a4a, 1); g.lineBetween(cx, y - 70, cx, cy - 4);
    bell(g, cx, cy + 3, 0.14, k % 3 === 0 ? BRASS : k % 3 === 1 ? SILVER : BRONZE, { patina: 0 });
  }
  g.lineStyle(1.5, WOOD_DARK, 1); g.lineBetween(bx - 10, y - 70, bx - 10, y - 28); g.lineBetween(bx + 10, y - 70, bx + 10, y - 28);
  // Striped awning, snow sagging in it.
  g.fillStyle(0x3a2a30, 1); g.fillRect(x - w / 2 - 4, y - 92, w + 8, 4);
  const stripes = 10;
  for (let k = 0; k < stripes; k++) {
    const sx = x - w / 2 + (w / stripes) * k;
    poly(g, [[sx, y - 90], [sx + w / stripes, y - 90], [sx + w / stripes + 2, y - 76], [sx + 2, y - 76]], k % 2 ? 0xf0e6d8 : 0x6a3a5a, 1);
    g.fillStyle(k % 2 ? 0xf0e6d8 : 0x6a3a5a, 1); g.fillEllipse(sx + w / stripes / 2 + 1, y - 76, w / stripes, 6);
  }
  snowCap(g, x - w / 2, y - 92, x + w / 2, y - 92, 5);
  // Sandwich board.
  const sb = x + w / 2 + 16;
  g.fillStyle(WOOD, 1); poly(g, [[sb - 12, y], [sb - 8, y - 34], [sb + 8, y - 34], [sb + 12, y]], WOOD, 1);
  g.fillStyle(0x24282a, 1); g.fillRect(sb - 7, y - 30, 14, 24);
  g.lineStyle(1, 0xe8e8e0, 0.8); for (let k = 0; k < 4; k++) g.lineBetween(sb - 5, y - 26 + k * 5, sb + 1 + (k % 2) * 3, y - 26 + k * 5);
}

/**
 * The Singing Line, Abel Fathom's tackle shed: weathered clinker planking, a tarred roof, nets
 * hung to dry, rods racked under the eaves, and a carved chimefish over the door with real little
 * bells for scales.
 */
export function tackleShed(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 74;
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.15, 22);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x0 - 2, y - h - 2, w + 4, h + 2);
  for (let k = 0; k < h / 9; k++) {
    const py = y - h + k * 9;
    g.fillStyle(mixC(0x7a6a56, rng() < 0.5 ? 0x9a8a72 : 0x5a4a3a, rng() * 0.5), 1); g.fillRect(x0, py, w, 8);
    g.fillStyle(0x000000, 0.18); g.fillRect(x0, py + 7, w, 1.5);
  }
  // Tarred roof, snow on top.
  g.fillStyle(TAR, 1); poly(g, [[x0 - 12, y - h + 2], [x0 + w + 12, y - h + 2], [x0 + w - 6, y - h - 32], [x0 + 6, y - h - 32]], TAR, 1);
  g.fillStyle(0x3a3430, 1); g.fillRect(x0 + 6, y - h - 32, w - 12, 4);
  snowCap(g, x0 + 4, y - h - 33, x0 + w - 4, y - h - 33, 7);
  // Rods racked under the eaves.
  for (let k = 0; k < 6; k++) {
    g.lineStyle(1.5, k % 2 ? WOOD_LIT : 0x5a7a5a, 1); g.lineBetween(x0 + 6 + k * 4, y - h - 2, x0 + w * 0.45 + k * 6, y - h + 6 - k);
  }
  // A net hung on the wall, its floats bells.
  const nx = x0 + w * 0.72;
  g.lineStyle(1, 0xc8b890, 0.7);
  for (let k = 0; k < 7; k++) g.lineBetween(nx - 28 + k * 9, y - h + 8, nx - 22 + k * 8, y - 12);
  for (let k = 0; k < 6; k++) g.lineBetween(nx - 28, y - h + 14 + k * 9, nx + 28, y - h + 12 + k * 9);
  for (let k = 0; k < 4; k++) bell(g, nx - 24 + k * 16, y - h + 12, 0.16, BRASS, { patina: 0 });
  // Door.
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 14, y - 50, 28, 50);
  g.fillStyle(0x4a3a2a, 1); g.fillRect(x - 12, y - 48, 24, 48);
  // The carved chimefish: a fish whose scales are tiny bells.
  const fy = y - h - 46;
  g.fillStyle(0x7a9aaa, 1); g.fillEllipse(x, fy, 66, 24);
  g.fillTriangle(x + 30, fy, x + 46, fy - 14, x + 46, fy + 14);
  g.fillStyle(0x9abccc, 1); g.fillEllipse(x - 4, fy - 4, 50, 10);
  g.fillStyle(0x1a1a22, 1); g.fillCircle(x - 24, fy - 3, 2.5);
  for (let k = 0; k < 6; k++) { g.fillStyle(BRASS, 1); g.fillCircle(x - 12 + k * 8, fy + 3 + (k % 2) * 3, 2.2); }
  g.lineStyle(1.5, WOOD_DARK, 1); g.lineBetween(x - 18, fy - 12, x - 18, fy - 22); g.lineBetween(x + 18, fy - 12, x + 18, fy - 22);
}

/**
 * Pim Staveley's hymn-sheet stall: a trestle under a sail-cloth awning, strings of hymn sheets
 * pegged to dry, a little hand-press, bundles tied with ribbon. The sheets are the Score, word for
 * word — Libretto Court licensed. (The one at the back is not.)
 */
export function hymnStall(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 140, 20);
  // Poles and awning.
  for (const side of [-1, 1]) { g.fillStyle(WOOD_DARK, 1); g.fillRect(x + side * 56 - 2, y - 96, 4, 96); }
  poly(g, [[x - 66, y - 92], [x + 66, y - 92], [x + 58, y - 112], [x - 58, y - 112]], 0xe8dcc0, 1);
  for (let k = 0; k < 7; k++) { g.fillStyle(0xc8b890, 1); g.fillRect(x - 58 + k * 18, y - 111, 2, 18); }
  snowCap(g, x - 58, y - 113, x + 58, y - 113, 5);
  // Strings of pegged sheets.
  for (let r = 0; r < 2; r++) {
    const sy = y - 86 + r * 18;
    g.lineStyle(1, 0x8a7a5a, 1); g.lineBetween(x - 54, sy, x + 54, sy + 2);
    for (let k = 0; k < 6; k++) {
      const px = x - 46 + k * 18, py = sy + 1 + k * 0.3;
      g.fillStyle(PAPER, 1); g.fillRect(px - 6, py, 12, 15);
      g.lineStyle(0.6, INK, 0.7);
      for (let l = 0; l < 4; l++) g.lineBetween(px - 4, py + 3 + l * 3, px + 4, py + 3 + l * 3);
      g.fillStyle(INK, 0.9); g.fillCircle(px - 2 + rng() * 4, py + 5 + rng() * 6, 1);
      g.fillStyle(WOOD_LIT, 1); g.fillRect(px - 1, py - 2, 2, 4);
    }
  }
  // Trestle with bundles and the hand-press.
  g.fillStyle(WOOD, 1); g.fillRect(x - 60, y - 34, 120, 6);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 54, y - 28, 4, 28); g.fillRect(x + 50, y - 28, 4, 28);
  for (let k = 0; k < 4; k++) {
    g.fillStyle(PAPER, 1); g.fillRect(x - 54 + k * 16, y - 44, 14, 10);
    g.fillStyle(TUNER_RED, 1); g.fillRect(x - 48 + k * 16, y - 44, 2, 10);
  }
  g.fillStyle(0x3a3a40, 1); g.fillRect(x + 16, y - 56, 30, 22);
  g.fillStyle(0x5a5a60, 1); g.fillRect(x + 20, y - 66, 22, 10);
  g.lineStyle(2, 0x3a3a40, 1); g.lineBetween(x + 31, y - 66, x + 31, y - 76); g.lineBetween(x + 22, y - 76, x + 40, y - 76);
}

/**
 * The Register of Parts: a tall black board on the square, a column per street, every household
 * written down as its notes in gold. Muted names are not crossed out — a white ribbon is pinned
 * over them.
 */
export function partBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 90, 14);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 40, y - 12, 6, 12); g.fillRect(x + 34, y - 12, 6, 12);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 46, y - 150, 92, 140);
  g.fillStyle(INK, 1); g.fillRect(x - 42, y - 146, 84, 132);
  g.fillStyle(WOOD_DARK, 1); g.fillTriangle(x - 50, y - 150, x + 50, y - 150, x, y - 172);
  snowCap(g, x - 50, y - 151, x, y - 172, 5); snowCap(g, x, y - 172, x + 50, y - 151, 5);
  maestroMark(g, x, y - 158, 6);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 11; r++) {
      const lx = x - 38 + c * 27, ly = y - 138 + r * 11;
      g.fillStyle(MAESTRO_GOLD, 0.75); g.fillRect(lx, ly, 10 + rng() * 6, 1.6);
      g.fillStyle(MAESTRO_GOLD, 0.9); g.fillCircle(lx + 20, ly + 0.5, 1.4);
      if (rng() < 0.13) { g.fillStyle(RIBBON, 1); g.fillRect(lx - 1, ly - 2, 24, 4); g.fillTriangle(lx + 22, ly - 2, lx + 26, ly + 5, lx + 20, ly + 2); }
    }
  }
}

/** A brass ferry-horn on a post at a jetty head, bell-mouth turned to sea. `dir` −1 faces west, 1 east. */
export function ferryHorn(g: G, x: number, y: number, dir: number): void {
  shadow(g, x, y + 2, 20, 6);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 3, y - 50, 6, 50);
  g.fillStyle(0x2a2a2e, 1); g.fillRect(x - 5, y - 52, 10, 4);
  // The coiled tube and flared bell.
  g.lineStyle(4, BRASS_DARK, 1);
  g.beginPath(); g.arc(x, y - 62, 9, 0, Math.PI * 2, false); g.strokePath();
  g.lineStyle(3, BRASS, 1);
  g.beginPath(); g.arc(x, y - 62, 9, 0, Math.PI * 2, false); g.strokePath();
  g.lineStyle(4, BRASS, 1); g.lineBetween(x + dir * 9, y - 62, x + dir * 22, y - 66);
  poly(g, [[x + dir * 20, y - 68], [x + dir * 34, y - 78], [x + dir * 34, y - 54], [x + dir * 20, y - 63]], BRASS, 1);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x + dir * 34, y - 66, 6, 24);
  g.fillStyle(BRASS_LIT, 0.8); g.fillEllipse(x + dir * 26, y - 72, 6, 2);
  // The squeeze-bulb.
  g.fillStyle(0x5a2a22, 1); g.fillCircle(x - dir * 8, y - 56, 4);
}

/**
 * A boat on the stocks at the head of the slipway: half-planked ribs on one end, finished strakes
 * on the other, a bell already bolted on the stem-post (no Choirholm hull goes out without one).
 */
export function hullOnStocks(g: G, x: number, y: number, len: number, rng: () => number): void {
  shadow(g, x, y + 4, len * 1.1, 20);
  for (let k = 0; k < 3; k++) { g.fillStyle(WOOD_DARK, 1); g.fillRect(x - len * 0.38 + k * len * 0.38 - 8, y - 14, 16, 14); }
  const top = y - 56;
  // Finished planking (stern half).
  for (let s = 0; s < 5; s++) {
    const sy = top + s * 8;
    const plank = mixC(0x8a6a48, s % 2 ? 0x6a4e34 : 0xa07c56, 0.4 + rng() * 0.2);
    poly(g, [[x - len / 2 + s * 4, sy], [x + 6, sy], [x + 6, sy + 8], [x - len / 2 + s * 6 + 4, sy + 8]], plank, 1);
  }
  // Bare ribs (bow half).
  for (let k = 0; k < 7; k++) {
    const rx = x + 10 + k * (len / 2 - 20) / 6;
    const bottom = top + 40 - k * 2;
    g.lineStyle(3, 0xb8946a, 1);
    g.beginPath(); g.arc(rx, top, 4 + (bottom - top) * 0.9, Math.PI * 0.35, Math.PI * 0.65, false); g.strokePath();
    g.lineBetween(rx, top, rx, bottom);
  }
  g.lineStyle(4, 0x8a6a48, 1); g.lineBetween(x - len / 2, top, x + len / 2 - 8, top + 4);
  g.lineStyle(3, 0x6a4e34, 1); g.lineBetween(x - len / 2 + 10, top + 40, x + len / 2 - 14, top + 30);
  // Stem-post with the bell.
  g.lineStyle(5, 0x6a4e34, 1); g.lineBetween(x + len / 2 - 8, top + 30, x + len / 2, top - 18);
  bell(g, x + len / 2 + 8, top - 6, 0.36, BRONZE, { patina: 0.3 });
}

/** A Choirholm pine: dark, narrow, laden with snow on every tier. */
export function snowPine(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 36 * s, 10 * s);
  g.fillStyle(0x3a2a20, 1); g.fillRect(x - 3 * s, y - 12 * s, 6 * s, 12 * s);
  for (let k = 0; k < 4; k++) {
    const ty = y - 10 * s - k * 20 * s, tw = (34 - k * 7) * s;
    g.fillStyle(0x1e3a32, 1); g.fillTriangle(x - tw / 2, ty, x + tw / 2, ty, x, ty - 28 * s);
    g.fillStyle(0x2a4e42, 1); g.fillTriangle(x - tw / 2 + 2, ty, x, ty, x, ty - 27 * s);
    g.fillStyle(SNOW, 1); g.fillTriangle(x - tw / 3, ty - 6 * s, x + tw / 4, ty - 7 * s, x, ty - 22 * s);
    g.fillStyle(SNOW, 1); g.fillEllipse(x - tw / 2 + 4 * s, ty - 1, 8 * s, 3 * s); g.fillEllipse(x + tw / 2 - 5 * s, ty - 1, 7 * s, 3 * s);
  }
}

/** A bell-buoy riding the swell: red cage, bell inside, a striking hammer swinging. Drawn live. */
export function bellBuoy(g: G, x: number, y: number, t: number, phase: number): number {
  const bob = Math.sin(t * 1.4 + phase) * 3;
  const tilt = Math.sin(t * 1.1 + phase * 1.7) * 0.22;
  const by = y + bob;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 8, 40, 9);
  g.fillStyle(FOAM, 0.45); g.fillEllipse(x, y + 5, 34 + Math.sin(t * 2 + phase) * 4, 6);
  g.fillStyle(0x7a1e1e, 1); g.fillEllipse(x, by, 30, 14);
  g.fillStyle(0xa82a2a, 1); g.fillEllipse(x, by - 2, 28, 10);
  const tx = Math.sin(tilt) * 30;
  g.lineStyle(2.5, 0x5a1414, 1);
  g.lineBetween(x - 11, by - 3, x - 8 + tx, by - 36); g.lineBetween(x + 11, by - 3, x + 8 + tx, by - 36);
  g.lineBetween(x - 8 + tx, by - 36, x + 8 + tx, by - 36);
  g.lineBetween(x - 9 + tx * 0.5, by - 18, x + 9 + tx * 0.5, by - 18);
  bell(g, x + tx * 0.6, by - 10, 0.42, BRONZE, { patina: 0.7 });
  g.fillStyle(0xa82a2a, 1); g.fillCircle(x + tx, by - 40, 3);
  return tilt;
}

/** A floating wavy sound-line (the ripple left by a bell's stroke), drawn round a point. */
export function soundRing(g: G, x: number, y: number, r: number, color: number, a: number, squash = 0.5): void {
  if (a <= 0.01) return;
  g.lineStyle(2, color, a);
  g.beginPath();
  for (let k = 0; k <= 32; k++) {
    const ang = (k / 32) * Math.PI * 2;
    const rr = r + Math.sin(ang * 8) * 2;
    const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * squash;
    if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
}

/** A row of three bells hung abreast, all drawn swinging — the carillon live in its belfry. */
export function belfryBells(g: G, x: number, beamY: number, t: number, ringing: number): void {
  const aw = (TOWER.w - 16) / 3;
  for (let k = 0; k < 3; k++) {
    const bx = x - TOWER.w / 2 + 6 + k * (aw + 2) + aw / 2;
    const sw = ringing > 0 ? Math.sin(t * 4.2 + k * 1.9) * 0.5 * ringing : Math.sin(t * 0.6 + k) * 0.02;
    const len = 40 - k * 4;
    const ex = bx + Math.sin(sw) * len, ey = beamY + Math.cos(sw) * len;
    g.lineStyle(2, 0x2a2420, 1); g.lineBetween(bx, beamY + 3, ex, ey - 26 * (1 - k * 0.08));
    bell(g, ex, ey, 0.82 - k * 0.12, k === 1 ? BRONZE_LIT : BRONZE, { patina: 0.6 });
  }
}

/** Dim helper re-exported for callers that only want this module. */
export { dim, lit, mixC };
