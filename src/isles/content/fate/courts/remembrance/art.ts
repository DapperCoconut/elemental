import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Rect } from '../../../../IslesTypes';
import {
  BRICK, BRICK_DARK, CORK, FMN_BLUE, FMN_DARK, FMN_EYE, FMN_LIT, GILT, GILT_DARK, GILT_LIT, GLASS, INK, LAMP_GREEN,
  LAMP_LIGHT, LAWN_DARK, LETHE, LETHE_DEEP, LETHE_LIT, MEMORY_COLORS, PAPER, PAPER_DARK, PAVE_BLACK, PAVE_EDGE,
  PAVE_RED, PLASTER, PLASTER_DARK, SEPIA, SEPIA_DARK, SEPIA_DEEP, SEPIA_LIT, SEPIA_PALE, SLATE, SLATE_LIT, STONE,
  STONE_DARK, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, WILT,
} from './palette';

/**
 * Remembrance set pieces — the shapes only a town of pawned memories has. Everything is drawn a
 * little *faded*: edges softened by a second, paler outline, colours pulled toward sepia, paper
 * everywhere (tickets, labels, ledgers, photographs). Against that, the memories themselves glow:
 * every bottle has a light in it, and the eye goes to the windows full of them.
 */

// ── Small things ─────────────────────────────────────────────────────

/** A bottled memory: a round-shouldered phial, corked and labelled, with a light swimming in it. */
export function memoryBottle(g: G, x: number, y: number, s: number, color: number, glowA = 0.7, t = 0): void {
  const h = 18 * s, w = 10 * s;
  if (glowA > 0) glow(g, x, y - h * 0.45, 12 * s, color, 0.05 * glowA, 3);
  g.fillStyle(dim(GLASS, 0.35), 0.9); g.fillEllipse(x, y - h * 0.38, w + 2 * s, h * 0.78 + 2 * s);
  g.fillStyle(mixC(GLASS, color, 0.35), 0.85); g.fillEllipse(x, y - h * 0.38, w, h * 0.78);
  // The memory: a slow swirl of the bottle's colour.
  const sw = Math.sin(t * 1.7 + x * 0.05) * 1.6 * s;
  g.fillStyle(color, 0.55 + glowA * 0.35); g.fillEllipse(x + sw, y - h * 0.32, w * 0.62, h * 0.44);
  g.fillStyle(lit(color, 0.6), 0.5 * glowA + 0.2); g.fillCircle(x + sw * 0.6, y - h * 0.4, 1.8 * s);
  // Neck, cork and a paper label on string.
  g.fillStyle(dim(GLASS, 0.2), 1); g.fillRect(x - 2 * s, y - h * 0.86, 4 * s, 4 * s);
  g.fillStyle(CORK, 1); g.fillRect(x - 2.4 * s, y - h, 4.8 * s, 3.5 * s);
  g.fillStyle(lit(CORK, 0.3), 1); g.fillRect(x - 2.4 * s, y - h, 4.8 * s, 1 * s);
  g.fillStyle(PAPER, 1); g.fillRect(x + 2 * s, y - h * 0.62, 5 * s, 3.5 * s);
  g.lineStyle(0.8, INK, 0.6); g.lineBetween(x + 1.5 * s, y - h * 0.84, x + 2.5 * s, y - h * 0.6);
  g.fillStyle(0xffffff, 0.5); g.fillRect(x - w * 0.32, y - h * 0.62, 1.4 * s, h * 0.36);
}

/** A forget-me-not: five round blue petals and a yellow eye. */
export function fmn(g: G, x: number, y: number, s: number, a = 1, color = FMN_BLUE): void {
  for (let i = 0; i < 5; i++) {
    const b = (i / 5) * Math.PI * 2;
    g.fillStyle(i % 2 ? color : lit(color, 0.15), a); g.fillCircle(x + Math.cos(b) * s, y + Math.sin(b) * s, s * 0.85);
  }
  g.fillStyle(FMN_EYE, a); g.fillCircle(x, y, s * 0.45);
}

/** A bed of forget-me-nots, seen from above: a soft leafy mound shot through with blue. */
export function fmnBed(g: G, x: number, y: number, rx: number, ry: number, rng: () => number, wilt = 0): void {
  g.fillStyle(dim(LAWN_DARK, 0.25), 0.8); g.fillEllipse(x, y + 3, rx * 2.08, ry * 2.1);
  g.fillStyle(mixC(0x4e6a3a, WILT, wilt), 1); g.fillEllipse(x, y, rx * 2, ry * 2);
  for (let i = 0; i < rx * ry / 60; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
    const fx = x + Math.cos(a) * rx * d * 0.92, fy = y + Math.sin(a) * ry * d * 0.9;
    if (rng() < 0.35) { g.fillStyle(mixC(0x6a8a4a, WILT, wilt), 0.9); g.fillEllipse(fx, fy, 5, 3); continue; }
    fmn(g, fx, fy, 1.4 + rng() * 1.2, 1, mixC(rng() < 0.2 ? FMN_LIT : FMN_BLUE, WILT, wilt));
  }
}

/** A green-shaded street lamp: iron post, a glass shade like a card-room lamp, a pool of light. */
export function greenLamp(g: G, x: number, y: number, on = 1): void {
  shadow(g, x, y + 1, 18, 6);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 4, y - 6, 8, 6);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 1.5, y - 62, 3, 58);
  g.lineStyle(2, 0x2a2420, 1); g.lineBetween(x, y - 60, x + 12, y - 66); g.lineBetween(x, y - 60, x - 12, y - 66);
  // The shade: a green glass cone with a gilt rim.
  g.fillStyle(dim(LAMP_GREEN, 0.25), 1); g.fillTriangle(x - 13, y - 64, x + 13, y - 64, x, y - 78);
  g.fillStyle(LAMP_GREEN, 1); g.fillTriangle(x - 11, y - 65, x + 11, y - 65, x, y - 77);
  g.fillStyle(GILT, 1); g.fillRect(x - 13, y - 65, 26, 2);
  g.fillStyle(LAMP_LIGHT, 0.55 + on * 0.45); g.fillEllipse(x, y - 62, 10, 4);
  if (on > 0) glow(g, x, y - 58, 22, LAMP_LIGHT, 0.05 * on, 3);
}

/** A slatted park bench. */
export function bench(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 64, 10);
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 26, y - 12, 3, 12); g.fillRect(x + 23, y - 12, 3, 12);
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x - 30, y - 14 - k * 4, 60, 3); }
  for (let k = 0; k < 2; k++) { g.fillStyle(TIMBER, 1); g.fillRect(x - 30, y - 30 - k * 5, 60, 3); }
  g.fillStyle(0x2a2420, 1); g.fillRect(x - 26, y - 34, 2, 22); g.fillRect(x + 24, y - 34, 2, 22);
}

/** A sepia photograph with a white deckled border (for drifting snapshots, frames, the prince). */
export function photo(g: G, x: number, y: number, w: number, h: number, rot: number, fade = 0, seed = 0): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (dx: number, dy: number) => ({ x: x + dx * c - dy * s, y: y + dx * s + dy * c });
  const quad = (hw: number, hh: number, color: number, a: number) => {
    const p0 = P(-hw, -hh), p1 = P(hw, -hh), p2 = P(hw, hh), p3 = P(-hw, hh);
    g.fillStyle(color, a);
    g.fillTriangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    g.fillTriangle(p0.x, p0.y, p2.x, p2.y, p3.x, p3.y);
  };
  quad(w / 2, h / 2, SEPIA_PALE, 1);
  quad(w / 2 - 2, h / 2 - 2, mixC(SEPIA, SEPIA_PALE, fade), 1);
  if (fade < 0.95) {
    // A little scene: a horizon, a figure, a sun — all in brown.
    const a = 1 - fade;
    const hz = P(0, h * 0.1);
    g.fillStyle(SEPIA_DARK, 0.5 * a); g.fillCircle(P(-w * 0.18, -h * 0.16).x, P(-w * 0.18, -h * 0.16).y, Math.min(w, h) * 0.1);
    g.lineStyle(1, SEPIA_DEEP, 0.5 * a); g.lineBetween(P(-w / 2 + 3, h * 0.1).x, P(-w / 2 + 3, h * 0.1).y, P(w / 2 - 3, h * 0.1).x, P(w / 2 - 3, h * 0.1).y);
    const fx = P(w * 0.14 + ((seed * 7) % 5) - 2, h * 0.02);
    g.fillStyle(SEPIA_DEEP, 0.8 * a); g.fillCircle(fx.x, fx.y - h * 0.08, Math.min(w, h) * 0.08);
    g.fillEllipse(fx.x, fx.y + h * 0.06, Math.min(w, h) * 0.18, h * 0.2);
    g.fillStyle(SEPIA_DARK, 0.3 * a); g.fillCircle(hz.x, hz.y + h * 0.18, 1);
  }
}

/** An empty gilt picture frame, or one holding a portrait in `face` colour. */
export function frame(g: G, x: number, y: number, w: number, h: number, face: number | null, paint = 1): void {
  // `x,y` is the frame's centre.
  g.fillStyle(0x000000, 0.25); g.fillRect(x - w / 2 + 3, y - h / 2 + 4, w, h);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(GILT, 1); g.fillRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4);
  g.fillStyle(GILT_LIT, 0.7); g.fillRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, 2);
  // Corner bosses.
  for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.fillStyle(GILT_LIT, 1); g.fillCircle(x + cx * (w / 2 - 3), y + cy * (h / 2 - 3), 2.4); }
  // Canvas.
  const iw = w - 12, ih = h - 12;
  g.fillStyle(SEPIA_PALE, 1); g.fillRect(x - iw / 2, y - ih / 2, iw, ih);
  if (face !== null && paint > 0) {
    const a = Math.min(1, paint);
    g.fillStyle(mixC(SEPIA, face, 0.35), 0.6 * a); g.fillRect(x - iw / 2, y - ih / 2, iw, ih);
    // A sitter: shoulders and a head, in the sitter's colour, painted in as `paint` rises.
    g.fillStyle(dim(face, 0.2), a); g.fillEllipse(x, y + ih * 0.42, iw * 0.8, ih * 0.5);
    g.fillStyle(mixC(face, 0xf0d0b0, 0.5), a); g.fillCircle(x, y - ih * 0.06, Math.min(iw, ih) * 0.22);
    g.fillStyle(INK, a); g.fillCircle(x - iw * 0.07, y - ih * 0.08, 1.2); g.fillCircle(x + iw * 0.07, y - ih * 0.08, 1.2);
  } else {
    g.lineStyle(1, SEPIA_LIT, 0.8); g.strokeRect(x - iw / 2 + 3, y - ih / 2 + 3, iw - 6, ih - 6);
  }
}

/** A brass Lot token on its chain: the numbered disc every Lotterhaven child wears. */
export function lotToken(g: G, x: number, y: number, r: number, black = false): void {
  g.fillStyle(black ? 0x141210 : GILT_DARK, 1); g.fillCircle(x, y, r);
  g.fillStyle(black ? 0x2a2622 : GILT, 1); g.fillCircle(x, y, r * 0.82);
  g.lineStyle(Math.max(1, r * 0.15), black ? 0x4a4440 : GILT_LIT, 0.8); g.strokeCircle(x, y, r * 0.56);
  if (!black) { g.fillStyle(GILT_DARK, 1); g.fillRect(x - r * 0.15, y - r * 0.35, r * 0.3, r * 0.7); }
}

/** Three gilt pawnbroker's balls hanging from a curled bracket. */
export function threeBalls(g: G, x: number, y: number, s: number): void {
  g.lineStyle(2.5 * s, 0x2a2420, 1); g.lineBetween(x, y, x + 26 * s, y);
  g.beginPath(); g.arc(x + 6 * s, y + 6 * s, 6 * s, Math.PI, Math.PI * 1.5, false); g.strokePath();
  const bx = x + 22 * s, by = y + 6 * s;
  g.lineStyle(1, 0x2a2420, 1); g.lineBetween(bx, y, bx, by + 4 * s);
  g.lineBetween(bx, by + 4 * s, bx - 7 * s, by + 10 * s); g.lineBetween(bx, by + 4 * s, bx + 7 * s, by + 10 * s);
  for (const [dx, dy] of [[-7, 14], [7, 14], [0, 26]]) {
    g.fillStyle(GILT_DARK, 1); g.fillCircle(bx + dx * s, by + dy * s, 6.5 * s);
    g.fillStyle(GILT, 1); g.fillCircle(bx + dx * s - 0.6 * s, by + dy * s - 0.6 * s, 5.6 * s);
    g.fillStyle(GILT_LIT, 0.9); g.fillCircle(bx + dx * s - 2 * s, by + dy * s - 2 * s, 1.8 * s);
  }
}

// ── Ground ───────────────────────────────────────────────────────────

/** A road of the isle's black-and-red squares, set on the diamond and worn pale down its middle. */
export function checkerRoad(g: G, r: Rect, size: number, rng: () => number): void {
  g.fillStyle(PAVE_EDGE, 1); g.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  for (let y = r.y; y < r.y + r.h; y += size) {
    for (let x = r.x; x < r.x + r.w; x += size) {
      const k = (Math.floor((x - r.x) / size) + Math.floor((y - r.y) / size)) % 2;
      const w = Math.min(size, r.x + r.w - x), h = Math.min(size, r.y + r.h - y);
      g.fillStyle(k ? PAVE_RED : PAVE_BLACK, 1); g.fillRect(x, y, w, h);
      g.fillStyle(SEPIA_LIT, 0.08 + rng() * 0.08); g.fillRect(x, y, w, h);
    }
  }
  // Wear: a pale stripe down the middle where everyone walks, and grout lines.
  const horiz = r.w > r.h;
  g.fillStyle(SEPIA_LIT, 0.16);
  if (horiz) g.fillRect(r.x, r.y + r.h * 0.3, r.w, r.h * 0.4); else g.fillRect(r.x + r.w * 0.3, r.y, r.w * 0.4, r.h);
  g.lineStyle(1, 0x241c16, 0.35);
  for (let x = r.x; x <= r.x + r.w; x += size) g.lineBetween(x, r.y, x, r.y + r.h);
  for (let y = r.y; y <= r.y + r.h; y += size) g.lineBetween(r.x, y, r.x + r.w, y);
  for (let i = 0; i < (r.w * r.h) / 900; i++) { g.fillStyle(SEPIA_PALE, 0.12); g.fillCircle(r.x + rng() * r.w, r.y + rng() * r.h, 1 + rng() * 2); }
  // Kerbs.
  g.fillStyle(STONE_DARK, 1);
  if (horiz) { g.fillRect(r.x, r.y - 4, r.w, 4); g.fillRect(r.x, r.y + r.h, r.w, 4); }
  else { g.fillRect(r.x - 4, r.y, 4, r.h); g.fillRect(r.x + r.w, r.y, 4, r.h); }
}

/** The Lethe pool: pale, milky water inside a stone rim with washing steps down into it. */
export function letheBasin(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(r.x - 16, r.y - 16, r.w + 32, r.h + 32, 28);
  g.fillStyle(STONE, 1); g.fillRoundedRect(r.x - 12, r.y - 12, r.w + 24, r.h + 24, 24);
  g.fillStyle(LETHE_DEEP, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 18);
  g.fillStyle(LETHE, 1); g.fillRoundedRect(r.x + 8, r.y + 6, r.w - 16, r.h - 14, 14);
  // Milky swirls in the still water.
  for (let i = 0; i < 18; i++) {
    const x = r.x + 30 + rng() * (r.w - 60), y = r.y + 20 + rng() * (r.h - 40);
    g.lineStyle(1.2, LETHE_LIT, 0.35); g.strokeEllipse(x, y, 30 + rng() * 40, 8 + rng() * 8);
  }
  // Washing steps on the north rim.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? STONE : STONE_LIT, 1); g.fillRect(r.x + r.w * 0.3 - k * 6, r.y - 12 + k * 6, r.w * 0.4 + k * 12, 6); }
  // Things that sank: drained bottles, a lost ribbon, a coin.
  for (let i = 0; i < 9; i++) {
    const x = r.x + 26 + rng() * (r.w - 52), y = r.y + 24 + rng() * (r.h - 48);
    g.fillStyle(dim(GLASS, 0.2), 0.35); g.fillEllipse(x, y, 6, 10);
  }
  g.lineStyle(1, LETHE_LIT, 0.6); g.strokeRoundedRect(r.x + 4, r.y + 3, r.w - 8, r.h - 8, 16);
}

/** A sepia-tinted lawn patch with clover and the odd fallen ticket. */
export function sepiaLawn(g: G, r: Rect, rng: () => number): void {
  for (let i = 0; i < (r.w * r.h) / 700; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.04) { g.fillStyle(PAPER, 0.5); g.fillRect(x, y, 5, 3); }
    else if (k < 0.1) fmn(g, x, y, 1.2, 0.6);
    else { g.fillStyle(k < 0.55 ? 0x7c8862 : 0x96a07c, 0.35); g.fillRect(x, y, 2, 3); }
  }
}

// ── Buildings ────────────────────────────────────────────────────────

/**
 * A pawnshop on Pawn Row: a brick front, a slate roof, a great bow window crowded with bottled
 * memories glowing on glass shelves, lapsed tickets pinned in the corners, the gilt three balls
 * on a bracket over the door and the proprietor's name on a board.
 */
export function pawnshop(g: G, x: number, y: number, w: number, h: number, seed: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 22);
  const x0 = x - w / 2, top = y - h;
  // Brick front.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(BRICK, 1); g.fillRect(x0 + 2, top + 2, w - 4, h - 2);
  for (let by = top + 6; by < y; by += 8) {
    const off = ((by - top) / 8) % 2 ? 0 : 7;
    for (let bx = x0 + 2 + off; bx < x0 + w - 2; bx += 14) { g.fillStyle(BRICK_DARK, 0.35); g.fillRect(bx, by, 1, 8); }
    g.fillStyle(BRICK_DARK, 0.3); g.fillRect(x0 + 2, by, w - 4, 1);
  }
  // Slate roof with a dormer.
  g.fillStyle(dim(SLATE, 0.3), 1); g.fillTriangle(x0 - 10, top + 2, x0 + w + 10, top + 2, x, top - h * 0.45);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 6, top, x0 + w + 6, top, x, top - h * 0.42);
  for (let k = 1; k < 5; k++) { g.lineStyle(1, SLATE_LIT, 0.4); g.lineBetween(x0 - 6 + k * 6, top - k * h * 0.08, x0 + w + 6 - k * 6, top - k * h * 0.08); }
  g.fillStyle(PLASTER, 1); g.fillRect(x - 12, top - h * 0.3, 24, 20);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 16, top - h * 0.3, x + 16, top - h * 0.3, x, top - h * 0.3 - 12);
  g.fillStyle(0x3a2e24, 1); g.fillRect(x - 6, top - h * 0.3 + 4, 12, 12);
  g.fillStyle(MEMORY_COLORS[seed % MEMORY_COLORS.length], 0.6); g.fillRect(x - 5, top - h * 0.3 + 5, 10, 10);
  // A chimney.
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0 + w * 0.78, top - h * 0.36, 12, h * 0.3);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 + w * 0.78 - 2, top - h * 0.38, 16, 4);
  // The fascia board with the name (ink strokes) and gilt edging.
  g.fillStyle(0x23301f, 1); g.fillRect(x0 + 6, top + 6, w - 12, 16);
  g.lineStyle(1, GILT, 1); g.strokeRect(x0 + 7, top + 7, w - 14, 14);
  for (let i = 0; i < 9; i++) { g.fillStyle(GILT_LIT, 0.85); g.fillRect(x0 + 16 + i * ((w - 32) / 9), top + 11, (w - 32) / 12, 6); }
  // The bow window: a curved glass front on a panelled base, glass shelves of glowing bottles.
  const wx = x0 + 10, ww = w * 0.58, wy = top + 30, wh = h - 52;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 3, wy - 3, ww + 6, wh + 18);
  g.fillStyle(0x1e1a16, 1); g.fillRect(wx, wy, ww, wh);
  for (let s = 0; s < 3; s++) {
    const sy = wy + 12 + s * (wh / 3);
    g.fillStyle(GLASS, 0.35); g.fillRect(wx + 2, sy + 6, ww - 4, 2);
    for (let bx = wx + 8; bx < wx + ww - 6; bx += 10) {
      const c = MEMORY_COLORS[Math.floor(rng() * MEMORY_COLORS.length)];
      memoryBottle(g, bx, sy + 6, 0.6 + rng() * 0.25, c, 0.6);
    }
  }
  g.fillStyle(GLASS, 0.12); g.fillRect(wx, wy, ww, wh);
  g.lineStyle(2, TIMBER, 1); g.strokeRect(wx, wy, ww, wh);
  for (let k = 1; k < 4; k++) g.lineBetween(wx + (ww * k) / 4, wy, wx + (ww * k) / 4, wy + wh);
  g.fillStyle(0xffffff, 0.18); g.fillRect(wx + 4, wy + 4, 4, wh - 8);
  // Lapsed tickets pinned in the corners of the glass.
  for (let k = 0; k < 4; k++) {
    const tx = wx + 4 + (k % 2) * (ww - 14), ty = wy + 4 + Math.floor(k / 2) * (wh - 14);
    g.fillStyle(PAPER, 0.95); g.fillRect(tx, ty, 10, 7);
    g.fillStyle(0xa83a2a, 0.9); g.fillRect(tx + 1, ty + 1, 8, 1.5);
  }
  // Panelled base under the window.
  g.fillStyle(TIMBER, 1); g.fillRect(wx - 3, wy + wh + 3, ww + 6, 12);
  g.lineStyle(1, TIMBER_DARK, 1); for (let k = 0; k < 4; k++) g.strokeRect(wx + k * (ww / 4) + 2, wy + wh + 5, ww / 4 - 4, 8);
  // The door: dark green, a fanlight, a brass bell over it.
  const dx = x0 + w * 0.8;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 15, y - 48, 30, 48);
  g.fillStyle(0x23412f, 1); g.fillRect(dx - 12, y - 45, 24, 45);
  g.fillStyle(LAMP_LIGHT, 0.5); g.fillRect(dx - 10, y - 44, 20, 8);
  g.lineStyle(1, 0x1a2a20, 1); g.strokeRect(dx - 9, y - 32, 18, 12); g.strokeRect(dx - 9, y - 17, 18, 12);
  g.fillStyle(GILT, 1); g.fillCircle(dx + 7, y - 22, 1.8);
  g.fillStyle(GILT, 1); g.fillTriangle(dx - 4, y - 50, dx + 4, y - 50, dx, y - 56);
  // The three balls on their bracket at the corner.
  threeBalls(g, x0 + w - 6, top + 26, 1);
  // A step and a boot-scraper.
  g.fillStyle(STONE, 1); g.fillRect(dx - 18, y - 2, 36, 4);
}

/**
 * Prince Hindsight's Archive: a stone rotunda under a gilt dome. Its front is a wall of
 * card-catalogue drawers with brass pulls (every drawer a household); a portico of four columns;
 * over the door a clock whose hands run backwards; and on the dome a great brass spyglass turned
 * the wrong way round, looking back down the hill at the town.
 */
export function archive(g: G, x: number, y: number, w: number, h: number, t = 0): void {
  shadow(g, x, y + 8, w * 1.15, 34);
  const x0 = x - w / 2, top = y - 24 - h;
  // Plinth steps.
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? STONE : STONE_LIT, 1);
    g.fillRect(x0 - 20 + k * 8, y - 6 - k * 6, w + 40 - k * 16, 7);
  }
  // The drum of the rotunda behind the portico.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(STONE, 1); g.fillRect(x0 + 3, top + 3, w - 6, h - 3);
  // Card-catalogue drawers: rows of little brass-pulled fronts with paper labels.
  const dw = 22, dh = 14;
  for (let ry = top + 16; ry < y - 34; ry += dh + 3) {
    for (let rx = x0 + 12; rx < x0 + w - 12 - dw; rx += dw + 3) {
      if (Math.abs(rx + dw / 2 - x) < 70) continue;
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(rx, ry, dw, dh);
      g.fillStyle(TIMBER, 1); g.fillRect(rx + 1, ry + 1, dw - 2, dh - 2);
      g.fillStyle(PAPER, 0.9); g.fillRect(rx + 5, ry + 3, dw - 10, 4);
      g.fillStyle(GILT, 1); g.fillRect(rx + dw / 2 - 3, ry + dh - 5, 6, 2);
    }
  }
  // One drawer pulled out, a card sticking up.
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0 + 37, top + 50, 22, 18);
  g.fillStyle(PAPER, 1); g.fillRect(x0 + 41, top + 42, 14, 10);
  // Cornice.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 10, top - 10, w + 20, 12);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 10, top - 12, w + 20, 5);
  for (let k = x0 - 6; k < x0 + w + 6; k += 12) { g.fillStyle(STONE_DARK, 1); g.fillRect(k, top - 6, 6, 4); }
  // The dome: gilt, ribbed, with a lantern.
  const dr = w * 0.3;
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(x, top - 12, dr * 2 + 8, dr * 1.6 + 8);
  g.fillStyle(GILT, 1); g.fillEllipse(x, top - 14, dr * 2, dr * 1.6);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - dr - 6, top - 14, dr * 2 + 12, 14);
  g.fillStyle(STONE, 1); g.fillRect(x - dr - 6, top - 16, dr * 2 + 12, 5);
  for (let k = -3; k <= 3; k++) {
    const rx = x + (k / 3.4) * dr;
    g.lineStyle(2, GILT_LIT, 0.55); g.lineBetween(rx, top - 16, x + (rx - x) * 0.3, top - 14 - dr * 0.78);
  }
  g.fillStyle(GILT_LIT, 0.45); g.fillEllipse(x - dr * 0.35, top - 14 - dr * 0.42, dr * 0.45, dr * 0.3);
  // Lantern and the backward spyglass on top, turning slowly to look back down the hill.
  const lt = top - 14 - dr * 0.8;
  g.fillStyle(STONE, 1); g.fillRect(x - 12, lt - 22, 24, 22);
  g.fillStyle(LAMP_LIGHT, 0.7); for (const k of [-6, 0, 6]) g.fillRect(x + k - 2, lt - 18, 4, 12);
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 15, lt - 22, x + 15, lt - 22, x, lt - 34);
  const sa = Math.PI * 0.85 + Math.sin(t * 0.3) * 0.12;
  const ex = x + Math.cos(sa) * 46, ey = lt - 40 + Math.sin(sa) * 10;
  g.lineStyle(9, GILT_DARK, 1); g.lineBetween(x, lt - 38, ex, ey);
  g.lineStyle(6, GILT, 1); g.lineBetween(x, lt - 38, ex, ey);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(ex, ey, 7);
  g.fillStyle(0x3a2a1a, 1); g.fillCircle(ex, ey, 4);
  g.fillStyle(LAMP_LIGHT, 0.8); g.fillCircle(ex - 1, ey - 1, 1.5);
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, lt - 38, 5);
  // The portico: four columns and a pediment with the backward clock.
  const pw = 150;
  g.fillStyle(0x2a221c, 1); g.fillRect(x - pw / 2 + 10, y - 30 - h * 0.66, pw - 20, h * 0.66);
  for (let k = 0; k < 4; k++) {
    const cx = x - pw / 2 + 12 + k * ((pw - 24) / 3);
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 7, y - 30 - h * 0.7, 14, h * 0.7);
    g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 6, y - 30 - h * 0.7, 6, h * 0.7);
    g.fillStyle(STONE, 1); g.fillRect(cx - 9, y - 30 - h * 0.7 - 4, 18, 5); g.fillRect(cx - 9, y - 34, 18, 5);
    for (let f = -1; f <= 1; f++) { g.lineStyle(1, STONE_DARK, 0.5); g.lineBetween(cx + f * 3, y - 30 - h * 0.7, cx + f * 3, y - 34); }
  }
  const pt = y - 30 - h * 0.7 - 4;
  g.fillStyle(STONE_DARK, 1); g.fillTriangle(x - pw / 2 - 8, pt, x + pw / 2 + 8, pt, x, pt - 42);
  g.fillStyle(STONE, 1); g.fillTriangle(x - pw / 2 - 2, pt - 2, x + pw / 2 + 2, pt - 2, x, pt - 38);
  // The clock that runs backwards.
  const cy = pt - 16;
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, cy, 14);
  g.fillStyle(PAPER, 1); g.fillCircle(x, cy, 11.5);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(INK, 1); g.fillCircle(x + Math.cos(a) * 9, cy + Math.sin(a) * 9, 0.9); }
  const mh = -Math.PI / 2 - t * 0.6, hh = -Math.PI / 2 - t * 0.05;
  g.lineStyle(1.5, INK, 1); g.lineBetween(x, cy, x + Math.cos(mh) * 9, cy + Math.sin(mh) * 9);
  g.lineStyle(2, INK, 1); g.lineBetween(x, cy, x + Math.cos(hh) * 6, cy + Math.sin(hh) * 6);
  // The great doors, ajar, a slice of lamplight between them.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 26, y - 30 - 70, 52, 70);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 24, y - 30 - 68, 22, 68); g.fillRect(x + 2, y - 30 - 68, 22, 68);
  g.fillStyle(LAMP_LIGHT, 0.8); g.fillRect(x - 2, y - 30 - 66, 4, 66);
  for (const k of [-1, 1]) { g.lineStyle(1, TIMBER_DARK, 1); g.strokeRect(x + k * 13 - 8, y - 92, 16, 24); g.strokeRect(x + k * 13 - 8, y - 62, 16, 24); }
}

/**
 * The Portrait Gallery: a long stone hall with tall arched windows, a portrait hung in each —
 * some still have faces, some have been forgotten to bare canvas — and a gilt frame on the roof.
 */
export function gallery(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 6, w * 1.08, 26);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 6, y - 14, w + 12, 14);
  g.fillStyle(STONE, 1); g.fillRect(x0 - 4, y - 16, w + 8, 6);
  g.fillStyle(PLASTER_DARK, 1); g.fillRect(x0, top, w, h - 14);
  g.fillStyle(PLASTER, 1); g.fillRect(x0 + 2, top + 2, w - 4, h - 18);
  // Arched bays, each with a portrait.
  const bays = Math.max(3, Math.round(w / 64));
  const bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const cx = x0 + bw * (i + 0.5);
    if (i === Math.floor(bays / 2)) continue;
    const ah = h * 0.6, aw = bw * 0.62;
    g.fillStyle(STONE_DARK, 1); g.fillRect(cx - aw / 2 - 3, top + 20, aw + 6, ah);
    g.fillStyle(STONE_DARK, 1); g.fillCircle(cx, top + 20, aw / 2 + 3);
    g.fillStyle(0x2a221c, 1); g.fillRect(cx - aw / 2, top + 20, aw, ah - 3);
    g.fillStyle(0x2a221c, 1); g.fillCircle(cx, top + 20, aw / 2);
    const blank = rng() < 0.35;
    frame(g, cx, top + 20 + ah * 0.42, aw * 0.8, ah * 0.6, blank ? null : MEMORY_COLORS[Math.floor(rng() * MEMORY_COLORS.length)], 1);
    // Pilasters between bays.
    g.fillStyle(STONE, 1); g.fillRect(x0 + bw * i - 4, top + 4, 8, h - 18);
  }
  // The entrance bay: a doorway under a lintel lettered GALLERY.
  const cx = x0 + bw * (Math.floor(bays / 2) + 0.5);
  g.fillStyle(STONE_DARK, 1); g.fillRect(cx - 26, y - 16 - 64, 52, 64);
  g.fillStyle(0x2a221c, 1); g.fillRect(cx - 22, y - 16 - 60, 44, 60);
  g.fillStyle(LAMP_LIGHT, 0.25); g.fillRect(cx - 18, y - 16 - 56, 36, 56);
  frame(g, cx, y - 16 - 30, 28, 34, null);
  g.fillStyle(STONE_LIT, 1); g.fillRect(cx - 34, y - 16 - 72, 68, 10);
  for (let i = 0; i < 7; i++) { g.fillStyle(INK, 0.8); g.fillRect(cx - 26 + i * 8, y - 16 - 69, 5, 4); }
  // Cornice and the gilt frame on the roof — the gallery's sign, empty.
  g.fillStyle(STONE_DARK, 1); g.fillRect(x0 - 8, top - 8, w + 16, 10);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x0 - 8, top - 10, w + 16, 4);
  g.fillStyle(SLATE, 1); g.fillRect(x0 + 6, top - 26, w - 12, 18);
  g.fillStyle(SLATE_LIT, 0.4); g.fillRect(x0 + 6, top - 26, w - 12, 3);
  frame(g, x, top - 44, 70, 46, null);
}

/**
 * The Ledger Office: a tall narrow timber house leaning over the street, crammed with ledgers —
 * books stacked in every window, a hoist on the gable lifting a bale of paper, loose pages
 * escaping from the attic.
 */
export function ledgerOffice(g: G, x: number, y: number, rng: () => number): void {
  const w = 130, h = 190;
  shadow(g, x, y + 4, w * 1.2, 20);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(PLASTER, 1); g.fillRect(x0 + 4, top + 4, w - 8, h - 4);
  // Half-timbering.
  g.lineStyle(5, TIMBER_DARK, 1);
  for (let k = 0; k < 3; k++) g.lineBetween(x0, top + 4 + k * 62, x0 + w, top + 4 + k * 62);
  g.lineBetween(x0 + 4, top + 66, x0 + w * 0.4, top + 128); g.lineBetween(x0 + w - 4, top + 66, x0 + w * 0.6, top + 128);
  // Windows full of ledgers.
  for (const [wx, wy] of [[x0 + 20, top + 16], [x0 + w - 56, top + 16], [x0 + 20, top + 80], [x0 + w - 56, top + 80]]) {
    g.fillStyle(0x2a221c, 1); g.fillRect(wx, wy, 36, 34);
    for (let r = 0; r < 3; r++) {
      let bx = wx + 2;
      while (bx < wx + 33) {
        const bw = 3 + rng() * 4;
        g.fillStyle([0x7a2a22, 0x2a4a3a, 0x3a3060, 0x6a5020, 0x4a3020][Math.floor(rng() * 5)], 1);
        g.fillRect(bx, wy + 2 + r * 11, bw, 10);
        g.fillStyle(GILT, 0.7); g.fillRect(bx, wy + 5 + r * 11, bw, 1);
        bx += bw + 0.5;
      }
    }
    g.lineStyle(2, TIMBER, 1); g.strokeRect(wx, wy, 36, 34);
  }
  // Steep gable, the hoist beam and a bale of paper on a rope.
  g.fillStyle(dim(SLATE, 0.25), 1); g.fillTriangle(x0 - 10, top + 2, x0 + w + 10, top + 2, x, top - 76);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 6, top, x0 + w + 6, top, x, top - 72);
  g.fillStyle(PLASTER, 1); g.fillRect(x - 14, top - 34, 28, 30);
  g.fillStyle(0x2a221c, 1); g.fillRect(x - 10, top - 30, 20, 26);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4, top - 52, 50, 6);
  g.lineStyle(1, 0x2a2420, 1); g.lineBetween(x + 40, top - 46, x + 40, top - 10);
  g.fillStyle(PAPER_DARK, 1); g.fillRect(x + 30, top - 10, 20, 16);
  g.lineStyle(1, 0x7a5a3a, 1); g.lineBetween(x + 30, top - 2, x + 50, top - 2); g.lineBetween(x + 40, top - 10, x + 40, top + 6);
  // The door and a brass plate.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 14, y - 44, 28, 44);
  g.fillStyle(0x3a2a20, 1); g.fillRect(x - 11, y - 41, 22, 41);
  g.fillStyle(GILT, 1); g.fillRect(x + 16, y - 34, 10, 7);
  // Stacks of ledgers spilled on the step.
  for (const [sx, n] of [[x - 40, 5], [x + 34, 3]] as [number, number][]) {
    for (let k = 0; k < n; k++) { g.fillStyle([0x7a2a22, 0x2a4a3a, 0x6a5020][k % 3], 1); g.fillRect(sx - 9 + (k % 2) * 2, y - 4 - k * 4, 18, 4); }
  }
}

/**
 * The Lethe washhouse: an open-sided shed on posts over the pool's bank. Pale sheets hang on lines
 * (what a memory is wrung out into), coppers steam, and drained bottles stand upside-down on a rack.
 */
export function washhouse(g: G, x: number, y: number, rng: () => number): void {
  const w = 220, h = 96;
  shadow(g, x, y + 4, w * 1.05, 22);
  const x0 = x - w / 2;
  // Floor boards.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, y - 10, w, 10);
  for (let bx = x0; bx < x0 + w; bx += 12) { g.fillStyle(TIMBER, 1); g.fillRect(bx + 1, y - 9, 10, 8); }
  // Coppers and tubs.
  for (const cx of [x0 + 36, x0 + 88]) {
    g.fillStyle(0x8a4a2a, 1); g.fillEllipse(cx, y - 18, 34, 22);
    g.fillStyle(0xb8683a, 1); g.fillEllipse(cx, y - 24, 32, 10);
    g.fillStyle(LETHE, 1); g.fillEllipse(cx, y - 24, 26, 7);
  }
  g.fillStyle(TIMBER, 1); g.fillRect(x0 + 120, y - 30, 30, 22);
  g.lineStyle(1.5, 0x3a3a3a, 1); g.lineBetween(x0 + 120, y - 26, x0 + 150, y - 26); g.lineBetween(x0 + 120, y - 14, x0 + 150, y - 14);
  // The bottle rack: drained bottles upside down, faintly glowing still.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 160, y - 50, 52, 4); g.fillRect(x0 + 160, y - 30, 52, 4);
  for (let k = 0; k < 5; k++) {
    for (const ry of [y - 50, y - 30]) {
      const bx = x0 + 166 + k * 10;
      g.fillStyle(dim(GLASS, 0.15), 0.85); g.fillEllipse(bx, ry - 6, 7, 11);
      g.fillStyle(MEMORY_COLORS[(k + (ry > y - 40 ? 2 : 0)) % MEMORY_COLORS.length], 0.18); g.fillEllipse(bx, ry - 4, 4, 5);
    }
  }
  // Posts and the roof.
  for (const px of [x0 + 4, x0 + w - 8, x0 + w / 2 - 2]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(px, y - h, 6, h - 8); }
  g.fillStyle(dim(SLATE, 0.2), 1); g.fillRect(x0 - 12, y - h - 14, w + 24, 16);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 12, y - h - 12, x0 + w + 12, y - h - 12, x, y - h - 44);
  // Washing lines of pale sheets, the ones nearest wrung grey.
  g.lineStyle(1, 0x5a4a3a, 1); g.lineBetween(x0 + 6, y - h + 10, x0 + w - 6, y - h + 14);
  for (let k = 0; k < 7; k++) {
    const sx = x0 + 14 + k * 29, sy = y - h + 11 + k * 0.6;
    const sh = 26 + rng() * 14;
    g.fillStyle(k % 3 ? LETHE_LIT : PAPER, 0.95); g.fillRect(sx, sy, 22, sh);
    g.fillStyle(LETHE_DEEP, 0.25); g.fillRect(sx, sy + sh - 6, 22, 6);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx + 3, sy - 2, 2, 4); g.fillRect(sx + 17, sy - 2, 2, 4);
  }
}

/** A market stall of bottled memories under a striped awning, tiers of them priced on tags. */
export function bottleStall(g: G, x: number, y: number, rng: () => number, stripe = 0x8c4a3c): void {
  shadow(g, x, y + 3, 120, 16);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 52, y - 30, 104, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 50, y - 28, 100, 26);
  // Tiers.
  for (let k = 0; k < 3; k++) {
    const ty = y - 32 - k * 14, tw = 96 - k * 18;
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - tw / 2, ty, tw, 3);
    for (let bx = x - tw / 2 + 6; bx < x + tw / 2 - 2; bx += 9) memoryBottle(g, bx, ty, 0.55, MEMORY_COLORS[Math.floor(rng() * 6)], 0.7);
  }
  // Price tags on strings.
  for (let k = 0; k < 4; k++) { g.fillStyle(PAPER, 1); g.fillRect(x - 40 + k * 24, y - 22, 8, 5); }
  // Posts and a striped awning.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 54, y - 100, 4, 100); g.fillRect(x + 50, y - 100, 4, 100);
  for (let k = 0; k < 8; k++) {
    g.fillStyle(k % 2 ? SEPIA_PALE : stripe, 1);
    g.fillTriangle(x - 60 + k * 15, y - 102, x - 45 + k * 15, y - 102, x - 52 + k * 15, y - 86);
    g.fillRect(x - 60 + k * 15, y - 112, 15, 10);
  }
}

/**
 * The Unclaimed: a statue on a plinth whose face has been chiselled smooth — nobody remembers
 * who it was. Forget-me-nots heaped at its feet, a brass plaque rubbed blank.
 */
export function unclaimed(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 110, 22);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 44, y - 30, 88, 30);
  g.fillStyle(STONE, 1); g.fillRect(x - 40, y - 34, 80, 28);
  g.fillStyle(STONE_LIT, 1); g.fillRect(x - 40, y - 34, 80, 4);
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 18, y - 24, 36, 12);
  g.fillStyle(GILT, 0.7); g.fillRect(x - 16, y - 22, 32, 8);
  // The figure: a cloaked standing woman holding out a closed locket.
  const fy = y - 34;
  g.fillStyle(dim(STONE, 0.12), 1);
  g.fillTriangle(x - 26, fy, x + 26, fy, x, fy - 96);
  g.fillStyle(STONE, 1); g.fillTriangle(x - 22, fy, x + 18, fy, x - 2, fy - 92);
  g.fillStyle(STONE_LIT, 0.6); g.fillTriangle(x - 18, fy, x - 6, fy, x - 4, fy - 80);
  g.fillStyle(STONE, 1); g.fillCircle(x, fy - 100, 13);
  // The smoothed face: a flat oval with chisel marks.
  g.fillStyle(STONE_LIT, 1); g.fillEllipse(x + 2, fy - 99, 14, 16);
  g.lineStyle(0.8, STONE_DARK, 0.6); for (let k = 0; k < 4; k++) g.lineBetween(x - 3 + k * 3, fy - 106, x - 1 + k * 3, fy - 92);
  // The arm and the locket.
  g.lineStyle(6, STONE, 1); g.lineBetween(x + 6, fy - 72, x + 30, fy - 64);
  g.fillStyle(GILT, 1); g.fillCircle(x + 33, fy - 63, 4.5);
  g.lineStyle(1, GILT_DARK, 1); g.strokeCircle(x + 33, fy - 63, 4.5);
  // Forget-me-nots heaped at the plinth.
  for (let i = 0; i < 30; i++) fmn(g, x - 46 + rng() * 92, y - 2 + rng() * 8, 1.6 + rng(), 1);
}

/** A cottage of the forgetful: plastered, slate-roofed — and its windows whitewashed blank. */
export function blankCottage(g: G, x: number, y: number, w: number, h: number, rng: () => number, lit1 = false): void {
  shadow(g, x, y + 3, w * 1.1, 18);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(PLASTER_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(PLASTER, 1); g.fillRect(x0 + 2, top + 2, w - 4, h - 2);
  for (let i = 0; i < 8; i++) { g.fillStyle(SEPIA, 0.15); g.fillCircle(x0 + rng() * w, top + rng() * h, 3 + rng() * 6); }
  g.fillStyle(dim(SLATE, 0.3), 1); g.fillTriangle(x0 - 8, top + 2, x0 + w + 8, top + 2, x, top - h * 0.7);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 5, top, x0 + w + 5, top, x, top - h * 0.66);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x0 + w * 0.2, top - h * 0.5, 9, h * 0.36);
  // Windows painted over white — save one, perhaps, where somebody has scraped a peephole.
  for (const k of [-1, 1]) {
    const wx = x + k * w * 0.27 - 10, wy = top + h * 0.24;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(wx - 2, wy - 2, 24, 22);
    g.fillStyle(lit1 && k > 0 ? LAMP_LIGHT : 0xf4f0e4, 1); g.fillRect(wx, wy, 20, 18);
    g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(wx + 10, wy, wx + 10, wy + 18); g.lineBetween(wx, wy + 9, wx + 20, wy + 9);
    if (!lit1 || k < 0) { g.fillStyle(0x2a221c, 0.8); g.fillCircle(wx + 5 + rng() * 10, wy + 4 + rng() * 10, 1.6); }
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 9, y - 30, 18, 30);
  g.fillStyle(0x4a3a50, 1); g.fillRect(x - 7, y - 28, 14, 28);
  g.fillStyle(GILT, 1); g.fillCircle(x + 4, y - 14, 1.3);
  // A Lot token's number painted on the door — the household's only name now.
  g.fillStyle(PAPER, 1); g.fillRect(x - 5, y - 26, 10, 6);
}

/** A photographer's box camera on a tripod, its black hood thrown back, a flash tray raised. */
export function boxCamera(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 48, 12);
  g.lineStyle(2.5, TIMBER_DARK, 1);
  g.lineBetween(x, y - 44, x - 18, y); g.lineBetween(x, y - 44, x + 18, y); g.lineBetween(x, y - 44, x + 2, y - 2);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 14, y - 64, 28, 22);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 14, y - 64, 28, 3);
  // Bellows and lens.
  g.fillStyle(0x2a221c, 1); g.fillRect(x + 14, y - 60, 12, 14);
  for (let k = 0; k < 4; k++) { g.lineStyle(1, 0x4a3a2a, 1); g.lineBetween(x + 16 + k * 3, y - 60, x + 16 + k * 3, y - 46); }
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x + 29, y - 53, 6);
  g.fillStyle(0x101010, 1); g.fillCircle(x + 29, y - 53, 4);
  g.fillStyle(0xffffff, 0.5); g.fillCircle(x + 28, y - 54, 1.3);
  // The black hood thrown back over the top.
  g.fillStyle(0x161412, 1); g.fillTriangle(x - 16, y - 64, x + 8, y - 64, x - 22, y - 42);
  // The flash tray on its rod.
  g.lineStyle(1.5, 0x3a3a3a, 1); g.lineBetween(x - 6, y - 64, x - 10, y - 84);
  g.fillStyle(0x8a8a8a, 1); g.fillRect(x - 20, y - 88, 20, 4);
}

/** The Remembrance waystone: a grey standing stone with a gilt locket set into its face. */
export function remWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 12);
  g.fillStyle(STONE_DARK, 1); g.fillRoundedRect(x - 16, y - 58, 32, 58, 10);
  g.fillStyle(STONE, 1); g.fillRoundedRect(x - 14, y - 56, 26, 54, 9);
  g.fillStyle(STONE_LIT, 0.6); g.fillRect(x - 12, y - 52, 5, 40);
  g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y - 34, 8);
  g.fillStyle(GILT, 1); g.fillCircle(x, y - 34, 6.5);
  g.lineStyle(1, GILT_LIT, 1); g.strokeCircle(x, y - 34, 4);
  g.lineStyle(1, GILT_DARK, 1); g.lineBetween(x, y - 42, x, y - 50);
  for (let i = 0; i < 6; i++) fmn(g, x - 14 + i * 5.5, y - 1, 1.6, 1);
}

/** A notice board of lapsed pawn tickets, red-stamped LAPSED, one fluttering loose. */
export function ticketBoard(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 60, 10);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 26, y - 34, 4, 34); g.fillRect(x + 22, y - 34, 4, 34);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 32, y - 78, 64, 46);
  g.fillStyle(0x6a5a40, 1); g.fillRect(x - 29, y - 75, 58, 40);
  for (let i = 0; i < 12; i++) {
    const tx = x - 26 + (i % 4) * 14, ty = y - 72 + Math.floor(i / 4) * 12;
    g.fillStyle(PAPER, 1); g.fillRect(tx + rng() * 2, ty + rng() * 2, 11, 9);
    g.fillStyle(0xa83a2a, 0.85); g.fillRect(tx + 1, ty + 4, 9, 2);
  }
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 36, y - 78, x + 36, y - 78, x, y - 90);
}

/** A ferry landing: a short jetty into the Lethe, a flat punt with a lantern, and the bell post. */
export function ferryLanding(g: G, x: number, y: number): void {
  // Jetty boards running north into the pool from `y`.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 22, y - 70, 44, 70);
  for (let by = y - 68; by < y; by += 8) { g.fillStyle(TIMBER, 1); g.fillRect(x - 20, by, 40, 6); }
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 22 - 3, y - 76, 6, 12); }
  // The punt moored alongside.
  g.fillStyle(0x3a2a1c, 1); g.fillRoundedRect(x + 26, y - 66, 34, 80, 10);
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(x + 29, y - 62, 28, 72, 8);
  for (let k = 0; k < 3; k++) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 29, y - 50 + k * 22, 28, 3); }
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(x + 44, y - 70, x + 58, y + 20);
  g.fillStyle(LAMP_GREEN, 1); g.fillRect(x + 38, y - 64, 8, 10);
  g.fillStyle(LAMP_LIGHT, 0.8); g.fillRect(x + 40, y - 62, 4, 6);
  // The ferry bell on its post.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 36, y - 64, 5, 64);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 36, y - 64, 18, 4);
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 26, y - 58, x - 16, y - 58, x - 21, y - 70);
  g.fillStyle(GILT, 1); g.fillEllipse(x - 21, y - 56, 14, 5);
}

/** A sepia mist bank drifting low over the ground, for the animators. */
export function mistBank(g: G, x: number, y: number, w: number, a: number): void {
  for (let i = 0; i < 5; i++) {
    g.fillStyle(i % 2 ? SEPIA_PALE : SEPIA_LIT, a * (0.5 + i * 0.1));
    g.fillEllipse(x + (i - 2) * w * 0.18, y + Math.sin(i * 1.7) * 6, w * (0.45 + (i % 3) * 0.12), 26 + (i % 2) * 10);
  }
}

/** A pressed suit hedge (heart, spade, diamond or club), faded, on a stone kerb. */
export function suitHedge(g: G, x: number, y: number, suit: 0 | 1 | 2 | 3, s = 1): void {
  shadow(g, x, y + 2, 40 * s, 10 * s);
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 16 * s, y - 6 * s, 32 * s, 6 * s);
  const c = 0x4e6a46, cl = 0x6a8a5a;
  const cy = y - 26 * s;
  g.fillStyle(dim(c, 0.3), 1);
  const blobs = (pts: [number, number, number][]) => { for (const [dx, dy, r] of pts) { g.fillStyle(dim(c, 0.3), 1); g.fillCircle(x + dx * s, cy + dy * s + 1.5, r * s); } for (const [dx, dy, r] of pts) { g.fillStyle(c, 1); g.fillCircle(x + dx * s, cy + dy * s, r * s); } };
  if (suit === 0) { blobs([[-7, -4, 9], [7, -4, 9]]); g.fillStyle(c, 1); g.fillTriangle(x - 15 * s, cy, x + 15 * s, cy, x, cy + 18 * s); }
  else if (suit === 1) { g.fillStyle(c, 1); g.fillTriangle(x - 15 * s, cy + 4 * s, x + 15 * s, cy + 4 * s, x, cy - 18 * s); blobs([[-7, 5, 8], [7, 5, 8]]); g.fillStyle(c, 1); g.fillRect(x - 2 * s, cy + 8 * s, 4 * s, 12 * s); }
  else if (suit === 2) { g.fillStyle(c, 1); g.fillTriangle(x - 13 * s, cy, x + 13 * s, cy, x, cy - 18 * s); g.fillTriangle(x - 13 * s, cy, x + 13 * s, cy, x, cy + 18 * s); }
  else { blobs([[0, -8, 8], [-8, 3, 8], [8, 3, 8]]); g.fillStyle(c, 1); g.fillRect(x - 2 * s, cy + 6 * s, 4 * s, 14 * s); }
  g.fillStyle(cl, 0.5); g.fillCircle(x - 4 * s, cy - 6 * s, 4 * s);
}

/** A seated, labelled crate of unclaimed bottles waiting to go to the Lethe. */
export function unclaimedCrate(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 46, 10);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 20, y - 22, 40, 22);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 18, y - 20, 36, 18);
  g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x - 18, y - 11, x + 18, y - 11);
  for (let k = 0; k < 4; k++) memoryBottle(g, x - 13 + k * 9, y - 20, 0.5, MEMORY_COLORS[Math.floor(rng() * 6)], 0.4);
  g.fillStyle(PAPER, 1); g.fillRect(x - 8, y - 16, 16, 7);
  g.fillStyle(0xa83a2a, 1); g.fillRect(x - 6, y - 14, 12, 2);
}

/** A sepia ghost of a figure (a recollection): a soft silhouette with a pale outline. */
export function recollection(g: G, x: number, y: number, r: number, a: number, color = SEPIA_LIT): void {
  g.fillStyle(color, 0.25 * a); g.fillEllipse(x, y + r * 0.9, r * 1.8, r * 0.5);
  g.fillStyle(color, 0.35 * a); g.fillCircle(x, y, r);
  g.fillStyle(color, 0.3 * a); g.fillCircle(x, y - r * 1.1, r * 0.55);
  g.lineStyle(1.5, SEPIA_PALE, 0.6 * a); g.strokeCircle(x, y, r); g.strokeCircle(x, y - r * 1.1, r * 0.55);
  g.lineStyle(1, SEPIA_DARK, 0.4 * a);
  for (let k = -2; k <= 2; k++) g.lineBetween(x - r + 2, y + k * r * 0.3, x + r - 2, y + k * r * 0.3);
}

/** The deep sepia used for remembered telegraphs everywhere in the court. */
export const RECALL_INK = SEPIA_DEEP;
/** Forget-me-not blues for any painter that needs the set. */
export const FMN_SET = [FMN_BLUE, FMN_LIT, FMN_DARK];
