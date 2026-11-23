import type Phaser from 'phaser';
import { OBS, councilMask, starfield, mixC, lit, dim } from '../../../art/PinnacleArt';
import { mulberry } from '../../../art/IsleArt';
import { BANDS, CX, CY, DEFAULT_PLANETS, OUTRO, RING_IN, STAR_R, planetPos, shadowHalf, type Planet, type StarSky } from './starSky';

/**
 * Act III's art: deep space (painted once), the ring disc turning round him (every frame), the
 * two worlds, and HIM — the star with the King's face, the last of his shell in orbit.
 *
 * Palette: the Pinnacle's warm star (OBS.star / starCore / starDeep) is now the whole sky's light;
 * the black glass survives only as the fragments of shell; violet is what is left of the mask.
 */

type G = Phaser.GameObjects.Graphics;
interface P { x: number; y: number }

/** Ring ice, lit by the star. */
export const RING_ICE = 0xe8d7a8;
/** Ring dust in the gaps. */
export const RING_DUST = 0x8a7896;
/** The cold blue of shadow — and of comets. */
export const COLD = 0x9ad8ff;
export const SHADE = 0x0a1430;
/** The ember red a dying star cools to. */
export const EMBER = 0xc8401a;

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const sm = (v: number, a: number, b: number): number => {
  const t = clamp((v - a) / (b - a || 1), 0, 1);
  return t * t * (3 - 2 * t);
};

// ── Deep space (drawArena) ───────────────────────────────────────────

/** A soft cloud: many faint discs along a curve. */
function nebula(g: G, rng: () => number, pts: P[], colors: number[], size: number, n: number, a: number): void {
  for (let i = 0; i < n; i++) {
    const f = rng() * (pts.length - 1);
    const i0 = Math.floor(f), k = f - i0;
    const p0 = pts[i0], p1 = pts[Math.min(pts.length - 1, i0 + 1)];
    const x = p0.x + (p1.x - p0.x) * k + (rng() - 0.5) * size * 1.4;
    const y = p0.y + (p1.y - p0.y) * k + (rng() - 0.5) * size;
    g.fillStyle(colors[Math.floor(rng() * colors.length)], a * (0.5 + rng()));
    g.fillCircle(x, y, size * (0.35 + rng() * 0.8));
  }
}

/** A world far off, lit from `lightAng`: a disc, its lit limb, its night, a breath of atmosphere. */
function farWorld(g: G, x: number, y: number, r: number, base: number, litC: number, atmo: number, lightAng: number, bands = 0, ring = false): void {
  const lx = Math.cos(lightAng), ly = Math.sin(lightAng);
  if (ring) {
    g.lineStyle(r * 0.18, lit(base, 0.3), 0.35); g.strokeEllipse(x, y, r * 4.2, r * 1.1);
  }
  g.fillStyle(atmo, 0.08); g.fillCircle(x, y, r * 1.12);
  g.fillStyle(dim(base, 0.55), 1); g.fillCircle(x, y, r);
  for (let i = 1; i <= 5; i++) {
    const o = r * 0.09 * i;
    g.fillStyle(mixC(base, litC, i / 5), 0.55);
    g.fillCircle(x + lx * o, y + ly * o, r - o);
  }
  for (let b = 0; b < bands; b++) {
    const dy = (b / Math.max(1, bands - 1) - 0.5) * r * 1.5;
    const ch = Math.sqrt(Math.max(0, r * r - dy * dy));
    g.fillStyle(b % 2 ? dim(base, 0.3) : lit(base, 0.15), 0.25);
    g.fillEllipse(x, y + dy, ch * 1.9, r * 0.1);
  }
  // Night: a thick stroke along the dark limb.
  g.lineStyle(r * 0.55, 0x000000, 0.55);
  g.beginPath(); g.arc(x, y, r * 0.72, lightAng + Math.PI - 1.45, lightAng + Math.PI + 1.45); g.strokePath();
  g.lineStyle(Math.max(1, r * 0.05), lit(atmo, 0.4), 0.7);
  g.beginPath(); g.arc(x, y, r, lightAng - 1.2, lightAng + 1.2); g.strokePath();
  if (ring) {
    // The near half of the ring passes in front.
    g.lineStyle(r * 0.18, lit(base, 0.4), 0.55);
    g.beginPath(); g.arc(x, y, r * 2.1, 0.15, Math.PI - 0.15); g.strokePath();
  }
}

/** A distant spiral galaxy. */
function galaxy(g: G, x: number, y: number, s: number, rot: number, rng: () => number): void {
  g.fillStyle(0xd8c8ff, 0.05); g.fillEllipse(x, y, s * 2.6, s * 1.2);
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 46; i++) {
      const f = i / 46;
      const a = rot + arm * Math.PI + f * 4.2;
      const r = s * (0.12 + f * 1.05);
      const px = x + Math.cos(a) * r + (rng() - 0.5) * 4, py = y + Math.sin(a) * r * 0.45 + (rng() - 0.5) * 3;
      g.fillStyle(f < 0.3 ? 0xffe8c0 : 0xb8c8ff, 0.5 * (1 - f) + 0.08);
      g.fillCircle(px, py, 1.4 * (1 - f) + 0.5);
    }
  }
  g.fillStyle(0xfff0d0, 0.5); g.fillEllipse(x, y, s * 0.4, s * 0.2);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, 1.6);
}

/**
 * The floor of Act III, painted once: there is no floor. Deep space, a violet-and-amber nebula
 * lit by him, far stars, a galaxy, a great dark world half off the bottom-left with a lit
 * crescent, a small ringed one up the top right, and — very small, lower right — a blue world
 * with a sea on it, the one the isles are on.
 */
export function drawSpace(g: G, W: number, H: number): void {
  const rng = mulberry(31337);
  // The dark, very slightly warmer towards him.
  for (let i = 0; i < 18; i++) {
    g.fillStyle(mixC(0x04030a, 0x0c0818, Math.sin((i / 17) * Math.PI)), 1);
    g.fillRect(0, (H / 18) * i, W, H / 18 + 1);
  }
  // Nebulae: a violet river behind the ring, a magenta knot, teal far off, amber where he lights them.
  nebula(g, rng, [{ x: -60, y: 120 }, { x: 260, y: 220 }, { x: 560, y: 160 }, { x: 1000, y: 260 }], [0x3a1a6a, 0x2a1450, 0x5a2a7a], 120, 90, 0.035);
  nebula(g, rng, [{ x: 640, y: 520 }, { x: 820, y: 600 }, { x: 1000, y: 560 }], [0x7a2a6a, 0x5a1a4a, 0xa04a7a], 90, 60, 0.035);
  nebula(g, rng, [{ x: 40, y: 420 }, { x: 160, y: 520 }], [0x1a4a6a, 0x1a3a5a], 80, 40, 0.035);
  nebula(g, rng, [{ x: 360, y: 300 }, { x: 600, y: 400 }], [0x6a3a1a, 0x8a4a1a], 130, 40, 0.025);
  // Dust lanes, dark across the bright.
  nebula(g, rng, [{ x: 120, y: 260 }, { x: 420, y: 190 }, { x: 760, y: 230 }], [0x000000], 40, 50, 0.12);
  starfield(g, 0, 0, W, H, rng, 520, 0, 0xdcd8ff);
  // A few bright stars with their spikes.
  for (let i = 0; i < 16; i++) {
    const x = rng() * W, y = rng() * H, s = 3 + rng() * 6;
    const c = rng() < 0.5 ? 0xffffff : rng() < 0.5 ? 0xbfd4ff : OBS.star;
    g.fillStyle(c, 0.12); g.fillCircle(x, y, s * 1.4);
    g.lineStyle(1, c, 0.5); g.lineBetween(x - s * 2, y, x + s * 2, y); g.lineBetween(x, y - s * 2, x, y + s * 2);
    g.fillStyle(0xffffff, 0.95); g.fillCircle(x, y, 1.3);
  }
  galaxy(g, 846, 196, 38, 0.4, rng);
  galaxy(g, 120, 140, 18, 2.1, rng);
  // The great dark world, lit from him (upper right of it).
  const la = Math.atan2(CY - 660, CX - 70);
  farWorld(g, 70, 660, 190, 0x3a2a4a, 0xd89a5a, 0xffb070, la, 9);
  farWorld(g, 880, 112, 15, 0x6a5a8a, 0xe8d0a0, 0xffe0b0, Math.atan2(CY - 112, CX - 880), 3, true);
  // Home: small and blue, with cloud.
  const hx = 902, hy = 586;
  farWorld(g, hx, hy, 11, 0x1a4a8a, 0x5ab0ff, 0x9ad8ff, Math.atan2(CY - hy, CX - hx), 0);
  g.fillStyle(0xffffff, 0.5); g.fillEllipse(hx - 2, hy - 3, 9, 2.4); g.fillEllipse(hx + 3, hy + 2, 7, 2);
  g.fillStyle(0xd8e8ff, 0.8); g.fillCircle(hx + 17, hy - 6, 1.6);
  // Vignette.
  for (let i = 0; i < 6; i++) {
    g.lineStyle(60, 0x000000, 0.08);
    g.strokeRect(-30 + i * 10, -30 + i * 10, W + 60 - i * 20, H + 60 - i * 20);
  }
}

// ── The ring disc (drawBackdrop) ─────────────────────────────────────

interface Mote { r: number; a: number; size: number; tone: number; band: number }
const MOTES: Mote[] = (() => {
  const rng = mulberry(4242);
  const out: Mote[] = [];
  const per = [30, 34, 38, 44, 52, 70];
  BANDS.forEach(([r0, r1], band) => {
    const top = band === BANDS.length - 1 ? 600 : r1;
    for (let i = 0; i < per[band]; i++) {
      out.push({ r: r0 + 4 + rng() * (top - r0 - 8), a: rng() * TAU, size: 0.8 + rng() * (band < 3 ? 2.4 : 3.2), tone: rng(), band });
    }
  });
  return out;
})();

/** Keplerian: the inner ring turns faster than the outer. */
export const ringOmega = (r: number): number => 0.16 * Math.pow(150 / r, 1.5);

const BAND_TONE = [0xf2dcae, 0xb8a0c8, 0xe0c890, 0x8a7aa8, 0xd8c098, 0x6a5a8a];

/** The shadow a world throws across the ring, as a polygon reaching `far`. */
export function shadowPoly(p: Planet, far = 900): P[] {
  const pp = planetPos(p);
  const ha = shadowHalf(p);
  const nx = -Math.sin(p.angle), ny = Math.cos(p.angle);
  return [
    { x: pp.x - nx * p.r, y: pp.y - ny * p.r },
    { x: CX + Math.cos(p.angle - ha) * far, y: CY + Math.sin(p.angle - ha) * far },
    { x: CX + Math.cos(p.angle + ha) * far, y: CY + Math.sin(p.angle + ha) * far },
    { x: pp.x + nx * p.r, y: pp.y + ny * p.r },
  ];
}

/**
 * The living floor, every frame: the corona's burn-band, the ring bands with their Cassini gaps
 * and their ice turning round him (dragged towards a black hole if one is open), each world's
 * shadow lying across the ring, and the worlds themselves.
 */
export function drawRings(g: G, t: number, sky: StarSky | null, W: number, H: number): void {
  const fade = (1 - OUTRO.k * 0.85) * RING_IN.k;
  if (fade <= 0.01) return;
  const nova = sky?.nova ?? 0;
  const spent = sky && sky.spentUntil > 0 ? 1 : 0;
  const glow = fade * (1 + nova * 0.8);
  // Bands: a wide translucent stroke each, brighter nearer him, ringlets and gaps.
  BANDS.forEach(([r0, r1], i) => {
    const mid = (r0 + r1) / 2;
    const near = 1 / (1 + (mid - 120) / 260);
    const c = mixC(BAND_TONE[i], 0xffffff, nova * 0.5);
    g.lineStyle(r1 - r0 - 4, c, (i === BANDS.length - 1 ? 0.05 : 0.11) * near * glow);
    g.strokeCircle(CX, CY, mid);
    for (let k = 1; k <= 3; k++) {
      g.lineStyle(1, lit(c, 0.3), 0.08 * near * glow);
      g.strokeCircle(CX, CY, r0 + ((r1 - r0) * k) / 4 + Math.sin(t * 0.3 + i + k) * 1.5);
    }
    g.lineStyle(3, 0x000000, 0.4 * fade);
    g.strokeCircle(CX, CY, r1);
    g.lineStyle(1, lit(c, 0.5), 0.18 * near * glow);
    g.strokeCircle(CX, CY, r1 - 3);
  });
  // The corona's band: the warmth you should not stand in.
  const fl = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
  g.lineStyle(24, OBS.starDeep, 0.16 * fl * fade); g.strokeCircle(CX, CY, 108);
  g.lineStyle(2, OBS.star, 0.35 * fl * fade); g.strokeCircle(CX, CY, 120);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + t * 0.4;
    const r = 106 + Math.sin(t * 5 + i * 2.3) * 8;
    g.fillStyle(i % 2 ? OBS.starDeep : OBS.star, 0.4 * fade);
    g.fillCircle(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 1.4);
  }
  // The ice and rock of the ring, turning.
  const hole = sky?.hole;
  for (const m of MOTES) {
    const a = m.a + t * ringOmega(m.r);
    let x = CX + Math.cos(a) * m.r, y = CY + Math.sin(a) * m.r;
    let sx = 0, sy = 0;
    if (hole && hole.k > 0) {
      const dx = hole.x - x, dy = hole.y - y;
      const d = Math.hypot(dx, dy);
      const f = hole.k * 0.55 * Math.exp(-d / 170);
      x += dx * f; y += dy * f;
      sx = dx * f * 0.6; sy = dy * f * 0.6;
    }
    if (x < -8 || x > W + 8 || y < 80 || y > H + 8) continue;
    const near = 1 / (1 + (m.r - 120) / 220);
    const c = m.tone < 0.6 ? RING_ICE : m.tone < 0.85 ? RING_DUST : OBS.edge;
    if (sx || sy) { g.lineStyle(m.size, c, 0.35 * fade); g.lineBetween(x, y, x - sx, y - sy); }
    g.fillStyle(c, (0.35 + near * 0.5) * fade * (spent ? 0.6 : 1));
    g.fillCircle(x, y, m.size);
    if (m.tone > 0.93) { g.fillStyle(0xffffff, 0.7 * fade); g.fillCircle(x - m.size * 0.3, y - m.size * 0.3, m.size * 0.4); }
  }
  // The worlds' shadows on the ring — always there, always the same shape as the shelter.
  const planets = sky?.planets ?? DEFAULT_PLANETS;
  for (const p of planets) {
    g.fillStyle(SHADE, (0.42 + nova * 0.3) * fade);
    g.fillPoints(shadowPoly(p), true);
  }
  for (const p of planets) drawPlanet(g, p, t, fade);
}

/** One of the two worlds: lit on the side that faces him, its shadow side black. */
export function drawPlanet(g: G, p: Planet, t: number, alpha = 1): void {
  const { x, y } = planetPos(p);
  const r = p.r;
  const la = p.angle + Math.PI; // towards the star
  const lx = Math.cos(la), ly = Math.sin(la);
  // A racing world smears along its orbit.
  if (p.race > 0) {
    const dir = Math.sign(p.omega);
    for (let i = 1; i <= 6; i++) {
      const a = p.angle - dir * i * 0.07;
      g.fillStyle(p.kind === 'ash' ? 0xff7a3a : 0xc8a8ff, 0.12 * (1 - i / 7) * alpha);
      g.fillCircle(CX + Math.cos(a) * p.orbit, CY + Math.sin(a) * p.orbit, r * (1 - i * 0.06));
    }
  }
  if (p.kind === 'crown') {
    // The Crownworld: a gas giant with a halo of its own ring (seen from above) and a glass moon.
    g.lineStyle(5, 0xb8a0d8, 0.22 * alpha); g.strokeCircle(x, y, r * 1.62);
    g.lineStyle(2, 0xe8d0a0, 0.35 * alpha); g.strokeCircle(x, y, r * 1.85);
    g.lineStyle(1, 0xffffff, 0.15 * alpha); g.strokeCircle(x, y, r * 1.45);
    g.fillStyle(0x4a3468, alpha); g.fillCircle(x, y, r);
    const stripes = [0x6a4a8a, 0xb08a5a, 0x5a3a7a, 0xd8b078, 0x4a3a6a, 0x9a7aa8, 0x3a2a5a];
    const spin = t * 0.5;
    stripes.forEach((c, i) => {
      const dy = (i / (stripes.length - 1) - 0.5) * r * 1.6;
      const ch = Math.sqrt(Math.max(0, r * r - dy * dy));
      g.fillStyle(c, 0.75 * alpha);
      g.fillEllipse(x + Math.sin(spin + i) * 1.5, y + dy, ch * 1.95, r * 0.24);
    });
    // The storm eye, turning with the world.
    const ex = x + Math.cos(spin) * r * 0.45, ey = y + r * 0.25;
    if (Math.cos(spin) > -0.2) {
      g.fillStyle(0xe85a3a, 0.7 * alpha); g.fillEllipse(ex, ey, r * 0.36, r * 0.18);
      g.fillStyle(0xffb090, 0.6 * alpha); g.fillEllipse(ex, ey, r * 0.18, r * 0.08);
    }
  } else {
    // Ashfall: a cinder world, cracked, its seas still molten.
    g.fillStyle(0x3a1a14, alpha); g.fillCircle(x, y, r);
    g.fillStyle(0x6a2e1e, alpha); g.fillCircle(x + lx * r * 0.18, y + ly * r * 0.18, r * 0.82);
    const spin = t * 0.7;
    for (let i = 0; i < 5; i++) {
      const a = spin + i * 1.3;
      const rr = r * (0.25 + (i % 3) * 0.2);
      const cx = x + Math.cos(a) * rr, cy = y + Math.sin(a) * rr * 0.9;
      if (Math.hypot(cx - x, cy - y) > r * 0.8) continue;
      g.fillStyle(0xff6a2a, 0.75 * alpha); g.fillCircle(cx, cy, r * 0.13);
      g.lineStyle(1.2, 0xffa050, 0.6 * alpha); g.lineBetween(cx, cy, cx + Math.cos(a + 1.6) * r * 0.3, cy + Math.sin(a + 1.6) * r * 0.3);
    }
    g.fillStyle(0x24100c, 0.6 * alpha);
    g.fillCircle(x - lx * r * 0.2 + 3, y - ly * r * 0.2, r * 0.18);
  }
  // Lit limb toward him; night away.
  g.lineStyle(r * 0.55, 0x000000, 0.6 * alpha);
  g.beginPath(); g.arc(x, y, r * 0.72, la + Math.PI - 1.35, la + Math.PI + 1.35); g.strokePath();
  g.lineStyle(Math.max(1.5, r * 0.1), OBS.star, 0.85 * alpha);
  g.beginPath(); g.arc(x, y, r - 1, la - 1.1, la + 1.1); g.strokePath();
  g.fillStyle(0xffffff, 0.35 * alpha); g.fillCircle(x + lx * r * 0.55, y + ly * r * 0.55, r * 0.14);
  if (p.kind === 'crown') {
    const ma = t * 1.1;
    const mx = x + Math.cos(ma) * r * 2.25, my = y + Math.sin(ma) * r * 2.25;
    g.fillStyle(OBS.glass, alpha); g.fillCircle(mx, my, 4.5);
    g.fillStyle(OBS.star, 0.8 * alpha); g.fillCircle(mx + lx * 1.5, my + ly * 1.5, 2.2);
    g.lineStyle(1, OBS.seam, 0.7 * alpha); g.lineBetween(mx - 3, my + 2, mx + 2, my - 3);
  }
}

// ── HIM ──────────────────────────────────────────────────────────────

/** How the star is painted on a given frame. */
export interface StarLook {
  /** Size against the act's star (1 = the 78 px photosphere). */
  scale?: number;
  /** 0–1 brightness of the halo. */
  heat?: number;
  /** 0–1 length of the crown of rays. */
  rays?: number;
  /** 0–1 how much of the face shows. */
  face?: number;
  /** 0–1 the Supernova charging: swells and whitens. */
  nova?: number;
  /** 0–1 spent after a Supernova: dim, red, eyes shut. */
  spent?: number;
  /** 0–1 going out (the fall). */
  gutter?: number;
  /** 0–1 how present the orbiting shell is (and how many of its fragments are away). */
  shell?: number;
  shardsOut?: number;
  facing?: number;
  hurt?: boolean;
  castGlow?: number;
  /** 0–1 of his pool left: lower burns more restlessly. */
  hp?: number;
}

/** Fixed granulation cells on the photosphere (polar, unit radius). */
const CELLS: { r: number; a: number; s: number; hot: boolean }[] = (() => {
  const rng = mulberry(777);
  return Array.from({ length: 40 }, () => ({ r: Math.sqrt(rng()) * 0.9, a: rng() * TAU, s: 0.05 + rng() * 0.06, hot: rng() < 0.5 }));
})();

/** The mask's outline, as a unit kite — burned into his face. */
const KITE: P[] = [
  { x: -0.34, y: -1 }, { x: -0.07, y: -0.82 }, { x: 0, y: -1.06 }, { x: 0.07, y: -0.82 }, { x: 0.34, y: -1 },
  { x: 0.62, y: -0.28 }, { x: 0.38, y: 0.5 }, { x: 0, y: 1 }, { x: -0.38, y: 0.5 }, { x: -0.62, y: -0.28 },
];

/** A fragment of the shell: a rotated sliver of black glass, its star-side edge lit gold. */
export function shellShard(g: G, x: number, y: number, s: number, rot: number, towardStar: number, alpha = 1): void {
  const pts: P[] = [[-0.5, -0.2], [-0.1, -0.55], [0.55, -0.1], [0.3, 0.45], [-0.35, 0.35]].map(([px, py]) => ({
    x: x + (px * Math.cos(rot) - py * Math.sin(rot)) * s * 2,
    y: y + (px * Math.sin(rot) + py * Math.cos(rot)) * s * 2,
  }));
  g.fillStyle(OBS.glass, alpha); g.fillPoints(pts, true);
  g.fillStyle(OBS.facet, 0.9 * alpha); g.fillTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
  g.lineStyle(1, OBS.edge, 0.6 * alpha); g.strokePoints(pts, true);
  // The edge that faces him burns gold.
  let best = 0, bd = -1e9;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const mx = (a.x + b.x) / 2 - x, my = (a.y + b.y) / 2 - y;
    const d = mx * Math.cos(towardStar) + my * Math.sin(towardStar);
    if (d > bd) { bd = d; best = i; }
  }
  const a = pts[best], b = pts[(best + 1) % pts.length];
  g.lineStyle(2.4, OBS.star, 0.9 * alpha); g.lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(1, OBS.seam, 0.8 * alpha); g.lineBetween(pts[1].x, pts[1].y, (pts[3].x + pts[4].x) / 2, (pts[3].y + pts[4].y) / 2);
}

/** A tapered ray from the limb outwards: three layers, deep-gold to white. */
function ray(g: G, x: number, y: number, a: number, r0: number, len: number, w: number, alpha: number, c0: number, c1: number): void {
  const px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
  const bx = x + Math.cos(a) * r0, by = y + Math.sin(a) * r0;
  const tx = x + Math.cos(a) * (r0 + len), ty = y + Math.sin(a) * (r0 + len);
  g.fillStyle(c0, 0.16 * alpha); g.fillTriangle(bx + px * w * 1.8, by + py * w * 1.8, bx - px * w * 1.8, by - py * w * 1.8, tx, ty);
  g.fillStyle(c1, 0.32 * alpha); g.fillTriangle(bx + px * w, by + py * w, bx - px * w, by - py * w, x + Math.cos(a) * (r0 + len * 0.8), y + Math.sin(a) * (r0 + len * 0.8));
  g.fillStyle(0xffffff, 0.4 * alpha); g.fillTriangle(bx + px * w * 0.3, by + py * w * 0.3, bx - px * w * 0.3, by - py * w * 0.3, x + Math.cos(a) * (r0 + len * 0.55), y + Math.sin(a) * (r0 + len * 0.55));
}

/**
 * THE STAR — the Obsidian King unshelled. A halo the size of the hall, a crown of fourteen turning
 * rays and twenty-eight needles, prominences looping off the limb, a churning photosphere, the
 * mask's kite burned into his face with two eyes of white fire (their pupils the last violet of
 * him) that follow you, and the last six fragments of the shell in orbit — one of them half of the
 * mask. `t` in seconds.
 */
export function drawStar(g: G, x: number, y: number, t: number, o: StarLook = {}): void {
  const gut = o.gutter ?? 0;
  const nova = o.nova ?? 0;
  const spent = o.spent ?? 0;
  const restless = 1 - (o.hp ?? 1);
  const R = STAR_R * (o.scale ?? 1) * (1 + nova * 0.26 - spent * 0.06) * (1 - gut * 0.7);
  if (R < 0.5) return;
  const heat = (o.heat ?? 1) * (1 - spent * 0.45) * (1 - gut * 0.9) * (1 + (o.castGlow ?? 0) * 0.25);
  const rays = (o.rays ?? 1) * (1 - spent * 0.6) * (1 - gut);
  const face = o.face ?? 1;
  // Colours walk from gold-white to ember as he is spent or goes out, to white as he goes nova.
  const cool = Math.max(spent * 0.5, gut);
  const tone = (c: number): number => mixC(mixC(c, EMBER, cool), 0xffffff, nova * 0.6);
  const deep = tone(OBS.starDeep), mid = tone(OBS.star), core = tone(OBS.starCore);

  // Halo.
  for (let i = 9; i >= 1; i--) {
    g.fillStyle(i > 5 ? deep : mid, 0.032 * heat);
    g.fillCircle(x, y, R * (1 + i * 0.42));
  }
  // The crown of rays: fourteen long, turning; twenty-eight needles turning the other way.
  if (rays > 0.01) {
    for (let i = 0; i < 14; i++) {
      const a = t * 0.07 + (i / 14) * TAU;
      const long = i % 2 === 0 ? 1 : 0.6;
      const len = R * (1.5 + 0.45 * Math.sin(t * 0.8 + i * 2.1) + restless * 0.3 * Math.sin(t * 5 + i)) * long * rays;
      ray(g, x, y, a, R * 0.92, len, R * 0.13, heat, deep, mid);
    }
    for (let i = 0; i < 28; i++) {
      const a = -t * 0.12 + (i / 28) * TAU + 0.11;
      const len = R * (0.45 + 0.25 * Math.abs(Math.sin(t * 2.3 + i * 1.7))) * rays;
      g.lineStyle(1.4, core, 0.4 * heat);
      g.lineBetween(x + Math.cos(a) * R * 1.02, y + Math.sin(a) * R * 1.02, x + Math.cos(a) * (R + len), y + Math.sin(a) * (R + len));
    }
    // The crown he wore, in light: ten points round him.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2 + t * 0.03;
      const r0 = R * 1.2, r1 = R * (1.38 + 0.04 * Math.sin(t * 2 + i));
      const w = 0.09;
      g.fillStyle(core, 0.5 * rays * heat);
      g.fillTriangle(x + Math.cos(a - w) * r0, y + Math.sin(a - w) * r0, x + Math.cos(a + w) * r0, y + Math.sin(a + w) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
  }
  // Prominences: loops of fire off the limb.
  for (let i = 0; i < 4; i++) {
    const b = i * (TAU / 4) + 0.4 + t * 0.05 + Math.sin(t * 0.3 + i) * 0.2;
    const lift = R * (0.35 + 0.15 * Math.sin(t * 1.1 + i * 2) + restless * 0.15) * (1 - gut);
    if (lift < 1) continue;
    const pts: P[] = [];
    for (let k = 0; k <= 10; k++) {
      const f = k / 10;
      const a = b - 0.22 + f * 0.44;
      const r = R * 0.98 + Math.sin(f * Math.PI) * lift;
      pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
    }
    g.lineStyle(R * 0.11, deep, 0.45 * heat); g.strokePoints(pts);
    g.lineStyle(R * 0.04, core, 0.8 * heat); g.strokePoints(pts);
  }
  // The photosphere.
  g.fillStyle(deep, 1); g.fillCircle(x, y, R * 1.03);
  g.fillStyle(mid, 1); g.fillCircle(x, y, R * 0.97);
  g.fillStyle(mixC(mid, core, 0.5), 1); g.fillCircle(x, y, R * 0.8);
  g.fillStyle(core, 1); g.fillCircle(x, y, R * 0.56);
  for (const c of CELLS) {
    const a = c.a + t * 0.04 + Math.sin(t * 0.6 + c.a * 3) * 0.05;
    const cx = x + Math.cos(a) * c.r * R, cy = y + Math.sin(a) * c.r * R;
    g.fillStyle(c.hot ? 0xffffff : deep, c.hot ? 0.28 : 0.18);
    g.fillCircle(cx, cy, c.s * R * (1 + 0.3 * Math.sin(t * 2 + c.a * 5)));
  }
  // Limb darkening.
  g.lineStyle(R * 0.08, deep, 0.6); g.strokeCircle(x, y, R * 0.97);
  // Scars of the shell across his surface — violet, fading.
  g.lineStyle(1.2, OBS.seam, 0.3 * (1 - gut));
  g.lineBetween(x - R * 0.7, y + R * 0.4, x - R * 0.3, y + R * 0.62);
  g.lineBetween(x + R * 0.55, y - R * 0.55, x + R * 0.75, y - R * 0.1);

  // The face.
  if (face > 0.01) {
    const fs = R * 0.86;
    const look = o.facing ?? Math.PI / 2;
    const lx = Math.cos(look) * R * 0.07, ly = Math.sin(look) * R * 0.05;
    // The mask is burned into him: its kite, its centre line, in deep gold.
    const kite = KITE.map((p) => ({ x: x + p.x * fs + lx * 0.4, y: y + p.y * fs * 0.92 + ly * 0.4 }));
    g.lineStyle(Math.max(1, R * 0.03), deep, 0.55 * face); g.strokePoints(kite, true);
    g.lineStyle(Math.max(1, R * 0.02), deep, 0.3 * face); g.lineBetween(kite[2].x, kite[2].y, kite[7].x, kite[7].y);
    // Brows: the mask's notched brow, now his.
    const by = y - R * 0.28 + ly * 0.5;
    g.lineStyle(R * 0.06, deep, 0.75 * face);
    g.lineBetween(x - R * 0.52 + lx, by - R * 0.02, x - R * 0.12 + lx, by + R * 0.05);
    g.lineBetween(x + R * 0.12 + lx, by + R * 0.05, x + R * 0.52 + lx, by - R * 0.02);
    const shut = Math.max(spent, gut);
    for (const side of [-1, 1]) {
      const ex = x + side * R * 0.32 + lx, ey = y - R * 0.12 + ly;
      g.fillStyle(deep, 0.85 * face); g.fillEllipse(ex, ey, R * 0.36, R * 0.15 * (1 - shut * 0.8) + 1);
      if (shut < 0.9) {
        g.fillStyle(0xffffff, face); g.fillEllipse(ex, ey, R * 0.28, R * 0.09 * (1 - shut));
        // The last of the violet: a slit pupil, looking at you.
        g.fillStyle(OBS.seam, 0.95 * face * (1 - shut));
        g.fillEllipse(ex + lx * 0.6, ey + ly * 0.4, R * 0.04, R * 0.1 * (1 - shut));
        g.fillStyle(OBS.seamLit, 0.5 * face); g.fillEllipse(ex + lx * 0.6, ey + ly * 0.4, R * 0.1, R * 0.03);
      }
    }
    // A calm mouth.
    g.lineStyle(R * 0.035, deep, 0.7 * face);
    g.beginPath(); g.arc(x + lx, y + R * 0.05 + ly, R * 0.3, Math.PI * 0.33, Math.PI * 0.67); g.strokePath();
    g.lineStyle(R * 0.02, deep, 0.4 * face);
    g.lineBetween(x + lx, y - R * 0.05 + ly, x + lx * 1.2, y + R * 0.12 + ly);
  }

  // Nova: the surface boils outward.
  if (nova > 0) {
    for (let i = 0; i < 3; i++) {
      const f = ((t * 1.6 + i / 3) % 1);
      g.lineStyle(3 + nova * 4, 0xffffff, (1 - f) * 0.5 * nova);
      g.strokeCircle(x, y, R * (1 + f * 0.6));
    }
  }
  if (o.hurt) { g.fillStyle(0xffffff, 0.28); g.fillCircle(x, y, R * 1.02); }

  // The last of the shell, in orbit.
  const shell = (o.shell ?? 1) * (1 - gut);
  if (shell > 0.01) {
    const out = o.shardsOut ?? 0;
    for (let i = 0; i < 6; i++) {
      if (i < out) continue;
      const dir = i % 2 ? -1 : 1;
      const a = t * 0.28 * dir + (i / 6) * TAU + i * 0.4;
      const rr = R * (1.5 + (i % 3) * 0.17) + Math.sin(t + i) * 3;
      const sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr * 0.96;
      if (i === 5) {
        councilMask(g, sx, sy, R * 0.2, { crack: 1, slit: OBS.seam, glow: 0.8, alpha: shell });
      } else {
        shellShard(g, sx, sy, R * (0.1 + (i % 3) * 0.025), t * (0.6 + i * 0.1) * dir + i, a + Math.PI, shell);
      }
    }
  }
}

/** Half of the King's mask, split down its centre line — for the entry, as it falls. */
export function halfMask(g: G, x: number, y: number, s: number, side: -1 | 1, rot: number, alpha = 1, glow = 0): void {
  const w = s * 0.62;
  const raw: P[] = side < 0
    ? [{ x: 0, y: -s * 1.06 }, { x: -w * 0.12, y: -s * 0.82 }, { x: -w * 0.55, y: -s }, { x: -w, y: -s * 0.28 }, { x: -w * 0.62, y: s * 0.5 }, { x: 0, y: s }]
    : [{ x: 0, y: -s * 1.06 }, { x: w * 0.12, y: -s * 0.82 }, { x: w * 0.55, y: -s }, { x: w, y: -s * 0.28 }, { x: w * 0.62, y: s * 0.5 }, { x: 0, y: s }];
  const c = Math.cos(rot), sn = Math.sin(rot);
  const pts = raw.map((p) => ({ x: x + p.x * c - p.y * sn, y: y + p.x * sn + p.y * c }));
  if (glow > 0) { g.fillStyle(OBS.star, 0.15 * glow * alpha); g.fillCircle(x, y, s * 1.3); }
  g.fillStyle(side < 0 ? OBS.glass : OBS.facet, alpha); g.fillPoints(pts, true);
  g.lineStyle(Math.max(1, s * 0.05), OBS.edge, 0.7 * alpha); g.strokePoints(pts, true);
  // The broken edge glows with what was behind it.
  g.lineStyle(Math.max(1.5, s * 0.08), OBS.star, 0.9 * alpha); g.lineBetween(pts[0].x, pts[0].y, pts[5].x, pts[5].y);
  // Half a slit.
  const sy = -s * 0.18;
  const s0 = { x: x + 0 * c - sy * sn, y: y + 0 * sn + sy * c };
  const s1 = { x: x + side * w * 0.72 * c - sy * sn, y: y + side * w * 0.72 * sn + sy * c };
  g.lineStyle(Math.max(1.5, s * 0.1), OBS.seam, alpha); g.lineBetween(s0.x, s0.y, s1.x, s1.y);
}

/** The King as he ended Act II: black-glass armour, crown of shards, the cracked mask. For the entry. */
export function drawKingFigure(g: G, x: number, y: number, t: number, o: { crack: number; maskOn: boolean; light: number; sword: boolean }): void {
  const r = 40;
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + r * 0.9, r * 2.6, r * 0.7);
  // Mantle of shards behind the shoulders.
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.32;
    const len = r * (1.25 + 0.2 * Math.cos(i));
    g.fillStyle(i % 2 ? OBS.glass : OBS.facet, 1);
    g.fillTriangle(x + Math.cos(a - 0.2) * r * 0.8, y + Math.sin(a - 0.2) * r * 0.8 + 10, x + Math.cos(a + 0.2) * r * 0.8, y + Math.sin(a + 0.2) * r * 0.8 + 10, x + Math.cos(a) * len, y + Math.sin(a) * len - 6);
  }
  // Body.
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, r);
  g.fillStyle(OBS.facet, 1); g.fillTriangle(x - r * 0.2, y - r * 0.95, x + r * 0.9, y - r * 0.3, x + r * 0.2, y + r * 0.6);
  g.fillStyle(OBS.sheen, 0.6); g.fillTriangle(x + r * 0.2, y - r * 0.8, x + r * 0.7, y - r * 0.4, x + r * 0.35, y - r * 0.1);
  g.lineStyle(1.4, OBS.edge, 0.7); g.strokeCircle(x, y, r);
  // Cracks, gold where the star shows.
  const rng = mulberry(91);
  const n = Math.round(3 + o.crack * 9);
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU;
    const a2 = a + (rng() - 0.5) * 0.9;
    const p0 = { x: x + Math.cos(a) * r * 0.15, y: y + Math.sin(a) * r * 0.15 };
    const p1 = { x: x + Math.cos(a2) * r * 0.6, y: y + Math.sin(a2) * r * 0.6 };
    const p2 = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    const c = mixC(OBS.seam, OBS.star, o.crack);
    g.lineStyle(4 + o.crack * 4, c, 0.25); g.strokePoints([p0, p1, p2]);
    g.lineStyle(1.5 + o.crack, lit(c, 0.5), 0.95); g.strokePoints([p0, p1, p2]);
  }
  // Crown of shards.
  for (let i = -2; i <= 2; i++) {
    const cx = x + i * 11, cy = y - r * 0.95;
    g.fillStyle(OBS.glass, 1); g.fillTriangle(cx - 6, cy + 4, cx + 6, cy + 4, cx + i * 1.5, cy - 14 - (2 - Math.abs(i)) * 6);
    g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(cx + 6, cy + 4, cx + i * 1.5, cy - 14 - (2 - Math.abs(i)) * 6);
  }
  if (o.sword) {
    g.fillStyle(OBS.sheen, 1); g.fillRect(x + r * 0.95, y - r * 1.1, 5, r * 1.9);
    g.lineStyle(1, OBS.edge, 0.8); g.strokeRect(x + r * 0.95, y - r * 1.1, 5, r * 1.9);
    g.fillStyle(OBS.edge, 1); g.fillRect(x + r * 0.95 - 9, y + r * 0.55, 23, 4);
    seam(g, x + r * 0.95 + 2.5, y - r * 1.1, y + r * 0.5);
  }
  // Under everything that cracks: light.
  if (o.light > 0) {
    g.fillStyle(OBS.star, 0.35 * o.light); g.fillCircle(x, y, r * 1.1);
    g.fillStyle(OBS.starCore, 0.5 * o.light); g.fillCircle(x, y, r * 0.8 * o.light);
  }
  if (o.maskOn) councilMask(g, x, y - 6, 22, { crack: o.crack, glow: 0.6 + 0.4 * Math.sin(t * 3) });
  else {
    // Where the mask was: his face, which is light.
    g.fillStyle(OBS.starCore, 0.95); g.fillEllipse(x, y - 6, 30, 40);
    g.fillStyle(0xffffff, 1); g.fillEllipse(x - 6, y - 10, 8, 3); g.fillEllipse(x + 6, y - 10, 8, 3);
  }
}

/** A thin violet seam down a blade. */
function seam(g: G, x: number, y0: number, y1: number): void {
  g.lineStyle(3, OBS.seam, 0.3); g.lineBetween(x, y0 + 6, x, y1);
  g.lineStyle(1, OBS.seamLit, 0.9); g.lineBetween(x, y0 + 6, x, y1);
}

export { sm, clamp, TAU };
