import Phaser from 'phaser';
import type { Pt } from '../../../../IslesTypes';
import { dim, lit, mixC, shadow, type G } from '../../../../art/IsleArt';

/**
 * The Confection Court's own drawing hand — shared by the sugar-town painter, the five fights,
 * the Weighing Floor and Prince Saccharo. Everything here is baked, boiled, pulled or spun:
 * gingerbread with piped icing, candy-cane stripes that twist, sugar cubes that catch the light,
 * caramel that runs and then sets, and — under all of it — grey rock salt, the colour of the
 * people who make the sugar. The colours live here once, so a cube on the mill floor and a cube
 * in a fight are the same cube.
 */

// ── Palette ──────────────────────────────────────────────────────────

/** Baked gingerbread, its dark crust, and the pale underside. */
export const GINGER = 0xb46a32;
export const GINGER_DARK = 0x6e3a18;
export const GINGER_PALE = 0xd8975a;
/** Royal icing — piped white, faintly blue in shade. */
export const ICING = 0xfdf8f2;
export const ICING_SHADE = 0xd8dcea;
/** Candy pink (cane stripes, floss), mint, lemon, grape, cherry. */
export const PINK = 0xf27aa8;
export const PINK_PALE = 0xfbc4da;
export const MINT = 0x6fd8b2;
export const MINT_DARK = 0x2f9a78;
export const LEMON = 0xf6dc5a;
export const GRAPE = 0x9a6ad0;
export const CHERRY = 0xe0283c;
/** Caramel: poured gold, the dark of a burnt kettle, and set brittle. */
export const CARAMEL = 0xd8892a;
export const CARAMEL_DARK = 0x8a4a12;
export const BRITTLE = 0xf0c66a;
/** Syrup — the rivers — deep amber, lit amber, and the foam where it runs fast. */
export const SYRUP = 0x9a4a10;
export const SYRUP_DEEP = 0x5e2806;
export const SYRUP_LIT = 0xe2902e;
/** Licorice black, and the chocolate brown of the palace. */
export const LICORICE = 0x221a1e;
export const CHOCOLATE = 0x5a321e;
/** Granulated sugar on the ground, and cane in the fields. */
export const SUGAR = 0xf4efe6;
export const CANE = 0x8ab84a;
export const CANE_DARK = 0x4e7a2a;
/** The Saltcellar: grey rock salt, the brine-stain under it. */
export const SALT = 0xb8b8b0;
export const SALT_DARK = 0x6e6e68;
export const SALT_LIT = 0xe4e4dc;
/** The Empress's verdigris green, on every tithe board in Thornwild. */
export const VERDIGRA = 0x3f9a7c;
export const VERDIGRA_DARK = 0x1e5a46;
/** Saccharo's spun sugar and the sugar-glass of his palace. */
export const FLOSS = 0xffb8de;
export const GLASS = 0xe8f4ff;
export const BRASS = 0xc9a24a;
export const IRON = 0x4a4650;
/** Ground: a pale sugary sandy earth, and trodden crumb. */
export const CRUMB = 0xe8c898;
export const CRUMB_DARK = 0xb8905a;

/** Ownership tints used by the fights — the player's things vs the foe's. */
export const PLAYER_TINT = 0x6fc6ff;
export const FOE_TINT = 0xff7a4a;

/** The candy-colour wheel stalls, bunting and sweets cycle through. */
export const SWEETS = [PINK, MINT, LEMON, GRAPE, CHERRY, 0x6ab8f0];

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** Distance from a point to a segment. */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Which side of the line AB the point is on (+1 / -1). */
export const sideOf = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number =>
  ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) >= 0 ? 1 : -1;

/** Stroke a polyline (thin things). */
export function polyline(g: G, pts: Pt[], w: number, color: number, a = 1): void {
  if (pts.length < 2) return;
  g.lineStyle(w, color, a);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** A quadratic curve from a through control c to b, as points. */
export function quad(a: Pt, c: Pt, b: Pt, n = 14): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y });
  }
  return pts;
}

// ── Stripes and twists ───────────────────────────────────────────────

/**
 * A striped stick along a polyline — a candy cane, a barber's twist of taffy. The base colour
 * runs underneath; the stripe colour is laid as short diagonal bands every `pitch` px, all
 * leaning the same way so the twist reads. `phase` slides the stripes (animated twists).
 */
export function twist(g: G, pts: Pt[], w: number, base: number, stripe: number, a = 1, pitch = 10, phase = 0): void {
  if (pts.length < 2) return;
  polyline(g, pts, w + 2, dim(base, 0.45), a);
  polyline(g, pts, w, base, a);
  g.lineStyle(Math.max(1.4, w * 0.42), stripe, a);
  let carry = phase % pitch;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < 0.5) continue;
    const ux = (q.x - p.x) / len, uy = (q.y - p.y) / len;
    const nx = -uy, ny = ux;
    for (let d = carry; d < len; d += pitch) {
      const cx = p.x + ux * d, cy = p.y + uy * d;
      g.lineBetween(cx - nx * w * 0.45 - ux * w * 0.3, cy - ny * w * 0.45 - uy * w * 0.3, cx + nx * w * 0.45 + ux * w * 0.3, cy + ny * w * 0.45 + uy * w * 0.3);
    }
    carry = (carry - len) % pitch; if (carry < 0) carry += pitch;
  }
  g.lineStyle(Math.max(0.8, w * 0.18), 0xffffff, a * 0.55);
  g.beginPath(); g.moveTo(pts[0].x - 0.5, pts[0].y - w * 0.22);
  for (const p of pts) g.lineTo(p.x - 0.5, p.y - w * 0.22);
  g.strokePath();
}

/** A candy cane standing in the ground, hook at the top. `dir` turns the hook right (1) or left (-1). */
export function candyCane(g: G, x: number, y: number, h: number, dir: 1 | -1 = 1, stripe = CHERRY, w = 7): void {
  shadow(g, x, y + 1, w * 2.6, w * 0.8, 0.28);
  twist(g, canePath(x, y, h, dir, w), w, ICING, stripe, 1, w * 1.5);
}

/** The cane's path: a straight shaft, a half-circle hook over the top, and a short tail. */
export function canePath(x: number, y: number, h: number, dir: 1 | -1, w: number): Pt[] {
  const r = w * 1.6;
  const top = y - h + r;
  const cx = x + dir * r;
  const pts: Pt[] = [{ x, y }, { x, y: top }];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const a = dir > 0 ? Math.PI + t * Math.PI : -t * Math.PI;
    pts.push({ x: cx + Math.cos(a) * r, y: top + Math.sin(a) * r });
  }
  pts.push({ x: cx + dir * r, y: top + r * 0.6 });
  return pts;
}

/** A candy-cane fence: a row of canes joined by a twisted rail. */
export function caneFence(g: G, a: Pt, b: Pt, h = 34, gap = 30, stripe = CHERRY): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.round(len / gap));
  twist(g, [{ x: a.x, y: a.y - h * 0.45 }, { x: b.x, y: b.y - h * 0.45 }], 4, ICING, MINT, 1, 7);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    candyCane(g, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, h, i % 2 ? 1 : -1, stripe, 4.5);
  }
}

// ── Icing ────────────────────────────────────────────────────────────

/** A piped icing line: a soft bead with a highlight and little scallops. */
export function piping(g: G, pts: Pt[], w = 3, color = ICING, a = 1): void {
  polyline(g, pts.map((p) => ({ x: p.x, y: p.y + 1 })), w + 1.5, dim(color, 0.3), a * 0.5);
  polyline(g, pts, w, color, a);
  g.fillStyle(color, a);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    for (let d = 0; d < len; d += w * 2.2) {
      const k = d / Math.max(1, len);
      g.fillCircle(p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k, w * 0.75);
    }
  }
  polyline(g, pts.map((p) => ({ x: p.x - 0.5, y: p.y - w * 0.3 })), Math.max(0.8, w * 0.3), 0xffffff, a * 0.7);
}

/** A row of icing drips hanging off an edge (eaves, a cake tier). */
export function drips(g: G, x0: number, x1: number, y: number, len: number, rng: () => number, color = ICING, a = 1): void {
  g.fillStyle(color, a); g.fillRect(x0, y - 3, x1 - x0, 5);
  for (let x = x0 + 3; x < x1 - 3; x += 7 + rng() * 6) {
    const l = len * (0.35 + rng() * 0.75);
    g.fillRoundedRect(x - 2.2, y, 4.4, l, 2.2);
    g.fillCircle(x, y + l, 2.8);
  }
  g.fillStyle(0xffffff, a * 0.6); g.fillRect(x0, y - 3, x1 - x0, 1.5);
}

/** A piped icing rosette — a swirl of five petals with a dot. */
export function rosette(g: G, x: number, y: number, r: number, color = ICING, a = 1): void {
  g.fillStyle(dim(color, 0.3), a * 0.6); g.fillCircle(x + 1, y + 1.5, r * 1.05);
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    g.fillStyle(i % 2 ? color : lit(color, 0.15), a);
    g.fillCircle(x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.5, r * 0.55);
  }
  g.fillStyle(lit(color, 0.4), a); g.fillCircle(x - r * 0.15, y - r * 0.2, r * 0.3);
}

// ── Sweets ───────────────────────────────────────────────────────────

/**
 * A sugar cube seen three-quarters: lit top face, two side faces, a grainy crystal sparkle.
 * `s` is the half-width. Used on the mill floor, the Sweet-Tax scales and in Sugar Rush.
 */
export function sugarCube(g: G, x: number, y: number, s: number, a = 1, tint = SUGAR): void {
  const top = lit(tint, 0.35), left = mixC(tint, ICING_SHADE, 0.45), right = dim(tint, 0.14);
  g.fillStyle(0x000000, 0.18 * a); g.fillEllipse(x, y + s * 0.2, s * 2.6, s * 0.9);
  // Right and left faces.
  g.fillStyle(right, a);
  g.fillPoints([new Phaser.Geom.Point(x, y - s * 0.1), new Phaser.Geom.Point(x + s, y - s * 0.6), new Phaser.Geom.Point(x + s, y - s * 1.6), new Phaser.Geom.Point(x, y - s * 1.1)], true, true);
  g.fillStyle(left, a);
  g.fillPoints([new Phaser.Geom.Point(x, y - s * 0.1), new Phaser.Geom.Point(x - s, y - s * 0.6), new Phaser.Geom.Point(x - s, y - s * 1.6), new Phaser.Geom.Point(x, y - s * 1.1)], true, true);
  // Top.
  g.fillStyle(top, a);
  g.fillPoints([new Phaser.Geom.Point(x, y - s * 1.1), new Phaser.Geom.Point(x + s, y - s * 1.6), new Phaser.Geom.Point(x, y - s * 2.1), new Phaser.Geom.Point(x - s, y - s * 1.6)], true, true);
  // Crystal grain.
  g.fillStyle(0xffffff, a * 0.8);
  g.fillCircle(x - s * 0.3, y - s * 1.65, Math.max(0.8, s * 0.12));
  g.fillCircle(x + s * 0.4, y - s * 0.9, Math.max(0.8, s * 0.1));
  g.fillStyle(dim(tint, 0.25), a * 0.5);
  g.fillCircle(x - s * 0.55, y - s * 0.9, Math.max(0.6, s * 0.08));
  g.fillCircle(x + s * 0.2, y - s * 1.75, Math.max(0.6, s * 0.08));
}

/** A wrapped sweet: a round boiled sweet with the twist of wrapper at each end. */
export function wrappedSweet(g: G, x: number, y: number, r: number, color: number, angle = 0, a = 1): void {
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const nx = -uy, ny = ux;
  for (const s of [-1, 1]) {
    const bx = x + ux * r * s, by = y + uy * r * s;
    g.fillStyle(dim(color, 0.15), a * 0.9);
    g.fillTriangle(bx, by, bx + ux * r * 1.1 * s + nx * r * 0.75, by + uy * r * 1.1 * s + ny * r * 0.75, bx + ux * r * 1.1 * s - nx * r * 0.75, by + uy * r * 1.1 * s - ny * r * 0.75);
  }
  g.fillStyle(dim(color, 0.4), a); g.fillCircle(x + 0.8, y + 1, r + 0.8);
  g.fillStyle(color, a); g.fillCircle(x, y, r);
  g.lineStyle(Math.max(1, r * 0.25), ICING, a * 0.8);
  g.beginPath(); g.arc(x, y, r * 0.6, angle - 0.6, angle + 1.4, false); g.strokePath();
  g.fillStyle(0xffffff, a * 0.8); g.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.25);
}

/** A lollipop on its stick: a flat spiral disc. Used as trees, as props, as weapons. */
export function lollipop(g: G, x: number, y: number, r: number, stick: number, c1: number, c2: number, spin = 0): void {
  shadow(g, x, y + 1, r * 1.3, r * 0.4, 0.25);
  g.lineStyle(Math.max(2, r * 0.18), dim(ICING, 0.25), 1); g.lineBetween(x + 1, y, x + 1, y - stick);
  g.lineStyle(Math.max(1.5, r * 0.13), ICING, 1); g.lineBetween(x, y, x, y - stick);
  const cy = y - stick - r * 0.85;
  g.fillStyle(dim(c1, 0.45), 1); g.fillCircle(x + 1.5, cy + 2, r + 1.5);
  g.fillStyle(c1, 1); g.fillCircle(x, cy, r);
  // The spiral.
  g.lineStyle(Math.max(1.5, r * 0.22), c2, 1);
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const ang = spin + t * Math.PI * 5;
    const rr = r * 0.95 * t;
    const px = x + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokePath();
  g.fillStyle(0xffffff, 0.45); g.fillEllipse(x - r * 0.4, cy - r * 0.45, r * 0.6, r * 0.32);
}

/** A gumdrop: a sugared dome. */
export function gumdrop(g: G, x: number, y: number, r: number, color: number, a = 1): void {
  shadow(g, x, y + 1, r * 2.2, r * 0.6, 0.22 * a);
  g.fillStyle(dim(color, 0.4), a); g.fillEllipse(x, y - r * 0.55, r * 2.1, r * 1.9);
  g.fillStyle(color, a); g.fillEllipse(x, y - r * 0.62, r * 1.95, r * 1.75);
  g.fillStyle(dim(color, 0.15), a); g.fillRect(x - r * 0.95, y - r * 0.2, r * 1.9, r * 0.2);
  // Sugar crust specks.
  g.fillStyle(0xffffff, a * 0.75);
  for (let i = 0; i < 7; i++) {
    const ang = i * 2.4, rr = r * (0.25 + (i % 3) * 0.22);
    g.fillCircle(x + Math.cos(ang) * rr, y - r * 0.75 + Math.sin(ang) * rr * 0.7, Math.max(0.7, r * 0.08));
  }
  g.fillStyle(lit(color, 0.45), a * 0.7); g.fillEllipse(x - r * 0.35, y - r * 1.05, r * 0.6, r * 0.35);
}

/** A gingerbread man, `s` ≈ half his height; `pose` swings arms and legs (−1..1). */
export function gingerbreadMan(g: G, x: number, y: number, s: number, pose = 0, a = 1, frown = false, button = CHERRY): void {
  const leg = pose * s * 0.35;
  shadow(g, x, y + 1, s * 1.3, s * 0.35, 0.25 * a);
  const body = GINGER;
  const out = dim(body, 0.45);
  // Legs.
  g.fillStyle(out, a);
  g.fillCircle(x - s * 0.35 + leg, y - s * 0.2, s * 0.3); g.fillCircle(x + s * 0.35 - leg, y - s * 0.2, s * 0.3);
  g.fillStyle(body, a);
  g.fillCircle(x - s * 0.35 + leg, y - s * 0.22, s * 0.26); g.fillCircle(x + s * 0.35 - leg, y - s * 0.22, s * 0.26);
  // Torso.
  g.fillStyle(out, a); g.fillEllipse(x, y - s * 0.8, s * 1.0, s * 1.2);
  g.fillStyle(body, a); g.fillEllipse(x, y - s * 0.8, s * 0.9, s * 1.1);
  // Arms.
  const arm = pose * s * 0.25;
  g.fillStyle(out, a); g.fillCircle(x - s * 0.62, y - s * 1.0 - arm, s * 0.27); g.fillCircle(x + s * 0.62, y - s * 1.0 + arm, s * 0.27);
  g.fillStyle(body, a); g.fillCircle(x - s * 0.62, y - s * 1.02 - arm, s * 0.23); g.fillCircle(x + s * 0.62, y - s * 1.02 + arm, s * 0.23);
  // Head.
  g.fillStyle(out, a); g.fillCircle(x, y - s * 1.55, s * 0.48);
  g.fillStyle(body, a); g.fillCircle(x, y - s * 1.56, s * 0.43);
  // Icing: cuffs, buttons, face.
  g.lineStyle(Math.max(1, s * 0.09), ICING, a);
  g.lineBetween(x - s * 0.72, y - s * 1.1 - arm, x - s * 0.55, y - s * 0.92 - arm);
  g.lineBetween(x + s * 0.72, y - s * 1.1 + arm, x + s * 0.55, y - s * 0.92 + arm);
  g.fillStyle(button, a); g.fillCircle(x, y - s * 0.95, s * 0.09); g.fillCircle(x, y - s * 0.68, s * 0.09);
  g.fillStyle(ICING, a); g.fillCircle(x - s * 0.15, y - s * 1.62, s * 0.07); g.fillCircle(x + s * 0.15, y - s * 1.62, s * 0.07);
  g.lineStyle(Math.max(1, s * 0.07), ICING, a);
  g.beginPath();
  if (frown) g.arc(x, y - s * 1.34, s * 0.16, Math.PI * 1.15, Math.PI * 1.85, false);
  else g.arc(x, y - s * 1.5, s * 0.16, Math.PI * 0.15, Math.PI * 0.85, false);
  g.strokePath();
}

/** A pulled-taffy strand between two points, bowed toward `bow` by `depth`. Pastel twist. */
export function taffy(g: G, a: Pt, b: Pt, bow: Pt | null, w: number, c1 = PINK_PALE, c2 = ICING, alpha = 1, phase = 0): void {
  const mid = bow ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const pts = quad(a, { x: mid.x * 2 - (a.x + b.x) / 2, y: mid.y * 2 - (a.y + b.y) / 2 }, b, 18);
  // A stretched strand thins in the middle.
  const stretch = Math.min(1, Math.hypot(mid.x - (a.x + b.x) / 2, mid.y - (a.y + b.y) / 2) / 80);
  twist(g, pts, w * (1 - stretch * 0.35), c1, c2, alpha, 12 + stretch * 10, phase);
}

/** A pool or run of syrup with a lit rim and slow glints. */
export function syrupBlob(g: G, x: number, y: number, rx: number, ry: number, a = 1, color = SYRUP): void {
  g.fillStyle(dim(color, 0.35), a); g.fillEllipse(x, y + 2, rx * 2.08, ry * 2.1);
  g.fillStyle(color, a); g.fillEllipse(x, y, rx * 2, ry * 2);
  g.fillStyle(lit(color, 0.3), a * 0.55); g.fillEllipse(x - rx * 0.3, y - ry * 0.35, rx * 0.8, ry * 0.45);
  g.fillStyle(0xffffff, a * 0.35); g.fillEllipse(x - rx * 0.4, y - ry * 0.45, rx * 0.25, ry * 0.15);
}

/** Crackle lines across set brittle — used for caramel brittle and sugar glass. */
export function crackle(g: G, x: number, y: number, w: number, h: number, seed: number, color: number, a = 0.7, lines = 7): void {
  let s = seed * 9301 + 49297;
  const rnd = (): number => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  g.lineStyle(1.2, color, a);
  for (let i = 0; i < lines; i++) {
    let px = x + rnd() * w, py = y + rnd() * h;
    g.beginPath(); g.moveTo(px, py);
    for (let k = 0; k < 3; k++) {
      px = Phaser.Math.Clamp(px + (rnd() - 0.5) * w * 0.4, x, x + w);
      py = Phaser.Math.Clamp(py + (rnd() - 0.5) * h * 0.4, y, y + h);
      g.lineTo(px, py);
    }
    g.strokePath();
  }
}

/** A puff of candy floss — a cluster of soft pink lobes. */
export function floss(g: G, x: number, y: number, r: number, a = 1, color = FLOSS, t = 0): void {
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + t * 0.3;
    const rr = r * (0.42 + 0.12 * Math.sin(i * 1.7 + t));
    const lx = x + Math.cos(ang) * rr, ly = y + Math.sin(ang) * rr * 0.8;
    g.fillStyle(i % 3 === 0 ? lit(color, 0.25) : color, a * 0.6);
    g.fillCircle(lx, ly, r * 0.45);
  }
  g.fillStyle(lit(color, 0.35), a * 0.7); g.fillCircle(x, y, r * 0.55);
  g.lineStyle(1, 0xffffff, a * 0.35);
  for (let i = 0; i < 4; i++) {
    const ang = i * 1.6 + t * 0.5;
    g.beginPath(); g.arc(x, y, r * (0.3 + i * 0.12), ang, ang + 1.4, false); g.strokePath();
  }
}

// ── Marks ────────────────────────────────────────────────────────────

/**
 * The Gardener's mark — a single rose on a pruned stem, a thorn left on the cut — that Empress
 * Verdigra has painted on every tithe board in Thornwild. Here it is iced on in green.
 */
export function gardenerMark(g: G, x: number, y: number, r: number, color = VERDIGRA, a = 1): void {
  g.lineStyle(Math.max(1.5, r * 0.16), color, a); g.strokeCircle(x, y, r);
  // The stem, cut on the slant.
  g.lineStyle(Math.max(1.5, r * 0.14), color, a);
  g.lineBetween(x, y + r * 0.7, x, y - r * 0.05);
  g.lineBetween(x - r * 0.12, y + r * 0.72, x + r * 0.12, y + r * 0.6);
  // A thorn.
  g.fillStyle(color, a); g.fillTriangle(x, y + r * 0.3, x + r * 0.22, y + r * 0.2, x, y + r * 0.16);
  // The rose: three overlapping petals.
  for (let i = 0; i < 3; i++) {
    const ang = -Math.PI / 2 + (i - 1) * 0.9;
    g.fillCircle(x + Math.cos(ang) * r * 0.2, y - r * 0.3 + Math.sin(ang) * r * 0.16, r * 0.24);
  }
}

/** A sugar loaf: the tall cone of hard white sugar the Sweet-Tax is paid in, in blue paper. */
export function sugarLoaf(g: G, x: number, y: number, h: number, paper = 0x3a5ab0, a = 1): void {
  const w = h * 0.46;
  shadow(g, x, y + 1, w * 1.5, w * 0.45, 0.28 * a);
  // Paper wrap round the base half.
  g.fillStyle(dim(SUGAR, 0.3), a);
  g.fillTriangle(x - w / 2 - 1, y + 1, x + w / 2 + 1, y + 1, x, y - h - 2);
  g.fillStyle(SUGAR, a); g.fillTriangle(x - w / 2, y, x + w / 2, y, x, y - h);
  g.fillStyle(lit(SUGAR, 0.5), a * 0.8); g.fillTriangle(x - w * 0.32, y, x - w * 0.1, y, x - w * 0.05, y - h * 0.86);
  g.fillStyle(paper, a);
  g.fillPoints([
    new Phaser.Geom.Point(x - w / 2, y), new Phaser.Geom.Point(x + w / 2, y),
    new Phaser.Geom.Point(x + w * 0.3, y - h * 0.42), new Phaser.Geom.Point(x - w * 0.3, y - h * 0.42),
  ], true, true);
  g.fillStyle(lit(paper, 0.2), a); g.fillRect(x - w * 0.3, y - h * 0.44, w * 0.6, 2);
  // String tied round.
  g.lineStyle(1.2, 0xe8d8b0, a); g.lineBetween(x - w * 0.4, y - h * 0.2, x + w * 0.4, y - h * 0.2);
}
