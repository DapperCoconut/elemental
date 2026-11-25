import Phaser from 'phaser';
import { TAU, easeOut } from './ElementVisuals';
import { AIR, AirColorFn, AirFx, drawAirKnife, windCurl } from './AirVisuals';

/**
 * Everything the assassin's abilities draw: the clouds, the stab and the scar it leaves, Knock's
 * blast and the winded gauge, the precipitation cloak, the Combo's timing ring, knives in flight
 * and in the ground, and the Tornado Blade.
 *
 * Two kinds of thing live here. `draw*` functions paint one frame onto a Graphics the kit owns
 * and clears itself. The `*Burst` functions are one-shots: they take an `AirFx` (so a skin's
 * effects class and its sink are honoured) and run on its tween-backed `anim`.
 *
 * Colours come from the AIR palette only, through the owner's mapper.
 */

type Gfx = Phaser.GameObjects.Graphics;

/** Cheap repeatable noise in 0–1 from an integer seed. */
function rnd(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// ── Clouds ────────────────────────────────────────────────────────────────

/**
 * One cloud: a heap of overlapping lobes on a flat base, lit from above. `solid` is the enemy's
 * view — a bank you cannot see into; otherwise it is a veil the owner looks straight through,
 * with only its outline and a little glitter left. `leaving` (0–1) stretches it along the wind
 * as it is torn away.
 */
export function drawCloud(
  g: Gfx, tint: AirColorFn,
  x: number, y: number, r: number,
  t: number, seed: number,
  solid: boolean, alpha: number, leaving = 0,
): void {
  if (alpha <= 0.01) return;
  const lobes = 7;
  const stretch = 1 + leaving * 0.9;
  const body = solid ? 0.97 : 0.2;

  // The shade it drops on the floor.
  g.fillStyle(tint(AIR.void), alpha * (solid ? 0.3 : 0.1));
  g.fillEllipse(x + 6, y + r * 0.5, r * 2 * stretch, r * 0.5);

  // Back row, darker: the underside.
  for (let i = 0; i < lobes; i++) {
    const f = i / (lobes - 1);
    const lx = x + (f - 0.5) * r * 1.7 * stretch;
    const lr = r * (0.36 + 0.2 * rnd(seed + i)) * (1 + 0.04 * Math.sin(t * 0.9 + i));
    g.fillStyle(tint(AIR.steel), alpha * body);
    g.fillEllipse(lx, y + r * 0.16, lr * 2 * stretch, lr * 1.3);
  }
  // Front row, the lit tops, heaped toward the middle.
  for (let i = 0; i < lobes; i++) {
    const f = i / (lobes - 1);
    const heap = Math.sin(f * Math.PI);
    const lx = x + (f - 0.5) * r * 1.55 * stretch + Math.sin(t * 0.5 + i * 2) * 2;
    const ly = y - r * 0.12 - heap * r * 0.26;
    const lr = r * (0.3 + 0.24 * heap + 0.1 * rnd(seed + 20 + i));
    g.fillStyle(tint(AIR.mist), alpha * body);
    g.fillEllipse(lx, ly, lr * 2 * stretch, lr * 1.5);
    g.fillStyle(tint(AIR.white), alpha * (solid ? 0.9 : 0.16));
    g.fillEllipse(lx - lr * 0.15, ly - lr * 0.28, lr * 1.2 * stretch, lr * 0.7);
  }
  if (!solid) {
    // The owner's view: an outline to stand inside, and glitter where the vapour is.
    g.lineStyle(1.4, tint(AIR.white), alpha * 0.4);
    g.strokeEllipse(x, y, r * 2 * stretch, r * 1.24);
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.35 + rnd(seed + 40 + i)) % 1;
      const sx = x + (rnd(seed + 50 + i) - 0.5) * r * 1.5, sy = y + (rnd(seed + 60 + i) - 0.5) * r * 0.8;
      g.fillStyle(tint(AIR.white), alpha * 0.8 * Math.sin(p * Math.PI));
      g.fillCircle(sx, sy, 1.3);
    }
  }
}

/** The stealth gauge under the assassin's feet: an arc that fills, with a tick at the halfway mark. */
export function drawStealthGauge(
  g: Gfx, tint: AirColorFn, x: number, y: number, stealth01: number, inCloud: boolean, t: number, alpha: number,
): void {
  const r = 30;
  const from = Math.PI * 0.15, to = Math.PI * 0.85;
  g.lineStyle(3.5, tint(AIR.void), alpha * 0.55);
  g.beginPath(); g.arc(x, y, r, from, to); g.strokePath();
  if (stealth01 > 0.005) {
    const over = stealth01 > 0.5;
    g.lineStyle(3.5, tint(over ? AIR.white : AIR.blue), alpha * (0.85 + (inCloud ? 0.15 * Math.sin(t * 8) : 0)));
    g.beginPath(); g.arc(x, y, r, to - (to - from) * stealth01, to); g.strokePath();
  }
  // Halfway: past this, the stab is the big one.
  const mid = (from + to) / 2;
  g.lineStyle(1.6, tint(AIR.charge), alpha * 0.9);
  g.lineBetween(x + Math.cos(mid) * (r - 4), y + Math.sin(mid) * (r - 4), x + Math.cos(mid) * (r + 4), y + Math.sin(mid) * (r + 4));
}

/** Wisps clinging to a stealthy body — more of them, and tighter, the more stealth is banked. */
export function drawStealthWisps(g: Gfx, tint: AirColorFn, x: number, y: number, stealth01: number, t: number, alpha: number): void {
  const n = Math.round(stealth01 * 5);
  for (let i = 0; i < n; i++) {
    const p = t * (1.6 + i * 0.25) + (i / 5) * TAU;
    const px = x + Math.cos(p) * 27, py = y + 4 + Math.sin(p) * 11;
    g.fillStyle(tint(i % 2 ? AIR.mist : AIR.sky), alpha * 0.55);
    windCurl(g, px, py, Math.atan2(Math.cos(p) * 11, -Math.sin(p) * 27), 15, 2.6, 0.5);
  }
}

// ── Click: Pierce the Skies ───────────────────────────────────────────────

/**
 * The stab. `power` is stealth 0–1: a plain thrust at nothing, and past a half the whole
 * production — the sky opening along the line, gusts thrown off both sides, dust off the floor.
 */
export function pierceBurst(
  fx: AirFx, tint: AirColorFn, x0: number, y0: number, ang: number, len: number, power: number, backstab: boolean,
): void {
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const big = power > 0.5;
  const x1 = x0 + c * len, y1 = y0 + s * len;

  // The thrust itself: a needle of pressure along the line, gone in a blink.
  fx.anim(7, big ? 300 : 190, (g, t) => {
    const a = 1 - t;
    const w = (big ? 15 : 7) * (1 - t * 0.6);
    g.fillStyle(tint(AIR.white), a * 0.9);
    g.beginPath();
    g.moveTo(x0 + nx * w, y0 + ny * w);
    g.lineTo(x1 + c * 30, y1 + s * 30);
    g.lineTo(x0 - nx * w, y0 - ny * w);
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(AIR.sky), a * 0.45);
    g.beginPath();
    g.moveTo(x0 + nx * w * 2.2, y0 + ny * w * 2.2);
    g.lineTo(x1 + c * 16, y1 + s * 16);
    g.lineTo(x0 - nx * w * 2.2, y0 - ny * w * 2.2);
    g.closePath();
    g.fillPath();
    drawAirKnife(g, tint, x1 - c * 6, y1 - s * 6, ang, big ? 46 : 30, a, t * 4);
    if (backstab) {
      g.lineStyle(3, tint(AIR.charge), a);
      g.strokeCircle(x1, y1, 16 + t * 26);
    }
  });
  if (!big) {
    fx.motes(x1, y1, 4, { angle: ang, spread: 0.7, speed: 140, size: 2.2, life: 260, depth: 6 });
    return;
  }

  // Gusts off both sides, staggered down the line: each a pair of curls thrown outward.
  const steps = Math.max(4, Math.round(len / 46));
  const reach = 60 + power * 70;
  fx.anim(6, 620, (g, t) => {
    for (let i = 0; i < steps; i++) {
      const f = (i + 0.5) / steps;
      const lt = Phaser.Math.Clamp(t * 1.5 - f * 0.5, 0, 1);
      if (lt <= 0 || lt >= 1) continue;
      const px = x0 + c * len * f, py = y0 + s * len * f;
      const out = easeOut(lt) * reach;
      for (const side of [-1, 1]) {
        const gx = px + nx * side * (10 + out * 0.5), gy = py + ny * side * (10 + out * 0.5);
        const ga = ang + side * (Math.PI / 2 - 0.5);
        g.fillStyle(tint(AIR.steel), (1 - lt) * 0.4);
        windCurl(g, gx, gy, ga, 30 + out * 0.5, 9, side * 0.9);
        g.fillStyle(tint(i % 2 ? AIR.mist : AIR.white), (1 - lt) * 0.9);
        windCurl(g, gx, gy, ga, 26 + out * 0.45, 5, side * 0.9);
      }
    }
    // The pressure front leaving the far end.
    const ft = easeOut(t);
    g.lineStyle(4 * (1 - t), tint(AIR.white), (1 - t) * 0.9);
    g.beginPath();
    g.arc(x1, y1, 20 + ft * 90, ang - 0.9, ang + 0.9);
    g.strokePath();
  });
  // Dust kicked up off the floor along both edges.
  for (let i = 0; i < steps; i++) {
    const f = (i + 0.5) / steps;
    const px = x0 + c * len * f, py = y0 + s * len * f;
    for (const side of [-1, 1]) {
      fx.motes(px + nx * side * 12, py + ny * side * 12, 2, {
        angle: ang + side * 1.3, spread: 0.6, speed: 120 + power * 120, size: 3, life: 520, swirl: 1.2, depth: 4,
      });
    }
  }
  fx.dustMark(x0, y0, 30);
  fx.gustBurst(x1, y1, 70 + power * 40, { duration: 420 });
  fx.flash(x1, y1, 30);
}

/** The line a big stab leaves in the floor: a gouge with raised lips, fading from the near end. */
export function drawScar(
  g: Gfx, tint: AirColorFn, x0: number, y0: number, x1: number, y1: number, life01: number,
): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const a = Math.min(1, life01 * 2.2);
  const len = Math.hypot(x1 - x0, y1 - y0);
  g.lineStyle(9, tint(AIR.void), a * 0.34);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(3.2, tint(AIR.void), a * 0.75);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(1.2, tint(AIR.mist), a * 0.85);
  g.lineBetween(x0 + nx * 3, y0 + ny * 3, x1 + nx * 2, y1 + ny * 2);
  // Chips thrown out along it.
  const n = Math.round(len / 34);
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const side = i % 2 ? 1 : -1;
    const px = x0 + (x1 - x0) * f + nx * side * (7 + rnd(i) * 7), py = y0 + (y1 - y0) * f + ny * side * (7 + rnd(i) * 7);
    g.fillStyle(tint(AIR.slate), a * 0.7);
    g.fillTriangle(px, py - 2.5, px + 3, py + 1.5, px - 2.5, py + 1.5);
  }
  // Air still pouring out of the cut while it is fresh.
  if (life01 > 0.6) {
    const k = (life01 - 0.6) / 0.4;
    g.lineStyle(2, tint(AIR.white), k * 0.8);
    g.lineBetween(x0, y0, x1, y1);
  }
}

/** One jab of the held barrage: a short knife flick and a thread of air. */
export function jabFlick(fx: AirFx, tint: AirColorFn, x: number, y: number, ang: number, reach: number): void {
  fx.anim(7, 120, (g, t) => {
    const d = reach * (0.45 + 0.55 * easeOut(t));
    drawAirKnife(g, tint, x + Math.cos(ang) * (d - 22), y + Math.sin(ang) * (d - 22), ang, 22, 1 - t * 0.7, t * 3);
    g.lineStyle(1.6, tint(AIR.white), (1 - t) * 0.8);
    g.lineBetween(x + Math.cos(ang) * 16, y + Math.sin(ang) * 16, x + Math.cos(ang) * d, y + Math.sin(ang) * d);
  });
}

// ── E: Knock ──────────────────────────────────────────────────────────────

/** A fist of air: a short, dense cone with a hard front and rings punched through it. */
export function knockBlast(fx: AirFx, tint: AirColorFn, x: number, y: number, ang: number, range: number, half: number): void {
  fx.anim(7, 300, (g, t) => {
    const d = range * easeOut(t);
    const a = 1 - t;
    g.fillStyle(tint(AIR.mist), a * 0.5);
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, d, ang - half, ang + half);
    g.closePath();
    g.fillPath();
    g.lineStyle(6 * a + 1, tint(AIR.white), a);
    g.beginPath(); g.arc(x, y, d, ang - half, ang + half); g.strokePath();
    for (let i = 0; i < 3; i++) {
      const rt = Phaser.Math.Clamp(t * 1.4 - i * 0.18, 0, 1);
      if (rt <= 0) continue;
      const cx = x + Math.cos(ang) * range * (0.3 + i * 0.25) * rt, cy = y + Math.sin(ang) * range * (0.3 + i * 0.25) * rt;
      g.lineStyle(2.4, tint(AIR.sky), (1 - rt) * 0.9);
      g.strokeEllipse(cx, cy, (10 + i * 8) * (0.4 + rt), (26 + i * 14) * (0.4 + rt));
    }
  });
  fx.muzzleGust(x + Math.cos(ang) * 18, y + Math.sin(ang) * 18, ang, 1.5);
  fx.motes(x + Math.cos(ang) * range * 0.7, y + Math.sin(ang) * range * 0.7, 8, {
    angle: ang, spread: 1, speed: 220, size: 2.6, life: 360, depth: 6,
  });
}

/**
 * Winded, over a victim's head: the stamina gauge, and breath puffing out of them. An exhausted
 * victim's gauge flashes and refills in a different colour, because they cannot use it yet.
 */
export function drawWinded(
  g: Gfx, tint: AirColorFn, x: number, y: number, stamina: number, exhausted: boolean, t: number, seed: number,
): void {
  const w = 38, h = 5, bx = x - w / 2, by = y - 46;
  g.fillStyle(tint(AIR.void), 0.8);
  g.fillRoundedRect(bx - 1.5, by - 1.5, w + 3, h + 3, 2.5);
  const blink = exhausted ? 0.55 + 0.45 * Math.sin(t * 14) : 1;
  g.fillStyle(tint(exhausted ? AIR.slate : stamina < 0.3 ? AIR.charge : AIR.white), blink);
  g.fillRoundedRect(bx, by, Math.max(1, w * Phaser.Math.Clamp(stamina, 0, 1)), h, 2);
  // Gasps: small puffs leaving the mouth, faster the emptier they are.
  const rate = exhausted ? 3.2 : 1.4 + (1 - stamina) * 1.6;
  for (let i = 0; i < 2; i++) {
    const p = (t * rate + i * 0.5 + rnd(seed)) % 1;
    const px = x + (i ? 9 : -9) + Math.sin(p * 5 + i) * 3, py = y - 8 - p * 20;
    g.fillStyle(tint(AIR.mist), (1 - p) * 0.75);
    g.fillCircle(px, py, 2 + p * 3.5);
  }
}

// ── R: Cloud Cover ────────────────────────────────────────────────────────

/**
 * The cloak of precipitation, as its wearer sees it: a turning shroud of vapour bands and
 * falling glitter round a body that is otherwise gone. `hp01` thins it as it is worn down.
 */
export function drawCover(g: Gfx, tint: AirColorFn, x: number, y: number, t: number, hp01: number, alpha: number): void {
  const bands = 2 + Math.round(hp01 * 3);
  for (let i = 0; i < bands; i++) {
    const p = t * (1.3 + i * 0.2) + (i / bands) * TAU;
    for (const half of [0, Math.PI]) {
      const q = p + half;
      const px = x + Math.cos(q) * 26, py = y - 12 + i * 7 + Math.sin(q) * 7;
      g.fillStyle(tint(i % 2 ? AIR.mist : AIR.frost), alpha * (0.3 + 0.25 * hp01) * (Math.sin(q) > 0 ? 1 : 0.5));
      windCurl(g, px, py, Math.atan2(Math.cos(q) * 7, -Math.sin(q) * 26), 26, 4.5, 0.45);
    }
  }
  // Drops and sparkle coming off it.
  for (let i = 0; i < 9; i++) {
    const p = (t * 0.9 + rnd(i * 3.3)) % 1;
    const px = x + (rnd(i) - 0.5) * 50, py = y - 24 + p * 46;
    const tw = Math.sin((t * 6 + i) * 1.7);
    g.fillStyle(tint(AIR.white), alpha * (0.35 + 0.55 * Math.max(0, tw)) * Math.sin(p * Math.PI));
    if (i % 3 === 0) {
      // A four-point glint.
      g.fillTriangle(px - 3.5, py, px + 3.5, py, px, py - 1);
      g.fillTriangle(px, py - 3.5, px, py + 3.5, px - 1, py);
    } else {
      g.fillEllipse(px, py, 1.6, 3.6);
    }
  }
}

/** The cloak going on, or being torn off. */
export function coverBurst(fx: AirFx, tint: AirColorFn, x: number, y: number, broke: boolean): void {
  fx.anim(7, broke ? 420 : 520, (g, t) => {
    const k = broke ? easeOut(t) : 1 - easeOut(t);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + t * (broke ? 1 : -3);
      const d = 14 + k * 60;
      g.fillStyle(tint(i % 2 ? AIR.mist : AIR.white), (broke ? 1 - t : 0.3 + t * 0.6) * 0.9);
      windCurl(g, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.7, ang + Math.PI / 2, 30, 5, 0.9);
    }
  });
  fx.motes(x, y, broke ? 14 : 8, { speed: broke ? 200 : 60, size: 2.4, life: 480, swirl: 2.4, depth: 7 });
  if (broke) fx.ring(x, y, 10, 70, AIR.white, 360, 3, 7);
}

// ── F: Combo ──────────────────────────────────────────────────────────────

/**
 * The timing ring: a bare white circle closing on the assassin, and the thin mark it has to
 * reach. `state` is 'live' while it can still be answered, 'hit' and 'miss' for the instant after.
 */
export function drawTimingRing(
  g: Gfx, tint: AirColorFn, x: number, y: number, r: number, markR: number, inWindow: boolean, alpha: number,
): void {
  g.lineStyle(1.4, tint(AIR.white), alpha * 0.55);
  g.strokeCircle(x, y, markR);
  g.lineStyle(inWindow ? 5 : 3.2, tint(inWindow ? AIR.charge : AIR.white), alpha);
  g.strokeCircle(x, y, Math.max(markR * 0.6, r));
}

/** The ring's verdict: a clean snap outward on a hit, a broken red-less scatter on a miss. */
export function ringVerdict(fx: AirFx, tint: AirColorFn, x: number, y: number, r: number, hit: boolean): void {
  fx.anim(9, hit ? 300 : 380, (g, t) => {
    if (hit) {
      g.lineStyle(5 * (1 - t), tint(AIR.charge), 1 - t);
      g.strokeCircle(x, y, r + easeOut(t) * 36);
      g.lineStyle(2, tint(AIR.white), 1 - t);
      g.strokeCircle(x, y, r + easeOut(t) * 18);
    } else {
      // Missed: the circle falls apart in dull segments.
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * TAU + 0.1;
        const d = r + t * 16, drop = t * t * 22;
        g.lineStyle(3 * (1 - t), tint(AIR.slate), 1 - t);
        g.beginPath();
        g.arc(x, y + drop, d, a0, a0 + 0.5);
        g.strokePath();
      }
    }
  });
}

/** The flip into the air: a corkscrew of wind where she left the ground. */
export function flipBurst(fx: AirFx, tint: AirColorFn, x: number, y: number, lift: number): void {
  fx.anim(7, 520, (g, t) => {
    for (let i = 0; i < 5; i++) {
      const f = Phaser.Math.Clamp(t * 1.3 - i * 0.08, 0, 1);
      if (f <= 0 || f >= 1) continue;
      const py = y - f * lift;
      const w = 30 * (1 - f * 0.6);
      g.lineStyle(2.6 * (1 - f), tint(i % 2 ? AIR.white : AIR.sky), (1 - f) * 0.9);
      g.strokeEllipse(x + Math.sin(f * 9 + i) * 6, py, w * 2, w * 0.6);
    }
  });
  fx.dustMark(x, y, 34);
  fx.gustBurst(x, y, 70, { duration: 380 });
}

/** The shadow a levitating body leaves on the floor, and the thread of wind holding her up. */
export function drawLevitation(g: Gfx, tint: AirColorFn, x: number, y: number, lift: number, t: number, alpha: number): void {
  g.fillStyle(tint(AIR.void), alpha * 0.4);
  g.fillEllipse(x, y + 10, 34 - lift * 0.08, 12 - lift * 0.03);
  for (let i = 0; i < 4; i++) {
    const p = (t * 1.6 + i / 4) % 1;
    const py = y + 6 - p * lift;
    g.lineStyle(1.6, tint(AIR.mist), alpha * 0.55 * Math.sin(p * Math.PI));
    g.strokeEllipse(x + Math.sin(p * 7 + i) * 4, py, 26 * (1 - p * 0.5), 7 * (1 - p * 0.5));
  }
}

export interface FieldKnife { dx: number; dy: number; lean: number; delay: number }

/**
 * The dagger field: knives standing in the floor in ranks, each with a crack under it and a
 * shadow beside it. `age` (ms) drives the fall — every knife drops out of the sky on its own
 * delay — and `fade` (0–1) takes the whole field away at the end.
 */
export function drawDaggerField(
  g: Gfx, tint: AirColorFn,
  x: number, y: number, halfW: number, halfH: number,
  knives: FieldKnife[], age: number, fade: number, t: number,
): void {
  // The marked ground.
  g.fillStyle(tint(AIR.steel), 0.1 * fade);
  g.fillRoundedRect(x - halfW, y - halfH, halfW * 2, halfH * 2, 8);
  g.lineStyle(1.4, tint(AIR.white), (0.35 + 0.15 * Math.sin(t * 4)) * fade);
  g.strokeRoundedRect(x - halfW, y - halfH, halfW * 2, halfH * 2, 8);

  for (const k of knives) {
    const kx = x + k.dx, ky = y + k.dy;
    const fall = Phaser.Math.Clamp((age - k.delay) / 160, 0, 1);
    if (fall <= 0) continue;
    const down = Math.PI / 2 + k.lean;
    if (fall < 1) {
      // Still falling: a streak from above.
      const hy = ky - (1 - fall) * 260;
      g.lineStyle(2, tint(AIR.white), 0.7);
      g.lineBetween(kx, hy - 40, kx, hy);
      drawAirKnife(g, tint, kx - Math.cos(down) * 24, hy - Math.sin(down) * 24, down, 24, 1, t);
      continue;
    }
    // Planted: crack, shadow, then the knife standing out of the floor, humming a little.
    g.lineStyle(1.2, tint(AIR.void), 0.7 * fade);
    g.lineBetween(kx - 6, ky + 1, kx + 7, ky - 1);
    g.lineBetween(kx - 1, ky - 4, kx + 2, ky + 5);
    g.fillStyle(tint(AIR.void), 0.3 * fade);
    g.fillEllipse(kx + 7, ky + 3, 16, 5);
    const hum = Math.sin(t * 22 + k.dx) * 0.03 * Math.max(0, 1 - (age - k.delay - 160) / 500);
    const up = -Math.PI / 2 + k.lean + hum;
    // Drawn point-down: grip in the air, tip in the ground.
    drawAirKnife(g, tint, kx + Math.cos(up) * 22, ky + Math.sin(up) * 22, up + Math.PI, 22, fade, t);
  }
}

/** A volley knife landing on something, or the field's first strike. */
export function knifeHit(fx: AirFx, x: number, y: number, ang: number): void {
  fx.motes(x, y, 4, { angle: ang + Math.PI, spread: 1.2, speed: 150, size: 2.2, life: 260, depth: 7 });
  fx.ring(x, y, 4, 22, AIR.white, 200, 2, 7);
}

// ── Q: Tornado Blade ──────────────────────────────────────────────────────

/**
 * The spinning top. Seen from above: a disc of wound air, four wind fans laid out as its blades,
 * a bright bolt at the hub, and the funnel standing over it. `stamina01` is the ring round the
 * rim — the thing the whole transformation runs on. `shred` (0–1) pulls it tight and white while
 * it is grinding inside somebody.
 */
export function drawBey(
  g: Gfx, tint: AirColorFn, x: number, y: number, spin: number, t: number,
  stamina01: number, shred: number, tilt: number, alpha: number,
): void {
  const R = 30;
  // Floor shade and the scuff ring it is cutting.
  g.fillStyle(tint(AIR.void), alpha * 0.4);
  g.fillEllipse(x, y + 12, R * 2.2, R * 0.7);

  // The funnel above the top: stacked rings, offset by the lean.
  for (let i = 5; i >= 1; i--) {
    const f = i / 5;
    const ry = y - 8 - f * 46;
    const rr = R * (0.5 + f * 0.75);
    g.lineStyle(3 - f * 1.4, tint(i % 2 ? AIR.mist : AIR.sky), alpha * (0.5 - f * 0.3 + shred * 0.2));
    g.beginPath();
    g.arc(x + tilt * f * 16 + Math.sin(t * 6 + i) * 3, ry, rr, spin * 0.6 + i, spin * 0.6 + i + 4.2);
    g.strokePath();
  }

  // Disc.
  g.fillStyle(tint(AIR.storm), alpha * 0.95);
  g.fillCircle(x, y, R);
  g.fillStyle(tint(AIR.sky), alpha * 0.95);
  g.fillCircle(x, y, R - 4);

  // Four wind fans as blades — each a pleated wedge swept back against the spin.
  for (let i = 0; i < 4; i++) {
    const a = spin + (i / 4) * TAU;
    const tipA = a + 0.75;
    g.fillStyle(tint(i % 2 ? AIR.mist : AIR.white), alpha);
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
    g.lineTo(x + Math.cos(a - 0.1) * (R + 9), y + Math.sin(a - 0.1) * (R + 9));
    g.lineTo(x + Math.cos(tipA) * (R + 3), y + Math.sin(tipA) * (R + 3));
    g.closePath();
    g.fillPath();
    g.lineStyle(1, tint(AIR.steel), alpha * 0.9);
    for (let k = 1; k <= 2; k++) {
      const ra = a + (k / 3) * 0.75;
      g.lineBetween(x + Math.cos(a) * 7, y + Math.sin(a) * 7, x + Math.cos(ra) * (R + 4), y + Math.sin(ra) * (R + 4));
    }
  }
  // Speed streaks round the rim.
  for (let i = 0; i < 3; i++) {
    const a = -spin * 0.5 + (i / 3) * TAU;
    g.lineStyle(2, tint(AIR.white), alpha * 0.7);
    g.beginPath(); g.arc(x, y, R + 12 + i * 3, a, a + 1.1); g.strokePath();
  }
  // Stamina, round the rim.
  g.lineStyle(3, tint(AIR.void), alpha * 0.6);
  g.strokeCircle(x, y, R - 2);
  g.lineStyle(3, tint(stamina01 < 0.25 ? AIR.charge : AIR.cyan), alpha);
  g.beginPath(); g.arc(x, y, R - 2, -Math.PI / 2, -Math.PI / 2 + TAU * Phaser.Math.Clamp(stamina01, 0, 1)); g.strokePath();
  // Hub bolt.
  g.fillStyle(tint(AIR.slate), alpha);
  g.fillCircle(x, y, 8);
  g.fillStyle(tint(AIR.charge), alpha);
  g.fillCircle(x, y, 4.5);
  g.fillStyle(tint(AIR.white), alpha);
  g.fillCircle(x - 1.5, y - 1.5, 1.6);

  if (shred > 0.01) {
    g.lineStyle(4, tint(AIR.white), alpha * shred);
    g.strokeCircle(x, y, R + 6 + Math.sin(t * 40) * 3);
  }
}

export interface SparkPoint { x: number; y: number; at: number }

/** The line of sparks the Blade drags across the floor: a hot core that cools along its length. */
export function drawSparkTrail(g: Gfx, tint: AirColorFn, pts: SparkPoint[], now: number, life: number): void {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const k = 1 - (now - b.at) / life;
    if (k <= 0) continue;
    g.lineStyle(6 * k, tint(AIR.charge), k * 0.3);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(2.2 * k + 0.4, tint(k > 0.6 ? AIR.white : AIR.bolt), k);
    g.lineBetween(a.x, a.y, b.x, b.y);
    // Sparks jumping off the line.
    if (i % 2 === 0) {
      const j = rnd(b.at + i);
      const up = (1 - k) * 16;
      g.fillStyle(tint(AIR.charge), k);
      g.fillCircle(b.x + (j - 0.5) * 18, b.y - up - j * 6, 1.4 * k + 0.4);
    }
  }
}

/** Sparks thrown while it grinds: a shower off the contact point, away from the victim. */
export function shredSparks(fx: AirFx, x: number, y: number, ang: number): void {
  fx.motes(x, y, 3, { angle: ang, spread: 1.4, speed: 260, size: 2, life: 220, depth: 8 });
}

/** The transformation starting or ending: fans snapping open into a funnel, or the funnel letting go. */
export function beyBurst(fx: AirFx, tint: AirColorFn, x: number, y: number, ending: boolean): void {
  fx.anim(7, 460, (g, t) => {
    const k = ending ? easeOut(t) : 1 - t;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + t * (ending ? 2 : -5);
      const d = 20 + k * 80;
      g.fillStyle(tint(i % 2 ? AIR.white : AIR.sky), (ending ? 1 - t : 0.4 + t * 0.6) * 0.9);
      windCurl(g, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI / 2, 40, 6, 1);
    }
  });
  fx.gustBurst(x, y, 90, { duration: 420 });
  fx.vortexCore(x, y, 46, 420);
}
