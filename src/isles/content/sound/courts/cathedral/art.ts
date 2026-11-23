import Phaser from 'phaser';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  ASHLAR, ASHLAR_DARK, ASHLAR_DEEP, ASHLAR_LIT, BRONZE, BRONZE_DARK, BRONZE_LIT, CANDLELIGHT, CASSOCK, CRAG, CRAG_DARK,
  CRAG_LIT, CRIMSON, FLAME, FLAME_CORE, GILT, GILT_DARK, GILT_LIT, GLASS_BLUE, GLASS_COLORS, GLASS_GOLD, GLASS_GREEN,
  GLASS_RED, GLASS_VIOLET, ICE, ICE_DEEP, ICE_LIT, LEAD, OAK, OAK_DARK, OAK_LIT, PIPE, PIPE_DARK, PIPE_LIT, RIBBON,
  SLATE, SLATE_DARK, SLATE_LIT, SNOW, SNOW_LIT, SNOW_SHADE, SURPLICE, WAX, WAX_RED, WAX_SHADE,
} from './palette';

/**
 * Cathedral set pieces — the summit's shapes. Everything here is *pointed and tall*: lancet
 * windows, pinnacles, pipes and spires, all reaching for the Organ above. Snow lies on every
 * ledge and sill, and wherever there is glass or wax there is colour or flame. Nothing on the
 * summit is plain stone without something lit in front of it; the Precentor sees to that, and
 * charges for every candle.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

// ── Small shapes ─────────────────────────────────────────────────────

/** A pointed (lancet) arch, filled: `x` centre, `yBase` sill, `w` wide, `h` tall to the point. */
export function lancetShape(g: G, x: number, yBase: number, w: number, h: number, color: number, a = 1): void {
  const hw = w / 2;
  const rise = Math.min(h * 0.6, w * 0.866);
  const spring = yBase - (h - rise);
  const sy = rise / (w * 0.866);
  const pts = [P(x - hw, yBase), P(x - hw, spring)];
  // Left curve: an arc of radius w about the right springer, from the springing to the point.
  for (let i = 1; i <= 7; i++) {
    const ang = Math.PI - (i / 7) * (Math.PI / 3);
    pts.push(P(x + hw + Math.cos(ang) * w, spring - Math.sin(ang) * w * sy));
  }
  // Right curve, mirrored.
  for (let i = 6; i >= 0; i--) {
    const ang = Math.PI - (i / 7) * (Math.PI / 3);
    pts.push(P(x - hw - Math.cos(ang) * w, spring - Math.sin(ang) * w * sy));
  }
  pts.push(P(x + hw, yBase));
  g.fillStyle(color, a);
  g.fillPoints(pts, true);
}

/**
 * A lancet window: stone surround, leaded panes in jewel colours, a snow-heaped sill. `glowA`
 * lights it from inside (candles behind the glass).
 */
export function lancet(g: G, x: number, yBase: number, w: number, h: number, seed: number, glowA = 0.6): void {
  lancetShape(g, x, yBase + 3, w + 8, h + 6, ASHLAR_DARK);
  lancetShape(g, x, yBase, w, h, LEAD);
  // Panes: rows of diamonds in rotating colours, brighter toward the point.
  const rows = Math.max(3, Math.round(h / 12));
  for (let r = 0; r < rows; r++) {
    const yy = yBase - 4 - (r * (h - 10)) / rows;
    const narrow = r > rows - 3 ? 0.55 - (r - (rows - 3)) * 0.18 : 1;
    for (let c = -1; c <= 1; c++) {
      const col = GLASS_COLORS[(seed + r * 2 + c + 5) % GLASS_COLORS.length];
      const px = x + c * (w / 3) * narrow;
      g.fillStyle(col, glowA);
      g.fillTriangle(px, yy - 6, px - (w / 6) * narrow + 0.5, yy, px + (w / 6) * narrow - 0.5, yy);
      g.fillStyle(dim(col, 0.2), glowA);
      g.fillTriangle(px, yy + 5, px - (w / 6) * narrow + 0.5, yy, px + (w / 6) * narrow - 0.5, yy);
    }
  }
  g.lineStyle(1, LEAD, 0.9); g.lineBetween(x, yBase, x, yBase - h + 4);
  g.fillStyle(FLAME_CORE, 0.18 * glowA); g.fillRect(x - w * 0.3, yBase - h * 0.6, w * 0.12, h * 0.45);
  // Sill and its snow.
  g.fillStyle(ASHLAR_LIT, 1); g.fillRect(x - w / 2 - 5, yBase, w + 10, 4);
  g.fillStyle(SNOW, 1); g.fillEllipse(x, yBase - 1, w + 12, 6);
}

/** A ledge of snow along the top of anything: a lumpy white band with a shaded underside. */
export function snowCap(g: G, x0: number, y: number, w: number, depth = 6): void {
  g.fillStyle(SNOW_SHADE, 1); g.fillRect(x0, y, w, depth * 0.6);
  g.fillStyle(SNOW, 1); g.fillRect(x0, y - depth * 0.5, w, depth * 0.7);
  for (let x = x0; x < x0 + w; x += 9) { g.fillStyle(SNOW_LIT, 1); g.fillEllipse(x + 4, y - depth * 0.5, 9, depth * 0.7); }
}

/** A drift heaped against a wall or a stone. */
export function snowDrift(g: G, x: number, y: number, w: number, rng: () => number): void {
  g.fillStyle(SNOW_SHADE, 0.9); g.fillEllipse(x, y + 2, w, w * 0.28);
  for (let i = 0; i < 4; i++) { g.fillStyle(SNOW, 1); g.fillEllipse(x - w * 0.3 + rng() * w * 0.6, y - 2, w * (0.3 + rng() * 0.25), w * 0.18); }
  g.fillStyle(SNOW_LIT, 0.8); g.fillEllipse(x - w * 0.1, y - 4, w * 0.3, w * 0.07);
}

/**
 * One candle: a wax stem with a drip, a black wick, and its flame (static; animate adds the
 * flicker). `h` is the stem height. Unlit candles show a curl of smoke-stain.
 */
export function candle(g: G, x: number, y: number, h: number, isLit: boolean, wax = WAX, flick = 0): void {
  g.fillStyle(dim(wax, 0.25), 1); g.fillRect(x - 2.6, y - h, 5.2, h);
  g.fillStyle(wax, 1); g.fillRect(x - 2.2, y - h, 3.6, h);
  g.fillStyle(lit(wax, 0.4), 1); g.fillEllipse(x, y - h, 5.2, 2);
  g.fillStyle(wax, 1); g.fillEllipse(x + 2.4, y - h + 4, 2, 5);
  g.lineStyle(1, 0x1a1410, 1); g.lineBetween(x, y - h, x, y - h - 3);
  if (isLit) {
    const fh = 7 + flick * 2;
    g.fillStyle(FLAME, 0.9); g.fillEllipse(x + flick * 0.6, y - h - 4 - fh * 0.3, 4.6, fh);
    g.fillStyle(FLAME_CORE, 1); g.fillEllipse(x + flick * 0.4, y - h - 3 - fh * 0.2, 2.2, fh * 0.55);
    g.fillStyle(0x4a7cff, 0.6); g.fillCircle(x, y - h - 2.5, 1);
  } else {
    g.fillStyle(0x1a1410, 0.5); g.fillCircle(x, y - h - 3.5, 1);
  }
}

/**
 * A votive hearse: an iron stand in three stepped tiers of candles, a coin box with a slot at
 * its foot and a drip-tray of spilled wax. `litFrac` chooses how many are burning.
 */
export function candleRack(g: G, x: number, y: number, w: number, litFrac: number, rng: () => number): void {
  shadow(g, x, y + 2, w * 1.1, 14);
  const iron = 0x2a2a30;
  // The tiers, back to front.
  for (let t = 0; t < 3; t++) {
    const ty = y - 34 + t * 12, tw = w - (2 - t) * 0;
    const tx0 = x - tw / 2 + (2 - t) * 6;
    const tw2 = tw - (2 - t) * 12;
    g.fillStyle(iron, 1); g.fillRect(tx0, ty, tw2, 4);
    g.fillStyle(WAX_SHADE, 0.8); g.fillRect(tx0 + 2, ty - 1, tw2 - 4, 2);
    const n = Math.floor(tw2 / 9);
    for (let i = 0; i < n; i++) {
      const cx = tx0 + 5 + i * 9;
      candle(g, cx, ty, 6 + rng() * 10, rng() < litFrac, rng() < 0.15 ? WAX_RED : WAX);
    }
  }
  // Legs, the coin box and the spill.
  g.lineStyle(2.5, iron, 1);
  g.lineBetween(x - w / 2 + 4, y - 10, x - w / 2 + 2, y); g.lineBetween(x + w / 2 - 4, y - 10, x + w / 2 - 2, y);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 10, y - 12, 20, 12);
  g.fillStyle(OAK, 1); g.fillRect(x - 9, y - 12, 18, 9);
  g.fillStyle(GILT, 1); g.fillRect(x - 5, y - 9, 10, 2);
  g.fillStyle(0x0a0808, 1); g.fillRect(x - 4, y - 8.6, 8, 1);
  g.fillStyle(WAX, 0.55); g.fillEllipse(x + w * 0.2, y + 1, w * 0.35, 5);
  if (litFrac > 0) glow(g, x, y - 34, w * 0.7, CANDLELIGHT, 0.05 * litFrac + 0.02, 3);
}

/** An iron lamp-standard with a lantern, snow on its cap. */
export function lantern(g: G, x: number, y: number, isLit = true): void {
  shadow(g, x, y + 2, 20, 6);
  g.fillStyle(0x24242a, 1); g.fillRect(x - 2, y - 58, 4, 58);
  g.fillRect(x - 7, y - 4, 14, 4);
  g.fillStyle(0x24242a, 1); g.fillRect(x - 8, y - 76, 16, 3); g.fillRect(x - 6, y - 60, 12, 3);
  g.fillStyle(isLit ? CANDLELIGHT : 0x504a40, isLit ? 0.9 : 1); g.fillRect(x - 6, y - 73, 12, 13);
  g.lineStyle(1, 0x24242a, 1); g.lineBetween(x, y - 73, x, y - 60);
  g.fillStyle(0x24242a, 1); g.fillTriangle(x - 9, y - 76, x + 9, y - 76, x, y - 86);
  g.fillStyle(SNOW, 1); g.fillTriangle(x - 7, y - 78, x + 7, y - 78, x, y - 85);
  if (isLit) glow(g, x, y - 66, 34, CANDLELIGHT, 0.06, 3);
}

/** A snow-laden yew, dark and conical, the kind that grows in every churchyard. */
export function snowYew(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 50 * s, 14 * s);
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const ty = y - 8 * s - t * 20 * s, tw = (46 - t * 9) * s;
    g.fillStyle(0x13261c, 1); g.fillTriangle(x - tw / 2, ty, x + tw / 2, ty, x, ty - 30 * s);
    g.fillStyle(0x1e3a2a, 1); g.fillTriangle(x - tw / 2 + 3, ty - 2, x + 1, ty - 2, x, ty - 28 * s);
    // Snow on each tier's shoulders.
    g.fillStyle(SNOW, 1);
    g.fillTriangle(x - tw / 2 + 2, ty - 1, x - tw * 0.1, ty - 4 * s, x - tw * 0.32, ty - 9 * s);
    g.fillTriangle(x + tw / 2 - 2, ty - 1, x + tw * 0.15, ty - 5 * s, x + tw * 0.3, ty - 9 * s);
  }
  g.fillStyle(SNOW_LIT, 1); g.fillTriangle(x - 5 * s, y - 8 * s - 3 * 20 * s - 18 * s, x + 5 * s, y - 8 * s - 3 * 20 * s - 18 * s, x, y - 8 * s - 3 * 20 * s - 30 * s);
  g.fillStyle(0x3a2618, 1); g.fillRect(x - 3 * s, y - 8 * s, 6 * s, 8 * s);
  if (rng() < 0.5) { g.fillStyle(SNOW_SHADE, 0.8); g.fillEllipse(x + 6 * s, y + 1, 30 * s, 7 * s); }
}

// ── Glass ────────────────────────────────────────────────────────────

/**
 * A rose window, face on: an outer stone ring with small foils, twelve petals of jewel glass in
 * two courses (inner and outer), radiating tracery, and a gilt boss at the heart carrying the
 * Maestro's tuning fork. `rot` turns the glass; `a` dims it (for floors and light-spill).
 */
export function roseWindow(g: G, cx: number, cy: number, r: number, rot = 0, a = 1, stone = ASHLAR): void {
  const N = 12;
  // Stone surround.
  g.fillStyle(dim(stone, 0.35), a); g.fillCircle(cx, cy, r + r * 0.12);
  g.fillStyle(stone, a); g.fillCircle(cx, cy, r + r * 0.08);
  g.fillStyle(LEAD, a); g.fillCircle(cx, cy, r);
  const inner = r * 0.52;
  for (let i = 0; i < N; i++) {
    const a0 = rot + (i / N) * Math.PI * 2, a1 = rot + ((i + 1) / N) * Math.PI * 2;
    const cOut = GLASS_COLORS[(i + 1) % 3 === 0 ? 2 : (i + 1) % 3 === 1 ? 0 : 1];
    const cIn = GLASS_COLORS[i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 0];
    g.fillStyle(cOut, a * 0.9); g.slice(cx, cy, r * 0.96, a0 + 0.03, a1 - 0.03, false); g.fillPath();
    g.fillStyle(LEAD, a); g.fillCircle(cx, cy, inner + r * 0.04);
    g.fillStyle(cIn, a * 0.9); g.slice(cx, cy, inner, a0 + 0.05, a1 - 0.05, false); g.fillPath();
    // A lit streak in each outer pane.
    const am = (a0 + a1) / 2;
    g.fillStyle(lit(cOut, 0.45), a * 0.35);
    g.fillCircle(cx + Math.cos(am - 0.08) * r * 0.74, cy + Math.sin(am - 0.08) * r * 0.74, r * 0.07);
  }
  // Redraw the inner ring's lead once (slices overlap it), then the inner glass again on top.
  g.lineStyle(Math.max(1.5, r * 0.035), LEAD, a); g.strokeCircle(cx, cy, inner + r * 0.02);
  // Spokes of tracery, stone over lead.
  for (let i = 0; i < N; i++) {
    const b = rot + (i / N) * Math.PI * 2;
    g.lineStyle(Math.max(1.5, r * 0.05), dim(stone, 0.2), a);
    g.lineBetween(cx + Math.cos(b) * r * 0.2, cy + Math.sin(b) * r * 0.2, cx + Math.cos(b) * r, cy + Math.sin(b) * r);
    g.lineStyle(Math.max(1, r * 0.025), stone, a);
    g.lineBetween(cx + Math.cos(b) * r * 0.2, cy + Math.sin(b) * r * 0.2, cx + Math.cos(b) * r, cy + Math.sin(b) * r);
  }
  // Foils round the rim.
  for (let i = 0; i < N; i++) {
    const b = rot + ((i + 0.5) / N) * Math.PI * 2;
    const fx = cx + Math.cos(b) * r * 1.02, fy = cy + Math.sin(b) * r * 1.02;
    g.fillStyle(LEAD, a); g.fillCircle(fx, fy, r * 0.07);
    g.fillStyle(GLASS_COLORS[(i + 3) % 5], a * 0.85); g.fillCircle(fx, fy, r * 0.05);
  }
  // The boss: a gilt disc with the Maestro's fork.
  g.fillStyle(GILT_DARK, a); g.fillCircle(cx, cy, r * 0.2);
  g.fillStyle(GILT, a); g.fillCircle(cx, cy, r * 0.17);
  tuningFork(g, cx, cy + r * 0.1, r * 0.22, LEAD, a);
}

/** The Maestro's sign: a tuning fork, stem down. Painted on everything the Score owns. */
export function tuningFork(g: G, x: number, yBase: number, h: number, color: number, a = 1): void {
  const w = Math.max(1, h * 0.1);
  g.lineStyle(w, color, a);
  g.lineBetween(x, yBase, x, yBase - h * 0.45);
  g.beginPath(); g.arc(x, yBase - h * 0.45, h * 0.18, 0, Math.PI, false); g.strokePath();
  g.lineBetween(x - h * 0.18, yBase - h * 0.45, x - h * 0.18, yBase - h);
  g.lineBetween(x + h * 0.18, yBase - h * 0.45, x + h * 0.18, yBase - h);
}

// ── Pipes ────────────────────────────────────────────────────────────

/**
 * One organ pipe, standing on its foot: a cone foot, a cylinder body with its mouth (the lip
 * and the dark slot the wind speaks through) and a bright edge down one side. `voice` > 0 gives
 * the sealed voice inside a faint glow at the mouth.
 */
export function organPipe(g: G, x: number, yBase: number, w: number, h: number, voice = 0): void {
  const foot = Math.min(26, h * 0.18);
  g.fillStyle(PIPE_DARK, 1); g.fillTriangle(x - w / 2, yBase - foot, x + w / 2, yBase - foot, x, yBase);
  g.fillStyle(PIPE, 1); g.fillTriangle(x - w / 2 + 1.5, yBase - foot, x, yBase - foot, x, yBase - 1);
  g.fillStyle(PIPE_DARK, 1); g.fillRect(x - w / 2, yBase - h, w, h - foot);
  g.fillStyle(PIPE, 1); g.fillRect(x - w / 2 + 1, yBase - h, w - 2.5, h - foot);
  g.fillStyle(PIPE_LIT, 0.85); g.fillRect(x - w / 2 + 2, yBase - h, Math.max(1.5, w * 0.18), h - foot);
  g.fillStyle(PIPE_DARK, 0.6); g.fillRect(x + w / 2 - Math.max(2, w * 0.22), yBase - h, Math.max(2, w * 0.22), h - foot);
  // The mouth: an upper lip and a dark slot.
  const my = yBase - foot - Math.min(20, h * 0.08);
  g.fillStyle(0x14161c, 1); g.fillRect(x - w * 0.32, my - 3, w * 0.64, 4);
  g.fillStyle(PIPE_LIT, 1); g.fillTriangle(x - w * 0.32, my - 3, x + w * 0.32, my - 3, x, my - 3 - w * 0.5);
  g.fillStyle(PIPE_DARK, 1); g.fillTriangle(x - w * 0.32, my - 3, x + w * 0.32, my - 3, x, my - 3 - w * 0.3);
  if (voice > 0) glow(g, x, my - 1, w * 0.9, 0xdde8ff, 0.07 * voice, 3);
  // A rim and the snow on it.
  g.fillStyle(PIPE_LIT, 1); g.fillRect(x - w / 2, yBase - h, w, 2);
  g.fillStyle(SNOW, 0.9); g.fillEllipse(x, yBase - h, w * 0.9, 3);
}

/** A flat of pipes, tallest in the middle, like the front of a case. */
export function pipeFlat(g: G, x: number, yBase: number, n: number, w: number, hMax: number, voice = 0): void {
  for (let i = 0; i < n; i++) {
    const k = (i - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
    const h = hMax * (1 - Math.abs(k) * 0.45);
    organPipe(g, x + (i - (n - 1) / 2) * (w + 2), yBase - Math.abs(k) * 6, w, h, voice);
  }
}

// ── Bells ────────────────────────────────────────────────────────────

/** A handbell on its leather strap, mouth down. `ring` > 0 swings and brightens it. */
export function handbell(g: G, x: number, y: number, s: number, tone: number, ring = 0): void {
  const sw = Math.sin(ring * 9) * ring * 0.35;
  const top = y - 24 * s;
  // Strap.
  g.lineStyle(3 * s, 0x5a3420, 1); g.lineBetween(x, top - 10 * s, x + Math.sin(sw) * 4, top);
  g.fillStyle(0x5a3420, 1); g.fillEllipse(x, top - 11 * s, 9 * s, 5 * s);
  // Bell: waist, shoulder and a flared lip.
  const lx = Math.sin(sw) * 6 * s;
  const pts = [P(x - 5 * s, top), P(x + 5 * s, top), P(x + 8 * s + lx, top + 12 * s), P(x + 13 * s + lx, top + 22 * s), P(x - 13 * s + lx, top + 22 * s), P(x - 8 * s + lx, top + 12 * s)];
  g.fillStyle(BRONZE_DARK, 1); g.fillPoints(pts, true);
  g.fillStyle(ring > 0 ? lit(BRONZE, 0.25) : BRONZE, 1);
  g.fillPoints([P(x - 4 * s, top + 1), P(x + 2 * s, top + 1), P(x + 4 * s + lx, top + 12 * s), P(x + 6 * s + lx, top + 21 * s), P(x - 11 * s + lx, top + 21 * s), P(x - 7 * s + lx, top + 12 * s)], true);
  g.fillStyle(BRONZE_LIT, 0.8); g.fillRect(x - 5 * s + lx * 0.5, top + 4 * s, 2 * s, 14 * s);
  g.fillStyle(tone, 1); g.fillEllipse(x + lx, top + 22 * s, 26 * s, 5 * s);
  g.fillStyle(0x1a1008, 1); g.fillEllipse(x + lx, top + 22.5 * s, 20 * s, 3 * s);
  g.fillStyle(BRONZE_DARK, 1); g.fillCircle(x + lx * 1.4, top + 24 * s, 2.4 * s);
}

/**
 * The Angelus bell in its frame: two oak posts and a braced headstock, a great bronze bell
 * hung low with its rope coiled on a cleat, snow along the beam.
 */
export function bellFrame(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 4, 200, 30);
  for (const k of [-1, 1]) {
    g.fillStyle(OAK_DARK, 1); g.fillRect(x + k * 80 - 7, y - 170, 14, 170);
    g.fillStyle(OAK, 1); g.fillRect(x + k * 80 - 6, y - 170, 10, 170);
    g.lineStyle(6, OAK_DARK, 1); g.lineBetween(x + k * 80, y - 2, x + k * 104, y + 2);
    g.lineStyle(5, OAK, 1); g.lineBetween(x + k * 80, y - 110, x + k * 36, y - 160);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 100, y - 182, 200, 16);
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 100, y - 182, 200, 5);
  snowCap(g, x - 102, y - 183, 204, 8);
  // The bell.
  const by = y - 160;
  g.fillStyle(BRONZE_DARK, 1);
  g.fillPoints([P(x - 22, by), P(x + 22, by), P(x + 34, by + 40), P(x + 52, by + 84), P(x - 52, by + 84), P(x - 34, by + 40)], true);
  g.fillStyle(BRONZE, 1);
  g.fillPoints([P(x - 20, by + 2), P(x + 10, by + 2), P(x + 20, by + 40), P(x + 30, by + 82), P(x - 48, by + 82), P(x - 32, by + 40)], true);
  g.fillStyle(BRONZE_LIT, 0.7); g.fillRect(x - 26, by + 10, 5, 62);
  for (const yy of [by + 18, by + 62]) { g.lineStyle(2, BRONZE_DARK, 0.8); g.lineBetween(x - 40 + (yy - by) * 0.2, yy, x + 40 - (yy - by) * 0.2 + 12, yy); }
  g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(x, by + 84, 106, 12);
  g.fillStyle(0x140c06, 1); g.fillEllipse(x, by + 86, 92, 7);
  g.fillStyle(BRONZE_DARK, 1); g.fillCircle(x + 4, by + 92, 7);
  // Inscription band: notes in raised bronze.
  for (let i = 0; i < 6; i++) { g.fillStyle(BRONZE_LIT, 0.6); g.fillCircle(x - 28 + i * 11, by + 40 + (i % 2) * 2, 2); }
  // Rope down to a cleat, coiled.
  g.lineStyle(2.5, 0xc8a878, 1); g.lineBetween(x + 60, by - 14, x + 72, y - 30);
  for (let i = 0; i < 3; i++) { g.lineStyle(2, 0xb89868, 1); g.strokeEllipse(x + 76, y - 10 + i * 2, 22 - i * 3, 7); }
  snowDrift(g, x - 60, y + 2, 60, rng);
}

// ── Furniture of the faith ───────────────────────────────────────────

/**
 * The reliquary: a gilt casket shaped like a little church, with a crystal window showing the
 * relic — a brass tuning-reed said to be the Maestro's first Part — carried on two poles.
 */
export function reliquary(g: G, x: number, y: number, s: number, glint = 0, poles = true): void {
  if (poles) {
    for (const k of [-1, 1]) {
      g.lineStyle(4 * s, OAK_DARK, 1); g.lineBetween(x - 46 * s, y + k * 10 * s, x + 46 * s, y + k * 10 * s);
      g.fillStyle(GILT, 1); g.fillCircle(x - 46 * s, y + k * 10 * s, 2.5 * s); g.fillCircle(x + 46 * s, y + k * 10 * s, 2.5 * s);
    }
  }
  const top = y - 26 * s;
  g.fillStyle(GILT_DARK, 1); g.fillRect(x - 20 * s, top, 40 * s, 24 * s);
  g.fillStyle(GILT, 1); g.fillRect(x - 19 * s, top + 1, 36 * s, 21 * s);
  g.fillStyle(GILT_DARK, 1); g.fillTriangle(x - 24 * s, top + 1, x + 24 * s, top + 1, x, top - 18 * s);
  g.fillStyle(GILT_LIT, 1); g.fillTriangle(x - 20 * s, top, x + 14 * s, top, x - 2 * s, top - 15 * s);
  // Crystal window and the reed inside.
  g.fillStyle(0x3a2a10, 1); g.fillRect(x - 8 * s, top + 4 * s, 16 * s, 14 * s);
  g.fillStyle(0xd8f0ff, 0.5); g.fillRect(x - 7 * s, top + 5 * s, 14 * s, 12 * s);
  g.fillStyle(BRONZE_LIT, 1); g.fillRect(x - 5 * s, top + 10 * s, 10 * s, 2 * s);
  // Jewels and the finial.
  for (const [jx, c] of [[-14, GLASS_RED], [14, GLASS_BLUE]] as [number, number][]) { g.fillStyle(c, 1); g.fillCircle(x + jx * s, top + 11 * s, 2.4 * s); }
  g.lineStyle(2 * s, GILT, 1); g.lineBetween(x, top - 18 * s, x, top - 26 * s);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(x, top - 27 * s, 3 * s);
  if (glint > 0) glow(g, x, top + 4 * s, 34 * s, GILT_LIT, 0.05 * glint, 3);
}

/**
 * A confession booth: a tall oak cabinet with a pointed hood, two doors with pierced quatrefoil
 * grilles, a velvet curtain on the penitent's side and a little lamp that burns while it is in
 * use. `open` swings the door ajar (0..1); `occupied` lights the lamp.
 */
export function confessional(g: G, x: number, y: number, s: number, open = 0, occupied = false): void {
  shadow(g, x, y + 2, 88 * s, 18 * s);
  const w = 74 * s, h = 112 * s;
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 - 3 * s, top, w + 6 * s, h);
  g.fillStyle(OAK, 1); g.fillRect(x0, top + 2 * s, w, h - 2 * s);
  // The hood: a pointed gable with crockets.
  g.fillStyle(OAK_DARK, 1); g.fillTriangle(x0 - 8 * s, top + 4 * s, x0 + w + 8 * s, top + 4 * s, x, top - 34 * s);
  g.fillStyle(OAK_LIT, 1); g.fillTriangle(x0 - 2 * s, top + 2 * s, x0 + w - 10 * s, top + 2 * s, x - 4 * s, top - 28 * s);
  for (let i = 0; i < 4; i++) {
    const k = i / 4;
    g.fillStyle(OAK_LIT, 1); g.fillCircle(x0 - 6 * s + (x - x0 + 6 * s) * k, top + 2 * s - 36 * s * k, 2.4 * s);
  }
  g.fillStyle(GILT, 1); g.fillCircle(x, top - 36 * s, 3 * s);
  g.fillStyle(SNOW, 1); g.fillTriangle(x - 10 * s, top - 22 * s, x + 10 * s, top - 22 * s, x, top - 34 * s);
  // Two doors, each with a grille.
  for (const k of [-1, 1]) {
    const dx = x + k * w * 0.25;
    const ajar = k === 1 ? open : 0;
    g.fillStyle(0x140c08, 1); g.fillRect(dx - w * 0.21, top + 10 * s, w * 0.42, h - 14 * s);
    if (k === -1) {
      // The penitent's curtain.
      g.fillStyle(CRIMSON, 1); g.fillRect(dx - w * 0.2, top + 12 * s, w * 0.4, h - 18 * s);
      for (let f = 0; f < 4; f++) { g.fillStyle(dim(CRIMSON, 0.35), 1); g.fillRect(dx - w * 0.18 + f * w * 0.1, top + 12 * s, 2 * s, h - 18 * s); }
      g.fillStyle(GILT, 1); g.fillRect(dx - w * 0.21, top + 11 * s, w * 0.42, 2 * s);
    } else {
      const dw = w * 0.42 * (1 - ajar * 0.75);
      g.fillStyle(OAK_LIT, 1); g.fillRect(dx - w * 0.21, top + 10 * s, dw, h - 14 * s);
      g.fillStyle(OAK_DARK, 1); g.fillRect(dx - w * 0.21 + dw - 2 * s, top + 10 * s, 2 * s, h - 14 * s);
      if (ajar < 0.5) {
        const gx = dx - w * 0.21 + dw / 2, gy = top + 34 * s;
        g.fillStyle(0x140c08, 1);
        for (const [ox, oy] of [[0, -5], [0, 5], [-5, 0], [5, 0]] as [number, number][]) g.fillCircle(gx + ox * s, gy + oy * s, 3.4 * s);
        g.fillStyle(GILT, 1); g.fillCircle(gx + dw * 0.32, top + 62 * s, 1.8 * s);
      }
    }
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 3 * s, top + 8 * s, 6 * s, h - 10 * s);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 - 4 * s, y - 6 * s, w + 8 * s, 6 * s);
  // The lamp over the middle post.
  g.fillStyle(occupied ? FLAME : 0x4a3a2a, 1); g.fillCircle(x, top + 2 * s, 3.4 * s);
  if (occupied) glow(g, x, top + 2 * s, 20 * s, CANDLELIGHT, 0.08, 3);
}

/** A row of choir stalls seen from in front: carved oak backs, misericord seats, a book-rest. */
export function choirStalls(g: G, x0: number, y: number, n: number, seatW = 34): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * seatW;
    g.fillStyle(OAK_DARK, 1); g.fillRect(x, y - 54, seatW - 2, 54);
    g.fillStyle(OAK, 1); g.fillRect(x + 2, y - 52, seatW - 6, 34);
    // A pinnacled canopy over each seat.
    g.fillStyle(OAK_DARK, 1); g.fillTriangle(x - 1, y - 54, x + seatW - 1, y - 54, x + seatW / 2 - 1, y - 74);
    g.fillStyle(OAK_LIT, 1); g.fillTriangle(x + 3, y - 55, x + seatW - 5, y - 55, x + seatW / 2 - 1, y - 70);
    lancetShape(g, x + seatW / 2 - 1, y - 24, seatW * 0.46, 24, OAK_DARK);
    g.fillStyle(OAK_LIT, 1); g.fillRect(x + 1, y - 18, seatW - 4, 4);
  }
  g.fillStyle(OAK_DARK, 1); g.fillRect(x0 - 4, y - 8, n * seatW + 6, 8);
  g.fillStyle(OAK_LIT, 1); g.fillRect(x0 - 4, y - 8, n * seatW + 6, 2);
  for (let i = 0; i < n; i += 2) {
    const x = x0 + i * seatW + seatW / 2;
    g.fillStyle(SURPLICE, 1); g.fillRect(x - 6, y - 13, 12, 4);
    g.fillStyle(CRIMSON, 1); g.fillRect(x - 1, y - 12, 2, 6);
  }
}

// ── Buildings ────────────────────────────────────────────────────────

/** A buttress with a snow-capped pinnacle, standing against a wall. */
function buttress(g: G, x: number, yBase: number, h: number): void {
  g.fillStyle(ASHLAR_DEEP, 1); g.fillRect(x - 9, yBase - h, 18, h);
  g.fillStyle(ASHLAR_DARK, 1); g.fillRect(x - 8, yBase - h, 12, h);
  for (let yy = yBase - h + 12; yy < yBase; yy += 30) { g.fillStyle(ASHLAR_LIT, 0.8); g.fillRect(x - 10, yy, 20, 3); g.fillStyle(SNOW, 1); g.fillRect(x - 10, yy - 2, 20, 2); }
  g.fillStyle(ASHLAR_DARK, 1); g.fillTriangle(x - 9, yBase - h, x + 9, yBase - h, x, yBase - h - 30);
  g.fillStyle(SNOW, 1); g.fillTriangle(x - 4, yBase - h - 18, x + 4, yBase - h - 18, x, yBase - h - 30);
}

/** A tower with belfry openings and a spirelet. */
function tower(g: G, x: number, yBase: number, w: number, h: number, seed: number): void {
  const top = yBase - h;
  g.fillStyle(ASHLAR_DARK, 1); g.fillRect(x - w / 2 - 3, top, w + 6, h);
  g.fillStyle(ASHLAR, 1); g.fillRect(x - w / 2, top, w - 6, h);
  g.fillStyle(ASHLAR_LIT, 0.6); g.fillRect(x - w / 2, top, 4, h);
  for (let yy = top + 22; yy < yBase; yy += 22) { g.lineStyle(1, ASHLAR_DARK, 0.35); g.lineBetween(x - w / 2, yy, x + w / 2 - 6, yy); }
  // Belfry: two tall louvred openings.
  for (const k of [-1, 1]) {
    const lx = x + k * w * 0.2;
    lancetShape(g, lx, top + h * 0.34, w * 0.24, h * 0.22, 0x1a1a22);
    for (let i = 0; i < 4; i++) { g.fillStyle(OAK_DARK, 1); g.fillRect(lx - w * 0.11, top + h * 0.18 + i * h * 0.035, w * 0.22, 2); }
  }
  lancet(g, x, top + h * 0.7, w * 0.3, h * 0.24, seed, 0.65);
  // Parapet with pinnacles, and the spirelet.
  g.fillStyle(ASHLAR_LIT, 1); g.fillRect(x - w / 2 - 4, top - 4, w + 8, 6);
  for (const k of [-1, 1]) { g.fillStyle(ASHLAR_DARK, 1); g.fillTriangle(x + k * w / 2 - 6, top - 2, x + k * w / 2 + 6, top - 2, x + k * w / 2, top - 30); }
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x - w * 0.42, top - 2, x + w * 0.42, top - 2, x, top - w * 1.5);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - w * 0.4, top - 3, x + w * 0.02, top - 3, x, top - w * 1.48);
  g.fillStyle(SNOW, 1); g.fillTriangle(x - w * 0.38, top - 3, x - w * 0.08, top - 3, x - w * 0.16, top - w * 0.4);
  g.lineStyle(2, GILT, 1); g.lineBetween(x, top - w * 1.5, x, top - w * 1.5 - 16);
  tuningFork(g, x, top - w * 1.5 - 14, 16, GILT, 1);
}

/**
 * The Cathedral of the Score, west front, with the Great Organ's silver pipes crowning the
 * roof behind it. `x,y` = the foot of the great doors. Twin towers, a central gable carrying
 * the great rose, three portals under tympana, buttresses with pinnacles, lancets lit by the
 * candles inside, and snow on every ledge.
 */
export function cathedral(g: G, x: number, y: number, w: number, rng: () => number): void {
  const x0 = x - w / 2;
  shadow(g, x, y + 8, w * 1.08, 40);
  const naveTop = y - 300;
  // The Organ's pipes rising from the roof behind everything.
  for (let i = 0; i < 15; i++) {
    const k = (i - 7) / 7;
    const ph = 26 + (1 - Math.abs(k)) * 150;
    organPipe(g, x + k * w * 0.26, naveTop - 50, 14 + (1 - Math.abs(k)) * 6, ph, 0.5);
  }
  // Nave roof behind the gable.
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x0 + w * 0.2, naveTop, x0 + w * 0.8, naveTop, x, naveTop - 120);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 + w * 0.22, naveTop, x, naveTop, x, naveTop - 116);
  g.fillStyle(SNOW, 0.95); g.fillTriangle(x0 + w * 0.24, naveTop, x - 20, naveTop, x - 10, naveTop - 100);
  // Aisles: lower walls either side with lancets and buttresses.
  for (const k of [-1, 1]) {
    const ax = k < 0 ? x0 : x + w * 0.32;
    const aw = w * 0.18;
    g.fillStyle(ASHLAR_DARK, 1); g.fillRect(ax, y - 170, aw, 170);
    g.fillStyle(ASHLAR, 1); g.fillRect(ax + 2, y - 168, aw - 4, 166);
    g.fillStyle(SLATE_DARK, 1); g.fillTriangle(ax - 4, y - 170, ax + aw + 4, y - 170, k < 0 ? ax + aw + 4 : ax - 4, y - 214);
    g.fillStyle(SNOW, 1); g.fillTriangle(ax - 2, y - 172, ax + aw + 2, y - 172, k < 0 ? ax + aw : ax, y - 206);
    lancet(g, ax + aw / 2, y - 40, aw * 0.36, 90, 3 + k, 0.75);
    buttress(g, k < 0 ? ax + 4 : ax + aw - 4, y, 150);
  }
  // Twin towers.
  tower(g, x - w * 0.24, y, w * 0.15, 360, 1);
  tower(g, x + w * 0.24, y, w * 0.15, 360, 4);
  // The central gable wall.
  const gx0 = x - w * 0.16, gw = w * 0.32;
  g.fillStyle(ASHLAR_DARK, 1); g.fillRect(gx0 - 2, naveTop + 10, gw + 4, y - naveTop - 10);
  g.fillStyle(ASHLAR, 1); g.fillRect(gx0, naveTop + 12, gw - 4, y - naveTop - 12);
  for (let yy = naveTop + 34; yy < y; yy += 24) { g.lineStyle(1, ASHLAR_DARK, 0.3); g.lineBetween(gx0, yy, gx0 + gw - 4, yy); }
  g.fillStyle(ASHLAR_DARK, 1); g.fillTriangle(gx0 - 6, naveTop + 14, gx0 + gw + 6, naveTop + 14, x, naveTop - 70);
  g.fillStyle(ASHLAR, 1); g.fillTriangle(gx0, naveTop + 12, gx0 + gw - 6, naveTop + 12, x - 2, naveTop - 62);
  g.fillStyle(SNOW, 1); g.fillTriangle(x - 16, naveTop - 46, x + 16, naveTop - 46, x, naveTop - 70);
  tuningFork(g, x, naveTop - 68, 30, GILT, 1);
  // The great rose.
  roseWindow(g, x, naveTop + 70, gw * 0.36, 0.13, 1);
  glow(g, x, naveTop + 70, gw * 0.5, VIOLET_GLOW, 0.04, 3);
  // A gallery of kings — here, of choristers — in little niches across the front.
  for (let i = 0; i < 7; i++) {
    const nx = gx0 + 14 + i * ((gw - 30) / 6);
    lancetShape(g, nx, naveTop + 158, 14, 28, ASHLAR_DEEP);
    g.fillStyle(ASHLAR_LIT, 1); g.fillRect(nx - 3, naveTop + 140, 6, 16); g.fillCircle(nx, naveTop + 137, 3);
    g.fillStyle(SNOW, 1); g.fillRect(nx - 7, naveTop + 157, 14, 2);
  }
  snowCap(g, gx0 - 4, naveTop + 160, gw + 4, 5);
  // Three portals, the great door in the middle.
  for (const [px, pw, ph] of [[x - gw * 0.36, 30, 78], [x, 62, 130], [x + gw * 0.36, 30, 78]] as [number, number, number][]) {
    for (let k = 3; k >= 0; k--) lancetShape(g, px, y, pw + k * 8, ph + k * 8, k % 2 ? ASHLAR_DARK : ASHLAR_LIT);
    lancetShape(g, px, y, pw, ph, OAK_DARK);
    lancetShape(g, px, y, pw - 4, ph - 4, OAK);
    // Iron strap hinges and a tympanum.
    for (const hy of [y - ph * 0.25, y - ph * 0.55]) { g.lineStyle(2, 0x24242a, 1); g.lineBetween(px - pw / 2 + 3, hy, px - 4, hy); g.lineBetween(px + pw / 2 - 3, hy, px + 4, hy); }
    g.lineStyle(1.5, OAK_DARK, 1); g.lineBetween(px, y, px, y - ph + pw * 0.3);
    g.fillStyle(GILT, 0.8); g.fillCircle(px, y - ph + pw * 0.5, pw * 0.14);
  }
  // Steps, swept, with snow at their ends.
  for (let k = 0; k < 4; k++) {
    g.fillStyle(k % 2 ? ASHLAR_DARK : ASHLAR_LIT, 1);
    g.fillRect(x - gw * 0.55 - k * 8, y - 2 + k * 5, gw * 1.1 + k * 16, 5);
  }
  for (const k of [-1, 1]) snowDrift(g, x + k * (gw * 0.6 + 20), y + 14, 46, rng);
}

const VIOLET_GLOW = 0xb48cff;

/**
 * The Bellows Door: a great iron-bound door cut into the crag behind the cathedral, framed by
 * two flats of pipe and an arch of bellows-leather, with the Organ's wind sighing out round its
 * edges. Sealed with a fork-shaped bar until all six first chairs fall.
 */
export function bellowsDoor(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 260, 30);
  // Rock arch.
  g.fillStyle(CRAG_DARK, 1); g.fillEllipse(x, y - 70, 250, 190);
  g.fillStyle(CRAG, 1); g.fillEllipse(x - 8, y - 76, 224, 168);
  // Pipe flats on either side, rising from the rock.
  pipeFlat(g, x - 150, y, 5, 16, 170, 0.8);
  pipeFlat(g, x + 150, y, 5, 16, 170, 0.8);
  // The door: a tall pointed arch of bronze-bound oak.
  for (let k = 2; k >= 0; k--) lancetShape(g, x, y, 92 + k * 12, 150 + k * 10, k % 2 ? CRAG_LIT : CRAG_DARK);
  lancetShape(g, x, y, 92, 150, OAK_DARK);
  lancetShape(g, x, y, 86, 144, OAK);
  for (let i = -2; i <= 2; i++) { g.lineStyle(1.5, OAK_DARK, 1); g.lineBetween(x + i * 16, y, x + i * 16, y - 120 + Math.abs(i) * 14); }
  for (const yy of [y - 30, y - 70, y - 110]) { g.fillStyle(BRONZE_DARK, 1); g.fillRect(x - 43, yy, 86, 6); g.fillStyle(BRONZE, 1); g.fillRect(x - 43, yy, 86, 3); }
  // A ring of studs and a bronze mask of a singing mouth for a knocker.
  g.fillStyle(BRONZE, 1); g.fillCircle(x, y - 88, 14);
  g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(x, y - 86, 10, 12);
  g.fillStyle(0x0e0a06, 1); g.fillEllipse(x, y - 85, 6, 8);
  // Leather bellows folds in the arch.
  for (let i = 0; i < 5; i++) {
    g.lineStyle(4, 0x6a3a20, 1);
    g.beginPath(); g.arc(x, y - 110, 68 + i * 6, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
    g.lineStyle(1.5, 0x9a5a30, 1);
    g.beginPath(); g.arc(x, y - 111, 68 + i * 6, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
  }
  snowCap(g, x - 120, y - 154, 240, 6);
  g.fillStyle(SNOW, 1); g.fillEllipse(x - 90, y + 2, 70, 12); g.fillEllipse(x + 96, y + 3, 60, 10);
}

/**
 * A cloister walk, one side: a lean-to slate roof on a run of pointed arches, the garth side
 * open. Drawn as seen from the south (for the north and south walks) — `x0`..`x0+len`, base `y`.
 */
export function cloisterWalk(g: G, x0: number, y: number, len: number): void {
  const h = 64;
  g.fillStyle(SLATE_DARK, 1); g.fillRect(x0 - 6, y - h - 22, len + 12, 18);
  g.fillStyle(SLATE, 1); g.fillRect(x0 - 6, y - h - 22, len + 12, 10);
  snowCap(g, x0 - 8, y - h - 22, len + 16, 8);
  g.fillStyle(ASHLAR_DARK, 1); g.fillRect(x0, y - h - 6, len, 8);
  const bays = Math.max(2, Math.round(len / 44));
  const bw = len / bays;
  for (let i = 0; i <= bays; i++) {
    const px = x0 + i * bw;
    g.fillStyle(ASHLAR_DARK, 1); g.fillRect(px - 5, y - h, 10, h);
    g.fillStyle(ASHLAR_LIT, 1); g.fillRect(px - 4, y - h, 3, h);
    g.fillStyle(ASHLAR, 1); g.fillRect(px - 7, y - 6, 14, 6);
  }
  for (let i = 0; i < bays; i++) {
    const cx = x0 + (i + 0.5) * bw;
    // The arch head: stone spandrels with a pointed opening below.
    g.fillStyle(ASHLAR, 1); g.fillRect(cx - bw / 2 + 5, y - h, bw - 10, 22);
    lancetShape(g, cx, y - h + 40, bw - 14, 38, 0x3a3e4a, 0.9);
    g.fillStyle(ASHLAR_LIT, 0.7); g.fillCircle(cx, y - h + 6, 3);
  }
}

/** The east/west cloister walk, seen end-on: a long colonnade of piers with a roof strip. */
export function cloisterSide(g: G, x: number, y0: number, len: number): void {
  g.fillStyle(SLATE_DARK, 1); g.fillRect(x - 22, y0 - 40, 44, len + 40);
  g.fillStyle(SLATE, 1); g.fillRect(x - 20, y0 - 40, 26, len + 40);
  g.fillStyle(SNOW, 1); g.fillRect(x - 18, y0 - 40, 20, len + 38);
  for (let yy = y0; yy < y0 + len; yy += 44) { g.fillStyle(ASHLAR_DARK, 1); g.fillRect(x - 24, yy, 48, 6); }
}

/** A small house of the close: ashlar walls, a steep slate roof thick with snow, lit windows. */
export function closeHouse(g: G, x: number, y: number, w: number, h: number, rng: () => number, sign?: (g: G, cx: number, cy: number) => void): void {
  shadow(g, x, y + 4, w * 1.1, 22);
  const x0 = x - w / 2, top = y - h;
  g.fillStyle(ASHLAR_DARK, 1); g.fillRect(x0, top, w, h);
  g.fillStyle(ASHLAR, 1); g.fillRect(x0 + 2, top + 2, w - 6, h - 2);
  for (let yy = top + 16; yy < y; yy += 16) { g.lineStyle(1, ASHLAR_DARK, 0.3); g.lineBetween(x0 + 2, yy, x0 + w - 4, yy); }
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(x0 - 10, top + 2, x0 + w + 10, top + 2, x, top - h * 0.8);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 6, top, x, top, x, top - h * 0.78);
  g.fillStyle(SNOW, 1); g.fillTriangle(x0 - 8, top + 1, x0 + w + 8, top + 1, x, top - h * 0.8 + 6);
  g.fillStyle(SNOW_SHADE, 1); g.fillTriangle(x, top + 1, x0 + w + 8, top + 1, x, top - h * 0.8 + 6);
  g.fillStyle(SLATE_LIT, 0.5); g.fillRect(x0 - 8, top - 1, w + 16, 3);
  // Windows: little lancets, candle-lit.
  for (const k of [-1, 1]) lancet(g, x + k * w * 0.3, top + h * 0.6, w * 0.14, h * 0.4, Math.floor(rng() * 5), 0.5);
  // Door.
  lancetShape(g, x, y, w * 0.2, h * 0.62, OAK_DARK);
  lancetShape(g, x, y, w * 0.17, h * 0.58, OAK);
  g.fillStyle(GILT, 1); g.fillCircle(x + w * 0.05, y - h * 0.3, 1.6);
  // Chimney with a curl of smoke-stain.
  g.fillStyle(ASHLAR_DARK, 1); g.fillRect(x + w * 0.22, top - h * 0.55, 12, h * 0.35);
  g.fillStyle(SNOW, 1); g.fillRect(x + w * 0.22 - 2, top - h * 0.56, 16, 4);
  if (sign) sign(g, x - w * 0.34, top + h * 0.2);
}

/** The chandler's hanging sign: a gilt candle on a bracket. */
export function chandlerSign(g: G, cx: number, cy: number): void {
  g.lineStyle(2, 0x24242a, 1); g.lineBetween(cx - 20, cy - 16, cx + 8, cy - 16);
  g.lineBetween(cx - 4, cy - 16, cx - 4, cy - 10);
  g.fillStyle(OAK_DARK, 1); g.fillRect(cx - 14, cy - 10, 20, 22);
  candle(g, cx - 4, cy + 9, 12, true, WAX);
}

/** The glazier's sign: a little roundel of glass on a bracket. */
export function glazierSign(g: G, cx: number, cy: number): void {
  g.lineStyle(2, 0x24242a, 1); g.lineBetween(cx - 20, cy - 16, cx + 8, cy - 16);
  roseWindow(g, cx - 4, cy, 10, 0, 1, OAK);
}

/** The choir school's sign: a gilt stave with three notes. */
export function choirSign(g: G, cx: number, cy: number): void {
  g.fillStyle(OAK_DARK, 1); g.fillRect(cx - 18, cy - 10, 30, 18);
  for (let i = 0; i < 5; i++) { g.lineStyle(0.8, GILT, 1); g.lineBetween(cx - 16, cy - 7 + i * 3, cx + 10, cy - 7 + i * 3); }
  for (const [nx, ny] of [[-10, 2], [-2, -2], [6, -5]] as [number, number][]) { g.fillStyle(GILT_LIT, 1); g.fillEllipse(cx + nx, cy + ny, 4, 3); g.lineStyle(1, GILT_LIT, 1); g.lineBetween(cx + nx + 2, cy + ny, cx + nx + 2, cy + ny - 7); }
}

/**
 * The glass kiln: a squat brick beehive furnace with a glowing mouth, sheets of coloured glass
 * stacked in a rack beside it.
 */
export function glassKiln(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 20);
  g.fillStyle(0x6a3a2a, 1); g.fillEllipse(x, y - 30, 74, 70);
  g.fillStyle(0x8a4a32, 1); g.fillEllipse(x - 4, y - 34, 62, 58);
  for (let i = 0; i < 5; i++) { g.lineStyle(1, 0x5a2a1a, 0.6); g.strokeEllipse(x, y - 30, 74 - i * 12, 70 - i * 13); }
  g.fillStyle(0x2a1208, 1); g.fillEllipse(x, y - 12, 26, 20);
  g.fillStyle(0xff8a2a, 0.9); g.fillEllipse(x, y - 10, 20, 14);
  g.fillStyle(0xffe08a, 1); g.fillEllipse(x, y - 8, 10, 6);
  glow(g, x, y - 10, 40, 0xff9a40, 0.07, 3);
  g.fillStyle(SNOW, 1); g.fillEllipse(x - 6, y - 64, 30, 8);
  g.fillStyle(0x4a2a1a, 1); g.fillRect(x - 6, y - 76, 12, 14);
  // Glass rack.
  g.fillStyle(OAK_DARK, 1); g.fillRect(x + 44, y - 50, 4, 50); g.fillRect(x + 86, y - 50, 4, 50); g.fillRect(x + 44, y - 4, 46, 4);
  for (let i = 0; i < 6; i++) {
    g.fillStyle([GLASS_RED, GLASS_BLUE, GLASS_GOLD, GLASS_GREEN, GLASS_VIOLET, GLASS_RED][i], 0.75);
    g.fillRect(x + 50 + i * 6, y - 46 + (i % 2) * 3, 4, 42);
  }
}

/** The frozen cloister pond, drawn into the ground: a quatrefoil stone kerb round grey-blue ice with cracks and a fishing hole. */
export function frozenPond(g: G, r: { x: number; y: number; w: number; h: number }, rng: () => number): void {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.fillStyle(ASHLAR_DARK, 1); g.fillEllipse(cx, cy + 4, r.w + 34, r.h + 30);
  g.fillStyle(ASHLAR, 1); g.fillEllipse(cx, cy, r.w + 26, r.h + 24);
  g.fillStyle(ICE_DEEP, 1); g.fillEllipse(cx, cy, r.w, r.h);
  g.fillStyle(ICE, 1); g.fillEllipse(cx - 6, cy - 4, r.w - 18, r.h - 16);
  for (let i = 0; i < 8; i++) { g.fillStyle(ICE_LIT, 0.5); g.fillEllipse(cx - r.w * 0.3 + rng() * r.w * 0.5, cy - r.h * 0.3 + rng() * r.h * 0.4, 30 + rng() * 40, 4); }
  // Cracks from the fishing holes.
  const holes: Pt[] = [{ x: cx - r.w * 0.22, y: cy + r.h * 0.12 }, { x: cx + r.w * 0.25, y: cy - r.h * 0.1 }];
  for (const h of holes) {
    for (let k = 0; k < 6; k++) {
      const a = rng() * Math.PI * 2, l = 20 + rng() * 40;
      g.lineStyle(1, ICE_DEEP, 0.8);
      g.lineBetween(h.x, h.y, h.x + Math.cos(a) * l, h.y + Math.sin(a) * l * 0.6);
    }
    g.fillStyle(0x2a4a5e, 1); g.fillEllipse(h.x, h.y, 18, 10);
    g.fillStyle(0x10283a, 1); g.fillEllipse(h.x, h.y + 1, 12, 6);
    g.fillStyle(SNOW, 1); g.fillEllipse(h.x + 12, h.y + 5, 12, 4);
  }
  // Snow along the kerb.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.fillStyle(SNOW, 1); g.fillEllipse(cx + Math.cos(a) * (r.w / 2 + 12), cy + Math.sin(a) * (r.h / 2 + 11), 26, 7);
  }
}

/** A kneeling-rail for pilgrims in the snow: a low oak bar on two posts, a ribbon or two tied to it. */
export function kneelingRail(g: G, x: number, y: number, w: number, rng: () => number): void {
  shadow(g, x, y + 2, w, 8);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - w / 2, y - 18, 5, 18); g.fillRect(x + w / 2 - 5, y - 18, 5, 18);
  g.fillStyle(OAK, 1); g.fillRect(x - w / 2 - 2, y - 22, w + 4, 6);
  g.fillStyle(SNOW, 1); g.fillRect(x - w / 2 - 2, y - 24, w + 4, 2.5);
  const n = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const rx = x - w / 2 + 8 + rng() * (w - 16);
    g.lineStyle(2, RIBBON, 1); g.lineBetween(rx, y - 18, rx - 2, y - 6); g.lineBetween(rx, y - 18, rx + 3, y - 8);
  }
  g.fillStyle(SNOW_SHADE, 0.7); g.fillEllipse(x, y + 4, w * 0.9, 6);
}

/** A tall standing candelabrum — seven-branched iron, all lit. */
export function candelabrum(g: G, x: number, y: number, s: number, flick = 0): void {
  shadow(g, x, y + 2, 30 * s, 8 * s);
  const iron = 0x2a2a30;
  g.fillStyle(iron, 1); g.fillTriangle(x - 12 * s, y, x + 12 * s, y, x, y - 12 * s);
  g.fillRect(x - 1.5 * s, y - 70 * s, 3 * s, 60 * s);
  for (let i = 1; i <= 3; i++) {
    g.lineStyle(2 * s, iron, 1);
    g.beginPath(); g.arc(x, y - 70 * s, i * 9 * s, 0, Math.PI, false); g.strokePath();
  }
  for (let i = -3; i <= 3; i++) {
    candle(g, x + i * 9 * s, y - 70 * s + (i === 0 ? 0 : -1), 9 * s, true, WAX, Math.sin(flick + i) * 0.6);
  }
  glow(g, x, y - 84 * s, 40 * s, CANDLELIGHT, 0.05, 3);
}

/** A chorister: tiny figure in surplice and cassock (for crowds painted into art, not actors). */
export function choristerFigure(g: G, x: number, y: number, s: number, mouthOpen = 0): void {
  g.fillStyle(CASSOCK, 1); g.fillRect(x - 5 * s, y - 14 * s, 10 * s, 14 * s);
  g.fillStyle(SURPLICE, 1); g.fillTriangle(x - 7 * s, y - 4 * s, x + 7 * s, y - 4 * s, x, y - 20 * s);
  g.fillStyle(CRIMSON, 1); g.fillRect(x - 6 * s, y - 20 * s, 12 * s, 3 * s);
  g.fillStyle(0xe8c8a8, 1); g.fillCircle(x, y - 24 * s, 4.5 * s);
  g.fillStyle(0x1a1410, 1); g.fillEllipse(x, y - 22.5 * s, 2.5 * s, 1 + mouthOpen * 2 * s);
}

/** Pick a blend of candlelight onto a stone colour (for glows on the snow). */
export const warm = (c: number, k: number): number => mixC(c, CANDLELIGHT, k);

export { GLASS_GOLD, GLASS_RED, GLASS_BLUE, GLASS_GREEN, GLASS_VIOLET, SNOW_LIT };
