import { dim, glow, lit, mixC, shadow, stroke, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  ADDER, ADDER_BAND, BARK, BARK_DARK, BRASS, BRASS_DARK, BRUISE, BRUISE_LIT, COBRA, COBRA_HOOD, DRAUGHT, DRAUGHT_LIT,
  FANG, FANG_DARK, FANG_LIT, FANG_ROOT, FEN, FEN_DEEP, FEN_LIT, FEN_SHEEN, GAS, GAS_DARK, GLASS, LAMP, LAMP_HOT, LEAF,
  LEAF_LIT, LEATHER, LEATHER_LIT, MOSS, MOSS_LIT, MUD, MUD_DARK, MUD_LIT, SEDGE, SEDGE_DARK, SEDGE_LIT, SLOUGH,
  THATCH, THATCH_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT, VENIN, VENIN_EYE, VENIN_LIT, VENOM, VENOM_DARK, VENOM_LIT,
  VIPER, VIPER_BAND, WEB, WICKER, WICKER_DARK, WICKER_LIT,
} from './palette';

/**
 * Fang set pieces — the shapes only a venom-milkers' fen has. Everything stands on legs out of
 * black water: huts on stilts, sheds on piles, the mangroves on their own arching roots. Wicker
 * is woven over and under in visible withies; every eave has a web in it and a skin hung off it.
 * The great fangs of rock are the one clean white thing in the picture, and even they drip.
 */

// ── Small shared bits ────────────────────────────────────────────────

/** A spider web strung in a corner: radial threads and a spiral, sagging a little. */
export function web(g: G, x: number, y: number, r: number, a = 0.5, spokes = 7): void {
  for (let i = 0; i < spokes; i++) {
    const ang = (i / spokes) * Math.PI * 2;
    g.lineStyle(0.8, WEB, a);
    g.lineBetween(x, y, x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.85 + r * 0.08);
  }
  for (let k = 1; k <= 4; k++) {
    const rr = (r * k) / 4.4;
    g.lineStyle(0.7, WEB, a * 0.8);
    g.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const ang = (i / spokes) * Math.PI * 2;
      const sag = Math.sin(ang) > 0 ? 1.08 : 1;
      const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.85 * sag + rr * 0.08;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
}

/** A tuft of fen sedge: a fan of blades, yellowing at the tips. */
export function sedge(g: G, x: number, y: number, s: number, rng: () => number): void {
  const n = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.3 + (rng() - 0.5) * 0.2;
    const len = (10 + rng() * 10) * s;
    const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
    g.lineStyle(1.6 * s, i % 2 ? SEDGE : SEDGE_DARK, 1); g.lineBetween(x, y, tx, ty);
    g.lineStyle(1.2 * s, SEDGE_LIT, 0.8); g.lineBetween(tx - Math.cos(a) * 3 * s, ty - Math.sin(a) * 3 * s, tx, ty);
  }
}

/** A cattail reed: a stalk with its brown seed-head. */
export function cattail(g: G, x: number, y: number, h: number, lean = 0): void {
  const tx = x + lean, ty = y - h;
  g.lineStyle(1.5, SEDGE_DARK, 1); g.lineBetween(x, y, tx, ty);
  g.fillStyle(0x4a321e, 1); g.fillEllipse(tx - lean * 0.08, ty + h * 0.16, 5, h * 0.22);
  g.fillStyle(0x6a4a2a, 0.7); g.fillEllipse(tx - lean * 0.08 - 1, ty + h * 0.14, 2, h * 0.16);
  g.lineStyle(1, SEDGE_DARK, 1); g.lineBetween(tx, ty, tx + lean * 0.05, ty - 5);
}

/** A mire-flower: a bruise-purple bell on a thin stem, the only flower the fen grows. */
export function mireFlower(g: G, x: number, y: number, s: number): void {
  g.lineStyle(1, SEDGE_DARK, 1); g.lineBetween(x, y, x + s, y - 9 * s);
  g.fillStyle(BRUISE, 1); g.fillTriangle(x + s - 3 * s, y - 9 * s, x + s + 3 * s, y - 9 * s, x + s, y - 3 * s);
  g.fillStyle(BRUISE_LIT, 1); g.fillCircle(x + s, y - 9 * s, 2.4 * s);
  g.fillStyle(VENOM_LIT, 0.9); g.fillCircle(x + s, y - 5 * s, 0.9 * s);
}

/** A drip of venom hanging off an edge (static — a bead and its tail). */
export function drip(g: G, x: number, y: number, len: number, c = VENOM): void {
  g.lineStyle(1.5, c, 0.85); g.lineBetween(x, y, x, y + len);
  g.fillStyle(c, 0.95); g.fillCircle(x, y + len + 1.5, 2);
  g.fillStyle(VENOM_LIT, 0.8); g.fillCircle(x - 0.6, y + len + 0.8, 0.7);
}

/** A hanging snakeskin: a long papery tube with its diamond pattern, curling at the tail. */
export function hangingSkin(g: G, x: number, y: number, len: number, sway = 0): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    pts.push({ x: x + Math.sin(k * 3 + sway) * 3 * k + sway * 2 * k, y: y + k * len });
  }
  stroke(g, pts, 5, dim(SLOUGH, 0.15), 0.9);
  stroke(g, pts, 3, SLOUGH, 0.9);
  for (let i = 1; i < 8; i += 2) {
    const p = pts[i];
    g.fillStyle(dim(SLOUGH, 0.35), 0.7);
    g.fillTriangle(p.x - 2, p.y, p.x + 2, p.y, p.x, p.y + 3);
  }
  g.fillStyle(SLOUGH, 0.9); g.fillEllipse(pts[0].x, pts[0].y + 2, 7, 5);
}

/** An antidote vial — the Draught — stoppered, with its milky blue fill. `fill` 0..1. */
export function vial(g: G, x: number, y: number, s: number, fill = 1, glowA = 0): void {
  if (glowA > 0) glow(g, x, y - 8 * s, 16 * s, DRAUGHT, glowA, 3);
  g.fillStyle(dim(GLASS, 0.3), 0.9); g.fillRoundedRect(x - 5 * s, y - 16 * s, 10 * s, 16 * s, 3 * s);
  g.fillStyle(GLASS, 0.5); g.fillRoundedRect(x - 4.5 * s, y - 15.5 * s, 9 * s, 15 * s, 3 * s);
  if (fill > 0) {
    const fh = 13 * s * fill;
    g.fillStyle(DRAUGHT, 0.95); g.fillRoundedRect(x - 4 * s, y - 1.5 * s - fh, 8 * s, fh, 2 * s);
    g.fillStyle(DRAUGHT_LIT, 0.7); g.fillRect(x - 3 * s, y - 1.5 * s - fh, 1.5 * s, fh);
  }
  g.fillStyle(dim(GLASS, 0.2), 1); g.fillRect(x - 2.5 * s, y - 20 * s, 5 * s, 4 * s);
  g.fillStyle(0x8a6a44, 1); g.fillRect(x - 3 * s, y - 23 * s, 6 * s, 4 * s);
  g.fillStyle(0x2a5a8a, 1); g.fillRect(x - 3 * s, y - 13 * s, 6 * s, 1.4 * s);
}

// ── Snakes ───────────────────────────────────────────────────────────

/** Skins a coiled snake can wear: body, band and belly. */
export interface SnakeSkin { body: number; band: number; belly: number }
export const SKIN_ADDER: SnakeSkin = { body: ADDER, band: ADDER_BAND, belly: 0xb8b07a };
export const SKIN_VIPER: SnakeSkin = { body: VIPER, band: VIPER_BAND, belly: 0xc8d08a };
export const SKIN_COBRA: SnakeSkin = { body: COBRA, band: dim(COBRA, 0.45), belly: COBRA_HOOD };

/**
 * A snake lying coiled: two turns of body in a squashed spiral, banded, the head raised out of the
 * middle. `rise` 0..1 lifts the head and opens the jaw (rattling, about to strike); `a` faces it.
 */
export function coiledSnake(g: G, x: number, y: number, s: number, skin: SnakeSkin, a = 0, rise = 0, t = 0): void {
  shadow(g, x, y + 3 * s, 30 * s, 10 * s, 0.28);
  // The coil: three loops of shrinking radius, each a thick banded ellipse.
  for (let k = 0; k < 3; k++) {
    const rx = (13 - k * 4) * s, ry = (6.5 - k * 2) * s, yy = y - k * 3 * s;
    g.lineStyle(6 * s, dim(skin.body, 0.35), 1); g.strokeEllipse(x, yy + 1, rx * 2, ry * 2);
    g.lineStyle(5 * s, skin.body, 1); g.strokeEllipse(x, yy, rx * 2, ry * 2);
    for (let i = 0; i < 8; i++) {
      const b = (i / 8) * Math.PI * 2 + k * 0.4;
      g.fillStyle(skin.band, 0.85); g.fillCircle(x + Math.cos(b) * rx, yy + Math.sin(b) * ry, 1.6 * s);
    }
    g.lineStyle(1, lit(skin.body, 0.25), 0.5);
    g.beginPath(); g.arc(x, yy - 1, rx, Math.PI * 1.1, Math.PI * 1.7, false); g.strokePath();
  }
  // The tail tip (a rattle-ish buzz when rising).
  const tx = x + 13 * s, ty = y + 2 * s;
  const shake = rise > 0 ? Math.sin(t / 25) * 2 * rise : 0;
  g.fillStyle(dim(skin.body, 0.2), 1); g.fillEllipse(tx + 3 * s + shake, ty, 6 * s, 3 * s);
  if (rise > 0.2) { g.lineStyle(1, skin.belly, 0.6 * rise); g.strokeEllipse(tx + 5 * s, ty, 10 * s, 6 * s); }
  // Neck and head.
  const hh = (6 + rise * 14) * s;
  const hx = x + Math.cos(a) * rise * 6 * s, hy = y - 9 * s - hh;
  g.lineStyle(5 * s, skin.body, 1); g.lineBetween(x, y - 8 * s, hx, hy + 3 * s);
  g.lineStyle(2 * s, skin.belly, 0.8); g.lineBetween(x + Math.cos(a) * 1.5, y - 8 * s, hx + Math.cos(a) * 1.5, hy + 4 * s);
  g.fillStyle(skin.body, 1); g.fillEllipse(hx + Math.cos(a) * 3 * s, hy + Math.sin(a) * 1.5 * s, 10 * s, 7 * s);
  g.fillStyle(skin.band, 1); g.fillTriangle(hx - 2 * s, hy - 2 * s, hx + 2 * s, hy - 2 * s, hx, hy + 1 * s);
  g.fillStyle(VENIN_EYE, 1); g.fillCircle(hx + Math.cos(a) * 4 * s - 1.5 * s, hy - 1 * s, 1.1 * s); g.fillCircle(hx + Math.cos(a) * 4 * s + 1.5 * s, hy - 1 * s, 1.1 * s);
  if (rise > 0.5) {
    // Jaw open: two white fangs and the tongue.
    const mx = hx + Math.cos(a) * 7 * s, my = hy + Math.sin(a) * 3 * s + 1.5 * s;
    g.fillStyle(0x7a2030, 1); g.fillEllipse(mx, my, 5 * s, 4 * s * rise);
    g.fillStyle(FANG_LIT, 1); g.fillTriangle(mx - 2 * s, my - 1.5 * s, mx - 1 * s, my - 1.5 * s, mx - 1.5 * s, my + 1.5 * s);
    g.fillTriangle(mx + 1 * s, my - 1.5 * s, mx + 2 * s, my - 1.5 * s, mx + 1.5 * s, my + 1.5 * s);
    const fl = Math.sin(t / 60) > 0 ? 1 : 0.4;
    g.lineStyle(1, 0xd83048, 1); g.lineBetween(mx, my, mx + Math.cos(a) * 6 * s * fl, my + Math.sin(a) * 4 * s * fl);
  } else {
    const fl = (t / 400) % 1 < 0.15 ? 1 : 0;
    if (fl) { g.lineStyle(1, 0xd83048, 1); g.lineBetween(hx + Math.cos(a) * 7 * s, hy + 1 * s, hx + Math.cos(a) * 11 * s, hy + 1.5 * s); }
  }
}

/**
 * A cobra risen from a basket: a tall S of neck, the hood spread wide with its spectacle mark, the
 * head swaying `sway` (-1..1). `h` is how far it has risen (px). `spit` 0..1 rears it back.
 */
export function risenCobra(g: G, x: number, y: number, h: number, sway: number, spit = 0, s = 1): void {
  if (h < 2) return;
  const topX = x + sway * 14 * s - spit * 4 * sway, topY = y - h * s - spit * 6;
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    pts.push({ x: x + (topX - x) * k + Math.sin(k * Math.PI * 1.6) * 6 * s * (1 - k * 0.5) * (sway >= 0 ? 1 : -1), y: y + (topY - y) * k });
  }
  stroke(g, pts, 10 * s, dim(COBRA, 0.35));
  stroke(g, pts, 8 * s, COBRA);
  stroke(g, pts.slice(3), 3 * s, COBRA_HOOD, 0.9);
  // The hood: a broad shield behind the head, ribbed, with the spectacle on the back.
  const hw = (16 + spit * 4) * s, hh2 = 20 * s;
  g.fillStyle(dim(COBRA, 0.25), 1); g.fillEllipse(topX, topY + 9 * s, hw * 2 + 2, hh2 * 1.6 + 2);
  g.fillStyle(COBRA, 1); g.fillEllipse(topX, topY + 9 * s, hw * 2, hh2 * 1.6);
  g.fillStyle(COBRA_HOOD, 0.9); g.fillEllipse(topX, topY + 13 * s, hw * 1.0, hh2 * 1.1);
  for (let i = -3; i <= 3; i++) { g.lineStyle(1, dim(COBRA, 0.4), 0.6); g.lineBetween(topX, topY + 2 * s, topX + i * hw * 0.3, topY + 20 * s); }
  g.lineStyle(1.5, ADDER_BAND, 0.7); g.strokeCircle(topX - 5 * s, topY + 14 * s, 3 * s); g.strokeCircle(topX + 5 * s, topY + 14 * s, 3 * s);
  // The head.
  g.fillStyle(dim(COBRA, 0.15), 1); g.fillEllipse(topX, topY, 12 * s, 10 * s);
  g.fillStyle(COBRA, 1); g.fillEllipse(topX, topY - 1, 11 * s, 9 * s);
  g.fillStyle(VENIN_EYE, 1); g.fillCircle(topX - 3 * s, topY - 2 * s, 1.5 * s); g.fillCircle(topX + 3 * s, topY - 2 * s, 1.5 * s);
  g.fillStyle(0x101010, 1); g.fillRect(topX - 3.3 * s, topY - 3 * s, 0.6 * s, 2 * s); g.fillRect(topX + 2.7 * s, topY - 3 * s, 0.6 * s, 2 * s);
  if (spit > 0.3) {
    g.fillStyle(0x7a2030, 1); g.fillEllipse(topX, topY + 3 * s, 6 * s, 4 * s * spit);
    g.fillStyle(FANG_LIT, 1); g.fillTriangle(topX - 2.5 * s, topY + 1.5 * s, topX - 1.2 * s, topY + 1.5 * s, topX - 1.8 * s, topY + 4.5 * s);
    g.fillTriangle(topX + 1.2 * s, topY + 1.5 * s, topX + 2.5 * s, topY + 1.5 * s, topX + 1.8 * s, topY + 4.5 * s);
    g.fillStyle(VENOM, 0.9); g.fillCircle(topX, topY + 6 * s, 1.6 * s * spit);
  }
}

// ── Baskets and mats ─────────────────────────────────────────────────

/** A snake-charmer's basket: round, woven in two colours, its lid tilted off. */
export function charmerBasket(g: G, x: number, y: number, s: number, lidOff = true): void {
  shadow(g, x, y + 2, 50 * s, 14 * s);
  const w = 40 * s, h = 26 * s;
  g.fillStyle(WICKER_DARK, 1); g.fillEllipse(x, y - 2 * s, w, 12 * s);
  g.fillStyle(WICKER, 1); g.fillRect(x - w / 2, y - h, w, h - 2 * s);
  // Woven bands: alternate over-and-under ticks.
  for (let row = 0; row < 5; row++) {
    const yy = y - h + 3 * s + row * 4.5 * s;
    for (let col = 0; col < 9; col++) {
      const xx = x - w / 2 + 2 * s + col * 4.3 * s + (row % 2) * 2 * s;
      g.fillStyle((row + col) % 2 ? WICKER_LIT : WICKER_DARK, 0.8); g.fillRect(xx, yy, 3 * s, 3 * s);
    }
  }
  g.fillStyle(BRUISE, 0.9); g.fillRect(x - w / 2, y - h + 10 * s, w, 3 * s);
  g.fillStyle(WICKER_LIT, 1); g.fillEllipse(x, y - h, w, 10 * s);
  g.fillStyle(0x1a140c, 1); g.fillEllipse(x, y - h, w - 6 * s, 7 * s);
  if (lidOff) {
    g.fillStyle(WICKER_DARK, 1); g.fillEllipse(x + w * 0.62, y - 2 * s, w * 0.7, 8 * s);
    g.fillStyle(WICKER, 1); g.fillEllipse(x + w * 0.62, y - 4 * s, w * 0.66, 7 * s);
    g.fillStyle(WICKER_LIT, 1); g.fillCircle(x + w * 0.62, y - 6 * s, 2.5 * s);
  }
}

/** The piper's mat: a woven rush mat with a border of zig-zags and a diamond in the middle. */
export function pipersMat(g: G, x: number, y: number, w: number, h: number, a = 1): void {
  g.fillStyle(THATCH_DARK, a); g.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 6);
  g.fillStyle(THATCH, a); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 5);
  for (let i = 0; i < h; i += 5) { g.lineStyle(1, THATCH_DARK, 0.4 * a); g.lineBetween(x - w / 2 + 3, y - h / 2 + i, x + w / 2 - 3, y - h / 2 + i); }
  for (let i = 0; i < w - 12; i += 10) {
    for (const yy of [y - h / 2 + 5, y + h / 2 - 5]) {
      g.lineStyle(2, BRUISE, 0.8 * a);
      g.lineBetween(x - w / 2 + 6 + i, yy - 2, x - w / 2 + 11 + i, yy + 2);
      g.lineBetween(x - w / 2 + 11 + i, yy + 2, x - w / 2 + 16 + i, yy - 2);
    }
  }
  g.fillStyle(VENOM_DARK, 0.8 * a);
  g.fillTriangle(x - 16, y, x, y - h * 0.26, x + 16, y);
  g.fillTriangle(x - 16, y, x, y + h * 0.26, x + 16, y);
  g.fillStyle(COBRA_HOOD, 0.8 * a); g.fillCircle(x, y, 4);
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * A pool of black fen water: a dark body with a scum of duckweed round the edge, a green oily
 * sheen, and a ragged rim of mud and sedge. The surface is animated by the caller.
 */
export function fenPool(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  // Mud rim, lumpy.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    g.fillStyle(i % 2 ? MUD_DARK : MUD, 1);
    g.fillEllipse(cx + Math.cos(a) * r.w * 0.5, cy + Math.sin(a) * r.h * 0.5, 60 + rng() * 40, 26 + rng() * 14);
  }
  g.fillStyle(FEN, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(FEN_DEEP, 1); g.fillEllipse(cx + 10, cy + 6, r.w * 0.7, r.h * 0.62);
  // Oily sheen bands.
  for (let i = 0; i < 6; i++) {
    g.lineStyle(2, i % 2 ? FEN_SHEEN : 0x3a2a4a, 0.35);
    g.strokeEllipse(cx - 20 + i * 8, cy - 8 + i * 3, r.w * (0.3 + i * 0.07), r.h * (0.18 + i * 0.05));
  }
  // Duckweed scum round the edge.
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, d = 0.78 + rng() * 0.2;
    g.fillStyle(rng() < 0.5 ? MOSS_LIT : SEDGE_LIT, 0.7);
    g.fillCircle(cx + Math.cos(a) * r.w * 0.5 * d, cy + Math.sin(a) * r.h * 0.5 * d, 1.4 + rng() * 1.6);
  }
  // Sedge and cattails along the rim.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.1;
    const px = cx + Math.cos(a) * r.w * 0.52, py = cy + Math.sin(a) * r.h * 0.52;
    if (i % 3 === 0) cattail(g, px, py, 22 + rng() * 14, (rng() - 0.5) * 8);
    else sedge(g, px, py, 0.9, rng);
  }
}

/**
 * A plank boardwalk along a polyline: planks laid across the line of travel, nailed to two
 * stringers, the odd plank missing to the black water underneath, posts at the corners.
 */
export function boardwalk(g: G, pts: Pt[], w: number, rng: () => number): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = -uy, ny = ux;
    // Water showing under the walk at its edges.
    g.lineStyle(w + 10, FEN, 0.55); g.lineBetween(a.x, a.y, b.x, b.y);
    // Stringers.
    for (const k of [-0.38, 0.38]) {
      g.lineStyle(4, TIMBER_DARK, 1);
      g.lineBetween(a.x + nx * w * k, a.y + ny * w * k + 3, b.x + nx * w * k, b.y + ny * w * k + 3);
    }
    for (let d = 0; d < len; d += 13) {
      if (rng() < 0.04) continue; // a missing plank
      const cx = a.x + ux * d, cy = a.y + uy * d;
      const wob = (rng() - 0.5) * 3;
      const c = rng() < 0.3 ? TIMBER_LIT : rng() < 0.5 ? dim(TIMBER, 0.1) : TIMBER;
      const hw = w / 2 + wob;
      g.lineStyle(10, dim(c, 0.35), 1);
      g.lineBetween(cx - nx * hw, cy - ny * hw + 1.5, cx + nx * hw, cy + ny * hw + 1.5);
      g.lineStyle(9, c, 1);
      g.lineBetween(cx - nx * hw, cy - ny * hw, cx + nx * hw, cy + ny * hw);
      // Nail heads, moss in the joints.
      g.fillStyle(0x2a2a2a, 0.8);
      g.fillCircle(cx - nx * w * 0.38, cy - ny * w * 0.38, 0.9); g.fillCircle(cx + nx * w * 0.38, cy + ny * w * 0.38, 0.9);
      if (rng() < 0.15) { g.fillStyle(MOSS_LIT, 0.6); g.fillCircle(cx + nx * (rng() - 0.5) * w, cy + ny * (rng() - 0.5) * w, 2); }
    }
  }
  // Posts at the joints.
  for (const p of pts) {
    for (const k of [-1, 1]) {
      g.fillStyle(TIMBER_DARK, 1); g.fillCircle(p.x + k * w * 0.55, p.y + 2, 4.5);
      g.fillStyle(TIMBER_LIT, 1); g.fillCircle(p.x + k * w * 0.55, p.y, 3.5);
    }
  }
}

/** A snake pit, sunk into the ground: a ring of churned mud round a dark hole with coils in it. */
export function snakePitFloor(g: G, x: number, y: number, r: number, rng: () => number): void {
  g.fillStyle(MUD_DARK, 1); g.fillEllipse(x, y, r * 2.2, r * 1.3);
  g.fillStyle(0x17120c, 1); g.fillEllipse(x, y + 4, r * 1.8, r * 1.0);
  g.fillStyle(0x0c0906, 1); g.fillEllipse(x, y + 10, r * 1.3, r * 0.6);
  // Coils glimpsed in the dark: banded arcs.
  for (let i = 0; i < 10; i++) {
    const cx = x + (rng() - 0.5) * r * 1.2, cy = y + (rng() - 0.3) * r * 0.5;
    const c = [ADDER, VIPER, COBRA][i % 3];
    g.lineStyle(4, dim(c, 0.3), 1);
    g.beginPath(); g.arc(cx, cy, 6 + rng() * 8, rng() * 3, rng() * 3 + 2.4, false); g.strokePath();
    g.fillStyle(VENIN_EYE, 0.8); if (i % 3 === 0) { g.fillCircle(cx + 4, cy - 3, 1); g.fillCircle(cx + 7, cy - 3, 1); }
  }
  // Old sloughed skins round the lip.
  for (let i = 0; i < 6; i++) {
    const a = rng() * Math.PI * 2;
    g.lineStyle(3, SLOUGH, 0.5);
    g.beginPath(); g.arc(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.55, 8, a, a + 2, false); g.strokePath();
  }
}

/**
 * A woven withy wall: stakes driven in a line with withies woven over-and-under between them,
 * webs in the corners. Drawn from `a` to `b` along the ground, `h` tall.
 */
export function wickerWall(g: G, a: Pt, b: Pt, h: number): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.round(len / 22));
  g.fillStyle(0x000000, 0.22); g.fillTriangle(a.x, a.y + 2, b.x, b.y + 2, b.x, b.y + 8); g.fillTriangle(a.x, a.y + 2, a.x, a.y + 8, b.x, b.y + 8);
  // Back fill, so the weave reads as solid.
  g.fillStyle(WICKER_DARK, 1);
  g.fillPoints([{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: b.y - h }, { x: a.x, y: a.y - h }], true);
  for (let row = 0; row < h / 5; row++) {
    const yy = 4 + row * 5;
    for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 1) / n;
      const x0 = a.x + (b.x - a.x) * k0, y0 = a.y + (b.y - a.y) * k0 - yy;
      const x1 = a.x + (b.x - a.x) * k1, y1 = a.y + (b.y - a.y) * k1 - yy;
      const over = (i + row) % 2 === 0;
      g.lineStyle(4, over ? WICKER_LIT : WICKER, 1);
      g.lineBetween(x0, y0 + (over ? -0.8 : 0.8), x1, y1 + (over ? 0.8 : -0.8));
    }
  }
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
    g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x, y + 2, x, y - h - 6);
    g.fillStyle(TIMBER_LIT, 1); g.fillCircle(x, y - h - 6, 2);
  }
  web(g, a.x + 10, a.y - h + 8, 12, 0.35, 6);
}

// ── Set pieces ───────────────────────────────────────────────────────

/**
 * One of the great white fangs standing out of the fen: a curved tooth taller than a house,
 * yellowed and mossy at the root where it goes into the water, a deep groove down its inner
 * curve (venom still seeps from it, a green bead at the tip), hairline cracks, a web strung off
 * the hook of it, and the old waterline stained round its foot.
 */
export function greatFang(g: G, x: number, y: number, s: number, lean: number, rng: () => number): void {
  shadow(g, x + 10 * s, y + 4, 90 * s, 24 * s, 0.4);
  const h = 170 * s, w = 46 * s;
  // The tooth as a curved wedge: outer curve and inner curve meeting at the tip.
  const tipX = x + lean * 60 * s, tipY = y - h;
  const outer: Pt[] = [], inner: Pt[] = [];
  for (let i = 0; i <= 14; i++) {
    const k = i / 14;
    const bend = Math.sin(k * Math.PI * 0.5) * lean * 60 * s;
    const half = w * 0.5 * (1 - k) ** 0.8;
    outer.push({ x: x - half + bend * k ** 0.5 + (tipX - x - lean * 60 * s) * k, y: y - h * k });
    inner.push({ x: x + half + bend * k ** 0.5 + (tipX - x - lean * 60 * s) * k, y: y - h * k });
  }
  const body = [...outer, ...inner.slice().reverse()];
  g.fillStyle(FANG_DARK, 1); g.fillPoints(body.map((p) => ({ x: p.x + 3, y: p.y + 2 })), true);
  g.fillStyle(FANG, 1); g.fillPoints(body, true);
  // Light down the outer face, shade down the inner.
  stroke(g, outer.slice(1, 12).map((p) => ({ x: p.x + 5 * s, y: p.y })), 6 * s, FANG_LIT, 0.8);
  stroke(g, inner.slice(1, 13).map((p) => ({ x: p.x - 4 * s, y: p.y })), 5 * s, FANG_DARK, 0.6);
  // The venom groove down the inner curve.
  const groove = inner.slice(2, 13).map((p, i) => ({ x: p.x - 9 * s * (1 - i / 12), y: p.y }));
  stroke(g, groove, 3 * s, dim(FANG_DARK, 0.25), 0.9);
  stroke(g, groove.slice(4), 1.5 * s, VENOM_DARK, 0.7);
  // Cracks.
  for (let c = 0; c < 4; c++) {
    const k = 0.2 + rng() * 0.6;
    const i = Math.floor(k * 14);
    const p = outer[i], q = inner[i];
    let cx = p.x + (q.x - p.x) * (0.2 + rng() * 0.3), cy = p.y;
    g.lineStyle(1, FANG_ROOT, 0.8);
    for (let j = 0; j < 4; j++) { const nx = cx + (rng() - 0.3) * 8 * s, ny = cy + (rng() - 0.5) * 10 * s; g.lineBetween(cx, cy, nx, ny); cx = nx; cy = ny; }
  }
  // Root: yellowed, mossy, a stained waterline and black water lapping.
  g.fillStyle(FANG_ROOT, 0.7); g.fillEllipse(x, y - 10 * s, w * 1.15, 24 * s);
  for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? MOSS : MOSS_LIT, 0.85); g.fillCircle(x - w * 0.55 + rng() * w * 1.1, y - 4 * s - rng() * 22 * s, 3 + rng() * 4 * s); }
  g.lineStyle(2, dim(FANG_ROOT, 0.3), 0.6); g.lineBetween(x - w * 0.55, y - 26 * s, x + w * 0.55, y - 28 * s);
  g.fillStyle(FEN, 0.9); g.fillEllipse(x, y + 2, w * 1.9, 18 * s);
  g.lineStyle(1.5, FEN_LIT, 0.5); g.strokeEllipse(x, y + 1, w * 1.6, 12 * s);
  // A web off the hook of the tooth, and the bead at its tip.
  web(g, tipX + 10 * s * Math.sign(lean || 1), tipY + 34 * s, 16 * s, 0.45);
  drip(g, tipX, tipY + 2, 6 * s);
}

/**
 * A mangrove on its stilt-roots: a cage of arching roots standing in black water, the trunk
 * rising out of the cage, a heavy dark crown hung with grey moss and webs, a strangler snake
 * along one bough.
 */
export function mangrove(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 4, 120 * s, 30 * s, 0.35);
  g.fillStyle(FEN, 0.8); g.fillEllipse(x, y, 110 * s, 22 * s);
  // Stilt roots: arches from the trunk base down to the water.
  const baseY = y - 42 * s;
  for (let i = 0; i < 9; i++) {
    const k = i / 8 - 0.5;
    const fx = x + k * 104 * s, fy = y - 2 + Math.abs(k) * -4;
    const mx = x + k * 70 * s, my = baseY - 6 * s - (1 - Math.abs(k) * 2) * 6 * s;
    const pts: Pt[] = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      pts.push({ x: (1 - t) ** 2 * (x + k * 16 * s) + 2 * (1 - t) * t * mx + t * t * fx, y: (1 - t) ** 2 * baseY + 2 * (1 - t) * t * my + t * t * fy });
    }
    stroke(g, pts, 6 * s, BARK_DARK);
    stroke(g, pts, 4 * s, i % 2 ? BARK : lit(BARK, 0.1));
    g.fillStyle(MOSS, 0.6); g.fillCircle(fx, fy - 3, 3 * s);
  }
  // Trunk.
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 11 * s, y - 130 * s, 22 * s, 92 * s);
  g.fillStyle(BARK, 1); g.fillRect(x - 9 * s, y - 130 * s, 16 * s, 90 * s);
  for (let i = 0; i < 6; i++) { g.lineStyle(1, BARK_DARK, 0.7); g.lineBetween(x - 6 * s + i * 2.5 * s, y - 128 * s, x - 7 * s + i * 2.8 * s, y - 44 * s); }
  // Boughs.
  for (const k of [-1, 1]) {
    stroke(g, [{ x, y: y - 120 * s }, { x: x + k * 40 * s, y: y - 140 * s }, { x: x + k * 70 * s, y: y - 136 * s }], 6 * s, BARK);
  }
  // A strangler snake along the left bough.
  const sn: Pt[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; sn.push({ x: x - 10 * s - t * 58 * s, y: y - 124 * s - Math.sin(t * Math.PI) * 16 * s + Math.sin(t * 12) * 3 * s }); }
  stroke(g, sn, 4 * s, VIPER); stroke(g, sn.filter((_, i) => i % 2 === 0), 1.5 * s, VIPER_BAND, 0.8);
  g.fillStyle(VIPER, 1); g.fillEllipse(sn[10].x - 3, sn[10].y + 2, 7 * s, 5 * s);
  // Crown: heavy dark lobes, lit on top.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const cx = x + Math.cos(a) * 62 * s, cy = y - 160 * s + Math.sin(a) * 34 * s;
    g.fillStyle(dim(LEAF, 0.3), 1); g.fillCircle(cx, cy + 4, 30 * s);
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const cx = x + Math.cos(a) * 58 * s, cy = y - 162 * s + Math.sin(a) * 32 * s;
    g.fillStyle(i % 2 ? LEAF : dim(LEAF, 0.12), 1); g.fillCircle(cx, cy, 27 * s);
    g.fillStyle(LEAF_LIT, 0.5); g.fillCircle(cx - 6 * s, cy - 9 * s, 12 * s);
  }
  g.fillStyle(LEAF, 1); g.fillEllipse(x, y - 166 * s, 120 * s, 50 * s);
  // Grey moss hanging off the crown, and a web between two boughs.
  for (let i = 0; i < 10; i++) {
    const hx = x - 70 * s + rng() * 140 * s, hy = y - 140 * s + rng() * 10 * s;
    const len = 14 + rng() * 26 * s;
    g.lineStyle(2, 0x8a9480, 0.6); g.lineBetween(hx, hy, hx + (rng() - 0.5) * 4, hy + len);
    g.lineStyle(1, 0xb0b8a4, 0.5); g.lineBetween(hx + 1.5, hy, hx + 1.5 + (rng() - 0.5) * 4, hy + len * 0.7);
  }
  web(g, x + 36 * s, y - 112 * s, 18 * s, 0.4);
}

/** Options for a stilt hut. */
export interface HutOpts { glow?: number; skins?: number; door?: 'left' | 'right' | 'centre'; mask?: boolean }

/**
 * A stilt-hut: a wicker-walled hut on six stilts over the black water, a reed thatch roof hanging
 * low over the eaves, a rope-and-rung ladder down to the walk, snakeskins hung to dry off the eave,
 * a little lamp in the window, and (on milkers' huts) a beaked mask hung by the door.
 */
export function stiltHut(g: G, x: number, y: number, w: number, h: number, rng: () => number, o: HutOpts = {}): void {
  const lift = 34;
  shadow(g, x, y + 4, w * 1.2, 22, 0.35);
  g.fillStyle(FEN, 0.7); g.fillEllipse(x, y + 2, w * 1.15, 16);
  // Stilts and cross-braces.
  const floorY = y - lift;
  for (let i = 0; i < 4; i++) {
    const sx = x - w / 2 + 6 + (i * (w - 12)) / 3;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx - 3, floorY, 6, lift + 2);
    g.fillStyle(TIMBER, 1); g.fillRect(sx - 2, floorY, 3, lift + 2);
    g.fillStyle(MOSS, 0.6); g.fillRect(sx - 3, y - 8, 6, 8);
  }
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - w / 2 + 6, floorY + 6, x + w / 2 - 6, y - 6); g.lineBetween(x + w / 2 - 6, floorY + 6, x - w / 2 + 6, y - 6);
  // Platform.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 8, floorY - 4, w + 16, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w / 2 - 8, floorY - 6, w + 16, 4);
  // Wicker walls.
  const wallTop = floorY - 6 - h;
  g.fillStyle(WICKER_DARK, 1); g.fillRect(x - w / 2, wallTop, w, h);
  for (let row = 0; row < h / 5; row++) {
    for (let col = 0; col < w / 8; col++) {
      const over = (row + col) % 2 === 0;
      g.fillStyle(over ? WICKER_LIT : WICKER, over ? 0.95 : 0.8);
      g.fillRect(x - w / 2 + col * 8 + 1, wallTop + row * 5 + 1, 7, 3.5);
    }
  }
  for (let col = 0; col <= w / 16; col++) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + col * 16 - 1, wallTop, 3, h); }
  // Window and door.
  const doorX = o.door === 'left' ? x - w * 0.28 : o.door === 'right' ? x + w * 0.28 : x;
  const winX = doorX < x ? x + w * 0.24 : x - w * 0.24;
  g.fillStyle(0x140e08, 1); g.fillRect(doorX - 9, floorY - 6 - h * 0.78, 18, h * 0.78);
  g.fillStyle(LEATHER, 1); g.fillRect(doorX - 9, floorY - 6 - h * 0.78, 6, h * 0.78); // hide curtain pulled back
  g.fillStyle(0x140e08, 1); g.fillRect(winX - 8, wallTop + h * 0.25, 16, 12);
  if (o.glow) {
    g.fillStyle(o.glow, 0.85); g.fillRect(winX - 6, wallTop + h * 0.25 + 2, 12, 8);
    glow(g, winX, wallTop + h * 0.25 + 6, 18, o.glow, 0.05, 3);
  }
  g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(winX, wallTop + h * 0.25, winX, wallTop + h * 0.25 + 12);
  // Reed thatch: a heavy overhanging cap, combed in strands, ragged at the eave.
  const roofY = wallTop + 4;
  g.fillStyle(THATCH_DARK, 1); g.fillTriangle(x - w / 2 - 18, roofY + 4, x + w / 2 + 18, roofY + 4, x, roofY - h * 0.95);
  g.fillStyle(THATCH, 1); g.fillTriangle(x - w / 2 - 14, roofY, x + w / 2 + 14, roofY, x, roofY - h * 0.92);
  for (let i = 0; i < 18; i++) {
    const k = i / 17;
    const bx = x - w / 2 - 14 + k * (w + 28);
    g.lineStyle(1, i % 2 ? THATCH_DARK : lit(THATCH, 0.2), 0.7); g.lineBetween(x, roofY - h * 0.9, bx, roofY + 3 + (i % 3));
  }
  for (let i = 0; i < 12; i++) { const bx = x - w / 2 - 14 + rng() * (w + 28); g.lineStyle(1.5, THATCH_DARK, 1); g.lineBetween(bx, roofY + 2, bx + (rng() - 0.5) * 3, roofY + 8 + rng() * 5); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 2, roofY - h * 0.95 - 8, 4, 10);
  // Ladder down to the walk.
  const lx = doorX + 14;
  g.lineStyle(2, 0x8a7448, 1); g.lineBetween(lx - 5, floorY, lx - 8, y + 4); g.lineBetween(lx + 5, floorY, lx + 8, y + 4);
  for (let k = 0; k < 5; k++) { const ry = floorY + 6 + k * 7; g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(lx - 6 - k * 0.6, ry, lx + 6 + k * 0.6, ry); }
  // Skins drying off the eave, and the milker's mask.
  const n = o.skins ?? 2;
  for (let i = 0; i < n; i++) hangingSkin(g, x - w / 2 - 6 + (i + 0.5) * ((w + 12) / n), roofY + 4, 22 + rng() * 14, rng() * 2);
  if (o.mask) {
    const mx = doorX + (doorX < x ? -16 : 16), my = wallTop + 12;
    g.fillStyle(LEATHER, 1); g.fillCircle(mx, my, 6);
    g.fillStyle(LEATHER_LIT, 1); g.fillTriangle(mx - 3, my, mx + 3, my, mx + (doorX < x ? -2 : 2), my + 14);
    g.fillStyle(GLASS, 0.9); g.fillCircle(mx - 2.5, my - 1, 1.6); g.fillCircle(mx + 2.5, my - 1, 1.6);
  }
  web(g, x + w / 2 - 4, wallTop + 4, 10, 0.4, 6);
}

/**
 * The Milking Shed: a long open-fronted shed on piles with a reed roof, and under it the racks —
 * serpents clamped by the neck in a row of wooden yokes, jaws over glass funnels, venom dripping
 * from each into a long trough that glows along its length. Coiled tails hang down behind the
 * yokes; beaked masks and gauntlets hang on the end posts; a carboy stands at the trough's end.
 */
export function milkingShed(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.05, 34, 0.38);
  const x0 = x - w / 2;
  // Floor of planks on piles.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 10, y - 18, w + 20, 18);
  g.fillStyle(TIMBER, 1); g.fillRect(x0 - 10, y - 22, w + 20, 6);
  for (let px = x0; px <= x0 + w; px += 48) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 4, y - 18, 8, 20); }
  // Back wall: dark wicker with light leaking through the weave.
  const top = y - 22 - h;
  g.fillStyle(0x1c160e, 1); g.fillRect(x0, top, w, h);
  for (let i = 0; i < 160; i++) { g.fillStyle(LAMP, 0.08 + rng() * 0.1); g.fillRect(x0 + rng() * w, top + rng() * h * 0.8, 3, 2); }
  // The trough: a long glowing gutter at waist height.
  const troughY = y - 40;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 10, troughY - 4, w - 20, 14);
  g.fillStyle(VENOM_DARK, 1); g.fillRect(x0 + 12, troughY - 2, w - 24, 6);
  g.fillStyle(VENOM, 0.8); g.fillRect(x0 + 12, troughY - 2, w - 24, 2.5);
  glow(g, x, troughY, w * 0.32, VENOM, 0.03, 3);
  // Yoke posts and the serpents clamped in them.
  const n = Math.floor((w - 40) / 46);
  const skins = [ADDER, VIPER, COBRA];
  for (let i = 0; i < n; i++) {
    const sx = x0 + 34 + i * ((w - 68) / (n - 1));
    // Tail hanging down behind, coiled at the bottom.
    const c = skins[i % 3];
    const tail: Pt[] = [];
    for (let j = 0; j <= 8; j++) { const t = j / 8; tail.push({ x: sx + Math.sin(t * 6 + i) * 5, y: top + h * 0.28 + t * (h * 0.5) }); }
    stroke(g, tail, 6, dim(c, 0.3)); stroke(g, tail, 4, c);
    g.lineStyle(4, c, 1); g.strokeEllipse(sx + 4, troughY - 14, 16, 7);
    // The yoke: two uprights and a crossbar with a notch.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx - 12, top + h * 0.18, 4, h * 0.82 - 18); g.fillRect(sx + 8, top + h * 0.18, 4, h * 0.82 - 18);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(sx - 14, top + h * 0.22, 28, 6);
    // The head, clamped, jaws over a glass funnel.
    const hy = top + h * 0.22 + 10;
    g.fillStyle(c, 1); g.fillEllipse(sx, hy, 10, 12);
    g.fillStyle(VENIN_EYE, 1); g.fillCircle(sx - 2.5, hy - 2, 1); g.fillCircle(sx + 2.5, hy - 2, 1);
    g.fillStyle(FANG_LIT, 1); g.fillTriangle(sx - 3, hy + 5, sx - 1.5, hy + 5, sx - 2.2, hy + 10); g.fillTriangle(sx + 1.5, hy + 5, sx + 3, hy + 5, sx + 2.2, hy + 10);
    g.fillStyle(GLASS, 0.6); g.fillTriangle(sx - 7, hy + 14, sx + 7, hy + 14, sx, hy + 24);
    g.lineStyle(1, lit(GLASS, 0.3), 0.8); g.strokeTriangle(sx - 7, hy + 14, sx + 7, hy + 14, sx, hy + 24);
    g.lineStyle(1.5, VENOM, 0.8); g.lineBetween(sx, hy + 24, sx, troughY - 2);
  }
  // Front posts and the reed roof, long and low.
  for (const px of [x0 - 6, x0 + w + 6, x]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 5, top - 6, 10, h + 4);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(px - 5, top - 6, 3, h + 4);
  }
  g.fillStyle(THATCH_DARK, 1); g.fillRect(x0 - 26, top - 30, w + 52, 30);
  g.fillStyle(THATCH, 1); g.fillRect(x0 - 22, top - 44, w + 44, 26);
  g.fillStyle(THATCH_DARK, 1); g.fillTriangle(x0 - 22, top - 44, x0 + w + 22, top - 44, x, top - 86);
  g.fillStyle(lit(THATCH, 0.1), 1); g.fillTriangle(x0 - 14, top - 46, x0 + w + 14, top - 46, x, top - 82);
  for (let i = 0; i < w / 10; i++) { const bx = x0 - 24 + i * 10 + rng() * 4; g.lineStyle(1.5, THATCH_DARK, 1); g.lineBetween(bx, top - 4, bx + (rng() - 0.5) * 3, top + 4 + rng() * 6); }
  // Masks and gauntlets on the end posts, a carboy at the trough's end, a sign-board on the ridge.
  for (const [px, d] of [[x0 - 6, -1], [x0 + w + 6, 1]] as [number, number][]) {
    g.fillStyle(LEATHER, 1); g.fillCircle(px + d * 12, top + 20, 7);
    g.fillStyle(LEATHER_LIT, 1); g.fillTriangle(px + d * 9, top + 22, px + d * 15, top + 22, px + d * 20, top + 38);
    g.fillStyle(GLASS, 0.9); g.fillCircle(px + d * 10, top + 18, 2); g.fillCircle(px + d * 15, top + 18, 2);
    g.fillStyle(LEATHER, 1); g.fillRoundedRect(px + d * 8 - 4, top + 50, 9, 20, 3);
  }
  const cx = x0 + w - 20, cy = y - 24;
  g.fillStyle(dim(GLASS, 0.3), 0.9); g.fillEllipse(cx, cy - 16, 28, 32);
  g.fillStyle(VENOM, 0.7); g.fillEllipse(cx, cy - 10, 24, 18);
  g.fillStyle(lit(GLASS, 0.5), 0.6); g.fillEllipse(cx - 6, cy - 22, 5, 9);
  g.fillStyle(WICKER, 1); g.fillRect(cx - 14, cy - 10, 28, 10);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40, top - 70, 80, 16);
  g.fillStyle(VENOM, 0.9); for (let i = 0; i < 9; i++) g.fillRect(x - 34 + i * 8, top - 66, 4, 8);
  web(g, x0 + w + 4, top + 6, 14, 0.4);
}

/**
 * A venom vat: a great coopered tub on a timber stand, iron-hooped, a gantry ladder up its side,
 * a long stirring paddle standing in it, the venom inside glowing and crusted at the rim, a drip
 * tap at the bottom over a stone basin.
 */
export function venomVat(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 4, 90 * s, 22 * s, 0.38);
  const w = 72 * s, h = 64 * s, base = y - 18 * s;
  // Stand.
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * w * 0.36 - 4 * s, base, 8 * s, 18 * s); }
  g.fillStyle(TIMBER, 1); g.fillRect(x - w * 0.5, base - 4 * s, w, 6 * s);
  // Staves.
  g.fillStyle(dim(TIMBER, 0.2), 1); g.fillRect(x - w / 2, base - h, w, h);
  for (let i = 0; i < 9; i++) {
    const sx = x - w / 2 + (i * w) / 9;
    g.fillStyle(i % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(sx + 1, base - h, w / 9 - 2, h);
  }
  // Hoops.
  for (const k of [0.15, 0.55, 0.9]) {
    g.fillStyle(0x2a2a28, 1); g.fillRect(x - w / 2 - 2, base - h * k - 3 * s, w + 4, 5 * s);
    g.fillStyle(0x5a5a54, 1); g.fillRect(x - w / 2 - 2, base - h * k - 3 * s, w + 4, 1.5 * s);
  }
  // The venom: a glowing surface, crust at the rim, a slow bubble.
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, base - h, w + 4, 18 * s);
  g.fillStyle(VENOM_DARK, 1); g.fillEllipse(x, base - h + 1, w - 4, 13 * s);
  g.fillStyle(VENOM, 0.85); g.fillEllipse(x - 4 * s, base - h, w * 0.7, 8 * s);
  g.fillStyle(VENOM_LIT, 0.8); g.fillCircle(x + 10 * s, base - h - 1, 3 * s);
  for (let i = 0; i < 8; i++) { g.fillStyle(0xd8d4a0, 0.7); g.fillCircle(x - w / 2 + 4 * s + i * w / 8, base - h + 3 * s, 2.5 * s); }
  glow(g, x, base - h - 6 * s, 40 * s, VENOM, 0.04, 3);
  // Drips down the outside.
  for (const k of [-0.32, 0.1, 0.38]) drip(g, x + k * w, base - h + 6 * s, 8 * s + Math.abs(k) * 14 * s);
  // Paddle, leaning out of it.
  g.lineStyle(4 * s, TIMBER_LIT, 1); g.lineBetween(x - 6 * s, base - h + 2 * s, x + 26 * s, base - h - 60 * s);
  g.fillStyle(TIMBER_LIT, 1); g.fillEllipse(x + 28 * s, base - h - 64 * s, 9 * s, 16 * s);
  // Ladder up the side.
  const lx = x - w / 2 - 10 * s;
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(lx - 4, y, lx - 2, base - h - 4 * s); g.lineBetween(lx + 4, y, lx + 6, base - h - 4 * s);
  for (let k = 0; k < 7; k++) { g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(lx - 4, y - 10 - k * 11 * s, lx + 5, y - 10 - k * 11 * s); }
  // Tap and basin.
  g.fillStyle(BRASS, 1); g.fillRect(x + w * 0.2, base - 10 * s, 10 * s, 4 * s);
  g.fillStyle(0x6a6a62, 1); g.fillEllipse(x + w * 0.3, y - 2, 26 * s, 10 * s);
  g.fillStyle(VENOM_DARK, 1); g.fillEllipse(x + w * 0.3, y - 3, 18 * s, 5 * s);
}

/**
 * The Charmer's Basket — the court bakery: a round house woven like a giant charmer's basket,
 * its lid a domed thatch tilted up on one side, and out of the gap rises a great baked cobra of
 * bread, glazed brown, hood spread, a loaf for a head. The oven's glow comes through the weave;
 * a counter-flap is propped open at the front with loaves on it.
 */
export function basketBakery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.2, 30, 0.38);
  // Raised on a low plank deck.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 14, y - 14, w + 28, 14);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w / 2 - 14, y - 16, w + 28, 4);
  // The basket body: a barrel of weave with a bulge.
  const top = y - 14 - h;
  g.fillStyle(WICKER_DARK, 1); g.fillEllipse(x, y - 16, w, 26);
  g.fillStyle(WICKER_DARK, 1); g.fillRect(x - w / 2, top, w, h);
  for (let row = 0; row < h / 6; row++) {
    const yy = top + row * 6 + 1;
    const bulge = Math.sin((row / (h / 6)) * Math.PI) * 6;
    for (let col = 0; col < (w + bulge * 2) / 9; col++) {
      const xx = x - w / 2 - bulge + col * 9;
      const over = (row + col) % 2 === 0;
      g.fillStyle(over ? WICKER_LIT : WICKER, 1); g.fillRect(xx, yy, 8, 4.5);
      // The oven's glow through the gaps.
      if (!over && rng() < 0.25) { g.fillStyle(LAMP, 0.5); g.fillRect(xx + 2, yy + 4, 4, 1.5); }
    }
  }
  // Painted bands, like a charmer's basket.
  for (const k of [0.25, 0.7]) { g.fillStyle(BRUISE, 0.9); g.fillRect(x - w / 2 - 4, top + h * k, w + 8, 5); g.fillStyle(COBRA_HOOD, 0.9); for (let i = 0; i < w / 12; i++) g.fillTriangle(x - w / 2 + i * 12, top + h * k + 5, x - w / 2 + i * 12 + 6, top + h * k + 5, x - w / 2 + i * 12 + 3, top + h * k + 10); }
  // The door and the counter-flap with its loaves.
  g.fillStyle(0x1a120a, 1); g.fillRoundedRect(x - 18, y - 16 - h * 0.6, 36, h * 0.6, 8);
  g.fillStyle(LAMP, 0.35); g.fillRoundedRect(x - 14, y - 16 - h * 0.56, 28, h * 0.5, 6);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 46, y - 16 - h * 0.34, 92, 6);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 46, y - 10 - h * 0.34, 92, 3);
  for (let i = 0; i < 6; i++) {
    const lx = x - 38 + i * 15;
    if (Math.abs(lx - x) < 16) continue;
    g.fillStyle(0x8a5424, 1); g.fillEllipse(lx, y - 19 - h * 0.34, 12, 7);
    g.fillStyle(0xc88a44, 1); g.fillEllipse(lx - 1, y - 20 - h * 0.34, 9, 4);
    g.lineStyle(1, 0x6a3a14, 1); g.lineBetween(lx - 3, y - 21 - h * 0.34, lx + 2, y - 19 - h * 0.34);
  }
  // The lid: a domed thatch, tilted up on the left.
  g.fillStyle(THATCH_DARK, 1); g.fillEllipse(x + 10, top - 10, w + 36, 36);
  g.fillStyle(THATCH, 1); g.fillEllipse(x + 12, top - 16, w + 26, 30);
  g.fillStyle(lit(THATCH, 0.18), 1); g.fillEllipse(x + 4, top - 22, w * 0.7, 14);
  g.fillStyle(WICKER_LIT, 1); g.fillCircle(x + 14, top - 32, 5);
  // The bread cobra rising from the gap under the lid.
  const bx = x - w * 0.34, by = top - 4;
  const neck: Pt[] = [{ x: bx, y: by + 6 }, { x: bx - 8, y: by - 20 }, { x: bx + 4, y: by - 44 }, { x: bx - 2, y: by - 66 }];
  stroke(g, neck, 16, 0x6a3a14); stroke(g, neck, 13, 0xa8682c); stroke(g, neck.slice(1), 4, 0xd8a058, 0.8);
  g.fillStyle(0x6a3a14, 1); g.fillEllipse(bx - 2, by - 62, 46, 40);
  g.fillStyle(0xa8682c, 1); g.fillEllipse(bx - 2, by - 63, 42, 36);
  g.fillStyle(0xd8a058, 0.9); g.fillEllipse(bx - 2, by - 58, 22, 22);
  for (let i = -2; i <= 2; i++) { g.lineStyle(1.5, 0x8a4a1a, 0.7); g.lineBetween(bx - 2 + i * 7, by - 76, bx - 2 + i * 9, by - 48); }
  g.fillStyle(0xb87a3a, 1); g.fillEllipse(bx - 2, by - 80, 18, 14);
  g.fillStyle(0x3a2010, 1); g.fillCircle(bx - 6, by - 82, 2); g.fillCircle(bx + 2, by - 82, 2);
  g.fillStyle(0xf0d8a0, 0.9); for (let i = 0; i < 6; i++) g.fillCircle(bx - 10 + rng() * 16, by - 70 + rng() * 20, 1.2); // seeds on the glaze
  // The sign on a pole.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + w / 2 + 10, y - 86, 4, 72);
  g.fillStyle(TIMBER, 1); g.fillRect(x + w / 2 - 8, y - 86, 40, 22);
  g.lineStyle(1, TIMBER_DARK, 1); g.strokeRect(x + w / 2 - 8, y - 86, 40, 22);
  charmerBasket(g, x + w / 2 + 12, y - 66, 0.36, false);
  // Smoke-hole steam.
  g.fillStyle(0xe8e0d0, 0.18); g.fillCircle(x + 26, top - 46, 9); g.fillCircle(x + 32, top - 60, 7);
}

/**
 * Scaleby's stall — the court shop: a lean-to of poles under a ragged awning of tanned
 * snakeskins stitched together, shelves of phials and charm-strings, a stuffed cobra on the
 * post, a scale for weighing venom, and the trader's own lamp.
 */
export function phialStall(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 22, 0.35);
  const h = 70;
  // Counter.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - 30, w, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2, y - 34, w, 6);
  for (let i = 0; i < w / 14; i++) { g.lineStyle(1, dim(TIMBER, 0.3), 1); g.lineBetween(x - w / 2 + i * 14, y - 28, x - w / 2 + i * 14, y); }
  // Shelves behind.
  for (const k of [0, 1]) {
    const sy = y - 50 - k * 22;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 8, sy, w - 16, 4);
    for (let i = 0; i < (w - 24) / 11; i++) {
      const px = x - w / 2 + 14 + i * 11;
      const c = [VENOM, DRAUGHT, BRUISE_LIT, 0xe0a040][(i + k) % 4];
      g.fillStyle(dim(GLASS, 0.3), 0.9); g.fillRect(px - 3, sy - 12, 6, 12);
      g.fillStyle(c, 0.85); g.fillRect(px - 2.5, sy - 8, 5, 7);
      g.fillStyle(0x6a4a2a, 1); g.fillRect(px - 2, sy - 14, 4, 3);
    }
  }
  // Charm strings hanging from the awning.
  for (let i = 0; i < 5; i++) {
    const cx = x - w / 2 + 16 + i * ((w - 32) / 4);
    g.lineStyle(1, 0xd8c8a0, 0.8); g.lineBetween(cx, y - h - 2, cx, y - h + 22);
    g.fillStyle([FANG, VENOM, BRASS, BRUISE_LIT, FANG][i], 1); g.fillTriangle(cx - 2, y - h + 20, cx + 2, y - h + 20, cx, y - h + 30);
  }
  // Poles and the snakeskin awning.
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * (w / 2 + 2) - 3, y - h - 8, 6, h + 8); }
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const ax = x - w / 2 - 12 + k * (w + 24);
    const c = [ADDER, VIPER, COBRA, ADDER, SLOUGH, VIPER, COBRA][i];
    g.fillStyle(dim(c, 0.2), 1); g.fillTriangle(ax - (w + 24) / 12 - 2, y - h - 10, ax + (w + 24) / 12 + 2, y - h - 10, ax, y - h + 12 + (i % 2) * 6);
    g.fillStyle(c, 1); g.fillRect(ax - (w + 24) / 12, y - h - 22, (w + 24) / 6, 14);
    for (let j = 0; j < 3; j++) { g.fillStyle(dim(c, 0.4), 0.8); g.fillTriangle(ax - 4 + j * 4 - 4, y - h - 16, ax + j * 4 - 4, y - h - 16, ax - 2 + j * 4 - 4, y - h - 12); }
  }
  // A stuffed cobra rearing on the right pole; a venom scale on the counter; the lamp.
  risenCobra(g, x + w / 2 + 2, y - h + 4, 22, 0.3, 0, 0.7);
  const sx = x - w / 4;
  g.lineStyle(1.5, BRASS_DARK, 1); g.lineBetween(sx, y - 34, sx, y - 54); g.lineBetween(sx - 14, y - 52, sx + 14, y - 52);
  g.lineStyle(1, BRASS, 1); g.lineBetween(sx - 14, y - 52, sx - 12, y - 42); g.lineBetween(sx + 14, y - 52, sx + 12, y - 42);
  g.fillStyle(BRASS, 1); g.fillEllipse(sx - 13, y - 41, 10, 3); g.fillEllipse(sx + 13, y - 41, 10, 3);
  g.fillStyle(VENOM, 0.9); g.fillCircle(sx - 13, y - 43, 2);
  g.fillStyle(LAMP, 0.95); g.fillCircle(x + w / 3, y - 40, 4);
  glow(g, x + w / 3, y - 40, 18, LAMP, 0.06, 3);
  for (let i = 0; i < 3; i++) hangingSkin(g, x - w / 2 + 6 + i * 6, y - h - 6, 18 + rng() * 10, i);
}

/**
 * Prince Venin's Milking Hall: a long hall raised on thick piles over the fen, its reed roof
 * swept up at the front into a great cobra hood that overhangs the door, painted inside with the
 * spectacle mark; two white fang-rocks for door pillars; a carved serpent along the ridge, its
 * head hanging over the hood; the Matriarch's two-dot Mark painted big on the door; braziers of
 * green fire either side, and the dose-trough along the front where the court's venom is tithed.
 */
export function milkingHall(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.1, 40, 0.42);
  const x0 = x - w / 2;
  // Piles and the deck.
  g.fillStyle(FEN, 0.7); g.fillEllipse(x, y + 4, w * 1.05, 30);
  for (let px = x0; px <= x0 + w; px += 40) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 6, y - 30, 12, 32); g.fillStyle(MOSS, 0.6); g.fillRect(px - 6, y - 6, 12, 8); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 20, y - 40, w + 40, 14);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0 - 20, y - 44, w + 40, 5);
  // Steps up to the door.
  for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x - 40 - k * 6, y - 40 + k * 10, 80 + k * 12, 8); }
  // The walls: dark timber with wicker panels and slit windows that glow green.
  const top = y - 44 - h;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, top, w, h);
  for (let i = 0; i < w / 40; i++) {
    const px = x0 + 6 + i * 40;
    g.fillStyle(WICKER_DARK, 1); g.fillRect(px, top + 10, 28, h - 20);
    for (let r = 0; r < (h - 20) / 6; r++) { g.fillStyle((r + i) % 2 ? WICKER : WICKER_LIT, 0.8); g.fillRect(px + 2, top + 12 + r * 6, 24, 3.5); }
    if (i % 2 === 1 && Math.abs(px + 14 - x) > 70) {
      g.fillStyle(0x0a140a, 1); g.fillRect(px + 10, top + 22, 8, 30);
      g.fillStyle(VENOM, 0.7); g.fillRect(px + 11, top + 24, 6, 26);
      glow(g, px + 14, top + 37, 14, VENOM, 0.05, 2);
    }
  }
  // The roof: a long reed ridge, then swept up into the hood over the door.
  g.fillStyle(THATCH_DARK, 1); g.fillRect(x0 - 30, top - 26, w + 60, 30);
  g.fillStyle(THATCH, 1); g.fillRect(x0 - 26, top - 36, w + 52, 24);
  for (let i = 0; i < (w + 52) / 9; i++) { g.lineStyle(1.5, THATCH_DARK, 0.9); g.lineBetween(x0 - 26 + i * 9, top - 12, x0 - 26 + i * 9 + (rng() - 0.5) * 3, top + 4 + rng() * 5); }
  g.fillStyle(THATCH_DARK, 1); g.fillTriangle(x0 - 26, top - 36, x0 + w + 26, top - 36, x, top - 90);
  g.fillStyle(lit(THATCH, 0.08), 1); g.fillTriangle(x0 - 16, top - 38, x0 + w + 16, top - 38, x, top - 86);
  // The hood: a flared shield of thatch over the door, its inside painted with the spectacle.
  const hx = x, hy = top - 30;
  g.fillStyle(dim(THATCH, 0.35), 1); g.fillEllipse(hx, hy + 6, 210, 190);
  g.fillStyle(THATCH, 1); g.fillEllipse(hx, hy, 200, 180);
  for (let i = -6; i <= 6; i++) { g.lineStyle(2, THATCH_DARK, 0.7); g.lineBetween(hx, hy - 84, hx + i * 16, hy + 80); }
  g.fillStyle(COBRA_HOOD, 0.85); g.fillEllipse(hx, hy + 24, 110, 110);
  g.fillStyle(VENIN, 1); g.fillEllipse(hx, hy + 30, 90, 90);
  g.lineStyle(6, COBRA_HOOD, 0.9); g.strokeCircle(hx - 22, hy + 6, 14); g.strokeCircle(hx + 22, hy + 6, 14);
  g.lineStyle(5, COBRA_HOOD, 0.9); g.beginPath(); g.arc(hx, hy + 22, 22, 0.2, Math.PI - 0.2, false); g.strokePath();
  // The carved ridge serpent, its head over the hood.
  const rs: Pt[] = [];
  for (let i = 0; i <= 18; i++) { const t = i / 18; rs.push({ x: x0 + 10 + t * (w - 20), y: top - 40 - Math.sin(t * Math.PI * 6) * 5 - (Math.abs(t - 0.5) < 0.1 ? 40 : 0) }); }
  stroke(g, rs.filter((p) => Math.abs(p.x - x) > 70), 7, BARK_DARK); stroke(g, rs.filter((p) => Math.abs(p.x - x) > 70), 4, BARK);
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(hx, hy - 96, 34, 22);
  g.fillStyle(BARK, 1); g.fillEllipse(hx, hy - 98, 30, 18);
  g.fillStyle(VENIN_EYE, 1); g.fillCircle(hx - 7, hy - 100, 2.5); g.fillCircle(hx + 7, hy - 100, 2.5);
  g.fillStyle(FANG_LIT, 1); g.fillTriangle(hx - 6, hy - 90, hx - 2, hy - 90, hx - 4, hy - 78); g.fillTriangle(hx + 2, hy - 90, hx + 6, hy - 90, hx + 4, hy - 78);
  drip(g, hx - 4, hy - 78, 8); drip(g, hx + 4, hy - 78, 12);
  // The door between two white fang pillars, the Mark painted on it.
  g.fillStyle(0x0c0a06, 1); g.fillRect(x - 34, y - 44 - h * 0.8, 68, h * 0.8);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 30, y - 44 - h * 0.76, 28, h * 0.76); g.fillRect(x + 2, y - 44 - h * 0.76, 28, h * 0.76);
  g.fillStyle(BRUISE, 1); g.fillCircle(x - 10, y - 44 - h * 0.45, 6); g.fillCircle(x + 10, y - 44 - h * 0.45, 6);
  g.fillStyle(BRUISE_LIT, 0.8); g.fillCircle(x - 11, y - 46 - h * 0.45, 2); g.fillCircle(x + 9, y - 46 - h * 0.45, 2);
  for (const k of [-1, 1]) {
    const px = x + k * 56;
    const pts: Pt[] = [{ x: px - 13, y: y - 40 }, { x: px + 13, y: y - 40 }, { x: px + 4 + k * 6, y: y - 44 - h * 1.05 }, { x: px - 2 + k * 8, y: y - 44 - h * 1.12 }];
    g.fillStyle(FANG_DARK, 1); g.fillPoints(pts.map((p) => ({ x: p.x + 2, y: p.y + 1 })), true);
    g.fillStyle(FANG, 1); g.fillPoints(pts, true);
    g.lineStyle(3, FANG_LIT, 0.8); g.lineBetween(px - 9, y - 44, px - 1 + k * 7, y - 40 - h * 1.05);
    g.fillStyle(MOSS, 0.7); g.fillEllipse(px, y - 42, 28, 8);
  }
  // Braziers of green fire.
  for (const k of [-1, 1]) {
    const bx = x + k * 120, by = y - 44;
    g.fillStyle(0x2a2a26, 1); g.fillRect(bx - 3, by - 30, 6, 30);
    g.fillStyle(0x3a3a36, 1); g.fillEllipse(bx, by - 30, 26, 10);
    g.fillStyle(VENOM_DARK, 1); g.fillTriangle(bx - 10, by - 32, bx + 10, by - 32, bx, by - 58);
    g.fillStyle(VENOM, 1); g.fillTriangle(bx - 6, by - 32, bx + 6, by - 32, bx + 1, by - 50);
    g.fillStyle(VENOM_LIT, 1); g.fillTriangle(bx - 3, by - 32, bx + 3, by - 32, bx, by - 42);
  }
  // The dose-trough along the front of the deck.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 30, y - 58, w * 0.3, 12); g.fillRect(x + w * 0.2 - 30, y - 58, w * 0.3, 12);
  g.fillStyle(VENOM, 0.75); g.fillRect(x0 + 32, y - 57, w * 0.3 - 4, 4); g.fillRect(x + w * 0.2 - 28, y - 57, w * 0.3 - 4, 4);
  for (let i = 0; i < 4; i++) web(g, x0 + 20 + i * (w / 3.3), top + 8, 12, 0.35, 6);
}

/**
 * A reed lamp: a crooked pole with a horn lantern swinging from a hook, a skin wound round the
 * pole for grip. The lantern's glow is drawn by the caller (it flickers).
 */
export function reedLamp(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 20, 6);
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x, y, x + 2, y - 70);
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x - 1, y, x + 1, y - 70);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 2, y - 70, x + 16, y - 74);
  g.lineStyle(1, 0x3a3a3a, 1); g.lineBetween(x + 16, y - 74, x + 16, y - 66);
  g.fillStyle(0x2a2016, 1); g.fillRect(x + 11, y - 66, 10, 3);
  g.fillStyle(LAMP, 0.9); g.fillRoundedRect(x + 11, y - 63, 10, 12, 3);
  g.fillStyle(LAMP_HOT, 0.9); g.fillCircle(x + 16, y - 57, 2);
  g.fillStyle(0x2a2016, 1); g.fillRect(x + 11, y - 51, 10, 2);
  for (let i = 0; i < 4; i++) { g.lineStyle(2, SLOUGH, 0.7); g.lineBetween(x - 2, y - 20 - i * 6, x + 3, y - 24 - i * 6); }
}

/**
 * The ration board — a slate on two posts with the Draught House list chalked up in columns: a
 * household to a row, a tick for each dose, and the struck-out names of the passed-over.
 */
export function rationBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 70, 12);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 30 - 3, y - 60, 6, 60); }
  g.fillStyle(0x24282a, 1); g.fillRect(x - 36, y - 64, 72, 44);
  g.lineStyle(3, TIMBER, 1); g.strokeRect(x - 36, y - 64, 72, 44);
  for (let r = 0; r < 6; r++) {
    const ry = y - 58 + r * 6.5;
    g.lineStyle(1, 0xd8dcd4, 0.7); g.lineBetween(x - 31, ry, x - 31 + 16 + rng() * 10, ry);
    for (let t = 0; t < 4; t++) if (rng() < 0.7) { g.lineStyle(1, 0xd8dcd4, 0.8); g.lineBetween(x + 2 + t * 7, ry - 2, x + 4 + t * 7, ry + 1); }
    if (r === 2 || r === 5) { g.lineStyle(1.5, BRUISE_LIT, 0.9); g.lineBetween(x - 33, ry, x + 32, ry); }
  }
  g.fillStyle(BRUISE, 1); g.fillCircle(x - 4, y - 70, 3); g.fillCircle(x + 4, y - 70, 3);
}

/** A fen-gas bubble swelling out of the mud: a skin of green, a highlight, wobbling as it fills. */
export function gasBubble(g: G, x: number, y: number, r: number, t: number, ripe = 0): void {
  const wob = Math.sin(t / 90) * r * 0.05 * (1 + ripe);
  g.fillStyle(MUD_DARK, 0.6); g.fillEllipse(x, y + r * 0.5, r * 2.4, r * 0.7);
  g.fillStyle(GAS_DARK, 0.45); g.fillEllipse(x, y - r * 0.4, r * 2 + wob, r * 1.85 - wob);
  g.fillStyle(GAS, 0.3 + ripe * 0.25); g.fillEllipse(x, y - r * 0.45, r * 1.8 + wob, r * 1.7 - wob);
  g.lineStyle(1.5, mixC(GAS, 0xffffff, 0.3), 0.6 + ripe * 0.3); g.strokeEllipse(x, y - r * 0.4, r * 2 + wob, r * 1.85 - wob);
  g.fillStyle(0xffffff, 0.5); g.fillEllipse(x - r * 0.35, y - r * 0.9, r * 0.45, r * 0.3);
  if (ripe > 0.7) { g.lineStyle(1, VENOM_LIT, (ripe - 0.7) * 3); g.strokeCircle(x, y - r * 0.4, r * 1.2); }
}

/**
 * A shed skin left standing: the hollow papery cast of a fighter, the shape of a body with its
 * arms, see-through, its scale diamonds catching the light, split down the back where its owner
 * stepped out. `tint` is the owner's colour; `a` fades it.
 */
export function shedHusk(g: G, x: number, y: number, tint: number, a: number, t: number, crumble = 0): void {
  const c = mixC(SLOUGH, tint, 0.3);
  const sway = Math.sin(t / 700 + x) * 1.5;
  g.fillStyle(0x000000, 0.18 * a); g.fillEllipse(x, y + 18, 36, 10);
  // Body and head: a translucent shell.
  g.fillStyle(c, 0.32 * a); g.fillEllipse(x + sway * 0.3, y, 34, 40);
  g.fillStyle(c, 0.32 * a); g.fillCircle(x + sway, y - 26, 13);
  g.lineStyle(1.5, lit(c, 0.3), 0.75 * a); g.strokeEllipse(x + sway * 0.3, y, 34, 40); g.strokeCircle(x + sway, y - 26, 13);
  // Arms, hanging empty.
  for (const k of [-1, 1]) {
    g.lineStyle(5, c, 0.35 * a); g.lineBetween(x + k * 15, y - 8, x + k * 20, y + 12 + sway * k);
    g.fillStyle(c, 0.35 * a); g.fillCircle(x + k * 20, y + 13 + sway * k, 5);
  }
  // Scale diamonds.
  for (let i = 0; i < 14; i++) {
    const px = x - 12 + (i % 4) * 8 + (Math.floor(i / 4) % 2) * 4, py = y - 14 + Math.floor(i / 4) * 9;
    g.lineStyle(1, dim(c, 0.3), 0.5 * a);
    g.strokeTriangle(px - 3, py, px, py - 3, px + 3, py); g.strokeTriangle(px - 3, py, px, py + 3, px + 3, py);
  }
  // Empty eye-holes and the split down the back.
  g.fillStyle(0x1a1a14, 0.5 * a); g.fillEllipse(x + sway - 4, y - 28, 4, 3); g.fillEllipse(x + sway + 4, y - 28, 4, 3);
  g.lineStyle(1.5, dim(c, 0.4), 0.7 * a); g.lineBetween(x + sway, y - 38, x, y + 8);
  if (crumble > 0) {
    for (let i = 0; i < 10; i++) {
      const ang = i * 0.63;
      g.fillStyle(c, a * (1 - crumble)); g.fillTriangle(
        x + Math.cos(ang) * crumble * 40, y + Math.sin(ang) * crumble * 30 + crumble * 20,
        x + Math.cos(ang) * crumble * 40 + 5, y + Math.sin(ang) * crumble * 30 + crumble * 20,
        x + Math.cos(ang) * crumble * 40 + 2, y + Math.sin(ang) * crumble * 30 + crumble * 20 + 5);
    }
  }
}

/** A puddle of spilt venom on the ground: an irregular glowing slick with a crusted edge. */
export function venomSlick(g: G, x: number, y: number, r: number, a: number, t: number, seed = 0): void {
  for (let i = 0; i < 7; i++) {
    const ang = seed + i * 0.9;
    g.fillStyle(VENOM_DARK, 0.45 * a);
    g.fillEllipse(x + Math.cos(ang) * r * 0.45, y + Math.sin(ang) * r * 0.3, r * 0.95, r * 0.6);
  }
  g.fillStyle(VENOM, 0.35 * a); g.fillEllipse(x, y, r * 1.5, r * 0.95);
  g.lineStyle(1.5, VENOM_LIT, 0.4 * a); g.strokeEllipse(x, y, r * 1.6, r * 1.0);
  for (let i = 0; i < 3; i++) {
    const ph = ((t / 900) + i / 3 + seed) % 1;
    g.lineStyle(1, VENOM_LIT, 0.5 * a * (1 - ph)); g.strokeCircle(x + Math.cos(seed + i * 2) * r * 0.4, y + Math.sin(seed + i * 2) * r * 0.25, 2 + ph * 6);
  }
}

/** The Matriarch's Mark: two small round scars side by side (drawn on wrists, doors, banners). */
export function markSigil(g: G, x: number, y: number, r: number, c = BRUISE, a = 1): void {
  g.fillStyle(dim(c, 0.3), a); g.fillCircle(x - r * 1.3, y + 0.5, r); g.fillCircle(x + r * 1.3, y + 0.5, r);
  g.fillStyle(c, a); g.fillCircle(x - r * 1.3, y, r * 0.85); g.fillCircle(x + r * 1.3, y, r * 0.85);
  g.fillStyle(lit(c, 0.4), a * 0.8); g.fillCircle(x - r * 1.5, y - r * 0.3, r * 0.3); g.fillCircle(x + r * 1.1, y - r * 0.3, r * 0.3);
}

/** A carved serpent post: a pole with a snake spiralling up it to a raised head (court boundary marks). */
export function serpentPost(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 2, 26, 8);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4, y - h, 8, h);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 3, y - h, 4, h);
  for (let i = 0; i < 8; i++) {
    const k = i / 8;
    const yy = y - 6 - k * (h - 16);
    g.lineStyle(4, VENIN_LIT, 0.9);
    g.beginPath(); g.arc(x, yy, 6, (i % 2) * Math.PI, (i % 2) * Math.PI + Math.PI, false); g.strokePath();
  }
  g.fillStyle(VENIN, 1); g.fillEllipse(x + 4, y - h - 4, 14, 10);
  g.fillStyle(VENIN_EYE, 1); g.fillCircle(x + 6, y - h - 6, 1.5);
  g.fillStyle(MUD_LIT, 1); g.fillRect(x - 6, y - 4, 12, 4);
}
