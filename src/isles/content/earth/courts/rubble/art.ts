import type { Pt, Rect } from '../../../../IslesTypes';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import {
  BRONZE, CHALK, DUST, DUST_DARK, DUST_LIT, GHOST, GHOST_LIT, GLOW, HAZARD, IRON, IRON_LIT, LANTERN, LIME, LIME_DARK,
  LIME_DEEP, LIME_LIT, MOSS, MOSS_DARK, ROPE, RUST, RUST_LIT, SCREE, SCREE_DARK, SCREE_DEEP, SCREE_LIT, SEAL, SEAL_LIT,
  SLATE, SLATE_DARK, SLATE_LIT, STRATA_BUFF, STRATA_DARK, STRATA_GREY, STRATA_RED, TARP, TESS_BLUE, TESS_BONE,
  TESS_OCHRE, TESS_RED, TIMBER, TIMBER_DARK, VERDIGRIS, VERDIGRIS_DARK, WATER, WATER_DEEP, WATER_LIT, WRECK,
  WRECK_DARK,
} from './palette';

/**
 * The Rubble Court's set pieces. Everything here is a thing half dug up: drawn from its base line
 * upward, with the spoil heaped against it last so it reads as *sunk* rather than standing on the
 * ground. Pieces take `x, y` = the base/feet point unless a doc comment says otherwise.
 */

// ── Small shared strokes ─────────────────────────────────────────────

/** A jagged crack running from a point, branching once. */
export function crack(g: G, x: number, y: number, len: number, a: number, color: number, alpha = 0.8, w = 1.4): void {
  let px = x, py = y;
  g.lineStyle(w, color, alpha);
  g.beginPath(); g.moveTo(px, py);
  const n = 5;
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    const j = (i % 2 ? 1 : -1) * len * 0.12;
    px = x + Math.cos(a) * len * k + Math.cos(a + Math.PI / 2) * j;
    py = y + Math.sin(a) * len * k + Math.sin(a + Math.PI / 2) * j;
    g.lineTo(px, py);
    if (i === 2) {
      // The branch.
      const bx = px + Math.cos(a + 0.8) * len * 0.35, by = py + Math.sin(a + 0.8) * len * 0.35;
      g.lineTo(bx, by); g.moveTo(px, py);
    }
  }
  g.strokePath();
}

/** A heap of spoil: grey scree and limestone chips, lumpy, darker underneath. */
export function spoil(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  g.fillStyle(SCREE_DEEP, 0.5); g.fillEllipse(x, y + 2, w * 1.05, h * 0.5);
  for (let i = 0; i < 9; i++) {
    const ox = (rng() - 0.5) * w * 0.8, oy = -rng() * h * 0.45;
    const rr = (0.18 + rng() * 0.2) * w;
    g.fillStyle(i % 3 ? SCREE_DARK : SCREE, 1); g.fillEllipse(x + ox, y + oy, rr, rr * 0.55);
  }
  for (let i = 0; i < 14; i++) {
    const ox = (rng() - 0.5) * w * 0.9, oy = -rng() * h * 0.5;
    const s = 2 + rng() * 4;
    g.fillStyle(rng() < 0.4 ? LIME : rng() < 0.5 ? SCREE_LIT : SCREE, 1);
    g.fillRect(x + ox - s / 2, y + oy - s / 2, s, s * 0.8);
    g.fillStyle(0xffffff, 0.18); g.fillRect(x + ox - s / 2, y + oy - s / 2, s, 1);
  }
}

/** One cut block of dressed limestone, lit top-left, chipped. */
export function ashlar(g: G, x: number, y: number, w: number, h: number, c = LIME, chip = true): void {
  g.fillStyle(dim(c, 0.35), 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(c, 1); g.fillRect(x - w / 2, y - h, w - 2, h - 2);
  g.fillStyle(lit(c, 0.25), 1); g.fillRect(x - w / 2, y - h, w - 2, 2);
  g.fillStyle(dim(c, 0.15), 1); g.fillRect(x + w / 2 - 4, y - h + 2, 2, h - 4);
  if (chip) { g.fillStyle(dim(c, 0.3), 1); g.fillTriangle(x + w / 2 - 2, y - h, x + w / 2 - 9, y - h, x + w / 2 - 2, y - h + 7); }
}

/** A tuft of weed in a crack. */
export function weed(g: G, x: number, y: number, s = 1): void {
  g.lineStyle(1.4, MOSS, 1);
  for (let i = -2; i <= 2; i++) g.lineBetween(x, y, x + i * 2.4 * s, y - (6 + Math.abs(2 - Math.abs(i)) * 2) * s);
  g.fillStyle(MOSS_DARK, 1); g.fillEllipse(x, y, 7 * s, 2.5 * s);
}

/** The Regent's mortar seal: a dull red disc of mortar stamped with a closed hand. */
export function regentSeal(g: G, x: number, y: number, r: number, a = 1): void {
  g.fillStyle(dim(SEAL, 0.35), a); g.fillCircle(x, y + 1, r);
  g.fillStyle(SEAL, a); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.12), SEAL_LIT, a * 0.8); g.strokeCircle(x, y, r * 0.78);
  // The closed hand: a fist over a block.
  g.fillStyle(dim(SEAL, 0.45), a);
  g.fillRect(x - r * 0.42, y + r * 0.05, r * 0.84, r * 0.34);
  g.fillRoundedRect(x - r * 0.36, y - r * 0.48, r * 0.72, r * 0.5, r * 0.16);
  for (let i = 0; i < 3; i++) g.fillRect(x - r * 0.3 + i * r * 0.22, y - r * 0.58, r * 0.16, r * 0.16);
}

// ── Ground ───────────────────────────────────────────────────────────

/**
 * The mountain face along the north edge, seen from the court below: banded strata (buff, red,
 * grey), each band a different thickness and roughness, a talus fringe at the foot, and pick-scars
 * where the Regent's masons cut the rock for the Sepulchre. Draws the rect `r` (top edge of the world).
 */
export function strataFace(g: G, r: Rect, rng: () => number): void {
  const bands = [STRATA_DARK, STRATA_BUFF, STRATA_RED, STRATA_GREY, STRATA_BUFF, STRATA_RED, STRATA_GREY];
  let y = r.y;
  let i = 0;
  while (y < r.y + r.h) {
    const bh = 10 + rng() * 22;
    const c = bands[i % bands.length];
    g.fillStyle(c, 1); g.fillRect(r.x, y, r.w, bh + 2);
    // A wavering top edge so the bands look laid down, not ruled.
    g.fillStyle(lit(c, 0.12), 1);
    for (let x = r.x; x < r.x + r.w; x += 30) g.fillRect(x, y, 30, 2 + Math.sin(x * 0.013 + i) * 1.5 + 1.5);
    g.fillStyle(dim(c, 0.2), 0.7);
    for (let k = 0; k < r.w / 40; k++) g.fillRect(r.x + rng() * r.w, y + rng() * bh, 3 + rng() * 10, 1.5);
    y += bh; i++;
  }
  // Vertical joints and pick-scars.
  for (let k = 0; k < r.w / 70; k++) {
    const x = r.x + rng() * r.w;
    g.lineStyle(1.5, STRATA_DARK, 0.4); g.lineBetween(x, r.y + rng() * 20, x + (rng() - 0.5) * 10, r.y + r.h * (0.5 + rng() * 0.4));
  }
  for (let k = 0; k < r.w / 50; k++) {
    const x = r.x + rng() * r.w, yy = r.y + r.h * (0.3 + rng() * 0.6);
    g.lineStyle(1, 0xffffff, 0.12); g.lineBetween(x, yy, x + 6, yy - 3);
  }
  // Talus at the foot.
  for (let x = r.x; x < r.x + r.w; x += 18) {
    const h = 8 + rng() * 14;
    g.fillStyle(rng() < 0.5 ? SCREE_DARK : SCREE, 1);
    g.fillTriangle(x - 14, r.y + r.h + 4, x + 14 + rng() * 10, r.y + r.h + 4, x + rng() * 8, r.y + r.h - h);
  }
}

/**
 * A landslide fan let off the mountain: a long tongue of scree spreading downslope, banded with
 * runnels, boulders sat in it and fine dust at its toe. `x, y` is the head (top) of the fan.
 */
export function screeFan(g: G, x: number, y: number, w: number, len: number, rng: () => number): void {
  const toe = y + len;
  g.fillStyle(DUST_DARK, 0.45); g.fillEllipse(x, toe - len * 0.2, w * 1.25, len * 0.45);
  g.fillStyle(SCREE_DARK, 1);
  g.fillTriangle(x - w * 0.18, y, x + w * 0.18, y, x + w * 0.62, toe);
  g.fillTriangle(x - w * 0.18, y, x - w * 0.62, toe, x + w * 0.62, toe);
  g.fillStyle(SCREE, 1);
  g.fillTriangle(x - w * 0.12, y + 6, x + w * 0.1, y + 6, x + w * 0.46, toe - 10);
  g.fillTriangle(x - w * 0.12, y + 6, x - w * 0.5, toe - 10, x + w * 0.46, toe - 10);
  // Runnels.
  for (let k = -3; k <= 3; k++) {
    g.lineStyle(1.5, SCREE_DEEP, 0.4);
    g.lineBetween(x + k * w * 0.02, y + 10, x + k * w * 0.08 + (rng() - 0.5) * 20, toe - 14);
  }
  // Stones in the fan, bigger toward the toe (they roll furthest).
  for (let i = 0; i < 70; i++) {
    const k = Math.sqrt(rng());
    const px = x + (rng() - 0.5) * w * 1.05 * k, py = y + len * k * 0.95;
    const s = 1.5 + k * 5 * rng();
    g.fillStyle(rng() < 0.3 ? SCREE_LIT : rng() < 0.5 ? LIME_DARK : SCREE_DARK, 1);
    g.fillEllipse(px, py, s * 1.6, s);
  }
}

/**
 * A patch of the capital's street mosaic showing through the dust: a running-wave border round a
 * field of tesserae, cracked and partly swept over. Mosaic must be dug out; most of it is buried.
 */
export function mosaic(g: G, r: Rect, rng: () => number): void {
  g.fillStyle(TESS_BONE, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const T = 6;
  for (let y = r.y; y < r.y + r.h; y += T) {
    for (let x = r.x; x < r.x + r.w; x += T) {
      const inBorder = x < r.x + 18 || x > r.x + r.w - 24 || y < r.y + 18 || y > r.y + r.h - 24;
      let c = TESS_BONE;
      if (inBorder) {
        // The running wave: alternate ochre and red teeth.
        c = ((Math.floor((x - r.x) / 12) + Math.floor((y - r.y) / 12)) % 2) ? TESS_RED : TESS_OCHRE;
      } else {
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const d = Math.hypot(x - cx, (y - cy) * 1.3);
        c = d % 30 < 7 ? TESS_BLUE : d % 30 < 10 ? TESS_OCHRE : TESS_BONE;
      }
      g.fillStyle(mixC(c, DUST, rng() * 0.25), 1); g.fillRect(x + 0.5, y + 0.5, T - 1, T - 1);
    }
  }
  // Cracks, missing tesserae and drifted dust over the corners.
  for (let i = 0; i < 4; i++) crack(g, r.x + rng() * r.w, r.y + rng() * r.h, 30 + rng() * 40, rng() * Math.PI * 2, LIME_DEEP, 0.7);
  for (let i = 0; i < 30; i++) { g.fillStyle(DUST_DARK, 0.8); g.fillRect(r.x + rng() * r.w, r.y + rng() * r.h, T, T); }
  for (let i = 0; i < 5; i++) {
    const cx = r.x + (rng() < 0.5 ? 0 : r.w) + (rng() - 0.5) * 60, cy = r.y + rng() * r.h;
    g.fillStyle(DUST, 0.9); g.fillEllipse(cx, cy, 70 + rng() * 60, 30 + rng() * 30);
  }
}

/**
 * A drum-by-drum fallen column on the ground: the drums lie in a row along `ang`, slightly
 * askew, fluting showing on each face, the capital lying at the far end.
 */
export function fallenColumn(g: G, x: number, y: number, len: number, ang: number, r: number, rng: () => number): void {
  const n = Math.max(2, Math.round(len / (r * 1.7)));
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const px = x + ca * len * k + (rng() - 0.5) * 4, py = y + sa * len * k + (rng() - 0.5) * 3;
    shadow(g, px, py + r * 0.7, r * 2.2, r * 0.6, 0.25);
    // The drum lying on its side: a rounded rect along the axis with fluting lines.
    g.fillStyle(LIME_DARK, 1); g.fillEllipse(px, py + 2, r * 1.9, r * 1.35);
    g.fillStyle(LIME, 1); g.fillEllipse(px, py, r * 1.8, r * 1.2);
    g.lineStyle(1, LIME_DEEP, 0.5);
    for (let f = -2; f <= 2; f++) g.lineBetween(px - r * 0.8, py + f * r * 0.18, px + r * 0.8, py + f * r * 0.18);
    g.fillStyle(LIME_LIT, 0.5); g.fillEllipse(px - r * 0.2, py - r * 0.35, r, r * 0.2);
    if (rng() < 0.5) weed(g, px + r * 0.9, py + r * 0.4, 0.8);
  }
  // The capital: a squat block with volutes.
  const cx = x + ca * (len + r * 1.6), cy = y + sa * (len + r * 1.6);
  ashlar(g, cx, cy + r * 0.6, r * 2.4, r * 1.2, LIME);
  for (const k of [-1, 1]) {
    g.lineStyle(2, LIME_DEEP, 0.8); g.strokeCircle(cx + k * r * 0.8, cy, r * 0.3);
  }
}

/**
 * The collapsed well (ground): a wide pit where the old Well of the Capital's shaft fell in — a
 * ring of tumbled kerb-stones, the shaft's strata going down in steps of darkness, black water
 * far below. The fishing water sits on the dark centre. `x, y` is the centre.
 */
export function collapsedWellPit(g: G, x: number, y: number, rx: number, ry: number, rng: () => number): void {
  g.fillStyle(SCREE_DEEP, 1); g.fillEllipse(x, y, rx * 2 + 34, ry * 2 + 26);
  // Walls going down: each ring smaller, darker, banded.
  const rings = 6;
  for (let i = 0; i < rings; i++) {
    const k = i / rings;
    const c = mixC(i % 2 ? STRATA_BUFF : STRATA_GREY, WATER_DEEP, 0.2 + k * 0.75);
    g.fillStyle(c, 1); g.fillEllipse(x, y + k * 8, (rx * 2 + 10) * (1 - k * 0.42), (ry * 2 + 6) * (1 - k * 0.42));
  }
  g.fillStyle(WATER_DEEP, 1); g.fillEllipse(x, y + 10, rx * 1.1, ry * 1.1);
  g.fillStyle(WATER, 0.6); g.fillEllipse(x, y + 10, rx * 0.9, ry * 0.85);
  g.fillStyle(WATER_LIT, 0.15); g.fillEllipse(x - rx * 0.2, y + 4, rx * 0.4, ry * 0.15);
  // The tumbled kerb.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + rng() * 0.1;
    const px = x + Math.cos(a) * (rx + 10), py = y + Math.sin(a) * (ry + 8);
    if (rng() < 0.2) continue;
    ashlar(g, px, py + 6, 22 + rng() * 10, 10 + rng() * 5, rng() < 0.5 ? LIME : LIME_DARK);
  }
  // Two kerb-stones slid half into the pit.
  for (const a of [0.6, 3.6]) {
    const px = x + Math.cos(a) * rx * 0.7, py = y + Math.sin(a) * ry * 0.7;
    g.fillStyle(LIME_DARK, 1); g.fillRect(px - 12, py - 6, 24, 9);
    g.fillStyle(LIME, 1); g.fillRect(px - 12, py - 8, 22, 6);
  }
}

// ── Pieces ───────────────────────────────────────────────────────────

/**
 * The Sepulchre gate: a doorway cut straight into the mountain's strata — a deep black recess
 * under a carved lintel, the jambs worked with the Old King's procession in relief (chiselled
 * blank on the Regent's order), a great slab door fitted flush and banded with iron, mortared
 * round its edge in the Regent's red and sealed with his closed hand. Tithe-carts' ruts lead in.
 * `open` 0..1 shows the slab drawn back into the dark.
 */
export function tombGate(g: G, x: number, y: number, open = 0): void {
  const W = 230, H = 128;
  const x0 = x - W / 2, top = y - H;
  // The cut: a stepped surround, each step darker into the rock.
  for (let i = 0; i < 4; i++) {
    g.fillStyle(mixC(STRATA_BUFF, STRATA_DARK, 0.25 + i * 0.2), 1);
    g.fillRect(x0 + i * 7, top + i * 6, W - i * 14, H - i * 6);
  }
  // The jambs: carved figures walking in, every face chiselled off.
  for (const side of [-1, 1]) {
    const jx = x + side * (W / 2 - 34);
    g.fillStyle(LIME_DARK, 1); g.fillRect(jx - 20, top + 20, 40, H - 20);
    g.fillStyle(LIME, 1); g.fillRect(jx - 18, top + 22, 36, H - 24);
    for (let k = 0; k < 3; k++) {
      const fy = top + 34 + k * 30;
      // A walking figure in low relief: head (chiselled), robed body, a carried bundle.
      g.fillStyle(LIME_DARK, 1); g.fillEllipse(jx + side * 2, fy + 14, 12, 20);
      g.fillStyle(LIME_DEEP, 0.9); g.fillRect(jx - 4 + side * 2, fy - 2, 8, 7); // the chisel scar where the face was
      g.lineStyle(1, LIME_DEEP, 0.6); for (let s = 0; s < 3; s++) g.lineBetween(jx - 3 + side * 2 + s * 3, fy - 2, jx - 5 + side * 2 + s * 3, fy + 5);
      g.fillStyle(LIME_LIT, 0.5); g.fillRect(jx - 7 + side * 2, fy + 8, 2, 14);
      g.fillStyle(LIME_DARK, 1); g.fillRect(jx + side * 7, fy + 4, side * 6, 6);
    }
    g.fillStyle(LIME_LIT, 0.6); g.fillRect(jx - 18, top + 22, 3, H - 24);
  }
  // The lintel: one huge stone with the Old King's crown carved in it and a Regent's band over that.
  g.fillStyle(LIME_DEEP, 1); g.fillRect(x0 + 6, top + 2, W - 12, 26);
  g.fillStyle(LIME, 1); g.fillRect(x0 + 8, top, W - 16, 24);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 + 8, top, W - 16, 3);
  g.lineStyle(2, LIME_DEEP, 0.8);
  g.beginPath(); g.moveTo(x - 22, top + 18); g.lineTo(x - 22, top + 8); g.lineTo(x - 11, top + 13); g.lineTo(x, top + 5);
  g.lineTo(x + 11, top + 13); g.lineTo(x + 22, top + 8); g.lineTo(x + 22, top + 18); g.closePath(); g.strokePath();
  g.fillStyle(SEAL, 0.85); g.fillRect(x0 + 8, top + 15, W - 16, 5);
  // The recess and the slab.
  const dw = W - 108, dh = H - 34;
  g.fillStyle(0x0a0806, 1); g.fillRect(x - dw / 2, y - dh, dw, dh);
  const slide = open * (dh - 6);
  if (open < 1) {
    const sy = y - dh + slide;
    const sh = dh - slide;
    g.fillStyle(SCREE_DARK, 1); g.fillRect(x - dw / 2 + 2, y - dh + 2, dw - 4, dh - 2);
    g.fillStyle(SCREE, 1); g.fillRect(x - dw / 2 + 4, y - dh + 4, dw - 8, dh - 6);
    g.fillStyle(SCREE_LIT, 0.5); g.fillRect(x - dw / 2 + 4, y - dh + 4, dw - 8, 3);
    // Iron bands and rivets.
    for (const by of [0.22, 0.55, 0.85]) {
      g.fillStyle(IRON, 1); g.fillRect(x - dw / 2 + 2, y - dh + dh * by, dw - 4, 6);
      g.fillStyle(RUST_LIT, 0.5); g.fillRect(x - dw / 2 + 2, y - dh + dh * by, dw - 4, 1.5);
      for (let k = 0; k < 6; k++) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x - dw / 2 + 10 + k * ((dw - 20) / 5), y - dh + dh * by + 3, 1.6); }
    }
    // The mortar seam round the slab, in the Regent's red, and his seal at the centre.
    g.lineStyle(3, SEAL, 0.9); g.strokeRect(x - dw / 2 + 1, y - dh + 1, dw - 2, dh - 1);
    regentSeal(g, x, y - dh * 0.4, 13);
    crack(g, x + dw / 2 - 10, y - dh + 8, 26, 1.9, SCREE_DEEP, 0.7);
    void sy; void sh;
  } else {
    glow(g, x, y - dh * 0.4, dw * 0.5, GLOW, 0.05, 3);
  }
  // Steps and the cart ruts going in.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? LIME_DARK : LIME, 1); g.fillRect(x - dw / 2 - 16 - k * 8, y - 4 + k * 4, dw + 32 + k * 16, 5); }
  g.lineStyle(3, DUST_DARK, 0.6); g.lineBetween(x - 24, y + 12, x - 20, y); g.lineBetween(x + 24, y + 12, x + 20, y);
}

/**
 * A tower sunk to its upper windows in the spoil: a round drum leaning off true, crenels broken
 * out of its parapet, a window or two at ground level with the dark of the buried rooms inside,
 * cracks running down, spoil heaped against its foot. `lean` is px of top offset.
 */
export function sunkenTower(g: G, x: number, y: number, r: number, h: number, lean: number, rng: () => number): void {
  shadow(g, x + lean * 0.5, y + 4, r * 2.6, r * 0.8, 0.35);
  const top = y - h;
  const tx = x + lean;
  // The drum: a skewed column of courses, shaded round.
  const courses = Math.round(h / 12);
  for (let i = 0; i < courses; i++) {
    const k0 = i / courses, k1 = (i + 1) / courses;
    const cy0 = y - h * k0, cy1 = y - h * k1;
    const cx = x + lean * (k0 + k1) / 2;
    g.fillStyle(i % 2 ? LIME : mixC(LIME, LIME_DARK, 0.3), 1);
    g.fillRect(cx - r, cy1, r * 2, cy0 - cy1 + 0.5);
    g.fillStyle(LIME_DEEP, 0.5); g.fillRect(cx - r, cy0 - 1, r * 2, 1);
    // Round shading: dark right, lit left.
    g.fillStyle(0x000000, 0.18); g.fillRect(cx + r * 0.45, cy1, r * 0.55, cy0 - cy1);
    g.fillStyle(0xffffff, 0.1); g.fillRect(cx - r * 0.8, cy1, r * 0.25, cy0 - cy1);
    // Staggered joints.
    for (let j = 0; j < 3; j++) { g.fillStyle(LIME_DEEP, 0.35); g.fillRect(cx - r + ((i * 13 + j * 23) % (r * 2)), cy1, 1, cy0 - cy1); }
  }
  // The parapet: crenels, two of them knocked out.
  const gone = [Math.floor(rng() * 5), Math.floor(rng() * 5)];
  g.fillStyle(LIME_DARK, 1); g.fillRect(tx - r - 3, top - 6, r * 2 + 6, 8);
  for (let k = 0; k < 5; k++) {
    if (gone.includes(k)) continue;
    const cx = tx - r + 4 + k * ((r * 2 - 8) / 4);
    ashlar(g, cx, top - 5, (r * 2) / 7, 11, LIME);
  }
  // The windows: a high lancet and one at the spoil line, black inside.
  g.fillStyle(0x0c0a08, 1);
  g.fillRect(x + lean * 0.7 - 5, top + h * 0.22, 10, 18); g.fillCircle(x + lean * 0.7, top + h * 0.22, 5);
  g.fillRect(x + lean * 0.15 - 9, y - 30, 18, 22); g.fillCircle(x + lean * 0.15, y - 30, 9);
  g.fillStyle(LIME_DEEP, 1); g.fillRect(x + lean * 0.15 - 11, y - 9, 22, 3);
  // Cracks down the drum.
  crack(g, tx - r * 0.3, top + 6, h * 0.55, Math.PI / 2 + 0.15, LIME_DEEP, 0.8, 1.6);
  crack(g, tx + r * 0.5, top + h * 0.3, h * 0.4, Math.PI / 2 - 0.2, LIME_DEEP, 0.6);
  // Moss on the north side and weeds on the parapet.
  for (let i = 0; i < 6; i++) { g.fillStyle(MOSS_DARK, 0.6); g.fillEllipse(x + lean * 0.6 - r * 0.6 + rng() * 8, top + h * (0.2 + rng() * 0.7), 6, 10); }
  weed(g, tx - r * 0.4, top - 8, 1); weed(g, tx + r * 0.6, top - 8, 0.8);
  // The spoil heaped against its foot.
  spoil(g, x - r * 0.7, y + 6, r * 1.6, 34, rng);
  spoil(g, x + r * 0.9, y + 8, r * 1.3, 26, rng);
}

/**
 * A buried house: only the roof and its dormer show above the spoil — slate courses, a cracked
 * ridge, a chimney stack with its pot, a dormer window with a candle in it (somebody is living
 * down there). `w` is the roof length.
 */
export function buriedRoof(g: G, x: number, y: number, w: number, lamp: boolean, rng: () => number): void {
  const h = w * 0.28;
  shadow(g, x, y + 4, w * 1.1, 18, 0.3);
  // The roof slope (the near pitch), courses of slate.
  for (let i = 0; i < 6; i++) {
    const k0 = i / 6, k1 = (i + 1) / 6;
    const y0 = y - h * k0, y1 = y - h * k1;
    g.fillStyle(i % 2 ? SLATE : mixC(SLATE, SLATE_DARK, 0.3), 1);
    g.fillRect(x - w / 2 + k1 * 8, y1, w - k1 * 16, y0 - y1 + 0.5);
    for (let s = 0; s < w / 12; s++) { g.fillStyle(SLATE_DARK, 0.5); g.fillRect(x - w / 2 + ((s * 12 + i * 6) % w), y1, 1, y0 - y1); }
  }
  g.fillStyle(SLATE_LIT, 0.4); g.fillRect(x - w / 2 + 8, y - h - 1, w - 16, 3);
  // Slipped slates.
  for (let i = 0; i < 4; i++) { g.fillStyle(SLATE_DARK, 1); g.fillRect(x - w / 2 + 10 + rng() * (w - 30), y - h * rng(), 8, 3); }
  // The ridge, cracked through, and the chimney stack.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - w / 2 + 6, y - h - 4, w - 12, 5);
  crack(g, x + w * 0.1, y - h - 2, h * 0.7, Math.PI / 2 + 0.3, SLATE_DARK, 0.9);
  const cx = x + w * 0.28;
  ashlar(g, cx, y - h, 18, 26, LIME_DARK);
  g.fillStyle(TESS_RED, 1); g.fillRect(cx - 4, y - h - 33, 8, 8);
  // The dormer.
  const dx = x - w * 0.2;
  g.fillStyle(LIME, 1); g.fillRect(dx - 13, y - h * 0.75 - 18, 26, 22);
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(dx - 17, y - h * 0.75 - 18, dx + 17, y - h * 0.75 - 18, dx, y - h * 0.75 - 32);
  g.fillStyle(lamp ? 0x3a2410 : 0x0c0a08, 1); g.fillRect(dx - 7, y - h * 0.75 - 13, 14, 14);
  if (lamp) {
    glow(g, dx, y - h * 0.75 - 6, 18, GLOW, 0.06, 3);
    g.fillStyle(GLOW, 1); g.fillRect(dx - 1, y - h * 0.75 - 9, 2, 4);
  }
  g.lineStyle(1, LIME_DARK, 1); g.lineBetween(dx, y - h * 0.75 - 13, dx, y - h * 0.75 + 1); g.lineBetween(dx - 7, y - h * 0.75 - 6, dx + 7, y - h * 0.75 - 6);
  // The spoil up to the eaves.
  spoil(g, x, y + 8, w * 1.15, 28, rng);
}

/**
 * A standing column snapped off: fluted drums stacked a little off true, the break jagged at the
 * top, a weed growing out of it, chips at its foot.
 */
export function brokenColumn(g: G, x: number, y: number, h: number, r: number, rng: () => number): void {
  shadow(g, x, y + 2, r * 3, r, 0.3);
  // Base.
  ashlar(g, x, y + 2, r * 2.8, 10, LIME_DARK, false);
  ashlar(g, x, y - 7, r * 2.4, 6, LIME, false);
  // The shaft: drums.
  const drums = Math.max(1, Math.round(h / (r * 1.6)));
  for (let i = 0; i < drums; i++) {
    const y0 = y - 12 - (i * h) / drums, y1 = y - 12 - ((i + 1) * h) / drums;
    const off = (rng() - 0.5) * 2;
    g.fillStyle(LIME, 1); g.fillRect(x - r + off, y1, r * 2, y0 - y1);
    for (let f = 0; f < 5; f++) { g.fillStyle(f % 2 ? LIME_DARK : LIME_LIT, 0.5); g.fillRect(x - r + off + 2 + f * (r * 2 - 4) / 5, y1, 1.5, y0 - y1); }
    g.fillStyle(0x000000, 0.15); g.fillRect(x + r * 0.4 + off, y1, r * 0.6, y0 - y1);
    g.fillStyle(LIME_DEEP, 0.6); g.fillRect(x - r + off, y0 - 1, r * 2, 1);
  }
  // The jagged break.
  const top = y - 12 - h;
  g.fillStyle(LIME_LIT, 1);
  g.beginPath(); g.moveTo(x - r, top + 2);
  for (let k = 0; k <= 6; k++) g.lineTo(x - r + (k * r * 2) / 6, top - (k % 2 ? 6 : 0) - rng() * 4);
  g.lineTo(x + r, top + 2); g.closePath(); g.fillPath();
  weed(g, x + 2, top - 2, 0.9);
  for (let i = 0; i < 4; i++) ashlar(g, x - r * 2 + rng() * r * 4, y + 6 + rng() * 6, 5 + rng() * 6, 4 + rng() * 3, LIME, false);
}

/**
 * The colossus's head, lying on its cheek where it fell: a face of limestone three men high, a
 * laurel crown of green bronze slipped over one brow, closed eyes (lids chiselled heavy), the
 * nose broken off and lying beside it, a beard of carved curls, the neck a raw broken face of
 * stone. Moss in the ear, a scavenger's ladder against the crown. `eyes` 0..1 lights the eyes
 * (the gimmick wakes them). `s` scales it (1 = world size, ~220px wide).
 */
export function colossusHead(g: G, x: number, y: number, s: number, eyes = 0, look = 0): void {
  const W = 220 * s, H = 150 * s;
  shadow(g, x, y + 6 * s, W * 1.15, 40 * s, 0.4);
  const cx = x, cy = y - H * 0.45;
  // The back of the skull (lying on its right cheek, face toward the viewer and up).
  g.fillStyle(LIME_DEEP, 1); g.fillEllipse(cx + 8 * s, cy + 8 * s, W, H);
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(cx, cy, W, H * 0.96);
  // The face plane.
  g.fillStyle(LIME, 1); g.fillEllipse(cx - W * 0.06, cy - H * 0.04, W * 0.78, H * 0.78);
  g.fillStyle(LIME_LIT, 0.45); g.fillEllipse(cx - W * 0.14, cy - H * 0.16, W * 0.42, H * 0.3);
  // The broken neck: a raw face on the right end, lighter, with tool-marks.
  g.fillStyle(LIME_LIT, 1); g.fillEllipse(cx + W * 0.42, cy + H * 0.12, W * 0.14, H * 0.5);
  g.lineStyle(1, LIME_DARK, 0.6);
  for (let i = 0; i < 6; i++) g.lineBetween(cx + W * 0.38, cy - H * 0.08 + i * H * 0.07, cx + W * 0.46, cy - H * 0.06 + i * H * 0.07);
  // The beard: rows of carved curls along the jaw (the lower edge).
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 8; i++) {
      const bx = cx - W * 0.3 + i * W * 0.075 + row * W * 0.035, by = cy + H * 0.3 + row * H * 0.07 - Math.abs(i - 4) * H * 0.012;
      g.fillStyle(LIME_DARK, 1); g.fillCircle(bx, by, 7 * s);
      g.lineStyle(1.5 * s, LIME_DEEP, 0.8); g.beginPath(); g.arc(bx, by, 4 * s, 0, Math.PI * 1.5, false); g.strokePath();
    }
  }
  // Brow, eyes, lids.
  const ey = cy - H * 0.08;
  for (const k of [-1, 1]) {
    const ex = cx - W * 0.08 + k * W * 0.15;
    g.fillStyle(LIME_DEEP, 0.7); g.fillEllipse(ex, ey - 12 * s, 46 * s, 10 * s); // the brow's shadow
    g.fillStyle(LIME_DARK, 1); g.fillEllipse(ex, ey, 40 * s, 20 * s);
    if (eyes > 0.02) {
      glow(g, ex, ey, 26 * s, LANTERN, 0.05 + eyes * 0.07, 3);
      g.fillStyle(mixC(LIME_DARK, 0xfff0b0, eyes), 1); g.fillEllipse(ex, ey, 32 * s * (0.5 + eyes * 0.5), 14 * s * eyes + 2);
      g.fillStyle(0xffffff, eyes); g.fillCircle(ex + Math.cos(look) * 6 * s, ey + Math.sin(look) * 3 * s, 4 * s);
    } else {
      // Closed: a heavy carved lid and lashes line.
      g.fillStyle(LIME, 1); g.fillEllipse(ex, ey - 2 * s, 38 * s, 16 * s);
      g.lineStyle(2 * s, LIME_DEEP, 1); g.beginPath(); g.arc(ex, ey - 8 * s, 18 * s, 0.25, Math.PI - 0.25, false); g.strokePath();
    }
  }
  // The broken nose: a flat scar where it was.
  g.fillStyle(LIME_LIT, 1); g.fillEllipse(cx - W * 0.08, cy + H * 0.06, 22 * s, 16 * s);
  g.lineStyle(1, LIME_DEEP, 0.7); g.strokeEllipse(cx - W * 0.08, cy + H * 0.06, 22 * s, 16 * s);
  // The mouth: full stone lips, a little open.
  g.fillStyle(LIME_DEEP, 1); g.fillEllipse(cx - W * 0.08, cy + H * 0.2, 46 * s, 9 * s);
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(cx - W * 0.08, cy + H * 0.18, 48 * s, 6 * s);
  // The laurel crown in green bronze, slipped over the left brow.
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * 1.05 + i * 0.12;
    const lx = cx - W * 0.02 + Math.cos(a) * W * 0.42, ly = cy - H * 0.06 + Math.sin(a) * H * 0.48;
    g.fillStyle(i % 2 ? VERDIGRIS : VERDIGRIS_DARK, 1);
    g.fillEllipse(lx, ly, 18 * s, 8 * s);
    g.fillStyle(BRONZE, 0.6); g.fillCircle(lx + 2 * s, ly, 1.5 * s);
  }
  g.lineStyle(3 * s, VERDIGRIS_DARK, 1);
  g.beginPath(); g.arc(cx - W * 0.02, cy - H * 0.06, W * 0.42, Math.PI * 1.05, Math.PI * 2.25, false); g.strokePath();
  // Cracks, moss in the ear, weathering streaks.
  crack(g, cx - W * 0.3, cy - H * 0.3, 60 * s, 0.6, LIME_DEEP, 0.8, 1.6 * s);
  crack(g, cx + W * 0.1, cy + H * 0.05, 50 * s, 1.9, LIME_DEEP, 0.7, 1.4 * s);
  g.fillStyle(MOSS_DARK, 0.8); g.fillEllipse(cx + W * 0.28, cy - H * 0.05, 18 * s, 24 * s);
  g.fillStyle(MOSS, 0.7); g.fillEllipse(cx + W * 0.27, cy - H * 0.07, 10 * s, 14 * s);
  for (let i = 0; i < 5; i++) { g.lineStyle(2 * s, DUST_DARK, 0.25); g.lineBetween(cx - W * 0.3 + i * W * 0.12, cy - H * 0.25, cx - W * 0.32 + i * W * 0.12, cy + H * 0.12); }
}

/** The colossus's broken-off nose, lying beside the head like a boulder. */
export function colossusNose(g: G, x: number, y: number, s: number): void {
  shadow(g, x, y + 2, 40 * s, 12 * s, 0.3);
  g.fillStyle(LIME_DARK, 1); g.fillTriangle(x - 20 * s, y, x + 18 * s, y, x - 4 * s, y - 26 * s);
  g.fillStyle(LIME, 1); g.fillTriangle(x - 16 * s, y - 2 * s, x + 12 * s, y - 2 * s, x - 5 * s, y - 24 * s);
  g.fillStyle(LIME_DEEP, 1); g.fillEllipse(x - 8 * s, y - 3 * s, 7 * s, 4 * s); g.fillEllipse(x + 4 * s, y - 3 * s, 7 * s, 4 * s);
  g.fillStyle(LIME_LIT, 1); g.fillEllipse(x + 14 * s, y - 6 * s, 8 * s, 12 * s);
}

/**
 * The colossus's fallen hand, palm up as if asking: four great fingers curled half shut, the
 * thumb broken at the knuckle, the wrist a broken drum, a ring of bronze on the forefinger.
 * Scavengers have hung a tarp off the thumb. `s` scales it; `x, y` is the heel of the palm.
 */
export function colossusHand(g: G, x: number, y: number, s: number, rng: () => number, tarp = true): void {
  shadow(g, x + 10 * s, y + 4 * s, 200 * s, 40 * s, 0.35);
  // The wrist stump.
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(x - 70 * s, y - 20 * s, 44 * s, 52 * s);
  g.fillStyle(LIME_LIT, 1); g.fillEllipse(x - 82 * s, y - 20 * s, 22 * s, 46 * s);
  // The palm.
  g.fillStyle(LIME_DEEP, 1); g.fillEllipse(x - 10 * s, y - 14 * s, 128 * s, 62 * s);
  g.fillStyle(LIME, 1); g.fillEllipse(x - 12 * s, y - 20 * s, 120 * s, 52 * s);
  g.lineStyle(2 * s, LIME_DEEP, 0.6);
  g.beginPath(); g.arc(x - 20 * s, y - 4 * s, 30 * s, -2.6, -0.6, false); g.strokePath();
  g.beginPath(); g.arc(x - 6 * s, y - 34 * s, 26 * s, 0.6, 2.4, false); g.strokePath();
  // Fingers, curled toward the viewer.
  for (let i = 0; i < 4; i++) {
    const fx = x + 40 * s + i * 4 * s, fy = y - 44 * s + i * 16 * s;
    g.fillStyle(LIME_DARK, 1); g.fillRoundedRect(fx, fy - 9 * s, 52 * s - i * 4 * s, 18 * s, 8 * s);
    g.fillStyle(LIME, 1); g.fillRoundedRect(fx, fy - 10 * s, 48 * s - i * 4 * s, 15 * s, 7 * s);
    g.fillStyle(LIME_DEEP, 0.7); g.fillRect(fx + 20 * s, fy - 10 * s, 1.5 * s, 15 * s);
    // The curled tip.
    g.fillStyle(LIME_DARK, 1); g.fillCircle(fx + 50 * s - i * 4 * s, fy, 9 * s);
    g.fillStyle(LIME_LIT, 0.6); g.fillEllipse(fx + 48 * s - i * 4 * s, fy - 3 * s, 7 * s, 4 * s);
  }
  // The bronze ring on the forefinger.
  g.fillStyle(VERDIGRIS, 1); g.fillRect(x + 62 * s, y - 54 * s, 7 * s, 18 * s);
  g.fillStyle(BRONZE, 0.7); g.fillRect(x + 62 * s, y - 54 * s, 2 * s, 18 * s);
  // The broken thumb.
  g.fillStyle(LIME_DARK, 1); g.fillEllipse(x - 20 * s, y - 52 * s, 30 * s, 22 * s);
  g.fillStyle(LIME_LIT, 1); g.fillEllipse(x - 18 * s, y - 60 * s, 18 * s, 8 * s);
  if (tarp) {
    // A scavenger's tarp off the thumb to a pole.
    g.lineStyle(1.5, ROPE, 1); g.lineBetween(x - 18 * s, y - 62 * s, x - 60 * s, y - 70 * s);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 108 * s, y - 70 * s, 3 * s, 70 * s);
    g.fillStyle(TARP, 0.95); g.fillTriangle(x - 18 * s, y - 62 * s, x - 106 * s, y - 68 * s, x - 70 * s, y - 20 * s);
    g.fillStyle(dim(TARP, 0.25), 1); g.fillTriangle(x - 106 * s, y - 68 * s, x - 70 * s, y - 20 * s, x - 100 * s, y - 24 * s);
  }
  crack(g, x - 30 * s, y - 30 * s, 50 * s, 0.2, LIME_DEEP, 0.7, 1.5 * s);
  void rng;
}

/**
 * The colossus's feet, all that stands of him: a stepped plinth with two great sandalled feet
 * broken off at the ankle, the dedication on the plinth chiselled away and the Regent's seal
 * mortared over it. The rest of the colossus lies where it fell. `s` scales it.
 */
export function colossusFeet(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 6, 260 * s, 50 * s, 0.4);
  // The plinth, three steps.
  for (let k = 0; k < 3; k++) {
    const w = (250 - k * 30) * s, h = 18 * s;
    const py = y - k * h;
    g.fillStyle(LIME_DEEP, 1); g.fillRect(x - w / 2, py - h, w, h);
    g.fillStyle(k % 2 ? LIME : LIME_DARK, 1); g.fillRect(x - w / 2, py - h, w - 3, h - 3);
    g.fillStyle(LIME_LIT, 0.6); g.fillRect(x - w / 2, py - h, w - 3, 2);
  }
  const top = y - 54 * s;
  // The dedication panel: chiselled blank, sealed over.
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 70 * s, y - 34 * s, 140 * s, 14 * s);
  for (let i = 0; i < 18; i++) { g.lineStyle(1, LIME_DEEP, 0.7); g.lineBetween(x - 66 * s + i * 7.4 * s, y - 32 * s, x - 63 * s + i * 7.4 * s, y - 22 * s); }
  regentSeal(g, x, y - 27 * s, 10 * s);
  // Two feet.
  for (const k of [-1, 1]) {
    const fx = x + k * 48 * s;
    g.fillStyle(LIME_DARK, 1); g.fillRoundedRect(fx - 28 * s, top - 22 * s, 56 * s, 26 * s, 10 * s);
    g.fillStyle(LIME, 1); g.fillRoundedRect(fx - 26 * s, top - 26 * s, 52 * s, 24 * s, 10 * s);
    // Toes along the front.
    for (let t = 0; t < 5; t++) { g.fillStyle(LIME_LIT, 1); g.fillEllipse(fx - 18 * s + t * 9 * s, top - 3 * s, 8 * s, 6 * s); }
    // The ankle, broken off: a raw stump.
    g.fillStyle(LIME_DARK, 1); g.fillRect(fx - 18 * s, top - 64 * s, 36 * s, 42 * s);
    g.fillStyle(LIME, 1); g.fillRect(fx - 17 * s, top - 64 * s, 30 * s, 40 * s);
    g.fillStyle(LIME_LIT, 1);
    g.beginPath(); g.moveTo(fx - 18 * s, top - 64 * s);
    for (let i = 0; i <= 6; i++) g.lineTo(fx - 18 * s + i * 6 * s, top - 64 * s - (i % 2 ? 9 : 2) * s - rng() * 4 * s);
    g.lineTo(fx + 18 * s, top - 64 * s); g.closePath(); g.fillPath();
    // Sandal straps.
    g.lineStyle(3 * s, BRONZE, 0.9); g.lineBetween(fx - 18 * s, top - 30 * s, fx + 18 * s, top - 38 * s); g.lineBetween(fx - 18 * s, top - 44 * s, fx + 18 * s, top - 50 * s);
    g.fillStyle(0x000000, 0.15); g.fillRect(fx + 8 * s, top - 64 * s, 10 * s, 40 * s);
  }
  weed(g, x - 110 * s, y - 2, 1.2); weed(g, x + 96 * s, y - 20 * s, 1);
}

/**
 * One arch of the broken aqueduct, seen side-on: two piers, the round arch between, and the
 * channel on top with its lip. `broken` knocks out the arch and leaves ragged stumps of channel
 * (water pours out there — animate it yourself). `x` is the arch centre, `y` the base line.
 */
export function aqueductArch(g: G, x: number, y: number, span: number, h: number, broken: boolean, rng: () => number): void {
  const pw = span * 0.24;
  const x0 = x - span / 2, x1 = x + span / 2;
  for (const px of [x0, x1]) {
    // A pier, coursed.
    g.fillStyle(LIME_DARK, 1); g.fillRect(px - pw / 2, y - h, pw, h);
    g.fillStyle(LIME, 1); g.fillRect(px - pw / 2, y - h, pw - 3, h);
    for (let c = 0; c < h; c += 14) { g.fillStyle(LIME_DEEP, 0.5); g.fillRect(px - pw / 2, y - c, pw, 1); }
    g.fillStyle(0x000000, 0.14); g.fillRect(px + pw * 0.15, y - h, pw * 0.35, h);
    // Water stains down the pier.
    g.fillStyle(MOSS_DARK, 0.35); g.fillRect(px - pw * 0.3, y - h, 4, h * 0.6);
  }
  const archTop = y - h;
  if (!broken) {
    // The arch: a thick stone ring between the piers, voussoirs drawn out.
    const r = (span - pw) / 2;
    g.lineStyle(14, LIME_DARK, 1); g.beginPath(); g.arc(x, archTop + r * 0.2 + 30, r, Math.PI, 0, false); g.strokePath();
    g.lineStyle(10, LIME, 1); g.beginPath(); g.arc(x, archTop + r * 0.2 + 30, r, Math.PI, 0, false); g.strokePath();
    for (let i = 1; i < 9; i++) {
      const a = Math.PI + (i / 9) * Math.PI;
      g.lineStyle(1, LIME_DEEP, 0.7);
      g.lineBetween(x + Math.cos(a) * (r - 5), archTop + r * 0.2 + 30 + Math.sin(a) * (r - 5), x + Math.cos(a) * (r + 5), archTop + r * 0.2 + 30 + Math.sin(a) * (r + 5));
    }
    // Spandrel fill and the channel on top.
    g.fillStyle(LIME_DARK, 1); g.fillRect(x0, archTop - 30, span, 30);
    g.fillStyle(LIME, 1); g.fillRect(x0, archTop - 32, span, 26);
    g.fillStyle(LIME_LIT, 1); g.fillRect(x0, archTop - 34, span, 4);
    g.fillStyle(WATER, 0.7); g.fillRect(x0, archTop - 34, span, 2);
  } else {
    // Ragged channel stumps over each pier, and the fallen voussoirs below.
    for (const [px, d] of [[x0, 1], [x1, -1]] as [number, number][]) {
      g.fillStyle(LIME, 1);
      g.beginPath(); g.moveTo(px - d * pw * 0.5, archTop - 34); g.lineTo(px + d * span * 0.16, archTop - 34);
      g.lineTo(px + d * span * 0.1, archTop - 18); g.lineTo(px + d * span * 0.13, archTop - 8); g.lineTo(px - d * pw * 0.5, archTop + 6); g.closePath(); g.fillPath();
      g.fillStyle(LIME_LIT, 1); g.fillRect(Math.min(px - d * pw * 0.5, px + d * span * 0.16), archTop - 36, Math.abs(span * 0.16 + pw * 0.5), 3);
    }
    for (let i = 0; i < 6; i++) ashlar(g, x0 + span * 0.2 + rng() * span * 0.6, y + 4 - rng() * 6, 14 + rng() * 8, 8 + rng() * 6, rng() < 0.5 ? LIME : LIME_DARK);
  }
}

/**
 * The scavengers' stall: two poles and a sun-bleached tarp, a trestle of finds laid out (a bronze
 * hand, a door-knocker, a lamp, tesserae in a bowl, a stack of chipped tiles), crates of more
 * under the board. `cloth` tints the tarp.
 */
export function salvageStall(g: G, x: number, y: number, w: number, cloth: number, rng: () => number): void {
  shadow(g, x, y + 4, w * 1.1, 20, 0.3);
  const top = y - 70;
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * w / 2 - 2, top, 4, 70); }
  // The trestle and its finds.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 6, y - 24, w - 12, 4);
  g.fillStyle(TIMBER, 1); g.fillRect(x - w / 2 + 6, y - 28, w - 12, 5);
  for (const k of [-0.4, 0.4]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * w - 1, y - 22, 3, 22); }
  // A bronze hand.
  g.fillStyle(VERDIGRIS, 1); g.fillEllipse(x - w * 0.28, y - 33, 18, 9);
  for (let i = 0; i < 4; i++) g.fillRect(x - w * 0.28 + 6 + i * 2.5, y - 42 + i, 2, 8);
  // A lamp, a door-knocker ring, a bowl of tesserae, a stack of tiles.
  g.fillStyle(BRONZE, 1); g.fillEllipse(x - w * 0.05, y - 32, 14, 6); g.fillTriangle(x - w * 0.05 + 6, y - 33, x - w * 0.05 + 12, y - 36, x - w * 0.05 + 10, y - 31);
  g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(x + w * 0.1, y - 36, 5);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x + w * 0.26, y - 31, 18, 7);
  for (let i = 0; i < 8; i++) { g.fillStyle([TESS_RED, TESS_OCHRE, TESS_BLUE, TESS_BONE][i % 4], 1); g.fillRect(x + w * 0.26 - 7 + (i % 4) * 3.5, y - 35 + Math.floor(i / 4) * 2, 3, 2); }
  for (let i = 0; i < 4; i++) { g.fillStyle(i % 2 ? TESS_RED : dim(TESS_RED, 0.2), 1); g.fillRect(x + w * 0.38 - 7, y - 30 - i * 3, 14, 3); }
  // Crates under the board.
  for (const k of [-0.25, 0.2]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * w - 10, y - 18, 20, 18);
    g.fillStyle(TIMBER, 1); g.fillRect(x + k * w - 9, y - 17, 18, 16);
    g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(x + k * w - 9, y - 9, x + k * w + 9, y - 9);
  }
  // The tarp, sagging, patched, its edge scalloped.
  g.fillStyle(dim(cloth, 0.3), 1);
  g.fillTriangle(x - w / 2 - 6, top + 4, x + w / 2 + 6, top + 4, x, top - 14);
  g.fillStyle(cloth, 1); g.fillRect(x - w / 2 - 6, top - 2, w + 12, 12);
  for (let k = 0; k < Math.round(w / 14); k++) { g.fillStyle(cloth, 1); g.fillCircle(x - w / 2 + 2 + k * 14, top + 10, 6); }
  g.fillStyle(lit(cloth, 0.25), 1); g.fillRect(x - w * 0.2, top + 1, 12, 7);
  g.fillStyle(dim(cloth, 0.15), 1); g.fillRect(x + w * 0.15, top + 2, 14, 6);
  g.lineStyle(1, ROPE, 1); g.lineBetween(x - w / 2, top, x - w / 2 - 14, y); g.lineBetween(x + w / 2, top, x + w / 2 + 14, y);
  void rng;
}

/**
 * A street name-stone: a corner block with a bronze plate let into it, the name chiselled out on
 * the Regent's order (the letters still show as chisel-pocks), half sunk in the spoil.
 * `restored` shows it cleaned, the letters picked out in chalk.
 */
export function nameStone(g: G, x: number, y: number, restored: boolean, rng: () => number): void {
  shadow(g, x, y + 2, 50, 10, 0.3);
  ashlar(g, x, y, 44, 30, LIME_DARK);
  g.fillStyle(restored ? BRONZE : VERDIGRIS_DARK, 1); g.fillRect(x - 17, y - 25, 34, 14);
  g.lineStyle(1, BRONZE, 1); g.strokeRect(x - 17, y - 25, 34, 14);
  for (let i = 0; i < 6; i++) {
    const lx = x - 13 + i * 5.2;
    if (restored) { g.lineStyle(1.4, CHALK, 1); g.lineBetween(lx, y - 21, lx + 2, y - 15); g.lineBetween(lx + 2, y - 15, lx + 3, y - 21); }
    else { g.fillStyle(VERDIGRIS, 0.8); g.fillCircle(lx + 1.5, y - 18, 1.6); }
  }
  spoil(g, x + 6, y + 4, 50, 14, rng);
}

/**
 * The Regent's notice board: a slab on two posts, the notice nailed up under his seal. Its text
 * is a sign POI — this is the board it hangs on.
 */
export function noticeSlab(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 60, 12, 0.3);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * 22 - 2, y - 46, 4, 46); }
  ashlar(g, x, y - 18, 58, 30, SCREE, false);
  g.fillStyle(TESS_BONE, 1); g.fillRect(x - 20, y - 44, 40, 22);
  for (let i = 0; i < 5; i++) { g.lineStyle(1, DUST_DARK, 0.8); g.lineBetween(x - 16, y - 39 + i * 4, x + 16 - (i % 2) * 6, y - 39 + i * 4); }
  regentSeal(g, x + 14, y - 26, 5);
}

/**
 * The court waystone: a broken milestone of the old capital, re-set upright by the pickers and
 * ringed with a little cairn, its distance-number chiselled out and a new one scratched in.
 */
export function rubbleWaystone(g: G, x: number, y: number, rng: () => number): void {
  shadow(g, x, y + 2, 50, 14, 0.35);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    g.fillStyle(i % 2 ? SCREE : SCREE_DARK, 1); g.fillEllipse(x + Math.cos(a) * 20, y + Math.sin(a) * 6, 12, 7);
  }
  g.fillStyle(LIME_DARK, 1); g.fillRoundedRect(x - 11, y - 54, 22, 54, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(LIME, 1); g.fillRoundedRect(x - 10, y - 54, 18, 52, { tl: 9, tr: 9, bl: 0, br: 0 });
  g.lineStyle(1.2, LIME_DEEP, 0.9); g.lineBetween(x - 5, y - 36, x + 3, y - 36); g.lineBetween(x - 5, y - 30, x + 3, y - 30);
  g.lineStyle(1.4, CHALK, 0.9); g.lineBetween(x - 4, y - 22, x - 1, y - 16); g.lineBetween(x - 1, y - 16, x + 3, y - 22);
  crack(g, x + 4, y - 50, 22, 1.7, LIME_DEEP, 0.7);
  void rng;
}

/**
 * The windlass over the collapsed well: a broken A-frame of beams with its drum still on it, a
 * frayed rope going down into the dark, and the pickers' lantern hung off the cross-beam.
 */
export function wellWindlass(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 90, 14, 0.25);
  for (const k of [-1, 1]) {
    g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(x + k * 40, y, x + k * 14, y - 70);
    g.lineStyle(4, TIMBER, 1); g.lineBetween(x + k * 40, y - 1, x + k * 14, y - 71);
  }
  // The drum.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 20, y - 76, 40, 12);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 20, y - 76, 40, 8);
  for (let i = 0; i < 6; i++) { g.lineStyle(1.5, ROPE, 1); g.lineBetween(x - 16 + i * 6, y - 76, x - 14 + i * 6, y - 66); }
  // The crank, snapped.
  g.lineStyle(3, IRON, 1); g.lineBetween(x + 20, y - 70, x + 32, y - 70); g.lineBetween(x + 32, y - 70, x + 34, y - 58);
  // The rope down.
  g.lineStyle(1.5, ROPE, 1); g.lineBetween(x - 2, y - 66, x - 4, y + 40);
  // The lantern.
  g.lineStyle(1, IRON, 1); g.lineBetween(x + 10, y - 66, x + 10, y - 52);
  g.fillStyle(IRON, 1); g.fillRect(x + 6, y - 52, 8, 10);
  g.fillStyle(GLOW, 1); g.fillRect(x + 7.5, y - 50, 5, 6);
}

/**
 * Prince Wreck's crane: a lattice mast on a ballast cart of quarry blocks, a long jib out over
 * the yard, the cab with its stovepipe, and the hook line hanging to where the ball swings (the
 * ball itself is drawn live in `animateOver`). Returns the jib tip, where the line hangs from.
 */
export function wreckCrane(g: G, x: number, y: number, rng: () => number): Pt {
  shadow(g, x + 60, y + 4, 200, 30, 0.35);
  // The ballast cart: rusted wheels and a load of cut stone.
  g.fillStyle(RUST, 1); g.fillRect(x - 50, y - 26, 100, 16);
  g.fillStyle(RUST_LIT, 0.6); g.fillRect(x - 50, y - 26, 100, 2);
  for (const k of [-34, -10, 14, 38]) { g.fillStyle(IRON, 1); g.fillCircle(x + k, y - 8, 9); g.fillStyle(IRON_LIT, 1); g.fillCircle(x + k, y - 8, 3); }
  for (let i = 0; i < 5; i++) ashlar(g, x - 40 + i * 20, y - 26, 18, 14 + (i % 2) * 6, i % 2 ? LIME : LIME_DARK);
  // The mast: two rails and the lattice.
  const top = y - 210;
  for (const k of [-10, 10]) { g.lineStyle(4, RUST, 1); g.lineBetween(x + k, y - 40, x + k * 0.5, top); }
  g.lineStyle(1.5, RUST_LIT, 0.9);
  for (let c = y - 40; c > top + 10; c -= 18) { g.lineBetween(x - 10 + (y - 40 - c) * 0.025, c, x + 10 - (y - 58 - c) * 0.025, c - 18); g.lineBetween(x + 10, c, x - 10, c - 18); }
  // The cab.
  g.fillStyle(HAZARD, 1); g.fillRect(x - 22, y - 92, 30, 26);
  g.fillStyle(dim(HAZARD, 0.3), 1); g.fillRect(x + 4, y - 92, 4, 26);
  g.fillStyle(0x1a1410, 1); g.fillRect(x - 18, y - 88, 14, 10);
  g.fillStyle(IRON, 1); g.fillRect(x - 20, y - 104, 4, 12);
  // The jib, out to the right over the yard, and its back-stay.
  const tip = { x: x + 230, y: top + 28 };
  g.lineStyle(4, RUST, 1); g.lineBetween(x, top + 10, tip.x, tip.y); g.lineBetween(x, top + 26, tip.x, tip.y + 4);
  g.lineStyle(1.5, RUST_LIT, 0.9);
  for (let k = 0; k < 10; k++) {
    const ax = x + (k / 10) * 230, ay = top + 10 + (k / 10) * 18;
    g.lineBetween(ax, ay, ax + 23, ay + 17);
  }
  g.lineStyle(1.5, IRON, 1); g.lineBetween(x, top - 14, tip.x, tip.y); g.lineBetween(x, top - 14, x - 70, y - 40);
  g.fillStyle(RUST, 1); g.fillTriangle(x - 6, top + 10, x + 6, top + 10, x, top - 16);
  // Hazard bands on the jib's tip.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? IRON : HAZARD, 1); g.fillRect(tip.x - 20 + k * 7, tip.y - 2, 7, 6); }
  void rng;
  return tip;
}

/** The wrecking ball itself: a pitted iron sphere with a lifting eye and a chalk mark. */
export function wreckingBall(g: G, x: number, y: number, r: number): void {
  shadow(g, x, y + r * 1.2, r * 2, r * 0.6, 0.3);
  g.fillStyle(0x1e1a18, 1); g.fillCircle(x, y, r);
  g.fillStyle(IRON, 1); g.fillCircle(x - r * 0.12, y - r * 0.12, r * 0.88);
  g.fillStyle(IRON_LIT, 0.8); g.fillCircle(x - r * 0.36, y - r * 0.38, r * 0.3);
  g.fillStyle(RUST, 0.5); g.fillCircle(x + r * 0.3, y + r * 0.2, r * 0.25); g.fillCircle(x - r * 0.1, y + r * 0.45, r * 0.15);
  g.lineStyle(Math.max(1.5, r * 0.08), CHALK, 0.85); g.lineBetween(x - r * 0.3, y - r * 0.1, x + r * 0.2, y + r * 0.3); g.lineBetween(x + r * 0.2, y - r * 0.1, x - r * 0.3, y + r * 0.3);
  g.fillStyle(IRON, 1); g.fillRect(x - r * 0.15, y - r * 1.15, r * 0.3, r * 0.25);
  g.lineStyle(2, IRON_LIT, 1); g.strokeCircle(x, y - r * 1.2, r * 0.16);
}

/**
 * Prince Wreck's keep: the old capital's palace, half pulled down on his own orders. The left
 * wing stands — an arcaded front with tall windows and a balustrade, his hazard-striped banner
 * over the door — and the right wing is a stub of walls with the floors showing like a doll's
 * house, scaffold poles up it, chalk crosses on every stone still to come down.
 */
export function wreckKeep(g: G, x: number, y: number, w: number, h: number, rng: () => number): void {
  shadow(g, x, y + 8, w * 1.08, 34, 0.38);
  const x0 = x - w / 2, top = y - h;
  // Plinth.
  g.fillStyle(LIME_DEEP, 1); g.fillRect(x0 - 8, y - 20, w + 16, 20);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0 - 6, y - 22, w + 12, 16);
  // The standing wing (left 60%).
  const sw = w * 0.6;
  g.fillStyle(LIME_DARK, 1); g.fillRect(x0, top, sw, h - 20);
  g.fillStyle(LIME, 1); g.fillRect(x0 + 2, top + 2, sw - 6, h - 24);
  for (let c = top + 14; c < y - 22; c += 16) { g.fillStyle(LIME_DEEP, 0.35); g.fillRect(x0 + 2, c, sw - 6, 1); }
  // Two storeys of tall windows; a few boarded.
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      const wx = x0 + 24 + i * ((sw - 48) / 4), wy = top + 28 + row * (h * 0.36);
      const boarded = (i + row) % 3 === 1;
      g.fillStyle(0x14100c, 1); g.fillRect(wx - 9, wy, 18, h * 0.22); g.fillCircle(wx, wy, 9);
      if (boarded) { for (let b = 0; b < 3; b++) { g.fillStyle(TIMBER, 1); g.fillRect(wx - 11, wy + 4 + b * 9, 22, 4); } }
      else if (row === 0 && i === 2) { g.fillStyle(GLOW, 0.5); g.fillRect(wx - 7, wy + 2, 14, h * 0.2); }
      g.fillStyle(LIME_LIT, 1); g.fillRect(wx - 11, wy + h * 0.22, 22, 3);
    }
  }
  // The balustrade.
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 - 2, top - 4, sw + 2, 6);
  for (let bx = x0 + 4; bx < x0 + sw - 4; bx += 10) { g.fillStyle(LIME, 1); g.fillRect(bx, top - 18, 4, 14); }
  g.fillStyle(LIME_LIT, 1); g.fillRect(x0 - 2, top - 22, sw + 2, 5);
  // The door: double, iron-studded, under a hazard-striped lintel.
  const dx = x0 + sw * 0.5;
  g.fillStyle(0x1a120c, 1); g.fillRect(dx - 22, y - 76, 44, 56); g.fillCircle(dx, y - 76, 22);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 19, y - 72, 18, 52); g.fillRect(dx + 1, y - 72, 18, 52);
  for (let k = 0; k < 4; k++) { g.fillStyle(IRON_LIT, 1); g.fillCircle(dx - 10, y - 64 + k * 12, 1.6); g.fillCircle(dx + 10, y - 64 + k * 12, 1.6); }
  for (let k = 0; k < 8; k++) { g.fillStyle(k % 2 ? IRON : HAZARD, 1); g.fillRect(dx - 26 + k * 6.5, y - 104, 6.5, 6); }
  // The banner: hazard bands with his emblem, the wrecking ball on its chain.
  const bx = dx, by = top + 4;
  g.fillStyle(IRON, 1); g.fillRect(bx - 2, by - 30, 4, 34);
  g.fillStyle(WRECK, 1); g.fillRect(bx + 2, by - 28, 32, 40);
  for (let k = 0; k < 4; k++) { g.fillStyle(HAZARD, 1); g.fillTriangle(bx + 2, by - 28 + k * 10, bx + 10, by - 28 + k * 10, bx + 2, by - 20 + k * 10); }
  g.lineStyle(1.5, CHALK, 1); g.lineBetween(bx + 20, by - 22, bx + 20, by - 8);
  g.fillStyle(0x1e1a18, 1); g.fillCircle(bx + 20, by - 3, 6);
  g.fillStyle(WRECK, 1); g.fillTriangle(bx + 2, by + 12, bx + 34, by + 12, bx + 18, by + 20);
  // The demolished wing: wall stubs at different heights, floor joists, the inside showing.
  const dx0 = x0 + sw;
  const dw = w - sw;
  const heights = [0.82, 0.55, 0.68, 0.3, 0.42];
  for (let i = 0; i < heights.length; i++) {
    const sx = dx0 + (i * dw) / heights.length, ww = dw / heights.length;
    const hh = (h - 20) * heights[i];
    // The inside wall (plaster and a scrap of painted frieze).
    g.fillStyle(i % 2 ? 0xd8c8a8 : 0xc8b494, 1); g.fillRect(sx, y - 20 - hh, ww, hh);
    g.fillStyle(TESS_RED, 0.5); g.fillRect(sx, y - 20 - hh * 0.62, ww, 4);
    // The ragged top.
    g.fillStyle(LIME, 1);
    g.beginPath(); g.moveTo(sx, y - 20 - hh);
    for (let k = 0; k <= 4; k++) g.lineTo(sx + (k * ww) / 4, y - 20 - hh - (k % 2 ? 8 : 0) - rng() * 6);
    g.lineTo(sx + ww, y - 20 - hh + 8); g.lineTo(sx, y - 20 - hh + 8); g.closePath(); g.fillPath();
    // Joist ends where the floors were.
    for (const fk of [0.36, 0.72]) if (hh > (h - 20) * fk) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx, y - 20 - (h - 20) * fk, ww, 5); }
    // Chalk crosses on the stones still standing.
    g.lineStyle(1.6, CHALK, 0.9);
    const cx = sx + ww / 2, cy = y - 20 - hh * 0.5;
    g.lineBetween(cx - 6, cy - 6, cx + 6, cy + 6); g.lineBetween(cx + 6, cy - 6, cx - 6, cy + 6);
  }
  // Scaffold up the demolished wing.
  g.lineStyle(2.5, TIMBER, 1);
  for (let k = 0; k < 4; k++) { const sx = dx0 + 10 + k * (dw - 20) / 3; g.lineBetween(sx, y - 20, sx, y - 20 - (h - 20) * 0.9); }
  for (const fk of [0.3, 0.6, 0.88]) g.lineBetween(dx0 + 4, y - 20 - (h - 20) * fk, x0 + w - 4, y - 20 - (h - 20) * fk);
  g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(dx0 + 10, y - 20, x0 + w - 10, y - 20 - (h - 20) * 0.6);
  // Hazard bunting across the scaffold.
  for (let k = 0; k < 10; k++) {
    const px = dx0 + 8 + k * (dw - 16) / 10, py = y - 20 - (h - 20) * 0.6 + Math.sin(k * 0.9) * 3 + 4;
    g.fillStyle(k % 2 ? HAZARD : WRECK, 1); g.fillTriangle(px, py, px + 8, py, px + 4, py + 8);
  }
  // Rubble down the front of the wrecked wing.
  spoil(g, dx0 + dw * 0.5, y + 10, dw * 1.1, 40, rng);
  for (let i = 0; i < 6; i++) ashlar(g, dx0 + rng() * dw, y + 10 + rng() * 12, 14 + rng() * 10, 8 + rng() * 6, LIME_DARK);
}

/** A boulder off the landslide: rounded, banded, with a lit cap. */
export function boulder(g: G, x: number, y: number, s: number, rng: () => number): void {
  shadow(g, x, y + 2, 40 * s, 12 * s, 0.35);
  g.fillStyle(SCREE_DEEP, 1); g.fillEllipse(x, y - 12 * s, 40 * s, 28 * s);
  g.fillStyle(SCREE_DARK, 1); g.fillEllipse(x - 2 * s, y - 14 * s, 36 * s, 25 * s);
  g.fillStyle(SCREE, 1); g.fillEllipse(x - 5 * s, y - 17 * s, 26 * s, 17 * s);
  g.fillStyle(SCREE_LIT, 0.7); g.fillEllipse(x - 8 * s, y - 21 * s, 12 * s, 6 * s);
  g.lineStyle(1, SCREE_DEEP, 0.5); g.lineBetween(x - 16 * s, y - 10 * s, x + 16 * s, y - 14 * s);
  if (rng() < 0.5) weed(g, x + 14 * s, y - 2, 0.8);
}

/**
 * One ghost of the Lost Procession: a pale hooded walker, hem fraying into nothing, head bowed,
 * carrying what they were buried with (a book, a lute, a loaf). Used live by the procession
 * gimmick and faintly on the Processional Way at dusk. `step` is a walk phase.
 */
export function ghostWalker(g: G, x: number, y: number, s: number, step: number, a: number, carry = 0): void {
  if (a <= 0.01) return;
  const bob = Math.sin(step) * 1.5 * s;
  g.fillStyle(GHOST, 0.12 * a); g.fillEllipse(x, y + 1, 22 * s, 6 * s);
  // The robe: a tall teardrop fraying at the hem.
  g.fillStyle(GHOST, 0.45 * a);
  g.fillTriangle(x - 10 * s, y - 2 * s + bob, x + 10 * s, y - 2 * s + bob, x, y - 34 * s + bob);
  g.fillEllipse(x, y - 20 * s + bob, 18 * s, 26 * s);
  for (let i = 0; i < 4; i++) {
    const hx = x - 8 * s + i * 5.3 * s;
    g.fillTriangle(hx - 2 * s, y - 6 * s + bob, hx + 3 * s, y - 6 * s + bob, hx + Math.sin(step + i) * 2 * s, y + 3 * s + bob);
  }
  // The hood, bowed.
  g.fillStyle(GHOST_LIT, 0.55 * a); g.fillCircle(x + 2 * s, y - 34 * s + bob, 7 * s);
  g.fillStyle(0x1a2a2a, 0.5 * a); g.fillEllipse(x + 4 * s, y - 32 * s + bob, 6 * s, 7 * s);
  // What they carry.
  const cx = x + 7 * s, cy = y - 20 * s + bob;
  g.fillStyle(GHOST_LIT, 0.6 * a);
  if (carry === 0) g.fillRect(cx - 3 * s, cy - 4 * s, 7 * s, 9 * s); // a book
  else if (carry === 1) { g.fillEllipse(cx, cy + 2 * s, 8 * s, 10 * s); g.fillRect(cx - 1 * s, cy - 10 * s, 2 * s, 10 * s); } // a lute
  else g.fillEllipse(cx, cy, 10 * s, 6 * s); // a loaf
}

/** A lantern on a pole, the kind the procession's bearer carries: iron cage, warm flame. */
export function lanternPole(g: G, x: number, y: number, s: number, flame: number, a = 1): void {
  g.lineStyle(2 * s, IRON, a); g.lineBetween(x, y, x, y - 48 * s);
  g.lineBetween(x, y - 48 * s, x + 10 * s, y - 50 * s);
  glow(g, x + 10 * s, y - 40 * s, 22 * s, LANTERN, 0.07 * a * flame, 3);
  g.fillStyle(IRON, a); g.fillRect(x + 5 * s, y - 46 * s, 10 * s, 12 * s);
  g.fillStyle(LANTERN, a * (0.6 + flame * 0.4)); g.fillRect(x + 7 * s, y - 44 * s, 6 * s, 8 * s);
  g.fillStyle(0xffffff, a * 0.8 * flame); g.fillRect(x + 9 * s, y - 42 * s, 2 * s, 3 * s);
}

/** Hazard-striped barrier poles across a cut: Wreck's men mark every street they mean to drop. */
export function hazardBarrier(g: G, x: number, y: number, w: number): void {
  for (const k of [-1, 1]) { g.fillStyle(IRON, 1); g.fillRect(x + k * w / 2 - 2, y - 24, 4, 24); }
  g.fillStyle(WRECK_DARK, 1); g.fillRect(x - w / 2, y - 22, w, 7);
  for (let k = 0; k < w / 10; k++) { g.fillStyle(k % 2 ? IRON : HAZARD, 1); g.fillRect(x - w / 2 + k * 10, y - 22, 10, 6); }
  g.fillStyle(DUST_LIT, 0.4); g.fillRect(x - w / 2, y - 22, w, 1);
}
