import Phaser from 'phaser';
import { OBS, seam, crackPath, shard } from '../../../art/PinnacleArt';
import { lit, dim, mixC } from '../../../art/CineArt';

/**
 * The Pinnacle cinematics' own brushes: the ten isles as far silhouettes, the Muster (the ten
 * wanderers) and the Ferryman as figures, his skiff, the Shroud's storm wall, beacons, glass
 * shingle, wrecks, glass rain, sun, rays and a falling star. Screen space (960×640); every helper
 * paints immediately and takes its clock in seconds.
 */

type G = Phaser.GameObjects.Graphics;

/** A Phaser point — `fillPoints` wants them. */
export const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Fill a polygon given as flat `[dx, dy, …]` offsets from `x, y`, scaled by `s`. */
export function poly(g: G, x: number, y: number, s: number, pts: number[], color: number, a = 1): void {
  const out: Phaser.Geom.Point[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push(P(x + pts[i] * s, y + pts[i + 1] * s));
  g.fillStyle(color, a);
  g.fillPoints(out, true);
}

/** The ten isles in the order the campaign frees them: name, and the colour each one's beacon burns. */
export const ISLES: { id: string; name: string; col: number }[] = [
  { id: 'fire', name: 'Brandmark', col: 0xff6a2a },
  { id: 'water', name: 'The Drowned Reach', col: 0x3aa0ff },
  { id: 'life', name: 'Thornwild', col: 0x5fd068 },
  { id: 'air', name: 'Highspire', col: 0xbfe8ff },
  { id: 'earth', name: 'Bedrock Hold', col: 0xd8a45a },
  { id: 'electricity', name: 'Voltreach', col: 0xffe24a },
  { id: 'slime', name: 'Fangmire', col: 0x9ee04a },
  { id: 'fate', name: 'Lotterhaven', col: 0xd07aff },
  { id: 'sound', name: 'Choirholm', col: 0xff8ad0 },
  { id: 'light', name: 'Solmara', col: 0xfff0b0 },
];

/** `0xRRGGBB` → `#rrggbb` for `k.text`. */
export const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/**
 * One isle as a far silhouette, each with the shape the player knows it by: Brandmark's cone and
 * Kiln, the Reach's drowned towers, the Heartwood, Highspire's needle, the Hold's mesa, Voltreach's
 * crown of rods, Fangmire's fangs, Lotterhaven's Wheel, Choirholm's pipes, Solmara's mirror crown.
 * `x, baseY` the waterline centre, `s` scale (1 ≈ 140 px wide). `lights` 0–1 shows warm windows.
 */
export function isle(g: G, i: number, x: number, baseY: number, s: number, col: number, a = 1, lights = 0): void {
  const top = mixC(col, 0xffffff, 0.08);
  switch (i) {
    case 0:
      poly(g, x, baseY, s, [-66, 0, -34, -30, -16, -58, 14, -60, 30, -32, 70, 0], col, a);
      poly(g, x, baseY, s, [-10, -58, -10, -74, -4, -80, 6, -80, 10, -74, 10, -58], top, a);
      g.fillStyle(col, a); g.fillRect(x + 3 * s, baseY - 90 * s, 4 * s, 12 * s);
      break;
    case 1:
      poly(g, x, baseY, s, [-74, 0, -44, -12, 28, -15, 74, 0], col, a);
      for (const [dx, h] of [[-34, 38], [-14, 24], [14, 46], [40, 28]]) {
        g.fillStyle(col, a); g.fillRect(x + (dx - 5) * s, baseY - h * s, 10 * s, h * s);
        poly(g, x + dx * s, baseY - h * s, s, [-7, 0, 0, -12, 7, 0], top, a);
      }
      break;
    case 2:
      poly(g, x, baseY, s, [-70, 0, -30, -18, 30, -20, 70, 0], col, a);
      g.fillStyle(col, a); g.fillRect(x - 6 * s, baseY - 46 * s, 12 * s, 30 * s);
      g.fillStyle(top, a);
      g.fillEllipse(x, baseY - 60 * s, 84 * s, 46 * s);
      g.fillEllipse(x - 30 * s, baseY - 46 * s, 46 * s, 28 * s);
      g.fillEllipse(x + 32 * s, baseY - 48 * s, 48 * s, 30 * s);
      break;
    case 3:
      poly(g, x, baseY, s, [-40, 0, -14, -34, -8, -96, 0, -112, 7, -94, 14, -36, 42, 0], col, a);
      g.lineStyle(Math.max(1, 1.6 * s), top, a);
      g.lineBetween(x - 10 * s, baseY - 120 * s, x + 10 * s, baseY - 104 * s);
      g.lineBetween(x + 10 * s, baseY - 120 * s, x - 10 * s, baseY - 104 * s);
      break;
    case 4:
      poly(g, x, baseY, s, [-78, 0, -62, -42, 60, -46, 76, 0], col, a);
      g.lineStyle(Math.max(1, s), top, 0.5 * a);
      for (let b = 1; b < 4; b++) g.lineBetween(x - (70 - b * 3) * s, baseY - b * 11 * s, x + (68 - b * 3) * s, baseY - b * 11 * s);
      break;
    case 5:
      poly(g, x, baseY, s, [-66, 0, -46, -36, -32, -22, -16, -54, 0, -30, 14, -60, 30, -26, 46, -40, 66, 0], col, a);
      g.lineStyle(Math.max(1, s), top, a);
      for (const [dx, h] of [[-46, 36], [-16, 54], [14, 60], [46, 40]]) g.lineBetween(x + dx * s, baseY - h * s, x + dx * s, baseY - (h + 16) * s);
      break;
    case 6:
      poly(g, x, baseY, s, [-76, 0, -40, -10, 40, -12, 76, 0], col, a);
      for (const [dx, h, l] of [[-46, 44, -6], [-20, 62, 4], [8, 52, -4], [36, 40, 6], [56, 26, 4]]) {
        poly(g, x + dx * s, baseY, s, [-6, 0, l, -h, 6, 0], top, a);
      }
      g.fillStyle(col, a);
      g.fillEllipse(x - 34 * s, baseY - 16 * s, 34 * s, 16 * s); g.fillEllipse(x + 24 * s, baseY - 18 * s, 40 * s, 18 * s);
      break;
    case 7:
      poly(g, x, baseY, s, [-74, 0, -74, -10, -54, -10, -54, -22, -32, -22, -32, -36, 32, -36, 32, -22, 54, -22, 54, -10, 74, -10, 74, 0], col, a);
      g.fillStyle(col, a); g.fillRect(x - 16 * s, baseY - 50 * s, 32 * s, 14 * s);
      g.lineStyle(Math.max(1, 1.6 * s), top, a);
      g.strokeCircle(x, baseY - 64 * s, 13 * s);
      for (let sp = 0; sp < 4; sp++) {
        const an = sp * Math.PI / 4;
        g.lineBetween(x + Math.cos(an) * 13 * s, baseY - 64 * s + Math.sin(an) * 13 * s, x - Math.cos(an) * 13 * s, baseY - 64 * s - Math.sin(an) * 13 * s);
      }
      break;
    case 8:
      poly(g, x, baseY, s, [-60, 0, -14, -84, 14, -86, 62, 0], col, a);
      poly(g, x, baseY, s, [-24, -66, -14, -84, 14, -86, 26, -64, 10, -70, 0, -62, -10, -70], lit(col, 0.5), a);
      g.fillStyle(top, a);
      for (let p = -2; p <= 2; p++) g.fillRect(x + (p * 5 - 1.5) * s, baseY - (98 + (2 - Math.abs(p)) * 6) * s, 3 * s, (16 + (2 - Math.abs(p)) * 6) * s);
      break;
    default:
      poly(g, x, baseY, s, [-76, 0, -60, -14, -40, -14, -36, -28, -18, -28, -14, -40, 14, -40, 18, -28, 36, -28, 40, -14, 60, -14, 76, 0], col, a);
      g.fillStyle(top, a);
      g.fillEllipse(x, baseY - 46 * s, 22 * s, 14 * s);
      for (let m = 0; m < 7; m++) {
        const an = Math.PI + (m / 6) * Math.PI;
        const mx = x + Math.cos(an) * 20 * s, my = baseY - 52 * s + Math.sin(an) * 14 * s;
        g.fillRect(mx - 2.5 * s, my - 4 * s, 5 * s, 8 * s);
      }
  }
  if (lights > 0) {
    for (let j = 0; j < 7; j++) {
      const wx = x + Math.sin(i * 7.1 + j * 3.3) * 44 * s;
      const wy = baseY - (3 + ((j * 5 + i) % 7) * 3) * s;
      const on = Phaser.Math.Clamp(lights * 7 - j, 0, 1);
      g.fillStyle(0xffc070, 0.25 * on * a); g.fillCircle(wx, wy, 3.6 * s);
      g.fillStyle(0xffe0a0, on * a); g.fillCircle(wx, wy, Math.max(0.8, 1.1 * s));
    }
  }
}

/**
 * A beacon fire on a far headland: halo, a flickering tongue of flame, and — once well alight — a
 * pillar of light leaning toward `lean` (px over its height). `a` 0–1 is how lit it is.
 */
export function beacon(g: G, x: number, y: number, col: number, a: number, t: number, s = 1, lean = 0): void {
  if (a <= 0.01) return;
  const pillar = Phaser.Math.Clamp(a * 1.4 - 0.4, 0, 1);
  if (pillar > 0) {
    const len = 260 * s * pillar;
    g.fillStyle(col, 0.07 * pillar); g.fillTriangle(x - 9 * s, y, x + 9 * s, y, x + lean * pillar, y - len);
    g.fillStyle(lit(col, 0.5), 0.14 * pillar); g.fillTriangle(x - 3 * s, y, x + 3 * s, y, x + lean * pillar, y - len * 0.9);
  }
  for (let i = 3; i >= 1; i--) { g.fillStyle(col, 0.08 * a); g.fillCircle(x, y - 4 * s, (8 + i * 9) * s * a); }
  const fl = Math.sin(t * 13 + x) * 2 * s;
  g.fillStyle(col, a); g.fillTriangle(x - 5 * s, y, x + 5 * s, y, x + fl, y - 16 * s * a);
  g.fillStyle(lit(col, 0.6), a); g.fillTriangle(x - 2.5 * s, y, x + 2.5 * s, y, x + fl * 0.6, y - 9 * s * a);
  g.fillStyle(0xffffff, a); g.fillCircle(x, y - 2 * s, 1.6 * s);
}

/** The ten wanderers' looks: coat, trim (and the thing they carry is drawn in `wanderer`). */
export const MUSTER: { name: string; body: number; trim: number; skin: number }[] = [
  { name: 'Tamsin Coalwhistle', body: 0xb4532a, trim: 0xffb04a, skin: 0xe8b48c },
  { name: 'Odo Fathomsby', body: 0x46627e, trim: 0xd2a64a, skin: 0xd09a74 },
  { name: 'Wendeline Burrows', body: 0xe4d6a8, trim: 0x6fbf5a, skin: 0xf0c8a0 },
  { name: 'Barnaby Tuft', body: 0x6f9cc0, trim: 0xe85a4a, skin: 0xf0c4a0 },
  { name: 'Gideon Flint', body: 0x7e6044, trim: 0xb8b0a0, skin: 0xb07c58 },
  { name: 'Wren Filament', body: 0x34456a, trim: 0xffe24a, skin: 0xe8bc98 },
  { name: 'Tansy Rue', body: 0x46663a, trim: 0x9ee04a, skin: 0xd8a882 },
  { name: 'Marlo Fairshake', body: 0x5a2a6a, trim: 0xe8c04a, skin: 0xc48c66 },
  { name: 'Lark Halloway', body: 0xb0487a, trim: 0xffd0e8, skin: 0x8c5a3c },
  { name: 'Sable Merrow', body: 0x1e2a44, trim: 0xe8c040, skin: 0xe8c0a0 },
];

/**
 * One of the Muster standing: `i` 0–9 in isle order, `x, y` the feet, `s` scale (1 ≈ 46 px tall).
 * Each carries what the player knows them by — Tamsin's pans, Odo's helmet, Wendeline's veil and
 * bees, Barnaby's balloon, Gideon's pick, Wren's lamp-pole, Tansy's phial and Pestle, Marlo's card
 * and Tuppence, Lark's drum and Patter, Sable's lantern and Nocturne. `wave` 0–1 raises the front
 * hand; `hop` lifts them (px at s = 1).
 */
export function wanderer(g: G, i: number, x: number, y: number, s: number, t: number, o: { face?: number; alpha?: number; wave?: number; hop?: number } = {}): void {
  const m = MUSTER[i % 10];
  const a = o.alpha ?? 1;
  const f = o.face ?? 1;
  const yy = y - (o.hop ?? 0) * s;
  const bob = Math.sin(t * 2.2 + i * 1.3) * 0.7 * s;
  const big = i === 4 ? 1.25 : 1;
  const top = yy - 27 * s + bob;
  const hx = x, hy = top - 6 * s;
  const cw = 6 * s * big, hw = 9.5 * s * big;
  g.fillStyle(0x000000, 0.28 * a); g.fillEllipse(x, y + s, 24 * s * big, 5 * s);
  if (i === 0) {
    // Tamsin's pack: a frame on her back hung with clattering pans.
    const px = x - f * 9 * s;
    g.fillStyle(0x6a4a2a, a); g.fillRect(px - 5 * s, top - 2 * s, 10 * s, 18 * s);
    g.lineStyle(1.4 * s, 0x9a9a9a, a);
    for (let p = 0; p < 3; p++) {
      const sw = Math.sin(t * 6 + p * 2) * 1.5 * s;
      const cx = px - f * 4 * s + sw, cy = top + 3 * s + p * 6 * s;
      g.fillStyle(0x8a8a90, a); g.fillCircle(cx, cy, 3 * s);
      g.lineBetween(cx, cy, cx - f * 5 * s, cy - 2 * s);
    }
  }
  // Legs and boots.
  g.fillStyle(dim(m.body, 0.5), a);
  g.fillRect(x - 5 * s, yy - 9 * s, 3.6 * s, 9 * s); g.fillRect(x + 1.4 * s, yy - 9 * s, 3.6 * s, 9 * s);
  g.fillStyle(0x1a1410, a);
  g.fillEllipse(x - 3.2 * s + f * s, yy, 6 * s, 3 * s); g.fillEllipse(x + 3.2 * s + f * s, yy, 6 * s, 3 * s);
  // The coat, its shadowed half, the trim.
  g.fillStyle(m.body, a);
  g.fillPoints([P(x - cw, top), P(x + cw, top), P(x + hw, yy - 7 * s), P(x - hw, yy - 7 * s)], true);
  g.fillStyle(dim(m.body, 0.3), a);
  g.fillPoints([P(x - f * cw, top), P(x - f * cw * 0.2, top), P(x - f * hw * 0.25, yy - 7 * s), P(x - f * hw, yy - 7 * s)], true);
  g.fillStyle(m.trim, a);
  g.fillRect(x - hw * 0.8, yy - 16 * s + bob * 0.5, hw * 1.6, 2.2 * s);
  g.fillRect(x - cw, top, cw * 2, 2 * s);
  // Arms.
  const wave = o.wave ?? 0;
  const back = { x: x - f * (cw + 3 * s), y: yy - 13 * s };
  const front = wave > 0
    ? { x: x + f * (cw + 6 * s), y: mix(yy - 13 * s, top - 9 * s - Math.sin(t * 9 + i) * 3 * s, wave) }
    : { x: x + f * (cw + 3 * s), y: yy - 13 * s };
  g.lineStyle(3.4 * s, dim(m.body, 0.15), a);
  g.lineBetween(x - f * cw, top + 3 * s, back.x, back.y);
  g.lineBetween(x + f * cw, top + 3 * s, front.x, front.y);
  g.fillStyle(m.skin, a); g.fillCircle(back.x, back.y, 1.9 * s); g.fillCircle(front.x, front.y, 1.9 * s);
  // The head — Odo's is a brass helmet.
  if (i === 1) {
    g.fillStyle(dim(m.trim, 0.3), a); g.fillCircle(hx, hy, 9 * s);
    g.fillStyle(m.trim, a); g.fillCircle(hx - 0.6 * s, hy - 0.6 * s, 8.2 * s);
    g.fillStyle(lit(m.trim, 0.5), 0.8 * a); g.fillCircle(hx - 3 * s, hy - 4 * s, 2.4 * s);
    g.fillStyle(0x2a5a5a, a); g.fillCircle(hx + f * 2 * s, hy + 0.5 * s, 4.4 * s);
    g.fillStyle(m.skin, 0.6 * a); g.fillCircle(hx + f * 2 * s, hy + 0.5 * s, 3 * s);
    g.fillStyle(0x10141a, a); g.fillCircle(hx + f * 1 * s, hy, 0.8 * s); g.fillCircle(hx + f * 3.2 * s, hy, 0.8 * s);
    g.fillStyle(0xffffff, 0.6 * a); g.fillCircle(hx + f * 0.6 * s, hy - 1.6 * s, 1 * s);
    g.fillStyle(dim(m.trim, 0.4), a);
    for (let b = 0; b < 4; b++) g.fillCircle(hx + Math.cos(b * 1.57 + 0.78) * 7 * s, hy + Math.sin(b * 1.57 + 0.78) * 7 * s, 0.9 * s);
  } else {
    g.fillStyle(m.skin, a); g.fillCircle(hx, hy, 6.2 * s);
    g.fillStyle(dim(m.skin, 0.25), a); g.fillCircle(hx - f * 2 * s, hy + 1 * s, 4.6 * s);
    g.fillStyle(m.skin, a); g.fillCircle(hx + f * 0.8 * s, hy - 0.4 * s, 5.4 * s);
    g.fillStyle(0x1a1018, a); g.fillCircle(hx + f * 1.4 * s, hy - 0.6 * s, 0.9 * s); g.fillCircle(hx + f * 3.8 * s, hy - 0.6 * s, 0.9 * s);
  }
  const fx = front.x, fy = front.y;
  switch (i) {
    case 0:
      // Goggles pushed up on a sooty brow.
      g.fillStyle(0x2a2220, a); g.fillEllipse(hx, hy - 5 * s, 13 * s, 5 * s);
      g.fillStyle(m.trim, a); g.fillCircle(hx - 2 * s + f * s, hy - 5 * s, 2 * s); g.fillCircle(hx + 2.4 * s + f * s, hy - 5 * s, 2 * s);
      break;
    case 2: {
      // Wide-brim veil hat, and her bees.
      g.fillStyle(m.body, a); g.fillEllipse(hx, hy - 4 * s, 24 * s, 5 * s); g.fillEllipse(hx, hy - 7 * s, 11 * s, 7 * s);
      g.fillStyle(0xffffff, 0.3 * a); g.fillRect(hx - 9 * s, hy - 4 * s, 18 * s, 10 * s);
      for (let b = 0; b < 3; b++) {
        const an = t * (2.4 + b * 0.5) + b * 2.1;
        const bx = hx + Math.cos(an) * (14 + b * 3) * s, by = hy - 4 * s + Math.sin(an * 1.3) * 8 * s;
        g.fillStyle(0xffd23a, a); g.fillEllipse(bx, by, 3 * s, 2.2 * s);
        g.fillStyle(0xffffff, 0.6 * a); g.fillCircle(bx, by - 1.2 * s, 1 * s);
      }
      break;
    }
    case 3: {
      // Aviator cap and a little balloon of his own on a string.
      g.fillStyle(0x6a4a2a, a); g.fillEllipse(hx, hy - 3 * s, 13 * s, 8 * s);
      const bx = fx + f * 6 * s + Math.sin(t * 1.3) * 3 * s, by = fy - 34 * s;
      g.lineStyle(0.8 * s, 0xe8e0d0, a); g.lineBetween(fx, fy, bx, by + 9 * s);
      g.fillStyle(m.trim, a); g.fillEllipse(bx, by, 14 * s, 17 * s);
      g.fillStyle(0xffffff, a); g.fillEllipse(bx, by, 5 * s, 17 * s);
      g.fillStyle(0x6a4a2a, a); g.fillRect(bx - 2.5 * s, by + 9 * s, 5 * s, 3.5 * s);
      break;
    }
    case 4: {
      // A quarry pick over the shoulder; a short grey beard.
      g.fillStyle(0xb8b0a0, a); g.fillTriangle(hx - 4 * s, hy + 2 * s, hx + 4 * s + f * 2 * s, hy + 2 * s, hx + f * 1 * s, hy + 8 * s);
      const h0x = x - f * 6 * s, h0y = top + 14 * s, h1x = x + f * 6 * s, h1y = top - 16 * s;
      g.lineStyle(2 * s, 0x6a4a2a, a); g.lineBetween(h0x, h0y, h1x, h1y);
      g.lineStyle(2.6 * s, 0x9a9aa4, a); g.lineBetween(h1x - f * 9 * s, h1y - 3 * s, h1x + f * 8 * s, h1y + 5 * s);
      break;
    }
    case 5: {
      // The lamplighter's pole, a live spark at its hook.
      const tx = fx + f * 6 * s, ty = fy - 40 * s;
      g.lineStyle(1.4 * s, 0x8a7a5a, a); g.lineBetween(fx, fy + 6 * s, tx, ty);
      g.lineBetween(tx, ty, tx + f * 4 * s, ty + 3 * s);
      const fl = 0.6 + 0.4 * Math.sin(t * 17);
      g.fillStyle(m.trim, 0.22 * fl * a); g.fillCircle(tx, ty, 8 * s);
      g.fillStyle(0xffffff, a); g.fillCircle(tx, ty, 1.6 * s);
      g.fillStyle(0x2a2a3a, a); g.fillRect(hx - 6 * s, hy - 7 * s, 12 * s, 3 * s);
      break;
    }
    case 6: {
      // A green phial in hand; Pestle the mongoose at her heel.
      g.fillStyle(m.trim, 0.25 * a); g.fillCircle(fx, fy - 3 * s, 5 * s);
      g.fillStyle(m.trim, a); g.fillRect(fx - 1.6 * s, fy - 6 * s, 3.2 * s, 5 * s);
      const mx = x - f * 15 * s, my = y - 3 * s + Math.abs(Math.sin(t * 4)) * -1.5 * s;
      g.fillStyle(0x8a6a4a, a); g.fillEllipse(mx, my, 12 * s, 5 * s); g.fillCircle(mx + f * 6 * s, my - 2 * s, 2.8 * s);
      g.lineStyle(2 * s, 0x8a6a4a, a); g.lineBetween(mx - f * 5 * s, my, mx - f * 11 * s, my - 4 * s + Math.sin(t * 5) * 2 * s);
      break;
    }
    case 7: {
      // Top hat, a card between two fingers, Tuppence the magpie on his shoulder.
      g.fillStyle(0x1a1420, a); g.fillRect(hx - 7 * s, hy - 6 * s, 14 * s, 2 * s); g.fillRect(hx - 4.5 * s, hy - 15 * s, 9 * s, 10 * s);
      g.fillStyle(m.trim, a); g.fillRect(hx - 4.5 * s, hy - 8 * s, 9 * s, 1.6 * s);
      g.fillStyle(0xffffff, a); g.fillRect(fx - 2 * s, fy - 7 * s, 4.4 * s, 6 * s);
      g.fillStyle(0xd02a3a, a); g.fillCircle(fx + 0.2 * s, fy - 4 * s, 1 * s);
      const bx = x - f * 6 * s, by = top - 3 * s;
      g.fillStyle(0x14121a, a); g.fillEllipse(bx, by, 8 * s, 5 * s); g.fillCircle(bx + f * 3.5 * s, by - 2.5 * s, 2.4 * s);
      g.fillStyle(0xffffff, a); g.fillEllipse(bx, by + 1 * s, 4 * s, 2.4 * s);
      g.lineStyle(1.4 * s, 0x1c2a4a, a); g.lineBetween(bx - f * 3 * s, by, bx - f * 9 * s, by + 3 * s);
      break;
    }
    case 8: {
      // A flat cap with Patter the mynah on it, and a drum on the hip.
      g.fillStyle(dim(m.body, 0.4), a); g.fillEllipse(hx + f * 1.5 * s, hy - 4.5 * s, 15 * s, 5 * s);
      const by = hy - 9 * s + Math.sin(t * 3) * 0.6 * s;
      g.fillStyle(0x14121a, a); g.fillEllipse(hx, by, 7 * s, 5 * s); g.fillCircle(hx + f * 3 * s, by - 2 * s, 2.2 * s);
      g.fillStyle(0xffc020, a); g.fillTriangle(hx + f * 4.6 * s, by - 2.6 * s, hx + f * 7 * s, by - 1.8 * s, hx + f * 4.6 * s, by - 1 * s);
      g.fillStyle(m.trim, a); g.fillEllipse(x + f * 8 * s, yy - 12 * s, 9 * s, 4 * s);
      g.fillStyle(m.body, a); g.fillRect(x + f * 8 * s - 4.5 * s, yy - 12 * s, 9 * s, 6 * s);
      g.fillStyle(m.trim, a); g.fillEllipse(x + f * 8 * s, yy - 6 * s, 9 * s, 3 * s);
      break;
    }
    case 9: {
      // A sou'wester, her lantern held out, Nocturne the moth circling it.
      g.fillStyle(m.trim, a); g.fillEllipse(hx - f * 1 * s, hy - 4 * s, 16 * s, 6 * s); g.fillEllipse(hx, hy - 6 * s, 11 * s, 6 * s);
      const lx = fx + f * 2 * s, ly = fy + 4 * s;
      g.fillStyle(0xffd080, 0.18 * a); g.fillCircle(lx, ly, 12 * s);
      g.fillStyle(0x2a2a2a, a); g.fillRect(lx - 3 * s, ly - 5 * s, 6 * s, 1.4 * s); g.fillRect(lx - 3 * s, ly + 3.6 * s, 6 * s, 1.4 * s);
      g.fillStyle(0xffe0a0, a); g.fillRect(lx - 2.4 * s, ly - 3.6 * s, 4.8 * s, 7.2 * s);
      const an = t * 5;
      const mx = lx + Math.cos(an) * 9 * s, my = ly - 4 * s + Math.sin(an * 1.7) * 6 * s;
      const flap = 0.5 + 0.5 * Math.abs(Math.sin(t * 22));
      g.fillStyle(0xe8e4f0, 0.9 * a); g.fillEllipse(mx - 1.6 * s, my, 3.4 * s * flap, 2.4 * s); g.fillEllipse(mx + 1.6 * s, my, 3.4 * s * flap, 2.4 * s);
      break;
    }
    default:
      break;
  }
}

/** Linear blend (kept local so the figure code reads cleanly). */
function mix(a: number, b: number, t: number): number { return a + (b - a) * t; }

/**
 * The Ferryman: a tall hooded shape, a white beard out of the dark of the hood, two lamp-lit glints
 * for eyes, a lantern on a crook-pole. `x, y` the hem (or the thwart, seated); `s` scale (1 ≈ 64 px
 * tall); `lamp` 0–1 lights the lantern; `row` -1–1 sweeps an oar instead of holding the pole.
 */
export function ferryman(g: G, x: number, y: number, s: number, t: number, o: { face?: number; lamp?: number; row?: number; alpha?: number } = {}): void {
  const f = o.face ?? 1;
  const a = o.alpha ?? 1;
  const lamp = o.lamp ?? 1;
  const cloak = 0x2a2430, cloakLit = 0x463c4e;
  const breath = Math.sin(t * 1.6) * 0.6 * s;
  const X = (dx: number) => x + dx * f * s;
  const Y = (dy: number) => y + dy * s + (dy < -20 ? breath : 0);
  g.fillStyle(0x000000, 0.3 * a); g.fillEllipse(x, y + 2 * s, 40 * s, 7 * s);
  // Cloak, lit side toward the lantern.
  g.fillStyle(cloak, a);
  g.fillPoints([P(X(-16), Y(0)), P(X(-14), Y(-30)), P(X(-12), Y(-46)), P(X(-6), Y(-60)), P(X(2), Y(-64)), P(X(10), Y(-58)), P(X(14), Y(-44)), P(X(15), Y(-28)), P(X(18), Y(0))], true);
  g.fillStyle(cloakLit, a);
  g.fillPoints([P(X(4), Y(-62)), P(X(10), Y(-58)), P(X(14), Y(-44)), P(X(15), Y(-28)), P(X(18), Y(0)), P(X(8), Y(0)), P(X(9), Y(-30))], true);
  g.lineStyle(1 * s, lit(cloakLit, 0.25), 0.6 * a);
  g.lineBetween(X(10), Y(-58), X(14), Y(-44)); g.lineBetween(X(14), Y(-44), X(15), Y(-28));
  // Folds.
  g.lineStyle(1.2 * s, 0x16121a, 0.8 * a);
  g.lineBetween(X(-6), Y(-26), X(-9), Y(-2)); g.lineBetween(X(2), Y(-24), X(1), Y(-1));
  // The dark of the hood, the beard falling out of it, the glints.
  g.fillStyle(0x07060a, a); g.fillEllipse(X(4), Y(-46), 13 * s, 15 * s);
  g.fillStyle(0xd8d4cc, a);
  g.fillPoints([P(X(-1), Y(-42)), P(X(9), Y(-42)), P(X(10), Y(-30)), P(X(6), Y(-18)), P(X(3), Y(-22)), P(X(-1), Y(-30))], true);
  g.lineStyle(0.8 * s, 0x9a948c, a);
  g.lineBetween(X(3), Y(-40), X(4), Y(-24)); g.lineBetween(X(7), Y(-40), X(7), Y(-26));
  g.fillStyle(0xd09a7a, 0.7 * a * (0.4 + 0.6 * lamp)); g.fillCircle(X(7), Y(-45), 1.6 * s);
  const blink = Math.sin(t * 0.9) > 0.97 ? 0.1 : 1;
  g.fillStyle(0xffc070, (0.3 + 0.7 * lamp) * a * blink);
  g.fillCircle(X(3), Y(-48), 0.9 * s); g.fillCircle(X(8), Y(-48), 0.9 * s);
  if (o.row !== undefined) {
    // Rowing: both hands on an oar that sweeps down into the water behind.
    const sw = o.row;
    const hx = X(12), hy = Y(-28);
    g.lineStyle(2.4 * s, 0x6a5038, a); g.lineBetween(hx + sw * 6 * s * f, hy, X(-30 - sw * 12), Y(14));
    g.fillStyle(0x6a5038, a); g.fillEllipse(X(-32 - sw * 12), Y(16), 10 * s, 4 * s);
    g.fillStyle(0xd09a7a, a); g.fillCircle(hx + sw * 6 * s * f, hy, 2.4 * s);
    return;
  }
  // The crook-pole and its lantern, swinging a little.
  const hx = X(16), hy = Y(-30);
  const tx = X(26), ty = Y(-74);
  g.lineStyle(2 * s, 0x5a4430, a); g.lineBetween(hx, hy + 30 * s, tx, ty);
  g.lineBetween(tx, ty, tx + 6 * s * f, ty + 3 * s);
  g.fillStyle(0xd09a7a, a); g.fillCircle(hx, hy, 2.4 * s);
  lantern(g, tx + 6 * s * f + Math.sin(t * 1.8) * 2 * s, ty + 12 * s, s, t, lamp * a);
}

/** A hanging lantern — iron cage, warm flame, a halo that breathes. `x, y` its centre. */
export function lantern(g: G, x: number, y: number, s: number, t: number, a: number): void {
  const fl = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3);
  for (let i = 3; i >= 1; i--) { g.fillStyle(0xffb050, 0.06 * a * fl); g.fillCircle(x, y, (10 + i * 10) * s); }
  g.lineStyle(1 * s, 0x2a2420, 1); g.lineBetween(x, y - 10 * s, x, y - 6 * s);
  g.fillStyle(0x2a2420, 1); g.fillTriangle(x - 5 * s, y - 6 * s, x + 5 * s, y - 6 * s, x, y - 10 * s); g.fillRect(x - 4.5 * s, y + 5 * s, 9 * s, 2 * s);
  g.fillStyle(0xffd890, 0.55 + 0.45 * a); g.fillRect(x - 3.6 * s, y - 6 * s, 7.2 * s, 11 * s);
  g.fillStyle(0xffffff, a * fl); g.fillEllipse(x, y + 0.5 * s, 2.4 * s, 4.4 * s);
  g.lineStyle(0.9 * s, 0x2a2420, 1); g.lineBetween(x, y - 6 * s, x, y + 5 * s);
}

/**
 * The Ferryman's skiff, side-on: a long low hull with an upswept bow carrying a lantern post.
 * `x, y` the waterline amidships; `s` scale (1 ≈ 120 px long); `face` ±1 (the bow); it rocks.
 * Draw who sits in it first, then the hull over their legs.
 */
export function skiff(g: G, x: number, y: number, s: number, t: number, face = 1, lamp = 1): void {
  const rock = Math.sin(t * 1.4 + x * 0.01) * 0.04;
  const pt = (dx: number, dy: number) => P(x + (dx * Math.cos(rock) - dy * Math.sin(rock)) * s * face, y + (dx * Math.sin(rock) + dy * Math.cos(rock)) * s);
  g.fillStyle(0xffffff, 0.12); g.fillEllipse(x, y + 4 * s, 140 * s, 7 * s);
  g.fillStyle(0x2a1e18, 1);
  g.fillPoints([pt(-56, -14), pt(44, -14), pt(62, -30), pt(58, -10), pt(44, 6), pt(-44, 6), pt(-58, -6)], true);
  g.fillStyle(0x4a3628, 1);
  g.fillPoints([pt(-56, -14), pt(44, -14), pt(62, -30), pt(60, -24), pt(44, -10), pt(-55, -10)], true);
  g.lineStyle(1 * s, 0x1a120e, 0.9);
  const a0 = pt(-50, -4), a1 = pt(48, -4); g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  const b0 = pt(-46, 1), b1 = pt(42, 1); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  g.lineStyle(1.2 * s, 0x8a6a4a, 0.8);
  const r0 = pt(-56, -14), r1 = pt(44, -14), r2 = pt(62, -30);
  g.lineBetween(r0.x, r0.y, r1.x, r1.y); g.lineBetween(r1.x, r1.y, r2.x, r2.y);
  // The bow post and its lamp.
  const p0 = pt(58, -26), p1 = pt(64, -54);
  g.lineStyle(2 * s, 0x3a2a20, 1); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  lantern(g, p1.x + 5 * s * face, p1.y + 10 * s + Math.sin(t * 2) * s, s * 0.9, t, lamp);
}

/** A loose bank of cloud puffs — `rng` seeds the shapes (call it the same number of times every frame). */
export function clouds(g: G, x: number, y: number, w: number, h: number, n: number, rng: () => number, col: number, a: number, drift: number): void {
  for (let i = 0; i < n; i++) {
    const cx = x + rng() * w + drift * (0.5 + rng() * 0.5);
    const cy = y + rng() * h;
    const rw = 60 + rng() * 120, rh = 18 + rng() * 26;
    g.fillStyle(col, a * (0.5 + rng() * 0.5));
    g.fillEllipse(cx, cy, rw, rh);
  }
}

/**
 * THE SHROUD — the storm wall round the spire: columns of churning cloud standing on the sea,
 * lit violet from within, rain curtains under them. `split` 0–1 tears it open down the middle
 * (columns fold back to either side and thin out); `fury` 0–1 drives churn and lightning.
 */
export function stormWall(g: G, cx: number, baseY: number, w: number, h: number, t: number, rng: () => number, o: { split?: number; fury?: number; glow?: number } = {}): void {
  const split = o.split ?? 0;
  const fury = o.fury ?? 1;
  const glow = o.glow ?? 1;
  const cols = 15;
  // Rain curtains first, under the cloud.
  for (let c = 0; c < cols; c++) {
    const side = c < cols / 2 ? -1 : 1;
    const centre = 1 - Math.abs(c - (cols - 1) / 2) / ((cols - 1) / 2);
    const x = cx + (c / (cols - 1) - 0.5) * w + side * split * w * (0.3 + centre * 0.5);
    const ra = rng();
    g.fillStyle(0x14121e, (0.35 + ra * 0.2) * (1 - split * centre));
    g.fillRect(x - w / cols * 0.6, baseY - h * 0.35, w / cols * 1.2, h * 0.35);
  }
  for (let c = 0; c < cols; c++) {
    const side = c < cols / 2 ? -1 : 1;
    const centre = 1 - Math.abs(c - (cols - 1) / 2) / ((cols - 1) / 2);
    const fade = 1 - split * centre * 0.9;
    const x0 = cx + (c / (cols - 1) - 0.5) * w + side * split * w * (0.3 + centre * 0.5);
    const hh = h * (0.7 + rng() * 0.3) * (1 - split * centre * 0.4);
    const pw = (w / cols) * 2.1;
    for (let j = 0; j < 6; j++) {
      const f = j / 5;
      const ox = Math.sin(t * (0.5 + fury * 0.6) + c * 1.7 + j) * 8 * (1 + fury);
      const y = baseY - hh * f * 0.95 - 10;
      const r = rng();
      const sz = pw * (1.1 - f * 0.35) * (0.8 + r * 0.4);
      g.fillStyle(j % 2 ? 0x1c1828 : 0x252036, fade);
      g.fillEllipse(x0 + ox, y, sz, sz * 0.7);
      g.fillStyle(0x3a3050, 0.55 * fade);
      g.fillEllipse(x0 + ox - sz * 0.12, y - sz * 0.16, sz * 0.6, sz * 0.3);
    }
    // Violet light in the cloud, breathing.
    const lp = 0.5 + 0.5 * Math.sin(t * 2.3 + c * 2.9);
    g.fillStyle(OBS.seam, 0.08 * glow * lp * fade);
    g.fillEllipse(x0, baseY - hh * 0.5, pw * 1.4, hh * 0.6);
    // Lightning inside it.
    const zap = Math.sin(t * (4 + fury * 3) + c * 2.13) * Math.sin(t * 1.7 + c);
    const bx = rng() * 40 - 20;
    if (fury > 0.2 && zap > 0.86) {
      const b = crackPath({ x: x0 + bx, y: baseY - hh * 0.85 }, { x: x0 - bx, y: baseY - hh * 0.2 }, rng, 14, 6);
      seam(g, b, 1.6, fade * fury, 1, OBS.seamLit);
    } else {
      // crackPath draws five numbers — burn them so the scenery after holds still.
      for (let k = 0; k < 5; k++) rng();
    }
  }
}

/** Black-glass shingle: a beach of small sharp pebbles that glint as they catch the light. */
export function shingle(g: G, x: number, y: number, w: number, h: number, rng: () => number, t: number, n = 140, warm = 0): void {
  g.fillStyle(OBS.glass, 1); g.fillRect(x, y, w, h);
  g.fillStyle(OBS.facet, 0.5); g.fillRect(x, y, w, 3);
  for (let i = 0; i < n; i++) {
    const f = rng();
    const px = x + rng() * w, py = y + f * h;
    const sz = 2 + f * f * 10 + rng() * 3;
    const sh = rng();
    g.fillStyle(sh > 0.6 ? OBS.sheen : OBS.facet, 0.6 + f * 0.4);
    g.fillTriangle(px - sz, py, px + sz * 0.8, py - sz * 0.2, px + sz * (sh - 0.5), py - sz * 0.8);
    const tw = Math.sin(t * (1 + sh * 3) + i * 1.9);
    if (tw > 0.9) {
      g.fillStyle(warm > 0 && sh > 0.5 ? mixC(0xffffff, 0xffd090, warm) : (sh > 0.5 ? 0xffffff : OBS.seamLit), (tw - 0.9) * 8);
      g.fillCircle(px + sz * 0.2, py - sz * 0.4, 1 + f);
    }
  }
}

/** A wrecked boat half sunk in glass shingle: a tilted hull, bare ribs, a snapped mast, a rag of sail. */
export function wreck(g: G, x: number, y: number, s: number, sail: number, tilt: number, t: number): void {
  const c = Math.cos(tilt), sn = Math.sin(tilt);
  const pt = (dx: number, dy: number) => P(x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s);
  g.fillStyle(0x1e1814, 1);
  g.fillPoints([pt(-50, 0), pt(-46, -16), pt(30, -18), pt(50, -30), pt(46, 0)], true);
  g.lineStyle(2.2 * s, 0x3a2c22, 1);
  for (let r = 0; r < 6; r++) {
    const a = pt(-40 + r * 14, -14), b = pt(-36 + r * 14, -32 - Math.sin(r) * 4);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
  const m0 = pt(-4, -16), m1 = pt(-2, -54);
  g.lineStyle(2.4 * s, 0x3a2c22, 1); g.lineBetween(m0.x, m0.y, m1.x, m1.y);
  const w = Math.sin(t * 2 + x) * 3;
  const s0 = pt(-2, -52), s1 = pt(18 + w, -40), s2 = pt(4, -30 + w * 0.5);
  g.fillStyle(dim(sail, 0.45), 0.85); g.fillTriangle(s0.x, s0.y, s1.x, s1.y, s2.x, s2.y);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y + 2 * s, 110 * s, 12 * s);
}

/** Glass rain: slivers of black glass falling on a slant, catching pale light. */
export function glassRain(g: G, W: number, y0: number, y1: number, t: number, rng: () => number, n: number, a = 1): void {
  const h = y1 - y0;
  for (let i = 0; i < n; i++) {
    const sp = 260 + rng() * 260;
    const x0 = rng() * (W + 200);
    const ph = rng();
    const yy = y0 + ((ph * h + t * sp) % h);
    const xx = (x0 - (yy - y0) * 0.35) % (W + 200) - 40;
    const len = 6 + rng() * 10;
    g.lineStyle(1, rng() > 0.8 ? OBS.seamLit : OBS.edge, (0.25 + ph * 0.4) * a);
    g.lineBetween(xx, yy, xx - len * 0.35, yy - len);
  }
}

/** A sun: halo stack, a disc and a bright core. */
export function sunDisc(g: G, x: number, y: number, r: number, col: number, a = 1): void {
  for (let i = 5; i >= 1; i--) { g.fillStyle(col, 0.06 * a); g.fillCircle(x, y, r * (1 + i * 0.9)); }
  g.fillStyle(col, a); g.fillCircle(x, y, r);
  g.fillStyle(lit(col, 0.6), a); g.fillCircle(x, y, r * 0.7);
}

/** Rays fanning from `x, y` between angles `a0`–`a1` (radians), slowly turning, `len` long. */
export function rays(g: G, x: number, y: number, a0: number, a1: number, n: number, len: number, col: number, alpha: number, t: number): void {
  if (alpha <= 0) return;
  for (let i = 0; i < n; i++) {
    const an = a0 + ((i + 0.5) / n) * (a1 - a0) + Math.sin(t * 0.3 + i * 1.7) * 0.02;
    const wd = 0.025 + 0.02 * Math.sin(i * 2.3);
    const l = len * (0.7 + 0.3 * Math.sin(i * 3.7 + t * 0.4));
    g.fillStyle(col, alpha * (0.5 + 0.5 * Math.sin(i * 1.3 + t * 0.7)));
    g.fillTriangle(x, y, x + Math.cos(an - wd) * l, y + Math.sin(an - wd) * l, x + Math.cos(an + wd) * l, y + Math.sin(an + wd) * l);
  }
}

/** A sea bird: two curved wing strokes, flapping. */
export function gull(g: G, x: number, y: number, s: number, t: number, col = 0xe8e4f0, a = 1): void {
  const fl = Math.sin(t * 7 + x * 0.05) * 4 * s;
  g.lineStyle(1.4 * s, col, a);
  g.lineBetween(x - 8 * s, y - fl, x - 3 * s, y - 2 * s); g.lineBetween(x - 3 * s, y - 2 * s, x, y);
  g.lineBetween(x + 8 * s, y - fl, x + 3 * s, y - 2 * s); g.lineBetween(x + 3 * s, y - 2 * s, x, y);
}

/** A star falling: a tapering trail back along (-dx, -dy) and a burning head. */
export function fallingStar(g: G, x: number, y: number, dx: number, dy: number, len: number, a: number): void {
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  for (let i = 0; i < 4; i++) {
    const w = (4 - i) * 1.6;
    g.fillStyle(i < 2 ? OBS.starDeep : OBS.star, 0.18 * a * (i + 1) / 2);
    g.fillTriangle(x + nx * w, y + ny * w, x - nx * w, y - ny * w, x - ux * len * (1 - i * 0.2), y - uy * len * (1 - i * 0.2));
  }
  g.fillStyle(OBS.star, 0.25 * a); g.fillCircle(x, y, 12);
  g.fillStyle(OBS.starCore, a); g.fillCircle(x, y, 3.2);
}

/** A field of black-glass shards along a horizon (the spire's foothills seen from the sea). */
export function shardRow(g: G, x0: number, x1: number, y: number, n: number, hMin: number, hMax: number, rng: () => number): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + rng())) / n;
    const h = hMin + rng() * (hMax - hMin);
    shard(g, x, y, h * (0.35 + rng() * 0.2), h, (rng() - 0.5) * h * 0.4, rng() * 0.4);
  }
}
