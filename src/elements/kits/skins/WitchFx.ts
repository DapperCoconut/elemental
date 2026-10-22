import Phaser from 'phaser';
import { FxBase, TAU, easeIn, easeOut } from '../ElementVisuals';
import {
  CREATION, CreationColorFn, CreationMechRig, CreationNexus, MECH_ARM_TONES, MechArmView,
} from '../CreationVisuals';

/**
 * The Witch skin's ability art (Creation). Everything here is *drawing only* — the kit picks
 * one of these painters over the stock Creation one when the owner's skin is `witch`, and
 * every hitbox, timer and network message stays exactly where Creation put it.
 *
 *  - Dagger Spray daggers (and the Barrage arm's rockets) → crows, flapping, shedding feathers.
 *  - The Nexus → a bubbling cauldron over a witch-fire.
 *  - The R+ mech → a spell construct: a rune circle underfoot, spectral legs and arms, a ward.
 *  - Walls, speed pads, spike blocks, blueprints → hex circles and rune slabs.
 *  - Automatons → black-cat familiars.
 *
 * The art owns its palette (`WITCH`) rather than going through the owner's colour mapper:
 * the Nexus is shared and is built with the player's mapper even when only the npc is a witch,
 * so routing through a mapper would paint a witch's cauldron forge-orange.
 */

export const WITCH_SKIN_ID = 'witch';

export const WITCH = {
  void: 0x0b0710,
  ink: 0x170e20,
  plum: 0x2a1840,
  robe: 0x3c2158,
  robeLit: 0x55307c,
  violet: 0x7a3fc0,
  violetLit: 0xa66ee8,
  lilac: 0xd6bcff,
  hexDeep: 0x1d5226,
  hex: 0x3fae3f,
  hexLit: 0x7fe05a,
  hexPale: 0xccff9e,
  skin: 0x8cc26a,
  skinShade: 0x5c8a44,
  skinLit: 0xb4df8e,
  crow: 0x131017,
  crowLit: 0x3b3249,
  beak: 0x4a4352,
  beakLit: 0x8c8496,
  iron: 0x26222e,
  ironLit: 0x433d52,
  ironHi: 0x6c6684,
  straw: 0x6e5a34,
  strawLit: 0x968048,
  log: 0x2b1d24,
  logLit: 0x4b3644,
  bone: 0xe6dfc8,
  hot: 0xd04cff,
  white: 0xf6fff0,
} as const;

// ── Primitives ────────────────────────────────────────────────────────────

/** A filled polygon through `pts` (pairs). */
function poly(g: Phaser.GameObjects.Graphics, pts: number[][]): void {
  g.fillPoints(pts.map(([px, py]) => new Phaser.Geom.Point(px, py)), true);
}

/**
 * A flame tongue: a teardrop widest low and drawn out to a leaning point, built point by point
 * so it tapers continuously instead of reading as a stack of circles.
 */
export function flameTongue(
  g: Phaser.GameObjects.Graphics, x: number, y: number, height: number, width: number, lean: number,
): void {
  const steps = 10;
  const half = (u: number) => width * Math.pow(Math.sin(Math.PI * (0.3 + 0.7 * u)), 0.85);
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + lean * u * u - half(u), y - height * u));
  }
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    pts.push(new Phaser.Geom.Point(x + lean * u * u + half(u), y - height * u));
  }
  g.fillPoints(pts, true);
  g.fillEllipse(x, y, width * 1.6, width);
}

/** Witch-fire: a violet shell, a green body and a pale heart. */
function witchFlame(
  g: Phaser.GameObjects.Graphics, x: number, y: number, height: number, width: number, lean: number, alpha: number,
): void {
  g.fillStyle(WITCH.violet, alpha * 0.55);
  flameTongue(g, x, y + 1, height * 1.1, width * 1.25, lean);
  g.fillStyle(WITCH.hex, alpha * 0.9);
  flameTongue(g, x, y, height, width, lean);
  g.fillStyle(WITCH.hexLit, alpha * 0.95);
  flameTongue(g, x, y - 1, height * 0.6, width * 0.6, lean * 0.7);
  g.fillStyle(WITCH.hexPale, alpha * 0.9);
  flameTongue(g, x, y - 1.2, height * 0.3, width * 0.32, lean * 0.4);
}

/** A hexagram (two interlocked triangles) inscribed in an ellipse, stroked. */
function hexagram(
  g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, rot: number,
): void {
  for (let tri = 0; tri < 2; tri++) {
    g.beginPath();
    for (let k = 0; k <= 3; k++) {
      const a = rot + tri * (Math.PI / 3) + (k % 3) * (TAU / 3) - Math.PI / 2;
      const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();
  }
}

/**
 * A hex circle: two rings, a hexagram between them, rune ticks round the band, and a lit eye
 * at the centre. `rot` turns the runes, so a live one can be made to crawl.
 */
export function hexSigil(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, rot: number, alpha: number,
  ring: number = WITCH.hex, lit: number = WITCH.hexLit,
): void {
  if (r < 5) {
    g.fillStyle(lit, alpha * 0.9);
    poly(g, [[x, y - r], [x + r * 0.7, y], [x, y + r], [x - r * 0.7, y]]);
    return;
  }
  g.fillStyle(ring, alpha * 0.14);
  g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1.2, r * 0.08), ring, alpha * 0.95);
  g.strokeCircle(x, y, r);
  g.lineStyle(1, lit, alpha * 0.7);
  g.strokeCircle(x, y, r * 0.8);
  g.lineStyle(Math.max(1, r * 0.06), lit, alpha * 0.85);
  hexagram(g, x, y, r * 0.78, r * 0.78, rot);
  if (r > 12) {
    // Rune ticks in the band between the rings — little two-stroke glyphs, not a dashed line.
    const n = Math.max(6, Math.round(r / 3.2));
    g.lineStyle(1, lit, alpha * 0.75);
    for (let i = 0; i < n; i++) {
      const a = rot * 0.5 + (i / n) * TAU;
      const c = Math.cos(a), s = Math.sin(a);
      const r0 = r * 0.83, r1 = r * 0.96;
      g.lineBetween(x + c * r0, y + s * r0, x + c * r1, y + s * r1);
      if (i % 2 === 0) {
        const a2 = a + 0.12;
        g.lineBetween(x + c * r1, y + s * r1, x + Math.cos(a2) * r0, y + Math.sin(a2) * r0);
      }
    }
  }
  // Eye at the heart of it.
  g.fillStyle(WITCH.void, alpha * 0.9);
  g.fillEllipse(x, y, r * 0.42, r * 0.26);
  g.fillStyle(lit, alpha);
  g.fillEllipse(x, y, r * 0.34, r * 0.2);
  g.fillStyle(WITCH.void, alpha);
  g.fillEllipse(x, y, r * 0.08, r * 0.18);
}

// ── Crow (Dagger Spray / Barrage) ─────────────────────────────────────────

/**
 * A crow seen from above, flying along +x and centred on its body: fanned tail, flapping wings
 * swept back on the downstroke, a pale beak and two green eyes. Same length as a dagger so the
 * fan reads the same. Redrawn every frame — `phase` (seconds) drives the wingbeat.
 */
export function drawCrow(g: Phaser.GameObjects.Graphics, phase: number, scale = 1, alpha = 1): void {
  g.clear();
  const k = scale;
  const beat = Math.sin(phase * TAU * 3.4);
  const span = (6 + 8 * (0.5 + 0.5 * beat)) * k;
  const sweep = (1 - beat) * 2.2 * k;

  // A faint violet halo so a black bird still reads over a dark floor.
  g.fillStyle(WITCH.violet, alpha * 0.22);
  g.fillEllipse(-1 * k, 0, 30 * k, 12 * k + span * 1.2);

  // Tail fan.
  g.fillStyle(WITCH.crow, alpha);
  poly(g, [[-5 * k, -1.8 * k], [-15 * k, -5.4 * k], [-17 * k, -1.6 * k], [-17.5 * k, 1.6 * k], [-15 * k, 5.4 * k], [-5 * k, 1.8 * k]]);
  g.fillStyle(WITCH.crowLit, alpha * 0.8);
  poly(g, [[-6 * k, -0.6 * k], [-15.5 * k, -2.6 * k], [-16 * k, 0], [-6 * k, 0.6 * k]]);

  // Wings: leading edge straight out from the shoulder, trailing edge fingered into primaries.
  for (const sd of [-1, 1]) {
    const tipX = -3 * k - sweep, tipY = sd * span;
    g.fillStyle(WITCH.crow, alpha);
    poly(g, [
      [3 * k, sd * 1.6 * k],
      [1 * k - sweep * 0.4, sd * span * 0.55],
      [tipX, tipY],
      [tipX - 2.6 * k, sd * (span - 1.2 * k)],
      [tipX - 1.8 * k, sd * (span - 3 * k)],
      [tipX - 4.2 * k, sd * (span - 4 * k)],
      [-5.5 * k, sd * span * 0.38],
      [-5 * k, sd * 1.8 * k],
    ]);
    // Lit leading edge — a sheen of violet along the arm of the wing.
    g.fillStyle(WITCH.crowLit, alpha * 0.9);
    poly(g, [
      [3 * k, sd * 1.6 * k],
      [1 * k - sweep * 0.4, sd * span * 0.55],
      [tipX, tipY],
      [-0.6 * k - sweep * 0.5, sd * span * 0.52],
      [1.2 * k, sd * 2 * k],
    ]);
  }

  // Body and head.
  g.fillStyle(WITCH.crow, alpha);
  g.fillEllipse(-1 * k, 0, 16 * k, 7.4 * k);
  g.fillCircle(6.8 * k, 0, 3.8 * k);
  g.fillStyle(WITCH.crowLit, alpha * 0.6);
  g.fillEllipse(-1.5 * k, -1.2 * k, 9 * k, 2.2 * k);
  // Beak.
  g.fillStyle(WITCH.beak, alpha);
  poly(g, [[9.4 * k, -1.8 * k], [15.5 * k, 0], [9.4 * k, 1.8 * k]]);
  g.fillStyle(WITCH.beakLit, alpha * 0.9);
  poly(g, [[9.6 * k, -1.2 * k], [14.6 * k, -0.1 * k], [9.6 * k, 0]]);
  // Eyes.
  g.fillStyle(WITCH.hexLit, alpha);
  g.fillCircle(7.6 * k, -2 * k, 1.15 * k);
  g.fillCircle(7.6 * k, 2 * k, 1.15 * k);
  g.fillStyle(WITCH.hexPale, alpha);
  g.fillCircle(7.9 * k, -2.2 * k, 0.45 * k);
  g.fillCircle(7.9 * k, 1.8 * k, 0.45 * k);
}

// ── Built things → hexes ──────────────────────────────────────────────────

/**
 * A wall as a hex slab: a near-black rune stone with a glowing double frame, glyphs round the
 * inside edge, and a row of hex circles down its long axis (one per square of it, so a long
 * thin wall carries a chain of small sigils rather than one illegible dot). Centred on the
 * origin, like `plankPanel`, and like it, does not clear — the thorned variant draws under it.
 */
export function drawWitchHexPanel(
  g: Phaser.GameObjects.Graphics, w: number, h: number, alpha = 1, steel = false,
): void {
  const hw = w / 2, hh = h / 2;
  g.fillStyle(WITCH.void, alpha * 0.95);
  g.fillRect(-hw, -hh, w, h);
  g.fillStyle(steel ? WITCH.robeLit : WITCH.plum, alpha);
  g.fillRect(-hw + 2, -hh + 2, w - 4, h - 4);
  g.fillStyle(steel ? WITCH.violetLit : WITCH.violet, alpha * 0.16);
  g.fillEllipse(0, 0, w * 0.9, h * 0.9);

  const ring = steel ? WITCH.lilac : WITCH.hex;
  const lit = steel ? WITCH.white : WITCH.hexLit;

  const short = Math.min(w, h), long = Math.max(w, h);
  const n = Phaser.Math.Clamp(Math.round(long / Math.max(1, short)), 1, 8);
  const r = short * 0.36 - 1;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n - 0.5;
    const cx = w >= h ? f * w : 0;
    const cy = w >= h ? 0 : f * h;
    hexSigil(g, cx, cy, r, i * 0.7, alpha, ring, lit);
  }

  // Glyphs scratched round the inside of the frame.
  if (short > 26) {
    g.lineStyle(1, lit, alpha * 0.5);
    const inset = 6;
    const stepAlong = (len: number, fn: (d: number, i: number) => void) => {
      const count = Math.max(1, Math.floor((len - 2 * inset) / 11));
      for (let i = 0; i < count; i++) fn(-len / 2 + inset + (i + 0.5) * ((len - 2 * inset) / count), i);
    };
    stepAlong(w, (d, i) => {
      for (const sy of [-1, 1]) {
        const y = sy * (hh - inset);
        g.lineBetween(d - 2, y - 2, d + (i % 2 ? 2 : -1), y + 2);
        g.lineBetween(d + 2, y - 2, d, y + 1);
      }
    });
    stepAlong(h, (d, i) => {
      for (const sx of [-1, 1]) {
        const x = sx * (hw - inset);
        g.lineBetween(x - 2, d - 2, x + 2, d + (i % 2 ? 2 : -1));
        g.lineBetween(x - 2, d + 2, x + 1, d);
      }
    });
  }

  g.lineStyle(steel ? 3 : 2, ring, alpha * 0.95);
  g.strokeRect(-hw, -hh, w, h);
  if (short > 14) {
    g.lineStyle(1, lit, alpha * 0.55);
    g.strokeRect(-hw + 3.5, -hh + 3.5, w - 7, h - 7);
  }
  // A lit rune-star at each corner in place of rivets.
  const cr = Math.min(3.2, short * 0.15);
  if (cr > 1.2) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const px = sx * (hw - cr - 2), py = sy * (hh - cr - 2);
        g.fillStyle(lit, alpha * 0.95);
        poly(g, [[px, py - cr], [px + cr * 0.35, py - cr * 0.35], [px + cr, py], [px + cr * 0.35, py + cr * 0.35],
          [px, py + cr], [px - cr * 0.35, py + cr * 0.35], [px - cr, py], [px - cr * 0.35, py - cr * 0.35]]);
      }
    }
  }
}

/** The F / Build-mode drag preview: a hex circle being chalked, its dashes crawling round. */
export function drawWitchHexDraft(
  g: Phaser.GameObjects.Graphics, w: number, h: number, alpha: number, phase: number,
): void {
  const hw = w / 2, hh = h / 2;
  g.fillStyle(WITCH.violet, alpha * 0.12);
  g.fillRect(-hw, -hh, w, h);
  // Dashed chalk circle inscribed in the box, crawling.
  const r = Math.min(hw, hh) * 0.9;
  if (r > 4) {
    g.lineStyle(2, WITCH.hexLit, alpha * 0.85);
    const dashes = Math.max(6, Math.round(r / 4));
    const off = (phase * 0.06) % (TAU / dashes);
    for (let i = 0; i < dashes; i++) {
      const a0 = off + (i / dashes) * TAU;
      g.beginPath();
      g.arc(0, 0, r, a0, a0 + (TAU / dashes) * 0.55);
      g.strokePath();
    }
    g.lineStyle(1.2, WITCH.violetLit, alpha * 0.6);
    hexagram(g, 0, 0, r * 0.75, r * 0.75, -phase * 0.03);
  }
  // Corner brackets.
  const arm = Math.min(12, Math.min(w, h) * 0.35);
  g.lineStyle(2.2, WITCH.lilac, alpha * 0.9);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      g.lineBetween(sx * hw, sy * hh, sx * (hw - arm), sy * hh);
      g.lineBetween(sx * hw, sy * hh, sx * hw, sy * (hh - arm));
    }
  }
}

/** A speed pad as a hex runner: a black strip with green arrow-runes glowing along it. */
export function drawWitchHexPad(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  g.clear();
  const hw = w / 2, hh = h / 2;
  g.fillStyle(WITCH.void, 0.95);
  g.fillRect(-hw, -hh, w, h);
  g.fillStyle(WITCH.plum, 0.95);
  g.fillRect(-hw + 1.5, -hh + 1.5, w - 3, h - 3);
  g.fillStyle(WITCH.hex, 0.18);
  g.fillEllipse(0, 0, w * 0.95, h * 0.8);
  const rows = Math.max(1, Math.floor(w / 14));
  for (let i = 0; i < rows; i++) {
    const x = -hw + 6 + i * (w - 10) / rows;
    g.lineStyle(3.6, WITCH.hex, 0.4);
    g.lineBetween(x, hh - 3, x + 5, 0);
    g.lineBetween(x + 5, 0, x, -hh + 3);
    g.lineStyle(1.8, WITCH.hexLit, 0.95);
    g.lineBetween(x, hh - 3, x + 5, 0);
    g.lineBetween(x + 5, 0, x, -hh + 3);
  }
  // A rune star at each end.
  for (const sx of [-1, 1]) {
    const px = sx * (hw - 4), r = Math.min(3, hh - 1);
    g.fillStyle(WITCH.lilac, 0.95);
    poly(g, [[px, -r], [px + r * 0.4, 0], [px, r], [px - r * 0.4, 0]]);
  }
  g.lineStyle(2, WITCH.violetLit, 0.95);
  g.strokeRect(-hw, -hh, w, h);
}

/** A curved thorn growing out of an edge — tapered, dark, with a green-lit tip. */
function thorn(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, w: number, bend: number): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const px = -s, py = c;
  const at = (u: number, off: number) => [
    x + c * len * u + px * (off + bend * u * u),
    y + s * len * u + py * (off + bend * u * u),
  ];
  const steps = 6;
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) pts.push(at(i / steps, w * (1 - i / steps)));
  for (let i = steps; i >= 0; i--) pts.push(at(i / steps, -w * (1 - i / steps)));
  g.fillStyle(WITCH.crow, 0.95);
  poly(g, pts);
  const tip = at(0.86, 0);
  g.fillStyle(WITCH.hexLit, 0.9);
  g.fillCircle(tip[0], tip[1], Math.max(0.8, w * 0.32));
}

/** A spike block as a thorned hex: black thorns curling out of every face round a rune slab. */
export function drawWitchThornHex(
  g: Phaser.GameObjects.Graphics, w: number, h: number, invincible: boolean, steel = false,
): void {
  g.clear();
  const hw = w / 2, hh = h / 2;
  const perSide = Math.max(2, Math.round(w / 18));
  for (let i = 0; i < perSide; i++) {
    const f = (i + 0.5) / perSide;
    const bend = (i % 2 === 0 ? 1 : -1) * 2.4;
    thorn(g, -hw + f * w, -hh, -Math.PI / 2, 13, 3.4, bend);
    thorn(g, -hw + f * w, hh, Math.PI / 2, 13, 3.4, -bend);
    thorn(g, -hw, -hh + f * h, Math.PI, 13, 3.4, bend);
    thorn(g, hw, -hh + f * h, 0, 13, 3.4, -bend);
  }
  drawWitchHexPanel(g, w, h, 1, steel);
  // Bramble across the face so it reads as "hurts to touch", not as another wall.
  g.lineStyle(1.6, WITCH.crowLit, 0.85);
  const vines = Math.max(1, Math.round(h / 22));
  for (let v = 0; v < vines; v++) {
    const y0 = -hh + (v + 0.5) * (h / vines);
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const px = -hw + 3 + u * (w - 6), py = y0 + Math.sin(u * TAU * 1.5 + v) * Math.min(5, h / vines * 0.3);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  g.lineStyle(2.2, invincible ? WITCH.hot : WITCH.hexLit, 0.95);
  g.strokeRect(-hw, -hh, w, h);
  if (invincible) {
    g.lineStyle(5, WITCH.hot, 0.25);
    g.strokeRect(-hw - 2, -hh - 2, w + 4, h + 4);
  }
}

/**
 * The Automaton perk's bots as black-cat familiars: a hunched cat bounding along, tail
 * whipping, green eyes, standing on its own little summoning ring. Redrawn every frame.
 */
export function drawWitchFamiliar(g: Phaser.GameObjects.Graphics, t: number): void {
  g.clear();
  const hop = Math.abs(Math.sin(t * 6.5));
  const by = -hop * 3;
  // Summoning ring underfoot.
  g.lineStyle(1.4, WITCH.hex, 0.7);
  g.strokeEllipse(0, 12, 26, 8);
  g.fillStyle(WITCH.hex, 0.16);
  g.fillEllipse(0, 12, 26, 8);
  // Tail — a tapered curl, whipping.
  const whip = Math.sin(t * 4.2) * 5;
  const tail: number[][] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    tail.push([8 + u * 6 + Math.sin(u * 3) * 2, 4 + by - u * 16 + Math.sin(u * 2.4) * whip * u]);
  }
  g.lineStyle(3.2, WITCH.crow, 1);
  g.beginPath();
  tail.forEach(([px, py], i) => (i === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
  g.strokePath();
  // Legs.
  g.fillStyle(WITCH.crow, 1);
  for (const sx of [-1, 1]) g.fillRect(sx * 5 - 1.6, 6 + by, 3.2, 6 + hop * 2);
  // Body — hunched, high at the hips.
  g.fillEllipse(0, 2 + by, 22, 13);
  g.fillStyle(WITCH.crowLit, 0.7);
  g.fillEllipse(-1, -1 + by, 14, 4);
  // Head with ears.
  g.fillStyle(WITCH.crow, 1);
  g.fillCircle(-7, -6 + by, 6.2);
  poly(g, [[-12, -8 + by], [-12.5, -15.5 + by], [-8.4, -10.6 + by]]);
  poly(g, [[-5.6, -11 + by], [-3, -16.5 + by], [-1.8, -9.4 + by]]);
  g.fillStyle(WITCH.violet, 0.8);
  poly(g, [[-11.3, -9.2 + by], [-11.8, -13.6 + by], [-9.4, -10.6 + by]]);
  // Eyes.
  g.fillStyle(WITCH.hexLit, 1);
  g.fillEllipse(-9.4, -6.4 + by, 3, 2.2);
  g.fillEllipse(-5, -6.4 + by, 3, 2.2);
  g.fillStyle(WITCH.void, 1);
  g.fillRect(-9.8, -7.4 + by, 0.8, 2);
  g.fillRect(-5.4, -7.4 + by, 0.8, 2);
}

// ── One-shot bits ─────────────────────────────────────────────────────────

/** The skin's own throw-offs: feathers off a crow, motes of brew off a hand. */
export class WitchFx extends FxBase {
  constructor(scene: Phaser.Scene) {
    super(scene, (c) => c);
  }

  /** A black feather shed off a crow, tumbling down and fading, with a green wink. */
  feather(x: number, y: number, angle: number, depth = 5): void {
    const spin = (Math.random() - 0.5) * 6;
    const drift = (Math.random() - 0.5) * 10;
    this.anim(depth, 520, (g, t) => {
      const fade = 1 - t;
      const px = x + Math.cos(angle) * 10 * easeOut(t) + drift * t;
      const py = y + Math.sin(angle) * 10 * easeOut(t) + 8 * t;
      const a = angle + spin * t;
      const c = Math.cos(a), s = Math.sin(a);
      g.fillStyle(WITCH.crow, 0.85 * fade);
      poly(g, [
        [px - c * 5, py - s * 5],
        [px - s * 1.8, py + c * 1.8],
        [px + c * 5, py + s * 5],
        [px + s * 1.8, py - c * 1.8],
      ]);
      g.fillStyle(WITCH.hexLit, 0.7 * fade * fade);
      g.fillCircle(px - c * 5, py - s * 5, 1.4 * fade);
    });
  }

  /** A mote of brew lifting off a moving hand, turning to vapour as it rises. */
  mote(x: number, y: number): void {
    const drift = (Math.random() - 0.5) * 20;
    const r = 1.4 + Math.random() * 1.6;
    const col = Math.random() < 0.6 ? WITCH.hexLit : WITCH.violetLit;
    this.anim(5, 600, (g, t) => {
      const fade = 1 - t;
      const px = x + drift * easeOut(t);
      const py = y - 22 * easeIn(t) - 6 * t;
      g.fillStyle(col, 0.35 * fade);
      g.fillCircle(px, py, r * 2 * fade);
      g.fillStyle(WITCH.hexPale, 0.85 * fade);
      g.fillCircle(px, py, r * fade);
    });
  }
}

// ── The Nexus → a cauldron ────────────────────────────────────────────────

/** Fixed bubble seeds so the surface churns in place instead of reshuffling every frame. */
const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  ox: Math.sin(i * 12.9898) * 0.5 + 0.5,
  oy: Math.sin(i * 78.233) * 0.5 + 0.5,
  ph: (i * 0.618) % 1,
  rate: 0.55 + ((i * 0.37) % 0.6),
}));

/**
 * The Witch's Nexus: a pot-bellied iron cauldron on three stubby feet over a witch-fire,
 * green brew churning at its rim. Brewing it roils and throws up steam; loading bolts lifts
 * and brightens the brew; R+ Awakened turns it hot violet with a rune circle crawling round
 * its feet. Same 40px footprint as the machine it replaces.
 */
export class WitchCauldron extends CreationNexus {
  constructor(scene: Phaser.Scene, tint: CreationColorFn, x: number, y: number, depth = 3) {
    super(scene, tint, x, y, depth);
  }

  update(delta: number): void {
    if (!this.g.active) return;
    const speed = this.brewing ? 3.4 : 1;
    this.t += (delta / 1000) * speed;
    const g = this.g;
    const { x, y, t } = this;
    const awake = this.awakened;
    g.clear();

    const brewDeep = awake ? WITCH.plum : WITCH.hexDeep;
    const brew = awake ? WITCH.violet : WITCH.hex;
    const brewLit = awake ? WITCH.hot : WITCH.hexLit;
    const brewPale = awake ? WITCH.lilac : WITCH.hexPale;
    const glow = 0.5 + this.load * 0.2 + (this.brewing ? 0.3 : 0) + Math.sin(t * 6) * 0.08;

    // Light thrown on the floor.
    g.fillStyle(brew, 0.16 * glow);
    g.fillEllipse(x, y + 22, 120, 40);

    // Awakened: a rune circle crawling round the feet — the tell that a thrown wrench wakes it.
    if (awake) {
      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 4.4), 2.2);
      g.lineStyle(2.4, WITCH.violetLit, 0.6 + beat * 0.35);
      g.strokeEllipse(x, y + 24, 112, 38);
      g.lineStyle(1.2, WITCH.hot, 0.5 + beat * 0.4);
      g.strokeEllipse(x, y + 24, 96, 32);
      hexagram(g, x, y + 24, 47, 15.5, t * 0.5);
      const roll = (t * 0.55) % 1;
      g.lineStyle(2.2 * (1 - roll), WITCH.hot, 0.6 * (1 - roll));
      g.strokeEllipse(x, y + 24, 60 + roll * 70, 20 + roll * 24);
    }

    // Firewood crossed under the pot.
    for (const ang of [-0.32, 0.32]) {
      const c = Math.cos(ang), s = Math.sin(ang);
      const L = 30, W2 = 4;
      g.fillStyle(WITCH.log, 1);
      poly(g, [
        [x - c * L - s * W2, y + 32 - s * L + c * W2], [x + c * L - s * W2, y + 32 + s * L + c * W2],
        [x + c * L + s * W2, y + 32 + s * L - c * W2], [x - c * L + s * W2, y + 32 - s * L - c * W2],
      ]);
      g.fillStyle(WITCH.logLit, 0.9);
      g.fillCircle(x - c * L, y + 32 - s * L, 3.6);
      g.fillCircle(x + c * L, y + 32 + s * L, 3.6);
    }
    // Witch-fire licking up round the belly.
    const tongues = [-26, -15, -5, 6, 16, 26];
    for (let i = 0; i < tongues.length; i++) {
      const fl = 1 + Math.sin(t * 9 + i * 1.7) * 0.18 + Math.sin(t * 14.3 + i) * 0.08;
      const hgt = (12 + (i % 3) * 3) * fl * (this.brewing ? 1.3 : 1);
      witchFlame(g, x + tongues[i], y + 34 - Math.abs(tongues[i]) * 0.12, hgt, 3.6, Math.sin(t * 3 + i) * 2.4, 0.95);
    }

    // Three stubby feet.
    g.fillStyle(WITCH.void, 1);
    for (const [fx, fy] of [[-25, 25], [25, 25], [0, 31]]) g.fillEllipse(x + fx, y + fy, 11, 8);
    g.fillStyle(WITCH.ironLit, 1);
    for (const [fx, fy] of [[-25, 24], [25, 24], [0, 30]]) g.fillEllipse(x + fx, y + fy, 8, 5);

    // Pot belly: sooty shell, iron, a broad lit crescent down the left and a hard glint.
    g.fillStyle(WITCH.void, 1);
    g.fillEllipse(x, y + 4, 82, 62);
    g.fillStyle(WITCH.iron, 1);
    g.fillEllipse(x, y + 3, 76, 56);
    g.fillStyle(WITCH.ironLit, 0.55);
    g.fillEllipse(x - 14, y + 1, 30, 40);
    g.fillStyle(WITCH.iron, 1);
    g.fillEllipse(x - 7, y + 4, 30, 42);
    g.fillStyle(WITCH.ironHi, 0.55);
    g.fillEllipse(x - 24, y + 1, 6, 16);
    // Firelight on the underside.
    g.fillStyle(brew, 0.28 * glow);
    g.fillEllipse(x, y + 24, 56, 12);
    // Rune band riveted round the belly.
    g.lineStyle(2, WITCH.ironHi, 0.7);
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const px = x - 37 + u * 74;
      const py = y + 6 + Math.sin(u * Math.PI) * 6;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    for (let i = 1; i < 6; i++) {
      const u = i / 6;
      const px = x - 37 + u * 74, py = y + 6 + Math.sin(u * Math.PI) * 6;
      g.fillStyle(brewLit, 0.55 + 0.35 * glow * Math.abs(Math.sin(t * 2 + i)));
      poly(g, [[px, py - 3.4], [px + 1.8, py], [px, py + 3.4], [px - 1.8, py]]);
    }

    // Ring handles.
    for (const sx of [-1, 1]) {
      g.lineStyle(3.4, WITCH.void, 1);
      g.strokeCircle(x + sx * 39, y - 4, 6);
      g.lineStyle(1.4, WITCH.ironHi, 0.9);
      g.strokeCircle(x + sx * 39, y - 4, 6);
    }

    // Brew spilling down over the lip.
    for (const [dx, len] of [[-22, 12], [9, 17], [25, 8]]) {
      g.fillStyle(brew, 0.95);
      g.fillRoundedRect(x + dx - 2, y - 10, 4, len, 2);
      g.fillCircle(x + dx, y - 10 + len, 3);
      g.fillStyle(brewLit, 0.8);
      g.fillRect(x + dx - 1, y - 9, 1.2, len - 2);
    }

    // Rim: a thick iron lip and the dark mouth inside it.
    g.fillStyle(WITCH.void, 1);
    g.fillEllipse(x, y - 13, 80, 26);
    g.fillStyle(WITCH.ironLit, 1);
    g.fillEllipse(x, y - 13.5, 75, 22);
    g.fillStyle(WITCH.ironHi, 0.55);
    g.fillEllipse(x - 4, y - 16, 62, 9);
    g.fillStyle(WITCH.void, 1);
    g.fillEllipse(x, y - 12.5, 64, 16.5);

    // The brew: rises and brightens as bolts go in, churns while it brews.
    const lift = this.load * 0.8;
    const sy = y - 12 - lift;
    g.fillStyle(brewDeep, 1);
    g.fillEllipse(x, sy + 0.8, 60, 13.5);
    g.fillStyle(brew, 0.95);
    g.fillEllipse(x, sy, 56, 11.5);
    // Swirl: a spiral sweep across the surface.
    g.lineStyle(1.6, brewLit, 0.55 + 0.2 * glow);
    g.beginPath();
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const a = -t * 1.6 + u * TAU * 1.3;
      const rr = 4 + u * 20;
      const px = x + Math.cos(a) * rr, py = sy + Math.sin(a) * rr * 0.22;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    g.fillStyle(brewPale, 0.35 * glow);
    g.fillEllipse(x - 8, sy - 1.6, 22, 3.6);

    // Bubbles swelling and popping across the surface.
    const count = Math.min(BUBBLES.length, 5 + this.load * 2 + (this.brewing ? 6 : 0));
    const rate = this.brewing ? 1.6 : 1;
    for (let i = 0; i < count; i++) {
      const b = BUBBLES[i];
      const p = (t * b.rate * rate + b.ph) % 1;
      const bx = x + (b.ox - 0.5) * 46;
      const by = sy + (b.oy - 0.5) * 7;
      if (p < 0.82) {
        const r = 1 + (p / 0.82) * (this.brewing ? 4.2 : 3.2);
        g.fillStyle(brewLit, 0.95);
        g.fillCircle(bx, by - r * 0.4, r);
        g.fillStyle(brewPale, 0.9);
        g.fillCircle(bx - r * 0.35, by - r * 0.75, r * 0.32);
      } else {
        const q = (p - 0.82) / 0.18;
        g.lineStyle(1.2, brewPale, 0.8 * (1 - q));
        g.strokeEllipse(bx, by - 1, 6 + q * 8, 2 + q * 3);
        // A droplet flicked up out of the pop.
        g.fillStyle(brewLit, 0.9 * (1 - q));
        g.fillCircle(bx + (b.ox - 0.5) * 6, by - 3 - q * 9, 1.2);
      }
    }

    // Vapour curling up out of the mouth.
    const wisps = this.brewing ? 5 : 3;
    for (let i = 0; i < wisps; i++) {
      const p = (t * 0.32 + i / wisps) % 1;
      const wx = x + Math.sin(t * 1.3 + i * 2.1) * 10 + (i - wisps / 2) * 5;
      const wy = sy - 4 - p * 42;
      g.fillStyle(brewLit, 0.16 * (1 - p) * glow);
      g.fillCircle(wx, wy, 5 + p * 9);
      g.fillStyle(brewPale, 0.1 * (1 - p));
      g.fillCircle(wx - 2, wy - 2, 2.5 + p * 4);
    }
  }
}

// ── The mech → a spell construct ──────────────────────────────────────────

/** A tapered limb of raw spell between two points: a wide faint aura round a bright core. */
function spellLimb(
  g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number,
  w1: number, w2: number, color: number, core: number, alpha: number,
): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const px = -Math.sin(a), py = Math.cos(a);
  const quad = (k: number) => [
    [x1 + px * w1 * k, y1 + py * w1 * k], [x2 + px * w2 * k, y2 + py * w2 * k],
    [x2 - px * w2 * k, y2 - py * w2 * k], [x1 - px * w1 * k, y1 - py * w1 * k],
  ];
  g.fillStyle(color, alpha * 0.3);
  poly(g, quad(1.7));
  g.fillStyle(color, alpha * 0.85);
  poly(g, quad(1));
  g.fillStyle(core, alpha * 0.8);
  poly(g, quad(0.36));
}

/** A rounded hexagon outline (pointy-top), stroked or filled. */
function hexagon(g: Phaser.GameObjects.Graphics, x: number, y: number, rx: number, ry: number, rot: number, fill: boolean): void {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * TAU - Math.PI / 2;
    pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rx, y + Math.sin(a) * ry));
  }
  if (fill) g.fillPoints(pts, true);
  else g.strokePoints(pts, true);
}

/** One spell-hand per potion arm, in that arm's tone, pointing along `ang`. */
function spellHand(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, v: MechArmView, alpha: number, t: number,
): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const tone = v.kind ? MECH_ARM_TONES[v.kind] : WITCH.violetLit;
  if (v.boosted) {
    g.lineStyle(2, tone, alpha * 0.45);
    g.strokeCircle(x, y, 15 + Math.sin(t * 6) * 1.5);
  }
  switch (v.kind) {
    case 'chainsaw': {
      // Whirling crescents of cutting wind, glowing whiter as the arm overheats.
      const hx = x + c * (8 + v.extend * 8), hy = y + s * (8 + v.extend * 8);
      g.fillStyle(tone, alpha * 0.22);
      g.fillCircle(hx, hy, 14);
      for (let i = 0; i < 3; i++) {
        const a = v.spin * 1.4 + (i / 3) * TAU;
        const pts: number[][] = [];
        for (let k = 0; k <= 6; k++) {
          const u = k / 6;
          const aa = a + u * 1.6;
          pts.push([hx + Math.cos(aa) * 12, hy + Math.sin(aa) * 12]);
        }
        for (let k = 6; k >= 0; k--) {
          const u = k / 6;
          const aa = a + u * 1.6;
          const rr = 12 - Math.sin(u * Math.PI) * 5;
          pts.push([hx + Math.cos(aa) * rr, hy + Math.sin(aa) * rr]);
        }
        g.fillStyle(v.heat > 0.6 ? WITCH.white : tone, alpha * 0.95);
        poly(g, pts);
      }
      g.fillStyle(WITCH.hexPale, alpha * (0.5 + v.heat * 0.5));
      g.fillCircle(hx, hy, 3.4);
      break;
    }
    case 'medcore': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      g.fillStyle(tone, alpha * 0.25);
      g.fillCircle(x, y, 13 + pulse * 3);
      g.fillStyle(WITCH.hexDeep, alpha);
      g.fillCircle(x, y, 9);
      g.fillStyle(tone, alpha);
      g.fillCircle(x, y, 7.4);
      g.fillStyle(WITCH.hexPale, alpha);
      g.fillRect(x - 1.4, y - 5, 2.8, 10);
      g.fillRect(x - 5, y - 1.4, 10, 2.8);
      g.lineStyle(1.2, WITCH.hexPale, alpha * (1 - pulse));
      g.strokeCircle(x, y, 9 + pulse * 7);
      break;
    }
    case 'grabber': {
      // Spectral talons that open wide and snap shut.
      const reach = 6 + v.extend * 12;
      const hx = x + c * reach * 0.4, hy = y + s * reach * 0.4;
      g.fillStyle(tone, alpha * 0.25);
      g.fillCircle(hx, hy, 11);
      const open = (1 - v.grip) * 0.75 + 0.15;
      for (const k of [-1, 0, 1]) {
        const a = ang + k * open;
        const len = k === 0 ? 14 : 16;
        const bx = hx + Math.cos(a) * 3, by = hy + Math.sin(a) * 3;
        const tx = hx + Math.cos(a) * len + Math.cos(ang) * 2, ty = hy + Math.sin(a) * len + Math.sin(ang) * 2;
        const px = -Math.sin(a), py = Math.cos(a);
        g.fillStyle(WITCH.crow, alpha);
        poly(g, [[bx + px * 3, by + py * 3], [tx, ty], [bx - px * 3, by - py * 3]]);
        g.fillStyle(tone, alpha * 0.9);
        poly(g, [[bx + px * 1.4, by + py * 1.4], [tx, ty], [bx - px * 0.4, by - py * 0.4]]);
      }
      g.fillStyle(tone, alpha);
      g.fillCircle(hx, hy, 5);
      break;
    }
    case 'shield': {
      // A rune ward held out along the aim, braced flat when gripping.
      const hx = x + c * 8, hy = y + s * 8;
      const r = 13 + v.grip * 3;
      g.fillStyle(tone, alpha * 0.3);
      hexagon(g, hx, hy, r, r, ang, true);
      g.lineStyle(2.4, tone, alpha);
      hexagon(g, hx, hy, r, r, ang, false);
      g.lineStyle(1.2, WITCH.white, alpha * 0.7);
      hexagram(g, hx, hy, r * 0.62, r * 0.62, t * 0.8);
      break;
    }
    case 'barrage': {
      // A roost: a dark orb with three crows wheeling round it, waiting to be let go.
      g.fillStyle(tone, alpha * (0.2 + v.fire * 0.4));
      g.fillCircle(x, y, 13 + v.fire * 5);
      g.fillStyle(WITCH.crow, alpha);
      g.fillCircle(x, y, 7.5);
      g.fillStyle(tone, alpha * 0.9);
      g.fillCircle(x + c * 2, y + s * 2, 3);
      for (let i = 0; i < 3; i++) {
        const a = t * 3.2 + (i / 3) * TAU;
        const bx = x + Math.cos(a) * 12, by = y + Math.sin(a) * 12;
        const fa = a + Math.PI / 2;
        const fc = Math.cos(fa), fs = Math.sin(fa);
        const flap = 2 + Math.abs(Math.sin(t * 18 + i)) * 3;
        g.fillStyle(WITCH.crow, alpha);
        poly(g, [[bx + fc * 4, by + fs * 4], [bx - fs * flap, by + fc * flap], [bx - fc * 3, by - fs * 3], [bx + fs * flap, by - fc * flap]]);
      }
      break;
    }
    case 'overclock': {
      // A turning star-sigil, burning brighter than everything else on the construct.
      const r = 11;
      g.fillStyle(tone, alpha * 0.28);
      g.fillCircle(x, y, r + 4);
      g.lineStyle(2, tone, alpha);
      g.beginPath();
      for (let k = 0; k <= 5; k++) {
        const a = v.spin + (k * 2 % 5) * (TAU / 5) - Math.PI / 2;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.strokePath();
      g.fillStyle(WITCH.white, alpha);
      g.fillCircle(x, y, 2.8);
      break;
    }
    default: {
      // Bare: a spectral claw of a hand.
      g.fillStyle(WITCH.violet, alpha * 0.3);
      g.fillCircle(x, y, 10);
      g.fillStyle(WITCH.violetLit, alpha);
      g.fillCircle(x, y, 6);
      for (const k of [-0.5, 0, 0.5]) {
        const a = ang + k;
        g.fillStyle(WITCH.lilac, alpha);
        poly(g, [
          [x + Math.cos(a + 1.2) * 2.4, y + Math.sin(a + 1.2) * 2.4],
          [x + Math.cos(a) * 12, y + Math.sin(a) * 12],
          [x + Math.cos(a - 1.2) * 2.4, y + Math.sin(a - 1.2) * 2.4],
        ]);
      }
      break;
    }
  }
}

/**
 * The R+ mech as a spell construct around the witch: a rune circle turning on the floor,
 * spectral legs stamping in it, a violet ward-shell at her back with floating crystal spires
 * and green orbs at the shoulders, two arms of raw spell carrying the potion-arm effects, and
 * a hat-shaped rune burning over the top. Dormant, it sits dim and small; crewed, it flares.
 * Same kinematics and footprint as the walker, so every arm reads in the same place.
 */
export class WitchSpellRig extends CreationMechRig {
  private sparkleAccum = 0;

  constructor(scene: Phaser.Scene, tint: CreationColorFn, depth = 5) {
    super(scene, tint, depth);
  }

  update(delta: number, x: number, y: number, alpha: number, speed: number): void {
    if (!this.back.active || !this.front.active) return;
    const dt = delta / 1000;
    this.t += dt;
    const wanted = this.mounted ? Phaser.Math.Clamp(speed / 190, 0, 1) : 0;
    this.gait += (wanted - this.gait) * Math.min(1, dt * 7);
    this.stride += dt * (2.6 + this.gait * 7.5);
    const wantCrouch = this.mounted ? 0 : 1;
    this.crouch += (wantCrouch - this.crouch) * Math.min(1, dt * 4);

    const b = this.back, f = this.front;
    b.clear();
    f.clear();
    if (alpha <= 0.02) return;

    const t = this.t;
    const wake = 1 - this.crouch;
    const pa = alpha * (0.5 + 0.5 * wake);
    const sink = this.crouch * 9;
    const float = Math.sin(t * 2.2) * 1.6 * wake + Math.sin(this.stride * 2) * this.gait * 2;
    const cy = y + sink + float;
    const spin = t * (0.5 + wake * 0.8 + this.gait * 1.2);

    // ── Rune circle on the floor ─────────────────────────────────────
    const gy = y + 42;
    b.fillStyle(WITCH.hexDeep, pa * 0.3);
    b.fillEllipse(x, gy, 104, 36);
    b.lineStyle(2.2, WITCH.hex, pa * 0.9);
    b.strokeEllipse(x, gy, 104, 36);
    b.lineStyle(1.2, WITCH.hexLit, pa * 0.75);
    b.strokeEllipse(x, gy, 86, 29);
    hexagram(b, x, gy, 42, 14, -spin);
    b.lineStyle(1, WITCH.hexLit, pa * 0.7);
    for (let i = 0; i < 14; i++) {
      const a = spin + (i / 14) * TAU;
      const c = Math.cos(a), s = Math.sin(a);
      b.lineBetween(x + c * 44, gy + s * 15, x + c * 50, gy + s * 17.2);
      if (i % 2 === 0) b.lineBetween(x + c * 50, gy + s * 17.2, x + Math.cos(a + 0.1) * 45, gy + Math.sin(a + 0.1) * 15.5);
    }

    // ── Spectral legs ────────────────────────────────────────────────
    for (const side of [-1, 1] as const) {
      const ph = this.stride + (side < 0 ? Math.PI : 0);
      const lift = Math.max(0, Math.sin(ph)) * 7 * this.gait;
      const swing = Math.cos(ph) * 9 * this.gait;
      const hipX = x + side * 13, hipY = cy + 12;
      const kneeX = hipX + side * (7 + this.crouch * 5) + swing * 0.5;
      const kneeY = cy + 30 - lift - this.crouch * 6;
      const ankleX = kneeX + swing - side * this.crouch * 3;
      const ankleY = cy + 46 - lift - this.crouch * 9;
      spellLimb(b, hipX, hipY, kneeX, kneeY, 6, 4.6, WITCH.violet, WITCH.lilac, pa * 0.85);
      spellLimb(b, kneeX, kneeY, ankleX, ankleY, 4.6, 2.6, WITCH.violet, WITCH.lilac, pa * 0.85);
      // Each footfall is a little sigil pressed into the circle.
      b.fillStyle(WITCH.hexLit, pa * 0.4);
      b.fillEllipse(ankleX, ankleY + 2, 20, 7);
      b.lineStyle(1.4, WITCH.hexPale, pa * 0.85);
      b.strokeEllipse(ankleX, ankleY + 2, 16, 5.4);
    }

    // ── Ward shell at the pilot's back ───────────────────────────────
    b.fillStyle(WITCH.violet, pa * 0.18);
    hexagon(b, x, cy - 10, 36, 32, 0, true);
    b.fillStyle(WITCH.plum, pa * 0.82);
    hexagon(b, x, cy - 10, 30, 26, 0, true);
    b.lineStyle(2.4, WITCH.violetLit, pa);
    hexagon(b, x, cy - 10, 30, 26, 0, false);
    b.lineStyle(1.2, WITCH.hex, pa * 0.8);
    hexagon(b, x, cy - 10, 24, 20.5, 0, false);
    // A slow sigil turning on the shell's crown, visible above the pilot's head.
    hexSigil(b, x, cy - 27, 9, spin * 0.7, pa * 0.9);

    // Crystal spires floating over the shoulders.
    for (const sd of [-1, 1]) {
      const bob = Math.sin(t * 2.6 + sd) * 2.2;
      const sx = x + sd * 20, sy = cy - 40 + bob;
      b.fillStyle(WITCH.violet, pa * 0.35);
      b.fillEllipse(sx, sy, 14, 24);
      b.fillStyle(WITCH.violetLit, pa);
      poly(b, [[sx, sy - 10], [sx + 4.4, sy], [sx, sy + 8], [sx - 4.4, sy]]);
      b.fillStyle(WITCH.lilac, pa * 0.9);
      poly(b, [[sx, sy - 10], [sx + 1.4, sy - 1], [sx, sy + 6], [sx - 2.6, sy]]);
    }

    // Shoulder orbs, each with a rune ring orbiting it.
    for (const sd of [-1, 1]) {
      const sx = x + sd * 29, sy = cy - 18;
      b.fillStyle(WITCH.hex, pa * 0.3);
      b.fillCircle(sx, sy, 13);
      b.fillStyle(WITCH.hexDeep, pa);
      b.fillCircle(sx, sy, 9.5);
      b.fillStyle(WITCH.hex, pa);
      b.fillCircle(sx, sy - 1, 7.6);
      b.fillStyle(WITCH.hexPale, pa * 0.85);
      b.fillCircle(sx - sd * 2.2, sy - 3.6, 2.6);
      b.lineStyle(1.2, WITCH.hexLit, pa * 0.8);
      b.strokeEllipse(sx, sy, 26, 8 + Math.sin(t * 2 + sd) * 3);
    }

    // ── Spell arms (in front) ────────────────────────────────────────
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      const v = this.arms[i];
      const sx = x + side * 29, sy = cy - 18;
      const rest = Math.PI / 2 - side * 0.2;
      const live = this.aim + side * 0.62;
      const a0 = Phaser.Math.Angle.RotateTo(live, rest, this.crouch * Math.PI);
      const ex = sx + Math.cos(a0) * 17, ey = sy + Math.sin(a0) * 17;
      const a1 = Phaser.Math.Angle.RotateTo(this.aim + side * 0.2, rest, this.crouch * Math.PI);
      const fore = 15 + v.extend * 4;
      const hx = ex + Math.cos(a1) * fore, hy = ey + Math.sin(a1) * fore;
      spellLimb(f, sx, sy, ex, ey, 5.6, 4.4, WITCH.violet, WITCH.lilac, pa * 0.9);
      f.fillStyle(WITCH.hexLit, pa);
      f.fillCircle(ex, ey, 4.2);
      f.fillStyle(WITCH.hexPale, pa);
      f.fillCircle(ex - 1, ey - 1, 1.6);
      spellLimb(f, ex, ey, hx, hy, 4.4, 3, WITCH.violet, WITCH.lilac, pa * 0.9);
      spellHand(f, hx, hy, a1, v, pa, t);
    }

    // ── Binding rings over the pilot ─────────────────────────────────
    const bandA = pa * (0.45 + this.crouch * 0.3);
    f.lineStyle(2, WITCH.hexLit, bandA);
    f.beginPath();
    f.arc(x, cy + 2, 24, Math.PI * 0.08, Math.PI * 0.92);
    f.strokePath();
    if (this.mounted) {
      const roll = (t * 0.8) % 1;
      f.lineStyle(1.4, WITCH.hexPale, pa * 0.7 * (1 - roll));
      f.strokeEllipse(x, cy + 4 - roll * 26, 46, 12);
    }

    // ── Hat-shaped rune burning over the top ─────────────────────────
    const lampOn = this.mounted ? 0.7 + 0.3 * Math.sin(t * 5) : 0.25 + 0.25 * Math.sin(t * 1.6);
    const hy0 = cy - 40;
    f.fillStyle(WITCH.crow, pa);
    poly(f, [[x - 13, hy0 + 2], [x - 3, hy0 - 2], [x + 4, hy0 - 15], [x + 7, hy0 - 12], [x + 3, hy0 - 2], [x + 13, hy0 + 2]]);
    f.lineStyle(1.4, WITCH.hexLit, pa * (0.5 + lampOn * 0.5));
    f.strokePoints([[x - 13, hy0 + 2], [x - 3, hy0 - 2], [x + 4, hy0 - 15], [x + 7, hy0 - 12], [x + 3, hy0 - 2], [x + 13, hy0 + 2]]
      .map(([px, py]) => new Phaser.Geom.Point(px, py)), true);
    f.fillStyle(WITCH.hexLit, pa * lampOn);
    f.fillCircle(x, hy0 - 3, 2.6);
    f.fillStyle(WITCH.white, pa * lampOn * 0.8);
    f.fillCircle(x - 0.6, hy0 - 3.6, 1);

    // Sparkles lifting off the spires, tied to how hard the construct is working.
    this.sparkleAccum += delta * (0.4 + this.gait * 2.2) * (this.mounted ? 1 : 0.25);
    if (this.sparkleAccum >= 360) {
      this.sparkleAccum = 0;
      const sd = Math.random() < 0.5 ? -1 : 1;
      this.fx.sparks(x + sd * 20, cy - 44, 2, { speed: 40, size: 1.8, life: 520, gravity: -60, depth: 9 });
    }
  }

  /** Unravels in a burst of violet light rather than shedding plate. */
  wreck(x: number, y: number): void {
    this.fx.explosion(x, y, 92, { shards: 10, smoke: 2, core: CREATION.nexus, debris: false });
    this.fx.ring(x, y, 10, 120, CREATION.nexusLit, 620, 5, 8);
    this.fx.ring(x, y + 40, 20, 80, CREATION.brass, 520, 3, 4);
    this.scene.cameras.main.shake(220, 0.008);
  }
}
