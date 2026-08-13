import Phaser from 'phaser';
import { ArmGesture, AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Paper draws.
 *
 * One primitive underneath nearly all of it: a *sheet* — a four-cornered piece of paper with a
 * fold crease across it, one lifted corner, and a shadow cast a couple of pixels down-right. A
 * plane is a sheet folded to a dart. A shuriken is four sheets rotated. A mâché monster is four
 * sheets pinched to a point. The book is two sheets and a spine.
 *
 * Three rules hold the look together:
 *
 * 1. Paper is opaque and it casts a shadow. Deliberate, against every translucent kit in the game —
 *    every sheet gets a dark offset copy underneath, which is the single thing that stops the
 *    element reading as flat cream rectangles.
 * 2. Nothing here is a smooth curve. Every edge is drawn from straight segments with a per-vertex
 *    jitter, because torn and folded paper has corners and creases, not arcs.
 * 3. The three storybooks own the colour. `BOOK_TONE` is the only place a knight is green, an
 *    alien is blue and a fantasy is violet, and every ability takes its accent from whichever
 *    book is open — so cycling a book recolours half the element at once.
 */

export type PaperColorFn = ColorFn;

export const PAP = {
  /** The stock itself, and the base of every sheet. */
  pulp: 0xf2ead6,
  /** The shaded half of a fold. */
  shade: 0xd6cbac,
  /** Crease lines and torn edges. */
  crease: 0xa8996f,
  /** The shadow a sheet drops. */
  drop: 0x2b2618,
  ink: 0x241f14,
  bright: 0xfffaf0,
  /** Knight book. */
  spectre: 0x6ef0a8,
  spectreDeep: 0x1f7a4d,
  /** Alien book. */
  beam: 0x54b8ff,
  beamDeep: 0x1b4f96,
  /** Fantasy book. */
  arcane: 0xd45cf0,
  arcaneDeep: 0x6a2192,
  /** The fantasy Climax's spirit, and every trail it leaves. */
  flame: 0xff8a3c,
  ember: 0xffd48a,
  /** Shuriken bleed. */
  blood: 0xc8324a,
  /** The Journal's own colour — leather and gilt. */
  gilt: 0xe8c65c,
  /** Bible book (Larger Library) — the light it throws, and the gold of the crucifix. */
  halo: 0xfff3c4,
  haloDeep: 0xb8862a,
  /** Herbology book (Larger Library) — a fresh seed, and the sap it darkens to as it grazes. */
  leaf: 0x7fe06a,
  leafDeep: 0x1f6b2a,
  /** The lotus at the end of the Herbology book. */
  petal: 0xffb3dd,
  petalDeep: 0xb0407f,
};

/**
 * Three books as standard; the Larger Library shop upgrade adds the last two, which is why the
 * id runs to 4 rather than 2 and why every book lookup goes through `BOOK_TONE` by index.
 */
export type BookId = 0 | 1 | 2 | 3 | 4;

/** Everything one storybook recolours. Indexed by `BookId`, never looked up by name. */
export const BOOK_TONE: { name: string; emoji: string; accent: number; deep: number; cover: number }[] = [
  { name: 'Knight', emoji: '📗', accent: PAP.spectre, deep: PAP.spectreDeep, cover: 0x2f7d55 },
  { name: 'Alien', emoji: '📘', accent: PAP.beam, deep: PAP.beamDeep, cover: 0x2c548f },
  { name: 'Fantasy', emoji: '📕', accent: PAP.arcane, deep: PAP.arcaneDeep, cover: 0x7d2a52 },
  { name: 'Bible', emoji: '📙', accent: PAP.halo, deep: PAP.haloDeep, cover: 0x8a6a1e },
  { name: 'Herbology', emoji: '📓', accent: PAP.leaf, deep: PAP.leafDeep, cover: 0x2f6b34 },
];

/** Deterministic 0–1 noise, so a torn edge tears the same way every frame. */
export function jitter(seed: number, i: number): number {
  const v = Math.sin(seed * 41.3 + i * 137.9) * 18734.431;
  return v - Math.floor(v);
}

/** Scale a colour's channels. Used for the shaded half of every fold. */
export function shade(color: number, k: number): number {
  const r = Math.round(Math.min(255, ((color >> 16) & 0xff) * k));
  const g = Math.round(Math.min(255, ((color >> 8) & 0xff) * k));
  const b = Math.round(Math.min(255, (color & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

/** Local (along-axis, across-axis) → world, for a shape rotated to `ang` about (x, y). */
function pt(x: number, y: number, ca: number, sa: number, u: number, v: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x + ca * u - sa * v, y + sa * u + ca * v);
}

/** Every point of a polygon shifted by the same world offset — how a sheet drops its shadow. */
function offset(face: Phaser.Geom.Point[], dx: number, dy: number): Phaser.Geom.Point[] {
  return face.map((p) => new Phaser.Geom.Point(p.x + dx, p.y + dy));
}

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * One sheet of paper, centred on (x, y) with its long axis along `ang`.
 *
 * The corners are pushed off true independently so no sheet is a clean rectangle, a crease runs
 * across the short axis with the far half shaded, and one corner is lifted — drawn as a small
 * bright triangle folded back on itself, which is the detail that reads as "paper" rather than
 * "beige card". The shadow underneath is not optional; without it the whole element floats.
 */
export function paperSheet(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number,
  len: number, width: number, alpha: number,
  { color = PAP.pulp, seed = 0, curl = 1, drop = 2.6, crease = true } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  const j = (i: number) => (jitter(seed, i) - 0.5) * width * 0.16;
  const hl = len * 0.5;
  const hw = width * 0.5;
  const face = [
    P(hl + j(1), -hw + j(2)),
    P(hl + j(3), hw + j(4)),
    P(-hl + j(5), hw + j(6)),
    P(-hl + j(7), -hw + j(8)),
  ];

  if (drop > 0) {
    g.fillStyle(shade(tint(PAP.drop), 1), alpha * 0.34);
    g.fillPoints(offset(face, drop, drop), true);
  }

  // The lit half, then the same shape's far half over the top in shade — one crease, two tones.
  g.fillStyle(tint(color), alpha);
  g.fillPoints(face, true);
  if (crease) {
    const c0 = P(0, -hw);
    const c1 = P(0, hw);
    g.fillStyle(shade(tint(color), 0.87), alpha);
    g.fillPoints([c0, c1, face[2], face[3]], true);
    g.lineStyle(1, tint(PAP.crease), alpha * 0.7);
    g.lineBetween(c0.x, c0.y, c1.x, c1.y);
  }

  // The lifted corner: a wedge folded back off the leading edge, lit brighter than the face.
  if (curl > 0) {
    const c = width * 0.34 * curl;
    const a0 = P(hl, -hw);
    const b0 = P(hl - c, -hw);
    const b1 = P(hl, -hw + c);
    g.fillStyle(tint(PAP.bright), alpha * 0.9);
    g.fillPoints([a0, b0, b1], true);
    g.lineStyle(1, tint(PAP.crease), alpha * 0.8);
    g.lineBetween(b0.x, b0.y, b1.x, b1.y);
  }

  g.lineStyle(1.1, tint(PAP.crease), alpha * 0.85);
  g.strokePoints(face, true, true);
}

/**
 * A paper dart in flight or parked. Drawn as a keel plus two wings rather than one triangle:
 * the centre fold has to be visible from every angle or the plane reads as an arrowhead.
 */
export function paperPlaneShape(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { accent = PAP.crease, bank = 0, drop = 3 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  // Banking squashes the far wing and stretches the near one, which is what sells a turn.
  const near = 1 + bank * 0.5;
  const far = 1 - bank * 0.5;
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);

  const nose = P(size, 0);
  const tailU = -size * 0.75;
  const wingA = [nose, P(tailU, -size * 0.62 * far), P(tailU * 0.55, -size * 0.1)];
  const wingB = [nose, P(tailU, size * 0.62 * near), P(tailU * 0.55, size * 0.1)];
  const keel = [nose, P(tailU * 0.9, size * 0.06), P(tailU * 1.1, -size * 0.02)];

  if (drop > 0) {
    g.fillStyle(tint(PAP.drop), alpha * 0.3);
    g.fillPoints(offset([...wingA, ...wingB.slice(1)], drop, drop), true);
  }
  g.fillStyle(shade(tint(PAP.pulp), 0.84), alpha);
  g.fillPoints(wingA, true);
  g.fillStyle(tint(PAP.pulp), alpha);
  g.fillPoints(wingB, true);
  g.fillStyle(tint(PAP.bright), alpha * 0.9);
  g.fillPoints(keel, true);

  g.lineStyle(1.2, tint(accent), alpha * 0.85);
  g.strokePoints(wingA, true, true);
  g.strokePoints(wingB, true, true);
  g.lineStyle(1, tint(PAP.crease), alpha * 0.9);
  g.lineBetween(nose.x, nose.y, P(tailU, 0).x, P(tailU, 0).y);
}

/**
 * A folded shuriken: four sheets pinwheeled around a hub, each one a kite with a hard fold down
 * its spine so the blade catches light on one side only.
 */
export function shurikenShape(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, r: number, alpha: number,
  { accent = PAP.crease, blades = 4, drop = 3 } = {},
): void {
  for (let i = 0; i < blades; i++) {
    const a = ang + (i / blades) * TAU;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
    const face = [P(r, -r * 0.06), P(r * 0.22, r * 0.42), P(-r * 0.16, r * 0.1), P(r * 0.2, -r * 0.3)];
    if (drop > 0) {
      g.fillStyle(tint(PAP.drop), alpha * 0.3);
      g.fillPoints(offset(face, drop, drop), true);
    }
    g.fillStyle(tint(i % 2 === 0 ? PAP.pulp : PAP.shade), alpha);
    g.fillPoints(face, true);
    g.lineStyle(1, tint(accent), alpha * 0.8);
    g.strokePoints(face, true, true);
    // The spine crease, running the length of the blade.
    g.lineStyle(1, tint(PAP.crease), alpha * 0.6);
    g.lineBetween(x, y, P(r * 0.9, 0).x, P(r * 0.9, 0).y);
  }
  g.fillStyle(tint(PAP.bright), alpha * 0.9);
  g.fillCircle(x, y, r * 0.16);
  g.lineStyle(1, tint(accent), alpha);
  g.strokeCircle(x, y, r * 0.16);
}

/**
 * The same folded star, built as a pinwheel instead — what a shuriken becomes once Paper Pinwheel
 * is bought.
 *
 * Six sails rather than four kites, and the difference that makes it read as a toy is the fold:
 * each sail's outer corner is bent forward across the direction of spin and caught brightly, so
 * the wheel has a visible cupped face. Stuck in a wall it grows the pin it spins on.
 */
export function pinwheelShape(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, r: number, alpha: number,
  { accent = PAP.crease, sails = 6, drop = 3, stuck = 0 } = {},
): void {
  // The pin, driven into the wall, drawn first so the sails spin in front of it.
  if (stuck > 0) {
    g.lineStyle(4, tint(PAP.drop), alpha * 0.35);
    g.lineBetween(x + 2, y + 2, x + 2, y + r * 0.95 + 2);
    g.lineStyle(3, tint(PAP.crease), alpha * 0.85);
    g.lineBetween(x, y, x, y + r * 0.95);
  }

  for (let i = 0; i < sails; i++) {
    const a = ang + (i / sails) * TAU;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
    const face = [P(r * 0.12, 0), P(r, -r * 0.12), P(r * 0.9, r * 0.46), P(r * 0.3, r * 0.36)];
    if (drop > 0) {
      g.fillStyle(tint(PAP.drop), alpha * 0.28);
      g.fillPoints(offset(face, drop, drop), true);
    }
    g.fillStyle(tint(i % 2 === 0 ? PAP.pulp : PAP.shade), alpha);
    g.fillPoints(face, true);
    // The bent corner: the whole reason this reads as a pinwheel and not a star.
    g.fillStyle(tint(PAP.bright), alpha * 0.88);
    g.fillPoints([P(r, -r * 0.12), P(r * 0.9, r * 0.46), P(r * 0.64, r * 0.02)], true);
    g.lineStyle(1.1, tint(accent), alpha * 0.85);
    g.strokePoints(face, true, true);
    // The crease running from hub to tip, which is where the sail folds.
    g.lineStyle(1, tint(PAP.crease), alpha * 0.55);
    g.lineBetween(P(r * 0.16, 0).x, P(r * 0.16, 0).y, P(r * 0.9, r * 0.24).x, P(r * 0.9, r * 0.24).y);
  }

  // Hub: a pin head with a highlight, so the wheel has an axis to turn on.
  g.fillStyle(tint(accent), alpha);
  g.fillCircle(x, y, r * 0.17);
  g.fillStyle(tint(PAP.bright), alpha);
  g.fillCircle(x - r * 0.05, y - r * 0.05, r * 0.09);
}

/**
 * The Bible book's click: a slab of scripture-light thrown broadside on.
 *
 * `ang` is the direction of travel and the slab's *long* axis runs across it, so what the caster
 * sees leaving their hands is the long edge — a wall, not a spear. Ruled like a page and lit
 * hardest along the leading edge, with the light it is shedding trailing out behind.
 */
export function lightSlab(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, len: number, width: number, alpha: number,
  { accent = PAP.halo, deep = PAP.haloDeep, seed = 0 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const hu = width * 0.5;
  const hv = len * 0.5;

  // Halo: a bigger, fainter copy of the same slab.
  g.fillStyle(tint(accent), alpha * 0.15);
  g.fillPoints([P(hu * 2.3, -hv * 1.14), P(hu * 2.3, hv * 1.14), P(-hu * 2.3, hv * 1.14), P(-hu * 2.3, -hv * 1.14)], true);

  // Light shed backwards, one streak per rule line.
  for (let i = 0; i < 7; i++) {
    const v = (i / 6 - 0.5) * len * 0.9;
    const tail = width * (1.1 + jitter(seed, i) * 1.9);
    g.lineStyle(2, tint(accent), alpha * 0.2);
    g.lineBetween(P(-hu, v).x, P(-hu, v).y, P(-hu - tail, v).x, P(-hu - tail, v).y);
  }

  // Body: the trailing half in deep gold, the leading half in white gold.
  g.fillStyle(tint(deep), alpha * 0.88);
  g.fillPoints([P(0, -hv), P(0, hv), P(-hu, hv), P(-hu, -hv)], true);
  g.fillStyle(tint(accent), alpha * 0.95);
  g.fillPoints([P(hu, -hv), P(hu, hv), P(0, hv), P(0, -hv)], true);

  // Ruled lines, so a bar of light still reads as a page.
  g.lineStyle(1, tint(PAP.bright), alpha * 0.45);
  for (let i = 1; i < 6; i++) {
    const v = -hv + (i / 6) * len;
    g.lineBetween(P(hu * 0.72, v).x, P(hu * 0.72, v).y, P(-hu * 0.72, v).x, P(-hu * 0.72, v).y);
  }

  g.lineStyle(3, tint(PAP.bright), alpha);
  g.lineBetween(P(hu, -hv).x, P(hu, -hv).y, P(hu, hv).x, P(hu, hv).y);
  g.lineStyle(1.4, tint(PAP.gilt), alpha * 0.85);
  g.strokePoints([P(hu, -hv), P(hu, hv), P(-hu, hv), P(-hu, -hv)], true, true);
}

/**
 * The Bible book's ending: a crucifix planted in the floor, gilt-edged, with a halo turning over
 * it. Drawn under the fighters — whoever it has caught stands in front of it.
 */
export function crucifixShape(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, s: number, alpha: number,
  { accent = PAP.halo, deep = PAP.haloDeep, t = 0 } = {},
): void {
  const up = s * 2;
  const down = s * 1.1;
  const arm = s * 0.95;
  const beam = s * 0.3;
  const barY = y - up * 0.56;

  // The light it stands in, breathing.
  g.fillStyle(tint(accent), alpha * 0.11 * (0.7 + 0.3 * Math.sin(t * 3)));
  g.fillEllipse(x, y - s * 0.4, s * 2.9, s * 4.4);
  g.fillStyle(tint(PAP.drop), alpha * 0.3);
  g.fillEllipse(x + 3, y + down * 0.9, s * 1.8, s * 0.6);

  for (const [dx, dy, col, a] of [
    [3, 3, PAP.drop, alpha * 0.3],
    [0, 0, deep, alpha],
  ] as [number, number, number, number][]) {
    g.fillStyle(tint(col), a);
    g.fillRect(x - beam * 0.5 + dx, y - up + dy, beam, up + down);
    g.fillRect(x - arm + dx, barY - beam * 0.5 + dy, arm * 2, beam);
  }
  // The lit face of each timber — one edge only, so the cross has a light source.
  g.fillStyle(tint(accent), alpha);
  g.fillRect(x - beam * 0.5, y - up, beam * 0.42, up + down);
  g.fillRect(x - arm, barY - beam * 0.5, arm * 2, beam * 0.4);

  g.lineStyle(1.4, tint(PAP.gilt), alpha * 0.9);
  g.strokeRect(x - beam * 0.5, y - up, beam, up + down);
  g.strokeRect(x - arm, barY - beam * 0.5, arm * 2, beam);

  // Halo, turning above the head of the cross.
  const wob = 0.55 + 0.45 * Math.sin(t * 3.4);
  g.lineStyle(2.6, tint(PAP.bright), alpha * wob);
  g.strokeEllipse(x, y - up - s * 0.26, s * 1.05, s * 0.3 + s * 0.14 * wob);
}

/** One link of chain, drawn as an oriented ring so a run of them reads as rope rather than dots. */
export function chainLink(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, r: number, alpha: number,
  { color = PAP.gilt } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const ring: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    ring.push(pt(x, y, ca, sa, Math.cos(a) * r, Math.sin(a) * r * 0.5));
  }
  g.lineStyle(Math.max(1.6, r * 0.42), tint(PAP.drop), alpha * 0.35);
  g.strokePoints(offset(ring, 1.4, 1.4), true, true);
  g.lineStyle(Math.max(1.4, r * 0.34), tint(color), alpha);
  g.strokePoints(ring, true, true);
  g.lineStyle(Math.max(0.8, r * 0.14), tint(PAP.bright), alpha * 0.8);
  g.strokePoints(ring.slice(0, 5), false, false);
}

/** A run of links from a to b. Alternating orientation, the way real chain lies. */
export function chainRun(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x0: number, y0: number, x1: number, y1: number, r: number, alpha: number,
  { color = PAP.gilt } = {},
): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = r * 1.5;
  const n = Math.max(1, Math.round(dist / step));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    chainLink(g, tint, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k,
      ang + (i % 2 === 0 ? 0 : Math.PI / 2), r, alpha, { color });
  }
}

/**
 * A Herbology seed in flight. `charge` 0–1 is how close it has come to a body — it darkens from
 * fresh green toward sap and grows an aura, because the whole ability is threading it *past*
 * somebody, and the colour is the only readout of what it is carrying home.
 */
export function herbSeed(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, r: number, charge: number, alpha: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const body = shade(tint(PAP.leaf), 1 - charge * 0.6);
  const under = shade(body, 0.68);

  g.fillStyle(body, alpha * (0.1 + charge * 0.28));
  g.fillCircle(x, y, r * (1.7 + charge * 1.4));

  // Two leaf halves either side of a spine, the far one shaded.
  g.fillStyle(under, alpha);
  g.fillPoints([P(r * 1.6, 0), P(-r * 0.5, -r), P(-r * 1.1, 0)], true);
  g.fillStyle(body, alpha);
  g.fillPoints([P(r * 1.6, 0), P(-r * 0.5, r), P(-r * 1.1, 0)], true);

  g.lineStyle(1, tint(PAP.bright), alpha * 0.7);
  g.lineBetween(P(r * 1.6, 0).x, P(r * 1.6, 0).y, P(-r * 1.1, 0).x, P(-r * 1.1, 0).y);
  g.lineStyle(1, tint(PAP.leafDeep), alpha * 0.6);
  for (let i = 0; i < 3; i++) {
    const u = r * (0.9 - i * 0.62);
    const w = r * (0.3 + i * 0.2);
    g.lineBetween(P(u, 0).x, P(u, 0).y, P(u - w, w).x, P(u - w, w).y);
    g.lineBetween(P(u, 0).x, P(u, 0).y, P(u - w, -w).x, P(u - w, -w).y);
  }

  // The bead of sap it has banked, riding at the back of the leaf.
  if (charge > 0.04) {
    g.fillStyle(tint(PAP.bright), alpha * (0.4 + charge * 0.5));
    g.fillCircle(P(-r * 0.4, 0).x, P(-r * 0.4, 0).y, r * 0.34 * charge + 0.7);
  }
}

/**
 * The Herbology book's ending: a lotus opening on a lily pad, seen at the arena's shallow angle.
 * Three rings of petals with a gilt seed head turning at the middle; `open` 0–1 unfurls it.
 */
export function lotusBloom(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, r: number, open: number, alpha: number,
  { t = 0, seed = 0 } = {},
): void {
  g.fillStyle(tint(PAP.drop), alpha * 0.28);
  g.fillEllipse(x + 4, y + r * 0.3, r * 2.6, r * 1.2);
  g.fillStyle(tint(PAP.leafDeep), alpha * 0.6);
  g.fillEllipse(x, y + r * 0.22, r * 2.5, r * 1.15);
  g.lineStyle(1.4, tint(PAP.leaf), alpha * 0.6);
  g.strokeEllipse(x, y + r * 0.22, r * 2.5, r * 1.15);

  const rings = [
    { n: 9, len: 1, w: 0.34, col: PAP.petalDeep, lift: 0 },
    { n: 7, len: 0.76, w: 0.3, col: PAP.petal, lift: 0.14 },
    { n: 5, len: 0.52, w: 0.26, col: PAP.bright, lift: 0.28 },
  ];
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * TAU + ri * 0.42 + (jitter(seed, ri * 10 + i) - 0.5) * 0.2;
      const L = r * ring.len * (0.35 + open * 0.65);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Squashed on the vertical, because the floor is seen at an angle everywhere else too.
      const Q = (u: number, v: number) => new Phaser.Geom.Point(
        x + (ca * u - sa * v),
        y - r * ring.lift * open + (sa * u + ca * v) * 0.52,
      );
      const petal = [Q(0, 0), Q(L * 0.55, -r * ring.w), Q(L, 0), Q(L * 0.55, r * ring.w)];
      g.fillStyle(tint(ring.col), alpha * 0.92);
      g.fillPoints(petal, true);
      g.lineStyle(1, tint(PAP.petalDeep), alpha * 0.65);
      g.strokePoints(petal, true, true);
    }
  });

  const pulse = 1 + Math.sin(t * 5) * 0.14;
  g.fillStyle(tint(PAP.gilt), alpha);
  g.fillCircle(x, y - r * 0.3 * open, r * 0.2 * pulse);
  g.fillStyle(tint(PAP.bright), alpha * 0.9);
  for (let i = 0; i < 6; i++) {
    const a = t * 1.4 + (i / 6) * TAU;
    g.fillCircle(x + Math.cos(a) * r * 0.14, y - r * 0.3 * open + Math.sin(a) * r * 0.07, r * 0.05);
  }
}

/**
 * A paper fortune-teller (cootie-catcher) sitting mouth-up on the floor.
 *
 * `open` 0–1 works the four flaps. At 0 it is a flat pinched diamond; at 1 the flaps are spread
 * and there is a dark throat in the middle with two rows of torn teeth across it. The teeth are
 * the whole joke, so they are drawn as real triangles rather than a zigzag line.
 */
export function fortuneTeller(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, r: number, open: number, alpha: number,
  { seed = 0, accent = PAP.crease, drop = 3, spin = 0 } = {},
): void {
  const spread = 0.18 + open * 0.5;
  if (drop > 0) {
    g.fillStyle(tint(PAP.drop), alpha * 0.32);
    g.fillEllipse(x + drop, y + drop + r * 0.2, r * 2.05, r * 1.5);
  }

  // Throat first, so the flaps close over it as `open` falls.
  g.fillStyle(tint(PAP.ink), alpha * (0.35 + open * 0.6));
  g.fillCircle(x, y, r * (0.28 + open * 0.34));

  for (let i = 0; i < 4; i++) {
    const a = spin + (i / 4) * TAU + Math.PI / 4;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
    const reach = r * (1 + open * 0.18);
    const face = [
      P(r * 0.1, 0),
      P(reach, -reach * spread + jitter(seed, i) * 2),
      P(reach * (0.92 + jitter(seed, 8 + i) * 0.14), reach * spread),
    ];
    g.fillStyle(tint(i % 2 === 0 ? PAP.pulp : PAP.shade), alpha);
    g.fillPoints(face, true);
    g.lineStyle(1, tint(accent), alpha * 0.85);
    g.strokePoints(face, true, true);
  }

  // Teeth: two opposed rows of torn triangles across the throat.
  if (open > 0.15) {
    const bite = r * 0.3 * open;
    g.fillStyle(tint(PAP.bright), alpha * 0.95);
    for (let row = 0; row < 2; row++) {
      const dir = row === 0 ? -1 : 1;
      for (let i = 0; i < 4; i++) {
        const u = (i - 1.5) * r * 0.24;
        const base = y + dir * r * (0.1 + open * 0.22);
        g.fillPoints([
          new Phaser.Geom.Point(x + u - r * 0.1, base),
          new Phaser.Geom.Point(x + u + r * 0.1, base),
          new Phaser.Geom.Point(x + u + jitter(seed, 20 + i + row * 4) * r * 0.08, base - dir * bite),
        ], true);
      }
    }
  }

  // Two ink dots for eyes on the two upper flaps — this is the thing that makes it a monster.
  if (open > 0.05) {
    g.fillStyle(tint(PAP.ink), alpha * 0.9);
    for (const s of [-1, 1]) {
      g.fillCircle(x + s * r * 0.5, y - r * 0.5, r * 0.11);
    }
  }
}

/**
 * An open storybook. Two pages tented off a spine, a hard cover in the book's own colour, and a
 * scatter of ink lines that read as text at any size.
 */
export function storybookShape(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, size: number, alpha: number,
  { cover = PAP.spectreDeep, accent = PAP.spectre, open = 1, seed = 3, drop = 3 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = size;
  const h = size * 0.74;
  const lift = h * 0.32 * open;

  if (drop > 0) {
    g.fillStyle(tint(PAP.drop), alpha * 0.34);
    g.fillPoints(offset([P(-w, h * 0.4), P(w, h * 0.4), P(w, -h * 0.4), P(-w, -h * 0.4)], drop, drop), true);
  }

  // The two pages, tented so the spine is the highest point.
  for (const s of [-1, 1]) {
    const page = [P(0, -lift), P(s * w, -h * 0.16), P(s * w, h * 0.5), P(0, h * 0.34)];
    g.fillStyle(tint(s < 0 ? PAP.shade : PAP.pulp), alpha);
    g.fillPoints(page, true);
    g.lineStyle(1, tint(PAP.crease), alpha * 0.8);
    g.strokePoints(page, true, true);
    // Four lines of "text" per page, shortened at random so it reads as prose.
    g.lineStyle(1, tint(PAP.ink), alpha * 0.4);
    for (let i = 0; i < 4; i++) {
      const v = -lift * 0.4 + (i + 1) * (h * 0.15);
      const run = w * (0.5 + jitter(seed, i + (s > 0 ? 10 : 0)) * 0.35);
      const a0 = P(s * w * 0.16, v);
      const a1 = P(s * (w * 0.16 + run), v + h * 0.06);
      g.lineBetween(a0.x, a0.y, a1.x, a1.y);
    }
  }

  // Cover and spine, in the book's colour — this is the only part that says which book is open.
  g.fillStyle(tint(cover), alpha);
  g.fillPoints([P(-w * 1.06, h * 0.36), P(w * 1.06, h * 0.36), P(w * 1.02, h * 0.6), P(-w * 1.02, h * 0.6)], true);
  g.lineStyle(2, tint(accent), alpha * 0.9);
  g.lineBetween(P(0, -lift).x, P(0, -lift).y, P(0, h * 0.5).x, P(0, h * 0.5).y);
}

/**
 * Excalibur: a ghostly blade, all straight lines. Drawn as a long tapered spike with a crossguard
 * and a trailing smear, so a blade crossing the arena leaves a wake rather than a blur.
 */
export function ghostBlade(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  { accent = PAP.spectre, deep = PAP.spectreDeep, trail = 1 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = len * 0.13;

  if (trail > 0) {
    g.fillStyle(tint(accent), alpha * 0.14);
    g.fillPoints([P(-len * 0.2, -w * 0.7), P(-len * 2.2 * trail, 0), P(-len * 0.2, w * 0.7)], true);
  }
  // Blade: a long triangle with a flat back, so the edge is unambiguous.
  g.fillStyle(tint(deep), alpha * 0.75);
  g.fillPoints([P(len, 0), P(-len * 0.15, -w), P(-len * 0.15, w)], true);
  g.fillStyle(tint(accent), alpha * 0.9);
  g.fillPoints([P(len, 0), P(-len * 0.15, -w * 0.45), P(-len * 0.15, w * 0.15)], true);
  // Crossguard and grip.
  g.lineStyle(3, tint(accent), alpha * 0.9);
  g.lineBetween(P(-len * 0.18, -w * 2).x, P(-len * 0.18, -w * 2).y, P(-len * 0.18, w * 2).x, P(-len * 0.18, w * 2).y);
  g.lineStyle(2.4, tint(deep), alpha * 0.9);
  g.lineBetween(P(-len * 0.2, 0).x, P(-len * 0.2, 0).y, P(-len * 0.52, 0).x, P(-len * 0.52, 0).y);
  g.fillStyle(tint(PAP.bright), alpha * 0.85);
  g.fillCircle(P(-len * 0.56, 0).x, P(-len * 0.56, 0).y, w * 0.6);
}

/**
 * A ghostly knight mid-charge — a helm, a cloak streaming back, a couched lance, and a suggestion
 * of a horse underneath. Everything is angular and everything trails backwards, because the only
 * thing this shape ever does is cross the screen at speed.
 */
export function ghostKnight(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, dir: number, s: number, alpha: number,
  { accent = PAP.spectre, deep = PAP.spectreDeep, mounted = true, phase = 0 } = {},
): void {
  const d = dir >= 0 ? 1 : -1;
  const bob = Math.sin(phase) * s * 0.1;

  if (mounted) {
    // Horse: a wedge body, a low neck and four legs thrown into a gallop.
    g.fillStyle(tint(deep), alpha * 0.6);
    g.fillPoints([
      new Phaser.Geom.Point(x - d * s * 1.1, y + bob),
      new Phaser.Geom.Point(x + d * s * 0.9, y - s * 0.12 + bob),
      new Phaser.Geom.Point(x + d * s * 1.2, y + s * 0.42 + bob),
      new Phaser.Geom.Point(x - d * s * 1.0, y + s * 0.5 + bob),
    ], true);
    g.lineStyle(2.4, tint(accent), alpha * 0.55);
    for (let i = 0; i < 4; i++) {
      const swing = Math.sin(phase + i * 1.7) * s * 0.5;
      const lx = x + d * s * (0.7 - i * 0.5);
      g.lineBetween(lx, y + s * 0.45 + bob, lx + swing, y + s * 1.05 + bob);
    }
    // Head and muzzle.
    g.fillStyle(tint(deep), alpha * 0.65);
    g.fillPoints([
      new Phaser.Geom.Point(x + d * s * 0.9, y - s * 0.1 + bob),
      new Phaser.Geom.Point(x + d * s * 1.7, y + s * 0.16 + bob),
      new Phaser.Geom.Point(x + d * s * 1.5, y + s * 0.42 + bob),
      new Phaser.Geom.Point(x + d * s * 0.9, y + s * 0.3 + bob),
    ], true);
  }

  const ry = y - s * (mounted ? 0.62 : 0.1) + bob;

  // Cloak, streaming back from the shoulders and torn along its trailing edge.
  g.fillStyle(tint(accent), alpha * 0.3);
  g.fillPoints([
    new Phaser.Geom.Point(x, ry - s * 0.2),
    new Phaser.Geom.Point(x - d * s * 1.5, ry + s * 0.1 + Math.sin(phase * 1.4) * s * 0.2),
    new Phaser.Geom.Point(x - d * s * 1.3, ry + s * 0.7),
    new Phaser.Geom.Point(x, ry + s * 0.55),
  ], true);

  // Body and helm — a bucket with a visor slit.
  g.fillStyle(tint(deep), alpha * 0.8);
  g.fillPoints([
    new Phaser.Geom.Point(x - d * s * 0.3, ry - s * 0.18),
    new Phaser.Geom.Point(x + d * s * 0.36, ry - s * 0.14),
    new Phaser.Geom.Point(x + d * s * 0.3, ry + s * 0.6),
    new Phaser.Geom.Point(x - d * s * 0.32, ry + s * 0.6),
  ], true);
  g.fillStyle(tint(accent), alpha * 0.85);
  g.fillPoints([
    new Phaser.Geom.Point(x - d * s * 0.26, ry - s * 0.2),
    new Phaser.Geom.Point(x + d * s * 0.3, ry - s * 0.24),
    new Phaser.Geom.Point(x + d * s * 0.26, ry - s * 0.72),
    new Phaser.Geom.Point(x - d * s * 0.22, ry - s * 0.68),
  ], true);
  g.fillStyle(tint(PAP.ink), alpha * 0.8);
  g.fillRect(x - d * s * 0.2, ry - s * 0.56, d * s * 0.44, s * 0.1);

  // The lance, couched and level.
  g.lineStyle(s * 0.16, tint(accent), alpha * 0.9);
  g.lineBetween(x - d * s * 0.5, ry + s * 0.28, x + d * s * 2.3, ry + s * 0.02);
  g.fillStyle(tint(PAP.bright), alpha * 0.9);
  g.fillPoints([
    new Phaser.Geom.Point(x + d * s * 2.3, ry + s * 0.02),
    new Phaser.Geom.Point(x + d * s * 1.9, ry - s * 0.16),
    new Phaser.Geom.Point(x + d * s * 1.95, ry + s * 0.2),
  ], true);
}

/**
 * The fantasy spike: a faceted dart of arcane paper with a portal glow behind it. Struck three
 * times, so it wants to look like the same object arriving from somewhere else each time.
 */
export function arcaneSpike(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  { accent = PAP.arcane, deep = PAP.arcaneDeep, trail = 1 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const w = len * 0.3;

  if (trail > 0) {
    g.fillStyle(tint(accent), alpha * 0.16);
    g.fillPoints([P(0, -w * 0.6), P(-len * 2 * trail, 0), P(0, w * 0.6)], true);
  }
  g.fillStyle(tint(deep), alpha * 0.9);
  g.fillPoints([P(len, 0), P(-len * 0.4, -w), P(-len * 0.65, 0), P(-len * 0.4, w)], true);
  g.fillStyle(tint(accent), alpha * 0.95);
  g.fillPoints([P(len, 0), P(-len * 0.4, -w * 0.5), P(-len * 0.5, 0)], true);
  g.lineStyle(1, tint(PAP.bright), alpha * 0.8);
  g.lineBetween(P(len, 0).x, P(len, 0).y, P(-len * 0.5, 0).x, P(-len * 0.5, 0).y);
}

/**
 * A portal the spike leaves through and comes back out of: a ring of torn paper edges with a
 * dark eye behind them. `k` 0–1 opens and closes it.
 */
export function portalTear(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, r: number, k: number, alpha: number,
  { accent = PAP.arcane, deep = PAP.arcaneDeep, seed = 0, spin = 0 } = {},
): void {
  const open = Math.sin(Math.min(1, k) * Math.PI);
  if (open <= 0.01) return;
  g.fillStyle(tint(PAP.ink), alpha * open * 0.85);
  g.fillEllipse(x, y, r * 1.5 * open, r * 2 * open);
  g.fillStyle(tint(deep), alpha * open * 0.5);
  g.fillEllipse(x, y, r * 1.1 * open, r * 1.6 * open);
  // Torn edge: irregular spikes standing off the rim.
  for (let i = 0; i < 11; i++) {
    const a = spin + (i / 11) * TAU;
    const inner = r * (0.7 + jitter(seed, i) * 0.2) * open;
    const outer = r * (1 + jitter(seed, 20 + i) * 0.4) * open;
    g.lineStyle(2, tint(accent), alpha * open * 0.8);
    g.lineBetween(
      x + Math.cos(a) * inner * 0.75, y + Math.sin(a) * inner,
      x + Math.cos(a) * outer * 0.75, y + Math.sin(a) * outer,
    );
  }
}

/**
 * An alien targeting ring painted on the ground. `k` 0–1 is how close the bomb is; the ring
 * shrinks, the crosshair spins up and the fill reddens, so the last half-second is unmistakable.
 */
export function targetRing(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, r: number, k: number, alpha: number,
  { accent = PAP.beam, seed = 0 } = {},
): void {
  const squash = 0.42;
  const hot = k * k;
  g.fillStyle(tint(accent), alpha * (0.08 + hot * 0.22));
  g.fillEllipse(x, y, r * 2, r * 2 * squash);
  g.lineStyle(2, tint(accent), alpha * (0.5 + hot * 0.5));
  g.strokeEllipse(x, y, r * 2, r * 2 * squash);
  // Inner ring closing on the centre — the countdown, drawn rather than printed.
  const inner = r * (1 - hot * 0.75);
  g.lineStyle(2.4, tint(hot > 0.7 ? PAP.bright : accent), alpha * (0.4 + hot * 0.6));
  g.strokeEllipse(x, y, inner * 2, inner * 2 * squash);
  // Crosshair ticks, spinning up as it arms.
  const spin = k * 4;
  for (let i = 0; i < 4; i++) {
    const a = spin + (i / 4) * TAU + jitter(seed, i) * 0.2;
    g.lineStyle(2, tint(accent), alpha * 0.75);
    g.lineBetween(
      x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55 * squash,
      x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25 * squash,
    );
  }
}

/**
 * A patch of burning paper left by the Fantasy Climax's spirit. Curling, blackening flakes with
 * flame licking off the top edge — deliberately not a fire ellipse, because what is on fire here
 * is a sheet of paper.
 */
export function burningScrap(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, r: number, life: number, alpha: number,
  { seed = 0, t = 0 } = {},
): void {
  // Char spreads inward as the scrap burns down.
  const char = 1 - life;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + jitter(seed, i) * 1.4;
    const d = r * (0.2 + jitter(seed, 10 + i) * 0.7);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.5;
    const s = r * (0.3 + jitter(seed, 20 + i) * 0.4);
    g.fillStyle(tint(char > 0.4 ? PAP.ink : PAP.shade), alpha * 0.7);
    g.fillPoints([
      new Phaser.Geom.Point(px - s, py),
      new Phaser.Geom.Point(px, py - s * 0.7),
      new Phaser.Geom.Point(px + s, py + s * 0.2),
      new Phaser.Geom.Point(px - s * 0.3, py + s * 0.6),
    ], true);
    // Flame off the top edge, flickering on its own phase per flake.
    const lick = 1 + Math.sin(t * 9 + i * 2.1) * 0.35;
    g.fillStyle(tint(i % 2 === 0 ? PAP.flame : PAP.ember), alpha * (0.55 + 0.3 * Math.sin(t * 7 + i)));
    g.fillPoints([
      new Phaser.Geom.Point(px - s * 0.5, py - s * 0.4),
      new Phaser.Geom.Point(px, py - s * (1.5 * lick)),
      new Phaser.Geom.Point(px + s * 0.5, py - s * 0.3),
    ], true);
  }
}

/**
 * The Fantasy Climax's spirit itself: a lick of flame with an ink-dot face, bouncing around the
 * arena. Given a face on purpose — an eight-second object that is only a fire blob stops being
 * readable the moment two of them are on screen with anything else.
 */
export function flameSpirit(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, r: number, alpha: number, t: number,
  { seed = 0, vx = 1, vy = 0 } = {},
): void {
  const lean = Math.atan2(vy, vx);
  for (let layer = 0; layer < 3; layer++) {
    const k = 1 - layer * 0.3;
    const col = layer === 0 ? PAP.flame : layer === 1 ? PAP.ember : PAP.bright;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      // Taller than wide, and pulled toward the direction of travel — the flame leans into it.
      const wob = 1 + Math.sin(t * 8 + i * 1.3 + seed) * 0.16;
      const rr = r * k * wob * (a > Math.PI ? 1.25 : 0.85);
      pts.push(new Phaser.Geom.Point(
        x + Math.cos(a) * rr * 0.8 - Math.cos(lean) * r * 0.25 * layer,
        y + Math.sin(a) * rr - Math.sin(lean) * r * 0.25 * layer,
      ));
    }
    g.fillStyle(tint(col), alpha * (0.55 + layer * 0.15));
    g.fillPoints(pts, true);
  }
  g.fillStyle(tint(PAP.ink), alpha * 0.9);
  for (const s of [-1, 1]) g.fillCircle(x + s * r * 0.28, y - r * 0.2, r * 0.13);
  g.fillPoints([
    new Phaser.Geom.Point(x - r * 0.2, y + r * 0.24),
    new Phaser.Geom.Point(x + r * 0.2, y + r * 0.24),
    new Phaser.Geom.Point(x, y + r * 0.5),
  ], true);
}

/**
 * Mastery — Restructure: one piece of the caster, loose in the room.
 *
 * A shard is not a sheet. `paperSheet` draws something folded and flat with a soft crease;
 * this is the opposite — a long torn wedge with a ragged spine, a honed leading edge and a
 * blot of ink still on it from whatever page it used to be part of. The point is that a room
 * full of these reads as a person who has come apart, not as confetti.
 *
 * `home` 0–1 is how far through the reassembly this piece is: it brightens and grows a
 * comet-tail of accent as it turns round and starts coming back.
 */
export function paperShard(
  g: Phaser.GameObjects.Graphics,
  tint: PaperColorFn,
  x: number, y: number, ang: number, len: number, alpha: number,
  { accent = PAP.gilt, seed = 0, home = 0, drop = 2.4 } = {},
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (u: number, v: number) => pt(x, y, ca, sa, u, v);
  const j = (i: number) => (jitter(seed, i) - 0.5) * len * 0.34;
  const w = len * 0.44;

  // The tail it drags on the way home — never behind a shard that is still flying out.
  if (home > 0.01) {
    g.fillStyle(tint(accent), alpha * 0.22 * home);
    g.fillPoints([P(0, -w * 0.5), P(-len * (1.4 + home * 1.6), j(11) * 0.4), P(0, w * 0.5)], true);
  }

  // A five-sided wedge: sharp nose, ragged spine down one flank, blunt torn butt.
  const face = [
    P(len * 0.92, j(1) * 0.2),
    P(len * 0.18, -w * 0.72 + j(2)),
    P(-len * 0.5 + j(3), -w * 0.5),
    P(-len * 0.72, w * 0.34 + j(4)),
    P(len * 0.1, w * 0.66 + j(5)),
  ];

  if (drop > 0) {
    g.fillStyle(shade(tint(PAP.drop), 1), alpha * 0.32);
    g.fillPoints(offset(face, drop, drop), true);
  }
  g.fillStyle(tint(PAP.pulp), alpha);
  g.fillPoints(face, true);
  // The shaded half, split along the spine rather than across a fold — a shard has no fold.
  g.fillStyle(shade(tint(PAP.pulp), 0.82), alpha);
  g.fillPoints([face[0], face[3], face[4]], true);

  // Ink still on the page: two ruled stubs that run off the torn edge.
  g.lineStyle(1, tint(PAP.ink), alpha * (0.3 + home * 0.2));
  for (let i = 0; i < 2; i++) {
    const v = -w * 0.24 + i * w * 0.46;
    const a0 = P(-len * 0.42, v);
    const a1 = P(len * 0.34 - jitter(seed, 30 + i) * len * 0.3, v);
    g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  }

  // The honed edge, and the accent the book is lending it. Both hotter the closer it is to home.
  g.lineStyle(1.4, tint(PAP.bright), alpha * (0.6 + home * 0.4));
  g.lineBetween(face[1].x, face[1].y, face[0].x, face[0].y);
  g.lineStyle(1.1, tint(accent), alpha * (0.45 + home * 0.55));
  g.strokePoints(face, true, true);
  if (home > 0.4) {
    g.fillStyle(tint(accent), alpha * (home - 0.4) * 0.5);
    g.fillCircle(P(len * 0.92, 0).x, P(len * 0.92, 0).y, len * 0.22);
  }
}

// ── Fx ────────────────────────────────────────────────────────────────────

export class PaperFx extends FxBase {
  /** Confetti of torn scraps thrown off a point — the all-purpose "paper broke" beat. */
  shred(x: number, y: number, count = 8, spread = 30, ms = 480, depth = 10, color = PAP.pulp): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU,
      d: spread * (0.4 + Math.random() * 0.9),
      s: 3 + Math.random() * 5,
      r: (Math.random() - 0.5) * 9,
      i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        // Gravity on the scraps: they fly out, then flutter down.
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e + e * e * 22 + Math.sin(t * 12 + p.i) * 3;
        paperSheet(g, this.tint, px, py, p.a + p.r * t, p.s * 2, p.s, (1 - t) * 0.95,
          { color, seed: p.i * 13 + 1, curl: 0, drop: 0, crease: false });
      }
    });
  }

  /** A hoop of the current book's colour going out — casts, summons, page turns. */
  ripple(x: number, y: number, r0: number, r1: number, ms = 420, depth = 9, color = PAP.spectre): void {
    this.anim(depth, ms, (g, t) => {
      const r = r0 + (r1 - r0) * easeOut(t);
      g.lineStyle(3 * (1 - t) + 0.8, this.tint(color), (1 - t) * 0.8);
      g.strokeCircle(x, y, r);
      g.lineStyle(1.4 * (1 - t) + 0.4, this.tint(PAP.bright), (1 - t) * 0.5);
      g.strokeCircle(x, y, r * 0.82);
    });
  }

  /** Ink splashing out of a hit — the impact beat for anything Paper lands. */
  splat(x: number, y: number, size = 22, color = PAP.ink, depth = 10): void {
    const seeds = Array.from({ length: 7 }, (_, i) => ({
      a: Math.random() * TAU, d: size * (0.3 + Math.random() * 0.8), s: 1.5 + Math.random() * 3, i,
    }));
    this.anim(depth, 380, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(color), (1 - t) * 0.6);
      g.fillCircle(x, y, size * 0.3 * (1 - t * 0.5));
      for (const p of seeds) {
        g.fillCircle(x + Math.cos(p.a) * p.d * e, y + Math.sin(p.a) * p.d * e, p.s * (1 - t));
      }
    });
  }

  /** Standard "a piece of paper hit you" beat. */
  cut(x: number, y: number, size = 22, color = PAP.spectre, depth = 10): void {
    this.flashIn(x, y, size * 0.5, PAP.bright, color, depth);
    this.shred(x, y, 4, size, 340, depth);
  }

  /** A page turning at a point — the right-click book cycle. */
  turnPage(x: number, y: number, from: number, to: number, ms = 340, depth = 11): void {
    this.anim(depth, ms, (g, t) => {
      // The sheet rotates edge-on through the middle of the animation, so the colour swaps
      // exactly when it is thinnest — which is what makes it read as one page rather than two.
      const e = easeIn(Math.min(1, t * 1.2));
      const w = Math.abs(Math.cos(e * Math.PI));
      const col = e < 0.5 ? from : to;
      paperSheet(g, this.tint, x, y - 22, Math.PI / 2, 34, Math.max(2, 26 * w), 1 - t * 0.4,
        { color: col, seed: 7, curl: w, drop: 0 });
    });
  }

  /** A laser lance from a to b — the Alien book's click, and its bombardment. */
  beam(x0: number, y0: number, x1: number, y1: number, width = 5, ms = 240, depth = 11): void {
    this.anim(depth, ms, (g, t) => {
      const k = 1 - t;
      g.lineStyle(width * k * 2.4, this.tint(PAP.beamDeep), k * 0.4);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(width * k, this.tint(PAP.beam), k * 0.9);
      g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(width * k * 0.4, this.tint(PAP.bright), k);
      g.lineBetween(x0, y0, x1, y1);
    });
  }

  /** A bomb landing: a hard white core, a blue shell and a ring of shred. */
  detonation(x: number, y: number, r: number, ms = 520, depth = 12): void {
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      g.fillStyle(this.tint(PAP.bright), (1 - t) * (1 - t) * 0.9);
      g.fillCircle(x, y, r * 0.4 * (0.3 + e));
      g.lineStyle(6 * (1 - t) + 1, this.tint(PAP.beam), (1 - t) * 0.8);
      g.strokeCircle(x, y, r * e);
      g.lineStyle(3 * (1 - t), this.tint(PAP.beamDeep), (1 - t) * 0.6);
      g.strokeCircle(x, y, r * e * 0.7);
    });
    this.shred(x, y, 9, r * 0.8, ms, depth);
  }

  /** A column of light dropping onto a point — the Bible book's crucifix arriving. */
  godRay(x: number, y: number, r: number, ms = 640, depth = 11): void {
    this.anim(depth, ms, (g, t) => {
      const k = 1 - t;
      const h = 420 * Math.min(1, t * 2.6);
      g.fillStyle(this.tint(PAP.halo), k * 0.22);
      g.fillPoints([
        new Phaser.Geom.Point(x - r * 0.5, y - h),
        new Phaser.Geom.Point(x + r * 0.5, y - h),
        new Phaser.Geom.Point(x + r, y),
        new Phaser.Geom.Point(x - r, y),
      ], true);
      const e = 0.4 + easeOut(t);
      g.lineStyle(3 * k + 1, this.tint(PAP.gilt), k * 0.85);
      g.strokeEllipse(x, y, r * 2 * e, r * 0.8 * e);
      g.lineStyle(1.6 * k, this.tint(PAP.bright), k * 0.7);
      g.strokeEllipse(x, y, r * 1.4 * e, r * 0.56 * e);
    });
  }

  /** Petals thrown off a bloom — the Herbology book's lotus opening. */
  petals(x: number, y: number, count = 16, spread = 90, ms = 820, depth = 11): void {
    const seeds = Array.from({ length: count }, (_, i) => ({
      a: Math.random() * TAU,
      d: spread * (0.4 + Math.random() * 0.85),
      s: 3 + Math.random() * 4,
      r: (Math.random() - 0.5) * 7,
      i,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const p of seeds) {
        // Thrown up and out, then settling — petals fall slower than scraps do.
        const px = x + Math.cos(p.a) * p.d * e;
        const py = y + Math.sin(p.a) * p.d * e * 0.6 - e * 28 + e * e * 18;
        const ang = p.a + p.r * t;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        g.fillStyle(this.tint(p.i % 3 === 0 ? PAP.bright : PAP.petal), (1 - t) * 0.9);
        g.fillPoints([
          new Phaser.Geom.Point(px + ca * p.s * 2, py + sa * p.s * 2),
          new Phaser.Geom.Point(px - sa * p.s, py + ca * p.s),
          new Phaser.Geom.Point(px - ca * p.s * 2, py - sa * p.s * 2),
          new Phaser.Geom.Point(px + sa * p.s, py - ca * p.s),
        ], true);
      }
    });
  }

  /** A journal entry being written — the between-match reward, shown on the game-over screen. */
  inkStroke(x: number, y: number, w: number, ms = 700, depth = 12): void {
    this.anim(depth, ms, (g, t) => {
      const e = Math.min(1, t * 1.6);
      g.lineStyle(2, this.tint(PAP.ink), (1 - t) * 0.9);
      let px = x - w / 2;
      let py = y;
      for (let i = 0; i < 12; i++) {
        const k = (i + 1) / 12;
        if (k > e) break;
        const nx = x - w / 2 + w * k;
        const ny = y + Math.sin(k * 9) * 3;
        g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
    });
  }
}

// ── Avatar ────────────────────────────────────────────────────────────────

const PAPER_AVATAR: AvatarSpec = {
  hands: [
    { r: 11, color: PAP.pulp, alpha: 0.3 },
    { r: 7, color: PAP.shade, alpha: 0.9 },
    { r: 2.4, color: PAP.bright, alpha: 0.95, ox: -1.6, oy: -1.8 },
  ],
  eyeWhite: PAP.bright,
  eyePupil: PAP.ink,
  squash: { div: 15, x: 0.5, y: 0.3 },
};

/**
 * Paper himself: a figure folded out of a few sheets, wearing a newspaper hat, holding an open
 * storybook in front of him.
 *
 * The book is the whole character. `setBook` swaps its cover colour and the ribbon on the hat at
 * the same time, so a right-click cycle is legible from across the arena without a HUD — and the
 * ability art takes its accent from the same table, so the element visibly changes colour three
 * ways as you play it.
 *
 * Mastered folds a second, taller peak into the hat and gilds the book's edge.
 */
export class PaperAvatar extends BaseAvatar {
  private book: BookId = 0;
  /** Page-turn animation: 1 the instant a book changes, decaying to 0. */
  private flip = 0;
  /** Ability tell: brightens the creases for a beat after every cast. */
  private flare = 0;
  private seed = Math.random() * 999;
  /** 0–1 — how crumpled the body is. Driven by low health, for a read at a glance. */
  private crumple = 0;

  constructor(scene: Phaser.Scene, tint: PaperColorFn, depth = 6) {
    super(scene, tint, depth, PAPER_AVATAR);
  }

  setBook(book: BookId): void {
    if (book === this.book) return;
    this.book = book;
    this.flip = 1;
  }

  /** 0 = pristine, 1 = a ball of scrap. */
  setCrumple(v: number): void { this.crumple = Phaser.Math.Clamp(v, 0, 1); }

  get tone(): { accent: number; deep: number; cover: number } { return BOOK_TONE[this.book]; }

  update(delta: number, x: number, y: number, alpha: number): void {
    this.flare = Math.max(0, this.flare - delta / 400);
    this.flip = Math.max(0, this.flip - delta / 360);
    super.update(delta, x, y, alpha);
  }

  play(gesture: ArmGesture, angle?: number, duration?: number): void {
    this.flare = 1;
    super.play(gesture, angle, duration);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 14 : 11);
      glow.setAlpha(on ? 0.48 : 0.3);
    });
  }

  protected emitTrail(x: number, y: number): void {
    new PaperFx(this.scene, this.tint).shred(x, y, 2, 7, 380, 4);
  }

  /** A plain drop shadow, because paper is opaque — plus a faint wash of the open book's colour. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void alpha;
    g.fillStyle(this.tint(PAP.drop), a * 0.36);
    g.fillEllipse(x + 3, y + 17, 40, 15);
    g.fillStyle(this.tint(this.tone.accent), a * (0.1 + this.flare * 0.12));
    g.fillEllipse(x, y + 15, 52, 18);
  }

  /** The torso: three overlapping sheets, crumpling inward as health drops. */
  protected drawBody(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const crush = 1 - this.crumple * 0.28;
    for (let i = 0; i < 3; i++) {
      const lean = (i - 1) * 0.22 + Math.sin(this.t * 0.8 + i) * 0.05 + this.crumple * (i - 1) * 0.5;
      paperSheet(g, this.tint, x, y + 1 + (i - 1) * 1.6, Math.PI / 2 + lean,
        30 * crush, 24 * crush, alpha * (0.8 + i * 0.07),
        { color: i === 1 ? PAP.pulp : PAP.shade, seed: this.seed + i * 5, curl: i === 2 ? 1 : 0, drop: i === 0 ? 3 : 0 });
    }
    // Ruled lines across the front sheet, brighter for a beat after every cast.
    g.lineStyle(1, this.tint(PAP.ink), alpha * (0.16 + this.flare * 0.3));
    for (let i = 0; i < 4; i++) {
      const ly = y - 8 + i * 5.5;
      g.lineBetween(x - 11, ly, x + 10 - jitter(this.seed, i) * 6, ly);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    void a;
    const tone = this.tone;
    const heat = 0.5 + this.flare * 0.5;
    const crown = y - 17;

    // ── The newspaper hat ──
    // Two folded peaks and a brim, leaning with the aim. Mastered adds a third, taller peak.
    const lean = Math.cos(this.facing) * 2.6;
    const w = this.mastered ? 17 : 14;
    const h = this.mastered ? 15 : 12;
    g.fillStyle(this.tint(PAP.drop), alpha * 0.3);
    g.fillPoints([
      new Phaser.Geom.Point(x + lean - w - 1, crown + 3),
      new Phaser.Geom.Point(x + lean + w + 1, crown + 3),
      new Phaser.Geom.Point(x + lean, crown - h + 2),
    ], true);
    g.fillStyle(this.tint(PAP.pulp), alpha);
    g.fillPoints([
      new Phaser.Geom.Point(x + lean - w, crown + 1),
      new Phaser.Geom.Point(x + lean + w, crown + 1),
      new Phaser.Geom.Point(x + lean + w * 0.2, crown - h),
    ], true);
    g.fillStyle(this.tint(PAP.shade), alpha);
    g.fillPoints([
      new Phaser.Geom.Point(x + lean - w, crown + 1),
      new Phaser.Geom.Point(x + lean + w * 0.2, crown - h),
      new Phaser.Geom.Point(x + lean - w * 0.5, crown - h * 0.72),
    ], true);
    if (this.mastered) {
      g.fillStyle(this.tint(PAP.bright), alpha * 0.95);
      g.fillPoints([
        new Phaser.Geom.Point(x + lean - w * 0.7, crown - h * 0.4),
        new Phaser.Geom.Point(x + lean + w * 0.1, crown - h * 1.5),
        new Phaser.Geom.Point(x + lean + w * 0.5, crown - h * 0.5),
      ], true);
    }
    // The brim, and the ribbon in the open book's colour.
    g.lineStyle(2.4, this.tint(PAP.crease), alpha * 0.9);
    g.lineBetween(x + lean - w, crown + 1, x + lean + w, crown + 1);
    g.lineStyle(2.6, this.tint(tone.accent), alpha * heat);
    g.lineBetween(x + lean - w * 0.85, crown - 1.6, x + lean + w * 0.6, crown - 3.4);

    // ── The open storybook, held out front along the aim ──
    // Rides on the same spring the hands do, so it swings when he casts rather than being pinned
    // to the body — and it flips edge-on for a beat when the book is cycled.
    const bx = x + Math.cos(this.facing) * 20;
    const by = y + Math.sin(this.facing) * 12 + 4;
    const flipW = 1 - this.flip * 0.85;
    storybookShape(g, this.tint, bx, by, Math.sin(this.facing) * 0.4, 13 * flipW, alpha, {
      cover: tone.cover, accent: tone.accent, open: 1 - this.flip * 0.6, seed: this.seed, drop: 3,
    });
    if (this.mastered) {
      g.lineStyle(1.6, this.tint(PAP.gilt), alpha * 0.9);
      g.strokeCircle(bx, by, 17);
    }
    // The book's own light on the page, pulsing with the flare.
    g.fillStyle(this.tint(tone.accent), alpha * (0.15 + heat * 0.22));
    g.fillEllipse(bx, by - 4, 22 * flipW, 10);
  }
}
