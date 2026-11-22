import { dim, glow, lit, mixC, shadow, type G } from '../../../../art/IsleArt';
import type { Pt, Rect } from '../../../../IslesTypes';
import {
  BELL_VERDIGRIS, BONE, BONE_DARK, BONE_LIT, BRONZE, BRONZE_DARK, BRONZE_LIT, BRUISE, BRUISE_DARK, BRUISE_LIT, COFFIN,
  COFFIN_LIT, CRAPE, CRAPE_LIT, DIRT, DIRT_DARK, DIRT_LIT, GREY, GREY_DARK, GREY_LIT, IRON, IRON_LIT, LAMP, LAMP_HOT,
  LICHEN, LILY, MARSH_GAS, MIRE, MIRE_DEEP, MIRE_SHEEN, MOSS, MOSS_DARK, MOSS_LIT, PEAT, PEAT_DARK, PEAT_LIT, RUST,
  SEDGE, SEDGE_DARK, SHROUD, SLAB, SLAB_DARK, SLAB_LIT, SLATE, SLATE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, VENOM,
  WISP, WISP_DIM,
} from './palette';

/**
 * Grave Court set pieces — the shapes only a sinking churchyard has. Nothing here stands up
 * straight: headstones lean into the peat, stilts are bowed, roofs sag toward the water. Every
 * stone is grey-green with lichen and every wooden thing is black with wet. The paths are grave
 * slabs laid face-up, so you walk on names. Bells hang everywhere — on posts over the graves, in
 * the lych-gate, in the Lych House belfry — because on Fangmire the greyed are sometimes buried
 * before they are quite done, and a cord runs down from each bell into each coffin.
 */

type Rng = () => number;
const pt = (x: number, y: number): Pt => ({ x, y });
/** Rotate a local point (lx along, ly across) round (cx, cy) by angle a. */
const rot = (cx: number, cy: number, lx: number, ly: number, a: number): Pt =>
  pt(cx + Math.cos(a) * lx - Math.sin(a) * ly, cy + Math.sin(a) * lx + Math.cos(a) * ly);

// ── Ground ───────────────────────────────────────────────────────────

/** Wet peat with moss patches, tufts of dead sedge and standing puddles that hold the sky. */
export function peatGround(g: G, r: Rect, rng: Rng): void {
  g.fillStyle(PEAT, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const n = Math.floor((r.w * r.h) / 2600);
  for (let i = 0; i < n; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    const k = rng();
    if (k < 0.3) { g.fillStyle(MOSS_DARK, 0.5); g.fillEllipse(x, y, 30 + rng() * 60, 12 + rng() * 20); }
    else if (k < 0.45) { g.fillStyle(MOSS, 0.4); g.fillEllipse(x, y, 16 + rng() * 26, 6 + rng() * 10); }
    else if (k < 0.55) { g.fillStyle(PEAT_DARK, 0.6); g.fillEllipse(x, y, 20 + rng() * 40, 8 + rng() * 12); }
    else if (k < 0.62) {
      // A standing puddle, the bruise sky in it.
      const w = 18 + rng() * 34;
      g.fillStyle(MIRE, 0.9); g.fillEllipse(x, y, w, w * 0.36);
      g.fillStyle(BRUISE, 0.35); g.fillEllipse(x - w * 0.1, y - 1, w * 0.6, w * 0.16);
    } else if (k < 0.85) sedgeTuft(g, x, y, 0.6 + rng() * 0.6, rng);
    else { g.fillStyle(PEAT_LIT, 0.45); g.fillRect(x, y, 2, 1.5); }
  }
}

/** A tuft of dead churchyard sedge. */
export function sedgeTuft(g: G, x: number, y: number, s: number, rng: Rng): void {
  g.fillStyle(MOSS_DARK, 0.6); g.fillEllipse(x, y, 14 * s, 4 * s);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 1.4;
    const l = (8 + rng() * 9) * s;
    g.lineStyle(1.2, i % 2 ? SEDGE : SEDGE_DARK, 0.9);
    g.lineBetween(x + (i - 3) * s, y, x + (i - 3) * s + Math.cos(a) * l, y + Math.sin(a) * l);
  }
}

/**
 * The Slab Walk: old grave-slabs laid flat as paving, the names still on them. Supports
 * horizontal and vertical runs. Moss fills the joints; some slabs have sunk and hold water.
 */
export function slabWalk(g: G, pts: Pt[], w: number, rng: Rng): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const horiz = Math.abs(b.y - a.y) < Math.abs(b.x - a.x);
    const len = horiz ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
    const dir = horiz ? Math.sign(b.x - a.x) : Math.sign(b.y - a.y);
    // Mud verge and the moss bed the slabs are set in.
    if (horiz) {
      const x0 = Math.min(a.x, b.x);
      g.fillStyle(PEAT_DARK, 0.8); g.fillRect(x0 - 6, a.y - w / 2 - 6, len + 12, w + 12);
      g.fillStyle(MOSS_DARK, 1); g.fillRect(x0 - 2, a.y - w / 2, len + 4, w);
    } else {
      const y0 = Math.min(a.y, b.y);
      g.fillStyle(PEAT_DARK, 0.8); g.fillRect(a.x - w / 2 - 6, y0 - 6, w + 12, len + 12);
      g.fillStyle(MOSS_DARK, 1); g.fillRect(a.x - w / 2, y0 - 2, w, len + 4);
    }
    // Slabs: long side across the walk, two or three abreast.
    const cols = w > 80 ? 3 : 2;
    const sw = (w - 6) / cols;
    for (let d = 0; d < len; d += 30) {
      for (let c = 0; c < cols; c++) {
        if (rng() < 0.05) continue; // a missing slab: just moss
        const off = (c % 2) * 12;
        const along = d + off;
        if (along > len - 4) continue;
        const sl = Math.min(28, len - along);
        const across = -w / 2 + 3 + c * sw;
        const x = horiz ? a.x + dir * along - (dir < 0 ? sl : 0) : a.x + across;
        const y = horiz ? a.y + across : a.y + dir * along - (dir < 0 ? sl : 0);
        const ww = horiz ? sl - 2 : sw - 2, hh = horiz ? sw - 2 : sl - 2;
        const shade = rng();
        const fill = shade < 0.2 ? SLAB_DARK : shade < 0.75 ? SLAB : mixC(SLAB, SLAB_LIT, 0.5);
        g.fillStyle(dim(fill, 0.35), 1); g.fillRect(x, y + 1, ww, hh);
        g.fillStyle(fill, 1); g.fillRect(x, y, ww, hh - 1);
        // The carving: a few name lines, and now and then a cross or a skull.
        g.fillStyle(SLAB_DARK, 0.55);
        const lines = 2 + Math.floor(rng() * 3);
        for (let k = 0; k < lines; k++) {
          const lw = (horiz ? ww : ww) * (0.35 + rng() * 0.4);
          if (horiz) g.fillRect(x + 3, y + 4 + k * ((hh - 8) / lines), Math.min(lw, ww - 6), 1.2);
          else g.fillRect(x + (ww - lw) / 2, y + 4 + k * 5, lw, 1.2);
        }
        const mark = rng();
        if (mark < 0.12) { g.fillRect(x + ww / 2 - 0.8, y + hh / 2 - 4, 1.6, 8); g.fillRect(x + ww / 2 - 3, y + hh / 2 - 2, 6, 1.6); }
        else if (mark < 0.17) { g.fillStyle(SLAB_DARK, 0.6); g.fillCircle(x + ww / 2, y + hh / 2, 3); g.fillStyle(fill, 1); g.fillCircle(x + ww / 2 - 1, y + hh / 2 - 0.5, 0.8); g.fillCircle(x + ww / 2 + 1, y + hh / 2 - 0.5, 0.8); }
        if (rng() < 0.18) { g.lineStyle(1, SLAB_DARK, 0.8); g.lineBetween(x + rng() * ww, y, x + rng() * ww, y + hh); }
        if (rng() < 0.08) { g.fillStyle(MIRE, 0.75); g.fillEllipse(x + ww / 2, y + hh / 2, ww * 0.6, hh * 0.4); g.fillStyle(BRUISE, 0.3); g.fillEllipse(x + ww / 2 - 2, y + hh / 2 - 1, ww * 0.3, hh * 0.15); }
        if (rng() < 0.3) { g.fillStyle(LICHEN, 0.35); g.fillCircle(x + rng() * ww, y + rng() * hh, 2 + rng() * 2); }
      }
    }
  }
}

/** A body of black mire water: a sheen, a fringe of sedge and duckweed, something sunk in it. */
export function mireWater(g: G, r: Rect, rng: Rng, drowned = 2): void {
  g.fillStyle(PEAT_DARK, 1); g.fillRoundedRect(r.x - 10, r.y - 8, r.w + 20, r.h + 18, 18);
  g.fillStyle(MIRE, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 14);
  g.fillStyle(MIRE_DEEP, 1); g.fillRoundedRect(r.x + r.w * 0.12, r.y + r.h * 0.18, r.w * 0.76, r.h * 0.64, 12);
  // The sky laid on the water in long bruise-violet streaks.
  for (let i = 0; i < Math.max(2, r.w / 80); i++) {
    const y = r.y + 10 + rng() * (r.h - 20), x = r.x + 10 + rng() * (r.w - 60);
    g.fillStyle(BRUISE, 0.22); g.fillRect(x, y, 30 + rng() * 50, 1.6);
  }
  g.lineStyle(1.5, MIRE_SHEEN, 0.5); g.strokeRoundedRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 12);
  // Duckweed rafts along the rim.
  for (let i = 0; i < r.w / 6; i++) {
    const side = rng() < 0.5;
    const x = r.x + rng() * r.w, y = side ? r.y + 3 + rng() * 10 : r.y + r.h - 3 - rng() * 10;
    g.fillStyle(rng() < 0.5 ? MOSS : MOSS_LIT, 0.55); g.fillCircle(x, y, 1.4 + rng());
  }
  // Drowned headstones: only their shoulders above the water.
  for (let i = 0; i < drowned; i++) {
    const x = r.x + 30 + rng() * (r.w - 60), y = r.y + 20 + rng() * (r.h - 40);
    g.fillStyle(SLAB_DARK, 1); g.fillRect(x - 7, y - 6, 14, 6);
    g.fillStyle(SLAB, 1); g.fillEllipse(x, y - 6, 14, 8);
    g.fillStyle(MIRE_SHEEN, 0.6); g.fillEllipse(x, y + 1, 22, 4);
  }
  // Sedge round the rim.
  for (let x = r.x; x < r.x + r.w; x += 22 + rng() * 20) { sedgeTuft(g, x, r.y - 4, 0.8, rng); sedgeTuft(g, x + 9, r.y + r.h + 6, 0.8, rng); }
}

/** A grave mound: a heaped oblong of peat, a few wilted lilies, a little grey with old frost. */
export function graveMound(g: G, x: number, y: number, w: number, rng: Rng, fresh = false): void {
  const h = w * 0.42;
  g.fillStyle(PEAT_DARK, 0.9); g.fillEllipse(x, y + 2, w + 6, h + 6);
  g.fillStyle(fresh ? DIRT : mixC(PEAT_LIT, MOSS_DARK, 0.4), 1); g.fillEllipse(x, y, w, h);
  g.fillStyle(fresh ? DIRT_LIT : MOSS, 0.6); g.fillEllipse(x - w * 0.08, y - h * 0.18, w * 0.7, h * 0.45);
  if (fresh) for (let i = 0; i < 8; i++) { g.fillStyle(DIRT_DARK, 0.8); g.fillCircle(x + (rng() - 0.5) * w * 0.8, y + (rng() - 0.5) * h * 0.6, 1.5 + rng() * 1.5); }
  // Wilted lilies on it.
  for (let i = 0; i < 2; i++) {
    const lx = x + (rng() - 0.5) * w * 0.5, ly = y + (rng() - 0.5) * h * 0.3;
    g.lineStyle(1, MOSS_DARK, 1); g.lineBetween(lx, ly, lx + 6, ly + 2);
    g.fillStyle(dim(LILY, 0.25), 0.9); g.fillEllipse(lx - 1, ly - 1, 5, 3);
  }
}

// ── Small things ─────────────────────────────────────────────────────

/** A bronze bell: a flared skirt, a crown loop, a clapper showing under the lip. */
export function bell(g: G, x: number, y: number, r: number, swing = 0, color = BRONZE): void {
  const a = swing;
  const lip = rot(x, y, r * 1.55, 0, a + Math.PI / 2);
  // Skirt as a polygon: crown narrow, lip wide.
  const pts = [
    rot(x, y, -r * 0.55, 0, a), rot(x, y, -r * 0.62, r * 0.5, a), rot(x, y, -r * 0.8, r * 1.1, a),
    rot(x, y, -r * 1.05, r * 1.45, a), rot(x, y, r * 1.05, r * 1.45, a), rot(x, y, r * 0.8, r * 1.1, a),
    rot(x, y, r * 0.62, r * 0.5, a), rot(x, y, r * 0.55, 0, a),
  ];
  g.fillStyle(dim(color, 0.4), 1); g.fillPoints(pts.map((p) => pt(p.x + 1, p.y + 1)), true);
  g.fillStyle(color, 1); g.fillPoints(pts, true);
  // Light down one flank, verdigris at the lip.
  const fl = [rot(x, y, -r * 0.4, r * 0.1, a), rot(x, y, -r * 0.2, r * 0.1, a), rot(x, y, -r * 0.5, r * 1.3, a), rot(x, y, -r * 0.8, r * 1.3, a)];
  g.fillStyle(lit(color, 0.35), 0.8); g.fillPoints(fl, true);
  const l0 = rot(x, y, -r * 1.05, r * 1.45, a), l1 = rot(x, y, r * 1.05, r * 1.45, a);
  g.lineStyle(Math.max(1.5, r * 0.18), BELL_VERDIGRIS, 0.9); g.lineBetween(l0.x, l0.y, l1.x, l1.y);
  // Crown loop.
  const c = rot(x, y, 0, -r * 0.18, a);
  g.lineStyle(Math.max(1, r * 0.16), dim(color, 0.3), 1); g.strokeCircle(c.x, c.y, r * 0.28);
  // Clapper.
  g.fillStyle(dim(color, 0.55), 1); g.fillCircle(lip.x - Math.sin(a) * r * 0.2, lip.y, r * 0.24);
}

/** A spade stuck in something: ash haft, a worn T-grip, an iron blade with mud on it. */
export function spade(g: G, x: number, y: number, ang: number, len: number): void {
  const tip = pt(x, y);
  const top = pt(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  g.lineStyle(3.2, TIMBER_DARK, 1); g.lineBetween(tip.x, tip.y, top.x, top.y);
  g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(tip.x, tip.y, top.x, top.y);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  g.lineStyle(2.5, TIMBER_DARK, 1); g.lineBetween(top.x - nx * 6, top.y - ny * 6, top.x + nx * 6, top.y + ny * 6);
  const b = [
    pt(tip.x - nx * 6, tip.y - ny * 6), pt(tip.x + nx * 6, tip.y + ny * 6),
    pt(tip.x + nx * 5 - Math.cos(ang) * 12, tip.y + ny * 5 - Math.sin(ang) * 12),
    pt(tip.x - Math.cos(ang) * 15, tip.y - Math.sin(ang) * 15),
    pt(tip.x - nx * 5 - Math.cos(ang) * 12, tip.y - ny * 5 - Math.sin(ang) * 12),
  ];
  g.fillStyle(IRON_LIT, 1); g.fillPoints(b, true);
  g.fillStyle(DIRT, 0.8); g.fillCircle(tip.x - Math.cos(ang) * 10, tip.y - Math.sin(ang) * 10, 3);
}

/** A funeral lily: a white trumpet on a green stem. */
export function lily(g: G, x: number, y: number, s: number, a = 1): void {
  g.lineStyle(1.2 * s, MOSS_LIT, a); g.lineBetween(x, y, x, y - 8 * s);
  for (const k of [-1, 0, 1]) {
    g.fillStyle(k ? dim(LILY, 0.12) : LILY, a);
    g.fillTriangle(x, y - 8 * s, x + k * 4 * s - 2.5 * s, y - 15 * s, x + k * 4 * s + 2.5 * s, y - 15 * s);
  }
  g.fillStyle(LAMP, a); g.fillCircle(x, y - 11 * s, 0.9 * s);
}

/**
 * A coffin, any angle: the six-sided shape wide at the shoulders, polished lid, brass handles,
 * a lily on top. `open` 0..1 slides the lid aside to show the grey satin and the dark inside.
 */
export function coffin(g: G, cx: number, cy: number, len: number, wid: number, ang: number, open = 0, flowers = true): void {
  const L = len / 2, Wd = wid / 2;
  const shape = (s: number, ox = 0, oy = 0) => [
    rot(cx + ox, cy + oy, -L * s, 0, ang), rot(cx + ox, cy + oy, -L * 0.55 * s, -Wd * s, ang),
    rot(cx + ox, cy + oy, L * s, -Wd * 0.62 * s, ang), rot(cx + ox, cy + oy, L * s, Wd * 0.62 * s, ang),
    rot(cx + ox, cy + oy, -L * 0.55 * s, Wd * s, ang),
  ];
  g.fillStyle(0x000000, 0.3); g.fillPoints(shape(1.04, 2, 4), true);
  g.fillStyle(dim(COFFIN, 0.35), 1); g.fillPoints(shape(1, 0, 2), true);
  if (open > 0) {
    g.fillStyle(GREY_DARK, 1); g.fillPoints(shape(0.86), true);
    g.fillStyle(CRAPE, 1); g.fillPoints(shape(0.72), true);
  }
  // The lid, slid aside by `open`.
  const lx = Math.cos(ang + Math.PI / 2) * wid * 0.9 * open, ly = Math.sin(ang + Math.PI / 2) * wid * 0.9 * open;
  g.fillStyle(COFFIN, 1); g.fillPoints(shape(0.96, lx, ly - 1), true);
  g.fillStyle(COFFIN_LIT, 0.55); g.fillPoints(shape(0.62, lx, ly - 2), true);
  // Brass handles down the sides.
  for (const k of [-0.3, 0.25]) for (const sd of [-1, 1]) {
    const h = rot(cx + lx, cy + ly, L * k, sd * Wd * 0.98, ang);
    g.fillStyle(BRONZE_LIT, 1); g.fillRect(h.x - 1.5, h.y - 1, 3, 2);
  }
  // A crape bow and a lily on the lid.
  if (flowers) {
    const f = rot(cx + lx, cy + ly - 2, -L * 0.2, 0, ang);
    g.fillStyle(CRAPE, 1); g.fillTriangle(f.x, f.y, f.x - 4, f.y - 3, f.x - 4, f.y + 3); g.fillTriangle(f.x, f.y, f.x + 4, f.y - 3, f.x + 4, f.y + 3);
    lily(g, f.x + 6, f.y + 6, 0.55);
  }
}

/** A mourner in black crape and a veil, carrying (arms up) or walking; bobs with `t` (ms). */
export function mourner(g: G, x: number, y: number, s: number, t: number, seed: number, carrying = false): void {
  const bob = Math.sin(t / 180 + seed) * 1.4 * s;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, 18 * s, 6 * s);
  // Skirts and cloak.
  g.fillStyle(CRAPE, 1);
  g.fillTriangle(x - 9 * s, y, x + 9 * s, y, x, y - 24 * s + bob);
  g.fillStyle(CRAPE_LIT, 0.8); g.fillTriangle(x - 3 * s, y, x + 2 * s, y, x - 1 * s, y - 20 * s + bob);
  // Head under a veil.
  g.fillStyle(GREY, 1); g.fillCircle(x, y - 27 * s + bob, 5 * s);
  g.fillStyle(CRAPE, 0.85); g.fillEllipse(x, y - 25 * s + bob, 13 * s, 14 * s);
  g.fillStyle(CRAPE, 1); g.fillEllipse(x, y - 31 * s + bob, 10 * s, 6 * s);
  // Arms: raised to a shoulder pole, or folded round a lily.
  if (carrying) { g.lineStyle(2.4 * s, CRAPE, 1); g.lineBetween(x - 5 * s, y - 20 * s + bob, x - 3 * s, y - 32 * s); g.lineBetween(x + 5 * s, y - 20 * s + bob, x + 3 * s, y - 32 * s); }
  else { g.fillStyle(GREY_LIT, 1); g.fillCircle(x, y - 16 * s + bob, 1.8 * s); lily(g, x + 1 * s, y - 14 * s + bob, 0.5 * s); }
}

/**
 * One of the greyed, risen: a winding-sheet with a grey face hollow in its hood, two grey hands
 * held out in front, the hem trailing off into wisps. `a` is opacity, `t` in ms.
 */
export function greyedGhost(g: G, x: number, y: number, s: number, a: number, t: number, seed = 0, reach = 0.5): void {
  const sway = Math.sin(t / 340 + seed) * 3 * s;
  // Ground glow under it.
  g.fillStyle(WISP, 0.08 * a); g.fillEllipse(x, y + 6 * s, 34 * s, 10 * s);
  // The trailing hem.
  for (let i = 0; i < 4; i++) {
    const ph = ((t / 600 + i / 4 + seed) % 1);
    g.fillStyle(SHROUD, 0.25 * a * (1 - ph));
    g.fillEllipse(x - sway * 0.5 + (i - 1.5) * 5 * s, y + ph * 8 * s, 7 * s, 10 * s);
  }
  // The sheet.
  const top = y - 30 * s;
  const body = [
    pt(x - 12 * s + sway, y), pt(x - 14 * s + sway * 0.8, y - 14 * s), pt(x - 9 * s + sway * 0.3, top + 2 * s),
    pt(x, top - 4 * s), pt(x + 9 * s + sway * 0.3, top + 2 * s), pt(x + 14 * s + sway * 0.8, y - 14 * s), pt(x + 12 * s + sway, y),
  ];
  g.fillStyle(GREY_DARK, 0.5 * a); g.fillPoints(body.map((p) => pt(p.x + 1.5, p.y + 1)), true);
  g.fillStyle(SHROUD, 0.78 * a); g.fillPoints(body, true);
  g.fillStyle(GREY, 0.35 * a); g.fillTriangle(x + 3 * s, top + 6 * s, x + 12 * s + sway, y, x + 4 * s, y);
  // Hood hollow and face.
  g.fillStyle(CRAPE, 0.85 * a); g.fillEllipse(x + sway * 0.2, top + 8 * s, 11 * s, 12 * s);
  g.fillStyle(GREY, 0.9 * a); g.fillEllipse(x + sway * 0.2, top + 9 * s, 7 * s, 8 * s);
  g.fillStyle(CRAPE, a); g.fillCircle(x - 2 * s + sway * 0.2, top + 8 * s, 1.2 * s); g.fillCircle(x + 2 * s + sway * 0.2, top + 8 * s, 1.2 * s);
  g.fillRect(x - 1.5 * s + sway * 0.2, top + 12 * s, 3 * s, 1 * s);
  // Hands held out, grey to the wrist.
  for (const k of [-1, 1]) {
    const hx = x + k * (8 + reach * 8) * s + sway, hy = y - 16 * s - reach * 4 * s;
    g.lineStyle(3 * s, SHROUD, 0.7 * a); g.lineBetween(x + k * 8 * s, y - 18 * s, hx, hy);
    g.fillStyle(GREY_LIT, 0.95 * a); g.fillCircle(hx, hy, 2.6 * s);
    g.lineStyle(1, GREY_DARK, 0.8 * a); g.lineBetween(hx, hy, hx + k * 3 * s, hy - 2 * s);
  }
  // The Mark on one wrist: two small scars, still green.
  g.fillStyle(VENOM, 0.8 * a); g.fillCircle(x + 9 * s + sway, y - 17 * s, 0.9 * s); g.fillCircle(x + 11 * s + sway, y - 17.5 * s, 0.9 * s);
}

/** A marsh-light: halo, core and a short fading tail. `t` in seconds. */
export function wisp(g: G, x: number, y: number, t: number, seed: number, s = 1): void {
  const bx = x + Math.sin(t * 0.9 + seed) * 10 * s, by = y + Math.sin(t * 1.7 + seed * 2) * 6 * s;
  const fl = 0.6 + Math.sin(t * 5 + seed * 3) * 0.25;
  g.fillStyle(WISP_DIM, 0.12 * fl); g.fillCircle(bx, by, 12 * s);
  g.fillStyle(WISP, 0.25 * fl); g.fillCircle(bx, by, 5 * s);
  g.fillStyle(0xffffff, 0.8 * fl); g.fillCircle(bx, by, 1.6 * s);
  for (let i = 1; i < 4; i++) { g.fillStyle(WISP, 0.15 * fl * (1 - i / 4)); g.fillCircle(bx - Math.cos(t * 0.9 + seed) * 4 * i * s, by + i * 2 * s, (3 - i * 0.5) * s); }
}

// ── Headstones ───────────────────────────────────────────────────────

export type StoneKind = 'round' | 'cross' | 'angel' | 'slab' | 'obelisk' | 'coiled';

/**
 * A headstone, leaning `tilt` radians and sunk `sink` (0..1) into the peat — the lower part
 * swallowed by a lip of mud. Lichen, a carved name, and on Fangmire nearly always a little
 * serpent somewhere in the carving.
 */
export function headstone(g: G, x: number, y: number, kind: StoneKind, s: number, tilt: number, sink: number, rng: Rng, color = SLAB): void {
  const h = (kind === 'obelisk' ? 52 : kind === 'cross' ? 40 : kind === 'angel' ? 46 : 32) * s;
  const w = (kind === 'obelisk' ? 14 : kind === 'cross' ? 26 : 22) * s;
  const off = h * sink;
  shadow(g, x + 6 * s, y + 1, w * 1.6, 7 * s, 0.35);
  // Local frame: lx across (−w/2..w/2), ly up from the (sunk) foot (0..h), leaning by `tilt`.
  const Q = (lx: number, ly: number): Pt => rot(x, y + off, -ly, lx, tilt + Math.PI / 2);
  const body = (pts: [number, number][], c: number) => { g.fillStyle(c, 1); g.fillPoints(pts.map(([a, b]) => Q(a, b)), true); };
  const dark = dim(color, 0.35), light = lit(color, 0.18);
  switch (kind) {
    case 'round': {
      const arc: [number, number][] = [[-w / 2, 0]];
      for (let i = 0; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI; arc.push([Math.cos(a) * w / 2, h - w / 2 + Math.sin(a) * w / 2]); }
      arc.push([w / 2, 0]);
      body(arc.map(([a, b]) => [a + 2 * s, b - 1] as [number, number]), dark);
      body(arc, color);
      body([[-w / 2, 0], [-w / 2 + 3 * s, 0], [-w / 2 + 3 * s, h - w / 2], [-w / 2, h - w / 2]], light);
      break;
    }
    case 'slab': {
      body([[-w / 2 + 2 * s, -1], [w / 2 + 2 * s, -1], [w / 2 + 2 * s, h - 1], [-w / 2 + 2 * s, h - 1]], dark);
      body([[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]], color);
      body([[-w / 2, h], [w / 2, h], [w / 2 - 3 * s, h + 4 * s], [-w / 2 + 3 * s, h + 4 * s]], light);
      break;
    }
    case 'cross': {
      const a = 4 * s;
      const cr: [number, number][] = [[-a, 0], [a, 0], [a, h * 0.62], [w / 2, h * 0.62], [w / 2, h * 0.8], [a, h * 0.8], [a, h], [-a, h], [-a, h * 0.8], [-w / 2, h * 0.8], [-w / 2, h * 0.62], [-a, h * 0.62]];
      body(cr.map(([p, q]) => [p + 2 * s, q - 1] as [number, number]), dark);
      body(cr, color);
      body([[-a, 0], [-a + 2 * s, 0], [-a + 2 * s, h], [-a, h]], light);
      // A ring of iron round the crossing, as on the old fen crosses.
      const c = Q(0, h * 0.71);
      g.lineStyle(1.5 * s, IRON, 0.8); g.strokeCircle(c.x, c.y, w * 0.32);
      break;
    }
    case 'obelisk': {
      body([[-w / 2 - 3 * s, 0], [w / 2 + 3 * s, 0], [w / 2 + 3 * s, 6 * s], [-w / 2 - 3 * s, 6 * s]], dark);
      body([[-w / 2, 6 * s], [w / 2, 6 * s], [w * 0.32, h - 8 * s], [0, h], [-w * 0.32, h - 8 * s]], color);
      body([[-w / 2, 6 * s], [-w / 2 + 3 * s, 6 * s], [-1, h - 2 * s], [-w * 0.32, h - 8 * s]], light);
      break;
    }
    case 'angel': {
      body([[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.45], [-w / 2, h * 0.45]], dark);
      body([[-w / 2 + 1, 1], [w / 2 - 1, 1], [w / 2 - 1, h * 0.43], [-w / 2 + 1, h * 0.43]], color);
      // Bowed angel on top: wings folded down, head bent.
      body([[-w * 0.15, h * 0.45], [w * 0.15, h * 0.45], [w * 0.1, h * 0.85], [-w * 0.1, h * 0.85]], light);
      body([[-w * 0.12, h * 0.8], [-w * 0.55, h * 0.95], [-w * 0.45, h * 0.5]], color);
      body([[w * 0.12, h * 0.8], [w * 0.55, h * 0.95], [w * 0.45, h * 0.5]], dark);
      const hd = Q(w * 0.05, h * 0.9);
      g.fillStyle(light, 1); g.fillCircle(hd.x, hd.y, 3.4 * s);
      break;
    }
    case 'coiled': {
      // A stone carved as a coiled serpent, its head bowed over the name — the Matriarch's sort.
      body([[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.6], [-w / 2, h * 0.6]], dark);
      for (let i = 0; i < 3; i++) {
        const c = Q(0, h * (0.66 + i * 0.12));
        g.fillStyle(i % 2 ? color : light, 1); g.fillEllipse(c.x, c.y, (w - i * 5 * s), 8 * s);
      }
      const hd = Q(w * 0.25, h * 1.02);
      g.fillStyle(color, 1); g.fillEllipse(hd.x, hd.y, 9 * s, 6 * s);
      g.fillStyle(VENOM, 0.7); g.fillCircle(hd.x + 2 * s, hd.y - 1, 0.9 * s);
      break;
    }
  }
  // Carved name lines.
  if (kind !== 'obelisk') {
    for (let k = 0; k < 3; k++) {
      const a = Q(-w * 0.28, h * (kind === 'angel' ? 0.3 : 0.55) - k * 4.5 * s), b = Q(w * (0.1 + rng() * 0.18), h * (kind === 'angel' ? 0.3 : 0.55) - k * 4.5 * s);
      g.lineStyle(1, dark, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
  // Lichen.
  for (let i = 0; i < 3; i++) {
    const p = Q((rng() - 0.5) * w * 0.8, rng() * h * 0.7);
    g.fillStyle(LICHEN, 0.45); g.fillCircle(p.x, p.y, (1.5 + rng() * 2) * s);
  }
  // Swallowed by the peat: a lip of mud over the base, wet at the edge.
  if (sink > 0) {
    g.fillStyle(PEAT_DARK, 1); g.fillEllipse(x, y + off / 2 + 1, w * 1.8, off + 12 * s);
    g.fillStyle(PEAT, 1); g.fillEllipse(x, y + off / 2 - 1, w * 1.6, off + 8 * s);
    g.fillStyle(MIRE_SHEEN, 0.35); g.fillEllipse(x - w * 0.2, y + 1, w * 0.7, 2 * s);
  }
}

/** A row of the sinking dead: each stone a little lower, a little more askew, than the one before. */
export function stoneRow(g: G, x0: number, y: number, n: number, gap: number, sinkFrom: number, sinkTo: number, rng: Rng): void {
  const kinds: StoneKind[] = ['round', 'cross', 'slab', 'round', 'angel', 'coiled', 'obelisk', 'cross'];
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 0;
    const sink = sinkFrom + (sinkTo - sinkFrom) * k;
    const kind = kinds[Math.floor(rng() * kinds.length)];
    graveMound(g, x0 + i * gap, y + 16, 34, rng);
    headstone(g, x0 + i * gap, y, kind, 0.9 + rng() * 0.2, (rng() - 0.5) * 0.25 * (0.4 + sink), sink, rng);
  }
}

// ── Bells and posts ──────────────────────────────────────────────────

/**
 * A safety-bell post over a grave: a bowed timber gibbet with a small bronze bell under its arm
 * and a cord running down into the peat — to the coffin's lid, and the hand inside.
 */
export function bellPost(g: G, x: number, y: number, swing: number, rng: Rng, s = 1): void {
  shadow(g, x + 8, y + 2, 30 * s, 8 * s);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3 * s, y - 52 * s, 6 * s, 52 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 2 * s, y - 52 * s, 3 * s, 52 * s);
  g.lineStyle(4 * s, TIMBER_DARK, 1); g.lineBetween(x - 2 * s, y - 50 * s, x + 20 * s, y - 52 * s);
  g.lineStyle(2 * s, TIMBER_LIT, 1); g.lineBetween(x - 2 * s, y - 51 * s, x + 20 * s, y - 53 * s);
  g.lineStyle(2 * s, TIMBER, 1); g.lineBetween(x, y - 38 * s, x + 12 * s, y - 50 * s);
  // Iron spike cap, a nail of lichen.
  g.fillStyle(IRON, 1); g.fillTriangle(x - 3 * s, y - 52 * s, x + 3 * s, y - 52 * s, x, y - 59 * s);
  g.fillStyle(LICHEN, 0.4); g.fillCircle(x - 1, y - 24 * s, 2 * s);
  // The bell and its cord.
  bell(g, x + 18 * s, y - 49 * s, 5 * s, swing);
  const cl = pt(x + 18 * s + Math.sin(swing) * 8 * s, y - 40 * s);
  g.lineStyle(1, BONE_DARK, 0.9); g.lineBetween(cl.x, cl.y, x + 16 * s, y - 3 * s);
  g.fillStyle(PEAT_DARK, 1); g.fillCircle(x + 16 * s, y - 2 * s, 2.2 * s);
  void rng;
}

/** A churchyard lamp on a crooked iron post, with a cage of glass. Light is drawn in `animate`. */
export function graveLamp(g: G, x: number, y: number): void {
  shadow(g, x + 4, y + 1, 16, 5);
  g.lineStyle(3, IRON, 1); g.lineBetween(x, y, x + 2, y - 44);
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 2, y - 44, x + 10, y - 50);
  g.fillStyle(IRON, 1); g.fillRect(x + 5, y - 52, 10, 3);
  g.fillStyle(LAMP, 0.95); g.fillRect(x + 6, y - 49, 8, 10);
  g.fillStyle(LAMP_HOT, 1); g.fillRect(x + 9, y - 46, 2, 4);
  g.lineStyle(1, IRON, 1); g.strokeRect(x + 6, y - 49, 8, 10); g.lineBetween(x + 10, y - 49, x + 10, y - 39);
  g.fillStyle(IRON, 1); g.fillTriangle(x + 5, y - 49, x + 15, y - 49, x + 10, y - 55);
}

/** A mangrove on stilt-roots, bearded with grey moss. */
export function mangrove(g: G, x: number, y: number, s: number, rng: Rng): void {
  shadow(g, x, y + 2, 90 * s, 18 * s, 0.3);
  // Stilt roots arching down into the peat.
  for (let i = 0; i < 7; i++) {
    const fx = x + (i - 3) * 11 * s + (rng() - 0.5) * 6;
    const kx = x + (i - 3) * 4 * s;
    g.lineStyle(3.5 * s, TIMBER_DARK, 1);
    g.beginPath(); g.moveTo(fx, y); g.lineTo((fx + kx) / 2 + (i - 3) * 3 * s, y - 16 * s); g.lineTo(kx, y - 28 * s); g.strokePath();
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 5 * s, y - 70 * s, 10 * s, 44 * s);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 4 * s, y - 70 * s, 4 * s, 44 * s);
  // Canopy: dark masses with a lit edge.
  for (let i = 0; i < 7; i++) {
    const cx = x + (rng() - 0.5) * 70 * s, cy = y - 80 * s - rng() * 26 * s, r = (16 + rng() * 12) * s;
    g.fillStyle(MOSS_DARK, 1); g.fillCircle(cx, cy, r);
    g.fillStyle(MOSS, 0.7); g.fillCircle(cx - r * 0.3, cy - r * 0.35, r * 0.5);
  }
  // Grey beard-moss hanging.
  for (let i = 0; i < 9; i++) {
    const hx = x + (rng() - 0.5) * 80 * s, hy = y - 70 * s - rng() * 14 * s;
    const l = (14 + rng() * 22) * s;
    g.lineStyle(2, GREY, 0.55); g.lineBetween(hx, hy, hx + (rng() - 0.5) * 4, hy + l);
    g.lineStyle(1, GREY_LIT, 0.35); g.lineBetween(hx + 1, hy, hx + 2, hy + l * 0.7);
  }
}

// ── Buildings ────────────────────────────────────────────────────────

/**
 * A mausoleum on stilts: a little stone temple stood up on timber legs over its own black pool,
 * so the peat cannot take it. Pediment with a coiled serpent, iron grille door, green streaks
 * down from the cornice, a ladder to the threshold and a lamp at the door.
 */
export function mausoleum(g: G, x: number, y: number, w: number, rng: Rng): void {
  const h = w * 0.62;
  const legH = 34;
  const base = y - legH;
  shadow(g, x, y + 4, w * 1.2, 22, 0.4);
  // Stilts, bowed and strapped with iron.
  for (let i = 0; i < 5; i++) {
    const lx = x - w / 2 + 8 + (i * (w - 16)) / 4;
    g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(lx, y, lx + (i - 2) * 1.5, base);
    g.lineStyle(2, TIMBER, 1); g.lineBetween(lx - 1, y, lx - 1 + (i - 2) * 1.5, base);
    g.fillStyle(IRON, 1); g.fillRect(lx - 3, y - 14, 6, 2);
    g.fillStyle(MIRE_SHEEN, 0.5); g.fillEllipse(lx, y, 10, 3);
  }
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x - w / 2 + 8, y - 8, x + w / 2 - 8, base + 4);
  // Platform.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 6, base - 6, w + 12, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w / 2 - 6, base - 7, w + 12, 2);
  // The stone cell.
  const top = base - 6 - h;
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x - w / 2, top, w, h);
  g.fillStyle(SLAB, 1); g.fillRect(x - w / 2 + 2, top, w - 4, h - 2);
  for (let k = 1; k < 5; k++) { g.lineStyle(1, SLAB_DARK, 0.5); g.lineBetween(x - w / 2 + 2, top + (h * k) / 5, x + w / 2 - 2, top + (h * k) / 5); }
  // Pilasters.
  for (const k of [-1, 1]) {
    g.fillStyle(SLAB_LIT, 1); g.fillRect(x + k * (w / 2 - 8) - 4, top, 8, h - 2);
    g.fillStyle(SLAB_DARK, 0.5); g.fillRect(x + k * (w / 2 - 8) + 2, top, 2, h - 2);
  }
  // Iron grille door with darkness behind.
  const dw = w * 0.34, dh = h * 0.7;
  g.fillStyle(MIRE_DEEP, 1); g.fillRect(x - dw / 2, base - 6 - dh, dw, dh);
  g.fillStyle(BRUISE_DARK, 0.5); g.fillRect(x - dw / 2, base - 6 - dh, dw, dh * 0.3);
  g.lineStyle(1.5, IRON_LIT, 1);
  for (let k = 1; k < 5; k++) g.lineBetween(x - dw / 2 + (dw * k) / 5, base - 6 - dh, x - dw / 2 + (dw * k) / 5, base - 6);
  g.lineBetween(x - dw / 2, base - 6 - dh * 0.5, x + dw / 2, base - 6 - dh * 0.5);
  g.lineStyle(2, IRON, 1); g.strokeRect(x - dw / 2, base - 6 - dh, dw, dh);
  // Pediment and cornice.
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x - w / 2 - 6, top - 6, w + 12, 8);
  g.fillStyle(SLAB, 1); g.fillTriangle(x - w / 2 - 4, top - 6, x + w / 2 + 4, top - 6, x, top - 6 - w * 0.28);
  g.fillStyle(SLAB_LIT, 1); g.fillTriangle(x - w / 2 - 4, top - 6, x - 6, top - 6, x, top - 6 - w * 0.28);
  // A serpent coiled in the tympanum.
  g.lineStyle(2, SLAB_DARK, 1);
  g.beginPath(); g.arc(x, top - 12, 6, 0, Math.PI * 1.7, false); g.strokePath();
  g.beginPath(); g.arc(x, top - 12, 3, Math.PI, Math.PI * 2.6, false); g.strokePath();
  g.fillStyle(SLAB_DARK, 1); g.fillCircle(x + 6, top - 16, 2);
  // Green streaks down the stone from the cornice, and moss on the roof.
  for (let i = 0; i < 7; i++) { const sx = x - w / 2 + 4 + rng() * (w - 8); g.fillStyle(MOSS, 0.4); g.fillRect(sx, top, 2, 10 + rng() * h * 0.5); }
  for (let i = 0; i < 5; i++) { g.fillStyle(MOSS_LIT, 0.6); g.fillCircle(x - w / 2 + rng() * w, top - 6, 3 + rng() * 3); }
  // Ladder down the front, and a lamp by the door.
  const lx = x + dw / 2 + 8;
  g.lineStyle(2, TIMBER, 1); g.lineBetween(lx, base, lx + 6, y); g.lineBetween(lx + 10, base, lx + 16, y);
  for (let k = 1; k < 5; k++) { const ky = base + (k * legH) / 5; g.lineBetween(lx + (k * 6) / 5, ky, lx + 10 + (k * 6) / 5, ky); }
  g.fillStyle(IRON, 1); g.fillRect(x - dw / 2 - 12, base - 6 - dh * 0.8, 7, 9);
  g.fillStyle(LAMP, 0.9); g.fillRect(x - dw / 2 - 11, base - 6 - dh * 0.8 + 1, 5, 7);
  // A wreath of dead lilies on the grille.
  g.lineStyle(2, MOSS_DARK, 1); g.strokeCircle(x, base - 6 - dh * 0.55, 7);
  lily(g, x - 4, base - 6 - dh * 0.5, 0.45, 0.8); lily(g, x + 4, base - 6 - dh * 0.5, 0.45, 0.8);
}

/**
 * The lych-gate: a roofed gate where the coffin rests on its way in, a bier-bench under the roof,
 * carved bargeboards, a hanging lantern and a small bell on the ridge to toll each one through.
 */
export function lychGate(g: G, x: number, y: number, w: number): void {
  const h = 70;
  shadow(g, x, y + 6, w * 1.15, 22);
  // Posts on stone footings.
  for (const k of [-1, 1]) {
    const px = x + k * w / 2;
    g.fillStyle(SLAB_DARK, 1); g.fillRect(px - 9, y - 8, 18, 10);
    g.fillStyle(SLAB, 1); g.fillRect(px - 8, y - 10, 16, 6);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 6, y - h - 10, 12, h);
    g.fillStyle(TIMBER, 1); g.fillRect(px - 5, y - h - 10, 4, h);
    // Braces.
    g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(px, y - h + 10, px - k * 20, y - h - 8);
  }
  // Tie beam with carved serpents running along it.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 - 14, y - h - 16, w + 28, 9);
  g.lineStyle(1.2, TIMBER_LIT, 0.8);
  for (let k = -w / 2; k < w / 2; k += 12) { g.beginPath(); g.arc(x + k + 6, y - h - 11, 4, Math.PI, 0, k % 24 === 0); g.strokePath(); }
  // The roof: steep, sagging slate, a ridge with a little bell in a cote.
  const rl = x - w / 2 - 32, rr = x + w / 2 + 32, re = y - h - 14, rt = y - h - 64;
  g.fillStyle(dim(SLATE, 0.3), 1); g.fillTriangle(rl, re, rr, re, x, rt);
  g.fillStyle(SLATE, 1); g.fillTriangle(rl + 4, re - 2, rr - 4, re - 2, x, rt + 3);
  for (let k = 1; k < 5; k++) {
    const yy = re - ((re - rt) * k) / 5;
    const half = ((rr - rl) / 2) * (1 - k / 5);
    g.lineStyle(1, SLATE_LIT, 0.5); g.lineBetween(x - half + 4, yy, x + half - 4, yy + 2);
  }
  g.fillStyle(MOSS, 0.5); g.fillEllipse(x - w * 0.25, re - 6, 30, 7); g.fillEllipse(x + w * 0.3, re - 12, 22, 5);
  // Bargeboards: fretted, black.
  g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(rl, re, x, rt); g.lineBetween(rr, re, x, rt);
  for (let k = 1; k < 6; k++) {
    const a = pt(rl + ((x - rl) * k) / 6, re + ((rt - re) * k) / 6), b = pt(rr + ((x - rr) * k) / 6, re + ((rt - re) * k) / 6);
    g.fillStyle(TIMBER_DARK, 1); g.fillCircle(a.x, a.y + 4, 2.5); g.fillCircle(b.x, b.y + 4, 2.5);
  }
  // Bell-cote on the ridge.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 9, rt - 22, 3, 22); g.fillRect(x + 6, rt - 22, 3, 22);
  g.fillTriangle(x - 13, rt - 22, x + 13, rt - 22, x, rt - 34);
  bell(g, x, rt - 19, 5, 0);
  // Coffin bench under the roof, and a lantern on a chain.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - w / 2 + 10, y - 26, w - 20, 6);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - w / 2 + 10, y - 27, w - 20, 2);
  for (const k of [-1, 1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k * (w / 2 - 18) - 2, y - 22, 4, 20); }
  g.lineStyle(1, IRON, 1); g.lineBetween(x, y - h - 7, x, y - h + 12);
  g.fillStyle(IRON, 1); g.fillRect(x - 5, y - h + 12, 10, 3);
  g.fillStyle(LAMP, 0.95); g.fillRect(x - 4, y - h + 15, 8, 10);
  g.fillStyle(IRON, 1); g.fillTriangle(x - 5, y - h + 25, x + 5, y - h + 25, x, y - h + 29);
}

/**
 * The Lych House — Prince Mortis's hall, where the Register is kept and the greyed are entered.
 * A tall black-timbered mortuary hall on a stone undercroft, steep slate roof, lancet windows lit
 * a cold violet, a squat belfry with the great Requiem bell hung in the open, serpent finials on
 * every gable and the Matriarch's green eye painted over the door.
 */
export function lychHouse(g: G, x: number, y: number, w: number, h: number, rng: Rng): void {
  shadow(g, x, y + 10, w * 1.15, 40, 0.45);
  const x0 = x - w / 2;
  // Undercroft: rough stone, half sunk, a drain-mouth weeping black.
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x0 - 10, y - 40, w + 20, 40);
  for (let row = 0; row < 3; row++) for (let k = 0; k < w / 26 + 1; k++) {
    const bx = x0 - 10 + k * 26 + (row % 2) * 13, by = y - 40 + row * 13;
    if (bx > x0 + w + 4) continue;
    g.fillStyle(rng() < 0.5 ? SLAB : mixC(SLAB, SLAB_DARK, 0.4), 1); g.fillRect(bx + 1, by + 1, 24, 11);
  }
  g.fillStyle(PEAT_DARK, 1); g.fillRect(x0 - 12, y - 6, w + 24, 8);
  g.fillStyle(MIRE_SHEEN, 0.4); g.fillRect(x0 - 12, y - 6, w + 24, 2);
  // Timber hall: black frame, grey wattle panels.
  const hallTop = y - 40 - h;
  g.fillStyle(GREY_DARK, 1); g.fillRect(x0, hallTop, w, h);
  g.fillStyle(mixC(GREY_DARK, SLAB, 0.4), 1);
  for (let k = 0; k < w / 40; k++) g.fillRect(x0 + k * 40 + 4, hallTop + 4, 32, h - 8);
  g.fillStyle(TIMBER_DARK, 1);
  for (let k = 0; k <= w / 40; k++) g.fillRect(x0 + k * 40 - 3, hallTop, 6, h);
  g.fillRect(x0, hallTop, w, 6); g.fillRect(x0, hallTop + h * 0.5, w, 5); g.fillRect(x0, y - 46, w, 6);
  for (let k = 0; k < w / 40; k++) { g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x0 + k * 40, hallTop + h * 0.5, x0 + k * 40 + 40, hallTop + h); }
  // Lancet windows, lit a cold violet from the candles inside.
  for (let k = 0; k < w / 40; k++) {
    const wx = x0 + k * 40 + 20;
    if (Math.abs(wx - x) < 44) continue;
    g.fillStyle(BRUISE_DARK, 1); g.fillRect(wx - 6, hallTop + 12, 12, h * 0.36);
    g.fillTriangle(wx - 6, hallTop + 12, wx + 6, hallTop + 12, wx, hallTop + 2);
    g.fillStyle(BRUISE_LIT, 0.75); g.fillRect(wx - 4, hallTop + 14, 8, h * 0.33);
    g.fillTriangle(wx - 4, hallTop + 14, wx + 4, hallTop + 14, wx, hallTop + 6);
    g.lineStyle(1, TIMBER_DARK, 1); g.lineBetween(wx, hallTop + 6, wx, hallTop + 14 + h * 0.33);
  }
  // The roof: two steep pitches, slate, a crest of iron spikes.
  const ridge = hallTop - h * 0.9;
  g.fillStyle(dim(SLATE, 0.35), 1); g.fillTriangle(x0 - 26, hallTop + 4, x0 + w + 26, hallTop + 4, x, ridge);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 20, hallTop + 2, x0 + w + 20, hallTop + 2, x, ridge + 6);
  for (let k = 1; k < 8; k++) {
    const yy = hallTop + 2 - ((hallTop + 2 - ridge - 6) * k) / 8;
    const half = ((w + 40) / 2) * (1 - k / 8);
    g.lineStyle(1.2, SLATE_LIT, 0.45); g.lineBetween(x - half, yy, x + half, yy);
    for (let s = -half; s < half; s += 14) { g.lineStyle(1, dim(SLATE, 0.3), 0.5); g.lineBetween(x + s, yy, x + s + 2, yy + 8); }
  }
  for (let i = 0; i < 6; i++) { g.fillStyle(MOSS, 0.45); g.fillEllipse(x0 + rng() * w, hallTop - rng() * 30, 20 + rng() * 20, 5); }
  g.lineStyle(2, IRON, 1);
  for (let s = -w * 0.3; s <= w * 0.3; s += 12) {
    const yy = ridge + 6 + (Math.abs(s) / (w / 2 + 20)) * (hallTop - ridge);
    g.lineBetween(x + s, yy, x + s, yy - 8);
  }
  // Serpent finials at the eaves.
  for (const k of [-1, 1]) {
    const fx = x + k * (w / 2 + 22), fy = hallTop + 2;
    g.lineStyle(3, TIMBER_DARK, 1);
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + k * 6, fy - 12); g.lineTo(fx + k * 2, fy - 20); g.lineTo(fx + k * 10, fy - 26); g.strokePath();
    g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(fx + k * 12, fy - 27, 9, 5);
    g.fillStyle(VENOM, 0.9); g.fillCircle(fx + k * 13, fy - 28, 1.1);
  }
  // The belfry: a squat open tower over the door with the great bell hanging in it.
  const bw = 86, bt = ridge - 70;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - bw / 2, bt, 10, ridge - bt + 30); g.fillRect(x + bw / 2 - 10, bt, 10, ridge - bt + 30);
  g.fillRect(x - bw / 2, bt, bw, 8); g.fillRect(x - bw / 2, ridge + 4, bw, 8);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - bw / 2 + 10, bt + 8, x + bw / 2 - 10, ridge + 4); g.lineBetween(x + bw / 2 - 10, bt + 8, x - bw / 2 + 10, ridge + 4);
  g.fillStyle(BRUISE_DARK, 0.85); g.fillRect(x - bw / 2 + 10, bt + 8, bw - 20, ridge - bt - 4);
  bell(g, x, bt + 16, 16, 0);
  g.fillStyle(dim(SLATE, 0.2), 1); g.fillTriangle(x - bw / 2 - 12, bt + 2, x + bw / 2 + 12, bt + 2, x, bt - 46);
  g.fillStyle(SLATE_LIT, 0.5); g.fillTriangle(x - bw / 2 - 6, bt, x - 4, bt, x, bt - 42);
  g.lineStyle(2, IRON, 1); g.lineBetween(x, bt - 46, x, bt - 64);
  g.fillStyle(IRON, 1); g.fillCircle(x, bt - 66, 3);
  // The door: tall double door, iron-strapped, under a pointed arch, the green eye over it.
  const dw = 62, dh = h * 0.78;
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x - dw / 2 - 8, y - 40 - dh - 4, dw + 16, dh + 4);
  g.fillTriangle(x - dw / 2 - 8, y - 40 - dh - 4, x + dw / 2 + 8, y - 40 - dh - 4, x, y - 40 - dh - 34);
  g.fillStyle(COFFIN, 1); g.fillRect(x - dw / 2, y - 40 - dh, dw, dh);
  g.fillTriangle(x - dw / 2, y - 40 - dh, x + dw / 2, y - 40 - dh, x, y - 40 - dh - 26);
  g.lineStyle(1.5, COFFIN_LIT, 0.6); g.lineBetween(x, y - 40 - dh - 26, x, y - 40);
  g.fillStyle(IRON, 1);
  for (const yy of [0.25, 0.55, 0.85]) { g.fillRect(x - dw / 2 + 2, y - 40 - dh + dh * yy, dw / 2 - 5, 4); g.fillRect(x + 3, y - 40 - dh + dh * yy, dw / 2 - 5, 4); }
  g.fillStyle(BRONZE_LIT, 1); g.fillCircle(x - 6, y - 40 - dh * 0.45, 2.5); g.fillCircle(x + 6, y - 40 - dh * 0.45, 2.5);
  // The Matriarch's eye: a slit pupil in a green iris, painted on the arch stone.
  const ey = y - 40 - dh - 20;
  g.fillStyle(BONE, 1); g.fillEllipse(x, ey, 22, 10);
  g.fillStyle(VENOM, 1); g.fillCircle(x, ey, 4.5);
  g.fillStyle(CRAPE, 1); g.fillEllipse(x, ey, 1.6, 8);
  // Steps down to the slab walk, and candle stands either side.
  for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? SLAB : SLAB_LIT, 1); g.fillRect(x - 46 - k * 8, y - 40 + k * 13 + 1, 92 + k * 16, 12); }
  for (const k of [-1, 1]) {
    const cx = x + k * 70;
    g.fillStyle(IRON, 1); g.fillRect(cx - 1.5, y - 42, 3, 40); g.fillRect(cx - 7, y - 44, 14, 3);
    for (const d of [-5, 0, 5]) { g.fillStyle(BONE, 1); g.fillRect(cx + d - 1.5, y - 52, 3, 8); g.fillStyle(LAMP, 1); g.fillCircle(cx + d, y - 54, 1.6); }
  }
  // Black crape swags over the windows.
  for (let k = 0; k < w / 80; k++) {
    const sx = x0 + 20 + k * 80;
    if (Math.abs(sx + 20 - x) < 60) continue;
    g.lineStyle(3, CRAPE, 1); g.beginPath(); g.arc(sx + 20, hallTop + 8, 20, 0.15, Math.PI - 0.15, false); g.strokePath();
  }
}

/**
 * The tail of the Slough: the Matriarch's own cast skin, a hollow serpent as broad as a house,
 * coming up out of the mire at the court's north edge and lying open like a tunnel mouth. It is
 * papery and grey and translucent, every scale outlined, and it creaks. Bones and warning-bells
 * are hung across the opening on a chain.
 */
export function sloughTail(g: G, x: number, y: number, rng: Rng): void {
  const w = 340, h = 150;
  shadow(g, x, y + 4, w * 1.1, 30, 0.5);
  // The body arching back into the mire behind.
  g.fillStyle(mixC(GREY_DARK, BONE_DARK, 0.3), 1);
  g.fillEllipse(x, y - h * 0.62, w, h * 1.1);
  g.fillStyle(MIRE, 1); g.fillRect(x - w / 2 - 20, y - h * 1.2, w + 40, 20);
  // Scale rows across the hollow body, papery and lit from within.
  for (let row = 0; row < 7; row++) {
    const ry = y - h * 1.1 + row * 19;
    const half = Math.sqrt(Math.max(0, 1 - Math.pow((ry - (y - h * 0.62)) / (h * 0.55), 2))) * (w / 2);
    for (let sx = -half + 10; sx < half - 6; sx += 18) {
      const px = x + sx + (row % 2) * 9;
      g.fillStyle(mixC(GREY, BONE, 0.4 + rng() * 0.2), 0.85); g.fillEllipse(px, ry, 17, 13);
      g.lineStyle(1, GREY_DARK, 0.7); g.beginPath(); g.arc(px, ry - 2, 8, 0.1, Math.PI - 0.1, false); g.strokePath();
      if (rng() < 0.12) { g.fillStyle(PEAT_DARK, 0.7); g.fillEllipse(px + 2, ry + 1, 6, 4); }
    }
  }
  // The open mouth of the tube: dark, with ribs of scale hoops going in.
  const mw = 170, mh = 112;
  g.fillStyle(BONE_DARK, 1); g.fillEllipse(x, y - mh / 2 + 6, mw + 26, mh + 18);
  g.fillStyle(MIRE_DEEP, 1); g.fillEllipse(x, y - mh / 2 + 8, mw, mh);
  for (let k = 1; k < 5; k++) {
    g.lineStyle(2, mixC(GREY_DARK, BRUISE, 0.3), 0.7 - k * 0.12);
    g.strokeEllipse(x, y - mh / 2 + 8 - k * 4, mw * (1 - k * 0.17), mh * (1 - k * 0.17));
  }
  g.fillStyle(VENOM, 0.12); g.fillEllipse(x, y - mh / 2 + 4, mw * 0.3, mh * 0.3);
  // Torn papery edges of the skin round the mouth.
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + (i / 17) * Math.PI;
    const ex = x + Math.cos(a) * (mw / 2 + 12), ey = y - mh / 2 + 8 + Math.sin(a) * (mh / 2 + 9);
    g.fillStyle(BONE, 0.9); g.fillTriangle(ex - 5, ey, ex + 5, ey, ex + (rng() - 0.5) * 6, ey + 9 + rng() * 6);
  }
  // A chain hung across the opening with bones and little bells on it.
  g.lineStyle(2.5, IRON, 1);
  g.beginPath(); g.moveTo(x - mw / 2 - 6, y - mh * 0.62); g.lineTo(x - mw / 4, y - mh * 0.42); g.lineTo(x, y - mh * 0.36); g.lineTo(x + mw / 4, y - mh * 0.42); g.lineTo(x + mw / 2 + 6, y - mh * 0.62); g.strokePath();
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7;
    const cx = x - mw / 2 + t * mw, cy = y - mh * 0.62 + Math.sin(t * Math.PI) * mh * 0.26;
    if (i % 2) bell(g, cx, cy + 4, 3.5, 0);
    else { g.lineStyle(1, BONE_DARK, 1); g.lineBetween(cx, cy, cx, cy + 10); g.fillStyle(BONE, 1); g.fillRect(cx - 4, cy + 10, 8, 3); g.fillCircle(cx - 4, cy + 11.5, 2); g.fillCircle(cx + 4, cy + 11.5, 2); }
  }
  // Two serpent-skull posts flanking the way in.
  for (const k of [-1, 1]) {
    const px = x + k * (mw / 2 + 52);
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 4, y - 70, 8, 70);
    g.fillStyle(BONE, 1); g.fillEllipse(px, y - 76, 22, 14);
    g.fillStyle(BONE_LIT, 1); g.fillEllipse(px - 3, y - 79, 10, 5);
    g.fillStyle(CRAPE, 1); g.fillEllipse(px - 5, y - 77, 4, 3); g.fillEllipse(px + 5, y - 77, 4, 3);
    g.fillStyle(BONE_DARK, 1); g.fillTriangle(px - 6, y - 70, px - 3, y - 70, px - 4.5, y - 62); g.fillTriangle(px + 3, y - 70, px + 6, y - 70, px + 4.5, y - 62);
  }
  // Mire lapping round the base.
  g.fillStyle(MIRE, 1); g.fillEllipse(x - w * 0.36, y - 4, 120, 18); g.fillEllipse(x + w * 0.36, y - 4, 120, 18);
  g.fillStyle(MIRE_SHEEN, 0.4); g.fillEllipse(x - w * 0.36, y - 7, 70, 4); g.fillEllipse(x + w * 0.36, y - 7, 70, 4);
}

/**
 * The Quiet Ward: a long low house on stilts where the passed-over wait. Its south wall is open
 * to the air, so you can see the cots in a row, each with a grey shape under a sheet and a
 * candle at the head, and the Draught House's empty ration-hook on every post.
 */
export function quietWard(g: G, x: number, y: number, w: number, rng: Rng): void {
  const h = 70;
  shadow(g, x, y + 6, w * 1.08, 24);
  const x0 = x - w / 2;
  // Stilts and the floor.
  for (let k = 0; k <= 8; k++) { const sx = x0 + (k * w) / 8; g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx - 3, y - 18, 6, 18); }
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 6, y - 24, w + 12, 8);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0 - 6, y - 25, w + 12, 2);
  // Back wall, dark inside.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, y - 24 - h, w, h);
  g.fillStyle(dim(BRUISE_DARK, 0.2), 1); g.fillRect(x0 + 4, y - 20 - h, w - 8, h - 4);
  // The cots.
  const n = Math.floor(w / 46);
  for (let k = 0; k < n; k++) {
    const cx = x0 + 26 + k * ((w - 52) / Math.max(1, n - 1));
    g.fillStyle(TIMBER, 1); g.fillRect(cx - 16, y - 38, 32, 4);
    g.fillRect(cx - 15, y - 34, 2, 10); g.fillRect(cx + 13, y - 34, 2, 10);
    g.fillStyle(SHROUD, 0.9); g.fillEllipse(cx, y - 41, 30, 9);
    g.fillStyle(GREY, 1); g.fillCircle(cx - 12, y - 43, 4);
    if (rng() < 0.55) { g.fillStyle(GREY_LIT, 1); g.fillCircle(cx + 3, y - 45, 2); }
    // Candle at the head.
    g.fillStyle(BONE, 1); g.fillRect(cx - 18, y - 52, 2.5, 8);
    g.fillStyle(LAMP, 1); g.fillCircle(cx - 16.8, y - 54, 1.6);
  }
  // Posts with empty ration-hooks.
  for (let k = 0; k <= 4; k++) {
    const px = x0 + (k * w) / 4;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(px - 4, y - 24 - h, 8, h);
    g.lineStyle(1.5, IRON_LIT, 1); g.beginPath(); g.arc(px + 6, y - 24 - h * 0.6, 3, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
  }
  // A long, sagging thatch of sedge.
  g.fillStyle(SEDGE_DARK, 1); g.fillRect(x0 - 18, y - 24 - h - 26, w + 36, 30);
  g.fillStyle(SEDGE, 1); g.fillRect(x0 - 16, y - 24 - h - 28, w + 32, 22);
  for (let s = x0 - 16; s < x0 + w + 16; s += 5) { g.lineStyle(1, SEDGE_DARK, 0.7); g.lineBetween(s, y - 24 - h - 26, s + 2, y - 24 - h - 6 + Math.sin(s) * 2); }
  g.fillStyle(MOSS, 0.4); for (let i = 0; i < 6; i++) g.fillEllipse(x0 + rng() * w, y - 24 - h - 20, 26, 8);
  // A grey ribbon tied round every post: the colour of waiting.
  for (let k = 0; k <= 4; k++) { const px = x0 + (k * w) / 4; g.fillStyle(GREY_LIT, 0.9); g.fillRect(px - 4, y - 24 - h * 0.3, 8, 3); }
}

/** Lathe & Daughter's coffin shop: a narrow tall house, coffins stood on end against the front. */
export function coffinShop(g: G, x: number, y: number, rng: Rng): void {
  const w = 150, h = 86;
  shadow(g, x, y + 6, w * 1.2, 22);
  const x0 = x - w / 2;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0, y - h, w, h);
  for (let k = 0; k < w / 10; k++) { g.fillStyle(k % 2 ? TIMBER : mixC(TIMBER, TIMBER_DARK, 0.4), 1); g.fillRect(x0 + k * 10 + 1, y - h + 2, 8, h - 4); }
  // Gable.
  g.fillStyle(dim(SLATE, 0.3), 1); g.fillTriangle(x0 - 14, y - h + 2, x0 + w + 14, y - h + 2, x, y - h - 70);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 8, y - h, x0 + w + 8, y - h, x, y - h - 64);
  g.fillStyle(LAMP, 0.85); g.fillRect(x - 8, y - h - 34, 16, 18);
  g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(x, y - h - 34, x, y - h - 16); g.lineBetween(x - 8, y - h - 25, x + 8, y - h - 25);
  // Shop window with a little coffin in it, and the door.
  g.fillStyle(BRUISE_DARK, 1); g.fillRect(x0 + 14, y - 60, 44, 32);
  g.fillStyle(LAMP, 0.35); g.fillRect(x0 + 16, y - 58, 40, 28);
  coffin(g, x0 + 36, y - 42, 30, 11, 0, 0, false);
  g.lineStyle(2, TIMBER_DARK, 1); g.strokeRect(x0 + 14, y - 60, 44, 32);
  g.fillStyle(COFFIN, 1); g.fillRect(x + 12, y - 60, 28, 60);
  g.fillStyle(BRONZE_LIT, 1); g.fillCircle(x + 34, y - 30, 2);
  // The sign: a board hung from a bracket, a coffin painted on it.
  g.lineStyle(2, IRON, 1); g.lineBetween(x0 + w, y - 70, x0 + w + 26, y - 70);
  g.fillStyle(BONE, 1); g.fillRect(x0 + w + 6, y - 66, 30, 20);
  g.fillStyle(COFFIN, 1); g.fillTriangle(x0 + w + 12, y - 56, x0 + w + 30, y - 60, x0 + w + 30, y - 52);
  // Coffins stood on end against the wall: small, middling, long. One very small.
  const sizes = [44, 30, 52, 22];
  sizes.forEach((l, i) => {
    const px = (i < 2 ? x0 - 16 - i * 22 : x0 + w + 14 + (i - 2) * 22);
    g.fillStyle(dim(COFFIN, 0.3), 1); g.fillRect(px - 9, y - l, 18, l);
    g.fillStyle(rng() < 0.5 ? COFFIN : COFFIN_LIT, 1);
    g.fillPoints([pt(px - 6, y), pt(px + 6, y), pt(px + 9, y - l * 0.7), pt(px + 5, y - l), pt(px - 5, y - l), pt(px - 9, y - l * 0.7)], true);
    g.fillStyle(BRONZE_LIT, 0.8); g.fillRect(px - 1, y - l * 0.6, 2, 3);
  });
  // Shavings.
  for (let i = 0; i < 14; i++) { g.fillStyle(TIMBER_LIT, 0.7); g.fillEllipse(x0 + rng() * w, y + 2 + rng() * 10, 4, 2); }
}

/** Tobit Sump's digger's hut: turf roof, spades in a rack, a pyramid of fresh peat bricks. */
export function diggerHut(g: G, x: number, y: number, rng: Rng): void {
  const w = 120, h = 54;
  shadow(g, x, y + 6, w * 1.3, 20);
  const x0 = x - w / 2;
  g.fillStyle(PEAT_DARK, 1); g.fillRect(x0, y - h, w, h);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { g.fillStyle(rng() < 0.5 ? PEAT : PEAT_LIT, 1); g.fillRect(x0 + k * 20 + (r % 2) * 10 + 1, y - h + r * 13 + 1, 18, 11); }
  // Turf roof with sedge.
  g.fillStyle(MOSS_DARK, 1); g.fillEllipse(x, y - h - 4, w + 30, 34);
  g.fillStyle(MOSS, 1); g.fillEllipse(x, y - h - 8, w + 20, 24);
  for (let i = 0; i < 9; i++) sedgeTuft(g, x0 - 8 + rng() * (w + 16), y - h - 10 - rng() * 8, 0.8, rng);
  // Low door.
  g.fillStyle(MIRE_DEEP, 1); g.fillRect(x - 12, y - 34, 24, 34);
  g.fillStyle(LAMP, 0.25); g.fillRect(x - 10, y - 20, 20, 20);
  // Spade rack.
  for (let k = 0; k < 4; k++) spade(g, x0 + w + 10 + k * 7, y - 4, -Math.PI / 2 - 0.08 + k * 0.04, 40);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + w + 4, y - 28, 34, 3);
  // Peat bricks stacked to dry.
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - r; k++) {
    const bx = x0 - 44 + k * 14 + r * 7, by = y - 8 - r * 8;
    g.fillStyle(PEAT_DARK, 1); g.fillRect(bx, by, 13, 8); g.fillStyle(PEAT_LIT, 1); g.fillRect(bx + 1, by, 11, 2);
  }
}

/** The stonecutter's sheerlegs: three poles, a pulley block and a headstone hanging half-carved. */
export function sheerlegs(g: G, x: number, y: number, t = 0): void {
  shadow(g, x, y + 2, 90, 20);
  const top = pt(x, y - 110);
  for (const fx of [-44, 40, 6]) { g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x + fx, y + (fx === 6 ? -14 : 0), top.x, top.y); }
  g.fillStyle(IRON, 1); g.fillCircle(top.x, top.y + 6, 5);
  const sway = Math.sin(t) * 0.04;
  const hy = y - 40;
  g.lineStyle(1.5, BONE_DARK, 1); g.lineBetween(top.x, top.y + 6, x + sway * 60, hy - 30);
  g.lineBetween(x + sway * 60, hy - 30, x - 12 + sway * 60, hy - 18); g.lineBetween(x + sway * 60, hy - 30, x + 12 + sway * 60, hy - 18);
  // The stone: rough-hewn, only its top face dressed and one line of name begun.
  const sx = x + sway * 60;
  g.fillStyle(SLAB_DARK, 1); g.fillRect(sx - 14, hy - 18, 28, 36);
  g.fillStyle(SLAB, 1); g.fillRect(sx - 13, hy - 18, 24, 22);
  g.fillStyle(SLAB_LIT, 1); g.fillRect(sx - 13, hy - 18, 24, 3);
  g.lineStyle(1, SLAB_DARK, 1); g.lineBetween(sx - 8, hy - 8, sx + 2, hy - 8);
  g.fillStyle(BONE, 0.6); for (let i = 0; i < 6; i++) g.fillCircle(sx - 12 + i * 4, y - 2, 1.4);
}

/** A rough block of grave-stone waiting to be cut, with a mallet and chisel left on it. */
export function stoneBlock(g: G, x: number, y: number, w: number, h: number, rng: Rng): void {
  shadow(g, x, y + 2, w * 1.3, 10);
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle(SLAB, 1); g.fillRect(x - w / 2, y - h, w, h * 0.35);
  g.fillStyle(SLAB_LIT, 0.6); g.fillRect(x - w / 2, y - h, w, 2);
  for (let i = 0; i < 4; i++) { g.lineStyle(1, dim(SLAB_DARK, 0.3), 0.7); g.lineBetween(x - w / 2 + rng() * w, y - h * 0.6, x - w / 2 + rng() * w, y); }
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x - 6, y - h - 2, x + 10, y - h - 6);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + 8, y - h - 10, 8, 7);
  g.lineStyle(1.5, IRON_LIT, 1); g.lineBetween(x - 14, y - h - 1, x - 4, y - h - 3);
}

/**
 * Mother Hessel's laying-out house: a washhouse with a copper, a long stone table under a
 * lean-to, and winding sheets pegged out on a line to dry, white as anything on the isle.
 */
export function layingOutHouse(g: G, x: number, y: number, rng: Rng): void {
  const w = 170, h = 66;
  shadow(g, x, y + 6, w * 1.2, 22);
  const x0 = x - w / 2;
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x0, y - h, w, h);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 9; k++) { g.fillStyle(rng() < 0.5 ? SLAB : mixC(SLAB, BONE, 0.3), 1); g.fillRect(x0 + k * 19 + (r % 2) * 9 + 1, y - h + r * 13 + 1, 17, 11); }
  // Roof.
  g.fillStyle(dim(SLATE, 0.25), 1); g.fillRect(x0 - 12, y - h - 18, w + 24, 20);
  g.fillStyle(SLATE, 1); g.fillTriangle(x0 - 12, y - h - 16, x0 + w + 12, y - h - 16, x, y - h - 50);
  // Chimney with steam (the copper).
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x0 + w - 36, y - h - 50, 16, 34);
  // Door and window.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 14, y - 44, 28, 44);
  g.fillStyle(LAMP, 0.5); g.fillRect(x0 + 18, y - 48, 26, 18);
  g.lineStyle(1.5, TIMBER_DARK, 1); g.strokeRect(x0 + 18, y - 48, 26, 18);
  // The lean-to with its long stone table and a shrouded shape on it.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + w, y - 50, 4, 50); g.fillRect(x0 + w + 70, y - 40, 4, 40);
  g.fillStyle(SEDGE_DARK, 1); g.fillTriangle(x0 + w - 4, y - 54, x0 + w + 80, y - 44, x0 + w - 4, y - 62);
  g.fillStyle(SLAB_LIT, 1); g.fillRect(x0 + w + 8, y - 18, 62, 6);
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x0 + w + 12, y - 12, 6, 12); g.fillRect(x0 + w + 60, y - 12, 6, 12);
  g.fillStyle(SHROUD, 1); g.fillEllipse(x0 + w + 39, y - 22, 54, 10);
  g.fillStyle(GREY, 1); g.fillCircle(x0 + w + 16, y - 24, 3.5);
  // The drying line of sheets.
  const lx0 = x0 - 70, lx1 = x0 - 6, ly = y - 56;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(lx0 - 2, ly, 4, 56); g.fillRect(lx1 - 2, ly, 4, 56);
  g.lineStyle(1, BONE_DARK, 1); g.lineBetween(lx0, ly + 2, lx1, ly + 2);
  for (let k = 0; k < 3; k++) {
    const sx = lx0 + 4 + k * 20;
    g.fillStyle(SHROUD, 0.95); g.fillRect(sx, ly + 2, 16, 30 + (k % 2) * 6);
    g.fillStyle(GREY_LIT, 0.5); g.fillRect(sx + 11, ly + 2, 3, 28 + (k % 2) * 6);
  }
}

/**
 * The undertaker's parlour: a black-fronted house with crape bows at the windows, a glass hearse
 * bier drawn up outside with black plumes on its corners, and a brass plate by the door.
 */
export function parlour(g: G, x: number, y: number, rng: Rng): void {
  const w = 160, h = 92;
  shadow(g, x, y + 6, w * 1.25, 22);
  const x0 = x - w / 2;
  g.fillStyle(CRAPE, 1); g.fillRect(x0, y - h, w, h);
  g.fillStyle(CRAPE_LIT, 0.5); for (let k = 0; k < w / 16; k++) g.fillRect(x0 + k * 16, y - h, 1.5, h);
  // Flat parapet with urns.
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x0 - 8, y - h - 12, w + 16, 12);
  for (const k of [0, 0.5, 1]) {
    const ux = x0 - 4 + k * (w + 8);
    g.fillStyle(SLAB, 1); g.fillEllipse(ux, y - h - 18, 12, 10); g.fillRect(ux - 3, y - h - 14, 6, 4);
    g.fillStyle(SLAB, 1); g.fillTriangle(ux - 4, y - h - 22, ux + 4, y - h - 22, ux, y - h - 32);
  }
  // Two windows dressed with crape bows, a little lamplight behind blinds.
  for (const k of [-1, 1]) {
    const wx = x + k * 46;
    g.fillStyle(LAMP, 0.35); g.fillRect(wx - 16, y - 70, 32, 34);
    g.fillStyle(BRUISE_DARK, 0.8); g.fillRect(wx - 16, y - 70, 32, 18);
    g.lineStyle(2, SLAB_DARK, 1); g.strokeRect(wx - 16, y - 70, 32, 34);
    g.fillStyle(CRAPE_LIT, 1); g.fillTriangle(wx, y - 72, wx - 10, y - 78, wx - 10, y - 66); g.fillTriangle(wx, y - 72, wx + 10, y - 78, wx + 10, y - 66);
    g.lineStyle(2, CRAPE_LIT, 1); g.lineBetween(wx, y - 72, wx - 4, y - 58); g.lineBetween(wx, y - 72, wx + 4, y - 58);
  }
  // Door with a brass plate.
  g.fillStyle(COFFIN, 1); g.fillRect(x - 13, y - 50, 26, 50);
  g.fillStyle(BRONZE_LIT, 1); g.fillRect(x + 16, y - 36, 12, 7);
  // The glass bier outside: a long box of glass on wheels, plumes at the corners.
  const bx = x0 + w + 46, by = y + 4;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(bx, by + 2, 96, 14);
  for (const k of [-1, 1]) { g.lineStyle(2, IRON, 1); g.strokeCircle(bx + k * 30, by - 8, 9); g.lineBetween(bx + k * 30 - 6, by - 8, bx + k * 30 + 6, by - 8); }
  g.fillStyle(CRAPE, 1); g.fillRect(bx - 44, by - 22, 88, 8);
  g.fillStyle(GREY_LIT, 0.25); g.fillRect(bx - 42, by - 50, 84, 28);
  g.lineStyle(1.5, BRONZE_LIT, 0.9); g.strokeRect(bx - 42, by - 50, 84, 28);
  coffin(g, bx, by - 30, 64, 16, 0, 0, true);
  for (const k of [-1, 1]) {
    g.fillStyle(CRAPE, 1); g.fillRect(bx + k * 42 - 1.5, by - 66, 3, 16);
    for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? CRAPE : CRAPE_LIT, 1); g.fillEllipse(bx + k * 42 + (i - 2) * 2, by - 70 - i * 1.5, 5, 10); }
  }
  void rng;
}

/** The Burial Register: a book the size of a door on a lectern under a little roof, chained shut-open. */
export function registerLectern(g: G, x: number, y: number): void {
  shadow(g, x, y + 3, 60, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4, y - 44, 8, 44); g.fillRect(x - 18, y - 4, 36, 5);
  // The sloped desk and the open book.
  g.fillStyle(TIMBER, 1); g.fillPoints([pt(x - 32, y - 44), pt(x + 32, y - 44), pt(x + 28, y - 62), pt(x - 28, y - 62)], true);
  g.fillStyle(BONE, 1); g.fillPoints([pt(x - 29, y - 46), pt(x - 1, y - 46), pt(x - 2, y - 60), pt(x - 26, y - 60)], true);
  g.fillStyle(BONE_LIT, 1); g.fillPoints([pt(x + 1, y - 46), pt(x + 29, y - 46), pt(x + 26, y - 60), pt(x + 2, y - 60)], true);
  for (let k = 0; k < 6; k++) { g.lineStyle(0.8, GREY_DARK, 0.8); g.lineBetween(x - 25, y - 58 + k * 2, x - 5, y - 58 + k * 2); g.lineBetween(x + 5, y - 58 + k * 2, x + 25 - (k === 5 ? 10 : 0), y - 58 + k * 2); }
  // A ruled line through one name.
  g.lineStyle(1, BRUISE, 1); g.lineBetween(x + 4, y - 52, x + 22, y - 52);
  // The clasp: the Matriarch's green, and an iron chain to the post.
  g.fillStyle(VENOM, 1); g.fillRect(x - 3, y - 50, 6, 4);
  g.lineStyle(1.5, IRON_LIT, 1); g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 4, y - 36); g.lineTo(x + 2, y - 24); g.strokePath();
  // A little roof over it, and a candle.
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 38, y - 90, 4, 46); g.fillRect(x + 34, y - 90, 4, 46);
  g.fillStyle(SLATE, 1); g.fillTriangle(x - 46, y - 88, x + 46, y - 88, x, y - 112);
  g.fillStyle(BONE, 1); g.fillRect(x + 22, y - 72, 3, 10); g.fillStyle(LAMP, 1); g.fillCircle(x + 23.5, y - 74, 1.8);
}

/** The court's waystone: a standing stone wound with a carved serpent, a lantern hung from its jaw. */
export function graveWaystone(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 40, 12);
  g.fillStyle(SLAB_DARK, 1); g.fillPoints([pt(x - 14, y), pt(x + 14, y), pt(x + 10, y - 50), pt(x, y - 58), pt(x - 11, y - 48)], true);
  g.fillStyle(SLAB, 1); g.fillPoints([pt(x - 12, y - 2), pt(x + 8, y - 2), pt(x + 6, y - 48), pt(x, y - 55), pt(x - 9, y - 46)], true);
  // The serpent winding up it.
  g.lineStyle(3.5, MOSS_DARK, 1);
  g.beginPath(); g.moveTo(x - 12, y - 6); g.lineTo(x + 8, y - 14); g.lineTo(x - 10, y - 24); g.lineTo(x + 7, y - 34); g.lineTo(x - 4, y - 44); g.strokePath();
  g.lineStyle(1.5, MOSS_LIT, 0.8);
  g.beginPath(); g.moveTo(x - 12, y - 7); g.lineTo(x + 8, y - 15); g.lineTo(x - 10, y - 25); g.lineTo(x + 7, y - 35); g.strokePath();
  g.fillStyle(MOSS_DARK, 1); g.fillEllipse(x - 4, y - 47, 9, 6);
  g.fillStyle(VENOM, 1); g.fillCircle(x - 6, y - 48, 1);
  // A lantern on a hook from the jaw.
  g.lineStyle(1, IRON, 1); g.lineBetween(x - 8, y - 46, x - 18, y - 40);
  g.fillStyle(IRON, 1); g.fillRect(x - 22, y - 40, 8, 2);
  g.fillStyle(WISP, 0.9); g.fillRect(x - 21, y - 38, 6, 8);
  g.lineStyle(0.8, IRON, 1); g.strokeRect(x - 21, y - 38, 6, 8);
}

/** An iron railing between two points (a family plot's fence), spearheads on top. */
export function railing(g: G, a: Pt, b: Pt): void {
  const n = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 9));
  g.lineStyle(1.5, IRON, 1); g.lineBetween(a.x, a.y - 22, b.x, b.y - 22); g.lineBetween(a.x, a.y - 6, b.x, b.y - 6);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    g.lineStyle(1.5, IRON, 1); g.lineBetween(x, y, x, y - 26);
    g.fillStyle(IRON_LIT, 1); g.fillTriangle(x - 2, y - 26, x + 2, y - 26, x, y - 31);
  }
  g.fillStyle(RUST, 0.4); g.fillCircle(a.x + (b.x - a.x) * 0.4, a.y - 14, 2);
}

/** A bier: two poles and a plank, a shrouded body laid on it, left by the lych-gate. */
export function bier(g: G, x: number, y: number, rng: Rng): void {
  shadow(g, x, y + 2, 80, 10);
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x - 46, y - 4, x + 46, y - 4); g.lineBetween(x - 46, y + 2, x + 46, y + 2);
  for (const k of [-30, 30]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + k - 2, y - 2, 4, 10); }
  g.fillStyle(SHROUD, 1); g.fillEllipse(x, y - 8, 64, 12);
  g.fillStyle(GREY, 0.4); g.fillEllipse(x + 6, y - 6, 40, 5);
  g.lineStyle(1, GREY_DARK, 0.6); for (const k of [-18, 0, 18]) g.lineBetween(x + k, y - 13, x + k + 2, y - 3);
  g.fillStyle(GREY, 1); g.fillCircle(x - 28, y - 10, 4);
  if (rng() < 0.6) lily(g, x + 4, y - 10, 0.6);
}

/** A soft pool of lamplight on the ground and a haze round the lamp head (for `animate`). */
export function lampLight(g: G, x: number, y: number, t: number, seed: number): void {
  const fl = 0.85 + Math.sin(t * 7 + seed) * 0.08 + Math.sin(t * 13 + seed * 2) * 0.05;
  glow(g, x + 10, y - 44, 26, LAMP, 0.05 * fl, 4);
  g.fillStyle(LAMP, 0.05 * fl); g.fillEllipse(x + 8, y + 2, 90, 30);
}

/** Marsh gas: a slow green bubble rising out of black water and bursting (`t` seconds). */
export function marshBubble(g: G, x: number, y: number, t: number, seed: number): void {
  const ph = (t * 0.25 + seed) % 1;
  if (ph < 0.75) {
    const r = 2 + ph * 6;
    g.lineStyle(1, MIRE_SHEEN, 0.7); g.strokeCircle(x, y, r);
    g.fillStyle(MARSH_GAS, 0.12); g.fillCircle(x, y, r);
  } else {
    const k = (ph - 0.75) / 0.25;
    g.lineStyle(1, MIRE_SHEEN, 0.5 * (1 - k)); g.strokeEllipse(x, y, 12 + k * 30, 4 + k * 8);
    g.fillStyle(MARSH_GAS, 0.1 * (1 - k)); g.fillCircle(x, y - 6 - k * 18, 6 + k * 10);
  }
}

/** Dusk sky colour, exported for the floors. */
export const DUSK = [BRUISE_DARK, BRUISE, BRUISE_LIT] as const;
/** Re-exported tones a few files want without the whole palette. */
export { BONE, BONE_LIT, GREY, GREY_LIT };

// ── Carved numbers ───────────────────────────────────────────────────

/** Which of the seven strokes each digit uses: top, upper-right, lower-right, bottom, lower-left, upper-left, middle. */
const SEGS: Record<number, number[]> = {
  0: [0, 1, 2, 3, 4, 5], 1: [1, 2], 2: [0, 1, 6, 4, 3], 3: [0, 1, 6, 2, 3], 4: [5, 6, 1, 2],
  5: [0, 5, 6, 2, 3], 6: [0, 5, 6, 4, 2, 3], 7: [0, 1, 2], 8: [0, 1, 2, 3, 4, 5, 6], 9: [0, 1, 2, 3, 5, 6],
};

/**
 * A number cut into stone with a chisel: straight strokes, a dark cut and a pale lip under it.
 * `x, y` is the centre; `h` the digit height. Used for the epitaph countdowns.
 */
export function carvedNumber(g: G, x: number, y: number, n: number, h: number, cut: number, lip: number, a = 1): void {
  const digits = String(Math.max(0, Math.floor(n))).split('').map(Number);
  const dw = h * 0.5, gap = h * 0.22;
  const total = digits.length * dw + (digits.length - 1) * gap;
  digits.forEach((d, i) => {
    const x0 = x - total / 2 + i * (dw + gap), y0 = y - h / 2;
    const seg: [number, number, number, number][] = [
      [x0, y0, x0 + dw, y0], [x0 + dw, y0, x0 + dw, y0 + h / 2], [x0 + dw, y0 + h / 2, x0 + dw, y0 + h],
      [x0, y0 + h, x0 + dw, y0 + h], [x0, y0 + h / 2, x0, y0 + h], [x0, y0, x0, y0 + h / 2], [x0, y0 + h / 2, x0 + dw, y0 + h / 2],
    ];
    for (const k of SEGS[d] ?? []) {
      const [ax, ay, bx, by] = seg[k];
      g.lineStyle(Math.max(1.2, h * 0.16), lip, 0.6 * a); g.lineBetween(ax + 0.8, ay + 0.8, bx + 0.8, by + 0.8);
      g.lineStyle(Math.max(1, h * 0.13), cut, a); g.lineBetween(ax, ay, bx, by);
    }
  });
}
