import Phaser from 'phaser';
import { OBS, councilMask, crackPath, seam, shard, slab } from '../../../../art/PinnacleArt';
import { type G, dim, lit, mixC } from '../../../../art/IsleArt';

/**
 * The Gale Bench's own drawing kit. The Pinnacle's black glass (`PinnacleArt`) is the room; this
 * bench's one family of colour is Highspire's — the pale cold blue of thin high air — and it
 * appears only as light, inlay and trapped breath inside the glass: the dial's ticks, the breath
 * in the bottles, the wind-runes in the floor, the edge of a banner. Clouds are the world outside
 * the spire (this bench is on its *outside*), so they get their own soft palette, lit from above
 * by starlight and shadowed violet from the spire.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** Highspire's air: the bench colour. */
export const GALE = 0xbfe8ff;
export const GALE_LIT = 0xf0faff;
export const GALE_DEEP = 0x4f86b8;
/** The cloud sea under the bridges. */
export const CLOUD = 0xc4cde6;
export const CLOUD_LIT = 0xeef2ff;
export const CLOUD_SHADE = 0x5d5a8a;
export const CLOUD_DEEP = 0x231f3c;
/** The dark below the clouds and the night over them. */
export const VOID = 0x08071a;
/** Banner cloth — violet-black, never a colour of its own. */
export const CLOTH = 0x1c1630;
export const CLOTH_LIT = 0x342a52;
/** Cork: the one dull brown on the bench, desaturated to sit with the glass. */
export const CORK = 0x4a3c44;

export const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
export const GALE_CSS = css(GALE);
export const SEAM_CSS = css(OBS.seamLit);

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

// ── Clouds ───────────────────────────────────────────────────────────

/**
 * One billow of the cloud sea seen from above and a little south: a violet-dark underside, a body
 * of lumps, and a starlit crown on the upper-left lumps. `x, y` the middle of its base.
 */
export function cloudBank(g: G, x: number, y: number, w: number, h: number, rng: () => number, a = 1): void {
  const n = Math.max(4, Math.round(w / 22));
  const lumps: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const arch = Math.sin(f * Math.PI);
    lumps.push({ x: x - w / 2 + f * w + (rng() - 0.5) * 10, y: y - h * 0.35 - arch * h * 0.5 + (rng() - 0.5) * 8, r: h * (0.32 + arch * 0.32) * (0.8 + rng() * 0.4) });
  }
  g.fillStyle(CLOUD_DEEP, 0.55 * a);
  g.fillEllipse(x, y + h * 0.05, w * 1.08, h * 0.55);
  for (const l of lumps) { g.fillStyle(CLOUD_SHADE, 0.85 * a); g.fillCircle(l.x, l.y + l.r * 0.28, l.r); }
  for (const l of lumps) { g.fillStyle(CLOUD, 0.9 * a); g.fillCircle(l.x - l.r * 0.06, l.y - l.r * 0.04, l.r * 0.86); }
  for (const l of lumps) {
    g.fillStyle(CLOUD_LIT, 0.55 * a); g.fillCircle(l.x - l.r * 0.28, l.y - l.r * 0.3, l.r * 0.46);
  }
  // A thin violet rim where the spire's glow catches the underside.
  g.lineStyle(1, OBS.seam, 0.18 * a);
  g.beginPath(); g.arc(x, y - h * 0.2, w * 0.52, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
}

/** A long low strand of cloud drifting past (animated layers). */
export function cloudWisp(g: G, x: number, y: number, len: number, th: number, a: number): void {
  g.fillStyle(CLOUD_LIT, 0.16 * a); g.fillEllipse(x, y, len, th);
  g.fillStyle(CLOUD, 0.22 * a); g.fillEllipse(x + len * 0.12, y + th * 0.1, len * 0.6, th * 0.6);
  g.fillStyle(CLOUD_LIT, 0.25 * a); g.fillEllipse(x - len * 0.15, y - th * 0.15, len * 0.3, th * 0.35);
}

// ── Breath ───────────────────────────────────────────────────────────

/** Three curling strokes of breath — the wind-rune inlaid wherever the Tax was levied. */
export function windRune(g: G, x: number, y: number, r: number, color = GALE, a = 1): void {
  for (let i = 0; i < 3; i++) {
    const yy = y - r * 0.5 + i * r * 0.5;
    const len = r * (1.5 - Math.abs(i - 1) * 0.4);
    g.lineStyle(Math.max(1, r * 0.12), color, a);
    g.beginPath();
    g.moveTo(x - len * 0.6, yy);
    g.lineTo(x + len * 0.25, yy);
    g.strokePath();
    g.beginPath(); g.arc(x + len * 0.25, yy - r * 0.16, r * 0.16, Math.PI / 2, -Math.PI * 0.9, true); g.strokePath();
  }
}

/** The Breath-Tax's seal: a gauge with seven ticks and its needle pinned on the stop. */
export function meterSigil(g: G, x: number, y: number, r: number, color = GALE, a = 1): void {
  g.lineStyle(Math.max(1, r * 0.09), color, a);
  g.beginPath(); g.arc(x, y, r, Math.PI * 0.75, Math.PI * 2.25, false); g.strokePath();
  for (let i = 0; i <= 6; i++) {
    const an = Math.PI * 0.75 + (i / 6) * Math.PI * 1.5;
    g.lineBetween(x + Math.cos(an) * r * 0.72, y + Math.sin(an) * r * 0.72, x + Math.cos(an) * r, y + Math.sin(an) * r);
  }
  const stop = Math.PI * 2.25;
  g.lineStyle(Math.max(1, r * 0.12), color, a);
  g.lineBetween(x, y, x + Math.cos(stop) * r * 0.9, y + Math.sin(stop) * r * 0.9);
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.14);
}

/**
 * A corked bottle of breath, the way the collectors carried it: dark glass, a pale swirl of
 * someone's air trapped inside, a cork, a debt tag on a string. `x, y` its base; `fill` 0–1.
 */
export function breathBottle(g: G, x: number, y: number, s: number, t: number, fill = 1, seed = 0): void {
  const bw = 12 * s, bh = 20 * s;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 1, bw * 2.1, 5 * s);
  g.fillStyle(OBS.glass, 0.92); g.fillRoundedRect(x - bw, y - bh, bw * 2, bh, 5 * s);
  g.fillRect(x - 4 * s, y - bh - 8 * s, 8 * s, 9 * s);
  // The breath inside, curling round on itself.
  if (fill > 0) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + seed);
    g.fillStyle(GALE, 0.16 * fill * pulse); g.fillRoundedRect(x - bw + 2, y - bh * fill + 1, bw * 2 - 4, bh * fill - 3, 4 * s);
    g.lineStyle(Math.max(1, 1.2 * s), GALE_LIT, 0.55 * fill * pulse);
    const sx = x + Math.sin(t * 1.7 + seed) * 2 * s;
    g.beginPath(); g.arc(sx, y - bh * 0.45, 5 * s, t * 2 + seed, t * 2 + seed + Math.PI * 1.3, false); g.strokePath();
    g.beginPath(); g.arc(sx - 2 * s, y - bh * 0.45, 2.4 * s, t * 2 + seed + Math.PI, t * 2 + seed + Math.PI * 2.2, false); g.strokePath();
  }
  g.lineStyle(1, OBS.edge, 0.6); g.strokeRoundedRect(x - bw, y - bh, bw * 2, bh, 5 * s);
  g.fillStyle(0xffffff, 0.35); g.fillRect(x - bw + 2.5 * s, y - bh + 3 * s, 1.6 * s, bh * 0.5);
  g.fillStyle(CORK, 1); g.fillRect(x - 4.5 * s, y - bh - 12 * s, 9 * s, 5 * s);
  g.fillStyle(lit(CORK, 0.2), 1); g.fillRect(x - 4.5 * s, y - bh - 12 * s, 9 * s, 1.5 * s);
  // The debt tag.
  g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(x + 4 * s, y - bh - 6 * s, x + 9 * s, y - bh + 2 * s);
  g.fillStyle(OBS.facet, 1); g.fillRect(x + 7 * s, y - bh + 2 * s, 6 * s, 4 * s);
  g.fillStyle(GALE, 0.5); g.fillRect(x + 8 * s, y - bh + 3.2 * s, 4 * s, 0.8 * s);
}

// ── Banners ──────────────────────────────────────────────────────────

/** A banner pole: a thin upright shard with a crossbar, pale-edged. `x, y` its foot. */
export function bannerPole(g: G, x: number, y: number, h: number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 6, y + 2, 26, 7);
  slab(g, x, y, 18, 12);
  shard(g, x, y - 10, 9, h, 0, 0.4);
  g.fillStyle(OBS.facet, 1); g.fillRect(x - 3, y - h + 2, 6, h * 0.7);
  g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x + 3, y - h + 4, x + 3, y - 12);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - 2, y - h + 8, 30, 4);
  g.fillStyle(GALE, 0.9); g.fillCircle(x, y - h + 4, 2);
}

/**
 * The cloth on a pole, streaming downwind and cracking: a strip of eight segments rippling, with
 * a pale-blue hem, the Tax's seal on it and a torn tail. `x, y` the top of the pole; `dir` ±1 is
 * which way the wind takes it; `t` seconds.
 */
export function bannerCloth(g: G, x: number, y: number, len: number, wid: number, t: number, dir = 1, seed = 0): void {
  const N = 8;
  // Every few seconds the cloth snaps taut and cracks — a sharper, faster wave.
  const crack = Math.max(0, Math.sin(t * 0.9 + seed * 1.7)) ** 12;
  const top: Phaser.Geom.Point[] = [];
  const bot: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const wav = Math.sin(t * (5 + crack * 9) - f * 6 + seed) * (3 + f * 9) * (1 + crack * 0.8);
    const xx = x + dir * (6 + f * len);
    top.push(P(xx, y + 6 + wav));
    bot.push(P(xx, y + 6 + wid * (1 - f * 0.35) + wav + f * 4));
  }
  const pts = [...top, ...bot.reverse()];
  g.fillStyle(CLOTH, 0.96); g.fillPoints(pts, true);
  // Light on the ripples: every other panel a little lit.
  for (let i = 0; i < N; i += 2) {
    const a0 = top[i], a1 = top[i + 1], b0 = bot[N - i], b1 = bot[N - i - 1];
    g.fillStyle(CLOTH_LIT, 0.55); g.fillPoints([a0, a1, b1, b0], true);
  }
  g.lineStyle(1.5, GALE, 0.7);
  g.beginPath(); g.moveTo(top[0].x, top[0].y); for (const p of top) g.lineTo(p.x, p.y); g.strokePath();
  const mid = top[3], midB = bot[N - 3];
  meterSigil(g, mid.x, (mid.y + midB.y) / 2, wid * 0.24, GALE, 0.75);
  // The torn tail: two tongues.
  const e = top[N], eb = bot[0];
  g.fillStyle(CLOTH, 0.96);
  g.fillTriangle(e.x, e.y, (e.x + eb.x) / 2, (e.y + eb.y) / 2, e.x + dir * 12, e.y + 4 + Math.sin(t * 9 + seed) * 4);
  g.fillTriangle((e.x + eb.x) / 2, (e.y + eb.y) / 2, eb.x, eb.y, eb.x + dir * 10, eb.y + Math.sin(t * 8 + seed) * 4);
  if (crack > 0.5) {
    g.lineStyle(1, GALE_LIT, (crack - 0.5) * 1.2);
    for (let k = 0; k < 3; k++) g.lineBetween(e.x + dir * (8 + k * 6), e.y - 6 + k * 8, e.x + dir * (22 + k * 8), e.y - 8 + k * 8);
  }
}

// ── Seats ────────────────────────────────────────────────────────────

/** The small inlaid emblem of each seat's element, in the bench's pale air-light. */
export function elementGlyph(g: G, x: number, y: number, r: number, el: string, color = GALE, a = 1): void {
  g.lineStyle(Math.max(1, r * 0.14), color, a);
  switch (el) {
    case 'air': windRune(g, x, y, r * 0.8, color, a); break;
    case 'tempest': {
      g.beginPath(); g.arc(x, y + r * 0.1, r * 0.7, Math.PI * 0.2, Math.PI * 1.6, false); g.strokePath();
      g.fillStyle(color, a);
      g.fillPoints([P(x + r * 0.1, y - r), P(x - r * 0.25, y + r * 0.05), P(x + r * 0.05, y + r * 0.05), P(x - r * 0.15, y + r), P(x + r * 0.35, y - r * 0.15), P(x + r * 0.05, y - r * 0.15)], true);
      break;
    }
    case 'gravity': {
      g.strokeCircle(x, y - r * 0.2, r * 0.55);
      g.lineBetween(x, y + r * 0.35, x, y + r);
      g.fillStyle(color, a); g.fillTriangle(x - r * 0.3, y + r * 0.7, x + r * 0.3, y + r * 0.7, x, y + r * 1.05);
      g.fillCircle(x, y - r * 0.2, r * 0.18);
      break;
    }
    case 'dream': {
      g.fillStyle(color, a); g.fillCircle(x, y, r * 0.8);
      g.fillStyle(OBS.glass, 1); g.fillCircle(x + r * 0.35, y - r * 0.2, r * 0.7);
      g.fillStyle(color, a); g.fillCircle(x + r * 0.55, y + r * 0.5, r * 0.1); g.fillCircle(x + r * 0.8, y + r * 0.1, r * 0.08);
      break;
    }
    case 'astra': {
      g.fillStyle(color, a);
      g.fillPoints([P(x, y - r), P(x + r * 0.2, y - r * 0.2), P(x + r, y), P(x + r * 0.2, y + r * 0.2), P(x, y + r), P(x - r * 0.2, y + r * 0.2), P(x - r, y), P(x - r * 0.2, y - r * 0.2)], true);
      g.lineBetween(x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.6); g.lineBetween(x + r * 0.6, y - r * 0.6, x - r * 0.6, y + r * 0.6);
      break;
    }
    default: {
      // Myth: an open book with a sword laid down its spine.
      g.strokeRect(x - r * 0.9, y - r * 0.3, r * 0.85, r * 0.9); g.strokeRect(x + r * 0.05, y - r * 0.3, r * 0.85, r * 0.9);
      g.lineBetween(x, y - r, x, y + r * 0.9);
      g.lineBetween(x - r * 0.3, y - r * 0.6, x + r * 0.3, y - r * 0.6);
    }
  }
}

/**
 * A councilor's seat: a tall obsidian chair on a stepped plinth — a fan of back shards split by
 * a seam, arm blocks, the mask's likeness cut into the back, and the seat's element inlaid in the
 * plinth's face in air-light. `x, y` the foot of the plinth's front; `s` scale (1 ≈ 130 wide, 250 tall).
 */
export function councilSeat(g: G, x: number, y: number, s: number, el: string, rng: () => number): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 4 * s, 170 * s, 30 * s);
  slab(g, x, y, 136 * s, 22 * s, rng, 1);
  slab(g, x, y - 20 * s, 112 * s, 22 * s, rng, 1);
  // The back: five shards, the middle one tallest.
  const by = y - 60 * s;
  shard(g, x - 40 * s, by, 30 * s, 120 * s, -10 * s, 0.1);
  shard(g, x + 40 * s, by, 30 * s, 126 * s, 10 * s, 0.1);
  shard(g, x - 20 * s, by, 36 * s, 170 * s, -4 * s, 0.25);
  shard(g, x + 20 * s, by, 36 * s, 176 * s, 4 * s, 0.25);
  shard(g, x, by, 44 * s, 214 * s, 0, 0.4);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 34 * s, by - 70 * s, 68 * s, 72 * s);
  g.fillStyle(OBS.facet, 0.85); g.fillTriangle(x - 34 * s, by - 70 * s, x + 6 * s, by - 70 * s, x - 34 * s, by - 20 * s);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeRect(x - 34 * s, by - 70 * s, 68 * s, 72 * s);
  councilMask(g, x, by - 40 * s, 22 * s, { alpha: 0.85, glow: 0.4 });
  // Arms and the seat itself.
  slab(g, x - 44 * s, y - 38 * s, 22 * s, 46 * s);
  slab(g, x + 44 * s, y - 38 * s, 22 * s, 46 * s);
  slab(g, x, y - 38 * s, 66 * s, 24 * s);
  // The element in the plinth's face, and a seam rising through the back.
  elementGlyph(g, x, y - 10 * s, 7 * s, el, GALE, 0.95);
  g.fillStyle(GALE, 0.08); g.fillCircle(x, y - 10 * s, 16 * s);
  seam(g, crackPath({ x: x + 2 * s, y: by - 72 * s }, { x, y: by - 210 * s }, rng, 4 * s, 5), Math.max(1, 1.3 * s), 0.85);
}

// ── The Breath-Meter ─────────────────────────────────────────────────

/** Geometry of the Breath-Meter shared by its static body, its moving parts and the cinematic. */
export const METER = {
  /** Dial centre above the dais front, and its radius. */
  dialY: -200, dialR: 80,
  /** The anemometer hub on its mast. */
  mastY: -430, armR: 78,
  /** Bellows: nozzle at ±nozX, the boards open out to ±backX. */
  nozX: 92, backX: 262, bellY: -150,
} as const;

/**
 * The Breath-Meter's still body. `x, y` the front of its round dais. Three dais tiers; the dial
 * housing on a fluted column; the mast; feed-pipes from the floor; the bellows' stands; and the
 * racks of corked breath on the dais. Everything that moves is `breathMeterLive`.
 */
export function breathMeterBody(g: G, x: number, y: number, rng: () => number, s = 1): void {
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 6 * s, 420 * s, 70 * s);
  // The dais: three tiers of slab, each a little lit at the lip.
  slab(g, x, y, 320 * s, 26 * s, rng, 2);
  slab(g, x, y - 24 * s, 270 * s, 24 * s, rng, 2);
  slab(g, x, y - 46 * s, 210 * s, 22 * s, rng, 1);
  for (let i = 0; i < 9; i++) {
    const bx = x - 140 * s + i * 35 * s;
    g.fillStyle(GALE, 0.35); g.fillRect(bx, y - 13 * s, 2 * s, 6 * s);
  }
  // Feed-pipes: black glass tubes running up from the floor to the dial, breath glowing in them.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const px = x + side * (24 + k * 14) * s;
      g.fillStyle(OBS.glass, 1); g.fillRect(px - 4 * s, y - 230 * s + k * 12 * s, 8 * s, 186 * s - k * 12 * s);
      g.fillStyle(GALE, 0.18); g.fillRect(px - 2 * s, y - 226 * s + k * 12 * s, 4 * s, 178 * s - k * 12 * s);
      g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(px + 4 * s, y - 230 * s + k * 12 * s, px + 4 * s, y - 44 * s);
      for (let r = 0; r < 4; r++) { g.fillStyle(OBS.sheen, 1); g.fillRect(px - 5 * s, y - 70 * s - r * 40 * s, 10 * s, 3 * s); }
    }
  }
  // The column under the dial.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 22 * s, y - 130 * s, 44 * s, 86 * s);
  g.fillStyle(OBS.facet, 1); g.fillRect(x - 22 * s, y - 130 * s, 14 * s, 86 * s);
  for (let i = 0; i < 4; i++) { g.lineStyle(1, OBS.edge, 0.3); g.lineBetween(x - 14 * s + i * 10 * s, y - 128 * s, x - 14 * s + i * 10 * s, y - 46 * s); }
  // The mast for the anemometer, from the top of the dial housing up.
  const dy = y + METER.dialY * s, my = y + METER.mastY * s;
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 6 * s, my, 12 * s, dy - my - METER.dialR * s + 6 * s);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - 6 * s, my, 4 * s, dy - my - METER.dialR * s + 6 * s);
  for (let i = 0; i < 6; i++) { g.fillStyle(OBS.edge, 0.5); g.fillRect(x - 8 * s, my + 20 * s + i * 22 * s, 16 * s, 2 * s); }
  // Guy-lines off the mast, pale wire.
  g.lineStyle(1, OBS.edge, 0.35);
  g.lineBetween(x, my + 30 * s, x - 150 * s, y - 50 * s); g.lineBetween(x, my + 30 * s, x + 150 * s, y - 50 * s);
  // The dial housing: a great black glass ring with a lit bezel.
  g.fillStyle(GALE, 0.05); g.fillCircle(x, dy, METER.dialR * 1.7 * s);
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, dy, METER.dialR * 1.14 * s);
  g.fillStyle(OBS.sheen, 1); g.fillCircle(x, dy, METER.dialR * 1.06 * s);
  g.fillStyle(OBS.facet, 1); g.fillCircle(x, dy, METER.dialR * s);
  g.fillStyle(OBS.glass, 1); g.fillCircle(x + 4 * s, dy + 4 * s, METER.dialR * 0.94 * s);
  g.lineStyle(1.5, OBS.edge, 0.7); g.strokeCircle(x, dy, METER.dialR * 1.14 * s);
  // Rivets of glass round the bezel.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.fillStyle(OBS.edge, 0.7); g.fillCircle(x + Math.cos(a) * METER.dialR * 1.1 * s, dy + Math.sin(a) * METER.dialR * 1.1 * s, 2 * s);
  }
  // The face: 61 ticks over 270°, every tenth long and lit, a breath-rune at each tenth.
  const R0 = METER.dialR * 0.86 * s;
  for (let i = 0; i <= 60; i++) {
    const a = Math.PI * 0.75 + (i / 60) * Math.PI * 1.5;
    const long = i % 10 === 0;
    g.lineStyle(long ? 2 * s : 1, GALE, long ? 0.95 : 0.45);
    const r1 = long ? R0 * 0.78 : R0 * 0.88;
    g.lineBetween(x + Math.cos(a) * r1, dy + Math.sin(a) * r1, x + Math.cos(a) * R0, dy + Math.sin(a) * R0);
    if (long) { g.fillStyle(GALE, 0.6); g.fillCircle(x + Math.cos(a) * R0 * 0.62, dy + Math.sin(a) * R0 * 0.62, 2.2 * s); }
  }
  // The red-zone of the dial is not red: it is the King's violet, the last sixth — "owed".
  g.lineStyle(6 * s, OBS.seam, 0.5);
  g.beginPath(); g.arc(x, dy, R0 * 0.95, Math.PI * 2.0, Math.PI * 2.25, false); g.strokePath();
  // The stop: a peg of glass the needle leans on.
  const sa = Math.PI * 2.25;
  g.fillStyle(OBS.seamLit, 1); g.fillCircle(x + Math.cos(sa) * R0 * 0.96, dy + Math.sin(sa) * R0 * 0.96, 4 * s);
  meterSigil(g, x, dy + R0 * 0.42, 11 * s, GALE, 0.5);
  // Cracks across the glass of the face.
  seam(g, crackPath({ x: x - R0 * 0.8, y: dy - R0 * 0.2 }, { x: x - R0 * 0.2, y: dy + R0 * 0.7 }, rng, 6 * s, 5), 1, 0.6);
  // Bellows stands (the boards themselves breathe in `breathMeterLive`).
  for (const side of [-1, 1]) {
    const sx = x + side * 210 * s;
    slab(g, sx, y - 4 * s, 34 * s, 16 * s);
    g.fillStyle(OBS.glass, 1); g.fillRect(sx - 5 * s, y + METER.bellY * s, 10 * s, -METER.bellY * s - 18 * s);
    g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(sx + 5 * s, y + METER.bellY * s, sx + 5 * s, y - 20 * s);
    // A rack of breath on the dais step.
    for (let k = 0; k < 5; k++) breathBottle(g, x + side * (78 + k * 18) * s, y - 48 * s + (k % 2) * 3 * s, 0.62 * s, k * 0.7, 0.4 + ((k * 37) % 6) / 10, k + side);
  }
  // The tax plate on the dais front.
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 46 * s, y - 22 * s, 92 * s, 16 * s);
  g.lineStyle(1, GALE, 0.6); g.strokeRect(x - 46 * s, y - 22 * s, 92 * s, 16 * s);
  for (let i = 0; i < 9; i++) { g.fillStyle(GALE, 0.55); g.fillRect(x - 40 * s + i * 9.5 * s, y - 16 * s, 6 * s, 1.4 * s); }
}

/**
 * The Breath-Meter's moving parts, every frame: both bellows heaving out of step, breath sucked
 * along the feed-pipes, the needle trembling against its stop, and the anemometer turning on
 * its mast. `t` seconds; `rate` scales the wind (the needle drops off the stop at rate 0).
 */
export function breathMeterLive(g: G, x: number, y: number, t: number, s = 1, rate = 1): void {
  const dy = y + METER.dialY * s;
  // Bellows: two boards hinged at the nozzle, pleated glass slats between, opening and closing.
  for (const side of [-1, 1]) {
    const open = 0.5 + 0.5 * Math.sin(t * 1.1 * rate + (side > 0 ? Math.PI : 0));
    const nx = x + side * METER.nozX * s, ny = y + METER.bellY * s;
    const bx = x + side * METER.backX * s;
    const spread = (16 + open * 50) * s;
    const upper = [P(nx, ny - 8 * s), P(bx, ny - spread - 10 * s), P(bx + side * 10 * s, ny - spread + 4 * s), P(nx, ny - 2 * s)];
    const lower = [P(nx, ny + 8 * s), P(bx, ny + spread + 10 * s), P(bx + side * 10 * s, ny + spread - 4 * s), P(nx, ny + 2 * s)];
    // The pleats: slats of glass fanning between the boards.
    for (let k = 0; k <= 6; k++) {
      const f = 0.25 + (k / 6) * 0.75;
      const px = nx + (bx - nx) * f;
      const half = spread * f + 6 * s;
      g.fillStyle(k % 2 ? OBS.facet : OBS.glass, 1);
      g.fillPoints([P(px - side * 10 * s, ny - half * 0.92), P(px + side * 6 * s, ny - half), P(px + side * 6 * s, ny + half), P(px - side * 10 * s, ny + half * 0.92)], true);
      g.lineStyle(1, OBS.edge, 0.35); g.lineBetween(px + side * 6 * s, ny - half, px + side * 6 * s, ny + half);
    }
    // Breath inside, glowing through the pleats as it fills.
    g.fillStyle(GALE, 0.08 + open * 0.12); g.fillEllipse((nx + bx) / 2 + side * 20 * s, ny, (bx - nx) * side * 0.9, spread * 1.5);
    for (const board of [upper, lower]) {
      g.fillStyle(OBS.sheen, 1); g.fillPoints(board, true);
      g.lineStyle(1.3, OBS.edge, 0.75); g.strokePoints(board, true);
    }
    g.fillStyle(GALE, 0.7); g.fillCircle(bx - side * 30 * s, ny - spread - 2 * s, 2.2 * s); g.fillCircle(bx - side * 30 * s, ny + spread + 2 * s, 2.2 * s);
    // The nozzle and a gust coming out of it on the squeeze.
    g.fillStyle(OBS.glass, 1); g.fillTriangle(nx, ny - 9 * s, nx, ny + 9 * s, nx - side * 26 * s, ny);
    const squeeze = Math.max(0, -Math.cos(t * 1.1 * rate + (side > 0 ? Math.PI : 0)));
    if (squeeze > 0.2) {
      for (let k = 0; k < 4; k++) {
        const ph = (t * 2 + k / 4) % 1;
        g.fillStyle(GALE_LIT, 0.4 * squeeze * (1 - ph));
        g.fillEllipse(nx - side * (26 + ph * 40) * s, ny + Math.sin(k * 2 + t * 4) * 4 * s, 10 * s * (1 + ph), 3 * s);
      }
    }
  }
  // Breath rising in the feed-pipes: pale beads climbing toward the dial.
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const px = x + side * (24 + k * 14) * s;
    for (let b = 0; b < 3; b++) {
      const ph = (t * 0.45 * rate + b / 3 + k * 0.13) % 1;
      const by = y - 44 * s - ph * (186 - k * 12) * s;
      g.fillStyle(GALE_LIT, 0.65 * Math.sin(ph * Math.PI)); g.fillCircle(px, by, 2.2 * s);
    }
  }
  // The needle: pinned to the stop, trembling with every breath on the isle.
  const stop = Math.PI * 2.25 - 0.04;
  const shake = rate > 0 ? Math.sin(t * 23) * 0.012 + Math.sin(t * 7.3) * 0.02 : 0;
  const na = rate > 0 ? stop + shake : Math.PI * 0.75 + 0.02;
  const L = METER.dialR * 0.84 * s;
  g.lineStyle(5 * s, 0x000000, 0.4); g.lineBetween(x + 3 * s, dy + 3 * s, x + Math.cos(na) * L + 3 * s, dy + Math.sin(na) * L + 3 * s);
  g.lineStyle(3.5 * s, OBS.edge, 1); g.lineBetween(x - Math.cos(na) * 16 * s, dy - Math.sin(na) * 16 * s, x + Math.cos(na) * L, dy + Math.sin(na) * L);
  g.lineStyle(1.4 * s, GALE_LIT, 1); g.lineBetween(x, dy, x + Math.cos(na) * L * 0.96, dy + Math.sin(na) * L * 0.96);
  g.fillStyle(OBS.sheen, 1); g.fillCircle(x, dy, 9 * s);
  g.fillStyle(GALE, 1); g.fillCircle(x, dy, 4 * s);
  g.fillStyle(GALE, 0.1 + 0.06 * Math.sin(t * 3)); g.fillCircle(x, dy, METER.dialR * 0.9 * s);
  // The anemometer: four cups on arms, seen at a slant, spinning.
  const my = y + METER.mastY * s;
  const spin = t * 3.4 * rate;
  const cups: { x: number; y: number; d: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = spin + (i / 4) * Math.PI * 2;
    cups.push({ x: x + Math.cos(a) * METER.armR * s, y: my + Math.sin(a) * METER.armR * 0.3 * s, d: Math.sin(a) });
  }
  cups.sort((a, b) => a.d - b.d);
  for (const c of cups) {
    g.lineStyle(3 * s, OBS.sheen, 1); g.lineBetween(x, my, c.x, c.y);
    g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x, my - 1, c.x, c.y - 1);
    const cr = (11 + c.d * 2) * s;
    g.fillStyle(OBS.glass, 1); g.fillCircle(c.x, c.y, cr);
    g.fillStyle(OBS.facet, 1); g.fillCircle(c.x - cr * 0.2, c.y - cr * 0.2, cr * 0.72);
    g.fillStyle(GALE, 0.35 + c.d * 0.2); g.fillCircle(c.x + cr * 0.15, c.y + cr * 0.1, cr * 0.4);
    g.lineStyle(1, OBS.edge, 0.7); g.strokeCircle(c.x, c.y, cr);
  }
  g.fillStyle(OBS.sheen, 1); g.fillCircle(x, my, 8 * s);
  g.fillStyle(GALE_LIT, 0.9); g.fillCircle(x, my - 2 * s, 3 * s);
  // A vane above the cups, swinging on the wind.
  const va = Math.sin(t * 0.7) * 0.5;
  g.lineStyle(2 * s, OBS.edge, 0.9);
  g.lineBetween(x, my - 8 * s, x, my - 36 * s);
  g.fillStyle(OBS.sheen, 1);
  g.fillTriangle(x, my - 36 * s, x + Math.cos(va) * 40 * s, my - 36 * s + Math.sin(va) * 6 * s, x + Math.cos(va) * 26 * s, my - 26 * s);
  g.fillStyle(GALE, 0.9); g.fillTriangle(x, my - 40 * s, x - Math.cos(va) * 16 * s, my - 36 * s, x, my - 32 * s);
}

// ── Little shared things ─────────────────────────────────────────────

/** A glass HUD plate for a decree's meter: black glass, pale rim, a thin line of air-light. */
export function hudPlate(g: G, cx: number, cy: number, w: number, h: number): void {
  g.fillStyle(OBS.glass, 0.9); g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 7);
  g.fillStyle(OBS.facet, 0.6); g.fillRoundedRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h * 0.4, 6);
  g.lineStyle(1.5, OBS.edge, 0.8); g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 7);
  g.lineStyle(1, GALE, 0.35); g.lineBetween(cx - w / 2 + 8, cy + h / 2 - 3, cx + w / 2 - 8, cy + h / 2 - 3);
}

/** A meter bar inside a HUD plate. */
export function hudBar(g: G, x: number, y: number, w: number, h: number, k: number, color: number): void {
  g.fillStyle(0x000000, 0.6); g.fillRoundedRect(x, y, w, h, h / 2);
  if (k > 0) { g.fillStyle(color, 1); g.fillRoundedRect(x, y, Math.max(h, w * Math.min(1, k)), h, h / 2); }
  g.fillStyle(0xffffff, 0.18); g.fillRect(x + 3, y + 1, Math.max(0, w * Math.min(1, k) - 6), 1.5);
}

/** A dot marking a side on a HUD plate: the player's in their colour, the councilor's a small mask. */
export function sideMark(g: G, x: number, y: number, isPlayer: boolean): void {
  if (isPlayer) { g.fillStyle(GALE, 1); g.fillCircle(x, y, 5); g.fillStyle(0xffffff, 0.8); g.fillCircle(x - 1.5, y - 1.5, 2); }
  else councilMask(g, x, y, 7, { glow: 0.5 });
}

export { OBS, P, dim, lit, mixC };
