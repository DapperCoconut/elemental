import type { Pt } from '../../../../IslesTypes';
import { type G, dim, lit, mixC, shadow } from '../../../../art/IsleArt';

/**
 * Shared drawing for the Slough — the Matriarch's own cast skin, a hill-long hollow serpent lying
 * coiled in the deepest mire. Its inner surface (scale-rows seen from inside, pale and papery, with
 * the marsh light coming green through it), the milking racks and their serpents, the venom
 * troughs and duckboards, the old skins hanging in the Moulting Hollow, the Clutch's man-tall eggs,
 * the copper still the Draught is brewed in, and the Mark — two small fang-scars in a coil.
 * Used by the dungeon, the warden floor, the warden gimmicks and Nyxa herself, so the whole skin is
 * painted in one hand.
 */

// ── Palette — cast skin, black mire, venom green, bruise purple, bone, copper and lamplight ──

/** The inside of the cast skin: pale, papery, translucent. */
export const SKIN = 0xb8b08a;
export const SKIN_LIT = 0xe8e2c0;
export const SKIN_DARK = 0x6a6448;
export const SKIN_DEEP = 0x34301e;
/** Black mire water. */
export const MIRE = 0x12160c;
export const VENOM = 0x9ad83a;
export const VENOM_LIT = 0xd8ff8a;
export const VENOM_DEEP = 0x2e5a14;
export const BRUISE = 0x5a2e6a;
export const BRUISE_DEEP = 0x22142a;
export const BONE = 0xece4cc;
export const COPPER = 0xc0703a;
export const COPPER_DARK = 0x5e3018;
export const WOOD = 0x5a4430;
export const WOOD_DARK = 0x2e2216;
export const LAMP = 0xffd27a;
/** The live serpents of the racks: black-green backs, yellow bellies, yellow eyes. */
export const SERPENT = 0x24402a;
export const SERPENT_BELLY = 0xc8c070;
export const EYE = 0xffe040;
export const EGG = 0xd8ceae;
/** Nyxa's own scales: deep emerald with a gold edge. */
export const NYXA = 0x1e6a46;
export const NYXA_LIT = 0x8ae0a8;
export const NYXA_DARK = 0x0a2a1c;
export const GOLD = 0xe0b84a;

type V2 = Pt;

/**
 * The Mark — two small fang-scars inside a serpent swallowing its tail. Every child on Fangmire
 * wears the two scars on the wrist; the ring is the Matriarch's, stamped on every ration book,
 * every Draught House door and every vial.
 */
export function markSigil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.16), color, a);
  g.beginPath(); g.arc(x, y, r * 0.8, -Math.PI * 0.35, Math.PI * 1.5, false); g.strokePath();
  // The head biting the tail at the top right.
  const hx = x + Math.cos(-Math.PI * 0.42) * r * 0.8, hy = y + Math.sin(-Math.PI * 0.42) * r * 0.8;
  g.fillStyle(color, a);
  g.fillEllipse(hx + r * 0.08, hy - r * 0.02, r * 0.42, r * 0.28);
  g.fillTriangle(hx + r * 0.26, hy - r * 0.1, hx + r * 0.42, hy + r * 0.02, hx + r * 0.22, hy + r * 0.08);
  // The two scars.
  g.fillEllipse(x - r * 0.2, y + r * 0.05, r * 0.14, r * 0.34);
  g.fillEllipse(x + r * 0.2, y + r * 0.05, r * 0.14, r * 0.34);
  g.fillStyle(dim(color, 0.5), a);
  g.fillCircle(x - r * 0.2, y + r * 0.16, r * 0.05);
  g.fillCircle(x + r * 0.2, y + r * 0.16, r * 0.05);
}

/**
 * Scale rows seen from inside the skin: overlapping arcs, each lit on its upper edge, with the odd
 * scale gone thin enough to let the marsh light through.
 */
export function scaleField(g: G, x0: number, y0: number, w: number, h: number, base: number, rng: () => number, size = 22): void {
  g.fillStyle(dim(base, 0.3), 1); g.fillRect(x0, y0, w, h);
  const sx = size, sy = size * 0.62;
  for (let row = 0, y = y0; y < y0 + h + sy; row++, y += sy) {
    for (let x = x0 - (row % 2) * sx * 0.5; x < x0 + w + sx; x += sx) {
      const c = rng() < 0.12 ? lit(base, 0.12) : rng() < 0.5 ? base : dim(base, 0.08);
      const cx = Math.max(x0, Math.min(x0 + w, x)), cy = Math.min(y0 + h, y);
      g.fillStyle(c, 1); g.fillEllipse(cx, cy, sx * 1.02, sy * 1.5);
      g.lineStyle(1, lit(base, 0.25), 0.45);
      g.beginPath(); g.arc(cx, cy + sy * 0.15, sx * 0.48, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      if (rng() < 0.04) { g.fillStyle(VENOM_LIT, 0.12); g.fillEllipse(cx, cy, sx * 0.7, sy); }
    }
  }
}

/**
 * The wall of the skin: a fold of pale translucent hide rising out of the floor, its scale-rows
 * ridged, green marsh-light glowing through the thin places, and shadows of the mangroves outside
 * pressed against it. `side` -1 = a west wall (lit face to the east), 1 = an east wall.
 */
export function skinWall(g: G, x0: number, y0: number, w: number, h: number, side: -1 | 1, rng: () => number): void {
  g.fillStyle(SKIN_DEEP, 1); g.fillRect(x0, y0, w, h);
  // Light through the hide: soft green blooms.
  for (let i = 0; i < (w * h) / 9000; i++) {
    const bx = x0 + rng() * w, by = y0 + rng() * h, r = 20 + rng() * 50;
    g.fillStyle(0x4a6a2a, 0.12); g.fillCircle(bx, by, r);
    g.fillStyle(0x8aa84a, 0.08); g.fillCircle(bx, by, r * 0.55);
  }
  // Mangrove shadows outside: dark stilt-roots against the hide.
  for (let i = 0; i < (w * h) / 26000; i++) {
    const rx = x0 + rng() * w, ry = y0 + rng() * h;
    g.lineStyle(3 + rng() * 3, 0x0a0e06, 0.28);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI * 0.5 + (k - 1.5) * 0.4;
      g.lineBetween(rx, ry, rx + Math.cos(a) * 46, ry + Math.sin(a) * 46);
    }
  }
  // The scale ridges: overlapping arcs, rows running along the length of the body.
  const S = 26;
  for (let y = y0; y < y0 + h; y += S * 0.6) {
    for (let x = x0 + ((y / (S * 0.6)) % 2) * S * 0.5; x < x0 + w; x += S) {
      g.lineStyle(2, SKIN_DARK, 0.6);
      g.beginPath(); g.arc(x, y, S * 0.5, Math.PI * 0.05, Math.PI * 0.95, false); g.strokePath();
      g.lineStyle(1, SKIN, 0.35);
      g.beginPath(); g.arc(x, y - 1, S * 0.5, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
    }
  }
  // The inner face where the wall meets the floor: a lit lip and a fold of slack hide.
  const lipX = side < 0 ? x0 + w - 10 : x0;
  g.fillStyle(SKIN_DARK, 1); g.fillRect(lipX, y0, 10, h);
  g.fillStyle(SKIN, 0.9); g.fillRect(side < 0 ? lipX + 6 : lipX, y0, 4, h);
  for (let y = y0 + 30; y < y0 + h; y += 70 + rng() * 60) {
    g.fillStyle(SKIN_LIT, 0.25);
    g.fillEllipse(side < 0 ? lipX - 8 : lipX + 18, y, 18, 40 + rng() * 30);
  }
}

/**
 * A live serpent drawn as a tapering chain of scale-discs along a path: black-green back, a pale
 * belly line, a head with yellow eyes and (if `jaw` > 0) the jaw dropped open on two white fangs.
 */
export function serpentBody(g: G, pts: V2[], r: number, back = SERPENT, belly = SERPENT_BELLY, jaw = 0, alpha = 1): void {
  if (pts.length < 2) return;
  const n = pts.length;
  for (let i = n - 1; i >= 0; i--) {
    const p = pts[i];
    const f = i / (n - 1);
    const rr = r * (0.35 + 0.65 * (1 - Math.abs(f - 0.3) * 0.9));
    g.fillStyle(dim(back, 0.45), alpha); g.fillCircle(p.x, p.y + 1.5, rr);
    g.fillStyle(back, alpha); g.fillCircle(p.x, p.y, rr);
    if (i % 2 === 0) { g.fillStyle(lit(back, 0.18), alpha * 0.8); g.fillCircle(p.x - rr * 0.3, p.y - rr * 0.35, rr * 0.4); }
    if (i % 3 === 1) { g.fillStyle(belly, alpha * 0.7); g.fillCircle(p.x, p.y + rr * 0.45, rr * 0.35); }
  }
  // Head on the first point, facing away from the second.
  const h = pts[0], nk = pts[1];
  const a = Math.atan2(h.y - nk.y, h.x - nk.x);
  const c = Math.cos(a), s = Math.sin(a);
  const hr = r * 1.15;
  g.fillStyle(back, alpha);
  g.fillEllipse(h.x + c * hr * 0.4, h.y + s * hr * 0.4, hr * 2.2, hr * 1.6);
  const ex = (side: number) => ({ x: h.x + c * hr * 0.6 - s * side * hr * 0.45, y: h.y + s * hr * 0.6 + c * side * hr * 0.45 });
  for (const side of [-1, 1]) {
    const e = ex(side);
    g.fillStyle(EYE, alpha); g.fillCircle(e.x, e.y, Math.max(1.4, hr * 0.22));
    g.fillStyle(0x000000, alpha); g.fillRect(e.x - 0.5, e.y - hr * 0.18, 1, hr * 0.36);
  }
  if (jaw > 0) {
    const tipX = h.x + c * hr * 1.6, tipY = h.y + s * hr * 1.6;
    g.fillStyle(0x6a1a2a, alpha); g.fillTriangle(h.x + c * hr * 0.6, h.y + s * hr * 0.6, tipX - s * hr * jaw, tipY + c * hr * jaw, tipX + s * hr * jaw, tipY - c * hr * jaw);
    g.fillStyle(BONE, alpha);
    for (const side of [-1, 1]) {
      const fx = tipX - c * hr * 0.3 + -s * side * hr * jaw * 0.6, fy = tipY - s * hr * 0.3 + c * side * hr * jaw * 0.6;
      g.fillTriangle(fx - c * 1.5, fy - s * 1.5, fx + c * hr * 0.55, fy + s * hr * 0.55, fx + s * side * 2, fy - c * side * 2);
    }
  }
}

/** Points along a sine-wiggled line from (x1,y1) to (x2,y2) — a serpent's body path. */
export function wigglePath(x1: number, y1: number, x2: number, y2: number, n: number, amp: number, phase: number, waves = 1.5): V2[] {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len, ny = dx / len;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const w = Math.sin(f * Math.PI * 2 * waves + phase) * amp * Math.sin(Math.min(1, f * 3) * Math.PI * 0.5);
    out.push({ x: x1 + dx * f + nx * w, y: y1 + dy * f + ny * w });
  }
  return out;
}

/**
 * A milking rack: a bleached A-frame of mangrove poles with a crossbar, serpents hanging from it by
 * the tail in leather loops, heads clamped over lipped horn cups. Venom beads off every fang. `spit`
 * 0–1 opens the jaws and arches the necks (the beat about to fall).
 */
export function milkingRack(g: G, x: number, y: number, w: number, n: number, t: number, spit = 0, face: 1 | -1 = 1): void {
  shadow(g, x, y + 4, w + 20, 16, 0.4);
  const h = 74;
  // Poles.
  for (const sx of [-1, 1]) {
    g.lineStyle(6, WOOD_DARK, 1); g.lineBetween(x + sx * w / 2, y, x + sx * (w / 2 - 12), y - h);
    g.lineStyle(3, lit(WOOD, 0.2), 1); g.lineBetween(x + sx * w / 2 - 1, y, x + sx * (w / 2 - 12) - 1, y - h);
    g.lineStyle(4, WOOD_DARK, 1); g.lineBetween(x + sx * w / 2, y, x + sx * (w / 2 + 10), y - h * 0.4);
  }
  // Crossbar, lashed.
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - w / 2 + 6, y - h - 5, w - 12, 9);
  g.fillStyle(WOOD, 1); g.fillRect(x - w / 2 + 6, y - h - 5, w - 12, 5);
  for (const sx of [-1, 1]) {
    g.lineStyle(2, 0xa08a5a, 1);
    for (let k = 0; k < 3; k++) g.lineBetween(x + sx * (w / 2 - 16) - 4, y - h - 6 + k * 3, x + sx * (w / 2 - 16) + 4, y - h - 2 + k * 3);
  }
  // The serpents.
  for (let i = 0; i < n; i++) {
    const sx = x - w / 2 + 18 + (i + 0.5) * ((w - 36) / n);
    const sway = Math.sin(t * 1.7 + i * 1.3) * 3 * (1 - spit);
    g.lineStyle(3, 0x6a4a2a, 1); g.strokeCircle(sx, y - h + 4, 5);
    const pts: V2[] = [];
    for (let k = 0; k < 9; k++) {
      const f = k / 8;
      pts.push({ x: sx + Math.sin(f * 5 + t * 2 + i) * 4 * (1 - f) + sway * f + face * spit * f * f * 10, y: y - h + 6 + f * (h - 30) - spit * f * 6 });
    }
    pts.reverse();
    serpentBody(g, pts, 4.2, SERPENT, SERPENT_BELLY, spit > 0.3 ? spit * 0.6 : 0.1);
    // The horn cup under the jaws.
    const cy = y - 14;
    g.fillStyle(0x3a2e1e, 1); g.fillRect(sx - 6, cy, 12, 10);
    g.fillStyle(0xd8c8a0, 1); g.fillEllipse(sx, cy, 13, 4);
    g.fillStyle(VENOM, 0.9); g.fillEllipse(sx, cy + 0.5, 9, 2.5);
    // The drip.
    const ph = (t * 0.9 + i * 0.37) % 1;
    g.fillStyle(VENOM_LIT, 1 - ph); g.fillCircle(sx, y - 26 + ph * 12, 1.6);
  }
}

/**
 * A venom trough: a long plank-sided channel sunk in the floor, brimming with milked venom, a skin of
 * scum on it and bubbles of marsh gas. Static — the surface shimmer is animated by the area.
 */
export function venomTrough(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x, y - 6, w, h + 12);
  for (let px = x; px < x + w; px += 46) {
    g.fillStyle(WOOD, 1); g.fillRect(px + 1, y - 6, 44, 5); g.fillRect(px + 1, y + h + 1, 44, 5);
    g.fillStyle(0x1a140c, 1); g.fillCircle(px + 6, y - 3.5, 1.2); g.fillCircle(px + 40, y + h + 3.5, 1.2);
  }
  g.fillStyle(VENOM_DEEP, 1); g.fillRect(x, y, w, h);
  g.fillStyle(mixC(VENOM_DEEP, VENOM, 0.45), 1); g.fillRect(x, y + 3, w, h - 10);
  for (let i = 0; i < w / 10; i++) {
    g.fillStyle(rng() < 0.5 ? VENOM : 0x5a8a24, 0.35);
    g.fillEllipse(x + rng() * w, y + 6 + rng() * (h - 14), 10 + rng() * 26, 3 + rng() * 3);
  }
  // Scum line along the near edge.
  g.fillStyle(0xc8d890, 0.4); g.fillRect(x, y + h - 7, w, 3);
}

/** Duckboards: weathered planks laid across a trough on two runners. */
export function duckboard(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x0a0a06, 0.6); g.fillRect(x - 2, y - 8, w + 4, h + 16);
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x + 8, y - 8, 6, h + 16); g.fillRect(x + w - 14, y - 8, 6, h + 16);
  for (let py = y - 6; py < y + h + 6; py += 11) {
    g.fillStyle(WOOD, 1); g.fillRect(x, py, w, 8);
    g.fillStyle(lit(WOOD, 0.18), 1); g.fillRect(x, py, w, 2);
    g.fillStyle(0x1a140c, 1); g.fillCircle(x + 11, py + 4, 1.2); g.fillCircle(x + w - 11, py + 4, 1.2);
  }
  g.fillStyle(VENOM, 0.25); g.fillRect(x, y + h / 2 - 2, w, 4);
}

/**
 * An old cast skin hanging in the Moulting Hollow: a long pale tube of scales hung from a hook in
 * the dark, papery and split, swinging — and at its foot the empty head, eye-holes and all. `drop`
 * 0–1 lowers it to strike: the head swings up, the jaw gapes.
 */
export function hangingSkin(g: G, x: number, y: number, len: number, t: number, drop = 0, alpha = 1): void {
  const top = y - len - 70;
  const foot = y - 26 + drop * 26;
  const sway = Math.sin(t * 0.9 + x * 0.01) * 6 * (1 - drop);
  // The hook and cord.
  g.lineStyle(1.5, 0x3a3428, alpha); g.lineBetween(x, top - 30, x, top);
  g.lineStyle(2, 0x8a7a5a, alpha);
  g.beginPath(); g.arc(x + 3, top + 2, 4, Math.PI, Math.PI * 2.5, false); g.strokePath();
  // The tube: wide ribbon of translucent scale, narrowing to the head.
  const N = 16;
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1);
    const yy = top + (foot - top) * f;
    const xx = x + Math.sin(f * 3 + t * 0.8) * 4 + sway * f;
    const ww = 9 + Math.sin(f * Math.PI) * 6;
    g.fillStyle(SKIN_DARK, 0.55 * alpha); g.fillEllipse(xx + 1, yy + 1, ww * 2, 12);
    g.fillStyle(SKIN, 0.75 * alpha); g.fillEllipse(xx, yy, ww * 2, 12);
    g.lineStyle(1, SKIN_LIT, 0.5 * alpha);
    g.beginPath(); g.arc(xx, yy + 2, ww * 0.8, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    if (i % 4 === 2) { g.lineStyle(1, SKIN_DEEP, 0.5 * alpha); g.lineBetween(xx - ww * 0.6, yy - 2, xx - ww * 0.2, yy + 4); }
  }
  // The empty head: a hollow cast of a skull with two dark eye-holes and a split mouth.
  const hx = x + sway + Math.sin(3 + t * 0.8) * 4, hy = foot + 8;
  const gape = drop;
  g.fillStyle(SKIN_DARK, 0.6 * alpha); g.fillEllipse(hx + 1, hy + 2, 26, 22);
  g.fillStyle(SKIN_LIT, 0.85 * alpha); g.fillEllipse(hx, hy, 24, 20 - gape * 4);
  g.fillStyle(0x0a0806, alpha); g.fillEllipse(hx - 6, hy - 3, 6, 4); g.fillEllipse(hx + 6, hy - 3, 6, 4);
  if (gape > 0.05) {
    g.fillStyle(0x0a0806, alpha); g.fillEllipse(hx, hy + 8 + gape * 5, 16, 4 + gape * 10);
    g.fillStyle(BONE, alpha);
    g.fillTriangle(hx - 6, hy + 6, hx - 3, hy + 6, hx - 4.5, hy + 12 + gape * 8);
    g.fillTriangle(hx + 3, hy + 6, hx + 6, hy + 6, hx + 4.5, hy + 12 + gape * 8);
  } else {
    g.lineStyle(1, SKIN_DEEP, alpha); g.lineBetween(hx - 7, hy + 6, hx + 7, hy + 6);
  }
}

/**
 * One of the Clutch's eggs: as tall as a man, leathery, veined with bruise purple, set in a nest of
 * shredded skin. `warmth` 0–1 lights it from inside (the coiled shape of what is in it shows), and
 * `shake` rocks it on its base.
 */
export function clutchEgg(g: G, x: number, y: number, s: number, warmth: number, t: number, shake = 0): void {
  shadow(g, x, y + 2, 54 * s, 16 * s, 0.45);
  // The nest.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    g.fillStyle(i % 2 ? SKIN : SKIN_DARK, 0.85);
    g.fillEllipse(x + Math.cos(a) * 24 * s, y - 2 + Math.sin(a) * 6 * s, 20 * s, 7 * s);
  }
  const rock = Math.sin(t * 22) * shake * 0.12;
  const cx = x + Math.sin(rock) * 30 * s, cy = y - 36 * s;
  const ew = 40 * s, eh = 66 * s;
  g.fillStyle(dim(EGG, 0.4), 1); g.fillEllipse(cx + 2, cy + 2, ew, eh);
  g.fillStyle(mixC(EGG, 0xffc87a, warmth * 0.45), 1); g.fillEllipse(cx, cy, ew, eh);
  // Lit from within: the coil inside shows through the shell.
  if (warmth > 0.05) {
    g.fillStyle(0xffb04a, 0.12 + warmth * 0.25); g.fillEllipse(cx, cy + 4 * s, ew * 0.8, eh * 0.75);
    g.lineStyle(5 * s, 0x6a3a1a, 0.18 + warmth * 0.4);
    g.beginPath(); g.arc(cx, cy + 6 * s, 10 * s, 0, Math.PI * 1.7, false); g.strokePath();
    g.beginPath(); g.arc(cx + 2 * s, cy - 2 * s, 5 * s, Math.PI, Math.PI * 2.6, false); g.strokePath();
    g.fillStyle(EYE, warmth * 0.9); g.fillCircle(cx + 4 * s, cy - 14 * s, 1.6 * s);
  }
  // Veins.
  g.lineStyle(1.2 * s, BRUISE, 0.55);
  g.lineBetween(cx - 8 * s, cy + eh * 0.4, cx - 12 * s, cy); g.lineBetween(cx - 12 * s, cy, cx - 6 * s, cy - eh * 0.3);
  g.lineBetween(cx + 10 * s, cy + eh * 0.35, cx + 14 * s, cy + 4 * s); g.lineBetween(cx + 14 * s, cy + 4 * s, cx + 8 * s, cy - eh * 0.2);
  g.fillStyle(0xffffff, 0.22); g.fillEllipse(cx - ew * 0.22, cy - eh * 0.22, ew * 0.2, eh * 0.32);
  // A crack once it is near.
  if (warmth > 0.75) {
    g.lineStyle(1.5 * s, 0x2a1a0a, 1);
    g.lineBetween(cx - 4 * s, cy - eh * 0.42, cx + 2 * s, cy - eh * 0.3);
    g.lineBetween(cx + 2 * s, cy - eh * 0.3, cx - 3 * s, cy - eh * 0.2);
    g.lineBetween(cx - 3 * s, cy - eh * 0.2, cx + 4 * s, cy - eh * 0.1);
  }
}

/**
 * The still: a copper alembic as big as a hut — a fat pot on a fire-grate, a swan-neck to a coiled
 * worm in a cooling tub, and a glass receiver where the Draught collects, green and slow.
 */
export function draughtStill(g: G, x: number, y: number, s: number, t: number): void {
  shadow(g, x, y + 4, 150 * s, 30 * s, 0.45);
  // Fire-grate and embers.
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 46 * s, y - 16 * s, 92 * s, 16 * s);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i % 2 ? 0xff8a3a : 0xffc04a, 0.6 + 0.4 * Math.sin(t * 6 + i));
    g.fillCircle(x - 34 * s + i * 13 * s, y - 6 * s, 3 * s);
  }
  // The pot.
  const py = y - 56 * s;
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, py + 3, 100 * s, 84 * s);
  g.fillStyle(COPPER, 1); g.fillEllipse(x, py, 96 * s, 80 * s);
  g.fillStyle(lit(COPPER, 0.35), 0.8); g.fillEllipse(x - 20 * s, py - 16 * s, 26 * s, 34 * s);
  for (let k = -2; k <= 2; k++) { g.fillStyle(COPPER_DARK, 0.8); g.fillCircle(x + k * 18 * s, py + 30 * s, 2 * s); }
  markSigil(g, x + 12 * s, py + 6 * s, 14 * s, COPPER_DARK, 0.9);
  // Helmet and swan-neck.
  g.fillStyle(COPPER, 1); g.fillEllipse(x, py - 44 * s, 40 * s, 26 * s);
  g.lineStyle(7 * s, COPPER_DARK, 1);
  g.beginPath(); g.moveTo(x + 10 * s, py - 50 * s); g.lineTo(x + 50 * s, py - 70 * s); g.lineTo(x + 92 * s, py - 40 * s); g.strokePath();
  g.lineStyle(4 * s, COPPER, 1);
  g.beginPath(); g.moveTo(x + 10 * s, py - 51 * s); g.lineTo(x + 50 * s, py - 71 * s); g.lineTo(x + 92 * s, py - 41 * s); g.strokePath();
  // Cooling tub with the worm.
  const tx = x + 96 * s;
  g.fillStyle(WOOD_DARK, 1); g.fillRect(tx - 18 * s, y - 62 * s, 36 * s, 50 * s);
  for (let k = 0; k < 3; k++) { g.fillStyle(0x3a3a3a, 1); g.fillRect(tx - 19 * s, y - 56 * s + k * 16 * s, 38 * s, 3 * s); }
  g.lineStyle(3 * s, COPPER, 1);
  for (let k = 0; k < 3; k++) g.strokeEllipse(tx, y - 52 * s + k * 12 * s, 26 * s, 6 * s);
  // The receiver.
  const rx = tx + 30 * s, ry = y - 8 * s;
  g.fillStyle(0xcfe8d0, 0.3); g.fillCircle(rx, ry - 12 * s, 14 * s);
  g.fillStyle(VENOM, 0.75); g.fillEllipse(rx, ry - 6 * s, 24 * s, 12 * s);
  g.lineStyle(1.5, 0xe8fff0, 0.6); g.strokeCircle(rx, ry - 12 * s, 14 * s);
  const ph = (t * 0.7) % 1;
  g.fillStyle(VENOM_LIT, 1 - ph); g.fillCircle(tx + 18 * s, y - 28 * s + ph * 10 * s, 2 * s);
  // Steam off the helmet.
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.4 + i / 4) % 1;
    g.fillStyle(0xc8e8b0, 0.2 * (1 - k)); g.fillCircle(x - 8 * s + Math.sin(t + i) * 8, py - 60 * s - k * 60 * s, (8 + k * 14) * s);
  }
}

/** An antidote vial: stoppered, wax-sealed with the Mark, green Draught to the `fill` line. */
export function draughtVial(g: G, x: number, y: number, s: number, fill = 1, alpha = 1): void {
  g.fillStyle(0x000000, 0.3 * alpha); g.fillEllipse(x, y + 2, 16 * s, 5 * s);
  g.fillStyle(0xd8f0e0, 0.35 * alpha); g.fillRoundedRect(x - 6 * s, y - 22 * s, 12 * s, 22 * s, 4 * s);
  g.fillStyle(VENOM, 0.9 * alpha); g.fillRoundedRect(x - 5 * s, y - 2 * s - 18 * s * fill, 10 * s, 18 * s * fill + 1, 3 * s);
  g.fillStyle(0xffffff, 0.5 * alpha); g.fillRect(x - 4 * s, y - 19 * s, 2 * s, 12 * s);
  g.fillStyle(WOOD, alpha); g.fillRect(x - 3 * s, y - 28 * s, 6 * s, 7 * s);
  g.fillStyle(0x8a1a2a, alpha); g.fillCircle(x, y - 27 * s, 4 * s);
  g.fillStyle(0xd8a0a8, alpha); g.fillCircle(x - 1, y - 28 * s, 1.2 * s);
}

/** A curved white fang standing out of the floor (the isle's old teeth, in small). */
export function fangRock(g: G, x: number, y: number, h: number, lean = 0.2, color = BONE): void {
  shadow(g, x, y + 2, h * 0.6, h * 0.16);
  const w = h * 0.3;
  const tipX = x + lean * h, tipY = y - h;
  g.fillStyle(dim(color, 0.35), 1);
  g.fillTriangle(x - w / 2, y, x + w / 2, y, tipX + 2, tipY + 2);
  g.fillStyle(color, 1);
  g.fillTriangle(x - w / 2, y - 1, x + w / 2 - w * 0.25, y - 1, tipX, tipY);
  g.fillStyle(0xffffff, 0.45);
  g.fillTriangle(x - w * 0.35, y - 4, x - w * 0.15, y - 4, tipX - 1, tipY + h * 0.2);
  g.fillStyle(VENOM, 0.8); g.fillCircle(tipX, tipY + 3, 1.6);
}

/** A tuft of web caught across a corner. */
export function cornerWeb(g: G, x: number, y: number, r: number, a0: number, alpha = 0.35): void {
  g.lineStyle(1, 0xe8e8f0, alpha);
  for (let k = 0; k <= 5; k++) {
    const a = a0 + (k / 5) * (Math.PI / 2);
    g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  for (let ring = 1; ring <= 4; ring++) {
    const rr = (r * ring) / 4.4;
    g.beginPath();
    for (let k = 0; k <= 5; k++) {
      const a = a0 + (k / 5) * (Math.PI / 2);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
}
