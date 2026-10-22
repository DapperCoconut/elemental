import Phaser from 'phaser';
import { ColorFn, FxBase, TAU, easeOut } from '../ElementVisuals';
// Type-only: ElectricityVisuals imports this file at runtime, so nothing here may pull a value
// back out of it.
import type { BoltLayerOpts, BoltTones, Pt } from '../ElectricityVisuals';

/**
 * Rage skin (electricity) art: everything that turns current into red-hot fury.
 *
 * Electricity routes every bolt it draws through one primitive, `boltLayered`, and every colour
 * through the owner's skin mapper. So the reskin hooks the primitive once: when the mapper it was
 * handed is a Rage mapper (`isRageTint`), the bolt is drawn as a searing heat streak instead —
 * smoothed, molten, with blisters of white heat and the odd vein-mark popping off it. Footprint,
 * endpoints and timing are the bolt's own, so nothing reads differently in a fight except the
 * mood. The rest (steam, anger marks, the rage meter) is called from the kit and the Fx on the
 * same gate.
 */

/** The skin's own colours, darkest first. The avatar and the meter paint straight from these. */
export const RAGE = {
  char: 0x140303,
  scab: 0x3d0808,
  blood: 0x7a1010,
  crimson: 0xb3180f,
  red: 0xe02414,
  hot: 0xff3a1f,
  searing: 0xff5a2a,
  flare: 0xff9a5c,
  white: 0xfff0e0,
  skinDeep: 0x5c0c0c,
  skin: 0x9e1a14,
  skinLit: 0xc8301e,
  skinHi: 0xe85a3a,
  vein: 0xff7a40,
  tooth: 0xfff4ea,
  toothShade: 0xd9b8a8,
  steam: 0xf2dcd6,
  steamDim: 0xb89a96,
} as const;

/** What the Rage palette maps electricity's `volt` to. Unique to this skin. */
const RAGE_VOLT = RAGE.searing;
const BASE_VOLT = 0xffee00;

/** True when `tint` is an owner mapper with the Rage skin on — the one gate every hook uses. */
export function isRageTint(tint: ColorFn): boolean {
  return tint(BASE_VOLT) === RAGE_VOLT;
}

function trace(g: Phaser.GameObjects.Graphics, pts: Pt[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** Knock the kinks off a bolt — rage sears in a whip, it doesn't zigzag. Ends stay pinned. */
function smooth(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    out.push({
      x: (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4,
      y: (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4,
    });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * The vein mark (the "💢" symbol): four curved strokes round an empty centre, each bowing in
 * toward it. Drawn, not printed, so it scales and tints with the effect it sits on.
 */
export function drawAngerMark(
  g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, color: number, alpha: number,
  width = Math.max(1.2, s * 0.32),
): void {
  if (alpha <= 0.01 || s <= 0.3) return;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const cx = x + sx * s, cy = y + sy * s;
    // The arc of a circle centred on the outer corner, the quarter that faces the middle.
    const face = Math.atan2(-sy, -sx);
    g.lineStyle(width * 1.9, RAGE.char, alpha * 0.55);
    g.beginPath();
    g.arc(cx, cy, s * 0.82, face - 0.62, face + 0.62, false);
    g.strokePath();
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.arc(cx, cy, s * 0.82, face - 0.62, face + 0.62, false);
    g.strokePath();
  }
}

/**
 * Rage's replacement for `boltLayered`: a heat streak. Wide crimson haze, a blood-red body, a
 * searing orange line and a near-white filament, with heat blisters along it and — on a big
 * enough bolt, now and then — a vein mark flaring off a kink.
 */
export function rageBolt(
  g: Phaser.GameObjects.Graphics, tint: ColorFn, tones: BoltTones,
  raw: Pt[], width: number, alpha: number, opts: BoltLayerOpts = {},
): void {
  if (raw.length < 2) return;
  const pts = smooth(raw);
  const throb = 0.85 + Math.random() * 0.3;

  // Forks become short heat cracks: one body stroke and a hot thread, no corona.
  const forks = opts.branches ?? 0;
  for (let i = 0; i < forks && pts.length > 2; i++) {
    const root = pts[1 + Math.floor(Math.random() * (pts.length - 2))];
    const tail = pts[pts.length - 1], head = pts[0];
    const base = Math.atan2(tail.y - head.y, tail.x - head.x);
    const ang = base + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.7);
    const len = Math.hypot(tail.x - head.x, tail.y - head.y) * (0.12 + Math.random() * 0.16);
    const mx = root.x + Math.cos(ang) * len * 0.55 + (Math.random() - 0.5) * len * 0.3;
    const my = root.y + Math.sin(ang) * len * 0.55 + (Math.random() - 0.5) * len * 0.3;
    const crack: Pt[] = [root, { x: mx, y: my }, { x: root.x + Math.cos(ang) * len, y: root.y + Math.sin(ang) * len }];
    g.lineStyle(width * 1.2, tint(tones.body), alpha * 0.55);
    trace(g, crack);
    g.lineStyle(width * 0.45, tint(tones.hot), alpha * 0.85);
    trace(g, crack);
  }

  g.lineStyle(width * 4.2 * throb, tint(tones.glow), alpha * 0.16);
  trace(g, pts);
  g.lineStyle(width * 2.3, tint(tones.shell), alpha * 0.45);
  trace(g, pts);
  g.lineStyle(width * 1.6, tint(tones.body), alpha * 0.75);
  trace(g, pts);
  g.lineStyle(width * 0.85, tint(tones.hot), alpha * 0.95);
  trace(g, pts);
  g.lineStyle(width * 0.32, tint(tones.core), alpha);
  trace(g, pts);

  if (opts.nodes !== false) {
    // Heat blisters: swollen, not pinpricks, so the streak reads as something boiling.
    for (let i = 1; i < pts.length - 1; i += 3) {
      g.fillStyle(tint(tones.body), alpha * 0.6);
      g.fillCircle(pts[i].x, pts[i].y, width * 1.25 * throb);
      g.fillStyle(tint(tones.core), alpha * 0.85);
      g.fillCircle(pts[i].x - width * 0.2, pts[i].y - width * 0.25, width * 0.45);
    }
  }
  if (width >= 2 && pts.length > 3 && Math.random() < 0.06) {
    const p = pts[1 + Math.floor(Math.random() * (pts.length - 2))];
    drawAngerMark(g, p.x + width * 2.5, p.y - width * 3, 3 + width * 0.8, tint(tones.hot), alpha);
  }
}

// ── One-shots, run on any FxBase so a preview sink still catches them ────────

/** Steam puffing off something too hot to touch: grey-pink balls that rise, swell and thin. */
export function rageSteam(
  fx: FxBase, x: number, y: number, count: number,
  opts: { spread?: number; rise?: number; size?: number; life?: number; depth?: number } = {},
): void {
  const spread = opts.spread ?? 10;
  const rise = opts.rise ?? 34;
  const size = opts.size ?? 4;
  const life = opts.life ?? 700;
  const puffs = Array.from({ length: count }, () => ({
    ox: (Math.random() - 0.5) * spread * 2,
    oy: (Math.random() - 0.5) * spread * 0.6,
    drift: (Math.random() - 0.5) * 26,
    r: size * (0.7 + Math.random() * 0.6),
    delay: Math.random() * 0.3,
  }));
  fx.anim(opts.depth ?? 8, life, (g, t) => {
    for (const p of puffs) {
      const lt = (t - p.delay) / (1 - p.delay);
      if (lt <= 0) continue;
      const px = x + p.ox + p.drift * easeOut(lt);
      const py = y + p.oy - rise * easeOut(lt);
      const r = p.r * (1 + lt * 1.8);
      const fade = (1 - lt) * Math.min(1, lt * 6);
      g.fillStyle(RAGE.steamDim, 0.32 * fade);
      g.fillCircle(px + r * 0.25, py + r * 0.2, r);
      g.fillStyle(RAGE.steam, 0.5 * fade);
      g.fillCircle(px, py, r * 0.85);
    }
  });
}

/** A vein mark that pops in over a head, wobbles, and fades. */
export function rageMark(fx: FxBase, x: number, y: number, size = 6, depth = 9, life = 620): void {
  const spin = (Math.random() - 0.5) * 0.4;
  fx.anim(depth, life, (g, t) => {
    const pop = t < 0.18 ? easeOut(t / 0.18) * 1.25 : 1.25 - Math.min(0.25, (t - 0.18) * 1.2);
    const s = size * pop * (1 + Math.sin(t * 40) * 0.06);
    const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    drawAngerMark(g, x + spin * 10 * t, y - 6 * t, s, RAGE.hot, fade);
  });
}

/** Seething blast extras for Rage's discharges: a ring of steam and marks thrown off the rim. */
export function rageBlast(fx: FxBase, x: number, y: number, radius: number): void {
  rageSteam(fx, x, y, Math.max(4, Math.round(radius / 10)), {
    spread: radius * 0.6, rise: 30 + radius * 0.25, size: 4 + radius / 30, life: 900, depth: 7,
  });
  const marks = radius > 50 ? 3 : radius > 25 ? 2 : 1;
  for (let i = 0; i < marks; i++) {
    const a = (i / marks) * TAU + Math.random() * 0.8 - Math.PI / 2;
    rageMark(fx, x + Math.cos(a) * radius * 0.55, y + Math.sin(a) * radius * 0.4 - 6, 5 + radius / 25, 9);
  }
}

// ── Rage meter ───────────────────────────────────────────────────────────────

/**
 * Kinetic power, read as rage: a swollen vein of a gauge with a vein-mark bulb on the left, a
 * fill that boils from blood-red to white-hot, bubbles rising through it, and — at full — the
 * whole gauge shaking with steam venting off the end. Same footprint as the battery it replaces.
 */
export function drawRageMeter(
  g: Phaser.GameObjects.Graphics, cx: number, cy: number, frac: number, t: number, mastered: boolean,
): void {
  const f = Phaser.Math.Clamp(frac, 0, 1);
  const full = f >= 0.999;
  const shake = full ? (Math.random() - 0.5) * 2.2 : f > 0.7 ? (Math.random() - 0.5) * 0.9 : 0;
  const w = 148, h = 20;
  const l = cx - w / 2 + shake, top = cy - h / 2 + shake * 0.5;
  const mid = top + h / 2;

  if (f > 0.05) {
    g.fillStyle(RAGE.red, (0.08 + f * 0.18) * (full ? 0.8 + 0.2 * Math.sin(t * 10) : 1));
    g.fillRoundedRect(l - 14, top - 6, w + 26, h + 12, 12);
  }
  // Casing: shadow, char-black tube with a blood rim.
  g.fillStyle(0x000000, 0.45);
  g.fillRoundedRect(l + 2, top + 3, w, h, h / 2);
  g.fillStyle(RAGE.char, 0.97);
  g.fillRoundedRect(l, top, w, h, h / 2);
  g.lineStyle(1.6, mastered ? RAGE.flare : RAGE.crimson, 0.95);
  g.strokeRoundedRect(l, top, w, h, h / 2);

  // Fill: a molten column whose top edge throbs like a pulse.
  const iw = w - 8, ih = h - 8;
  const fw = iw * f;
  if (fw > 1) {
    const x0 = l + 4;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const u0 = i / steps, u1 = (i + 1) / steps;
      if (u0 * iw >= fw) break;
      const seg = Math.min(fw, u1 * iw) - u0 * iw;
      const col = u1 > 0.85 ? RAGE.flare : u1 > 0.6 ? RAGE.searing : u1 > 0.35 ? RAGE.hot : RAGE.red;
      g.fillStyle(col, 0.95);
      g.fillRect(x0 + u0 * iw, top + 4, seg, ih);
    }
    // Pulse: a brighter band beating along the filled part, faster the angrier.
    const beat = (t * (1.2 + f * 2.6)) % 1;
    g.fillStyle(RAGE.white, 0.35 * (1 - beat));
    g.fillRect(x0 + fw * beat - 3, top + 4, 6, ih);
    g.fillStyle(RAGE.white, 0.3);
    g.fillRect(x0, top + 4, fw, 1.6);
    // Bubbles boiling up through it.
    for (let i = 0; i < 6; i++) {
      const bx = x0 + ((i * 37 + Math.floor(t * 3 + i)) % 100) / 100 * fw;
      const p = (t * 1.7 + i * 0.37) % 1;
      g.fillStyle(RAGE.white, 0.55 * (1 - p));
      g.fillCircle(bx, top + 4 + ih * (1 - p), 1.1 + f);
    }
  }
  // A vein bulging along the top of the casing, thicker as it fills.
  g.lineStyle(1.2 + f * 1.6, RAGE.vein, 0.35 + f * 0.5);
  g.beginPath();
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    const vx = l + 14 + u * (w - 24);
    const vy = top - 1 + Math.sin(u * 9 + t * 4 * f) * (1 + f * 1.5);
    if (i === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
  }
  g.strokePath();

  // Bulb on the left: a hot knot with the vein mark on it.
  const bx = l - 4, by = mid;
  g.fillStyle(RAGE.char, 1);
  g.fillCircle(bx, by, 12);
  g.fillStyle(f > 0.5 ? RAGE.hot : RAGE.crimson, 1);
  g.fillCircle(bx, by, 9.5);
  g.lineStyle(1.4, mastered ? RAGE.flare : RAGE.crimson, 1);
  g.strokeCircle(bx, by, 12);
  drawAngerMark(g, bx, by, 3.6 * (1 + (full ? 0.15 * Math.sin(t * 20) : 0)), RAGE.white, 1, 1.6);

  // Full: steam venting hard off the far end.
  if (full) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 1.6 + i / 4) % 1;
      const sx = l + w + 4 + p * 14 + Math.sin(t * 6 + i) * 2;
      const sy = mid - p * 18;
      g.fillStyle(RAGE.steam, 0.55 * (1 - p));
      g.fillCircle(sx, sy, 3 + p * 5);
    }
  }
}
