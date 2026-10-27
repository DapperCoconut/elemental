import type Phaser from 'phaser';
import { dim, lit, shadow } from '../../../../art/IsleArt';
import { O, drawBone, drawCandle, drawLily, drawRib, drawSkull, drawTithePlate, jit } from './util';

/**
 * Set pieces for the Ossuary Court's world map. Each draws in world space with `x,y` at its base
 * line (the depth it sorts at). The Ossuary is a garden of the dead kept as carefully as any
 * flowerbed: chapels of violet-grey stone with skull rose-windows, cottages with bone lattices on
 * their windows, trellises of lashed femurs carrying white roses, black cypresses, the marrow
 * wells and their windlasses, and over all of it the Ossuary Throne with the Rood on its roof.
 */

type G = Phaser.GameObjects.Graphics;

/** A slate roof: a dark wedge with overlapping courses. */
function slateRoof(g: G, l: number, r: number, base: number, peak: number, cx: number, tone = O.slate): void {
  g.fillStyle(dim(tone, 0.45), 1); g.fillTriangle(l - 4, base + 2, r + 4, base + 2, cx, peak - 4);
  g.fillStyle(tone, 1); g.fillTriangle(l, base, r, base, cx, peak);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    g.lineStyle(1.5, lit(tone, 0.12), 1);
    g.lineBetween(l + (cx - l) * t, base + (peak - base) * t, r - (r - cx) * t, base + (peak - base) * t);
  }
}

/** A pointed (lancet) window or door. */
function lancet(g: G, x: number, y: number, w: number, h: number, fill: number, frame: number): void {
  g.fillStyle(frame, 1); g.fillRect(x - w / 2 - 2, y - h, w + 4, h); g.fillTriangle(x - w / 2 - 2, y - h, x + w / 2 + 2, y - h, x, y - h - w * 0.9 - 2);
  g.fillStyle(fill, 1); g.fillRect(x - w / 2, y - h, w, h); g.fillTriangle(x - w / 2, y - h, x + w / 2, y - h, x, y - h - w * 0.85);
}

/** Lilies in a clump at a doorstep or a wall foot. */
function lilyClump(g: G, x: number, y: number, n: number, rng: () => number): void {
  for (let i = 0; i < n; i++) drawLily(g, x + (rng() - 0.5) * 30, y + rng() * 4, 6 + rng() * 2, 0.7 + rng() * 0.3, (rng() - 0.5) * 0.6);
}

// ── Town ─────────────────────────────────────────────────────────────

export interface CottageOpts { wall: number; roof?: number; lit?: boolean; mourning?: boolean }

/**
 * A sexton's cottage: rough violet-grey stone, a steep slate roof, windows latticed with bone
 * instead of lead, a skull for a keystone over the door and lilies at the step. A house in
 * mourning (someone pruned) hangs a white sheet in the window and a black ribbon on the latch.
 */
export function cottage(g: G, x: number, y: number, w: number, h: number, o: CottageOpts, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.2, 20);
  const L = x - w / 2, Rr = x + w / 2;
  g.fillStyle(dim(o.wall, 0.45), 1); g.fillRect(L - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(o.wall, 1); g.fillRect(L, y - h, w, h);
  // Coursed rubble.
  for (let yy = y - h + 4; yy < y - 2; yy += 10) {
    for (let xx = L + ((yy / 10) % 2) * 8; xx < Rr - 6; xx += 16 + rng() * 6) {
      g.fillStyle(rng() < 0.5 ? lit(o.wall, 0.08) : dim(o.wall, 0.12), 1); g.fillRoundedRect(xx, yy, 13 + rng() * 4, 8, 2);
    }
  }
  // Moss at the foot.
  for (let xx = L; xx < Rr; xx += 8) { g.fillStyle(O.moss, 0.7); g.fillEllipse(xx + 4, y - 2, 10, 6); }
  slateRoof(g, L - 8, Rr + 8, y - h, y - h - w * 0.6, x, o.roof ?? O.slate);
  // A bone-lattice window either side of the door.
  for (const wx of [x - w * 0.3, x + w * 0.3]) {
    const wy = y - h * 0.62;
    g.fillStyle(O.stoneDark, 1); g.fillRect(wx - 11, wy - 11, 22, 22);
    g.fillStyle(o.lit ? O.candle : 0x1a1418, 1); g.fillRect(wx - 9, wy - 9, 18, 18);
    if (o.lit) { g.fillStyle(O.candle, 0.12); g.fillCircle(wx, wy, 22); }
    if (o.mourning && wx > x) { g.fillStyle(O.lily, 0.95); g.fillRect(wx - 9, wy - 9, 18, 12); }
    g.lineStyle(1.5, O.bone, 1);
    g.lineBetween(wx - 9, wy - 9, wx + 9, wy + 9); g.lineBetween(wx + 9, wy - 9, wx - 9, wy + 9);
    g.lineBetween(wx, wy - 9, wx, wy + 9);
  }
  // The door, the skull keystone.
  g.fillStyle(O.stoneDark, 1); g.fillRoundedRect(x - 12, y - 34, 24, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.fillStyle(O.timber, 1); g.fillRoundedRect(x - 10, y - 32, 20, 32, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.lineStyle(1, dim(O.timber, 0.4), 1); g.lineBetween(x - 3, y - 30, x - 3, y); g.lineBetween(x + 4, y - 30, x + 4, y);
  drawSkull(g, x, y - 40, 5, 1, { tone: O.boneShade });
  if (o.mourning) { g.fillStyle(0x0e0a0c, 1); g.fillRect(x + 5, y - 18, 3, 10); g.fillTriangle(x + 4, y - 8, x + 9, y - 8, x + 6.5, y - 3); }
  lilyClump(g, x - 24, y + 2, 3, rng);
  lilyClump(g, x + 24, y + 2, 2, rng);
}

/**
 * Knell & Daughter, Bone-Carvers: a wide low workshop with a bay of shelves out front where
 * carved spoons, combs, pins and dice are laid out on black cloth, and a hanging sign — a spoon
 * crossed with a chisel — off an iron bracket.
 */
export function carverShop(g: G, x: number, y: number, rng: () => number): void {
  const w = 200, h = 110;
  cottage(g, x, y, w, h, { wall: 0x7a6e74, roof: 0x3a3440, lit: true }, rng);
  // The display shelf before the bay.
  const sx = x + 50, sy = y + 2;
  g.fillStyle(O.timber, 1); g.fillRect(sx - 34, sy - 26, 68, 6); g.fillRect(sx - 32, sy - 26, 4, 26); g.fillRect(sx + 28, sy - 26, 4, 26);
  g.fillStyle(0x161214, 1); g.fillRect(sx - 34, sy - 30, 68, 4);
  for (let i = 0; i < 7; i++) {
    const ix = sx - 28 + i * 9;
    if (i % 3 === 0) drawBone(g, ix, sy - 32, ix + 4, sy - 40, 2, O.bone, 1);
    else if (i % 3 === 1) { g.fillStyle(O.bone, 1); g.fillEllipse(ix + 2, sy - 33, 5, 3); g.fillRect(ix + 1, sy - 42, 2, 9); }
    else { g.fillStyle(O.boneLit, 1); g.fillRect(ix, sy - 36, 5, 5); g.fillStyle(O.slate, 1); g.fillCircle(ix + 2.5, sy - 33.5, 0.8); }
  }
  // The hanging sign.
  const bx = x - w / 2 - 6, by = y - h + 10;
  g.lineStyle(3, O.iron, 1); g.lineBetween(bx, by, bx - 34, by); g.lineBetween(bx, by + 10, bx - 10, by);
  g.lineStyle(1, O.iron, 1); g.lineBetween(bx - 30, by, bx - 30, by + 8); g.lineBetween(bx - 8, by, bx - 8, by + 8);
  g.fillStyle(O.timberLit, 1); g.fillRoundedRect(bx - 36, by + 8, 34, 26, 4);
  drawBone(g, bx - 30, by + 28, bx - 8, by + 14, 2.4, O.bone, 1);
  g.lineStyle(2, O.ironLit, 1); g.lineBetween(bx - 30, by + 14, bx - 8, by + 28);
}

/**
 * The Rattling Jaw: a timber-framed tavern whose porch is roofed by an enormous jawbone (the
 * locals say a whale's, carried up from Mossgate; it is not a whale's), with a lantern swinging
 * from its teeth and a chimney that never stops.
 */
export function tavern(g: G, x: number, y: number, rng: () => number): void {
  const w = 230, h = 120;
  shadow(g, x, y + 4, w * 1.2, 22);
  const L = x - w / 2, Rr = x + w / 2;
  g.fillStyle(0x2a2220, 1); g.fillRect(L - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(0xb8a888, 1); g.fillRect(L, y - h, w, h);
  // Timber framing.
  g.lineStyle(6, O.timber, 1);
  g.lineBetween(L, y - h, L, y); g.lineBetween(Rr, y - h, Rr, y); g.lineBetween(L, y - h * 0.5, Rr, y - h * 0.5);
  for (let xx = L + 46; xx < Rr; xx += 46) { g.lineBetween(xx, y - h, xx, y); g.lineBetween(xx - 46, y - h, xx, y - h * 0.5); }
  slateRoof(g, L - 12, Rr + 12, y - h, y - h - 70, x, 0x3a2e30);
  g.fillStyle(dim(O.stone, 0.3), 1); g.fillRect(x + 60, y - h - 70, 18, 50);
  for (const wx of [L + 30, Rr - 30]) {
    g.fillStyle(O.candle, 0.9); g.fillRect(wx - 10, y - 50, 20, 18);
    g.fillStyle(O.candle, 0.1); g.fillCircle(wx, y - 42, 26);
    g.lineStyle(2, O.timber, 1); g.lineBetween(wx, y - 50, wx, y - 32); g.lineBetween(wx - 10, y - 41, wx + 10, y - 41);
  }
  g.fillStyle(0x1a1214, 1); g.fillRect(x - 14, y - 38, 28, 38);
  g.fillStyle(O.timber, 1); g.fillRect(x - 12, y - 36, 24, 36);
  // The great jawbone over the door: a U of bone with a row of teeth along its rim.
  const jy = y - 50;
  g.lineStyle(14, dim(O.bone, 0.4), 1);
  g.beginPath(); g.arc(x, jy, 46, Math.PI, 0, false); g.strokePath();
  g.lineStyle(11, O.bone, 1);
  g.beginPath(); g.arc(x, jy, 46, Math.PI, 0, false); g.strokePath();
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const tx = x + Math.cos(a) * 40, ty = jy + Math.sin(a) * 40;
    g.fillStyle(O.boneLit, 1); g.fillTriangle(tx - 3, ty, tx + 3, ty, x + Math.cos(a) * 30, jy + Math.sin(a) * 30);
  }
  g.fillStyle(O.bone, 1); g.fillRect(x - 52, jy - 2, 12, 52); g.fillRect(x + 40, jy - 2, 12, 52);
  g.lineStyle(1, O.iron, 1); g.lineBetween(x, jy - 46, x, jy - 26);
  g.fillStyle(O.iron, 1); g.fillRect(x - 5, jy - 26, 10, 12);
  g.fillStyle(O.candle, 1); g.fillRect(x - 3, jy - 24, 6, 8);
  // The board over the door.
  g.fillStyle(O.timberLit, 1); g.fillRect(x - 40, y - h + 10, 80, 18);
  for (let i = 0; i < 5; i++) drawBone(g, x - 30 + i * 15, y - h + 22, x - 24 + i * 15, y - h + 16, 2, O.bone, 1);
  void rng;
}

/**
 * Coccyx's knucklebone board: a trestle table under a ragged awning, a grid chalked on its top,
 * bones and coins laid out, two upturned buckets for stools.
 */
export function knuckleBoard(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 120, 18);
  g.lineStyle(2, O.timber, 1); g.lineBetween(x - 56, y, x - 50, y - 70); g.lineBetween(x + 56, y, x + 50, y - 70);
  g.fillStyle(0x5a3a6a, 1); g.fillTriangle(x - 60, y - 70, x + 60, y - 70, x, y - 92);
  for (let i = 0; i < 6; i++) { g.fillStyle(dim(0x5a3a6a, 0.3), 1); g.fillTriangle(x - 60 + i * 20, y - 70, x - 50 + i * 20, y - 70, x - 55 + i * 20, y - 62); }
  g.fillStyle(O.timber, 1); g.fillRect(x - 40, y - 30, 80, 8); g.fillRect(x - 36, y - 22, 4, 22); g.fillRect(x + 32, y - 22, 4, 22);
  g.fillStyle(O.timberLit, 1); g.fillRect(x - 40, y - 30, 80, 2);
  g.lineStyle(1, 0xe8e0d0, 0.6); for (let i = 1; i < 4; i++) g.lineBetween(x - 40 + i * 20, y - 30, x - 40 + i * 20, y - 22);
  for (let i = 0; i < 5; i++) drawBone(g, x - 30 + i * 13, y - 34, x - 25 + i * 13, y - 33, 2.2, O.bone, 1);
  g.fillStyle(O.gilt, 1); g.fillCircle(x + 22, y - 34, 2.5); g.fillCircle(x + 27, y - 35, 2.5);
  for (const bx of [x - 54, x + 54]) { g.fillStyle(O.ironLit, 1); g.fillRect(bx - 8, y - 14, 16, 14); g.fillStyle(O.iron, 1); g.fillRect(bx - 9, y - 16, 18, 3); }
}

// ── Chapels and the keep ─────────────────────────────────────────────

/**
 * An ossuary chapel: a tall narrow nave of violet-grey stone with buttresses, a lancet door, a
 * rose window whose tracery is a ring of skulls, a bell-cote on the gable, and stacked skulls
 * filling the arcade under the eaves.
 */
export function chapel(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.3, 24);
  const L = x - w / 2, Rr = x + w / 2;
  g.fillStyle(dim(O.stone, 0.45), 1); g.fillRect(L - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(O.stone, 1); g.fillRect(L, y - h, w, h);
  for (let yy = y - h + 6; yy < y; yy += 14) { g.lineStyle(1, dim(O.stone, 0.2), 0.8); g.lineBetween(L, yy, Rr, yy); }
  // Buttresses.
  for (const bx of [L - 6, Rr + 6]) {
    g.fillStyle(O.stoneDark, 1); g.fillRect(bx - 7, y - h * 0.7, 14, h * 0.7);
    g.fillTriangle(bx - 7, y - h * 0.7, bx + 7, y - h * 0.7, bx, y - h * 0.85);
  }
  slateRoof(g, L - 6, Rr + 6, y - h, y - h - w * 0.9, x);
  // Bell-cote.
  const by = y - h - w * 0.9;
  g.fillStyle(O.stoneLit, 1); g.fillRect(x - 10, by - 26, 20, 26); g.fillTriangle(x - 13, by - 26, x + 13, by - 26, x, by - 42);
  g.fillStyle(0x140e10, 1); g.fillRect(x - 6, by - 22, 12, 14);
  g.fillStyle(O.gilt, 1); g.fillEllipse(x, by - 14, 8, 9);
  // Rose window of skulls.
  const ry = y - h * 0.68;
  g.fillStyle(O.stoneDark, 1); g.fillCircle(x, ry, w * 0.28);
  g.fillStyle(0x6a2a34, 1); g.fillCircle(x, ry, w * 0.24);
  g.fillStyle(O.candle, 0.35); g.fillCircle(x, ry, w * 0.16);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    drawSkull(g, x + Math.cos(a) * w * 0.18, ry + Math.sin(a) * w * 0.18, 3.6, 1, { tone: O.boneShade });
  }
  drawSkull(g, x, ry, 4.5, 1);
  lancet(g, x, y, 22, 28, 0x1a1214, O.stoneDark);
  // The arcade under the eaves, stacked with skulls.
  for (let xx = L + 10; xx < Rr - 6; xx += 14) {
    g.fillStyle(0x140e10, 1); g.fillRect(xx - 5, y - h + 8, 10, 14);
    drawSkull(g, xx, y - h + 16, 3.5, 1, { tone: rng() < 0.5 ? O.bone : O.boneShade });
  }
  lilyClump(g, L + 14, y + 2, 3, rng);
  lilyClump(g, Rr - 14, y + 2, 3, rng);
}

/** A small gilt reliquary shrine on a plinth, with a glass window and a candle stand. */
export function reliquaryShrine(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 3, 90, 16);
  g.fillStyle(O.stoneDark, 1); g.fillRect(x - 30, y - 40, 60, 40);
  g.fillStyle(O.stone, 1); g.fillRect(x - 28, y - 38, 56, 36);
  g.fillStyle(O.stoneLit, 1); g.fillRect(x - 34, y - 46, 68, 8);
  g.fillStyle(dim(O.gilt, 0.4), 1); g.fillRect(x - 22, y - 86, 44, 40);
  g.fillStyle(O.gilt, 1); g.fillRect(x - 20, y - 84, 40, 36);
  g.fillStyle(dim(O.gilt, 0.35), 1); g.fillTriangle(x - 26, y - 84, x + 26, y - 84, x, y - 106);
  g.fillStyle(lit(O.gilt, 0.25), 1); g.fillTriangle(x - 22, y - 85, x + 22, y - 85, x, y - 102);
  g.fillStyle(0x221a1e, 1); g.fillRect(x - 10, y - 78, 20, 22);
  drawBone(g, x - 5, y - 64, x + 5, y - 68, 3, O.bone, 1);
  g.fillStyle(0xffffff, 0.3); g.fillRect(x - 9, y - 77, 5, 20);
  drawTithePlate(g, x, y - 20, 6);
  for (let i = 0; i < 4; i++) drawCandle(g, x - 40 + i * 6 + (i > 1 ? 68 : 0), y + 2, 8 + (i % 2) * 4, 4);
  void rng;
}

/**
 * THE OSSUARY THRONE — Prince Sinew's cathedral-keep. Two square towers capped with spires frame
 * a tall gabled nave whose whole front is set with skulls in courses, like cobbles stood on end.
 * A great lancet door; above it a red window in the shape of a ribcage. On the nave's ridge stands
 * the Rood — a giant wooden control cross, its ligament strings running down to iron rings in the
 * towers' tops — and the Empress's verdigris plate hangs over the door.
 */
export function ossuaryThrone(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 6, 620, 40);
  const tw = 110, th = 280, nw = 260, nh = 230;
  // Towers.
  for (const side of [-1, 1]) {
    const cx = x + side * (nw / 2 + tw / 2 - 10);
    g.fillStyle(dim(O.stone, 0.5), 1); g.fillRect(cx - tw / 2 - 2, y - th - 2, tw + 4, th + 4);
    g.fillStyle(dim(O.stone, 0.1), 1); g.fillRect(cx - tw / 2, y - th, tw, th);
    for (let yy = y - th + 8; yy < y; yy += 16) { g.lineStyle(1, dim(O.stone, 0.3), 1); g.lineBetween(cx - tw / 2, yy, cx + tw / 2, yy); }
    g.fillStyle(O.slate, 1); g.fillTriangle(cx - tw / 2 - 8, y - th, cx + tw / 2 + 8, y - th, cx, y - th - 150);
    g.fillStyle(lit(O.slate, 0.1), 1); g.fillTriangle(cx - tw / 2 - 8, y - th, cx, y - th, cx, y - th - 150);
    g.lineStyle(3, O.iron, 1); g.strokeCircle(cx, y - th - 150, 6);
    for (const wy of [y - th + 60, y - th + 140]) lancet(g, cx, wy, 18, 34, 0x140e10, O.stoneDark);
    drawSkull(g, cx, y - th + 180, 8, 1, { tone: O.boneShade });
  }
  // The nave front, set with skulls.
  const L = x - nw / 2;
  g.fillStyle(dim(O.stone, 0.5), 1); g.fillRect(L - 2, y - nh - 2, nw + 4, nh + 4);
  g.fillStyle(O.stoneDark, 1); g.fillRect(L, y - nh, nw, nh);
  for (let yy = y - nh + 10; yy < y - 70; yy += 16) {
    for (let xx = L + 10 + ((yy / 16) % 2) * 8; xx < L + nw - 6; xx += 17) {
      drawSkull(g, xx, yy, 5.5, 1, { tone: rng() < 0.6 ? O.bone : O.boneShade });
    }
  }
  slateRoof(g, L - 10, L + nw + 10, y - nh, y - nh - 140, x);
  // The ribcage window.
  const wy = y - nh + 80;
  g.fillStyle(0x140e10, 1); g.fillEllipse(x, wy, 120, 90);
  g.fillStyle(0x8a1e2a, 1); g.fillEllipse(x, wy, 108, 80);
  g.fillStyle(O.sinewLit, 0.4); g.fillEllipse(x, wy, 70, 50);
  g.lineStyle(5, O.bone, 1); g.lineBetween(x, wy - 40, x, wy + 40);
  for (let i = 0; i < 4; i++) {
    drawRib(g, x, wy - 28 + i * 18, -0.2 + i * 0.05, 48 - i * 4, 3.5, 0.7, O.bone, 1);
    drawRib(g, x, wy - 28 + i * 18, Math.PI + 0.2 - i * 0.05, 48 - i * 4, 3.5, -0.7, O.bone, 1);
  }
  // The great door.
  lancet(g, x, y, 70, 80, 0x1a1214, O.slate);
  g.lineStyle(2, O.iron, 1); g.lineBetween(x, y - 80, x, y);
  for (const k of [-1, 1]) for (let i = 0; i < 3; i++) g.lineBetween(x + k * 4, y - 70 + i * 26, x + k * 30, y - 70 + i * 26);
  drawTithePlate(g, x, y - 150, 14);
  // Steps.
  for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? O.stone : O.stoneLit, 1); g.fillRect(x - 70 - i * 12, y + i * 6, 140 + i * 24, 6); }
}

/**
 * The Rood on the keep's ridge (drawn as its own piece so it can stand tall): a vast wooden control
 * cross on a post, ligaments strung from its arms down to the tower spires' rings.
 */
export function roodTop(g: G, x: number, y: number): void {
  const top = y - 450;
  g.fillStyle(O.timber, 1); g.fillRect(x - 6, top, 12, 92);
  g.fillStyle(O.timberLit, 1); g.fillRect(x - 6, top, 4, 92);
  g.fillStyle(dim(O.timber, 0.3), 1); g.fillRect(x - 120, top + 30, 240, 14);
  g.fillStyle(O.timber, 1); g.fillRect(x - 118, top + 31, 236, 11);
  g.fillStyle(O.timberLit, 1); g.fillRect(x - 118, top + 31, 236, 3);
  g.fillStyle(O.gilt, 1); g.fillCircle(x, top, 6);
  for (const ex of [x - 116, x + 116]) { g.lineStyle(2, O.iron, 1); g.strokeCircle(ex, top + 44, 4); }
}

// ── Garden and yard ──────────────────────────────────────────────────

/** A cypress: a tall black flame of a tree, made of overlapping dark lobes with a lit edge. */
export function cypress(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, s * 1.4, s * 0.4);
  g.fillStyle(O.timber, 1); g.fillRect(x - 3, y - 12, 6, 12);
  const H = s * 4.2;
  for (let i = 0; i < 9; i++) {
    const k = i / 8;
    const yy = y - 10 - H * k;
    const w = s * 0.62 * Math.sin((1 - k * 0.92) * Math.PI * 0.62 + 0.25);
    g.fillStyle(i % 2 ? O.cypress : dim(O.cypress, 0.25), 1); g.fillEllipse(x + (rng() - 0.5) * 3, yy, w * 2, s * 0.9);
  }
  for (let i = 0; i < 7; i++) {
    const k = i / 7;
    g.fillStyle(O.yewLit, 0.6); g.fillEllipse(x - s * 0.18, y - 16 - H * k, s * 0.22, s * 0.5);
  }
}

/** A round clipped yew with a candle niche cut into it — the court's idea of a hedge. */
export function yewTopiary(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, s * 2.2, s * 0.6);
  g.fillStyle(dim(O.yew, 0.3), 1); g.fillCircle(x, y - s, s + 2);
  g.fillStyle(O.yew, 1); g.fillCircle(x, y - s, s);
  g.fillStyle(O.yewLit, 1); g.fillCircle(x - s * 0.35, y - s * 1.35, s * 0.45);
  g.fillStyle(0x0e140c, 1); g.fillRoundedRect(x - 7, y - s - 4, 14, 16, { tl: 7, tr: 7, bl: 0, br: 0 });
  drawCandle(g, x, y - s + 11, 7, 4);
}

/** An arch of lashed femurs carrying a climbing white rose, spanning a path. */
export function boneTrellis(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 110;
  for (const side of [-1, 1]) {
    const px = x + side * w / 2;
    drawBone(g, px, y, px, y - h, 6, O.bone, 1);
    drawBone(g, px - side * 8, y, px - side * 8, y - h + 10, 4, O.boneShade, 1);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const ax = x + Math.cos(a) * w / 2, ay = y - h + Math.sin(a) * 40;
    if (i < 8) {
      const b = Math.PI + ((i + 1) / 8) * Math.PI;
      drawBone(g, ax, ay, x + Math.cos(b) * w / 2, y - h + Math.sin(b) * 40, 4, O.bone, 1);
    }
  }
  // The rose: dark leaves and white blooms over the arch and down the legs.
  for (let i = 0; i < 30; i++) {
    const t = rng();
    let px: number, py: number;
    if (t < 0.5) { const a = Math.PI + rng() * Math.PI; px = x + Math.cos(a) * w / 2; py = y - h + Math.sin(a) * 40; }
    else { const side = rng() < 0.5 ? -1 : 1; px = x + side * w / 2; py = y - rng() * h; }
    g.fillStyle(O.stemDark, 1); g.fillCircle(px + (rng() - 0.5) * 10, py + (rng() - 0.5) * 10, 4 + rng() * 3);
    if (rng() < 0.5) { g.fillStyle(O.lily, 1); g.fillCircle(px, py, 3 + rng() * 2); g.fillStyle(O.lilyShade, 1); g.fillCircle(px + 1, py + 1, 1.5); }
  }
  drawSkull(g, x, y - h - 40, 7, 1, { tone: O.boneShade });
}

/**
 * A lamp-post with a skull for a lantern — a candle burns inside the cranium and shows through the
 * sockets. The flame itself is drawn in `animate`.
 */
export function skullLamp(g: G, x: number, y: number): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(O.iron, 1); g.fillRect(x - 2, y - 56, 4, 56); g.fillRect(x - 7, y - 3, 14, 3);
  g.lineStyle(2, O.iron, 1); g.lineBetween(x, y - 56, x + 12, y - 62); g.lineBetween(x + 12, y - 62, x + 12, y - 58);
  drawSkull(g, x + 12, y - 50, 7, 1, { eye: O.candle, eyeA: 0.9 });
}

/**
 * The stone head of a marrow well: a ring of fitted blocks with a timber windlass over it, a chain
 * and an iron-banded bucket. The jelly inside is drawn animated.
 */
export function wellHead(g: G, x: number, y: number, r: number, deep: boolean): void {
  shadow(g, x, y + 8, r * 2.8, r * 0.9);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.6;
    const tone = i % 3 === 0 ? O.stoneDark : i % 3 === 1 ? O.stone : O.stoneLit;
    g.fillStyle(dim(tone, 0.4), 1); g.fillRoundedRect(sx - 9, sy - 9, 18, 16, 3);
    g.fillStyle(tone, 1); g.fillRoundedRect(sx - 8, sy - 10, 16, 14, 3);
  }
  const lx = x - r - 6, rx = x + r + 6;
  g.fillStyle(O.timber, 1); g.fillRect(lx - 4, y - 84, 8, 80); g.fillRect(rx - 4, y - 84, 8, 80);
  g.fillStyle(O.timberLit, 1); g.fillRect(lx - 4, y - 84, 3, 80); g.fillRect(rx - 4, y - 84, 3, 80);
  if (deep) {
    // The Deep Well has a little slate roof over its windlass, and a bone-white rope.
    g.fillStyle(O.slate, 1); g.fillTriangle(lx - 16, y - 82, rx + 16, y - 82, x, y - 124);
    g.fillStyle(lit(O.slate, 0.1), 1); g.fillTriangle(lx - 16, y - 82, x, y - 82, x, y - 124);
  }
  g.fillStyle(O.timber, 1); g.fillCircle(x, y - 74, 8); g.fillRect(lx, y - 78, rx - lx, 8);
  g.lineStyle(2, O.iron, 1); g.lineBetween(rx + 4, y - 74, rx + 14, y - 64);
  g.lineStyle(1.5, deep ? O.bone : O.ironLit, 1); g.lineBetween(x - 6, y - 70, x - 6, y - 36);
  g.fillStyle(O.timberLit, 1); g.fillRect(x - 14, y - 36, 16, 13);
  g.lineStyle(1, O.iron, 1); g.strokeRect(x - 14, y - 36, 16, 13);
  g.fillStyle(O.marrow, 1); g.fillRect(x - 13, y - 35, 14, 3);
}

/**
 * The Pruned's Wall: a long low wall of white stone where families pin the names of those taken to
 * the Glasshouse — slips of paper, pressed flowers, a child's shoe, ribbons — with candle stubs all
 * along its foot. Nobody here is allowed a grave for someone who is not dead. This is the next best.
 */
export function prunedWall(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 60;
  shadow(g, x, y + 4, w * 1.1, 16);
  g.fillStyle(O.boneDark, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(0xd8d0c0, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(0xeee8dc, 1); g.fillRect(x - w / 2 - 6, y - h - 8, w + 12, 9);
  for (let i = 0; i < w / 9; i++) {
    const px = x - w / 2 + 6 + rng() * (w - 12), py = y - h + 8 + rng() * (h - 20);
    const kind = Math.floor(rng() * 4);
    if (kind === 0) { g.fillStyle(0xf8f4ea, 1); g.fillRect(px - 4, py - 3, 8, 6); g.lineStyle(0.6, 0x3a3436, 1); g.lineBetween(px - 2.5, py - 1, px + 2.5, py - 1); g.lineBetween(px - 2.5, py + 1, px + 1.5, py + 1); }
    else if (kind === 1) { g.fillStyle([0xa8343a, 0x3f9a80, 0x8a7aa8][Math.floor(rng() * 3)], 1); g.fillRect(px, py - 6, 2, 12); }
    else if (kind === 2) { g.fillStyle(O.lilyShade, 1); g.fillCircle(px, py, 2.5); g.fillStyle(O.stem, 1); g.fillRect(px - 0.5, py + 2, 1, 6); }
    else { g.fillStyle(0xc8a080, 1); g.fillCircle(px, py, 1.6); }
  }
  // A child's shoe on the coping, a ribbon tied to it.
  g.fillStyle(0x6a3a2a, 1); g.fillRoundedRect(x + 20, y - h - 14, 12, 6, 2);
  g.fillStyle(0xa8343a, 1); g.fillRect(x + 25, y - h - 16, 2, 8);
  for (let xx = x - w / 2 + 8; xx < x + w / 2; xx += 15 + rng() * 10) drawCandle(g, xx, y + 4, 4 + rng() * 6, 3.5);
}

/** A mason's lime kiln: a squat round stone tower with a fire-mouth and a white-crusted lip. */
export function limeKiln(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 120, 22);
  g.fillStyle(O.stoneDark, 1); g.fillRect(x - 44, y - 96, 88, 96);
  g.fillStyle(O.stone, 1); g.fillRect(x - 40, y - 96, 80, 96);
  for (let yy = y - 90; yy < y; yy += 14) { g.lineStyle(1, O.stoneDark, 1); g.lineBetween(x - 40, yy, x + 40, yy); }
  g.fillStyle(O.boneLit, 1); g.fillEllipse(x, y - 96, 92, 18);
  g.fillStyle(O.stoneDark, 1); g.fillEllipse(x, y - 96, 64, 10);
  g.fillStyle(0x1a1012, 1); g.fillRoundedRect(x - 16, y - 34, 32, 34, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(O.marrow, 0.9); g.fillEllipse(x, y - 8, 22, 10);
  for (let i = 0; i < 10; i++) { g.fillStyle(O.boneLit, 0.7); g.fillRect(x - 40 + jit(3, i) * 80, y - 90 + jit(4, i) * 80, 4, 2); }
}

/**
 * A half-carved statue in Ossein's yard: a block of bone-white stone with a figure emerging from
 * the top half — head and shoulders finished, the rest still block, chisel marks and a ladder.
 */
export function rawStatue(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 14);
  g.fillStyle(O.boneDark, 1); g.fillRect(x - 24, y - 60, 48, 60);
  g.fillStyle(O.boneShade, 1); g.fillRect(x - 22, y - 58, 44, 56);
  for (let i = 0; i < 12; i++) { g.lineStyle(1, O.boneDark, 0.8); const yy = y - 54 + rng() * 50; g.lineBetween(x - 20 + rng() * 30, yy, x - 14 + rng() * 30, yy + 4); }
  g.fillStyle(O.bone, 1); g.fillEllipse(x, y - 70, 40, 22); g.fillCircle(x, y - 92, 14);
  g.fillStyle(lit(O.bone, 0.4), 1); g.fillCircle(x - 4, y - 96, 6);
  g.fillStyle(O.boneDark, 1); g.fillCircle(x - 5, y - 92, 1.6); g.fillCircle(x + 5, y - 92, 1.6);
  g.lineStyle(2, O.timber, 1); g.lineBetween(x + 30, y, x + 40, y - 80); g.lineBetween(x + 42, y, x + 52, y - 80);
  for (let k = 1; k < 6; k++) g.lineBetween(x + 30 + k * 2, y - k * 15, x + 42 + k * 2, y - k * 15);
}

/** A stack of squared bone-stone blocks. */
export function blockStack(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 14);
  const rows = [[-30, 0, 3], [-15, -20, 2], [0, -40, 1]];
  for (const [ox, oy, n] of rows) {
    for (let i = 0; i < n; i++) {
      const bx = x + ox + i * 30, by = y + oy;
      g.fillStyle(O.boneDark, 1); g.fillRect(bx - 14, by - 20, 28, 20);
      g.fillStyle(O.boneShade, 1); g.fillRect(bx - 13, by - 19, 26, 18);
      g.fillStyle(O.bone, 1); g.fillRect(bx - 13, by - 19, 26, 4);
    }
  }
}

/**
 * The compost shed at the head of the Long Beds: an open-fronted timber shed with forks and rakes
 * hung up neatly, a barrow, and a tithe-ledger nailed to the post. It is the tidiest place in the court.
 */
export function compostShed(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 200, 22);
  g.fillStyle(0x1a1412, 1); g.fillRect(x - 80, y - 90, 160, 90);
  g.fillStyle(O.timber, 1); g.fillRect(x - 84, y - 92, 8, 92); g.fillRect(x + 76, y - 92, 8, 92);
  g.fillStyle(O.slate, 1); g.fillTriangle(x - 96, y - 88, x + 96, y - 88, x + 96, y - 120);
  g.fillRect(x - 96, y - 92, 192, 6);
  for (let i = 0; i < 5; i++) {
    const tx = x - 60 + i * 28;
    g.lineStyle(2, O.timberLit, 1); g.lineBetween(tx, y - 82, tx, y - 30);
    g.lineStyle(1.5, O.ironLit, 1);
    if (i % 2) { for (let k = -1; k <= 1; k++) g.lineBetween(tx + k * 3, y - 30, tx + k * 4, y - 18); }
    else g.lineBetween(tx - 8, y - 82, tx + 8, y - 82);
  }
  g.fillStyle(0xf0ead8, 1); g.fillRect(x + 64, y - 64, 10, 14);
  g.fillStyle(O.verdigris, 1); g.fillRect(x + 64, y - 66, 10, 3);
  // The barrow, loaded with dark loam and a white flower laid on top.
  g.fillStyle(O.timberLit, 1); g.fillRect(x + 90, y - 18, 40, 14);
  g.fillStyle(0x3a2a20, 1); g.fillEllipse(x + 110, y - 18, 40, 10);
  g.lineStyle(2, O.timber, 1); g.lineBetween(x + 130, y - 12, x + 150, y - 4);
  g.fillStyle(O.iron, 1); g.fillCircle(x + 92, y - 3, 5);
  drawLily(g, x + 110, y - 20, 4, 1, 0.8);
}

/**
 * The lych-gate at the court's west entrance: a roofed timber gate where the dead are rested on the
 * way in. Two posts well clear of the road and a lintel of one long bone hung with roses.
 */
export function lychGate(g: G, x: number, y0: number, y1: number): void {
  for (const y of [y0, y1]) {
    shadow(g, x, y + 2, 30, 8);
    g.fillStyle(O.timber, 1); g.fillRect(x - 6, y - 150, 12, 150);
    g.fillStyle(O.timberLit, 1); g.fillRect(x - 6, y - 150, 4, 150);
    drawSkull(g, x, y - 160, 6, 1, { tone: O.boneShade });
  }
  // The lintel: a long bone beam from post to post, roses hanging off it.
  drawBone(g, x, y0 - 148, x, y1 - 148, 7, O.bone, 1);
  for (let yy = y0 - 140; yy < y1 - 150; yy += 18) { g.fillStyle(O.stemDark, 1); g.fillCircle(x + 6, yy, 4); g.fillStyle(O.lily, 1); g.fillCircle(x + 7, yy + 3, 2.5); }
}
