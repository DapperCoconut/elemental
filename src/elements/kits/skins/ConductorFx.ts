import Phaser from 'phaser';
import { FxBase, TAU, easeOut } from '../ElementVisuals';

/**
 * The Conductor skin's bespoke ability art for Death. Visual only — every painter here stands in
 * for one DeathVisuals painter for an owner wearing the skin, at the same footprint and in the
 * same local space, so hitboxes and timings stay exactly the element's.
 *
 * - `ticket` — a Styx shuriken: a punched rail ticket tumbling end over end.
 * - `umbrella` — the katana: a furled black umbrella with a crook handle (open on a swing).
 * - `umbrellaSwipe` — Disarm's afterimage: the canopy swept open through the arc.
 * - `stopSign` — Riposte: a stop sign on a short pole, turning from white to red as it goes up.
 * - `goggles` — Deal with Death's mask: driver's goggles, a lens cracking per charge spent.
 * - `departureBoard` — the Midnight dial: a "NEXT TRAIN IN" split-flap board.
 * - `train` — midnight itself: the express that runs the victim down.
 * - `pocketWatch` — always in his left hand, its hand the same minute as the board.
 *
 * Colours are final (the skin owns them), so nothing routes through Death's mapper.
 */
export const CON = {
  night: 0x080b16,
  navyDeep: 0x101a30,
  navy: 0x1c2c4e,
  navyLit: 0x324a78,
  steam: 0xb7c0cc,
  steamDark: 0x6a7686,
  brass: 0xc99a2e,
  brassDark: 0x7a5a16,
  brassLit: 0xffe08a,
  cream: 0xf2ead6,
  card: 0xd9c9a0,
  ink: 0x1a1410,
  red: 0xd8262e,
  redDark: 0x7a1016,
  redLit: 0xff6a5a,
  steel: 0x9aa3ae,
  steelDark: 0x4a525c,
  steelLit: 0xe2e8ee,
  lamp: 0xffd84a,
  lampHot: 0xfff6c8,
  green: 0x3fbf6a,
  greenDark: 0x1e5e3a,
  glass: 0x7fd0e8,
  glassDark: 0x24506a,
  leather: 0x5a3a20,
  leatherLit: 0x8a5e34,
  skin: 0xe2b48c,
  skinShade: 0xb4825e,
  white: 0xffffff,
};

type Pt = Phaser.Geom.Point;
const P = (x: number, y: number): Pt => new Phaser.Geom.Point(x, y);

/** A local frame along `ang`: `u` forward, `v` to the right. */
function frame(x: number, y: number, ang: number): (u: number, v: number) => Pt {
  const c = Math.cos(ang), s = Math.sin(ang);
  return (u, v) => P(x + c * u - s * v, y + s * u + c * v);
}

function lerpColor(a: number, b: number, k: number): number {
  const t = Phaser.Math.Clamp(k, 0, 1);
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** A regular octagon, flat side up, in a frame. */
function octagon(cx: number, cy: number, r: number, rot = Math.PI / 8): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const a = rot + (i / 8) * TAU;
    pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

// ── Tickets (Styx Shurikens) ─────────────────────────────────────────────────

/**
 * A rail ticket, `size` being half its long side: cream card with a red band, a printed route
 * line, a perforated stub and the conductor's punch hole. `ang` is its tumble.
 */
export function ticket(g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, size: number, alpha: number, seed = 0): void {
  const F = frame(x, y, ang);
  const L = size * 1.25, W = size * 0.62;
  // Shadow, then the card.
  g.fillStyle(CON.night, alpha * 0.35);
  g.fillPoints([F(-L + 1.5, -W + 2), F(L + 1.5, -W + 2), F(L + 1.5, W + 2), F(-L + 1.5, W + 2)], true);
  g.fillStyle(CON.cream, alpha);
  g.fillPoints([F(-L, -W), F(L, -W), F(L, W), F(-L, W)], true);
  // The stub end, a shade darker, behind a perforation.
  g.fillStyle(CON.card, alpha);
  g.fillPoints([F(L * 0.45, -W), F(L, -W), F(L, W), F(L * 0.45, W)], true);
  g.fillStyle(CON.ink, alpha * 0.55);
  for (let i = -2; i <= 2; i++) {
    const p = F(L * 0.45, (i / 2.4) * W);
    g.fillCircle(p.x, p.y, 0.55);
  }
  // Red band along the top edge.
  g.fillStyle(CON.red, alpha);
  g.fillPoints([F(-L, -W), F(L * 0.45, -W), F(L * 0.45, -W * 0.45), F(-L, -W * 0.45)], true);
  // Printed route: two dots and a line between them.
  g.lineStyle(0.9, CON.ink, alpha * 0.7);
  const a = F(-L * 0.7, W * 0.25), b = F(L * 0.2, W * 0.25);
  g.lineBetween(a.x, a.y, b.x, b.y);
  g.fillStyle(CON.ink, alpha * 0.8);
  g.fillCircle(a.x, a.y, 1);
  g.fillCircle(b.x, b.y, 1);
  // The punch — a hole straight through, so the floor shows.
  const h = F(L * 0.72, (seed % 2 ? -1 : 1) * W * 0.15);
  g.fillStyle(CON.night, alpha * 0.85);
  g.fillCircle(h.x, h.y, size * 0.16);
  // Glint along the lit edge.
  g.lineStyle(0.8, CON.white, alpha * 0.6);
  const e0 = F(-L, W), e1 = F(L * 0.4, W);
  g.lineBetween(e0.x, e0.y, e1.x, e1.y);
}

// ── Umbrella (the katana) ────────────────────────────────────────────────────

/**
 * The umbrella from the crook outward along `ang`, `len` long. `open` 0 is furled tight round
 * the shaft — a long tapering black spindle — and 1 is the canopy flared into a shallow dome
 * facing along the shaft. Built point by point so the furl tapers rather than beads.
 */
export function umbrella(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, len: number, alpha: number,
  { open = 0, glow = 0 } = {},
): void {
  const F = frame(x, y, ang);
  // Crook handle behind the grip: a J of polished wood.
  g.lineStyle(3.2, CON.leather, alpha);
  g.beginPath();
  const hc = F(-4, 3.5);
  g.arc(hc.x, hc.y, 3.6, ang + Math.PI * 0.5, ang + Math.PI * 1.5, false);
  g.strokePath();
  g.lineStyle(1.2, CON.leatherLit, alpha * 0.8);
  g.beginPath();
  g.arc(hc.x, hc.y, 3.6, ang + Math.PI * 0.75, ang + Math.PI * 1.3, false);
  g.strokePath();
  // Shaft.
  const s0 = F(-1, 0), s1 = F(len, 0);
  g.lineStyle(2, CON.steelDark, alpha);
  g.lineBetween(s0.x, s0.y, s1.x, s1.y);
  g.lineStyle(0.8, CON.steelLit, alpha * 0.7);
  g.lineBetween(s0.x, s0.y - 0.6, s1.x, s1.y - 0.6);

  if (open < 0.5) {
    // Furled: a spindle swelling from the collar to a third of the way and tapering to the ferrule.
    const top: Pt[] = [];
    const bot: Pt[] = [];
    const u0 = len * 0.22, u1 = len * 0.96;
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const u = u0 + (u1 - u0) * k;
      const w = (k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7) * 4.6 + 0.6;
      top.push(F(u, -w));
      bot.unshift(F(u, w * 0.9));
    }
    g.fillStyle(CON.night, alpha);
    g.fillPoints([...top, ...bot], true);
    g.fillStyle(CON.navyDeep, alpha * 0.9);
    const spine: Pt[] = [];
    for (let i = 10; i >= 0; i--) spine.push(F(u0 + (u1 - u0) * (i / 10), 0));
    g.fillPoints([...top, ...spine], true);
    // The strap and button.
    const st = F(len * 0.5, 0);
    g.fillStyle(CON.navyLit, alpha);
    g.fillCircle(st.x, st.y, 2.2);
    g.fillStyle(CON.brass, alpha);
    g.fillCircle(st.x, st.y, 1);
  } else {
    // Open: the dome with eight ribs, its rim scalloped between the rib tips.
    const R = len * 0.5;
    const cu = len * 0.62;
    const rim: Pt[] = [];
    for (let i = 0; i <= 16; i++) {
      const v = (i / 16 - 0.5) * 2 * R;
      const scallop = i % 2 === 1 ? 2.4 : 0;
      rim.push(F(cu - Math.sqrt(Math.max(0, R * R - v * v)) * 0.25 + scallop, v));
    }
    const apex = F(len * 0.98, 0);
    g.fillStyle(CON.night, alpha);
    g.fillPoints([apex, ...rim], true);
    g.fillStyle(CON.navyDeep, alpha * 0.85);
    g.fillPoints([apex, ...rim.slice(0, 9)], true);
    g.lineStyle(0.9, CON.steel, alpha * 0.6);
    for (let i = 0; i <= 16; i += 2) g.lineBetween(apex.x, apex.y, rim[i].x, rim[i].y);
  }
  // Ferrule.
  const fe = F(len + 3, 0);
  g.fillStyle(CON.brass, alpha);
  g.fillCircle(fe.x, fe.y, 1.4);
  if (glow > 0.05) {
    g.lineStyle(1, CON.brassLit, alpha * Math.min(1, glow) * 0.7);
    g.lineBetween(s0.x, s0.y, fe.x, fe.y);
  }
}

/**
 * Disarm's afterimage: the canopy swung open through the arc — a fan of black gores with steel
 * ribs between them and a lamp-yellow rim, standing where `slashArc` would hang.
 */
export function umbrellaSwipe(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, ang: number, half: number,
  rInner: number, rOuter: number, alpha: number,
): void {
  if (alpha <= 0.01) return;
  const GORES = 8;
  for (let i = 0; i < GORES; i++) {
    const a0 = ang - half + (i / GORES) * half * 2;
    const a1 = ang - half + ((i + 1) / GORES) * half * 2;
    const pts: Pt[] = [P(cx + Math.cos(a0) * rInner, cy + Math.sin(a0) * rInner)];
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (a1 - a0) * (k / 6);
      // Each gore bellies outward between its two ribs.
      const r = rOuter - 6 + Math.sin((k / 6) * Math.PI) * 6;
      pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    pts.push(P(cx + Math.cos(a1) * rInner, cy + Math.sin(a1) * rInner));
    g.fillStyle(i % 2 ? CON.night : CON.navyDeep, alpha * 0.7);
    g.fillPoints(pts, true);
    g.lineStyle(1.6, CON.lamp, alpha * 0.8);
    g.strokePoints(pts.slice(1, -1), false);
  }
  for (let i = 0; i <= GORES; i++) {
    const a = ang - half + (i / GORES) * half * 2;
    g.lineStyle(1.2, CON.steelLit, alpha * 0.75);
    g.lineBetween(cx + Math.cos(a) * rInner * 0.6, cy + Math.sin(a) * rInner * 0.6,
      cx + Math.cos(a) * (rOuter - 6), cy + Math.sin(a) * (rOuter - 6));
    g.fillStyle(CON.brass, alpha);
    g.fillCircle(cx + Math.cos(a) * (rOuter - 6), cy + Math.sin(a) * (rOuter - 6), 1.6);
  }
}

// ── Stop sign (Riposte) ──────────────────────────────────────────────────────

/**
 * A stop sign held out at (`x`,`y`) on a pole running back along `ang` toward the holder.
 * `red` 0 is a blank white plate; by 1 it has flushed fully red with STOP lettered on it.
 */
export function stopSign(
  g: Phaser.GameObjects.Graphics, x: number, y: number, ang: number, r: number, red: number, alpha: number, t = 0,
): void {
  // Pole back toward the hands.
  const bx = x - Math.cos(ang) * r * 1.9, by = y - Math.sin(ang) * r * 1.9;
  g.lineStyle(3, CON.steelDark, alpha);
  g.lineBetween(bx, by, x, y);
  g.lineStyle(1, CON.steelLit, alpha * 0.7);
  g.lineBetween(bx, by - 1, x, y - 1);
  const face = lerpColor(0xeeeeee, CON.red, red);
  const rim = lerpColor(0x9a9a9a, CON.white, red);
  g.fillStyle(CON.night, alpha * 0.4);
  g.fillPoints(octagon(x + 2, y + 3, r), true);
  g.fillStyle(rim, alpha);
  g.fillPoints(octagon(x, y, r), true);
  g.fillStyle(face, alpha);
  g.fillPoints(octagon(x, y, r * 0.86), true);
  // A sheen across the upper half.
  g.fillStyle(CON.white, alpha * 0.14);
  g.fillPoints(octagon(x, y, r * 0.86).slice(4, 8), true);
  if (red > 0.6) {
    // Hand-drawn STOP: four little block letters — S, T, O, P.
    const k = (red - 0.6) / 0.4;
    const s = r * 0.19;
    const lx = x - s * 4.4;
    g.lineStyle(Math.max(1, r * 0.09), CON.white, alpha * k);
    // S
    g.beginPath();
    g.moveTo(lx + s * 1.6, y - s); g.lineTo(lx, y - s); g.lineTo(lx, y); g.lineTo(lx + s * 1.6, y);
    g.lineTo(lx + s * 1.6, y + s); g.lineTo(lx, y + s);
    g.strokePath();
    // T
    const tx = lx + s * 2.4;
    g.lineBetween(tx, y - s, tx + s * 1.6, y - s);
    g.lineBetween(tx + s * 0.8, y - s, tx + s * 0.8, y + s);
    // O
    const ox = tx + s * 2.4;
    g.strokeRect(ox, y - s, s * 1.6, s * 2);
    // P
    const px = ox + s * 2.4;
    g.beginPath();
    g.moveTo(px, y + s); g.lineTo(px, y - s); g.lineTo(px + s * 1.6, y - s); g.lineTo(px + s * 1.6, y); g.lineTo(px, y);
    g.strokePath();
  }
  // A pulse round the plate while it is red and holding.
  if (red > 0.95) {
    const p = 0.5 + 0.5 * Math.sin(t * 9);
    g.lineStyle(1.6, CON.redLit, alpha * (0.25 + p * 0.35));
    g.strokePoints(octagon(x, y, r + 3 + p * 2), true);
  }
}

// ── Goggles (Deal with Death's mask) ─────────────────────────────────────────

/** Driver's goggles over the face, `cracks` of the two lenses already broken. */
export function goggles(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, cracks: number, alpha: number, t = 0): void {
  const sway = Math.sin(t * 2.2) * 0.6;
  const ly = y + sway;
  // Strap round the head.
  g.lineStyle(3.4, CON.leather, alpha);
  g.lineBetween(x - r * 2.1, ly + 0.5, x + r * 2.1, ly + 0.5);
  g.lineStyle(1, CON.leatherLit, alpha * 0.8);
  g.lineBetween(x - r * 2.1, ly - 0.8, x + r * 2.1, ly - 0.8);
  // Bridge.
  g.fillStyle(CON.brassDark, alpha);
  g.fillRect(x - r * 0.35, ly - 1.4, r * 0.7, 2.8);
  for (let i = 0; i < 2; i++) {
    const cx = x + (i === 0 ? -1 : 1) * r * 0.95;
    // Brass rim, glass, a glint — and a cracked lens per broken charge.
    g.fillStyle(CON.brassDark, alpha);
    g.fillCircle(cx, ly, r * 0.82);
    g.fillStyle(CON.brass, alpha);
    g.fillCircle(cx, ly, r * 0.72);
    const broken = i < cracks;
    g.fillStyle(broken ? CON.glassDark : CON.glass, alpha * 0.95);
    g.fillCircle(cx, ly, r * 0.56);
    g.fillStyle(CON.white, alpha * (broken ? 0.25 : 0.65));
    g.fillCircle(cx - r * 0.2, ly - r * 0.2, r * 0.16);
    if (broken) {
      g.lineStyle(0.9, CON.white, alpha * 0.85);
      g.lineBetween(cx - r * 0.4, ly - r * 0.3, cx + r * 0.05, ly + r * 0.05);
      g.lineBetween(cx + r * 0.05, ly + r * 0.05, cx + r * 0.42, ly - r * 0.1);
      g.lineBetween(cx + r * 0.05, ly + r * 0.05, cx - r * 0.1, ly + r * 0.45);
    }
    // Rivets on the rim.
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.4;
      g.fillStyle(CON.brassLit, alpha * 0.9);
      g.fillCircle(cx + Math.cos(a) * r * 0.77, ly + Math.sin(a) * r * 0.77, 0.7);
    }
  }
}

// ── Pocket watch ─────────────────────────────────────────────────────────────

/** A brass hunter-case watch, its minute hand on `frac` (time remaining, 0–1), chain trailing. */
export function pocketWatch(
  g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, frac: number, alpha: number,
  { chainX = NaN, chainY = NaN, hot = false, t = 0 } = {},
): void {
  if (Number.isFinite(chainX)) {
    // A sagging chain, beaded, back to the waistcoat.
    const midX = (x + chainX) / 2, midY = Math.max(y, chainY) + 5;
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      const qx = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * midX + k * k * chainX;
      const qy = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * midY + k * k * chainY;
      g.fillStyle(i % 2 ? CON.brassLit : CON.brass, alpha * 0.9);
      g.fillCircle(qx, qy, 0.8);
    }
  }
  // Crown and bow.
  g.fillStyle(CON.brassDark, alpha);
  g.fillRect(x - 1.2, y - r - 2.6, 2.4, 2.6);
  g.lineStyle(1.1, CON.brass, alpha);
  g.strokeCircle(x, y - r - 3.6, 1.6);
  // Case and dial.
  g.fillStyle(CON.brassDark, alpha);
  g.fillCircle(x, y, r + 1);
  g.fillStyle(CON.brass, alpha);
  g.fillCircle(x, y, r);
  g.fillStyle(CON.cream, alpha);
  g.fillCircle(x, y, r * 0.8);
  // The spent part of the hour, as a wedge, and twelve tick marks.
  const k = Phaser.Math.Clamp(frac, 0, 1);
  if (k < 0.999) {
    g.fillStyle(hot ? CON.red : CON.card, alpha * 0.55);
    g.slice(x, y, r * 0.8, -Math.PI / 2, -Math.PI / 2 + (1 - k) * TAU, false);
    g.fillPath();
  }
  if (r >= 4) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.fillStyle(CON.ink, alpha * 0.7);
      g.fillCircle(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, i % 3 === 0 ? 0.6 : 0.35);
    }
  }
  const ha = -Math.PI / 2 + (1 - k) * TAU;
  g.lineStyle(Math.max(0.8, r * 0.14), hot ? CON.red : CON.ink, alpha);
  g.lineBetween(x, y, x + Math.cos(ha) * r * 0.7, y + Math.sin(ha) * r * 0.7);
  const sa = t * 6;
  g.lineStyle(0.5, CON.red, alpha * 0.8);
  g.lineBetween(x, y, x + Math.cos(sa) * r * 0.62, y + Math.sin(sa) * r * 0.62);
  g.fillStyle(CON.brassLit, alpha);
  g.fillCircle(x - r * 0.35, y - r * 0.4, r * 0.14);
}

// ── Departure board (the Midnight dial) ──────────────────────────────────────

/**
 * The HUD plate the countdown hangs on: a station departures board on two hanging rods, a green
 * "on time" lamp that goes red in the last quarter, split-flap cells behind the count, and a
 * little locomotive along the bottom rail that creeps toward the buffer as the minute runs out.
 * Text is the kit's (it owns the Text objects); this paints everything around it.
 */
export function departureBoard(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, frac: number, late: number, tick: number,
  hostile: boolean, t: number,
): void {
  const W = 120, H = 92;
  const x0 = cx - W / 2, y0 = cy - H / 2;
  // Hanging rods.
  g.lineStyle(2, CON.steelDark, 1);
  g.lineBetween(cx - 40, y0 - 18, cx - 40, y0);
  g.lineBetween(cx + 40, y0 - 18, cx + 40, y0);
  // Case.
  g.fillStyle(CON.night, 0.55);
  g.fillRoundedRect(x0 + 3, y0 + 4, W, H, 8);
  g.fillStyle(CON.navyDeep, 0.97);
  g.fillRoundedRect(x0, y0, W, H, 8);
  g.fillStyle(CON.navy, 1);
  g.fillRoundedRect(x0 + 4, y0 + 4, W - 8, 18, 5);
  g.lineStyle(2, hostile ? CON.red : CON.brass, 0.9);
  g.strokeRoundedRect(x0, y0, W, H, 8);
  // Status lamp, top left.
  const lampOn = late > 0 ? (Math.sin(t * 10) > 0 ? CON.red : CON.redDark) : CON.green;
  g.fillStyle(CON.night, 1);
  g.fillCircle(x0 + 12, y0 + 13, 4.4);
  g.fillStyle(lampOn, 1);
  g.fillCircle(x0 + 12, y0 + 13, 3.2);
  g.fillStyle(CON.white, 0.6);
  g.fillCircle(x0 + 11, y0 + 12, 1);
  // Split-flap cells behind the count: four dark tiles with a hinge line through each.
  const cellW = 20, cellH = 26, cy0 = y0 + 30;
  for (let i = 0; i < 4; i++) {
    const bx = cx - (cellW * 2 + 6) + i * (cellW + 4);
    g.fillStyle(CON.night, 1);
    g.fillRoundedRect(bx, cy0, cellW, cellH, 3);
    g.fillStyle(CON.navyLit, 0.3 + tick * 0.25);
    g.fillRoundedRect(bx + 1, cy0 + 1, cellW - 2, cellH / 2 - 1, 2);
    g.lineStyle(1, CON.navyDeep, 1);
    g.lineBetween(bx, cy0 + cellH / 2, bx + cellW, cy0 + cellH / 2);
  }
  // The rail along the foot with a buffer stop at the right end.
  const ry = y0 + H - 14;
  const rx0 = x0 + 10, rx1 = x0 + W - 14;
  g.lineStyle(1.4, CON.steel, 1);
  g.lineBetween(rx0, ry + 4, rx1 + 6, ry + 4);
  for (let sx = rx0; sx <= rx1; sx += 7) {
    g.lineStyle(1.6, CON.leather, 1);
    g.lineBetween(sx, ry + 2.5, sx, ry + 6);
  }
  g.fillStyle(CON.red, 1);
  g.fillRect(rx1 + 3, ry - 4, 4, 8);
  // The little engine, its progress the spent minute.
  const k = 1 - Phaser.Math.Clamp(frac, 0, 1);
  const ex = rx0 + 8 + (rx1 - rx0 - 18) * k;
  g.fillStyle(late > 0 ? CON.red : CON.brass, 1);
  g.fillRect(ex - 8, ry - 4, 12, 7);
  g.fillRect(ex + 1, ry - 7, 3, 3);
  g.fillStyle(CON.night, 1);
  g.fillCircle(ex - 5, ry + 3.5, 2);
  g.fillCircle(ex + 1, ry + 3.5, 2);
  g.fillStyle(CON.lamp, 1);
  g.fillCircle(ex + 4.5, ry - 1.5, 1.2);
  // Steam puffs lifting off the stack.
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.9 + i / 3) % 1;
    g.fillStyle(CON.steam, (1 - p) * 0.6);
    g.fillCircle(ex + 2.5 - p * 8, ry - 9 - p * 10, 1.4 + p * 2.2);
  }
}

// ── The train (midnight) ─────────────────────────────────────────────────────

/** How tall the express stands, buffer to roof. */
export const TRAIN_H = 96;
/** Locomotive plus three coaches, nose to tail. */
export const TRAIN_LEN = 250 + 3 * 190;

/**
 * The express, its nose at (`frontX`, `y`) and running in `dir` (+1 right, −1 left). A black and
 * red locomotive with a cowcatcher, a lit headlamp and a stack pouring steam, then three navy
 * coaches with lit windows; the wheels turn with `t`. Huge on purpose — it is the passive.
 */
export function train(g: Phaser.GameObjects.Graphics, frontX: number, y: number, dir: number, t: number, alpha = 1): void {
  const X = (u: number) => frontX - dir * u;
  const H = TRAIN_H;
  const top = y - H * 0.62, bot = y + H * 0.38;
  const rect = (u0: number, u1: number, y0: number, y1: number) => {
    const a = X(u0), b = X(u1);
    g.fillRect(Math.min(a, b), y0, Math.abs(b - a), y1 - y0);
  };
  const wheel = (u: number, r: number) => {
    const wx = X(u), wy = bot - r * 0.4;
    g.fillStyle(CON.night, alpha);
    g.fillCircle(wx, wy, r);
    g.fillStyle(CON.red, alpha);
    g.fillCircle(wx, wy, r * 0.72);
    g.fillStyle(CON.night, alpha);
    g.fillCircle(wx, wy, r * 0.2);
    const spin = t * 14 * dir;
    g.lineStyle(1.6, CON.night, alpha);
    for (let k = 0; k < 4; k++) {
      const a = spin + (k / 4) * Math.PI;
      g.lineBetween(wx - Math.cos(a) * r * 0.7, wy - Math.sin(a) * r * 0.7, wx + Math.cos(a) * r * 0.7, wy + Math.sin(a) * r * 0.7);
    }
  };

  // Shadow on the ground under the whole thing.
  g.fillStyle(CON.night, alpha * 0.35);
  rect(-10, TRAIN_LEN, bot - 4, bot + 10);

  // ── Coaches ──
  for (let c = 0; c < 3; c++) {
    const u0 = 250 + c * 190 + 8, u1 = u0 + 176;
    // Coupler.
    g.fillStyle(CON.steelDark, alpha);
    rect(u0 - 10, u0, bot - 22, bot - 16);
    g.fillStyle(CON.navyDeep, alpha);
    rect(u0, u1, top + 10, bot - 12);
    g.fillStyle(CON.navy, alpha);
    rect(u0 + 3, u1 - 3, top + 14, bot - 18);
    // Roof.
    g.fillStyle(CON.night, alpha);
    rect(u0 - 4, u1 + 4, top + 4, top + 14);
    // Brass waist stripe.
    g.fillStyle(CON.brass, alpha);
    rect(u0, u1, bot - 34, bot - 30);
    // Windows, lit.
    for (let w = 0; w < 5; w++) {
      const wu = u0 + 12 + w * 33;
      g.fillStyle(CON.lamp, alpha * 0.9);
      rect(wu, wu + 22, top + 22, top + 44);
      g.fillStyle(CON.lampHot, alpha * 0.5);
      rect(wu + 2, wu + 9, top + 24, top + 42);
    }
    wheel(u0 + 26, 11);
    wheel(u0 + 52, 11);
    wheel(u1 - 52, 11);
    wheel(u1 - 26, 11);
  }

  // ── Locomotive ──
  // Tender + cab at the back, the long boiler forward, the smokebox and cowcatcher at the nose.
  g.fillStyle(CON.night, alpha);
  rect(150, 248, top + 6, bot - 12); // cab
  g.fillStyle(CON.redDark, alpha);
  rect(156, 242, top + 12, bot - 18);
  g.fillStyle(CON.lamp, alpha * 0.85);
  rect(170, 196, top + 20, top + 42); // cab window
  g.fillStyle(CON.night, alpha);
  rect(144, 254, top, top + 8); // cab roof
  // Boiler.
  g.fillStyle(CON.night, alpha);
  rect(26, 152, top + 26, bot - 14);
  g.fillStyle(CON.navyDeep, alpha);
  rect(26, 152, top + 30, top + 40);
  // Boiler bands.
  for (let b = 0; b < 4; b++) {
    g.fillStyle(CON.brass, alpha);
    rect(40 + b * 30, 44 + b * 30, top + 26, bot - 14);
  }
  // Red running board and buffer beam.
  g.fillStyle(CON.red, alpha);
  rect(0, 252, bot - 20, bot - 13);
  // Smokestack and dome.
  g.fillStyle(CON.night, alpha);
  rect(40, 58, top - 8, top + 28);
  rect(34, 64, top - 14, top - 6);
  g.fillStyle(CON.brass, alpha);
  rect(92, 112, top + 14, top + 28);
  // Smokebox face and headlamp.
  g.fillStyle(CON.steelDark, alpha);
  rect(16, 30, top + 22, bot - 14);
  const lx = X(14), ly = top + 34;
  g.fillStyle(CON.lamp, alpha * 0.25);
  g.fillCircle(lx, ly, 22);
  g.fillStyle(CON.lamp, alpha);
  g.fillCircle(lx, ly, 7);
  g.fillStyle(CON.lampHot, alpha);
  g.fillCircle(lx, ly, 3.5);
  // Headlight beam thrown ahead of the nose.
  g.fillStyle(CON.lamp, alpha * 0.12);
  g.fillTriangle(lx, ly - 4, X(-260), ly - 46, X(-260), ly + 46);
  // Cowcatcher.
  g.fillStyle(CON.red, alpha);
  g.fillTriangle(X(16), bot - 20, X(16), bot + 2, X(-18), bot + 2);
  g.lineStyle(1.4, CON.night, alpha);
  for (let k = 0; k < 4; k++) {
    const u = 14 - k * 8;
    g.lineBetween(X(u), bot - 18 + k * 4, X(u - 6), bot + 2);
  }
  // Driving wheels — big ones under the boiler, small at the nose.
  wheel(44, 10);
  wheel(92, 18);
  wheel(134, 18);
  wheel(206, 12);
  // Connecting rod across the drivers.
  const rodK = Math.sin(t * 14) * 6;
  g.lineStyle(3, CON.steelLit, alpha);
  g.lineBetween(X(92), bot - 7 + rodK, X(134), bot - 7 + rodK);

  // Steam pouring off the stack and streaming back over the coaches.
  for (let i = 0; i < 9; i++) {
    const p = (t * 1.6 + i / 9) % 1;
    const sx = X(48 + p * 340);
    const sy = top - 18 - p * 34 + Math.sin(t * 3 + i) * 4;
    g.fillStyle(i % 2 ? CON.steam : CON.steamDark, alpha * (1 - p) * 0.75);
    g.fillCircle(sx, sy, 8 + p * 22);
  }
}

// ── Animated one-shots ───────────────────────────────────────────────────────

/** Tween-backed one-shots the rig and the kit throw off. */
export class ConductorAnims extends FxBase {
  /** A puff of steam lifting and spreading. */
  steam(x: number, y: number, count = 2, spread = 6, ms = 520, depth = 4): void {
    const seeds = Array.from({ length: count }, () => [Math.random() * TAU, Math.random()]);
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      for (const [a, r] of seeds) {
        g.fillStyle(r > 0.5 ? CON.steam : CON.steamDark, (1 - t) * 0.5);
        g.fillCircle(x + Math.cos(a) * spread * e, y - 6 * e + Math.sin(a) * spread * 0.4 * e, 2 + 5 * e * (0.6 + r * 0.4));
      }
    });
  }

  /** The express going through somebody: a burst of steam, sparks and scattered tickets. */
  impact(x: number, y: number, dir: number, ms = 900, depth = 15): void {
    const bits = Array.from({ length: 14 }, (_, i) => ({
      a: -Math.PI / 2 + (Math.random() - 0.5) * 2.2 + (dir > 0 ? 0.6 : -0.6),
      d: 60 + Math.random() * 140,
      spin: (Math.random() - 0.5) * 18,
      kind: i % 3,
    }));
    this.anim(depth, ms, (g, t) => {
      const e = easeOut(t);
      // Ring of steam.
      g.fillStyle(CON.steam, (1 - t) * 0.55);
      g.fillCircle(x, y, 30 + e * 90);
      g.fillStyle(CON.white, (1 - t) * 0.35);
      g.fillCircle(x, y, 18 + e * 50);
      for (const b of bits) {
        const px = x + Math.cos(b.a) * b.d * e;
        const py = y + Math.sin(b.a) * b.d * e + t * t * 120;
        if (b.kind === 0) ticket(g, px, py, b.spin * t, 7, 1 - t, 1);
        else {
          g.fillStyle(b.kind === 1 ? CON.lamp : CON.brassLit, 1 - t);
          g.fillCircle(px, py, 2.2);
        }
      }
    });
  }
}
