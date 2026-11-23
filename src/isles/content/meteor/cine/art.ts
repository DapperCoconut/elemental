import Phaser from 'phaser';
import { dim, lit, mixC } from '../../../art/CineArt';
import { OBS } from '../../../art/PinnacleArt';
import { FP, MOOD, type Mood, P, type G } from '../art';

/**
 * The Fall cinematics' own brushes (screen space 960×640, clocks in seconds): Fallpoint seen from
 * the sea, the Ladle with its missing rung, the pinned sun of Solmara, Choirholm's great bell, and
 * the Ferryman's hands up close.
 */

/**
 * Fallpoint from the sea at a low angle: a long flat ring of amber and bottle-green glass, broken
 * teeth along its back rim, steam off its foot, and the light of the bowl spilling up out of it.
 * `cx, y` the near waterline's middle; `w` its width; `glowA` 0–1 the bowl's light in `mood`.
 */
export function reef(g: G, cx: number, y: number, w: number, t: number, rng: () => number, mood: Mood, glowA: number): void {
  const h = w * 0.07;
  const m = MOOD[mood];
  // The bowl's light hanging over it.
  if (glowA > 0) {
    for (let i = 4; i >= 1; i--) { g.fillStyle(m.wash, 0.05 * glowA); g.fillEllipse(cx, y - h * 1.6, w * (0.3 + i * 0.12), h * (2 + i * 1.4)); }
    g.fillStyle(m.core, 0.25 * glowA); g.fillEllipse(cx, y - h * 1.2, w * 0.08, h * 0.7);
  }
  // The back rim, far side of the ring, and its teeth against the sky.
  g.fillStyle(dim(FP.bottle, 0.55), 1); g.fillEllipse(cx, y - h * 1.1, w * 0.94, h * 1.3);
  for (let i = 0; i < 16; i++) {
    const f = (i + rng()) / 16;
    const x = cx - w * 0.44 + f * w * 0.88;
    const yy = y - h * 1.1 - Math.sin(f * Math.PI) * h * 0.55;
    const th = h * (0.5 + rng() * 1.1), tw = h * (0.12 + rng() * 0.12), lean = (rng() - 0.5) * h * 0.6;
    const col = rng() > 0.5 ? FP.amber : FP.bottle;
    g.fillStyle(dim(col, 0.5), 1); g.fillTriangle(x - tw, yy, x + tw, yy, x + lean, yy - th);
    g.fillStyle(lit(col, 0.2), 0.5); g.fillTriangle(x - tw * 0.6, yy, x, yy, x + lean, yy - th);
    if (glowA > 0) { g.lineStyle(1, m.light, 0.4 * glowA); g.lineBetween(x + tw * 0.4, yy, x + lean, yy - th); }
  }
  // The bowl (just a dark lens behind the near rim).
  g.fillStyle(mixC(FP.bowlDeep, m.wash, 0.15 * glowA), 1); g.fillEllipse(cx, y - h * 0.7, w * 0.78, h * 1.1);
  // The near rim: a thick lip of glass, lumpy with nodules, catching starlight.
  g.fillStyle(FP.bottleDeep, 1); g.fillEllipse(cx, y - h * 0.15, w, h * 1.2);
  for (let i = 0; i < 46; i++) {
    const f = rng();
    const x = cx - w * 0.48 + f * w * 0.96;
    const yy = y - h * 0.1 + Math.sin(f * Math.PI) * h * 0.4 - rng() * h * 0.3;
    const col = rng() > 0.45 ? FP.amber : FP.bottle;
    const s = h * (0.12 + rng() * 0.18);
    g.fillStyle(dim(col, 0.3), 1); g.fillEllipse(x, yy, s * 2.2, s * 1.1);
    g.fillStyle(lit(col, 0.25), 0.6); g.fillEllipse(x - s * 0.3, yy - s * 0.3, s * 1.1, s * 0.4);
  }
  g.lineStyle(1.4, FP.amberLit, 0.3); g.strokeEllipse(cx, y - h * 0.15, w * 0.99, h * 1.18);
  // Foam on the waterline and steam crawling up off it.
  g.fillStyle(FP.foam, 0.25); g.fillEllipse(cx, y + h * 0.42, w * 1.02, h * 0.22);
  for (let i = 0; i < 14; i++) {
    const x = cx - w * 0.46 + (i / 13) * w * 0.92;
    const k = (t * 0.15 + i * 0.37) % 1;
    g.fillStyle(0xd8dce4, 0.12 * Math.sin(k * Math.PI)); g.fillEllipse(x + Math.sin(t * 0.5 + i) * 8, y - k * h * 3, h * (0.8 + k), h * (0.4 + k * 0.3));
  }
}

/**
 * The Ladle — seven stars every sailor steers by — with its fourth rung `gap` 0–1 missing (an empty
 * ring where it should be). `fill` 0–1 lets the star that was always behind the cinder show.
 */
export function ladle(g: G, x: number, y: number, s: number, t: number, gap: number, fill = 0): void {
  const STARS = [[0, 0], [34, 10], [62, 6], [92, 22], [118, 50], [96, 74], [70, 56]];
  g.lineStyle(1, 0x8a9ac8, 0.25);
  for (let i = 0; i < STARS.length - 1; i++) {
    if ((i === 2 || i === 3) && gap > 0.5 && fill < 0.5) continue;
    g.lineBetween(x + STARS[i][0] * s, y + STARS[i][1] * s, x + STARS[i + 1][0] * s, y + STARS[i + 1][1] * s);
  }
  g.lineBetween(x + STARS[6][0] * s, y + STARS[6][1] * s, x + STARS[3][0] * s, y + STARS[3][1] * s);
  STARS.forEach(([dx, dy], i) => {
    const sx = x + dx * s, sy = y + dy * s;
    const tw = 0.75 + 0.25 * Math.sin(t * 1.7 + i * 2.1);
    if (i === 3) {
      if (gap > 0) { g.lineStyle(1, 0x8a9ac8, 0.3 * gap * (0.6 + 0.4 * Math.sin(t * 2))); g.strokeCircle(sx, sy, 6 * s); }
      const a = Math.max(1 - gap, fill);
      if (a > 0) {
        g.fillStyle(0xffffff, 0.15 * a); g.fillCircle(sx, sy, 6 * s);
        g.fillStyle(0xffffff, a * tw); g.fillCircle(sx, sy, 1.8 * s);
      }
      return;
    }
    g.fillStyle(0xffffff, 0.12 * tw); g.fillCircle(sx, sy, 5 * s);
    g.fillStyle(0xffffff, tw); g.fillCircle(sx, sy, 1.6 * s);
  });
}

/**
 * Solmara's sun, pinned: a white disc held at the top of the sky by four long iron pins driven in
 * at the quarters, and the hard rays it is made to throw. `pin` 0–1 drives the pins home.
 */
export function pinnedSun(g: G, x: number, y: number, r: number, t: number, pin: number, warm: number): void {
  const col = mixC(0xfff8e8, 0xffb060, warm);
  for (let i = 5; i >= 1; i--) { g.fillStyle(col, 0.05); g.fillCircle(x, y, r * (1 + i * 0.5)); }
  g.fillStyle(col, 1); g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, 0.8); g.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.6);
  if (pin <= 0) return;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const out = r * (1 + 1.8 * (1 - pin)) + r * 0.9;
    const tipR = r * (0.3 + 0.7 * (1 - pin)) + r * 0.65;
    const hx = x + Math.cos(a) * out, hy = y + Math.sin(a) * out;
    const tx = x + Math.cos(a) * tipR, ty = y + Math.sin(a) * tipR;
    g.lineStyle(r * 0.12, 0x2a2420, pin); g.lineBetween(hx, hy, tx, ty);
    g.lineStyle(r * 0.04, 0x6a5a50, pin); g.lineBetween(hx, hy, tx, ty);
    g.fillStyle(0x3a302a, pin); g.fillCircle(hx, hy, r * 0.14);
    g.fillStyle(0x8a7a6a, pin); g.fillCircle(hx - r * 0.03, hy - r * 0.03, r * 0.06);
  }
  // The rays it is made to throw: straight, hard, all the same length.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1;
    g.lineStyle(2, col, 0.25 * pin);
    g.lineBetween(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3, x + Math.cos(a) * r * 3.4, y + Math.sin(a) * r * 3.4);
  }
}

/**
 * Choirholm's great bell on its gallows-frame: bronze body, lip, clapper, the cracked rope. `x, y` the
 * top of the frame's beam; `lift` 0 lying broken on the ground below … 1 hung back in the yoke.
 */
export function greatBell(g: G, x: number, y: number, s: number, lift: number, t: number): void {
  const ground = y + 210 * s;
  // The frame.
  g.fillStyle(0x2a1e18, 1);
  g.fillPoints([P(x - 110 * s, ground), P(x - 96 * s, ground), P(x - 70 * s, y), P(x - 84 * s, y)], true);
  g.fillPoints([P(x + 110 * s, ground), P(x + 96 * s, ground), P(x + 70 * s, y), P(x + 84 * s, y)], true);
  g.fillStyle(0x3a2a20, 1); g.fillRect(x - 96 * s, y - 12 * s, 192 * s, 14 * s);
  g.lineStyle(1, 0x5a4434, 1); g.lineBetween(x - 96 * s, y - 12 * s, x + 96 * s, y - 12 * s);
  // The bell, rising: fallen on its side at 0, hanging at 1.
  const hangY = y + 6 * s, lieY = ground - 46 * s;
  const by = hangY + (lieY - hangY) * (1 - lift);
  const rot = (1 - lift) * 1.35 + Math.sin(t * 2.2) * 0.04 * lift;
  const c = Math.cos(rot), sn = Math.sin(rot);
  const R = (dx: number, dy: number) => P(x + (dx * c - dy * sn) * s, by + (dx * sn + dy * c) * s);
  if (lift > 0.05) { g.lineStyle(3 * s, 0x8a7a5a, lift); g.lineBetween(x, y, x, by); }
  const bronze = 0x8a6a2a;
  g.fillStyle(dim(bronze, 0.35), 1);
  g.fillPoints([R(-18, 0), R(18, 0), R(24, 30), R(36, 74), R(44, 84), R(-44, 84), R(-36, 74), R(-24, 30)], true);
  g.fillStyle(bronze, 1);
  g.fillPoints([R(-16, 2), R(4, 2), R(8, 30), R(14, 74), R(14, 82), R(-40, 82), R(-34, 74), R(-22, 30)], true);
  g.fillStyle(lit(bronze, 0.35), 0.7); g.fillPoints([R(-12, 6), R(-4, 6), R(-6, 40), R(-14, 70), R(-22, 70)], true);
  // Bands and the inscription ring.
  g.lineStyle(2 * s, dim(bronze, 0.5), 1);
  const b0 = R(-36, 72), b1 = R(36, 72); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  const c0 = R(-24, 26), c1 = R(24, 26); g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  // The crack it had when it came down — closing as it lifts.
  g.lineStyle(1.4 * s, 0x1a1208, 1 - lift);
  const k0 = R(6, 82), k1 = R(2, 60), k2 = R(8, 44); g.lineBetween(k0.x, k0.y, k1.x, k1.y); g.lineBetween(k1.x, k1.y, k2.x, k2.y);
  // Clapper.
  const cl = R(Math.sin(t * 2.2) * 4 * lift, 86);
  g.fillStyle(0x2a2420, 1); g.fillCircle(cl.x, cl.y, 6 * s);
}

/**
 * The Ferryman's hands, close: old, big-knuckled, held up to the lantern light. `brand` 0–1 brings
 * back the faint tithe-tally scored across the right palm — the mark every ferryman carried under
 * the crowns, which the dream remembers for him.
 */
export function ferryHands(g: G, cx: number, cy: number, s: number, t: number, brand: number): void {
  const skin = 0xc89a7a, skinDk = 0x8a6248, sleeve = 0x2a2430;
  const tremble = Math.sin(t * 7) * 0.6 * s;
  const hand = (side: -1 | 1) => {
    const x = cx + side * 92 * s, y = cy + tremble * side;
    // Sleeve.
    g.fillStyle(sleeve, 1); g.fillPoints([P(x - 46 * s, y + 140 * s), P(x + 46 * s, y + 140 * s), P(x + 40 * s, y + 70 * s), P(x - 36 * s, y + 70 * s)], true);
    g.fillStyle(0x463c4e, 1); g.fillRect(x - 38 * s, y + 66 * s, 78 * s, 10 * s);
    // Palm.
    g.fillStyle(skinDk, 1); g.fillEllipse(x, y + 30 * s, 84 * s, 92 * s);
    g.fillStyle(skin, 1); g.fillEllipse(x - side * 2 * s, y + 28 * s, 76 * s, 84 * s);
    // Fingers, curled a little, the oar's callus on each.
    for (let i = 0; i < 4; i++) {
      const fx = x + (-27 + i * 18) * s * side;
      const len = [44, 52, 50, 40][i] * s;
      g.fillStyle(skinDk, 1); g.fillRoundedRect(fx - 8 * s, y - len + 2 * s, 16 * s, len + 6 * s, 7 * s);
      g.fillStyle(skin, 1); g.fillRoundedRect(fx - 7 * s, y - len + 3 * s, 13 * s, len + 4 * s, 6 * s);
      g.lineStyle(1 * s, skinDk, 0.8);
      g.lineBetween(fx - 5 * s, y - len * 0.45, fx + 5 * s, y - len * 0.45); g.lineBetween(fx - 5 * s, y - len * 0.1, fx + 5 * s, y - len * 0.1);
      g.fillStyle(0xe0c0a0, 0.8); g.fillEllipse(fx, y + 2 * s, 10 * s, 5 * s);
    }
    // Thumb.
    g.fillStyle(skin, 1);
    g.fillPoints([P(x + side * 34 * s, y + 40 * s), P(x + side * 62 * s, y + 6 * s), P(x + side * 70 * s, y + 12 * s), P(x + side * 44 * s, y + 56 * s)], true);
    // Lines of the palm.
    g.lineStyle(1.2 * s, skinDk, 0.7);
    g.lineBetween(x - 26 * s, y + 18 * s, x + 24 * s, y + 10 * s);
    g.lineBetween(x - 22 * s, y + 34 * s, x + 18 * s, y + 46 * s);
    g.lineBetween(x + side * 10 * s, y + 60 * s, x - side * 4 * s, y + 20 * s);
    // The tally, coming back into the skin.
    if (side === 1 && brand > 0) {
      g.lineStyle(2.4 * s, 0x6a2a1a, 0.8 * brand);
      for (let i = 0; i < 4; i++) g.lineBetween(x - 18 * s + i * 9 * s, y + 18 * s, x - 18 * s + i * 9 * s, y + 46 * s);
      g.lineBetween(x - 24 * s, y + 40 * s, x + 16 * s, y + 22 * s);
      g.fillStyle(OBS.seam, 0.12 * brand); g.fillEllipse(x - 4 * s, y + 32 * s, 60 * s, 40 * s);
    }
  };
  hand(-1);
  hand(1);
}

/** Ash and embers drifting up across the whole frame (`heat` 0 grey ash … 1 live sparks). */
export function ashDrift(g: G, W: number, H: number, t: number, rng: () => number, n: number, heat: number, a = 1): void {
  for (let i = 0; i < n; i++) {
    const sp = 14 + rng() * 30;
    const x = rng() * W + Math.sin(t * 0.7 + i) * 14;
    const y = H - ((rng() * H + t * sp) % (H + 20));
    const ember = rng() < heat;
    g.fillStyle(ember ? (rng() > 0.5 ? 0xffa040 : 0xff5a2a) : 0x9a948e, (ember ? 0.8 : 0.45) * a);
    g.fillRect(x, y, ember ? 1.6 : 2.2, ember ? 1.6 : 1.4);
  }
}

/** `Phaser.Math.Clamp`, short. */
export const clamp01 = (v: number): number => Phaser.Math.Clamp(v, 0, 1);
