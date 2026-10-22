import Phaser from 'phaser';
import type { BanterLine, BanterSet } from '../../../data/MythBanter';
import type { GunKind, MythColorFn } from '../MythVisuals';
import { MYTH, mix } from '../MythVisuals';

/**
 * Everything the Doom skin draws in place of Myth's own art — visual only.
 *
 * - `crucible` — the red energy blade that replaces Excalibur (carried as a bare hilt, lit for
 *   Truth Breaker and Parry).
 * - `doomGun` — Final Destiny's five guns, redrawn as chunky 2D sprites in the same screen-space
 *   frame `MythView` uses for Myth's: chaingun, super shotgun, rocket launcher, plasma rifle, BFG.
 * - `bfgBall` — the Shadow Rocket, drawn as a slow ball of green plasma.
 * - `doomLine` / `doomBanter` — the floating text and the speech bubbles, in the marine's voice.
 *
 * These are skin-owned colours, so they are literal and never routed through the Myth remap.
 */

export const DOOM = {
  armour: 0x3f6a2c,
  armourLit: 0x6a9a44,
  armourDark: 0x1f3a16,
  armourDeep: 0x13240d,
  plate: 0x5a5a52,
  plateLit: 0x8f8c80,
  plateDark: 0x2a2a26,
  visor: 0xffb43a,
  visorDeep: 0x6a3a08,
  leather: 0x4a2e18,
  brass: 0xc9902a,
  wood: 0x5a3218,
  woodLit: 0x8a5228,
  hazard: 0xd9b21a,
  hell: 0xff2a10,
  hellDeep: 0x8a0c04,
  ember: 0xff7a2e,
  heat: 0xfff0c8,
  bfg: 0x7dff4a,
  bfgDeep: 0x1f7a14,
  plasma: 0x6affd0,
  plasmaDeep: 0x138a6a,
};

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

// ── The Crucible ────────────────────────────────────────────────────────────

/**
 * The Crucible at hilt `(x, y)` along `ang`. `len` 0 is the bare hilt (how it is carried);
 * the blade grows out of it to `len`. `glow` 0–1 lights the red corona, `t` makes it crackle.
 */
export function crucible(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, alpha: number, glow: number, t: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pt = (u: number, v: number): Phaser.Geom.Point => P(x + ca * u - sa * v, y + sa * u + ca * v);
  // The grip: a heavy iron haft with ridges, a pommel cap, and the red core at the guard.
  const grip = [pt(-14, -2.6), pt(6, -3), pt(6, 3), pt(-14, 2.6)];
  g.fillStyle(DOOM.plateDark, alpha);
  g.fillPoints(grip, true);
  g.lineStyle(1, DOOM.plateLit, alpha * 0.8);
  g.strokePoints(grip, true, true);
  g.lineStyle(1, DOOM.plate, alpha * 0.9);
  for (let i = 0; i < 4; i++) { const a = pt(-11 + i * 4, -2.6); const b = pt(-11 + i * 4, 2.6); g.lineBetween(a.x, a.y, b.x, b.y); }
  const cap = pt(-15, 0);
  g.fillStyle(DOOM.plate, alpha);
  g.fillCircle(cap.x, cap.y, 3);
  // The guard: a squat angular collar, two short swept fins.
  const guard = [pt(5, -6), pt(10, -4.5), pt(10, 4.5), pt(5, 6), pt(3, 0)];
  g.fillStyle(DOOM.plate, alpha);
  g.fillPoints(guard, true);
  g.lineStyle(1, DOOM.plateLit, alpha);
  g.strokePoints(guard, true, true);
  const core = pt(7, 0);
  const pulse = 0.75 + 0.25 * Math.sin(t * 9);
  g.fillStyle(DOOM.hell, alpha * 0.35 * pulse);
  g.fillCircle(core.x, core.y, 5);
  g.fillStyle(DOOM.hell, alpha);
  g.fillCircle(core.x, core.y, 2.2);
  g.fillStyle(DOOM.heat, alpha * pulse);
  g.fillCircle(core.x - ca * 0.5, core.y - sa * 0.5, 0.9);
  if (len <= 10) return;
  // The blade: a straight slab of red energy with a chisel tip, a white-hot core and a
  // corona that crackles along its length.
  const L = len;
  const hw = 4.2;
  if (glow > 0) {
    const flick = (i: number): number => 1 + 0.35 * Math.sin(t * 23 + i * 2.1);
    const outer: Phaser.Geom.Point[] = [pt(9, -hw * 2.1)];
    for (let i = 1; i <= 6; i++) outer.push(pt(9 + (L - 9) * (i / 7), -hw * 2.0 * flick(i)));
    outer.push(pt(L + 7, 0));
    for (let i = 6; i >= 1; i--) outer.push(pt(9 + (L - 9) * (i / 7), hw * 2.0 * flick(i + 7)));
    outer.push(pt(9, hw * 2.1));
    g.fillStyle(DOOM.hell, alpha * 0.28 * glow);
    g.fillPoints(outer, true);
  }
  const blade = [pt(9, -hw), pt(L * 0.82, -hw * 0.92), pt(L, -hw * 0.2), pt(L - 2, hw * 0.55), pt(L * 0.82, hw * 0.92), pt(9, hw)];
  g.fillStyle(DOOM.hellDeep, alpha);
  g.fillPoints(blade, true);
  const mid = [pt(10, -hw * 0.62), pt(L * 0.82, -hw * 0.55), pt(L - 2, 0), pt(L * 0.82, hw * 0.55), pt(10, hw * 0.62)];
  g.fillStyle(DOOM.hell, alpha);
  g.fillPoints(mid, true);
  g.lineStyle(1.3, DOOM.heat, alpha * (0.75 + 0.25 * Math.sin(t * 17)));
  const c0 = pt(11, 0);
  const c1 = pt(L * 0.86, 0);
  g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  // Sparks thrown off the edge.
  for (let i = 0; i < 3; i++) {
    const k = ((t * 1.7 + i * 0.37) % 1);
    const sp = pt(12 + (L - 12) * k, (i % 2 ? 1 : -1) * (hw + 2 + k * 5));
    g.fillStyle(i === 1 ? DOOM.ember : DOOM.heat, alpha * (1 - k));
    g.fillCircle(sp.x, sp.y, 1.1);
  }
}

// ── Final Destiny guns ───────────────────────────────────────────────────────

/** The same screen-space frame `MythVisuals.gun` uses: grip at (x, y), barrel up-left. */
function frame(x: number, y: number, recoil: number, scale: number, twist: number): (u: number, v: number) => Phaser.Geom.Point {
  const ang = -2.42 + recoil * 0.12 + twist;
  const kick = recoil * 14 * scale;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const ox = x - ca * kick;
  const oy = y - sa * kick + recoil * 6 * scale;
  return (u, v) => P(ox + (ca * u + sa * v) * scale, oy + (sa * u - ca * v) * scale);
}

/**
 * One of the marine's guns, drawn where Myth's would be. Same arguments, same returned muzzle.
 * `tint` is the owner's Myth mapper — used only for the gun-metal shades so the metal matches
 * the HUD halo; the bespoke parts (wood, hazard paint, plasma, BFG core) are literal.
 */
export function doomGun(
  g: Phaser.GameObjects.Graphics, tint: MythColorFn, kind: GunKind, x: number, y: number, recoil: number, phase: number,
  scale = 1, twist = 0,
): { x: number; y: number } {
  const f = frame(x, y, recoil, scale, twist);
  const dark = tint(MYTH.gunDark);
  const mid = tint(MYTH.gunMid);
  const light = scale > 1 ? mix(tint(MYTH.gunLight), 0xffffff, 0.2) : tint(MYTH.gunLight);
  const edge = 1.2 * Math.max(1, scale * 0.9);
  const plate = (pts: Phaser.Geom.Point[], fill: number, rim = light): void => {
    g.fillStyle(fill, 1);
    g.fillPoints(pts, true);
    g.lineStyle(edge, rim, 0.95);
    g.strokePoints(pts, true, true);
  };
  const disc = (u: number, v: number, r: number, fill: number, a = 1): void => {
    const p = f(u, v);
    g.fillStyle(fill, a);
    g.fillCircle(p.x, p.y, r * scale);
  };
  const line = (u0: number, v0: number, u1: number, v1: number, w: number, c: number, a: number): void => {
    const p0 = f(u0, v0);
    const p1 = f(u1, v1);
    g.lineStyle(w * Math.max(1, scale * 0.8), c, a);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  };
  // The marine's green gauntlets: armour shell, knuckle plate, a scuffed highlight.
  const hand = (u: number, v: number, r: number): void => {
    disc(u, v, r + 1.5, DOOM.armourDeep);
    disc(u, v, r, DOOM.armour);
    disc(u - 2, v - 2, r * 0.55, DOOM.armourLit);
    disc(u + 2.5, v + 2, r * 0.3, DOOM.armourDark);
  };
  let muzzle: Phaser.Geom.Point;
  switch (kind) {
    case 'pistol': {
      // Chaingun: a boxy receiver, an ammo drum, and three barrels spinning in a shroud.
      plate([f(-6, 14), f(8, 14), f(20, 50), f(6, 50)], dark);                          // grip
      plate([f(-12, -12), f(54, -12), f(54, 18), f(-12, 18)], mid);                      // receiver
      disc(20, 28, 13, dark); disc(20, 28, 10, mid);                                    // ammo drum
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + phase; disc(20 + Math.cos(a) * 6, 28 + Math.sin(a) * 6, 2, DOOM.brass); }
      line(-6, -6, 48, -6, 1, light, 0.5);
      const spin = phase * (8 + recoil * 40);
      const barrels = [0, 1, 2].map((i) => ({ v: 3 + 8 * Math.sin(spin + (i * Math.PI * 2) / 3), z: Math.cos(spin + (i * Math.PI * 2) / 3) }));
      barrels.sort((a, b) => a.z - b.z);
      for (const b of barrels) {
        const c = b.z > 0 ? light : dark;
        plate([f(54, b.v - 3), f(120, b.v - 3), f(120, b.v + 3), f(54, b.v + 3)], b.z > 0 ? mid : dark, c);
      }
      plate([f(54, -10), f(64, -10), f(64, 16), f(54, 16)], mid);                       // rear shroud ring
      plate([f(108, -8), f(116, -8), f(116, 14), f(108, 14)], mid);                     // front ring
      plate([f(10, -24), f(40, -24), f(40, -12), f(10, -12)], dark);                    // carry handle
      hand(2, 32, 11);
      hand(26, -18, 10);
      muzzle = f(124, 3);
      break;
    }
    case 'shotgun': {
      // Super shotgun: walnut stock and fore-end, a short break-action receiver, two fat barrels.
      plate([f(-46, 8), f(-6, 2), f(0, 24), f(-40, 34)], DOOM.wood, DOOM.woodLit);       // stock
      line(-40, 14, -10, 9, 1.4, DOOM.woodLit, 0.55);
      plate([f(-6, -8), f(32, -8), f(32, 18), f(-6, 18)], mid);                          // receiver
      plate([f(30, -14), f(130, -14), f(130, -1), f(30, -1)], dark);                     // upper barrel
      plate([f(30, 1), f(130, 1), f(130, 14), f(30, 14)], dark);                         // lower barrel
      line(32, -7.5, 128, -7.5, 1, light, 0.45);
      line(32, 7.5, 128, 7.5, 1, light, 0.45);
      plate([f(36, 14), f(88, 14), f(84, 24), f(40, 24)], DOOM.wood, DOOM.woodLit);      // fore-end
      disc(30, 0, 4, light); disc(30, 0, 2.2, dark);                                    // hinge pin
      plate([f(124, -16), f(132, -16), f(132, 16), f(124, 16)], mid);                   // muzzle band
      disc(132, -7.5, 4.6, 0x000000); disc(132, 7.5, 4.6, 0x000000);                    // the bores
      hand(2, 28, 11);
      hand(62, 26, 10);
      muzzle = f(134, 0);
      break;
    }
    case 'launcher': {
      // Rocket launcher: a chunky slab body, a fat tube on top with a hazard band and a rocket's nose.
      plate([f(-34, -12), f(72, -12), f(72, 22), f(-34, 22)], mid);                      // body
      plate([f(-24, -30), f(120, -30), f(120, -8), f(-24, -8)], dark);                   // tube
      plate([f(92, -30), f(106, -30), f(106, -8), f(92, -8)], DOOM.hazard, dark);        // hazard band
      for (let i = 0; i < 3; i++) line(92 + i * 5, -8, 96 + i * 5, -30, 1.6, 0x111111, 0.85);
      plate([f(120, -26), f(132, -19), f(120, -12)], DOOM.hell, DOOM.hellDeep);         // rocket nose
      plate([f(28, -40), f(58, -40), f(58, -30), f(28, -30)], dark);                     // sight
      disc(54, -35, 2.2, DOOM.hell, 0.7 + 0.3 * Math.sin(phase * 6));
      for (let i = 0; i < 4; i++) line(-20 + i * 16, -12, -20 + i * 16, 22, 1.2, light, 0.4);
      plate([f(8, 22), f(22, 22), f(28, 48), f(12, 48)], dark);                          // grip
      hand(14, 36, 11);
      hand(60, 24, 10);
      muzzle = f(124, -19);
      break;
    }
    case 'rifle': {
      // Plasma rifle: an angular shell with glowing cells down its flank and a ringed emitter.
      plate([f(-40, 2), f(-8, -10), f(72, -10), f(86, 0), f(86, 14), f(-8, 22), f(-40, 18)], mid);
      plate([f(0, -18), f(66, -18), f(66, -10), f(0, -10)], dark);                       // top rail
      for (let i = 0; i < 4; i++) {
        const pulse = 0.65 + 0.35 * Math.sin(phase * 5 + i * 1.3);
        disc(10 + i * 15, 5, 6.5, DOOM.plasmaDeep);
        disc(10 + i * 15, 5, 4.6, DOOM.plasma, pulse);
        disc(9 + i * 15, 4, 1.6, 0xffffff, pulse);
      }
      plate([f(86, -1), f(126, -1), f(126, 11), f(86, 11)], dark);                       // emitter barrel
      for (let i = 0; i < 3; i++) plate([f(94 + i * 11, -4), f(99 + i * 11, -4), f(99 + i * 11, 14), f(94 + i * 11, 14)], mid);
      disc(130, 5, 7, DOOM.plasma, 0.25 + 0.15 * Math.sin(phase * 9));
      disc(130, 5, 3.4, DOOM.plasma, 0.9);
      plate([f(-6, 20), f(8, 20), f(14, 44), f(0, 44)], dark);                           // grip
      hand(2, 32, 10);
      hand(74, 18, 9);
      muzzle = f(132, 5);
      break;
    }
    case 'rocket': {
      // BFG 9000: a huge armoured block with a green core churning in its window.
      plate([f(-44, -26), f(108, -26), f(126, -10), f(126, 28), f(-44, 32)], dark);
      plate([f(-34, -38), f(88, -38), f(100, -26), f(-34, -26)], mid);                   // top plate
      const core = f(44, 3);
      const pulse = 0.7 + 0.3 * Math.sin(phase * 7);
      g.fillStyle(0x000000, 1); g.fillCircle(core.x, core.y, 20 * scale);
      g.lineStyle(edge * 1.4, light, 0.95); g.strokeCircle(core.x, core.y, 20 * scale);
      g.fillStyle(DOOM.bfgDeep, 1); g.fillCircle(core.x, core.y, 16 * scale);
      g.fillStyle(DOOM.bfg, pulse); g.fillCircle(core.x, core.y, 11 * scale * (0.9 + 0.15 * pulse));
      g.fillStyle(0xffffff, 0.85); g.fillCircle(core.x - 3 * scale, core.y - 3 * scale, 4 * scale);
      g.lineStyle(1.4 * scale, DOOM.bfg, 0.8);
      for (let i = 0; i < 4; i++) {
        const a = phase * 3 + i * 1.7;
        const r = 14 * scale;
        g.lineBetween(core.x, core.y, core.x + Math.cos(a) * r, core.y + Math.sin(a) * r);
      }
      for (let i = 0; i < 4; i++) line(-36 + i * 9, -20, -36 + i * 9, 24, 2, light, 0.45);  // vents
      for (let i = 0; i < 3; i++) disc(118, -2 + i * 11, 3.6, DOOM.bfg, 0.55 + 0.4 * Math.sin(phase * 8 + i));
      plate([f(6, 30), f(20, 30), f(26, 54), f(10, 54)], dark);                          // grip
      hand(12, 42, 11);
      hand(86, 32, 10);
      muzzle = f(130, 9);
      break;
    }
  }
  return { x: muzzle.x, y: muzzle.y };
}

/** Final Destiny's HUD names, in the marine's armoury. */
export const DOOM_GUN_NAMES: Record<GunKind, string> = {
  pistol: 'CHAINGUN', shotgun: 'SUPER SHOTGUN', launcher: 'ROCKET LAUNCHER', rifle: 'PLASMA RIFLE', rocket: 'BFG 9000',
};

/**
 * A small side-on gun along `ang` from `(x, y)`, for the arena view (everyone watching).
 * Same footprint as Myth's held gun.
 */
export function heldDoomGun(
  g: Phaser.GameObjects.Graphics, kind: GunKind, x: number, y: number, ang: number, recoil: number, a: number, t: number,
): { x: number; y: number } {
  const kick = recoil * 6;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const pt = (u: number, v: number): Phaser.Geom.Point => P(x + ca * (u - kick) - sa * v, y + sa * (u - kick) + ca * v);
  const box = (u0: number, v0: number, u1: number, v1: number, fill: number, rim: number): void => {
    const pts = [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)];
    g.fillStyle(fill, a);
    g.fillPoints(pts, true);
    g.lineStyle(1, rim, a * 0.85);
    g.strokePoints(pts, true, true);
  };
  const dot = (u: number, v: number, r: number, c: number, al = 1): void => {
    const p = pt(u, v);
    g.fillStyle(c, a * al);
    g.fillCircle(p.x, p.y, r);
  };
  let len = 34;
  switch (kind) {
    case 'pistol':
      len = 30;
      box(8, -4, 22, 4, DOOM.plate, DOOM.plateLit);
      for (let i = -1; i <= 1; i++) box(22, i * 2.2 - 0.9, 38, i * 2.2 + 0.9, DOOM.plateDark, DOOM.plate);
      dot(14, 5, 3, DOOM.plateDark);
      break;
    case 'shotgun':
      box(2, -2, 10, 3, DOOM.wood, DOOM.woodLit);
      box(10, -3.5, 42, -0.2, DOOM.plateDark, DOOM.plateLit);
      box(10, 0.2, 42, 3.5, DOOM.plateDark, DOOM.plateLit);
      len = 34;
      break;
    case 'launcher':
      box(6, -2, 26, 5, DOOM.plate, DOOM.plateLit);
      box(4, -7, 42, -1, DOOM.plateDark, DOOM.plateLit);
      box(32, -7, 36, -1, DOOM.hazard, DOOM.plateDark);
      dot(43, -4, 2.2, DOOM.hell);
      len = 34;
      break;
    case 'rifle':
      box(6, -3.5, 34, 4, DOOM.plate, DOOM.plateLit);
      box(34, -1.5, 48, 2, DOOM.plateDark, DOOM.plateLit);
      for (let i = 0; i < 3; i++) dot(12 + i * 8, 0.3, 1.8, DOOM.plasma, 0.7 + 0.3 * Math.sin(t * 6 + i));
      len = 40;
      break;
    case 'rocket':
      box(4, -6, 40, 6, DOOM.plateDark, DOOM.plateLit);
      box(10, -8, 32, -6, DOOM.plate, DOOM.plateLit);
      dot(22, 0, 4.2, DOOM.bfgDeep);
      dot(22, 0, 2.8 + 0.5 * Math.sin(t * 7), DOOM.bfg);
      dot(42, 0, 2.4, DOOM.bfg, 0.8);
      len = 34;
      break;
  }
  return pt(8 + len, 0);
}

// ── The Shadow Rocket as a BFG ball ─────────────────────────────────────────

/** A ball of green plasma with crackling tendrils. Same footprint as Myth's rocket (r ≈ 11). */
export function bfgBall(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, t: number, alpha: number, seed = 0): void {
  g.fillStyle(DOOM.bfg, alpha * 0.18);
  g.fillCircle(x, y, r * 2);
  g.fillStyle(DOOM.bfgDeep, alpha * 0.8);
  g.fillCircle(x, y, r * 1.15);
  g.fillStyle(DOOM.bfg, alpha);
  g.fillCircle(x, y, r * (0.82 + 0.08 * Math.sin(t * 13 + seed)));
  g.fillStyle(0xeaffd8, alpha);
  g.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.38);
  g.lineStyle(Math.max(1, r * 0.12), DOOM.bfg, alpha * 0.85);
  for (let i = 0; i < 5; i++) {
    const a0 = t * 4 + seed + i * 1.256;
    const r1 = r * (1.4 + 0.5 * Math.sin(t * 17 + i * 3));
    const mx = x + Math.cos(a0 + 0.3) * r1 * 0.6;
    const my = y + Math.sin(a0 + 0.3) * r1 * 0.6;
    g.beginPath();
    g.moveTo(x + Math.cos(a0) * r * 0.8, y + Math.sin(a0) * r * 0.8);
    g.lineTo(mx, my);
    g.lineTo(x + Math.cos(a0 - 0.2) * r1, y + Math.sin(a0 - 0.2) * r1);
    g.strokePath();
  }
}

// ── Voice ──────────────────────────────────────────────────────────────────

const EXACT: Record<string, string> = {
  'FINAL DESTINY': 'RIP AND TEAR',
  'THE CROWD GOES WILD': 'UNSTOPPABLE',
  'JEERED': 'THE HORDE LAUGHS',
  'PARRY': 'BLOCK',
  'PARRIED!  INDOMITABLE': 'DENIED!  UNSTOPPABLE',
  'STAR MACE': 'CRUSHED',
  'PHANTOM MACES': 'HELLFIRE CHAINS',
  'TRUE': 'TORN',
  'THE LEGEND FALLS': 'SLAYER DOWN',
  'SECOND BREATH!': 'EXTRA LIFE!',
  'COME HOME': 'HEEL',
  'WORMHOLE': 'HELL GATE',
  'FLIP  +20% SPEED': 'VAULT  +20% SPEED',
  'RAPID FIRE': 'SPIN IT UP',
  'DETONATED AGAIN': 'REMOTE DETONATE',
  'DIRECT HIT': 'GIBBED',
  'BARRAGE': 'ROCKET RAIN',
  'STUNNED': 'STAGGERED',
  'CAUGHT': 'HOOKED',
};

const WORDS: [RegExp, string][] = [
  [/THE LANDS OF MYTH/g, 'HELL'],
  [/LANDS OF MYTH/g, 'HELL'],
  [/FINAL DESTINY/g, 'RIP AND TEAR'],
  [/ECHO SHARDS?/g, 'ARGENT CELL'],
  [/SHARDS/g, 'CELLS'],
  [/SHARD/g, 'CELL'],
  [/INDOMITABLE/g, 'UNSTOPPABLE'],
  [/RIPOSTE/g, 'GLORY KILL'],
  [/ RIFTS?/g, ' GATES'],
  [/^RIFT/g, 'GATE'],
  [/TRUE$/g, 'TORN'],
];

/** A line the Myth kit prints, re-said in the marine's voice. Unknown lines pass through. */
export function doomLine(text: string): string {
  const hit = EXACT[text];
  if (hit) return hit;
  let out = text;
  for (const [re, to] of WORDS) out = out.replace(re, to);
  return out;
}

const m = (text: string): BanterLine => ({ who: 'myth', text });
const f = (text: string): BanterLine => ({ who: 'foe', text });

const DOOM_SETS: BanterSet[] = [
  {
    opener: [m('Rip and tear.'), f('That is the whole speech?'), m('Until it is done.')],
    mid: [m('Is that all you have?'), f('You do not even slow down.')],
    closer: [m('Stay down.'), f('Not... yet.')],
  },
  {
    opener: [m('Another one for the list.'), f('What list?'), m('Everything I have put down.'), f('I am no demon!')],
    mid: [m('Close enough.'), f('You fight like something cornered.'), m('You are the one in the corner.')],
    closer: [m('Lights out.'), f('Then finish it.')],
  },
  {
    opener: [m('I go where the fighting is.'), f('Then you came to the right arena.'), m('Good. Less talking.')],
    mid: [m('Faster.'), f('Your armour is cracking!'), m('So is your nerve.')],
    closer: [m('No mercy. Not today.'), f('I did not ask for any.')],
  },
];

/** The three bubble exchanges, with the marine speaking. Picked per opponent so it varies. */
export function doomBanter(foeId: string): BanterSet {
  let h = 0;
  for (let i = 0; i < foeId.length; i++) h = (h * 31 + foeId.charCodeAt(i)) >>> 0;
  return DOOM_SETS[h % DOOM_SETS.length];
}
