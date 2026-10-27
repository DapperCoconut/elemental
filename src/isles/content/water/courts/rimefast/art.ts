import type Phaser from 'phaser';
import { dim, lit, shadow } from '../../../../art/IsleArt';
import { R, drawBrazier, drawDrift, drawIcicle, drawSnowball, jit } from './util';

/**
 * Set pieces for the Rimefast Court's world map. Each draws in world space with `x,y` at its base
 * line (the depth it sorts at). Rimefast is a harbour frozen mid-stroke, so the pieces are ships
 * locked in collars of heaped ice, narrow harbour houses with snow on every ledge and icicles off
 * every eave, the Prince's palace grown out of the sea like a cluster of upturned icicles, and the
 * huts and holes of the people who still have to eat.
 */

type G = Phaser.GameObjects.Graphics;

/** A row of icicles along an edge from x0 to x1 at height y. */
function eaveIcicles(g: G, x0: number, x1: number, y: number, rng: () => number, max = 16): void {
  for (let x = x0 + 4; x < x1 - 2; x += 7 + rng() * 6) drawIcicle(g, x, y, 4 + rng() * max, 3 + rng() * 2, 0.95);
}

/** A ledge of snow along the top of something, lumpy, with a lit crest. */
function snowCap(g: G, x0: number, x1: number, y: number, depth: number, rng: () => number): void {
  g.fillStyle(R.snowShade, 1); g.fillRect(x0 - 3, y - depth * 0.3, x1 - x0 + 6, depth * 0.8);
  for (let x = x0; x < x1; x += 10) {
    g.fillStyle(R.snow, 1); g.fillEllipse(x + 5, y - depth * 0.35, 14 + rng() * 6, depth);
  }
  g.fillStyle(0xffffff, 0.9); g.fillRect(x0, y - depth * 0.75, x1 - x0, 2);
}

// ── Town ─────────────────────────────────────────────────────────────

export interface HarbourHouseOpts {
  wall: number;
  roof: number;
  /** Behind on the Thaw Tithe: the door is sealed under a slab of ice with a red tag on it. */
  icedShut?: boolean;
  /** A lamp burning in the window. */
  lit?: boolean;
}

/**
 * A narrow harbour house: tall gabled front, a loft door with a hoist beam, small-paned windows,
 * snow on the roof and every sill, icicles off the eaves. A house behind on the Thaw Tithe has its
 * door frozen over under a sheet of clear ice with the Prince's red tag nailed through it.
 */
export function harbourHouse(g: G, x: number, y: number, w: number, h: number, o: HarbourHouseOpts, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.2, 20);
  const L = x - w / 2, Rr = x + w / 2;
  // Walls: planked, darkened at the foot where the frost line is.
  g.fillStyle(dim(o.wall, 0.45), 1); g.fillRect(L - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(o.wall, 1); g.fillRect(L, y - h, w, h);
  for (let yy = y - h + 9; yy < y; yy += 9) { g.lineStyle(1, dim(o.wall, 0.18), 0.8); g.lineBetween(L, yy, Rr, yy); }
  g.fillStyle(R.frost, 0.35); g.fillRect(L, y - 16, w, 16);
  // Steep gable roof with a thick snow load and icicles.
  const peak = y - h - w * 0.62;
  g.fillStyle(dim(o.roof, 0.4), 1); g.fillTriangle(L - 10, y - h + 2, Rr + 10, y - h + 2, x, peak - 4);
  g.fillStyle(o.roof, 1); g.fillTriangle(L - 6, y - h, Rr + 6, y - h, x, peak);
  g.fillStyle(R.snow, 1); g.fillTriangle(L - 4, y - h - 6, Rr + 4, y - h - 6, x, peak + 2);
  g.fillStyle(R.snowShade, 1); g.fillTriangle(x, peak + 2, Rr + 4, y - h - 6, x + w * 0.2, y - h - 6);
  eaveIcicles(g, L - 6, Rr + 6, y - h + 1, rng);
  // Loft door and hoist beam under the peak.
  g.fillStyle(dim(o.wall, 0.5), 1); g.fillRect(x - 9, y - h - w * 0.32, 18, 22);
  g.fillStyle(R.timberDark, 1); g.fillRect(x - 2, y - h - w * 0.4, 4, 6); g.fillRect(x - 2, y - h - w * 0.4, 20, 4);
  g.lineStyle(1, R.rope, 0.9); g.lineBetween(x + 16, y - h - w * 0.36, x + 16, y - h - w * 0.36 + 26);
  // Windows: small panes; lamp-lit or black.
  const rows = Math.max(1, Math.floor((h - 50) / 40));
  for (let r = 0; r < rows; r++) {
    for (const wx of [L + w * 0.25, Rr - w * 0.25]) {
      const wy = y - h + 16 + r * 40;
      g.fillStyle(R.timberDark, 1); g.fillRect(wx - 9, wy - 1, 18, 22);
      g.fillStyle(o.lit && r === rows - 1 ? 0xffc46a : R.blackIce, 1); g.fillRect(wx - 7, wy + 1, 14, 18);
      g.lineStyle(1, R.timberDark, 1); g.lineBetween(wx, wy + 1, wx, wy + 19); g.lineBetween(wx - 7, wy + 10, wx + 7, wy + 10);
      g.fillStyle(R.frost, 0.7); g.fillTriangle(wx - 7, wy + 19, wx - 7, wy + 12, wx, wy + 19);
      snowCap(g, wx - 10, wx + 10, wy + 22, 5, rng);
    }
  }
  // Door: or the ice slab over it.
  g.fillStyle(R.timberDark, 1); g.fillRect(x - 12, y - 34, 24, 34);
  g.fillStyle(dim(o.wall, 0.25), 1); g.fillRect(x - 10, y - 32, 20, 32);
  g.fillStyle(R.brass, 1); g.fillCircle(x + 6, y - 16, 1.8);
  if (o.icedShut) {
    g.fillStyle(R.ice, 0.85); g.fillRoundedRect(x - 17, y - 40, 34, 42, 4);
    g.fillStyle(R.glassLit, 0.8); g.fillTriangle(x - 15, y - 38, x - 2, y - 38, x - 15, y - 14);
    g.lineStyle(1, R.iceDark, 0.6); g.lineBetween(x - 8, y - 30, x + 6, y - 6); g.lineBetween(x + 6, y - 6, x + 12, y - 18);
    // The red tag, nailed through the ice.
    g.fillStyle(R.scarf, 1); g.fillRect(x - 6, y - 30, 12, 9);
    g.fillStyle(0xf0e6d8, 1); g.fillRect(x - 4, y - 28, 8, 1.5); g.fillRect(x - 4, y - 25, 6, 1.5);
    g.fillStyle(R.iron, 1); g.fillCircle(x, y - 31, 1.5);
  }
  // Doorstep heaped with snow.
  drawDrift(g, x + 18, y + 2, 34, 10, x);
}

/**
 * Gimlet's Ship-Chandlery: a broad bay-fronted shop with a bow window full of lanterns, coils of
 * rope and a ship's bell; a carved anchor sign hangs off a bracket. Crates and a tarred barrel by
 * the door, and a warm lamp — the only lit window on the quay that is not licensed.
 */
export function chandlery(g: G, x: number, y: number, rng: () => number): void {
  const w = 220, h = 110;
  shadow(g, x, y + 4, w * 1.15, 24);
  const wall = 0x6a5a4c;
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let yy = y - h + 8; yy < y; yy += 8) { g.lineStyle(1, dim(wall, 0.2), 0.8); g.lineBetween(x - w / 2, yy, x + w / 2, yy); }
  // Mansard roof, snowed.
  g.fillStyle(0x3a3a44, 1); g.fillRect(x - w / 2 - 12, y - h - 34, w + 24, 36);
  g.fillStyle(0x4a4a56, 1); g.fillRect(x - w / 2 - 8, y - h - 30, w + 16, 6);
  snowCap(g, x - w / 2 - 12, x + w / 2 + 12, y - h - 30, 12, rng);
  eaveIcicles(g, x - w / 2 - 12, x + w / 2 + 12, y - h + 2, rng, 12);
  // Chimney with a smoke pot.
  g.fillStyle(0x5a4a40, 1); g.fillRect(x + 60, y - h - 66, 18, 36);
  snowCap(g, x + 58, x + 80, y - h - 66, 8, rng);
  // The bow window: a three-faced bay of small panes, lamplit, with wares inside.
  const bx = x - 40, by = y - 24;
  g.fillStyle(R.timberDark, 1); g.fillRect(bx - 50, by - 58, 100, 62);
  g.fillStyle(0xffc46a, 0.9); g.fillRect(bx - 46, by - 54, 92, 52);
  for (let i = 0; i < 4; i++) {
    // Lanterns hanging in the window.
    const lx = bx - 34 + i * 22;
    g.lineStyle(1, R.iron, 1); g.lineBetween(lx, by - 54, lx, by - 44);
    g.fillStyle(R.brass, 1); g.fillRect(lx - 4, by - 44, 8, 11);
    g.fillStyle(0xfff1c0, 1); g.fillRect(lx - 2, by - 42, 4, 7);
  }
  // A coil of rope and a ship's bell on the sill.
  g.lineStyle(3, R.rope, 1); g.strokeEllipse(bx - 18, by - 12, 26, 10); g.strokeEllipse(bx - 18, by - 16, 20, 8);
  g.fillStyle(R.brass, 1); g.fillTriangle(bx + 14, by - 6, bx + 30, by - 6, bx + 22, by - 24);
  g.lineStyle(1, R.timberDark, 1);
  for (let i = 1; i < 6; i++) g.lineBetween(bx - 46 + i * 15.3, by - 54, bx - 46 + i * 15.3, by - 2);
  g.lineBetween(bx - 46, by - 28, bx + 46, by - 28);
  snowCap(g, bx - 52, bx + 52, by + 4, 8, rng);
  // Door, half-glazed.
  g.fillStyle(R.timberDark, 1); g.fillRect(x + 50, y - 50, 32, 50);
  g.fillStyle(0x5a3a2a, 1); g.fillRect(x + 53, y - 47, 26, 47);
  g.fillStyle(0xffc46a, 0.8); g.fillRect(x + 57, y - 42, 18, 14);
  // The hanging sign: an anchor fouled in its cable, carved and gilt.
  g.fillStyle(R.iron, 1); g.fillRect(x + 92, y - 96, 34, 3);
  g.lineStyle(1, R.iron, 1); g.lineBetween(x + 100, y - 93, x + 100, y - 86); g.lineBetween(x + 120, y - 93, x + 120, y - 86);
  g.fillStyle(0x2a3a44, 1); g.fillRoundedRect(x + 94, y - 86, 32, 32, 4);
  g.lineStyle(2.5, R.brass, 1);
  g.lineBetween(x + 110, y - 80, x + 110, y - 60);
  g.beginPath(); g.arc(x + 110, y - 66, 9, 0.2, Math.PI - 0.2, false); g.strokePath();
  g.lineBetween(x + 104, y - 77, x + 116, y - 77);
  // Crates and a tarred barrel.
  for (const [cx, s] of [[-102, 12], [-80, 10]] as [number, number][]) {
    g.fillStyle(dim(R.timberLit, 0.3), 1); g.fillRect(x + cx - s, y - s * 2, s * 2, s * 2);
    g.fillStyle(R.timberLit, 1); g.fillRect(x + cx - s + 2, y - s * 2 + 2, s * 2 - 4, s * 2 - 4);
    snowCap(g, x + cx - s, x + cx + s, y - s * 2, 6, rng);
  }
  g.fillStyle(R.hull, 1); g.fillRoundedRect(x + 92, y - 26, 22, 26, 4);
  g.fillStyle(R.iron, 1); g.fillRect(x + 92, y - 20, 22, 2); g.fillRect(x + 92, y - 8, 22, 2);
}

/**
 * The Thaw House, where the Thaw Tithe is paid: a squat stone office with a barred counter, a
 * queue-rope on iron posts, and on its front a great brass thermometer whose mercury the Prince's
 * clerks raise a notch for every household that pays — and drop for every one that doesn't.
 */
export function thawHouse(g: G, x: number, y: number, rng: () => number): void {
  const w = 200, h = 96;
  shadow(g, x, y + 4, w * 1.15, 22);
  g.fillStyle(R.stoneDark, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(R.stone, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let r = 0; r < 6; r++) {
    const yy = y - 14 - r * 15;
    g.lineStyle(1, R.stoneDark, 0.7); g.lineBetween(x - w / 2, yy, x + w / 2, yy);
    for (let k = 0; k < 8; k++) { const bx = x - w / 2 + ((k + (r % 2) * 0.5) * w) / 8; g.lineBetween(bx, yy, bx, yy - 15); }
  }
  // Flat lead roof with a pediment in the Queen's green.
  g.fillStyle(R.livery, 1); g.fillTriangle(x - 70, y - h, x + 70, y - h, x, y - h - 34);
  g.fillStyle(dim(R.livery, 0.3), 1); g.fillRect(x - w / 2 - 8, y - h - 6, w + 16, 8);
  snowCap(g, x - w / 2 - 8, x + w / 2 + 8, y - h - 6, 10, rng);
  g.fillStyle(R.kelp, 1); g.fillCircle(x, y - h - 14, 6);
  // The barred counter.
  g.fillStyle(0x1a1c22, 1); g.fillRect(x - 60, y - 64, 64, 36);
  g.fillStyle(0xffc46a, 0.6); g.fillRect(x - 56, y - 60, 56, 28);
  g.lineStyle(2, R.iron, 1);
  for (let i = 0; i < 6; i++) g.lineBetween(x - 56 + i * 11, y - 64, x - 56 + i * 11, y - 28);
  g.fillStyle(R.stoneLit, 1); g.fillRect(x - 66, y - 30, 76, 6);
  // The thermometer: a brass tube and bulb, mercury low.
  const tx = x + 58;
  g.fillStyle(R.brass, 1); g.fillRoundedRect(tx - 8, y - h + 6, 16, h - 18, 6);
  g.fillStyle(0xeaf4fa, 1); g.fillRect(tx - 3, y - h + 12, 6, h - 34);
  g.fillStyle(R.scarf, 1); g.fillRect(tx - 3, y - 36, 6, 14);
  g.fillStyle(R.scarf, 1); g.fillCircle(tx, y - 16, 7);
  g.fillStyle(R.brass, 1);
  for (let i = 0; i < 8; i++) g.fillRect(tx + 6, y - h + 14 + i * 7, i % 2 ? 4 : 7, 1.5);
  // Queue-rope on posts in front, and nobody in the queue.
  for (const px of [x - 90, x - 50, x - 10]) {
    g.fillStyle(R.iron, 1); g.fillRect(px - 2, y + 4, 4, 22);
    g.fillStyle(R.brass, 1); g.fillCircle(px, y + 4, 3);
  }
  g.lineStyle(2, R.scarf, 1);
  g.beginPath(); g.moveTo(x - 90, y + 8); g.lineTo(x - 70, y + 14); g.lineTo(x - 50, y + 8); g.lineTo(x - 30, y + 14); g.lineTo(x - 10, y + 8); g.strokePath();
}

/** A timber harbour warehouse: big loading doors, a hoist, snow drifted against the walls. */
export function warehouse(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 110;
  shadow(g, x, y + 4, w * 1.1, 24);
  const wall = 0x5c4c42;
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, y - h, w, h);
  for (let bx = x - w / 2; bx < x + w / 2; bx += 12) { g.lineStyle(1, dim(wall, 0.25), 0.8); g.lineBetween(bx, y - h, bx, y); }
  g.fillStyle(0x3a3a44, 1); g.fillTriangle(x - w / 2 - 12, y - h, x + w / 2 + 12, y - h, x, y - h - 50);
  g.fillStyle(R.snow, 1); g.fillTriangle(x - w / 2 - 10, y - h - 4, x + w / 2 + 10, y - h - 4, x, y - h - 48);
  eaveIcicles(g, x - w / 2 - 12, x + w / 2 + 12, y - h, rng, 18);
  // Loading doors, frozen shut at the sill.
  g.fillStyle(R.timberDark, 1); g.fillRect(x - 36, y - 70, 72, 70);
  g.lineStyle(2, R.timber, 1); g.lineBetween(x, y - 70, x, y); g.lineBetween(x - 36, y - 70, x + 36, y); g.lineBetween(x + 36, y - 70, x - 36, y);
  g.fillStyle(R.ice, 0.7); g.fillRect(x - 38, y - 10, 76, 10);
  // Hoist beam with a frozen hook.
  g.fillStyle(R.timberDark, 1); g.fillRect(x - 4, y - h - 30, 8, 10); g.fillRect(x - 4, y - h - 30, 36, 6);
  g.lineStyle(1.5, R.rope, 1); g.lineBetween(x + 28, y - h - 24, x + 28, y - h + 20);
  g.lineStyle(2.5, R.iron, 1); g.beginPath(); g.arc(x + 28, y - h + 24, 5, 0, Math.PI, false); g.strokePath();
  drawIcicle(g, x + 23, y - h + 26, 12, 4);
  drawDrift(g, x - w / 2 + 20, y + 2, 70, 22, x);
  drawDrift(g, x + w / 2 - 14, y + 2, 50, 16, x + 1);
}

/** A harbour crane, frozen mid-lift: timber jib, iron wheel, a load of crates iced to the hook. */
export function frozenCrane(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 20);
  g.fillStyle(R.stoneDark, 1); g.fillRect(x - 30, y - 16, 60, 16);
  g.fillStyle(R.stone, 1); g.fillRect(x - 28, y - 18, 56, 4);
  // Post and the treadwheel.
  g.fillStyle(R.timber, 1); g.fillRect(x - 7, y - 150, 14, 134);
  g.lineStyle(4, R.timberDark, 1); g.strokeCircle(x - 30, y - 50, 30);
  g.lineStyle(2, R.timber, 1);
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 6; g.lineBetween(x - 30 - Math.cos(a) * 28, y - 50 - Math.sin(a) * 28, x - 30 + Math.cos(a) * 28, y - 50 + Math.sin(a) * 28); }
  // Jib reaching out over the ice.
  g.lineStyle(9, R.timberDark, 1); g.lineBetween(x, y - 140, x + 120, y - 190);
  g.lineStyle(6, R.timber, 1); g.lineBetween(x, y - 140, x + 120, y - 190);
  g.lineStyle(1.5, R.rope, 1); g.lineBetween(x, y - 150, x + 120, y - 190);
  g.fillStyle(R.snow, 1); g.fillEllipse(x + 60, y - 168, 120, 6);
  // The load: a cargo net of crates hanging still, crusted together.
  g.lineStyle(1.5, R.rope, 1); g.lineBetween(x + 118, y - 188, x + 118, y - 110);
  g.fillStyle(R.timberLit, 1); g.fillRect(x + 100, y - 110, 36, 26);
  g.fillStyle(dim(R.timberLit, 0.2), 1); g.fillRect(x + 104, y - 84, 28, 18);
  g.lineStyle(1, R.rope, 0.8); g.lineBetween(x + 100, y - 110, x + 136, y - 66); g.lineBetween(x + 136, y - 110, x + 100, y - 66);
  g.fillStyle(R.ice, 0.6); g.fillRoundedRect(x + 96, y - 114, 44, 52, 6);
  for (let i = 0; i < 5; i++) drawIcicle(g, x + 100 + i * 8, y - 62, 8 + (i % 3) * 6, 4);
  for (let i = 0; i < 6; i++) drawIcicle(g, x + 14 + i * 18, y - 146 - i * 7.5, 6 + (i % 2) * 6, 3);
}

/** Chowder Burgoo's soup cart: an iron stove on a barrow, a cauldron steaming, a ladle board. */
export function soupCart(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 16);
  for (const wx of [-26, 26]) {
    g.lineStyle(4, R.timberDark, 1); g.strokeCircle(x + wx, y - 12, 12);
    g.lineStyle(1.5, R.timber, 1); g.lineBetween(x + wx - 11, y - 12, x + wx + 11, y - 12); g.lineBetween(x + wx, y - 23, x + wx, y - 1);
  }
  g.fillStyle(R.timberDark, 1); g.fillRect(x - 40, y - 30, 80, 10);
  g.fillStyle(R.timber, 1); g.fillRect(x - 38, y - 52, 76, 22);
  g.fillStyle(R.iron, 1); g.fillRect(x - 18, y - 70, 36, 20);
  g.fillStyle(R.ember, 0.9); g.fillRect(x - 10, y - 62, 20, 8);
  g.fillStyle(0x1a1a1e, 1); g.fillEllipse(x, y - 72, 44, 14);
  g.fillStyle(0xc8a060, 1); g.fillEllipse(x, y - 74, 36, 9);
  g.lineStyle(2, R.ironLit, 1); g.lineBetween(x + 14, y - 76, x + 26, y - 92);
  // Stovepipe and a little board of chalked prices.
  g.fillStyle(R.iron, 1); g.fillRect(x + 28, y - 100, 7, 48);
  g.fillStyle(0x1f2a26, 1); g.fillRect(x - 40, y - 80, 18, 24);
  g.fillStyle(0xf0f0e8, 0.8); g.fillRect(x - 37, y - 76, 10, 1.5); g.fillRect(x - 37, y - 71, 12, 1.5); g.fillRect(x - 37, y - 66, 8, 1.5);
}

/** A stone bollard with a frozen mooring line bellying off it. */
export function bollard(g: G, x: number, y: number, lineTo?: { x: number; y: number }): void {
  shadow(g, x, y + 2, 22, 7);
  g.fillStyle(R.iron, 1); g.fillRoundedRect(x - 7, y - 20, 14, 20, 4);
  g.fillStyle(R.iron, 1); g.fillEllipse(x, y - 20, 20, 8);
  g.fillStyle(R.snow, 1); g.fillEllipse(x, y - 22, 16, 6);
  if (lineTo) {
    g.lineStyle(3, dim(R.rope, 0.15), 1);
    const mx = (x + lineTo.x) / 2, my = Math.max(y, lineTo.y) + 10;
    g.beginPath(); g.moveTo(x, y - 14);
    for (let k = 1; k <= 10; k++) {
      const t = k / 10;
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * mx + t * t * lineTo.x;
      const py = (1 - t) * (1 - t) * (y - 14) + 2 * (1 - t) * t * my + t * t * lineTo.y;
      g.lineTo(px, py);
    }
    g.strokePath();
    g.lineStyle(1, R.frost, 0.8);
    g.lineBetween(x, y - 15, mx, my - 1);
  }
}

// ── Ships ────────────────────────────────────────────────────────────

/**
 * A ship frozen into the harbour, side-on: the hull sits in a collar of heaped ice broken up
 * round the waterline, sails furled and frozen to the yards, icicles off every yard and the
 * bowsprit, the rigging furred white. `kind` sets the rig: a two-masted brig, a one-masted
 * revenue cutter in the Queen's green, or a stubby fishing smack.
 */
export function icedShip(g: G, x: number, y: number, len: number, kind: 'brig' | 'cutter' | 'smack', facing: 1 | -1, rng: () => number): void {
  const f = facing;
  const hullH = kind === 'smack' ? 34 : 46;
  const hullCol = kind === 'cutter' ? R.livery : kind === 'smack' ? 0x5a3e30 : R.hull;
  shadow(g, x, y + 6, len * 1.15, 30, 0.35);
  // Hull: sheer line rising to the bow, a counter stern, and the waterline buried in ice.
  const bowX = x + f * len / 2, sternX = x - f * len / 2;
  const pts = [
    { x: sternX, y: y - hullH - 8 }, { x: bowX + f * 26, y: y - hullH - 18 },
    { x: bowX - f * 10, y }, { x: sternX + f * 12, y },
  ];
  g.fillStyle(dim(hullCol, 0.45), 1); g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y + 3 })), true);
  g.fillStyle(hullCol, 1); g.fillPoints(pts, true);
  // Wales and a painted strake.
  g.lineStyle(3, lit(hullCol, 0.2), 1); g.lineBetween(sternX, y - hullH - 4, bowX + f * 22, y - hullH - 14);
  g.lineStyle(4, kind === 'cutter' ? R.kelp : R.scarf, 0.9); g.lineBetween(sternX + f * 4, y - hullH * 0.55, bowX + f * 4, y - hullH * 0.62);
  if (kind !== 'smack') {
    for (let i = 1; i < 7; i++) {
      const gx = sternX + f * (len * i) / 7.5;
      g.fillStyle(dim(hullCol, 0.6), 1); g.fillRect(gx - 5, y - hullH * 0.5, 10, 8);
    }
  }
  // Name boards at the bow — painted over in frost.
  g.fillStyle(R.frost, 0.6); g.fillRect(bowX - f * 46 - 14, y - hullH * 0.86, 28, 6);
  // Bowsprit.
  g.lineStyle(4, R.timberDark, 1); g.lineBetween(bowX + f * 20, y - hullH - 16, bowX + f * 76, y - hullH - 40);
  for (let i = 0; i < 4; i++) drawIcicle(g, bowX + f * (30 + i * 12), y - hullH - 20 - i * 5, 6 + rng() * 6, 3);
  // Masts, yards with frozen furled canvas.
  const masts = kind === 'brig' ? [-0.18, 0.18] : kind === 'cutter' ? [0.05] : [0.1];
  const mastH = kind === 'smack' ? 120 : kind === 'cutter' ? 170 : 210;
  for (const m of masts) {
    const mx = x + f * m * len;
    g.fillStyle(R.timberDark, 1); g.fillRect(mx - 4, y - hullH - mastH, 8, mastH);
    g.fillStyle(R.timberLit, 1); g.fillRect(mx - 2, y - hullH - mastH, 3, mastH);
    const yards = kind === 'smack' ? 1 : 3;
    for (let k = 0; k < yards; k++) {
      const yy = y - hullH - mastH + 26 + k * (mastH * 0.27);
      const half = (kind === 'smack' ? 34 : 56) - k * 4 + (yards - k) * 2;
      g.fillStyle(R.timberDark, 1); g.fillRect(mx - half, yy - 2, half * 2, 4);
      // Furled sail: a fat white roll along the yard, gathered by gaskets.
      g.fillStyle(R.canvas, 1); g.fillEllipse(mx, yy + 4, half * 2 - 6, 10);
      g.fillStyle(R.snow, 1); g.fillEllipse(mx, yy + 1, half * 2 - 8, 6);
      for (let gk = -2; gk <= 2; gk++) { g.fillStyle(R.rope, 1); g.fillRect(mx + gk * half * 0.4 - 1, yy, 2, 9); }
      eaveIcicles(g, mx - half + 2, mx + half - 2, yy + 8, rng, 10);
    }
    // Shrouds down to the rail, furred with rime.
    g.lineStyle(1, R.frost, 0.85);
    g.lineBetween(mx, y - hullH - mastH + 18, mx - 34, y - hullH - 6); g.lineBetween(mx, y - hullH - mastH + 18, mx + 34, y - hullH - 10);
    g.lineBetween(mx, y - hullH - mastH + 60, mx - 30, y - hullH - 6); g.lineBetween(mx, y - hullH - mastH + 60, mx + 30, y - hullH - 10);
    // Pennant frozen stiff at the masthead.
    g.fillStyle(kind === 'cutter' ? R.livery : R.scarf, 1);
    g.fillTriangle(mx, y - hullH - mastH, mx, y - hullH - mastH + 8, mx - f * 26, y - hullH - mastH + 14);
  }
  if (kind === 'cutter') {
    // A gaff mainsail in the Queen's green, frozen stiff, with her tide-sigil.
    const mx = x + f * 0.05 * len;
    g.fillStyle(lit(R.livery, 0.15), 0.9);
    g.fillTriangle(mx - f * 4, y - hullH - 20, mx - f * 4, y - hullH - 150, mx - f * 120, y - hullH - 24);
    g.lineStyle(2, R.kelp, 0.9); g.strokeCircle(mx - f * 40, y - hullH - 64, 12);
    g.lineBetween(mx - f * 52, y - hullH - 64, mx - f * 28, y - hullH - 64);
  }
  // Rail snow.
  snowCap(g, Math.min(sternX, bowX + f * 22), Math.max(sternX, bowX + f * 22), y - hullH - 10, 8, rng);
  // The ice collar: heaped, broken plates round the waterline.
  for (let i = 0; i < len / 14 + 4; i++) {
    const px = sternX - f * 20 + f * i * 14 + (rng() - 0.5) * 6;
    const s = 8 + rng() * 10;
    g.fillStyle(R.iceDeep, 1); g.fillTriangle(px - s, y + 6, px + s, y + 6, px + (rng() - 0.5) * 6, y - s * 1.2);
    g.fillStyle(R.iceLit, 1); g.fillTriangle(px - s * 0.7, y + 4, px, y + 4, px + (rng() - 0.5) * 4, y - s);
  }
  drawDrift(g, sternX - f * 10, y + 6, 60, 16, x);
}

/**
 * The *Rimebiter*, Captain Floe's icebreaker, side-on: a squat riveted iron hull with a knife of
 * a bow painted red where it bites, a white wheelhouse, a tall funnel ringed in the Queen's green,
 * smoke from it (animated separately) and her anchor hanging frozen at the hawse.
 */
export function rimebiter(g: G, x: number, y: number, facing: 1 | -1, rng: () => number): void {
  const f = facing, len = 320, hullH = 58;
  shadow(g, x, y + 8, len * 1.2, 34, 0.38);
  const bowX = x + f * len / 2, sternX = x - f * len / 2;
  const pts = [
    { x: sternX, y: y - hullH }, { x: bowX - f * 30, y: y - hullH - 6 }, { x: bowX + f * 18, y: y - hullH - 10 },
    { x: bowX - f * 24, y }, { x: sternX + f * 10, y },
  ];
  g.fillStyle(dim(R.hull, 0.5), 1); g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y + 3 })), true);
  g.fillStyle(R.hull, 1); g.fillPoints(pts, true);
  // The red ice-knife.
  g.fillStyle(R.scarf, 1);
  g.fillPoints([{ x: bowX - f * 30, y: y - hullH * 0.4 }, { x: bowX + f * 6, y: y - hullH * 0.6 }, { x: bowX - f * 24, y }, { x: bowX - f * 60, y }], true);
  // Rivet seams.
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 22; i++) {
      const px = sternX + f * (12 + i * 13), py = y - 12 - r * 16;
      g.fillStyle(R.ironLit, 0.7); g.fillCircle(px, py, 1.2);
    }
  }
  // Wheelhouse and funnel.
  const wx = x - f * 40;
  g.fillStyle(dim(R.canvas, 0.2), 1); g.fillRect(wx - 40, y - hullH - 54, 80, 54);
  g.fillStyle(lit(R.canvas, 0.3), 1); g.fillRect(wx - 38, y - hullH - 52, 76, 50);
  for (let i = 0; i < 4; i++) { g.fillStyle(R.blackIce, 1); g.fillRect(wx - 32 + i * 18, y - hullH - 44, 12, 12); }
  snowCap(g, wx - 42, wx + 42, y - hullH - 54, 10, rng);
  const fx = x - f * 100;
  g.fillStyle(0x1a1a1e, 1); g.fillRect(fx - 14, y - hullH - 110, 28, 110);
  g.fillStyle(R.livery, 1); g.fillRect(fx - 14, y - hullH - 92, 28, 12);
  g.fillStyle(R.kelp, 1); g.fillRect(fx - 14, y - hullH - 80, 28, 3);
  g.fillStyle(0x0a0a0c, 1); g.fillEllipse(fx, y - hullH - 110, 28, 8);
  // Mast with a lamp and a stays.
  const mx = x + f * 60;
  g.fillStyle(R.timberDark, 1); g.fillRect(mx - 3, y - hullH - 130, 6, 130);
  g.lineStyle(1, R.frost, 0.8); g.lineBetween(mx, y - hullH - 128, bowX + f * 10, y - hullH - 8); g.lineBetween(mx, y - hullH - 128, fx, y - hullH - 100);
  g.fillStyle(R.brass, 1); g.fillRect(mx - 4, y - hullH - 100, 8, 8);
  // Anchor at the hawse, frozen on its chain.
  const ax = bowX - f * 44, ay = y - hullH * 0.55;
  g.lineStyle(2, R.iron, 1); g.lineBetween(ax, ay - 10, ax, ay + 12);
  g.lineStyle(3, R.iron, 1); g.beginPath(); g.arc(ax, ay + 6, 8, 0.2, Math.PI - 0.2, false); g.strokePath();
  drawIcicle(g, ax - 4, ay + 12, 10, 3); drawIcicle(g, ax + 5, ay + 13, 7, 3);
  snowCap(g, Math.min(sternX, bowX), Math.max(sternX, bowX), y - hullH - 4, 8, rng);
  // The ice she has broken, heaped round her: bigger, rougher slabs than any other hull.
  for (let i = 0; i < 26; i++) {
    const px = sternX - f * 26 + f * i * 15 + (rng() - 0.5) * 8;
    const s = 10 + rng() * 14;
    g.fillStyle(R.iceDark, 1); g.fillTriangle(px - s, y + 8, px + s, y + 8, px + (rng() - 0.5) * 10, y - s * 1.3);
    g.fillStyle(R.ice, 1); g.fillTriangle(px - s * 0.7, y + 6, px + s * 0.3, y + 6, px + (rng() - 0.5) * 6, y - s);
  }
}

/** A hull that turned turtle as the ice took it: upturned keel, barnacled, icicles off the gunwale. */
export function capsizedHull(g: G, x: number, y: number, rng: () => number): void {
  const len = 200;
  shadow(g, x, y + 4, len * 1.1, 26);
  g.fillStyle(dim(0x4a3a30, 0.4), 1); g.fillEllipse(x, y - 24, len + 6, 64);
  g.fillStyle(0x4a3a30, 1); g.fillEllipse(x, y - 28, len, 56);
  g.fillStyle(lit(0x4a3a30, 0.2), 1); g.fillEllipse(x - 10, y - 40, len * 0.8, 18);
  // Keel along the top and the rudder post.
  g.fillStyle(R.timberDark, 1); g.fillRect(x - len / 2 + 8, y - 58, len - 16, 6);
  g.fillRect(x + len / 2 - 14, y - 58, 8, 26);
  // Barnacles and a crust of snow.
  for (let i = 0; i < 24; i++) { g.fillStyle(0xd8d0c4, 0.7); g.fillCircle(x - len * 0.45 + rng() * len * 0.9, y - 30 + rng() * 22, 1.5 + rng() * 1.5); }
  snowCap(g, x - len / 2 + 16, x + len / 2 - 16, y - 54, 10, rng);
  eaveIcicles(g, x - len / 2 + 10, x + len / 2 - 10, y - 6, rng, 14);
  for (let i = 0; i < 12; i++) {
    const px = x - len / 2 + i * 18, s = 8 + rng() * 8;
    g.fillStyle(R.iceDeep, 1); g.fillTriangle(px - s, y + 6, px + s, y + 6, px, y - s);
  }
}

// ── Ice ──────────────────────────────────────────────────────────────

/** An ice-fishing shanty on sled runners: a plank hut, a stovepipe, a hole-saw leaning on it. */
export function shanty(g: G, x: number, y: number, color: number, rng: () => number): void {
  shadow(g, x, y + 3, 80, 16);
  g.fillStyle(R.timberDark, 1); g.fillRect(x - 34, y - 6, 68, 5);
  g.lineStyle(3, R.ironLit, 1); g.lineBetween(x - 38, y - 1, x + 34, y - 1);
  g.beginPath(); g.arc(x + 34, y - 6, 5, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
  g.fillStyle(dim(color, 0.4), 1); g.fillRect(x - 30, y - 58, 60, 52);
  g.fillStyle(color, 1); g.fillRect(x - 28, y - 56, 56, 50);
  for (let px = x - 28; px < x + 28; px += 8) { g.lineStyle(1, dim(color, 0.25), 0.9); g.lineBetween(px, y - 56, px, y - 6); }
  g.fillStyle(0x3a3a44, 1); g.fillTriangle(x - 36, y - 56, x + 36, y - 56, x, y - 80);
  g.fillStyle(R.snow, 1); g.fillTriangle(x - 32, y - 59, x + 32, y - 59, x, y - 78);
  g.fillStyle(R.timberDark, 1); g.fillRect(x - 10, y - 40, 20, 34);
  g.fillStyle(0xffc46a, 0.85); g.fillRect(x + 14, y - 46, 9, 9);
  g.fillStyle(R.iron, 1); g.fillRect(x + 16, y - 96, 6, 34);
  // Hole-saw leaning on the wall.
  g.lineStyle(2, R.timberDark, 1); g.lineBetween(x - 40, y - 4, x - 30, y - 60);
  g.fillStyle(R.ironLit, 1); g.fillRect(x - 41, y - 32, 4, 28);
  for (let i = 0; i < 6; i++) g.fillTriangle(x - 41, y - 30 + i * 4, x - 41, y - 28 + i * 4, x - 44, y - 29 + i * 4);
  eaveIcicles(g, x - 34, x + 34, y - 56, rng, 8);
}

/** A pressure ridge: sea-ice shoved up into a jumble of tilted slabs where the harbour mouth froze. */
export function pressureRidge(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.1, 28, 0.28);
  for (let i = 0; i < w / 12; i++) {
    const px = x - w / 2 + rng() * w;
    const s = 18 + rng() * 30;
    const lean = (rng() - 0.5) * s;
    const top = y - s * (1.2 + rng());
    g.fillStyle(R.iceDark, 1); g.fillTriangle(px - s * 0.7, y + 4, px + s * 0.7, y + 4, px + lean, top - 2);
    g.fillStyle(rng() < 0.5 ? R.ice : R.iceDeep, 1); g.fillTriangle(px - s * 0.6, y + 2, px + s * 0.6, y + 2, px + lean, top);
    g.fillStyle(R.iceLit, 0.9); g.fillTriangle(px - s * 0.5, y, px - s * 0.05, y, px + lean, top + 2);
    if (rng() < 0.4) { g.fillStyle(R.snow, 1); g.fillEllipse(px + lean * 0.6, top + s * 0.3, s * 0.6, 6); }
  }
}

/** A child's snow fort: a curve of packed blocks, a flag on a stick, a pile of ammunition. */
export function snowFort(g: G, x: number, y: number, flag: number, facing: 1 | -1): void {
  shadow(g, x, y + 4, 120, 22, 0.2);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.15 + (i / 6) * 0.7);
    const bx = x + Math.cos(a) * 50 * facing, by = y - Math.sin(a) * 24;
    g.fillStyle(R.snowBlue, 1); g.fillRect(bx - 12, by - 26, 24, 28);
    g.fillStyle(R.snow, 1); g.fillRect(bx - 12, by - 30, 24, 12);
    g.fillStyle(R.snowShade, 1); g.fillRect(bx - 12, by - 18, 24, 16);
    if (i % 2 === 0) { g.fillStyle(R.snow, 1); g.fillRect(bx - 6, by - 38, 12, 9); }
  }
  g.lineStyle(2, R.timberDark, 1); g.lineBetween(x, y - 20, x, y - 70);
  g.fillStyle(flag, 1); g.fillTriangle(x, y - 70, x, y - 58, x + facing * 22, y - 64);
  drawSnowball(g, x - facing * 20, y - 6, 6); drawSnowball(g, x - facing * 8, y - 6, 6); drawSnowball(g, x - facing * 14, y - 15, 6);
}

/** A rink lantern on a pole — red-glassed, the skaters' mark. */
export function rinkLantern(g: G, x: number, y: number): void {
  shadow(g, x, y + 1, 16, 5);
  g.lineStyle(3, R.iron, 1); g.lineBetween(x, y, x, y - 54);
  g.fillStyle(R.iron, 1); g.fillRect(x - 6, y - 66, 12, 4);
  g.fillStyle(R.scarf, 0.95); g.fillRect(x - 5, y - 62, 10, 10);
  g.fillStyle(0xffd0a0, 0.9); g.fillRect(x - 2, y - 60, 4, 6);
  g.fillStyle(R.snow, 1); g.fillEllipse(x, y - 67, 14, 4);
}

/** A licensed warming brazier set on a flagstone, with its brass licence plate. */
export function brazierPiece(g: G, x: number, y: number): void {
  g.fillStyle(R.stoneDark, 0.8); g.fillEllipse(x, y + 2, 40, 14);
  drawBrazier(g, x, y, 1);
}

// ── The palace ───────────────────────────────────────────────────────

/**
 * Hoarfrost's icicle palace. It was a customs house once; he froze the sea over it and let the
 * ice grow — now it is a cluster of glassy spires rising like icicles turned the right way up,
 * tallest in the middle, with a great arched gate hung with a curtain of real icicles, a frozen
 * fountain before it, and the Queen's tide-sigil set into the ice above the arch. The old customs
 * house's stone shows through at the foot.
 */
export function icePalace(g: G, x: number, y: number, rng: () => number): void {
  const w = 520;
  shadow(g, x, y + 10, w * 1.15, 50, 0.38);
  // The stone foot: the drowned customs house's lower storey.
  g.fillStyle(R.stoneDark, 1); g.fillRect(x - w / 2 + 20, y - 70, w - 40, 72);
  g.fillStyle(R.stone, 1); g.fillRect(x - w / 2 + 24, y - 68, w - 48, 66);
  for (let r = 0; r < 4; r++) {
    const yy = y - 8 - r * 16;
    g.lineStyle(1, R.stoneDark, 0.6); g.lineBetween(x - w / 2 + 24, yy, x + w / 2 - 24, yy);
  }
  // Spires: back rank first, then the front, each a tall faceted shard.
  const spire = (sx: number, base: number, sh: number, sw: number, shade: number): void => {
    g.fillStyle(dim(shade, 0.35), 1); g.fillTriangle(sx - sw / 2 - 3, base, sx + sw / 2 + 3, base, sx, base - sh - 6);
    g.fillStyle(shade, 1); g.fillTriangle(sx - sw / 2, base, sx + sw / 2, base, sx, base - sh);
    g.fillStyle(lit(shade, 0.45), 0.95); g.fillTriangle(sx - sw / 2 + 2, base, sx - sw * 0.08, base, sx - 1, base - sh + 6);
    g.lineStyle(1, R.glassLit, 0.7); g.lineBetween(sx, base - sh, sx + sw * 0.12, base);
    // Bands of frosted ice across the shard.
    for (let k = 1; k < 4; k++) {
      const by = base - (sh * k) / 4, half = (sw / 2) * (1 - k / 4);
      g.lineStyle(1.5, R.frost, 0.5); g.lineBetween(sx - half, by, sx + half, by);
    }
  };
  const back: [number, number, number][] = [[-200, 190, 54], [-120, 260, 64], [120, 250, 62], [200, 200, 56], [-40, 300, 60], [40, 320, 66]];
  for (const [dx, sh, sw] of back) spire(x + dx, y - 60, sh, sw, R.glassDeep);
  const front: [number, number, number][] = [[-230, 140, 60], [-160, 200, 70], [-70, 250, 76], [0, 360, 92], [70, 240, 76], [160, 210, 70], [230, 150, 60]];
  for (const [dx, sh, sw] of front) spire(x + dx, y - 50, sh, sw, R.glass);
  // The middle spire's crown: a ring of small points round a pale cyan light.
  const cy = y - 50 - 360 + 40;
  g.fillStyle(0x6fe6ff, 0.35); g.fillCircle(x, cy, 18);
  g.fillStyle(0xeafaff, 0.95); g.fillCircle(x, cy, 6);
  // The front wall of ice between the spires.
  g.fillStyle(R.glassDeep, 0.9); g.fillRect(x - w / 2 + 30, y - 120, w - 60, 72);
  g.fillStyle(R.glass, 0.6); g.fillRect(x - w / 2 + 34, y - 118, w - 68, 10);
  // The great arch and its curtain of icicles.
  const aw = 110, ah = 150;
  g.fillStyle(0x0e2232, 1); g.fillRoundedRect(x - aw / 2, y - ah, aw, ah, { tl: aw / 2, tr: aw / 2, bl: 0, br: 0 });
  g.lineStyle(6, R.glassLit, 0.9); g.beginPath(); g.arc(x, y - ah + aw / 2, aw / 2 + 4, Math.PI, 0, false); g.strokePath();
  g.lineStyle(3, R.glassDeep, 1); g.beginPath(); g.arc(x, y - ah + aw / 2, aw / 2 + 10, Math.PI, 0, false); g.strokePath();
  for (let i = 0; i < 13; i++) {
    const ix = x - aw / 2 + 6 + i * ((aw - 12) / 12);
    const top = y - ah + aw / 2 - Math.sqrt(Math.max(0, (aw / 2) ** 2 - (ix - x) ** 2)) + 4;
    drawIcicle(g, ix, top, 22 + (i % 4) * 10 + rng() * 8, 6, 0.95);
  }
  // The Queen's tide-sigil above the arch: a ring with a wave through it, in kelp gold.
  const sy = y - ah - 34;
  g.lineStyle(3, R.kelp, 1); g.strokeCircle(x, sy, 18);
  g.beginPath(); g.moveTo(x - 18, sy + 2);
  for (let k = 0; k <= 12; k++) g.lineTo(x - 18 + k * 3, sy + 2 + Math.sin((k / 12) * Math.PI * 2) * 5);
  g.strokePath();
  // Windows: tall slits of pale light in the front spires.
  for (const dx of [-160, -70, 70, 160]) {
    g.fillStyle(0xeafaff, 0.55); g.fillRect(x + dx - 4, y - 140, 8, 46);
    g.fillStyle(0x6fe6ff, 0.3); g.fillRect(x + dx - 6, y - 142, 12, 50);
  }
  // Steps of packed snow down from the arch.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 ? R.snowShade : R.snow, 1); g.fillRect(x - 70 - i * 10, y - 6 + i * 6, 140 + i * 20, 8);
  }
  // Icicles off the front wall's lip.
  eaveIcicles(g, x - w / 2 + 30, x - aw / 2 - 6, y - 48, rng, 18);
  eaveIcicles(g, x + aw / 2 + 6, x + w / 2 - 30, y - 48, rng, 18);
}

/**
 * The frozen fountain before the palace: a stone basin whose jets froze mid-spray into a tree of
 * ice, with a ring of frozen water standing off the lip.
 */
export function frozenFountain(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 120, 26);
  g.fillStyle(R.stoneDark, 1); g.fillEllipse(x, y - 6, 110, 34);
  g.fillStyle(R.stone, 1); g.fillEllipse(x, y - 10, 104, 28);
  g.fillStyle(R.iceDeep, 1); g.fillEllipse(x, y - 12, 88, 20);
  g.fillStyle(R.ice, 1); g.fillRect(x - 6, y - 70, 12, 58);
  // The jets, frozen mid-arc.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const r = 18 + k * 10;
      g.lineStyle(5 - k, R.ice, 0.95);
      g.beginPath(); g.arc(x + s * r, y - 64, r, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 1.9 : -Math.PI * 0.9, s < 0); g.strokePath();
    }
    for (let i = 0; i < 4; i++) drawIcicle(g, x + s * (30 + i * 8), y - 40 - i * 3, 8 + i * 3, 3);
  }
  g.fillStyle(R.glassLit, 1); g.fillCircle(x, y - 74, 7);
}

/**
 * The Icicle Gallery: the palace's west colonnade, a run of ice pillars under a roof of planks
 * hung thick with icicles, and Vell's statues standing between the pillars — ice figures caught
 * in a gesture, faces of people who could not pay, kept for their families.
 */
export function iceGallery(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.08, 30, 0.3);
  const h = 120;
  // Back wall: a dark recess behind the pillars.
  g.fillStyle(0x1d3a4e, 1); g.fillRect(x - w / 2, y - h, w, h - 8);
  // Statues in the recess.
  const n = Math.floor(w / 90);
  for (let i = 0; i < n; i++) {
    const sx = x - w / 2 + 45 + i * 90;
    g.fillStyle(R.stoneDark, 1); g.fillRect(sx - 14, y - 22, 28, 12);
    g.fillStyle(R.ice, 0.85); g.fillEllipse(sx, y - 46, 22, 44);
    g.fillStyle(R.ice, 0.85); g.fillCircle(sx, y - 76, 10);
    g.fillStyle(R.glassLit, 0.7); g.fillEllipse(sx - 4, y - 52, 6, 22);
    const arm = jit(i, 3) > 0.5 ? 1 : -1;
    g.lineStyle(4, R.ice, 0.85); g.lineBetween(sx + arm * 6, y - 60, sx + arm * 20, y - 74 - jit(i, 5) * 12);
    g.fillStyle(R.blackIce, 0.5); g.fillCircle(sx - 3, y - 78, 1.6); g.fillCircle(sx + 3, y - 78, 1.6);
  }
  // Pillars of clear ice.
  for (let i = 0; i <= n; i++) {
    const px = x - w / 2 + i * 90;
    g.fillStyle(R.iceDeep, 1); g.fillRect(px - 9, y - h, 18, h);
    g.fillStyle(R.ice, 1); g.fillRect(px - 7, y - h, 12, h);
    g.fillStyle(R.glassLit, 0.9); g.fillRect(px - 6, y - h, 3, h);
    g.fillStyle(R.iceLit, 1); g.fillRect(px - 13, y - 10, 26, 10);
  }
  // The roof: dark timber lintel, a snow load, and the icicles — longer than anywhere else.
  g.fillStyle(R.timberDark, 1); g.fillRect(x - w / 2 - 12, y - h - 16, w + 24, 18);
  g.fillStyle(R.timber, 1); g.fillRect(x - w / 2 - 12, y - h - 16, w + 24, 5);
  snowCap(g, x - w / 2 - 14, x + w / 2 + 14, y - h - 16, 16, rng);
  for (let ix = x - w / 2 - 8; ix < x + w / 2 + 8; ix += 6 + rng() * 5) drawIcicle(g, ix, y - h + 2, 8 + rng() * 34, 4 + rng() * 3, 0.95);
}
