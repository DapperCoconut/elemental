import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  ARC, ARC_HOT, BASALT, BASALT_DARK, BASALT_LIT, BOLT, BOTH, BOTH_DARK, BOTH_LIT, BRASS, BRASS_DARK, BRASS_LIT, CAT,
  CAT_DARK, COPPER, COPPER_DARK, COPPER_LIT, DEAL, DEAL_DARK, DEAL_LIT, GLASS, GLASS_LIT, GROUT, IRON, IRON_LIT, PATINA,
  ROOF, SLATE, SLATE_DARK, SLATE_LIT, STATE_A, STATE_A_DARK, STATE_A_LIT, STATE_B, STATE_B_DARK, STATE_B_LIT, STENCIL,
  STRAP, VIAL, VIAL_DARK, WAX, WELL, WELL_DEEP, WELL_LIT,
} from './palette';

/**
 * The Superposition Court's set pieces. Every function draws at world coordinates with `x, y` as
 * the piece's base (feet) line unless it says otherwise, so a piece can be y-sorted against the
 * people walking past it.
 *
 * The court's look is *two at once*: every building is drawn in its first state with the ghost of
 * its second laid over it (the flicker between them is animated in the area painter), every box is
 * sealed, every light is an arc lamp (flame is contraband), and copper cable runs over everything
 * toward the Crown Coil.
 */

// ── Small shared marks ───────────────────────────────────────────────

/** The stencil on every sealed box: an open eye, struck through. DO NOT OBSERVE. */
export function stencilEye(g: G, x: number, y: number, r: number, color = STENCIL, a = 0.85): void {
  g.lineStyle(Math.max(1, r * 0.22), color, a);
  g.beginPath(); g.arc(x, y + r * 0.55, r, Math.PI * 1.2, Math.PI * 1.8, false); g.strokePath();
  g.beginPath(); g.arc(x, y - r * 0.55, r, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.3);
  g.lineStyle(Math.max(1, r * 0.25), color, a); g.lineBetween(x - r * 0.9, y + r * 0.7, x + r * 0.9, y - r * 0.7);
}

/** A zig-zag arc of current from a to b; `t` (seconds) re-rolls the kinks so it crawls. */
export function crackle(g: G, a: Pt, b: Pt, t: number, seed: number, color = BOLT, w = 1.6, alpha = 0.9, kinks = 6): void {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const step = Math.floor(t * 18);
  let px = a.x, py = a.y;
  g.lineStyle(w * 2.6, color, alpha * 0.18);
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath();
  g.lineStyle(w, color, alpha);
  g.beginPath(); g.moveTo(px, py);
  for (let i = 1; i < kinks; i++) {
    const k = i / kinks;
    const h = Math.sin((seed + step) * 12.9898 + i * 78.233) * 43758.5453;
    const off = ((h - Math.floor(h)) - 0.5) * Math.min(18, len * 0.2);
    px = a.x + dx * k + nx * off; py = a.y + dy * k + ny * off;
    g.lineTo(px, py);
  }
  g.lineTo(b.x, b.y); g.strokePath();
}

/** A sagging cable from a to b (the Grid runs everywhere). */
export function cable(g: G, a: Pt, b: Pt, sag: number, color = COPPER_DARK, w = 2): void {
  const n = 12;
  g.lineStyle(w + 1.5, 0x000000, 0.35);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag + 2;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
  g.lineStyle(w, color, 1);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokePath();
}

/** The point a fraction `k` along a sagging cable. */
export function cableAt(a: Pt, b: Pt, sag: number, k: number): Pt {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * sag };
}

/** A sitting cat, in profile (the boxes are half cats). */
export function catSit(g: G, x: number, y: number, s: number, c = CAT, a = 1): void {
  g.fillStyle(dim(c, 0.35), a); g.fillEllipse(x, y - 7 * s, 18 * s, 14 * s);
  g.fillStyle(c, a); g.fillEllipse(x, y - 8 * s, 16 * s, 13 * s);
  g.fillCircle(x + 6 * s, y - 17 * s, 6 * s);
  g.fillTriangle(x + 2 * s, y - 21 * s, x + 4 * s, y - 27 * s, x + 7 * s, y - 22 * s);
  g.fillTriangle(x + 7 * s, y - 22 * s, x + 10 * s, y - 27 * s, x + 11 * s, y - 20 * s);
  // The tail curled round the feet.
  g.lineStyle(3 * s, c, a);
  g.beginPath(); g.arc(x - 4 * s, y - 3 * s, 7 * s, Math.PI * 0.1, Math.PI * 1.05, false); g.strokePath();
  g.fillStyle(dim(c, 0.5), a); g.fillRect(x - 3 * s, y - 14 * s, 6 * s, 1.5 * s);
  g.fillStyle(0x1a1a10, a); g.fillCircle(x + 8 * s, y - 18 * s, 1 * s);
}

/** A stoppered poison vial (the boxes are half vials). */
export function vial(g: G, x: number, y: number, s: number, a = 1): void {
  g.fillStyle(dim(GLASS, 0.3), a * 0.9); g.fillCircle(x, y - 7 * s, 8 * s); g.fillRect(x - 3 * s, y - 20 * s, 6 * s, 9 * s);
  g.fillStyle(VIAL, a * 0.85); g.fillCircle(x, y - 6 * s, 6.5 * s);
  g.fillStyle(lit(VIAL, 0.4), a * 0.7); g.fillCircle(x - 2 * s, y - 8 * s, 2 * s);
  g.fillStyle(VIAL_DARK, a); g.fillRect(x - 3.5 * s, y - 23 * s, 7 * s, 4 * s);
  // A skull blot on the label.
  g.fillStyle(0xf0f0e0, a * 0.9); g.fillCircle(x, y - 6 * s, 2.2 * s);
  g.fillStyle(0x101010, a); g.fillCircle(x - 0.8 * s, y - 6.4 * s, 0.6 * s); g.fillCircle(x + 0.8 * s, y - 6.4 * s, 0.6 * s);
}

// ── Sealed boxes ─────────────────────────────────────────────────────

/**
 * One sealed box in three-quarter view: deal planks, iron straps, the Grid's red wax on the lid,
 * the struck-through eye stencilled on the front, a docket tag, a row of air holes (for the cat
 * that might be in it). `x, y` is the front-bottom centre; `s` is the side in px.
 */
export function sealedBox(g: G, x: number, y: number, s: number, seed = 0, tint = 0): void {
  const wood = tint ? mixC(DEAL, tint, 0.18) : DEAL;
  const d = s * 0.42;
  const x0 = x - s / 2, top = y - s;
  shadow(g, x + d * 0.3, y + 2, s * 1.3, s * 0.32, 0.3);
  // Top face.
  g.fillStyle(lit(wood, 0.12), 1);
  g.fillPoints([{ x: x0, y: top }, { x: x0 + s, y: top }, { x: x0 + s + d, y: top - d * 0.6 }, { x: x0 + d, y: top - d * 0.6 }], true);
  // Side face.
  g.fillStyle(dim(wood, 0.32), 1);
  g.fillPoints([{ x: x0 + s, y: top }, { x: x0 + s + d, y: top - d * 0.6 }, { x: x0 + s + d, y: y - d * 0.6 }, { x: x0 + s, y }], true);
  // Front face, in planks.
  g.fillStyle(wood, 1); g.fillRect(x0, top, s, s);
  for (let k = 1; k < 4; k++) { g.lineStyle(1, DEAL_DARK, 0.7); g.lineBetween(x0, top + (s * k) / 4, x0 + s, top + (s * k) / 4); }
  for (let k = 0; k < 7; k++) {
    const h = Math.sin((seed + k) * 91.7) * 0.5 + 0.5;
    g.fillStyle(h > 0.5 ? DEAL_LIT : DEAL_DARK, 0.35); g.fillRect(x0 + 3 + h * (s - 10), top + 3 + ((k * 37) % Math.max(1, s - 6)), 4, 1);
  }
  g.lineStyle(1.5, DEAL_DARK, 1); g.strokeRect(x0, top, s, s);
  // Iron straps over the front and the lid.
  for (const fx of [0.18, 0.82]) {
    g.fillStyle(STRAP, 1); g.fillRect(x0 + s * fx - 2, top, 4, s);
    g.fillPoints([{ x: x0 + s * fx - 2, y: top }, { x: x0 + s * fx + 2, y: top }, { x: x0 + s * fx + 2 + d, y: top - d * 0.6 }, { x: x0 + s * fx - 2 + d, y: top - d * 0.6 }], true);
    g.fillStyle(IRON_LIT, 1); g.fillCircle(x0 + s * fx, top + 4, 1.2); g.fillCircle(x0 + s * fx, y - 4, 1.2);
  }
  // The stencil and the docket.
  stencilEye(g, x, top + s * 0.48, s * 0.16);
  g.fillStyle(0xe8e0c8, 1); g.fillRect(x0 + s * 0.62, top + s * 0.72, s * 0.16, s * 0.12);
  g.lineStyle(1, STENCIL, 0.6); g.lineBetween(x0 + s * 0.64, top + s * 0.76, x0 + s * 0.76, top + s * 0.76);
  // Air holes.
  for (let k = 0; k < 3; k++) { g.fillStyle(0x0a0806, 0.9); g.fillCircle(x0 + s + d * 0.5, top + s * 0.28 + k * s * 0.16 - d * 0.3, 1.4); }
  // The Grid's wax seal across the lid seam.
  g.fillStyle(dim(WAX, 0.3), 1); g.fillCircle(x + d * 0.5, top - d * 0.3 + 1, s * 0.09 + 1);
  g.fillStyle(WAX, 1); g.fillCircle(x + d * 0.5, top - d * 0.3, s * 0.09);
  g.lineStyle(1, lit(WAX, 0.35), 1); g.lineBetween(x + d * 0.5 - 2, top - d * 0.3 + 1, x + d * 0.5 + 1, top - d * 0.3 - 2);
}

/** A stack of sealed boxes, tumbled up against a wall: `rows` is boxes per row from the bottom. */
export function boxStack(g: G, x: number, y: number, rows: number[], s: number, seed: number): void {
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r];
    const w = n * s * 1.04;
    for (let k = 0; k < n; k++) {
      const jitter = Math.sin((seed + r * 7 + k) * 3.1) * s * 0.06;
      sealedBox(g, x - w / 2 + s * 0.52 + k * s * 1.04 + jitter, y - r * s * 1.0 - r * 2, s, seed + r * 11 + k, (r + k + seed) % 3 === 0 ? STATE_A : (r + k + seed) % 3 === 1 ? STATE_B : 0);
    }
  }
}

// ── Lights, posts and pylons ─────────────────────────────────────────

/** An arc lamp on an iron standard: two carbons in a glass globe. (No flame — flame is a theft.) */
export function arcLamp(g: G, x: number, y: number, h = 70, on = true): void {
  shadow(g, x, y, 22, 7);
  g.fillStyle(IRON, 1); g.fillRect(x - 5, y - 6, 10, 6); g.fillRect(x - 2, y - h, 4, h);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 1, y - h, 1, h);
  // The bracket and the globe.
  g.lineStyle(2, IRON, 1); g.lineBetween(x, y - h, x + 12, y - h - 6); g.lineBetween(x + 12, y - h - 6, x + 12, y - h + 2);
  if (on) glow(g, x + 12, y - h + 10, 26, ARC, 0.06, 4);
  g.fillStyle(on ? lit(GLASS, 0.3) : dim(GLASS, 0.5), on ? 0.75 : 0.5); g.fillCircle(x + 12, y - h + 10, 8);
  g.lineStyle(1, IRON_LIT, 1); g.strokeCircle(x + 12, y - h + 10, 8);
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x + 12, y - h + 2, x + 12, y - h + 8); g.lineBetween(x + 12, y - h + 18, x + 12, y - h + 12);
  if (on) { g.fillStyle(ARC_HOT, 1); g.fillCircle(x + 12, y - h + 10, 2.2); }
}

/** Where an arc lamp's globe sits, for flicker in `animate`. */
export const arcLampGlobe = (x: number, y: number, h = 70): Pt => ({ x: x + 12, y: y - h + 10 });

/**
 * A lattice pylon carrying the Grid: splayed iron legs, cross-bracing, two cross-arms with glass
 * insulators, a lightning rod at the top. Returns the two insulator tips (for stringing cable).
 */
export function pylon(g: G, x: number, y: number, h = 150): Pt[] {
  shadow(g, x, y + 2, 60, 14);
  const w0 = 26, w1 = 6;
  const legL = (k: number) => x - w0 + (w0 - w1) * k, legR = (k: number) => x + w0 - (w0 - w1) * k;
  g.lineStyle(3, IRON, 1);
  g.lineBetween(legL(0), y, legL(1), y - h); g.lineBetween(legR(0), y, legR(1), y - h);
  g.lineStyle(1.5, IRON_LIT, 0.9);
  for (let k = 0; k < 6; k++) {
    const a = k / 6, b = (k + 1) / 6;
    g.lineBetween(legL(a), y - h * a, legR(b), y - h * b);
    g.lineBetween(legR(a), y - h * a, legL(b), y - h * b);
    g.lineBetween(legL(b), y - h * b, legR(b), y - h * b);
  }
  // Cross-arms and insulators.
  const tips: Pt[] = [];
  for (const [k, span] of [[0.72, 44], [0.9, 32]] as [number, number][]) {
    const ay = y - h * k;
    g.lineStyle(3, IRON, 1); g.lineBetween(x - span, ay, x + span, ay);
    for (const sx of [-1, 1]) {
      const ix = x + sx * span;
      for (let d = 0; d < 3; d++) { g.fillStyle(d % 2 ? GLASS : lit(GLASS, 0.3), 0.9); g.fillEllipse(ix, ay + 3 + d * 3, 8 - d, 3); }
      tips.push({ x: ix, y: ay + 11 });
    }
  }
  // The rod.
  g.lineStyle(2, COPPER, 1); g.lineBetween(x, y - h, x, y - h - 26);
  g.fillStyle(COPPER_LIT, 1); g.fillCircle(x, y - h - 27, 2.4);
  // A brass plate with the Grid's coil at the foot.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 8, y - 30, 16, 12);
  g.fillStyle(BRASS, 1); g.fillRect(x - 7, y - 29, 14, 10);
  gridCoil(g, x, y - 24, 4, COPPER_DARK);
  return tips;
}

/** The pylon's insulator tips without drawing (for the cable network in the painter). */
export function pylonTips(x: number, y: number, h = 150): Pt[] {
  const out: Pt[] = [];
  for (const [k, span] of [[0.72, 44], [0.9, 32]] as [number, number][]) for (const sx of [-1, 1]) out.push({ x: x + sx * span, y: y - h * k + 11 });
  return out;
}

/** The Empress's mark, painted on everything the Grid owns: a coil round a bolt. */
export function gridCoil(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  g.lineStyle(Math.max(1, r * 0.3), color, a);
  for (let k = 0; k < 3; k++) g.strokeEllipse(x, y - r * 0.6 + k * r * 0.6, r * 2, r * 0.7);
  g.fillStyle(color, a);
  g.fillTriangle(x + r * 0.3, y - r * 1.4, x - r * 0.5, y + r * 0.1, x + r * 0.1, y + r * 0.1);
  g.fillTriangle(x - r * 0.1, y - r * 0.1, x + r * 0.5, y - r * 0.1, x - r * 0.3, y + r * 1.4);
}

/**
 * A household meter by a door: a brass case with a glass face whose needle points to two
 * readings at once (one in each state) — the Draw is metered twice in this court.
 */
export function doubleMeter(g: G, x: number, y: number, s = 1): void {
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 9 * s, y - 22 * s, 18 * s, 22 * s, 3 * s);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 8 * s, y - 21 * s, 16 * s, 20 * s, 3 * s);
  g.fillStyle(0xf0ead8, 1); g.fillCircle(x, y - 13 * s, 6 * s);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * 1.15 + (k / 4) * Math.PI * 0.7;
    g.lineStyle(0.8, STENCIL, 1); g.lineBetween(x + Math.cos(a) * 4.5 * s, y - 13 * s + Math.sin(a) * 4.5 * s, x + Math.cos(a) * 6 * s, y - 13 * s + Math.sin(a) * 6 * s);
  }
  g.lineStyle(1.3 * s, STATE_A, 1); g.lineBetween(x, y - 13 * s, x - 4 * s, y - 17 * s);
  g.lineStyle(1.3 * s, STATE_B, 1); g.lineBetween(x, y - 13 * s, x + 4.5 * s, y - 16 * s);
  g.fillStyle(STENCIL, 1); g.fillCircle(x, y - 13 * s, 1.2 * s);
  g.fillStyle(0x101014, 1); g.fillRect(x - 5 * s, y - 5 * s, 10 * s, 2.5 * s);
  g.lineStyle(1.5, COPPER_DARK, 1); g.lineBetween(x, y - 22 * s, x, y - 30 * s);
}

/** A crank wheel on a house wall: every household cranks its share of the Draw. */
export function crankWheel(g: G, x: number, y: number, r: number): void {
  g.lineStyle(3, IRON, 1); g.strokeCircle(x, y, r);
  g.lineStyle(1.5, IRON_LIT, 1);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r); }
  g.fillStyle(COPPER, 1); g.fillCircle(x, y, r * 0.25);
  g.lineStyle(3, DEAL_DARK, 1); g.lineBetween(x + r, y, x + r + 6, y + 6);
}

// ── Two-state houses ─────────────────────────────────────────────────

/** One of a house's two states. */
export interface HouseState {
  wall: number;
  roof: number;
  /** Roof shape. */
  style: 'gable' | 'flat' | 'slant' | 'tower' | 'ruin';
  /** Lit windows (electric) or dark (switched off). */
  lit: boolean;
  /** Storeys tall, 1–3. */
  floors: number;
}

function roofShape(x0: number, top: number, w: number, st: HouseState): Pt[] {
  switch (st.style) {
    case 'gable': return [{ x: x0 - 6, y: top }, { x: x0 + w / 2, y: top - w * 0.42 }, { x: x0 + w + 6, y: top }];
    case 'slant': return [{ x: x0 - 6, y: top }, { x: x0 - 6, y: top - w * 0.36 }, { x: x0 + w + 6, y: top - 6 }, { x: x0 + w + 6, y: top }];
    case 'tower': return [{ x: x0 + w * 0.2, y: top }, { x: x0 + w * 0.5, y: top - w * 0.85 }, { x: x0 + w * 0.8, y: top }];
    case 'ruin': return [{ x: x0, y: top }, { x: x0 + w * 0.2, y: top - 12 }, { x: x0 + w * 0.35, y: top + 4 }, { x: x0 + w * 0.6, y: top - 18 }, { x: x0 + w * 0.8, y: top + 2 }, { x: x0 + w, y: top - 6 }, { x: x0 + w, y: top + 8 }, { x: x0, y: top + 8 }];
    default: return [{ x: x0 - 4, y: top }, { x: x0 - 4, y: top - 8 }, { x: x0 + w + 4, y: top - 8 }, { x: x0 + w + 4, y: top }];
  }
}

/** Window rects for a house state, in rows. */
function windowsOf(x0: number, y: number, w: number, st: HouseState): Rect[] {
  const out: Rect[] = [];
  const fh = 44;
  for (let f = 0; f < st.floors; f++) {
    const wy = y - 22 - f * fh - 16;
    const n = Math.max(2, Math.round(w / 34));
    for (let k = 0; k < n; k++) {
      const wx = x0 + (w * (k + 0.5)) / n - 6;
      if (f === 0 && Math.abs(wx + 6 - (x0 + w / 2)) < 14) continue;
      out.push({ x: wx, y: wy, w: 12, h: 16 });
    }
  }
  return out;
}

/** How tall a state stands (to its eaves). */
export const stateHeight = (st: HouseState): number => 22 + st.floors * 44;

/**
 * A house in two states at once. State A is drawn solid — soot-brick or limewash, tar-paper roof,
 * arc-lit or switched-off windows, a crank wheel on the wall and a double meter by the door. State
 * B is laid over it as a ghost: its own outline, roof line and windows, offset a hand's breadth,
 * in the other state's colour. The flicker between them is animated by the painter
 * (`houseGhost`). `x, y` is the middle of the front wall's base.
 */
export function twoStateHouse(g: G, x: number, y: number, w: number, a: HouseState, b: HouseState, seed: number): void {
  const h = stateHeight(a);
  const x0 = x - w / 2, top = y - h;
  shadow(g, x, y + 4, w * 1.2, 24);
  // Wall.
  g.fillStyle(dim(a.wall, 0.45), 1); g.fillRect(x0 - 2, top - 2, w + 4, h + 4);
  g.fillStyle(a.wall, 1); g.fillRect(x0, top, w, h);
  // Brick courses, rain-dark at the foot.
  for (let r = 0; r < h / 7; r++) {
    const off = r % 2 ? 7 : 0;
    for (let bx = x0 + off; bx < x0 + w - 4; bx += 14) {
      const hh = Math.sin((seed + r * 13 + bx) * 0.37) * 0.5 + 0.5;
      g.fillStyle(hh > 0.6 ? lit(a.wall, 0.08) : dim(a.wall, 0.12), 0.5); g.fillRect(bx + 1, top + r * 7 + 1, 12, 5);
    }
  }
  g.fillStyle(0x000000, 0.25); g.fillRect(x0, y - 10, w, 10);
  // Roof.
  if (a.style !== 'ruin') {
    const rp = roofShape(x0, top, w, a);
    g.fillStyle(dim(a.roof, 0.3), 1); g.fillPoints(rp.map((p) => ({ x: p.x, y: p.y + 3 })), true);
    g.fillStyle(a.roof, 1); g.fillPoints(rp, true);
    g.lineStyle(1.5, lit(a.roof, 0.2), 0.6);
    for (let k = 0; k < rp.length - 1; k++) g.lineBetween(rp[k].x, rp[k].y, rp[k + 1].x, rp[k + 1].y);
    // Tar-paper seams.
    for (let k = 1; k < 5; k++) { g.lineStyle(1, dim(a.roof, 0.4), 0.6); g.lineBetween(x0, top - k * 4, x0 + w, top - k * 4); }
  } else {
    // Broken wall-head, with charred rafters.
    const rp = roofShape(x0, top, w, a);
    g.fillStyle(a.wall, 1); g.fillPoints(rp, true);
    g.lineStyle(3, 0x1a1414, 1); g.lineBetween(x0 + w * 0.25, top - 4, x0 + w * 0.5, top - 30); g.lineBetween(x0 + w * 0.6, top - 10, x0 + w * 0.82, top - 26);
  }
  // A chimney-stub carrying a lightning rod (no chimneys smoke here: fire is contraband).
  g.fillStyle(dim(a.wall, 0.3), 1); g.fillRect(x0 + w * 0.72, top - w * 0.3, 10, w * 0.3);
  g.lineStyle(1.5, COPPER, 1); g.lineBetween(x0 + w * 0.72 + 5, top - w * 0.3, x0 + w * 0.72 + 5, top - w * 0.3 - 20);
  // Windows.
  for (const r of windowsOf(x0, y, w, a)) {
    g.fillStyle(IRON, 1); g.fillRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
    if (a.lit) { g.fillStyle(lit(ARC, 0.1), 0.95); g.fillRect(r.x, r.y, r.w, r.h); glow(g, r.x + r.w / 2, r.y + r.h / 2, 16, ARC, 0.04, 2); }
    else { g.fillStyle(0x0a0a12, 1); g.fillRect(r.x, r.y, r.w, r.h); }
    g.lineStyle(1, IRON, 1); g.lineBetween(r.x + r.w / 2, r.y, r.x + r.w / 2, r.y + r.h); g.lineBetween(r.x, r.y + r.h / 2, r.x + r.w, r.y + r.h / 2);
  }
  // Door with its electric lock, the double meter and the crank.
  g.fillStyle(0x15121a, 1); g.fillRect(x - 10, y - 30, 20, 30);
  g.fillStyle(dim(a.wall, 0.55), 1); g.fillRect(x - 8, y - 28, 16, 28);
  g.fillStyle(a.lit ? 0x6cff9a : 0xff4a3a, 1); g.fillCircle(x + 5, y - 15, 1.6);
  doubleMeter(g, x + 20, y - 8, 0.8);
  crankWheel(g, x0 + 14, y - 26, 9);
  if (!a.lit) {
    // Switched off: the meterman's chalk cross on the door.
    g.lineStyle(2, 0xf0f0f0, 0.75); g.lineBetween(x - 7, y - 26, x + 7, y - 6); g.lineBetween(x + 7, y - 26, x - 7, y - 6);
  }
  // The ghost of state B.
  houseGhostOutline(g, x, y, w, b, 0.32);
}

/** State B's ghost as lines only (baked into the piece). */
function houseGhostOutline(g: G, x: number, y: number, w: number, b: HouseState, a: number): void {
  const h = stateHeight(b);
  const x0 = x - w / 2 + 7, top = y - h - 5;
  const c = STATE_B;
  g.lineStyle(1.5, c, a); g.strokeRect(x0, top, w, h);
  const rp = roofShape(x0, top, w, b);
  g.beginPath(); g.moveTo(rp[0].x, rp[0].y); for (const p of rp.slice(1)) g.lineTo(p.x, p.y); g.strokePath();
  for (const r of windowsOf(x0, y - 5, w, b)) { g.lineStyle(1, c, a * 0.9); g.strokeRect(r.x, r.y, r.w, r.h); }
}

/**
 * The live flicker between a house's states, for `animateOver`: `k` 0..1 is how far into state B
 * the house has swung. At 0 only a faint shimmer of B's outline; near 1, B is filled in over A
 * (its walls, roof and windows in the cold state) and A's outline shows through in magenta.
 */
export function houseGhost(g: G, x: number, y: number, w: number, a: HouseState, b: HouseState, k: number, t: number): void {
  const hb = stateHeight(b);
  const x0 = x - w / 2 + 7, top = y - hb - 5;
  if (k > 0.05) {
    g.fillStyle(mixC(b.wall, STATE_B_DARK, 0.4), 0.55 * k); g.fillRect(x0, top, w, hb);
    if (b.style !== 'ruin') { g.fillStyle(mixC(b.roof, STATE_B_DARK, 0.3), 0.6 * k); g.fillPoints(roofShape(x0, top, w, b), true); }
    for (const r of windowsOf(x0, y - 5, w, b)) { g.fillStyle(b.lit ? STATE_B_LIT : 0x050510, 0.7 * k); g.fillRect(r.x, r.y, r.w, r.h); }
    const ha = stateHeight(a);
    g.lineStyle(1.2, STATE_A, 0.5 * k); g.strokeRect(x - w / 2, y - ha, w, ha);
  }
  const sh = 0.12 + 0.1 * Math.sin(t * 9 + x);
  g.lineStyle(1, STATE_B_LIT, sh * (1 - k * 0.5)); g.strokeRect(x0 - 1, top - 1, w + 2, hb + 2);
}

// ── The Double-Slit Gate ─────────────────────────────────────────────

/**
 * A length of the gate wall: dressed basalt blocks, a copper coping strip with insulators along
 * it, the Grid's coil painted every so often. `x0..x1` along the base line `y`.
 */
export function slitWall(g: G, x0: number, x1: number, y: number, h = 74): void {
  shadow(g, (x0 + x1) / 2, y + 4, x1 - x0 + 20, 20, 0.35);
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x0, y - h, x1 - x0, h);
  for (let r = 0; r < h / 14; r++) {
    const off = r % 2 ? 18 : 0;
    for (let bx = x0 + off; bx < x1; bx += 36) {
      const bw = Math.min(34, x1 - bx - 1);
      if (bw <= 2) continue;
      const hh = Math.sin(bx * 0.7 + r * 3.3) * 0.5 + 0.5;
      g.fillStyle(hh > 0.5 ? BASALT_LIT : BASALT, 1); g.fillRect(bx + 1, y - h + r * 14 + 1, bw, 12);
      g.fillStyle(0xffffff, 0.04); g.fillRect(bx + 1, y - h + r * 14 + 1, bw, 2);
    }
  }
  // Coping.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x0 - 3, y - h - 8, x1 - x0 + 6, 9);
  g.fillStyle(COPPER, 1); g.fillRect(x0 - 3, y - h - 9, x1 - x0 + 6, 5);
  g.fillStyle(PATINA, 0.5); for (let px = x0; px < x1; px += 23) g.fillRect(px, y - h - 9, 7, 2);
  for (let px = x0 + 30; px < x1 - 10; px += 90) {
    g.fillStyle(GLASS, 0.9); g.fillEllipse(px, y - h - 12, 7, 4); g.fillEllipse(px, y - h - 16, 5, 3);
    gridCoil(g, px + 45, y - h / 2, 6, dim(COPPER, 0.2), 0.7);
  }
}

/**
 * The pier between the two slits: a tall basalt column carrying *the Source* — a great arc lens
 * that shines through both slits at once and throws the fringes on the yard beyond.
 */
export function slitPier(g: G, x: number, y: number, w = 100): void {
  const h = 128;
  shadow(g, x, y + 4, w * 1.3, 24, 0.4);
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(BASALT, 1); g.fillRect(x - w / 2 + 4, y - h + 4, w - 8, h - 8);
  for (let r = 0; r < 8; r++) { g.lineStyle(1, BASALT_LIT, 0.6); g.lineBetween(x - w / 2 + 4, y - h + 16 * r + 4, x + w / 2 - 4, y - h + 16 * r + 4); }
  // Copper bands.
  for (const by of [y - 26, y - h + 30]) { g.fillStyle(COPPER_DARK, 1); g.fillRect(x - w / 2 - 3, by, w + 6, 8); g.fillStyle(COPPER, 1); g.fillRect(x - w / 2 - 3, by, w + 6, 4); }
  // The lens housing on top.
  g.fillStyle(IRON, 1); g.fillRect(x - 24, y - h - 30, 48, 32);
  g.fillStyle(IRON_LIT, 1); g.fillRect(x - 22, y - h - 28, 44, 3);
  glow(g, x, y - h - 14, 40, ARC, 0.07, 5);
  g.fillStyle(lit(GLASS, 0.4), 0.9); g.fillCircle(x, y - h - 14, 13);
  g.lineStyle(2, BRASS, 1); g.strokeCircle(x, y - h - 14, 13);
  g.fillStyle(ARC_HOT, 1); g.fillCircle(x, y - h - 14, 4);
  // Two brass horns either side, aimed at the slits.
  for (const sx of [-1, 1]) {
    g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x + sx * 24, y - h - 22, x + sx * 24, y - h - 6, x + sx * 44, y - h - 14);
    g.fillStyle(BRASS, 1); g.fillTriangle(x + sx * 24, y - h - 20, x + sx * 24, y - h - 9, x + sx * 40, y - h - 14);
  }
  // A plaque: two slits and a wave.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 20, y - 66, 40, 22);
  g.fillStyle(BRASS, 1); g.fillRect(x - 19, y - 65, 38, 20);
  g.fillStyle(STENCIL, 1); g.fillRect(x - 6, y - 62, 3, 14); g.fillRect(x + 3, y - 62, 3, 14);
  g.lineStyle(1, STENCIL, 1); g.beginPath();
  for (let k = 0; k <= 12; k++) { const px = x - 17 + k * 2.8; const py = y - 55 + Math.sin(k * 1.2) * 3; if (k === 0) g.moveTo(px, py); else g.lineTo(px, py); }
  g.strokePath();
}

/**
 * The interference fringes the Source throws through the slits, baked into the ground on the far
 * (north) side: alternating bright and dark bands fanning out from between the slits.
 */
export function fringes(g: G, cx: number, cy: number, slitGap: number, reach: number, n: number): void {
  for (let i = -n; i <= n; i++) {
    const a = -Math.PI / 2 + i * 0.075 * (180 / slitGap);
    const bright = i % 2 === 0;
    const k = 1 - Math.abs(i) / (n + 1);
    const w = 0.028;
    g.fillStyle(bright ? mixC(BOTH_LIT, ARC, 0.4) : BASALT_DARK, bright ? 0.1 * k + 0.02 : 0.12);
    g.fillTriangle(cx, cy, cx + Math.cos(a - w) * reach, cy + Math.sin(a - w) * reach, cx + Math.cos(a + w) * reach, cy + Math.sin(a + w) * reach);
  }
}

// ── The Crown Coil's door ────────────────────────────────────────────

/**
 * The foot of the Crown Coil where it comes down to the court: the black crag split open, the
 * Coil's lowest copper rings sunk into the rock above, a riveted copper door between two Tesla
 * terminals, cables from every pylon in the court converging on a great insulator over the
 * lintel, and the Grid's coil cast into the door. `x, y` is the threshold.
 */
export function coilDoor(g: G, x: number, y: number): void {
  shadow(g, x, y + 6, 340, 40, 0.45);
  // The crag.
  g.fillStyle(BASALT_DARK, 1);
  g.fillPoints([{ x: x - 210, y }, { x: x - 190, y: y - 120 }, { x: x - 150, y: y - 150 }, { x: x - 120, y: y - 230 }, { x: x + 120, y: y - 230 }, { x: x + 150, y: y - 150 }, { x: x + 190, y: y - 120 }, { x: x + 210, y }], true);
  g.fillStyle(BASALT, 1);
  g.fillPoints([{ x: x - 196, y: y - 4 }, { x: x - 178, y: y - 112 }, { x: x - 140, y: y - 142 }, { x: x - 112, y: y - 220 }, { x: x - 40, y: y - 226 }, { x: x - 70, y: y - 4 }], true);
  g.fillStyle(BASALT_LIT, 0.6);
  for (let k = 0; k < 7; k++) g.fillTriangle(x - 180 + k * 52, y - 30 - (k % 3) * 30, x - 166 + k * 52, y - 60 - (k % 2) * 40, x - 150 + k * 52, y - 26);
  // The Coil's lowest rings, sunk into the rock.
  for (let k = 0; k < 4; k++) {
    const ry = y - 150 - k * 22;
    const rw = 250 - k * 26;
    g.lineStyle(10, COPPER_DARK, 1); g.strokeEllipse(x, ry, rw, 26);
    g.lineStyle(6, COPPER, 1); g.strokeEllipse(x, ry - 2, rw, 26);
    g.lineStyle(2, COPPER_LIT, 0.8); g.strokeEllipse(x, ry - 4, rw - 8, 22);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI; g.fillStyle(PATINA, 0.6); g.fillCircle(x + Math.cos(a) * rw * 0.5, ry + Math.sin(a) * 13, 2); }
  }
  // The door frame and door.
  g.fillStyle(COPPER_DARK, 1); g.fillRoundedRect(x - 62, y - 140, 124, 140, { tl: 56, tr: 56, bl: 0, br: 0 });
  g.fillStyle(COPPER, 1); g.fillRoundedRect(x - 54, y - 132, 108, 132, { tl: 50, tr: 50, bl: 0, br: 0 });
  g.fillStyle(dim(COPPER, 0.4), 1); g.fillRoundedRect(x - 46, y - 124, 92, 124, { tl: 44, tr: 44, bl: 0, br: 0 });
  g.lineStyle(2, COPPER_DARK, 1); g.lineBetween(x, y - 124, x, y);
  for (let r = 0; r < 6; r++) for (const sx of [-1, 1]) { g.fillStyle(COPPER_LIT, 0.9); g.fillCircle(x + sx * 40, y - 12 - r * 20, 2); g.fillCircle(x + sx * 8, y - 12 - r * 20, 2); }
  gridCoil(g, x, y - 82, 16, COPPER_LIT);
  // Six sockets over the door — one for each prince's key.
  for (let k = 0; k < 6; k++) {
    const a = Math.PI + (k + 0.5) * (Math.PI / 6);
    const sx = x + Math.cos(a) * 64, sy = y - 128 + Math.sin(a) * 52;
    g.fillStyle(0x0a0a10, 1); g.fillCircle(sx, sy, 6);
    g.lineStyle(2, BRASS, 1); g.strokeCircle(sx, sy, 6);
  }
  // Tesla terminals either side.
  for (const sx of [-1, 1]) {
    const tx = x + sx * 112;
    g.fillStyle(IRON, 1); g.fillRect(tx - 8, y - 96, 16, 96);
    for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? COPPER : COPPER_DARK, 1); g.fillRect(tx - 10, y - 90 + k * 8, 20, 5); }
    g.fillStyle(IRON_LIT, 1); g.fillRect(tx - 3, y - 112, 6, 16);
    g.fillStyle(COPPER_LIT, 1); g.fillCircle(tx, y - 118, 13);
    g.fillStyle(lit(COPPER_LIT, 0.4), 1); g.fillCircle(tx - 4, y - 122, 4);
  }
  // The great insulator over the lintel where every cable in the court comes in.
  g.fillStyle(IRON, 1); g.fillRect(x - 6, y - 210, 12, 70);
  for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? GLASS : lit(GLASS, 0.3), 0.92); g.fillEllipse(x, y - 196 + k * 9, 30 - k * 3, 8); }
  // The threshold: worn copper sill.
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 70, y - 4, 140, 8);
  g.fillStyle(COPPER, 1); g.fillRect(x - 70, y - 4, 140, 3);
}

/** Where the Coil door's two terminals' balls sit (for the arcs between them). */
export const coilTerminals = (x: number, y: number): Pt[] => [{ x: x - 112, y: y - 118 }, { x: x + 112, y: y - 118 }];

// ── Prince Both's house ──────────────────────────────────────────────

/**
 * The House of Both — the Prince's hall, a manor in two states drawn over each other and split
 * down the middle: on the left, a spired Gothic hall in soot brick with lancet windows lit
 * magenta; on the right, a squat copper-domed power house with round cold-lit ports. Each half
 * carries the faint outline of the other. A double stair runs up to one door that is two doors.
 * `x, y` is the middle of the front step.
 */
export function bothHouse(g: G, x: number, y: number): void {
  const w = 420, h = 170;
  const x0 = x - w / 2, top = y - 30 - h;
  shadow(g, x, y + 8, w * 1.2, 40, 0.45);
  // Plinth and the double stair.
  g.fillStyle(BASALT_DARK, 1); g.fillRect(x0 - 14, y - 34, w + 28, 34);
  g.fillStyle(BASALT, 1); g.fillRect(x0 - 12, y - 36, w + 24, 8);
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? SLATE : SLATE_LIT, 1);
    g.fillRect(x - 70 - k * 8, y - 28 + k * 7, 60, 6); g.fillRect(x + 10 + k * 8, y - 28 + k * 7, 60, 6);
  }
  // Left: the Gothic state.
  g.fillStyle(dim(0x3a2430, 0.2), 1); g.fillRect(x0, top, w / 2, h);
  for (let r = 0; r < h / 8; r++) for (let bx = x0 + (r % 2 ? 8 : 0); bx < x; bx += 16) { g.fillStyle(r % 3 ? 0x3e2834 : 0x46303c, 1); g.fillRect(bx + 1, top + r * 8 + 1, 14, 6); }
  for (let k = 0; k < 3; k++) {
    const sx = x0 + 34 + k * 64;
    g.fillStyle(0x2a1a24, 1); g.fillTriangle(sx - 22, top, sx + 22, top, sx, top - 110 - (k === 1 ? 40 : 0));
    g.lineStyle(1.5, STATE_A_DARK, 0.9); g.lineBetween(sx, top - 110 - (k === 1 ? 40 : 0), sx, top - 140 - (k === 1 ? 40 : 0));
    g.fillStyle(STATE_A_LIT, 1); g.fillCircle(sx, top - 142 - (k === 1 ? 40 : 0), 2.5);
    // Lancets.
    for (const fy of [top + 30, top + 96]) {
      g.fillStyle(0x0c0810, 1); g.fillRoundedRect(sx - 9, fy - 2, 18, 46, { tl: 9, tr: 9, bl: 0, br: 0 });
      g.fillStyle(STATE_A, 0.85); g.fillRoundedRect(sx - 7, fy, 14, 42, { tl: 7, tr: 7, bl: 0, br: 0 });
      g.lineStyle(1, 0x1a0e16, 1); g.lineBetween(sx, fy, sx, fy + 42); g.lineBetween(sx - 7, fy + 20, sx + 7, fy + 20);
      glow(g, sx, fy + 20, 26, STATE_A, 0.04, 2);
    }
  }
  // Right: the power-house state.
  g.fillStyle(0x2a3440, 1); g.fillRect(x, top + 30, w / 2, h - 30);
  for (let k = 0; k < 6; k++) { g.lineStyle(1, 0x3a4652, 1); g.lineBetween(x, top + 50 + k * 22, x + w / 2, top + 50 + k * 22); }
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x + w / 4, top + 32, w / 2 - 10, 140);
  g.fillStyle(COPPER, 1); g.fillEllipse(x + w / 4, top + 30, w / 2 - 20, 132);
  g.fillStyle(0x2a3440, 1); g.fillRect(x + 6, top + 30, w / 2 - 12, 70);
  for (let k = 0; k < 7; k++) { g.lineStyle(1.5, COPPER_DARK, 0.8); g.beginPath(); g.arc(x + w / 4, top + 30, 20 + k * 14, Math.PI, 0, false); g.strokePath(); }
  g.fillStyle(PATINA, 0.4); g.fillEllipse(x + w / 4 - 30, top - 14, 30, 10);
  g.lineStyle(2, COPPER_LIT, 1); g.lineBetween(x + w / 4, top - 36, x + w / 4, top - 66);
  g.fillStyle(STATE_B_LIT, 1); g.fillCircle(x + w / 4, top - 68, 3);
  for (let k = 0; k < 3; k++) for (const fy of [top + 62, top + 118]) {
    const px = x + 40 + k * 64;
    g.fillStyle(0x080c10, 1); g.fillCircle(px, fy, 14);
    g.fillStyle(STATE_B, 0.85); g.fillCircle(px, fy, 11);
    g.lineStyle(2, COPPER, 1); g.strokeCircle(px, fy, 13);
    g.lineStyle(1, 0x08303a, 1); g.lineBetween(px - 11, fy, px + 11, fy);
    glow(g, px, fy, 24, STATE_B, 0.04, 2);
  }
  // Each half wears the faint outline of the other.
  g.lineStyle(1.5, STATE_B, 0.28); g.strokeEllipse(x - w / 4, top + 30, w / 2 - 20, 132);
  for (let k = 0; k < 3; k++) g.strokeCircle(x0 + 34 + k * 64, top + 62, 11);
  g.lineStyle(1.5, STATE_A, 0.28);
  for (let k = 0; k < 3; k++) { const sx = x + 40 + k * 64; g.lineBetween(sx - 22, top, sx, top - 110); g.lineBetween(sx, top - 110, sx + 22, top); }
  // The seam down the middle: a crack of violet light.
  glow(g, x, top + h / 2, 40, BOTH, 0.05, 3);
  g.lineStyle(3, BOTH, 0.85); g.lineBetween(x, top - 20, x, y - 34);
  g.lineStyle(1, BOTH_LIT, 1); g.lineBetween(x, top - 20, x, y - 34);
  // The one door that is two doors.
  g.fillStyle(0x0a0810, 1); g.fillRoundedRect(x - 30, y - 104, 60, 70, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.fillStyle(STATE_A_DARK, 1); g.fillRoundedRect(x - 26, y - 100, 26, 66, { tl: 26, tr: 0, bl: 0, br: 0 });
  g.fillStyle(STATE_B_DARK, 1); g.fillRoundedRect(x, y - 100, 26, 66, { tl: 0, tr: 26, bl: 0, br: 0 });
  g.fillStyle(BRASS, 1); g.fillCircle(x - 6, y - 64, 2.5); g.fillCircle(x + 6, y - 64, 2.5);
  // Over it: a crown in two places — on a cushion, and hanging over the cushion.
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 116, 30, 8);
  crownGlyph(g, x, y - 120, 9, BRASS, 1);
  crownGlyph(g, x, y - 140, 9, BOTH_LIT, 0.45);
}

/** A small crown shape (Prince Both's mark is a crown drawn twice). */
export function crownGlyph(g: G, x: number, y: number, r: number, color: number, a: number): void {
  g.fillStyle(color, a);
  g.fillPoints([
    { x: x - r, y }, { x: x - r, y: y - r * 0.8 }, { x: x - r * 0.5, y: y - r * 0.35 }, { x, y: y - r }, { x: x + r * 0.5, y: y - r * 0.35 },
    { x: x + r, y: y - r * 0.8 }, { x: x + r, y },
  ], true);
}

// ── The Observatory of Looks ─────────────────────────────────────────

/**
 * Watcher Heisen's tower on the Watched Street: a slim basalt tower with an iron gallery and a
 * great brass-ringed lens at the top like an eye, under a lid. The court's houses only hold one
 * state while the tower looks at them. `x, y` is the tower's foot.
 */
export function observatory(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 110, 26, 0.4);
  g.fillStyle(BASALT_DARK, 1); g.fillPoints([{ x: x - 34, y }, { x: x - 24, y: y - 200 }, { x: x + 24, y: y - 200 }, { x: x + 34, y }], true);
  g.fillStyle(BASALT, 1); g.fillPoints([{ x: x - 30, y: y - 2 }, { x: x - 21, y: y - 198 }, { x: x - 2, y: y - 198 }, { x: x - 6, y: y - 2 }], true);
  for (let k = 0; k < 9; k++) { g.lineStyle(1, BASALT_LIT, 0.5); g.lineBetween(x - 32 + k, y - 22 * k - 8, x + 32 - k, y - 22 * k - 8); }
  // Door and slit windows.
  g.fillStyle(0x0a0a10, 1); g.fillRoundedRect(x - 10, y - 34, 20, 34, { tl: 10, tr: 10, bl: 0, br: 0 });
  for (const wy of [y - 80, y - 130]) { g.fillStyle(ARC, 0.8); g.fillRect(x - 2, wy, 4, 18); }
  // The gallery.
  g.fillStyle(IRON, 1); g.fillRect(x - 42, y - 206, 84, 6);
  for (let k = 0; k <= 8; k++) { g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x - 40 + k * 10, y - 206, x - 40 + k * 10, y - 220); }
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 42, y - 220, x + 42, y - 220);
  // The eye-lens.
  g.fillStyle(IRON, 1); g.fillCircle(x, y - 246, 30);
  g.fillStyle(0xf0f0ff, 1); g.fillEllipse(x, y - 246, 50, 30);
  g.fillStyle(BOTH_DARK, 1); g.fillCircle(x, y - 246, 13);
  g.fillStyle(BOTH, 1); g.fillCircle(x, y - 246, 10);
  g.fillStyle(0x050508, 1); g.fillCircle(x, y - 246, 5);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 4, y - 250, 2.5);
  g.lineStyle(3, BRASS, 1); g.strokeCircle(x, y - 246, 30);
  // The lid, half shut.
  g.fillStyle(IRON, 1); g.fillPoints([{ x: x - 32, y: y - 252 }, { x: x - 26, y: y - 274 }, { x: x + 26, y: y - 274 }, { x: x + 32, y: y - 252 }], true);
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x - 32, y - 252, x + 32, y - 252);
  for (let k = -3; k <= 3; k++) { g.lineStyle(1.5, IRON, 1); g.lineBetween(x + k * 9, y - 252, x + k * 10, y - 258); }
  g.lineStyle(2, COPPER, 1); g.lineBetween(x, y - 274, x, y - 300);
}

/** The eye at the top of the tower (for the gaze sweep in `animate`). */
export const observatoryEye = (x: number, y: number): Pt => ({ x, y: y - 246 });

// ── The coin fountain ────────────────────────────────────────────────

/**
 * The fountain in Either Square: a basalt basin whose spout is a great copper coin, forever
 * spinning on its edge — heads and tails at once. The coin itself is animated (`spinningCoin`);
 * this draws the basin, the stem and the still water. `x, y` is the basin's front.
 */
export function coinFountain(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 230, 50, 0.35);
  g.fillStyle(BASALT_DARK, 1); g.fillEllipse(x, y - 30, 220, 80);
  g.fillStyle(BASALT_LIT, 1); g.fillEllipse(x, y - 34, 214, 74);
  g.fillStyle(WELL, 1); g.fillEllipse(x, y - 34, 192, 60);
  g.fillStyle(WELL_LIT, 0.25); g.fillEllipse(x - 20, y - 40, 90, 20);
  // Coins in the water, every one landed on its edge.
  for (let k = 0; k < 14; k++) {
    const a = k * 2.3, d = 30 + ((k * 37) % 50);
    g.fillStyle(k % 2 ? BRASS : COPPER, 0.7); g.fillRect(x + Math.cos(a) * d - 1, y - 34 + Math.sin(a) * d * 0.28 - 3, 2, 5);
  }
  g.fillStyle(BASALT, 1); g.fillRect(x - 12, y - 96, 24, 62);
  g.fillStyle(BASALT_LIT, 1); g.fillRect(x - 12, y - 96, 6, 62);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 18, y - 100, 36, 8);
  g.fillStyle(COPPER, 1); g.fillRect(x - 18, y - 100, 36, 4);
}

/** The coin on the fountain, spinning (t in seconds). */
export function spinningCoin(g: G, x: number, y: number, t: number): void {
  const k = Math.cos(t * 5);
  const w = Math.abs(k) * 38 + 3;
  const heads = k > 0;
  const cy = y - 136;
  glow(g, x, cy, 46, heads ? STATE_A : STATE_B, 0.05, 3);
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x, cy + 2, w, 42);
  g.fillStyle(heads ? COPPER_LIT : COPPER, 1); g.fillEllipse(x, cy, w, 40);
  if (w > 18) {
    if (heads) crownGlyph(g, x, cy + 6, w * 0.22, COPPER_DARK, 0.8);
    else gridCoil(g, x, cy, w * 0.14, COPPER_DARK, 0.8);
  }
  g.lineStyle(1, heads ? STATE_A_LIT : STATE_B_LIT, 0.8); g.strokeEllipse(x, cy, w, 40);
  // Spray off the spinning edge.
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.3 + i / 6) % 1;
    g.fillStyle(lit(WELL_LIT, 0.4), 0.5 * (1 - ph)); g.fillCircle(x + (i - 2.5) * 12 * ph, cy + 20 + ph * ph * 60, 1.8);
  }
}

// ── The quantum well ─────────────────────────────────────────────────

/**
 * The court's fishing water: a broad well in a ring of basalt kerbs with copper tie-irons, violet
 * water lit from below, and two brass dipping-posts on the rim that are the sources of the two
 * ripple patterns on its surface. The surface is animated (`wellSurface`).
 */
export function wellRim(g: G, r: Rect): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.fillStyle(BASALT_DARK, 1); g.fillEllipse(cx, cy + 6, r.w + 44, r.h + 40);
  g.fillStyle(BASALT_LIT, 1); g.fillEllipse(cx, cy, r.w + 36, r.h + 30);
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    g.lineStyle(1.5, BASALT_DARK, 0.9);
    g.lineBetween(cx + Math.cos(a) * (r.w / 2 + 2), cy + Math.sin(a) * (r.h / 2 + 2), cx + Math.cos(a) * (r.w / 2 + 18), cy + Math.sin(a) * (r.h / 2 + 15));
    if (k % 4 === 0) { g.fillStyle(COPPER, 1); g.fillRect(cx + Math.cos(a) * (r.w / 2 + 10) - 3, cy + Math.sin(a) * (r.h / 2 + 8) - 1.5, 6, 3); }
  }
  g.fillStyle(WELL_DEEP, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(WELL, 1); g.fillEllipse(cx, cy - 4, r.w - 16, r.h - 16);
  glow(g, cx, cy, Math.min(r.w, r.h) * 0.4, WELL_LIT, 0.05, 4);
}

/** The two dipping-post sources on the well's rim. */
export const wellSources = (r: Rect): Pt[] => [{ x: r.x + r.w * 0.28, y: r.y + 6 }, { x: r.x + r.w * 0.72, y: r.y + 6 }];

/** The well's surface: two sets of rings that cross and interfere (t in seconds). */
export function wellSurface(g: G, r: Rect, t: number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const rx = r.w / 2 - 10, ry = r.h / 2 - 10;
  for (const [i, s] of wellSources(r).entries()) {
    for (let k = 0; k < 5; k++) {
      const ph = (t * 0.4 + k / 5) % 1;
      const rad = ph * r.w * 0.8;
      g.lineStyle(1.4, i ? STATE_B_LIT : STATE_A_LIT, 0.28 * (1 - ph));
      g.beginPath();
      let started = false;
      for (let a = 0; a <= Math.PI; a += 0.12) {
        const px = s.x + Math.cos(a) * rad, py = s.y + Math.sin(a) * rad * 0.55;
        if (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 > 1) { started = false; continue; }
        if (!started) { g.moveTo(px, py); started = true; } else g.lineTo(px, py);
      }
      g.strokePath();
    }
    // The post.
    g.fillStyle(BRASS_DARK, 1); g.fillRect(s.x - 3, s.y - 26, 6, 28);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(s.x, s.y - 28, 4);
  }
  // Where the crests cross: bright standing nodes.
  for (let k = 0; k < 7; k++) {
    const nx = cx + (k - 3) * rx * 0.26, ny = cy + Math.sin(t * 2 + k) * ry * 0.3;
    g.fillStyle(BOTH_LIT, 0.25 + 0.2 * Math.sin(t * 3 + k * 1.7)); g.fillCircle(nx, ny, 2.5);
  }
}

// ── The Twin Squares ─────────────────────────────────────────────────

/**
 * One of the Twin Squares: a round paved square laid in an exact pattern (the other square is laid
 * the same, stone for stone), a bell-post at its heart with a copper bell. `x, y` is the centre.
 */
export function twinSquare(g: G, x: number, y: number, r: number, tint: number): void {
  g.fillStyle(GROUT, 1); g.fillEllipse(x, y, r * 2 + 12, r * 1.3 + 10);
  g.fillStyle(SLATE, 1); g.fillEllipse(x, y, r * 2, r * 1.3);
  for (let ring = 1; ring < 5; ring++) { g.lineStyle(1.5, GROUT, 0.9); g.strokeEllipse(x, y, (r * 2 * ring) / 5, (r * 1.3 * ring) / 5); }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    g.lineStyle(1.5, GROUT, 0.9); g.lineBetween(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.13, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.65);
  }
  // Inlaid tint ring: each square's own state.
  g.lineStyle(3, tint, 0.5); g.strokeEllipse(x, y, r * 1.6, r * 1.04);
  g.fillStyle(SLATE_LIT, 0.3); g.fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.8, r * 0.3);
}

/** The bell-post at a Twin Square's heart. */
export function bellPost(g: G, x: number, y: number, tint: number): void {
  shadow(g, x, y + 2, 34, 10);
  g.fillStyle(IRON, 1); g.fillRect(x - 3, y - 84, 6, 84);
  g.fillStyle(IRON, 1); g.fillRect(x - 18, y - 88, 36, 5);
  g.fillStyle(COPPER_DARK, 1); g.fillPoints([{ x: x - 11, y: y - 58 }, { x: x - 7, y: y - 80 }, { x: x + 7, y: y - 80 }, { x: x + 11, y: y - 58 }], true);
  g.fillStyle(COPPER, 1); g.fillPoints([{ x: x - 9, y: y - 60 }, { x: x - 6, y: y - 79 }, { x: x + 2, y: y - 79 }, { x: x - 1, y: y - 60 }], true);
  g.fillStyle(tint, 1); g.fillCircle(x, y - 56, 3);
  g.lineStyle(1.5, tint, 0.6); g.lineBetween(x - 18, y - 86, x - 18, y - 76); g.lineBetween(x + 18, y - 86, x + 18, y - 76);
}

// ── Wick's flicker fences ────────────────────────────────────────────

/**
 * A flicker-fence panel in Wick's yard: two iron posts with a sheet of crawling light between them
 * that is now there, now not. The posts are baked; the sheet is animated (`fenceSheet`).
 */
export function fencePosts(g: G, x: number, y: number, w: number): void {
  for (const px of [x - w / 2, x + w / 2]) {
    shadow(g, px, y + 2, 18, 6);
    g.fillStyle(IRON, 1); g.fillRect(px - 4, y - 66, 8, 66);
    g.fillStyle(IRON_LIT, 1); g.fillRect(px - 4, y - 66, 2, 66);
    for (let k = 0; k < 3; k++) { g.fillStyle(GLASS, 0.85); g.fillEllipse(px, y - 58 + k * 18, 12, 4); }
    g.fillStyle(COPPER, 1); g.fillCircle(px, y - 70, 4);
  }
  g.fillStyle(SLATE_DARK, 1); g.fillRect(x - w / 2, y - 3, w, 4);
}

/** A fence's sheet of light: `k` 0 (gone) .. 1 (solid). */
export function fenceSheet(g: G, x: number, y: number, w: number, k: number, t: number): void {
  if (k <= 0.02) return;
  const x0 = x - w / 2 + 4, x1 = x + w / 2 - 4;
  g.fillStyle(mixC(BOTH, STATE_B, 0.3), 0.22 * k); g.fillRect(x0, y - 62, x1 - x0, 58);
  for (let i = 0; i < 6; i++) {
    const ly = y - 58 + i * 10 + Math.sin(t * 6 + i) * 2;
    g.lineStyle(1, BOTH_LIT, 0.5 * k); g.lineBetween(x0, ly, x1, ly + Math.sin(t * 4 + i * 2) * 3);
  }
  if (k > 0.6) crackle(g, { x: x0, y: y - 60 + ((t * 40) % 50) }, { x: x1, y: y - 50 + ((t * 31) % 40) }, t, x, BOLT, 1.2, 0.7 * k, 5);
}

// ── Waystone and shop ────────────────────────────────────────────────

/**
 * The court's waystone: a basalt menhir wound with a copper coil, its rune a pair of overlapping
 * rings (one magenta, one cyan), a brass contact plate at hand height.
 */
export function waystoneStone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 54, 14);
  g.fillStyle(BASALT_DARK, 1); g.fillPoints([{ x: x - 20, y }, { x: x - 16, y: y - 74 }, { x: x - 4, y: y - 92 }, { x: x + 12, y: y - 80 }, { x: x + 20, y }], true);
  g.fillStyle(BASALT_LIT, 1); g.fillPoints([{ x: x - 16, y: y - 2 }, { x: x - 13, y: y - 72 }, { x: x - 4, y: y - 86 }, { x: x - 2, y: y - 2 }], true);
  for (let k = 0; k < 6; k++) { g.lineStyle(2, COPPER, 1); g.strokeEllipse(x, y - 18 - k * 6, 40 - k, 8); }
  g.lineStyle(2, STATE_A, 0.9); g.strokeCircle(x - 4, y - 58, 8);
  g.lineStyle(2, STATE_B, 0.9); g.strokeCircle(x + 4, y - 58, 8);
  g.fillStyle(BRASS, 1); g.fillRect(x - 6, y - 40, 12, 6);
}

/**
 * Eigen's kiosk — *Eigenstates & Sundries*: a narrow copper-roofed booth fronted by a wall of
 * little drawers, half of them open and half shut (and the open ones also shut), a counter with a
 * brass scale whose pans are both down, an arc lamp on a hook, and a hand-painted sign board with
 * two overlapping rings.
 */
export function eigenKiosk(g: G, x: number, y: number): void {
  const w = 150, h = 110;
  const x0 = x - w / 2;
  shadow(g, x, y + 4, w * 1.2, 26);
  g.fillStyle(0x2a2030, 1); g.fillRect(x0, y - h, w, h);
  // The drawers.
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
    const dx = x0 + 8 + c * 19.5, dy = y - h + 8 + r * 15;
    const open = (r * 7 + c) % 3 === 0;
    g.fillStyle(DEAL_DARK, 1); g.fillRect(dx, dy, 17, 13);
    g.fillStyle(open ? DEAL_LIT : DEAL, 1); g.fillRect(dx + 1, dy + 1, 15, 11);
    if (open) { g.fillStyle(0x100c08, 1); g.fillRect(dx + 1, dy + 1, 15, 4); g.lineStyle(1, STATE_B, 0.5); g.strokeRect(dx + 1, dy + 1, 15, 11); }
    g.fillStyle(BRASS, 1); g.fillCircle(dx + 8.5, dy + 7, 1.3);
  }
  // Counter and scale.
  g.fillStyle(DEAL_DARK, 1); g.fillRect(x0 - 6, y - 30, w + 12, 30);
  g.fillStyle(DEAL, 1); g.fillRect(x0 - 6, y - 32, w + 12, 6);
  g.lineStyle(2, BRASS, 1); g.lineBetween(x + 40, y - 32, x + 40, y - 52); g.lineBetween(x + 26, y - 50, x + 54, y - 50);
  for (const sx of [26, 54]) { g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x + sx, y - 38, 14, 4); g.lineStyle(1, BRASS, 1); g.lineBetween(x + sx, y - 50, x + sx, y - 38); }
  // Roof.
  g.fillStyle(COPPER_DARK, 1); g.fillPoints([{ x: x0 - 14, y: y - h }, { x: x0 + w + 14, y: y - h }, { x: x0 + w, y: y - h - 26 }, { x: x0, y: y - h - 26 }], true);
  g.fillStyle(COPPER, 1); g.fillPoints([{ x: x0 - 10, y: y - h - 2 }, { x: x0 + w + 10, y: y - h - 2 }, { x: x0 + w - 2, y: y - h - 22 }, { x: x0 + 2, y: y - h - 22 }], true);
  for (let k = 0; k < 8; k++) { g.lineStyle(1, COPPER_DARK, 0.8); g.lineBetween(x0 + k * 20, y - h - 2, x0 + 4 + k * 20, y - h - 22); }
  // Sign board.
  g.fillStyle(0x1a1420, 1); g.fillRect(x - 52, y - h - 56, 104, 30);
  g.lineStyle(2, BRASS, 1); g.strokeRect(x - 52, y - h - 56, 104, 30);
  g.lineStyle(2.5, STATE_A, 1); g.strokeCircle(x - 7, y - h - 41, 10);
  g.lineStyle(2.5, STATE_B, 1); g.strokeCircle(x + 7, y - h - 41, 10);
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x - 40, y - h - 26, x - 40, y - h - 20); g.lineBetween(x + 40, y - h - 26, x + 40, y - h - 20);
  // A lamp on a hook.
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x0 + w + 6, y - h + 4, x0 + w + 6, y - h + 20);
  glow(g, x0 + w + 6, y - h + 26, 22, ARC, 0.07, 3);
  g.fillStyle(lit(GLASS, 0.3), 0.9); g.fillCircle(x0 + w + 6, y - h + 26, 6);
  g.fillStyle(ARC_HOT, 1); g.fillCircle(x0 + w + 6, y - h + 26, 2);
}

// ── Black crag, the court's walls ────────────────────────────────────

/**
 * A run of black crag along the edge of the court: jagged basalt columns in three-quarter view,
 * wet highlights catching the storm, a lightning rod on the tallest. `x0..x1` along the base `y`.
 */
export function cragRun(g: G, x0: number, x1: number, y: number, hMax: number, seed: number): void {
  let k = 0;
  for (let x = x0; x < x1; x += 26) {
    const h = hMax * (0.55 + 0.45 * (Math.sin((seed + k) * 1.7) * 0.5 + 0.5));
    const w = 30;
    g.fillStyle(BASALT_DARK, 1); g.fillPoints([{ x, y }, { x: x + 2, y: y - h }, { x: x + w * 0.5, y: y - h - 10 }, { x: x + w - 2, y: y - h }, { x: x + w, y }], true);
    g.fillStyle(BASALT, 1); g.fillPoints([{ x: x + 2, y: y - 2 }, { x: x + 4, y: y - h + 2 }, { x: x + w * 0.5, y: y - h - 8 }, { x: x + w * 0.5, y: y - 2 }], true);
    g.lineStyle(1, BASALT_LIT, 0.7); g.lineBetween(x + 4, y - h + 2, x + w * 0.5, y - h - 8);
    if (k % 7 === 3) { g.lineStyle(2, COPPER, 1); g.lineBetween(x + w * 0.5, y - h - 10, x + w * 0.5, y - h - 36); g.fillStyle(COPPER_LIT, 1); g.fillCircle(x + w * 0.5, y - h - 37, 2); }
    k++;
  }
}

/** A rain-dark puddle on the slates with a reflected glint. */
export function puddle(g: G, x: number, y: number, w: number, tint: number): void {
  g.fillStyle(SLATE_DARK, 0.9); g.fillEllipse(x, y, w, w * 0.32);
  g.fillStyle(tint, 0.14); g.fillEllipse(x - w * 0.1, y - 1, w * 0.6, w * 0.14);
}

/** A notice board in two columns — the Draw, chalked once for each state of every house. */
export function readingBoard(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 14);
  g.fillStyle(IRON, 1); g.fillRect(x - 40, y - 70, 4, 70); g.fillRect(x + 36, y - 70, 4, 70);
  g.fillStyle(0x15141c, 1); g.fillRect(x - 44, y - 92, 88, 58);
  g.lineStyle(2, DEAL_DARK, 1); g.strokeRect(x - 44, y - 92, 88, 58);
  g.lineStyle(1, 0xe8e8f0, 0.6); g.lineBetween(x, y - 88, x, y - 38);
  for (let r = 0; r < 6; r++) {
    g.lineStyle(1, STATE_A_LIT, 0.55); g.lineBetween(x - 38, y - 82 + r * 8, x - 12 - (r % 3) * 6, y - 82 + r * 8);
    g.lineStyle(1, STATE_B_LIT, 0.55); g.lineBetween(x + 6, y - 82 + r * 8, x + 34 - (r % 2) * 8, y - 82 + r * 8);
  }
  gridCoil(g, x, y - 100, 5, COPPER);
}

/** A treadle dynamo in a yard — a household's Draw machine, crank and flywheel. */
export function crankDynamo(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 14);
  g.fillStyle(IRON, 1); g.fillRect(x - 24, y - 12, 48, 12);
  g.lineStyle(4, IRON, 1); g.strokeCircle(x - 6, y - 30, 18);
  g.lineStyle(1.5, IRON_LIT, 1); for (let k = 0; k < 5; k++) { const a = k * 1.256; g.lineBetween(x - 6, y - 30, x - 6 + Math.cos(a) * 17, y - 30 + Math.sin(a) * 17); }
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x + 6, y - 34, 18, 22);
  for (let k = 0; k < 4; k++) { g.fillStyle(COPPER, 1); g.fillRect(x + 6, y - 32 + k * 5, 18, 3); }
  g.lineStyle(3, DEAL_DARK, 1); g.lineBetween(x - 6, y - 30, x - 22, y - 44);
  g.fillStyle(DEAL, 1); g.fillCircle(x - 22, y - 44, 3);
}

