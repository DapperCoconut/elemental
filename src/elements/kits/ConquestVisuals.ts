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

/**
 * The town center. A stepped ziggurat with a dome and a standard on top — deliberately the
 * tallest, widest silhouette on the board, since it is the one thing that can never be killed
 * and the player should never mistake it for something they have to defend.
 */
export function townCenterBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, t: number, alpha: number,
): void {
  const w = s * 0.86;
  // Three receding tiers.
  for (let i = 0; i < 3; i++) {
    const tw = w * (1 - i * 0.22);
    const th = s * 0.16;
    const ty = y + s * 0.34 - i * th;
    g.fillStyle(tint(i % 2 === 0 ? CNQ.stone : CNQ.stoneDark), alpha);
    g.fillRect(x - tw / 2, ty - th, tw, th);
    g.lineStyle(1.2, tint(CNQ.stoneDark), alpha * 0.8);
    g.strokeRect(x - tw / 2, ty - th, tw, th);
  }
  // Dome, tinted to the town's colour — the ownership read at a distance.
  const domeY = y - s * 0.16;
  g.fillStyle(tint(color), alpha);
  g.beginPath();
  g.arc(x, domeY, w * 0.26, Math.PI, TAU, false);
  g.closePath();
  g.fillPath();
  g.fillStyle(tint(CNQ.parchment), alpha * 0.35);
  g.beginPath();
  g.arc(x - w * 0.06, domeY, w * 0.16, Math.PI, TAU, false);
  g.closePath();
  g.fillPath();

  // The standard, with a pennant that stirs.
  const poleTop = domeY - s * 0.42;
  g.lineStyle(2, tint(CNQ.timberDark), alpha);
  g.lineBetween(x, domeY - w * 0.24, x, poleTop);
  const flap = Math.sin(t * 3.2) * s * 0.05;
  g.fillStyle(tint(color), alpha);
  g.fillTriangle(x, poleTop, x + s * 0.26, poleTop + s * 0.07 + flap, x, poleTop + s * 0.15);
  g.fillStyle(tint(CNQ.gold), alpha * 0.9);
  g.fillCircle(x, poleTop - 2, 2.4);
}

/**
 * A barracks: a longhouse with a pitched roof and a training-yard door. The roof ridge is the
 * whole silhouette read — it's the only building with a triangle on top.
 */
export function barracksBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, alpha: number,
): void {
  const w = s * 0.78;
  const h = s * 0.42;
  const top = y - h * 0.1;
  g.fillStyle(tint(CNQ.timber), alpha);
  g.fillRect(x - w / 2, top, w, h);
  g.lineStyle(1.4, tint(CNQ.timberDark), alpha);
  g.strokeRect(x - w / 2, top, w, h);
  // Two planks across the front.
  for (let i = 1; i <= 2; i++) {
    g.lineStyle(1, tint(CNQ.timberDark), alpha * 0.6);
    g.lineBetween(x - w / 2, top + (h * i) / 3, x + w / 2, top + (h * i) / 3);
  }
  // Roof, in the town colour.
  g.fillStyle(tint(color), alpha);
  g.fillTriangle(x - w * 0.62, top, x + w * 0.62, top, x, top - s * 0.26);
  g.lineStyle(1.2, tint(CNQ.stoneDark), alpha * 0.7);
  g.strokeTriangle(x - w * 0.62, top, x + w * 0.62, top, x, top - s * 0.26);
  // The door soldiers walk out of.
  g.fillStyle(tint(CNQ.timberDark), alpha);
  g.fillRect(x - w * 0.12, top + h * 0.4, w * 0.24, h * 0.6);
  // Crossed weapons over the door — the icon that says "this makes troops".
  g.lineStyle(1.6, tint(CNQ.steel), alpha * 0.9);
  g.lineBetween(x - w * 0.2, top + h * 0.12, x + w * 0.2, top + h * 0.34);
  g.lineBetween(x + w * 0.2, top + h * 0.12, x - w * 0.2, top + h * 0.34);
}

/**
 * A turret: a squat stone drum with a barrel that actually points where it is about to shoot.
 * `ang` is live, so a player can see which of their turrets has acquired something.
 */
export function turretBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, ang: number, recoil: number, alpha: number,
): void {
  const r = s * 0.28;
  // Base drum.
  g.fillStyle(tint(CNQ.stoneDark), alpha);
  g.fillEllipse(x, y + r * 0.5, r * 2.2, r * 1.1);
  g.fillStyle(tint(CNQ.stone), alpha);
  g.fillCircle(x, y, r);
  g.lineStyle(1.4, tint(CNQ.stoneDark), alpha);
  g.strokeCircle(x, y, r);
  // Crenellations around the rim.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    g.fillStyle(tint(CNQ.stoneDark), alpha * 0.85);
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.1);
  }
  // The barrel, kicked back along its own axis by `recoil` (0–1).
  const back = -recoil * 4;
  const bl = s * 0.42;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const bx = x + ca * back, by = y + sa * back;
  g.lineStyle(6, tint(CNQ.ironDark), alpha);
  g.lineBetween(bx, by, bx + ca * bl, by + sa * bl);
  g.lineStyle(3, tint(CNQ.iron), alpha);
  g.lineBetween(bx, by, bx + ca * bl, by + sa * bl);
  // Turret cap in the town colour, so ownership survives the barrel covering the drum.
  g.fillStyle(tint(color), alpha);
  g.fillCircle(x, y, r * 0.44);
  g.fillStyle(tint(CNQ.parchment), alpha * 0.4);
  g.fillCircle(x - r * 0.14, y - r * 0.14, r * 0.18);
}

/**
 * A barricade: a run of staggered blocks with a coping stone across the top. Deliberately the
 * lowest silhouette of the three, because it is the one you are meant to build *next to*
 * things rather than look at.
 */
export function barricadeBody(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number, s: number,
  color: number, spiked: boolean, alpha: number,
): void {
  const w = s * 0.82;
  const h = s * 0.34;
  const top = y - h * 0.3;
  const rows = 3;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const cols = r % 2 === 0 ? 3 : 4;
    const cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const bx = x - w / 2 + c * cw;
      const by = top + r * rh;
      g.fillStyle(tint((r + c) % 2 === 0 ? CNQ.stone : CNQ.stoneDark), alpha);
      g.fillRect(bx + 0.6, by + 0.6, cw - 1.2, rh - 1.2);
    }
  }
  // Coping stone in the town colour.
  g.fillStyle(tint(color), alpha);
  g.fillRect(x - w * 0.54, top - 3.4, w * 1.08, 3.4);
  g.lineStyle(1.2, tint(CNQ.stoneDark), alpha * 0.8);
  g.strokeRect(x - w * 0.54, top - 3.4, w * 1.08, 3.4);

  if (spiked) {
    // Iron spikes along the crown — the one upgrade that changes the silhouette.
    for (let i = 0; i < 5; i++) {
      const sx = x - w * 0.42 + (i * w * 0.84) / 4;
      g.fillStyle(tint(CNQ.iron), alpha);
      g.fillTriangle(sx - 2.6, top - 3.4, sx + 2.6, top - 3.4, sx, top - 11);
      g.fillStyle(tint(CNQ.blood), alpha * 0.6);
      g.fillTriangle(sx - 1, top - 7, sx + 1, top - 7, sx, top - 11);
    }
  }
}

/**
 * One soldier. A body, a helmet, and a weapon held out along `ang` — small enough that five of
 * them fit in a 64px square without becoming a blob, which is the whole constraint.
 *
 * `march` is a free-running phase so a stack of soldiers never stands in lockstep.
 */
export function soldier(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number,
  color: number, ang: number, march: number, scale: number, alpha: number,
): void {
  const s = scale;
  const bob = Math.sin(march) * 1.2 * s;
  const cy = y + bob;
  // Shadow, so a soldier reads as standing on the square rather than floating over it.
  g.fillStyle(0x000000, alpha * 0.25);
  g.fillEllipse(x, y + 6 * s, 9 * s, 3.4 * s);
  // Body — a tabard in the town colour over a dark under-layer.
  g.fillStyle(tint(CNQ.ironDark), alpha);
  g.fillRect(x - 3.2 * s, cy - 3 * s, 6.4 * s, 8 * s);
  g.fillStyle(tint(color), alpha);
  g.fillRect(x - 2.4 * s, cy - 2.6 * s, 4.8 * s, 6 * s);
  // Head and helmet.
  g.fillStyle(tint(CNQ.flesh), alpha);
  g.fillCircle(x, cy - 5.4 * s, 2.6 * s);
  g.fillStyle(tint(CNQ.steel), alpha);
  g.beginPath();
  g.arc(x, cy - 5.6 * s, 3 * s, Math.PI, TAU, false);
  g.closePath();
  g.fillPath();
  // Weapon, out along the facing.
  const ca = Math.cos(ang), sa = Math.sin(ang);
  g.lineStyle(1.4 * s, tint(CNQ.timberDark), alpha);
  g.lineBetween(x + ca * 2 * s, cy, x + ca * 9 * s, cy + sa * 7 * s - 2 * s);
  g.fillStyle(tint(CNQ.steel), alpha);
  g.fillCircle(x + ca * 9 * s, cy + sa * 7 * s - 2 * s, 1.8 * s);
}

/**
 * The Barbarian King. Same rig as a soldier at twice the size, plus the two things that have to
 * be readable instantly: a horned crown, and — once he has drunk — a red aura, since a doubled
 * attack speed is otherwise invisible.
 */
export function barbarianKing(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number,
  color: number, ang: number, march: number, enraged: boolean, alpha: number,
): void {
  if (enraged) {
    const pulse = 0.7 + 0.3 * Math.sin(march * 3);
    g.fillStyle(tint(CNQ.blood), alpha * 0.22 * pulse);
    g.fillCircle(x, y - 4, 22);
  }
  soldier(g, tint, x, y, color, ang, march, 2.1, alpha);
  const bob = Math.sin(march) * 2.5;
  // Horned crown over the helmet.
  const hy = y + bob - 15;
  g.fillStyle(tint(CNQ.gold), alpha);
  g.fillRect(x - 6, hy - 1.4, 12, 3);
  for (let i = -1; i <= 1; i += 2) {
    g.fillTriangle(x + i * 5.5, hy, x + i * 9.5, hy - 7, x + i * 4, hy - 5.5);
  }
  g.fillStyle(tint(color), alpha);
  g.fillCircle(x, hy - 3.2, 2);
  // A cape, so the king has a footprint even standing still.
  g.fillStyle(tint(CNQ.blood), alpha * 0.9);
  const sway = Math.sin(march * 0.8) * 2;
  g.fillTriangle(x - 5, y + bob - 8, x + 5, y + bob - 8, x + sway, y + bob + 10);
}

/**
 * A wizard — a soldier the Wizard School has promoted. Built on the same rig so the promotion
 * reads as *that soldier, changed* rather than a new unit type: same size, same bob, same tabard
 * colour. What is new is a pointed hood, a staff instead of a spear, and an orb whose glow is the
 * only thing at three squares' distance that says this one outranges everything else on the board.
 */
export function wizardTroop(
  g: Phaser.GameObjects.Graphics,
  tint: ConquestColorFn,
  x: number, y: number,
  color: number, ang: number, march: number, ashen: boolean, alpha: number,
): void {
  const bob = Math.sin(march) * 1.2;
  const cy = y + bob;
  const ca = Math.cos(ang), sa = Math.sin(ang);

  g.fillStyle(0x000000, alpha * 0.25);
  g.fillEllipse(x, y + 6, 9, 3.4);

  // Robe: a trapezoid rather than the soldier's rectangle, so the silhouette differs at a glance.
  g.fillStyle(tint(CNQ.arcaneDeep), alpha);
  g.fillTriangle(x - 6, cy + 5.4, x + 6, cy + 5.4, x, cy - 4);
  g.fillStyle(tint(color), alpha * 0.95);
  g.fillTriangle(x - 4, cy + 5, x + 4, cy + 5, x, cy - 3);
  // A sash of arcane trim down the front.
  g.fillStyle(tint(ashen ? CNQ.ember : CNQ.arcane), alpha * 0.9);
  g.fillTriangle(x - 1.2, cy + 5, x + 1.2, cy + 5, x, cy - 2);

  // Pointed hood, brim and all.
  g.fillStyle(tint(CNQ.arcaneDeep), alpha);
  g.fillTriangle(x - 4.4, cy - 4.2, x + 4.4, cy - 4.2, x + ca * 1.5, cy - 12.5);
  g.fillStyle(tint(CNQ.arcane), alpha * 0.9);
  g.fillTriangle(x - 3, cy - 4.6, x + 3, cy - 4.6, x + ca * 1.2, cy - 10.5);
  // The face under it is a shadow with two lit eyes — never skin, so a wizard never reads as a
  // soldier who happens to be wearing a hat.
  g.fillStyle(0x120c1c, alpha * 0.9);
  g.fillCircle(x, cy - 5.2, 2.4);
  g.fillStyle(tint(ashen ? CNQ.emberCore : CNQ.arcane), alpha);
  g.fillCircle(x - 1, cy - 5.4, 0.75);
  g.fillCircle(x + 1, cy - 5.4, 0.75);

  // Staff, held out along the facing, with the orb at its head.
  const sx = x + ca * 6.5, sy = cy + sa * 5 - 1.5;
  g.lineStyle(1.6, tint(CNQ.timberDark), alpha);
  g.lineBetween(x + ca * 2, cy, sx, sy - 6);
  const pulse = 0.7 + 0.3 * Math.sin(march * 2.2);
  g.fillStyle(tint(ashen ? CNQ.ember : CNQ.arcane), alpha * 0.3 * pulse);
  g.fillCircle(sx, sy - 7, 6.5);
  g.fillStyle(tint(ashen ? CNQ.ember : CNQ.arcane), alpha);
  g.fillCircle(sx, sy - 7, 3);
  g.fillStyle(tint(ashen ? CNQ.emberCore : CNQ.parchment), alpha * 0.85);
  g.fillCircle(sx - 0.8, sy - 7.8, 1.3);
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
  g.fillStyle(tint(CNQ.ironDark), alpha);
  g.fillCircle(x, y, 5.5);
  g.fillStyle(tint(CNQ.iron), alpha * 0.7);
  g.fillCircle(x - 1.6, y - 1.6, 2.2);
  // Fuse, whipping behind the spin, with a spark on the end.
  const fa = spin;
  const fx = x + Math.cos(fa) * 8, fy = y + Math.sin(fa) * 8;
  g.lineStyle(1.4, tint(CNQ.timberDark), alpha * 0.9);
  g.lineBetween(x + Math.cos(fa) * 4, y + Math.sin(fa) * 4, fx, fy);
  g.fillStyle(tint(CNQ.emberCore), alpha);
  g.fillCircle(fx, fy, 2 + Math.sin(spin * 9) * 0.6);
  g.fillStyle(tint(CNQ.ember), alpha * 0.4);
  g.fillCircle(fx, fy, 4);
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
  g.fillStyle(0x000000, alpha * 0.55);
  g.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
  g.fillStyle(color, alpha);
  g.fillRect(x - w / 2, y, w * Phaser.Math.Clamp(ratio, 0, 1), 3);
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
    { r: 12, color: CNQ.crimson, alpha: 0.2 },
    { r: 7, color: CNQ.iron, alpha: 0.95 },
    { r: 2.6, color: CNQ.gold, alpha: 0.95, ox: -1.6, oy: -1.6 },
  ],
  eyeWhite: CNQ.parchment,
  eyePupil: 0x1a1206,
  squash: { div: 15, x: 0.42, y: 0.24 },
};

/**
 * The commander: a helmeted figure in a banner-coloured surcoat with a standard planted over
 * one shoulder. Two things on the rig are live readouts rather than decoration — the pennant
 * takes the colour of the town centre you are currently standing in (so you can see the
 * territory bonus without looking at the floor), and a laurel appears on the helm once you own
 * more than one town.
 */
export class ConquestAvatar extends BaseAvatar {
  /** The colour of whichever territory the commander is standing on, or 0 for neutral ground. */
  private standing = 0;
  /** How many town centers this commander has — drives the laurel. */
  private towns = 1;
  /**
   * Banner Bearer's chosen standard, or 0 before the upgrade is owned. It outranks the standing
   * colour on the shoulder banner specifically: once a player can *choose* a form, which form
   * they are carrying matters more moment to moment than which of their own squares they happen
   * to be on — and the crest on the helm still carries the territory read either way.
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
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 15 : 12);
      glow.setAlpha(on ? 0.32 : 0.2);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new ConquestFx(this.scene, this.tint).chip(x, y, CNQ.gold, 4);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    // A held-ground ring: solid while standing on your own land, faint off it.
    const owned = this.standing !== 0;
    g.fillStyle(this.tint(0x000000), a * 0.3);
    g.fillEllipse(x, y + 14, 46, 16);
    if (owned) {
      g.fillStyle(this.tint(this.standing), a * 0.16);
      g.fillEllipse(x, y + 13, 62 + Math.sin(this.t * 2.4) * 4, 22);
      g.lineStyle(1.6, this.tint(this.standing), a * 0.4);
      g.strokeEllipse(x, y + 13, 60, 21);
    }
    g.fillStyle(this.tint(CNQ.crimson), a * 0.12);
    g.fillEllipse(x, y + 12, 50, 18);
  }

  /** A surcoat over mail, split down the middle in the commander's own colours. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    g.fillStyle(this.tint(CNQ.ironDark), alpha * 0.85);
    g.fillRect(x - 11, y + 1, 22, 15);
    g.fillStyle(this.tint(CNQ.crimson), alpha * 0.95);
    g.fillRect(x - 9, y + 2, 18, 13);
    g.fillStyle(this.tint(CNQ.gold), alpha * 0.9);
    g.fillRect(x - 1.4, y + 2, 2.8, 13);
    // Mail links catching the light along the shoulders.
    g.fillStyle(this.tint(CNQ.iron), alpha * 0.5);
    for (let i = 0; i < 5; i++) {
      g.fillCircle(x - 9 + i * 4.5, y + 1.5, 1.3);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    // ── The helm ──
    const hy = y - 14;
    g.fillStyle(this.tint(CNQ.iron), alpha * 0.95);
    g.beginPath();
    g.arc(x, hy + 3, 11, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.4, this.tint(CNQ.ironDark), alpha * 0.9);
    g.lineBetween(x - 11, hy + 3, x + 11, hy + 3);
    // Crest, in the standing colour when there is one — the territory readout on the character.
    const crest = this.standing || CNQ.crimson;
    g.fillStyle(this.tint(crest), alpha * 0.95);
    for (let i = 0; i < 6; i++) {
      const cx = x - 5 + i * 2;
      const h = 7 - Math.abs(i - 2.5) * 1.4 + Math.sin(this.t * 4 + i) * 0.7;
      g.fillTriangle(cx - 1.2, hy - 6, cx + 1.2, hy - 6, cx, hy - 6 - h);
    }
    // Laurel once the empire has split.
    if (this.towns > 1) {
      g.lineStyle(1.6, this.tint(CNQ.gold), alpha * 0.9);
      for (let s = -1; s <= 1; s += 2) {
        for (let i = 0; i < 4; i++) {
          const ang = Math.PI + s * (0.5 + i * 0.34);
          g.lineBetween(
            x + Math.cos(ang) * 12, hy + 3 + Math.sin(ang) * 11,
            x + Math.cos(ang) * 16, hy + 3 + Math.sin(ang) * 14,
          );
        }
      }
    }

    // ── The standard over the shoulder ──
    const px = x + 15;
    const poleTop = y - 44;
    g.lineStyle(2.6, this.tint(CNQ.timberDark), alpha * 0.95);
    g.lineBetween(px, y + 10, px, poleTop);
    g.fillStyle(this.tint(CNQ.gold), alpha);
    g.fillCircle(px, poleTop - 3, 3);
    // The banner itself, rippling on its own phase.
    const bw = 22, bh = 26;
    const cloth = this.bannerColor || this.standing || CNQ.banner;
    g.fillStyle(this.tint(cloth), alpha * 0.95);
    g.beginPath();
    g.moveTo(px, poleTop);
    for (let i = 0; i <= 6; i++) {
      const s = i / 6;
      g.lineTo(px + bw * s, poleTop + Math.sin(this.t * 3 + s * 3 + this.seed) * 2.6 * s);
    }
    for (let i = 6; i >= 0; i--) {
      const s = i / 6;
      const notch = i === 6 ? -bh * 0.22 : 0;
      g.lineTo(px + bw * s, poleTop + bh + notch + Math.sin(this.t * 3 + s * 3 + this.seed) * 2.6 * s);
    }
    g.closePath();
    g.fillPath();
    // Device on the banner: a bar and a boss, so it reads as heraldry and not a rag.
    g.fillStyle(this.tint(CNQ.gold), alpha * 0.85);
    g.fillRect(px + 3, poleTop + bh * 0.4, bw * 0.7, 2.6);
    g.fillCircle(px + bw * 0.45, poleTop + bh * 0.24, 3);
  }
}
