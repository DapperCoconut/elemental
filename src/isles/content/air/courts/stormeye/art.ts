import type Phaser from 'phaser';
import { dim, lit, shadow } from '../../../../art/IsleArt';
import { S, drawBreathBottle, drawMeter, drawRod, jit } from './util';

/**
 * Set pieces for the Stormeye Court's world map. Each draws in world space with `x,y` at its base
 * line (the depth it sorts at). Stormeye is built to be rained on: houses of blue-grey granite
 * with roofs as steep as a ship's bow, iron storm shutters, gutters and downpipes on everything,
 * a rain barrel at every corner and a lightning rod on every ridge. The storm wall rings it all;
 * over it rises the Barometer Tower, where Prince Squall reads the weather he makes.
 */

type G = Phaser.GameObjects.Graphics;

/** A steep slate roof between `l` and `r` at `base`, rising to `peak`, with lit courses. */
function steepRoof(g: G, l: number, r: number, base: number, peak: number, cx: number, tone = S.slateDark): void {
  g.fillStyle(dim(tone, 0.45), 1); g.fillTriangle(l - 4, base + 2, r + 4, base + 2, cx, peak - 5);
  g.fillStyle(tone, 1); g.fillTriangle(l, base, r, base, cx, peak);
  g.fillStyle(lit(tone, 0.1), 1); g.fillTriangle(l, base, cx, base, cx, peak);
  for (let k = 1; k < 7; k++) {
    const t = k / 7;
    g.lineStyle(1, lit(tone, 0.18), 0.9);
    g.lineBetween(l + (cx - l) * t, base + (peak - base) * t, r - (r - cx) * t, base + (peak - base) * t);
  }
  // Copper ridge cap, streaked green.
  g.lineStyle(2, S.verdigris, 1); g.lineBetween(cx, peak, cx, peak + 2);
}

/** An iron storm shutter over a window: open (folded back to the wall) or shut and barred. */
function shutter(g: G, x: number, y: number, s: number, shut: boolean, glow: boolean): void {
  g.fillStyle(S.slateDark, 1); g.fillRect(x - s - 2, y - s - 2, s * 2 + 4, s * 2 + 4);
  if (shut) {
    g.fillStyle(0x3a4048, 1); g.fillRect(x - s, y - s, s * 2, s * 2);
    g.lineStyle(1, 0x22262c, 1);
    for (let i = 1; i < 4; i++) g.lineBetween(x - s, y - s + (i * s) / 2, x + s, y - s + (i * s) / 2);
    g.fillStyle(S.copperDark, 1); g.fillRect(x - s - 2, y - 1.5, s * 2 + 4, 3);
    if (glow) { g.fillStyle(S.lamp, 0.8); g.fillRect(x - s + 1, y - s + 1, s * 2 - 2, 1.5); }
    return;
  }
  g.fillStyle(glow ? S.lamp : 0x1a2028, 1); g.fillRect(x - s, y - s, s * 2, s * 2);
  if (glow) { g.fillStyle(S.lamp, 0.12); g.fillCircle(x, y, s * 2.4); }
  g.lineStyle(1.5, S.slateDark, 1); g.lineBetween(x, y - s, x, y + s); g.lineBetween(x - s, y, x + s, y);
  // Folded-back leaves either side.
  g.fillStyle(0x3a4048, 1); g.fillRect(x - s - 6, y - s, 4, s * 2); g.fillRect(x + s + 2, y - s, 4, s * 2);
}

/** A rain barrel with an iron hoop and water to the brim. */
export function rainBarrel(g: G, x: number, y: number, s = 10): void {
  shadow(g, x, y + 1, s * 2, s * 0.6);
  g.fillStyle(dim(S.timber, 0.4), 1); g.fillRoundedRect(x - s, y - s * 2, s * 2, s * 2, s * 0.35);
  g.fillStyle(S.timber, 1); g.fillRoundedRect(x - s + 1, y - s * 2 + 1, s * 2 - 2, s * 2 - 2, s * 0.3);
  g.fillStyle(S.slateDark, 1); g.fillRect(x - s, y - s * 1.6, s * 2, 2); g.fillRect(x - s, y - s * 0.5, s * 2, 2);
  g.fillStyle(S.water, 1); g.fillEllipse(x, y - s * 2, s * 1.8, s * 0.5);
  g.fillStyle(S.waterLit, 0.7); g.fillEllipse(x - s * 0.3, y - s * 2.05, s * 0.6, s * 0.15);
}

export interface HouseOpts { wall: number; roof?: number; glow?: boolean; shut?: boolean; torn?: boolean; oilskin?: boolean }

/**
 * A Stormeye house: coursed granite, a roof steep enough to shed a waterfall, iron shutters, a
 * gutter running the eaves into a downpipe and a barrel, a lightning rod on the ridge with its
 * strap running down the gable, and the household's brass breath-meter plate fixed by the door —
 * every home on the isle is metered. A *torn* house is one the eye was shrunk past: half its roof
 * is gone to the gale, the rafters stand bare, a shutter hangs off one hinge.
 */
export function stormHouse(g: G, x: number, y: number, w: number, h: number, o: HouseOpts, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.2, 20);
  const L = x - w / 2, R = x + w / 2;
  g.fillStyle(dim(o.wall, 0.45), 1); g.fillRect(L - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(o.wall, 1); g.fillRect(L, y - h, w, h);
  for (let yy = y - h + 3; yy < y - 2; yy += 9) {
    for (let xx = L + ((yy / 9) % 2) * 7; xx < R - 6; xx += 14 + rng() * 6) {
      g.fillStyle(rng() < 0.5 ? lit(o.wall, 0.07) : dim(o.wall, 0.1), 1); g.fillRect(xx, yy, 11 + rng() * 4, 7);
    }
  }
  // Rain-streaks down the wall.
  for (let i = 0; i < w / 14; i++) { g.fillStyle(dim(o.wall, 0.25), 0.4); g.fillRect(L + rng() * w, y - h, 2, h * (0.3 + rng() * 0.6)); }
  const roofPeak = y - h - w * 0.78;
  if (o.torn) {
    // Half a roof: the windward slope survives, the lee is bare rafters and torn slates.
    g.fillStyle(dim(S.slateDark, 0.45), 1); g.fillTriangle(L - 6, y - h + 2, x + 2, y - h + 2, x, roofPeak - 3);
    g.fillStyle(S.slateDark, 1); g.fillTriangle(L - 2, y - h, x, y - h, x, roofPeak);
    g.lineStyle(3, S.timber, 1);
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 5;
      g.lineBetween(x + (R + 6 - x) * t, y - h, x, roofPeak + (y - h - roofPeak) * t * 0.2);
    }
    g.lineBetween(x, roofPeak, R + 6, y - h);
    for (let i = 0; i < 5; i++) { g.fillStyle(S.slate, 1); g.fillRect(x + 8 + rng() * (w / 2 - 10), y - h - rng() * 30, 7, 4); }
    g.fillStyle(0x10141a, 1); g.fillRect(x + 4, y - h, w / 2 - 6, 8);
  } else {
    steepRoof(g, L - 8, R + 8, y - h, roofPeak, x, o.roof ?? S.slateDark);
    // The rod on the ridge, strapped down the gable end.
    drawRod(g, x, roofPeak + 4, 34);
    g.lineStyle(1.2, S.copperDark, 1); g.lineBetween(x + 2, roofPeak + 2, R + 4, y - h + 2);
  }
  // Gutter and downpipe into a barrel.
  g.fillStyle(S.copperDark, 1); g.fillRect(L - 8, y - h - 1, w + 16, 4);
  g.fillStyle(S.verdigris, 1); g.fillRect(L - 8, y - h - 1, w + 16, 1.5);
  g.fillStyle(S.copperDark, 1); g.fillRect(R + 4, y - h, 4, h - 18);
  rainBarrel(g, R + 6, y + 2, 9);
  // Windows.
  for (const wx of [x - w * 0.3, x + w * 0.3]) {
    const shut = o.shut || (o.torn ? wx > x : false);
    shutter(g, wx, y - h * 0.62, 9, !!shut, !!o.glow);
  }
  if (o.torn) {
    // A shutter hanging off one hinge.
    g.fillStyle(0x3a4048, 1);
    g.fillTriangle(x + w * 0.3 + 10, y - h * 0.62 - 8, x + w * 0.3 + 26, y - h * 0.62 + 6, x + w * 0.3 + 12, y - h * 0.62 + 12);
  }
  // Door and the household meter by it.
  g.fillStyle(S.slateDark, 1); g.fillRoundedRect(x - 12, y - 34, 24, 34, { tl: 4, tr: 4, bl: 0, br: 0 });
  g.fillStyle(o.torn ? 0x2a2420 : S.timber, 1); g.fillRect(x - 10, y - 32, 20, 32);
  g.lineStyle(1, dim(S.timber, 0.4), 1); g.lineBetween(x - 10, y - 20, x + 10, y - 20);
  g.fillStyle(S.copperDark, 1); g.fillRect(x - 10, y - 27, 20, 2); g.fillRect(x - 10, y - 8, 20, 2);
  drawMeter(g, x + 20, y - 26, 5, o.torn ? 0.05 : 0.3 + rng() * 0.5);
  if (o.oilskin) {
    // An oilskin coat on a peg, dripping.
    g.fillStyle(S.oilskinDark, 1); g.fillTriangle(x - 26, y - 34, x - 18, y - 34, x - 22, y - 8);
    g.fillStyle(S.oilskin, 1); g.fillRect(x - 28, y - 34, 12, 16);
    g.fillStyle(S.oilskinDark, 1); g.fillCircle(x - 22, y - 36, 4);
  }
  // Wet step.
  g.fillStyle(S.granite, 1); g.fillRect(x - 16, y, 32, 4);
  g.fillStyle(S.puddleLit, 0.4); g.fillRect(x - 12, y + 1, 18, 1);
}

// ── The keep ─────────────────────────────────────────────────────────

/**
 * THE BAROMETER TOWER — Prince Squall's keep. A tall round tower of blue granite banded with iron
 * storm galleries. Its face carries a barometer dial the size of a cartwheel — FAIR, CHANGE, RAIN,
 * STORMY — whose needle the town reads every morning for its fate; up its flank runs a glass tube
 * of mercury two storeys tall. A copper cupola caps it, ringed with lightning rods like a crown, and
 * a great weathercock stands on top (drawn turning in the area's animation). The King's brass
 * bellows-seal hangs over the door. The needle itself is animated; this piece leaves its hub bare.
 */
export function barometerTower(g: G, x: number, y: number, rng: () => number): { dialX: number; dialY: number; dialR: number; topY: number } {
  const w = 180, h = 330;
  shadow(g, x, y + 6, w * 1.9, 46);
  const L = x - w / 2;
  // Wings either side: low halls with steep roofs.
  for (const side of [-1, 1]) {
    const cx = x + side * (w / 2 + 70);
    g.fillStyle(dim(S.granite, 0.45), 1); g.fillRect(cx - 72, y - 112, 144, 112);
    g.fillStyle(S.graniteDark, 1); g.fillRect(cx - 70, y - 110, 140, 110);
    for (let yy = y - 104; yy < y; yy += 12) { g.lineStyle(1, dim(S.graniteDark, 0.25), 1); g.lineBetween(cx - 70, yy, cx + 70, yy); }
    steepRoof(g, cx - 78, cx + 78, y - 110, y - 200, cx, S.slate);
    drawRod(g, cx, y - 196, 40);
    for (const wx of [cx - 38, cx + 38]) shutter(g, wx, y - 64, 11, side < 0 ? wx < cx : wx > cx, true);
  }
  // The tower drum.
  g.fillStyle(dim(S.granite, 0.5), 1); g.fillRect(L - 3, y - h - 3, w + 6, h + 6);
  g.fillStyle(S.granite, 1); g.fillRect(L, y - h, w, h);
  // Shading for roundness: dark at both edges, a lit stripe left of centre.
  g.fillStyle(S.graniteDark, 0.8); g.fillRect(L, y - h, 22, h); g.fillRect(L + w - 26, y - h, 26, h);
  g.fillStyle(S.graniteLit, 0.5); g.fillRect(L + 44, y - h, 18, h);
  for (let yy = y - h + 8; yy < y; yy += 14) {
    g.lineStyle(1, S.graniteDark, 0.7); g.lineBetween(L, yy, L + w, yy);
    for (let xx = L + ((yy / 14) % 2) * 15; xx < L + w; xx += 30) g.lineBetween(xx, yy, xx, yy + 14);
  }
  // Iron storm galleries: a railed walkway round the drum at two heights.
  for (const gy of [y - h * 0.38, y - h * 0.84]) {
    g.fillStyle(0x1e232a, 1); g.fillRect(L - 14, gy, w + 28, 6);
    g.lineStyle(1.5, 0x2c323a, 1);
    for (let xx = L - 12; xx <= L + w + 12; xx += 8) g.lineBetween(xx, gy, xx, gy - 14);
    g.lineBetween(L - 14, gy - 14, L + w + 14, gy - 14);
  }
  // The great dial.
  const dialX = x, dialY = y - h * 0.6, dialR = 58;
  g.fillStyle(S.brassDark, 1); g.fillCircle(dialX, dialY, dialR + 8);
  g.fillStyle(S.brass, 1); g.fillCircle(dialX, dialY, dialR + 5);
  g.fillStyle(0xf0e8d0, 1); g.fillCircle(dialX, dialY, dialR);
  // Weather bands round the dial, left (STORMY) to right (VERY DRY).
  const bands = [0x5a5a8a, 0x6a88a8, 0x9aa8a8, 0xd8c890, 0xe8b860];
  for (let i = 0; i < 5; i++) {
    const a0 = Math.PI * (0.75 + i * 0.3), a1 = a0 + Math.PI * 0.3;
    g.lineStyle(10, bands[i], 1);
    g.beginPath(); g.arc(dialX, dialY, dialR - 10, a0, a1, false); g.strokePath();
  }
  for (let i = 0; i <= 30; i++) {
    const a = Math.PI * (0.75 + i * 0.05);
    g.lineStyle(i % 5 === 0 ? 2 : 1, 0x2a2420, 1);
    g.lineBetween(dialX + Math.cos(a) * (dialR - 4), dialY + Math.sin(a) * (dialR - 4), dialX + Math.cos(a) * (dialR - (i % 5 === 0 ? 18 : 12)), dialY + Math.sin(a) * (dialR - (i % 5 === 0 ? 18 : 12)));
  }
  // Little pictograms in the bands: a bolt, rain, a cloud, a sun.
  g.fillStyle(0xffffff, 0.9);
  const pic = (a: number, kind: number) => {
    const px = dialX + Math.cos(a) * (dialR - 30), py = dialY + Math.sin(a) * (dialR - 30);
    if (kind === 0) { g.fillTriangle(px - 2, py - 6, px + 3, py - 6, px - 1, py + 1); g.fillTriangle(px - 1, py - 1, px + 4, py - 1, px, py + 6); }
    else if (kind === 1) { for (let k = -1; k <= 1; k++) g.fillRect(px + k * 4, py - 4 + Math.abs(k) * 2, 1.5, 6); }
    else if (kind === 2) { g.fillCircle(px - 3, py, 3.5); g.fillCircle(px + 2, py - 1, 4.2); g.fillRect(px - 6, py, 12, 3); }
    else { g.fillStyle(0xf0c040, 1); g.fillCircle(px, py, 4); g.fillStyle(0xffffff, 0.9); }
  };
  pic(Math.PI * 0.9, 0); pic(Math.PI * 1.2, 1); pic(Math.PI * 1.5, 2); pic(Math.PI * 1.8, 3);
  g.fillStyle(0x2a2420, 1); g.fillCircle(dialX, dialY, 7);
  // The mercury column up the tower's right flank.
  const mx = L + w - 40;
  g.fillStyle(S.glassDark, 1); g.fillRoundedRect(mx - 7, y - h + 30, 14, h - 70, 7);
  g.fillStyle(S.glass, 0.6); g.fillRoundedRect(mx - 5, y - h + 32, 10, h - 74, 5);
  g.fillStyle(S.mercury, 1); g.fillRoundedRect(mx - 4, y - h * 0.48, 8, h * 0.48 - 44, 4);
  g.fillStyle(0xffffff, 0.8); g.fillRect(mx - 3, y - h * 0.48, 2, h * 0.48 - 46);
  g.fillStyle(S.glassDark, 1); g.fillCircle(mx, y - 36, 14);
  g.fillStyle(S.mercury, 1); g.fillCircle(mx, y - 36, 11);
  for (let i = 0; i < 9; i++) { g.fillStyle(0x2a2420, 1); g.fillRect(mx + 8, y - h + 50 + i * 26, 6, 1.5); }
  // The cupola: a copper bell-roof gone green, ringed with rods.
  const topY = y - h;
  g.fillStyle(dim(S.verdigris, 0.4), 1); g.fillEllipse(x, topY, w + 20, 30);
  g.fillStyle(S.verdigris, 1); g.fillTriangle(L - 6, topY, L + w + 6, topY, x, topY - 110);
  g.fillStyle(S.verdigrisLit, 0.6); g.fillTriangle(L - 6, topY, x, topY, x, topY - 110);
  for (let i = 0; i < 7; i++) { g.lineStyle(1, dim(S.verdigris, 0.3), 0.8); g.lineBetween(L - 6 + i * ((w + 12) / 6), topY, x, topY - 110); }
  g.fillStyle(S.copper, 1); g.fillEllipse(x, topY, w + 14, 12);
  for (let i = 0; i < 7; i++) drawRod(g, L + 4 + i * ((w - 8) / 6), topY + 2, 30 + (i % 2) * 12);
  // The door, its storm doors swung wide, and the King's bellows-seal above.
  g.fillStyle(S.slateDark, 1); g.fillRoundedRect(x - 30, y - 70, 60, 70, { tl: 28, tr: 28, bl: 0, br: 0 });
  g.fillStyle(0x12161c, 1); g.fillRoundedRect(x - 24, y - 64, 48, 64, { tl: 24, tr: 24, bl: 0, br: 0 });
  g.fillStyle(0x3a4048, 1); g.fillRect(x - 46, y - 62, 16, 62); g.fillRect(x + 30, y - 62, 16, 62);
  g.fillStyle(S.copperDark, 1); for (const k of [-1, 1]) for (const yy of [y - 50, y - 20]) g.fillRect(x + k * 38 - 8, yy, 16, 3);
  // The bellows-seal: a brass pair of bellows in a ring.
  const sy = y - 92;
  g.fillStyle(S.brassDark, 1); g.fillCircle(x, sy, 15);
  g.fillStyle(S.brass, 1); g.fillCircle(x, sy, 13);
  g.fillStyle(S.timber, 1); g.fillTriangle(x - 8, sy - 4, x + 8, sy - 4, x, sy + 9);
  g.fillStyle(S.brassDark, 1); g.fillRect(x - 1.5, sy + 6, 3, 6);
  g.lineStyle(1, S.brassDark, 1); for (let k = -1; k <= 1; k++) g.lineBetween(x + k * 4, sy - 4, x + k * 2, sy + 4);
  // Steps.
  for (let i = 0; i < 3; i++) { g.fillStyle(i % 2 ? S.granite : S.graniteLit, 1); g.fillRect(x - 40 - i * 10, y + i * 5, 80 + i * 20, 5); }
  void rng;
  return { dialX, dialY, dialR, topY };
}

// ── The wall ─────────────────────────────────────────────────────────

/**
 * One length of the storm wall between two points on its ring: courses of granite, a crenellated
 * walk on top, storm-spouts that throw the wall's rain outward, and — every so often — a windsock
 * mast. `h` is the wall's height; the southern arc is drawn lower so the town stays readable behind it.
 */
export function wallSegment(g: G, x1: number, y1: number, x2: number, y2: number, h: number, seed: number): void {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 18));
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const ax = x1 + (x2 - x1) * u0, ay = y1 + (y2 - y1) * u0;
    const bx = x1 + (x2 - x1) * u1, by = y1 + (y2 - y1) * u1;
    const tone = jit(seed, i) < 0.5 ? S.granite : S.graniteDark;
    g.fillStyle(dim(tone, 0.45), 1);
    g.fillPoints([
      { x: ax, y: ay + 2 }, { x: bx, y: by + 2 }, { x: bx, y: by - h - 2 }, { x: ax, y: ay - h - 2 },
    ] as Phaser.Geom.Point[], true);
    g.fillStyle(tone, 1);
    g.fillPoints([
      { x: ax, y: ay }, { x: bx, y: by }, { x: bx, y: by - h }, { x: ax, y: ay - h },
    ] as Phaser.Geom.Point[], true);
    // Courses.
    for (let k = 1; k < h / 12; k++) { g.lineStyle(1, dim(tone, 0.22), 0.8); g.lineBetween(ax, ay - k * 12, bx, by - k * 12); }
    // Merlon on alternate blocks.
    if (i % 2 === 0) {
      g.fillStyle(S.graniteLit, 1);
      g.fillPoints([
        { x: ax, y: ay - h }, { x: bx, y: by - h }, { x: bx, y: by - h - 10 }, { x: ax, y: ay - h - 10 },
      ] as Phaser.Geom.Point[], true);
    }
    // Storm-spout every few blocks, its throat dark.
    if (i % 5 === 2) {
      const mx = (ax + bx) / 2, my = (ay + by) / 2 - h * 0.7;
      g.fillStyle(S.copperDark, 1); g.fillRect(mx - 3, my - 2, 6, 5);
      g.fillStyle(0x10141a, 1); g.fillCircle(mx, my + 1, 1.6);
    }
  }
  // Top walkway edge, wet.
  g.lineStyle(2, S.puddleLit, 0.4); g.lineBetween(x1, y1 - h - 10, x2, y2 - h - 10);
}

/**
 * A gatehouse in the storm wall: two squat drum towers with conical slate caps and a vaulted
 * passage between them, its iron storm doors folded back against the walls. `along` is 'h' when
 * the road runs east-west through it, 'v' when north-south.
 */
export function gateHouse(g: G, x: number, y: number, along: 'h' | 'v'): void {
  const towers = along === 'v' ? [{ x: x - 96, y }, { x: x + 96, y }] : [{ x, y: y - 110 }, { x, y: y + 110 }];
  for (const t of towers) {
    shadow(g, t.x, t.y + 4, 90, 22);
    g.fillStyle(dim(S.granite, 0.5), 1); g.fillRect(t.x - 36, t.y - 120, 72, 120);
    g.fillStyle(S.granite, 1); g.fillRect(t.x - 34, t.y - 118, 68, 118);
    g.fillStyle(S.graniteDark, 0.7); g.fillRect(t.x - 34, t.y - 118, 12, 118); g.fillRect(t.x + 20, t.y - 118, 14, 118);
    for (let yy = t.y - 110; yy < t.y; yy += 13) { g.lineStyle(1, S.graniteDark, 0.6); g.lineBetween(t.x - 34, yy, t.x + 34, yy); }
    g.fillStyle(S.slateDark, 1); g.fillTriangle(t.x - 42, t.y - 118, t.x + 42, t.y - 118, t.x, t.y - 186);
    g.fillStyle(lit(S.slateDark, 0.12), 1); g.fillTriangle(t.x - 42, t.y - 118, t.x, t.y - 118, t.x, t.y - 186);
    drawRod(g, t.x, t.y - 182, 30);
    g.fillStyle(0x10141a, 1); g.fillRect(t.x - 4, t.y - 80, 8, 18);
    g.fillStyle(S.lamp, 0.8); g.fillRect(t.x - 2, t.y - 76, 4, 10);
  }
  // The folded storm doors.
  g.fillStyle(0x3a4048, 1);
  if (along === 'v') { g.fillRect(x - 64, y - 70, 10, 70); g.fillRect(x + 54, y - 70, 10, 70); }
  else { g.fillRect(x - 14, y - 82, 22, 8); g.fillRect(x - 14, y + 74, 22, 8); }
}

// ── Machines and works ───────────────────────────────────────────────

/**
 * A wall cistern: a great riveted tank on granite stilts against the storm wall, a funnel of
 * copper rain-catchers fanned over its mouth, a gauge-glass showing the water level, and a tipping
 * spout on a crank — the yard's rain, caught and kept. `fill` 0–1 is shown on the gauge.
 */
export function wallCistern(g: G, x: number, y: number, fill: number): void {
  shadow(g, x, y + 4, 120, 22);
  for (const sx of [x - 34, x + 34]) { g.fillStyle(S.graniteDark, 1); g.fillRect(sx - 8, y - 40, 16, 40); g.fillStyle(S.granite, 1); g.fillRect(sx - 7, y - 40, 5, 40); }
  g.fillStyle(dim(S.copper, 0.5), 1); g.fillRoundedRect(x - 50, y - 120, 100, 82, 10);
  g.fillStyle(S.copperDark, 1); g.fillRoundedRect(x - 48, y - 118, 96, 78, 9);
  g.fillStyle(S.verdigris, 0.5); g.fillRect(x - 48, y - 60, 96, 18);
  for (let i = 0; i < 4; i++) { g.fillStyle(S.copper, 1); g.fillRect(x - 48, y - 110 + i * 20, 96, 2); }
  for (let i = 0; i < 8; i++) { g.fillStyle(S.copperLit, 1); g.fillCircle(x - 44 + i * 12.5, y - 109, 1.2); }
  // The funnel of catchers.
  g.fillStyle(S.copper, 1); g.fillTriangle(x - 70, y - 150, x + 70, y - 150, x, y - 116);
  g.fillStyle(S.copperLit, 0.6); g.fillTriangle(x - 70, y - 150, x, y - 150, x, y - 116);
  g.fillStyle(S.copperDark, 1); g.fillRect(x - 72, y - 154, 144, 5);
  // Gauge-glass.
  g.fillStyle(S.glassDark, 1); g.fillRect(x + 30, y - 112, 8, 66);
  g.fillStyle(S.water, 1); g.fillRect(x + 31, y - 47 - 63 * fill, 6, 63 * fill);
  // The spout and its crank wheel.
  g.fillStyle(S.copperDark, 1); g.fillRect(x - 12, y - 46, 24, 12);
  g.fillStyle(0x10141a, 1); g.fillEllipse(x, y - 34, 18, 6);
  g.lineStyle(2, S.timber, 1); g.strokeCircle(x - 40, y - 76, 9);
  g.lineBetween(x - 49, y - 76, x - 31, y - 76); g.lineBetween(x - 40, y - 85, x - 40, y - 67);
}

/**
 * A field rod: a full-height lightning rod for the Rod Field, chained to its neighbours by a
 * sagging copper braid. Drawn as a piece so a walker can pass behind it.
 */
export function fieldRod(g: G, x: number, y: number, h: number): void {
  drawRod(g, x, y, h);
}

/**
 * The ice-house in Hailwarden Grue's yard: a squat granite dome half-sunk in the ground, a low
 * door with a leather curtain, and against it the season's hail — heaped white, and shovelled
 * into sacks stencilled with the King's bellows-seal (hail is taxed as frozen breath).
 */
export function iceHouse(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 150, 26);
  g.fillStyle(dim(S.granite, 0.5), 1); g.fillEllipse(x, y - 30, 136, 104);
  g.fillStyle(S.granite, 1); g.fillEllipse(x, y - 32, 130, 98);
  g.fillStyle(S.graniteLit, 0.6); g.fillEllipse(x - 24, y - 56, 60, 30);
  for (let i = 0; i < 4; i++) { g.lineStyle(1, S.graniteDark, 0.7); g.strokeEllipse(x, y - 32 + i * 8, 130 - i * 26, 98 - i * 24); }
  g.fillStyle(0xe4f2fa, 0.85); g.fillEllipse(x, y - 76, 70, 18);
  g.fillStyle(0x12161c, 1); g.fillRoundedRect(x - 16, y - 36, 32, 36, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(0x6a4a3a, 1); g.fillRect(x - 14, y - 30, 28, 30);
  g.lineStyle(1, 0x4a3428, 1); for (let i = 1; i < 4; i++) g.lineBetween(x - 14 + i * 7, y - 30, x - 14 + i * 7, y);
  // Hail heaped against it.
  for (let i = 0; i < 40; i++) {
    const hx = x + 50 + rng() * 50, hy = y - rng() * 22 * (1 - Math.abs(hx - x - 75) / 30);
    g.fillStyle(rng() < 0.4 ? S.hailShade : S.hail, 1); g.fillCircle(hx, hy, 2.5 + rng() * 2);
  }
  // Sacks.
  for (let i = 0; i < 3; i++) {
    const sx = x - 70 - i * 18, sy = y + 2 - (i === 1 ? 6 : 0);
    g.fillStyle(0xb8a888, 1); g.fillRoundedRect(sx - 9, sy - 20, 18, 20, 5);
    g.fillStyle(0x8a7a5a, 1); g.fillRect(sx - 4, sy - 22, 8, 4);
    g.fillStyle(S.brassDark, 1); g.fillCircle(sx, sy - 10, 3.5);
  }
}

/**
 * The Thunder Stage — Clapper Boom's yard: a gallows-frame of black timber hung with a great sheet
 * of beaten tin (the theatre's thunder-sheet, shaken to make the sound before the sky does), a
 * kettle-drum the size of a well-head under a canopy, and a tall count-board painted 1 to 9 with the
 * distance each count means — "THREE = ONE MILE, MIND".
 */
export function thunderStage(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 220, 30);
  // Gallows frame.
  g.fillStyle(0x1e1a18, 1); g.fillRect(x - 84, y - 150, 10, 150); g.fillRect(x + 4, y - 150, 10, 150);
  g.fillRect(x - 90, y - 156, 110, 10);
  g.lineStyle(4, 0x1e1a18, 1); g.lineBetween(x - 74, y - 120, x - 50, y - 148); g.lineBetween(x + 4, y - 120, x - 20, y - 148);
  // The thunder-sheet on its chains.
  g.lineStyle(1.5, 0x2c323a, 1); g.lineBetween(x - 64, y - 146, x - 64, y - 128); g.lineBetween(x - 6, y - 146, x - 6, y - 128);
  g.fillStyle(0x7a828c, 1); g.fillRect(x - 72, y - 128, 74, 96);
  g.fillStyle(0xa8b0ba, 0.7); g.fillRect(x - 72, y - 128, 74, 6);
  for (let i = 0; i < 6; i++) { g.lineStyle(1, 0x5a626c, 0.8); g.lineBetween(x - 70 + i * 12, y - 122, x - 66 + i * 12, y - 36); }
  g.fillStyle(0x2c323a, 1); g.fillRect(x - 36, y - 32, 4, 20);
  // The kettle-drum, canopied.
  const dx = x + 70;
  g.fillStyle(S.copperDark, 1); g.fillEllipse(dx, y - 30, 70, 50);
  g.fillStyle(S.copper, 1); g.fillEllipse(dx, y - 36, 66, 40);
  g.fillStyle(0xe8dcc0, 1); g.fillEllipse(dx, y - 50, 62, 20);
  g.lineStyle(1, 0x8a7a5a, 1); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(dx + Math.cos(a) * 31, y - 50 + Math.sin(a) * 10, dx + Math.cos(a) * 30, y - 20); }
  g.lineStyle(2, S.timber, 1); g.lineBetween(dx - 34, y - 50, dx - 34, y - 110); g.lineBetween(dx + 34, y - 50, dx + 34, y - 110);
  g.fillStyle(S.oilskinDark, 1); g.fillTriangle(dx - 44, y - 108, dx + 44, y - 108, dx, y - 130);
  // The count-board.
  const bx = x - 128;
  g.fillStyle(S.timber, 1); g.fillRect(bx - 4, y - 130, 8, 130);
  g.fillStyle(0xe8e0c8, 1); g.fillRect(bx - 22, y - 130, 44, 92);
  for (let i = 0; i < 9; i++) {
    g.fillStyle(i % 3 === 2 ? S.red : 0x2a2420, 1); g.fillRect(bx - 16, y - 124 + i * 10, 6 + (i % 3) * 3, 4);
    g.fillStyle(0x2a2420, 1); g.fillRect(bx + 2, y - 123 + i * 10, 12, 2);
  }
}

/**
 * THE METER OFFICE — where Stormeye pays the Breath Tax. A narrow brass-fronted house with a
 * tellers' window, a great breath-meter for a clock over the door, and outside it the racks: tier
 * on tier of corked bottles of taxed breath waiting for the King's cart to carry them up to the
 * Lung. (Their mist is animated in the area's draw.)
 */
export function meterOffice(g: G, x: number, y: number, rng: () => number): { racks: { x: number; y: number }[] } {
  const w = 170, h = 120;
  shadow(g, x, y + 4, w * 1.4, 24);
  const L = x - w / 2;
  g.fillStyle(dim(S.granite, 0.5), 1); g.fillRect(L - 2, y - h - 2, w + 4, h + 4);
  g.fillStyle(S.graniteDark, 1); g.fillRect(L, y - h, w, h);
  // The brass front.
  g.fillStyle(S.brassDark, 1); g.fillRect(L + 10, y - h + 10, w - 20, h - 10);
  g.fillStyle(S.brass, 1); g.fillRect(L + 12, y - h + 12, w - 24, h - 12);
  for (let i = 0; i < 6; i++) { g.fillStyle(S.brassLit, 0.5); g.fillRect(L + 12 + i * 25, y - h + 12, 2, h - 12); }
  // A flat roof with a parapet of little bellows-finials.
  g.fillStyle(S.slateDark, 1); g.fillRect(L - 6, y - h - 12, w + 12, 12);
  for (let i = 0; i < 7; i++) { g.fillStyle(S.brass, 1); g.fillTriangle(L + i * 28 - 4, y - h - 12, L + i * 28 + 4, y - h - 12, L + i * 28, y - h - 22); }
  drawMeter(g, x, y - h + 40, 22, 0.82);
  // Tellers' window.
  g.fillStyle(0x10141a, 1); g.fillRect(x - 54, y - 50, 40, 26);
  g.fillStyle(S.lamp, 0.6); g.fillRect(x - 52, y - 48, 36, 22);
  g.lineStyle(1, S.brassDark, 1); for (let i = 0; i < 5; i++) g.lineBetween(x - 52 + i * 9, y - 48, x - 52 + i * 9, y - 26);
  g.fillStyle(S.timber, 1); g.fillRect(x - 58, y - 24, 48, 5);
  // Door.
  g.fillStyle(0x10141a, 1); g.fillRect(x + 14, y - 46, 30, 46);
  g.fillStyle(S.timber, 1); g.fillRect(x + 16, y - 44, 26, 44);
  // The racks of bottles either side.
  const racks: { x: number; y: number }[] = [];
  for (const rx of [L - 52, L + w + 52]) {
    g.fillStyle(S.timber, 1); g.fillRect(rx - 40, y - 90, 4, 90); g.fillRect(rx + 36, y - 90, 4, 90);
    for (let r = 0; r < 4; r++) {
      const ry = y - 6 - r * 24;
      g.fillStyle(S.timberLit, 1); g.fillRect(rx - 42, ry, 84, 4);
      for (let i = 0; i < 6; i++) {
        const bx = rx - 32 + i * 13;
        drawBreathBottle(g, bx, ry, 5.5, rng() * 6);
        racks.push({ x: bx, y: ry - 5 });
      }
    }
  }
  return { racks };
}

/**
 * Brassey's storm chandlery: a deep-eaved shop with oilskins hung in a yellow row under the eaves,
 * coils of copper braid and storm lanterns on the bench outside, and a sign shaped like a lantern.
 */
export function chandlery(g: G, x: number, y: number, rng: () => number): void {
  stormHouse(g, x, y, 200, 104, { wall: 0x5c6674, glow: true }, rng);
  // Oilskins under the eaves.
  for (let i = 0; i < 5; i++) {
    const ox = x - 80 + i * 18;
    g.fillStyle(S.oilskinDark, 1); g.fillRect(ox - 1, y - 104, 2, 6);
    g.fillStyle(S.oilskin, 1); g.fillRect(ox - 6, y - 98, 12, 22);
    g.fillStyle(S.oilskinDark, 1); g.fillRect(ox - 6, y - 80, 12, 4); g.fillRect(ox - 0.5, y - 98, 1, 18);
  }
  // The bench of goods.
  const bx = x + 58;
  g.fillStyle(S.timber, 1); g.fillRect(bx - 32, y - 22, 64, 5); g.fillRect(bx - 30, y - 17, 4, 17); g.fillRect(bx + 26, y - 17, 4, 17);
  for (let i = 0; i < 3; i++) { g.lineStyle(2.5, S.copper, 1); g.strokeCircle(bx - 18 + i * 10, y - 28, 5); }
  for (let i = 0; i < 2; i++) {
    const lx = bx + 12 + i * 12;
    g.fillStyle(0x2c323a, 1); g.fillRect(lx - 4, y - 38, 8, 2); g.fillRect(lx - 4, y - 24, 8, 2);
    g.fillStyle(S.lamp, 0.85); g.fillRect(lx - 3, y - 36, 6, 12);
  }
  // Hanging sign: a lantern.
  const sx = x - 110, sy = y - 90;
  g.lineStyle(3, 0x2c323a, 1); g.lineBetween(sx + 10, sy, sx - 20, sy);
  g.fillStyle(S.oilskin, 1); g.fillRoundedRect(sx - 30, sy + 4, 22, 28, 4);
  g.fillStyle(S.lamp, 1); g.fillRect(sx - 24, sy + 10, 10, 14);
  g.lineStyle(1, 0x2c323a, 1); g.lineBetween(sx - 19, sy, sx - 19, sy + 4);
}

/**
 * The Lightning Jar, Stormeye's inn: a broad two-storey granite house with a balcony and, over its
 * door on a gibbet-arm, an enormous glass jar in a copper cage with a captured spark inside (the
 * spark is animated). It has hung there forty years; nobody remembers who caught it.
 */
export function lightningJarInn(g: G, x: number, y: number, rng: () => number): { jarX: number; jarY: number } {
  stormHouse(g, x, y, 240, 130, { wall: 0x6a6070, roof: 0x2e3440, glow: true, oilskin: true }, rng);
  // Balcony.
  g.fillStyle(S.timber, 1); g.fillRect(x - 100, y - 92, 200, 6);
  g.lineStyle(1.5, S.timberLit, 1); for (let i = 0; i <= 20; i++) g.lineBetween(x - 100 + i * 10, y - 92, x - 100 + i * 10, y - 108);
  g.lineBetween(x - 100, y - 108, x + 100, y - 108);
  // The jar.
  const ax = x - 60, ay = y - 48;
  g.lineStyle(3, 0x2c323a, 1); g.lineBetween(x - 20, ay - 40, ax, ay - 40); g.lineBetween(x - 20, ay - 24, ax + 10, ay - 40);
  g.lineStyle(1, 0x2c323a, 1); g.lineBetween(ax, ay - 40, ax, ay - 30);
  g.fillStyle(S.glassDark, 0.9); g.fillRoundedRect(ax - 13, ay - 30, 26, 34, 8);
  g.fillStyle(S.glass, 0.4); g.fillRoundedRect(ax - 11, ay - 28, 22, 30, 7);
  g.fillStyle(S.copper, 1); g.fillRect(ax - 9, ay - 34, 18, 5);
  g.lineStyle(1, S.copper, 1); for (let i = 0; i < 4; i++) g.lineBetween(ax - 12 + i * 8, ay - 30, ax - 12 + i * 8, ay + 4);
  // A board over the door.
  g.fillStyle(S.timberLit, 1); g.fillRect(x - 44, y - 128, 88, 16);
  for (let i = 0; i < 6; i++) { g.fillStyle(S.bolt, 1); g.fillTriangle(x - 36 + i * 14, y - 124, x - 30 + i * 14, y - 124, x - 34 + i * 14, y - 116); }
  return { jarX: ax, jarY: ay - 12 };
}

/**
 * A weather post: a striped mast carrying spinning anemometer cups (animated), a rain-gauge glass
 * at chest height and a little vane. Weatherwife Maud keeps three of them.
 */
export function weatherPost(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 24, 7);
  for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0xe8e0d0 : S.red, 1); g.fillRect(x - 2.5, y - 90 + i * 11, 5, 11); }
  g.fillStyle(S.glassDark, 1); g.fillRect(x + 4, y - 50, 8, 26);
  g.fillStyle(S.water, 1); g.fillRect(x + 5, y - 38, 6, 13);
  g.fillStyle(S.copper, 1); g.fillTriangle(x + 2, y - 52, x + 14, y - 52, x + 8, y - 46);
  g.fillStyle(0x2c323a, 1); g.fillCircle(x, y - 92, 3);
}

/**
 * A storm lantern on an iron post: a glass chimney inside a cage, shuttered on the windward side.
 * Its flame is drawn animated.
 */
export function stormLamp(g: G, x: number, y: number): void {
  shadow(g, x, y, 18, 6);
  g.fillStyle(0x22262c, 1); g.fillRect(x - 2, y - 58, 4, 58); g.fillRect(x - 7, y - 3, 14, 3);
  g.fillStyle(0x22262c, 1); g.fillRect(x - 8, y - 74, 16, 3); g.fillRect(x - 8, y - 60, 16, 3);
  g.fillStyle(S.glass, 0.3); g.fillRect(x - 6, y - 71, 12, 11);
  g.lineStyle(1, 0x22262c, 1); g.lineBetween(x - 6, y - 71, x - 6, y - 60); g.lineBetween(x + 6, y - 71, x + 6, y - 60);
  g.fillStyle(0x22262c, 1); g.fillTriangle(x - 9, y - 74, x + 9, y - 74, x, y - 82);
  g.fillStyle(0x3a4048, 1); g.fillRect(x - 7, y - 71, 4, 11);
}

/**
 * A windsock mast on the wall-walk: a striped red-and-white sock streaming out from a hoop (the
 * sock itself is animated, so this is only the mast and hoop).
 */
export function windsockMast(g: G, x: number, y: number): void {
  g.fillStyle(0x22262c, 1); g.fillRect(x - 1.5, y - 60, 3, 60);
  g.lineStyle(1.5, 0x22262c, 1); g.strokeCircle(x + 4, y - 58, 4);
}

/** A bench of wet timber under a little slate hood — where people sit out the lightning. */
export function stormBench(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 70, 10);
  g.fillStyle(S.timber, 1); g.fillRect(x - 30, y - 14, 60, 5); g.fillRect(x - 28, y - 9, 4, 9); g.fillRect(x + 24, y - 9, 4, 9);
  g.fillStyle(S.timberLit, 1); g.fillRect(x - 30, y - 14, 60, 1.5);
  g.fillStyle(S.timber, 1); g.fillRect(x - 32, y - 52, 4, 40); g.fillRect(x + 28, y - 52, 4, 40);
  g.fillStyle(S.slateDark, 1); g.fillTriangle(x - 40, y - 50, x + 40, y - 50, x, y - 66);
}

/**
 * Crates of empty breath-bottles waiting by the Meter Office, straw sticking out, a brass tag on
 * each — the next round's quota.
 */
export function bottleCrates(g: G, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const cx = x + (i - 1) * 26, cy = y - (i === 1 ? 4 : 0);
    shadow(g, cx, cy, 30, 8);
    g.fillStyle(dim(S.timber, 0.4), 1); g.fillRect(cx - 12, cy - 22, 24, 22);
    g.fillStyle(S.timber, 1); g.fillRect(cx - 11, cy - 21, 22, 20);
    g.fillStyle(0xd8c070, 1); for (let k = 0; k < 5; k++) g.fillRect(cx - 10 + k * 4, cy - 25, 1.5, 5);
    for (let k = 0; k < 3; k++) { g.fillStyle(S.glass, 0.7); g.fillCircle(cx - 6 + k * 6, cy - 22, 2.4); }
    g.fillStyle(S.brass, 1); g.fillRect(cx - 4, cy - 14, 8, 5);
  }
}
