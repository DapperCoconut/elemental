import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Everything Justice draws: the magistrate/valkyrie character rig, the persistent world
 * objects (the Coliseum ring, the flame pillar, the ripped-out wall, the seraph), and the
 * one-shot effects behind each ability.
 *
 * Justice is gold and marble on the ground and cold blue in the air — the palette below is
 * the whole vocabulary, and every draw call routes a colour through the owner's mapper so a
 * future skin only has to remap these keys.
 */

export type JusticeColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const JUS = {
  /** Deep shadow under gilt — the outline colour for anything metal. */
  umber: 0x2b2010,
  bronze: 0x7d5f22,
  gold: 0xc9a13a,
  bright: 0xf0d68a,
  pale: 0xfff3cf,
  white: 0xffffff,
  /** Coliseum stone. */
  marble: 0xe6e1d2,
  stone: 0x9c9382,
  stoneDark: 0x5d564a,
  /** Willpower blue — Sheer Will's eyes, aura and afterimage. */
  will: 0x2f7bff,
  willPale: 0xa8ccff,
  willDeep: 0x0b2a6b,
  /** Pillar of Flame. */
  flame: 0xff7a1f,
  flameCore: 0xffd24a,
  flameDeep: 0x8e2a05,
  /** The verdict itself. */
  damned: 0xff3344,
} as const;

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A spear: tapered haft, a flared crossguard a third of the way up, and a leaf-shaped head.
 * Drawn nose-first from `(cx, cy)` along `angle`, so the caller positions the *butt* of it.
 * This is the shape behind the stab, the thrown spear and the one the rig holds.
 */
export function spearShape(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  cx: number, cy: number,
  angle: number, len: number,
  alpha = 1,
  scale = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (d: number, off = 0) => ({ x: cx + cos * d + px * off, y: cy + sin * d + py * off });

  const haftW = 1.9 * scale;
  const headLen = Math.min(len * 0.3, 21 * scale);
  const shaftLen = len - headLen;

  // Haft — two tones so it reads as a round pole rather than a line.
  const a = at(0, -haftW), b = at(shaftLen, -haftW);
  const c = at(shaftLen, haftW), d = at(0, haftW);
  g.fillStyle(tint(JUS.bronze), alpha);
  g.fillPoints([a, b, c, d].map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
  const hl0 = at(0, -haftW * 0.35), hl1 = at(shaftLen, -haftW * 0.35);
  g.lineStyle(haftW * 0.6, tint(JUS.bright), alpha * 0.6);
  g.lineBetween(hl0.x, hl0.y, hl1.x, hl1.y);

  // Crossguard — two swept wings at the base of the head.
  const gRoot = at(shaftLen - 2 * scale);
  const gL = at(shaftLen - 7 * scale, -6.5 * scale);
  const gR = at(shaftLen - 7 * scale, 6.5 * scale);
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillTriangle(gRoot.x, gRoot.y, gL.x, gL.y, at(shaftLen + 1 * scale, -1.2 * scale).x, at(shaftLen + 1 * scale, -1.2 * scale).y);
  g.fillTriangle(gRoot.x, gRoot.y, gR.x, gR.y, at(shaftLen + 1 * scale, 1.2 * scale).x, at(shaftLen + 1 * scale, 1.2 * scale).y);

  // Leaf head — widest a third of the way along, pinched to the point.
  const base = at(shaftLen);
  const wide = at(shaftLen + headLen * 0.34, 0);
  const wl = at(shaftLen + headLen * 0.34, -4.2 * scale);
  const wr = at(shaftLen + headLen * 0.34, 4.2 * scale);
  const tip = at(len);
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillPoints([
    new Phaser.Geom.Point(base.x, base.y),
    new Phaser.Geom.Point(wl.x, wl.y),
    new Phaser.Geom.Point(tip.x, tip.y),
    new Phaser.Geom.Point(wr.x, wr.y),
  ], true);
  // Fuller down the middle of the blade — the difference between a triangle and a spearhead.
  g.lineStyle(1.1 * scale, tint(JUS.pale), alpha * 0.85);
  g.lineBetween(base.x, base.y, tip.x, tip.y);
  g.fillStyle(tint(JUS.pale), alpha * 0.9);
  g.fillCircle(wide.x, wide.y, 1.1 * scale);
}

/**
 * An axe: a stubby haft and a broad crescent bit swept off one side of it.
 *
 * Same contract as {@link spearShape} — drawn head-first from `(cx, cy)` along `angle`, so the
 * caller positions the butt. The bit is deliberately off-axis: a spear is a line and an axe is
 * a weight on the end of a stick, and the silhouette has to say which one you are holding.
 */
export function axeShape(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  cx: number, cy: number,
  angle: number, len: number,
  alpha = 1,
  scale = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (d: number, off = 0) => ({ x: cx + cos * d + px * off, y: cy + sin * d + py * off });

  // Haft.
  const haftW = 2.4 * scale;
  const shaft = len * 0.74;
  const a = at(0, -haftW), b = at(shaft, -haftW), c = at(shaft, haftW), d = at(0, haftW);
  g.fillStyle(tint(JUS.bronze), alpha);
  g.fillPoints([a, b, c, d].map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
  g.lineStyle(haftW * 0.5, tint(JUS.bright), alpha * 0.55);
  const h0 = at(0, -haftW * 0.4), h1 = at(shaft, -haftW * 0.4);
  g.lineBetween(h0.x, h0.y, h1.x, h1.y);

  // Bit — a crescent hung off the head, drawn as a fan of quads so the edge curves.
  const root = at(shaft - 3 * scale);
  const segs = 7;
  const reach = 13 * scale;
  const drop = 15 * scale;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    // A quarter turn of edge, biting forward at the top and hanging back at the heel.
    const sweep = -Math.PI * 0.42 + f * Math.PI * 0.84;
    pts.push(at(shaft - 3 * scale + Math.cos(sweep) * drop, -reach - Math.sin(sweep) * 3 * scale));
  }
  g.fillStyle(tint(JUS.stone), alpha);
  for (let i = 0; i < segs; i++) {
    g.fillTriangle(root.x, root.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  // Lit edge along the outside of the crescent, and a gilt cheek where it meets the haft.
  g.lineStyle(2.2 * scale, tint(JUS.pale), alpha * 0.95);
  for (let i = 0; i < segs; i++) g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillCircle(root.x, root.y, 3.4 * scale);
  const butt = at(-2 * scale);
  g.fillStyle(tint(JUS.gold), alpha * 0.9);
  g.fillCircle(butt.x, butt.y, 2.4 * scale);
}

/**
 * An angel bite: a scalloped chunk missing out of a body, with light pouring out of the wound.
 *
 * Drawn on the *rim* of the body at `angle`, because a bite is taken out of an edge — a notch
 * in the middle of a circle reads as a hole, not as something torn away.
 */
export function angelBite(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number,
  bodyR: number, angle: number,
  t: number, alpha = 1,
): void {
  const bx = x + Math.cos(angle) * bodyR;
  const by = y + Math.sin(angle) * bodyR;
  const r = bodyR * 0.42;

  // The missing chunk: void first, so whatever the body drew underneath is gone.
  g.fillStyle(0x05040a, 0.85 * alpha);
  g.fillCircle(bx, by, r);
  // Teeth marks around the rim of the bite.
  const teeth = 5;
  for (let i = 0; i < teeth; i++) {
    const a = angle + Math.PI + (i / (teeth - 1) - 0.5) * 2.1;
    g.fillStyle(0x05040a, 0.85 * alpha);
    g.fillCircle(bx + Math.cos(a) * r * 0.86, by + Math.sin(a) * r * 0.86, r * 0.34);
  }
  // Light coming out of it — a hot core and a fan of rays pointing away from the body.
  const pulse = 0.72 + 0.28 * Math.sin(t * 8 + angle * 3);
  g.fillStyle(tint(JUS.pale), 0.85 * alpha * pulse);
  g.fillCircle(bx, by, r * 0.5);
  g.fillStyle(tint(JUS.white), 0.95 * alpha * pulse);
  g.fillCircle(bx, by, r * 0.24);
  for (let i = -2; i <= 2; i++) {
    const a = angle + i * 0.34;
    const len = r * (2.4 + Math.sin(t * 6 + i) * 0.5);
    g.fillStyle(tint(JUS.bright), 0.3 * alpha * pulse);
    g.fillTriangle(
      bx, by,
      bx + Math.cos(a) * len - Math.sin(a) * r * 0.2, by + Math.sin(a) * len + Math.cos(a) * r * 0.2,
      bx + Math.cos(a) * len + Math.sin(a) * r * 0.2, by + Math.sin(a) * len - Math.cos(a) * r * 0.2,
    );
  }
}

/**
 * A row of electrified holy spikes standing off a wall.
 *
 * `(x, y)` is the midpoint of the wall face, `nx`/`ny` the inward normal the spikes point
 * along, and `span` how much wall to cover. Every third spike carries an arc of charge across
 * to its neighbour, which is the whole tell that touching them is going to cost something.
 */
export function holySpikes(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  o: {
    x: number; y: number; vertical: boolean; span: number;
    nx: number; ny: number;
    /** Seconds, for the charge arcs. */
    t: number;
    alpha?: number;
  },
): void {
  const { x, y, vertical, span, nx, ny, t } = o;
  const alpha = o.alpha ?? 1;
  const step = 26;
  const n = Math.max(2, Math.round(span / step));
  const tips: { x: number; y: number }[] = [];

  for (let i = 0; i <= n; i++) {
    const f = i / n - 0.5;
    const bx = vertical ? x : x + f * span;
    const by = vertical ? y + f * span : y;
    // Alternating lengths, so the row reads as iron teeth rather than a comb.
    const len = (i % 2 === 0 ? 15 : 10) * (1 + 0.08 * Math.sin(t * 3 + i));
    const half = 5.5;
    const tipX = bx + nx * len;
    const tipY = by + ny * len;
    // Base is broad along the wall, tip is a point off it.
    const px = vertical ? 0 : 1, py = vertical ? 1 : 0;
    g.fillStyle(tint(JUS.stoneDark), 0.95 * alpha);
    g.fillTriangle(bx - px * half, by - py * half, bx + px * half, by + py * half, tipX, tipY);
    g.fillStyle(tint(JUS.stone), 0.9 * alpha);
    g.fillTriangle(bx - px * half * 0.5, by - py * half * 0.5, bx + px * half * 0.3, by + py * half * 0.3, tipX, tipY);
    g.fillStyle(tint(JUS.pale), (0.6 + 0.4 * Math.sin(t * 7 + i * 1.3)) * alpha);
    g.fillCircle(tipX, tipY, 2.1);
    tips.push({ x: tipX, y: tipY });
  }

  // Charge crawling between the tips — three live arcs at a time, walking along the row.
  const lit = Math.floor(t * 6);
  for (let k = 0; k < 3; k++) {
    const i = (lit + k * Math.max(1, Math.floor(n / 3))) % n;
    const a = tips[i], b = tips[i + 1];
    if (!a || !b) continue;
    const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 6;
    const my = (a.y + b.y) / 2 + (Math.random() - 0.5) * 6;
    g.lineStyle(1.8, tint(JUS.willPale), 0.85 * alpha);
    g.lineBetween(a.x, a.y, mx, my);
    g.lineBetween(mx, my, b.x, b.y);
    g.fillStyle(tint(JUS.white), 0.7 * alpha);
    g.fillCircle(mx, my, 1.6);
  }
}

/**
 * A run of interlocking chain links between two points. Alternating links are drawn
 * edge-on (a short bar) so the run reads as a twisted chain rather than a string of beads.
 */
export function chainRun(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x1: number, y1: number, x2: number, y2: number,
  alpha = 1,
  linkLen = 11,
  thick = 2.2,
  sag = 0,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const n = Math.max(1, Math.round(dist / linkLen));
  const ang = Math.atan2(dy, dx);
  const px = -Math.sin(ang), py = Math.cos(ang);

  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    // Catenary-ish droop, strongest at the middle of the run.
    const droop = sag * Math.sin(t * Math.PI);
    const cx = x1 + dx * t + px * droop;
    const cy = y1 + dy * t + py * droop;
    const flat = i % 2 === 0;
    g.lineStyle(thick, tint(JUS.umber), alpha);
    if (flat) g.strokeEllipse(cx, cy, linkLen * 0.95, thick * 2.6);
    else g.strokeEllipse(cx, cy, linkLen * 0.45, thick * 3.4);
    g.lineStyle(thick * 0.5, tint(JUS.gold), alpha);
    if (flat) g.strokeEllipse(cx, cy - thick * 0.4, linkLen * 0.9, thick * 2.2);
    else g.strokeEllipse(cx - thick * 0.3, cy, linkLen * 0.4, thick * 3);
  }
}

/**
 * A padlock — the tell that a chain is a *sentence* and not just a rope. Drawn upright
 * regardless of the chain's angle, because a lock hangs.
 */
export function padlock(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, r: number, alpha = 1,
): void {
  g.lineStyle(r * 0.34, tint(JUS.bronze), alpha);
  g.beginPath();
  g.arc(x, y - r * 0.55, r * 0.5, Math.PI, 0);
  g.strokePath();
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillRoundedRect(x - r * 0.75, y - r * 0.35, r * 1.5, r * 1.35, r * 0.28);
  g.fillStyle(tint(JUS.umber), alpha);
  g.fillCircle(x, y + r * 0.25, r * 0.24);
}

/**
 * The grapple head on the leading end of a live chain: two swept barbs and a bright tip.
 * Drawn pointing along `angle`, so the caller passes the chain's own heading.
 */
export function chainHead(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, angle: number, alpha = 1,
): void {
  g.fillStyle(tint(JUS.gold), alpha);
  for (let i = -1; i <= 1; i += 2) {
    const a = angle + i * 0.8;
    g.fillTriangle(
      x, y,
      x - Math.cos(a) * 12, y - Math.sin(a) * 12,
      x - Math.cos(angle) * 9, y - Math.sin(angle) * 9,
    );
  }
  g.fillStyle(tint(JUS.pale), alpha);
  g.fillCircle(x, y, 3);
}

/**
 * A ripped-out arena wall on its way across the map: two-tone masonry with courses cut along
 * its length and dust boiling off the leading face. `(x, y)` is the centre of the slab and
 * `nx`/`ny` is the direction of travel, which is the only thing that says which face is leading.
 */
export function wallSlab(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  o: {
    x: number; y: number; vertical: boolean;
    span: number; thick: number;
    nx: number; ny: number;
    /** Seconds, for the dust shimmer. */
    t: number;
  },
): void {
  const { x, y, vertical, span, thick, nx, ny, t } = o;
  const halfLen = span / 2;

  g.fillStyle(tint(JUS.stoneDark), 0.95);
  if (vertical) g.fillRect(x - thick / 2, y - halfLen, thick, span);
  else g.fillRect(x - halfLen, y - thick / 2, span, thick);
  g.fillStyle(tint(JUS.stone), 0.95);
  if (vertical) g.fillRect(x - thick / 2, y - halfLen, thick * 0.55, span);
  else g.fillRect(x - halfLen, y - thick / 2, span, thick * 0.55);

  // Masonry courses along its length, so a slab this big isn't a flat bar.
  g.lineStyle(1.2, tint(JUS.stoneDark), 0.8);
  const courses = Math.round(span / 34);
  for (let i = 1; i < courses; i++) {
    const f = -halfLen + (i / courses) * span;
    if (vertical) g.lineBetween(x - thick / 2, y + f, x + thick / 2, y + f);
    else g.lineBetween(x + f, y - thick / 2, x + f, y + thick / 2);
  }
  // Dust boiling off the leading face.
  g.fillStyle(tint(JUS.stone), 0.2 + 0.08 * Math.sin(t * 12));
  if (vertical) g.fillRect(x + nx * thick * 0.6, y - halfLen, 10, span);
  else g.fillRect(x - halfLen, y + ny * thick * 0.6, span, 10);
}

/**
 * The two beams a tranced victim's eyes throw back at whoever opened them — the tell that a
 * body walking at you is not walking of its own accord.
 */
export function tranceBeams(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  vx: number, vy: number,
  angle: number, t: number, alpha = 1,
): void {
  for (const side of [-1, 1]) {
    const ex = vx + Math.cos(angle) * 6 + Math.cos(angle + Math.PI / 2) * side * 6;
    const ey = vy - 4 + Math.sin(angle) * 6 + Math.sin(angle + Math.PI / 2) * side * 6;
    g.fillStyle(tint(JUS.white), (0.5 + 0.2 * Math.sin(t * 9 + side)) * alpha);
    g.fillTriangle(
      ex, ey,
      ex + Math.cos(angle) * 120 - Math.sin(angle) * 11, ey + Math.sin(angle) * 120 + Math.cos(angle) * 11,
      ex + Math.cos(angle) * 120 + Math.sin(angle) * 11, ey + Math.sin(angle) * 120 - Math.cos(angle) * 11,
    );
    g.fillStyle(tint(JUS.pale), 0.9 * alpha);
    g.fillCircle(ex, ey, 2.6);
  }
}

/**
 * The Willpower meter. A deep trough, the live fill, a pale gloss over its top third and
 * quarter ticks — the drain rate is meant to be legible at a glance, so the ticks matter.
 * Reads red under a quarter full.
 */
export function willMeter(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, w: number, h: number, ratio: number,
): void {
  g.fillStyle(0x05070f, 0.85);
  g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
  g.lineStyle(1.5, tint(JUS.will), 0.7);
  g.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
  g.fillStyle(tint(JUS.willDeep), 0.9);
  g.fillRect(x, y, w, h);
  g.fillStyle(tint(ratio < 0.25 ? JUS.damned : JUS.will), 1);
  g.fillRect(x, y, w * ratio, h);
  g.fillStyle(tint(JUS.willPale), 0.55);
  g.fillRect(x, y, w * ratio, h * 0.38);
  g.lineStyle(1, 0x05070f, 0.7);
  for (let i = 1; i < 4; i++) g.lineBetween(x + (w * i) / 4, y, x + (w * i) / 4, y + h);
}

// ── Combo Excelsius ───────────────────────────────────────────────────────

/**
 * The style meter: a slim bar with a hard-edged fill, a shear across both ends so it reads as
 * something bolted onto the top of the screen rather than a progress bar, and a bank of ticks
 * behind it. The letter beside it is Text, drawn by the kit — this is only the gauge.
 *
 * `heat` (0–1) is how recently style was scored, and drives the outer glow. `bleeding` shades
 * the tail of the fill red so a rank that is about to be lost says so before it goes.
 */
export function styleMeter(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, w: number, h: number,
  ratio: number, color: number,
  heat: number, bleeding: boolean, t: number,
): void {
  const shear = h * 0.6;
  const plate = (px: number, py: number, pw: number, ph: number, fill: number, alpha: number) => {
    g.fillStyle(fill, alpha);
    g.fillPoints([
      new Phaser.Geom.Point(px + shear, py),
      new Phaser.Geom.Point(px + pw, py),
      new Phaser.Geom.Point(px + pw - shear, py + ph),
      new Phaser.Geom.Point(px, py + ph),
    ], true);
  };

  if (heat > 0.01) {
    plate(x - 4 - heat * 3, y - 4 - heat * 3, w + 8 + heat * 6, h + 8 + heat * 6,
      tint(color), 0.18 * heat);
  }
  plate(x - 3, y - 3, w + 6, h + 6, 0x05070f, 0.88);
  plate(x, y, w, h, tint(JUS.stoneDark), 0.9);

  const fillW = Math.max(0, w * Phaser.Math.Clamp(ratio, 0, 1));
  if (fillW > shear) {
    plate(x, y, fillW, h, tint(color), 1);
    // The lit rule along the top, so the fill has a direction.
    plate(x, y, fillW, h * 0.36, tint(JUS.white), 0.35);
    if (bleeding) {
      const tail = Math.min(fillW - shear, h * 1.6);
      plate(x + fillW - tail, y, tail, h, tint(JUS.damned), 0.55 + 0.25 * Math.sin(t * 12));
    }
  }

  // Ticks every 20 style, so a reader can see how far off the next letter they are.
  g.lineStyle(1, 0x05070f, 0.65);
  for (let i = 1; i < 5; i++) {
    const tx = x + (w * i) / 5;
    g.lineBetween(tx + shear * (1 - (i / 5)) * 0, y, tx - shear, y + h);
  }
  g.lineStyle(1.5, tint(color), 0.75);
  g.beginPath();
  g.moveTo(x + shear, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w - shear, y + h);
  g.lineTo(x, y + h);
  g.closePath();
  g.strokePath();
}

// ── Vigilante Vengeance ───────────────────────────────────────────────────

/**
 * A body run through on the vengeance spear: the shaft going in one side and out the other,
 * the victim held on it, and the boot coming up behind. Drawn as one gesture so the impale
 * and the kick read as one motion rather than two effects that happened to overlap.
 *
 * `t` runs 0→1: the spear drives in over the first half and the boot lands on the second.
 */
export function impaleRig(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, angle: number, t: number,
  alpha = 1,
): void {
  const cx = Math.cos(angle), cy = Math.sin(angle);
  const drive = Math.min(1, t / 0.5);
  const kick = Math.max(0, (t - 0.5) / 0.5);

  // The shaft, running through the body.
  const back = -30 + drive * 10;
  const front = 4 + drive * 44;
  spearShape(g, tint, x + cx * back, y + cy * back, angle, front - back, alpha, 1);

  // The wound: a spray of light out of the far side, brightest at the moment it goes through.
  const burst = Math.max(0, 1 - Math.abs(drive - 0.85) * 5);
  if (burst > 0) {
    g.fillStyle(tint(JUS.white), alpha * burst * 0.8);
    g.fillCircle(x + cx * 26, y + cy * 26, 10 + burst * 8);
    for (let i = 0; i < 7; i++) {
      const a = angle + (i / 7 - 0.5) * 1.5;
      const d = 22 + burst * 30;
      g.lineStyle(2 * burst, tint(JUS.bright), alpha * burst);
      g.lineBetween(x + cx * 20, y + cy * 20, x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
  }

  // The boot, coming up the shaft from behind and driving them off it.
  if (kick > 0) {
    const bx = x - cx * (34 - kick * 40);
    const by = y - cy * (34 - kick * 40);
    g.fillStyle(tint(JUS.stoneDark), alpha);
    g.fillEllipse(bx, by, 22, 15);
    g.fillStyle(tint(JUS.gold), alpha * 0.9);
    g.fillEllipse(bx + cx * 5, by + cy * 5, 13, 10);
    // Impact lines behind it.
    for (let i = 0; i < 5; i++) {
      const a = angle + (i / 5 - 0.5) * 0.9;
      g.lineStyle(2 * (1 - kick), tint(JUS.pale), alpha * (1 - kick) * 0.8);
      g.lineBetween(bx, by, bx - Math.cos(a) * 26, by - Math.sin(a) * 26);
    }
  }
}

/**
 * One spear of the flight barrage, falling. Its own function rather than {@link spearShape}
 * because a falling spear is drawn point-down with a motion smear behind it and a lead shadow
 * on the floor — none of which the held one has.
 */
export function barrageSpear(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, angle: number, len: number,
  alpha = 1,
): void {
  const cx = Math.cos(angle), cy = Math.sin(angle);
  // Smear: three faint copies stacked back up the line of travel.
  for (let i = 3; i >= 1; i--) {
    g.lineStyle(1.6, tint(JUS.pale), alpha * 0.16 * (1 - i / 4));
    g.lineBetween(x - cx * i * len * 0.5, y - cy * i * len * 0.5,
      x - cx * (i - 1) * len * 0.5, y - cy * (i - 1) * len * 0.5);
  }
  spearShape(g, tint, x - cx * len, y - cy * len, angle, len, alpha, 0.8);
}

// ── Judgement Day ─────────────────────────────────────────────────────────

/**
 * The whole scale rig, in one place. Both the painter and the defendant's position read from
 * this — computing them separately is how a defendant ends up hanging in mid-air next to the
 * pan they are supposed to be sitting in.
 *
 * `t` runs 0→1 across the scene and `guilt` 0→1 with the damage on the record; the left pan
 * sinks with both.
 */
export interface JudgeRig {
  t: number; scale: number;
  gx: number; gy: number;
  fistX: number; fistY: number;
  bx: number; by: number;
  lx: number; ly: number;
  rx: number; ry: number;
  tilt: number;
  /** Where a body sitting in the left pan actually rests. */
  seat: { x: number; y: number };
}

export function judgeRig(o: { cx: number; bottom: number; t: number; guilt: number }): JudgeRig {
  const { cx, bottom, t, guilt } = o;
  const scale = 1 + t * 0.35;
  const gx = cx + 150;
  const gy = bottom + 40;
  const fistX = gx - 96 * scale;
  const fistY = gy - 220 * scale;
  // Guilt weighs: the more damage on the record, the further the left pan sinks.
  const tilt = Math.sin(t * Math.PI * 1.5) * 0.15 + t * guilt * 0.45;
  const beamLen = 92;
  const bx = fistX;
  const by = fistY + 34;
  const lx = bx - Math.cos(tilt) * beamLen;
  const ly = by - Math.sin(tilt) * beamLen;
  const rx = bx + Math.cos(tilt) * beamLen;
  const ry = by + Math.sin(tilt) * beamLen;
  return { t, scale, gx, gy, fistX, fistY, bx, by, lx, ly, rx, ry, tilt, seat: { x: lx, y: ly + 30 } };
}

/**
 * The courtroom: everything that is not the scale drops away, a laurel-crowned giant rises out
 * of the floor holding the scales out of one fist, and the defendant's pan is weighed against a
 * feather. The verdict itself is Text dropped by the caller — the placard here is its frame.
 */
export function drawJudgeScene(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  r: JudgeRig,
  o: {
    width: number; height: number;
    /** Arena top, for the placard. */
    top: number;
    cx: number;
    fade: number;
    /** Border colour of the placard — the caller decides whether this verdict is damnation. */
    placardColor: number;
  },
): void {
  const { width, height, top, cx, fade, placardColor } = o;
  const sc = r.scale;

  // Court dark: everything that is not the scale drops away.
  g.fillStyle(0x05040a, 0.62 * fade);
  g.fillRect(0, 0, width, height);

  // The judge, risen out of the floor to fill the right half of the arena.
  g.fillStyle(tint(JUS.umber), 0.92 * fade);
  g.fillEllipse(r.gx, r.gy - 120 * sc, 150 * sc, 250 * sc);
  g.fillStyle(tint(JUS.bronze), 0.75 * fade);
  g.fillEllipse(r.gx - 18 * sc, r.gy - 150 * sc, 96 * sc, 150 * sc);
  // Head + laurel.
  const hx = r.gx - 10 * sc;
  const hy = r.gy - 250 * sc;
  g.fillStyle(tint(JUS.umber), 0.95 * fade);
  g.fillCircle(hx, hy, 52 * sc);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI;
    g.fillStyle(tint(JUS.gold), 0.9 * fade);
    g.fillEllipse(hx + Math.cos(a) * 54 * sc, hy + Math.sin(a) * 40 * sc, 20 * sc, 9 * sc);
  }
  // Eyes, blazing.
  for (const side of [-1, 1]) {
    g.fillStyle(tint(JUS.pale), fade);
    g.fillCircle(hx + side * 18 * sc, hy - 8 * sc, 8 * sc);
    g.fillStyle(tint(JUS.gold), fade);
    g.fillCircle(hx + side * 18 * sc, hy - 8 * sc, 4 * sc);
  }

  // The scales, hanging out of the giant's fist.
  g.fillStyle(tint(JUS.gold), fade);
  g.fillCircle(r.fistX, r.fistY, 22 * sc);
  g.lineStyle(7 * sc, tint(JUS.gold), fade);
  g.lineBetween(r.fistX, r.fistY, r.bx, r.by);
  g.lineStyle(6 * sc, tint(JUS.bright), fade);
  g.lineBetween(r.lx, r.ly, r.rx, r.ry);
  g.fillStyle(tint(JUS.pale), fade);
  g.fillCircle(r.bx, r.by, 7 * sc);

  // Two pans on chains. The left one is where the defendant is sitting — its dish is drawn from
  // the same `seat` the victim is pinned to, so they never come apart.
  const pans: [number, number, number][] = [[r.lx, r.ly, -1], [r.rx, r.ry, 1]];
  for (const [px, py, dir] of pans) {
    chainRun(g, tint, px, py, px, py + 42, fade, 10, 2, 0);
    g.fillStyle(tint(JUS.gold), fade);
    g.fillEllipse(px, py + 46, 62, 15);
    g.fillStyle(tint(JUS.bronze), fade);
    g.fillEllipse(px, py + 50, 54, 11);
    if (dir > 0) {
      // A feather on the other pan — the thing being weighed against.
      g.fillStyle(tint(JUS.white), fade * 0.95);
      g.fillEllipse(px, py + 34, 12, 30);
      g.lineStyle(1.6, tint(JUS.stone), fade);
      g.lineBetween(px, py + 20, px, py + 48);
    }
  }

  // Verdict placard, once the beam has settled.
  if (r.t > 0.62) {
    const a = Math.min(1, (r.t - 0.62) / 0.15) * fade;
    g.fillStyle(tint(JUS.umber), 0.85 * a);
    g.fillRoundedRect(cx - 125, top + 62, 250, 54, 10);
    g.lineStyle(3, placardColor, a);
    g.strokeRoundedRect(cx - 125, top + 62, 250, 54, 10);
  }
}

/** One coliseum column: a fluted marble drum with a lit face and a capital. */
export function column(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, h: number, w: number, alpha = 1,
): void {
  const half = w / 2;
  g.fillStyle(tint(JUS.stoneDark), alpha);
  g.fillEllipse(x, y + 2, w * 1.25, w * 0.5);
  g.fillStyle(tint(JUS.stone), alpha);
  g.fillRect(x - half, y - h, w, h);
  g.fillStyle(tint(JUS.marble), alpha);
  g.fillRect(x - half, y - h, w * 0.45, h);
  // Flutes.
  g.lineStyle(1, tint(JUS.stoneDark), alpha * 0.55);
  g.lineBetween(x - half * 0.15, y - h + 3, x - half * 0.15, y - 3);
  g.lineBetween(x + half * 0.45, y - h + 3, x + half * 0.45, y - 3);
  // Capital + base.
  g.fillStyle(tint(JUS.marble), alpha);
  g.fillRect(x - half * 1.4, y - h - w * 0.42, w * 1.4, w * 0.42);
  g.fillRect(x - half * 1.3, y - w * 0.3, w * 1.3, w * 0.3);
  g.fillStyle(tint(JUS.gold), alpha * 0.5);
  g.fillRect(x - half * 1.4, y - h - w * 0.42, w * 1.4, w * 0.12);
}

/** A single feathered wing, rooted at the shoulder and swept back along `angle`. */
export function wing(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number,
  angle: number, span: number, side: number,
  alpha = 1,
  spread = 1,
): void {
  const feathers = 6;
  for (let i = 0; i < feathers; i++) {
    const f = i / (feathers - 1);
    const a = angle + side * (0.42 + f * 0.95 * spread);
    const len = span * (1 - f * 0.42) * (0.72 + spread * 0.34);
    const tipX = x + Math.cos(a) * len;
    const tipY = y + Math.sin(a) * len;
    const w = span * 0.13 * (1 - f * 0.35);
    const px = -Math.sin(a), py = Math.cos(a);
    g.fillStyle(tint(i % 2 === 0 ? JUS.pale : JUS.marble), alpha * (0.9 - f * 0.2));
    g.fillTriangle(
      x + px * w, y + py * w,
      x - px * w, y - py * w,
      tipX, tipY,
    );
    g.fillCircle(tipX, tipY, w * 0.5);
  }
  // Leading edge, so the wing has a shoulder instead of fanning from a point.
  g.lineStyle(2.4, tint(JUS.gold), alpha * 0.8);
  g.lineBetween(x, y, x + Math.cos(angle + side * 0.42) * span * 0.75, y + Math.sin(angle + side * 0.42) * span * 0.75);
}

/** A seraph eye — lidded almond, iris, and a hard pinprick pupil. */
export function seraphEye(
  g: Phaser.GameObjects.Graphics,
  tint: JusticeColorFn,
  x: number, y: number, r: number, look: number, alpha = 1, open = 1,
): void {
  g.fillStyle(tint(JUS.white), alpha * 0.96);
  g.fillEllipse(x, y, r * 2, r * 2 * open);
  g.fillStyle(tint(JUS.gold), alpha);
  g.fillCircle(x + Math.cos(look) * r * 0.32, y + Math.sin(look) * r * 0.32 * open, r * 0.55 * Math.max(open, 0.15));
  g.fillStyle(tint(JUS.umber), alpha);
  g.fillCircle(x + Math.cos(look) * r * 0.45, y + Math.sin(look) * r * 0.45 * open, r * 0.24 * Math.max(open, 0.15));
  g.lineStyle(r * 0.16, tint(JUS.bronze), alpha * 0.8);
  g.strokeEllipse(x, y, r * 2, r * 2 * open);
}

/** Rising tongue of flame for the pillar — narrow, licking, and always pointed up. */
export function flameLick(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, len: number, halfW: number, lean: number,
): void {
  g.beginPath();
  g.moveTo(cx - halfW, cy);
  g.lineTo(cx - halfW * 0.55 + lean * 0.4, cy - len * 0.55);
  g.lineTo(cx + lean, cy - len);
  g.lineTo(cx + halfW * 0.55 + lean * 0.4, cy - len * 0.55);
  g.lineTo(cx + halfW, cy);
  g.closePath();
  g.fillPath();
  g.fillCircle(cx, cy, halfW * 0.9);
}

// ── JusticeFx ─────────────────────────────────────────────────────────────

/** One-shot Justice effects. One per owner so a skin recolours the right side. */
export class JusticeFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: JusticeColorFn = (c) => c) {
    super(scene, tint);
  }

  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, JUS.white, JUS.pale, depth);
  }

  /** Expanding gilt ring — the punctuation on every Justice impact. */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration = 420, width = 4, depth = 6): void {
    const c = this.tint(color);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t)), c, 0.9 * (1 - t * t));
      g.strokeCircle(x, y, r);
      g.lineStyle(Math.max(0.4, width * 0.4 * (1 - t)), this.tint(JUS.pale), 0.7 * (1 - t));
      g.strokeCircle(x, y, r * 0.86);
    });
  }

  /** Gold motes drifting up — the ambient tell that something was sanctified. */
  motes(x: number, y: number, count: number, spread = 26, life = 700, depth = 6): void {
    const seeds = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * spread,
      oy: (Math.random() - 0.5) * spread * 0.6,
      rise: 16 + Math.random() * 26,
      r: 1.3 + Math.random() * 2.2,
      ph: Math.random() * TAU,
    }));
    this.anim(depth, life, (g, t) => {
      for (const s of seeds) {
        const a = (1 - t) * 0.9;
        const px = x + s.ox + Math.sin(s.ph + t * 6) * 3;
        const py = y + s.oy - s.rise * easeOut(t);
        g.fillStyle(this.tint(JUS.bright), a);
        g.fillCircle(px, py, s.r * (1 - t * 0.5));
        g.fillStyle(this.tint(JUS.pale), a * 0.8);
        g.fillCircle(px, py, s.r * 0.4);
      }
    });
  }

  /** A spear driven in and pulled back out, drawn along the aim. */
  thrust(x: number, y: number, angle: number, reach: number, depth = 7): void {
    this.anim(depth, 260, (g, t) => {
      // Out fast, back slow — a stab, not a swing.
      const p = t < 0.35 ? easeOut(t / 0.35) : 1 - easeIn((t - 0.35) / 0.65);
      const back = 12;
      const bx = x + Math.cos(angle) * (back + reach * p * 0.25);
      const by = y + Math.sin(angle) * (back + reach * p * 0.25);
      spearShape(g, this.tint, bx, by, angle, reach * (0.55 + p * 0.45), 0.6 + p * 0.4);
      // Air torn along the line of the point.
      const tipD = back + reach * p;
      g.lineStyle(3 * (1 - t), this.tint(JUS.pale), 0.5 * (1 - t));
      g.lineBetween(
        x + Math.cos(angle) * (tipD - 22), y + Math.sin(angle) * (tipD - 22),
        x + Math.cos(angle) * tipD, y + Math.sin(angle) * tipD,
      );
    });
  }

  /**
   * An axe chopped down through the aim. Much faster than {@link thrust} and swung on an arc
   * rather than punched along a line — Death from Above is a rhythm, and the eye has to be able
   * to tell one swing from the next at ten a second.
   */
  axeChop(x: number, y: number, angle: number, reach: number, depth = 7): void {
    // Over the top: starts a quarter turn back, lands a little past the aim.
    const from = angle - 1.15, to = angle + 0.34;
    this.anim(depth, 140, (g, t) => {
      const p = easeOut(t);
      const a = from + (to - from) * p;
      const d = reach * (0.45 + p * 0.55);
      axeShape(g, this.tint, x + Math.cos(a) * 8, y + Math.sin(a) * 8, a, d, 1 - t * 0.25, 0.95);
      // Arc of torn air behind the bit.
      g.lineStyle(4 * (1 - t), this.tint(JUS.pale), 0.55 * (1 - t));
      g.beginPath();
      g.arc(x, y, reach * 0.92, from, a);
      g.strokePath();
    });
  }

  /**
   * The execution: a blade of holy light comes down through a body, the two halves slide
   * apart, and both of them go off. Deliberately the loudest thing in the kit — it is the one
   * effect that means somebody's match just ended.
   */
  execution(x: number, y: number, angle: number, depth = 13): void {
    const px = -Math.sin(angle), py = Math.cos(angle);
    const seeds = Array.from({ length: 18 }, () => {
      const a = Math.random() * TAU;
      return { a, v: 120 + Math.random() * 260, r: 1.6 + Math.random() * 3.4, side: Math.random() < 0.5 ? -1 : 1 };
    });
    this.anim(depth, 720, (g, t) => {
      // ── The cut, first 25% ──
      if (t < 0.3) {
        const c = Math.min(1, t / 0.18);
        const len = 240 * c;
        const w = 9 * (1 - t / 0.3) + 2;
        g.lineStyle(w * 2.4, this.tint(JUS.bright), 0.35 * (1 - t / 0.3));
        g.lineBetween(x - px * len, y - py * len, x + px * len, y + py * len);
        g.lineStyle(w, this.tint(JUS.white), 0.95 * (1 - t / 0.3));
        g.lineBetween(x - px * len, y - py * len, x + px * len, y + py * len);
      }

      // ── The halves, sliding apart and coming open ──
      const slide = easeOut(Math.min(1, t / 0.55)) * 30;
      const open = Math.min(1, t / 0.55);
      for (const side of [-1, 1]) {
        const hx = x + Math.cos(angle) * side * slide;
        const hy = y + Math.sin(angle) * side * slide;
        const a = (1 - open) * 0.9;
        if (a > 0.02) {
          // A half-disc: the body, cut along the blade and pulled off its own centre line.
          g.fillStyle(0x0d0b16, a);
          g.beginPath();
          g.arc(hx, hy, 17, angle + (side > 0 ? -Math.PI / 2 : Math.PI / 2), angle + (side > 0 ? Math.PI / 2 : Math.PI * 1.5));
          g.closePath();
          g.fillPath();
          // The cut face glows — that is what the light got into.
          g.lineStyle(3, this.tint(JUS.pale), a);
          g.lineBetween(hx - px * 17, hy - py * 17, hx + px * 17, hy + py * 17);
        }
      }

      // ── Both halves go off ──
      if (t > 0.42) {
        const b = (t - 0.42) / 0.58;
        for (const side of [-1, 1]) {
          const hx = x + Math.cos(angle) * side * 30;
          const hy = y + Math.sin(angle) * side * 30;
          g.fillStyle(this.tint(JUS.white), 0.55 * (1 - b));
          g.fillCircle(hx, hy, 10 + 46 * easeOut(b));
          g.lineStyle(5 * (1 - b), this.tint(JUS.gold), 0.85 * (1 - b));
          g.strokeCircle(hx, hy, 14 + 66 * easeOut(b));
        }
        for (const s of seeds) {
          const hx = x + Math.cos(angle) * s.side * 30;
          const hy = y + Math.sin(angle) * s.side * 30;
          const d = s.v * 0.62 * easeOut(b);
          g.fillStyle(this.tint(b < 0.4 ? JUS.white : JUS.bright), 0.9 * (1 - b));
          g.fillCircle(hx + Math.cos(s.a) * d, hy + Math.sin(s.a) * d + b * b * 40, s.r * (1 - b * 0.6));
        }
      }

      // ── The pillar of light it all happened inside ──
      const beam = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      g.fillStyle(this.tint(JUS.pale), 0.16 * beam);
      g.fillRect(x - 34, y - 400, 68, 800);
      g.fillStyle(this.tint(JUS.white), 0.3 * beam);
      g.fillRect(x - 11, y - 400, 22, 800);
    });
  }

  /** Gilt shards thrown out of an impact. */
  shards(x: number, y: number, count: number, speed = 150, life = 520, depth = 6): void {
    const seeds = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return { a, v: speed * (0.5 + Math.random()), len: 5 + Math.random() * 9, w: 1 + Math.random() * 1.6 };
    });
    this.anim(depth, life, (g, t) => {
      for (const s of seeds) {
        const d = s.v * (life / 1000) * easeOut(t);
        const px = x + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d;
        const ex = px + Math.cos(s.a) * s.len * (1 - t);
        const ey = py + Math.sin(s.a) * s.len * (1 - t);
        g.lineStyle(s.w * (1 - t * 0.6), this.tint(t < 0.4 ? JUS.pale : JUS.gold), 0.9 * (1 - t));
        g.lineBetween(px, py, ex, ey);
      }
    });
  }

  /** Chunks of masonry knocked loose — used when a wall is ripped out or lands. */
  rubble(x: number, y: number, count: number, spread: number, depth = 6): void {
    const seeds = Array.from({ length: count }, () => {
      const a = Math.random() * TAU;
      return {
        a, v: 60 + Math.random() * 190, r: 2.5 + Math.random() * 5.5,
        spin: (Math.random() - 0.5) * 9, ox: (Math.random() - 0.5) * spread,
      };
    });
    this.anim(depth, 760, (g, t) => {
      for (const s of seeds) {
        const d = s.v * 0.76 * easeOut(t);
        const px = x + s.ox + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d + t * t * 90;
        const r = s.r * (1 - t * 0.35);
        const rot = s.spin * t;
        g.fillStyle(this.tint(JUS.stoneDark), (1 - t) * 0.9);
        g.fillTriangle(
          px + Math.cos(rot) * r, py + Math.sin(rot) * r,
          px + Math.cos(rot + 2.2) * r, py + Math.sin(rot + 2.2) * r,
          px + Math.cos(rot + 4.3) * r * 0.8, py + Math.sin(rot + 4.3) * r * 0.8,
        );
        g.fillStyle(this.tint(JUS.stone), (1 - t) * 0.8);
        g.fillCircle(px, py, r * 0.45);
      }
    });
  }

  /** A shaft of light dropped straight down onto a point — the verdict landing. */
  verdictBeam(x: number, y: number, color: number, height: number, duration = 900, depth = 8): void {
    const c = this.tint(color);
    this.anim(depth, duration, (g, t) => {
      const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      const w = 26 + Math.sin(t * 22) * 3;
      g.fillStyle(c, a * 0.16);
      g.fillRect(x - w, y - height, w * 2, height);
      g.fillStyle(c, a * 0.3);
      g.fillRect(x - w * 0.5, y - height, w, height);
      g.fillStyle(this.tint(JUS.white), a * 0.55);
      g.fillRect(x - w * 0.16, y - height, w * 0.32, height);
      g.fillStyle(c, a * 0.35);
      g.fillEllipse(x, y, w * 3.2, w * 0.9);
    });
  }

  /** Chains bursting off a body when a bind expires or is broken. */
  chainBurst(x: number, y: number, depth = 7): void {
    const seeds = Array.from({ length: 7 }, () => {
      const a = Math.random() * TAU;
      return { a, v: 90 + Math.random() * 150, len: 14 + Math.random() * 16 };
    });
    this.anim(depth, 620, (g, t) => {
      for (const s of seeds) {
        const d = s.v * 0.62 * easeOut(t);
        const px = x + Math.cos(s.a) * d;
        const py = y + Math.sin(s.a) * d + t * t * 60;
        chainRun(
          g, this.tint, px, py,
          px + Math.cos(s.a) * s.len, py + Math.sin(s.a) * s.len,
          (1 - t) * 0.95, 7, 1.7,
        );
      }
    });
  }
}

// ── ColiseumRing ──────────────────────────────────────────────────────────

/** The persistent ring of columns raised by E. Driven per-frame by JusticeKit. */
export class ColiseumRing {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private cols: { a: number; h: number; phase: number }[];

  constructor(
    scene: Phaser.Scene,
    private tint: JusticeColorFn,
    private radius: number,
    count = 18,
    depth = 2,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.cols = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * TAU,
      h: 30 + Math.random() * 8,
      phase: Math.random() * TAU,
    }));
  }

  /** `rise` 0→1 while the ring is coming out of the floor, `fade` 0→1 while it sinks. */
  update(delta: number, cx: number, cy: number, rise: number, fade: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    const alpha = Math.min(rise, 1 - fade);
    if (alpha <= 0.02) return;

    // Sand floor inside the ring, so the arena reads as an arena.
    g.fillStyle(this.tint(JUS.bronze), alpha * 0.12);
    g.fillCircle(cx, cy, this.radius);
    g.lineStyle(3, this.tint(JUS.gold), alpha * 0.55);
    g.strokeCircle(cx, cy, this.radius);
    // Barrier shimmer — the ring is a wall, and it has to look like one.
    g.lineStyle(9, this.tint(JUS.bright), alpha * (0.1 + 0.06 * Math.sin(this.t * 4)));
    g.strokeCircle(cx, cy, this.radius);

    // Columns, sorted so the far side draws first and the near side overlaps it.
    const sorted = [...this.cols].sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    for (const c of sorted) {
      const x = cx + Math.cos(c.a) * this.radius;
      const y = cy + Math.sin(c.a) * this.radius * 0.94;
      const h = c.h * rise * (1 - fade) * (1 + Math.sin(this.t * 2 + c.phase) * 0.02);
      column(this.g, this.tint, x, y, h, 9, alpha);
    }
  }

  destroy(): void { this.g.destroy(); }
}

// ── FlamePillar ───────────────────────────────────────────────────────────

/** The vertical wall of fire from the flight R. */
export class FlamePillar {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private licks: { y: number; ox: number; speed: number; scale: number; phase: number }[];

  constructor(
    scene: Phaser.Scene,
    private tint: JusticeColorFn,
    private halfWidth: number,
    private top: number,
    private bottom: number,
    depth = 4,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    const rows = Math.max(8, Math.round((bottom - top) / 22));
    this.licks = Array.from({ length: rows * 3 }, (_, i) => ({
      y: top + ((i % rows) / rows) * (bottom - top) + Math.random() * 14,
      ox: (Math.random() - 0.5) * halfWidth * 1.5,
      speed: 2.5 + Math.random() * 3.5,
      scale: 0.55 + Math.random() * 0.8,
      phase: Math.random() * TAU,
    }));
  }

  update(delta: number, x: number, alpha: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const h = this.bottom - this.top;
    // Body of the wall: a hot column with a cooler haze either side of it.
    g.fillStyle(this.tint(JUS.flameDeep), alpha * 0.3);
    g.fillRect(x - this.halfWidth * 1.5, this.top, this.halfWidth * 3, h);
    g.fillStyle(this.tint(JUS.flame), alpha * 0.4);
    g.fillRect(x - this.halfWidth, this.top, this.halfWidth * 2, h);
    g.fillStyle(this.tint(JUS.flameCore), alpha * 0.35);
    g.fillRect(x - this.halfWidth * 0.35, this.top, this.halfWidth * 0.7, h);

    for (const l of this.licks) {
      const wob = Math.sin(this.t * l.speed + l.phase);
      const len = (26 + wob * 12) * l.scale;
      const cx = x + l.ox * (0.7 + wob * 0.3);
      // Licks climb the pillar and wrap, so the wall is always moving upward.
      const cy = this.bottom - (((this.t * 70 * l.speed * 0.2 + (this.bottom - l.y)) % h));
      g.fillStyle(this.tint(JUS.flameDeep), alpha * 0.5);
      flameLick(g, cx, cy, len, 5.5 * l.scale, wob * 5);
      g.fillStyle(this.tint(JUS.flame), alpha * 0.75);
      flameLick(g, cx, cy, len * 0.72, 3.6 * l.scale, wob * 4);
      g.fillStyle(this.tint(JUS.flameCore), alpha * 0.9);
      flameLick(g, cx, cy, len * 0.4, 1.8 * l.scale, wob * 2);
    }

    // Scorched edges, so the pillar has a footprint rather than floating.
    g.fillStyle(this.tint(JUS.flameDeep), alpha * 0.4);
    g.fillEllipse(x, this.bottom, this.halfWidth * 4, 12);
    g.fillEllipse(x, this.top, this.halfWidth * 3.4, 10);
  }

  destroy(): void { this.g.destroy(); }
}

// ── JusticeAvatar ─────────────────────────────────────────────────────────

const JUSTICE_AVATAR: AvatarSpec = {
  hands: [
    { r: 9.5, color: JUS.gold, alpha: 0.24 },
    { r: 6.6, color: JUS.bright, alpha: 0.92 },
    { r: 3.6, color: JUS.pale, alpha: 1 },
    { r: 1.5, color: JUS.white, alpha: 0.95, ox: -1, oy: -1 },
  ],
  eyeWhite: JUS.pale,
  eyePupil: 0x241a08,
  squash: { div: 15, x: 0.44, y: 0.24 },
};

/**
 * The Justice character: a laurel-crowned magistrate on the ground, a winged valkyrie in
 * the air, and blue-eyed with a hard afterimage while Sheer Will is burning.
 *
 * The three tells are deliberately different *kinds* of change — silhouette (wings),
 * colour (blue eyes and aura) and motion (the afterimage) — so any two can be read at once.
 */
export class JusticeAvatar extends BaseAvatar {
  private flying = 0;
  private flyTarget = 0;
  private will = 0;
  private willTarget = 0;
  /** Recent body positions, for the Sheer Will afterimage. */
  private trail: { x: number; y: number }[] = [];
  private trailAccumMs = 0;

  constructor(scene: Phaser.Scene, tint: JusticeColorFn, depth = 6) {
    super(scene, tint, depth, JUSTICE_AVATAR);
  }

  /** Wings out / wings in. Eased so the transform reads as a movement, not a swap. */
  setFlying(on: boolean): void { this.flyTarget = on ? 1 : 0; }
  /** Sheer Will's blue. */
  setWilling(on: boolean): void {
    this.willTarget = on ? 1 : 0;
    this.setEyeWhite(on ? JUS.willPale : JUS.pale);
  }

  update(delta: number, x: number, y: number, alpha: number): void {
    const k = Math.min(1, delta / 160);
    this.flying += (this.flyTarget - this.flying) * k;
    this.will += (this.willTarget - this.will) * k;

    // Afterimage samples — kept even when Sheer Will is off so switching it on has history.
    this.trailAccumMs += delta;
    if (this.trailAccumMs >= 40) {
      this.trailAccumMs = 0;
      this.trail.unshift({ x, y });
      if (this.trail.length > 6) this.trail.pop();
    }

    super.update(delta, x, y, alpha);
  }

  protected applyMastery(on: boolean): void {
    this.forEachHandLayer(0, (glow) => {
      glow.setRadius(on ? 13 : 9.5);
      glow.setFillStyle(this.tint(on ? JUS.bright : JUS.gold), on ? 0.34 : 0.24);
    });
  }

  protected emitTrail(x: number, y: number): void {
    // Hands shed gold dust; blue while the will is burning.
    new JusticeFx(this.scene, this.tint).motes(x, y, 1, 6, this.will > 0.5 ? 520 : 420, 5);
  }

  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    // Sheer Will's afterimage sits under the body so the live sprite always reads first.
    if (this.will > 0.05) {
      for (let i = this.trail.length - 1; i >= 1; i--) {
        const p = this.trail[i];
        const f = 1 - i / this.trail.length;
        g.fillStyle(this.tint(JUS.will), alpha * this.will * f * 0.3);
        g.fillCircle(p.x, p.y, 21 - i);
      }
    }
    // Ground halo — gold, tinted toward blue with the will.
    g.fillStyle(this.tint(this.will > 0.5 ? JUS.will : JUS.gold), a * (0.22 + this.will * 0.16));
    g.fillCircle(x, y, 27 + this.will * 5);
    // Airborne: the shadow drops away and a lift-glow builds underneath.
    if (this.flying > 0.05) {
      g.fillStyle(this.tint(JUS.willPale), a * 0.2 * this.flying);
      g.fillEllipse(x, y + 20 + this.flying * 10, 46 * this.flying, 12 * this.flying);
    }
  }

  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const bob = Math.sin(this.t * 3.2) * (1 + this.flying * 2.5);

    // Wings — the flight silhouette, beating faster the higher the intensity.
    if (this.flying > 0.02) {
      const beat = Math.sin(this.t * 7.5) * 0.28;
      const span = 34 * this.flying;
      wing(g, this.tint, x - 7, y - 6 + bob, Math.PI, span, -1, alpha * this.flying, 1 + beat);
      wing(g, this.tint, x + 7, y - 6 + bob, 0, span, 1, alpha * this.flying, 1 + beat);
    }

    // Laurel crown — six leaves swept back off the brow. The ground-stance tell.
    const crownY = y - 19 + bob * 0.4;
    const laurel = 1 - this.flying * 0.45;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const ang = s * (0.55 + i * 0.42) - Math.PI / 2;
        const len = (9 - i * 1.6) * laurel;
        const lx = x + Math.cos(ang) * 11 * laurel;
        const ly = crownY + Math.sin(ang) * 6 * laurel;
        g.fillStyle(this.tint(JUS.gold), alpha * 0.9);
        g.fillEllipse(lx, ly, len, len * 0.5);
        g.fillStyle(this.tint(JUS.bright), alpha * 0.7);
        g.fillEllipse(lx, ly - 0.6, len * 0.6, len * 0.3);
      }
    }
    g.fillStyle(this.tint(this.will > 0.5 ? JUS.willPale : JUS.pale), alpha * 0.95);
    g.fillCircle(x, crownY - 2, 2.2 + this.will * 0.8);

    // The spear, carried across the back in the off-hand — Justice is never unarmed.
    const carry = this.facing + Math.PI * 0.62;
    spearShape(
      g, this.tint,
      x + Math.cos(carry) * 20, y + Math.sin(carry) * 20 + bob,
      carry + Math.PI, 44, alpha * 0.9, 0.85,
    );

    // Mastery: a second, higher laurel ring turning slowly overhead.
    if (this.mastered) {
      for (let i = 0; i < 5; i++) {
        const p = this.t * 1.1 + (i / 5) * TAU;
        const cx = x + Math.cos(p) * 20;
        const cy = y - 30 + Math.sin(p) * 6;
        g.fillStyle(this.tint(JUS.gold), alpha * 0.55);
        g.fillEllipse(cx, cy, 7, 3.2);
        g.fillStyle(this.tint(JUS.pale), alpha * 0.9);
        g.fillCircle(cx, cy, 1.3);
      }
    }
  }
}

// ── SeraphForm ────────────────────────────────────────────────────────────

/**
 * The Q set piece: white ribbons wound around a core packed with eyes. Persistent because
 * it holds for three seconds and has to keep moving the whole time.
 */
export class SeraphForm {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private ribbons: { phase: number; len: number; w: number; speed: number; lean: number }[];
  private eyes: { a: number; d: number; r: number; blink: number }[];

  constructor(scene: Phaser.Scene, private tint: JusticeColorFn, depth = 12) {
    this.g = scene.add.graphics().setDepth(depth);
    this.ribbons = Array.from({ length: 11 }, (_, i) => ({
      phase: (i / 11) * TAU,
      len: 70 + Math.random() * 55,
      w: 5 + Math.random() * 5,
      speed: 0.7 + Math.random() * 0.9,
      lean: (Math.random() - 0.5) * 1.4,
    }));
    this.eyes = Array.from({ length: 13 }, () => {
      const a = Math.random() * TAU;
      return { a, d: Math.random() * 26, r: 3.4 + Math.random() * 4.4, blink: Math.random() * TAU };
    });
  }

  update(delta: number, x: number, y: number, grow: number, look: number): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (grow <= 0.02) return;

    const s = easeOut(Math.min(1, grow));

    // Halo behind everything.
    g.fillStyle(this.tint(JUS.pale), 0.18 * s);
    g.fillCircle(x, y, 92 * s);
    g.lineStyle(3, this.tint(JUS.gold), 0.55 * s);
    g.strokeCircle(x, y, 74 * s);

    // Ribbons — long tapered bands turning around the core. Drawn as a chain of
    // narrowing segments so each one keeps its width along a curve.
    for (const r of this.ribbons) {
      const base = r.phase + this.t * r.speed;
      const segs = 9;
      let px = x + Math.cos(base) * 20 * s;
      let py = y + Math.sin(base) * 20 * s;
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        const a = base + r.lean * f + Math.sin(this.t * 2.4 + r.phase + f * 3) * 0.35;
        const step = (r.len * s) / segs;
        const nx = px + Math.cos(a) * step;
        const ny = py + Math.sin(a) * step;
        g.lineStyle(r.w * s * (1 - f * 0.8), this.tint(i % 2 === 0 ? JUS.white : JUS.marble), (0.85 - f * 0.5) * s);
        g.lineBetween(px, py, nx, ny);
        px = nx; py = ny;
      }
    }

    // Core — a dark mass, so the eyes have something to sit in.
    g.fillStyle(this.tint(JUS.umber), 0.9 * s);
    g.fillCircle(x, y, 34 * s);
    g.fillStyle(this.tint(JUS.bronze), 0.55 * s);
    g.fillCircle(x - 6 * s, y - 8 * s, 20 * s);

    for (const e of this.eyes) {
      const ex = x + Math.cos(e.a + this.t * 0.3) * e.d * s;
      const ey = y + Math.sin(e.a + this.t * 0.3) * e.d * s;
      // Every eye blinks on its own clock — a synchronised mass reads as a pattern.
      const open = 0.25 + 0.75 * Math.abs(Math.sin(this.t * 1.7 + e.blink));
      seraphEye(g, this.tint, ex, ey, e.r * s, look, s, open);
    }
  }

  destroy(): void { this.g.destroy(); }
}
