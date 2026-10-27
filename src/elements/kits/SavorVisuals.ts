import Phaser from 'phaser';
import { AvatarSpec, ArmHold, ArmPose, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Savor's look. Two characters on one body, swapped with every dodge:
 *
 * - **Sugar** — a soft, happy ball of white sugar with glittering grains, a sugar cane slung on
 *   its back like a backpack, and a wide smile. Candy-coloured everything.
 * - **Salt** — the same ball gone hard and crystalline: grey-white facets, salt spikes on the
 *   crown, a black scar where the left eye should be, and a scowl.
 *
 * The element's two primitives are the wrapped candy (`candy`) and the salt shard (`saltShard`).
 * Every painter takes a `ColorFn` so a skin can recolour it, and the codex previews call the
 * same functions the kit does.
 */

export const SAVOR = {
  ink: 0x161218,
  sugar: 0xfbf7ff,
  sugarShade: 0xe2d8ec,
  sugarRim: 0xb7aac4,
  sugarLit: 0xffffff,
  sparkle: 0xfff2c4,
  caneRed: 0xe0384a,
  caneRedDark: 0x9c1f30,
  caneWhite: 0xfff8f8,
  cinnamon: 0xe0402f,
  cinnamonLit: 0xff8a6a,
  mint: 0x4fdcaa,
  mintLit: 0xb8ffe4,
  lemon: 0xffd93a,
  lemonLit: 0xfff3a8,
  punch: 0xff5f9e,
  punchLit: 0xffb8d4,
  licorice: 0x1c1418,
  licoriceHi: 0x5c4a54,
  violet: 0x8a6bff,
  sky: 0x4aa8ff,
  choco: 0x5a3420,
  chocoLit: 0x9a6a44,
  chocoDark: 0x2a160c,
  salt: 0xe8eef2,
  saltShade: 0xaab7c2,
  saltDark: 0x5d6b77,
  saltRim: 0x34404a,
  saltEdge: 0xffffff,
  scar: 0x120e12,
  scarRed: 0x7a1e2a,
  zoneGreen: 0x58e070,
  zoneYellow: 0xffd84a,
  zoneRed: 0xff4a4a,
  white: 0xffffff,
};

export type SavorColorFn = ColorFn;
export type SavorForm = 'sugar' | 'salt';
export type CandyKind = 'cinnamon' | 'mint' | 'lemon' | 'punch' | 'licorice' | 'rainbow';
/** The four buffs a candy can carry. Licorice and the lollipop move all four at once. */
export type BuffKind = 'cinnamon' | 'mint' | 'lemon' | 'punch';
export const BUFF_KINDS: BuffKind[] = ['cinnamon', 'mint', 'lemon', 'punch'];

export const CANDY_COLOR: Record<CandyKind, number> = {
  cinnamon: SAVOR.cinnamon,
  mint: SAVOR.mint,
  lemon: SAVOR.lemon,
  punch: SAVOR.punch,
  licorice: SAVOR.licorice,
  rainbow: SAVOR.violet,
};
const CANDY_LIT: Record<CandyKind, number> = {
  cinnamon: SAVOR.cinnamonLit,
  mint: SAVOR.mintLit,
  lemon: SAVOR.lemonLit,
  punch: SAVOR.punchLit,
  licorice: SAVOR.licoriceHi,
  rainbow: SAVOR.white,
};
const RAINBOW = [SAVOR.cinnamon, SAVOR.lemon, SAVOR.mint, SAVOR.sky, SAVOR.violet, SAVOR.punch];

export function hexStr(c: number): string { return `#${c.toString(16).padStart(6, '0')}`; }

/** A seeded random so a sparkle pattern holds still on a body and does not boil. */
function seeded(seed: number): () => number {
  let s = Math.floor(Math.abs(seed) * 9301 + 49297) % 233280;
  if (s <= 0) s += 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ── Primitives ───────────────────────────────────────────────────────────────

/**
 * The element's primitive: a wrapped sweet with a twist of wrapper either side. Licorice is a
 * twisted black rope instead; the lollipop is a rainbow swirl on a stick.
 */
export function candy(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, kind: CandyKind,
  scale: number, t: number, alpha: number, ang = 0,
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (px: number, py: number) => ({ x: x + (px * c - py * s) * scale, y: y + (px * s + py * c) * scale });
  // Shadow, so a sweet on the floor sits on it.
  g.fillStyle(tint(SAVOR.ink), alpha * 0.28);
  g.fillEllipse(x, y + 7 * scale, 18 * scale, 5 * scale);
  if (kind === 'licorice') {
    g.lineStyle(5 * scale, tint(SAVOR.licorice), alpha);
    g.beginPath();
    g.moveTo(P(-9, 2).x, P(-9, 2).y);
    for (let i = 1; i <= 8; i++) {
      const px = -9 + i * 2.25;
      const p = P(px, 2 - Math.sin(i * 0.8) * 3);
      g.lineTo(p.x, p.y);
    }
    g.strokePath();
    g.lineStyle(1.4 * scale, tint(SAVOR.licoriceHi), alpha);
    for (let i = 0; i < 5; i++) {
      const a = P(-8 + i * 4, -0.5);
      const b = P(-6 + i * 4, 3.5);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    return;
  }
  if (kind === 'rainbow') {
    const st0 = P(0, 2);
    const st1 = P(0, 13);
    g.lineStyle(2.2 * scale, tint(SAVOR.caneWhite), alpha);
    g.lineBetween(st0.x, st0.y, st1.x, st1.y);
    const ctr = P(0, -3);
    g.fillStyle(tint(SAVOR.white), alpha);
    g.fillCircle(ctr.x, ctr.y, 8.4 * scale);
    for (let i = 0; i < 6; i++) {
      g.lineStyle(2.2 * scale, tint(RAINBOW[i]), alpha);
      g.beginPath();
      const r = (2 + i * 1.1) * scale;
      g.arc(ctr.x, ctr.y, r, t * 2 + i * 1.05, t * 2 + i * 1.05 + Math.PI * 1.3, false);
      g.strokePath();
    }
    g.fillStyle(tint(SAVOR.white), alpha * 0.8);
    g.fillCircle(ctr.x - 2.6 * scale, ctr.y - 3 * scale, 1.6 * scale);
    return;
  }
  const col = tint(CANDY_COLOR[kind]);
  const lit = tint(CANDY_LIT[kind]);
  // The twists.
  g.fillStyle(col, alpha * 0.9);
  for (const side of [-1, 1]) {
    const a = P(side * 6, 0);
    const b = P(side * 12, -4.5);
    const d = P(side * 12, 4.5);
    g.fillTriangle(a.x, a.y, b.x, b.y, d.x, d.y);
  }
  g.fillStyle(lit, alpha * 0.7);
  for (const side of [-1, 1]) {
    const a = P(side * 7, 0);
    const b = P(side * 11.5, -3.5);
    const d = P(side * 10, -0.5);
    g.fillTriangle(a.x, a.y, b.x, b.y, d.x, d.y);
  }
  // The sweet.
  const ctr = P(0, 0);
  g.fillStyle(col, alpha);
  g.fillEllipse(ctr.x, ctr.y, 15 * scale, 11 * scale);
  // A stripe of the lit colour, so the four candies differ by more than hue.
  g.lineStyle(1.6 * scale, lit, alpha * 0.9);
  if (kind === 'cinnamon') {
    for (let i = -1; i <= 1; i++) { const a = P(i * 3.5 - 1.5, -4); const b = P(i * 3.5 + 1.5, 4); g.lineBetween(a.x, a.y, b.x, b.y); }
  } else if (kind === 'mint') {
    g.strokeCircle(ctr.x, ctr.y, 3.2 * scale);
  } else if (kind === 'lemon') {
    const a = P(-5, 0); const b = P(5, 0); g.lineBetween(a.x, a.y, b.x, b.y);
  } else {
    for (const off of [-2.6, 2.6]) { const p = P(off, 0.5); g.fillStyle(lit, alpha); g.fillCircle(p.x, p.y, 1.6 * scale); }
  }
  g.fillStyle(tint(SAVOR.white), alpha * 0.85);
  const gl = P(-3, -2.6);
  g.fillCircle(gl.x, gl.y, 1.5 * scale);
}

/** A faceted shard of salt: dark rim, two lit faces, one hard white edge. Optional coat colours. */
export function saltShard(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, ang: number,
  len: number, halfW: number, alpha: number, coat: number[] = [],
): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (a: number, b: number) => ({ x: x + a * c - b * s, y: y + a * s + b * c });
  const tip = P(len * 0.55, 0);
  const tail = P(-len * 0.45, 0);
  const l = P(-len * 0.05, -halfW);
  const r = P(-len * 0.1, halfW);
  g.fillStyle(tint(SAVOR.saltRim), alpha);
  g.fillPoints([P(len * 0.6, 0), P(-len * 0.05, -halfW - 1.5), P(-len * 0.5, 0), P(-len * 0.1, halfW + 1.5)], true);
  g.fillStyle(tint(SAVOR.saltShade), alpha);
  g.fillPoints([tip, r, tail], true);
  g.fillStyle(tint(SAVOR.salt), alpha);
  g.fillPoints([tip, l, tail], true);
  g.lineStyle(1.2, tint(SAVOR.saltEdge), alpha);
  g.lineBetween(tip.x, tip.y, tail.x, tail.y);
  // Coats: each enemy buff the shard soaked up is a band of colour across it.
  coat.forEach((col, i) => {
    const k = 0.15 + i * 0.18;
    const a = P(len * (0.4 - k), -halfW * (0.95 - k * 0.6));
    const b = P(len * (0.4 - k), halfW * (0.95 - k * 0.6));
    g.lineStyle(3, tint(col), alpha * 0.85);
    g.lineBetween(a.x, a.y, b.x, b.y);
  });
}

/** A puffy cloud of icing sugar: overlapping lumps, shaded under, sparkling on top. */
export function sugarCloud(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number, seed = 1,
): void {
  const rnd = seeded(seed);
  const lumps = 7 + Math.floor(r / 14);
  g.fillStyle(tint(SAVOR.sugarRim), alpha * 0.35);
  g.fillEllipse(x, y + r * 0.25, r * 2.1, r * 1.1);
  for (let pass = 0; pass < 2; pass++) {
    g.fillStyle(tint(pass ? SAVOR.sugar : SAVOR.sugarShade), alpha * (pass ? 0.75 : 0.6));
    for (let i = 0; i < lumps; i++) {
      const a = rnd() * TAU + t * 0.3 * (i % 2 ? 1 : -1);
      const d = rnd() * r * 0.62;
      const lr = r * (0.3 + rnd() * 0.24) * (pass ? 0.8 : 1);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - (pass ? 2 : 0), lr);
    }
  }
  for (let i = 0; i < 5; i++) {
    const a = rnd() * TAU;
    const d = rnd() * r * 0.7;
    const tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 2.1);
    g.fillStyle(tint(SAVOR.sparkle), alpha * tw);
    g.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d * 0.7 - 1, 2, 2);
  }
}

/** One crumb of the bomb's sugar trail. */
export function sugarGrain(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, alpha: number, t: number): void {
  g.fillStyle(tint(SAVOR.sugarShade), alpha * 0.5);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(SAVOR.sugar), alpha * 0.85);
  g.fillCircle(x - r * 0.2, y - r * 0.25, r * 0.65);
  g.fillStyle(tint(SAVOR.sparkle), alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 6 + x))));
  g.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
}

/** The sugar bomb in flight: a white ball wrapped in a pink ribbon, with a sparkling fuse. */
export function sugarBomb(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  g.fillStyle(tint(SAVOR.sugarRim), alpha);
  g.fillCircle(x, y, r + 1.5);
  g.fillStyle(tint(SAVOR.sugar), alpha);
  g.fillCircle(x, y, r);
  g.lineStyle(2.4, tint(SAVOR.punch), alpha);
  g.beginPath();
  g.arc(x, y, r * 0.75, t * 4, t * 4 + Math.PI, false);
  g.strokePath();
  g.fillStyle(tint(SAVOR.white), alpha);
  g.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.28);
  const fx = x + r * 0.6;
  const fy = y - r * 0.9;
  g.lineStyle(1.4, tint(SAVOR.choco), alpha);
  g.lineBetween(x + r * 0.3, y - r * 0.7, fx, fy);
  const fl = 2 + Math.abs(Math.sin(t * 30)) * 2;
  g.fillStyle(tint(SAVOR.lemon), alpha);
  g.fillCircle(fx, fy, fl);
  g.fillStyle(tint(SAVOR.white), alpha);
  g.fillCircle(fx, fy, fl * 0.45);
}

/** A sugar cube, drawn as a little isometric block. */
export function sugarCube(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, s: number, alpha: number): void {
  const h = s * 0.5;
  g.fillStyle(tint(SAVOR.sugar), alpha);
  g.fillPoints([{ x, y: y - h }, { x: x + s, y: y - h * 0.5 - h }, { x, y: y - 2 * h }, { x: x - s, y: y - h * 0.5 - h }].map((p) => ({ x: p.x, y: p.y + h })), true);
  g.fillStyle(tint(SAVOR.sugarShade), alpha);
  g.fillPoints([{ x: x - s, y: y }, { x, y: y + h }, { x, y: y + h + s }, { x: x - s, y: y + s }], true);
  g.fillStyle(tint(SAVOR.sugarRim), alpha);
  g.fillPoints([{ x: x + s, y: y }, { x, y: y + h }, { x, y: y + h + s }, { x: x + s, y: y + s }], true);
  g.fillStyle(tint(SAVOR.sparkle), alpha);
  g.fillRect(x - s * 0.4, y - h * 0.1, 1.6, 1.6);
  g.fillRect(x + s * 0.3, y + h * 0.9, 1.4, 1.4);
}

/** The chocolate ball of Caring Share: glossy, with a drizzle of icing and sprinkles. */
export function chocoBall(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  g.fillStyle(tint(SAVOR.chocoDark), alpha);
  g.fillCircle(x, y, r + 1.5);
  g.fillStyle(tint(SAVOR.choco), alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(SAVOR.chocoLit), alpha * 0.8);
  g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.5);
  g.lineStyle(2, tint(SAVOR.sugar), alpha * 0.9);
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const px = x - r * 0.8 + (i / 10) * r * 1.6;
    const py = y - r * 0.15 + Math.sin(i * 1.4 + t * 3) * r * 0.22;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 0.4;
    g.fillStyle(tint(RAINBOW[i % RAINBOW.length]), alpha);
    g.fillRect(x + Math.cos(a) * r * 0.55 - 1, y + Math.sin(a) * r * 0.55 - 0.6, 2.2, 1.2);
  }
  g.fillStyle(tint(SAVOR.white), alpha * 0.9);
  g.fillCircle(x - r * 0.45, y - r * 0.5, r * 0.18);
}

/** A tall salt spear out of the ground, tip up. `k` 0..1 is how far it has risen. */
export function saltSpear(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, h: number, k: number, alpha: number, lean = 0): void {
  const top = y - h * k;
  const w = 6 + h * 0.06;
  const tx = x + lean * h * k;
  g.fillStyle(tint(SAVOR.saltRim), alpha);
  g.fillTriangle(x - w - 1.5, y + 2, x + w + 1.5, y + 2, tx, top - 2);
  g.fillStyle(tint(SAVOR.saltShade), alpha);
  g.fillTriangle(x, y, x + w, y, tx, top);
  g.fillStyle(tint(SAVOR.salt), alpha);
  g.fillTriangle(x - w, y, x, y, tx, top);
  g.lineStyle(1.2, tint(SAVOR.saltEdge), alpha * 0.9);
  g.lineBetween(x, y, tx, top);
}

/**
 * The timing bar under the salt user while a stalactite hangs: red → yellow → green → yellow →
 * red, with a marker sweeping across it. `k` is the marker, 0..1.
 */
export function timingBar(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, w: number, k: number, alpha: number, greenHalf: number, yellowHalf: number): void {
  const h = 8;
  const left = x - w / 2;
  g.fillStyle(tint(SAVOR.ink), alpha * 0.85);
  g.fillRoundedRect(left - 3, y - h / 2 - 3, w + 6, h + 6, 4);
  g.fillStyle(tint(SAVOR.zoneRed), alpha);
  g.fillRect(left, y - h / 2, w, h);
  g.fillStyle(tint(SAVOR.zoneYellow), alpha);
  g.fillRect(left + w * (0.5 - yellowHalf), y - h / 2, w * yellowHalf * 2, h);
  g.fillStyle(tint(SAVOR.zoneGreen), alpha);
  g.fillRect(left + w * (0.5 - greenHalf), y - h / 2, w * greenHalf * 2, h);
  const mx = left + w * k;
  g.fillStyle(tint(SAVOR.white), alpha);
  g.fillTriangle(mx - 4, y - h / 2 - 6, mx + 4, y - h / 2 - 6, mx, y - h / 2);
  g.fillRect(mx - 1, y - h / 2, 2, h);
}

/** One target in Salt Crash's race: a fat glinting crystal that pulses until it is pressed. */
export function crashCrystal(g: Phaser.GameObjects.Graphics, tint: ColorFn, x: number, y: number, r: number, t: number, alpha: number): void {
  const p = 1 + Math.sin(t * 9) * 0.08;
  g.fillStyle(tint(SAVOR.white), alpha * 0.25);
  g.fillCircle(x, y, r * 1.5 * p);
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i - 1) * 0.55;
    saltShard(g, tint, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, a, r * 1.6 * p, r * 0.42, alpha);
  }
}

/** Sugar Rush's screen: rainbow edges, a speed-line tunnel and a hue wash, on a fixed-to-camera layer. */
export function rushScreen(g: Phaser.GameObjects.Graphics, tint: ColorFn, w: number, h: number, t: number, k: number): void {
  if (k <= 0) return;
  const cx = w / 2;
  const cy = h / 2;
  // A hue wash that cycles.
  const hue = RAINBOW[Math.floor(t * 4) % RAINBOW.length];
  g.fillStyle(tint(hue), 0.05 * k);
  g.fillRect(-w * 0.25, -h * 0.25, w * 1.5, h * 1.5);
  // Rainbow bands round the edge.
  for (let i = 0; i < RAINBOW.length; i++) {
    const inset = i * 7;
    g.lineStyle(7, tint(RAINBOW[(i + Math.floor(t * 10)) % RAINBOW.length]), 0.22 * k);
    g.strokeRect(inset - 40, inset - 40, w + 80 - inset * 2, h + 80 - inset * 2);
  }
  // Speed lines rushing out of the centre.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + Math.sin(i * 7.7) * 0.2;
    const ph = (t * 1.6 + i * 0.137) % 1;
    const d0 = 160 + ph * 420;
    const d1 = d0 + 40 + ph * 70;
    g.lineStyle(2 + ph * 2, tint(RAINBOW[i % RAINBOW.length]), 0.35 * k * ph);
    g.lineBetween(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0, cx + Math.cos(a) * d1, cy + Math.sin(a) * d1);
  }
}

// ── One-shot effects ─────────────────────────────────────────────────────────

export class SavorFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: ColorFn) { super(scene, tint); }

  /** The bomb leaves the hand: a puff of icing sugar and a ribbon flick. */
  slamLaunch(x: number, y: number, ang: number): void {
    this.anim(8.5, 240, (g, t) => {
      sugarCloud(g, this.tint, x + Math.cos(ang) * 6 * t, y + Math.sin(ang) * 6 * t, 6 + easeOut(t) * 10, t, 1 - t, 3);
      g.lineStyle(2, this.tint(SAVOR.punch), (1 - t) * 0.8);
      g.strokeCircle(x, y, 4 + t * 12);
    });
  }

  /** The sugar bomb goes off: flash, lumpy body, rings, sprinkle shrapnel, settling cloud. */
  slamBurst(x: number, y: number, r: number): void {
    this.anim(9, 520, (g, t) => {
      const e = easeOut(t);
      if (t < 0.25) {
        g.fillStyle(this.tint(SAVOR.white), (1 - t * 4) * 0.9);
        g.fillCircle(x, y, r * 0.5 * (0.6 + t * 2));
      }
      sugarCloud(g, this.tint, x, y, r * (0.35 + e * 0.7), t * 2, (1 - easeIn(t)) * 0.95, 7);
      for (let ring = 0; ring < 2; ring++) {
        const k = Math.max(0, t - ring * 0.15) / (1 - ring * 0.15);
        if (k <= 0) continue;
        const rr = r * (0.3 + easeOut(k) * 0.9);
        const segs = Math.max(14, Math.floor(rr / 3));
        g.lineStyle(3 - ring, this.tint(ring ? SAVOR.punch : SAVOR.sugar), (1 - k) * 0.85);
        g.beginPath();
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * TAU;
          const j = rr + Math.sin(i * 3.7 + ring) * 2.5;
          if (i === 0) g.moveTo(x + Math.cos(a) * j, y + Math.sin(a) * j); else g.lineTo(x + Math.cos(a) * j, y + Math.sin(a) * j);
        }
        g.strokePath();
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + i * 0.37;
        const d = r * (0.2 + e * (0.9 + (i % 3) * 0.15));
        g.fillStyle(this.tint(RAINBOW[i % RAINBOW.length]), 1 - t);
        g.fillRect(x + Math.cos(a) * d - 1.5, y + Math.sin(a) * d - 0.8, 3, 1.6);
      }
    });
    this.scene.cameras.main.shake(90, 0.003);
  }

  /** A bag of sweets torn open: the bag puffs and wrappers flick out. */
  bagBurst(x: number, y: number): void {
    this.anim(8.5, 360, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(SAVOR.punchLit), (1 - t) * 0.9);
      g.fillRoundedRect(x - 9, y - 12 - e * 6, 18, 16, 4);
      g.fillStyle(this.tint(SAVOR.punch), (1 - t));
      g.fillRect(x - 9, y - 12 - e * 6, 18, 3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU - Math.PI / 2;
        const d = 6 + e * 26;
        g.fillStyle(this.tint(RAINBOW[i % RAINBOW.length]), 1 - t);
        g.fillTriangle(x + Math.cos(a) * d, y + Math.sin(a) * d, x + Math.cos(a + 0.3) * (d - 5), y + Math.sin(a + 0.3) * (d - 5),
          x + Math.cos(a - 0.3) * (d - 5), y + Math.sin(a - 0.3) * (d - 5));
      }
    });
  }

  /** A candy eaten: a pop of its own colour and a ring of grains. */
  pickup(x: number, y: number, kind: CandyKind): void {
    const col = kind === 'rainbow' ? SAVOR.violet : CANDY_COLOR[kind];
    this.anim(9, 360, (g, t) => {
      const e = easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.5, this.tint(col), 1 - t);
      g.strokeCircle(x, y, 6 + e * 22);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const d = 4 + e * 18;
        g.fillStyle(this.tint(kind === 'rainbow' ? RAINBOW[i % RAINBOW.length] : col), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 * (1 - t) + 0.6);
      }
    });
  }

  /** Blood sugar pulled out of a body: a stream of grains from victim to caster, forming a cube. */
  drain(fromX: number, fromY: number, toX: number, toY: number): void {
    this.anim(9.5, 520, (g, t) => {
      for (let i = 0; i < 10; i++) {
        const k = Phaser.Math.Clamp(t * 1.6 - i * 0.06, 0, 1);
        if (k <= 0 || k >= 1) continue;
        const bend = Math.sin(k * Math.PI) * 26 * (i % 2 ? 1 : -1);
        const nx = -(toY - fromY);
        const ny = toX - fromX;
        const nl = Math.hypot(nx, ny) || 1;
        const px = fromX + (toX - fromX) * k + (nx / nl) * bend;
        const py = fromY + (toY - fromY) * k + (ny / nl) * bend;
        sugarGrain(g, this.tint, px, py, 3, 1, t + i);
      }
      g.lineStyle(2, this.tint(SAVOR.cinnamon), (1 - t) * 0.8);
      g.strokeCircle(fromX, fromY, 10 + t * 16);
    });
  }

  /** Caring Share lands: a chocolate splat, then a golden ribbon of borrowed buffs. */
  chocoSplat(x: number, y: number): void {
    this.anim(9, 460, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.2;
        const d = 6 + e * (18 + (i % 3) * 6);
        g.fillStyle(this.tint(i % 2 ? SAVOR.chocoLit : SAVOR.choco), 1 - t);
        g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 4 * (1 - t) + 1);
      }
      g.lineStyle(2.4, this.tint(SAVOR.lemon), (1 - t));
      g.strokeCircle(x, y, 10 + e * 26);
    });
  }

  /** A sugar crash: the borrowed glow drains out downward, grey. */
  crash(x: number, y: number): void {
    this.anim(9, 620, (g, t) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const px = x + Math.cos(a) * 14;
        const py = y + Math.sin(a) * 10 + easeIn(t) * 26;
        g.fillStyle(this.tint(SAVOR.saltDark), (1 - t) * 0.8);
        g.fillCircle(px, py, 3 * (1 - t) + 1);
      }
      g.lineStyle(2, this.tint(SAVOR.licoriceHi), 1 - t);
      g.strokeEllipse(x, y + 16, 30 + t * 20, 8 + t * 4);
    });
  }

  /** Sugar Rush ignites: a rainbow ring, a burst of sweets, a flash. */
  rushIgnite(x: number, y: number): void {
    this.anim(9.5, 700, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < RAINBOW.length; i++) {
        g.lineStyle(4, this.tint(RAINBOW[i]), (1 - t) * 0.9);
        g.strokeCircle(x, y, 14 + e * (60 + i * 9));
      }
      if (t < 0.2) { g.fillStyle(this.tint(SAVOR.white), 1 - t * 5); g.fillCircle(x, y, 26); }
    });
    this.scene.cameras.main.flash(180, 255, 220, 250);
  }

  /** Space: the body flips between sugar and salt in a puff of the new one. */
  shift(x: number, y: number, to: SavorForm): void {
    this.anim(9, 380, (g, t) => {
      const e = easeOut(t);
      if (to === 'sugar') {
        sugarCloud(g, this.tint, x, y, 14 + e * 18, t, (1 - t) * 0.85, 11);
      } else {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + 0.2;
          saltShard(g, this.tint, x + Math.cos(a) * (8 + e * 22), y + Math.sin(a) * (8 + e * 22), a, 10 * (1 - t) + 3, 2.5, 1 - t);
        }
      }
      g.lineStyle(2, this.tint(to === 'sugar' ? SAVOR.punch : SAVOR.saltEdge), 1 - t);
      g.strokeCircle(x, y, 18 + e * 14);
    });
  }

  /** A salt shard leaves the hand: a crack of white and a few flecks. */
  sliceLaunch(x: number, y: number, ang: number): void {
    this.anim(8.5, 180, (g, t) => {
      for (let i = 0; i < 5; i++) {
        const a = ang + Math.PI + (i - 2) * 0.45;
        const d = 3 + easeOut(t) * 12;
        g.fillStyle(this.tint(i % 2 ? SAVOR.salt : SAVOR.saltShade), 1 - t);
        g.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d - 1, 2, 2);
      }
      g.lineStyle(1.6, this.tint(SAVOR.saltEdge), 1 - t);
      g.lineBetween(x, y, x + Math.cos(ang) * (10 + t * 16), y + Math.sin(ang) * (10 + t * 16));
    });
  }

  /** A salt shard shatters on a body or a wall. */
  shatter(x: number, y: number, ang: number, big = false): void {
    const n = big ? 12 : 7;
    this.anim(9, big ? 420 : 280, (g, t) => {
      const e = easeOut(t);
      for (let i = 0; i < n; i++) {
        const a = ang + Math.PI + (i / n - 0.5) * 2.4;
        const d = 4 + e * (big ? 34 : 20);
        saltShard(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a, (big ? 9 : 6) * (1 - t) + 2, 2, 1 - t);
      }
      g.fillStyle(this.tint(SAVOR.white), (1 - t) * 0.7);
      g.fillCircle(x, y, (big ? 10 : 6) * (1 - t));
    });
  }

  /** The shield cracks to nothing. */
  shieldBreak(x: number, y: number): void {
    this.anim(9, 420, (g, t) => {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const d = 24 + easeOut(t) * 22;
        saltShard(g, this.tint, x + Math.cos(a) * d, y + Math.sin(a) * d, a, 8 * (1 - t) + 2, 2.2, 1 - t);
      }
    });
  }

  /** Salt in the Wounds: a cone of glittering spray, redder the harder it stings. */
  woundSpray(x: number, y: number, ang: number, half: number, range: number, sting: number): void {
    this.anim(9, 380, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(SAVOR.salt), (1 - t) * 0.22);
      g.slice(x, y, range * e, ang - half, ang + half, false);
      g.fillPath();
      for (let i = 0; i < 26; i++) {
        const a = ang + (((i * 37) % 26) / 26 - 0.5) * half * 2;
        const d = range * e * (0.35 + ((i * 13) % 10) / 15);
        g.fillStyle(this.tint(i % 3 === 0 && sting > 0.3 ? SAVOR.zoneRed : SAVOR.saltEdge), (1 - t));
        g.fillRect(x + Math.cos(a) * d - 1.2, y + Math.sin(a) * d - 1.2, 2.4, 2.4);
      }
    });
  }

  /** The wound stings: a red flare on the body, sized by the damage. */
  sting(x: number, y: number, k: number): void {
    this.anim(9.2, 320, (g, t) => {
      g.lineStyle(2 + k * 3, this.tint(SAVOR.zoneRed), (1 - t));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.4;
        g.lineBetween(x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * (12 + k * 14 * easeOut(t)), y + Math.sin(a) * (12 + k * 14 * easeOut(t)));
      }
    });
  }

  /** Spears break the floor under someone. */
  spearsErupt(x: number, y: number): void {
    this.anim(9, 520, (g, t) => {
      const e = easeOut(Math.min(1, t * 2));
      g.fillStyle(this.tint(SAVOR.saltRim), (1 - t) * 0.6);
      g.fillEllipse(x, y + 12, 50, 14);
      for (let i = 0; i < 5; i++) {
        const ox = (i - 2) * 9;
        saltSpear(g, this.tint, x + ox, y + 14, 40 + (2 - Math.abs(i - 2)) * 14, e, 1 - easeIn(t), -ox * 0.006);
      }
    });
    this.scene.cameras.main.shake(160, 0.006);
  }

  /** A coat soaked up from an enemy's buffs. */
  coatFlash(x: number, y: number, cols: number[]): void {
    this.anim(9.3, 360, (g, t) => {
      cols.forEach((c, i) => {
        g.lineStyle(3, this.tint(c), 1 - t);
        g.strokeCircle(x, y, 8 + i * 5 + easeOut(t) * 14);
      });
    });
  }

  /** A sparkle of salt over sweets — the salted state. */
  salted(x: number, y: number): void {
    this.anim(9.3, 480, (g, t) => {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const d = 10 + easeOut(t) * 26;
        g.fillStyle(this.tint(SAVOR.saltEdge), 1 - t);
        g.fillRect(x + Math.cos(a) * d - 1.2, y + Math.sin(a) * d - 1.2 - t * 8, 2.4, 2.4);
      }
    });
  }
}

// ── The rig ──────────────────────────────────────────────────────────────────

const SUGAR_HANDS = [
  { r: 9, color: SAVOR.sparkle, alpha: 0.2 },
  { r: 6.6, color: SAVOR.sugarRim, alpha: 1 },
  { r: 5.4, color: SAVOR.sugar, alpha: 1 },
  { r: 1.7, color: SAVOR.white, alpha: 0.95, ox: -1.5, oy: -1.6 },
];
const SALT_HAND_COLORS = [SAVOR.saltShade, SAVOR.saltRim, SAVOR.salt, SAVOR.saltEdge];

const SAVOR_AVATAR: AvatarSpec = {
  hands: SUGAR_HANDS,
  eyeWhite: SAVOR.white,
  eyePupil: SAVOR.ink,
  squash: { div: 15, x: 0.4, y: 0.24 },
};

/**
 * One body, two characters. The sprite underneath is a white sugar orb; Salt paints its facets
 * over it in `drawBody`, and swaps the hands to crystal. Sugar wears the sugar cane on its back
 * (drawn in the glow layer, under the sprite, so only the crook shows over the shoulder) and a
 * smile; Salt wears a crown of salt spikes, a black scar across its left eye, and a scowl.
 */
export class SavorAvatar extends BaseAvatar {
  private form: SavorForm = 'sugar';
  private cubes = 0;
  private shieldK = 0;
  private rush = 0;

  constructor(scene: Phaser.Scene, tint: ColorFn, depth = 6) {
    super(scene, tint, depth, SAVOR_AVATAR);
  }

  setForm(form: SavorForm): void {
    if (form === this.form) return;
    this.form = form;
    for (let layer = 0; layer < 4; layer++) {
      const col = form === 'salt' ? SALT_HAND_COLORS[layer] : SUGAR_HANDS[layer].color;
      this.forEachHandLayer(layer, (arc) => arc.setFillStyle(this.tint(col), arc.fillAlpha));
    }
  }

  /** Sugar cubes floating over the head — one per drain this match. */
  setCubes(n: number): void { this.cubes = n; }
  /** 0..1, how close the salt crust is to full. */
  setShield(k: number): void { this.shieldK = k; }
  /** Sugar Rush: 0..1. */
  setRush(k: number): void { this.rush = k; this.setIntensity(k > 0 ? 1.4 : 1); }

  protected applyMastery(on: boolean): void {
    // Savor has no mastery yet. The tell is ready: the glints turn gold.
    this.forEachHandLayer(3, (arc) => arc.setFillStyle(this.tint(on ? SAVOR.lemon : SAVOR.white), 0.95));
  }

  protected extraHoldPose(hold: ArmHold, side: number, idle: ArmPose): ArmPose | null {
    void hold; void side; void idle;
    return null;
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    g.fillStyle(this.tint(SAVOR.ink), a * 0.45);
    g.fillEllipse(x, y + 18, 46, 13);
    if (this.form === 'sugar') {
      // The sugar cane backpack: slung diagonally behind the body, the crook over the right shoulder.
      const bx = x - 12;
      const by = y + 14;
      const tx = x + 9;
      const ty = y - 24;
      g.lineStyle(7, this.tint(SAVOR.caneRedDark), alpha);
      g.lineBetween(bx, by, tx, ty);
      g.lineStyle(5.5, this.tint(SAVOR.caneWhite), alpha);
      g.lineBetween(bx, by, tx, ty);
      // Stripes.
      g.lineStyle(2.4, this.tint(SAVOR.caneRed), alpha);
      for (let i = 0; i < 6; i++) {
        const k = i / 6 + 0.05;
        const px = bx + (tx - bx) * k;
        const py = by + (ty - by) * k;
        g.lineBetween(px - 2.6, py - 1.2, px + 2.6, py + 1.6);
      }
      // The crook.
      g.lineStyle(5.5, this.tint(SAVOR.caneWhite), alpha);
      g.beginPath();
      g.arc(tx + 6, ty, 6, Math.PI, 0, false);
      g.strokePath();
      g.lineStyle(2.4, this.tint(SAVOR.caneRed), alpha);
      g.beginPath();
      g.arc(tx + 6, ty, 6, Math.PI * 1.1, Math.PI * 1.4, false);
      g.strokePath();
      g.beginPath();
      g.arc(tx + 6, ty, 6, Math.PI * 1.65, Math.PI * 1.95, false);
      g.strokePath();
    } else if (this.shieldK > 0) {
      // The salt crust building up round the body.
      const r = 26 + this.shieldK * 6;
      g.fillStyle(this.tint(SAVOR.salt), alpha * (0.12 + this.shieldK * 0.18));
      g.fillCircle(x, y, r);
    }
    if (this.rush > 0) {
      for (let i = 0; i < RAINBOW.length; i++) {
        g.lineStyle(2, this.tint(RAINBOW[(i + Math.floor(this.t * 12)) % RAINBOW.length]), a * 0.6 * this.rush);
        g.strokeCircle(x, y, 26 + i * 3);
      }
    }
  }

  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    if (this.form === 'sugar') {
      // Glittering grains on the soft white body — the one bit of texture it gets.
      const rnd = seeded(5);
      for (let i = 0; i < 9; i++) {
        const ang = rnd() * TAU;
        const d = 6 + rnd() * 12;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 3 + i * 1.7));
        g.fillStyle(this.tint(i % 3 ? SAVOR.sparkle : SAVOR.punchLit), alpha * tw);
        g.fillRect(x + Math.cos(ang) * d - 0.9, y + Math.sin(ang) * d + 3 - 0.9, 1.8, 1.8);
      }
      return;
    }
    // Salt: the body goes hard. Grey facets over the white, edges caught by the light.
    const R = 21;
    g.fillStyle(this.tint(SAVOR.saltRim), alpha);
    g.fillCircle(x, y, R + 0.5);
    const facets = 7;
    for (let i = 0; i < facets; i++) {
      const a0 = (i / facets) * TAU - 0.3;
      const a1 = ((i + 1) / facets) * TAU - 0.3;
      const lit = Math.cos((a0 + a1) / 2 + 2.3);
      const col = lit > 0.4 ? SAVOR.salt : lit > -0.3 ? SAVOR.saltShade : SAVOR.saltDark;
      g.fillStyle(this.tint(col), alpha);
      g.fillTriangle(x + 2, y - 3, x + Math.cos(a0) * R, y + Math.sin(a0) * R, x + Math.cos(a1) * R, y + Math.sin(a1) * R);
    }
    g.lineStyle(1, this.tint(SAVOR.saltEdge), alpha * 0.7);
    for (let i = 0; i < facets; i++) {
      const a0 = (i / facets) * TAU - 0.3;
      g.lineBetween(x + 2, y - 3, x + Math.cos(a0) * R, y + Math.sin(a0) * R);
    }
    if (this.shieldK > 0) {
      g.lineStyle(2 + this.shieldK * 2, this.tint(SAVOR.saltEdge), alpha * (0.4 + this.shieldK * 0.5));
      g.strokeCircle(x, y, R + 3 + this.shieldK * 4);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const look = this.facing;
    const bob = Math.sin(this.t * 2.6) * 1.1;
    const fx = x + Math.cos(look) * 2.4;
    const fy = y + Math.sin(look) * 2 + bob;
    if (this.form === 'sugar') {
      // A wide happy smile and two pink cheeks.
      g.lineStyle(2, this.tint(SAVOR.ink), alpha);
      g.beginPath();
      g.arc(fx, fy + 3, 6, 0.25, Math.PI - 0.25, false);
      g.strokePath();
      g.fillStyle(this.tint(SAVOR.punchLit), alpha * 0.75);
      g.fillEllipse(fx - 11, fy + 2, 5, 3);
      g.fillEllipse(fx + 11, fy + 2, 5, 3);
    } else {
      // The scar: a black gash where the left eye was, a red seam down its middle.
      const ex = fx - 7.2;
      const ey = fy - 4;
      g.fillStyle(this.tint(SAVOR.scar), alpha);
      g.fillPoints([
        { x: ex - 6, y: ey - 9 }, { x: ex - 2.5, y: ey - 10 }, { x: ex + 5.5, y: ey + 8 }, { x: ex + 2, y: ey + 9.5 },
      ], true);
      g.fillCircle(ex, ey, 4.8);
      g.lineStyle(1, this.tint(SAVOR.scarRed), alpha);
      g.lineBetween(ex - 4, ey - 8.5, ex + 3.6, ey + 8.4);
      // Angry brow over the good eye.
      g.lineStyle(2.4, this.tint(SAVOR.saltRim), alpha);
      g.lineBetween(fx + 3, fy - 10.5, fx + 11.5, fy - 8);
      // Scowl.
      g.lineStyle(2, this.tint(SAVOR.ink), alpha);
      g.beginPath();
      g.arc(fx, fy + 10, 5, Math.PI + 0.45, -0.45, false);
      g.strokePath();
      // The crown of salt spikes.
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i - 2) * 0.36;
        const len = i === 2 ? 15 : i % 2 ? 12 : 9;
        saltShard(g, this.tint, x + Math.cos(ang) * 19, y + Math.sin(ang) * 19, ang, len, 3, alpha);
      }
    }
    // Drained sugar, floating overhead as cubes.
    for (let i = 0; i < this.cubes; i++) {
      const ox = (i - (this.cubes - 1) / 2) * 13;
      const oy = -40 + Math.sin(this.t * 2.4 + i) * 2;
      sugarCube(g, this.tint, x + ox, y + oy, 5, alpha);
    }
    if (this.rush > 0 && Math.floor(this.t * 20) % 2 === 0) {
      g.fillStyle(this.tint(RAINBOW[Math.floor(this.t * 9) % RAINBOW.length]), alpha * 0.8);
      g.fillCircle(x + Math.cos(this.t * 11) * 26, y + Math.sin(this.t * 11) * 26, 2.4);
    }
  }

  protected emitTrail(x: number, y: number): void {
    if (this.form !== 'sugar') return;
    this.anim(4.8, 420, (g, t) => sugarGrain(g, this.tint, x, y + t * 6, 2.4 * (1 - t) + 0.5, 1 - t, t));
  }

  private anim(depth: number, duration: number, draw: (g: Phaser.GameObjects.Graphics, t: number) => void): void {
    const g = this.scene.add.graphics().setDepth(depth);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration,
      onUpdate: (tw) => { g.clear(); draw(g, tw.getValue() ?? 0); },
      onComplete: () => g.destroy(),
      onStop: () => g.destroy(),
    });
  }
}
