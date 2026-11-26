import Phaser from 'phaser';
import { MAG, MagmaColorFn, noise } from './MagmaVisuals';

/**
 * The pirate's half of Magma's art: the blunderbuss and its shot, the two flintlocks, the
 * tankard, the unstable core, and the galleon with its cannons and anchor.
 *
 * Same rule as `MagmaVisuals`: crust over heat. Everything here is dark basalt, brass or
 * scorched timber with something molten showing through, and how much shows is the state.
 * Pure painters — no state, no timers; the kit hands in clocks and ratios.
 */

const TAU = Math.PI * 2;
const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

type G = Phaser.GameObjects.Graphics;

/** Brass and timber. Kept apart from the lava palette so a gun never reads as a flame. */
export const PIR = {
  brass: 0xd9a441,
  brassDark: 0x8a5a1c,
  brassLit: 0xffe3a0,
  timber: 0x3a2118,
  timberLit: 0x5b3524,
  timberDark: 0x1f110d,
  iron: 0x2a2c33,
  ironLit: 0x555a66,
  foam: 0xffe9b8,
  numb: 0x9fe8ff,
  numbDeep: 0x3aa6c9,
};

// ── Blunderblast ──────────────────────────────────────────────────────────

/** One pellet of the spread: a white-hot slug dragging a short streak of cooling lava. */
export function shotPellet(
  g: G, tint: MagmaColorFn, x: number, y: number, ang: number, life: number, seed: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const len = 9 + noise(seed, 1) * 7;
  const a = Phaser.Math.Clamp(life * 1.6, 0, 1);
  g.lineStyle(4.5, tint(MAG.magma), 0.28 * a);
  g.lineBetween(x - c * len * 1.5, y - s * len * 1.5, x, y);
  g.lineStyle(2.4, tint(MAG.lava), 0.75 * a);
  g.lineBetween(x - c * len, y - s * len, x, y);
  g.fillStyle(tint(MAG.gold), a);
  g.fillCircle(x, y, 2.9);
  g.fillStyle(tint(MAG.white), a);
  g.fillCircle(x + c * 0.8, y + s * 0.8, 1.5);
}

/**
 * The blunderbuss, held along the aim: a timber stock, an iron lock and a brass barrel that
 * flares into a bell. `flash` is 0–1 and decays after a shot — the bell glows and spits.
 */
export function blunderbuss(
  g: G, tint: MagmaColorFn, x: number, y: number, ang: number, flash: number, loaded: number, t: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const at = (u: number, v: number) => P(x + c * u - s * v, y + s * u + c * v);
  // Stock.
  g.fillStyle(tint(PIR.timberDark), 1);
  g.fillPoints([at(-13, -3.4), at(-3, -3.8), at(-3, 3.8), at(-13, 5.6), at(-16, 2)], true);
  g.fillStyle(tint(PIR.timberLit), 0.9);
  g.fillPoints([at(-12, -2.2), at(-4, -2.6), at(-4, 0.2), at(-12, 1)], true);
  // Lock and pan.
  g.fillStyle(tint(PIR.iron), 1);
  g.fillPoints([at(-4, -4.4), at(3, -4.4), at(3, 4.4), at(-4, 4.4)], true);
  g.fillStyle(tint(PIR.ironLit), 1);
  g.fillCircle(at(-1, -3.6).x, at(-1, -3.6).y, 1.5);
  // Barrel, flaring.
  g.fillStyle(tint(PIR.brassDark), 1);
  g.fillPoints([at(3, -3.4), at(15, -4), at(21, -7.6), at(21, 7.6), at(15, 4), at(3, 3.4)], true);
  g.fillStyle(tint(PIR.brass), 1);
  g.fillPoints([at(3, -2.2), at(15, -2.6), at(20, -5.4), at(20, -1), at(3, -0.4)], true);
  g.lineStyle(1.4, tint(PIR.brassLit), 0.9);
  g.lineBetween(at(21, -7.6).x, at(21, -7.6).y, at(21, 7.6).x, at(21, 7.6).y);
  g.lineStyle(1, tint(PIR.brassDark), 0.9);
  g.lineBetween(at(9, -3.6).x, at(9, -3.6).y, at(9, 3.6).x, at(9, 3.6).y);
  // What is in the bell: a banked glow per loaded charge, a jet when it has just fired.
  const mouth = at(21.5, 0);
  g.fillStyle(tint(MAG.magma), 0.25 + 0.3 * loaded + 0.06 * Math.sin(t * 7));
  g.fillEllipse(mouth.x, mouth.y, 5 + Math.abs(s) * 9, 5 + Math.abs(c) * 9);
  if (flash > 0) {
    for (let i = 0; i < 5; i++) {
      const a = ang + (i - 2) * 0.2;
      const len = (20 + noise(i, Math.floor(t * 40)) * 22) * flash;
      g.fillStyle(tint(i === 2 ? MAG.white : i % 2 ? MAG.gold : MAG.lava), 0.85 * flash);
      g.fillPoints([
        P(mouth.x + Math.cos(a - 0.5) * 5, mouth.y + Math.sin(a - 0.5) * 5),
        P(mouth.x + Math.cos(a) * len, mouth.y + Math.sin(a) * len),
        P(mouth.x + Math.cos(a + 0.5) * 5, mouth.y + Math.sin(a + 0.5) * 5),
      ], true);
    }
    g.fillStyle(tint(MAG.white), 0.6 * flash);
    g.fillCircle(mouth.x, mouth.y, 8 * flash);
  }
}

// ── Hotshot ───────────────────────────────────────────────────────────────

/**
 * One flintlock pistol. `lit` is a loaded gun — the pan burns and the barrel glows; a spent one
 * is cold iron trailing smoke until it is put away.
 */
export function flintlock(
  g: G, tint: MagmaColorFn, x: number, y: number, ang: number, lit: boolean, flash: number, t: number, seed: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const at = (u: number, v: number) => P(x + c * u - s * v, y + s * u + c * v);
  // Curved grip with a brass butt cap.
  g.fillStyle(tint(PIR.timberDark), 1);
  g.fillPoints([at(-3, -2.4), at(2, -2.6), at(2, 2.6), at(-5, 3.4), at(-9, 7.5), at(-12, 6), at(-8, 0.5)], true);
  g.fillStyle(tint(PIR.timberLit), 0.85);
  g.fillPoints([at(-3, -1.2), at(1, -1.4), at(1, 0.6), at(-5, 1.6), at(-8, 4.6), at(-7, 0.8)], true);
  g.fillStyle(tint(PIR.brass), 1);
  g.fillCircle(at(-10.6, 6.9).x, at(-10.6, 6.9).y, 2.1);
  // Barrel.
  g.fillStyle(tint(PIR.iron), 1);
  g.fillPoints([at(1, -2.4), at(17, -1.9), at(17, 1.9), at(1, 2.4)], true);
  g.fillStyle(tint(lit ? MAG.ember : PIR.ironLit), lit ? 0.75 : 0.8);
  g.fillPoints([at(2, -1.5), at(16, -1.2), at(16, -0.1), at(2, -0.2)], true);
  g.fillStyle(tint(PIR.brass), 1);
  g.fillPoints([at(5, -2.6), at(6.6, -2.6), at(6.6, 2.6), at(5, 2.6)], true);
  g.fillPoints([at(15.4, -2.5), at(17.4, -2.5), at(17.4, 2.5), at(15.4, 2.5)], true);
  // Hammer and pan.
  const pan = at(2.4, -3.6);
  g.fillStyle(tint(PIR.ironLit), 1);
  g.fillPoints([at(0, -2.4), at(3.2, -2.4), at(1.2, -6)], true);
  if (lit) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 3.1 + i * 0.37 + seed) % 1;
      g.fillStyle(tint(i ? MAG.gold : MAG.white), 0.85 * (1 - ph));
      g.fillCircle(pan.x + Math.sin(ph * 7 + i * 2) * 1.6, pan.y - ph * 9, 2.4 * (1 - ph * 0.6));
    }
    g.fillStyle(tint(MAG.lava), 0.3 + 0.1 * Math.sin(t * 9 + seed));
    g.fillCircle(at(18, 0).x, at(18, 0).y, 4.4);
  } else {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.9 + i * 0.33 + seed) % 1;
      g.fillStyle(tint(MAG.ash), 0.4 * (1 - ph));
      g.fillCircle(at(18, 0).x + Math.sin(ph * 5 + i) * 3, at(18, 0).y - ph * 16, 2 + ph * 3);
    }
  }
  if (flash > 0) {
    const m = at(18, 0);
    g.fillStyle(tint(MAG.white), 0.9 * flash);
    g.fillPoints([
      P(m.x - s * 4, m.y + c * 4), P(m.x + c * 30 * flash, m.y + s * 30 * flash), P(m.x + s * 4, m.y - c * 4),
    ], true);
    g.fillStyle(tint(MAG.gold), 0.7 * flash);
    g.fillCircle(m.x, m.y, 7 * flash);
  }
}

/** The hitscan line itself, drawn for a few frames: a white core in a sleeve of flame. */
export function hotshotTracer(
  g: G, tint: MagmaColorFn, x0: number, y0: number, x1: number, y1: number, u: number,
): void {
  const k = 1 - u;
  // The bright part runs down the line rather than fading in place.
  const hx = Phaser.Math.Linear(x0, x1, Math.min(1, u * 2.2));
  const hy = Phaser.Math.Linear(y0, y1, Math.min(1, u * 2.2));
  g.lineStyle(9 * k, tint(MAG.magma), 0.25 * k);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(4 * k, tint(MAG.gold), 0.7 * k);
  g.lineBetween(hx, hy, x1, y1);
  g.lineStyle(1.6, tint(MAG.white), 0.95 * k);
  g.lineBetween(hx, hy, x1, y1);
  g.fillStyle(tint(MAG.white), 0.9 * k);
  g.fillCircle(x1, y1, 5 + 9 * u);
  g.lineStyle(2, tint(MAG.gold), 0.7 * k);
  g.strokeCircle(x1, y1, 8 + 22 * u);
}

// ── Nice Hot Drink ────────────────────────────────────────────────────────

/** The tankard, tipped back by `tilt` (0 upright → 1 emptied down the throat), burning on top. */
export function hotDrink(
  g: G, tint: MagmaColorFn, x: number, y: number, tilt: number, t: number,
): void {
  const ang = -tilt * 1.9;
  const c = Math.cos(ang), s = Math.sin(ang);
  const at = (u: number, v: number) => P(x + c * u - s * v, y + s * u + c * v);
  // Handle.
  g.lineStyle(2.6, tint(PIR.brassDark), 1);
  g.beginPath();
  g.arc(at(7.5, 0).x, at(7.5, 0).y, 4.6, ang - Math.PI / 2, ang + Math.PI / 2);
  g.strokePath();
  // Body with two hoops.
  g.fillStyle(tint(PIR.timber), 1);
  g.fillPoints([at(-6.5, -8), at(6.5, -8), at(5.4, 8), at(-5.4, 8)], true);
  g.fillStyle(tint(PIR.timberLit), 1);
  g.fillPoints([at(-5, -7), at(-1.5, -7), at(-1.2, 7), at(-4.2, 7)], true);
  g.fillStyle(tint(PIR.brass), 1);
  g.fillPoints([at(-6.6, -5.4), at(6.6, -5.4), at(6.4, -3.4), at(-6.4, -3.4)], true);
  g.fillPoints([at(-5.8, 3.6), at(5.8, 3.6), at(5.6, 5.6), at(-5.6, 5.6)], true);
  // The brew: a lava surface with a head of flame, pouring out as it tips.
  const lip = at(0, -8.4);
  g.fillStyle(tint(MAG.lava), 1);
  g.fillEllipse(lip.x, lip.y, 13, 4.4);
  g.fillStyle(tint(MAG.white), 0.85);
  g.fillEllipse(lip.x - 1.5, lip.y, 6, 2);
  for (let i = 0; i < 4; i++) {
    const ph = (t * 2.4 + i * 0.27) % 1;
    const fx = lip.x + (i - 1.5) * 2.8 + Math.sin(ph * 6 + i) * 1.6;
    g.fillStyle(tint(i % 2 ? MAG.gold : MAG.magma), 0.8 * (1 - ph));
    g.fillTriangle(fx - 2.4, lip.y, fx + 2.4, lip.y, fx + Math.sin(t * 8 + i) * 2, lip.y - 6 - ph * 11);
  }
  if (tilt > 0.25) {
    const pour = at(-6.5, -8.5);
    for (let i = 0; i < 4; i++) {
      const ph = (t * 3 + i * 0.25) % 1;
      g.fillStyle(tint(i % 2 ? MAG.gold : MAG.lava), 0.9 * (1 - ph * 0.5));
      g.fillCircle(pour.x - ph * 4, pour.y + ph * 14, 2.6 - ph);
    }
  }
}

/**
 * Numbness on a body: a cool, glassy sheen with slow bubbles rising through it — deliberately
 * the one blue in the kit, because it has to read as "not feeling it" rather than as a shield
 * of fire. `banked` is 0–1 against a notional heavy beating: the more pain is waiting, the
 * more red creeps into the ring.
 */
export function numbHaze(
  g: G, tint: MagmaColorFn, x: number, y: number, t: number, left: number, banked: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
  g.fillStyle(tint(PIR.numb), 0.1 + 0.05 * pulse);
  g.fillCircle(x, y, 27);
  g.lineStyle(2.2, tint(PIR.numb), 0.55 + 0.2 * pulse);
  g.strokeCircle(x, y, 25 + pulse * 1.5);
  // The clock: an arc that burns away as the five seconds go.
  g.lineStyle(3, tint(PIR.numbDeep), 0.9);
  g.beginPath();
  g.arc(x, y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(left, 0, 1));
  g.strokePath();
  // What it is hiding.
  if (banked > 0) {
    g.lineStyle(2 + banked * 2.5, tint(MAG.pendantLit), 0.25 + 0.5 * banked);
    g.beginPath();
    g.arc(x, y, 21, Math.PI / 2 - Math.PI * banked, Math.PI / 2 + Math.PI * banked);
    g.strokePath();
  }
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.55 + i / 6) % 1;
    const bx = x + Math.sin(i * 2.4 + ph * 3) * 17;
    const by = y + 18 - ph * 44;
    g.lineStyle(1.2, tint(PIR.foam), 0.7 * (1 - ph));
    g.strokeCircle(bx, by, 2 + ph * 2.4);
  }
}

/** The bill arriving: red throbs sinking into the body while the hangover ticks. */
export function hangoverThrob(
  g: G, tint: MagmaColorFn, x: number, y: number, t: number, left: number,
): void {
  for (let i = 0; i < 3; i++) {
    const ph = (t * 1.3 + i / 3) % 1;
    g.lineStyle(2.4 * (1 - ph) + 0.6, tint(MAG.pendantLit), 0.6 * ph * Phaser.Math.Clamp(left * 3, 0, 1));
    g.strokeCircle(x, y, 36 - ph * 22);
  }
  // Stars round the head, the old way.
  for (let i = 0; i < 3; i++) {
    const a = t * 3.4 + i * (TAU / 3);
    const sx = x + Math.cos(a) * 15;
    const sy = y - 25 + Math.sin(a) * 4.5;
    g.fillStyle(tint(MAG.gold), 0.9);
    g.fillTriangle(sx, sy - 3.4, sx - 3, sy + 2, sx + 3, sy + 2);
    g.fillTriangle(sx, sy + 3.4, sx - 3, sy - 2, sx + 3, sy - 2);
  }
}

// ── Unstable Core ─────────────────────────────────────────────────────────

/**
 * The core clamped to a victim. `hp` is 1 → 0: an intact one is a basalt shell with a seam of
 * light; every point it loses splits another plate off. `erupt` is 0 before it goes, then
 * 0 → 1 across the eruption — no shell left, jets out of every side, swelling toward the end.
 */
export function unstableCore(
  g: G, tint: MagmaColorFn, x: number, y: number, r: number, hp: number, erupt: number, t: number, seed: number,
): void {
  const open = erupt > 0 ? 1 : 1 - Phaser.Math.Clamp(hp, 0, 1);
  const swell = erupt > 0 ? 1 + erupt * 0.45 + 0.08 * Math.sin(t * 26) : 1 + 0.04 * Math.sin(t * (4 + open * 10));
  const R = r * swell;

  g.fillStyle(tint(MAG.magma), 0.14 + 0.2 * open);
  g.fillCircle(x, y, R * (1.7 + open * 0.5));

  // The melt inside.
  g.fillStyle(tint(MAG.magma), 1);
  g.fillCircle(x, y, R);
  g.fillStyle(tint(MAG.lava), 1);
  g.fillCircle(x, y, R * 0.78);
  g.fillStyle(tint(MAG.gold), 0.9);
  g.fillCircle(x - R * 0.12, y - R * 0.14, R * 0.5);
  g.fillStyle(tint(MAG.white), 0.55 + 0.4 * open);
  g.fillCircle(x - R * 0.2, y - R * 0.22, R * (0.2 + 0.14 * open));

  // The shell: eight plates, each one prised further off as the core is worn down.
  if (erupt <= 0) {
    const plates = 8;
    const spin = t * 0.5 + seed;
    for (let i = 0; i < plates; i++) {
      // Plates let go one at a time rather than all loosening together.
      const mine = Phaser.Math.Clamp(open * plates - (plates - 1 - i) * 0.85, 0, 1);
      if (mine >= 1) continue;
      const a0 = spin + (i / plates) * TAU;
      const a1 = a0 + (TAU / plates) * (0.9 - mine * 0.35);
      const lift = R * (1 + mine * 0.5);
      const inner = R * (0.52 + mine * 0.3);
      g.fillStyle(tint(i % 2 ? MAG.crustDeep : MAG.basalt), 1 - mine * 0.4);
      g.fillPoints([
        P(x + Math.cos(a0) * inner, y + Math.sin(a0) * inner),
        P(x + Math.cos(a0) * lift, y + Math.sin(a0) * lift),
        P(x + Math.cos((a0 + a1) / 2) * lift * 1.06, y + Math.sin((a0 + a1) / 2) * lift * 1.06),
        P(x + Math.cos(a1) * lift, y + Math.sin(a1) * lift),
        P(x + Math.cos(a1) * inner, y + Math.sin(a1) * inner),
      ], true);
      g.lineStyle(1, tint(MAG.crust), 0.8 - mine * 0.5);
      g.lineBetween(
        x + Math.cos(a0 + 0.08) * lift * 0.97, y + Math.sin(a0 + 0.08) * lift * 0.97,
        x + Math.cos(a1 - 0.08) * lift * 0.97, y + Math.sin(a1 - 0.08) * lift * 0.97,
      );
    }
    // Clamps biting into whoever is wearing it.
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i - 1) * 0.9;
      g.lineStyle(2.4, tint(PIR.iron), 1);
      g.lineBetween(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8, x + Math.cos(a) * R * 1.55, y + Math.sin(a) * R * 1.55);
      g.fillStyle(tint(PIR.ironLit), 1);
      g.fillCircle(x + Math.cos(a) * R * 1.55, y + Math.sin(a) * R * 1.55, 1.8);
    }
  } else {
    // Erupting: jets, turning, with a beat that quickens toward the blast.
    const jets = 7;
    for (let i = 0; i < jets; i++) {
      const a = t * 2.6 + seed + (i / jets) * TAU;
      const len = R * (1.6 + noise(seed + i, Math.floor(t * 18)) * 1.5);
      const w = 0.24;
      g.fillStyle(tint(i % 3 === 0 ? MAG.white : i % 2 ? MAG.gold : MAG.lava), 0.85);
      g.fillPoints([
        P(x + Math.cos(a - w) * R * 0.7, y + Math.sin(a - w) * R * 0.7),
        P(x + Math.cos(a) * len, y + Math.sin(a) * len),
        P(x + Math.cos(a + w) * R * 0.7, y + Math.sin(a + w) * R * 0.7),
      ], true);
    }
    const beat = (t * (2 + erupt * 7)) % 1;
    g.lineStyle(2.6 * (1 - beat) + 0.5, tint(MAG.white), 0.8 * (1 - beat));
    g.strokeCircle(x, y, R * (1.2 + beat * 2.2));
  }
}

// ── Limoncello ────────────────────────────────────────────────────────────

/** The pirate going into the floor (k 0 → 1), or the pool he came up out of (k 1 → 0). */
export function meltPuddle(
  g: G, tint: MagmaColorFn, x: number, y: number, r: number, k: number, t: number, seed: number,
): void {
  const R = r * Phaser.Math.Clamp(k, 0, 1);
  if (R <= 0.5) return;
  g.fillStyle(tint(MAG.magma), 0.2);
  g.fillEllipse(x, y, R * 2.9, R * 1.9);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const w = 0.84 + 0.2 * noise(seed, i) + 0.06 * Math.sin(t * 5 + i * 1.7);
    pts.push(P(x + Math.cos(a) * R * 1.2 * w, y + Math.sin(a) * R * 0.78 * w));
  }
  g.fillStyle(tint(MAG.crustDeep), 1);
  g.fillPoints(pts, true);
  g.fillStyle(tint(MAG.magma), 1);
  g.fillEllipse(x, y, R * 2.05, R * 1.3);
  g.fillStyle(tint(MAG.lava), 1);
  g.fillEllipse(x, y - R * 0.04, R * 1.55, R * 0.95);
  g.fillStyle(tint(MAG.gold), 0.85);
  g.fillEllipse(x - R * 0.15, y - R * 0.1, R * 0.8, R * 0.44);
  for (let i = 0; i < 4; i++) {
    const ph = (t * 1.4 + noise(seed, 20 + i)) % 1;
    const bx = x + (noise(seed, 30 + i) - 0.5) * R * 1.4;
    const by = y + (noise(seed, 40 + i) - 0.5) * R * 0.7;
    g.lineStyle(1.3, tint(MAG.white), 0.8 * (1 - ph));
    g.strokeCircle(bx, by, 1.5 + ph * 4.5);
  }
}

/** The hull outline in ship-local units (bow to the right), scaled by `k` about the keel. */
function hullOutline(cx: number, cy: number, w: number, h: number, k: number): Phaser.Geom.Point[] {
  const a = (w / 2) * k, b = (h / 2) * k;
  const half: Array<[number, number]> = [
    [-0.98, 0.62], [-0.86, 0.92], [-0.3, 1], [0.36, 0.96], [0.68, 0.78], [0.88, 0.42], [1, 0],
  ];
  const pts: Phaser.Geom.Point[] = [P(cx - a, cy)];
  for (const [u, v] of half) pts.push(P(cx + u * a, cy + v * b));
  for (let i = half.length - 2; i >= 0; i--) pts.push(P(cx + half[i][0] * a, cy - half[i][1] * b));
  return pts;
}

/**
 * The galleon, seen from above with her bow to the right, `w` by `h`.
 *
 * Two layers, because the captain walks her deck: `hull` goes under the fighters (the sea of
 * melt she floats in, the hull, the planking with lava showing in every seam, the hatch and
 * the quarterdeck) and `rig` goes over them (masts, yards with their sails furled so nobody
 * is hidden, the lanterns and the flag). `hp` is 0–1: a hurt ship splits along her planks and
 * burns at the rail. `alpha` is the rise out of the floor.
 */
export function galleon(
  g: G, tint: MagmaColorFn, cx: number, cy: number, w: number, h: number,
  t: number, hp: number, seed: number, layer: 'hull' | 'rig', alpha = 1, flash = 0,
): void {
  const dmg = 1 - Phaser.Math.Clamp(hp, 0, 1);
  const hw = w / 2, hh = h / 2;

  if (layer === 'hull') {
    // The melt she sits in.
    g.fillStyle(tint(MAG.magma), 0.16 * alpha);
    g.fillEllipse(cx, cy, w * 1.16, h * 1.75);
    g.fillStyle(tint(MAG.lava), 0.12 * alpha);
    g.fillEllipse(cx, cy, w * 1.06, h * 1.4);
    for (let i = 0; i < 16; i++) {
      const ph = (t * 0.5 + noise(seed, i)) % 1;
      const a = (i / 16) * TAU;
      const bx = cx + Math.cos(a) * hw * 1.03;
      const by = cy + Math.sin(a) * hh * 1.24;
      g.lineStyle(1.3, tint(MAG.gold), 0.55 * (1 - ph) * alpha);
      g.strokeCircle(bx, by, 2 + ph * 6);
    }

    // Hull, rail, deck.
    g.fillStyle(tint(MAG.basalt), alpha);
    g.fillPoints(hullOutline(cx, cy, w, h, 1), true);
    g.lineStyle(2.4, tint(MAG.crust), alpha);
    g.strokePoints(hullOutline(cx, cy, w, h, 1), true);
    g.fillStyle(tint(PIR.timberDark), alpha);
    g.fillPoints(hullOutline(cx, cy, w, h, 0.93), true);
    g.fillStyle(tint(PIR.timber), alpha);
    g.fillPoints(hullOutline(cx - w * 0.01, cy, w, h, 0.86), true);

    // Planking: every seam is a line of melt, brighter the worse she is hurt.
    const seams = 15;
    for (let i = 1; i < seams; i++) {
      const u = -0.8 + (i / seams) * 1.62;
      // Narrow toward the bow, so the seams stay inside the deck.
      const reach = hh * 0.8 * (u > 0.3 ? Math.max(0.12, 1 - (u - 0.3) / 0.62) : 1);
      const x = cx + u * hw;
      const glow = 0.2 + 0.18 * Math.sin(t * 1.7 + i * 0.9) + dmg * 0.5;
      g.lineStyle(1.2, tint(PIR.timberDark), 0.9 * alpha);
      g.lineBetween(x, cy - reach, x, cy + reach);
      g.lineStyle(1, tint(MAG.lava), Phaser.Math.Clamp(glow, 0, 1) * alpha);
      g.lineBetween(x + 0.8, cy - reach * (0.4 + noise(seed, i) * 0.6), x + 0.8, cy + reach * (0.4 + noise(seed, 50 + i) * 0.6));
    }
    g.lineStyle(1.1, tint(PIR.timberLit), 0.5 * alpha);
    g.lineBetween(cx - hw * 0.8, cy, cx + hw * 0.78, cy);

    // Quarterdeck, aft: raised, with the wheel.
    g.fillStyle(tint(PIR.timberLit), alpha);
    g.fillRoundedRect(cx - hw * 0.9, cy - hh * 0.62, hw * 0.3, hh * 1.24, 5);
    g.lineStyle(1.6, tint(PIR.brassDark), alpha);
    g.strokeRoundedRect(cx - hw * 0.9, cy - hh * 0.62, hw * 0.3, hh * 1.24, 5);
    const wx = cx - hw * 0.7, wy = cy;
    g.lineStyle(2.2, tint(PIR.brass), alpha);
    g.strokeCircle(wx, wy, 9);
    for (let i = 0; i < 8; i++) {
      const a = t * 0.4 + (i / 8) * TAU;
      g.lineStyle(1.4, tint(PIR.brassLit), 0.9 * alpha);
      g.lineBetween(wx, wy, wx + Math.cos(a) * 12, wy + Math.sin(a) * 12);
    }
    g.fillStyle(tint(PIR.brassDark), alpha);
    g.fillCircle(wx, wy, 2.6);

    // The hatch amidships: a grate over the furnace.
    const gx = cx + hw * 0.16, gw = 46, gh = 26;
    g.fillStyle(tint(MAG.magma), alpha);
    g.fillRect(gx - gw / 2, cy - gh / 2, gw, gh);
    g.fillStyle(tint(MAG.gold), (0.55 + 0.25 * Math.sin(t * 3.1)) * alpha);
    g.fillRect(gx - gw / 2 + 4, cy - gh / 2 + 4, gw - 8, gh - 8);
    g.lineStyle(2, tint(PIR.iron), alpha);
    for (let i = 0; i <= 5; i++) g.lineBetween(gx - gw / 2 + (i / 5) * gw, cy - gh / 2, gx - gw / 2 + (i / 5) * gw, cy + gh / 2);
    g.lineBetween(gx - gw / 2, cy, gx + gw / 2, cy);
    g.strokeRect(gx - gw / 2, cy - gh / 2, gw, gh);

    // Bowsprit.
    g.lineStyle(4, tint(PIR.timberDark), alpha);
    g.lineBetween(cx + hw * 0.9, cy, cx + hw * 1.14, cy);
    g.lineStyle(1.6, tint(PIR.timberLit), alpha);
    g.lineBetween(cx + hw * 0.9, cy - 1, cx + hw * 1.14, cy - 1);

    // Damage: split planks, white at the worst of it, and fire along the rail.
    const cracks = Math.round(dmg * 9);
    for (let i = 0; i < cracks; i++) {
      const u = (noise(seed, 70 + i) - 0.5) * 1.5;
      const v = (noise(seed, 90 + i) - 0.5) * 1.3;
      const x0 = cx + u * hw, y0 = cy + v * hh;
      const a = noise(seed, 110 + i) * TAU;
      const len = 14 + noise(seed, 130 + i) * 22;
      const kx = x0 + Math.cos(a) * len * 0.5 + Math.cos(a + 1.4) * 5;
      const ky = y0 + Math.sin(a) * len * 0.5 + Math.sin(a + 1.4) * 5;
      g.lineStyle(3.4, tint(MAG.magma), 0.7 * alpha);
      g.lineBetween(x0, y0, kx, ky);
      g.lineBetween(kx, ky, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
      g.lineStyle(1.4, tint(MAG.white), (0.6 + 0.3 * Math.sin(t * 9 + i)) * alpha);
      g.lineBetween(x0, y0, kx, ky);
      g.lineBetween(kx, ky, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
    }
    const fires = Math.round(dmg * 12);
    for (let i = 0; i < fires; i++) {
      const a = noise(seed, 150 + i) * TAU;
      const fx = cx + Math.cos(a) * hw * 0.9;
      const fy = cy + Math.sin(a) * hh * 0.9;
      const fl = 8 + Math.sin(t * 11 + i * 2.3) * 4;
      g.fillStyle(tint(i % 2 ? MAG.gold : MAG.lava), 0.8 * alpha);
      g.fillTriangle(fx - 3.4, fy, fx + 3.4, fy, fx + Math.sin(t * 7 + i) * 2.5, fy - fl);
    }

    if (flash > 0) {
      g.fillStyle(tint(MAG.white), 0.32 * flash * alpha);
      g.fillPoints(hullOutline(cx, cy, w, h, 1), true);
    }
    return;
  }

  // ── Rigging, over the fighters ──
  const masts: Array<[number, number]> = [[-0.42, 0.78], [0.02, 1], [0.44, 0.7]];
  masts.forEach(([u, size], i) => {
    const mx = cx + u * hw;
    const yard = hh * 0.98 * size;
    // The yard and its furled sail: a roll of scorched canvas, smouldering at the ends.
    g.lineStyle(3, tint(PIR.timberDark), 0.92 * alpha);
    g.lineBetween(mx, cy - yard, mx, cy + yard);
    g.lineStyle(5.5, tint(MAG.sash), 0.8 * alpha);
    g.lineBetween(mx + 3, cy - yard * 0.86, mx + 3, cy + yard * 0.86);
    g.lineStyle(1.6, tint(MAG.coatLit), 0.9 * alpha);
    for (let k = -3; k <= 3; k++) {
      const yy = cy + (k / 3.5) * yard * 0.86;
      g.lineBetween(mx, yy, mx + 6.5, yy);
    }
    for (const end of [-1, 1]) {
      const ey = cy + end * yard;
      const fl = 5 + Math.sin(t * 9 + i * 2 + end) * 2.5;
      g.fillStyle(tint(MAG.gold), 0.85 * alpha);
      g.fillTriangle(mx - 2.6, ey, mx + 2.6, ey, mx + Math.sin(t * 6 + i) * 2, ey - fl * end);
    }
    // The mast, seen end-on: a ringed stump with the crow's nest round it.
    g.fillStyle(tint(PIR.timberDark), alpha);
    g.fillCircle(mx, cy, 8.5 * size);
    g.fillStyle(tint(PIR.timberLit), alpha);
    g.fillCircle(mx, cy, 5.6 * size);
    g.lineStyle(1.4, tint(PIR.brass), 0.9 * alpha);
    g.strokeCircle(mx, cy, 8.5 * size);
    g.fillStyle(tint(PIR.timberDark), alpha);
    g.fillCircle(mx, cy, 2 * size);
  });

  // Stern lanterns.
  for (const v of [-1, 1]) {
    const lx = cx - hw * 0.95, ly = cy + v * hh * 0.5;
    g.fillStyle(tint(MAG.gold), (0.22 + 0.08 * Math.sin(t * 5 + v)) * alpha);
    g.fillCircle(lx, ly, 11);
    g.fillStyle(tint(PIR.brassDark), alpha);
    g.fillRect(lx - 3.4, ly - 4.4, 6.8, 8.8);
    g.fillStyle(tint(MAG.white), 0.95 * alpha);
    g.fillRect(lx - 1.8, ly - 2.6, 3.6, 5.2);
  }

  // The flag off the stern: black, with the skull, snapping in the heat.
  const fx0 = cx - hw * 1.0, fy0 = cy;
  const flag: Phaser.Geom.Point[] = [];
  const fl = 34, fhh = 11;
  for (let i = 0; i <= 6; i++) flag.push(P(fx0 - (i / 6) * fl, fy0 - fhh + Math.sin(t * 6 + i * 0.9) * 2.4 * (i / 6)));
  for (let i = 6; i >= 0; i--) flag.push(P(fx0 - (i / 6) * fl, fy0 + fhh + Math.sin(t * 6 + i * 0.9 + 0.6) * 2.4 * (i / 6)));
  g.fillStyle(tint(MAG.scorch), 0.95 * alpha);
  g.fillPoints(flag, true);
  g.lineStyle(1, tint(MAG.ember), 0.8 * alpha);
  g.strokePoints(flag, true);
  const sx = fx0 - fl * 0.5, sy = fy0 + Math.sin(t * 6 + 2.6) * 1.2;
  g.fillStyle(tint(MAG.bone), 0.95 * alpha);
  g.fillCircle(sx, sy - 1, 4.4);
  g.fillRect(sx - 2.4, sy + 2, 4.8, 2.6);
  g.fillStyle(tint(MAG.scorch), alpha);
  g.fillCircle(sx - 1.6, sy - 1.2, 1.2);
  g.fillCircle(sx + 1.6, sy - 1.2, 1.2);
  g.lineStyle(1.3, tint(MAG.bone), 0.9 * alpha);
  g.lineBetween(sx - 6, sy - 6, sx + 6, sy + 6);
  g.lineBetween(sx - 6, sy + 6, sx + 6, sy - 6);
}

/**
 * A deck gun on its carriage, muzzle along `ang`. `loaded` is 0–1 reload progress (1 = ready,
 * and the touch-hole glows); `fuse` is 0 when unlit, else 0 → 1 as the fuse burns down;
 * `recoil` 0–1 kicks her back on the carriage.
 */
export function deckCannon(
  g: G, tint: MagmaColorFn, x: number, y: number, ang: number,
  loaded: number, fuse: number, recoil: number, t: number, hover: boolean, alpha = 1,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const back = recoil * 9;
  const at = (u: number, v: number) => P(x + c * (u - back) - s * v, y + s * (u - back) + c * v);
  const ready = loaded >= 1;

  if (hover && ready && fuse <= 0) {
    g.lineStyle(2, tint(MAG.gold), (0.55 + 0.3 * Math.sin(t * 8)) * alpha);
    g.strokeCircle(x, y, 27);
  }
  // Carriage and trucks.
  g.fillStyle(tint(PIR.timberDark), alpha);
  g.fillPoints([at(-15, -11), at(7, -9), at(7, 9), at(-15, 11)], true);
  g.fillStyle(tint(PIR.timberLit), alpha);
  g.fillPoints([at(-13, -8), at(5, -6.6), at(5, -3), at(-13, -4)], true);
  g.fillStyle(tint(PIR.iron), alpha);
  for (const [u, v] of [[-11, -12], [-11, 12], [3, -10.5], [3, 10.5]] as Array<[number, number]>) {
    g.fillCircle(at(u, v).x, at(u, v).y, 3.4);
  }
  // Barrel: iron, banded in brass, swelling at the breech.
  g.fillStyle(tint(PIR.iron), alpha);
  g.fillPoints([at(-14, -6.6), at(22, -4.8), at(24, -6), at(26, -6), at(26, 6), at(24, 6), at(22, 4.8), at(-14, 6.6)], true);
  g.fillCircle(at(-15, 0).x, at(-15, 0).y, 6.2);
  g.fillStyle(tint(PIR.ironLit), 0.9 * alpha);
  g.fillPoints([at(-13, -4.6), at(22, -3.2), at(22, -1), at(-13, -1.6)], true);
  g.fillStyle(tint(PIR.brass), alpha);
  for (const u of [-6, 6, 17]) g.fillPoints([at(u, -6.4), at(u + 2.4, -6.2), at(u + 2.4, 6.2), at(u, 6.4)], true);
  // The bore, banked while she reloads.
  const m = at(26.5, 0);
  g.fillStyle(tint(MAG.scorch), alpha);
  g.fillEllipse(m.x, m.y, 4 + Math.abs(s) * 7, 4 + Math.abs(c) * 7);
  g.fillStyle(tint(ready ? MAG.lava : MAG.magma), (ready ? 0.75 + 0.2 * Math.sin(t * 6) : 0.25 * loaded) * alpha);
  g.fillEllipse(m.x, m.y, 2.6 + Math.abs(s) * 4.6, 2.6 + Math.abs(c) * 4.6);
  // Touch-hole and fuse.
  const hole = at(-11, 0);
  if (fuse > 0) {
    const tipU = -11 - (1 - fuse) * 12;
    const tip = at(tipU, -3 - (1 - fuse) * 4);
    g.lineStyle(1.6, tint(MAG.bone), alpha);
    g.lineBetween(hole.x, hole.y, tip.x, tip.y);
    for (let i = 0; i < 5; i++) {
      const a = noise(i, Math.floor(t * 50)) * TAU;
      const len = 4 + noise(i + 9, Math.floor(t * 50)) * 7;
      g.lineStyle(1.2, tint(i % 2 ? MAG.white : MAG.gold), alpha);
      g.lineBetween(tip.x, tip.y, tip.x + Math.cos(a) * len, tip.y + Math.sin(a) * len);
    }
    g.fillStyle(tint(MAG.white), alpha);
    g.fillCircle(tip.x, tip.y, 2.4);
  } else if (ready) {
    const tip = at(-23, -7);
    g.lineStyle(1.6, tint(MAG.bone), alpha);
    g.lineBetween(hole.x, hole.y, tip.x, tip.y);
    g.fillStyle(tint(MAG.ember), (0.6 + 0.3 * Math.sin(t * 5)) * alpha);
    g.fillCircle(tip.x, tip.y, 1.8);
  } else {
    // Reloading: a clock in brass on the breech.
    g.lineStyle(2, tint(PIR.brassLit), 0.9 * alpha);
    g.beginPath();
    g.arc(hole.x, hole.y, 5, -Math.PI / 2, -Math.PI / 2 + TAU * loaded);
    g.strokePath();
  }
}

/** A molten cannonball in the air: crusted iron with the melt breaking through, and its tail. */
export function moltenBall(
  g: G, tint: MagmaColorFn, x: number, y: number, r: number, ang: number, t: number, seed: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 1; i <= 6; i++) {
    g.fillStyle(tint(i < 3 ? MAG.lava : i < 5 ? MAG.magma : MAG.smoke), 0.55 - i * 0.07);
    g.fillCircle(x - c * i * r * 0.62 + Math.sin(t * 14 + i) * 1.6, y - s * i * r * 0.62, r * (1 - i * 0.12));
  }
  g.fillStyle(tint(MAG.magma), 0.3);
  g.fillCircle(x, y, r * 1.55);
  g.fillStyle(tint(MAG.basalt), 1);
  g.fillCircle(x, y, r);
  // Fissures, turning with the ball.
  for (let i = 0; i < 5; i++) {
    const a = t * 5 + seed + (i / 5) * TAU;
    const b = a + 0.6 + noise(seed, i) * 0.8;
    g.lineStyle(2.6, tint(MAG.lava), 0.95);
    g.lineBetween(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(b) * r * 0.92, y + Math.sin(b) * r * 0.92);
    g.lineStyle(1, tint(MAG.white), 0.9);
    g.lineBetween(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(b) * r * 0.7, y + Math.sin(b) * r * 0.7);
  }
  g.fillStyle(tint(MAG.gold), 0.9);
  g.fillCircle(x + c * r * 0.3, y + s * r * 0.3, r * 0.3);
}

/** Where a cannonball is going to come down: a closing ring with a cross in it. */
export function impactMarker(
  g: G, tint: MagmaColorFn, x: number, y: number, r: number, u: number, t: number,
): void {
  const k = 1.5 - 0.5 * u;
  g.fillStyle(tint(MAG.magma), 0.08 + 0.12 * u);
  g.fillEllipse(x, y, r * 2, r * 1.4);
  g.lineStyle(2.2, tint(MAG.gold), 0.4 + 0.5 * u);
  g.strokeEllipse(x, y, r * 2 * k, r * 1.4 * k);
  g.lineStyle(1.4, tint(MAG.white), 0.3 + 0.5 * u);
  const a = t * 1.5;
  for (let i = 0; i < 4; i++) {
    const b = a + (i / 4) * TAU;
    g.lineBetween(x + Math.cos(b) * r * 0.35, y + Math.sin(b) * r * 0.25, x + Math.cos(b) * r * 0.75, y + Math.sin(b) * r * 0.52);
  }
}

/** The anchor chain from the hawse to the anchor, link by link, sagging while it is slack. */
export function anchorChain(
  g: G, tint: MagmaColorFn, x0: number, y0: number, x1: number, y1: number, slack: number, hot: number,
): void {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(4, Math.round(dist / 9));
  const nx = -(y1 - y0) / Math.max(1, dist), ny = (x1 - x0) / Math.max(1, dist);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const sag = Math.sin(u * Math.PI) * slack;
    const lx = Phaser.Math.Linear(x0, x1, u) + nx * sag;
    const ly = Phaser.Math.Linear(y0, y1, u) + ny * sag;
    const flat = i % 2 === 0;
    g.lineStyle(flat ? 2.2 : 1.6, tint(hot > 0 && i % 3 === 0 ? MAG.ember : flat ? PIR.ironLit : PIR.iron), 1);
    if (flat) {
      g.beginPath();
      g.arc(lx, ly, 3.4, 0, TAU);
      g.strokePath();
    } else {
      g.lineBetween(lx - Math.cos(ang) * 4, ly - Math.sin(ang) * 4, lx + Math.cos(ang) * 4, ly + Math.sin(ang) * 4);
    }
  }
}

/**
 * The anchor. At rest it is bitten into the floor in a crust of cooled lava, with the ring
 * that says "shoot me"; in flight (`hot` 0–1) it is a glowing iron wrecking ball, flukes out.
 */
export function shipAnchor(
  g: G, tint: MagmaColorFn, x: number, y: number, ang: number, hot: number, t: number, atRest: boolean,
): void {
  if (atRest) {
    g.fillStyle(tint(MAG.crustDeep), 1);
    g.fillEllipse(x, y + 9, 46, 17);
    g.fillStyle(tint(MAG.magma), 0.5 + 0.2 * Math.sin(t * 2.6));
    g.fillEllipse(x, y + 9, 32, 9);
    g.lineStyle(1.8, tint(MAG.gold), 0.35 + 0.3 * Math.sin(t * 4));
    g.strokeCircle(x, y, 25 + Math.sin(t * 4) * 2);
  } else {
    g.fillStyle(tint(MAG.magma), 0.2 + 0.25 * hot);
    g.fillCircle(x, y, 30 + hot * 8);
  }
  const c = Math.cos(ang), s = Math.sin(ang);
  const at = (u: number, v: number) => P(x + c * u - s * v, y + s * u + c * v);
  const iron = tint(hot > 0.5 ? MAG.lava : PIR.iron);
  const lit = tint(hot > 0.5 ? MAG.white : hot > 0.1 ? MAG.ember : PIR.ironLit);
  // Shank, stock, ring.
  g.lineStyle(5.5, iron, 1);
  g.lineBetween(at(-16, 0).x, at(-16, 0).y, at(13, 0).x, at(13, 0).y);
  g.lineStyle(2, lit, 0.9);
  g.lineBetween(at(-15, -1).x, at(-15, -1).y, at(12, -1).x, at(12, -1).y);
  g.lineStyle(4, iron, 1);
  g.lineBetween(at(-10, -11).x, at(-10, -11).y, at(-10, 11).x, at(-10, 11).y);
  g.lineStyle(2.6, iron, 1);
  g.strokeCircle(at(-20, 0).x, at(-20, 0).y, 4.6);
  // Arms and flukes.
  g.lineStyle(5, iron, 1);
  g.beginPath();
  g.arc(at(3, 0).x, at(3, 0).y, 15, ang - Math.PI * 0.42, ang + Math.PI * 0.42);
  g.strokePath();
  for (const v of [-1, 1]) {
    const tip = at(3 + Math.cos(Math.PI * 0.42) * 15, v * Math.sin(Math.PI * 0.42) * 15);
    g.fillStyle(iron, 1);
    g.fillPoints([
      P(tip.x + c * 3 - s * v * 8, tip.y + s * 3 + c * v * 8),
      P(tip.x - c * 9, tip.y - s * 9),
      P(tip.x + c * 7 + s * v * 2, tip.y + s * 7 - c * v * 2),
    ], true);
    g.fillStyle(lit, 0.9);
    g.fillCircle(tip.x, tip.y, 1.8);
  }
}
