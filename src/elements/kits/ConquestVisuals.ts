import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Conquest draws.
 *
 * The element's problem is legibility, not spectacle: at any moment the board can hold two
 * dozen buildings, forty soldiers and four differently-coloured territories, and the player has
 * to be able to read all of it at a glance while somebody is shooting at them. So every
 * primitive here follows the same two rules.
 *
 * **Territory is the floor, never the object.** Owned squares are a wash and a border, nothing
 * more — the fill never rises above 0.1 alpha, because a building sitting on it has to stay the
 * brightest thing in its own cell. The border is what actually carries the ownership read, and
 * it is drawn only on the *outside* edges of a region, so nine owned squares look like one
 * territory rather than a grid of nine boxes.
 *
 * **Silhouette carries the type, colour carries the side.** A barracks, a turret and a
 * barricade are told apart by outline alone — a pitched roof, a tapered gun, a run of blocks.
 * Every one of them is then tinted with its town's colour, which is the only thing that says
 * whose it is. That way a colourblind read still works, and a red-vs-blue read still works at
 * the far end of the arena.
 */

export type ConquestColorFn = ColorFn;

export const CNQ = {
  /** The element itself. */
  crimson: 0xc23a2e,
  banner: 0xe8503c,
  gold: 0xe8c23a,
  goldDeep: 0x8f6f14,
  /** Structure — every building is built out of these three regardless of side. */
  stone: 0xb8b2a4,
  stoneDark: 0x5d574c,
  timber: 0x7a5230,
  timberDark: 0x3d2817,
  iron: 0x8f9aa6,
  ironDark: 0x2e3640,
  /** Soldiers. */
  flesh: 0xe8c9a0,
  steel: 0xd6dde6,
  blood: 0xa8242e,
  /** Bullets and hits. */
  muzzle: 0xffe9a8,
  tracer: 0xffb03a,
  /** Neutral ground and the grid. */
  neutral: 0x3a3d4a,
  grid: 0x54596b,
  parchment: 0xf2e8d0,
  /** The shop-gated third paths, each with its own family so a tier-3 read is instant. */
  arcane: 0x9a6ad8,
  arcaneDeep: 0x4a2c78,
  ember: 0xff7a2a,
  emberCore: 0xffe08a,
  ash: 0x6b6270,
  shroud: 0x2a2438,
  mend: 0x6ee87a,
};

/**
 * Town colours. Warm hues are always the player's, cool always the NPC's — with four
 * territories a side possible, "whose is that?" has to survive being answered from the hue
 * family alone, before you get as far as telling amber from rose.
 */
export const PLAYER_TOWN_COLORS = [0xd83a3a, 0xe8862c, 0xd8c23a, 0xe05fa0];
export const NPC_TOWN_COLORS = [0x3a7fd8, 0x8f5ad8, 0x2ec4b6, 0x5ad8a0];

export function townColor(owner: 'player' | 'npc', index: number): number {
  const table = owner === 'player' ? PLAYER_TOWN_COLORS : NPC_TOWN_COLORS;
  return table[index % table.length];
}

// ── Primitives ────────────────────────────────────────────────────────────

/** Deterministic 0–1 noise, so anything that has to jitter the same way every frame can. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 41.3 + i * 289.7) * 24571.331;
  return v - Math.floor(v);
}

/**
 * One owned square: a flat wash, plus border strokes on whichever of its four edges face out of
 * the territory. `open` is [top, right, bottom, left] — true where the neighbour is *not* the
 * same territory, and so where the outline should be drawn.
 */
export function territoryTile(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, size: number,
  color: number,
  open: [boolean, boolean, boolean, boolean],
  alpha: number,
): void {
  g.fillStyle(tint(color), alpha * 0.1);
  g.fillRect(x, y, size, size);

  const c = tint(color);
  g.lineStyle(2.4, c, alpha * 0.85);
  if (open[0]) g.lineBetween(x, y, x + size, y);
  if (open[1]) g.lineBetween(x + size, y, x + size, y + size);
  if (open[2]) g.lineBetween(x, y + size, x + size, y + size);
  if (open[3]) g.lineBetween(x, y, x, y + size);

  // A dim inner line a couple of pixels in, so the border reads as a wall rather than a
  // hairline when two territories end up sharing an edge.
  g.lineStyle(1, c, alpha * 0.3);
  const p = 3.5;
  if (open[0]) g.lineBetween(x + p, y + p, x + size - p, y + p);
  if (open[1]) g.lineBetween(x + size - p, y + p, x + size - p, y + size - p);
  if (open[2]) g.lineBetween(x + p, y + size - p, x + size - p, y + size - p);
  if (open[3]) g.lineBetween(x + p, y + p, x + p, y + size - p);
}

/** The faint board underneath everything — only ever visible on unclaimed ground. */
export function gridCell(
  g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, alpha: number,
): void {
  g.lineStyle(1, CNQ.grid, alpha);
  g.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

/** A square being contested — a hatched overlay that fills in as the two seconds run out. */
export function contestTile(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, size: number, progress: number, color: number, t: number,
): void {
  g.fillStyle(color, 0.14 + progress * 0.2);
  g.fillRect(x, y, size, size);
  // Diagonal hatching that marches, so a square being taken never looks like a square that
  // merely changed colour.
  g.lineStyle(2, color, 0.35 + progress * 0.4);
  const step = 11;
  const drift = (t * 22) % step;
  for (let d = -size; d < size * 2; d += step) {
    const o = d + drift;
    const x0 = Phaser.Math.Clamp(o, 0, size);
    const y0 = Phaser.Math.Clamp(o - size, 0, size);
    const x1 = Phaser.Math.Clamp(o - size, 0, size);
    const y1 = Phaser.Math.Clamp(o, 0, size);
    g.lineBetween(x + x0, y + y0, x + x1, y + y1);
  }
  // The clock itself: a bar closing along the bottom edge.
  g.fillStyle(color, 0.9);
  g.fillRect(x + 4, y + size - 6, (size - 8) * progress, 3);
}

// ── Shared shading ────────────────────────────────────────────────────────
//
// Everything below is built the way the fighters are: a dark rim, a body, a lit band and one
// glint (`bakeOrb` in BootScene). Shading is mixed *after* the skin mapper has run, so a remapped
// palette still gets its own rims and highlights rather than the original element's.

function mix(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * k) << 16) | (Math.round(ag + (bg - ag) * k) << 8) | Math.round(ab + (bb - ab) * k);
}
const dark = (c: number, k: number): number => mix(c, 0x000000, k);
const light = (c: number, k: number): number => mix(c, 0xffffff, k);

/** The soft contact shadow every object on the board sits on. */
function groundShadow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, alpha: number): void {
  g.fillStyle(0x000000, alpha * 0.18);
  g.fillEllipse(x, y, w * 1.15, h * 1.3);
  g.fillStyle(0x000000, alpha * 0.22);
  g.fillEllipse(x, y, w * 0.8, h * 0.85);
}

/** A miniature of the fighters' orb: rim → shell → body → lit core, a rim light and a glint. */
function orb(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, base: number, alpha: number): void {
  g.fillStyle(dark(base, 0.55), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(dark(base, 0.18), alpha);
  g.fillCircle(x, y, r * 0.86);
  g.fillStyle(base, alpha);
  g.fillCircle(x, y + r * 0.06, r * 0.7);
  g.fillStyle(light(base, 0.22), alpha);
  g.fillCircle(x, y + r * 0.16, r * 0.5);
  g.fillStyle(light(base, 0.45), alpha * 0.6);
  g.fillEllipse(x, y + r * 0.5, r * 0.9, r * 0.36);
  if (r >= 6) {
    g.lineStyle(Math.max(1, r * 0.1), light(base, 0.55), alpha * 0.6);
    g.beginPath();
    g.arc(x, y, r * 0.8, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
  }
  g.fillStyle(0xffffff, alpha * 0.8);
  g.fillEllipse(x - r * 0.32, y - r * 0.36, r * 0.4, r * 0.24);
}

/** A ball hand: rim and a lit centre, like the fighters' own. */
function ballHand(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, base: number, alpha: number): void {
  g.fillStyle(dark(base, 0.5), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(light(base, 0.12), alpha);
  g.fillCircle(x, y - r * 0.08, r * 0.72);
  g.fillStyle(0xffffff, alpha * 0.55);
  g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.26);
}

/** Two eyes looking along `ang`. `glow` swaps the pupils for lit sockets (wizards, a raging king). */
function troopEyes(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, ang: number,
  alpha: number, glow?: number,
): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const er = r * 0.24;
  const sep = r * 0.36;
  const lx = ca * r * 0.2, ly = sa * r * 0.12;
  for (const side of [-1, 1]) {
    const ex = x + side * sep + lx;
    const ey = y + ly;
    if (glow !== undefined) {
      g.fillStyle(glow, alpha * 0.35);
      g.fillCircle(ex, ey, er * 1.7);
      g.fillStyle(glow, alpha);
      g.fillCircle(ex, ey, er * 0.85);
      g.fillStyle(0xffffff, alpha * 0.85);
      g.fillCircle(ex, ey, er * 0.4);
      continue;
    }
    g.fillStyle(0xffffff, alpha);
    g.fillCircle(ex, ey, er);
    g.fillStyle(0x16121e, alpha);
    g.fillCircle(ex + ca * er * 0.35, ey + sa * er * 0.3, er * 0.62);
  }
}

/** A chunky rounded block — the stone and timber every building is assembled from. */
function block(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  base: number, alpha: number, round = 2.5,
): void {
  const r = Math.min(round, w / 2 - 0.1, h / 2 - 0.1);
  g.fillStyle(dark(base, 0.55), alpha);
  g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, r + 1);
  g.fillStyle(base, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  // Lit top face and a shaded foot, so a block reads as a solid rather than a sticker.
  g.fillStyle(light(base, 0.28), alpha);
  g.fillRoundedRect(x + 0.5, y + 0.5, w - 1, Math.max(1, h * 0.26), Math.min(r, h * 0.12));
  g.fillStyle(dark(base, 0.18), alpha);
  g.fillRect(x + r * 0.5, y + h * 0.78, w - r, h * 0.2);
}

/** A conical roof: rim, body, a lit left face, an eave band and a glint near the point. */
function cone(
  g: Phaser.GameObjects.Graphics, cx: number, baseY: number, halfW: number, h: number,
  base: number, alpha: number,
): void {
  const top = baseY - h;
  g.fillStyle(dark(base, 0.55), alpha);
  g.fillTriangle(cx - halfW - 1.4, baseY + 1, cx + halfW + 1.4, baseY + 1, cx, top - 1.6);
  g.fillStyle(base, alpha);
  g.fillTriangle(cx - halfW, baseY, cx + halfW, baseY, cx, top);
  g.fillStyle(light(base, 0.24), alpha);
  g.fillTriangle(cx - halfW, baseY, cx - halfW * 0.15, baseY, cx, top);
  g.fillStyle(dark(base, 0.3), alpha);
  g.fillEllipse(cx, baseY, halfW * 2.1, Math.max(2, h * 0.14));
  g.fillStyle(0xffffff, alpha * 0.6);
  g.fillCircle(cx - halfW * 0.18, top + h * 0.28, Math.max(0.8, halfW * 0.12));
}

/** A banner hanging off a wall, swallow-tailed at the bottom. */
function hangingBanner(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  base: number, trim: number, alpha: number,
): void {
  g.fillStyle(dark(base, 0.5), alpha);
  g.fillPoints([
    { x: x - w / 2 - 0.8, y: y - 0.8 }, { x: x + w / 2 + 0.8, y: y - 0.8 },
    { x: x + w / 2 + 0.8, y: y + h + 0.8 }, { x, y: y + h * 0.72 }, { x: x - w / 2 - 0.8, y: y + h + 0.8 },
  ], true);
  g.fillStyle(base, alpha);
  g.fillPoints([
    { x: x - w / 2, y }, { x: x + w / 2, y }, { x: x + w / 2, y: y + h }, { x, y: y + h * 0.74 }, { x: x - w / 2, y: y + h },
  ], true);
  g.fillStyle(light(base, 0.25), alpha);
  g.fillRect(x - w / 2, y, w * 0.32, h * 0.85);
  g.fillStyle(trim, alpha);
  g.fillCircle(x, y + h * 0.36, w * 0.2);
}

/** A lit window or doorway, its warmth breathing on `t` so a living town never looks painted on. */
function glowWindow(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  t: number, seed: number, alpha: number,
): void {
  const flick = 0.8 + 0.2 * Math.sin(t * 5.3 + seed * 2.1) * Math.sin(t * 3.1 + seed);
  g.fillStyle(0x1a1008, alpha);
  g.fillRect(x - w / 2 - 0.8, y - 0.8, w + 1.6, h + 1.6);
  g.fillCircle(x, y, w / 2 + 0.8);
  g.fillStyle(CNQ.tracer, alpha * flick);
  g.fillRect(x - w / 2, y, w, h);
  g.fillCircle(x, y, w / 2);
  g.fillStyle(CNQ.muzzle, alpha * flick * 0.8);
  g.fillRect(x - w * 0.18, y, w * 0.36, h * 0.8);
}

/**
 * The town center: a keep. A curtain wall with a lit gatehouse, two corner towers and a tall
 * central tower whose roof and flag carry the town's colour — deliberately the tallest, widest
 * silhouette on the board, since it is the one thing that can never be killed.
 */
export function townCenterBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, t: number, alpha: number,
): void {
  const stone = tint(CNQ.stone);
  const stoneDk = tint(CNQ.stoneDark);
  const col = tint(color);
  groundShadow(g, x, y + s * 0.34, s * 0.92, s * 0.2, alpha);

  // Central keep, behind the curtain wall.
  const kw = s * 0.3;
  block(g, x - kw / 2, y - s * 0.22, kw, s * 0.32, mix(stone, stoneDk, 0.2), alpha, 2);
  glowWindow(g, x, y - s * 0.14, s * 0.07, s * 0.07, t, 1, alpha);
  cone(g, x, y - s * 0.21, kw * 0.62, s * 0.3, col, alpha);

  // Flag on the keep's point, with a pennant that waves in two segments.
  const poleBase = y - s * 0.5;
  const poleTop = poleBase - s * 0.13;
  g.lineStyle(2.4, dark(tint(CNQ.timberDark), 0.3), alpha);
  g.lineBetween(x, poleBase, x, poleTop);
  const w1 = Math.sin(t * 3.2) * s * 0.03;
  const w2 = Math.sin(t * 3.2 - 1.1) * s * 0.05;
  const fl = s * 0.24;
  g.fillStyle(dark(col, 0.45), alpha);
  g.fillPoints([
    { x, y: poleTop - 0.8 }, { x: x + fl * 0.5, y: poleTop + w1 - 0.8 }, { x: x + fl + 1, y: poleTop + s * 0.05 + w2 },
    { x: x + fl * 0.5, y: poleTop + s * 0.11 + w1 + 0.8 }, { x, y: poleTop + s * 0.12 + 0.8 },
  ], true);
  g.fillStyle(col, alpha);
  g.fillPoints([
    { x, y: poleTop }, { x: x + fl * 0.5, y: poleTop + w1 }, { x: x + fl, y: poleTop + s * 0.05 + w2 },
    { x: x + fl * 0.5, y: poleTop + s * 0.11 + w1 }, { x, y: poleTop + s * 0.12 },
  ], true);
  g.fillStyle(light(col, 0.3), alpha);
  g.fillTriangle(x, poleTop, x + fl * 0.5, poleTop + w1, x, poleTop + s * 0.05);
  orb(g, x, poleTop - 1.5, 2.6, tint(CNQ.gold), alpha);

  // Curtain wall with merlons along the top.
  const ww = s * 0.74;
  const wTop = y + s * 0.04;
  block(g, x - ww / 2, wTop, ww, s * 0.3, stone, alpha, 2.5);
  for (let i = 0; i < 6; i++) {
    const mx = x - ww / 2 + s * 0.04 + i * ((ww - s * 0.08 - s * 0.075) / 5);
    block(g, mx, wTop - s * 0.06, s * 0.075, s * 0.07, stone, alpha, 1.2);
  }
  // Mortar lines on the wall face.
  g.lineStyle(1, stoneDk, alpha * 0.45);
  g.lineBetween(x - ww / 2 + 3, wTop + s * 0.15, x + ww / 2 - 3, wTop + s * 0.15);
  for (let i = 0; i < 4; i++) {
    const lx = x - ww / 2 + ww * (0.15 + i * 0.24);
    g.lineBetween(lx, wTop + s * 0.15, lx, wTop + s * 0.28);
  }

  // Gatehouse: an arched doorway glowing from inside, behind a portcullis.
  const gw = s * 0.16;
  const gy = wTop + s * 0.12;
  glowWindow(g, x, gy, gw, s * 0.18, t, 3, alpha);
  g.lineStyle(1.1, tint(CNQ.ironDark), alpha * 0.9);
  for (let i = -1; i <= 1; i++) g.lineBetween(x + i * gw * 0.28, gy - gw * 0.4, x + i * gw * 0.28, gy + s * 0.18);
  g.lineBetween(x - gw / 2, gy + s * 0.06, x + gw / 2, gy + s * 0.06);

  // Banners either side of the gate.
  hangingBanner(g, x - s * 0.19, wTop + s * 0.04, s * 0.09, s * 0.17, col, tint(CNQ.gold), alpha);
  hangingBanner(g, x + s * 0.19, wTop + s * 0.04, s * 0.09, s * 0.17, col, tint(CNQ.gold), alpha);

  // Corner towers, over the wall's ends.
  for (const side of [-1, 1]) {
    const tx = x + side * s * 0.37;
    const tw = s * 0.17;
    block(g, tx - tw / 2, y - s * 0.08, tw, s * 0.43, stone, alpha, 2);
    glowWindow(g, tx, y + s * 0.02, s * 0.045, s * 0.06, t, 5 + side, alpha);
    cone(g, tx, y - s * 0.07, tw * 0.68, s * 0.2, col, alpha);
  }
}

/**
 * A barracks: a log longhouse under a hipped roof in the town colour, with a shield and crossed
 * spears over the door and a weapon rack against the wall. The broad hipped roof is the
 * silhouette read — no other building is wider than it is tall with a slope on top.
 */
export function barracksBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, alpha: number,
): void {
  const timber = tint(CNQ.timber);
  const timberDk = tint(CNQ.timberDark);
  const col = tint(color);
  const steel = tint(CNQ.steel);
  groundShadow(g, x, y + s * 0.3, s * 0.88, s * 0.18, alpha);

  // Log walls: three stacked logs, each its own rounded block, with round log-ends at the corners.
  const w = s * 0.74;
  const top = y - s * 0.04;
  const lh = s * 0.11;
  for (let i = 0; i < 3; i++) {
    block(g, x - w / 2, top + i * lh, w, lh, i % 2 === 0 ? timber : mix(timber, timberDk, 0.15), alpha, lh / 2);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ex = x + side * (w / 2 + 0.5);
      const ey = top + i * lh + lh / 2;
      g.fillStyle(dark(timber, 0.5), alpha);
      g.fillCircle(ex, ey, lh * 0.52);
      g.fillStyle(light(timber, 0.3), alpha);
      g.fillCircle(ex, ey, lh * 0.36);
      g.lineStyle(0.8, timberDk, alpha * 0.7);
      g.strokeCircle(ex, ey, lh * 0.18);
    }
  }

  // Hipped roof in the town colour, with two rows of shingles and a lit ridge.
  const eave = top + 1;
  const rw = w * 0.62;
  const ridge = top - s * 0.25;
  const roof = (c: number, grow: number): void => {
    g.fillStyle(c, alpha);
    g.fillPoints([
      { x: x - rw - grow - 4, y: eave + grow }, { x: x + rw + grow + 4, y: eave + grow },
      { x: x + rw * 0.55 + grow, y: ridge - grow }, { x: x - rw * 0.55 - grow, y: ridge - grow },
    ], true);
  };
  roof(dark(col, 0.55), 1.4);
  roof(col, 0);
  g.fillStyle(light(col, 0.22), alpha);
  g.fillPoints([
    { x: x - rw - 4, y: eave }, { x: x - rw * 0.2, y: eave },
    { x: x - rw * 0.15, y: ridge }, { x: x - rw * 0.55, y: ridge },
  ], true);
  g.lineStyle(1, dark(col, 0.35), alpha * 0.7);
  for (let i = 1; i <= 2; i++) {
    const k = i / 3;
    const ry = eave + (ridge - eave) * k;
    const half = (rw + 4) + (rw * 0.55 - rw - 4) * k;
    g.lineBetween(x - half, ry, x + half, ry);
  }
  g.fillStyle(light(col, 0.45), alpha);
  g.fillRoundedRect(x - rw * 0.55, ridge - 1.6, rw * 1.1, 3, 1.4);

  // Door: a dark arch in a timber frame.
  const dw = s * 0.15;
  const dy = top + lh * 0.9;
  g.fillStyle(dark(timber, 0.55), alpha);
  g.fillRoundedRect(x - dw / 2 - 1.2, dy - 1.2, dw + 2.4, s * 0.25 + 1.2, { tl: dw / 2 + 1, tr: dw / 2 + 1, bl: 0, br: 0 });
  g.fillStyle(0x1a1008, alpha);
  g.fillRoundedRect(x - dw / 2, dy, dw, s * 0.24, { tl: dw / 2, tr: dw / 2, bl: 0, br: 0 });
  g.lineStyle(0.9, timberDk, alpha * 0.8);
  g.lineBetween(x, dy + 1, x, dy + s * 0.24);

  // Crossed spears and a round shield on the eave over the door — "this makes soldiers".
  const sy = eave - s * 0.08;
  for (const side of [-1, 1]) {
    const x0 = x - side * s * 0.13, y0 = sy + s * 0.06;
    const x1 = x + side * s * 0.13, y1 = sy - s * 0.08;
    g.lineStyle(2.2, dark(timberDk, 0.3), alpha);
    g.lineBetween(x0, y0, x1, y1);
    g.lineStyle(1.1, timber, alpha);
    g.lineBetween(x0, y0, x1, y1);
    g.fillStyle(dark(steel, 0.45), alpha);
    g.fillTriangle(x1 + side * 3.6, y1 - 3, x1 - 2, y1 - 0.4, x1 + side * 0.4, y1 + 2.4);
    g.fillStyle(steel, alpha);
    g.fillTriangle(x1 + side * 3, y1 - 2.4, x1 - 1.2, y1 - 0.2, x1 + side * 0.4, y1 + 1.6);
  }
  orb(g, x, sy, s * 0.075, steel, alpha);
  g.fillStyle(col, alpha);
  g.fillCircle(x, sy + 0.3, s * 0.035);

  // A weapon rack against the right wall: two spear points over the eave line.
  for (let i = 0; i < 2; i++) {
    const rx = x + w * 0.3 + i * 3.6;
    g.lineStyle(1.6, dark(timberDk, 0.3), alpha);
    g.lineBetween(rx, top + lh * 2.4, rx + 1.2, top - s * 0.06);
    g.fillStyle(steel, alpha);
    g.fillTriangle(rx - 1.5, top - s * 0.05, rx + 3.2, top - s * 0.05, rx + 1.4, top - s * 0.12);
  }
}

/**
 * A turret: a stone drum with a crenellated top and a gun-orb in the town colour riding it, the
 * barrel aimed where it is about to shoot. `ang` is live, so a player can see which of their
 * turrets has acquired something, and `recoil` (0–1) kicks the barrel back along its own axis.
 */
export function turretBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, ang: number, recoil: number, alpha: number,
): void {
  const stone = tint(CNQ.stone);
  const stoneDk = tint(CNQ.stoneDark);
  const col = tint(color);
  const iron = tint(CNQ.iron);
  const ironDk = tint(CNQ.ironDark);
  const r = s * 0.29;
  const topY = y - s * 0.02;
  const footY = y + s * 0.18;
  groundShadow(g, x, footY + s * 0.04, r * 2.5, s * 0.16, alpha);

  // The drum: a rimmed cylinder — side wall, then the lit top face as an ellipse.
  g.fillStyle(dark(stone, 0.55), alpha);
  g.fillEllipse(x, footY, r * 2 + 2.4, r * 0.9 + 2.4);
  g.fillRect(x - r - 1.2, topY, r * 2 + 2.4, footY - topY);
  g.fillStyle(mix(stone, stoneDk, 0.3), alpha);
  g.fillEllipse(x, footY, r * 2, r * 0.9);
  g.fillRect(x - r, topY, r * 2, footY - topY);
  g.fillStyle(light(stone, 0.12), alpha);
  g.fillRect(x - r * 0.75, topY, r * 0.5, footY - topY + r * 0.3);
  g.lineStyle(1, stoneDk, alpha * 0.5);
  g.lineBetween(x - r, topY + (footY - topY) * 0.5, x + r, topY + (footY - topY) * 0.5);
  g.lineBetween(x - r * 0.3, topY + (footY - topY) * 0.5, x - r * 0.3, footY + r * 0.3);
  g.lineBetween(x + r * 0.45, topY, x + r * 0.45, topY + (footY - topY) * 0.5);
  g.fillStyle(dark(stone, 0.5), alpha);
  g.fillEllipse(x, topY, r * 2 + 2.4, r * 0.9 + 2.4);
  g.fillStyle(light(stone, 0.2), alpha);
  g.fillEllipse(x, topY, r * 2, r * 0.9);
  g.fillStyle(dark(stone, 0.25), alpha);
  g.fillEllipse(x, topY + 0.8, r * 1.5, r * 0.6);

  // Merlons round the rim — the back half first, the head over them, the front half last.
  const merlon = (a: number): void => {
    const mx = x + Math.cos(a) * r * 0.92;
    const my = topY + Math.sin(a) * r * 0.42;
    block(g, mx - 2.6, my - 4.4, 5.2, 5, stone, alpha, 1.2);
  };
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + 0.2;
    if (Math.sin(a) < 0) merlon(a);
  }

  // The gun: a barrel off an orb mount. Behind the orb when it is aimed up the screen.
  const hy = topY - s * 0.06;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const back = -recoil * 4;
  const bx = x + ca * back, by = hy + sa * back;
  const bl = s * 0.38;
  const barrel = (): void => {
    const ex = bx + ca * bl, ey = by + sa * bl;
    g.lineStyle(7.4, dark(ironDk, 0.4), alpha);
    g.lineBetween(bx, by, ex, ey);
    g.lineStyle(5, ironDk, alpha);
    g.lineBetween(bx, by, ex, ey);
    g.lineStyle(1.6, light(iron, 0.3), alpha * 0.8);
    g.lineBetween(bx - sa * 1.2, by + ca * 1.2 - 1, ex - sa * 1.2, ey + ca * 1.2 - 1);
    // Reinforcing band and the muzzle ring.
    const mbx = bx + ca * bl * 0.55, mby = by + sa * bl * 0.55;
    g.fillStyle(iron, alpha);
    g.fillCircle(mbx, mby, 3.2);
    g.fillStyle(dark(ironDk, 0.4), alpha);
    g.fillCircle(ex, ey, 4.2);
    g.fillStyle(iron, alpha);
    g.fillCircle(ex, ey, 3.4);
    g.fillStyle(0x0c0a10, alpha);
    g.fillCircle(ex + ca * 0.6, ey + sa * 0.6, 1.9);
  };
  if (sa < 0) barrel();
  orb(g, x, hy, s * 0.15, col, alpha);
  // A gunsight lens on the orb, glowing toward the target — the "it has seen you" tell.
  const lx = x + ca * s * 0.07, ly = hy + sa * s * 0.05 - 1;
  g.fillStyle(tint(CNQ.ember), alpha * 0.4);
  g.fillCircle(lx, ly, 3);
  g.fillStyle(tint(CNQ.emberCore), alpha);
  g.fillCircle(lx, ly, 1.5);
  if (sa >= 0) barrel();

  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU + 0.2;
    if (Math.sin(a) >= 0) merlon(a);
  }
}

/**
 * A barricade: two courses of chunky rounded stones under a town-coloured cloth draped along the
 * top. Deliberately the lowest silhouette, because it is the one you are meant to build *next to*
 * things rather than look at. Spiked Walls plants iron stakes along the crown — the one upgrade
 * that changes the outline.
 */
export function barricadeBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, spiked: boolean, alpha: number,
): void {
  const stone = tint(CNQ.stone);
  const stoneDk = tint(CNQ.stoneDark);
  const col = tint(color);
  const w = s * 0.82;
  const rh = s * 0.14;
  const top = y - s * 0.06;
  groundShadow(g, x, top + rh * 2 + 2, w * 1.05, s * 0.16, alpha);

  if (spiked) {
    // Stakes behind the cloth, so they read as driven into the wall's crown.
    const iron = tint(CNQ.iron);
    for (let i = 0; i < 5; i++) {
      const sx = x - w * 0.4 + (i * w * 0.8) / 4;
      const lean = (i - 2) * 1.1;
      const tipX = sx + lean, tipY = top - s * 0.17;
      g.fillStyle(dark(iron, 0.55), alpha);
      g.fillTriangle(sx - 3.4, top + 1, sx + 3.4, top + 1, tipX, tipY - 1.6);
      g.fillStyle(iron, alpha);
      g.fillTriangle(sx - 2.4, top, sx + 2.4, top, tipX, tipY);
      g.fillStyle(light(iron, 0.4), alpha);
      g.fillTriangle(sx - 2.4, top, sx - 0.4, top, tipX, tipY);
      g.fillStyle(tint(CNQ.blood), alpha * 0.85);
      g.fillTriangle(tipX - 1.1, tipY + 4, tipX + 1.1, tipY + 4, tipX, tipY);
    }
  }

  // Two staggered courses of stones.
  const course = (row: number, n: number, off: number): void => {
    const cw = w / n;
    for (let c = 0; c < n; c++) {
      const bx = x - w / 2 + off + c * cw;
      const bw = Math.min(cw - 1.6, x + w / 2 - bx);
      if (bw < 4) continue;
      const tone = jitter(row * 7 + c, 3) < 0.5 ? stone : mix(stone, stoneDk, 0.22);
      block(g, bx + 0.8, top + row * rh + 0.8, bw, rh - 1.6, tone, alpha, 3);
    }
  };
  course(1, 4, 0);
  course(0, 4, w / 8);
  block(g, x - w / 2 + 0.8, top + 0.8, w / 8 - 1.6, rh - 1.6, mix(stone, stoneDk, 0.12), alpha, 2.5);

  // The cloth: a band along the top with three scalloped drops in the town colour.
  const cy = top - 2;
  const drops = 3;
  const dw = w * 0.9 / drops;
  g.fillStyle(dark(col, 0.5), alpha);
  g.fillRoundedRect(x - w * 0.47 - 1, cy - 1, w * 0.94 + 2, 5, 2.4);
  for (let i = 0; i < drops; i++) {
    g.fillEllipse(x - w * 0.45 + dw * (i + 0.5), cy + 4, dw + 1.6, s * 0.12 + 1.6);
  }
  g.fillStyle(col, alpha);
  for (let i = 0; i < drops; i++) {
    g.fillEllipse(x - w * 0.45 + dw * (i + 0.5), cy + 4, dw, s * 0.12);
  }
  g.fillRoundedRect(x - w * 0.47, cy, w * 0.94, 4, 2);
  g.fillStyle(light(col, 0.3), alpha);
  g.fillRoundedRect(x - w * 0.47, cy, w * 0.94, 1.6, 0.8);
  g.fillStyle(tint(CNQ.gold), alpha);
  for (let i = 0; i < drops; i++) g.fillCircle(x - w * 0.45 + dw * (i + 0.5), cy + 5.4, 1.5);
}

/**
 * A market: a striped awning over a counter of crates, with a coin sign swinging off its post and
 * a lantern under the eave.
 *
 * The silhouette rule again — it is the only building with a *scalloped* top edge, so a stall
 * never reads as a barracks' roof or a barricade's flat coping at a glance. Two things on it are
 * live: a vault with money in it grows a strongbox on the counter with the coin stack rising out of
 * it, and a stall running Propaganda wears a speaking-trumpet over the post.
 */
export function marketBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number,
  o: { vault: number; propaganda: boolean; t: number },
  alpha: number,
): void {
  const timber = tint(CNQ.timber);
  const timberDk = tint(CNQ.timberDark);
  const col = tint(color);
  const parch = tint(CNQ.parchment);
  const gold = tint(CNQ.gold);
  const w = s * 0.8;
  const counterY = y + s * 0.2;
  const awningY = y - s * 0.12;
  groundShadow(g, x, counterY + s * 0.1, w * 1.05, s * 0.16, alpha);

  // Posts.
  for (const side of [-1, 1]) {
    const px = x + side * w * 0.44;
    g.lineStyle(4, dark(timberDk, 0.35), alpha);
    g.lineBetween(px, awningY, px, counterY + s * 0.1);
    g.lineStyle(2.2, timber, alpha);
    g.lineBetween(px, awningY, px, counterY + s * 0.1);
  }

  // Crates of produce behind the counter, each topped with fruit.
  const produce = [tint(CNQ.blood), gold, tint(CNQ.mend)];
  for (let i = 0; i < 3; i++) {
    const cw = s * 0.16;
    const cx = x - w * 0.3 + i * cw * 1.3;
    const top = counterY - s * 0.05 - cw * 0.7;
    for (let k = 0; k < 3; k++) orb(g, cx - cw * 0.26 + k * cw * 0.26, top - 0.5, cw * 0.17, produce[i], alpha);
    block(g, cx - cw / 2, top, cw, cw * 0.72, i % 2 === 0 ? timber : mix(timber, timberDk, 0.25), alpha, 1.5);
    g.lineStyle(0.9, timberDk, alpha * 0.7);
    g.lineBetween(cx - cw / 2 + 1, top + cw * 0.38, cx + cw / 2 - 1, top + cw * 0.38);
  }
  // Counter plank.
  block(g, x - w * 0.5, counterY - s * 0.05, w, s * 0.11, timber, alpha, 2);

  // The awning: five scallops alternating town colour and parchment, with a rimmed edge.
  const bays = 5;
  const bw = w * 1.06 / bays;
  const aTop = awningY - s * 0.14;
  g.fillStyle(dark(col, 0.55), alpha);
  g.fillRoundedRect(x - w * 0.53 - 1.2, aTop - 1.2, w * 1.06 + 2.4, s * 0.14 + 2, 2);
  for (let i = 0; i < bays; i++) g.fillEllipse(x - w * 0.53 + i * bw + bw / 2, awningY, bw + 2.2, bw * 0.9 + 2.2);
  for (let i = 0; i < bays; i++) {
    const bx = x - w * 0.53 + i * bw;
    const c = i % 2 === 0 ? col : parch;
    g.fillStyle(c, alpha);
    g.fillRect(bx, aTop, bw, s * 0.14);
    // The scallop under each bay — a whole ellipse, whose top half lands inside its own bay.
    g.fillEllipse(bx + bw / 2, awningY, bw, bw * 0.9);
    g.fillStyle(light(c, 0.3), alpha);
    g.fillRect(bx, aTop, bw, s * 0.035);
  }

  // A lantern hung under the eave.
  const lx = x - w * 0.22, ly = awningY + s * 0.1;
  const flick = 0.8 + 0.2 * Math.sin(o.t * 6.1) * Math.sin(o.t * 2.3);
  g.lineStyle(1, timberDk, alpha);
  g.lineBetween(lx, awningY + 2, lx, ly - 3);
  g.fillStyle(tint(CNQ.tracer), alpha * 0.25 * flick);
  g.fillCircle(lx, ly, 7);
  g.fillStyle(dark(timberDk, 0.3), alpha);
  g.fillRoundedRect(lx - 2.8, ly - 3.6, 5.6, 7, 1.6);
  g.fillStyle(tint(CNQ.muzzle), alpha * flick);
  g.fillRoundedRect(lx - 1.8, ly - 2.6, 3.6, 5, 1.2);

  // The sign: a gold coin swinging on a bracket — the whole read of "this building is money".
  const sy = aTop - s * 0.04;
  const swing = Math.sin(o.t * 1.8) * 0.25;
  g.lineStyle(1.6, dark(timberDk, 0.3), alpha);
  g.lineBetween(x, aTop, x, sy);
  g.lineBetween(x - s * 0.08, sy, x + s * 0.08, sy);
  const cx = x + Math.sin(swing) * s * 0.1, cy = sy + Math.cos(swing) * s * 0.1;
  g.lineStyle(0.9, timberDk, alpha);
  g.lineBetween(x, sy, cx, cy - s * 0.06);
  orb(g, cx, cy, s * 0.085, gold, alpha);
  g.lineStyle(1.2, tint(CNQ.goldDeep), alpha * 0.9);
  g.strokeCircle(cx, cy + 0.4, s * 0.045);

  // Securities: a strongbox on the counter, the stack standing as high as the vault is full.
  if (o.vault > 0) {
    const fill = Phaser.Math.Clamp(o.vault / 200, 0, 1);
    const boxW = s * 0.26;
    const boxY = counterY - s * 0.05;
    const bx = x + w * 0.12;
    block(g, bx, boxY - s * 0.12, boxW, s * 0.12, tint(CNQ.ironDark), alpha, 1.5);
    g.fillStyle(gold, alpha);
    g.fillRect(bx + boxW / 2 - 1.2, boxY - s * 0.09, 2.4, 3);
    for (let i = 0; i < Math.max(1, Math.round(fill * 4)); i++) {
      const ey = boxY - s * 0.13 - i * s * 0.045;
      g.fillStyle(tint(CNQ.goldDeep), alpha);
      g.fillEllipse(bx + boxW / 2, ey + 1, s * 0.17, s * 0.055);
      g.fillStyle(gold, alpha);
      g.fillEllipse(bx + boxW / 2, ey, s * 0.16, s * 0.045);
      g.fillStyle(0xffffff, alpha * 0.5);
      g.fillEllipse(bx + boxW / 2 - s * 0.03, ey - 0.4, s * 0.05, s * 0.015);
    }
  }

  // Propaganda Central: a speaking trumpet lashed to the post, calling on its own beat.
  if (o.propaganda) {
    const pulse = 0.6 + 0.4 * Math.sin(o.t * 6);
    const hx = x - w * 0.44;
    const hy = awningY - s * 0.08;
    const crim = tint(CNQ.crimson);
    g.fillStyle(dark(crim, 0.5), alpha);
    g.fillTriangle(hx + 1, hy, hx - s * 0.21, hy - s * 0.1, hx - s * 0.21, hy + s * 0.1);
    g.fillStyle(crim, alpha);
    g.fillTriangle(hx, hy, hx - s * 0.2, hy - s * 0.085, hx - s * 0.2, hy + s * 0.085);
    g.fillStyle(light(crim, 0.3), alpha);
    g.fillTriangle(hx, hy, hx - s * 0.2, hy - s * 0.085, hx - s * 0.2, hy - s * 0.02);
    g.fillStyle(gold, alpha * 0.9);
    g.fillCircle(hx, hy, s * 0.03);
    for (let i = 1; i <= 2; i++) {
      g.lineStyle(1.6, crim, alpha * pulse * (0.7 / i));
      g.beginPath();
      g.arc(hx - s * 0.2, hy, s * (0.08 + i * 0.08), Math.PI * 0.7, Math.PI * 1.3);
      g.strokePath();
    }
  }
}

// ── Troops ────────────────────────────────────────────────────────────────

type TroopHat = 'helm' | 'wizard' | 'crown';
type TroopWeapon = 'spear' | 'staff' | 'axe';
interface TroopLook {
  hat: TroopHat;
  weapon: TroopWeapon;
  /** Lit eye colour; plain pupils when absent. */
  eyeGlow?: number;
  /** Staff-orb colour (wizards) — arcane, or ember once the Academy has burned. */
  magic?: number;
  magicCore?: number;
  /** Drawn behind the body: the king's cape. */
  cape?: boolean;
}

/**
 * The one rig every soldier is built on — a miniature of the fighters themselves: an orb body in
 * the town colour, two eyes that look where it is about to strike, and two ball hands, one of them
 * holding the weapon out along `ang`. Rank is a hat and a weapon on top of that, never a new body,
 * so a promoted soldier still reads as *that soldier, changed*.
 */
function troopRig(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number,
  color: number, ang: number, march: number, s: number, alpha: number,
  look: TroopLook,
): void {
  const r = 4.7 * s;
  const bob = Math.abs(Math.sin(march)) * -1.4 * s;
  const cy = y + bob - s;
  const body = tint(color);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  groundShadow(g, x, y + 4.6 * s, 10 * s, 3.2 * s, alpha);

  if (look.cape) {
    const blood = tint(CNQ.blood);
    const sway = Math.sin(march * 0.8) * 2 * s;
    const pts = [
      { x: x - r * 0.9, y: cy - r * 0.2 }, { x: x + r * 0.9, y: cy - r * 0.2 },
      { x: x + r * 1.2 + sway, y: cy + r * 1.15 }, { x: x + r * 0.4 + sway, y: cy + r * 1.35 },
      { x: x - r * 0.4 + sway, y: cy + r * 1.2 }, { x: x - r * 1.2 + sway, y: cy + r * 1.35 },
    ];
    g.fillStyle(dark(blood, 0.5), alpha);
    g.fillPoints(pts.map((p) => ({ x: p.x + (p.x < x ? -1 : 1), y: p.y + 1 })), true);
    g.fillStyle(blood, alpha);
    g.fillPoints(pts, true);
    g.fillStyle(light(blood, 0.2), alpha);
    g.fillTriangle(pts[0].x, pts[0].y, x - r * 0.3, cy - r * 0.2, pts[5].x, pts[5].y);
  }

  // The weapon hand sits on the facing side; the other swings with the march.
  const hx = x + ca * r * 1.05, hy = cy + sa * r * 0.6 + r * 0.3;
  const ox = x - ca * r * 0.95, oy = cy + r * 0.5 + Math.sin(march + Math.PI) * 0.7 * s;
  const weaponBehind = sa < -0.25;

  const weapon = (): void => {
    if (look.weapon === 'spear') {
      const bx = hx - ca * 3.5 * s, by = hy - sa * 3.5 * s + 1.5 * s;
      const tx = hx + ca * 8 * s, ty = hy + sa * 8 * s - 2.6 * s;
      g.lineStyle(2.4 * s, dark(tint(CNQ.timberDark), 0.3), alpha);
      g.lineBetween(bx, by, tx, ty);
      g.lineStyle(1.2 * s, tint(CNQ.timber), alpha);
      g.lineBetween(bx, by, tx, ty);
      const da = Math.atan2(ty - by, tx - bx);
      const dc = Math.cos(da), ds = Math.sin(da);
      const px = -ds, py = dc;
      const steel = tint(CNQ.steel);
      g.fillStyle(dark(steel, 0.5), alpha);
      g.fillTriangle(tx + dc * 4.6 * s, ty + ds * 4.6 * s, tx + px * 2 * s - dc * s, ty + py * 2 * s - ds * s, tx - px * 2 * s - dc * s, ty - py * 2 * s - ds * s);
      g.fillStyle(steel, alpha);
      g.fillTriangle(tx + dc * 3.8 * s, ty + ds * 3.8 * s, tx + px * 1.3 * s, ty + py * 1.3 * s, tx - px * 1.3 * s, ty - py * 1.3 * s);
    } else if (look.weapon === 'staff') {
      const top = { x: hx + ca * 1.5 * s, y: hy - 8 * s };
      g.lineStyle(2.4 * s, dark(tint(CNQ.timberDark), 0.3), alpha);
      g.lineBetween(hx - ca * s, hy + 3 * s, top.x, top.y);
      g.lineStyle(1.2 * s, tint(CNQ.timber), alpha);
      g.lineBetween(hx - ca * s, hy + 3 * s, top.x, top.y);
      const pulse = 0.7 + 0.3 * Math.sin(march * 2.2);
      const m = look.magic ?? tint(CNQ.arcane);
      g.fillStyle(m, alpha * 0.22 * pulse);
      g.fillCircle(top.x, top.y - 1.5 * s, 6.5 * s);
      g.fillStyle(m, alpha * 0.4 * pulse);
      g.fillCircle(top.x, top.y - 1.5 * s, 4.2 * s);
      orb(g, top.x, top.y - 1.5 * s, 2.6 * s, m, alpha);
      g.fillStyle(look.magicCore ?? 0xffffff, alpha * 0.9);
      g.fillCircle(top.x, top.y - 1.5 * s, 0.9 * s);
    } else {
      // A bearded axe, haft along the facing, the crescent head on the far side of the hand.
      const tx = hx + ca * 6 * s, ty = hy + sa * 6 * s - 3 * s;
      g.lineStyle(2.4 * s, dark(tint(CNQ.timberDark), 0.3), alpha);
      g.lineBetween(hx - ca * 2 * s, hy + s, tx, ty);
      g.lineStyle(1.2 * s, tint(CNQ.timber), alpha);
      g.lineBetween(hx - ca * 2 * s, hy + s, tx, ty);
      const da = Math.atan2(ty - hy, tx - hx);
      const px = -Math.sin(da), py = Math.cos(da);
      const flip = ca >= 0 ? -1 : 1;
      const steel = tint(CNQ.steel);
      const head = (grow: number, c: number): void => {
        g.fillStyle(c, alpha);
        g.fillPoints([
          { x: tx - Math.cos(da) * (1.6 * s + grow), y: ty - Math.sin(da) * (1.6 * s + grow) },
          { x: tx + px * flip * (4.6 * s + grow) - Math.cos(da) * 3 * s, y: ty + py * flip * (4.6 * s + grow) - Math.sin(da) * 3 * s },
          { x: tx + px * flip * (5.2 * s + grow), y: ty + py * flip * (5.2 * s + grow) },
          { x: tx + px * flip * (4.6 * s + grow) + Math.cos(da) * 3 * s, y: ty + py * flip * (4.6 * s + grow) + Math.sin(da) * 3 * s },
          { x: tx + Math.cos(da) * (1.6 * s + grow), y: ty + Math.sin(da) * (1.6 * s + grow) },
        ], true);
      };
      head(0.8, dark(steel, 0.5));
      head(0, steel);
    }
  };

  if (weaponBehind) weapon();
  ballHand(g, ox, oy, r * 0.36, body, alpha);
  orb(g, x, cy, r, body, alpha);
  troopEyes(g, x, cy + r * 0.12, r, ang, alpha, look.eyeGlow);

  if (look.hat === 'helm') {
    // A kettle helm: steel dome, wide brim, and a crest stripe in the town colour.
    const steel = tint(CNQ.steel);
    const hy0 = cy - r * 0.2;
    g.fillStyle(dark(steel, 0.5), alpha);
    g.fillEllipse(x, hy0, r * 2.35, r * 0.62);
    g.beginPath();
    g.arc(x, hy0, r * 0.84, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(steel, alpha);
    g.fillEllipse(x, hy0, r * 2.1, r * 0.42);
    g.beginPath();
    g.arc(x, hy0 - 0.3, r * 0.72, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(light(body, 0.15), alpha);
    g.fillRect(x - r * 0.12, hy0 - r * 0.78, r * 0.24, r * 0.6);
    g.fillStyle(0xffffff, alpha * 0.7);
    g.fillEllipse(x - r * 0.35, hy0 - r * 0.4, r * 0.3, r * 0.18);
  } else if (look.hat === 'wizard') {
    // A pointed hat with a bent tip, a band of trim and a star on the band.
    const deep = tint(CNQ.arcaneDeep);
    const m = look.magic ?? tint(CNQ.arcane);
    const by = cy - r * 0.32;
    const lean = ca * r * 0.4;
    const pts = [
      { x: x - r * 0.78, y: by }, { x: x + r * 0.78, y: by },
      { x: x + r * 0.32 + lean * 0.5, y: by - r * 1.3 },
      { x: x + r * 0.9 + lean, y: by - r * 2.1 },
      { x: x - r * 0.1 + lean * 0.5, y: by - r * 1.25 },
    ];
    g.fillStyle(dark(deep, 0.5), alpha);
    g.fillEllipse(x, by, r * 2.5, r * 0.7);
    g.fillPoints(pts.map((p) => ({ x: p.x + (p.x < x ? -0.8 : 0.8), y: p.y - 0.6 })), true);
    g.fillStyle(deep, alpha);
    g.fillEllipse(x, by, r * 2.3, r * 0.52);
    g.fillPoints(pts, true);
    g.fillStyle(light(deep, 0.25), alpha);
    g.fillTriangle(pts[0].x, pts[0].y, x - r * 0.1, by, pts[4].x, pts[4].y);
    g.fillStyle(m, alpha);
    g.fillRect(x - r * 0.72, by - r * 0.32, r * 1.44, r * 0.26);
    g.fillStyle(look.magicCore ?? 0xffffff, alpha);
    g.fillCircle(pts[3].x, pts[3].y, Math.max(0.8, r * 0.14));
  } else {
    // A gold crown with two curled horns — the king is the only troop with a crown.
    const gold = tint(CNQ.gold);
    const horn = tint(CNQ.parchment);
    const cy0 = cy - r * 0.55;
    for (const side of [-1, 1]) {
      const base = { x: x + side * r * 0.62, y: cy0 };
      const tip = { x: x + side * r * 1.25, y: cy0 - r * 0.95 };
      g.fillStyle(dark(horn, 0.5), alpha);
      g.fillTriangle(base.x - side * 1.6, base.y + 1, base.x + side * 2.6, base.y + 0.6, tip.x + side, tip.y - 1);
      g.fillStyle(horn, alpha);
      g.fillTriangle(base.x - side * 1, base.y, base.x + side * 1.8, base.y, tip.x, tip.y);
    }
    g.fillStyle(dark(gold, 0.5), alpha);
    g.fillRect(x - r * 0.62 - 1, cy0 - r * 0.24 - 1, r * 1.24 + 2, r * 0.36 + 2);
    for (let i = -1; i <= 1; i++) {
      g.fillTriangle(x + i * r * 0.4 - r * 0.24, cy0 - r * 0.2, x + i * r * 0.4 + r * 0.24, cy0 - r * 0.2, x + i * r * 0.4, cy0 - r * (i === 0 ? 0.82 : 0.6));
    }
    g.fillStyle(gold, alpha);
    g.fillRect(x - r * 0.62, cy0 - r * 0.24, r * 1.24, r * 0.36);
    for (let i = -1; i <= 1; i++) {
      g.fillTriangle(x + i * r * 0.4 - r * 0.18, cy0 - r * 0.2, x + i * r * 0.4 + r * 0.18, cy0 - r * 0.2, x + i * r * 0.4, cy0 - r * (i === 0 ? 0.72 : 0.52));
    }
    g.fillStyle(light(gold, 0.4), alpha);
    g.fillRect(x - r * 0.62, cy0 - r * 0.24, r * 1.24, r * 0.1);
    g.fillStyle(body, alpha);
    g.fillCircle(x, cy0 - r * 0.06, r * 0.13);
  }

  if (!weaponBehind) weapon();
  ballHand(g, hx, hy, r * 0.36, body, alpha);
}

/**
 * One soldier. Small enough that five of them fit in a 64px square without becoming a blob,
 * which is the whole constraint. `march` is a free-running phase so a stack never steps in
 * lockstep.
 */
export function soldier(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number,
  color: number, ang: number, march: number, scale: number, alpha: number,
): void {
  troopRig(g, tint, x, y, color, ang, march, scale, alpha, { hat: 'helm', weapon: 'spear' });
}

/**
 * The Barbarian King. The soldier's rig at twice the size, crowned and horned, caped, swinging an
 * axe — and, once he has drunk, wreathed in a flickering red aura with eyes lit to match, since a
 * doubled attack speed is otherwise invisible.
 */
export function barbarianKing(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number,
  color: number, ang: number, march: number, enraged: boolean, alpha: number,
): void {
  const blood = tint(CNQ.blood);
  if (enraged) {
    const pulse = 0.7 + 0.3 * Math.sin(march * 3);
    g.fillStyle(blood, alpha * 0.16 * pulse);
    g.fillCircle(x, y - 4, 24);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + march * 0.6;
      const reach = 17 + Math.sin(march * 5 + i * 2.3) * 4;
      g.fillStyle(i % 2 === 0 ? blood : tint(CNQ.ember), alpha * 0.45 * pulse);
      g.fillTriangle(
        x + Math.cos(a - 0.22) * 11, y - 4 + Math.sin(a - 0.22) * 11,
        x + Math.cos(a + 0.22) * 11, y - 4 + Math.sin(a + 0.22) * 11,
        x + Math.cos(a) * reach, y - 4 + Math.sin(a) * reach,
      );
    }
  }
  troopRig(g, tint, x, y, color, ang, march, 2.1, alpha, {
    hat: 'crown', weapon: 'axe', cape: true,
    eyeGlow: enraged ? tint(CNQ.ember) : undefined,
  });
}

/**
 * A wizard — a soldier the Wizard School has promoted. Same rig, same size, same bob, same body
 * colour; what is new is a pointed hat, lit eyes and a staff whose glowing orb is the only thing
 * at three squares' distance that says this one outranges everything else on the board. Academy
 * of Ash turns the arcane trim to embers.
 */
export function wizardTroop(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number,
  color: number, ang: number, march: number, ashen: boolean, alpha: number,
): void {
  const magic = tint(ashen ? CNQ.ember : CNQ.arcane);
  const core = tint(ashen ? CNQ.emberCore : CNQ.parchment);
  troopRig(g, tint, x, y, color, ang, march, 1, alpha, {
    hat: 'wizard', weapon: 'staff', eyeGlow: magic, magic, magicCore: core,
  });
}

/**
 * The Wizard Tower's fireball, sitting over its town center waiting to be dragged. Drawn as a
 * held charge rather than a projectile — it hovers, it breathes, and it trails a wisp — because
 * the player has to notice it is *ready* from across the board without it looking like something
 * already flying at them.
 */
export function fireballOrb(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, t: number, scale: number, alpha: number,
): void {
  const s = scale;
  const breathe = 1 + Math.sin(t * 3.4) * 0.09;
  // Outer corona.
  g.fillStyle(tint(CNQ.ember), alpha * 0.22);
  g.fillCircle(x, y, 13 * s * breathe);
  g.fillStyle(tint(CNQ.ember), alpha * 0.5);
  g.fillCircle(x, y, 8 * s * breathe);
  // Licking tongues around the rim, each on its own phase.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + t * 1.7;
    const reach = (9 + Math.sin(t * 6 + i * 1.9) * 3.4) * s;
    g.fillStyle(tint(CNQ.ember), alpha * 0.7);
    g.fillTriangle(
      x + Math.cos(a) * 5 * s, y + Math.sin(a) * 5 * s,
      x + Math.cos(a + 0.5) * 5 * s, y + Math.sin(a + 0.5) * 5 * s,
      x + Math.cos(a + 0.25) * reach, y + Math.sin(a + 0.25) * reach,
    );
  }
  // Core.
  g.fillStyle(tint(CNQ.emberCore), alpha * 0.95);
  g.fillCircle(x, y, 4.2 * s);
  g.fillStyle(tint(CNQ.parchment), alpha * 0.8);
  g.fillCircle(x - 1.2 * s, y - 1.4 * s, 1.7 * s);
}

/**
 * The Boom Back bomb in flight — a cast-iron sphere with a lit fuse, spinning as it goes. Kept
 * deliberately unlike a bullet: it is slower, it arcs, and it is the one turret output the player
 * is meant to be able to run away from.
 */
export function revengeBomb(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, spin: number, alpha: number,
): void {
  groundShadow(g, x, y + 8, 10, 3, alpha * 0.7);
  orb(g, x, y, 6, tint(CNQ.ironDark), alpha);
  // An iron band round the middle, turning with the spin.
  g.lineStyle(1.4, tint(CNQ.iron), alpha * 0.8);
  g.beginPath();
  g.arc(x, y, 4.6, spin, spin + Math.PI * 0.9);
  g.strokePath();
  // Fuse, whipping behind the spin, with a spark on the end.
  const fa = spin;
  const fx = x + Math.cos(fa) * 9, fy = y + Math.sin(fa) * 9;
  g.lineStyle(1.6, tint(CNQ.timberDark), alpha * 0.9);
  g.lineBetween(x + Math.cos(fa) * 5, y + Math.sin(fa) * 5, fx, fy);
  g.fillStyle(tint(CNQ.ember), alpha * 0.4);
  g.fillCircle(fx, fy, 4.4);
  g.fillStyle(tint(CNQ.emberCore), alpha);
  g.fillCircle(fx, fy, 2 + Math.sin(spin * 9) * 0.6);
  for (let i = 0; i < 3; i++) {
    const a = spin * 3 + i * 2.1;
    g.fillStyle(tint(CNQ.muzzle), alpha * 0.8);
    g.fillCircle(fx + Math.cos(a) * 3.4, fy + Math.sin(a) * 3.4, 0.8);
  }
}

/**
 * A turret round in flight: a tapered tracer streak out of the back of the shot and a lit slug
 * at its head. A Headhunter round is red and fatter, so a lethal turret announces itself.
 */
export function turretShot(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, vx: number, vy: number, head: boolean, alpha: number,
): void {
  const sp = Math.hypot(vx, vy) || 1;
  const ux = vx / sp, uy = vy / sp;
  const px = -uy, py = ux;
  const len = head ? 16 : 13;
  const w = head ? 2.6 : 2;
  const c = tint(head ? CNQ.blood : CNQ.tracer);
  g.fillStyle(c, alpha * 0.45);
  g.fillTriangle(x + px * w, y + py * w, x - px * w, y - py * w, x - ux * len, y - uy * len);
  g.fillStyle(tint(CNQ.muzzle), alpha * 0.7);
  g.fillTriangle(x + px * w * 0.5, y + py * w * 0.5, x - px * w * 0.5, y - py * w * 0.5, x - ux * len * 0.6, y - uy * len * 0.6);
  g.fillStyle(c, alpha * 0.3);
  g.fillCircle(x, y, w * 2.2);
  g.fillStyle(dark(c, 0.4), alpha);
  g.fillCircle(x, y, w * 1.3);
  g.fillStyle(light(c, 0.5), alpha);
  g.fillCircle(x, y, w * 0.9);
}

/**
 * The tether between a commander and their Personal Wall. A chain rather than a beam: the link
 * is a *contract* — hits travel down it — and a chain is the one line shape nobody reads as a
 * projectile in flight.
 */
export function linkChain(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x0: number, y0: number, x1: number, y1: number,
  color: number, t: number, shielded: boolean, alpha: number,
): void {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const links = Math.max(3, Math.min(18, Math.round(len / 16)));
  const px = -dy / len, py = dx / len;
  for (let i = 0; i <= links; i++) {
    const s = i / links;
    // A slack sag in the middle, breathing so a live link never looks like a static decal.
    const sag = Math.sin(s * Math.PI) * (6 + Math.sin(t * 2.6) * 2);
    const lx = x0 + dx * s + px * sag;
    const ly = y0 + dy * s + py * sag;
    g.lineStyle(i % 2 === 0 ? 2.2 : 1.4, tint(i % 2 === 0 ? color : CNQ.iron), alpha * (shielded ? 0.75 : 0.45));
    g.strokeCircle(lx, ly, i % 2 === 0 ? 3 : 2.2);
  }
  if (shielded) {
    // Force Shield: a bead of light running the chain, so the buffed state is legible.
    const s = (t * 0.55) % 1;
    const sag = Math.sin(s * Math.PI) * (6 + Math.sin(t * 2.6) * 2);
    g.fillStyle(tint(CNQ.parchment), alpha * 0.9);
    g.fillCircle(x0 + dx * s + px * sag, y0 + dy * s + py * sag, 3.4);
  }
}

/** The Speedy Walls aura: a ring on the floor around a wall that is hurrying somebody along. */
export function hasteRing(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, r: number, color: number, t: number, alpha: number,
): void {
  g.lineStyle(1.4, tint(color), alpha * 0.28);
  g.strokeCircle(x, y, r);
  // Chevrons running the rim, all pointing the same way round — motion, not a boundary.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 1.9;
    const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
    const ta = a + Math.PI / 2;
    g.lineStyle(2, tint(color), alpha * 0.5);
    g.lineBetween(cx - Math.cos(ta) * 5 - Math.cos(a) * 3, cy - Math.sin(ta) * 5 - Math.sin(a) * 3, cx + Math.cos(ta) * 4, cy + Math.sin(ta) * 4);
    g.lineBetween(cx - Math.cos(ta) * 5 + Math.cos(a) * 3, cy - Math.sin(ta) * 5 + Math.sin(a) * 3, cx + Math.cos(ta) * 4, cy + Math.sin(ta) * 4);
  }
}

/** A building's HP bar. Only drawn once it has actually been hit — twenty full bars is noise. */
export function buildingHpBar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, ratio: number, color: number, alpha: number,
): void {
  const k = Phaser.Math.Clamp(ratio, 0, 1);
  const l = x - w / 2;
  // An iron-banded timber rail: dark iron case, a darker trough, the fill with a lit top edge.
  g.fillStyle(0x000000, alpha * 0.4);
  g.fillRect(l - 1, y, w + 3, 6);
  g.fillStyle(CNQ.ironDark, alpha * 0.95);
  g.fillRect(l - 1.5, y - 1.5, w + 3, 6);
  g.fillStyle(0x120c06, alpha * 0.9);
  g.fillRect(l, y - 0.2, w, 3.4);
  if (k > 0) {
    g.fillStyle(color, alpha);
    g.fillRect(l, y - 0.2, w * k, 3.4);
    g.fillStyle(0xffffff, alpha * 0.3);
    g.fillRect(l, y - 0.2, w * k, 1.1);
  }
  // Iron bands every quarter, and rivets on the ends.
  if (w >= 24) {
    g.fillStyle(CNQ.ironDark, alpha);
    for (let i = 1; i < 4; i++) g.fillRect(l + (w * i) / 4 - 0.5, y - 1.5, 1, 6);
  }
  g.fillStyle(CNQ.iron, alpha);
  g.fillCircle(l - 0.2, y + 1.5, 1);
  g.fillCircle(l + w + 0.2, y + 1.5, 1);
}

/** The pike, drawn as an actual thrust: a shaft, a leaf blade, and a pennant trailing the swing. */
export function pikeThrust(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, ang: number, reach: number,
  color: number, t: number,
): void {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // Extends fast, retracts slow — a thrust, not a sweep.
  const ext = t < 0.3 ? easeOut(t / 0.3) : 1 - easeIn((t - 0.3) / 0.7);
  const len = reach * ext;
  const a = 1 - t * 0.55;

  g.lineStyle(4.5, tint(CNQ.timberDark), a);
  g.lineBetween(x, y, x + ca * len, y + sa * len);
  g.lineStyle(2, tint(CNQ.timber), a);
  g.lineBetween(x, y, x + ca * len, y + sa * len);

  // Leaf blade on the end.
  const tx = x + ca * len, ty = y + sa * len;
  const px = -sa, py = ca;
  g.fillStyle(tint(CNQ.steel), a);
  g.fillTriangle(
    tx + ca * 16, ty + sa * 16,
    tx + px * 5 - ca * 4, ty + py * 5 - sa * 4,
    tx - px * 5 - ca * 4, ty - py * 5 - sa * 4,
  );
  g.fillStyle(tint(CNQ.parchment), a * 0.5);
  g.fillTriangle(
    tx + ca * 14, ty + sa * 14,
    tx + px * 2 - ca * 3, ty + py * 2 - sa * 3,
    tx - px * 1, ty - py * 1,
  );

  // The flag, hung a third of the way back and streaming off the swing.
  const fx = x + ca * len * 0.62, fy = y + sa * len * 0.62;
  const droop = (1 - ext) * 8;
  g.fillStyle(tint(color), a * 0.95);
  g.fillTriangle(
    fx, fy,
    fx - ca * 20 + px * 13, fy - sa * 20 + py * 13 + droop,
    fx - ca * 24, fy - sa * 24 + droop,
  );
  g.fillStyle(tint(CNQ.gold), a * 0.8);
  g.fillCircle(fx - ca * 12 + px * 5, fy - sa * 12 + py * 5 + droop * 0.5, 2);
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class ConquestFx extends FxBase {
  /** A pike thrust, drawn for its whole duration. */
  thrust(x: number, y: number, ang: number, reach: number, color: number, depth = 9): void {
    this.anim(depth, 260, (g, t) => pikeThrust(g, this.tint, x, y, ang, reach, color, t));
  }

  /** Authority landing — coins that arc up out of a town center and fade. */
  coins(x: number, y: number, count = 4, depth = 12): void {
    const seed = Math.random() * 999;
    this.anim(depth, 620, (g, t) => {
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + (jitter(seed, i) - 0.5) * 1.6;
        const d = (14 + jitter(seed, 20 + i) * 18) * easeOut(t);
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + t * t * 26;
        g.fillStyle(this.tint(CNQ.gold), (1 - t) * 0.95);
        g.fillEllipse(px, py, 5.5, 5.5 * Math.abs(Math.cos(t * 9 + i)));
        g.fillStyle(this.tint(CNQ.goldDeep), (1 - t) * 0.8);
        g.fillEllipse(px, py, 2.4, 2.4 * Math.abs(Math.cos(t * 9 + i)));
      }
    });
  }

  /** A square changing hands: the new border snapping shut over it. */
  claim(x: number, y: number, size: number, color: number, depth = 8): void {
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      const inset = (1 - e) * size * 0.45;
      g.lineStyle(3 * (1 - t) + 1, this.tint(color), (1 - t) * 0.95);
      g.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
      g.fillStyle(this.tint(color), (1 - t) * 0.3);
      g.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    });
  }

  /** A building going up — dust and a rising outline. */
  raise(x: number, y: number, size: number, color: number, depth = 9): void {
    const seed = Math.random() * 999;
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(2.5 * (1 - t) + 0.8, this.tint(color), (1 - t) * 0.9);
      g.strokeRect(x - size * 0.42, y + size * 0.3 - size * 0.6 * e, size * 0.84, size * 0.6 * e);
      for (let i = 0; i < 8; i++) {
        const a = (jitter(seed, i)) * TAU;
        const d = size * 0.35 * (0.4 + e);
        g.fillStyle(this.tint(CNQ.stone), (1 - t) * 0.6);
        g.fillCircle(x + Math.cos(a) * d, y + size * 0.28 + Math.sin(a) * d * 0.3, 3 * (1 - t * 0.5));
      }
    });
  }

  /** A building coming down. Blocks that scatter and drop. */
  rubble(x: number, y: number, size: number, depth = 10): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, size * 0.4, CNQ.parchment, CNQ.stone, depth);
    this.anim(depth, 720, (g, t) => {
      for (let i = 0; i < 11; i++) {
        const a = jitter(seed, i) * TAU;
        const d = size * 0.7 * easeOut(t) * (0.4 + jitter(seed, 30 + i));
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d * 0.6 + t * t * size * 0.7;
        const w = 4 + jitter(seed, 60 + i) * 5;
        g.fillStyle(this.tint(i % 3 === 0 ? CNQ.stoneDark : CNQ.stone), (1 - t) * 0.9);
        g.fillRect(px - w / 2, py - w / 2, w, w * 0.8);
      }
    });
  }

  /** A turret firing. Short, bright, and along the barrel only. */
  muzzle(x: number, y: number, ang: number, depth = 11): void {
    this.anim(depth, 130, (g, t) => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const px = -sa, py = ca;
      const len = 16 * (1 - t);
      g.fillStyle(this.tint(CNQ.muzzle), (1 - t) * 0.95);
      g.fillTriangle(
        x + ca * len, y + sa * len,
        x + px * 5 * (1 - t), y + py * 5 * (1 - t),
        x - px * 5 * (1 - t), y - py * 5 * (1 - t),
      );
    });
  }

  /** The Sniper Nest line — a hitscan shot has to leave something behind or it never happened. */
  tracer(x0: number, y0: number, x1: number, y1: number, depth = 11): void {
    this.anim(depth, 200, (g, t) => {
      g.lineStyle(3 * (1 - t) + 0.6, this.tint(CNQ.tracer), (1 - t) * 0.9);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(1, this.tint(CNQ.muzzle), (1 - t) * 0.8);
      g.lineBetween(x0, y0, x1, y1);
    });
  }

  /** A soldier landing a hit. Tiny — forty of these a second must not become a light show. */
  chip(x: number, y: number, color: number, depth = 10): void {
    this.anim(depth, 200, (g, t) => {
      g.lineStyle(2 * (1 - t), this.tint(color), (1 - t) * 0.8);
      g.strokeCircle(x, y, 5 + t * 9);
    });
  }

  /** Spiked Walls answering back. */
  spikes(x: number, y: number, depth = 10): void {
    const seed = Math.random() * 999;
    this.anim(depth, 300, (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = 8 + easeOut(t) * 20;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        g.lineStyle(2 * (1 - t), this.tint(CNQ.iron), (1 - t) * 0.9);
        g.lineBetween(x + Math.cos(a) * 6, y + Math.sin(a) * 6, px, py);
      }
    });
  }

  /** A building being healed by a Medical Center. */
  mend(x: number, y: number, depth = 10): void {
    this.anim(depth, 460, (g, t) => {
      const y2 = y - t * 18;
      g.lineStyle(2.4, this.tint(CNQ.mend), (1 - t) * 0.85);
      g.lineBetween(x - 4, y2, x + 4, y2);
      g.lineBetween(x, y2 - 4, x, y2 + 4);
    });
  }

  /** Boom Bullets: a small hard crack where a bullet landed. */
  boom(x: number, y: number, r: number, depth = 11): void {
    const seed = Math.random() * 999;
    this.anim(depth, 260, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(CNQ.ember), (1 - t) * 0.45);
      g.fillCircle(x, y, r * e);
      g.lineStyle(2.4 * (1 - t) + 0.5, this.tint(CNQ.emberCore), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * e);
      for (let i = 0; i < 6; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * e * (0.7 + jitter(seed, 20 + i) * 0.6);
        g.fillStyle(this.tint(CNQ.tracer), (1 - t) * 0.8);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 * (1 - t) + 0.6);
      }
    });
  }

  /**
   * Blast Nucleus. Deliberately the biggest thing Conquest draws — a shockwave ring, a fireball
   * core and a debris crown — because a turret that has given up its range for this needs the
   * detonation to look worth the trade from anywhere on the board.
   */
  blast(x: number, y: number, r: number, atomic: boolean, depth = 11): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.5, CNQ.parchment, CNQ.emberCore, depth);
    this.anim(depth, 520, (g, t) => {
      const e = easeOut(t);
      // Shockwave, outrunning the fire.
      g.lineStyle(4 * (1 - t) + 1, this.tint(atomic ? CNQ.arcane : CNQ.tracer), (1 - t) * 0.85);
      g.strokeCircle(x, y, r * (0.35 + e * 0.9));
      // The fireball itself, collapsing as it fades.
      g.fillStyle(this.tint(CNQ.ember), (1 - t) * 0.5);
      g.fillCircle(x, y, r * (0.3 + e * 0.7) * (1 - t * 0.35));
      g.fillStyle(this.tint(CNQ.emberCore), (1 - t) * 0.75);
      g.fillCircle(x, y, r * 0.42 * (1 - t * 0.7));
      // Debris thrown out and dropping.
      for (let i = 0; i < 10; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * (0.5 + jitter(seed, 40 + i) * 0.8) * e;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d * 0.72 + t * t * r * 0.4;
        const w = 3 + jitter(seed, 70 + i) * 4;
        g.fillStyle(this.tint(i % 3 === 0 ? CNQ.stoneDark : CNQ.stone), (1 - t) * 0.85);
        g.fillRect(px - w / 2, py - w / 2, w, w * 0.8);
      }
      if (atomic) {
        // The extra tier gets a second, violet ring running behind the first.
        g.lineStyle(2 * (1 - t), this.tint(CNQ.arcane), (1 - t) * 0.6);
        g.strokeCircle(x, y, r * (0.1 + e * 0.6));
      }
    });
  }

  /** Shadow Cloak eating a hit — the soldier goes to smoke for an instant and comes back. */
  cloakMiss(x: number, y: number, depth = 10): void {
    const seed = Math.random() * 999;
    this.anim(depth, 340, (g, t) => {
      for (let i = 0; i < 7; i++) {
        const a = jitter(seed, i) * TAU;
        const d = (3 + easeOut(t) * 15) * (0.5 + jitter(seed, 30 + i));
        g.fillStyle(this.tint(CNQ.shroud), (1 - t) * 0.55);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d - t * 6, 4 * (1 - t * 0.5));
      }
      g.lineStyle(1.6 * (1 - t), this.tint(CNQ.arcane), (1 - t) * 0.7);
      g.strokeCircle(x, y, 6 + easeOut(t) * 12);
    });
  }

  /** A soldier promoted by the Wizard School — the old man rising into the new one. */
  promote(x: number, y: number, depth = 11): void {
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      // A column of light that closes shut.
      const w = 14 * (1 - t) + 3;
      g.fillStyle(this.tint(CNQ.arcane), (1 - t) * 0.35);
      g.fillRect(x - w / 2, y - 34 * e, w, 34 * e + 6);
      // Runes climbing it.
      for (let i = 0; i < 4; i++) {
        const s = ((t * 1.6) + i * 0.25) % 1;
        const ry = y + 4 - s * 38;
        g.lineStyle(1.8, this.tint(CNQ.arcane), (1 - s) * (1 - t) * 0.95);
        g.strokeCircle(x, ry, 4 + i);
      }
      g.lineStyle(2 * (1 - t) + 0.6, this.tint(CNQ.arcane), (1 - t) * 0.9);
      g.strokeEllipse(x, y + 5, 26 * (0.4 + e), 9 * (0.4 + e));
    });
  }

  /** Academy of Ash: a wizard's last act. Cinders out, then a soot ring left on the ground. */
  ashBurst(x: number, y: number, r: number, depth = 11): void {
    const seed = Math.random() * 999;
    this.anim(depth, 700, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(CNQ.ash), (1 - t) * 0.35);
      g.fillCircle(x, y, r * e);
      g.lineStyle(3 * (1 - t) + 0.8, this.tint(CNQ.ember), (1 - t) * 0.85);
      g.strokeCircle(x, y, r * e);
      for (let i = 0; i < 14; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * e * (0.4 + jitter(seed, 50 + i) * 0.8);
        // Cinders rise rather than fall — that is the whole difference between ash and rubble.
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d * 0.7 - e * 16 * jitter(seed, 90 + i);
        g.fillStyle(this.tint(i % 3 === 0 ? CNQ.emberCore : CNQ.ash), (1 - t) * 0.9);
        g.fillCircle(px, py, 2.6 * (1 - t * 0.6));
      }
    });
  }

  /** A fireball landing. Smaller cousin of `blast`, in the arcane family rather than the stone one. */
  fireburst(x: number, y: number, r: number, depth = 11): void {
    const seed = Math.random() * 999;
    this.flashIn(x, y, r * 0.5, CNQ.emberCore, CNQ.ember, depth);
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(CNQ.ember), (1 - t) * 0.45);
      g.fillCircle(x, y, r * e);
      for (let i = 0; i < 9; i++) {
        const a = jitter(seed, i) * TAU;
        const d = r * e * (0.5 + jitter(seed, 25 + i) * 0.7);
        g.fillStyle(this.tint(i % 2 === 0 ? CNQ.emberCore : CNQ.ember), (1 - t) * 0.85);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 4 * (1 - t) + 1);
      }
      g.lineStyle(2.4 * (1 - t) + 0.5, this.tint(CNQ.emberCore), (1 - t) * 0.9);
      g.strokeCircle(x, y, r * (0.3 + e * 0.85));
    });
  }

  /**
   * Propaganda Central opening. Concentric rings leaving the commander, in the crimson of the
   * standard rather than the gold of the money — the point of the ability is that health has
   * stopped being what you pay with, and it needs to read as an announcement, not a purchase.
   */
  propaganda(x: number, y: number, r: number, depth = 12): void {
    this.anim(depth, 620, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 3; i++) {
        const s = Phaser.Math.Clamp(e * 1.4 - i * 0.22, 0, 1);
        if (s <= 0) continue;
        g.lineStyle(3 * (1 - t) + 0.8, this.tint(i === 1 ? CNQ.gold : CNQ.crimson), (1 - t) * 0.8 * (1 - i * 0.22));
        g.strokeCircle(x, y, r * s);
      }
      // A trumpet held out of the ring, so the rings have something to have come from.
      g.fillStyle(this.tint(CNQ.crimson), (1 - t) * 0.9);
      g.fillTriangle(x + 6, y - 10, x + 26 * (1 - t * 0.4), y - 20, x + 26 * (1 - t * 0.4), y - 2);
    });
  }

  /** The vault taking money in, or paying it back out. Coins climbing into or out of a strongbox. */
  vault(x: number, y: number, into: boolean, depth = 12): void {
    const seed = Math.random() * 999;
    this.anim(depth, 520, (g, t) => {
      for (let i = 0; i < 5; i++) {
        const p = Phaser.Math.Clamp(t * 1.5 - i * 0.1, 0, 1);
        if (p <= 0) continue;
        const s = into ? 1 - p : p;
        const px = x + (jitter(seed, i) - 0.5) * 22;
        const py = y - 26 * s;
        g.fillStyle(this.tint(CNQ.gold), (1 - t) * 0.95);
        g.fillEllipse(px, py, 6, 6 * Math.abs(Math.cos(p * 7 + i)));
      }
      g.lineStyle(2 * (1 - t), this.tint(CNQ.iron), (1 - t) * 0.7);
      g.strokeRect(x - 9, y - 7, 18, 12);
    });
  }

  /** Warmongering paying out — a coin knocked loose by a hit rather than earned by a clock. */
  bounty(x: number, y: number, depth = 12): void {
    this.anim(depth, 420, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(CNQ.gold), (1 - t) * 0.95);
      g.fillEllipse(x, y - 22 * e, 7, 7 * Math.abs(Math.cos(t * 8)));
      g.lineStyle(1.6 * (1 - t), this.tint(CNQ.blood), (1 - t) * 0.7);
      g.strokeCircle(x, y, 6 + e * 14);
    });
  }

  /** The banner changing hands to another form — the old standard furling, the new one snapping out. */
  bannerSwap(x: number, y: number, color: number, depth = 12): void {
    this.anim(depth, 480, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.5;
        const d = 10 + e * 30;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        g.fillStyle(this.tint(color), (1 - t) * 0.8);
        g.fillTriangle(px, py, px + 12 * (1 - t), py + 5, px, py + 11 * (1 - t));
      }
      g.lineStyle(2.5 * (1 - t) + 0.6, this.tint(color), (1 - t) * 0.9);
      g.strokeCircle(x, y - 6, 12 + e * 22);
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const CONQUEST_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: CNQ.crimson, alpha: 0.22 },
    { r: 6.8, color: CNQ.crimson, alpha: 0.98 },
    { r: 3.4, color: CNQ.banner, alpha: 0.9 },
    { r: 1.8, color: CNQ.parchment, alpha: 0.85, ox: -1.8, oy: -1.8 },
  ],
  eyeWhite: CNQ.parchment,
  eyePupil: 0x1a1206,
  squash: { div: 15, x: 0.42, y: 0.24 },
};

/**
 * The commander: a plain crimson orb (the baked `elem-conquest`) with a **standard planted on
 * its crown** — the one accessory, and the one place the rig's live readouts live. The cloth
 * takes Banner Bearer's chosen form colour if owned, else the colour of the town you are
 * standing in (so the territory bonus reads without looking at the floor), else banner red.
 * Owning more than one town adds a gold bar across the cloth: the empire has split.
 *
 * Body detail: a gold sash with a pinned campaign medal, fringed epaulettes and coat buttons.
 *
 * Mastered (Emperor): a jewelled gold crown on the head, a crimson royal mantle with an ermine hem
 * hanging behind, the sash turns royal white with a crimson stripe, plus a taller gilded pole, a
 * bigger gold-edged cloth, a glowing finial, gold eyes and wider gold hand coronas.
 */
export class ConquestAvatar extends BaseAvatar {
  /** The colour of whichever territory the commander is standing on, or 0 for neutral ground. */
  private standing = 0;
  /** How many town centers this commander has — more than one gilds a bar across the cloth. */
  private towns = 1;
  /**
   * Banner Bearer's chosen standard, or 0 before the upgrade is owned. It outranks the standing
   * colour on the cloth: once a player can *choose* a form, which form they are carrying
   * matters more moment to moment than which of their own squares they happen to be on — the
   * ground ring in `drawGlow` still carries the territory read either way.
   */
  private bannerColor = 0;
  private seed = Math.random() * 999;

  constructor(scene: Phaser.Scene, tint: ConquestColorFn, depth = 6) {
    super(scene, tint, depth, CONQUEST_AVATAR);
  }

  setStanding(color: number): void { this.standing = color; }
  setTowns(n: number): void { this.towns = n; }
  setBanner(color: number): void { this.bannerColor = color; }

  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CNQ.gold : CNQ.parchment);
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13.5 : 10);
      glow.setFillStyle(this.tint(on ? CNQ.gold : CNQ.crimson), on ? 0.3 : 0.22);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new ConquestFx(this.scene, this.tint).chip(x, y, CNQ.gold, 4);
  }

  /**
   * The uniform on the orb: a gold sash slung from the left shoulder to the right hip with a
   * campaign medal pinned on it, a fringed epaulette on each shoulder, and a row of brass
   * buttons down the right.
   */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const P = (px: number, py: number) => new Phaser.Geom.Point(px, py);
    // Sash.
    const sash = [P(x - 17, y - 6), P(x - 12, y - 11), P(x + 15, y + 9), P(x + 10, y + 14)];
    g.fillStyle(0x000000, alpha * 0.25);
    g.fillPoints(sash.map((q) => P(q.x + 0.8, q.y + 1.2)), true);
    g.fillStyle(this.tint(m ? CNQ.parchment : CNQ.gold), alpha * 0.95);
    g.fillPoints(sash, true);
    g.lineStyle(0.9, this.tint(CNQ.goldDeep), alpha);
    g.lineBetween(x - 17, y - 6, x + 10, y + 14);
    g.lineBetween(x - 12, y - 11, x + 15, y + 9);
    if (m) {
      // Mastered sash: a royal white with a crimson stripe down its middle.
      g.lineStyle(1.6, this.tint(CNQ.crimson), alpha * 0.9);
      g.lineBetween(x - 14.5, y - 8.5, x + 12.5, y + 11.5);
    }
    // Medal pinned at the sash's middle: ribbon then a gold star.
    const mx = x - 2, my = y + 1;
    g.fillStyle(this.tint(CNQ.crimson), alpha);
    g.fillRect(mx - 2, my - 5, 4, 4);
    g.fillStyle(this.tint(CNQ.parchment), alpha * 0.8);
    g.fillRect(mx - 0.5, my - 5, 1, 4);
    const star: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 ? 1.5 : 3.6;
      star.push(P(mx + Math.cos(ang) * r, my + 1.5 + Math.sin(ang) * r));
    }
    g.fillStyle(this.tint(CNQ.goldDeep), alpha);
    g.fillPoints(star.map((q) => P(q.x + 0.5, q.y + 0.5)), true);
    g.fillStyle(this.tint(CNQ.gold), alpha);
    g.fillPoints(star, true);
    // Epaulettes: gold boards with a fringe hanging off them.
    for (const side of [-1, 1]) {
      const ex = x + side * 15.5, ey = y - 9;
      g.fillStyle(this.tint(CNQ.goldDeep), alpha);
      g.fillEllipse(ex, ey + 0.6, 10, 5);
      g.fillStyle(this.tint(CNQ.gold), alpha);
      g.fillEllipse(ex, ey, 9, 4);
      g.lineStyle(1, this.tint(CNQ.gold), alpha * 0.9);
      for (let i = 0; i < 5; i++) {
        const fx = ex - 3.6 + i * 1.8;
        g.lineBetween(fx, ey + 1.5, fx + side * 0.3, ey + 4.5 + Math.sin(this.t * 3 + i) * 0.4);
      }
    }
    // Buttons down the right of the coat.
    for (let i = 0; i < 3; i++) {
      g.fillStyle(this.tint(CNQ.goldDeep), alpha);
      g.fillCircle(x + 9.6, y - 3 + i * 5, 1.3);
      g.fillStyle(this.tint(CNQ.muzzle), alpha * 0.9);
      g.fillCircle(x + 9.3, y - 3.3 + i * 5, 0.6);
    }
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    const k = this.intensity * (this.mastered ? 1.15 : 1);
    g.fillStyle(this.tint(this.mastered ? CNQ.gold : CNQ.crimson), a * (this.mastered ? 0.24 : 0.2) * k);
    g.fillCircle(x, y, 28 * k);
    if (this.mastered) {
      // Emperor: a royal mantle hangs behind him, crimson-black with an ermine hem and gold edging,
      // swaying as he moves.
      const sway = Math.sin(this.t * 1.8) * 1.5 - Math.cos(this.facing) * 2;
      const P = (px: number, py: number) => new Phaser.Geom.Point(px, py);
      const mantle = [P(x - 16, y - 10), P(x + 16, y - 10), P(x + 23 + sway, y + 24), P(x + 8 + sway, y + 27),
        P(x - 8 + sway, y + 27), P(x - 23 + sway, y + 24)];
      g.fillStyle(this.tint(CNQ.blood), alpha * 0.98);
      g.fillPoints(mantle, true);
      g.lineStyle(1.4, this.tint(CNQ.gold), alpha * 0.95);
      g.strokePoints(mantle, true, true);
      // Ermine hem: white fur with the black tails.
      g.fillStyle(this.tint(CNQ.parchment), alpha);
      g.fillPoints([P(x - 23 + sway, y + 20), P(x + 23 + sway, y + 20), P(x + 23 + sway, y + 24), P(x + 8 + sway, y + 27),
        P(x - 8 + sway, y + 27), P(x - 23 + sway, y + 24)], true);
      g.fillStyle(0x15100a, alpha * 0.9);
      for (let i = 0; i < 7; i++) {
        const tx = x - 18 + i * 6 + sway;
        g.fillTriangle(tx - 1, y + 21.5, tx + 1, y + 21.5, tx, y + 24.5);
      }
    }
    // A held-ground ring: only while standing on your own land — a readout, kept faint.
    if (this.standing !== 0) {
      g.lineStyle(1.4, this.tint(this.standing), a * 0.35);
      g.strokeEllipse(x, y + 14, 54 + Math.sin(this.t * 2.4) * 3, 18);
    }
  }

  /**
   * The standard, planted at the crown's shoulder and flown out to the side — the health bar
   * sits right over the crown, so a pole straight up would fly its cloth behind the bar.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const m = this.mastered;
    const s = m ? 1.15 : 1;
    const rootX = x + 7;
    const rootY = y - 15;
    const poleTop = y - 28;
    const px = rootX + 3 + Math.cos(this.facing) * 1;

    // Pole, gilded in mastery.
    g.lineStyle(2.4, this.tint(m ? CNQ.gold : CNQ.timber), alpha * 0.95);
    g.lineBetween(rootX, rootY, px, poleTop);

    // The cloth, rippling on its own phase, with a swallowtail notch at the fly.
    const bw = 15 * s, bh = 10 * s;
    const wave = (u: number) => Math.sin(this.t * 3 + u * 3 + this.seed) * 1.8 * u;
    const top: Phaser.Geom.Point[] = [];
    const bottom: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      top.push(new Phaser.Geom.Point(px + bw * u, poleTop + 1 + wave(u)));
      const notch = i === 6 ? -bh * 0.3 : 0;
      bottom.push(new Phaser.Geom.Point(px + bw * u, poleTop + 1 + bh + notch + wave(u)));
    }
    const cloth = this.bannerColor || this.standing || CNQ.banner;
    g.fillStyle(this.tint(cloth), alpha * 0.95);
    g.fillPoints([...top, ...bottom.reverse()], true);
    if (m) {
      g.lineStyle(1.3, this.tint(CNQ.gold), alpha * 0.95);
      g.strokePoints([...top, ...bottom], true);
    }
    // More than one town: a gold bar across the cloth.
    if (this.towns > 1) {
      g.lineStyle(1.8, this.tint(CNQ.gold), alpha * 0.9);
      g.lineBetween(px + 1, poleTop + 1 + bh * 0.5 + wave(0.1), px + bw * 0.7, poleTop + 1 + bh * 0.5 + wave(0.7));
    }

    // Finial — glows once mastered.
    if (m) {
      g.fillStyle(this.tint(CNQ.gold), alpha * (0.25 + 0.1 * Math.sin(this.t * 4)));
      g.fillCircle(px, poleTop - 2, 6);
    }
    g.fillStyle(this.tint(CNQ.gold), alpha);
    g.fillCircle(px, poleTop - 2, m ? 3 : 2.4);

    if (m) {
      // The crown, set a little to the left of the standard so the pole never runs through it.
      const cx = x - 4 + Math.cos(this.facing) * 1.2;
      const cy = y - 17;
      const P = (px2: number, py2: number) => new Phaser.Geom.Point(cx + px2, cy + py2);
      const crown = [P(-8, 1), P(-8.5, -6), P(-5, -2.5), P(-2.5, -8), P(0, -3), P(2.5, -8), P(5, -2.5), P(8.5, -6), P(8, 1)];
      g.fillStyle(0x000000, alpha * 0.35);
      g.fillPoints(crown.map((q) => new Phaser.Geom.Point(q.x + 0.8, q.y + 1)), true);
      g.fillStyle(this.tint(CNQ.gold), alpha);
      g.fillPoints(crown, true);
      g.fillStyle(this.tint(CNQ.goldDeep), alpha);
      g.fillRect(cx - 8, cy - 1, 16, 2.4);
      g.lineStyle(0.8, this.tint(CNQ.muzzle), alpha * 0.9);
      g.lineBetween(cx - 7.5, cy - 1.2, cx + 7.5, cy - 1.2);
      // Jewels: a ruby in the middle, pearls on the points.
      g.fillStyle(this.tint(CNQ.crimson), alpha);
      g.fillCircle(cx, cy + 0.2, 1.4);
      g.fillStyle(this.tint(CNQ.parchment), alpha);
      for (const px2 of [-8.5, -2.5, 2.5, 8.5]) g.fillCircle(cx + px2, cy + (Math.abs(px2) > 5 ? -6 : -8), 1.1);
      // A glint running across the band.
      const u = (this.t * 0.5) % 1;
      g.fillStyle(this.tint(CNQ.muzzle), alpha * Math.sin(u * Math.PI) * 0.8);
      g.fillCircle(cx - 7 + u * 14, cy, 1.2);
    }
  }
}
