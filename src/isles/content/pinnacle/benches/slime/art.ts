import Phaser from 'phaser';
import type { Rect } from '../../../../IslesTypes';
import { type G, glow, lit, mixC, dim } from '../../../../art/IsleArt';
import { OBS, crackPath, seam, shard, slab } from '../../../../art/PinnacleArt';
import { FEN, MIST, VEN, VEN_DARK, VEN_DEEP, VEN_LIT } from './palette';

/**
 * The Venom Bench's drawn things, shared by the room, the fight floor, the six decrees and the
 * intro cinematic: the plaques of the Register of the Marked, the great alembic that brewed the
 * Draught, the little stills that still drip, the six seats with their emblems, the fen under the
 * glass, marsh-gas lamps, glass reeds, the clerk's quill and the hanging name-blade.
 *
 * Every piece is black glass (PinnacleArt); the green is only ever light, inlay or liquid.
 */

const P = (x: number, y: number) => new Phaser.Geom.Point(x, y);

// ── The Register ─────────────────────────────────────────────────────

/** A name inlaid in green: a row of tiny letter-strokes, as a jeweller would cut it into glass. */
export function nameScratch(g: G, x: number, y: number, w: number, h: number, color: number, rng: () => number, a = 1): void {
  let cx = x;
  const end = x + w;
  while (cx < end - 1) {
    const kind = rng();
    const lh = h * (0.45 + rng() * 0.55);
    g.fillStyle(color, 0.85 * a);
    if (kind < 0.55) g.fillRect(cx, y - lh / 2, Math.max(0.8, h * 0.14), lh);
    else if (kind < 0.8) { g.fillRect(cx, y - lh / 2, h * 0.14, lh); g.fillRect(cx, y - lh / 2, h * 0.36, h * 0.12); }
    else g.fillCircle(cx + h * 0.16, y, h * 0.2);
    cx += h * (0.3 + rng() * 0.25);
    if (rng() < 0.18) cx += h * 0.5; // a space between a given name and a family name
  }
}

/**
 * One plaque of the Register: a little black-glass tablet with a name inlaid in green, and — for
 * nearly every one of them — the King's violet line struck through it. `struck` 0 leaves it clean.
 */
export function plaque(g: G, x: number, y: number, w: number, h: number, rng: () => number, struck = 1): void {
  g.fillStyle(0x000000, 0.4); g.fillRect(x - w / 2 + 1.5, y - h / 2 + 1.5, w, h);
  g.fillStyle(OBS.glass, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(OBS.facet, 0.8); g.fillRect(x - w / 2, y - h / 2, w, Math.max(1, h * 0.22));
  g.lineStyle(1, OBS.edge, 0.32); g.strokeRect(x - w / 2, y - h / 2, w, h);
  const tone = rng();
  nameScratch(g, x - w / 2 + 3, y + h * 0.06, w - 6, h * 0.5, tone < 0.15 ? VEN : mixC(VEN_DEEP, VEN, 0.35), rng, 0.9);
  if (struck > 0) {
    const y0 = y + (rng() - 0.5) * h * 0.2;
    g.lineStyle(Math.max(2, h * 0.3), OBS.seam, 0.16 * struck);
    g.lineBetween(x - w / 2 - 1, y0 + 1, x + w / 2 + 1, y0 - 1);
    g.lineStyle(1.1, OBS.seamLit, 0.85 * struck);
    g.lineBetween(x - w / 2 - 1, y0 + 1, x + w / 2 + 1, y0 - 1);
  }
}

/**
 * The Register of the Marked as a wall face, `x0..x1` wide, standing from `top` to its foot at
 * `base`: a polished black-glass wall between ribbed buttresses, every bay set with rows of
 * struck plaques, a plinth along its foot, and over the middle bay a carved council mask with two
 * fang-marks — the Mark — under it. For the baked ground (nobody walks behind it).
 */
export function registerFace(g: G, x0: number, x1: number, top: number, base: number, rng: () => number, gaps: [number, number][] = []): void {
  const inGap = (x: number) => gaps.some(([a, b]) => x > a - 4 && x < b + 4);
  g.fillStyle(OBS.glass, 1); g.fillRect(x0, top, x1 - x0, base - top);
  // Long reflections down the face, as polished glass shows the room in it.
  for (let x = x0; x < x1; x += 90) {
    if (inGap(x)) continue;
    g.fillStyle(OBS.facet, 0.35 + rng() * 0.25);
    g.fillTriangle(x, top, x + 40, top, x - 20, base);
  }
  // The bays: plaque rows between buttresses every ~210 px.
  const bay = 210;
  for (let bx = x0; bx < x1; bx += bay) {
    const l = bx + 26, r = Math.min(x1, bx + bay) - 26;
    if (r - l < 40) continue;
    for (let py = top + 40; py < base - 56; py += 17) {
      for (let px = l; px < r - 30; px += 38) {
        if (inGap(px) || inGap(px + 34)) continue;
        plaque(g, px + 17, py, 34, 12, rng, rng() < 0.94 ? 1 : 0);
      }
    }
  }
  // Buttresses: a ribbed shard pilaster between bays, each with a violet seam up it.
  for (let bx = x0; bx <= x1; bx += bay) {
    if (inGap(bx)) continue;
    g.fillStyle(OBS.facet, 1); g.fillRect(bx - 14, top, 28, base - top);
    g.fillStyle(OBS.sheen, 1); g.fillRect(bx - 14, top, 9, base - top);
    g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(bx - 5, top, bx - 5, base);
    g.lineStyle(1, OBS.edge, 0.25); g.strokeRect(bx - 14, top, 28, base - top);
    seam(g, crackPath({ x: bx + 4, y: top + 20 }, { x: bx + 2, y: base - 30 }, rng, 4, 9), 1, 0.55);
    // A cap shard on each buttress.
    shard(g, bx, top + 6, 34, 46, (rng() - 0.5) * 8, 0.3);
  }
  // The crest over the middle bay: a carved mask and the two fang-marks of the Mark.
  const mx = (x0 + x1) / 2;
  const masked = !inGap(mx);
  if (masked) {
    g.fillStyle(OBS.glass, 1); g.fillCircle(mx, top + 70, 54);
    g.lineStyle(2, OBS.edge, 0.5); g.strokeCircle(mx, top + 70, 54);
    g.lineStyle(6, VEN_DEEP, 0.4); g.strokeCircle(mx, top + 70, 46);
    for (const s of [-1, 1]) {
      g.fillStyle(VEN, 0.85); g.fillEllipse(mx + s * 14, top + 104, 7, 12);
      g.fillStyle(VEN_LIT, 1); g.fillCircle(mx + s * 14, top + 101, 2);
    }
  }
  // The plinth along the foot.
  g.fillStyle(OBS.sheen, 1); g.fillRect(x0, base - 40, x1 - x0, 8);
  g.fillStyle(OBS.facet, 1); g.fillRect(x0, base - 32, x1 - x0, 32);
  g.lineStyle(1.2, OBS.edge, 0.6); g.lineBetween(x0, base - 32, x1, base - 32);
  for (let x = x0 + 40; x < x1; x += 120) if (!inGap(x)) seam(g, [{ x, y: base - 30 }, { x: x + 8, y: base - 16 }, { x: x - 4, y: base - 2 }], 1, 0.4, 0, VEN);
  g.fillStyle(0x000000, 0.45); g.fillRect(x0, base, x1 - x0, 14);
}

// ── The alembic ──────────────────────────────────────────────────────

/** Where the alembic's working parts sit, for the static drawing and the live liquid alike. */
export function alembicGeo(x: number, y: number, s: number) {
  return {
    bulb: { x: x - 30 * s, y: y - 170 * s, r: 82 * s },
    helm: { x: x - 30 * s, y: y - 262 * s, r: 34 * s },
    neck: [
      { x: x - 6 * s, y: y - 282 * s }, { x: x + 50 * s, y: y - 290 * s }, { x: x + 104 * s, y: y - 270 * s }, { x: x + 128 * s, y: y - 238 * s },
    ],
    worm: { x: x + 136 * s, top: y - 236 * s, bot: y - 70 * s, r: 30 * s },
    spout: { x: x + 136 * s, y: y - 62 * s },
    basin: { x: x + 136 * s, y: y - 14 * s, rx: 44 * s, ry: 14 * s },
    fire: { x: x - 30 * s, y: y - 40 * s },
  };
}

/**
 * THE alembic that brewed the Draught — the bench's set piece. `x` is the middle of its furnace,
 * `y` the floor line; at `s` 1 it is ~330 px wide and ~330 tall. A black-glass furnace with a green
 * marsh-gas mouth; the great cucurbit half full of Draught, held in four obsidian claws; the helm and
 * a swan neck running down to a tall worm-tub where the condenser coil winds; a spout over a catch
 * basin. Static; `alembicLive` lights the liquid every frame.
 */
export function alembic(g: G, x: number, y: number, s: number, rng: () => number): void {
  const k = alembicGeo(x, y, s);
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x + 40 * s, y + 4 * s, 380 * s, 60 * s);
  // The furnace: a stepped obsidian block with a green fire-mouth.
  slab(g, x - 30 * s, y, 200 * s, 34 * s, rng, 1);
  slab(g, x - 30 * s, y - 34 * s, 160 * s, 60 * s, rng, 2);
  g.fillStyle(0x020302, 1); g.fillEllipse(k.fire.x, k.fire.y - 26 * s, 70 * s, 30 * s);
  g.fillStyle(VEN_DEEP, 0.9); g.fillEllipse(k.fire.x, k.fire.y - 22 * s, 56 * s, 18 * s);
  g.lineStyle(2, OBS.edge, 0.5); g.strokeEllipse(k.fire.x, k.fire.y - 26 * s, 70 * s, 30 * s);
  // Four claws holding the bulb: shards bent in from the furnace top.
  for (const d of [-1, -0.4, 0.4, 1]) {
    const bx = k.bulb.x + d * 70 * s;
    shard(g, bx, y - 90 * s, 22 * s, 120 * s, -d * 26 * s, 0.25);
  }
  // The cucurbit: dark glass, a liquid line, highlights.
  const b = k.bulb;
  g.fillStyle(OBS.glass, 0.92); g.fillCircle(b.x, b.y, b.r);
  g.fillStyle(VEN_DARK, 1); g.fillEllipse(b.x, b.y + b.r * 0.4, b.r * 1.86, b.r * 1.1);
  g.fillStyle(VEN_DEEP, 1); g.fillEllipse(b.x, b.y + b.r * 0.48, b.r * 1.6, b.r * 0.86);
  g.fillStyle(OBS.glass, 0.92); g.fillRect(b.x - b.r, b.y + b.r * 0.9, b.r * 2, b.r * 0.4); // the curve of the base
  g.fillStyle(OBS.glass, 1); g.fillCircle(b.x, b.y + b.r * 0.98, b.r * 0.25);
  g.lineStyle(3 * s, OBS.edge, 0.55); g.strokeCircle(b.x, b.y, b.r);
  g.lineStyle(1.4, lit(OBS.edge, 0.3), 0.7);
  g.beginPath(); g.arc(b.x, b.y, b.r * 0.86, Math.PI * 1.1, Math.PI * 1.45, false); g.strokePath();
  g.fillStyle(0xffffff, 0.5); g.fillEllipse(b.x - b.r * 0.45, b.y - b.r * 0.5, b.r * 0.22, b.r * 0.12);
  // Labels on the bulb: three paper-thin glass tags on cords, names struck through.
  for (let i = 0; i < 3; i++) {
    const tx = b.x - b.r * 0.4 + i * b.r * 0.42, ty = b.y - b.r * 0.12 + (i % 2) * 8 * s;
    g.lineStyle(1, OBS.edge, 0.4); g.lineBetween(tx, ty - 10 * s, tx + 2, ty);
    plaque(g, tx, ty + 5 * s, 24 * s, 9 * s, rng);
  }
  // The helm and its collar.
  const h = k.helm;
  g.fillStyle(OBS.facet, 1); g.fillRect(h.x - 18 * s, h.y + 20 * s, 36 * s, 22 * s);
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRect(h.x - 18 * s, h.y + 20 * s, 36 * s, 22 * s);
  g.fillStyle(OBS.glass, 0.95); g.fillCircle(h.x, h.y, h.r);
  g.fillStyle(VEN_DARK, 0.8); g.fillCircle(h.x, h.y, h.r * 0.7);
  g.lineStyle(2 * s, OBS.edge, 0.55); g.strokeCircle(h.x, h.y, h.r);
  g.fillStyle(0xffffff, 0.45); g.fillCircle(h.x - h.r * 0.4, h.y - h.r * 0.45, h.r * 0.14);
  // The swan neck: a glass tube, edge-lit both sides.
  const nk = k.neck;
  for (const [w, c, a] of [[14 * s, OBS.edge, 0.4], [11 * s, OBS.glass, 1], [4 * s, VEN_DARK, 1]] as [number, number, number][]) {
    g.lineStyle(w, c, a); g.beginPath(); g.moveTo(nk[0].x, nk[0].y);
    for (let i = 1; i < nk.length; i++) g.lineTo(nk[i].x, nk[i].y);
    g.strokePath();
  }
  // The worm tub: a tall glass cylinder banded in obsidian, the coil spiralling down inside it.
  const wm = k.worm;
  g.fillStyle(OBS.glass, 0.88); g.fillRect(wm.x - wm.r, wm.top, wm.r * 2, wm.bot - wm.top);
  g.fillStyle(VEN_DARK, 0.6); g.fillRect(wm.x - wm.r + 3, wm.top + 30 * s, wm.r * 2 - 6, wm.bot - wm.top - 30 * s);
  for (let cy = wm.top + 18 * s; cy < wm.bot - 6 * s; cy += 16 * s) {
    g.lineStyle(3.4 * s, OBS.glass, 1); g.strokeEllipse(wm.x, cy, wm.r * 1.5, 9 * s);
    g.lineStyle(1.2, VEN, 0.55); g.beginPath(); g.arc(wm.x, cy, wm.r * 0.75, 0, Math.PI, false); g.strokePath();
  }
  for (const yy of [wm.top, wm.top + (wm.bot - wm.top) * 0.5, wm.bot - 6 * s]) {
    g.fillStyle(OBS.sheen, 1); g.fillRect(wm.x - wm.r - 3, yy, wm.r * 2 + 6, 6 * s);
    g.lineStyle(1, OBS.edge, 0.6); g.strokeRect(wm.x - wm.r - 3, yy, wm.r * 2 + 6, 6 * s);
  }
  g.lineStyle(1.4, OBS.edge, 0.5); g.strokeRect(wm.x - wm.r, wm.top, wm.r * 2, wm.bot - wm.top);
  g.fillStyle(0xffffff, 0.18); g.fillRect(wm.x - wm.r + 4, wm.top + 6, 4 * s, wm.bot - wm.top - 12);
  // Spout and catch basin.
  g.fillStyle(OBS.sheen, 1); g.fillRect(k.spout.x - 3 * s, wm.bot, 6 * s, k.spout.y - wm.bot);
  const bs = k.basin;
  slab(g, bs.x, y, 104 * s, 30 * s, rng, 1);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(bs.x, bs.y, bs.rx * 2, bs.ry * 2);
  g.fillStyle(VEN_DEEP, 1); g.fillEllipse(bs.x, bs.y + 1, bs.rx * 1.7, bs.ry * 1.5);
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeEllipse(bs.x, bs.y, bs.rx * 2, bs.ry * 2);
  // A ladle hung on the basin and a rack of empty ration vials, every one of them corked.
  g.lineStyle(2 * s, OBS.edge, 0.6); g.lineBetween(bs.x + bs.rx * 0.6, bs.y, bs.x + bs.rx * 1.1, bs.y - 34 * s);
  for (let i = 0; i < 6; i++) {
    const vx = x - 150 * s + i * 13 * s, vy = y - 2;
    g.fillStyle(OBS.glass, 0.9); g.fillRoundedRect(vx - 4 * s, vy - 22 * s, 8 * s, 22 * s, 3 * s);
    g.fillStyle(i === 4 ? VEN : VEN_DARK, 0.9); g.fillRect(vx - 3 * s, vy - 9 * s, 6 * s, 7 * s);
    g.fillStyle(OBS.sheen, 1); g.fillRect(vx - 3 * s, vy - 26 * s, 6 * s, 5 * s);
    g.lineStyle(1, OBS.edge, 0.5); g.strokeRoundedRect(vx - 4 * s, vy - 22 * s, 8 * s, 22 * s, 3 * s);
  }
}

/**
 * The alembic, live (`t` seconds): the Draught glowing in the bulb, bubbles rising, vapour beading
 * down the neck, the coil lit in turn top to bottom, and a drop falling from the spout every
 * 1.6 s into the basin. Cheap — a few dozen shapes.
 */
export function alembicLive(g: G, x: number, y: number, s: number, t: number): void {
  const k = alembicGeo(x, y, s);
  const b = k.bulb;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.7);
  glow(g, b.x, b.y + b.r * 0.4, b.r * 1.3, VEN, 0.05 + pulse * 0.03, 3);
  g.fillStyle(VEN, 0.35 + pulse * 0.2); g.fillEllipse(b.x, b.y + b.r * 0.46, b.r * 1.3, b.r * 0.6);
  g.lineStyle(1.5, VEN_LIT, 0.6); g.lineBetween(b.x - b.r * 0.8, b.y + b.r * 0.08, b.x + b.r * 0.8, b.y + b.r * 0.08);
  for (let i = 0; i < 7; i++) {
    const ph = (t * (0.5 + (i % 3) * 0.17) + i * 0.37) % 1;
    const bx = b.x + Math.sin(i * 2.1 + t * 2) * b.r * 0.5;
    const by = b.y + b.r * 0.8 - ph * b.r * 0.7;
    g.fillStyle(VEN_LIT, 0.7 * (1 - ph)); g.fillCircle(bx, by, (1.5 + (i % 3)) * s);
  }
  // Fire under it.
  for (let i = 0; i < 5; i++) {
    const fx = k.fire.x + (i - 2) * 10 * s, fh = (10 + 8 * Math.abs(Math.sin(t * 7 + i * 1.3))) * s;
    g.fillStyle(i % 2 ? VEN : VEN_LIT, 0.75); g.fillTriangle(fx - 5 * s, k.fire.y - 18 * s, fx + 5 * s, k.fire.y - 18 * s, fx, k.fire.y - 18 * s - fh);
  }
  // Vapour along the neck.
  const nk = k.neck;
  for (let i = 0; i < 4; i++) {
    const f = (t * 0.45 + i / 4) % 1;
    const seg = Math.min(nk.length - 2, Math.floor(f * (nk.length - 1)));
    const lf = f * (nk.length - 1) - seg;
    const px = nk[seg].x + (nk[seg + 1].x - nk[seg].x) * lf, py = nk[seg].y + (nk[seg + 1].y - nk[seg].y) * lf;
    g.fillStyle(VEN_LIT, 0.8); g.fillCircle(px, py, 2.2 * s);
  }
  // The coil lights turn by turn.
  const wm = k.worm;
  const turns = Math.floor((wm.bot - 6 * s - wm.top - 18 * s) / (16 * s));
  const on = Math.floor(t * 4) % Math.max(1, turns);
  g.lineStyle(2, VEN_LIT, 0.8);
  g.beginPath(); g.arc(wm.x, wm.top + 18 * s + on * 16 * s, wm.r * 0.75, 0, Math.PI, false); g.strokePath();
  // The drop.
  const dp = (t % 1.6) / 1.6;
  if (dp < 0.55) {
    const dy = k.spout.y + (k.basin.y - k.spout.y) * (dp / 0.55) ** 2;
    glassDrop(g, k.spout.x, dy, 3.2 * s, 1);
  } else {
    const rp = (dp - 0.55) / 0.45;
    g.lineStyle(1.2, VEN_LIT, 0.8 * (1 - rp)); g.strokeEllipse(k.basin.x, k.basin.y + 1, k.basin.rx * 1.6 * rp, k.basin.ry * 1.3 * rp);
  }
}

/** A falling drop of Draught: a green teardrop with a bright core. */
export function glassDrop(g: G, x: number, y: number, r: number, a: number): void {
  g.fillStyle(VEN, 0.85 * a);
  g.fillCircle(x, y, r);
  g.fillTriangle(x - r * 0.8, y - r * 0.3, x + r * 0.8, y - r * 0.3, x, y - r * 2.4);
  g.fillStyle(VEN_LIT, a); g.fillCircle(x - r * 0.3, y - r * 0.2, r * 0.4);
}

// ── Stills, lamps, reeds ─────────────────────────────────────────────

/**
 * A small still of the Draught House pattern, cast in black glass: an onion pot on a brazier, a lyne
 * arm to a worm box, a tap over a ration cup. `x, y` its base, `s` scale (~110 px wide at 1).
 */
export function still(g: G, x: number, y: number, s: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x + 10 * s, y + 3, 130 * s, 26 * s);
  slab(g, x - 14 * s, y, 70 * s, 26 * s, rng, 1);
  // The pot: an onion of dark glass with a liquid band.
  const px = x - 14 * s, py = y - 58 * s;
  g.fillStyle(OBS.glass, 0.95); g.fillEllipse(px, py, 64 * s, 58 * s);
  g.fillStyle(VEN_DARK, 1); g.fillEllipse(px, py + 12 * s, 54 * s, 26 * s);
  g.fillStyle(OBS.glass, 1); g.fillTriangle(px - 12 * s, py - 24 * s, px + 12 * s, py - 24 * s, px, py - 52 * s);
  g.lineStyle(1.4, OBS.edge, 0.55); g.strokeEllipse(px, py, 64 * s, 58 * s);
  g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(px - 12 * s, py - 24 * s, px, py - 52 * s);
  g.fillStyle(0xffffff, 0.4); g.fillEllipse(px - 14 * s, py - 12 * s, 8 * s, 5 * s);
  // Lyne arm and worm box.
  g.lineStyle(5 * s, OBS.edge, 0.35); g.lineBetween(px, py - 50 * s, x + 40 * s, y - 70 * s);
  g.lineStyle(3 * s, OBS.glass, 1); g.lineBetween(px, py - 50 * s, x + 40 * s, y - 70 * s);
  g.fillStyle(OBS.facet, 1); g.fillRect(x + 28 * s, y - 72 * s, 28 * s, 46 * s);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x + 28 * s, y - 72 * s, 28 * s, 5 * s);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeRect(x + 28 * s, y - 72 * s, 28 * s, 46 * s);
  for (let i = 0; i < 3; i++) { g.lineStyle(1.2, VEN, 0.4); g.lineBetween(x + 31 * s, y - 60 * s + i * 11 * s, x + 53 * s, y - 56 * s + i * 11 * s); }
  // Tap and cup.
  g.fillStyle(OBS.sheen, 1); g.fillRect(x + 40 * s, y - 26 * s, 4 * s, 8 * s);
  g.fillStyle(OBS.glass, 0.9); g.fillRect(x + 36 * s, y - 12 * s, 12 * s, 12 * s);
  g.fillStyle(VEN_DEEP, 1); g.fillRect(x + 37 * s, y - 7 * s, 10 * s, 6 * s);
  g.lineStyle(1, OBS.edge, 0.6); g.strokeRect(x + 36 * s, y - 12 * s, 12 * s, 12 * s);
}

/** A still, live: its fire, a drip from the tap every ~1.3 s, the liquid breathing. */
export function stillLive(g: G, x: number, y: number, s: number, t: number, seed: number): void {
  const px = x - 14 * s, py = y - 58 * s;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.1 + seed);
  g.fillStyle(VEN, 0.25 + pulse * 0.2); g.fillEllipse(px, py + 13 * s, 40 * s, 14 * s);
  for (let i = 0; i < 3; i++) {
    const fh = (5 + 5 * Math.abs(Math.sin(t * 8 + i + seed))) * s;
    const fx = px + (i - 1) * 9 * s;
    g.fillStyle(VEN_LIT, 0.7); g.fillTriangle(fx - 3 * s, y - 24 * s, fx + 3 * s, y - 24 * s, fx, y - 24 * s - fh);
  }
  const dp = ((t + seed) % 1.3) / 1.3;
  if (dp < 0.5) glassDrop(g, x + 42 * s, y - 18 * s + dp * 2 * 8 * s, 1.8 * s, 1);
}

/** A marsh-gas lamp: a tall obsidian post with a glass globe and a small green flame. Static. */
export function marshLamp(g: G, x: number, y: number, s: number): void {
  g.fillStyle(0x000000, 0.4); g.fillEllipse(x, y + 2, 30 * s, 9 * s);
  slab(g, x, y, 20 * s, 10 * s);
  g.fillStyle(OBS.facet, 1); g.fillRect(x - 3.5 * s, y - 96 * s, 7 * s, 88 * s);
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - 3.5 * s, y - 96 * s, 2.5 * s, 88 * s);
  g.lineStyle(1, OBS.edge, 0.5); g.lineBetween(x - 1 * s, y - 96 * s, x - 1 * s, y - 8 * s);
  shard(g, x - 8 * s, y - 92 * s, 7 * s, 18 * s, -4 * s, 0.3);
  shard(g, x + 8 * s, y - 92 * s, 7 * s, 18 * s, 4 * s, 0.3);
  g.fillStyle(OBS.glass, 0.65); g.fillCircle(x, y - 108 * s, 12 * s);
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeCircle(x, y - 108 * s, 12 * s);
}

/** The lamp's flame, live. */
export function marshLampLive(g: G, x: number, y: number, s: number, t: number, seed: number): void {
  const f = 0.75 + 0.25 * Math.sin(t * 9 + seed) * Math.sin(t * 3.3 + seed * 2);
  glow(g, x, y - 108 * s, 34 * s * f, VEN, 0.05, 3);
  g.fillStyle(VEN, 0.9); g.fillTriangle(x - 4 * s, y - 103 * s, x + 4 * s, y - 103 * s, x + Math.sin(t * 5 + seed) * 2, y - 116 * s * (0.95 + 0.08 * f));
  g.fillStyle(VEN_LIT, 1); g.fillCircle(x, y - 105 * s, 2.4 * s);
  g.fillStyle(0xffffff, 0.45); g.fillCircle(x - 5 * s, y - 112 * s, 1.6 * s);
}

/** A clump of glass reeds: thin black blades with pale edges, a few tipped with green beads. */
export function reeds(g: G, x: number, y: number, n: number, h: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 2, n * 7, 8);
  for (let i = 0; i < n; i++) {
    const bx = x + (rng() - 0.5) * n * 6;
    const hh = h * (0.55 + rng() * 0.45);
    const lean = (rng() - 0.5) * hh * 0.4;
    shard(g, bx, y, 3 + rng() * 3, hh, lean, rng() * 0.6);
    if (rng() < 0.3) { g.fillStyle(VEN, 0.9); g.fillCircle(bx + lean, y - hh, 1.6); }
  }
}

// ── The fen under the glass ──────────────────────────────────────────

/**
 * The fen seen through the floor: black water with a green cast, weed drifts, the dim shapes of
 * drowned plaques and a serpent's long ribs, bright green where the marsh-gas rises — and over all
 * of it the glass itself, in big tiles with violet grout and the long sheen of polish.
 */
export function fenUnderGlass(g: G, r: Rect, rng: () => number, tile = 64, density = 1): void {
  g.fillStyle(FEN, 1); g.fillRect(r.x, r.y, r.w, r.h);
  const area = (r.w * r.h) / 10000;
  for (let i = 0; i < area * 1.2 * density; i++) {
    g.fillStyle(rng() < 0.5 ? VEN_DARK : 0x0c1a0e, 0.5 + rng() * 0.4);
    g.fillEllipse(r.x + rng() * r.w, r.y + rng() * r.h, 30 + rng() * 120, 10 + rng() * 40);
  }
  // Weed: long dark strands.
  for (let i = 0; i < area * 0.8 * density; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    g.lineStyle(1.4, mixC(VEN_DARK, VEN_DEEP, rng()), 0.6);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 1; k < 5; k++) g.lineTo(x + Math.sin(k * 1.7 + x) * 8, y - k * 9);
    g.strokePath();
  }
  // Drowned things.
  for (let i = 0; i < area * 0.12 * density; i++) {
    const x = r.x + rng() * r.w, y = r.y + rng() * r.h;
    if (rng() < 0.6) {
      g.fillStyle(0x050806, 0.8); g.fillRect(x - 16, y - 5, 32, 10);
      g.lineStyle(1, OBS.seam, 0.25); g.lineBetween(x - 16, y, x + 16, y - 1);
    } else {
      g.lineStyle(2, 0x0a120a, 0.8);
      g.beginPath(); g.moveTo(x - 40, y); g.lineTo(x + 40, y + 6); g.strokePath();
      for (let k = -4; k <= 4; k++) { g.lineBetween(x + k * 9, y + k * 0.7, x + k * 9 - 3, y + k * 0.7 - 12); g.lineBetween(x + k * 9, y + k * 0.7, x + k * 9 - 3, y + k * 0.7 + 12); }
    }
  }
  // Where the gas rises: a few soft green glows.
  for (let i = 0; i < area * 0.1 * density; i++) glow(g, r.x + rng() * r.w, r.y + rng() * r.h, 20 + rng() * 40, VEN, 0.03, 3);
  // The glass over it.
  for (let ty = r.y; ty < r.y + r.h; ty += tile) {
    for (let tx = r.x; tx < r.x + r.w; tx += tile) {
      const q = rng();
      if (q > 0.45) { g.fillStyle(OBS.facet, 0.16 + q * 0.16); g.fillRect(tx + 1, ty + 1, tile - 2, tile - 2); }
      if (q > 0.9) { g.fillStyle(OBS.sheen, 0.3); g.fillTriangle(tx + 2, ty + 2, tx + tile * 0.6, ty + 2, tx + 2, ty + tile * 0.6); }
    }
  }
  g.lineStyle(1, OBS.seam, 0.13);
  for (let tx = r.x; tx <= r.x + r.w; tx += tile) g.lineBetween(tx, r.y, tx, r.y + r.h);
  for (let ty = r.y; ty <= r.y + r.h; ty += tile) g.lineBetween(r.x, ty, r.x + r.w, ty);
  for (let i = 0; i < r.w / 160; i++) {
    const x = r.x + rng() * r.w;
    g.fillStyle(0xffffff, 0.025); g.fillTriangle(x, r.y, x + 60, r.y, x - 160, r.y + r.h);
  }
}

/** An open pool of the fen (no glass over it): black-green water, a ragged glass lip, pads, reeds. */
export function fenPool(g: G, x: number, y: number, rad: number, rng: () => number): void {
  g.fillStyle(0x000000, 0.5); g.fillEllipse(x, y + 4, rad * 2.3, rad * 1.7);
  g.fillStyle(0x030604, 1); g.fillEllipse(x, y, rad * 2.1, rad * 1.55);
  g.fillStyle(VEN_DARK, 0.8); g.fillEllipse(x, y + rad * 0.1, rad * 1.7, rad * 1.1);
  g.fillStyle(0x020302, 1); g.fillEllipse(x, y + rad * 0.15, rad * 1.1, rad * 0.6);
  // The lip: shards of floor-glass broken in around the edge.
  const n = Math.round(rad / 6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.2;
    const ex = x + Math.cos(a) * rad * 1.05, ey = y + Math.sin(a) * rad * 0.78;
    g.fillStyle(i % 2 ? OBS.facet : OBS.glass, 1);
    g.fillTriangle(ex, ey, ex + Math.cos(a + 1.4) * 14, ey + Math.sin(a + 1.4) * 10, ex + Math.cos(a) * 12, ey + Math.sin(a) * 9);
    g.lineStyle(1, OBS.edge, 0.45); g.lineBetween(ex, ey, ex + Math.cos(a + 1.4) * 14, ey + Math.sin(a + 1.4) * 10);
  }
  // Pads of thin green glass.
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2, d = rad * (0.3 + rng() * 0.55);
    const lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * 0.72;
    g.fillStyle(VEN_DEEP, 0.9); g.fillEllipse(lx, ly, 18, 11);
    g.fillStyle(VEN_DARK, 1); g.fillTriangle(lx, ly, lx + 9, ly - 3, lx + 9, ly + 3);
    g.lineStyle(1, VEN, 0.5); g.strokeEllipse(lx, ly, 18, 11);
  }
  reeds(g, x - rad * 0.9, y - rad * 0.3, 7, 34, rng);
  reeds(g, x + rad * 0.85, y + rad * 0.2, 5, 28, rng);
}

/** Low mist, baked: soft overlapping green ellipses on the floor. */
export function mistBank(g: G, x: number, y: number, w: number, rng: () => number, a = 1): void {
  for (let i = 0; i < 6; i++) {
    g.fillStyle(MIST, (0.035 + rng() * 0.03) * a);
    g.fillEllipse(x + (rng() - 0.5) * w, y + (rng() - 0.5) * w * 0.2, w * (0.4 + rng() * 0.5), w * (0.1 + rng() * 0.08));
  }
}

// ── The seats ────────────────────────────────────────────────────────

/** The green inlay on each seat's back: what its councilor legislated. Line-art, centred on x, y. */
export function seatEmblem(g: G, x: number, y: number, s: number, el: string, color = VEN, a = 1): void {
  g.lineStyle(Math.max(1.2, 2 * s), color, a);
  g.fillStyle(color, a);
  switch (el) {
    case 'slime': { // the Mark: a coiled serpent over two fang-pricks
      g.beginPath(); g.arc(x, y - 4 * s, 7 * s, Math.PI * 0.2, Math.PI * 1.7, false); g.strokePath();
      g.beginPath(); g.arc(x, y - 4 * s, 3.5 * s, Math.PI * 1.2, Math.PI * 2.6, false); g.strokePath();
      g.fillCircle(x - 4 * s, y + 8 * s, 1.6 * s); g.fillCircle(x + 4 * s, y + 8 * s, 1.6 * s);
      break;
    }
    case 'death': { // an hourglass, the sand run out
      g.lineBetween(x - 7 * s, y - 10 * s, x + 7 * s, y - 10 * s); g.lineBetween(x - 7 * s, y + 10 * s, x + 7 * s, y + 10 * s);
      g.lineBetween(x - 6 * s, y - 10 * s, x + 6 * s, y + 10 * s); g.lineBetween(x + 6 * s, y - 10 * s, x - 6 * s, y + 10 * s);
      g.fillTriangle(x - 5 * s, y + 9 * s, x + 5 * s, y + 9 * s, x, y + 2 * s);
      break;
    }
    case 'shadow': { // a shut eye
      g.beginPath(); g.arc(x, y - 6 * s, 10 * s, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
      for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 4 * s, y + 3.5 * s, x + i * 5 * s, y + 8 * s);
      break;
    }
    case 'bind': { // three links of chain
      for (let i = -1; i <= 1; i++) g.strokeEllipse(x, y + i * 8 * s, (i === 0 ? 5 : 8) * s, (i === 0 ? 10 : 6) * s);
      break;
    }
    case 'subterfuge': { // a sealed letter
      g.strokeRect(x - 9 * s, y - 6 * s, 18 * s, 12 * s);
      g.lineBetween(x - 9 * s, y - 6 * s, x, y + 1 * s); g.lineBetween(x + 9 * s, y - 6 * s, x, y + 1 * s);
      g.fillCircle(x, y + 2 * s, 3 * s);
      break;
    }
    default: { // string: a spider on its thread
      g.lineBetween(x, y - 14 * s, x, y - 4 * s);
      g.fillCircle(x, y + 1 * s, 3.4 * s); g.fillCircle(x, y - 3.5 * s, 2 * s);
      for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
        const a = -0.9 + i * 0.6;
        g.lineBetween(x + sd * 2 * s, y + 1 * s, x + sd * Math.cos(a) * 8 * s, y + 1 * s + Math.sin(a) * 7 * s);
      }
    }
  }
}

/**
 * One of the six seats: a tall obsidian chair on a two-step plinth, its back three shards with a
 * violet seam up the tallest, the councilor's emblem inlaid in green on it and a struck name-plaque
 * on the plinth. `x, y` the foot of the plinth, `s` scale (~150 px wide, ~250 tall at 1).
 */
export function councilSeat(g: G, x: number, y: number, s: number, el: string, rng: () => number): void {
  g.fillStyle(0x000000, 0.45); g.fillEllipse(x, y + 4 * s, 170 * s, 34 * s);
  slab(g, x, y, 150 * s, 30 * s, rng, 1);
  slab(g, x, y - 30 * s, 118 * s, 20 * s, rng, 0);
  const sy = y - 50 * s;
  shard(g, x - 34 * s, sy - 10 * s, 36 * s, 140 * s, -8 * s, 0.12);
  shard(g, x + 34 * s, sy - 10 * s, 36 * s, 146 * s, 8 * s, 0.12);
  shard(g, x, sy - 10 * s, 50 * s, 200 * s, 0, 0.32);
  seam(g, crackPath({ x: x + 2 * s, y: sy - 40 * s }, { x, y: sy - 200 * s }, rng, 4 * s, 6), Math.max(1, 1.3 * s), 0.6);
  slab(g, x - 44 * s, sy, 18 * s, 46 * s);
  slab(g, x + 44 * s, sy, 18 * s, 46 * s);
  slab(g, x, sy, 76 * s, 28 * s);
  // The emblem, in a green-lit roundel on the tall shard.
  const ey = sy - 120 * s;
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, ey, 17 * s);
  g.lineStyle(1.2, OBS.edge, 0.6); g.strokeCircle(x, ey, 17 * s);
  glow(g, x, ey, 20 * s, VEN, 0.035, 2);
  seatEmblem(g, x, ey, s, el, VEN, 0.95);
  // The name on the plinth — struck through, as all their names will be.
  plaque(g, x, y - 14 * s, 54 * s, 13 * s, rng, 0);
}

// ── Decree props ─────────────────────────────────────────────────────

/**
 * The Register's quill: a long black-glass feather with pale edge-lit vanes and a green nib.
 * `x, y` the nib's point, `a` the angle the feather lies at (from nib to plume), `len` its length.
 */
export function quill(g: G, x: number, y: number, a: number, len: number, alpha = 1, wet = 1): void {
  const ux = Math.cos(a), uy = Math.sin(a);
  const nx = -uy, ny = ux;
  g.fillStyle(0x000000, 0.25 * alpha); g.fillEllipse(x + ux * len * 0.5 + 6, y + uy * len * 0.5 + 10, len * 0.9, len * 0.18);
  // Vanes, in barbs, wider toward the plume end.
  for (let i = 3; i < 20; i++) {
    const f = i / 20;
    const cx = x + ux * len * f, cy = y + uy * len * f;
    const w = len * 0.1 * Math.sin(Math.PI * Math.min(1, f * 1.15)) * (i % 2 ? 1 : 0.85);
    for (const sd of [-1, 1]) {
      g.fillStyle(sd > 0 ? OBS.facet : OBS.glass, alpha);
      g.fillTriangle(cx, cy, cx + ux * len * 0.07, cy + uy * len * 0.07, cx + nx * w * sd + ux * len * 0.09, cy + ny * w * sd + uy * len * 0.09);
    }
    g.lineStyle(1, OBS.edge, 0.35 * alpha);
    g.lineBetween(cx, cy, cx + nx * w + ux * len * 0.09, cy + ny * w + uy * len * 0.09);
  }
  g.lineStyle(2, OBS.edge, 0.8 * alpha); g.lineBetween(x + ux * 6, y + uy * 6, x + ux * len, y + uy * len);
  // The nib.
  g.fillStyle(OBS.sheen, alpha); g.fillTriangle(x, y, x + ux * 14 + nx * 4, y + uy * 14 + ny * 4, x + ux * 14 - nx * 4, y + uy * 14 - ny * 4);
  g.fillStyle(VEN, alpha * wet); g.fillCircle(x + ux * 2, y + uy * 2, 2.6);
  g.fillStyle(VEN_LIT, alpha * wet); g.fillCircle(x, y, 1.4);
}

/**
 * A hanging name: one of the Register's plaques, ground to an edge and hung on a thread — the blade
 * the string decree holds over each fighter. `x, y` the middle of its top edge; `fray` 0–1 how far
 * the thread above it is gone (drawn by the decree); `hot` 0–1 a green warning glow along the edge.
 */
export function nameBlade(g: G, x: number, y: number, s: number, rng: () => number, hot = 0, spin = 0): void {
  const w = 46 * s, h = 16 * s, edge = 22 * s;
  const tilt = Math.sin(spin) * 0.12;
  const sk = tilt * w;
  if (hot > 0) glow(g, x, y + h + edge * 0.4, 30 * s, VEN, 0.05 * hot, 3);
  const pts = [P(x - w / 2, y - sk / 2), P(x + w / 2, y + sk / 2), P(x + w / 2, y + h + sk / 2), P(x, y + h + edge), P(x - w / 2, y + h - sk / 2)];
  g.fillStyle(OBS.glass, 1); g.fillPoints(pts, true);
  g.fillStyle(OBS.facet, 1); g.fillPoints([pts[2], pts[3], P(x, y + h)], true);
  g.fillStyle(OBS.sheen, 0.8); g.fillTriangle(x - w / 2, y + h - sk / 2, x, y + h + edge, x - w * 0.2, y + h);
  g.lineStyle(1.2, OBS.edge, 0.7); g.strokePoints(pts, true);
  // The edge, ground bright.
  g.lineStyle(1.6, hot > 0.5 ? VEN_LIT : lit(OBS.edge, 0.4), 0.9);
  g.lineBetween(pts[4].x, pts[4].y, pts[3].x, pts[3].y); g.lineBetween(pts[3].x, pts[3].y, pts[2].x, pts[2].y);
  nameScratch(g, x - w / 2 + 5, y + h * 0.5 + tilt * 2, w - 10, h * 0.55, VEN, rng, 0.9);
  g.lineStyle(1.1, OBS.seamLit, 0.85); g.lineBetween(x - w / 2 + 2, y + h * 0.5, x + w / 2 - 2, y + h * 0.45);
  // The hanging ring.
  g.lineStyle(1.6, OBS.edge, 0.8); g.strokeCircle(x, y - 4 * s, 4 * s);
}

/** A rune of the binding rite, inlaid in the floor: a green-lit glyph in a black-glass disc. `heat` 0–1. */
export function riteRune(g: G, x: number, y: number, r: number, glyph: number, heat: number): void {
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, r);
  g.fillStyle(OBS.facet, 0.8); g.fillCircle(x - r * 0.15, y - r * 0.2, r * 0.75);
  g.lineStyle(1.4, OBS.edge, 0.55); g.strokeCircle(x, y, r);
  const c = mixC(VEN_DEEP, VEN_LIT, heat);
  g.lineStyle(2 + heat * 1.5, c, 0.5 + heat * 0.5);
  const k = r * 0.5;
  switch (glyph % 6) {
    case 0: g.strokeEllipse(x, y, k * 1.4, k * 2); g.lineBetween(x - k, y, x + k, y); break;
    case 1: g.lineBetween(x - k, y + k, x, y - k); g.lineBetween(x, y - k, x + k, y + k); g.lineBetween(x - k * 0.5, y, x + k * 0.5, y); break;
    case 2: g.strokeCircle(x, y - k * 0.4, k * 0.5); g.lineBetween(x, y + k * 0.1, x, y + k); g.lineBetween(x - k * 0.6, y + k * 0.6, x + k * 0.6, y + k * 0.6); break;
    case 3: g.lineBetween(x - k, y - k, x + k, y + k); g.lineBetween(x + k, y - k, x - k, y + k); g.strokeCircle(x, y, k * 0.35); break;
    case 4: g.beginPath(); g.arc(x, y, k, Math.PI * 0.2, Math.PI * 1.8, false); g.strokePath(); g.fillStyle(c, 1); g.fillCircle(x + k * 0.3, y, k * 0.2); break;
    default: g.lineBetween(x, y - k, x, y + k); g.lineBetween(x - k * 0.7, y - k * 0.5, x, y - k * 0.1); g.lineBetween(x + k * 0.7, y - k * 0.5, x, y - k * 0.1); break;
  }
  if (heat > 0.5) { g.fillStyle(0xffffff, (heat - 0.5) * 0.8); g.fillCircle(x, y, r * 0.12); }
}

/** A short run of chain, link by link, from a to b (bind's chains, the rite's binding). */
export function chainRun(g: G, ax: number, ay: number, bx: number, by: number, link: number, color: number, a = 1): void {
  const len = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.floor(len / link));
  const ang = Math.atan2(by - ay, bx - ax);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const cx = ax + (bx - ax) * f, cy = ay + (by - ay) * f;
    const side = i % 2 === 0;
    g.lineStyle(side ? 2.4 : 1.6, side ? color : dim(color, 0.3), a);
    if (side) {
      g.strokeEllipse(cx, cy, Math.abs(Math.cos(ang)) * link * 1.1 + 3, Math.abs(Math.sin(ang)) * link * 1.1 + 3);
    } else g.lineBetween(cx - Math.cos(ang) * link * 0.45, cy - Math.sin(ang) * link * 0.45, cx + Math.cos(ang) * link * 0.45, cy + Math.sin(ang) * link * 0.45);
  }
}
