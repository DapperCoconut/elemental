import type { BossBodyState } from '../../../../boss/framework/BossDefs';
import { mulberry } from '../../../art/IsleArt';
import { OBS, councilMask, crackPath, glassFloor, lit, mixC, seam, shard, slab, throne } from '../../../art/PinnacleArt';
import {
  AEGIS, DAIS_Y, THRONE_FOOT, THRONE_S, at, clampN, ease, line, poly, stagecraft,
  type Court, type Door, type Gfx, type Kind, type Pt,
} from './throneCourt';

/**
 * The art of Act I: the long obsidian hall (floor, once), its living light (backdrop, per frame),
 * the King sat on his throne (he is painted whole — the rig is hidden), the Aegis over him, and
 * the three bodies of the Host. Black glass, violet seams; gold only where the Aegis cracks and
 * the star shows through.
 */

// ── The doors the Host steps out of ─────────────────────────────────

/** Four tall niches in the back wall, flanking the throne: the warriors' gates. */
export const BACK_DOORS: Door[] = [
  { x: 186, y: 212, side: 'back' }, { x: 316, y: 212, side: 'back' },
  { x: 644, y: 212, side: 'back' }, { x: 774, y: 212, side: 'back' },
];
/** Alcoves in the side walls: the knives' and the kennel's. */
export const SIDE_DOORS: Door[] = [
  { x: 40, y: 318, side: 'left' }, { x: 920, y: 318, side: 'right' },
  { x: 40, y: 488, side: 'left' }, { x: 920, y: 488, side: 'right' },
];
/** Where a soldier stands as they clear a door. */
export const doorStep = (d: Door): Pt =>
  d.side === 'back' ? { x: d.x, y: d.y + 10 } : { x: d.side === 'left' ? 84 : 876, y: d.y };

const VIOLET_DEEP = 0x1b1030;
const RECESS = 0x040208;
const KNIFE = 0xd27bff;

/** A plain triangle spike with alpha (PinnacleArt's `shard` is always opaque). */
function spike(g: Gfx, x: number, y: number, w: number, h: number, lean: number, a: number, tone = 0.3): void {
  const tipX = x + lean, tipY = y - h;
  g.fillStyle(mixC(OBS.glass, OBS.facet, tone), a);
  g.fillTriangle(x - w / 2, y, x + w * 0.1, y, tipX, tipY);
  g.fillStyle(mixC(OBS.facet, OBS.sheen, 0.5), a);
  g.fillTriangle(x + w * 0.1, y, x + w / 2, y, tipX, tipY);
  g.lineStyle(1, OBS.edge, 0.6 * a);
  g.lineBetween(x + w * 0.1, y, tipX, tipY);
}

// ── The hall (painted once) ─────────────────────────────────────────

function niche(g: Gfx, d: Door, rng: () => number): void {
  const x = d.x, base = d.y + 2, w = 54, h = 98;
  // The frame: two dressed jambs and a pointed arch of glass.
  slab(g, x - w / 2 - 6, base, 12, h, rng, 0);
  slab(g, x + w / 2 + 6, base, 12, h, rng, 0);
  const arch: Pt[] = [
    { x: x - w / 2, y: base }, { x: x - w / 2, y: base - h + 26 }, { x: x - w / 4, y: base - h + 6 },
    { x, y: base - h }, { x: x + w / 4, y: base - h + 6 }, { x: x + w / 2, y: base - h + 26 }, { x: x + w / 2, y: base },
  ];
  poly(g, arch, RECESS, 1);
  // Violet light from somewhere deep inside.
  for (let i = 0; i < 4; i++) {
    poly(g, arch.map((p) => ({ x: x + (p.x - x) * (1 - i * 0.2), y: base - (base - p.y) * (1 - i * 0.16) })), OBS.seam, 0.05 + i * 0.03);
  }
  line(g, arch, 1.4, OBS.edge, 0.7);
  seam(g, [{ x: x - w / 2, y: base - h + 26 }, { x: x - w / 4, y: base - h + 6 }, { x, y: base - h }], 1, 0.45);
  // A mask for a keystone.
  councilMask(g, x, base - h - 10, 9, { glow: 0.6 });
}

function sideAlcove(g: Gfx, d: Door): void {
  const inward = d.side === 'left' ? 1 : -1;
  const face = d.side === 'left' ? 58 : 902;
  const deep = face - inward * 20;
  const y = d.y;
  const shape: Pt[] = [
    { x: face, y: y - 34 }, { x: deep, y: y - 26 }, { x: deep, y: y + 30 }, { x: face, y: y + 36 },
  ];
  poly(g, shape, RECESS, 1);
  for (let i = 0; i < 3; i++) poly(g, shape.map((p) => ({ x: p.x, y: y + (p.y - y) * (1 - i * 0.25) })), OBS.seam, 0.05 + i * 0.035);
  line(g, shape, 1.2, OBS.edge, 0.7);
  // A pointed hood over the alcove.
  poly(g, [{ x: face, y: y - 34 }, { x: face + inward * 10, y: y - 48 }, { x: face + inward * 10, y: y - 28 }], OBS.sheen, 1);
  seam(g, [{ x: face + inward * 2, y: y - 30 }, { x: face + inward * 2, y: y + 32 }], 1, 0.5);
}

function banner(g: Gfx, x: number, top: number, len: number): void {
  const w = 30;
  // The pole and its finials.
  g.fillStyle(OBS.sheen, 1); g.fillRect(x - w / 2 - 6, top - 3, w + 12, 4);
  g.fillStyle(OBS.edge, 0.8); g.fillCircle(x - w / 2 - 6, top - 1, 2.5); g.fillCircle(x + w / 2 + 6, top - 1, 2.5);
  const cloth: Pt[] = [
    { x: x - w / 2, y: top }, { x: x + w / 2, y: top }, { x: x + w / 2, y: top + len },
    { x: x + w / 4, y: top + len - 8 }, { x, y: top + len + 6 }, { x: x - w / 4, y: top + len - 8 }, { x: x - w / 2, y: top + len },
  ];
  poly(g, cloth, VIOLET_DEEP, 1);
  // Folds: two darker panels and a lit edge.
  poly(g, [{ x: x - w / 2, y: top }, { x: x - w / 6, y: top }, { x: x - w / 5, y: top + len - 4 }, { x: x - w / 2, y: top + len }], 0x120a22, 0.9);
  poly(g, [{ x: x + w / 6, y: top }, { x: x + w / 3, y: top }, { x: x + w / 3.4, y: top + len - 6 }, { x: x + w / 8, y: top + len - 2 }], 0x2a1a48, 0.7);
  line(g, cloth, 1, OBS.seam, 0.6, true);
  // The emblem: the mask under a crown of three shards.
  councilMask(g, x, top + len * 0.5, 7, { glow: 0.4 });
  for (const [dx, h] of [[-5, 6], [0, 9], [5, 6]] as const) {
    g.fillStyle(OBS.seamLit, 0.9);
    g.fillTriangle(x + dx - 2, top + len * 0.5 - 12, x + dx + 2, top + len * 0.5 - 12, x + dx, top + len * 0.5 - 12 - h);
  }
}

function brazierStand(g: Gfx, x: number, y: number): void {
  slab(g, x, y, 18, 30);
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y - 32, 30, 10);
  g.lineStyle(1.2, OBS.edge, 0.7); g.strokeEllipse(x, y - 32, 30, 10);
  g.fillStyle(OBS.seam, 0.5); g.fillEllipse(x, y - 33, 20, 5);
}

/**
 * The Throne Hall — a long nave of black glass climbing to the dais, the throne at its head, the
 * Host's gates in the back wall and alcoves down both sides. Painted once, opaque.
 */
export function drawHall(g: Gfx, W: number, H: number): void {
  const rng = mulberry(0x7e40e1);
  g.fillStyle(OBS.sky, 1);
  g.fillRect(0, 0, W, H);
  glassFloor(g, 0, 96, W, H - 96, 48, rng);

  // The long reflection down the nave: the throne's light lying in the polished floor.
  for (let i = 0; i < 7; i++) {
    g.fillStyle(OBS.seam, 0.02);
    g.fillRect(480 - 46 - i * 20, DAIS_Y, 92 + i * 40, H - DAIS_Y);
  }
  // The runner: an inlay of deeper glass widening toward the player, edged in seams.
  const top = 284;
  poly(g, [{ x: 428, y: top }, { x: 532, y: top }, { x: 578, y: H }, { x: 382, y: H }], OBS.glass, 0.94);
  poly(g, [{ x: 448, y: top }, { x: 468, y: top }, { x: 444, y: H }, { x: 414, y: H }], OBS.facet, 0.45);
  seam(g, [{ x: 428, y: top }, { x: 382, y: H }], 1.2, 0.5);
  seam(g, [{ x: 532, y: top }, { x: 578, y: H }], 1.2, 0.5);
  for (let y = top + 30; y < H - 10; y += 56) {
    const k = (y - top) / (H - top);
    const hw = 20 + k * 12, hh = 12 + k * 4, cx = 480;
    line(g, [{ x: cx - hw, y }, { x: cx, y: y - hh }, { x: cx + hw, y }, { x: cx, y: y + hh }], 1, OBS.edge, 0.3, true);
    g.fillStyle(OBS.seam, 0.45); g.fillCircle(cx, y, 2.2);
    g.fillStyle(OBS.seamLit, 0.8); g.fillCircle(cx, y, 0.9);
  }
  // Old cracks in the floor, each a thin violet seam.
  for (let i = 0; i < 12; i++) {
    const a = { x: 90 + rng() * 780, y: 300 + rng() * 320 };
    const b = { x: a.x + (rng() - 0.5) * 170, y: a.y + (rng() - 0.5) * 90 };
    if (Math.abs(a.x - 480) < 120 && Math.abs(b.x - 480) < 120) continue;
    seam(g, crackPath(a, b, rng, 9, 5), 0.9, 0.32);
  }

  // The back wall: a colonnade of upthrust shards behind the dais.
  g.fillStyle(OBS.glass, 1);
  g.fillRect(0, 96, W, DAIS_Y - 92);
  for (let x = 10; x < W; x += 40) {
    if (Math.abs(x - 480) < 160) continue;
    if (BACK_DOORS.some((d) => Math.abs(d.x - x) < 46)) continue;
    shard(g, x + (rng() - 0.5) * 8, DAIS_Y - 4, 42 + rng() * 12, 70 + rng() * 70, (rng() - 0.5) * 12, 0.1 + rng() * 0.3);
  }
  g.lineStyle(1.4, OBS.edge, 0.45);
  g.lineBetween(0, DAIS_Y - 4, W, DAIS_Y - 4);
  for (const d of BACK_DOORS) niche(g, d, rng);
  banner(g, 251, 104, 74);
  banner(g, 709, 104, 74);
  banner(g, 90, 112, 60);
  banner(g, 870, 112, 60);

  // The side walls: black glass with pilasters and the alcoves of the knives and the kennel.
  for (const side of [0, 1]) {
    const x0 = side === 0 ? 0 : 902;
    g.fillStyle(OBS.glass, 1); g.fillRect(x0, DAIS_Y - 6, 58, H - DAIS_Y + 6);
    g.fillStyle(OBS.facet, 0.9); g.fillRect(side === 0 ? 50 : 902, DAIS_Y - 6, 8, H - DAIS_Y + 6);
    g.lineStyle(1.3, OBS.edge, 0.55);
    g.lineBetween(side === 0 ? 58 : 902, DAIS_Y - 6, side === 0 ? 58 : 902, H);
    for (const py of [250, 404, 572]) {
      const px = side === 0 ? 46 : 890;
      g.fillStyle(OBS.facet, 1); g.fillRect(px, py - 16, 24, 32);
      g.fillStyle(OBS.sheen, 1); g.fillRect(px, py - 16, 24, 6);
      g.lineStyle(1, OBS.edge, 0.55); g.strokeRect(px, py - 16, 24, 32);
      seam(g, [{ x: px + 12, y: py - 9 }, { x: px + 10, y: py + 4 }, { x: px + 13, y: py + 14 }], 0.8, 0.4);
    }
  }
  for (const d of SIDE_DOORS) sideAlcove(g, d);

  // The dais and the three broad steps down toward whoever has come.
  poly(g, [{ x: 336, y: 186 }, { x: 624, y: 186 }, { x: 640, y: 216 }, { x: 320, y: 216 }], OBS.facet, 1);
  line(g, [{ x: 336, y: 186 }, { x: 624, y: 186 }], 1.2, OBS.edge, 0.6);
  slab(g, 480, 238, 340, 22, rng, 1);
  slab(g, 480, 259, 410, 21, rng, 1);
  slab(g, 480, 280, 480, 21, rng, 2);
  for (const [y, hw] of [[216, 170], [238, 205], [259, 240]] as const) seam(g, [{ x: 480 - hw, y }, { x: 480 + hw, y }], 0.8, 0.3);
  brazierStand(g, 344, 214);
  brazierStand(g, 616, 214);
  // The Aegis's footprint, cut into the dais.
  g.lineStyle(1, OBS.seam, 0.3);
  g.strokeEllipse(AEGIS.x, AEGIS.y, AEGIS.rx * 2, AEGIS.ry * 2);

  throne(g, THRONE_FOOT.x, THRONE_FOOT.y, THRONE_S, { sword: true, glow: 0.7, t: 0 });

  // A vignette: the hall falls away into dark at its edges.
  for (let i = 0; i < 6; i++) {
    g.lineStyle(26, 0x000000, 0.09);
    g.strokeRect(-4 + i * 12, 92 + i * 10, W + 8 - i * 24, H - 88 - i * 14);
  }
}

// ── The hall alive (per frame) ──────────────────────────────────────

function flame(g: Gfx, x: number, y: number, t: number, heat: number): void {
  g.fillStyle(OBS.seam, 0.08 * heat); g.fillCircle(x, y - 6, 26);
  g.fillStyle(OBS.seam, 0.14 * heat); g.fillCircle(x, y - 4, 14);
  for (let i = 0; i < 3; i++) {
    const f = Math.sin(t * (7 + i * 2.3) + i * 2) * 3;
    const h = (16 + i * 4 + Math.sin(t * 5.1 + i) * 4) * heat;
    g.fillStyle(i === 2 ? OBS.seamLit : OBS.seam, 0.55 + i * 0.12);
    g.fillTriangle(x - 7 + i * 2, y, x + 7 - i * 2, y, x + f, y - h);
  }
}

/** The living hall: braziers, breathing niches, a pulse running down the runner, motes in the nave. */
export function drawHallLive(g: Gfx, tMs: number, c: Court | null): void {
  const t = tMs / 1000;
  const cracked = c?.stage === 'cracked';
  const heat = cracked ? 1.35 : 1;
  flame(g, 344, 181, t, heat);
  flame(g, 616, 181, t + 1.3, heat);
  // Doors about to open burn bright; the rest breathe.
  const glowDoor = (d: Door, k: number) => {
    const base = 0.05 + 0.03 * Math.sin(t * 1.4 + d.x * 0.01);
    if (d.side === 'back') {
      g.fillStyle(OBS.seam, base + k * 0.35);
      g.fillEllipse(d.x, d.y - 40, 40 + k * 22, 80 + k * 20);
      if (k > 0) { g.fillStyle(OBS.seamLit, k * 0.35); g.fillEllipse(d.x, d.y - 36, 16 + k * 10, 60); }
      g.fillStyle(OBS.seam, (base + k * 0.3) * 0.7);
      g.fillEllipse(d.x, d.y + 14, 60 + k * 30, 12 + k * 6);
    } else {
      const x = d.side === 'left' ? 48 : 912;
      g.fillStyle(OBS.seam, base + k * 0.35);
      g.fillEllipse(x, d.y, 18 + k * 18, 56 + k * 16);
      if (k > 0) {
        const ix = d.side === 'left' ? 64 : 896;
        g.fillStyle(OBS.seam, k * 0.22);
        g.fillEllipse(ix + (d.side === 'left' ? 20 : -20), d.y + 10, 70, 22);
      }
    }
  };
  for (const d of [...BACK_DOORS, ...SIDE_DOORS]) {
    let k = 0;
    for (const p of c?.pending ?? []) if (p.door === d) k = Math.max(k, clampN((tMs - p.from) / Math.max(1, p.at - p.from), 0, 1));
    glowDoor(d, k);
  }
  // A pulse of light running down both edges of the runner, every few seconds.
  const per = 3.2;
  const k = (t % per) / per;
  for (const [x0, x1] of [[428, 382], [532, 578]] as const) {
    const y = 284 + (640 - 284) * k, x = x0 + (x1 - x0) * k;
    g.fillStyle(OBS.seam, 0.25 * (1 - k)); g.fillCircle(x, y, 9);
    g.fillStyle(OBS.seamLit, 0.8 * (1 - k)); g.fillCircle(x, y, 2.2);
  }
  // Motes drifting up the nave through the throne-light.
  for (let i = 0; i < 26; i++) {
    const sx = (i * 137.5) % 760 + 100;
    const life = (t * (0.05 + (i % 5) * 0.012) + i * 0.173) % 1;
    const y = 620 - life * 430;
    const x = sx + Math.sin(t * 0.6 + i) * 14;
    const col = cracked && i % 3 === 0 ? OBS.star : OBS.seamLit;
    g.fillStyle(col, 0.5 * Math.sin(life * Math.PI));
    g.fillCircle(x, y, i % 4 === 0 ? 1.6 : 1);
  }
  // Glyphs turning in the Aegis's footprint.
  for (let i = 0; i < 14; i++) {
    const a = t * 0.18 + (i / 14) * Math.PI * 2;
    const x = AEGIS.x + Math.cos(a) * AEGIS.rx, y = AEGIS.y + Math.sin(a) * AEGIS.ry;
    g.fillStyle(cracked ? OBS.star : OBS.seam, (Math.sin(a) > 0 ? 0.55 : 0.2) * (cracked ? 0.6 + 0.4 * Math.sin(t * 9 + i) : 1));
    g.fillRect(x - 3, y - 1, 6, 2);
  }
}

// ── The King ────────────────────────────────────────────────────────

/** A two-segment arm: upper arm, a glass elbow, a forearm. */
function arm(g: Gfx, sh: Pt, el: Pt, hand: Pt): void {
  for (const [a, b] of [[sh, el], [el, hand]] as const) {
    g.lineStyle(13, OBS.glass, 1); g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(7, OBS.facet, 1); g.lineBetween(a.x, a.y - 1.5, b.x, b.y - 1.5);
    g.lineStyle(1, OBS.edge, 0.55); g.lineBetween(a.x, a.y - 5, b.x, b.y - 5);
  }
  g.fillStyle(OBS.sheen, 1); g.fillCircle(el.x, el.y, 6);
  g.lineStyle(1, OBS.edge, 0.6); g.strokeCircle(el.x, el.y, 6);
}

/** A great gauntlet: a knuckled glass fist; `open` spreads the claws; `point` levels one at an angle. */
function gauntlet(g: Gfx, x: number, y: number, mode: 'rest' | 'open' | 'point' | 'grip', a: number, glow: number): void {
  if (glow > 0) { g.fillStyle(OBS.seam, 0.18 * glow); g.fillCircle(x, y, 16 + glow * 6); }
  g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, 9);
  g.fillStyle(OBS.facet, 1); g.fillCircle(x + 1.5, y - 1.5, 6.5);
  g.lineStyle(1.1, OBS.edge, 0.7); g.strokeCircle(x, y, 9);
  if (mode === 'rest') {
    // Claws curled over the end of the throne's arm.
    for (let i = 0; i < 4; i++) {
      const fx = x - 6 + i * 4;
      g.fillStyle(OBS.sheen, 1); g.fillTriangle(fx - 2, y + 5, fx + 2, y + 5, fx, y + 13);
    }
  } else if (mode === 'open') {
    for (let i = 0; i < 5; i++) {
      const fa = -Math.PI / 2 + (i - 2) * 0.42;
      const tip = { x: x + Math.cos(fa) * 18, y: y + Math.sin(fa) * 18 };
      g.fillStyle(OBS.sheen, 1);
      g.fillTriangle(x + Math.cos(fa + 1.4) * 3, y + Math.sin(fa + 1.4) * 3, x + Math.cos(fa - 1.4) * 3, y + Math.sin(fa - 1.4) * 3, tip.x, tip.y);
      g.fillStyle(OBS.seamLit, 0.7 * glow); g.fillCircle(tip.x, tip.y, 1.6);
    }
  } else if (mode === 'point') {
    const tip = { x: x + Math.cos(a) * 26, y: y + Math.sin(a) * 26 };
    g.fillStyle(OBS.sheen, 1);
    g.fillTriangle(x + Math.cos(a + 1.5) * 3.5, y + Math.sin(a + 1.5) * 3.5, x + Math.cos(a - 1.5) * 3.5, y + Math.sin(a - 1.5) * 3.5, tip.x, tip.y);
    g.lineStyle(1, OBS.edge, 0.8); g.lineBetween(x, y, tip.x, tip.y);
    g.fillStyle(OBS.seam, 0.35); g.fillCircle(tip.x, tip.y, 7);
    g.fillStyle(OBS.seamLit, 1); g.fillCircle(tip.x, tip.y, 2.4);
  }
}

/** The gavel: a haft and a block of black glass with a violet seam through it. */
function gavel(g: Gfx, hand: Pt, a: number): void {
  const head = { x: hand.x + Math.cos(a) * 34, y: hand.y + Math.sin(a) * 34 };
  g.lineStyle(4, OBS.sheen, 1); g.lineBetween(hand.x, hand.y, head.x, head.y);
  g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(hand.x, hand.y, head.x, head.y);
  const hx = Math.cos(a + Math.PI / 2), hy = Math.sin(a + Math.PI / 2);
  const fx = Math.cos(a), fy = Math.sin(a);
  const c = (s: number, f: number): Pt => ({ x: head.x + hx * s + fx * f, y: head.y + hy * s + fy * f });
  poly(g, [c(-17, -8), c(17, -8), c(17, 8), c(-17, 8)], OBS.glass, 1);
  poly(g, [c(-17, -8), c(17, -8), c(14, -2), c(-14, -2)], OBS.facet, 1);
  line(g, [c(-17, -8), c(17, -8), c(17, 8), c(-17, 8)], 1.2, OBS.edge, 0.8, true);
  seam(g, [c(-15, 1), c(-4, -1), c(5, 2), c(15, 0)], 1, 0.9, 0.5);
}

/**
 * The Obsidian King on his throne, painted whole. Masked, crowned in shards, mantled in black
 * glass, his left hand at rest on the throne's arm and his right hand doing whatever the Court
 * says it is doing (pointing, raising the gavel, lifting a palm, sweeping the hall).
 */
export function drawKing(g: Gfx, s: BossBodyState, c: Court | null): void {
  const t = s.t / 1000;
  const x = s.x, y = s.y + Math.sin(t * 1.05) * 0.8;
  const glow = clampN(0.35 + s.castGlow * 0.65 + (s.enraged ? 0.2 : 0), 0, 1);
  const eyes = ease((stagecraft.entryP - 0.15) / 0.2);

  // The mantle, behind him, spilling over both arms of the throne.
  poly(g, [
    { x: x - 42, y: y - 36 }, { x: x + 42, y: y - 36 }, { x: x + 66, y: y + 24 }, { x: x + 60, y: y + 46 },
    { x: x - 60, y: y + 46 }, { x: x - 66, y: y + 24 },
  ], OBS.glass, 1);
  poly(g, [{ x: x + 20, y: y - 34 }, { x: x + 42, y: y - 36 }, { x: x + 66, y: y + 24 }, { x: x + 46, y: y + 30 }], OBS.facet, 0.9);
  for (const k of [-0.62, -0.3, 0.3, 0.62]) line(g, [{ x: x + k * 60, y: y - 30 }, { x: x + k * 100, y: y + 44 }], 1, OBS.edge, 0.18);
  line(g, [{ x: x - 66, y: y + 24 }, { x: x - 60, y: y + 46 }, { x: x + 60, y: y + 46 }, { x: x + 66, y: y + 24 }], 1.1, OBS.edge, 0.45);

  // Lap, knees, the robe falling over the seat and the shod feet on the dais.
  g.fillStyle(OBS.facet, 1); g.fillEllipse(x, y + 16, 78, 22);
  poly(g, [{ x: x - 34, y: y + 16 }, { x: x + 34, y: y + 16 }, { x: x + 28, y: y + 44 }, { x: x - 28, y: y + 44 }], OBS.glass, 1);
  poly(g, [{ x: x + 4, y: y + 18 }, { x: x + 16, y: y + 18 }, { x: x + 12, y: y + 44 }, { x: x + 2, y: y + 44 }], OBS.sheen, 0.5);
  for (const k of [-1, 1]) {
    g.fillStyle(OBS.sheen, 1); g.fillEllipse(x + k * 17, y + 14, 28, 15);
    g.fillStyle(0xffffff, 0.08); g.fillEllipse(x + k * 17 + 3, y + 11, 12, 5);
    poly(g, [{ x: x + k * 10, y: y + 42 }, { x: x + k * 24, y: y + 42 }, { x: x + k * 20, y: y + 50 }, { x: x + k * 13, y: y + 52 }], OBS.facet, 1);
    line(g, [{ x: x + k * 10, y: y + 42 }, { x: x + k * 13, y: y + 52 }, { x: x + k * 20, y: y + 50 }], 1, OBS.edge, 0.7);
  }

  // The cuirass: a wedge of shell split down the middle by the King's own seam.
  const chest: Pt[] = [{ x: x - 30, y: y - 38 }, { x: x + 30, y: y - 38 }, { x: x + 24, y: y + 6 }, { x, y: y + 13 }, { x: x - 24, y: y + 6 }];
  poly(g, chest, OBS.facet, 1);
  poly(g, [{ x, y: y - 38 }, { x: x + 30, y: y - 38 }, { x: x + 24, y: y + 6 }, { x, y: y + 13 }], OBS.sheen, 0.55);
  poly(g, [{ x: x + 8, y: y - 34 }, { x: x + 24, y: y - 34 }, { x: x + 10, y: y - 10 }], 0xffffff, 0.06);
  line(g, chest, 1.2, OBS.edge, 0.6, true);
  for (const k of [-1, 1]) line(g, [{ x: x + k * 26, y: y - 22 }, { x: x + k * 8, y: y - 12 }, { x: x + k * 20, y: y - 2 }], 1, OBS.edge, 0.3);
  seam(g, [{ x, y: y - 36 }, { x: x + 2, y: y - 20 }, { x: x - 1, y: y - 6 }, { x, y: y + 10 }], 1.3, 0.6 + glow * 0.4, glow * (0.5 + 0.5 * Math.sin(t * 1.6)));
  g.fillStyle(OBS.glass, 1); g.fillRect(x - 25, y + 2, 50, 6);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeRect(x - 25, y + 2, 50, 6);
  g.fillStyle(OBS.seamLit, 0.85); g.fillTriangle(x - 4, y + 5, x + 4, y + 5, x, y + 11);

  // Pauldrons: domed plates with shards rising off them.
  for (const k of [-1, 1]) {
    g.fillStyle(OBS.glass, 1); g.fillEllipse(x + k * 36, y - 32, 36, 20);
    g.fillStyle(OBS.facet, 1); g.fillEllipse(x + k * 36 + 2, y - 34, 26, 12);
    g.lineStyle(1, OBS.edge, 0.6); g.strokeEllipse(x + k * 36, y - 32, 36, 20);
    shard(g, x + k * 42, y - 38, 12, 20, k * 9, 0.3);
    shard(g, x + k * 32, y - 38, 9, 13, k * 5, 0.2);
  }

  // The left hand at rest; the right hand — the one that rules — wherever the Court has sent it.
  arm(g, { x: x - 38, y: y - 28 }, { x: x - 54, y: y - 10 }, { x: x - 47, y: y - 2 });
  gauntlet(g, x - 47, y - 2, 'rest', 0, 0);

  const rest: Pt = { x: x + 47, y: y - 2 };
  let hand = rest;
  let mode: 'rest' | 'open' | 'point' | 'grip' = 'rest';
  let gavelA: number | null = null;
  let slamK = 0;
  let aim = Math.PI / 2;
  const gst = c?.gesture;
  if (gst && s.t < gst.until + 450) {
    const span = Math.max(1, gst.until - gst.at);
    const k = clampN((s.t - gst.at) / span, 0, 1);
    const w = ease((s.t - gst.at) / 320) * (1 - ease((s.t - gst.until) / 420));
    aim = gst.aim;
    let target = rest;
    if (gst.kind === 'point') {
      target = { x: x + 30 + Math.cos(aim) * 40, y: y - 12 + Math.sin(aim) * 26 };
      mode = w > 0.4 ? 'point' : 'rest';
    } else if (gst.kind === 'raise') {
      target = { x: x + 50, y: y - 80 };
      mode = w > 0.4 ? 'open' : 'rest';
    } else if (gst.kind === 'sweep') {
      const a = Math.PI * 0.05 + Math.PI * 0.9 * ease(k);
      target = { x: x + Math.cos(a) * 62, y: y + 2 + Math.sin(a) * 18 };
      mode = w > 0.4 ? 'open' : 'rest';
    } else {
      // The gavel: up, hold, and down onto the arm of the throne.
      const down = ease((k - 0.42) / 0.07);
      target = { x: x + 62 - down * 15, y: y - 94 + down * 92 };
      mode = 'grip';
      gavelA = -Math.PI * 0.62 + down * (Math.PI * 0.62 + 0.15);
      slamK = k >= 0.49 ? clampN(1 - (k - 0.49) / 0.25, 0, 1) : 0;
    }
    hand = { x: rest.x + (target.x - rest.x) * w, y: rest.y + (target.y - rest.y) * w };
    if (w < 0.05) { mode = 'rest'; gavelA = null; }
  }
  const sh = { x: x + 38, y: y - 28 };
  const mid = { x: (sh.x + hand.x) / 2, y: (sh.y + hand.y) / 2 };
  const len = Math.hypot(hand.x - sh.x, hand.y - sh.y);
  const bend = Math.max(0, 34 - len * 0.45);
  const el = { x: mid.x + bend, y: mid.y + bend * 0.25 };
  arm(g, sh, el, hand);
  if (gavelA !== null) gavel(g, hand, gavelA);
  gauntlet(g, hand.x, hand.y, mode, aim, mode === 'rest' ? 0 : glow);
  if (slamK > 0) {
    g.lineStyle(3, OBS.seamLit, slamK);
    g.strokeEllipse(x + 46, y + 4, 40 + (1 - slamK) * 90, 12 + (1 - slamK) * 26);
  }

  // Gorget, cowl, the mask and the crown.
  g.fillStyle(OBS.glass, 1); g.fillEllipse(x, y - 40, 34, 13);
  g.lineStyle(1, OBS.edge, 0.5); g.strokeEllipse(x, y - 40, 34, 13);
  const hx = x + Math.cos(s.facing) * 1.6, hy = y - 62;
  poly(g, [{ x: hx - 24, y: hy + 18 }, { x: hx - 22, y: hy - 14 }, { x: hx, y: hy - 30 }, { x: hx + 22, y: hy - 14 }, { x: hx + 24, y: hy + 18 }], OBS.glass, 1);
  line(g, [{ x: hx - 24, y: hy + 18 }, { x: hx - 22, y: hy - 14 }, { x: hx, y: hy - 30 }, { x: hx + 22, y: hy - 14 }, { x: hx + 24, y: hy + 18 }], 1, OBS.edge, 0.45);
  councilMask(g, hx, hy, 19, { glow: 0.4 + glow * 0.6 + eyes * 0.6, slit: OBS.seam });
  // The eyes in the slit: two cold points that do not blink.
  const ey = hy - 19 * 0.18;
  const eb = eyes * (0.75 + glow * 0.25 + (s.enraged ? 0.15 : 0));
  for (const k of [-1, 1]) {
    g.fillStyle(OBS.seamLit, 0.25 * eb); g.fillCircle(hx + k * 5.5, ey, 6 + glow * 3);
    g.fillStyle(0xffffff, eb); g.fillCircle(hx + k * 5.5, ey, 1.9 + glow * 0.6);
  }
  // The crown: seven shards on a band, the middle one tallest, a violet stone at its foot.
  const cy = hy - 21;
  g.fillStyle(OBS.sheen, 1); g.fillRect(hx - 19, cy - 2, 38, 5);
  g.lineStyle(1, OBS.edge, 0.7); g.strokeRect(hx - 19, cy - 2, 38, 5);
  const crown: [number, number][] = [[-17, 10], [-11, 15], [-6, 20], [0, 28], [6, 20], [11, 15], [17, 10]];
  for (const [dx, h] of crown) shard(g, hx + dx, cy - 1, 7, h, dx * 0.35, 0.35);
  g.fillStyle(OBS.seam, 0.4); g.fillCircle(hx, cy + 0.5, 4.5);
  g.fillStyle(OBS.seamLit, 1); g.fillCircle(hx, cy + 0.5, 2);
  g.fillStyle(OBS.seamLit, 0.9); g.fillCircle(hx, cy - 28, 1.4);

  if (s.hurt) {
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(x, y - 30, 70, 70);
  }
}

// ── The Aegis ───────────────────────────────────────────────────────

/** A point on the dome: azimuth φ (0 = right, π/2 = toward the viewer), elevation θ (0 = floor). */
function domePt(phi: number, th: number, rise: number): Pt {
  return {
    x: AEGIS.x + AEGIS.rx * Math.cos(th) * Math.cos(phi),
    y: AEGIS.y + AEGIS.ry * Math.cos(th) * Math.sin(phi) - AEGIS.up * rise * Math.sin(th),
  };
}

/** The dome's azimuth facing a point on the floor (for where a blow lands on it). */
export const domeAzimuth = (px: number, py: number): number =>
  Math.atan2((py - AEGIS.y) / AEGIS.ry, (px - AEGIS.x) / AEGIS.rx);

/**
 * The Aegis — a hemisphere of black glass over the throne, ribbed like a geodesic, edged in
 * violet. Blows it turns ripple on it. While the Host stands a pip on its rim stands for each of
 * them. Cracked, it splits in gold — the star under the shell, showing — and a band round its
 * foot counts the window down. Mending, the gold seals back to violet.
 */
export function drawAegis(g: Gfx, tMs: number, c: Court | null): void {
  const t = tMs / 1000;
  const rise = ease((stagecraft.entryP - 0.3) / 0.4);
  if (rise <= 0.01) return;
  const cracked = c?.stage === 'cracked';
  const mending = c?.stage === 'mending' ? clampN((tMs - c.stageAt) / 1500, 0, 1) : 1;
  const whole = cracked ? 0.45 : mending;
  const a = rise * (0.55 + 0.45 * whole);

  // The glass itself: a faint violet body, a silhouette rim, ribs.
  const sil: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = (i / 24) * Math.PI;
    sil.push({ x: AEGIS.x + AEGIS.rx * Math.cos(u), y: AEGIS.y - AEGIS.up * rise * Math.sin(u) });
  }
  const front: Pt[] = [];
  for (let i = 0; i <= 16; i++) front.push(domePt(Math.PI - (i / 16) * Math.PI, 0, rise));
  poly(g, [...sil, ...front], OBS.seam, (cracked ? 0.03 : 0.065) * rise);
  // Back ribs, faint, then the front ones.
  for (let k = 1; k < 6; k++) {
    const phi = -(k / 6) * Math.PI;
    const pts: Pt[] = [];
    for (let j = 0; j <= 8; j++) pts.push(domePt(phi, (j / 8) * Math.PI / 2, rise));
    line(g, pts, 1, OBS.seam, 0.1 * a);
  }
  for (let k = 1; k < 6; k++) {
    const phi = (k / 6) * Math.PI;
    const pts: Pt[] = [];
    for (let j = 0; j <= 8; j++) pts.push(domePt(phi, (j / 8) * Math.PI / 2, rise));
    line(g, pts, 1, OBS.seamLit, 0.26 * a);
  }
  for (const th of [0.4, 0.82, 1.22]) {
    const pts: Pt[] = [];
    for (let j = 0; j <= 14; j++) pts.push(domePt((j / 14) * Math.PI, th, rise));
    line(g, pts, 1, OBS.seamLit, 0.22 * a);
  }
  line(g, sil, 5, OBS.seam, 0.14 * a);
  line(g, sil, 1.6, OBS.seamLit, 0.65 * a);
  line(g, front, 1.4, OBS.seamLit, 0.5 * a);
  // A highlight sliding along the shoulder of the dome, as if something passed a lamp.
  const hl = 2.2 + Math.sin(t * 0.5) * 0.25;
  line(g, [0, 1, 2, 3].map((i) => {
    const u = hl + i * 0.1;
    return { x: AEGIS.x + (AEGIS.rx - 6) * Math.cos(u), y: AEGIS.y - (AEGIS.up * rise - 6) * Math.sin(u) };
  }), 3, 0xffffff, 0.28 * a);

  if (!c) return;

  // Blows the Aegis turned: rings on the glass where they struck.
  for (const r of c.ripples) {
    const age = tMs - r.at;
    if (age > 520) continue;
    const k = age / 520;
    const phi = clampN(r.a, 0.15, Math.PI - 0.15);
    const p = domePt(phi, 0.45, rise);
    g.lineStyle(2, r.gold ? OBS.star : OBS.seamLit, 1 - k);
    g.strokeEllipse(p.x, p.y, 10 + k * 46, 6 + k * 26);
    g.fillStyle(r.gold ? OBS.star : OBS.seamLit, 0.5 * (1 - k)); g.fillCircle(p.x, p.y, 4);
  }

  // One pip on the rim for each of the Host still standing: they are what holds it up.
  const n = c.soldiers.length;
  for (let i = 0; i < n; i++) {
    const p = domePt(Math.PI * (0.18 + 0.64 * ((i + 0.5) / n)), 0, rise);
    g.fillStyle(OBS.seam, 0.35); g.fillCircle(p.x, p.y, 7);
    g.fillStyle(OBS.seamLit, 1);
    g.fillTriangle(p.x - 3.5, p.y, p.x, p.y - 5, p.x + 3.5, p.y);
    g.fillTriangle(p.x - 3.5, p.y, p.x, p.y + 4, p.x + 3.5, p.y);
  }

  // Cracked (or sealing): gold seams across the glass — the star, showing.
  if (cracked || mending < 1) {
    const rng = mulberry(c.crackSeed);
    const gold = cracked ? 1 : 1 - mending;
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    const o = domePt(Math.PI / 2 + (rng() - 0.5) * 0.4, 0.95 + rng() * 0.2, rise);
    g.fillStyle(OBS.star, 0.12 * gold); g.fillCircle(o.x, o.y, 26);
    g.fillStyle(OBS.starCore, 0.5 * gold); g.fillCircle(o.x, o.y, 4);
    for (let i = 0; i < 7; i++) {
      let phi = Math.PI / 2 + (rng() - 0.5) * 0.4, th = 1.0;
      const dphi = (i / 6 - 0.5) * 0.6 + (rng() - 0.5) * 0.1;
      const pts: Pt[] = [o];
      for (let j = 0; j < 6; j++) {
        phi += dphi + (rng() - 0.5) * 0.12;
        th -= 0.17 + rng() * 0.05;
        pts.push(domePt(phi, Math.max(0, th), rise));
      }
      seam(g, pts, 1.4, gold, pulse * gold, cracked ? OBS.star : mixC(OBS.star, OBS.seam, mending));
    }
    // Gold sifting down out of the cracks.
    for (let i = 0; i < 10; i++) {
      const k = (t * 0.6 + i * 0.137) % 1;
      const px = o.x + Math.sin(i * 2.4) * 70 * (0.3 + k * 0.7);
      const py = o.y + k * 110;
      g.fillStyle(OBS.star, 0.7 * (1 - k) * gold); g.fillCircle(px, py, 1.3);
    }
    if (cracked) {
      // The window, counting down round the dome's foot.
      const left = clampN((c.crackUntil - tMs) / Math.max(1, c.crackUntil - c.stageAt), 0, 1);
      const pts: Pt[] = [];
      for (let j = 0; j <= 24; j++) pts.push(domePt(Math.PI * (1 - left * j / 24), 0, rise));
      line(g, pts, 7, OBS.starDeep, 0.25);
      line(g, pts, 2.6, left < 0.25 && Math.floor(tMs / 120) % 2 ? OBS.starCore : OBS.star, 0.95);
    }
  }
}

// ── The Host ────────────────────────────────────────────────────────

/** Drawing options shared by the three soldier bodies. */
export interface BodyOpts { alpha: number; hurt: boolean; hp: number; t: number }

function hpBar(g: Gfx, x: number, y: number, w: number, hp: number, a: number): void {
  g.fillStyle(0x000000, 0.55 * a); g.fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
  g.fillStyle(OBS.seamLit, 0.9 * a); g.fillRect(x - w / 2, y, w * clampN(hp, 0, 1), 2);
}

/**
 * A warrior of the Host: a tall kettle-helmed figure in a glass hauberk behind a tower shield as
 * tall as itself, a spear upright at its back. The shield is a plane facing `face`: seen full on,
 * edge-on from the side, its back from behind. `windup` 0–1 draws it back for a bash; `lock`
 * lights its rim when a neighbour's shield stands beside it.
 */
export function drawWarrior(g: Gfx, x: number, y: number, face: number, walk: number, o: BodyOpts & { windup: number; lock: number }): void {
  const a = o.alpha;
  g.fillStyle(0x000000, 0.4 * a); g.fillEllipse(x, y + 14, 42, 12);
  const fc = Math.cos(face), fs = Math.sin(face);
  const px = -fs, py = fc;
  const wk = o.windup;
  const C = { x: x + fc * (15 - wk * 9), y: y - 8 + fs * (9 - wk * 5) };
  const shieldFront = fs > -0.25;
  const spearSide = px >= 0 ? -1 : 1;

  const drawShield = () => {
    const hw = 16, top = -24, bot = 16;
    const TL = { x: C.x - px * hw, y: C.y - py * hw * 0.5 + top };
    const TR = { x: C.x + px * hw, y: C.y + py * hw * 0.5 + top };
    const BR = { x: C.x + px * hw, y: C.y + py * hw * 0.5 + bot };
    const BL = { x: C.x - px * hw, y: C.y - py * hw * 0.5 + bot };
    const crown = { x: C.x, y: C.y + top - 8 };
    const toe = { x: C.x, y: C.y + bot + 6 };
    const outline = [TL, crown, TR, BR, toe, BL];
    poly(g, outline, OBS.glass, a);
    if (shieldFront) {
      poly(g, [crown, TR, BR, toe, { x: C.x, y: C.y }], OBS.facet, a);
      poly(g, [{ x: (crown.x + TR.x) / 2, y: (crown.y + TR.y) / 2 + 3 }, TR, { x: C.x + px * hw * 0.5, y: C.y }], OBS.sheen, 0.6 * a);
      // The boss: the King's mask in small, its slit lit.
      const ex = Math.abs(px) * 6 + 0.5;
      poly(g, [{ x: C.x - ex, y: C.y - 4 }, { x: C.x, y: C.y - 12 }, { x: C.x + ex, y: C.y - 4 }, { x: C.x, y: C.y + 6 }], OBS.glass, a);
      g.lineStyle(1.6, OBS.seam, a); g.lineBetween(C.x - ex * 0.8, C.y - 5, C.x + ex * 0.8, C.y - 5);
      g.lineStyle(0.8, OBS.seamLit, a); g.lineBetween(C.x - ex * 0.5, C.y - 5, C.x + ex * 0.5, C.y - 5);
    } else {
      // Its back: two straps and a grip.
      g.lineStyle(2, OBS.sheen, a);
      g.lineBetween(C.x - px * 10, C.y - py * 5 - 10, C.x + px * 10, C.y + py * 5 - 10);
      g.lineBetween(C.x - px * 10, C.y - py * 5 + 6, C.x + px * 10, C.y + py * 5 + 6);
    }
    line(g, outline, wk > 0 || o.lock > 0 ? 1.8 : 1.2, wk > 0 || o.lock > 0 ? OBS.seamLit : OBS.edge, (0.75 + wk * 0.25) * a, true);
    if (wk > 0) { g.fillStyle(OBS.seam, 0.2 * wk * a); g.fillCircle(C.x, C.y - 4, 26); }
    spike(g, crown.x - px * 7, crown.y + 5, 5, 8, -px * 3, a);
    spike(g, crown.x + px * 7, crown.y + 5, 5, 8, px * 3, a);
  };

  if (!shieldFront) drawShield();
  // The spear, upright at its back.
  const sx = x + spearSide * 15;
  g.lineStyle(2.6, OBS.sheen, a); g.lineBetween(sx, y - 54, sx, y + 8);
  spike(g, sx, y - 50, 7, 15, 0, a, 0.6);
  // Legs, stepping.
  const st = Math.sin(walk) * 3;
  g.fillStyle(OBS.glass, a);
  g.fillRect(x - 10, y + 1 + st, 7, 12); g.fillRect(x + 3, y + 1 - st, 7, 12);
  g.lineStyle(1, OBS.edge, 0.4 * a);
  g.strokeRect(x - 10, y + 1 + st, 7, 12); g.strokeRect(x + 3, y + 1 - st, 7, 12);
  // Hauberk and pauldrons.
  const body: Pt[] = [{ x: x - 13, y: y - 22 }, { x: x + 13, y: y - 22 }, { x: x + 16, y: y + 6 }, { x: x - 16, y: y + 6 }];
  poly(g, body, OBS.facet, a);
  poly(g, [{ x, y: y - 22 }, { x: x + 13, y: y - 22 }, { x: x + 16, y: y + 6 }, { x: x + 2, y: y + 6 }], OBS.sheen, 0.5 * a);
  for (let r = 0; r < 3; r++) line(g, [{ x: x - 14, y: y - 14 + r * 7 }, { x: x + 14, y: y - 14 + r * 7 }], 0.8, OBS.edge, 0.18 * a);
  line(g, body, 1, OBS.edge, 0.55 * a, true);
  spike(g, x - 14, y - 18, 10, 9, -4, a);
  spike(g, x + 14, y - 18, 10, 9, 4, a);
  // The helm: a tall point of glass with a violet slit.
  const helm: Pt[] = [{ x: x - 9, y: y - 22 }, { x: x + 9, y: y - 22 }, { x: x + 8, y: y - 36 }, { x, y: y - 46 }, { x: x - 8, y: y - 36 }];
  poly(g, helm, OBS.glass, a);
  poly(g, [{ x, y: y - 46 }, { x: x + 8, y: y - 36 }, { x: x + 9, y: y - 22 }, { x: x + 1, y: y - 22 }], OBS.facet, a);
  line(g, helm, 1, OBS.edge, 0.65 * a, true);
  g.lineStyle(2.4, OBS.seam, a); g.lineBetween(x - 6 + fc * 2, y - 31, x + 6 + fc * 2, y - 31);
  g.lineStyle(1, OBS.seamLit, a); g.lineBetween(x - 4 + fc * 2, y - 31, x + 4 + fc * 2, y - 31);
  if (shieldFront) drawShield();
  if (o.hurt) poly(g, body, 0xffffff, 0.45 * a);
  hpBar(g, x, y + 20, 30, o.hp, a);
}

/**
 * An assassin of the Host: a hunched, hooded thing in a tattered glass cloak, a sliver of mask
 * in the hood, two long knives held reversed. `crouch` 0–1 sinks it before a stab; `blade` lights
 * the knives.
 */
export function drawAssassin(g: Gfx, x: number, y: number, face: number, o: BodyOpts & { crouch: number; blade: number }): void {
  const a = o.alpha;
  if (a <= 0.01) return;
  const t = o.t;
  const cy = y + o.crouch * 4;
  g.fillStyle(0x000000, 0.35 * a); g.fillEllipse(x, y + 12, 30 + o.crouch * 6, 9);
  // The cloak, its hem torn into fluttering tails.
  const tails: Pt[] = [];
  for (let i = 0; i <= 6; i++) {
    const fx = x + 14 - i * (28 / 6);
    const drop = i % 2 === 0 ? 10 : 4;
    tails.push({ x: fx + Math.sin(t * 6 + i) * 1.5, y: cy + drop + Math.sin(t * 5 + i * 1.7) * 2 });
  }
  const cloak: Pt[] = [{ x: x - 9 - o.crouch * 3, y: cy - 26 }, { x: x + 9 + o.crouch * 3, y: cy - 26 }, ...tails];
  poly(g, cloak, OBS.glass, a);
  poly(g, [{ x: x + 2, y: cy - 26 }, { x: x + 9, y: cy - 26 }, tails[0], tails[2]], OBS.facet, 0.8 * a);
  line(g, cloak, 1, OBS.edge, 0.4 * a, true);
  // Knives, reversed, along the facing.
  for (const side of [-1, 1]) {
    const h = at(x, cy - 10, face, 6, side * 10);
    const tip = at(h.x, h.y, face + side * 0.35, 20, 0);
    g.lineStyle(3.2, OBS.glass, a); g.lineBetween(h.x, h.y, tip.x, tip.y);
    g.lineStyle(1.2, o.blade > 0 ? lit(KNIFE, 0.4) : OBS.edge, (0.6 + o.blade * 0.4) * a); g.lineBetween(h.x, h.y, tip.x, tip.y);
    if (o.blade > 0) { g.fillStyle(KNIFE, 0.3 * o.blade * a); g.fillCircle(tip.x, tip.y, 5); }
    g.fillStyle(OBS.sheen, a); g.fillCircle(h.x, h.y, 3);
  }
  // The hood and the sliver of a mask inside it.
  const hood: Pt[] = [{ x: x - 9, y: cy - 22 }, { x: x - 8, y: cy - 34 }, { x: x + 2, y: cy - 42 }, { x: x + 9, y: cy - 32 }, { x: x + 9, y: cy - 22 }];
  poly(g, hood, OBS.glass, a);
  line(g, hood, 1, OBS.edge, 0.55 * a, true);
  councilMask(g, x + Math.cos(face) * 1.5, cy - 29, 6, { alpha: a, slit: KNIFE, glow: 0.5 + o.blade });
  if (o.hurt) poly(g, cloak, 0xffffff, 0.45 * a);
  hpBar(g, x, y + 16, 22, o.hp, a);
}

/**
 * A beast of the Host: a lean obsidian hound, seen from above and a little behind, glass shards
 * bristling down its spine. `hackles` 0–1 raises them (it is about to run); `charge` draws its
 * streak.
 */
export function drawHound(g: Gfx, x: number, y: number, face: number, stride: number, o: BodyOpts & { hackles: number; charge: boolean }): void {
  const a = o.alpha;
  const squash = (p: Pt): Pt => ({ x: p.x, y: y + (p.y - y) * 0.72 - 8 });
  const L = (f: number, s: number): Pt => squash(at(x, y, face, f, s));
  g.fillStyle(0x000000, 0.4 * a); g.fillEllipse(x, y + 8, 56, 18);
  if (o.charge) {
    for (let i = 0; i < 4; i++) {
      const p0 = L(-20 - i * 16, (i - 1.5) * 5), p1 = L(-46 - i * 18, (i - 1.5) * 6);
      g.lineStyle(2, OBS.seamLit, 0.35 * a); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
  }
  // Legs, gaiting.
  for (const [f, s, ph] of [[12, -7, 0], [12, 7, Math.PI], [-12, -7, Math.PI], [-12, 7, 0]] as const) {
    const hip = L(f, s);
    const foot = L(f + Math.sin(stride + ph) * 7, s * 1.5);
    g.lineStyle(4, OBS.glass, a); g.lineBetween(hip.x, hip.y, foot.x, foot.y + 9);
    g.lineStyle(1, OBS.edge, 0.4 * a); g.lineBetween(hip.x, hip.y, foot.x, foot.y + 9);
  }
  // Tail.
  const tb = L(-22, 0), tt = L(-36, Math.sin(stride * 0.5) * 6);
  g.lineStyle(3, OBS.glass, a); g.lineBetween(tb.x, tb.y, tt.x, tt.y);
  spike(g, tt.x, tt.y + 2, 5, 8, 0, a);
  // Body.
  const body = [L(-24, 0), L(-18, -8), L(-4, -10), L(10, -9), L(17, -6), L(17, 6), L(10, 9), L(-4, 10), L(-18, 8)];
  poly(g, body, OBS.glass, a);
  poly(g, [L(-16, -3), L(12, -4), L(12, 2), L(-16, 3)], OBS.facet, a);
  line(g, body, 1, OBS.edge, 0.55 * a, true);
  // Spine shards: up and back; hackles stand them on end and light them.
  for (let i = 0; i < 6; i++) {
    const b = L(-16 + i * 5.5, 0);
    const h = 6 + o.hackles * 9 + (i % 2) * 2;
    spike(g, b.x, b.y, 5, h, -Math.cos(face) * 3, a, 0.4);
    if (o.hackles > 0) { g.fillStyle(OBS.seamLit, 0.6 * o.hackles * a); g.fillCircle(b.x - Math.cos(face) * 3, b.y - h, 1.2); }
  }
  // Head: a long wedge, two slit eyes, two shard ears.
  const head = [L(14, -6), L(30, -3), L(36, 0), L(30, 3), L(14, 6)];
  poly(g, head, OBS.facet, a);
  line(g, head, 1, OBS.edge, 0.6 * a, true);
  for (const s of [-1, 1]) {
    const e = L(26, s * 3);
    g.fillStyle(OBS.seam, 0.4 * a); g.fillCircle(e.x, e.y, 3.2);
    g.fillStyle(OBS.seamLit, a); g.fillCircle(e.x, e.y, 1.2);
    const ear = L(17, s * 4);
    spike(g, ear.x, ear.y, 4, 7 + o.hackles * 3, s * 2, a);
  }
  if (o.hurt) poly(g, body, 0xffffff, 0.45 * a);
  hpBar(g, x, y + 18, 30, o.hp, a);
}

/** The Host's own colour per kind (for wrecks and tethers). */
export const KIND_TINT: Record<Kind, number> = { warrior: OBS.seamLit, assassin: KNIFE, beast: OBS.edge };

/** A soldier breaking: glass bursting outward and falling, a ring of violet. */
export function drawWreck(g: Gfx, x: number, y: number, kind: Kind, face: number, age: number): void {
  const k = clampN(age / 760, 0, 1);
  if (k >= 1) return;
  g.lineStyle(2, KIND_TINT[kind], 1 - k);
  g.strokeEllipse(x, y - 8, 20 + k * 70, 10 + k * 34);
  for (let i = 0; i < 11; i++) {
    const ang = face + i * 0.57 + Math.sin(i * 7.1) * 0.3;
    const d = 6 + k * (34 + (i % 4) * 12);
    const px = x + Math.cos(ang) * d;
    const py = y - 14 + Math.sin(ang) * d * 0.6 + k * k * 30;
    const sz = 3 + (i % 3) * 2;
    const r = ang + k * 6;
    g.fillStyle(i % 3 === 0 ? OBS.sheen : OBS.facet, 1 - k);
    g.fillTriangle(px + Math.cos(r) * sz, py + Math.sin(r) * sz, px + Math.cos(r + 2.3) * sz * 0.6, py + Math.sin(r + 2.3) * sz * 0.6,
      px + Math.cos(r + 4) * sz * 0.6, py + Math.sin(r + 4) * sz * 0.6);
  }
}
