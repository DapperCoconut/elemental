import type Phaser from 'phaser';
import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BAND_COLORS, BOLT, BRASS, BRASS_DARK, BRASS_LIT, BYTE, BYTE_LIT, CAN, CAN_DARK, CAN_LIT, CARD, CARD_DARK, CERAMIC,
  CERAMIC_DARK, COPPER, COPPER_DARK, COPPER_LIT, DIODE, EPOXY, EPOXY_LIT, FAULT, FILAMENT, FILAMENT_LIT, GASGLOW, GOLD,
  GOLD_DARK, GOLD_LIT, IRON, IRON_DARK, MASK, MASK_DARK, MASK_DEEP, MASK_LIT, NIXIE, OIL, OIL_RIM, OIL_SHEEN, PULSE,
  SILK, SOLDER, SOLDER_DARK, SOLDER_LIT, VALVE_GLASS,
} from './palette';

/**
 * The Circuit Court's painters. Everything in the court is a component blown up to the size of a
 * building, so every set piece here is drawn twice over: once as the part (the bands of a
 * resistor, the score on a capacitor's lid, the legs of a chip) and once as the place people live
 * in (windows between the bands, a door in the can, a meter by every step). Pieces take `x,y` as
 * their base/feet point and draw upward.
 */

// ── Lettering: seven-segment digits ──────────────────────────────────

/** Which of the seven segments (a b c d e f g) each glyph lights. */
const SEGS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc',
  '8': 'abcdefg', '9': 'abcdfg', A: 'abcefg', B: 'cdefg', C: 'adef', D: 'bcdeg', E: 'adefg', F: 'aefg',
  '-': 'g', '_': 'd', H: 'bcefg', L: 'def', P: 'abefg', R: 'eg', O: 'abcdef', U: 'bcdef', N: 'ceg', T: 'defg', Y: 'bcdfg',
};

/**
 * A string in seven-segment digits — the Tabulator's handwriting. `x,y` is the top-left; `s` is the
 * digit height. Unknown characters leave a gap.
 */
export function segText(g: G, x: number, y: number, text: string, s: number, color: number, a = 1): void {
  const w = s * 0.5, th = Math.max(1, s * 0.12);
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const on = SEGS[ch];
    if (on) {
      g.fillStyle(color, a);
      const h2 = s / 2;
      if (on.includes('a')) g.fillRect(cx + th, y, w - th * 2, th);
      if (on.includes('b')) g.fillRect(cx + w - th, y + th, th, h2 - th);
      if (on.includes('c')) g.fillRect(cx + w - th, y + h2, th, h2 - th);
      if (on.includes('d')) g.fillRect(cx + th, y + s - th, w - th * 2, th);
      if (on.includes('e')) g.fillRect(cx, y + h2, th, h2 - th);
      if (on.includes('f')) g.fillRect(cx, y + th, th, h2 - th);
      if (on.includes('g')) g.fillRect(cx + th, y + h2 - th / 2, w - th * 2, th);
    }
    cx += w + s * 0.18;
  }
}

/** Width a `segText` string takes. */
export const segWidth = (text: string, s: number): number => text.length * (s * 0.68) - s * 0.18;

// ── The board itself ─────────────────────────────────────────────────

/** A via: a plated hole through the board — a tinned ring round a black hole. */
export function via(g: G, x: number, y: number, r = 5): void {
  g.fillStyle(SOLDER_DARK, 1); g.fillCircle(x, y + 0.6, r + 0.6);
  g.fillStyle(SOLDER, 1); g.fillCircle(x, y, r);
  g.fillStyle(SOLDER_LIT, 0.6); g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.4);
  g.fillStyle(MASK_DEEP, 1); g.fillCircle(x, y, r * 0.45);
}

/** A tinned solder pad (where a lead goes down into the board). */
export function pad(g: G, x: number, y: number, w: number, h: number): void {
  g.fillStyle(SOLDER_DARK, 1); g.fillRoundedRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, 3);
  g.fillStyle(SOLDER, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
  g.fillStyle(SOLDER_LIT, 0.5); g.fillRect(x - w / 2 + 2, y - h / 2 + 1, w - 4, 2);
  // The solder fillet: a dull blob where the lead went in.
  g.fillStyle(lit(SOLDER, 0.2), 1); g.fillEllipse(x, y, w * 0.45, h * 0.5);
}

/**
 * A street: a bare copper trace, right-angled with chamfered bends like a real board. Edge in
 * dark oxide, a lit crown down the middle, worn patches where the cranking crowds walk, and a via
 * now and then where the street drops to the other side of the town.
 */
export function traceStreet(g: G, pts: Pt[], w: number, rng: () => number): void {
  const line = (width: number, color: number, a: number) => {
    g.lineStyle(width, color, a);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    for (const p of pts) { g.fillStyle(color, a); g.fillCircle(p.x, p.y, width / 2); }
  };
  line(w + 8, MASK_DARK, 0.9);
  line(w + 2, COPPER_DARK, 1);
  line(w - 2, COPPER, 1);
  line(w * 0.35, mixC(COPPER, COPPER_LIT, 0.4), 0.55);
  // Weathering: green verdigris blooms and bright worn scuffs.
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 20; d < len; d += 28 + rng() * 30) {
      const t = d / len, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const ox = (rng() - 0.5) * (w - 10), oy = (rng() - 0.5) * (w - 10);
      if (rng() < 0.3) { g.fillStyle(0x3a8a6a, 0.35); g.fillEllipse(x + ox, y + oy, 10 + rng() * 14, 5 + rng() * 5); }
      else { g.fillStyle(COPPER_LIT, 0.25); g.fillRect(x + ox, y + oy, 6 + rng() * 8, 2); }
    }
    for (let d = 140; d < len - 60; d += 260 + rng() * 120) {
      const t = d / len;
      via(g, a.x + (b.x - a.x) * t + (rng() - 0.5) * w * 0.4, a.y + (b.y - a.y) * t + (rng() - 0.5) * w * 0.4, 6);
    }
  }
}

/** The data bus: several thin parallel traces running together, the court's high street. */
export function busStreet(g: G, x0: number, x1: number, y: number, lanes: number, gap: number, rng: () => number): void {
  const h = lanes * gap;
  g.fillStyle(MASK_DARK, 0.85); g.fillRect(x0, y - h / 2 - 8, x1 - x0, h + 16);
  for (let i = 0; i < lanes; i++) {
    const ly = y - h / 2 + gap / 2 + i * gap;
    g.fillStyle(COPPER_DARK, 1); g.fillRect(x0, ly - gap * 0.36, x1 - x0, gap * 0.72);
    g.fillStyle(COPPER, 1); g.fillRect(x0, ly - gap * 0.3, x1 - x0, gap * 0.6);
    g.fillStyle(COPPER_LIT, 0.35); g.fillRect(x0, ly - gap * 0.3, x1 - x0, 2);
  }
  for (let x = x0 + 30; x < x1; x += 40 + rng() * 60) {
    const ly = y - h / 2 + gap / 2 + Math.floor(rng() * lanes) * gap;
    g.fillStyle(COPPER_LIT, 0.3); g.fillRect(x, ly - 2, 10 + rng() * 14, 3);
  }
}

/** Silkscreen printing on the board: a component outline with its number, as by every door. */
export function silkMark(g: G, x: number, y: number, label: string, s = 10, a = 0.55): void {
  const w = segWidth(label, s);
  g.lineStyle(1.2, SILK, a * 0.8);
  g.strokeRect(x - w / 2 - 5, y - 4, w + 10, s + 8);
  segText(g, x - w / 2, y, label, s, SILK, a);
}

/** The Draw's arrow, printed on the board along every street: current flows *up* to the Crown. */
export function silkArrow(g: G, x: number, y: number, a: number, s = 14, alpha = 0.4): void {
  const cx = Math.cos(a), sy = Math.sin(a);
  g.lineStyle(2, SILK, alpha);
  g.lineBetween(x - cx * s, y - sy * s, x + cx * s, y + sy * s);
  g.fillStyle(SILK, alpha);
  g.fillTriangle(x + cx * (s + 6), y + sy * (s + 6), x + cx * s - sy * 5, y + sy * s + cx * 5, x + cx * s + sy * 5, y + sy * s - cx * 5);
}

// ── Little things ────────────────────────────────────────────────────

/** A valve (vacuum tube): glass envelope, a hot filament and its grid, on a black bakelite base. */
export function valve(g: G, x: number, y: number, s: number, heat = 1, gas = false): void {
  const h = 26 * s, r = 6 * s;
  g.fillStyle(0x221a14, 1); g.fillRoundedRect(x - r - 1, y - 6 * s, r * 2 + 2, 6 * s, 2);
  for (let k = -1; k <= 1; k++) { g.fillStyle(SOLDER, 1); g.fillRect(x + k * r * 0.55 - 0.6, y - 1, 1.2, 3 * s); }
  // Glow inside.
  const c = gas ? GASGLOW : FILAMENT;
  if (heat > 0) { g.fillStyle(c, 0.12 * heat); g.fillCircle(x, y - h * 0.55, r * 2.4); }
  g.fillStyle(VALVE_GLASS, 0.18); g.fillRoundedRect(x - r, y - h, r * 2, h - 6 * s, { tl: r, tr: r, bl: 1, br: 1 });
  g.lineStyle(1, lit(VALVE_GLASS, 0.3), 0.7); g.strokeRoundedRect(x - r, y - h, r * 2, h - 6 * s, { tl: r, tr: r, bl: 1, br: 1 });
  // The plate and grid.
  g.fillStyle(0x4a4a50, 0.9); g.fillRect(x - r * 0.55, y - h * 0.78, r * 1.1, h * 0.46);
  g.lineStyle(0.8, 0x8a8a90, 0.8);
  for (let k = 0; k < 4; k++) g.lineBetween(x - r * 0.55, y - h * 0.74 + k * h * 0.11, x + r * 0.55, y - h * 0.74 + k * h * 0.11);
  if (heat > 0) {
    g.fillStyle(gas ? lit(GASGLOW, 0.4) : FILAMENT_LIT, 0.85 * heat); g.fillRect(x - 0.8 * s, y - h * 0.72, 1.6 * s, h * 0.36);
  }
  // The getter flash at the crown — a silver mirror patch.
  g.fillStyle(SOLDER_LIT, 0.55); g.fillEllipse(x, y - h + r * 0.6, r * 1.3, r * 0.6);
  g.fillStyle(0xffffff, 0.5); g.fillRect(x - r * 0.65, y - h * 0.8, 1.2, h * 0.5);
}

/** A diode lamp: the Grid's metered street-light, a glass bead on two bent legs. */
export function diodeLamp(g: G, x: number, y: number, color = DIODE, on = 1): void {
  shadow(g, x, y + 1, 18, 6);
  g.fillStyle(SOLDER_DARK, 1); g.fillRect(x - 6, y - 40, 2, 40); g.fillRect(x + 4, y - 36, 2, 36);
  g.fillStyle(SOLDER, 1); g.fillRect(x - 6, y - 40, 1, 40);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 8, y - 2, 16, 3);
  // The bead: a domed cylinder with a flat cathode side.
  g.fillStyle(dim(color, 0.5), 1); g.fillRoundedRect(x - 8, y - 58, 16, 20, { tl: 8, tr: 8, bl: 1, br: 1 });
  g.fillStyle(on ? color : dim(color, 0.6), on ? 0.95 : 1); g.fillRoundedRect(x - 7, y - 57, 14, 18, { tl: 7, tr: 7, bl: 1, br: 1 });
  g.fillStyle(0xffffff, 0.45); g.fillRect(x - 4, y - 54, 2, 10);
  g.fillStyle(dim(color, 0.4), 1); g.fillRect(x - 8, y - 40, 16, 2);
  if (on) { g.fillStyle(color, 0.08); g.fillCircle(x, y - 50, 26); }
}

/** A brass meter by a door: the dial, the needle, the seal-wire. Every house has one. */
export function meter(g: G, x: number, y: number, s = 1, needle = 0.6): void {
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 9 * s, y - 22 * s, 18 * s, 22 * s, 3 * s);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 8 * s, y - 21 * s, 16 * s, 20 * s, 3 * s);
  g.fillStyle(0xf4ecd8, 1); g.fillCircle(x, y - 13 * s, 5.5 * s);
  g.lineStyle(0.8, 0x2a2a2a, 0.8);
  for (let k = 0; k <= 4; k++) {
    const a = Math.PI + (k / 4) * Math.PI;
    g.lineBetween(x + Math.cos(a) * 4 * s, y - 13 * s + Math.sin(a) * 4 * s, x + Math.cos(a) * 5.2 * s, y - 13 * s + Math.sin(a) * 5.2 * s);
  }
  const a = Math.PI + needle * Math.PI;
  g.lineStyle(1.2, FAULT, 1); g.lineBetween(x, y - 13 * s, x + Math.cos(a) * 4.6 * s, y - 13 * s + Math.sin(a) * 4.6 * s);
  // The lead seal on its wire.
  g.lineStyle(0.8, SOLDER, 0.9); g.lineBetween(x - 6 * s, y - 4 * s, x, y - 2 * s);
  g.fillStyle(SOLDER_DARK, 1); g.fillCircle(x, y - 2 * s, 1.6 * s);
}

/** A hand-crank dynamo on its frame outside a crank-house: a spoked flywheel and a worn handle. */
export function crankDynamo(g: G, x: number, y: number, s = 1, turn = 0): void {
  shadow(g, x, y + 2, 34 * s, 10 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 14 * s, y - 4 * s, 28 * s, 4 * s);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 12 * s, y - 2 * s, x - 2 * s, y - 22 * s, x + 2 * s, y - 2 * s);
  // The field coil: a copper-wound drum.
  g.fillStyle(COPPER_DARK, 1); g.fillRoundedRect(x - 2 * s, y - 16 * s, 14 * s, 12 * s, 3 * s);
  g.lineStyle(1, COPPER_LIT, 0.7);
  for (let k = 0; k < 5; k++) g.lineBetween(x + k * 2.6 * s, y - 16 * s, x + k * 2.6 * s, y - 4 * s);
  // The flywheel.
  const cx = x - 4 * s, cy = y - 22 * s, r = 10 * s;
  g.lineStyle(2.5 * s, IRON, 1); g.strokeCircle(cx, cy, r);
  g.lineStyle(1.2 * s, IRON, 1);
  for (let k = 0; k < 5; k++) { const a = turn + (k / 5) * Math.PI * 2; g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 2 * s);
  const ha = turn + 0.6;
  g.lineStyle(2 * s, 0x6a4a2a, 1); g.lineBetween(cx + Math.cos(ha) * r, cy + Math.sin(ha) * r, cx + Math.cos(ha) * r - 6 * s, cy + Math.sin(ha) * r + 2 * s);
}

/** A great spool of cable, the kind the Grid's gangs string pylon to pylon. */
export function cableDrum(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 44 * s, 12 * s);
  g.fillStyle(0x5a3e24, 1); g.fillEllipse(x - 16 * s, y - 18 * s, 10 * s, 36 * s);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 16 * s, y - 32 * s, 32 * s, 28 * s);
  g.lineStyle(1.4, COPPER, 0.9);
  for (let k = 0; k < 9; k++) g.lineBetween(x - 15 * s, y - 31 * s + k * 3.1 * s, x + 15 * s, y - 31 * s + k * 3.1 * s);
  g.fillStyle(0x7a5634, 1); g.fillEllipse(x + 16 * s, y - 18 * s, 10 * s, 36 * s);
  g.fillStyle(0x3a2814, 1); g.fillCircle(x + 16 * s, y - 18 * s, 3 * s);
}

// ── Buildings ────────────────────────────────────────────────────────

/**
 * A resistor house: the long ceramic body of a resistor lying on its side, end-caps bulged,
 * colour bands painted round it — the bands are the household's *rating*, how much it may draw —
 * with lit windows between the bands, a door in the middle, its meter by the step, and the two
 * leads bent down at the ends into tinned pads in the street. A heat-sink fin stack for a chimney.
 */
export function resistorHouse(g: G, x: number, y: number, w: number, h: number, bands: number[], rng: () => number, lights = true): Pt {
  shadow(g, x, y + 4, w * 1.25, 24);
  const top = y - h, cap = h * 0.62;
  // Leads into the pads.
  for (const k of [-1, 1]) {
    const lx = x + k * (w / 2 + cap * 0.35);
    g.lineStyle(5, SOLDER_DARK, 1); g.lineBetween(x + k * (w / 2 - 4), y - h * 0.5, lx, y - h * 0.5);
    g.lineBetween(lx, y - h * 0.5, lx, y - 2);
    g.lineStyle(2, SOLDER_LIT, 0.8); g.lineBetween(lx - 1, y - h * 0.5, lx - 1, y - 2);
    pad(g, lx, y, 18, 10);
  }
  // The body: a dark outline, the ceramic, and the bulged end-caps.
  g.fillStyle(CERAMIC_DARK, 1); g.fillRoundedRect(x - w / 2 - 2, top - 2, w + 4, h + 4, h * 0.42);
  g.fillStyle(CERAMIC, 1); g.fillRoundedRect(x - w / 2, top, w, h, h * 0.4);
  for (const k of [-1, 1]) {
    g.fillStyle(CERAMIC_DARK, 1); g.fillEllipse(x + k * (w / 2 - cap * 0.4), y - h / 2, cap * 1.02, h + 10);
    g.fillStyle(lit(CERAMIC, 0.05), 1); g.fillEllipse(x + k * (w / 2 - cap * 0.4), y - h / 2 - 1, cap * 0.92, h + 6);
  }
  // Roundness: a lit upper band, a shaded underside.
  g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(x - w / 2 + 10, top + 4, w - 20, h * 0.18, 4);
  g.fillStyle(0x000000, 0.18); g.fillRoundedRect(x - w / 2 + 6, y - h * 0.2, w - 12, h * 0.18, 4);
  // The colour bands — first three close together near the left, tolerance band apart on the right.
  const bx = [x - w * 0.3, x - w * 0.18, x - w * 0.06, x + w * 0.3];
  bands.slice(0, 4).forEach((c, i) => {
    const bw = Math.max(8, w * 0.055);
    g.fillStyle(dim(c, 0.35), 1); g.fillRect(bx[i] - bw / 2, top + 1, bw, h - 2);
    g.fillStyle(c, 1); g.fillRect(bx[i] - bw / 2 + 1, top + 2, bw - 2, h - 5);
    g.fillStyle(lit(c, 0.35), 0.45); g.fillRect(bx[i] - bw / 2 + 1, top + 4, bw - 2, h * 0.14);
  });
  // Windows between bands, and over the door.
  const wy = y - h * 0.6;
  for (const wx of [x - w * 0.24, x - w * 0.12, x + w * 0.16, x + w * 0.4 - 4]) {
    if (Math.abs(wx - x) < 18) continue;
    g.fillStyle(CERAMIC_DARK, 1); g.fillRoundedRect(wx - 7, wy - 9, 14, 16, 5);
    if (lights && rng() < 0.75) {
      g.fillStyle(FILAMENT, 0.12); g.fillCircle(wx, wy - 1, 16);
      g.fillStyle(lit(FILAMENT, 0.25), 0.9); g.fillRoundedRect(wx - 5, wy - 7, 10, 12, 4);
    } else {
      g.fillStyle(0x1a1a20, 1); g.fillRoundedRect(wx - 5, wy - 7, 10, 12, 4);
    }
    g.fillStyle(CERAMIC_DARK, 1); g.fillRect(wx - 0.6, wy - 7, 1.2, 12);
  }
  // The door, round-headed like the end of a lead, and its meter.
  g.fillStyle(CERAMIC_DARK, 1); g.fillRoundedRect(x - 12, y - 30, 24, 30, { tl: 11, tr: 11, bl: 0, br: 0 });
  g.fillStyle(0x3a2e24, 1); g.fillRoundedRect(x - 10, y - 28, 20, 28, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(DIODE, 0.9); g.fillRect(x + 5, y - 15, 2.5, 4); // the electric lock: green is open
  meter(g, x - 22, y - 2, 0.75, rng());
  // The heat-sink chimney.
  const hx = x + w * 0.22;
  g.fillStyle(SOLDER_DARK, 1); g.fillRect(hx - 10, top - 18, 20, 20);
  for (let k = 0; k < 5; k++) { g.fillStyle(k % 2 ? SOLDER : SOLDER_LIT, 1); g.fillRect(hx - 10 + k * 4.4, top - 26, 2.4, 26); }
  return { x, y: y + 16 };
}

/**
 * A capacitor tower: an electrolytic can the height of a house-row — blue-grey sleeve with the
 * white minus stripe, a silver lid scored in a cross (the safety vent), the two legs down into
 * the board, and a column of lit windows up the side. A lightning rod on the lid.
 */
export function capacitorTower(g: G, x: number, y: number, r: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, r * 3, r * 0.8);
  // Legs.
  for (const k of [-1, 1]) {
    g.fillStyle(SOLDER_DARK, 1); g.fillRect(x + k * r * 0.45 - 2, y - 14, 4, 14);
    pad(g, x + k * r * 0.45, y, 12, 8);
  }
  const base = y - 12, top = base - h;
  // The sleeve: round shading in vertical strips.
  g.fillStyle(CAN_DARK, 1); g.fillRect(x - r - 1, top, r * 2 + 2, h);
  g.fillEllipse(x, base, r * 2 + 2, r * 0.7);
  g.fillStyle(CAN, 1); g.fillRect(x - r, top, r * 2, h);
  g.fillEllipse(x, base, r * 2, r * 0.66);
  g.fillStyle(CAN_LIT, 0.55); g.fillRect(x - r * 0.62, top, r * 0.34, h);
  g.fillStyle(0xffffff, 0.12); g.fillRect(x - r * 0.52, top, r * 0.1, h);
  g.fillStyle(0x000000, 0.25); g.fillRect(x + r * 0.55, top, r * 0.45, h);
  // The polarity stripe with its minus signs.
  const sx = x + r * 0.2;
  g.fillStyle(0xd8dce4, 0.9); g.fillRect(sx, top, r * 0.32, h);
  for (let yy = top + 16; yy < base - 10; yy += 26) { g.fillStyle(CAN_DARK, 1); g.fillRect(sx + r * 0.06, yy, r * 0.2, 3); }
  // Windows up the dark side.
  for (let yy = top + 26; yy < base - 30; yy += 34) {
    const wx = x - r * 0.25;
    g.fillStyle(CAN_DARK, 1); g.fillRect(wx - 6, yy - 8, 12, 15);
    if (rng() < 0.6) { g.fillStyle(FILAMENT, 0.1); g.fillCircle(wx, yy, 14); g.fillStyle(lit(FILAMENT, 0.2), 0.9); g.fillRect(wx - 4, yy - 6, 8, 11); }
    else { g.fillStyle(0x10141c, 1); g.fillRect(wx - 4, yy - 6, 8, 11); }
  }
  // A door at the foot.
  g.fillStyle(CAN_DARK, 1); g.fillRoundedRect(x - r * 0.45 - 9, base - 30, 18, 28, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(0x2a2420, 1); g.fillRoundedRect(x - r * 0.45 - 7, base - 28, 14, 26, { tl: 5, tr: 5, bl: 0, br: 0 });
  // The lid: crimped rim, the scored cross.
  g.fillStyle(SOLDER_DARK, 1); g.fillEllipse(x, top, r * 2 + 4, r * 0.74);
  g.fillStyle(SOLDER, 1); g.fillEllipse(x, top - 2, r * 2, r * 0.66);
  g.fillStyle(SOLDER_LIT, 0.6); g.fillEllipse(x - r * 0.3, top - 4, r * 0.8, r * 0.2);
  g.lineStyle(2, SOLDER_DARK, 0.9);
  g.lineBetween(x - r * 0.7, top - 2, x + r * 0.7, top - 2);
  g.lineBetween(x, top - 2 - r * 0.24, x, top - 2 + r * 0.24);
  // The rod.
  g.lineStyle(3, IRON, 1); g.lineBetween(x, top - 4, x, top - 46);
  g.fillStyle(COPPER_LIT, 1); g.fillTriangle(x - 3, top - 44, x + 3, top - 44, x, top - 56);
}

/**
 * A crank-house: a narrow terrace cottage with the household's hand-crank dynamo out on the step,
 * a meter at the door and a wire looping up to the Grid. The poorest roofs in the court.
 */
export function crankHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, dark = false): void {
  shadow(g, x, y + 4, w * 1.2, 20);
  const wall = 0x4a4038, top = y - h;
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x - w / 2 - 2, top - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x - w / 2, top, w, h);
  for (let i = 0; i < (w * h) / 180; i++) {
    g.fillStyle(rng() < 0.5 ? dim(wall, 0.15) : lit(wall, 0.06), 0.6);
    g.fillRect(x - w / 2 + rng() * (w - 10), top + 4 + rng() * (h - 8), 9, 3);
  }
  // Tin roof, slanted, with a seam pattern.
  g.fillStyle(0x5a6068, 1); g.fillTriangle(x - w / 2 - 6, top + 2, x + w / 2 + 6, top + 2, x + w / 2 + 6, top - h * 0.4);
  g.lineStyle(1, 0x7a8088, 0.8);
  for (let k = 1; k < 6; k++) { const px = x - w / 2 - 6 + (k / 6) * (w + 12); g.lineBetween(px, top + 2, px, top + 2 - ((px - (x - w / 2 - 6)) / (w + 12)) * h * 0.4); }
  // One window.
  const wx = x - w * 0.22, wy = top + h * 0.38;
  g.fillStyle(dim(wall, 0.5), 1); g.fillRect(wx - 8, wy - 8, 16, 16);
  if (!dark) { g.fillStyle(FILAMENT, 0.1); g.fillCircle(wx, wy, 14); g.fillStyle(lit(FILAMENT, 0.15), 0.85); g.fillRect(wx - 6, wy - 6, 12, 12); }
  else { g.fillStyle(0x0c0c10, 1); g.fillRect(wx - 6, wy - 6, 12, 12); }
  g.fillStyle(dim(wall, 0.5), 1); g.fillRect(wx - 0.6, wy - 6, 1.2, 12);
  // Door, its electric lock (red when switched off) and the meter.
  g.fillStyle(0x2a201a, 1); g.fillRect(x + w * 0.12 - 9, y - 28, 18, 28);
  g.fillStyle(dark ? FAULT : DIODE, 0.95); g.fillRect(x + w * 0.12 + 4, y - 15, 2.5, 4);
  meter(g, x + w * 0.12 + 18, y - 2, 0.7, dark ? 0.02 : 0.4 + rng() * 0.5);
  crankDynamo(g, x - w / 2 - 12, y + 6, 0.8, rng() * 6);
  // The service drop: a wire from the roof up out of frame toward the Grid.
  g.lineStyle(1.2, 0x1a1a1a, 0.9); g.lineBetween(x + w / 2, top - h * 0.38, x + w / 2 + 18, top - h * 0.38 - 40);
}

/**
 * The Tabulator: a valve computer the size of a chapel, which reckons every household's Draw. A
 * steel nave whose walls are racks of glowing valves behind a lattice; a rose window of nixie
 * tubes that shows the night's sum; side aisles of tape decks; a steeple of stacked valves with
 * an aerial; and punched tape spilling down the steps from the slot where the reckoning comes out.
 */
export function tabulator(g: G, x: number, y: number, rng: () => number): void {
  const W = 360, H = 200;
  shadow(g, x, y + 8, W * 1.3, 40);
  const x0 = x - W / 2, top = y - 20 - H;
  // Plinth: a tinned pad the width of the chapel.
  g.fillStyle(SOLDER_DARK, 1); g.fillRect(x0 - 70, y - 22, W + 140, 22);
  g.fillStyle(SOLDER, 1); g.fillRect(x0 - 66, y - 24, W + 132, 16);
  g.fillStyle(SOLDER_LIT, 0.6); g.fillRect(x0 - 66, y - 24, W + 132, 2);
  // Side aisles: tape-deck cabinets, reels and all.
  for (const k of [-1, 1]) {
    const ax = k < 0 ? x0 - 64 : x0 + W + 4;
    g.fillStyle(0x3a3e44, 1); g.fillRect(ax, top + 70, 60, H - 50);
    g.fillStyle(0x4c5058, 1); g.fillRect(ax + 2, top + 72, 56, H - 54);
    g.fillStyle(0x2a2e34, 1); g.fillTriangle(ax - 4, top + 72, ax + 64, top + 72, k < 0 ? ax + 64 : ax - 4, top + 40);
    for (const ry of [top + 102, top + 150]) {
      for (const rx of [ax + 16, ax + 44]) {
        g.fillStyle(0x1a1a1e, 1); g.fillCircle(rx, ry, 12);
        g.lineStyle(2, SOLDER, 0.8); g.strokeCircle(rx, ry, 11);
        g.fillStyle(0x6a4a2a, 1); g.fillCircle(rx, ry, 7);
        g.fillStyle(SOLDER_LIT, 1); g.fillCircle(rx, ry, 2);
      }
      g.lineStyle(1.5, 0x6a4a2a, 1); g.lineBetween(ax + 16, ry + 7, ax + 44, ry + 7);
    }
  }
  // The nave: grey steel, a lattice over racks of valves.
  g.fillStyle(0x2c3036, 1); g.fillRect(x0 - 3, top - 3, W + 6, H + 6);
  g.fillStyle(0x0e1014, 1); g.fillRect(x0, top, W, H);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 18; col++) {
      const vx = x0 + 14 + col * ((W - 28) / 17), vy = top + 40 + row * 30;
      if (Math.abs(vx - x) < 66 && vy > top + 60) continue; // the door and window bay
      valve(g, vx, vy, 0.62, rng() < 0.85 ? 0.6 + rng() * 0.4 : 0, rng() < 0.08);
    }
  }
  g.lineStyle(2, 0x5a5e66, 1);
  for (let k = 0; k <= 6; k++) g.lineBetween(x0, top + k * (H / 6), x0 + W, top + k * (H / 6));
  for (let k = 0; k <= 9; k++) g.lineBetween(x0 + k * (W / 9), top, x0 + k * (W / 9), top + H);
  // The gable: steel roof with a ridge of insulators.
  g.fillStyle(0x24282e, 1); g.fillTriangle(x0 - 16, top + 2, x0 + W + 16, top + 2, x, top - 96);
  g.fillStyle(0x363a42, 1); g.fillTriangle(x0 - 8, top, x0 + W + 8, top, x, top - 88);
  g.lineStyle(1.5, 0x4a4e56, 1);
  for (let k = 1; k < 7; k++) { const t = k / 7; g.lineBetween(x0 - 8 + (x - x0 + 8) * t, top - 88 * t, x0 + W + 8 - (x0 + W + 8 - x) * t, top - 88 * t); }
  // The rose window: a ring of nixie tubes, the night's Draw in orange numerals.
  const rx = x, ry = top - 34, rr = 42;
  g.fillStyle(0x0a0a0c, 1); g.fillCircle(rx, ry, rr + 4);
  g.lineStyle(3, BRASS, 1); g.strokeCircle(rx, ry, rr + 4);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const tx = rx + Math.cos(a) * rr * 0.68, ty = ry + Math.sin(a) * rr * 0.68;
    g.fillStyle(NIXIE, 0.12); g.fillCircle(tx, ty, 10);
    g.fillStyle(0x2a1a10, 1); g.fillRoundedRect(tx - 5, ty - 7, 10, 14, 3);
    segText(g, tx - 3, ty - 5, String((k * 7 + 3) % 10), 10, NIXIE, 0.95);
  }
  g.fillStyle(NIXIE, 0.15); g.fillCircle(rx, ry, 14);
  segText(g, rx - 7, ry - 5, '00', 10, NIXIE, 1);
  // The door bay: steel doors, and the output slot spilling punched tape down the steps.
  g.fillStyle(0x3a3e44, 1); g.fillRect(x - 46, y - 20 - 110, 92, 110);
  g.fillStyle(0x1a1c20, 1); g.fillRoundedRect(x - 36, y - 20 - 96, 72, 96, { tl: 36, tr: 36, bl: 0, br: 0 });
  g.lineStyle(1.5, 0x4a4e56, 1); g.lineBetween(x, y - 20 - 96, x, y - 20);
  g.fillStyle(FILAMENT, 0.08); g.fillRoundedRect(x - 34, y - 20 - 94, 68, 94, { tl: 34, tr: 34, bl: 0, br: 0 });
  g.fillStyle(0x0a0a0a, 1); g.fillRect(x - 30, y - 20 - 112, 60, 6);
  // The tape: pale ribbon with holes, falling and coiling on the plinth.
  const tape: Pt[] = [{ x: x - 20, y: y - 129 }, { x: x - 30, y: y - 100 }, { x: x - 54, y: y - 64 }, { x: x - 60, y: y - 34 }, { x: x - 88, y: y - 18 }, { x: x - 120, y: y - 12 }];
  for (let i = 1; i < tape.length; i++) {
    g.lineStyle(7, CARD_DARK, 1); g.lineBetween(tape[i - 1].x, tape[i - 1].y, tape[i].x, tape[i].y);
    g.lineStyle(5, CARD, 1); g.lineBetween(tape[i - 1].x, tape[i - 1].y, tape[i].x, tape[i].y);
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      g.fillStyle(0x2a2420, 1); g.fillCircle(tape[i - 1].x + (tape[i].x - tape[i - 1].x) * t, tape[i - 1].y + (tape[i].y - tape[i - 1].y) * t, 1.1);
    }
  }
  // The steeple: a tower of great stacked valves, an aerial and a red warning lamp at the very top.
  const sx = x, sb = top - 86;
  g.fillStyle(0x24282e, 1); g.fillRect(sx - 18, sb - 30, 36, 34);
  valve(g, sx, sb - 30, 1.5, 1);
  valve(g, sx, sb - 72, 1.1, 0.8, true);
  g.lineStyle(2, IRON, 1); g.lineBetween(sx, sb - 100, sx, sb - 150);
  for (let k = 0; k < 4; k++) { g.lineStyle(1.2, IRON, 1); g.lineBetween(sx - 14 + k * 2, sb - 112 - k * 10, sx + 14 - k * 2, sb - 112 - k * 10); }
  g.fillStyle(FAULT, 0.9); g.fillCircle(sx, sb - 152, 3);
}

/**
 * Prince Byte's Die: a black chip the size of a palace, sat on a socket of gold pins. Its top
 * face is a window onto the silicon itself, glowing cathode green with circuitry finer than
 * thread; pin one is marked with a gilt dot, the notch faces the town, and the silkscreen on its
 * lid gives its part number. The door is the notch.
 */
export function diePalace(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 10, w * 1.35, 50);
  const x0 = x - w / 2, depth = h * 0.55, top = y - 20 - h;
  // The socket under it, gold fingers in rows.
  g.fillStyle(EPOXY, 1); g.fillRect(x0 - 40, y - 26, w + 80, 26);
  g.fillStyle(0x2a2834, 1); g.fillRect(x0 - 38, y - 28, w + 76, 6);
  // The pins: down both long sides of the front face, bent out into pads.
  const pins = Math.floor(w / 26);
  for (let i = 0; i < pins; i++) {
    const px = x0 + 16 + i * ((w - 32) / (pins - 1));
    g.fillStyle(GOLD_DARK, 1); g.fillRect(px - 5, y - 32, 10, 18);
    g.fillStyle(GOLD, 1); g.fillRect(px - 4, y - 32, 8, 16);
    g.fillStyle(GOLD_LIT, 0.7); g.fillRect(px - 4, y - 32, 2, 16);
    g.fillStyle(GOLD, 1); g.fillRect(px - 6, y - 16, 12, 6);
  }
  for (const k of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const py = y - 40 - i * (depth / 4.4);
      const px = k < 0 ? x0 - 14 - i * 4 : x0 + w + 14 + i * 4;
      g.fillStyle(GOLD_DARK, 1); g.fillRect(px - 12, py - 4, 24, 8);
      g.fillStyle(GOLD, 1); g.fillRect(px - 11, py - 4, 22, 6);
    }
  }
  // The body: front face, the top face receding behind it.
  const fh = h - depth;
  g.fillStyle(0x0c0b10, 1); g.fillRect(x0 - 2, y - 32 - fh - 2, w + 4, fh + 4);
  g.fillStyle(EPOXY, 1); g.fillRect(x0, y - 32 - fh, w, fh);
  g.fillStyle(EPOXY_LIT, 0.6); g.fillRect(x0, y - 32 - fh, w, 3);
  // Mould marks on the front.
  g.fillStyle(EPOXY_LIT, 0.5); g.fillCircle(x0 + 30, y - 32 - fh / 2, 8); g.fillCircle(x0 + w - 30, y - 32 - fh / 2, 8);
  const tTop = y - 32 - fh;
  g.fillStyle(EPOXY_LIT, 1);
  g.fillPoints([
    { x: x0, y: tTop }, { x: x0 + w, y: tTop }, { x: x0 + w - 30, y: tTop - depth }, { x: x0 + 30, y: tTop - depth },
  ] as Phaser.Geom.Point[], true);
  g.fillStyle(0x24222c, 1);
  g.fillPoints([
    { x: x0 + 6, y: tTop - 3 }, { x: x0 + w - 6, y: tTop - 3 }, { x: x0 + w - 33, y: tTop - depth + 3 }, { x: x0 + 33, y: tTop - depth + 3 },
  ] as Phaser.Geom.Point[], true);
  // The die window: glowing silicon, a fine grid of circuitry.
  const dw = w * 0.42, dh = depth * 0.62, dcx = x, dcy = tTop - depth * 0.5;
  g.fillStyle(0x0a0a0a, 1); g.fillRect(dcx - dw / 2 - 6, dcy - dh / 2 - 4, dw + 12, dh + 8);
  g.fillStyle(BYTE, 0.1); g.fillCircle(dcx, dcy, dw * 0.7);
  g.fillStyle(0x1a3a3a, 1); g.fillRect(dcx - dw / 2, dcy - dh / 2, dw, dh);
  for (let i = 0; i < 70; i++) {
    const px = dcx - dw / 2 + rng() * dw, py = dcy - dh / 2 + rng() * dh;
    const horiz = rng() < 0.5;
    g.fillStyle(rng() < 0.3 ? BYTE_LIT : BYTE, 0.35 + rng() * 0.5);
    g.fillRect(px, py, horiz ? 6 + rng() * 18 : 1.2, horiz ? 1.2 : 4 + rng() * 10);
  }
  for (let k = 0; k < 4; k++) { g.lineStyle(1, BYTE_LIT, 0.4); g.strokeRect(dcx - dw / 2 + k * 9, dcy - dh / 2 + k * 5, dw - k * 18, dh - k * 10); }
  // Bond wires from the die out to the edge of the top face — gold hairs.
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12;
    const ex = x0 + 40 + (w - 80) * t, ey = tTop - 6;
    g.lineStyle(1, GOLD_LIT, 0.7); g.lineBetween(dcx - dw / 2 + dw * t, dcy + dh / 2, ex, ey);
  }
  // Pin one and the part number.
  g.fillStyle(GOLD, 1); g.fillCircle(x0 + 48, tTop - depth + 16, 6);
  segText(g, x0 + w - 150, tTop - depth + 10, 'BYTE-8', 14, SILK, 0.7);
  // The notch: the door, a half-round cut in the front face, lit green within.
  g.fillStyle(0x050508, 1); g.fillRoundedRect(x - 38, y - 32 - 84, 76, 84, { tl: 38, tr: 38, bl: 0, br: 0 });
  g.fillStyle(BYTE, 0.18); g.fillRoundedRect(x - 32, y - 32 - 78, 64, 78, { tl: 32, tr: 32, bl: 0, br: 0 });
  g.lineStyle(2, GOLD, 0.8); g.strokeRoundedRect(x - 38, y - 32 - 84, 76, 84, { tl: 38, tr: 38, bl: 0, br: 0 });
  // Steps.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? GOLD_DARK : GOLD, 1); g.fillRect(x - 46 - k * 6, y - 12 + k * 4, 92 + k * 12, 5); }
}

/**
 * A punch-card mill: a long shed under a sawtooth roof, its north lights glowing; at one end a
 * feed of buff cards runs out between brass rollers into a hopper, at the other a stack of
 * finished decks tied in string. A brass gear-train turns on the gable.
 */
export function punchMill(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.15, 26);
  const x0 = x - w / 2, top = y - h;
  const wall = 0x5a4a3a;
  g.fillStyle(dim(wall, 0.45), 1); g.fillRect(x0 - 2, top - 2, w + 4, h + 4);
  g.fillStyle(wall, 1); g.fillRect(x0, top, w, h);
  for (let i = 0; i < (w * h) / 200; i++) {
    g.fillStyle(rng() < 0.5 ? dim(wall, 0.18) : lit(wall, 0.08), 0.6);
    g.fillRect(x0 + rng() * (w - 10), top + 4 + rng() * (h - 8), 10, 3);
  }
  // Sawtooth roof: glazed north lights.
  const teeth = Math.max(3, Math.round(w / 60));
  const tw = w / teeth;
  for (let i = 0; i < teeth; i++) {
    const tx = x0 + i * tw;
    g.fillStyle(0x3a3e44, 1); g.fillTriangle(tx, top, tx + tw, top, tx + tw, top - 34);
    g.fillStyle(FILAMENT, 0.5); g.fillTriangle(tx + 4, top - 2, tx + tw - 2, top - 2, tx + tw - 2, top - 28);
    g.fillStyle(lit(FILAMENT, 0.4), 0.4); g.fillRect(tx + tw - 6, top - 28, 3, 26);
  }
  // Long windows with card-loom silhouettes inside.
  for (let i = 0; i < teeth; i++) {
    const wx = x0 + (i + 0.5) * tw, wy = top + h * 0.42;
    g.fillStyle(dim(wall, 0.5), 1); g.fillRect(wx - 16, wy - 12, 32, 22);
    g.fillStyle(FILAMENT, 0.75); g.fillRect(wx - 14, wy - 10, 28, 18);
    g.fillStyle(0x2a1e14, 0.9); g.fillRect(wx - 10, wy - 2, 20, 10); g.fillRect(wx - 2, wy - 10, 4, 8);
  }
  // Doors.
  g.fillStyle(0x2a2018, 1); g.fillRect(x - 20, y - 36, 40, 36);
  g.lineStyle(1.5, 0x4a3a2a, 1); g.lineBetween(x, y - 36, x, y); g.lineBetween(x - 20, y - 36, x + 20, y);
  // The card feed out of the east end: rollers and the hopper.
  const fx = x0 + w;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(fx + 6, y - 40, 9); g.fillCircle(fx + 6, y - 22, 9);
  g.fillStyle(BRASS, 1); g.fillCircle(fx + 6, y - 40, 7); g.fillCircle(fx + 6, y - 22, 7);
  g.fillStyle(CARD_DARK, 1); g.fillRect(fx + 6, y - 33, 62, 6);
  g.fillStyle(CARD, 1); g.fillRect(fx + 6, y - 33, 60, 4);
  for (let k = 0; k < 7; k++) { g.fillStyle(0x2a2420, 1); g.fillRect(fx + 12 + k * 8, y - 32, 2, 2); }
  g.fillStyle(0x4a4038, 1); g.fillTriangle(fx + 60, y - 30, fx + 96, y - 30, fx + 78, y);
  g.fillStyle(0x6a5a48, 1); g.fillRect(fx + 62, y - 36, 32, 8);
  // Finished decks at the west end.
  for (let k = 0; k < 3; k++) {
    const dx = x0 - 26 + k * 4, dy = y - 4 - k * 9;
    g.fillStyle(CARD_DARK, 1); g.fillRect(dx - 14, dy - 8, 28, 9);
    g.fillStyle(CARD, 1); g.fillRect(dx - 14, dy - 9, 28, 7);
    g.lineStyle(1, 0x8a2a1a, 1); g.lineBetween(dx, dy - 9, dx, dy);
  }
  // The gear-train on the gable.
  for (const [gx, gy, r] of [[x0 + 24, top + 20, 12], [x0 + 44, top + 30, 8]] as [number, number, number][]) {
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(gx, gy, r + 2);
    g.fillStyle(BRASS, 1); g.fillCircle(gx, gy, r);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.fillStyle(BRASS, 1); g.fillRect(gx + Math.cos(a) * r - 2, gy + Math.sin(a) * r - 2, 4, 4); }
    g.fillStyle(BRASS_DARK, 1); g.fillCircle(gx, gy, r * 0.3);
  }
}

/**
 * The Core Store: Archivist Rom's house of memory. Its whole front is a plane of magnetic core
 * memory — a lattice of copper wires with a little ferrite ring threaded at every crossing, some
 * rings glowing where a bit is held — behind a heavy iron frame, under a flat parapet roof.
 */
export function coreStore(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.2, 28);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(IRON_DARK, 1); g.fillRect(x0 - 6, top - 6, w + 12, h + 6);
  g.fillStyle(IRON, 1); g.fillRect(x0 - 3, top - 3, w + 6, h + 3);
  g.fillStyle(0x0c0e12, 1); g.fillRect(x0 + 6, top + 6, w - 12, h - 44);
  // The core plane.
  const step = 16;
  for (let gx = x0 + 14; gx < x0 + w - 10; gx += step) { g.lineStyle(0.8, COPPER, 0.6); g.lineBetween(gx, top + 8, gx, y - 40); }
  for (let gy = top + 14; gy < y - 40; gy += step) { g.lineStyle(0.8, COPPER, 0.6); g.lineBetween(x0 + 8, gy, x0 + w - 8, gy); }
  for (let gx = x0 + 14; gx < x0 + w - 10; gx += step) {
    for (let gy = top + 14; gy < y - 40; gy += step) {
      const on = rng() < 0.3;
      g.lineStyle(2.2, on ? 0x9a6a4a : 0x3a2a24, 1);
      g.beginPath(); g.arc(gx, gy, 4, 0, Math.PI * 2); g.strokePath();
      if (on) { g.fillStyle(NIXIE, 0.12); g.fillCircle(gx, gy, 7); }
    }
  }
  // Sense wire: a single diagonal thread through every ring.
  g.lineStyle(0.8, SOLDER_LIT, 0.4); g.lineBetween(x0 + 10, top + 10, x0 + w - 10, y - 42);
  // Frame, parapet, the door.
  g.fillStyle(IRON, 1); g.fillRect(x0 - 10, top - 18, w + 20, 14);
  g.fillStyle(lit(IRON, 0.2), 1); g.fillRect(x0 - 10, top - 18, w + 20, 3);
  g.fillStyle(IRON, 1); g.fillRect(x0 - 3, y - 40, w + 6, 40);
  g.fillStyle(0x16181c, 1); g.fillRect(x - 16, y - 36, 32, 36);
  g.lineStyle(1.5, SOLDER_DARK, 1); g.strokeRect(x - 16, y - 36, 32, 36);
  for (const k of [-1, 1]) { g.fillStyle(SOLDER, 1); g.fillCircle(x + k * 10, y - 18, 2); }
  segText(g, x - 40, y - 30, 'ROM', 12, SILK, 0.6);
}

/**
 * Tinker Gearlock's Windery: an open-fronted works under a corrugated awning where the automatons
 * are wound. Racks of brass keys, a great mainspring on a drum, a half-built automaton on the bench.
 */
export function windery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.15, 24);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(0x2e2a28, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(0x1a1816, 1); g.fillRect(x0 + 10, top + 16, w - 20, h - 16);
  g.fillStyle(FILAMENT, 0.12); g.fillRect(x0 + 10, top + 16, w - 20, h - 16);
  // The mainspring drum on the back wall.
  const mx = x0 + w * 0.3, my = top + h * 0.5;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(mx, my, 30);
  g.lineStyle(2, BRASS_LIT, 0.9);
  g.beginPath();
  for (let i = 0; i < 80; i++) { const a = i * 0.32, r = 4 + i * 0.32; const px = mx + Math.cos(a) * r, py = my + Math.sin(a) * r; if (i === 0) g.moveTo(px, py); else g.lineTo(px, py); }
  g.strokePath();
  // The key rack.
  for (let k = 0; k < 6; k++) {
    const kx = x0 + w * 0.55 + k * 14, ky = top + 34;
    g.lineStyle(2, BRASS, 1); g.lineBetween(kx, ky, kx, ky + 18);
    g.lineStyle(2, BRASS, 1); g.strokeCircle(kx - 4, ky + 22, 4); g.strokeCircle(kx + 4, ky + 22, 4);
  }
  // A half-built automaton on the bench.
  g.fillStyle(0x4a3424, 1); g.fillRect(x0 + w * 0.5, y - 26, w * 0.4, 8);
  automaton(g, x0 + w * 0.72, y - 26, 0.8, 0, 0, BRASS, false);
  // The awning.
  g.fillStyle(0x5a6068, 1); g.fillRect(x0 - 12, top - 14, w + 24, 16);
  for (let k = 0; k < w / 10 + 2; k++) { g.fillStyle(k % 2 ? 0x6a7078 : 0x4a5058, 1); g.fillRect(x0 - 12 + k * 10, top - 14, 10, 16); }
  g.fillStyle(0x3a3e44, 1); g.fillRect(x0 - 12, top + 2, w + 24, 3);
  // Uprights.
  for (const k of [x0, x0 + w - 8]) { g.fillStyle(IRON, 1); g.fillRect(k, top, 8, h); }
  // The works lamp, a lit diode over the bench.
  g.fillStyle(DIODE, 0.9); g.fillCircle(x0 + w - 30, top + 30, 3);
  g.fillStyle(DIODE, 0.1); g.fillCircle(x0 + w - 30, top + 30, 14 + rng() * 2);
}

/**
 * An automaton: a clockwork walker in riveted brass — a barrel body, a round head with a grille
 * mouth and two lamp eyes, stiff arms, stumpy legs, and its wind-up key on the back turning while
 * there is spring in it. `wind` (0–1) is how wound it is; `step` swings the legs; `keyColor`
 * paints its key and eyes (whose side it marches for).
 */
export function automaton(g: G, x: number, y: number, s: number, step: number, wind: number, keyColor: number, live = true): void {
  shadow(g, x, y + 1, 26 * s, 8 * s);
  const sw = Math.sin(step) * 4 * s;
  // Legs.
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 7 * s + sw * 0.4, y - 12 * s, 5 * s, 12 * s); g.fillRect(x + 2 * s - sw * 0.4, y - 12 * s, 5 * s, 12 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 8 * s + sw * 0.4, y - 2 * s, 7 * s, 3 * s); g.fillRect(x + 1 * s - sw * 0.4, y - 2 * s, 7 * s, 3 * s);
  // The barrel.
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 11 * s, y - 34 * s, 22 * s, 24 * s, 6 * s);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 10 * s, y - 33 * s, 20 * s, 22 * s, 6 * s);
  g.fillStyle(BRASS_LIT, 0.55); g.fillRect(x - 7 * s, y - 31 * s, 4 * s, 18 * s);
  for (const yy of [y - 29 * s, y - 15 * s]) { g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 10 * s, yy, 20 * s, 2 * s); for (let k = 0; k < 4; k++) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(x - 7 * s + k * 4.6 * s, yy + 1 * s, 0.8 * s); } }
  // A dial on the chest: how much spring is left.
  g.fillStyle(0xf4ecd8, 1); g.fillCircle(x, y - 22 * s, 4 * s);
  const na = -Math.PI / 2 + (1 - wind) * Math.PI * 1.6;
  g.lineStyle(1, 0x2a2a2a, 1); g.lineBetween(x, y - 22 * s, x + Math.cos(na) * 3.4 * s, y - 22 * s + Math.sin(na) * 3.4 * s);
  // Arms.
  g.lineStyle(3.5 * s, BRASS_DARK, 1);
  g.lineBetween(x - 11 * s, y - 30 * s, x - 15 * s - sw * 0.3, y - 16 * s); g.lineBetween(x + 11 * s, y - 30 * s, x + 15 * s + sw * 0.3, y - 16 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 15 * s - sw * 0.3, y - 15 * s, 2.6 * s); g.fillCircle(x + 15 * s + sw * 0.3, y - 15 * s, 2.6 * s);
  // Head.
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y - 41 * s, 8.5 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 41 * s, 7.5 * s);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 4 * s, y - 37 * s, 8 * s, 3 * s);
  for (let k = 0; k < 4; k++) { g.fillStyle(BRASS, 1); g.fillRect(x - 3.5 * s + k * 2.2 * s, y - 37 * s, 0.8 * s, 3 * s); }
  const eye = live ? keyColor : 0x2a2a2a;
  if (live) { g.fillStyle(eye, 0.25); g.fillCircle(x - 3 * s, y - 43 * s, 3.5 * s); g.fillCircle(x + 3 * s, y - 43 * s, 3.5 * s); }
  g.fillStyle(eye, 1); g.fillCircle(x - 3 * s, y - 43 * s, 1.7 * s); g.fillCircle(x + 3 * s, y - 43 * s, 1.7 * s);
  // The key on its back, turning with what spring is left.
  const ka = step * 0.5 * wind;
  const kx = x + 12 * s, ky = y - 26 * s;
  g.lineStyle(2 * s, keyColor, 1); g.lineBetween(x + 9 * s, ky, kx, ky);
  g.lineStyle(1.8 * s, keyColor, 1);
  g.strokeEllipse(kx + 3 * s, ky - 4 * s * Math.cos(ka), 6 * s, Math.max(1, 7 * s * Math.abs(Math.cos(ka))));
  g.strokeEllipse(kx + 3 * s, ky + 4 * s * Math.cos(ka), 6 * s, Math.max(1, 7 * s * Math.abs(Math.cos(ka))));
}

/**
 * A logic-gate kiosk: Gatekeeper Nand's lodge is built in the shape of the symbol it is named for
 * — the D of an AND gate in riveted steel, with a NOT-circle porthole on its nose and two input
 * leads running in from switch plates in the street.
 */
export function gateLodge(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 4, 140 * s, 22 * s);
  const h = 70 * s, w = 70 * s, x0 = x - w * 0.7, top = y - h;
  // Input leads to two plates.
  for (const k of [-1, 1]) {
    const ly = y - h * 0.5 + k * h * 0.25;
    g.lineStyle(4, COPPER_DARK, 1); g.lineBetween(x0 - 40 * s, ly, x0, ly);
    g.lineBetween(x0 - 40 * s, ly, x0 - 40 * s, y + 8 * s);
    pad(g, x0 - 40 * s, y + 10 * s, 20 * s, 10 * s);
  }
  // The D.
  g.fillStyle(0x2a2e34, 1);
  g.fillRect(x0 - 2, top - 2, w * 0.6 + 2, h + 4);
  g.fillCircle(x0 + w * 0.6, y - h / 2, h / 2 + 2);
  g.fillStyle(0x4a5058, 1);
  g.fillRect(x0, top, w * 0.6, h);
  g.fillCircle(x0 + w * 0.6, y - h / 2, h / 2);
  g.fillStyle(0x6a7078, 0.6); g.fillRect(x0 + 4, top + 4, w * 0.9, 4);
  for (let k = 0; k < 6; k++) { g.fillStyle(0x8a9098, 1); g.fillCircle(x0 + 6 + k * 14 * s, top + 10, 1.4); }
  // NOT circle porthole on the nose, lit.
  const nx = x0 + w * 0.6 + h / 2 + 8 * s, ny = y - h / 2;
  g.fillStyle(0x2a2e34, 1); g.fillCircle(nx, ny, 10 * s);
  g.fillStyle(FILAMENT, 0.85); g.fillCircle(nx, ny, 7 * s);
  // Output lead.
  g.lineStyle(4, COPPER_DARK, 1); g.lineBetween(nx + 10 * s, ny, nx + 40 * s, ny);
  // Door.
  g.fillStyle(0x1a1c20, 1); g.fillRect(x0 + w * 0.2, y - 32 * s, 22 * s, 32 * s);
  segText(g, x0 + w * 0.12, top + 18, 'NAND', 12 * s, SILK, 0.7);
}

/**
 * The Etchery: Etcher Solde's yard of acid trays where the court's new streets are etched before
 * they're laid — shallow trays of rust-brown ferric bath steaming, a soldering-iron stand with its
 * tip glowing (the only legal fire in the court), and rolls of copper-clad on a rack.
 */
export function etchery(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 230, 30);
  for (let i = 0; i < 3; i++) {
    const tx = x - 80 + i * 70, ty = y - 6 - (i % 2) * 8;
    g.fillStyle(0x2a2a30, 1); g.fillRect(tx - 28, ty - 18, 56, 20);
    g.fillStyle(0x6a3a1a, 1); g.fillRect(tx - 25, ty - 16, 50, 14);
    g.fillStyle(0xa05a2a, 0.5); g.fillRect(tx - 25, ty - 16, 50, 3);
    // A board soaking in it, half etched.
    g.fillStyle(COPPER, 0.8); g.fillRect(tx - 16, ty - 13, 32, 9);
    g.lineStyle(1, MASK_LIT, 0.9);
    for (let k = 0; k < 4; k++) g.lineBetween(tx - 14 + k * 8, ty - 12, tx - 14 + k * 8 + (rng() - 0.5) * 6, ty - 5);
  }
  // The iron in its stand.
  const ix = x + 110, iy = y;
  g.fillStyle(IRON_DARK, 1); g.fillRect(ix - 14, iy - 6, 28, 6);
  g.lineStyle(2, SOLDER, 1); g.strokeEllipse(ix, iy - 20, 12, 26);
  g.lineStyle(5, 0x2a2018, 1); g.lineBetween(ix - 12, iy - 40, ix + 6, iy - 16);
  g.lineStyle(2, SOLDER_LIT, 1); g.lineBetween(ix + 6, iy - 16, ix + 12, iy - 8);
  g.fillStyle(FILAMENT, 0.9); g.fillCircle(ix + 12, iy - 8, 2.4);
  g.fillStyle(FILAMENT, 0.12); g.fillCircle(ix + 12, iy - 8, 12);
  // Copper-clad rolls.
  for (let k = 0; k < 3; k++) {
    g.fillStyle(COPPER_DARK, 1); g.fillCircle(x - 140, y - 12 - k * 15, 8);
    g.fillStyle(COPPER, 1); g.fillCircle(x - 140, y - 12 - k * 15, 6);
    g.fillStyle(MASK, 1); g.fillCircle(x - 140, y - 12 - k * 15, 2);
  }
}

/**
 * A lattice pylon carrying the Grid: four tapered legs, cross-bracing, two arms with glass
 * insulators hanging. `pylonTops` gives the cable points for the overhead pass.
 */
export function pylon(g: G, x: number, y: number, h: number): void {
  shadow(g, x, y + 2, 50, 14);
  const top = y - h;
  g.lineStyle(3, IRON, 1);
  g.lineBetween(x - 20, y, x - 4, top); g.lineBetween(x + 20, y, x + 4, top);
  g.lineStyle(1.5, IRON, 1);
  for (let k = 0; k < 7; k++) {
    const t0 = k / 7, t1 = (k + 1) / 7;
    const w0 = 20 - 16 * t0, w1 = 20 - 16 * t1;
    const y0 = y - h * t0, y1 = y - h * t1;
    g.lineBetween(x - w0, y0, x + w1, y1); g.lineBetween(x + w0, y0, x - w1, y1);
    g.lineBetween(x - w1, y1, x + w1, y1);
  }
  for (const [ay, aw] of [[top + 10, 34], [top + 34, 26]] as [number, number][]) {
    g.lineStyle(3, IRON, 1); g.lineBetween(x - aw, ay, x + aw, ay);
    for (const k of [-1, 1]) {
      g.fillStyle(0x8ab0c0, 1);
      for (let d = 0; d < 3; d++) g.fillEllipse(x + k * aw, ay + 4 + d * 4, 7, 3);
    }
  }
  g.fillStyle(FAULT, 0.9); g.fillCircle(x, top - 4, 2.5);
}

/** Where a pylon's cables hang from (left and right of each arm). */
export function pylonTops(x: number, y: number, h: number): Pt[] {
  const top = y - h;
  return [{ x: x - 34, y: top + 22 }, { x: x + 34, y: top + 22 }, { x: x - 26, y: top + 46 }, { x: x + 26, y: top + 46 }];
}

/**
 * The Draw board: a black slate on legs where the night's quotas are chalked, with a brass
 * meter-row along its foot and the Brownout Bell hung from its crosspiece.
 */
export function drawBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 170, 20);
  for (const k of [-1, 1]) { g.fillStyle(0x3a2a1c, 1); g.fillRect(x + k * 70 - 3, y - 110, 6, 110); }
  g.fillStyle(0x3a2a1c, 1); g.fillRect(x - 80, y - 116, 160, 8);
  g.fillStyle(0x1a1c1e, 1); g.fillRect(x - 66, y - 100, 132, 70);
  g.lineStyle(2, 0x5a4a3a, 1); g.strokeRect(x - 66, y - 100, 132, 70);
  // Chalked tallies by house number.
  for (let r = 0; r < 4; r++) {
    segText(g, x - 60, y - 94 + r * 16, String(100 + ((r * 37) % 900)), 9, SILK, 0.75);
    const n = 3 + Math.floor(rng() * 9);
    for (let k = 0; k < n; k++) {
      const tx = x - 24 + k * 6;
      g.lineStyle(1.2, SILK, 0.7);
      if (k % 5 === 4) g.lineBetween(tx - 26, y - 86 + r * 16, tx, y - 94 + r * 16);
      else g.lineBetween(tx, y - 94 + r * 16, tx, y - 86 + r * 16);
    }
    if (r === 2) { g.lineStyle(1.5, FAULT, 0.9); g.strokeCircle(x + 52, y - 90 + r * 16, 6); }
  }
  // Meters.
  for (let k = 0; k < 5; k++) meter(g, x - 48 + k * 24, y - 6, 0.7, rng());
  // The Brownout Bell.
  const bx = x, by = y - 116;
  g.lineStyle(1.5, IRON, 1); g.lineBetween(bx, by, bx, by - 14);
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(bx - 14, by - 14, bx + 14, by - 14, bx, by - 34);
  g.fillStyle(BRASS, 1); g.fillEllipse(bx, by - 18, 28, 20);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(bx, by - 10, 30, 6);
  g.fillStyle(BRASS_LIT, 0.6); g.fillEllipse(bx - 5, by - 22, 6, 8);
}

/**
 * The Coolant Sump: a steel-lined pit let into the board where the Tabulator's cooling oil drains,
 * black and slick with a rainbow sheen, a ladder down one side, a drain grille, and warning
 * chevrons round the rim. Static parts only — the sheen and the bubbles move in `animate`.
 */
export function sump(g: G, r: Rect, rng: () => number): void {
  const { x, y, w, h } = r;
  // The rim: hazard chevrons on steel.
  g.fillStyle(OIL_RIM, 1); g.fillRoundedRect(x - 18, y - 18, w + 36, h + 36, 16);
  g.fillStyle(lit(OIL_RIM, 0.15), 1); g.fillRoundedRect(x - 14, y - 14, w + 28, h + 28, 14);
  for (let k = 0; k < (w + 28) / 22; k++) {
    const cx = x - 10 + k * 22;
    g.fillStyle(k % 2 ? 0xe8c43a : 0x1a1a1a, 0.8);
    g.fillTriangle(cx, y - 14, cx + 11, y - 14, cx + 5, y - 4);
    g.fillTriangle(cx, y + h + 14, cx + 11, y + h + 14, cx + 5, y + h + 4);
  }
  // The oil.
  g.fillStyle(OIL, 1); g.fillRoundedRect(x, y, w, h, 10);
  g.fillStyle(0x1a1626, 1); g.fillRoundedRect(x + 6, y + 6, w - 12, h - 12, 8);
  for (let i = 0; i < 10; i++) {
    g.fillStyle([OIL_SHEEN, 0x2a5a6a, 0x6a5a2a][i % 3], 0.18);
    g.fillEllipse(x + 30 + rng() * (w - 60), y + 20 + rng() * (h - 40), 40 + rng() * 60, 8 + rng() * 10);
  }
  // Ladder.
  const lx = x + w - 40;
  g.lineStyle(3, SOLDER_DARK, 1); g.lineBetween(lx, y - 14, lx, y + 40); g.lineBetween(lx + 18, y - 14, lx + 18, y + 40);
  for (let k = 0; k < 5; k++) { g.lineStyle(2, SOLDER, 1); g.lineBetween(lx, y - 8 + k * 10, lx + 18, y - 8 + k * 10); }
  // Drain grille.
  g.fillStyle(IRON_DARK, 1); g.fillRect(x + 30, y + h - 30, 48, 20);
  for (let k = 0; k < 6; k++) { g.fillStyle(SOLDER_DARK, 1); g.fillRect(x + 32 + k * 8, y + h - 28, 3, 16); }
  // The outflow pipe from the Tabulator.
  g.fillStyle(IRON, 1); g.fillRect(x + w * 0.4, y - 38, 30, 30);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x + w * 0.4 + 15, y - 8, 30, 10);
  g.fillStyle(OIL, 1); g.fillEllipse(x + w * 0.4 + 15, y - 8, 22, 6);
}

/**
 * The court's waystone: a crystal oscillator can — the silver oval that keeps the Tabulator's
 * time — stood on end on a slate plinth, its two legs in the board and a quiet blue hum about it.
 */
export function oscillatorStone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 16);
  g.fillStyle(0x2a2a30, 1); g.fillRect(x - 24, y - 14, 48, 14);
  g.fillStyle(0x3a3a42, 1); g.fillRect(x - 22, y - 16, 44, 6);
  for (const k of [-1, 1]) { g.fillStyle(SOLDER, 1); g.fillRect(x + k * 8 - 1.5, y - 22, 3, 8); }
  g.fillStyle(SOLDER_DARK, 1); g.fillEllipse(x, y - 50, 40, 60);
  g.fillStyle(SOLDER, 1); g.fillEllipse(x, y - 51, 36, 56);
  g.fillStyle(SOLDER_LIT, 0.8); g.fillEllipse(x - 7, y - 60, 10, 26);
  g.lineStyle(1.5, SOLDER_DARK, 0.9); g.strokeEllipse(x, y - 51, 28, 46);
  segText(g, x - 10, y - 56, '32K', 8, 0x223a52, 0.9);
}

/** A coil of punched tape or a dropped card on the ground — the court's litter. */
export function droppedCard(g: G, x: number, y: number, a: number, rng: () => number): void {
  const c = Math.cos(a), s = Math.sin(a);
  const corner = (u: number, v: number) => ({ x: x + c * u - s * v, y: y + s * u + c * v });
  const pts = [corner(-14, -6), corner(14, -6), corner(14, 6), corner(-11, 6), corner(-14, 3)];
  g.fillStyle(CARD_DARK, 0.9); g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y + 1 })) as Phaser.Geom.Point[], true);
  g.fillStyle(CARD, 0.95); g.fillPoints(pts as Phaser.Geom.Point[], true);
  for (let k = 0; k < 6; k++) {
    const p = corner(-10 + k * 4, (rng() - 0.5) * 8);
    g.fillStyle(0x2a2420, 1); g.fillRect(p.x - 0.8, p.y - 1.2, 1.6, 2.4);
  }
}

/** A storm-bolt from the sky to a point: jagged, forked, white-violet. For `animateOver`. */
export function bolt(g: G, x0: number, y0: number, x1: number, y1: number, seed: number, a = 1, width = 2.5): void {
  const n = 9;
  let px = x0, py = y0;
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s % 1000) / 1000; };
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const nx = x0 + (x1 - x0) * t + (i < n ? (rnd() - 0.5) * 40 : 0);
    const ny = y0 + (y1 - y0) * t;
    g.lineStyle(width * 3, BOLT, a * 0.2); g.lineBetween(px, py, nx, ny);
    g.lineStyle(width, 0xffffff, a); g.lineBetween(px, py, nx, ny);
    if (i === 4) { g.lineStyle(width * 0.6, BOLT, a * 0.7); g.lineBetween(nx, ny, nx + (rnd() - 0.5) * 70, ny + 50); }
    px = nx; py = ny;
  }
}

/** A pulse of current on a trace: a bright bead with a fading tail. */
export function pulseBead(g: G, x: number, y: number, ax: number, ay: number, r = 5, color = PULSE, a = 1): void {
  for (let k = 4; k >= 1; k--) { g.fillStyle(color, 0.12 * a); g.fillCircle(x - ax * k * r * 1.4, y - ay * k * r * 1.4, r * (1 - k * 0.15)); }
  glow(g, x, y, r * 2.4, color, 0.08 * a, 3);
  g.fillStyle(0xffffff, a); g.fillCircle(x, y, r * 0.6);
  g.fillStyle(color, a); g.fillCircle(x, y, r * 0.95);
  g.fillStyle(0xffffff, a); g.fillCircle(x, y, r * 0.45);
}

/** A strip of punched card, axis-aligned: the buff stock, column numbers, and its holes. */
export function cardStrip(g: G, x: number, y: number, w: number, h: number, holes: { x: number; w: number }[], a = 1): void {
  g.fillStyle(CARD_DARK, a); g.fillRect(x, y + 2, w, h);
  g.fillStyle(CARD, a); g.fillRect(x, y, w, h);
  g.fillStyle(0xffffff, a * 0.25); g.fillRect(x, y, w, 3);
  // Printed column guides: faint red rules and tiny digit rows.
  for (let cx = x + 6; cx < x + w; cx += 12) {
    g.fillStyle(0xc85a4a, a * 0.22); g.fillRect(cx, y + 4, 1, h - 8);
  }
  for (let r = 0; r < 4; r++) { g.fillStyle(0x6a5a3a, a * 0.25); g.fillRect(x + 4, y + 8 + r * ((h - 16) / 3), w - 8, 1); }
  for (const ho of holes) {
    if (ho.x + ho.w < x || ho.x > x + w) continue;
    const hx0 = Math.max(x, ho.x), hx1 = Math.min(x + w, ho.x + ho.w);
    g.fillStyle(MASK_DEEP, a * 0.7); g.fillRect(hx0, y + 3, hx1 - hx0, h - 6);
    g.lineStyle(1.5, CARD_DARK, a); g.strokeRect(hx0, y + 3, hx1 - hx0, h - 6);
  }
  // The clipped corner of a Hollerith card at its leading edge.
  g.fillStyle(MASK, a); g.fillTriangle(x, y, x + 10, y, x, y + 10);
}

