import Phaser from 'phaser';
import { ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';
import { ASTRA, seeded } from './AstraVisuals';

/**
 * Art for Astra's mass kit and its Singularity.
 *
 * The rig itself is unchanged (`AstraVisuals`). Everything here is what the mass rework added:
 * space dust and the accretion halo it builds, mercury antimatter and its photons, the supernova,
 * the fusion furnace, the comet and its shards — and the black hole: the collapsed sky, the
 * silhouettes, the eclipse, the throne, the earth-breaking finale and the laugh.
 *
 * Painters take a `ColorFn` so a skin can recolour them, and the codex previews call the same ones.
 */

export const MASS = {
  dust: 0x8f7bd8,
  dustLit: 0xd9c8ff,
  dustDeep: 0x3a2d7a,
  mercury: 0xb9c4d6,
  mercuryLit: 0xf4f8ff,
  mercuryDark: 0x4c5670,
  photon: 0x9ff6ff,
  photonCore: 0xffffff,
  rock: 0x5b5470,
  rockDark: 0x2c2740,
  rockLit: 0x9a90b8,
  ice: 0x9fe6ff,
  fire: 0xff7a1a,
  fireHot: 0xffe27a,
  fusion: 0xff4d2e,
  hole: 0x000000,
  rim: 0xffffff,
  disk: 0xffb52e,
  diskHot: 0xfff6d0,
  earthSea: 0x2f6fd0,
  earthLand: 0x4fae5a,
  earthCloud: 0xf0f6ff,
  throne: 0x1b1838,
  throneLit: 0x6a4cff,
  eye: 0xffe27a,
};

/**
 * The rectangle the main camera shows, in logical coordinates. The game is supersampled, so the
 * camera's own `worldView` is canvas-sized (twice too big) — anything full-screen must use this.
 */
export function logicalView(scene: Phaser.Scene): Phaser.Geom.Rectangle {
  const cam = scene.cameras.main;
  return new Phaser.Geom.Rectangle(cam.scrollX, cam.scrollY, scene.scale.width, scene.scale.height);
}

// ── Mass: dust, the halo, the bar ───────────────────────────────────────────

/** A drifting cloud of space dust: soft puffs, and motes turning slowly inside it. */
export function dustCloud(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, seed: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const rnd = seeded(seed);
  for (let i = 0; i < 5; i++) {
    const a = rnd() * TAU + t * 0.25 * (i % 2 ? 1 : -1);
    const d = r * 0.45 * rnd();
    const pr = r * (0.45 + 0.35 * rnd()) * (1 + 0.06 * Math.sin(t * 1.7 + i));
    g.fillStyle(tint(i % 2 ? MASS.dust : MASS.dustDeep), alpha * 0.2);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, pr);
  }
  for (let i = 0; i < 12; i++) {
    const a = rnd() * TAU + t * (0.5 + rnd() * 0.6);
    const d = r * (0.2 + 0.75 * rnd());
    const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.9);
    g.fillStyle(tint(i % 3 ? MASS.dustLit : ASTRA.starHot), alpha * (0.35 + 0.6 * tw));
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0.9 + 1.1 * rnd());
  }
  g.lineStyle(1, tint(MASS.dustLit), alpha * 0.25);
  g.strokeEllipse(x, y, r * 1.7, r * 1.35);
}

/**
 * The body Astra has gathered: a translucent shell of dust out to `r` (its real hitbox), bands of
 * grit orbiting inside it, and — `fusion` 0..1 — the furnace: the inside lit red-white, with
 * convection cells crawling over it.
 */
export function massHalo(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, k: number, t: number, alpha: number, fusion: number,
): void {
  if (alpha <= 0.01 || r < 26) return;
  g.fillStyle(tint(MASS.dustDeep), alpha * (0.2 + 0.12 * k));
  g.fillCircle(x, y, r);
  g.fillStyle(tint(MASS.dust), alpha * 0.1);
  g.fillCircle(x, y, r * 0.72);
  if (fusion > 0.01) {
    const beat = 0.8 + 0.2 * Math.sin(t * 22);
    g.fillStyle(tint(MASS.fusion), alpha * 0.34 * fusion * beat);
    g.fillCircle(x, y, r * 0.98);
    g.fillStyle(tint(MASS.fire), alpha * 0.3 * fusion);
    g.fillCircle(x, y, r * 0.7);
    g.fillStyle(tint(MASS.fireHot), alpha * 0.26 * fusion * beat);
    g.fillCircle(x, y, r * 0.42);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + t * 0.9;
      const d = r * (0.35 + 0.5 * ((i * 0.37 + t * 0.4) % 1));
      g.fillStyle(tint(i % 2 ? MASS.fireHot : ASTRA.white), alpha * 0.5 * fusion);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + (i % 3));
    }
  }
  // Orbiting grit: three tilted bands, the grains drawn only on the near half so they read as rings.
  const grains = Math.round(10 + 26 * k);
  for (let i = 0; i < grains; i++) {
    const band = i % 3;
    const a = (i / grains) * TAU * 3 + t * (0.9 + band * 0.35) * (band === 1 ? -1 : 1);
    const d = r * (0.62 + 0.14 * band);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * (0.55 + 0.18 * band);
    g.fillStyle(tint(fusion > 0.3 ? MASS.fireHot : (i % 4 ? MASS.dustLit : MASS.rockLit)), alpha * (0.35 + 0.4 * ((i * 7) % 5) / 5));
    g.fillCircle(px, py, 1 + ((i * 3) % 4) * 0.5);
  }
  // The edge of the hitbox, drawn honestly: this is where shots land.
  g.lineStyle(1.6, tint(fusion > 0.3 ? MASS.fire : MASS.dustLit), alpha * (0.4 + 0.2 * Math.sin(t * 3)));
  g.strokeCircle(x, y, r);
  g.lineStyle(4, tint(MASS.dust), alpha * 0.12);
  g.strokeCircle(x, y, r - 3);
}

/** The mass bar over Astra's head: a notched track that fills violet, and burns gold when full. */
export function massBar(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, k: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const w = 54;
  const h = 6;
  const L = x - w / 2;
  const full = k >= 0.999;
  g.fillStyle(tint(ASTRA.void), alpha * 0.85);
  g.fillRoundedRect(L - 2, y - 2, w + 4, h + 4, 3);
  if (k > 0.01) {
    g.fillStyle(tint(full ? ASTRA.starHot : MASS.dust), alpha);
    g.fillRoundedRect(L, y, Math.max(3, w * k), h, 2);
    g.fillStyle(tint(full ? ASTRA.white : MASS.dustLit), alpha * 0.8);
    g.fillRect(L + 1, y + 1, Math.max(1, w * k - 2), 1.5);
  }
  g.lineStyle(1, tint(ASTRA.void), alpha * 0.8);
  for (let i = 1; i < 4; i++) g.lineBetween(L + (w * i) / 4, y, L + (w * i) / 4, y + h);
  g.lineStyle(1, tint(full ? ASTRA.starHot : MASS.dustLit), alpha * (full ? 0.6 + 0.4 * Math.sin(t * 9) : 0.5));
  g.strokeRoundedRect(L - 2, y - 2, w + 4, h + 4, 3);
  if (full) {
    for (let i = 0; i < 3; i++) {
      const sx = L + ((t * 40 + i * 21) % w);
      g.fillStyle(tint(ASTRA.white), alpha * 0.9);
      g.fillCircle(sx, y - 3 - 2 * Math.sin(t * 7 + i), 1.2);
    }
  }
}

// ── Antimatter and photons ──────────────────────────────────────────────────

/** A blob of antimatter: liquid mercury, wobbling as it flies, shedding droplets behind it. */
export function antimatterBlob(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, ang: number, t: number,
): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    // Stretched along its flight, pinched across it, with a slow slosh running round the rim.
    const along = Math.cos(a - ang);
    const rr = r * (1 + 0.28 * along * along - 0.12 + 0.13 * Math.sin(a * 3 + t * 13) + 0.07 * Math.sin(a * 5 - t * 9));
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  for (let i = 1; i <= 4; i++) {
    const d = r * (0.9 + i * 0.95) + 3 * Math.sin(t * 15 + i);
    const side = Math.sin(t * 11 + i * 2.2) * r * 0.45;
    const px = x - Math.cos(ang) * d + Math.cos(ang + Math.PI / 2) * side;
    const py = y - Math.sin(ang) * d + Math.sin(ang + Math.PI / 2) * side;
    g.fillStyle(tint(MASS.mercuryDark), 0.75);
    g.fillCircle(px, py, r * (0.42 - i * 0.07) + 0.8);
    g.fillStyle(tint(MASS.mercuryLit), 0.8);
    g.fillCircle(px - 0.6, py - 0.6, Math.max(0.6, r * (0.2 - i * 0.035)));
  }
  g.fillStyle(tint(ASTRA.void), 0.35);
  g.fillCircle(x, y, r * 1.5);
  g.fillStyle(tint(MASS.mercuryDark), 1);
  g.fillPoints(pts, true);
  g.fillStyle(tint(MASS.mercury), 1);
  g.fillCircle(x - r * 0.08, y - r * 0.1, r * 0.78);
  g.fillStyle(tint(MASS.mercuryLit), 0.95);
  g.fillEllipse(x - r * 0.3, y - r * 0.36, r * 0.62, r * 0.36);
  g.fillStyle(tint(MASS.mercuryDark), 0.55);
  g.fillEllipse(x + r * 0.22, y + r * 0.34, r * 0.7, r * 0.3);
  g.lineStyle(1.2, tint(ASTRA.void), 0.9);
  g.strokePoints(pts, true);
}

/** A photon: a white-cyan wave packet with a short sinusoid of light trailing its orbit. */
export function photon(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, cx: number, cy: number, orbitR: number, ang: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  g.lineStyle(2, tint(MASS.photon), alpha * 0.7);
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const back = ang - (i / 10) * 0.95;
    const rr = orbitR + Math.sin(i * 1.5 - t * 26) * 3.2 * (1 - i / 12);
    const px = cx + Math.cos(back) * rr;
    const py = cy + Math.sin(back) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  const x = cx + Math.cos(ang) * orbitR;
  const y = cy + Math.sin(ang) * orbitR;
  g.fillStyle(tint(MASS.photon), alpha * 0.35);
  g.fillCircle(x, y, 8);
  g.fillStyle(tint(MASS.photon), alpha);
  g.fillCircle(x, y, 4.2);
  g.fillStyle(tint(MASS.photonCore), alpha);
  g.fillCircle(x, y, 2.2);
  g.lineStyle(1, tint(MASS.photonCore), alpha * 0.9);
  g.lineBetween(x - 7, y, x + 7, y);
  g.lineBetween(x, y - 7, x, y + 7);
}

/**
 * A photon in free flight: the same white-cyan packet, with its wave of light strung out behind
 * it along the way it is travelling — longer the faster it goes.
 */
export function photonBolt(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number, speed: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const len = 10 + Math.min(34, speed * 0.05);
  const nx = Math.cos(ang + Math.PI / 2);
  const ny = Math.sin(ang + Math.PI / 2);
  g.lineStyle(2, tint(MASS.photon), alpha * 0.7);
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const wob = Math.sin(i * 1.5 - t * 26) * 3.2 * (1 - u * 0.8);
    const px = x - Math.cos(ang) * len * u + nx * wob;
    const py = y - Math.sin(ang) * len * u + ny * wob;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.fillStyle(tint(MASS.photon), alpha * 0.35);
  g.fillCircle(x, y, 8);
  g.fillStyle(tint(MASS.photon), alpha);
  g.fillCircle(x, y, 4.2);
  g.fillStyle(tint(MASS.photonCore), alpha);
  g.fillCircle(x, y, 2.2);
  g.lineStyle(1, tint(MASS.photonCore), alpha * 0.9);
  g.lineBetween(x - 7, y, x + 7, y);
  g.lineBetween(x, y - 7, x, y + 7);
}

// ── The comet ───────────────────────────────────────────────────────────────

/**
 * The comet's rock: a lumpy, cratered stone with an icy rim. `heat` 0..1 is how hard it has been
 * spun — past half it catches fire, and `ang` is the way it is moving, for the tail.
 */
export function cometRock(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, heat: number, ang: number, t: number, seed: number,
  moving: boolean,
): void {
  const rnd = seeded(seed);
  const hot = Phaser.Math.Clamp((heat - 0.5) * 2, 0, 1);
  if (moving) {
    const len = r * (2.2 + 5 * heat);
    for (let i = 0; i < 6; i++) {
      const k = i / 6;
      const w = r * (0.95 - 0.8 * k);
      const d = len * k;
      const wob = Math.sin(t * 20 + i) * r * 0.2 * k;
      const px = x - Math.cos(ang) * d + Math.cos(ang + Math.PI / 2) * wob;
      const py = y - Math.sin(ang) * d + Math.sin(ang + Math.PI / 2) * wob;
      g.fillStyle(tint(hot > 0.05 ? (i % 2 ? MASS.fire : MASS.fireHot) : MASS.ice), (0.5 - 0.42 * k) * (0.5 + 0.5 * heat + 0.3));
      g.fillCircle(px, py, w);
    }
  }
  if (hot > 0.05) {
    g.fillStyle(tint(MASS.fire), 0.35 * hot);
    g.fillCircle(x, y, r * (1.7 + 0.15 * Math.sin(t * 24)));
    g.fillStyle(tint(MASS.fireHot), 0.3 * hot);
    g.fillCircle(x, y, r * 1.3);
  }
  const pts: Phaser.Math.Vector2[] = [];
  const spin = t * (0.6 + 5 * heat);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + spin;
    const rr = r * (0.78 + 0.3 * rnd());
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(tint(ASTRA.void), 0.4);
  g.fillEllipse(x + 2, y + r * 0.8, r * 2, r * 0.6);
  g.fillStyle(tint(hot > 0.5 ? MASS.fire : MASS.rockDark), 1);
  g.fillPoints(pts, true);
  g.fillStyle(tint(hot > 0.5 ? MASS.fireHot : MASS.rock), 1);
  g.fillCircle(x - r * 0.1, y - r * 0.12, r * 0.68);
  for (let i = 0; i < 3; i++) {
    const a = rnd() * TAU + spin;
    const d = r * 0.4 * rnd();
    g.fillStyle(tint(hot > 0.5 ? ASTRA.corona : MASS.rockDark), 0.85);
    g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.13 + 0.1 * rnd()));
  }
  g.fillStyle(tint(hot > 0.5 ? ASTRA.white : MASS.rockLit), 0.8);
  g.fillEllipse(x - r * 0.32, y - r * 0.38, r * 0.5, r * 0.26);
  g.lineStyle(1.4, tint(hot > 0.3 ? MASS.fireHot : MASS.ice), 0.85);
  g.strokePoints(pts, true);
}

/** A shard of shattered comet lying on the floor, still glowing at one edge. */
export function rockShard(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, seed: number, alpha: number,
): void {
  const rnd = seeded(seed);
  const rot = rnd() * TAU;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * TAU;
    const rr = r * (0.55 + 0.6 * rnd());
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(tint(ASTRA.void), alpha * 0.4);
  g.fillEllipse(x + 1, y + r * 0.7, r * 1.8, r * 0.5);
  g.fillStyle(tint(MASS.rockDark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(MASS.rock), alpha);
  g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, x, y);
  g.lineStyle(1.3, tint(MASS.fireHot), alpha * (0.5 + 0.5 * Math.sin(t * 5 + seed)));
  g.lineBetween(pts[2].x, pts[2].y, pts[3].x, pts[3].y);
  g.lineStyle(1, tint(MASS.rockLit), alpha * 0.8);
  g.strokePoints(pts, true);
}

/** Cracks in the floor radiating from an impact; `white` for the ones a body leaves in the black hole. */
export function floorCracks(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, alpha: number, seed: number, white = false,
): void {
  if (alpha <= 0.01) return;
  const rnd = seeded(seed);
  if (!white) {
    g.fillStyle(tint(ASTRA.void), alpha * 0.45);
    g.fillEllipse(x, y, r * 0.9, r * 0.6);
  }
  for (let i = 0; i < 9; i++) {
    let a = (i / 9) * TAU + rnd() * 0.5;
    let px = x;
    let py = y;
    const segs = 3 + Math.floor(rnd() * 3);
    for (let s = 0; s < segs; s++) {
      const len = (r / segs) * (0.7 + 0.6 * rnd());
      a += (rnd() - 0.5) * 0.9;
      const nx = px + Math.cos(a) * len;
      const ny = py + Math.sin(a) * len * 0.75;
      g.lineStyle(Math.max(1, 3.2 - s * 0.7), tint(white ? MASS.rim : ASTRA.void), alpha * (white ? 1 : 0.85));
      g.lineBetween(px, py, nx, ny);
      if (!white) {
        g.lineStyle(1, tint(MASS.fire), alpha * 0.35);
        g.lineBetween(px, py + 1, nx, ny + 1);
      }
      px = nx;
      py = ny;
    }
  }
}

// ── The Singularity ─────────────────────────────────────────────────────────

/**
 * The world as a black hole: everything in view goes black, a vast accretion disk turns round
 * the hole at (cx, cy) — hot gold near the horizon, cooling to violet — with a photon ring, a
 * lensed arc over the top, and far stars being drawn in along spirals. `k` 0..1 fades it in.
 */
export function blackHoleSky(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, view: Phaser.Geom.Rectangle, cx: number, cy: number, t: number, k: number,
  pad = 200,
): void {
  if (k <= 0.01) return;
  g.fillStyle(tint(MASS.hole), 0.94 * k);
  g.fillRect(view.x - pad, view.y - pad, view.width + pad * 2, view.height + pad * 2);
  const R = Math.min(view.width, view.height) * 0.3;
  // Stars spiralling in: each one's radius shrinks along its own clock, and it streaks as it falls.
  for (let i = 0; i < 70; i++) {
    const life = ((t * (0.05 + (i % 7) * 0.012) + i * 0.137) % 1);
    const rr = R * 0.6 + (1 - life) * Math.max(view.width, view.height) * 0.75;
    const a = i * 2.399 + life * 4.5 + t * 0.05;
    const x0 = cx + Math.cos(a) * rr;
    const y0 = cy + Math.sin(a) * rr * 0.72;
    const x1 = cx + Math.cos(a - 0.05 - life * 0.12) * (rr + 6 + life * 26);
    const y1 = cy + Math.sin(a - 0.05 - life * 0.12) * (rr + 6 + life * 26) * 0.72;
    g.lineStyle(1 + (i % 3) * 0.5, tint(i % 5 === 0 ? ASTRA.starHot : ASTRA.farStar), k * (0.25 + 0.6 * life));
    g.lineBetween(x0, y0, x1, y1);
  }
  // The disk, back half first: stacked ellipses from violet out at the rim to white-gold inside.
  const bands: [number, number, number, number][] = [
    [2.9, ASTRA.nebula, 0.1, 30], [2.5, ASTRA.violet, 0.14, 24], [2.1, ASTRA.corona, 0.2, 20],
    [1.75, MASS.disk, 0.3, 16], [1.45, ASTRA.starHot, 0.42, 12], [1.22, MASS.diskHot, 0.6, 8],
  ];
  for (const [m, color, a, w] of bands) {
    g.lineStyle(w, tint(color), k * a);
    g.strokeEllipse(cx, cy, R * 2 * m, R * 2 * m * 0.3);
  }
  // Hot knots running round the disk.
  for (let i = 0; i < 26; i++) {
    const m = 1.25 + ((i * 0.31) % 1.5);
    const a = i * 1.7 + t * (1.9 / m);
    g.fillStyle(tint(i % 3 ? ASTRA.starHot : ASTRA.white), k * (0.35 + 0.4 * Math.sin(t * 3 + i) ** 2));
    g.fillCircle(cx + Math.cos(a) * R * m, cy + Math.sin(a) * R * m * 0.3, 1.5 + (i % 3));
  }
  // The lensed far side of the disk, bent up over the hole, and the photon ring hugging it.
  for (let i = 0; i < 4; i++) {
    g.lineStyle(10 - i * 2, tint(i < 2 ? MASS.disk : MASS.diskHot), k * (0.16 + 0.12 * i));
    g.beginPath();
    g.arc(cx, cy, R * (1.16 - i * 0.03), Math.PI, TAU, false);
    g.strokePath();
  }
  g.fillStyle(tint(MASS.hole), k);
  g.fillCircle(cx, cy, R);
  g.lineStyle(3, tint(MASS.diskHot), k * (0.8 + 0.2 * Math.sin(t * 5)));
  g.strokeCircle(cx, cy, R + 2);
  g.lineStyle(1, tint(MASS.rim), k * 0.7);
  g.strokeCircle(cx, cy, R + 6);
  // The near half of the disk crosses in front of the hole.
  g.lineStyle(9, tint(ASTRA.starHot), k * 0.5);
  g.beginPath();
  g.arc(cx, cy + R * 0.02, R * 1.3, 0.12, Math.PI - 0.12, false);
  g.strokePath();
}

/** Anyone in the black hole: a body of pure black with a hard white outline, hands and all. */
export function silhouette(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, hands: { x: number; y: number }[] | null, alpha: number,
  kneel = 0,
): void {
  if (alpha <= 0.01) return;
  const sy = 1 - 0.3 * kneel;
  const by = y + r * 0.3 * kneel;
  for (const h of hands ?? []) {
    const hy = h.y + (y + r * 0.9 - h.y) * kneel;
    g.fillStyle(MASS.rim, alpha);
    g.fillCircle(h.x, hy, 8.6);
    g.fillStyle(MASS.hole, alpha);
    g.fillCircle(h.x, hy, 6.8);
  }
  g.fillStyle(MASS.rim, alpha);
  g.fillEllipse(x, by, (r + 2.2) * 2, (r + 2.2) * 2 * sy);
  g.fillStyle(MASS.hole, alpha);
  g.fillEllipse(x, by, r * 2, r * 2 * sy);
  // Two white slits where the eyes are: wide open normally, squeezed shut when kneeling.
  g.fillStyle(MASS.rim, alpha);
  g.fillEllipse(x - 7, by - 4 * sy, 6, Math.max(1.2, 6 * (1 - kneel)));
  g.fillEllipse(x + 7, by - 4 * sy, 6, Math.max(1.2, 6 * (1 - kneel)));
}

/**
 * The eclipse behind the Astra user: the body itself is black, and round it a blinding corona
 * with long uneven rays. `aura` 0..1 is the held click — the holy aura swelling out.
 */
export function eclipse(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number, aura: number,
): void {
  if (alpha <= 0.01) return;
  const R = 27 + aura * 130;
  for (let i = 0; i < 5; i++) {
    g.fillStyle(tint(i < 2 ? MASS.disk : MASS.diskHot), alpha * (0.07 + 0.05 * i) * (1 + aura));
    g.fillCircle(x, y, R + (5 - i) * (9 + 14 * aura));
  }
  const rays = 22;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU + Math.sin(t * 0.7 + i) * 0.05;
    const len = (18 + ((i * 37) % 23) + 8 * Math.sin(t * 3 + i * 1.3)) * (1 + aura * 2.4);
    const w = 0.05 + ((i * 13) % 5) * 0.012;
    g.fillStyle(tint(i % 2 ? MASS.diskHot : ASTRA.white), alpha * (0.5 + 0.3 * aura));
    g.fillTriangle(
      x + Math.cos(a - w) * R, y + Math.sin(a - w) * R,
      x + Math.cos(a) * (R + len), y + Math.sin(a) * (R + len),
      x + Math.cos(a + w) * R, y + Math.sin(a + w) * R,
    );
  }
  g.lineStyle(3.5, tint(ASTRA.white), alpha);
  g.strokeCircle(x, y, R);
  g.lineStyle(1.5, tint(MASS.diskHot), alpha * 0.8);
  g.strokeCircle(x, y, R + 4 + 2 * Math.sin(t * 6));
  if (aura > 0.02) {
    // Rings of scripture-light rolling outward as the aura grows.
    for (let i = 0; i < 3; i++) {
      const kk = (t * 0.6 + i / 3) % 1;
      g.lineStyle(2, tint(ASTRA.white), alpha * aura * (1 - kk));
      g.strokeCircle(x, y, 27 + kk * (R + 40));
    }
  }
}

/** The hovering throne: a tall cracked back of night stone, wings of light, and the glow it floats on. */
export function throne(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  // What it floats on.
  g.fillStyle(tint(MASS.diskHot), alpha * (0.22 + 0.08 * Math.sin(t * 5)));
  g.fillEllipse(x, y + 40, 62, 12);
  g.fillStyle(tint(ASTRA.white), alpha * 0.35);
  g.fillEllipse(x, y + 40, 30, 5);
  for (let i = 0; i < 4; i++) {
    const kk = (t * 1.2 + i * 0.25) % 1;
    g.fillStyle(tint(MASS.diskHot), alpha * (1 - kk) * 0.7);
    g.fillCircle(x - 22 + i * 15, y + 34 + kk * 16, 1.6);
  }
  // The back: a tall arch tapering to three spires.
  const back = [
    [-24, 30], [-27, -6], [-22, -34], [-15, -27], [-9, -46], [0, -36], [9, -46], [15, -27], [22, -34], [27, -6], [24, 30],
  ].map(([px, py]) => new Phaser.Math.Vector2(x + px, y + py));
  g.fillStyle(tint(MASS.throne), alpha);
  g.fillPoints(back, true);
  g.lineStyle(2, tint(ASTRA.white), alpha * 0.95);
  g.strokePoints(back, true);
  g.lineStyle(1, tint(MASS.throneLit), alpha * 0.8);
  g.lineBetween(x - 15, y - 18, x - 15, y + 26);
  g.lineBetween(x + 15, y - 18, x + 15, y + 26);
  g.lineBetween(x, y - 32, x, y - 22);
  // Armrests and the seat's lip.
  g.fillStyle(tint(MASS.throne), alpha);
  g.fillRoundedRect(x - 35, y + 4, 13, 24, 3);
  g.fillRoundedRect(x + 22, y + 4, 13, 24, 3);
  g.fillRoundedRect(x - 26, y + 22, 52, 10, 3);
  g.lineStyle(1.6, tint(ASTRA.white), alpha * 0.95);
  g.strokeRoundedRect(x - 35, y + 4, 13, 24, 3);
  g.strokeRoundedRect(x + 22, y + 4, 13, 24, 3);
  g.strokeRoundedRect(x - 26, y + 22, 52, 10, 3);
  // A star set in each spire.
  for (const [px, py] of [[-9, -40], [9, -40], [0, -30]]) {
    g.fillStyle(tint(MASS.eye), alpha * (0.7 + 0.3 * Math.sin(t * 4 + px)));
    g.fillCircle(x + px, y + py, 2);
  }
}

/** The raised hand's command over a kneeling body: rings pressing down, and a beam of light on the head. */
export function kneelPress(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  for (let i = 0; i < 3; i++) {
    const kk = (t * 1.4 + i / 3) % 1;
    g.lineStyle(2, tint(ASTRA.white), alpha * (1 - kk));
    g.strokeEllipse(x, y - 58 + kk * 56, 20 + kk * 34, 6 + kk * 8);
  }
  g.fillStyle(tint(MASS.diskHot), alpha * 0.14);
  g.fillTriangle(x - 8, y - 150, x + 8, y - 150, x + 30, y + 20);
  g.fillTriangle(x - 8, y - 150, x - 30, y + 20, x + 30, y + 20);
}

/**
 * The finale, as a full-screen painting. `el` is ms since it began:
 * 0–900 the earth turning in space with Astra's eclipse above it; 900–1900 the laser comes down;
 * 1900–2700 the planet cracks with light; 2700+ it bursts into slabs flung outward and a white-out.
 */
export const DOOM_MS = 3900;
export const DOOM_KILL_MS = 2700;
export function drawDoom(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, view: Phaser.Geom.Rectangle, el: number, t: number,
): void {
  const fade = Phaser.Math.Clamp(el / 300, 0, 1) * Phaser.Math.Clamp((DOOM_MS - el) / 400, 0, 1);
  g.fillStyle(MASS.hole, fade);
  g.fillRect(view.x - 200, view.y - 200, view.width + 400, view.height + 400);
  const rnd = seeded(7.7);
  for (let i = 0; i < 90; i++) {
    const sx = view.x + rnd() * view.width;
    const sy = view.y + rnd() * view.height;
    g.fillStyle(tint(ASTRA.farStar), fade * (0.3 + 0.6 * Math.abs(Math.sin(t * 1.4 + i))));
    g.fillCircle(sx, sy, 0.8 + rnd() * 1.4);
  }
  const ex = view.centerX;
  const ey = view.y + view.height * 0.66;
  const R = view.height * 0.27;
  const ax = view.centerX;
  const ay = view.y + view.height * 0.15;
  const burst = Phaser.Math.Clamp((el - DOOM_KILL_MS) / 900, 0, 1);
  const crack = Phaser.Math.Clamp((el - 1900) / 800, 0, 1);
  const beam = Phaser.Math.Clamp((el - 900) / 250, 0, 1) * (el < DOOM_KILL_MS + 200 ? 1 : 0);
  // Astra, far above: the eclipse, eyes shut, one hand lowered.
  eclipse(g, tint, ax, ay, t, fade, 0.05 + 0.1 * beam);
  g.fillStyle(MASS.hole, fade);
  g.fillCircle(ax, ay, 26);
  g.lineStyle(2, tint(MASS.eye), fade);
  g.lineBetween(ax - 11, ay - 3, ax - 4, ay - 2);
  g.lineBetween(ax + 4, ay - 2, ax + 11, ay - 3);
  if (burst <= 0) {
    // The earth: seas, continents drifting round, a swirl of cloud, a thin blue rim of air.
    g.fillStyle(tint(MASS.earthSea), fade);
    g.fillCircle(ex, ey, R);
    const lands: [number, number, number, number][] = [[-0.5, -0.3, 0.42, 0.3], [0.35, 0.1, 0.36, 0.5], [-0.15, 0.5, 0.3, 0.2], [0.6, -0.5, 0.2, 0.18]];
    for (const [lx, ly, lw, lh] of lands) {
      const dx = (((lx + t * 0.06 + 1.5) % 3) - 1.5);
      if (Math.abs(dx) > 0.95) continue;
      const squash = Math.sqrt(1 - dx * dx);
      g.fillStyle(tint(MASS.earthLand), fade);
      g.fillEllipse(ex + dx * R, ey + ly * R, lw * R * squash, lh * R);
    }
    for (let i = 0; i < 5; i++) {
      const dx = (((i * 0.61 + t * 0.09) % 2) - 1);
      const squash = Math.sqrt(Math.max(0, 1 - dx * dx));
      g.fillStyle(tint(MASS.earthCloud), fade * 0.55);
      g.fillEllipse(ex + dx * R * 0.92, ey + (i - 2) * R * 0.32, R * 0.5 * squash, R * 0.09);
    }
    g.fillStyle(MASS.hole, fade * 0.45);
    g.beginPath();
    g.arc(ex, ey, R, -Math.PI / 2, Math.PI / 2, false);
    g.fillPath();
    g.lineStyle(4, tint(MASS.ice), fade * 0.6);
    g.strokeCircle(ex, ey, R + 2);
    // Cracks of light tearing across it.
    if (crack > 0) {
      const cr = seeded(3.3);
      for (let i = 0; i < 11; i++) {
        let a = (i / 11) * TAU + cr() * 0.4;
        let px = ex;
        let py = ey - R * 0.2;
        const reach = R * 1.05 * crack;
        const segs = 5;
        for (let s = 0; s < segs; s++) {
          a += (cr() - 0.5) * 0.8;
          const nx = px + Math.cos(a) * (reach / segs);
          const ny = py + Math.sin(a) * (reach / segs);
          g.lineStyle(7 - s, tint(MASS.fire), fade * 0.7);
          g.lineBetween(px, py, nx, ny);
          g.lineStyle(3 - s * 0.4, tint(ASTRA.white), fade);
          g.lineBetween(px, py, nx, ny);
          px = nx;
          py = ny;
        }
      }
      g.fillStyle(tint(ASTRA.white), fade * crack * 0.5);
      g.fillCircle(ex, ey - R * 0.2, R * 0.4 * crack);
    }
  } else {
    // It comes apart: wedge slabs flung outward, tumbling, a core of white fire where it was.
    const k = easeOut(burst);
    const cr = seeded(5.1);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + cr() * 0.3;
      const d = R * (0.35 + 2.6 * k * (0.6 + 0.8 * cr()));
      const sx = ex + Math.cos(a) * d;
      const sy = ey + Math.sin(a) * d;
      const sz = R * (0.34 + 0.2 * cr()) * (1 - 0.4 * k);
      const rot = a + k * (cr() - 0.5) * 5;
      g.fillStyle(tint(i % 3 === 0 ? MASS.earthLand : MASS.earthSea), fade * (1 - 0.6 * burst));
      g.fillTriangle(
        sx + Math.cos(rot) * sz, sy + Math.sin(rot) * sz,
        sx + Math.cos(rot + 2.3) * sz * 0.8, sy + Math.sin(rot + 2.3) * sz * 0.8,
        sx + Math.cos(rot - 2.1) * sz * 0.7, sy + Math.sin(rot - 2.1) * sz * 0.7,
      );
      g.lineStyle(3, tint(MASS.fire), fade * (1 - burst));
      g.lineBetween(sx, sy, ex + Math.cos(a) * d * 0.5, ey + Math.sin(a) * d * 0.5);
    }
    g.fillStyle(tint(MASS.fire), fade * (1 - burst) * 0.8);
    g.fillCircle(ex, ey, R * (0.5 + 2.2 * k));
    g.fillStyle(tint(ASTRA.white), fade * (1 - burst));
    g.fillCircle(ex, ey, R * (0.3 + 1.5 * k));
    g.lineStyle(14 * (1 - burst), tint(ASTRA.white), fade * (1 - burst));
    g.strokeCircle(ex, ey, R * (0.8 + 4 * k));
  }
  if (beam > 0) {
    const w = 14 + 10 * Math.sin(t * 40) + 30 * crack;
    const by = burst > 0 ? ey : ey - R * 0.2;
    g.lineStyle(w * 2.2, tint(MASS.disk), fade * 0.3 * beam);
    g.lineBetween(ax, ay + 20, ex, by);
    g.lineStyle(w, tint(MASS.diskHot), fade * 0.8 * beam);
    g.lineBetween(ax, ay + 20, ex, by);
    g.lineStyle(w * 0.4, tint(ASTRA.white), fade * beam);
    g.lineBetween(ax, ay + 20, ex, by);
  }
  // The white-out at the instant it bursts.
  const flash = 1 - Phaser.Math.Clamp(Math.abs(el - DOOM_KILL_MS) / 260, 0, 1);
  if (flash > 0) {
    g.fillStyle(0xffffff, flash);
    g.fillRect(view.x - 200, view.y - 200, view.width + 400, view.height + 400);
  }
}

/**
 * The laugh: the screen goes black and Astra's eclipse leans in over the loser — eyes crescents
 * of gold, a jagged grin of light, shoulders shaking. `k` 0..1 fades it; `t` drives the shake.
 */
export function drawLaugh(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, view: Phaser.Geom.Rectangle, k: number, t: number,
): void {
  if (k <= 0.01) return;
  g.fillStyle(MASS.hole, 0.93 * k);
  g.fillRect(view.x - 200, view.y - 200, view.width + 400, view.height + 400);
  const shake = Math.sin(t * 26) * 5;
  const x = view.centerX;
  const y = view.y + view.height * 0.44 + shake;
  const R = view.height * 0.24;
  // The eclipse, blown up to fill the screen.
  for (let i = 0; i < 5; i++) {
    g.fillStyle(tint(i < 2 ? MASS.disk : MASS.diskHot), k * (0.06 + 0.05 * i));
    g.fillCircle(x, y, R + (5 - i) * 26);
  }
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    const len = R * (0.35 + ((i * 37) % 23) / 40) + 12 * Math.sin(t * 9 + i);
    g.fillStyle(tint(i % 2 ? MASS.diskHot : ASTRA.white), k * 0.6);
    g.fillTriangle(
      x + Math.cos(a - 0.05) * R, y + Math.sin(a - 0.05) * R,
      x + Math.cos(a) * (R + len), y + Math.sin(a) * (R + len),
      x + Math.cos(a + 0.05) * R, y + Math.sin(a + 0.05) * R,
    );
  }
  g.fillStyle(MASS.hole, k);
  g.fillCircle(x, y, R);
  g.lineStyle(5, tint(ASTRA.white), k);
  g.strokeCircle(x, y, R);
  // Laughing eyes: two upturned crescents.
  for (const side of [-1, 1]) {
    const ex = x + side * R * 0.36;
    const ey = y - R * 0.16;
    g.lineStyle(R * 0.085, tint(MASS.eye), k);
    g.beginPath();
    g.arc(ex, ey + R * 0.1, R * 0.17, Math.PI * 1.12, Math.PI * 1.88, false);
    g.strokePath();
  }
  // The grin: a wide zigzag of light, opening and shutting with each laugh.
  const open = 0.5 + 0.5 * Math.abs(Math.sin(t * 13));
  const teeth = 9;
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= teeth; i++) {
    const u = i / teeth;
    const px = x - R * 0.5 + u * R;
    const curve = Math.sin(u * Math.PI) * R * 0.2;
    pts.push(new Phaser.Math.Vector2(px, y + R * 0.26 + curve + (i % 2 ? R * 0.11 * open : 0)));
  }
  for (let i = teeth; i >= 0; i--) {
    const u = i / teeth;
    pts.push(new Phaser.Math.Vector2(x - R * 0.5 + u * R, y + R * 0.26 + Math.sin(u * Math.PI) * R * 0.06));
  }
  g.fillStyle(tint(MASS.eye), k);
  g.fillPoints(pts, true);
  // "HA" strokes flying off the shoulders.
  for (let i = 0; i < 6; i++) {
    const kk = (t * 1.1 + i / 6) % 1;
    const side = i % 2 ? 1 : -1;
    const hx = x + side * (R * 1.15 + kk * 90);
    const hy = y - R * 0.5 - kk * 70 + (i % 3) * 30;
    const s = 9 + 9 * kk;
    g.lineStyle(3, tint(ASTRA.white), k * (1 - kk));
    g.lineBetween(hx - s, hy - s, hx - s, hy + s);
    g.lineBetween(hx - s, hy, hx - s * 0.2, hy);
    g.lineBetween(hx - s * 0.2, hy - s, hx - s * 0.2, hy + s);
    g.lineBetween(hx + s * 0.2, hy + s, hx + s * 0.6, hy - s);
    g.lineBetween(hx + s * 0.6, hy - s, hx + s, hy + s);
  }
}

// ── One-shot effects ────────────────────────────────────────────────────────

export class AstraMassFx extends FxBase {
  /** Dust drawn in: motes streaking from the cloud into the body. */
  eat(x: number, y: number, to: () => { x: number; y: number }, shard: boolean): void {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * TAU;
      const d = 6 + Math.random() * 22;
      this.anim(8.6, 260 + Math.random() * 160, (g, t) => {
        const p = to();
        const k = easeIn(t);
        const sx = x + Math.cos(a) * d;
        const sy = y + Math.sin(a) * d;
        g.fillStyle(this.tint(shard ? MASS.rockLit : MASS.dustLit), 1 - t * 0.5);
        g.fillCircle(sx + (p.x - sx) * k, sy + (p.y - sy) * k, shard ? 2.4 : 1.6);
      });
    }
    this.anim(3.4, 300, (g, t) => {
      g.lineStyle(2 * (1 - t), this.tint(MASS.dustLit), 1 - t);
      g.strokeCircle(x, y, 26 * (1 - t));
    });
  }

  /** Mass knocked loose by a hit: grit thrown off the halo's rim. */
  shed(x: number, y: number, r: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      this.anim(8.6, 380, (g, t) => {
        const d = r + easeOut(t) * 40;
        g.fillStyle(this.tint(i % 2 ? MASS.dustLit : MASS.rockLit), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d + easeIn(t) * 10, 2.2 * (1 - t) + 0.6);
      });
    }
  }

  /** Antimatter leaving the hand: a ring of mercury drops snapping outward. */
  launch(x: number, y: number, ang: number): void {
    this.anim(8.8, 200, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = ang + (i - 2.5) * 0.3;
        const d = 8 + easeOut(t) * 20;
        g.fillStyle(this.tint(MASS.mercuryLit), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.4 * (1 - t));
      }
    });
  }

  /**
   * Annihilation: a hard white point, a mercury ring torn outward, a violet-white shockwave to the
   * edge of the blast, and a negative afterimage in the middle where matter stopped existing.
   */
  annihilate(x: number, y: number, r: number): void {
    this.scene.cameras.main.shake(140, 0.007);
    this.flashIn(x, y, r * 0.35, ASTRA.white, MASS.mercuryLit, 9.4);
    this.anim(9.2, 460, (g, t) => {
      const k = easeOut(t);
      const a = 1 - t;
      g.fillStyle(this.tint(MASS.hole), 0.75 * a);
      g.fillCircle(x, y, r * 0.28 * (1 - t * 0.5));
      g.fillStyle(this.tint(ASTRA.violet), 0.16 * a);
      g.fillCircle(x, y, r * k);
      g.lineStyle(9 * a + 1, this.tint(ASTRA.white), a);
      g.strokeCircle(x, y, r * k);
      g.lineStyle(4 * a + 1, this.tint(MASS.mercury), a * 0.9);
      g.strokeCircle(x, y, r * k * 0.8);
      g.lineStyle(2, this.tint(ASTRA.violetLit), a * 0.8);
      g.strokeCircle(x, y, r * k * 0.55);
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * TAU + 0.3;
        const d = r * k * (0.9 + 0.1 * (i % 3));
        g.fillStyle(this.tint(i % 2 ? MASS.mercuryLit : MASS.mercuryDark), a);
        g.fillCircle(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 3.5 * a + 0.8);
      }
    });
  }

  /** A photon striking: a small cross of light. */
  photonHit(x: number, y: number): void {
    this.anim(9.3, 160, (g, t) => {
      const s = 5 + 12 * t;
      g.lineStyle(2 * (1 - t) + 0.5, this.tint(MASS.photonCore), 1 - t);
      g.lineBetween(x - s, y, x + s, y);
      g.lineBetween(x, y - s, x, y + s);
      g.fillStyle(this.tint(MASS.photon), (1 - t) * 0.6);
      g.fillCircle(x, y, 6 * (1 - t) + 2);
    });
  }

  /**
   * The supernova: the shed mass blown outward as a ragged shell of flame — a white core, an
   * orange wall with tongues licking ahead of it, embers thrown past the edge, a scorched floor.
   */
  supernova(x: number, y: number, r: number): void {
    this.scene.cameras.main.shake(260, 0.012 + r / 16000);
    this.flashIn(x, y, r * 0.4, ASTRA.white, MASS.fireHot, 9.4);
    this.anim(3.5, 1500, (g, t) => {
      g.fillStyle(this.tint(ASTRA.void), 0.4 * (1 - t));
      g.fillCircle(x, y, r * 0.92);
    });
    this.anim(9.1, 620, (g, t) => {
      const k = easeOut(t);
      const a = 1 - easeIn(t);
      g.fillStyle(this.tint(MASS.fire), 0.3 * a);
      g.fillCircle(x, y, r * k);
      g.fillStyle(this.tint(MASS.fireHot), 0.34 * a);
      g.fillCircle(x, y, r * k * 0.7);
      g.fillStyle(this.tint(ASTRA.white), 0.5 * a);
      g.fillCircle(x, y, r * k * 0.34);
      const tongues = 26;
      for (let i = 0; i < tongues; i++) {
        const ang = (i / tongues) * TAU;
        const lick = 0.7 + 0.3 * Math.sin(i * 2.7 + t * 30);
        const r0 = r * k * 0.86;
        const r1 = r * k * (1 + 0.14 * lick);
        g.fillStyle(this.tint(i % 2 ? MASS.fire : MASS.fireHot), a);
        g.fillTriangle(
          x + Math.cos(ang - 0.09) * r0, y + Math.sin(ang - 0.09) * r0,
          x + Math.cos(ang) * r1, y + Math.sin(ang) * r1,
          x + Math.cos(ang + 0.09) * r0, y + Math.sin(ang + 0.09) * r0,
        );
      }
      g.lineStyle(7 * a + 1, this.tint(ASTRA.white), a);
      g.strokeCircle(x, y, r * k * 0.88);
    });
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * TAU;
      const d = r * (0.8 + Math.random() * 0.5);
      this.anim(9, 700 + Math.random() * 300, (g, t) => {
        const k = easeOut(t);
        g.fillStyle(this.tint(i % 3 ? MASS.fireHot : MASS.rockLit), 1 - t);
        g.fillCircle(x + Math.cos(ang) * d * k, y + Math.sin(ang) * d * k + easeIn(t) * 14, 3 * (1 - t) + 1);
      });
    }
  }

  /** Fusion igniting: the halo slams inward, then flares. */
  ignite(x: number, y: number, r: number): void {
    this.anim(9, 360, (g, t) => {
      const rr = r * (1.5 - 0.5 * easeOut(Math.min(1, t * 2)));
      g.lineStyle(6 * (1 - t) + 1, this.tint(MASS.fusion), 1 - t);
      g.strokeCircle(x, y, rr);
      g.lineStyle(2, this.tint(MASS.fireHot), 1 - t);
      g.strokeCircle(x, y, rr * 0.8);
    });
  }

  /** A shot melted in the furnace: it sags into a glowing droplet that falls into the core. */
  melt(x: number, y: number, to: () => { x: number; y: number }): void {
    this.anim(9, 300, (g, t) => {
      const p = to();
      const k = easeIn(t);
      const px = x + (p.x - x) * k;
      const py = y + (p.y - y) * k;
      g.fillStyle(this.tint(MASS.fire), 0.5 * (1 - t));
      g.fillCircle(px, py, 9 * (1 - t) + 2);
      g.fillStyle(this.tint(MASS.fireHot), 1 - t * 0.4);
      g.fillEllipse(px, py, 6 * (1 - t) + 2, 9 * (1 - t) + 2);
      g.fillStyle(this.tint(ASTRA.white), 1 - t);
      g.fillCircle(px, py, 2.2);
    });
  }

  /** A body cooking inside the furnace. */
  sear(x: number, y: number): void {
    this.anim(9, 260, (g, t) => {
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.5;
        const d = 10 + easeOut(t) * 22;
        g.fillStyle(this.tint(i % 2 ? MASS.fire : MASS.fireHot), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3.4 * (1 - t) + 0.6);
      }
    });
  }

  /** The comet on its way down: a target ring on the floor and a streak falling out of the sky. */
  cometFall(x: number, y: number, ms: number, r: number): void {
    this.anim(3.5, ms, (g, t) => {
      g.lineStyle(2, this.tint(MASS.ice), 0.4 + 0.6 * t);
      g.strokeEllipse(x, y, r * 2 * (1.5 - 0.5 * t), r * 1.5 * (1.5 - 0.5 * t));
      g.fillStyle(this.tint(MASS.ice), 0.1 + 0.15 * t);
      g.fillEllipse(x, y, r * 2, r * 1.5);
    });
    this.anim(9.5, ms, (g, t) => {
      const k = easeIn(t);
      const sx = x - 260 * (1 - k);
      const sy = y - 560 * (1 - k);
      for (let i = 0; i < 7; i++) {
        const b = i / 7;
        g.fillStyle(this.tint(i < 2 ? ASTRA.white : (i < 4 ? MASS.ice : MASS.fire)), 0.9 - b * 0.8);
        g.fillCircle(sx - 26 * b * 2.2, sy - 56 * b * 2.2, 13 - b * 9);
      }
    });
  }

  /** The comet landing: a kick of dust, a ring, ice chips. */
  cometImpact(x: number, y: number, r: number): void {
    this.scene.cameras.main.shake(180, 0.009);
    this.flashIn(x, y, r * 0.6, ASTRA.white, MASS.ice, 9.4);
    this.anim(9, 420, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(6 * (1 - t) + 1, this.tint(MASS.ice), 1 - t);
      g.strokeEllipse(x, y, r * 2.2 * k, r * 1.6 * k);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const d = r * (0.4 + 1.1 * k);
        g.fillStyle(this.tint(i % 2 ? MASS.rockLit : MASS.ice), 1 - t);
        g.fillRect(x + Math.cos(a) * d - 2, y + Math.sin(a) * d * 0.7 - 2 - 18 * Math.sin(t * Math.PI), 4, 4);
      }
    });
  }

  /** A launched comet striking: fire and stone thrown along its line of flight. */
  cometHit(x: number, y: number, ang: number, heat: number): void {
    this.scene.cameras.main.shake(160 + 240 * heat, 0.008 + 0.02 * heat);
    this.flashIn(x, y, 24 + 40 * heat, ASTRA.white, heat > 0.5 ? MASS.fire : MASS.ice, 9.4);
    this.anim(9.2, 420, (g, t) => {
      const k = easeOut(t);
      g.lineStyle(8 * (1 - t) + 1, this.tint(heat > 0.5 ? MASS.fireHot : MASS.rockLit), 1 - t);
      g.strokeCircle(x, y, (30 + 70 * heat) * k);
      for (let i = 0; i < 12; i++) {
        const a = ang + (i / 12 - 0.5) * 2.2;
        const d = (40 + 110 * heat) * k * (0.6 + 0.4 * ((i * 7) % 5) / 5);
        g.fillStyle(this.tint(i % 2 ? MASS.fire : MASS.rock), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 4 * (1 - t) + 1);
      }
    });
  }

  // ── Singularity ───────────────────────────────────────────────────────────

  /** The collapse: everything on screen is pulled to one point, which then inverts to white. */
  collapse(x: number, y: number): void {
    const cam = this.scene.cameras.main;
    cam.shake(700, 0.012);
    this.anim(58, 700, (g, t) => {
      const v = logicalView(this.scene);
      const k = easeIn(t);
      g.fillStyle(MASS.hole, 0.9 * k);
      g.fillRect(v.x - 200, v.y - 200, v.width + 400, v.height + 400);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU + t * 2;
        const r0 = 900 * (1 - k) + 30;
        g.lineStyle(2, this.tint(i % 2 ? ASTRA.starHot : ASTRA.white), 0.8);
        g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a + 0.2) * r0 * 0.7, y + Math.sin(a + 0.2) * r0 * 0.7);
      }
      g.fillStyle(MASS.hole, 1);
      g.fillCircle(x, y, 20 + 300 * k * k);
      g.lineStyle(4, this.tint(ASTRA.white), 1);
      g.strokeCircle(x, y, 20 + 300 * k * k);
    });
    this.scene.time.delayedCall(700, () => cam.flash(260, 255, 255, 255));
  }

  /** Leaving: the black tears open from the middle and the arena comes back through it. */
  release(x: number, y: number): void {
    const cam = this.scene.cameras.main;
    cam.flash(300, 255, 255, 255);
    this.anim(58, 500, (g, t) => {
      g.lineStyle(26 * (1 - t), this.tint(ASTRA.white), 1 - t);
      g.strokeCircle(x, y, 40 + easeOut(t) * 900);
    });
  }

  /** The high-energy laser: instant, thin, far too bright, with a negative core. */
  laser(x0: number, y0: number, x1: number, y1: number): void {
    this.scene.cameras.main.shake(120, 0.008);
    this.anim(9.6, 240, (g, t) => {
      const a = 1 - easeIn(t);
      g.lineStyle(26 * a, this.tint(MASS.disk), 0.3 * a);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(11 * a + 1, this.tint(ASTRA.white), a);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(3 * a, MASS.hole, a);
      g.lineBetween(x0, y0, x1, y1);
      g.fillStyle(this.tint(ASTRA.white), a);
      g.fillCircle(x1, y1, 16 * a + 4);
      g.fillCircle(x0, y0, 9 * a + 2);
    });
  }

  /**
   * A body shattered by the laser: its silhouette breaks into black shards with white edges that
   * fly apart in a burst of heat, hang, then fall back together on wherever the body is now.
   */
  shatterBody(at: () => { x: number; y: number }, r: number): void {
    const start = at();
    this.flashIn(start.x, start.y, r * 1.6, ASTRA.white, MASS.fire, 9.5);
    const shards = 12;
    const seeds: { a: number; d: number; rot: number; sz: number }[] = [];
    for (let i = 0; i < shards; i++) {
      seeds.push({ a: (i / shards) * TAU + Math.random() * 0.4, d: 44 + Math.random() * 60, rot: Math.random() * TAU, sz: r * (0.35 + Math.random() * 0.35) });
    }
    this.anim(9.7, 900, (g, t) => {
      const p = at();
      // Out fast, hold, then back in.
      const out = t < 0.3 ? easeOut(t / 0.3) : (t < 0.55 ? 1 : 1 - easeIn((t - 0.55) / 0.45));
      const heat = Math.max(0, 1 - t * 2.4);
      if (heat > 0) {
        g.fillStyle(this.tint(MASS.fire), 0.45 * heat);
        g.fillCircle(p.x, p.y, r * (1 + 3.4 * (1 - heat)));
        g.lineStyle(6 * heat, this.tint(MASS.fireHot), heat);
        g.strokeCircle(p.x, p.y, r * (1 + 4.4 * (1 - heat)));
      }
      for (const s of seeds) {
        const sx = p.x + Math.cos(s.a) * s.d * out;
        const sy = p.y + Math.sin(s.a) * s.d * out;
        const rot = s.rot + out * 3;
        const pts = [0, 2.2, 4.1].map((o) => new Phaser.Math.Vector2(sx + Math.cos(rot + o) * s.sz, sy + Math.sin(rot + o) * s.sz));
        g.fillStyle(MASS.hole, 1);
        g.fillPoints(pts, true);
        g.lineStyle(1.6, MASS.rim, 1);
        g.strokePoints(pts, true);
        if (t > 0.55) {
          g.lineStyle(1, this.tint(MASS.fireHot), 0.5 * (1 - t));
          g.lineBetween(sx, sy, p.x, p.y);
        }
      }
    });
  }

  /** Appearing somewhere else: a vertical slit of light that opens and shuts. */
  blink(x: number, y: number): void {
    this.anim(9.6, 220, (g, t) => {
      const w = Math.sin(t * Math.PI) * 26;
      g.fillStyle(this.tint(ASTRA.white), 1 - t * 0.5);
      g.fillEllipse(x, y, w, 76);
      g.lineStyle(2, this.tint(MASS.diskHot), 1 - t);
      g.strokeEllipse(x, y, w + 10, 90);
    });
  }

  /** The punch winding up: lines of force converging on the fist. */
  windup(at: () => { x: number; y: number }, ms: number): void {
    this.anim(9.6, ms, (g, t) => {
      const p = at();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + t * 1.5;
        const r0 = 140 * (1 - t) + 20;
        g.lineStyle(2 + 2 * t, this.tint(i % 2 ? ASTRA.white : MASS.diskHot), 0.3 + 0.7 * t);
        g.lineBetween(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0, p.x + Math.cos(a) * (r0 * 0.6), p.y + Math.sin(a) * (r0 * 0.6));
      }
      g.fillStyle(this.tint(ASTRA.white), t);
      g.fillCircle(p.x, p.y, 4 + 10 * t);
    });
  }

  /** A full-view impact frame: one stark plate, black on white or white on black. */
  impactPlate(x: number, y: number, ang: number, bodies: { x: number; y: number }[], invert: boolean, ms: number): void {
    const cam = this.scene.cameras.main;
    const v = logicalView(this.scene);
    const g = this.gfx(60);
    const bg = invert ? 0xffffff : 0x000000;
    const fg = invert ? 0x000000 : 0xffffff;
    g.fillStyle(bg, 1);
    g.fillRect(v.x - 200, v.y - 200, v.width + 400, v.height + 400);
    g.fillStyle(fg, 1);
    const rnd = seeded(x * 0.7 + y * 1.3 + (invert ? 9 : 2));
    // Speed lines raked along the punch.
    for (let i = 0; i < 34; i++) {
      const off = (rnd() - 0.5) * v.height * 1.4;
      const len = 200 + rnd() * 600;
      const s = (rnd() - 0.5) * v.width;
      const px = x + Math.cos(ang) * s + Math.cos(ang + Math.PI / 2) * off;
      const py = y + Math.sin(ang) * s + Math.sin(ang + Math.PI / 2) * off;
      const w = 1 + rnd() * 5;
      g.fillTriangle(
        px + Math.cos(ang + Math.PI / 2) * w, py + Math.sin(ang + Math.PI / 2) * w,
        px - Math.cos(ang + Math.PI / 2) * w, py - Math.sin(ang + Math.PI / 2) * w,
        px + Math.cos(ang) * len, py + Math.sin(ang) * len,
      );
    }
    // The hit: a jagged star, stretched along the blow.
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 20; i++) {
      const a = ang + (i / 20) * TAU;
      const r = i % 2 ? 26 : 70 + Math.abs(Math.cos(a - ang)) * 90 + rnd() * 30;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
    g.fillPoints(pts, true);
    for (const b of bodies) g.fillCircle(b.x, b.y, 23);
    g.fillStyle(bg, 1);
    g.fillCircle(x, y, 14);
    this.scene.time.delayedCall(ms, () => { if (g.active) g.destroy(); });
  }

  /** The fist landing: a crater of light and a cone of force along the blow. */
  punch(x: number, y: number, ang: number): void {
    this.anim(9.6, 520, (g, t) => {
      const a = 1 - easeIn(t);
      const k = easeOut(t);
      g.fillStyle(this.tint(ASTRA.white), a * 0.9);
      g.fillCircle(x, y, 30 * (1 - t) + 6);
      for (let i = 0; i < 3; i++) {
        g.lineStyle(10 * a / (i + 1) + 1, this.tint(i ? MASS.diskHot : ASTRA.white), a);
        g.strokeCircle(x, y, (30 + i * 34) + k * (150 + i * 40));
      }
      for (let i = 0; i < 9; i++) {
        const ca = ang + (i - 4) * 0.13;
        g.lineStyle(5 * a + 1, this.tint(ASTRA.white), a);
        g.lineBetween(x + Math.cos(ca) * 30, y + Math.sin(ca) * 30, x + Math.cos(ca) * (60 + k * 260), y + Math.sin(ca) * (60 + k * 260));
      }
    });
  }

  /** A body driven into the wall of the black hole: white cracks that hang in the dark and fade. */
  whiteCrash(x: number, y: number, seed: number): void {
    this.scene.cameras.main.shake(320, 0.024);
    this.flashIn(x, y, 46, ASTRA.white, ASTRA.white, 9.6);
    this.anim(8.7, 2600, (g, t) => {
      const a = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      floorCracks(g, this.tint, x, y, 150, a, seed, true);
      g.lineStyle(3, MASS.rim, a * 0.9);
      g.strokeCircle(x, y, 16);
    });
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU;
      const d = 30 + Math.random() * 90;
      this.anim(9.4, 520, (g, t) => {
        const k = easeOut(t);
        g.fillStyle(MASS.rim, 1 - t);
        g.fillRect(x + Math.cos(a) * d * k - 3, y + Math.sin(a) * d * k - 3, 6, 6);
      });
    }
  }

  /** The snap: a spark off the fingers and a ring that crosses the whole view at once. */
  snap(x: number, y: number): void {
    this.anim(9.6, 300, (g, t) => {
      const a = 1 - t;
      g.fillStyle(this.tint(ASTRA.white), a);
      g.fillCircle(x, y, 9 * a + 2);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU;
        g.lineStyle(2, this.tint(MASS.eye), a);
        g.lineBetween(x + Math.cos(ang) * 8, y + Math.sin(ang) * 8, x + Math.cos(ang) * (16 + 30 * t), y + Math.sin(ang) * (16 + 30 * t));
      }
      g.lineStyle(3 * a, this.tint(ASTRA.white), a * 0.8);
      g.strokeCircle(x, y, easeOut(t) * 700);
    });
  }

  /** Two lives changing hands: a ribbon of light each way between the bodies. */
  swapLives(a: () => { x: number; y: number }, b: () => { x: number; y: number }): void {
    this.anim(9.5, 520, (g, t) => {
      const p = a();
      const q = b();
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      const nx = -(q.y - p.y) * 0.25;
      const ny = (q.x - p.x) * 0.25;
      for (const dir of [1, -1]) {
        const cx = mx + nx * dir;
        const cy = my + ny * dir;
        g.lineStyle(3, this.tint(dir > 0 ? MASS.eye : 0xff4d6a), 1 - t);
        g.beginPath();
        for (let i = 0; i <= 14; i++) {
          const u = i / 14;
          const px = (1 - u) * (1 - u) * p.x + 2 * (1 - u) * u * cx + u * u * q.x;
          const py = (1 - u) * (1 - u) * p.y + 2 * (1 - u) * u * cy + u * u * q.y;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
        const u = dir > 0 ? easeOut(t) : 1 - easeOut(t);
        const hx = (1 - u) * (1 - u) * p.x + 2 * (1 - u) * u * cx + u * u * q.x;
        const hy = (1 - u) * (1 - u) * p.y + 2 * (1 - u) * u * cy + u * u * q.y;
        g.fillStyle(this.tint(ASTRA.white), 1);
        g.fillCircle(hx, hy, 5);
      }
    });
  }

  /** The dodge-and-mock: three small bursts of "ha" off the body. */
  mock(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 110, () => {
        this.anim(9.6, 360, (g, t) => {
          const hx = x + (i - 1) * 22;
          const hy = y - 40 - t * 22;
          const s = 5;
          g.lineStyle(2, this.tint(MASS.eye), 1 - t);
          g.lineBetween(hx - s, hy - s, hx - s, hy + s);
          g.lineBetween(hx - s, hy, hx, hy);
          g.lineBetween(hx, hy - s, hx, hy + s);
          g.lineBetween(hx + 3, hy + s, hx + 6, hy - s);
          g.lineBetween(hx + 6, hy - s, hx + 9, hy + s);
        });
      });
    }
  }
}

/**
 * The punch gathering: the dark closes in round the fist and lines of force converge on it.
 * `k` 0..1 over the wind-up; drawn by the kit (not a tween) so slowed time cannot stretch it.
 */
export function punchCharge(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, k: number, t: number,
): void {
  if (k <= 0) return;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + t * 2.2;
    const r0 = 170 * (1 - k) + 26;
    g.lineStyle(1.5 + 3 * k, tint(i % 2 ? ASTRA.white : MASS.diskHot), 0.25 + 0.75 * k);
    g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r0 * 0.55, y + Math.sin(a) * r0 * 0.55);
  }
  g.lineStyle(3, tint(ASTRA.white), k);
  g.strokeCircle(x, y, 40 * (1 - k) + 8);
  g.fillStyle(tint(ASTRA.white), 0.4 + 0.6 * k);
  g.fillCircle(x, y, 5 + 9 * k + 2 * Math.sin(t * 40));
}
