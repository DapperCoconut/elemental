import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Rect } from '../../../../IslesTypes';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CANVAS, CHALK, CHALK_DIM, FONT, FONT_DEEP, FONT_RIM, GOLD, GOLD_DARK, GOLD_LIT, GROUT,
  MANA, MANA_DEEP, MANA_LIT, MARBLE, MARBLE_DARK, MARBLE_LIT, MARBLE_SHADE, POTIONS, ROBE, ROBE_DARK, ROBE_LIT, SCORCH,
  SLATE, SLATE_DARK, SLATE_DEEP, SLATE_LIT, SMOKED, TIMBER, TIMBER_DARK, TIMBER_LIT, VIOLET, VIOLET_DARK, VIOLET_LIT,
} from './palette';

/**
 * Arcane set pieces — the shapes only a college of sun-mages has. Everything is drawn *inscribed*:
 * slate scored with circles, marble carved with runes, brass engraved with scales and degrees,
 * chalk over everything. Where the Noon has made a thing useless (a telescope, a shutter, an
 * awning) it is drawn kept anyway — polished, capped, slit into ribbons — because the mages are
 * proud people and will not admit their towers point at nothing.
 */

// ── Runes ────────────────────────────────────────────────────────────

/** Eight rune shapes on a unit box: the Academy's alphabet for the binding of light. */
const RUNES: [number, number, number, number][][] = [
  [[0, -1, 0, 1], [0, -1, 0.7, -0.4], [0, 0, 0.7, 0.6]],
  [[-0.6, -1, 0.6, 1], [0.6, -1, -0.6, 1], [-0.6, 0, 0.6, 0]],
  [[0, -1, -0.7, 0.2], [-0.7, 0.2, 0.7, 0.2], [0.7, 0.2, 0, -1], [0, 0.2, 0, 1]],
  [[-0.6, -1, -0.6, 1], [0.6, -1, 0.6, 1], [-0.6, -0.3, 0.6, 0.3]],
  [[0, -1, 0, 1], [-0.7, -0.5, 0.7, -0.5], [-0.5, 0.6, 0.5, 0.6]],
  [[-0.7, -1, 0.7, -1], [0.7, -1, -0.7, 1], [-0.7, 1, 0.7, 1]],
  [[0, -1, 0.7, 0], [0.7, 0, 0, 1], [0, 1, -0.7, 0], [-0.7, 0, 0, -1]],
  [[-0.7, 1, 0, -1], [0, -1, 0.7, 1], [-0.35, 0.1, 0.35, 0.1], [0, 0.1, 0, 1]],
];

/** One rune, `s` half-height, centred on x,y. */
export function rune(g: G, x: number, y: number, s: number, idx: number, color: number, a = 1, w = 1.6): void {
  g.lineStyle(w, color, a);
  const k = ((Math.floor(idx) % RUNES.length) + RUNES.length) % RUNES.length || 0;
  for (const [ax, ay, bx, by] of RUNES[k]) g.lineBetween(x + ax * s * 0.7, y + ay * s, x + bx * s * 0.7, y + by * s);
}

/**
 * A burned sigil circle seen on the floor (`squash` flattens it into perspective; 1 = from above):
 * a scorched band, two gilt rims, a ring of runes between them, degree ticks, and a star inside.
 * `points` 0 skips the star.
 */
export function sigilCircle(g: G, x: number, y: number, r: number, squash: number, color = GOLD, a = 1, points = 6, runeOffset = 0): void {
  g.fillStyle(SCORCH, 0.22 * a); g.fillEllipse(x, y, r * 2.1, r * 2.1 * squash);
  g.lineStyle(Math.max(2, r * 0.03), dim(color, 0.35), 0.7 * a); g.strokeEllipse(x, y + 1, r * 2, r * 2 * squash);
  g.lineStyle(Math.max(1.5, r * 0.022), color, a); g.strokeEllipse(x, y, r * 2, r * 2 * squash);
  g.lineStyle(1.2, color, 0.85 * a); g.strokeEllipse(x, y, r * 1.64, r * 1.64 * squash);
  // Degree ticks on the outer band.
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const k = i % 4 === 0 ? 0.88 : 0.94;
    g.lineStyle(1, color, (i % 4 === 0 ? 0.8 : 0.45) * a);
    g.lineBetween(x + Math.cos(t) * r * k, y + Math.sin(t) * r * k * squash, x + Math.cos(t) * r, y + Math.sin(t) * r * squash);
  }
  // Runes in the band.
  const n = Math.max(6, Math.round(r / 14));
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + 0.2;
    rune(g, x + Math.cos(t) * r * 0.9, y + Math.sin(t) * r * 0.9 * squash, Math.max(3, r * 0.05) * (0.6 + squash * 0.4), i * 3 + runeOffset, color, 0.75 * a, 1.2);
  }
  if (points >= 3) {
    // The star: every second (or third) point joined.
    const step = points === 5 ? 2 : points === 6 ? 2 : Math.floor(points / 2);
    const pts = Array.from({ length: points }, (_, i) => {
      const t = -Math.PI / 2 + (i / points) * Math.PI * 2;
      return { x: x + Math.cos(t) * r * 0.8, y: y + Math.sin(t) * r * 0.8 * squash };
    });
    g.lineStyle(1.4, color, 0.8 * a);
    for (let i = 0; i < points; i++) { const p = pts[i], q = pts[(i + step) % points]; g.lineBetween(p.x, p.y, q.x, q.y); }
    if (points === 6) for (let i = 0; i < points; i++) { const p = pts[i], q = pts[(i + 1) % points]; g.lineStyle(1, color, 0.4 * a); g.lineBetween(p.x, p.y, q.x, q.y); }
    g.lineStyle(1.2, color, 0.7 * a); g.strokeEllipse(x, y, r * 0.5, r * 0.5 * squash);
    for (const p of pts) { g.fillStyle(color, 0.9 * a); g.fillCircle(p.x, p.y, Math.max(1.5, r * 0.025)); }
  }
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * Slate paving: blue-grey slabs of three sizes, grouted pale, every few slabs scored with a ghost
 * of an old chalk circle or a burned ring that was scrubbed and never quite came off.
 */
export function slatePaving(g: G, r: Rect, rng: () => number, size = 54): void {
  g.fillStyle(GROUT, 1); g.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += size) {
    const off = ((y - r.y) / size) % 2 ? size * 0.5 : 0;
    for (let x = r.x - off; x < r.x + r.w; x += size) {
      const w = rng() < 0.18 ? size * 2 : size;
      const c = mixC(SLATE, rng() < 0.5 ? SLATE_LIT : SLATE_DARK, rng() * 0.45);
      const x0 = Math.max(r.x, x + 1), x1 = Math.min(r.x + r.w, x + w - 1);
      if (x1 <= x0) continue;
      g.fillStyle(c, 1); g.fillRect(x0, y + 1, x1 - x0, size - 2);
      g.fillStyle(lit(c, 0.12), 0.6); g.fillRect(x0, y + 1, x1 - x0, 2);
      g.fillStyle(dim(c, 0.12), 0.5); g.fillRect(x0, y + size - 4, x1 - x0, 2);
      // Cleavage lines in the slate.
      if (rng() < 0.35) { g.lineStyle(1, dim(c, 0.2), 0.4); const ly = y + 6 + rng() * (size - 12); g.lineBetween(x0 + 3, ly, x1 - 3, ly + (rng() - 0.5) * 4); }
      if (w > size) x += size;
    }
  }
  // Palimpsest: old circles and chalk scrawl.
  const n = Math.round((r.w * r.h) / 70000);
  for (let i = 0; i < n; i++) {
    const cx = r.x + rng() * r.w, cy = r.y + rng() * r.h, cr = 20 + rng() * 50;
    if (rng() < 0.5) { g.lineStyle(1.5, SCORCH, 0.18); g.strokeEllipse(cx, cy, cr * 2, cr * 1.4); }
    else { g.lineStyle(1, CHALK, 0.14); g.strokeEllipse(cx, cy, cr * 2, cr * 1.4); rune(g, cx, cy, cr * 0.3, i, CHALK, 0.14, 1); }
  }
  for (let i = 0; i < (r.w * r.h) / 3000; i++) {
    g.fillStyle(rng() < 0.5 ? CHALK : GOLD, 0.18); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, 1.5, 1.5);
  }
}

/** A marble avenue: white slabs edged in gilt, laid over the slate. */
export function marbleWalk(g: G, x0: number, y0: number, x1: number, y1: number, w: number, rng: () => number): void {
  const horiz = Math.abs(x1 - x0) > Math.abs(y1 - y0);
  const rx = horiz ? Math.min(x0, x1) : x0 - w / 2, ry = horiz ? y0 - w / 2 : Math.min(y0, y1);
  const rw = horiz ? Math.abs(x1 - x0) : w, rh = horiz ? w : Math.abs(y1 - y0);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(rx - 3, ry - 3, rw + 6, rh + 6);
  g.fillStyle(MARBLE, 1); g.fillRect(rx, ry, rw, rh);
  const step = 38;
  g.lineStyle(1, MARBLE_SHADE, 0.7);
  if (horiz) {
    for (let x = rx; x < rx + rw; x += step) g.lineBetween(x, ry, x, ry + rh);
    g.lineBetween(rx, ry + rh / 2, rx + rw, ry + rh / 2);
  } else {
    for (let y = ry; y < ry + rh; y += step) g.lineBetween(rx, y, rx + rw, y);
    g.lineBetween(rx + rw / 2, ry, rx + rw / 2, ry + rh);
  }
  // Veining.
  for (let i = 0; i < (rw * rh) / 1800; i++) {
    const vx = rx + rng() * rw, vy = ry + rng() * rh;
    g.lineStyle(1, MARBLE_DARK, 0.18); g.lineBetween(vx, vy, vx + (rng() - 0.5) * 22, vy + (rng() - 0.5) * 14);
  }
  g.lineStyle(2, GOLD, 0.7); g.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4);
}

/** The Mana Font's basin (static): a marble rim, a step, and the liquid light in it. */
export function fontBasin(g: G, r: Rect, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  shadow(g, cx, r.y + r.h + 10, r.w * 1.1, 30, 0.2);
  g.fillStyle(MARBLE_DARK, 1); g.fillEllipse(cx, cy + 6, r.w + 54, r.h + 50);
  g.fillStyle(MARBLE_SHADE, 1); g.fillEllipse(cx, cy + 2, r.w + 50, r.h + 44);
  g.fillStyle(MARBLE, 1); g.fillEllipse(cx, cy, r.w + 40, r.h + 34);
  // Runes carved round the rim, gilded.
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    rune(g, cx + Math.cos(t) * (r.w / 2 + 12), cy + Math.sin(t) * (r.h / 2 + 10), 4, i * 5, GOLD_DARK, 0.8, 1.2);
  }
  g.fillStyle(FONT_DEEP, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(FONT_RIM, 1); g.fillEllipse(cx, cy - 2, r.w - 14, r.h - 12);
  g.fillStyle(FONT, 1); g.fillEllipse(cx, cy - 4, r.w * 0.72, r.h * 0.62);
  g.fillStyle(0xffffff, 0.8); g.fillEllipse(cx, cy - 6, r.w * 0.36, r.h * 0.28);
  // Rune-fish shapes far down, only as glyphs.
  for (let i = 0; i < 6; i++) rune(g, cx + (rng() - 0.5) * r.w * 0.7, cy + (rng() - 0.5) * r.h * 0.6, 5, i * 7, MANA_DEEP, 0.35, 1.2);
  g.lineStyle(2, GOLD, 0.9); g.strokeEllipse(cx, cy, r.w + 2, r.h + 2);
}

/** The Font's living surface: rings of light welling from the spring head, glints and drifting runes. */
export function fontSurface(g: G, r: Rect, t: number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2 - 4;
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.32 + i / 4) % 1;
    g.lineStyle(2 - ph * 1.4, 0xffffff, 0.55 * (1 - ph)); g.strokeEllipse(cx, cy, 20 + ph * r.w * 0.85, 8 + ph * r.h * 0.8);
  }
  // The spring head: a gout of light rising and falling.
  const h = 26 + Math.sin(t * 2.2) * 8;
  glow(g, cx, cy - h * 0.5, 30, FONT, 0.08, 4);
  g.fillStyle(0xffffff, 0.55); g.fillEllipse(cx, cy - h * 0.5, 12, h);
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.9 + i / 6) % 1;
    const a = i * 1.05;
    g.fillStyle(FONT, 0.8 * (1 - ph)); g.fillCircle(cx + Math.cos(a) * ph * 34, cy - h + ph * ph * 40, 2.4 * (1 - ph) + 0.6);
  }
  for (let i = 0; i < 5; i++) {
    const a = t * 0.15 + i * 1.26;
    const rr = 0.25 + ((i * 37) % 10) / 22;
    rune(g, cx + Math.cos(a) * r.w * rr, cy + 4 + Math.sin(a) * r.h * rr * 0.8, 4.5, i * 3 + Math.floor(t * 0.5), MANA_LIT, 0.45 + Math.sin(t * 2 + i) * 0.2, 1.3);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

/**
 * An observatory tower — useless for twenty-two years. A drum of white marble on a stepped base,
 * tall glass windows with no curtains, a brass dome with its slit open on the noon, and a long
 * telescope poking out with its objective capped in smoked glass and a little canvas hood, as if
 * that could keep the sun off it. A ladder to the gallery, and a star-chart bronze over the door
 * whose constellations nobody under twenty-two can name.
 */
export function observatory(g: G, x: number, y: number, s: number, rng: () => number, scopeA = -0.7): void {
  const w = 96 * s, h = 190 * s;
  shadow(g, x, y + 4, w * 1.5, 26 * s, 0.3);
  // Stepped base.
  for (let k = 0; k < 3; k++) {
    const bw = w + 30 * s - k * 10 * s;
    g.fillStyle(k % 2 ? MARBLE_SHADE : MARBLE_DARK, 1); g.fillRect(x - bw / 2, y - 8 * s * (k + 1), bw, 8 * s);
    g.fillStyle(MARBLE_LIT, 0.6); g.fillRect(x - bw / 2, y - 8 * s * (k + 1), bw, 1.5);
  }
  const top = y - 24 * s - h;
  // The drum: shaded round with a lit flank toward the sun overhead (everything lit from straight up).
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - w / 2, top, w, h);
  g.fillStyle(MARBLE, 1); g.fillRect(x - w / 2 + 8 * s, top, w - 16 * s, h);
  g.fillStyle(MARBLE_LIT, 0.8); g.fillRect(x - w * 0.15, top, w * 0.22, h);
  // Coursed stone.
  g.lineStyle(1, MARBLE_DARK, 0.35);
  for (let yy = top + 16 * s; yy < y - 24 * s; yy += 16 * s) g.lineBetween(x - w / 2, yy, x + w / 2, yy);
  for (let yy = top + 16 * s, k = 0; yy < y - 24 * s; yy += 16 * s, k++) {
    for (let xx = x - w / 2 + (k % 2 ? 12 : 24) * s; xx < x + w / 2; xx += 24 * s) g.lineBetween(xx, yy, xx, yy + 16 * s);
  }
  // A gilt string-course of runes round the drum.
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - w / 2 - 2, top + h * 0.42, w + 4, 8 * s);
  g.fillStyle(GOLD, 1); g.fillRect(x - w / 2 - 2, top + h * 0.42, w + 4, 5 * s);
  for (let i = 0; i < 6; i++) rune(g, x - w / 2 + 10 * s + i * (w - 20 * s) / 5, top + h * 0.42 + 2.5 * s, 2 * s, i * 2, GOLD_DARK, 1, 1);
  // Tall windows, glazed, no curtains (contraband), sun glare on each.
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.24, wy = top + h * 0.12;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(wx - 9 * s, wy - 2, 18 * s, 44 * s);
    g.fillStyle(0xbfe4f4, 1); g.fillRect(wx - 7 * s, wy, 14 * s, 40 * s);
    g.fillStyle(0xffffff, 0.7); g.fillTriangle(wx - 7 * s, wy + 40 * s, wx - 7 * s, wy + 18 * s, wx + 2 * s, wy);
    g.lineStyle(1.2, BRASS_DARK, 1); g.lineBetween(wx, wy, wx, wy + 40 * s); g.lineBetween(wx - 7 * s, wy + 20 * s, wx + 7 * s, wy + 20 * s);
    g.fillStyle(0xbfe4f4, 1); g.fillRect(wx - 7 * s, wy + h * 0.5, 14 * s, 30 * s);
    g.lineStyle(1.2, BRASS_DARK, 1); g.strokeRect(wx - 7 * s, wy + h * 0.5, 14 * s, 30 * s);
  }
  // The door, glass (Clarity), and the star-chart bronze over it.
  const dy = y - 24 * s;
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 16 * s, dy - 46 * s, 32 * s, 46 * s);
  g.fillStyle(0xcfeaf4, 1); g.fillRect(x - 13 * s, dy - 43 * s, 26 * s, 43 * s);
  g.lineStyle(1.5, BRASS, 1); g.lineBetween(x, dy - 43 * s, x, dy);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, dy - 60 * s, 13 * s);
  g.fillStyle(BRASS, 1); g.fillCircle(x, dy - 60 * s, 11 * s);
  for (let i = 0; i < 9; i++) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + (rng() - 0.5) * 16 * s, dy - 60 * s + (rng() - 0.5) * 16 * s, 1.1); }
  g.lineStyle(0.8, BRASS_LIT, 0.8); g.lineBetween(x - 5 * s, dy - 64 * s, x + 2 * s, dy - 58 * s); g.lineBetween(x + 2 * s, dy - 58 * s, x + 6 * s, dy - 63 * s);
  // Gallery round the top, iron railing.
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - w / 2 - 10 * s, top - 6 * s, w + 20 * s, 8 * s);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - w / 2 - 10 * s, top - 6 * s, w + 20 * s, 2);
  g.lineStyle(1.2, 0x3a3a44, 1); g.lineBetween(x - w / 2 - 10 * s, top - 18 * s, x + w / 2 + 10 * s, top - 18 * s);
  for (let xx = x - w / 2 - 8 * s; xx <= x + w / 2 + 8 * s; xx += 7 * s) g.lineBetween(xx, top - 18 * s, xx, top - 6 * s);
  // The brass dome with its slit open.
  const dr = w * 0.48;
  const dcy = top - 8 * s;
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, dcy, dr * 2 + 4, dr * 1.8 + 4);
  g.fillStyle(BRASS, 1); g.beginPath(); g.arc(x, dcy, dr, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(BRASS_LIT, 0.8); g.beginPath(); g.arc(x - dr * 0.25, dcy, dr * 0.55, Math.PI * 1.15, Math.PI * 1.55, false); g.lineTo(x - dr * 0.25, dcy); g.closePath(); g.fillPath();
  g.lineStyle(1, BRASS_DARK, 0.6);
  for (let k = 1; k < 6; k++) { const a = Math.PI + (k / 6) * Math.PI; g.lineBetween(x + Math.cos(a) * dr, dcy + Math.sin(a) * dr, x, dcy - dr); }
  // The slit, dark inside.
  g.fillStyle(0x1c1c28, 1); g.fillRect(x - 6 * s, dcy - dr, 12 * s, dr);
  // The telescope out of the slit, capped in smoked glass with a canvas hood.
  const tl = 78 * s;
  const tx = x + Math.cos(scopeA) * tl, ty = dcy - dr * 0.5 + Math.sin(scopeA) * tl;
  g.lineStyle(10 * s, BRASS_DARK, 1); g.lineBetween(x, dcy - dr * 0.5, tx, ty);
  g.lineStyle(7 * s, BRASS, 1); g.lineBetween(x, dcy - dr * 0.5, tx, ty);
  g.lineStyle(2 * s, BRASS_LIT, 0.9); g.lineBetween(x, dcy - dr * 0.5 - 2, tx, ty - 2);
  for (const k of [0.3, 0.6]) { g.fillStyle(BRASS_DARK, 1); g.fillCircle(x + (tx - x) * k, (dcy - dr * 0.5) + (ty - dcy + dr * 0.5) * k, 5 * s); }
  g.fillStyle(SMOKED, 1); g.fillCircle(tx, ty, 6.5 * s);
  g.fillStyle(0x6a6a88, 0.8); g.fillCircle(tx - 1.5, ty - 1.5, 2.5 * s);
  g.fillStyle(CANVAS, 1); g.fillTriangle(tx - 7 * s, ty - 6 * s, tx + 9 * s, ty - 4 * s, tx + 2 * s, ty - 14 * s);
  // A sun-vane on the dome's crown.
  g.lineStyle(1.5, GOLD_DARK, 1); g.lineBetween(x, dcy - dr, x, dcy - dr - 18 * s);
  g.fillStyle(GOLD, 1); g.fillCircle(x, dcy - dr - 20 * s, 4 * s);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineStyle(1, GOLD, 1); g.lineBetween(x, dcy - dr - 20 * s, x + Math.cos(a) * 7 * s, dcy - dr - 20 * s + Math.sin(a) * 7 * s); }
  // A ladder up the drum.
  g.lineStyle(1.5, TIMBER_DARK, 1);
  g.lineBetween(x + w / 2 - 14 * s, y - 24 * s, x + w / 2 - 14 * s, top - 6 * s); g.lineBetween(x + w / 2 - 4 * s, y - 24 * s, x + w / 2 - 4 * s, top - 6 * s);
  for (let yy = y - 30 * s; yy > top; yy -= 9 * s) g.lineBetween(x + w / 2 - 14 * s, yy, x + w / 2 - 4 * s, yy);
}

/**
 * The Spellwrights' Academy — Prince Sigil's hall. A wide marble front of fluted columns under a
 * pediment carved with an open book and a sun, arched windows of leaded glass, and over it all the
 * great gilded lecture dome, ribbed, with an oculus that drops a shaft of noon straight onto the
 * lecture floor. Banners of the Academy (a chalk circle on ultramarine) hang between the columns.
 */
export function academy(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = 130;
  const x0 = x - w / 2;
  shadow(g, x, y + 8, w * 1.1, 34, 0.25);
  // Steps.
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? MARBLE : MARBLE_SHADE, 1); g.fillRect(x0 - 10 - k * 5, y - 6 - (3 - k) * 7, w + 20 + k * 10, 7);
    g.fillStyle(MARBLE_LIT, 0.7); g.fillRect(x0 - 10 - k * 5, y - 6 - (3 - k) * 7, w + 20 + k * 10, 1.5);
  }
  const base = y - 34;
  // The wall behind the colonnade.
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, base - h, w, h);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 + 4, base - h + 4, w - 8, h - 4);
  // Arched leaded windows between the columns.
  const cols = Math.max(6, Math.round(w / 64));
  const bay = w / cols;
  for (let i = 0; i < cols; i++) {
    const cx = x0 + bay * (i + 0.5);
    if (Math.abs(cx - x) < bay * 0.6) continue;
    const ww = bay * 0.42, wh = h * 0.56, wy = base - h * 0.78;
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - ww / 2 - 2, wy, ww + 4, wh + 2);
    g.beginPath(); g.arc(cx, wy, ww / 2 + 2, Math.PI, 0, false); g.fillPath();
    g.fillStyle(0xb8dcef, 1); g.fillRect(cx - ww / 2, wy, ww, wh);
    g.beginPath(); g.arc(cx, wy, ww / 2, Math.PI, 0, false); g.fillPath();
    // Leading: a diamond lattice, and one pane of violet glass.
    g.fillStyle(VIOLET_LIT, 0.55); g.fillRect(cx - ww / 2, wy + wh * 0.35, ww / 2, wh * 0.2);
    g.lineStyle(0.8, 0x3a3a44, 0.8);
    for (let d = -wh; d < wh; d += 8) {
      g.lineBetween(cx - ww / 2, wy + d, cx + ww / 2, wy + d + ww);
      g.lineBetween(cx + ww / 2, wy + d, cx - ww / 2, wy + d + ww);
    }
    g.fillStyle(MARBLE, 1); g.fillRect(cx - ww / 2 - 2, wy + wh, ww + 4, 2);
    g.fillStyle(0xffffff, 0.5); g.fillTriangle(cx - ww / 2, wy + wh, cx - ww / 2, wy + wh * 0.4, cx, wy);
  }
  // Great doors (glass, by law) in the middle under a sigil fanlight.
  const dw = bay * 0.9, dh = h * 0.7;
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - dw / 2 - 4, base - dh - 4, dw + 8, dh + 4);
  g.fillStyle(0xcfeaf4, 1); g.fillRect(x - dw / 2, base - dh, dw, dh);
  g.lineStyle(2, BRASS, 1); g.lineBetween(x, base - dh, x, base); g.strokeRect(x - dw / 2, base - dh, dw, dh);
  g.fillStyle(0xffffff, 0.45); g.fillRect(x - dw / 2 + 3, base - dh + 3, 5, dh - 6);
  g.fillStyle(0xcfeaf4, 1); g.beginPath(); g.arc(x, base - dh - 4, dw / 2, Math.PI, 0, false); g.fillPath();
  g.lineStyle(1.2, GOLD_DARK, 1);
  for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; g.lineBetween(x, base - dh - 4, x + Math.cos(a) * dw / 2, base - dh - 4 + Math.sin(a) * dw / 2); }
  // The colonnade: fluted columns with gilt capitals.
  for (let i = 0; i <= cols; i++) {
    const cx = x0 + bay * i;
    const cw = 14;
    g.fillStyle(MARBLE_SHADE, 1); g.fillRect(cx - cw / 2, base - h, cw, h);
    g.fillStyle(MARBLE_LIT, 1); g.fillRect(cx - cw / 2 + 2, base - h, cw * 0.4, h);
    g.lineStyle(0.8, MARBLE_DARK, 0.5); for (let f = 1; f < 4; f++) g.lineBetween(cx - cw / 2 + f * cw / 4, base - h + 8, cx - cw / 2 + f * cw / 4, base - 6);
    g.fillStyle(GOLD, 1); g.fillRect(cx - cw / 2 - 4, base - h - 2, cw + 8, 7);
    g.fillStyle(GOLD_LIT, 0.8); g.fillRect(cx - cw / 2 - 4, base - h - 2, cw + 8, 2);
    g.fillStyle(MARBLE_DARK, 1); g.fillRect(cx - cw / 2 - 3, base - 6, cw + 6, 6);
  }
  // Banners between alternate columns: a chalk circle on ultramarine.
  for (let i = 1; i < cols; i += 2) {
    const bx = x0 + bay * i + bay * 0.5;
    if (Math.abs(bx - x) < bay) continue;
    g.fillStyle(ROBE_DARK, 1); g.fillRect(bx - 11, base - h + 8, 22, 54);
    g.fillStyle(ROBE, 1); g.fillRect(bx - 10, base - h + 8, 20, 52);
    g.fillTriangle(bx - 10, base - h + 60, bx + 10, base - h + 60, bx, base - h + 70);
    g.lineStyle(1.2, CHALK, 0.95); g.strokeCircle(bx, base - h + 32, 7);
    g.lineBetween(bx - 6, base - h + 36, bx, base - h + 25); g.lineBetween(bx, base - h + 25, bx + 6, base - h + 36); g.lineBetween(bx - 6, base - h + 36, bx + 6, base - h + 36);
  }
  // Entablature with a frieze of runes.
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0 - 10, base - h - 20, w + 20, 20);
  g.fillStyle(MARBLE, 1); g.fillRect(x0 - 10, base - h - 22, w + 20, 14);
  for (let i = 0; i < w / 20; i++) rune(g, x0 + 6 + i * 20, base - h - 15, 4, i * 3, GOLD_DARK, 0.9, 1.1);
  // The pediment: an open book with a sun rising out of it.
  const pw = w * 0.42, ph = 50;
  g.fillStyle(MARBLE_SHADE, 1); g.fillTriangle(x - pw / 2 - 6, base - h - 20, x + pw / 2 + 6, base - h - 20, x, base - h - 22 - ph - 4);
  g.fillStyle(MARBLE, 1); g.fillTriangle(x - pw / 2, base - h - 22, x + pw / 2, base - h - 22, x, base - h - 22 - ph);
  const by = base - h - 34;
  g.fillStyle(GOLD, 1); g.fillCircle(x, by - 10, 10);
  for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.lineStyle(1.5, GOLD, 1); g.lineBetween(x + Math.cos(a) * 12, by - 10 + Math.sin(a) * 12, x + Math.cos(a) * 19, by - 10 + Math.sin(a) * 19); }
  g.fillStyle(MARBLE_LIT, 1); g.fillTriangle(x, by, x - 22, by - 4, x - 22, by + 6); g.fillTriangle(x, by, x + 22, by - 4, x + 22, by + 6);
  g.lineStyle(1, GOLD_DARK, 1); g.lineBetween(x, by - 2, x, by + 4); g.strokeTriangle(x, by, x - 22, by - 4, x - 22, by + 6); g.strokeTriangle(x, by, x + 22, by - 4, x + 22, by + 6);
  // The lecture dome behind: drum, ribs, gilding, lantern and oculus.
  const dcx = x, dcy = base - h - 22 - ph * 0.3, dr = Math.min(150, w * 0.26);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(dcx - dr * 0.92, dcy - 26, dr * 1.84, 26);
  for (let k = 0; k < 12; k++) { const px = dcx - dr * 0.86 + k * (dr * 1.72) / 11; g.fillStyle(MARBLE_LIT, 1); g.fillRect(px - 2, dcy - 24, 4, 22); }
  g.fillStyle(GOLD_DARK, 1); g.beginPath(); g.arc(dcx, dcy - 26, dr * 0.9, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(GOLD, 1); g.beginPath(); g.arc(dcx, dcy - 27, dr * 0.86, Math.PI, 0, false); g.closePath(); g.fillPath();
  g.fillStyle(GOLD_LIT, 0.55); g.beginPath(); g.arc(dcx - dr * 0.2, dcy - 27, dr * 0.6, Math.PI * 1.1, Math.PI * 1.5, false); g.lineTo(dcx - dr * 0.2, dcy - 27); g.closePath(); g.fillPath();
  g.lineStyle(2, GOLD_DARK, 0.9);
  for (let k = 1; k < 10; k++) {
    const a = Math.PI + (k / 10) * Math.PI;
    g.lineBetween(dcx + Math.cos(a) * dr * 0.86, dcy - 27 + Math.sin(a) * dr * 0.86, dcx + Math.cos(a) * dr * 0.12, dcy - 27 - dr * 0.82);
  }
  // Gold leaf flaking in places — patched with chalk-white.
  for (let i = 0; i < 10; i++) { const a = Math.PI + 0.2 + rng() * (Math.PI - 0.4), d = rng() * dr * 0.8; g.fillStyle(rng() < 0.5 ? GOLD_LIT : GOLD_DARK, 0.6); g.fillRect(dcx + Math.cos(a) * d, dcy - 27 + Math.sin(a) * d, 3, 2); }
  // The lantern on top, open: the oculus.
  g.fillStyle(MARBLE, 1); g.fillRect(dcx - 14, dcy - 27 - dr * 0.86 - 22, 28, 24);
  g.fillStyle(0x1c1c28, 0.7); g.fillRect(dcx - 9, dcy - 27 - dr * 0.86 - 18, 18, 16);
  g.fillStyle(GOLD, 1); g.fillTriangle(dcx - 16, dcy - 27 - dr * 0.86 - 22, dcx + 16, dcy - 27 - dr * 0.86 - 22, dcx, dcy - 27 - dr * 0.86 - 40);
  g.lineStyle(1.5, GOLD_DARK, 1); g.lineBetween(dcx, dcy - 27 - dr * 0.86 - 40, dcx, dcy - 27 - dr * 0.86 - 52);
  g.lineStyle(1.2, CHALK, 1); g.strokeCircle(dcx, dcy - 27 - dr * 0.86 - 56, 4);
}

/**
 * An anchor-pylon: one of the brass obelisks round the Anchor Circle that hold the Heliostat's
 * mirrors to the sun. Engraved brass on a marble plinth, a cradle at the top gripping a mana
 * crystal, and chalk tally-marks of the hours it has held (all of them).
 */
export function anchorPylon(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 40 * s, 12 * s, 0.3);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 16 * s, y - 14 * s, 32 * s, 14 * s);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 15 * s, y - 15 * s, 30 * s, 11 * s);
  rune(g, x, y - 9 * s, 3.5 * s, 4, GOLD_DARK, 1, 1.2);
  // The obelisk, tapering.
  const top = y - 96 * s;
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 10 * s, y - 15 * s, x + 10 * s, y - 15 * s, x + 5 * s, top);
  g.fillTriangle(x - 10 * s, y - 15 * s, x + 5 * s, top, x - 5 * s, top);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 8 * s, y - 15 * s, x + 2 * s, y - 15 * s, x - 1 * s, top);
  g.fillStyle(BRASS_LIT, 0.8); g.fillTriangle(x - 7 * s, y - 15 * s, x - 3 * s, y - 15 * s, x - 3 * s, top);
  for (let k = 0; k < 4; k++) rune(g, x, y - 28 * s - k * 16 * s, 3 * s, k * 2 + 1, BRASS_DARK, 0.9, 1.1);
  // The cradle and crystal.
  g.lineStyle(2 * s, BRASS_DARK, 1);
  g.lineBetween(x - 5 * s, top, x - 9 * s, top - 10 * s); g.lineBetween(x + 5 * s, top, x + 9 * s, top - 10 * s);
  g.fillStyle(MANA_DEEP, 1); g.fillTriangle(x - 6 * s, top - 6 * s, x + 6 * s, top - 6 * s, x, top - 24 * s);
  g.fillTriangle(x - 6 * s, top - 6 * s, x + 6 * s, top - 6 * s, x, top + 2 * s);
  g.fillStyle(MANA, 1); g.fillTriangle(x - 4 * s, top - 6 * s, x + 1 * s, top - 6 * s, x - 1 * s, top - 21 * s);
  g.fillStyle(MANA_LIT, 0.9); g.fillTriangle(x - 3 * s, top - 7 * s, x - 1 * s, top - 7 * s, x - 2 * s, top - 16 * s);
  // Chalk tallies on the plinth.
  g.lineStyle(1, CHALK, 0.8);
  for (let k = 0; k < 4; k++) g.lineBetween(x + 6 * s + k * 2, y - 13 * s, x + 6 * s + k * 2, y - 6 * s);
  g.lineBetween(x + 5 * s, y - 8 * s, x + 14 * s, y - 11 * s);
}

/**
 * A potion stall: a timber counter under an awning slit into ribbons (an awning may not cast shade),
 * racks of stoppered bottles glowing in the glare, an alembic on a little burner, and a chalk price
 * board.
 */
export function potionStall(g: G, x: number, y: number, rng: () => number, hue = 0): void {
  const w = 120;
  shadow(g, x, y + 3, w * 1.1, 18, 0.25);
  // Back rack.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 6, y - 92, w - 12, 60);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 8, y - 90, w - 16, 56);
  for (let row = 0; row < 3; row++) {
    const ry = y - 86 + row * 18;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 8, ry + 14, w - 16, 3);
    for (let k = 0; k < 7; k++) {
      const bx = x - w / 2 + 16 + k * 14 + (row % 2) * 4;
      if (bx > x + w / 2 - 14) continue;
      const c = POTIONS[(k + row + hue) % POTIONS.length];
      const tall = rng() < 0.5;
      g.fillStyle(dim(c, 0.3), 1); g.fillRect(bx - 3, ry + (tall ? 0 : 5), 6, tall ? 14 : 9);
      g.fillStyle(c, 1); g.fillRect(bx - 2.5, ry + (tall ? 4 : 8), 5, tall ? 9 : 5);
      g.fillStyle(0xffffff, 0.7); g.fillRect(bx - 2, ry + (tall ? 1 : 6), 1, 3);
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(bx - 1.5, ry + (tall ? -2 : 3), 3, 2);
    }
  }
  // Counter.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - 30, w, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 2, y - 28, w - 4, 26);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w / 2, y - 32, w, 5);
  g.lineStyle(1, TIMBER_DARK, 0.5); for (let k = 1; k < 4; k++) g.lineBetween(x - w / 2 + k * w / 4, y - 27, x - w / 2 + k * w / 4, y - 2);
  // An alembic over a burner on the counter.
  const ax = x + w * 0.22, ay = y - 32;
  g.fillStyle(0x3a3a44, 1); g.fillRect(ax - 6, ay - 6, 12, 6);
  g.fillStyle(0x9ad0ff, 0.9); g.fillTriangle(ax - 3, ay - 6, ax + 3, ay - 6, ax, ay - 2);
  g.fillStyle(0xd8f0f8, 0.6); g.fillCircle(ax, ay - 16, 9);
  g.fillStyle(POTIONS[(hue + 1) % POTIONS.length], 0.85); g.fillEllipse(ax, ay - 12, 15, 8);
  g.lineStyle(1.5, 0xd8f0f8, 0.9); g.strokeCircle(ax, ay - 16, 9);
  g.lineStyle(2, 0xd8f0f8, 0.9); g.lineBetween(ax + 2, ay - 25, ax + 4, ay - 32); g.lineBetween(ax + 4, ay - 32, ax + 20, ay - 22);
  g.fillStyle(0xd8f0f8, 0.6); g.fillEllipse(ax + 22, ay - 6, 8, 12);
  // Chalk price board leaning on the front.
  g.fillStyle(SLATE_DEEP, 1); g.fillRect(x - w / 2 + 10, y - 26, 30, 22);
  g.lineStyle(1, TIMBER, 1); g.strokeRect(x - w / 2 + 10, y - 26, 30, 22);
  g.lineStyle(1, CHALK, 0.85);
  for (let k = 0; k < 3; k++) { g.lineBetween(x - w / 2 + 14, y - 21 + k * 6, x - w / 2 + 26, y - 21 + k * 6); g.strokeCircle(x - w / 2 + 33, y - 21 + k * 6, 1.5); }
  // Posts and the ribboned awning.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 2, y - 118, 4, 118); g.fillRect(x + w / 2 - 2, y - 118, 4, 118);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 - 4, y - 122, w + 8, 6);
  for (let k = 0; k < 14; k++) {
    const rx = x - w / 2 + 2 + k * (w - 4) / 13;
    const len = 18 + ((k * 7) % 5) * 3;
    g.fillStyle(k % 2 ? CANVAS : VIOLET_LIT, 0.95); g.fillRect(rx - 3, y - 116, 6, len);
    g.fillTriangle(rx - 3, y - 116 + len, rx + 3, y - 116 + len, rx, y - 112 + len);
  }
}

/** A cat, sitting or crouched to pounce; `face` ±1. */
export function drawCat(g: G, x: number, y: number, s: number, face: number, coat = 0x2a2630, eye = 0xf6dc52, crouch = 0): void {
  shadow(g, x, y + 1, 22 * s, 6 * s, 0.25);
  const by = y - 8 * s + crouch * 3 * s;
  // Tail curling.
  g.lineStyle(3 * s, coat, 1);
  g.beginPath(); g.arc(x - face * 10 * s, by - 2 * s, 7 * s, face > 0 ? 0 : Math.PI, face > 0 ? Math.PI * 1.4 : Math.PI * 2.4, false); g.strokePath();
  g.fillStyle(coat, 1); g.fillEllipse(x, by, (16 + crouch * 6) * s, (12 - crouch * 3) * s);
  const hx = x + face * (6 + crouch * 5) * s, hy = by - (9 - crouch * 4) * s;
  g.fillCircle(hx, hy, 6 * s);
  g.fillTriangle(hx - 5 * s, hy - 3 * s, hx - 2 * s, hy - 4 * s, hx - 5 * s, hy - 10 * s);
  g.fillTriangle(hx + 5 * s, hy - 3 * s, hx + 2 * s, hy - 4 * s, hx + 5 * s, hy - 10 * s);
  g.fillStyle(lit(coat, 0.25), 1); g.fillEllipse(hx - 1.5 * s, hy - 2 * s, 4 * s, 2 * s);
  g.fillStyle(eye, 1); g.fillEllipse(hx - 2.2 * s + face * 0.8 * s, hy - 0.5 * s, 2.4 * s, 2 * s); g.fillEllipse(hx + 2.2 * s + face * 0.8 * s, hy - 0.5 * s, 2.4 * s, 2 * s);
  g.fillStyle(0x000000, 1); g.fillRect(hx - 2.4 * s + face * 0.8 * s, hy - 1.4 * s, 0.6 * s, 1.8 * s); g.fillRect(hx + 2 * s + face * 0.8 * s, hy - 1.4 * s, 0.6 * s, 1.8 * s);
  g.lineStyle(0.6, 0xd8d8d8, 0.7); g.lineBetween(hx + face * 3 * s, hy + 1.5 * s, hx + face * 9 * s, hy + 0.5 * s); g.lineBetween(hx + face * 3 * s, hy + 2 * s, hx + face * 9 * s, hy + 3 * s);
}

/** An owl, perched, wings folded or spread (`spread` 0..1). */
export function drawOwl(g: G, x: number, y: number, s: number, plume = 0xc8a878, eye = 0xf0a838, spread = 0): void {
  shadow(g, x, y + 1, 18 * s, 5 * s, 0.22);
  const by = y - 12 * s;
  if (spread > 0) {
    for (const k of [-1, 1]) {
      g.fillStyle(dim(plume, 0.2), 1);
      g.fillTriangle(x + k * 5 * s, by - 4 * s, x + k * (8 + spread * 18) * s, by - (6 + spread * 8) * s, x + k * (6 + spread * 12) * s, by + 6 * s);
      g.lineStyle(0.8, dim(plume, 0.4), 0.8);
      for (let f = 0; f < 3; f++) g.lineBetween(x + k * 6 * s, by, x + k * (8 + spread * (10 + f * 3)) * s, by - (2 + f * 3) * spread * s);
    }
  }
  g.fillStyle(dim(plume, 0.15), 1); g.fillEllipse(x, by, 13 * s, 17 * s);
  g.fillStyle(lit(plume, 0.35), 1); g.fillEllipse(x, by + 2 * s, 8 * s, 10 * s);
  g.lineStyle(0.7, dim(plume, 0.3), 0.7); for (let k = 0; k < 3; k++) g.lineBetween(x - 2 * s, by + k * 3 * s, x + 2 * s, by + 1 * s + k * 3 * s);
  g.fillStyle(plume, 1); g.fillCircle(x, by - 9 * s, 6.5 * s);
  g.fillTriangle(x - 6 * s, by - 12 * s, x - 3 * s, by - 13 * s, x - 6 * s, by - 18 * s);
  g.fillTriangle(x + 6 * s, by - 12 * s, x + 3 * s, by - 13 * s, x + 6 * s, by - 18 * s);
  g.fillStyle(lit(plume, 0.5), 1); g.fillCircle(x - 2.6 * s, by - 9 * s, 2.8 * s); g.fillCircle(x + 2.6 * s, by - 9 * s, 2.8 * s);
  g.fillStyle(eye, 1); g.fillCircle(x - 2.6 * s, by - 9 * s, 1.8 * s); g.fillCircle(x + 2.6 * s, by - 9 * s, 1.8 * s);
  g.fillStyle(0x000000, 1); g.fillCircle(x - 2.6 * s, by - 9 * s, 0.8 * s); g.fillCircle(x + 2.6 * s, by - 9 * s, 0.8 * s);
  g.fillStyle(0x6a4a2a, 1); g.fillTriangle(x - 1 * s, by - 7 * s, x + 1 * s, by - 7 * s, x, by - 4.5 * s);
  g.fillStyle(0x6a4a2a, 1); g.fillRect(x - 3 * s, y - 2 * s, 2 * s, 2 * s); g.fillRect(x + 1 * s, y - 2 * s, 2 * s, 2 * s);
}

/** A toad, squat and warty, its throat puffing (`gulp` 0..1). */
export function drawToad(g: G, x: number, y: number, s: number, skin = 0x7a8a3a, gulp = 0): void {
  shadow(g, x, y + 1, 22 * s, 6 * s, 0.25);
  const by = y - 6 * s;
  g.fillStyle(dim(skin, 0.25), 1);
  g.fillEllipse(x - 8 * s, by + 3 * s, 8 * s, 5 * s); g.fillEllipse(x + 8 * s, by + 3 * s, 8 * s, 5 * s);
  g.fillStyle(skin, 1); g.fillEllipse(x, by, 20 * s, 13 * s);
  g.fillStyle(lit(skin, 0.4), 1); g.fillEllipse(x, by + 3 * s + gulp * 1.5 * s, (10 + gulp * 6) * s, (5 + gulp * 5) * s);
  for (let k = 0; k < 6; k++) { g.fillStyle(dim(skin, 0.3), 0.8); g.fillCircle(x - 6 * s + ((k * 5) % 12) * s, by - 3 * s + ((k * 3) % 4) * s, 1 * s); }
  for (const k of [-1, 1]) {
    g.fillStyle(skin, 1); g.fillCircle(x + k * 4.5 * s, by - 5.5 * s, 3.2 * s);
    g.fillStyle(0xf0c838, 1); g.fillCircle(x + k * 4.5 * s, by - 5.8 * s, 2.2 * s);
    g.fillStyle(0x000000, 1); g.fillRect(x + k * 4.5 * s - 1.4 * s, by - 6.2 * s, 2.8 * s, 0.9 * s);
  }
  g.lineStyle(0.8, dim(skin, 0.4), 1); g.beginPath(); g.arc(x, by - 1 * s, 6 * s, 0.3, Math.PI - 0.3, false); g.strokePath();
}

/**
 * A familiar-seller's stall: a timber frame hung with wicker cages and perches. `kind` picks what
 * is for sale this side — cats on cushions, owls on perches, toads in a damp trough.
 */
export function familiarStall(g: G, x: number, y: number, kind: 'cat' | 'owl' | 'toad', rng: () => number): void {
  const w = 110;
  shadow(g, x, y + 3, w * 1.1, 18, 0.25);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - 104, 4, 104); g.fillRect(x + w / 2 - 4, y - 104, 4, 104);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 - 4, y - 108, w + 8, 6);
  // A sign: an eye in a circle, the familiar-market's mark.
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 18, y - 124, 36, 16);
  g.lineStyle(1, TIMBER_DARK, 1); g.strokeRect(x - 18, y - 124, 36, 16);
  g.lineStyle(1.2, VIOLET_DARK, 1); g.strokeEllipse(x, y - 116, 20, 9); g.fillStyle(VIOLET_DARK, 1); g.fillCircle(x, y - 116, 2.5);
  // Counter / trough.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2, y - 26, w, 26);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 2, y - 24, w - 4, 22);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w / 2, y - 28, w, 4);
  if (kind === 'toad') {
    g.fillStyle(0x4a6a5a, 1); g.fillRect(x - w / 2 + 6, y - 27, w - 12, 6);
    for (let k = 0; k < 4; k++) drawToad(g, x - 36 + k * 24, y - 26, 0.8, [0x7a8a3a, 0x8a6a3a, 0x5a7a4a, 0x9a8a4a][k], k === 2 ? 0.6 : 0);
  } else if (kind === 'cat') {
    for (let k = 0; k < 3; k++) {
      const cx = x - 32 + k * 32;
      g.fillStyle([VIOLET, ROBE, POTIONS[3]][k], 1); g.fillEllipse(cx, y - 28, 24, 7);
      drawCat(g, cx, y - 29, 0.85, k % 2 ? -1 : 1, [0xe8e2d6, 0xd8823a, 0x8a8a92][k], [0x6ad0e8, 0x6ad86a, 0xf6dc52][k]);
    }
  } else {
    // Perches with owls.
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - w / 2 + 6, y - 60, x + w / 2 - 6, y - 60);
    for (let k = 0; k < 3; k++) drawOwl(g, x - 32 + k * 32, y - 60, 0.85, [0xc8a878, 0xe8e0d0, 0x8a6a48][k], [0xf0a838, 0xf6dc52, 0xe05a3a][k], 0);
  }
  // Hanging wicker cages.
  for (const k of [-1, 1]) {
    const cx = x + k * 36, cy = y - 92;
    g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(cx, y - 102, cx, cy - 12);
    g.fillStyle(0x000000, 0.08); g.fillEllipse(cx, cy, 22, 26);
    g.lineStyle(1, TIMBER_LIT, 1); g.strokeEllipse(cx, cy, 22, 26);
    for (let b = -2; b <= 2; b++) g.lineBetween(cx + b * 4, cy - 12, cx + b * 4.5, cy + 12);
    if (rng() < 0.7) { g.fillStyle(0xf0d040, 1); g.fillCircle(cx + 1, cy + 2, 3); g.fillStyle(0xe05a3a, 1); g.fillTriangle(cx + 4, cy + 2, cx + 7, cy + 1, cx + 4, cy + 3); }
  }
}

/** A floating runestone (drawn every frame for the bob): its shadow pinned to the ground, the stone above. */
export function runestone(g: G, x: number, y: number, s: number, idx: number, t: number, phase: number): void {
  const bob = Math.sin(t * 1.3 + phase) * 5 * s;
  const lift = 26 * s + bob;
  g.fillStyle(0x000000, 0.22 - bob * 0.008); g.fillEllipse(x, y, 26 * s, 7 * s);
  const by = y - lift;
  const tilt = Math.sin(t * 0.7 + phase) * 0.12;
  const hw = 9 * s, hh = 20 * s;
  const cs = Math.cos(tilt), sn = Math.sin(tilt);
  const pt = (px: number, py: number) => ({ x: x + px * cs - py * sn, y: by + px * sn + py * cs });
  const a = pt(-hw, 0), b = pt(hw, 0), c = pt(hw * 0.8, -hh), d = pt(0, -hh * 1.2), e = pt(-hw * 0.8, -hh);
  g.fillStyle(SLATE_DEEP, 1); g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y); g.fillTriangle(a.x, a.y, c.x, c.y, e.x, e.y); g.fillTriangle(e.x, e.y, c.x, c.y, d.x, d.y);
  const a2 = pt(-hw + 2, -1), c2 = pt(hw * 0.4, -hh + 1), e2 = pt(-hw * 0.8 + 1, -hh + 1);
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(a2.x, a2.y, c2.x, c2.y, e2.x, e2.y);
  const m = pt(0, -hh * 0.55);
  const pulse = 0.55 + Math.sin(t * 2.4 + phase * 2) * 0.35;
  glow(g, m.x, m.y, 12 * s, MANA, 0.05 * pulse, 2);
  rune(g, m.x, m.y, 6 * s, idx, MANA_LIT, 0.6 + pulse * 0.4, 1.6);
  // A trickle of motes falling from its underside.
  const ph = (t * 0.8 + phase) % 1;
  g.fillStyle(MANA_LIT, 0.6 * (1 - ph)); g.fillCircle(x + Math.sin(phase * 3) * 3, by + ph * lift * 0.9, 1.3);
}

/**
 * A street slate-board on an easel: an Academy proof chalked up in the sun — circles, ruled lines,
 * a sigil being worked out, and "Q.E.N." (quod erat noonstratum) under it.
 */
export function slateBoard(g: G, x: number, y: number, w: number, rng: () => number): void {
  const h = w * 0.62;
  shadow(g, x, y + 2, w * 0.9, 10, 0.22);
  g.lineStyle(3, TIMBER_DARK, 1);
  g.lineBetween(x - w * 0.36, y, x - w * 0.24, y - h - 30); g.lineBetween(x + w * 0.36, y, x + w * 0.24, y - h - 30); g.lineBetween(x, y - 4, x, y - h - 20);
  const top = y - h - 26;
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 - 3, top - 3, w + 6, h + 6);
  g.fillStyle(SLATE_DEEP, 1); g.fillRect(x - w / 2, top, w, h);
  g.fillStyle(SLATE_DARK, 0.4); for (let i = 0; i < 5; i++) g.fillEllipse(x - w / 2 + rng() * w, top + rng() * h, 20, 6);
  g.lineStyle(1, CHALK, 0.9); g.strokeCircle(x - w * 0.22, top + h * 0.45, h * 0.28);
  rune(g, x - w * 0.22, top + h * 0.45, h * 0.16, Math.floor(rng() * 8), CHALK, 0.9, 1);
  g.lineBetween(x - w * 0.22 - h * 0.28, top + h * 0.45, x - w * 0.22 + h * 0.28, top + h * 0.45);
  for (let k = 0; k < 4; k++) {
    const ly = top + 8 + k * (h - 16) / 4;
    let lx = x + 2;
    while (lx < x + w / 2 - 6) { const seg = 3 + rng() * 9; g.lineBetween(lx, ly, lx + seg, ly + (rng() - 0.5) * 2); lx += seg + 3; }
  }
  g.fillStyle(CHALK, 1); g.fillRect(x - w / 2 + 4, top + h + 1, 8, 2);
}

/** An orrery on a marble plinth: brass rings, a gold sun at the hub, and planets nobody has seen move. */
export function orrery(g: G, x: number, y: number, s = 1): void {
  shadow(g, x, y + 2, 50 * s, 12 * s, 0.28);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 14 * s, y - 30 * s, 28 * s, 30 * s);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 12 * s, y - 30 * s, 24 * s, 28 * s);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 16 * s, y - 34 * s, 32 * s, 5 * s);
  const cy = y - 62 * s;
  g.lineStyle(2 * s, BRASS_DARK, 1); g.lineBetween(x, y - 34 * s, x, cy);
  for (const [rx, ry, rot] of [[30, 10, 0.3], [24, 22, -0.5], [34, 6, 0]] as [number, number, number][]) {
    g.lineStyle(1.6 * s, BRASS, 1);
    g.strokeEllipse(x, cy, rx * 2 * s, ry * 2 * s);
    const px = x + Math.cos(rot * 5) * rx * s, py = cy + Math.sin(rot * 5) * ry * s;
    g.fillStyle([POTIONS[2], SLATE_LIT, POTIONS[0]][Math.round(rx) % 3], 1); g.fillCircle(px, py, 3 * s);
  }
  g.fillStyle(GOLD, 1); g.fillCircle(x, cy, 6 * s);
  g.fillStyle(GOLD_LIT, 1); g.fillCircle(x - 1.5 * s, cy - 1.5 * s, 2.5 * s);
}

/** The court's waystone: a slate stele with a mana crystal set in a gilt ring. */
export function arcaneWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 12, 0.3);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 18, y - 10, 36, 10);
  g.fillStyle(SLATE_DEEP, 1); g.fillTriangle(x - 14, y - 10, x + 14, y - 10, x + 10, y - 62); g.fillTriangle(x - 14, y - 10, x + 10, y - 62, x - 10, y - 62);
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - 10, y - 62, x + 10, y - 62, x, y - 72);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 12, y - 10, x - 4, y - 10, x - 8, y - 60);
  g.lineStyle(2, GOLD, 1); g.strokeCircle(x, y - 40, 9);
  g.fillStyle(MANA, 1); g.fillCircle(x, y - 40, 6);
  g.fillStyle(MANA_LIT, 1); g.fillCircle(x - 2, y - 42, 2.4);
  rune(g, x, y - 22, 3, 5, GOLD, 0.9, 1.1);
  rune(g, x, y - 56, 2.5, 2, GOLD, 0.8, 1);
}

/** A notice board of the Bureau of Clarity, glass-fronted (of course), its decrees in the sun. */
export function decreeBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 60, 10, 0.25);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 4, y - 40, 8, 40);
  g.fillStyle(GOLD_DARK, 1); g.fillRect(x - 32, y - 92, 64, 54);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 29, y - 89, 58, 48);
  for (let k = 0; k < 3; k++) {
    const px = x - 26 + k * 18, py = y - 86 + (k % 2) * 4;
    g.fillStyle(0xfaf4e0, 1); g.fillRect(px, py, 15, 22 + (k % 2) * 8);
    g.fillStyle(0x3a3a44, 0.7);
    for (let l = 0; l < 6; l++) g.fillRect(px + 2, py + 4 + l * 3, 6 + rng() * 6, 1);
    g.fillStyle(GOLD, 1); g.fillCircle(px + 12, py + 4, 2);
  }
  g.fillStyle(0xffffff, 0.35); g.fillTriangle(x - 29, y - 41, x - 29, y - 70, x - 5, y - 89);
  // A sunburst crest on top: the Despot's.
  g.fillStyle(GOLD, 1); g.fillCircle(x, y - 98, 6);
  for (let i = 0; i < 10; i++) { const a = Math.PI + (i / 9) * Math.PI; g.lineStyle(1.4, GOLD, 1); g.lineBetween(x + Math.cos(a) * 7, y - 98 + Math.sin(a) * 7, x + Math.cos(a) * 12, y - 98 + Math.sin(a) * 12); }
}

/** A sigil-scribe's table: scrolls, ink pots of burned-gold ink, a long ruler and compasses. */
export function scribeTable(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 90, 14, 0.22);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 40, y - 24, 4, 24); g.fillRect(x + 36, y - 24, 4, 24);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 44, y - 30, 88, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 44, y - 31, 88, 2);
  // A spread sheet with a half-drawn circle.
  g.fillStyle(0xfaf4e0, 1); g.fillRect(x - 30, y - 38, 40, 10);
  g.lineStyle(1, GOLD_DARK, 1); g.beginPath(); g.arc(x - 10, y - 33, 4, 0, Math.PI * 1.4, false); g.strokePath();
  // Scrolls.
  for (let k = 0; k < 3; k++) {
    const sx = x + 18 + k * 7, sy = y - 34 - (k % 2) * 3;
    g.fillStyle(0xf0e6c8, 1); g.fillRect(sx - 3, sy - 4, 6, 10);
    g.fillStyle(0xd8c8a0, 1); g.fillEllipse(sx, sy - 4, 6, 3);
    g.fillStyle(rng() < 0.5 ? ROBE : POTIONS[0], 1); g.fillRect(sx - 3, sy, 6, 1.5);
  }
  // Ink pots and compasses.
  g.fillStyle(0x1c1c28, 1); g.fillCircle(x - 36, y - 33, 3.5);
  g.fillStyle(GOLD, 1); g.fillCircle(x - 36, y - 35, 1.6);
  g.lineStyle(1.2, BRASS, 1); g.lineBetween(x + 6, y - 30, x + 10, y - 42); g.lineBetween(x + 14, y - 30, x + 10, y - 42);
  g.fillStyle(CHALK, 0.9); g.fillRect(x - 20, y - 29, 22, 1.5);
}

/**
 * The court's edge: a white marble balustrade along the sea cliff and the town wall, its
 * balusters turned like candlesticks, a gilt rail, and every tenth post topped with a sun.
 */
export function balustrade(g: G, x0: number, y: number, len: number): void {
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x0, y - 6, len, 6);
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, y - 8, len, 4);
  for (let x = x0 + 6, k = 0; x < x0 + len - 4; x += 12, k++) {
    g.fillStyle(MARBLE_SHADE, 1); g.fillEllipse(x, y - 18, 7, 14);
    g.fillStyle(MARBLE, 1); g.fillEllipse(x - 0.5, y - 18, 5, 12);
    g.fillStyle(MARBLE, 1); g.fillRect(x - 2, y - 28, 4, 4);
    if (k % 10 === 0) {
      g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x - 6, y - 34, 12, 30);
      g.fillStyle(MARBLE_LIT, 1); g.fillRect(x - 6, y - 34, 4, 30);
      g.fillStyle(GOLD, 1); g.fillCircle(x, y - 40, 4);
    }
  }
  g.fillStyle(MARBLE_SHADE, 1); g.fillRect(x0, y - 32, len, 5);
  g.fillStyle(MARBLE_LIT, 1); g.fillRect(x0, y - 33, len, 2);
  g.fillStyle(GOLD, 0.8); g.fillRect(x0, y - 28, len, 1);
}

/** A tall candle in a brass dish; `flame` 0 = unlit (a curl of smoke), else the flame colour. */
export function candle(g: G, x: number, y: number, s: number, flame: number, t: number, wax = CHALK): void {
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y, 20 * s, 7 * s);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y - 1, 18 * s, 5 * s);
  g.fillStyle(dim(wax, 0.12), 1); g.fillRect(x - 4 * s, y - 26 * s, 8 * s, 25 * s);
  g.fillStyle(wax, 1); g.fillRect(x - 3.5 * s, y - 26 * s, 5 * s, 25 * s);
  g.fillStyle(wax, 1); g.fillEllipse(x, y - 26 * s, 8 * s, 3 * s);
  g.fillStyle(wax, 1); g.fillEllipse(x + 3 * s, y - 20 * s, 2 * s, 5 * s);
  g.lineStyle(1, 0x2a2a2a, 1); g.lineBetween(x, y - 26 * s, x, y - 29 * s);
  if (flame) {
    const fl = Math.sin(t / 90 + x) * 1.2;
    glow(g, x, y - 33 * s, 14 * s, flame, 0.07, 3);
    g.fillStyle(flame, 0.95); g.fillEllipse(x + fl * 0.4, y - 33 * s, 6 * s, 11 * s);
    g.fillStyle(lit(flame, 0.6), 1); g.fillEllipse(x + fl * 0.2, y - 32 * s, 3 * s, 6 * s);
  } else {
    const ph = (t / 1400 + x * 0.01) % 1;
    g.lineStyle(1, CHALK_DIM, 0.4 * (1 - ph)); g.lineBetween(x, y - 30 * s, x + Math.sin(ph * 6) * 3, y - 30 * s - ph * 16);
  }
}

/** A ward-pane: the shimmering hexagon-tiled bubble a ward throws round someone. */
export function wardBubble(g: G, x: number, y: number, r: number, color: number, a: number, t: number): void {
  g.fillStyle(color, 0.08 * a); g.fillCircle(x, y, r);
  g.lineStyle(2, color, 0.7 * a); g.strokeCircle(x, y, r);
  for (let i = 0; i < 6; i++) {
    const ang = t / 900 + (i / 6) * Math.PI * 2;
    const px = x + Math.cos(ang) * r * 0.6, py = y + Math.sin(ang) * r * 0.6;
    g.lineStyle(1, lit(color, 0.4), 0.45 * a);
    const hr = r * 0.26;
    for (let k = 0; k < 6; k++) {
      const a1 = (k / 6) * Math.PI * 2, a2 = ((k + 1) / 6) * Math.PI * 2;
      g.lineBetween(px + Math.cos(a1) * hr, py + Math.sin(a1) * hr, px + Math.cos(a2) * hr, py + Math.sin(a2) * hr);
    }
  }
}

/** A stack of grimoires, spines gilt, left out in the sun because a closed cupboard is a hiding place. */
export function bookStack(g: G, x: number, y: number, n: number, rng: () => number): void {
  shadow(g, x, y + 1, 24, 6, 0.2);
  for (let k = 0; k < n; k++) {
    const c = [ROBE, VIOLET, POTIONS[0], TIMBER_DARK, ROBE_LIT][Math.floor(rng() * 5)];
    const w = 16 + rng() * 6, off = (rng() - 0.5) * 4;
    g.fillStyle(dim(c, 0.2), 1); g.fillRect(x - w / 2 + off, y - (k + 1) * 5, w, 5);
    g.fillStyle(c, 1); g.fillRect(x - w / 2 + off, y - (k + 1) * 5, w, 3.5);
    g.fillStyle(0xfaf4e0, 1); g.fillRect(x + w / 2 + off - 2, y - (k + 1) * 5 + 1, 2, 3);
    g.fillStyle(GOLD, 0.8); g.fillRect(x - w / 2 + off + 2, y - (k + 1) * 5 + 1, 1, 2.5);
  }
}

/** Robe colours for the town's mages, used by NPC looks and the crowd. */
export const ROBES = [ROBE, VIOLET, ROBE_LIT, VIOLET_DARK, ROBE_DARK];
