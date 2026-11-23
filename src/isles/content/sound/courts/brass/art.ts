import type { Pt } from '../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../art/IsleArt';
import {
  BRAID, BRASS, BRASS_DARK, BRASS_DEEP, BRASS_LIT, BRASS_SHINE, BRICK, BRICK_DARK, BRONZE, BRONZE_DARK, CREAM,
  FURNACE, FURNACE_HOT, GRAVEL, LAWN_DARK, NAVY, NAVY_DARK, NOTE_INK, SCARLET, SCARLET_DARK, SCARLET_LIT, SILVER,
  SILVER_DARK, SLATE, SLATE_DARK, SNOW, SNOW_SHADE, STONE, STONE_DARK, STONE_LIT, VERDIGRIS, WOOD, WOOD_DARK, WOOD_LIT,
} from './palette';
import { ellipsePts } from './util';

/**
 * The Brass Court's drawing kit. Everything here is brass that has been polished every morning
 * for forty years: horns, bells, drums, bandstands, the foundry's bell-mouthed chimneys and the
 * herald trumpets as tall as towers. Set pieces take `x, y` = the base/feet point and draw up.
 */

// ── Notation ─────────────────────────────────────────────────────────

export type NoteKind = 'crotchet' | 'quaver' | 'semi' | 'minim' | 'pair';

/** A written note: a tilted head, a stem, and a flag or two. `s` ≈ head height. */
export function note(g: G, x: number, y: number, s: number, color: number, kind: NoteKind = 'quaver', a = 1): void {
  const hw = s * 1.35, hh = s;
  const head = (hx: number, hy: number) => {
    const pts = ellipsePts(hx, hy, hw * 0.5, hh * 0.5, -0.4, 14);
    if (kind === 'minim') { g.lineStyle(Math.max(1, s * 0.28), color, a); g.strokePoints(pts, true); }
    else { g.fillStyle(color, a); g.fillPoints(pts, true); }
  };
  const stemX = x + hw * 0.42, top = y - s * 3.4;
  head(x, y);
  g.lineStyle(Math.max(1, s * 0.22), color, a);
  g.lineBetween(stemX, y - s * 0.1, stemX, top);
  if (kind === 'pair') {
    const x2 = x + s * 2.6;
    head(x2, y - s * 0.4);
    g.lineBetween(x2 + hw * 0.42, y - s * 0.5, x2 + hw * 0.42, top - s * 0.4);
    g.fillStyle(color, a);
    g.fillPoints([{ x: stemX, y: top }, { x: x2 + hw * 0.42, y: top - s * 0.4 }, { x: x2 + hw * 0.42, y: top + s * 0.25 }, { x: stemX, y: top + s * 0.65 }], true);
    return;
  }
  const flags = kind === 'quaver' ? 1 : kind === 'semi' ? 2 : 0;
  for (let i = 0; i < flags; i++) {
    const fy = top + i * s * 0.8;
    g.lineStyle(Math.max(1, s * 0.3), color, a);
    g.beginPath();
    g.moveTo(stemX, fy);
    g.lineTo(stemX + s * 0.7, fy + s * 0.6);
    g.lineTo(stemX + s * 0.95, fy + s * 1.5);
    g.strokePath();
  }
}

/** Five stave lines from x0, `w` wide, starting at y, `gap` apart. */
export function stave(g: G, x0: number, y: number, w: number, gap: number, color: number, a = 1, width = 1): void {
  g.lineStyle(width, color, a);
  for (let i = 0; i < 5; i++) g.lineBetween(x0, y + i * gap, x0 + w, y + i * gap);
}

/** The court's badge: a brass lyre, its two horns curling up and four strings. */
export function lyre(g: G, x: number, y: number, s: number, color = BRASS, a = 1): void {
  g.lineStyle(Math.max(1.2, s * 0.22), dim(color, 0.35), a);
  g.beginPath(); g.arc(x, y + s * 0.2, s * 0.9, Math.PI * 0.05, Math.PI * 0.95, false); g.strokePath();
  g.lineStyle(Math.max(1, s * 0.18), color, a);
  g.beginPath(); g.arc(x, y + s * 0.2, s * 0.9, Math.PI * 0.05, Math.PI * 0.95, false); g.strokePath();
  for (const k of [-1, 1]) {
    g.beginPath();
    g.moveTo(x + k * s * 0.85, y + s * 0.45);
    g.lineTo(x + k * s * 0.95, y - s * 0.4);
    g.lineTo(x + k * s * 0.6, y - s * 1.0);
    g.strokePath();
    g.fillStyle(color, a); g.fillCircle(x + k * s * 0.55, y - s * 1.05, s * 0.16);
  }
  g.lineStyle(Math.max(1, s * 0.14), color, a); g.lineBetween(x - s * 0.72, y - s * 0.55, x + s * 0.72, y - s * 0.55);
  g.lineStyle(Math.max(0.6, s * 0.06), lit(color, 0.5), a);
  for (let i = -1.5; i <= 1.5; i++) g.lineBetween(x + i * s * 0.25, y - s * 0.55, x + i * s * 0.2, y + s * 0.95);
}

// ── Brass ────────────────────────────────────────────────────────────

/**
 * A horn's bell seen at an angle: a flared cone from a narrow throat to a wide rim facing `a`,
 * with the dark inside of the mouth, a bright rim and a highlight along the flare.
 */
export function hornBell(g: G, x: number, y: number, a: number, r: number, len: number, color = BRASS, glowK = 0): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const px = -sa, py = ca;
  const tx = x - ca * len, ty = y - sa * len;
  // The flare: throat to rim, sides curving out.
  const side = (k: number): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const w = r * 0.16 + r * 0.84 * Math.pow(u, 2.4);
      pts.push({ x: tx + ca * len * u + px * w * k, y: ty + sa * len * u + py * w * k });
    }
    return pts;
  };
  const left = side(-1), right = side(1).reverse();
  g.fillStyle(dim(color, 0.3), 1); g.fillPoints([...left, ...right], true);
  g.fillStyle(color, 1); g.fillPoints([...left.map((p) => ({ x: p.x + px * 1.5, y: p.y + py * 1.5 })), ...right.map((p) => ({ x: p.x - px * 2.5, y: p.y - py * 2.5 }))], true);
  // Highlight along one side of the flare.
  g.lineStyle(Math.max(1, r * 0.08), BRASS_SHINE, 0.55);
  g.beginPath();
  left.forEach((p, i) => { const q = { x: p.x + px * r * 0.22 * (i / 8), y: p.y + py * r * 0.22 * (i / 8) }; if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); });
  g.strokePath();
  // The mouth.
  const rim = ellipsePts(x, y, r * 0.26, r, a, 20);
  g.fillStyle(BRASS_DEEP, 1); g.fillPoints(rim, true);
  if (glowK > 0) { g.fillStyle(BRASS_LIT, 0.5 * glowK); g.fillPoints(ellipsePts(x, y, r * 0.2, r * 0.8, a, 18), true); }
  g.fillStyle(dim(BRASS_DEEP, 0.4), 0.9); g.fillPoints(ellipsePts(x - ca * r * 0.06, y - sa * r * 0.06, r * 0.14, r * 0.55, a, 16), true);
  g.lineStyle(Math.max(1.5, r * 0.1), lit(color, 0.35), 1); g.strokePoints(rim, true);
  g.lineStyle(1, BRASS_SHINE, 0.7);
  g.beginPath(); g.arc(x, y, r * 0.95, a - Math.PI / 2 - 0.3, a - Math.PI / 2 + 0.6, false); g.strokePath();
}

/**
 * A long straight herald trumpet with a tabard banner hanging from it. (x, y) is the
 * mouthpiece; the bell is `len` along angle `a`.
 */
export function heraldTrumpet(g: G, x: number, y: number, a: number, len: number, s = 1, banner = SCARLET, glowK = 0): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const bx = x + ca * len, by = y + sa * len;
  g.lineStyle(4 * s, BRASS_DARK, 1); g.lineBetween(x, y, bx - ca * 14 * s, by - sa * 14 * s);
  g.lineStyle(2.5 * s, BRASS, 1); g.lineBetween(x, y, bx - ca * 14 * s, by - sa * 14 * s);
  g.lineStyle(1, BRASS_SHINE, 0.6); g.lineBetween(x, y - 1, bx - ca * 14 * s, by - sa * 14 * s - 1);
  // Ferrules along the tube.
  for (const u of [0.2, 0.55]) {
    const fx = x + ca * len * u, fy = y + sa * len * u;
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(fx, fy, 2.6 * s);
  }
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 2.4 * s);
  hornBell(g, bx, by, a, 9 * s, 16 * s, BRASS, glowK);
  // The tabard banner: a square of scarlet with a gold fringe and the lyre, hung from the tube.
  const hx = x + ca * len * 0.38, hy = y + sa * len * 0.38;
  const hx2 = x + ca * len * 0.7, hy2 = y + sa * len * 0.7;
  const drop = 22 * s;
  g.fillStyle(dim(banner, 0.3), 1);
  g.fillPoints([{ x: hx, y: hy }, { x: hx2, y: hy2 }, { x: hx2, y: hy2 + drop }, { x: (hx + hx2) / 2, y: (hy + hy2) / 2 + drop + 6 * s }, { x: hx, y: hy + drop }], true);
  g.fillStyle(banner, 1);
  g.fillPoints([{ x: hx + 1, y: hy + 1 }, { x: hx2 - 1, y: hy2 + 1 }, { x: hx2 - 1, y: hy2 + drop - 2 }, { x: (hx + hx2) / 2, y: (hy + hy2) / 2 + drop + 3 * s }, { x: hx + 1, y: hy + drop - 2 }], true);
  g.lineStyle(1.5 * s, BRASS_LIT, 1);
  g.lineBetween(hx, hy + drop, (hx + hx2) / 2, (hy + hy2) / 2 + drop + 6 * s);
  g.lineBetween((hx + hx2) / 2, (hy + hy2) / 2 + drop + 6 * s, hx2, hy2 + drop);
  lyre(g, (hx + hx2) / 2, (hy + hy2) / 2 + drop * 0.5, 5 * s, BRASS_LIT);
}

/**
 * A giant wall-mounted sousaphone: a great coil of tube behind, valves on the coil, the bell
 * mouth at (x, y) facing `a`. Used for the Sousaphone fight's horns and the Brass Section.
 */
export function giantHorn(g: G, x: number, y: number, a: number, R: number, glowK = 0, color = BRASS): void {
  const ca = Math.cos(a), sa = Math.sin(a);
  const cx = x - ca * R * 1.9, cy = y - sa * R * 1.9;
  // The coil: two loops of thick tube.
  for (const [rr, w, c] of [[R * 1.05, R * 0.34, dim(color, 0.35)], [R * 1.05, R * 0.24, color], [R * 0.62, R * 0.2, dim(color, 0.2)]] as [number, number, number][]) {
    g.lineStyle(w, c, 1); g.strokeCircle(cx, cy, rr);
  }
  g.lineStyle(R * 0.05, BRASS_SHINE, 0.5);
  g.beginPath(); g.arc(cx, cy, R * 1.12, Math.PI * 1.1, Math.PI * 1.6, false); g.strokePath();
  // Three valves on the coil, with pearl buttons.
  for (let i = 0; i < 3; i++) {
    const va = a + Math.PI + (i - 1) * 0.32;
    const vx = cx + Math.cos(va) * R * 0.62, vy = cy + Math.sin(va) * R * 0.62;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(vx - R * 0.09, vy - R * 0.3, R * 0.18, R * 0.5);
    g.fillStyle(color, 1); g.fillRect(vx - R * 0.07, vy - R * 0.3, R * 0.14, R * 0.46);
    g.fillStyle(CREAM, 1); g.fillCircle(vx, vy - R * 0.34, R * 0.08);
  }
  // The leadpipe running from the coil into the bell.
  g.lineStyle(R * 0.22, dim(color, 0.3), 1); g.lineBetween(cx + ca * R * 1.0, cy + sa * R * 1.0, x - ca * R * 0.9, y - sa * R * 0.9);
  g.lineStyle(R * 0.15, color, 1); g.lineBetween(cx + ca * R * 1.0, cy + sa * R * 1.0, x - ca * R * 0.9, y - sa * R * 0.9);
  hornBell(g, x, y, a, R, R * 1.0, color, glowK);
  if (glowK > 0) glow(g, x + ca * R * 0.4, y + sa * R * 0.4, R * 1.2, BRASS_LIT, 0.05 * glowK, 3);
}

/** A drum seen from the side: shell, two hoops, zig-zag tension ropes; bass drums get a painted lyre. */
export function drum(g: G, x: number, y: number, r: number, shell = SCARLET, bass = false, beatK = 0): void {
  const h = bass ? r * 0.7 : r * 1.1;
  shadow(g, x, y + r * 0.5, r * 2.2, r * 0.5, 0.25);
  g.fillStyle(dim(shell, 0.3), 1); g.fillRect(x - r, y - h, r * 2, h);
  g.fillStyle(shell, 1); g.fillRect(x - r + 2, y - h, r * 2 - 4, h - 2);
  g.fillStyle(lit(shell, 0.25), 0.6); g.fillRect(x - r + 3, y - h, r * 0.3, h - 3);
  // Ropes.
  g.lineStyle(1.2, BRAID, 0.95);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x0 = x - r + (i / n) * r * 2, x1 = x - r + ((i + 0.5) / n) * r * 2, x2 = x - r + ((i + 1) / n) * r * 2;
    g.lineBetween(x0, y - h + 3, x1, y - 3); g.lineBetween(x1, y - 3, x2, y - h + 3);
  }
  // Hoops.
  for (const hy of [y - h, y - 2]) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(x - r - 1, hy - 2, r * 2 + 2, 4);
    g.fillStyle(BRASS, 1); g.fillRect(x - r - 1, hy - 2, r * 2 + 2, 2);
  }
  // The skin on top, trembling on a beat.
  const sk = 1 + beatK * 0.08;
  g.fillStyle(CREAM, 1); g.fillEllipse(x, y - h, r * 2 * sk, r * 0.55 * sk);
  g.lineStyle(1, dim(CREAM, 0.25), 1); g.strokeEllipse(x, y - h, r * 2, r * 0.55);
  if (beatK > 0) { g.lineStyle(1.5, BRASS_LIT, beatK); g.strokeEllipse(x, y - h, r * 2.4 * sk, r * 0.7 * sk); }
  if (bass) lyre(g, x, y - h * 0.5, r * 0.3, BRASS_LIT);
}

/** A music stand: three-legged foot, a stem, and a lyre-backed desk with a sheet of music on it. */
export function musicStand(g: G, x: number, y: number, s = 1, sheet = true): void {
  g.lineStyle(1.5 * s, NAVY_DARK, 1);
  g.lineBetween(x, y - 4 * s, x - 7 * s, y); g.lineBetween(x, y - 4 * s, x + 7 * s, y); g.lineBetween(x, y - 4 * s, x, y + 2 * s);
  g.lineStyle(2 * s, NAVY_DARK, 1); g.lineBetween(x, y - 4 * s, x, y - 26 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 10 * s, y - 38 * s, 20 * s, 13 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 9 * s, y - 37 * s, 18 * s, 2 * s);
  if (sheet) {
    g.fillStyle(CREAM, 1); g.fillRect(x - 8 * s, y - 40 * s, 16 * s, 12 * s);
    g.lineStyle(0.6, NOTE_INK, 0.6);
    for (let i = 0; i < 3; i++) g.lineBetween(x - 7 * s, y - 38 * s + i * 3.5 * s, x + 7 * s, y - 38 * s + i * 3.5 * s);
    g.fillStyle(NOTE_INK, 0.8); g.fillCircle(x - 3 * s, y - 36 * s, 0.9 * s); g.fillCircle(x + 2 * s, y - 33 * s, 0.9 * s);
  }
}

/** A tuning fork on a wooden sounding-box. `hum` (0–1) blurs the tines as it rings. */
export function tuningFork(g: G, x: number, y: number, s: number, color: number, hum = 0, t = 0): void {
  shadow(g, x, y + 2, 34 * s, 10 * s, 0.3);
  // The sounding box.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 15 * s, y - 12 * s, 30 * s, 12 * s);
  g.fillStyle(WOOD, 1); g.fillRect(x - 14 * s, y - 12 * s, 28 * s, 9 * s);
  g.fillStyle(WOOD_DARK, 1); g.fillEllipse(x, y - 7 * s, 9 * s, 4 * s);
  g.fillStyle(color, 1); g.fillRect(x - 14 * s, y - 3 * s, 28 * s, 2 * s);
  // Stem and the U of the tines.
  const shake = hum > 0 ? Math.sin(t / 16) * 2.2 * hum * s : 0;
  g.fillStyle(SILVER_DARK, 1); g.fillRect(x - 2.5 * s, y - 30 * s, 5 * s, 19 * s);
  g.lineStyle(6 * s, SILVER_DARK, 1);
  g.beginPath(); g.arc(x, y - 36 * s, 8 * s, 0, Math.PI, false); g.strokePath();
  for (const k of [-1, 1]) {
    const tx = x + k * 8 * s + k * shake;
    g.lineStyle(6 * s, SILVER_DARK, 1); g.lineBetween(x + k * 8 * s, y - 36 * s, tx, y - 82 * s);
    g.lineStyle(3.5 * s, SILVER, 1); g.lineBetween(x + k * 8 * s, y - 36 * s, tx, y - 82 * s);
    g.lineStyle(1, 0xffffff, 0.7); g.lineBetween(x + k * 8 * s - 1, y - 40 * s, tx - 1, y - 80 * s);
    if (hum > 0) { g.lineStyle(2 * s, color, 0.25 * hum); g.lineBetween(x + k * 8 * s, y - 40 * s, x + k * 8 * s - k * shake * 2, y - 82 * s); }
  }
  g.lineStyle(4 * s, SILVER, 1);
  g.beginPath(); g.arc(x, y - 36 * s, 8 * s, 0.1, Math.PI - 0.1, false); g.strokePath();
  // A coloured pitch-band round the stem.
  g.fillStyle(color, 1); g.fillRect(x - 3.5 * s, y - 24 * s, 7 * s, 4 * s);
  g.fillStyle(lit(color, 0.4), 1); g.fillRect(x - 3.5 * s, y - 24 * s, 7 * s, 1.2 * s);
  if (hum > 0) glow(g, x, y - 60 * s, 26 * s, color, 0.06 * hum, 3);
}

// ── People in the band ───────────────────────────────────────────────

export type BandPart = 'drum' | 'bass' | 'cornet' | 'trombone' | 'tuba' | 'mace' | 'trumpet' | 'none';

/**
 * A bandsman, marching: navy trousers stepping on the beat (`step` flips feet), a scarlet tunic
 * with cream cross-belts and brass buttons, a peaked cap with a white plume, and an instrument.
 * (x, y) is his feet; he faces `dir` (−1 left / +1 right) for the instrument side.
 */
export function bandsman(g: G, x: number, y: number, s: number, part: BandPart, step: number, dir = 1, tunic = SCARLET, t = 0): void {
  shadow(g, x, y + 1, 26 * s, 8 * s, 0.28);
  const lift = Math.abs(Math.sin(step * Math.PI)) * 4 * s;
  // Legs.
  g.fillStyle(NAVY_DARK, 1);
  g.fillRect(x - 6 * s, y - 14 * s - (step % 2 < 1 ? lift : 0), 5 * s, 14 * s);
  g.fillRect(x + 1 * s, y - 14 * s - (step % 2 < 1 ? 0 : lift), 5 * s, 14 * s);
  g.fillStyle(BRAID, 0.9);
  g.fillRect(x - 5 * s, y - 14 * s, 1.2 * s, 12 * s); g.fillRect(x + 4 * s, y - 14 * s, 1.2 * s, 12 * s);
  g.fillStyle(0x16120e, 1);
  g.fillEllipse(x - 3.5 * s, y - (step % 2 < 1 ? lift : 0), 8 * s, 4 * s); g.fillEllipse(x + 3.5 * s, y - (step % 2 < 1 ? 0 : lift), 8 * s, 4 * s);
  // Tunic.
  const ty = y - 14 * s;
  g.fillStyle(dim(tunic, 0.25), 1); g.fillRoundedRect(x - 10 * s, ty - 20 * s, 20 * s, 22 * s, 5 * s);
  g.fillStyle(tunic, 1); g.fillRoundedRect(x - 9 * s, ty - 20 * s, 18 * s, 20 * s, 5 * s);
  g.lineStyle(2 * s, BRAID, 1); g.lineBetween(x - 8 * s, ty - 18 * s, x + 7 * s, ty - 2 * s); g.lineBetween(x + 8 * s, ty - 18 * s, x - 7 * s, ty - 2 * s);
  g.fillStyle(BRASS_LIT, 1); for (let i = 0; i < 3; i++) g.fillCircle(x, ty - 15 * s + i * 5 * s, 1.1 * s);
  // Epaulettes.
  for (const k of [-1, 1]) { g.fillStyle(BRASS, 1); g.fillEllipse(x + k * 9 * s, ty - 18 * s, 7 * s, 3.5 * s); }
  // Head and cap.
  const hy = ty - 26 * s;
  g.fillStyle(0xe4c4a4, 1); g.fillCircle(x, hy, 6.5 * s);
  g.fillStyle(0x2a1a10, 1); g.fillCircle(x + dir * 2.4 * s, hy - 0.5 * s, 0.9 * s);
  g.fillStyle(NAVY, 1); g.fillRect(x - 7 * s, hy - 10 * s, 14 * s, 6 * s);
  g.fillStyle(BRASS, 1); g.fillRect(x - 7 * s, hy - 5.5 * s, 14 * s, 1.6 * s);
  g.fillStyle(NAVY_DARK, 1); g.fillEllipse(x + dir * 3 * s, hy - 4 * s, 12 * s, 3 * s);
  g.fillStyle(SNOW, 1); g.fillEllipse(x - dir * 2 * s, hy - 15 * s + Math.sin(t / 140 + x) * 0.6, 3.5 * s, 9 * s);
  // The instrument.
  const ix = x + dir * 9 * s, iy = ty - 12 * s;
  switch (part) {
    case 'drum': drum(g, x, ty + 2 * s, 8 * s, BRAID, false); break;
    case 'bass': drum(g, x, ty + 6 * s, 13 * s, SCARLET_DARK, true); break;
    case 'cornet': {
      g.lineStyle(3 * s, BRASS_DARK, 1); g.lineBetween(x + dir * 3 * s, hy + 3 * s, ix + dir * 6 * s, iy - 4 * s);
      hornBell(g, ix + dir * 11 * s, iy - 6 * s, dir > 0 ? -0.3 : Math.PI + 0.3, 4 * s, 6 * s);
      break;
    }
    case 'trombone': {
      const slide = Math.sin(t / 180 + x * 0.1) * 5 * s;
      g.lineStyle(2 * s, BRASS, 1);
      g.lineBetween(x + dir * 2 * s, hy + 2 * s, ix + dir * (16 * s + slide), hy + 2 * s);
      g.lineBetween(x + dir * 4 * s, hy + 6 * s, ix + dir * (16 * s + slide), hy + 6 * s);
      g.lineBetween(ix + dir * (16 * s + slide), hy + 2 * s, ix + dir * (16 * s + slide), hy + 6 * s);
      hornBell(g, x - dir * 6 * s, hy - 2 * s, dir > 0 ? Math.PI + 0.2 : -0.2, 4.5 * s, 7 * s);
      break;
    }
    case 'tuba': {
      g.lineStyle(4 * s, BRASS_DARK, 1); g.strokeCircle(x, ty - 8 * s, 9 * s);
      g.lineStyle(2.5 * s, BRASS, 1); g.strokeCircle(x, ty - 8 * s, 9 * s);
      hornBell(g, x - dir * 4 * s, hy - 14 * s, -Math.PI / 2 - dir * 0.4, 9 * s, 10 * s);
      break;
    }
    case 'trumpet': heraldTrumpet(g, x + dir * 3 * s, hy + 3 * s, dir > 0 ? -0.25 : Math.PI + 0.25, 30 * s, s * 0.7); break;
    case 'mace': {
      const spin = t / 260;
      const mx = x + dir * 10 * s, my = ty - 12 * s;
      const ex = mx + Math.cos(spin) * 16 * s, ey = my + Math.sin(spin) * 16 * s;
      g.lineStyle(2 * s, SILVER_DARK, 1); g.lineBetween(mx - (ex - mx), my - (ey - my), ex, ey);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(ex, ey, 3.5 * s);
      g.fillStyle(BRASS, 1); g.fillCircle(mx - (ex - mx), my - (ey - my), 1.8 * s);
      break;
    }
    case 'none': break;
  }
}

// ── Buildings and set pieces (world) ─────────────────────────────────

/**
 * A bandstand: an octagonal cream deck on a brick plinth with three steps, eight slender iron
 * posts with brass brackets, and a scalloped canopy roof striped scarlet and cream with a lyre
 * finial. (x, y) is the front foot of the plinth; `r` the deck radius.
 */
export function bandstand(g: G, x: number, y: number, r: number, rng: () => number, roof = true): void {
  const cy = y - r * 0.45;
  const oct = (rr: number, oy: number, sq = 0.5): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; pts.push({ x: x + Math.cos(a) * rr, y: oy + Math.sin(a) * rr * sq }); }
    return pts;
  };
  shadow(g, x, y + 4, r * 2.4, r * 0.7, 0.3);
  // Brick plinth.
  g.fillStyle(BRICK_DARK, 1); g.fillPoints(oct(r * 1.04, cy + 14), true);
  g.fillStyle(BRICK, 1); g.fillPoints(oct(r, cy + 12), true);
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * 0.1 + (i / 14) * Math.PI * 0.8;
    g.fillStyle(dim(BRICK, 0.2 + rng() * 0.15), 0.7);
    g.fillRect(x + Math.cos(a) * r * 0.92 - 5, cy + 12 + Math.sin(a) * r * 0.48 - 2, 10, 4);
  }
  // Lattice skirt below the deck.
  g.lineStyle(1, CREAM, 0.6);
  for (let k = -r; k < r; k += 9) g.lineBetween(x + k, cy + 12 + r * 0.36, x + k + 9, cy + 12 + r * 0.44);
  // The deck.
  g.fillStyle(dim(CREAM, 0.2), 1); g.fillPoints(oct(r, cy + 2), true);
  g.fillStyle(WOOD_LIT, 1); g.fillPoints(oct(r * 0.94, cy), true);
  g.lineStyle(1, WOOD, 0.5);
  for (let k = -r; k < r; k += 8) g.lineBetween(x + k, cy - r * 0.42, x + k, cy + r * 0.42);
  // Steps at the front.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(k % 2 ? STONE : STONE_LIT, 1);
    g.fillRect(x - 20 - k * 4, cy + r * 0.46 + k * 5, 40 + k * 8, 6);
  }
  // Music stands and chairs in a ring on the deck.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    const sx = x + Math.cos(a) * r * 0.6, sy = cy + Math.sin(a) * r * 0.28;
    g.fillStyle(WOOD_DARK, 1); g.fillRect(sx - 4, sy - 6, 8, 6);
    musicStand(g, sx + Math.cos(a) * -8, sy + 2, 0.5);
  }
  if (!roof) return;
  // Posts.
  const top = cy - r * 1.35;
  const posts = oct(r * 0.9, cy);
  for (const p of posts) {
    if (p.y < cy - r * 0.2) continue; // the back posts are hidden behind the canopy's shadow side
    g.fillStyle(NAVY_DARK, 1); g.fillRect(p.x - 2, top + r * 0.3, 4, p.y - top - r * 0.3);
    g.fillStyle(CREAM, 1); g.fillRect(p.x - 1.2, top + r * 0.3, 2.4, p.y - top - r * 0.3);
    // Brass brackets curling up to the eave.
    g.lineStyle(1.5, BRASS, 1);
    g.beginPath(); g.arc(p.x + (p.x < x ? 8 : -8), top + r * 0.42, 8, p.x < x ? Math.PI : -Math.PI / 2, p.x < x ? Math.PI * 1.5 : 0, false); g.strokePath();
  }
  for (const p of posts) {
    if (p.y >= cy - r * 0.2) continue;
    g.fillStyle(dim(CREAM, 0.3), 1); g.fillRect(p.x - 1.2, top + r * 0.3, 2.4, p.y - top - r * 0.3);
  }
  // The canopy: an octagonal cone in alternating scarlet and cream gores, scalloped valance.
  const eave = oct(r * 1.1, top + r * 0.32, 0.42);
  const apex = { x, y: top - r * 0.4 };
  for (let i = 0; i < 8; i++) {
    const a = eave[i], b = eave[(i + 1) % 8];
    const front = (a.y + b.y) / 2 > top + r * 0.32;
    g.fillStyle(i % 2 ? (front ? CREAM : dim(CREAM, 0.2)) : (front ? SCARLET : SCARLET_DARK), 1);
    g.fillTriangle(apex.x, apex.y, a.x, a.y, b.x, b.y);
  }
  g.lineStyle(1, BRASS_DARK, 0.6);
  for (const p of eave) g.lineBetween(apex.x, apex.y, p.x, p.y);
  // Valance scallops along the front.
  for (let i = 0; i < 8; i++) {
    const a = eave[i], b = eave[(i + 1) % 8];
    if ((a.y + b.y) / 2 < top + r * 0.3) continue;
    for (let k = 0; k < 3; k++) {
      const u = (k + 0.5) / 3;
      const sx = a.x + (b.x - a.x) * u, sy = a.y + (b.y - a.y) * u;
      g.fillStyle(i % 2 ? SCARLET : CREAM, 1);
      g.beginPath(); g.arc(sx, sy, Math.abs(b.x - a.x) / 6 + 2, 0, Math.PI, false); g.fillPath();
    }
  }
  g.lineStyle(2, BRASS, 1); g.strokePoints(eave, true);
  // The finial: a brass ball and a lyre vane.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(apex.x - 1.5, apex.y - 16, 3, 16);
  g.fillStyle(BRASS, 1); g.fillCircle(apex.x, apex.y - 2, 4);
  lyre(g, apex.x, apex.y - 22, 6, BRASS_LIT);
}

/**
 * A chimney whose cap is the flared bell of a sousaphone, polished and pointing at the sky,
 * on a brick stack. (x, y) is the base of the stack; `h` its height.
 */
export function bellChimney(g: G, x: number, y: number, h: number, s = 1, tilt = -Math.PI / 2 - 0.15): void {
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 9 * s, y - h, 18 * s, h);
  g.fillStyle(BRICK, 1); g.fillRect(x - 8 * s, y - h, 14 * s, h);
  for (let k = 6; k < h; k += 7) { g.lineStyle(0.8, BRICK_DARK, 0.7); g.lineBetween(x - 8 * s, y - k, x + 6 * s, y - k); }
  // The brass tube rising out of the stack and bending into a bell.
  const tx = x, ty = y - h;
  g.lineStyle(9 * s, BRASS_DARK, 1);
  g.beginPath(); g.moveTo(tx, ty + 4); g.lineTo(tx, ty - 14 * s); g.strokePath();
  g.lineStyle(6 * s, BRASS, 1);
  g.beginPath(); g.moveTo(tx, ty + 4); g.lineTo(tx, ty - 14 * s); g.strokePath();
  g.fillStyle(BRASS_LIT, 1); g.fillRect(tx - 6 * s, ty - 2, 12 * s, 3 * s);
  hornBell(g, tx + Math.cos(tilt) * 24 * s, ty - 14 * s + Math.sin(tilt) * 24 * s, tilt, 15 * s, 24 * s);
}

/**
 * A bandsman's terrace house: whitewashed or painted wall, slate roof, a sousaphone-bell
 * chimney, window boxes, a cornet hung over the door as a house-sign, and a tuning-reed plate
 * by the door with each Part in the house stamped on it.
 */
export function bandHouse(g: G, x: number, y: number, w: number, h: number, wall: number, rng: () => number, chimneyLeft = rng() < 0.5): void {
  shadow(g, x, y + 4, w * 1.08, 20);
  const x0 = x - w / 2;
  // Wall.
  g.fillStyle(dim(wall, 0.25), 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(wall, 1); g.fillRect(x0 + 2, y - h, w - 4, h - 2);
  g.fillStyle(dim(wall, 0.12), 1); g.fillRect(x0 + 2, y - 10, w - 4, 8);
  // Quoins.
  for (let k = 0; k < h - 10; k += 12) {
    g.fillStyle(STONE_LIT, 1); g.fillRect(x0, y - h + k, 7, 6); g.fillRect(x0 + w - 7, y - h + k + 6, 7, 6);
  }
  // Chimney (behind the roof).
  const chx = chimneyLeft ? x0 + w * 0.22 : x0 + w * 0.78;
  bellChimney(g, chx, y - h - h * 0.35, h * 0.35 + 4, 0.8, chimneyLeft ? -Math.PI / 2 - 0.3 : -Math.PI / 2 + 0.3);
  // Slate roof.
  const ry = y - h;
  const peak = h * 0.55;
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x0 - 10, ry + 4, x0 + w + 10, ry + 4, x, ry - peak);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 6, ry + 2, x0 + w + 6, ry + 2, x, ry - peak + 4);
  for (let k = 1; k < 6; k++) {
    const yy = ry + 2 - (peak - 4) * (k / 6);
    const half = (w / 2 + 6) * (1 - k / 6);
    g.lineStyle(1, SLATE_DARK, 0.7); g.lineBetween(x - half, yy, x + half, yy);
  }
  g.fillStyle(SNOW, 0.8); g.fillTriangle(x - 18, ry - peak + 16, x + 18, ry - peak + 16, x, ry - peak + 4);
  // Windows with window boxes of red geraniums.
  const nWin = Math.max(2, Math.floor(w / 46));
  for (let i = 0; i < nWin; i++) {
    const wx = x0 + (w / (nWin + 1)) * (i + 1);
    if (Math.abs(wx - x) < 16) continue;
    const wy = y - h * 0.68;
    g.fillStyle(NAVY_DARK, 1); g.fillRect(wx - 9, wy - 12, 18, 22);
    g.fillStyle(0xffe6a0, 0.55 + rng() * 0.25); g.fillRect(wx - 7, wy - 10, 14, 18);
    g.lineStyle(1.5, CREAM, 1); g.strokeRect(wx - 8, wy - 11, 16, 20); g.lineBetween(wx, wy - 11, wx, wy + 9); g.lineBetween(wx - 8, wy - 1, wx + 8, wy - 1);
    g.fillStyle(WOOD_DARK, 1); g.fillRect(wx - 11, wy + 10, 22, 5);
    for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? SCARLET_LIT : SCARLET, 1); g.fillCircle(wx - 8 + k * 4, wy + 9, 2.2); }
    g.fillStyle(LAWN_DARK, 1); g.fillRect(wx - 10, wy + 11, 20, 1.5);
  }
  // The door: a scarlet door with a brass knocker, a fanlight, and the cornet house-sign.
  g.fillStyle(dim(SCARLET, 0.35), 1); g.fillRect(x - 11, y - 34, 22, 32);
  g.fillStyle(SCARLET, 1); g.fillRect(x - 9, y - 32, 18, 30);
  g.fillStyle(0xffe6a0, 0.6); g.beginPath(); g.arc(x, y - 34, 9, Math.PI, 0, false); g.fillPath();
  g.lineStyle(1, CREAM, 1); g.beginPath(); g.arc(x, y - 34, 10, Math.PI, 0, false); g.strokePath();
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + 5, y - 17, 1.6);
  g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(x + 12, y - 48, x + 24, y - 48);
  hornBell(g, x + 30, y - 44, 0.4, 5, 9);
  // The Part plate: a brass plate of reeds, one per voice in the house.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 24, y - 30, 9, 16);
  g.fillStyle(BRASS, 1); g.fillRect(x - 23, y - 29, 7, 14);
  for (let k = 0; k < 3; k++) { g.fillStyle(NOTE_INK, 0.7); g.fillRect(x - 22 + k * 2, y - 27 + k, 1, 9); }
  // Step.
  g.fillStyle(STONE, 1); g.fillRect(x - 14, y - 3, 28, 4);
}

/**
 * The Horn-Foundry: a long brick works with three bell-mouthed chimneys, a wide open bay where
 * brass sheet is spun into bells on a lathe in the furnace light, racks of finished horns
 * hanging outside, and a gilt sign of a great sousaphone over the bay.
 */
export function hornFoundry(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.06, 30);
  const x0 = x - w / 2;
  // Chimneys first (behind).
  for (const [u, ch] of [[0.14, 1.0], [0.5, 1.25], [0.86, 0.95]] as [number, number][]) bellChimney(g, x0 + w * u, y - h, h * 0.55 * ch, 1.4, -Math.PI / 2 + (u - 0.5) * 0.6);
  // The long brick wall.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(BRICK, 1); g.fillRect(x0 + 3, y - h + 3, w - 6, h - 6);
  for (let row = 0; row < h / 7; row++) {
    const yy = y - h + 6 + row * 7;
    g.lineStyle(0.7, BRICK_DARK, 0.6); g.lineBetween(x0 + 3, yy, x0 + w - 3, yy);
    for (let k = (row % 2) * 9; k < w; k += 18) { g.lineBetween(x0 + k, yy, x0 + k, yy + 7); }
  }
  // Saw-tooth roof lights.
  const teeth = Math.floor(w / 70);
  for (let i = 0; i < teeth; i++) {
    const tx = x0 + i * (w / teeth);
    g.fillStyle(SLATE_DARK, 1); g.fillTriangle(tx, y - h, tx + w / teeth, y - h, tx + w / teeth, y - h - 30);
    g.fillStyle(0xbcd8ea, 0.7); g.fillTriangle(tx + 3, y - h, tx + w / teeth - 3, y - h - 2, tx + w / teeth - 3, y - h - 26);
    g.fillStyle(SNOW, 0.85); g.fillRect(tx + w / teeth - 6, y - h - 30, 6, 4);
  }
  // The open bay, glowing with the furnace.
  const bw = w * 0.42, bh = h * 0.7, bx = x - bw / 2, by = y - bh;
  g.fillStyle(0x1a0e08, 1); g.fillRect(bx, by, bw, bh);
  glow(g, x - bw * 0.25, y - bh * 0.35, bh * 0.7, FURNACE, 0.08, 4);
  // The furnace mouth.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(bx + 10, y - bh * 0.6, bw * 0.26, bh * 0.6);
  g.fillStyle(FURNACE, 1); g.beginPath(); g.arc(bx + 10 + bw * 0.13, y - bh * 0.18, bw * 0.09, Math.PI, 0, false); g.fillPath();
  g.fillStyle(FURNACE_HOT, 1); g.fillRect(bx + 10 + bw * 0.13 - bw * 0.06, y - bh * 0.18, bw * 0.12, 4);
  // The spinning lathe: a headstock, a brass bell being spun on it.
  const lx = x + bw * 0.12, ly = y - bh * 0.32;
  g.fillStyle(0x3a3a40, 1); g.fillRect(lx - 40, ly + 8, 90, 10);
  g.fillStyle(0x50505a, 1); g.fillRect(lx - 44, ly - 16, 18, 26);
  hornBell(g, lx + 30, ly - 2, 0, 14, 40, BRASS, 0.3);
  g.fillStyle(0x3a3a40, 1); g.fillRect(lx + 46, ly - 10, 8, 26);
  // Horns hanging on racks inside the bay.
  for (let i = 0; i < 4; i++) {
    const hx = bx + bw * 0.55 + i * 20, hy = by + 18;
    g.lineStyle(1, 0x6a6a70, 1); g.lineBetween(hx, by + 4, hx, hy);
    hornBell(g, hx, hy + 12, Math.PI / 2, 6, 12, i % 2 ? BRASS : BRONZE);
  }
  // Bay frame.
  g.lineStyle(5, BRICK_DARK, 1); g.strokeRect(bx, by, bw, bh);
  g.fillStyle(STONE_LIT, 1); g.fillRect(bx - 6, by - 10, bw + 12, 10);
  // Windows either side of the bay.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const wx = x + side * (bw / 2 + 40 + i * 60), wy = y - h * 0.62;
      g.fillStyle(0x24140c, 1); g.beginPath(); g.arc(wx, wy, 16, Math.PI, 0, false); g.fillPath(); g.fillRect(wx - 16, wy, 32, 28);
      g.fillStyle(FURNACE, 0.35 + rng() * 0.2); g.fillRect(wx - 13, wy - 6, 26, 32);
      g.lineStyle(2, STONE_LIT, 1); g.lineBetween(wx, wy - 16, wx, wy + 28); g.lineBetween(wx - 16, wy + 8, wx + 16, wy + 8);
    }
  }
  // The sign: a gilt sousaphone on a navy board.
  g.fillStyle(NAVY_DARK, 1); g.fillRect(x - 70, y - h - 2, 140, 30);
  g.fillStyle(NAVY, 1); g.fillRect(x - 67, y - h + 1, 134, 24);
  g.lineStyle(1.5, BRASS, 1); g.strokeRect(x - 67, y - h + 1, 134, 24);
  g.lineStyle(4, BRASS, 1); g.strokeCircle(x - 30, y - h + 13, 8);
  hornBell(g, x - 12, y - h + 6, -0.5, 7, 12);
  for (let k = 0; k < 5; k++) { g.fillStyle(BRASS_LIT, 1); g.fillRect(x + 6 + k * 10, y - h + 11, 6, 3); }
  // Stacked finished horns and a bin of brass sheet outside.
  for (let i = 0; i < 3; i++) hornBell(g, x0 + 24 + i * 16, y - 8 - i * 3, -Math.PI / 2 + 0.3 * (i - 1), 8, 14, i % 2 ? BRONZE : BRASS);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x0 + w - 60, y - 20, 44, 20);
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? BRASS_LIT : BRASS, 1); g.fillRect(x0 + w - 58, y - 24 - k * 3, 40, 3); }
}

/**
 * A herald tower: a herald trumpet as tall as a tower, standing on its mouthpiece in a stone
 * plinth, its great bell turned out over the gate, a scarlet tabard as long as a sail hanging
 * from its tube. (x, y) is the plinth foot; `face` is ±1 (which way the bell leans).
 */
export function heraldTower(g: G, x: number, y: number, h: number, face: number, rng: () => number): void {
  shadow(g, x, y + 6, 90, 26);
  // Plinth: stepped cream stone with a brass band.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 38, y - 30, 76, 30);
  g.fillStyle(STONE, 1); g.fillRect(x - 35, y - 32, 70, 26);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 35, y - 32, 70, 4);
  g.fillStyle(BRASS, 1); g.fillRect(x - 35, y - 18, 70, 4);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 26, y - 56, 52, 26);
  g.fillStyle(STONE, 1); g.fillRect(x - 24, y - 58, 48, 24);
  lyre(g, x, y - 46, 8, BRASS_DARK);
  // The tube, rising and leaning a little toward the bell.
  const topX = x + face * 30, topY = y - h;
  for (const [w, c] of [[16, BRASS_DARK], [11, BRASS], [3, BRASS_SHINE]] as [number, number][]) {
    g.lineStyle(w, c, c === BRASS_SHINE ? 0.5 : 1);
    g.lineBetween(x - (c === BRASS_SHINE ? 3 : 0), y - 58, topX - (c === BRASS_SHINE ? 3 : 0), topY + 30);
  }
  // Ferrules / garlands.
  for (const u of [0.25, 0.5, 0.75]) {
    const fx = x + (topX - x) * u, fy = y - 58 + (topY + 30 - (y - 58)) * u;
    g.fillStyle(BRASS_LIT, 1); g.fillEllipse(fx, fy, 22, 8);
    g.fillStyle(BRASS_DARK, 1); g.fillEllipse(fx, fy + 2, 20, 4);
  }
  // The tabard banner hanging from a crossbar.
  const cbY = y - h * 0.62, cbX = x + (topX - x) * 0.62;
  g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(cbX - 34, cbY, cbX + 34, cbY);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(cbX - 34, cbY, 4); g.fillCircle(cbX + 34, cbY, 4);
  const bh = h * 0.34;
  g.fillStyle(SCARLET_DARK, 1); g.fillPoints([{ x: cbX - 30, y: cbY }, { x: cbX + 30, y: cbY }, { x: cbX + 30, y: cbY + bh }, { x: cbX, y: cbY + bh + 18 }, { x: cbX - 30, y: cbY + bh }], true);
  g.fillStyle(SCARLET, 1); g.fillPoints([{ x: cbX - 27, y: cbY + 2 }, { x: cbX + 27, y: cbY + 2 }, { x: cbX + 27, y: cbY + bh - 2 }, { x: cbX, y: cbY + bh + 14 }, { x: cbX - 27, y: cbY + bh - 2 }], true);
  g.fillStyle(SCARLET_LIT, 0.4); g.fillRect(cbX - 27, cbY + 2, 8, bh - 4);
  g.lineStyle(2, BRASS, 1); g.lineBetween(cbX - 30, cbY + bh, cbX, cbY + bh + 18); g.lineBetween(cbX, cbY + bh + 18, cbX + 30, cbY + bh);
  for (let k = -28; k <= 28; k += 6) { g.lineStyle(1, BRASS_LIT, 0.9); g.lineBetween(cbX + k, cbY + bh + 14 - Math.abs(k) * 0.5, cbX + k, cbY + bh + 20 - Math.abs(k) * 0.5); }
  lyre(g, cbX, cbY + bh * 0.42, 14, BRASS_LIT);
  // A stave stitched in gold above the lyre.
  stave(g, cbX - 20, cbY + 10, 40, 3, BRASS, 0.8);
  // The bell, turned out over the gate.
  hornBell(g, topX + face * 26, topY + 6, -Math.PI / 2 + face * 0.95, 34, 46, BRASS, 0);
  // Snow on the bell's upper lip.
  g.fillStyle(SNOW, 0.85); g.fillEllipse(topX + face * 30, topY - 16 + rng() * 2, 26, 5);
}

/**
 * The Bandhall: Prince Fanfare's hall. A cream stone front of six columns whose capitals are
 * trumpet bells, tall arched windows with music stands silhouetted in the light, a pediment
 * with a great cornet in relief, a verdigris dome crowned by a brass bell-mouth cupola, and a
 * flight of steps flanked by two gilt kettle-drums.
 */
export function bandhall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.1, 34);
  const x0 = x - w / 2;
  // Dome behind the front.
  const dr = w * 0.2;
  const domeY = y - h - 30;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - dr - 10, domeY - 10, dr * 2 + 20, 26);
  g.fillStyle(STONE, 1); g.fillRect(x - dr - 6, domeY - 12, dr * 2 + 12, 22);
  for (let k = -dr; k < dr; k += 22) { g.fillStyle(NAVY_DARK, 1); g.fillRect(x + k + 6, domeY - 8, 8, 14); }
  g.fillStyle(dim(VERDIGRIS, 0.3), 1); g.beginPath(); g.arc(x, domeY - 12, dr, Math.PI, 0, false); g.fillPath();
  g.fillStyle(VERDIGRIS, 1); g.beginPath(); g.arc(x - 4, domeY - 12, dr - 4, Math.PI, 0, false); g.fillPath();
  g.lineStyle(2, dim(VERDIGRIS, 0.35), 1);
  for (let k = 1; k < 6; k++) { const a = Math.PI + (k / 6) * Math.PI; g.lineBetween(x + Math.cos(a) * dr, domeY - 12 + Math.sin(a) * dr, x, domeY - 12 - dr); }
  g.fillStyle(lit(VERDIGRIS, 0.35), 0.5); g.beginPath(); g.arc(x - dr * 0.35, domeY - 12 - dr * 0.4, dr * 0.25, Math.PI, Math.PI * 1.7, false); g.fillPath();
  g.fillStyle(SNOW, 0.8); g.fillEllipse(x, domeY - 12 - dr * 0.85, dr * 0.9, 9);
  // The cupola: a great brass bell-mouth facing the sky.
  hornBell(g, x, domeY - 12 - dr - 30, -Math.PI / 2, 26, 34, BRASS);
  // The front wall.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 3, y - h, w - 6, h - 4);
  for (let row = 1; row < h / 18; row++) { g.lineStyle(0.6, STONE_DARK, 0.4); g.lineBetween(x0 + 3, y - h + row * 18, x0 + w - 3, y - h + row * 18); }
  // Arched windows between the columns.
  const cols = 6;
  const step = w / (cols + 1);
  for (let i = 0; i <= cols; i++) {
    const wx = x0 + step * (i + 0.5);
    if (i === 3) continue;
    const wy = y - h * 0.62, ww = step * 0.46, wh = h * 0.44;
    g.fillStyle(NAVY_DARK, 1); g.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
    g.beginPath(); g.arc(wx, wy - wh / 2, ww / 2, Math.PI, 0, false); g.fillPath();
    g.fillStyle(0xffd88a, 0.5 + rng() * 0.2); g.fillRect(wx - ww / 2 + 3, wy - wh / 2, ww - 6, wh - 3);
    g.beginPath(); g.arc(wx, wy - wh / 2, ww / 2 - 3, Math.PI, 0, false); g.fillPath();
    // Music stands silhouetted inside.
    g.fillStyle(NAVY_DARK, 0.7);
    g.fillRect(wx - 6, wy + wh / 2 - 22, 12, 6); g.fillRect(wx - 1, wy + wh / 2 - 16, 2, 14);
    g.lineStyle(1.5, CREAM, 1); g.lineBetween(wx, wy - wh / 2 - ww / 2, wx, wy + wh / 2);
    g.lineBetween(wx - ww / 2, wy, wx + ww / 2, wy);
    g.fillStyle(STONE_LIT, 1); g.fillRect(wx - ww / 2 - 4, wy + wh / 2, ww + 8, 5);
  }
  // Columns with trumpet-bell capitals.
  for (let i = 0; i < cols; i++) {
    const cx = x0 + step * (i + 1);
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 9, y - h + 18, 18, h - 22);
    g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 7, y - h + 18, 14, h - 22);
    for (let k = -4; k <= 4; k += 4) { g.lineStyle(1, STONE_DARK, 0.5); g.lineBetween(cx + k, y - h + 22, cx + k, y - 6); }
    hornBell(g, cx, y - h + 12, -Math.PI / 2, 15, 18, BRASS);
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 12, y - 8, 24, 8);
  }
  // Entablature, frieze of notes, pediment with a cornet relief.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 8, y - h - 6, w + 16, 14);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 8, y - h - 8, w + 16, 8);
  stave(g, x0 + 10, y - h - 6, w - 20, 2.4, BRASS_DARK, 0.7);
  for (let k = 0; k < 16; k++) note(g, x0 + 24 + k * ((w - 48) / 15), y - h - 1 - (k % 5) * 1.2, 1.6, BRASS_DARK, k % 3 ? 'crotchet' : 'quaver');
  g.fillStyle(STONE_DARK, 1); g.fillTriangle(x0 - 4, y - h - 8, x0 + w + 4, y - h - 8, x, y - h - 60);
  g.fillStyle(STONE, 1); g.fillTriangle(x0 + 8, y - h - 10, x0 + w - 8, y - h - 10, x, y - h - 54);
  heraldTrumpet(g, x - 70, y - h - 22, -0.06, 120, 1.1, SCARLET);
  // The great doors under a brass fanlight.
  const dw = step * 0.7, dh = h * 0.62;
  g.fillStyle(dim(SCARLET, 0.5), 1); g.fillRect(x - dw / 2 - 4, y - dh - 4, dw + 8, dh + 4);
  g.fillStyle(SCARLET_DARK, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
  g.fillStyle(SCARLET, 1); g.fillRect(x - dw / 2 + 4, y - dh + 30, dw / 2 - 6, dh - 34); g.fillRect(x + 2, y - dh + 30, dw / 2 - 6, dh - 34);
  g.fillStyle(BRASS, 1); g.beginPath(); g.arc(x, y - dh + 26, dw / 2 - 2, Math.PI, 0, false); g.fillPath();
  for (let k = 1; k < 6; k++) { const a = Math.PI + (k / 6) * Math.PI; g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(x, y - dh + 26, x + Math.cos(a) * (dw / 2 - 2), y - dh + 26 + Math.sin(a) * (dw / 2 - 2)); }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - 6, y - dh * 0.45, 3); g.fillCircle(x + 6, y - dh * 0.45, 3);
  // Steps and two gilt kettle-drums.
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(x - dw / 2 - 20 - k * 8, y - 2 + k * 5, dw + 40 + k * 16, 6); }
  for (const side of [-1, 1]) {
    const kx = x + side * (dw / 2 + 50), ky = y + 12;
    g.fillStyle(BRASS_DARK, 1); g.beginPath(); g.arc(kx, ky - 22, 20, 0, Math.PI, false); g.fillPath();
    g.fillStyle(BRASS, 1); g.beginPath(); g.arc(kx - 2, ky - 22, 17, 0, Math.PI, false); g.fillPath();
    g.fillStyle(CREAM, 1); g.fillEllipse(kx, ky - 22, 40, 10);
    g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(kx - 12, ky - 4, kx - 16, ky + 6); g.lineBetween(kx + 12, ky - 4, kx + 16, ky + 6);
  }
}

/**
 * The floating stage on the bandlake: a timber raft on barrels with a scallop-shell bandshell
 * of white-and-blue boards behind it, bunting along its lip and brass lamps at the corners.
 * (x, y) is the front edge of the deck at the waterline.
 */
export function floatingStage(g: G, x: number, y: number, w: number, bob: number): void {
  const yy = y + bob;
  // Barrels in the water.
  for (let i = 0; i < 5; i++) {
    const bx = x - w / 2 + 14 + i * ((w - 28) / 4);
    g.fillStyle(dim(WOOD, 0.3), 1); g.fillEllipse(bx, yy + 4, 22, 10);
    g.lineStyle(1, 0x2a2a2a, 0.8); g.strokeEllipse(bx, yy + 4, 22, 10);
  }
  // The deck.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - w / 2, yy - 8, w, 10);
  g.fillStyle(WOOD_LIT, 1); g.fillRect(x - w / 2, yy - 30, w, 22);
  for (let k = 0; k < w; k += 10) { g.lineStyle(0.8, WOOD, 0.8); g.lineBetween(x - w / 2 + k, yy - 30, x - w / 2 + k, yy - 8); }
  // The bandshell: a half-dome of radiating boards.
  const sr = w * 0.42;
  g.fillStyle(dim(CREAM, 0.25), 1); g.beginPath(); g.arc(x, yy - 30, sr + 6, Math.PI, 0, false); g.fillPath();
  for (let k = 0; k < 9; k++) {
    const a0 = Math.PI + (k / 9) * Math.PI, a1 = Math.PI + ((k + 1) / 9) * Math.PI;
    g.fillStyle(k % 2 ? CREAM : 0x9ac4e0, 1);
    g.beginPath(); g.moveTo(x, yy - 30); g.arc(x, yy - 30, sr, a0, a1, false); g.closePath(); g.fillPath();
  }
  for (let k = 1; k < 4; k++) { g.lineStyle(1.5, BRASS, 0.8); g.beginPath(); g.arc(x, yy - 30, sr * (k / 4), Math.PI, 0, false); g.strokePath(); }
  g.lineStyle(3, BRASS, 1); g.beginPath(); g.arc(x, yy - 30, sr + 3, Math.PI, 0, false); g.strokePath();
  lyre(g, x, yy - 30 - sr * 0.55, 10, BRASS_LIT);
  // Chairs and stands for a little band.
  for (let i = 0; i < 4; i++) musicStand(g, x - 36 + i * 24, yy - 14, 0.55);
  // Corner lamps.
  for (const k of [-1, 1]) {
    const lx = x + k * (w / 2 - 6);
    g.lineStyle(2, NAVY_DARK, 1); g.lineBetween(lx, yy - 30, lx, yy - 62);
    g.fillStyle(BRASS, 1); g.fillTriangle(lx - 6, yy - 62, lx + 6, yy - 62, lx, yy - 70);
    g.fillStyle(0xffe6a0, 0.9); g.fillCircle(lx, yy - 58, 3.5);
  }
}

/**
 * *The Oompah Bun*: a round bakehouse with a drum-shaped tower — its roof is a bass drum's
 * skin, cords and hoops painted on — a bow window full of buns, a tuba-bell flue breathing
 * oven heat, and a gilt bun hung over the door.
 */
export function bunBakery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.1, 26);
  const x0 = x - w / 2;
  // The flue: a tuba bell at the back.
  bellChimney(g, x0 + w * 0.8, y - h - 10, 40, 1.1, -Math.PI / 2 + 0.35);
  // The drum tower (left): scarlet shell, cords, hoops, a cream skin roof.
  const tx = x0 + w * 0.3, tw = w * 0.5, th = h * 1.3;
  g.fillStyle(SCARLET_DARK, 1); g.fillRect(tx - tw / 2, y - th, tw, th);
  g.fillStyle(SCARLET, 1); g.fillRect(tx - tw / 2 + 3, y - th, tw - 6, th - 3);
  g.lineStyle(2, BRAID, 1);
  for (let i = 0; i < 6; i++) {
    const a0 = tx - tw / 2 + (i / 6) * tw, a1 = tx - tw / 2 + ((i + 0.5) / 6) * tw, a2 = tx - tw / 2 + ((i + 1) / 6) * tw;
    g.lineBetween(a0, y - th + 10, a1, y - th * 0.45); g.lineBetween(a1, y - th * 0.45, a2, y - th + 10);
  }
  for (const hy of [y - th, y - th * 0.45]) { g.fillStyle(BRASS_DARK, 1); g.fillRect(tx - tw / 2 - 3, hy - 3, tw + 6, 7); g.fillStyle(BRASS, 1); g.fillRect(tx - tw / 2 - 3, hy - 3, tw + 6, 3); }
  g.fillStyle(CREAM, 1); g.fillEllipse(tx, y - th, tw + 6, 18);
  g.fillStyle(SNOW, 0.7); g.fillEllipse(tx - 6, y - th - 2, tw * 0.6, 8);
  // Little round windows in the drum.
  for (const k of [-1, 1]) { g.fillStyle(0xffd88a, 0.8); g.fillCircle(tx + k * tw * 0.22, y - th * 0.3, 7); g.lineStyle(2, BRASS, 1); g.strokeCircle(tx + k * tw * 0.22, y - th * 0.3, 7); }
  // The shop (right): cream walls, a striped awning, a bow window of buns.
  const sx = x0 + w * 0.55, sw = w * 0.45;
  g.fillStyle(dim(CREAM, 0.2), 1); g.fillRect(sx, y - h, sw, h);
  g.fillStyle(CREAM, 1); g.fillRect(sx + 2, y - h, sw - 4, h - 2);
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(sx - 6, y - h, sx + sw + 6, y - h, sx + sw * 0.6, y - h - 34);
  g.fillStyle(SLATE, 1); g.fillTriangle(sx - 2, y - h - 1, sx + sw + 2, y - h - 1, sx + sw * 0.6, y - h - 30);
  // Bow window.
  const bwx = sx + sw * 0.36, bwy = y - h * 0.55;
  g.fillStyle(WOOD_DARK, 1); g.fillRect(bwx - 26, bwy - 18, 52, 38);
  g.fillStyle(0xffe4a8, 0.8); g.fillRect(bwx - 23, bwy - 15, 46, 30);
  for (let i = 0; i < 9; i++) {
    const bx = bwx - 18 + (i % 5) * 9, by = bwy + 6 - Math.floor(i / 5) * 9;
    g.fillStyle(0xc88a3a, 1); g.fillCircle(bx, by, 4); g.fillStyle(0xe8b060, 1); g.fillCircle(bx - 1, by - 1, 2.5);
    g.fillStyle(CREAM, 0.9); g.fillRect(bx - 2, by - 3, 4, 1);
  }
  g.lineStyle(1.5, WOOD_DARK, 1); g.lineBetween(bwx - 8, bwy - 15, bwx - 8, bwy + 15); g.lineBetween(bwx + 8, bwy - 15, bwx + 8, bwy + 15);
  // Awning.
  for (let k = 0; k < 6; k++) {
    g.fillStyle(k % 2 ? CREAM : SCARLET, 1);
    g.fillRect(sx + 4 + k * ((sw - 8) / 6), y - h + 4, (sw - 8) / 6, 12);
    g.beginPath(); g.arc(sx + 4 + (k + 0.5) * ((sw - 8) / 6), y - h + 16, (sw - 8) / 12, 0, Math.PI, false); g.fillPath();
  }
  // Door with a gilt bun sign.
  const dx = sx + sw * 0.8;
  g.fillStyle(NAVY_DARK, 1); g.fillRect(dx - 10, y - 34, 20, 32);
  g.fillStyle(NAVY, 1); g.fillRect(dx - 8, y - 32, 16, 30);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(dx + 4, y - 16, 1.5);
  g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(dx + 10, y - 50, dx + 24, y - 50);
  g.fillStyle(BRASS, 1); g.fillCircle(dx + 24, y - 40, 9);
  g.fillStyle(BRASS_LIT, 1); g.fillEllipse(dx + 22, y - 43, 9, 4);
  g.lineStyle(1, BRASS_DARK, 1); g.beginPath(); g.arc(dx + 24, y - 38, 5, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
  // Flour sacks by the door.
  for (let i = 0; i < 2; i++) { g.fillStyle(0xe8dcc0, 1); g.fillEllipse(sx + sw + 10 + i * 12, y - 8, 14, 18); g.lineStyle(1, 0xb0a080, 1); g.lineBetween(sx + sw + 6 + i * 12, y - 14, sx + sw + 14 + i * 12, y - 14); }
  void rng;
}

/** The Brass Court's waystone: a cream stone with a brass bell-mouth set in its top and a lyre carved on its face. */
export function brassWaystone(g: G, x: number, y: number, t = 0): void {
  shadow(g, x, y + 2, 44, 14);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 18, y - 8, 36, 8);
  g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(x - 14, y - 52, 28, 46, 6);
  g.fillStyle(STONE, 1); g.fillRoundedRect(x - 12, y - 52, 24, 44, 6);
  g.fillStyle(STONE_LIT, 0.7); g.fillRect(x - 10, y - 50, 4, 40);
  lyre(g, x, y - 26, 7, BRASS_DARK);
  hornBell(g, x, y - 60, -Math.PI / 2, 11, 12, BRASS, 0.4 + Math.sin(t * 2) * 0.2);
}

/** A brass lamp-post with a bell-shaped shade and a glass globe. */
export function brassLamp(g: G, x: number, y: number, lit_ = true): void {
  shadow(g, x, y + 1, 18, 6);
  g.fillStyle(NAVY_DARK, 1); g.fillRect(x - 4, y - 6, 8, 6);
  g.lineStyle(3, NAVY_DARK, 1); g.lineBetween(x, y - 6, x, y - 52);
  g.lineStyle(1, BRASS, 1); g.lineBetween(x - 1, y - 10, x - 1, y - 50);
  g.fillStyle(lit_ ? 0xfff0b8 : 0x9a9a8a, lit_ ? 0.95 : 0.6); g.fillCircle(x, y - 56, 5);
  if (lit_) glow(g, x, y - 56, 18, 0xffe6a0, 0.05, 3);
  hornBell(g, x, y - 62, Math.PI / 2, 7, 6, BRASS);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y - 70, 2);
}

/** A sagging line of bunting between two points: little triangle pennants in turn, each with a note on it. */
export function bunting(g: G, a: Pt, b: Pt, colors: number[], sag = 18, t = 0): void {
  const n = Math.max(4, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 16));
  const at = (u: number) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * sag });
  g.lineStyle(1, NAVY_DARK, 0.8);
  g.beginPath();
  for (let i = 0; i <= n; i++) { const p = at(i / n); if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }
  g.strokePath();
  for (let i = 0; i < n; i++) {
    const p = at((i + 0.15) / n), q = at((i + 0.85) / n);
    const flut = Math.sin(t * 3 + i) * 1.5;
    const tip = { x: (p.x + q.x) / 2 + flut, y: (p.y + q.y) / 2 + 11 };
    g.fillStyle(colors[i % colors.length], 1); g.fillTriangle(p.x, p.y, q.x, q.y, tip.x, tip.y);
  }
}

/** A row of herald statues' plinths, or a lone plinth with a bronze bandsman blowing a cornet. */
export function bronzeBandsman(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 40, 12);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 16, y - 22, 32, 22);
  g.fillStyle(STONE, 1); g.fillRect(x - 14, y - 24, 28, 20);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 14, y - 24, 28, 3);
  // The bronze figure: a bandsman with a cornet raised, gone green in the creases.
  const by = y - 24;
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 6, by - 16, 5, 16); g.fillRect(x + 1, by - 16, 5, 16);
  g.fillStyle(BRONZE, 1); g.fillRoundedRect(x - 9, by - 36, 18, 22, 5);
  g.fillStyle(VERDIGRIS, 0.5); g.fillRect(x - 8, by - 20, 16, 3);
  g.fillStyle(BRONZE, 1); g.fillCircle(x, by - 42, 6);
  g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 6, by - 52, 12, 6);
  g.lineStyle(3, BRONZE, 1); g.lineBetween(x + 4, by - 40, x + 16, by - 46);
  hornBell(g, x + 20, by - 48, -0.4, 5, 7, BRONZE);
  if (rng() < 0.6) { g.fillStyle(SNOW, 0.9); g.fillEllipse(x, by - 53, 12, 3); }
}

/** Snow-capped higher terraces seen over the north wall: grey-blue crags with snowfields. */
export function snowTerraces(g: G, x0: number, w: number, baseY: number, rng: () => number): void {
  g.fillStyle(0x8aa0b8, 1); g.fillRect(x0, 0, w, baseY);
  for (let x = x0 - 40; x < x0 + w + 40; x += 70 + rng() * 60) {
    const ph = 40 + rng() * 50;
    g.fillStyle(0x7a90a8, 1); g.fillTriangle(x - 70, baseY, x + 70, baseY, x + rng() * 20 - 10, baseY - ph);
    g.fillStyle(SNOW, 1); g.fillTriangle(x - 24, baseY - ph + 26, x + 24, baseY - ph + 26, x, baseY - ph);
    g.fillStyle(SNOW_SHADE, 1); g.fillTriangle(x, baseY - ph + 26, x + 24, baseY - ph + 26, x + 2, baseY - ph + 4);
  }
  // A terrace wall of cream stone with a snowy coping.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, baseY - 6, w, 24);
  g.fillStyle(STONE, 1); g.fillRect(x0, baseY - 8, w, 20);
  for (let k = 0; k < w; k += 28) { g.lineStyle(0.8, STONE_DARK, 0.6); g.lineBetween(x0 + k, baseY - 8, x0 + k, baseY + 12); }
  g.fillStyle(SNOW, 1); g.fillRect(x0, baseY - 10, w, 4);
  void GRAVEL;
}
