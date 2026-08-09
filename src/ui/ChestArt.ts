import Phaser from 'phaser';
import { mix } from './Theme';

/**
 * The Vault's two chests, drawn in code like everything else in this game.
 *
 * Both take an `open` of 0–1 rather than a boolean so the lid can be *tweened*: the Vault
 * animates a chest from shut to wide in about half a second, and a mimic's jaw has to travel
 * through the whole arc for the reveal to land. At 0 they are a chest; at 1 the gold one is a
 * lit strongbox and the black one is a mouth.
 *
 * Everything is drawn around a centre `(x, y)` with a given width, so a caller can lay them
 * out on a grid without tracking origins. Height is always `w * 0.86`.
 */

export interface ChestPaintOpts {
  /** 0 = shut, 1 = fully open. Tween this. */
  open?: number;
  /** Hover state — brightens the metal and lifts the highlights. */
  hot?: boolean;
  /** Already-emptied chests are painted flat and grey. */
  spent?: boolean;
}

const H_RATIO = 0.86;
/** Fraction of the total height taken by the lid. */
const LID_RATIO = 0.42;

// ── Gold chest ────────────────────────────────────────────────────────

const OAK_DARK = 0x4a2c14;
const OAK = 0x6b4020;
const OAK_LIT = 0x8a5628;
const GOLD = 0xd8a531;
const GOLD_LIT = 0xffdd88;
const GOLD_DARK = 0x8a651c;

/**
 * Oak-and-gold strongbox: five staves, banded, with a keyhole escutcheon. Opening it lifts
 * the domed lid back off the body and lights the inside.
 */
export function drawGoldChest(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, opts: ChestPaintOpts = {},
): void {
  const open = Phaser.Math.Clamp(opts.open ?? 0, 0, 1);
  const hot = !!opts.hot;
  const spent = !!opts.spent;

  const h = w * H_RATIO;
  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h / 2;
  const bottom = y + h / 2;
  const lidH = h * LID_RATIO;
  const seam = top + lidH;

  // Spent chests keep every line but lose all their colour, so the grid still reads as
  // fifty chests rather than fifty holes.
  const grey = (c: number): number => (spent ? mix(c, 0x2a2a38, 0.78) : c);
  const lift = hot && !spent ? 0.16 : 0;
  const oak = (c: number): number => grey(mix(c, 0xffffff, lift));
  const gold = (c: number): number => grey(mix(c, 0xffffff, lift));

  // Ground shadow — a squashed pool, so the chest sits on the page instead of floating.
  g.fillStyle(0x000000, spent ? 0.18 : 0.32);
  g.fillEllipse(x, bottom + 3, w * 0.94, h * 0.16);

  // ── Body ────────────────────────────────────────────────────────────
  const bodyTop = seam;
  drawStaves(g, left, bodyTop, w, bottom - bodyTop, oak, 5);

  // Interior, visible the moment the lid starts to move.
  if (open > 0.02) {
    const mouthH = Math.min(bodyTop - top, lidH) * 0.42 * open;
    g.fillStyle(grey(0x1a0f06), 1);
    g.fillRect(left + 3, bodyTop - mouthH, w - 6, mouthH + 3);
    // Contents: a bank of coins that rises as the lid clears it.
    if (!spent) {
      for (let i = 0; i < 7; i++) {
        const cxp = left + 8 + ((w - 16) * (i + 0.5)) / 7;
        const r = w * (0.05 + (i % 3) * 0.012);
        g.fillStyle(mix(GOLD, 0xffffff, 0.15 + (i % 2) * 0.25), 0.92 * open);
        g.fillCircle(cxp, bodyTop - mouthH * 0.35 + (i % 2) * 2, r);
      }
      // Light shaft out of the opening.
      g.fillStyle(GOLD_LIT, 0.10 * open);
      g.beginPath();
      g.moveTo(left + 6, bodyTop - mouthH);
      g.lineTo(right - 6, bodyTop - mouthH);
      g.lineTo(right + w * 0.16, top - h * 0.28);
      g.lineTo(left - w * 0.16, top - h * 0.28);
      g.closePath();
      g.fillPath();
    }
  }

  // Bands: two verticals and the base rim.
  bandV(g, left + w * 0.20, bodyTop, w * 0.085, bottom - bodyTop, gold);
  bandV(g, right - w * 0.20 - w * 0.085, bodyTop, w * 0.085, bottom - bodyTop, gold);
  g.fillStyle(gold(GOLD_DARK), 1);
  g.fillRect(left, bottom - h * 0.09, w, h * 0.09);
  g.fillStyle(gold(GOLD), 1);
  g.fillRect(left, bottom - h * 0.09, w, h * 0.03);

  // Corner brackets on the base.
  for (const bx of [left, right - w * 0.13]) {
    g.fillStyle(gold(GOLD), 1);
    g.fillRect(bx, bottom - h * 0.20, w * 0.13, h * 0.045);
    g.fillRect(bx + (bx === left ? 0 : w * 0.10), bottom - h * 0.20, w * 0.03, h * 0.20);
  }

  // ── Lid ─────────────────────────────────────────────────────────────
  // Hinged at the back edge: the whole dome rides up and squashes as it tips over.
  const tilt = open;
  const lidLift = lidH * 0.92 * tilt;
  const lidSquash = 1 - 0.55 * tilt;
  const lidTop = top - lidLift;
  const lidBottom = lidTop + lidH * lidSquash;

  drawDome(g, left, lidTop, w, lidH * lidSquash, oak(OAK), oak(OAK_LIT), oak(OAK_DARK));

  // Ribs following the dome — three gold arcs, plus the lip band.
  for (const f of [0.20, 0.5, 0.80]) {
    const rx = left + w * f;
    g.lineStyle(Math.max(1.5, w * 0.035), gold(f === 0.5 ? GOLD_LIT : GOLD), 0.95);
    g.beginPath();
    g.moveTo(rx, lidBottom);
    g.lineTo(rx + (f - 0.5) * w * 0.10, lidTop + lidH * lidSquash * 0.16);
    g.strokePath();
  }
  g.lineStyle(0, 0, 0);
  g.fillStyle(gold(GOLD_DARK), 1);
  g.fillRect(left, lidBottom - h * 0.055, w, h * 0.055);
  g.fillStyle(gold(GOLD), 1);
  g.fillRect(left, lidBottom - h * 0.055, w, h * 0.018);

  // Rivets along the lip.
  for (let i = 0; i < 6; i++) {
    g.fillStyle(gold(GOLD_LIT), 0.85);
    g.fillCircle(left + w * (0.10 + i * 0.16), lidBottom - h * 0.028, Math.max(1, w * 0.014));
  }

  // Underside of a raised lid — the bit that sells it as hinged rather than floating.
  if (open > 0.06) {
    g.fillStyle(grey(0x2a1708), 0.85 * open);
    g.fillRect(left + 2, lidBottom - h * 0.055, w - 4, h * 0.05 * open + 1);
  }

  // ── Lock ────────────────────────────────────────────────────────────
  const lockY = seam + h * 0.02;
  const lockW = w * 0.24;
  g.fillStyle(gold(GOLD_DARK), 1);
  g.fillRect(x - lockW / 2, lockY - h * 0.10, lockW, h * 0.20);
  g.fillStyle(gold(GOLD), 1);
  g.fillRect(x - lockW / 2 + 1.5, lockY - h * 0.10 + 1.5, lockW - 3, h * 0.20 - 3);
  g.fillStyle(grey(0x2a1a06), 1);
  g.fillCircle(x, lockY - h * 0.005, Math.max(1.5, w * 0.036));
  g.fillTriangle(
    x - w * 0.028, lockY + h * 0.075,
    x + w * 0.028, lockY + h * 0.075,
    x, lockY - h * 0.005,
  );
  // A shackle that swings clear once the lid is up.
  g.lineStyle(Math.max(1.2, w * 0.026), gold(GOLD_LIT), 0.9);
  g.beginPath();
  g.arc(x, lockY - h * 0.10, w * 0.075, Math.PI * (1 + 0.15 * open), Math.PI * (2 - 0.15 * open), false);
  g.strokePath();
  g.lineStyle(0, 0, 0);

  // Sheen across the top of the dome.
  if (!spent) {
    g.fillStyle(0xffffff, 0.10 + (hot ? 0.07 : 0));
    g.fillEllipse(x - w * 0.14, lidTop + lidH * lidSquash * 0.34, w * 0.34, lidH * lidSquash * 0.30);
  }
}

// ── Mimic chest ───────────────────────────────────────────────────────

const OBSIDIAN = 0x14141c;
const OBSIDIAN_LIT = 0x24242f;
const SILVER = 0xb9c2cf;
const SILVER_LIT = 0xeef3fa;
const SILVER_DARK = 0x6e7684;
const GUM = 0x5a0d18;
const TOOTH = 0xf4f7fb;

/**
 * Black-and-silver, spiked, and lying about being furniture.
 *
 * Shut, it is a chest with too many spikes and a seam that does not look like a seam. Open,
 * the lid is a jaw: two rows of silver spike teeth, a red gullet, and a pair of eyes on the
 * inside of the lid that were not there a moment ago.
 */
export function drawMimicChest(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, opts: ChestPaintOpts = {},
): void {
  const open = Phaser.Math.Clamp(opts.open ?? 0, 0, 1);
  const hot = !!opts.hot;
  const spent = !!opts.spent;

  const h = w * H_RATIO;
  const left = x - w / 2;
  const right = x + w / 2;
  const top = y - h / 2;
  const bottom = y + h / 2;
  const lidH = h * LID_RATIO;
  const seam = top + lidH;

  const grey = (c: number): number => (spent ? mix(c, 0x2a2a38, 0.7) : c);
  const lift = hot && !spent ? 0.14 : 0;
  const ink = (c: number): number => grey(mix(c, 0xffffff, lift));

  g.fillStyle(0x000000, spent ? 0.2 : 0.42);
  g.fillEllipse(x, bottom + 3, w * 0.98, h * 0.17);

  // A low red bloom under a live mimic — it is warm and it should not be.
  if (!spent) {
    for (let k = 3; k >= 1; k--) {
      g.fillStyle(0xff2a3c, 0.05 * k * (0.5 + open));
      g.fillEllipse(x, y + h * 0.1, w * (1.0 + k * 0.12), h * (0.7 + k * 0.1));
    }
  }

  // ── Lower jaw / body ────────────────────────────────────────────────
  const bodyTop = seam;
  g.fillStyle(ink(OBSIDIAN), 1);
  g.fillRect(left, bodyTop, w, bottom - bodyTop);
  g.fillStyle(ink(OBSIDIAN_LIT), 0.75);
  g.fillRect(left, bodyTop, w, (bottom - bodyTop) * 0.28);
  // Plate seams, so the body reads as riveted iron rather than a black rectangle.
  g.lineStyle(1, ink(SILVER_DARK), 0.45);
  for (const f of [0.33, 0.66]) {
    g.beginPath(); g.moveTo(left + w * f, bodyTop); g.lineTo(left + w * f, bottom); g.strokePath();
  }
  g.lineStyle(0, 0, 0);

  // Silver bands + rivets.
  bandV(g, left + w * 0.16, bodyTop, w * 0.075, bottom - bodyTop, ink, SILVER, SILVER_LIT, SILVER_DARK);
  bandV(g, right - w * 0.16 - w * 0.075, bodyTop, w * 0.075, bottom - bodyTop, ink, SILVER, SILVER_LIT, SILVER_DARK);
  g.fillStyle(ink(SILVER_DARK), 1);
  g.fillRect(left, bottom - h * 0.085, w, h * 0.085);
  g.fillStyle(ink(SILVER), 1);
  g.fillRect(left, bottom - h * 0.085, w, h * 0.022);
  for (let i = 0; i < 7; i++) {
    g.fillStyle(ink(SILVER_LIT), 0.7);
    g.fillCircle(left + w * (0.08 + i * 0.14), bottom - h * 0.048, Math.max(1, w * 0.013));
  }

  // ── The mouth ───────────────────────────────────────────────────────
  const gape = lidH * 1.05 * open;
  if (open > 0.02) {
    // Gullet: a red throat that darkens toward the back.
    g.fillStyle(grey(0x1c0308), 1);
    g.fillRect(left + 4, bodyTop - gape, w - 8, gape + 4);
    g.fillStyle(grey(GUM), 0.9);
    g.fillEllipse(x, bodyTop - gape * 0.25, w * 0.74, gape * 0.9);
    g.fillStyle(grey(0x2c0308), 1);
    g.fillEllipse(x, bodyTop - gape * 0.30, w * 0.40, gape * 0.52);
    // Tongue.
    if (open > 0.45) {
      g.fillStyle(grey(0x8f1a2c), 0.95);
      g.fillEllipse(x, bodyTop - gape * 0.06, w * 0.34, gape * 0.34);
    }
    // Lower teeth stand up out of the body.
    teeth(g, left + 6, bodyTop, w - 12, Math.min(gape * 0.52, h * 0.17), 7, 1, grey);
  }

  // ── Upper jaw / lid ─────────────────────────────────────────────────
  const lidLift = gape;
  const lidSquash = 1 - 0.42 * open;
  const lidTop = top - lidLift;
  const lidBottom = lidTop + lidH * lidSquash;

  drawDome(g, left, lidTop, w, lidH * lidSquash, ink(OBSIDIAN), ink(OBSIDIAN_LIT), grey(0x08080d));

  // Spikes: a crest along the dome and a pair jutting from each shoulder. These are what
  // make the thing read as hostile at grid size, before anything opens.
  const crest = 5;
  for (let i = 0; i < crest; i++) {
    const f = (i + 0.5) / crest;
    const sx = left + w * f;
    // Follow the dome's curve so the spikes stand off the surface, not out of thin air.
    const domeY = lidBottom - Math.sin(Math.PI * f) * lidH * lidSquash * 0.94;
    const len = w * (0.13 + 0.05 * Math.sin(Math.PI * f));
    const lean = (f - 0.5) * w * 0.22;
    g.fillStyle(ink(SILVER_DARK), 1);
    g.fillTriangle(sx - w * 0.045, domeY + 2, sx + w * 0.045, domeY + 2, sx + lean, domeY - len);
    g.fillStyle(ink(SILVER_LIT), 0.75);
    g.fillTriangle(sx - w * 0.016, domeY + 1, sx + w * 0.012, domeY + 1, sx + lean, domeY - len);
  }
  for (const side of [-1, 1]) {
    const sx = side < 0 ? left : right;
    g.fillStyle(ink(SILVER_DARK), 1);
    g.fillTriangle(sx, lidBottom - h * 0.02, sx, lidBottom - h * 0.16, sx + side * w * 0.17, lidBottom - h * 0.08);
    g.fillStyle(ink(SILVER), 0.6);
    g.fillTriangle(sx, lidBottom - h * 0.05, sx, lidBottom - h * 0.12, sx + side * w * 0.15, lidBottom - h * 0.085);
  }

  // Lid lip band.
  g.fillStyle(ink(SILVER_DARK), 1);
  g.fillRect(left, lidBottom - h * 0.05, w, h * 0.05);
  g.fillStyle(ink(SILVER), 1);
  g.fillRect(left, lidBottom - h * 0.05, w, h * 0.015);

  // Upper teeth hang down from the lip.
  if (open > 0.02) {
    teeth(g, left + 6, lidBottom, w - 12, Math.min(gape * 0.58, h * 0.19), 7, -1, grey);
  } else {
    // Shut, the seam is a set of interlocked points — legible as "wrong" without being a mouth.
    g.fillStyle(grey(0x05050a), 1);
    g.fillRect(left + 4, seam - h * 0.012, w - 8, h * 0.024);
    for (let i = 0; i < 9; i++) {
      const tx = left + 6 + ((w - 12) * (i + 0.5)) / 9;
      g.fillStyle(grey(mix(TOOTH, 0x000000, 0.35)), 0.85);
      g.fillTriangle(tx - w * 0.026, seam - h * 0.012, tx + w * 0.026, seam - h * 0.012, tx, seam + h * 0.016);
    }
  }

  // Eyes. Two slits under the lid lip when shut; two full, lit eyes on the palate when open.
  if (!spent) {
    const eyeY = open > 0.02 ? lidBottom - h * 0.135 : seam - h * 0.075;
    const eyeR = w * (0.028 + 0.026 * open);
    for (const side of [-1, 1]) {
      const ex = x + side * w * 0.20;
      for (let k = 3; k >= 1; k--) {
        g.fillStyle(0xff2a3c, 0.10 * k * (0.4 + open * 0.6));
        g.fillCircle(ex, eyeY, eyeR * (1 + k * 0.8));
      }
      g.fillStyle(mix(0xff2a3c, 0xffffff, 0.15 + 0.35 * open), 0.95);
      if (open > 0.02) g.fillCircle(ex, eyeY, eyeR);
      else g.fillEllipse(ex, eyeY, eyeR * 2.6, eyeR * 0.8);
      if (open > 0.4) {
        g.fillStyle(0x14040a, 1);
        g.fillEllipse(ex, eyeY, eyeR * 0.42, eyeR * 1.3);
      }
    }
  }

  // Keyhole plate — the lie it is telling. Painted last so it sits over the seam.
  if (open < 0.25) {
    const lockW = w * 0.20;
    const lockY = seam + h * 0.055;
    g.fillStyle(ink(SILVER_DARK), 1 - open * 4);
    g.fillRect(x - lockW / 2, lockY - h * 0.06, lockW, h * 0.13);
    g.fillStyle(grey(0x05050a), 1 - open * 4);
    g.fillCircle(x, lockY - h * 0.008, Math.max(1.2, w * 0.03));
    g.fillTriangle(
      x - w * 0.022, lockY + h * 0.05, x + w * 0.022, lockY + h * 0.05, x, lockY - h * 0.008,
    );
  }
}

// ── Shared primitives ─────────────────────────────────────────────────

/** A run of vertical planks with grain, filling `(x, y, w, h)`. */
function drawStaves(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  tint: (c: number) => number, count: number,
): void {
  const pw = w / count;
  for (let i = 0; i < count; i++) {
    const px = x + i * pw;
    // Alternating tone plus a lit top edge, so the staves separate at any size.
    g.fillStyle(tint(i % 2 === 0 ? OAK : mix(OAK, OAK_DARK, 0.4)), 1);
    g.fillRect(px, y, pw + 0.5, h);
    g.fillStyle(tint(OAK_LIT), 0.35);
    g.fillRect(px, y, pw + 0.5, Math.max(1, h * 0.08));
    g.fillStyle(tint(OAK_DARK), 0.55);
    g.fillRect(px + pw - 1, y, 1, h);
    // One grain line per plank, offset so they do not line up into a stripe.
    g.fillStyle(tint(OAK_DARK), 0.3);
    g.fillRect(px + pw * (0.3 + 0.3 * (i % 3)), y + h * 0.2, Math.max(1, pw * 0.06), h * 0.6);
  }
}

/** A rounded lid: a half-ellipse cap sitting on a short straight skirt. */
function drawDome(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  base: number, lit: number, dark: number,
): void {
  const cx = x + w / 2;
  const skirt = h * 0.34;
  const capH = h - skirt;
  g.fillStyle(base, 1);
  g.fillRect(x, y + capH, w, skirt + 1);
  g.fillEllipse(cx, y + capH, w, capH * 2);
  // Lit crown and shadowed hem.
  g.fillStyle(lit, 0.5);
  g.fillEllipse(cx - w * 0.06, y + capH * 0.9, w * 0.72, capH * 1.1);
  g.fillStyle(dark, 0.45);
  g.fillRect(x, y + h - Math.max(1, h * 0.14), w, Math.max(1, h * 0.14));
}

/** One metal band, drawn with a lit inner line so it reads as raised. */
function bandV(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  tint: (c: number) => number,
  base = GOLD, lit = GOLD_LIT, dark = GOLD_DARK,
): void {
  g.fillStyle(tint(dark), 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(tint(base), 1);
  g.fillRect(x + w * 0.16, y, w * 0.68, h);
  g.fillStyle(tint(lit), 0.55);
  g.fillRect(x + w * 0.3, y, Math.max(1, w * 0.18), h);
}

/** A row of `count` spike teeth along `(x, w)`, growing `dir` (1 = up, -1 = down) from `y`. */
function teeth(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, len: number, count: number, dir: 1 | -1,
  grey: (c: number) => number,
): void {
  const step = w / count;
  for (let i = 0; i < count; i++) {
    const tx = x + step * (i + 0.5);
    // The canines are the outer pair and the middle one — an even comb reads as a zip.
    const scale = i === 0 || i === count - 1 || i === (count >> 1) ? 1.28 : 0.9;
    const tipY = y - dir * len * scale;
    g.fillStyle(grey(mix(TOOTH, 0x000000, 0.25)), 1);
    g.fillTriangle(tx - step * 0.46, y, tx + step * 0.46, y, tx, tipY);
    g.fillStyle(grey(TOOTH), 0.9);
    g.fillTriangle(tx - step * 0.16, y, tx + step * 0.10, y, tx, tipY);
  }
}
